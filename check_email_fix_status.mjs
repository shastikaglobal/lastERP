import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
const env = dotenv.parse(fs.readFileSync('.env'));
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await sb.from('emails').select('id, body_html').eq('id', '20ea04d4-1f39-4896-abca-d07fe1b04df8').single();
if (!data) { console.log('not found'); process.exit(0); }
console.log('Email 1 - has ImageDisplay:', data.body_html?.includes('ImageDisplay'));
console.log('Email 1 - has data:image:', data.body_html?.includes('data:image'));
const srcVals = data.body_html?.match(/src="([^"]{0,80})"/g)?.slice(0, 5);
console.log('src snippets:', srcVals);

const { data: data2 } = await sb.from('emails').select('id, body_html').eq('id', 'c56a6e87-1c9a-49de-bf07-dd003df2cac0').single();
console.log('\nEmail 2 - has ImageDisplay:', data2?.body_html?.includes('ImageDisplay'));
console.log('Email 2 - has data:image:', data2?.body_html?.includes('data:image'));
const srcVals2 = data2?.body_html?.match(/src="([^"]{0,80})"/g)?.slice(0, 5);
console.log('src snippets:', srcVals2);
