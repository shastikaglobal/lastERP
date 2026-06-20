import { supabase } from "@/integrations/supabase/client";

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        prompt: 'select_account'
      }
    },
  });

  if (error) {
    console.error("Error signing in with Google:", error.message);
    throw error;
  }
  
  return data;
};
