import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ connectionString: 'postgresql://postgres:Shastika2026@195.35.22.13:5432/shastika_erp' });

async function check() {
  await client.connect();
  const res = await client.query("SELECT id, provider FROM auth.identities WHERE user_id = 'e08aaf46-3ecd-4d88-a5a0-98915fcb394b'");
  console.log('Current Identities:', res.rows);
  
  // If email identity is missing, insert it!
  const hasEmail = res.rows.some(r => r.provider === 'email');
  if (!hasEmail) {
    const emailData = JSON.stringify({ sub: 'e08aaf46-3ecd-4d88-a5a0-98915fcb394b', email: 'shastikaglobal11@gmail.com', email_verified: true });
    await client.query(`
      INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (
        'e08aaf46-3ecd-4d88-a5a0-98915fcb394b',
        'e08aaf46-3ecd-4d88-a5a0-98915fcb394b',
        $1,
        'email',
        NOW(),
        NOW(),
        NOW()
      )
    `, [emailData]);
    console.log('Inserted email identity!');
  } else {
    console.log('Email identity already exists.');
  }

  await client.end();
}

check().catch(console.error);
