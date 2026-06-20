import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from("user_roles")
  .update({ is_deleted: false, deleted_at: null, deleted_by: null })
  .eq("is_deleted", true)
  .select();

if (error) console.error("❌ Error:", error.message);
else console.log(`✅ Restored ${data?.length ?? 0} user_roles records`);
