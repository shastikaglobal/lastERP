ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_account_id_fkey;
ALTER TABLE emails ADD CONSTRAINT emails_account_id_fkey FOREIGN KEY (account_id) REFERENCES zoho_accounts(id) ON DELETE CASCADE;
