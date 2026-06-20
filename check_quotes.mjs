import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

console.log("dotenv.config() VITE_ZOHO_CLIENT_ID:", JSON.stringify(process.env.VITE_ZOHO_CLIENT_ID));
console.log("dotenv.config() ZOHO_CLIENT_SECRET:", JSON.stringify(process.env.ZOHO_CLIENT_SECRET));

const env = dotenv.parse(fs.readFileSync('.env'));
console.log("dotenv.parse() VITE_ZOHO_CLIENT_ID:", JSON.stringify(env.VITE_ZOHO_CLIENT_ID));
console.log("dotenv.parse() ZOHO_CLIENT_SECRET:", JSON.stringify(env.ZOHO_CLIENT_SECRET));
