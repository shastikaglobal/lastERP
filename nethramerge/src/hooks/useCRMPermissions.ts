import { useAuth } from "./useAuth";

export function useCRMPermissions() {
  const { roleSlugs, permissions, loading } = useAuth();
  
  const slugs = Array.from(roleSlugs).map(s => s.toLowerCase());
  
  const isAdmin = slugs.includes("admin");
  const isManager = slugs.includes("manager");
  const isPrivileged = isAdmin || isManager;
  
  const canExportPDF = isPrivileged || permissions.has("export_pdf");
  const canExportExcel = isPrivileged || permissions.has("export_excel");

  return {
    isAdmin,
    isManager,
    isPrivileged,
    canExportPDF,
    canExportExcel,
    isLoading: loading
  };
}
