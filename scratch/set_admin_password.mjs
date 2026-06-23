import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setPassword() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: 'shastikaglobal11@gmail.com'
  });
  if (error) {
    console.error("Error generating link:", error);
  } else {
    console.log("Password Reset Link for shastikaglobal11@gmail.com:", data.properties.action_link);
  }
}
setPassword();
