import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const env = dotenv.parse(readFileSync('.env'));
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkNarmatha() {
  console.log("Checking all tables for Narmatha...");
  
  // 1. Check profiles
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('full_name', '%Narmatha%');
  console.log("Profiles:", profiles);
  
  // 2. Check emails
  const { data: emails } = await supabase.from('emails').select('*').or('to_address.ilike.%Narmatha%,from_address.ilike.%Narmatha%');
  console.log("Emails:", emails?.length);
  
  // 3. Check zoho_accounts
  const { data: zoho } = await supabase.from('zoho_accounts').select('*');
  console.log("Zoho Accounts:", zoho);
}

checkNarmatha();
