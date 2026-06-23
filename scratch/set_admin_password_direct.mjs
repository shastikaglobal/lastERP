import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setPassword() {
  const email = 'shastikaglobal11@gmail.com';
  const newPassword = 'Shastika@2026';

  // Find the user first
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User with email ${email} not found.`);
    return;
  }

  // Update password
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  );

  if (error) {
    console.error("Error updating password:", error);
  } else {
    console.log(`Successfully updated password for ${email}. They can now login with email and password!`);
  }
}

setPassword();
