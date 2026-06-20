import { createClient } from '@supabase/supabase-js';

export interface ZohoTokenResponse {
  access_token: string;
  refresh_token?: string;
  api_domain: string;
  token_type: string;
  expires_in: number;
}

export interface ZohoEmail {
  messageId: string;
  subject: string;
  sender: string;
  toAddress: string;
  content: string;
  receivedTime: string;
  isRead: boolean;
}

export class ZohoMailService {
  private supabase;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    this.clientId = import.meta.env.VITE_ZOHO_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_ZOHO_CLIENT_SECRET;
    this.redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth`;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getAccessToken(accountId: string): Promise<string> {
    const { data: account, error } = await this.supabase
      .from('zoho_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) throw new Error('Zoho account not found');

    // Check if expired (with 5 min buffer)
    const now = new Date();
    const expiry = new Date(account.expiry_time);
    if (now.getTime() < expiry.getTime() - 300000) {
      return account.access_token;
    }

    // Refresh token
    return this.refreshAccessToken(account);
  }

  private async refreshAccessToken(account: any): Promise<string> {
    const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: account.refresh_token,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    const data: ZohoTokenResponse = await response.json();
    if (!data.access_token) throw new Error('Failed to refresh token');

    const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await this.supabase
      .from('zoho_accounts')
      .update({
        access_token: data.access_token,
        expiry_time: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id);

    return data.access_token;
  }

  /**
   * Send an email via Zoho API
   */
  async sendEmail(accountId: string, params: { to: string; subject: string; content: string }) {
    const token = await this.getAccessToken(accountId);
    const { data: account } = await this.supabase.from('zoho_accounts').select('account_email').eq('id', accountId).single();

    const response = await fetch(`https://mail.zoho.in/api/accounts/${account.account_email}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: account.account_email,
        toAddress: params.to,
        subject: params.subject,
        content: params.content,
        askReceipt: 'no',
      }),
    });

    return response.json();
  }

  /**
   * Fetch recent messages from Inbox
   */
  async fetchEmails(accountId: string, folderName = 'inbox') {
    const token = await this.getAccessToken(accountId);
    const { data: account } = await this.supabase.from('zoho_accounts').select('account_email').eq('id', accountId).single();

    const response = await fetch(`https://mail.zoho.in/api/accounts/${account.account_email}/messages/view?folderName=${folderName}`, {
      headers: { 'Authorization': `Zoho-oauthtoken ${token}` },
    });

    const result = await response.json();
    return result.data || [];
  }

  /**
   * Sync Zoho emails to Supabase
   */
  async syncEmails(accountId: string, companyId: string) {
    const messages = await this.fetchEmails(accountId);
    
    for (const msg of messages) {
      const { error } = await this.supabase
        .from('emails')
        .upsert({
          company_id: companyId,
          zoho_message_id: msg.messageId,
          subject: msg.subject,
          from_address: msg.sender,
          to_address: msg.toAddress,
          received_at: new Date(parseInt(msg.receivedTime)).toISOString(),
          is_read: msg.isRead === '1',
          folder: 'inbox'
        }, { onConflict: 'zoho_message_id' });
      
      if (error) console.error('Sync error:', error);
    }
  }
}
