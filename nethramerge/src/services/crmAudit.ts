import { supabase } from "@/integrations/supabase/client";

export const logCRMAction = async (action: string, recordCount: number = 0, details?: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: action,
      resource_type: "crm",
      details: { recordCount, ...details }
    });
  } catch (error) {
    console.error("Failed to log CRM action:", error);
  }
};
