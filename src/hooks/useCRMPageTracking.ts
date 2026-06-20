import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logCRMAction } from "@/services/crmAudit";

export function useCRMPageTracking() {
  const location = useLocation();

  useEffect(() => {
    logCRMAction(`PAGE_VIEW`, 0, { path: location.pathname });
  }, [location.pathname]);
}
