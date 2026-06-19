import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = dotenv.parse(readFileSync('.env'));
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // We need to bypass requireAuth. Wait, we can't easily generate a valid jwt for requireAuth since it checks getUser.
  // Instead, let's query the database directly using the exact same query `router.get('/')` uses:
  const account_id = '1cd03d73-e5b3-4bbc-9a1f-40b3b7396a41'; // BDE account
  const { data: rows } = await supabase.from('emails').select('*').eq('account_id', account_id).eq('is_deleted', false).order('received_at', { ascending: false }).limit(500);
  
  console.log("DB returned rows for BDE:", rows?.length);

  const activeFolder = "inbox";
  const filterHasAttachment = false;
  const filterUnreadOnly = false;
  const filterDateRange = "all";
  const searchQuery = "";
  
  const sentEmails = rows || [];
  
  const filteredEmails = sentEmails.filter(email => {
    const folderName = email.folder?.toLowerCase() || "inbox";

    if (activeFolder === "inbox" && folderName !== "inbox") return false;
    if (activeFolder === "sent" && folderName !== "sent") return false;
    if (activeFolder === "drafts" && folderName !== "draft" && folderName !== "drafts") return false;
    if (activeFolder === "starred" && !email.is_starred) return false;
    if (activeFolder === "snoozed" && folderName !== "snoozed") return false;

    if (filterHasAttachment) {
      if (!email.attachments || !Array.isArray(email.attachments) || email.attachments.length === 0)
        return false;
    }
    if (filterUnreadOnly && email.is_read) return false;

    if (filterDateRange !== "all") {
      const diffDays = (Date.now() - new Date(email.received_at || email.created_at).getTime()) / 86400000;
      if (filterDateRange === "today" && diffDays > 1) return false;
      if (filterDateRange === "week" && diffDays > 7) return false;
      if (filterDateRange === "month" && diffDays > 30) return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(q) ||
      email.from_address?.toLowerCase().includes(q) ||
      email.to_address?.toLowerCase().includes(q) ||
      email.body_text?.toLowerCase().includes(q)
    );
  });
  
  console.log("Filtered emails:", filteredEmails.length);
}

test();
