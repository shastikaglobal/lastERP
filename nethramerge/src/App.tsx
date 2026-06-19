import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import LeadActivities from "./pages/crm/Activities";
import LeadsList from "./pages/crm/LeadsList";
import FollowUps from "./pages/crm/FollowUps";
import { FollowUpReminders } from "./components/crm/FollowUpReminders";
import LeadDetail from "./pages/crm/LeadDetail";
import LeadPipeline from "./pages/crm/Pipeline";
import EmailIntegration from "./pages/crm/EmailIntegration";

// CRM (New Modules)
import CrmDashboard from "./pages/crm/Dashboard";
import CrmTasks from "./pages/crm/Tasks";
import CrmSecurity from "./pages/crm/Security";

import CrmClientAcquisition from "./pages/crm/ClientAcquisition";
import CrmAdvancedSecurity from "./pages/crm/AdvancedSecurity";
import CrmReports from "./pages/crm/Reports";
import CrmPerformance from "./pages/crm/Performance";
import CrmRevenue from "./pages/crm/RevenueAnalytics";
import CrmCommunication from "./pages/crm/Communication";
import CrmCustomerDatabase from "./pages/crm/CustomerDatabase";
import CrmEmployeeActivity from "./pages/crm/EmployeeActivity";
import CrmConvert from "./pages/crm/Convert";
import CrmCustomersList from "./pages/crm/CustomersList";

// Mobile CRM (commented out – sidebar section disabled)
// import MobileLogin from "./pages/mobile/MobileLogin";
// import PushNotifications from "./pages/mobile/PushNotifications";
// import CallLogging from "./pages/mobile/CallLogging";
// import GPSTracking from "./pages/mobile/GPSTracking";
// import IPTracking from "./pages/mobile/IPTracking";
// import DeviceAuthorization from "./pages/mobile/DeviceAuthorization";

import CompleteProfile from "./pages/CompleteProfile";
import WaitingApproval from "./pages/WaitingApproval";
import Pending from "./pages/Pending";
import InvoicePreview from "./pages/documents/InvoicePreview";
import PackingListPreview from "./pages/documents/PackingListPreview";
import CertificatePreview from "./pages/documents/CertificatePreview";

// Dashboards
import Executive from "./pages/dashboards/Executive";
import SalesAnalytics from "./pages/dashboards/SalesAnalytics";
import ShipmentAnalytics from "./pages/dashboards/ShipmentAnalytics";
import FinancialOverview from "./pages/dashboards/FinancialOverview";
import EmployeeProductivity from "./pages/dashboards/EmployeeProductivity";
import FinanceTally from "./pages/dashboards/FinanceTally";
import BdeDashboard from "./pages/dashboards/BdeDashboard";

// Farmers
import FarmersList from "./pages/farmers/FarmersList";
import CreateFarmer from "./pages/farmers/CreateFarmer";
import FarmerDetail from "./pages/farmers/FarmerDetail";
import ConvertToCustomer from "./pages/farmers/ConvertToCustomer";

// Procurement (live)
import PurchaseOrdersListLive from "./pages/procurement/PurchaseOrdersListLive";
import CreatePOLive from "./pages/procurement/CreatePOLive";
import SuppliersList from "./pages/procurement/SuppliersList";
import SupplierDetail from "./pages/procurement/SupplierDetail";
import ProcurementDashboard from "./pages/procurement/ProcurementDashboard";

import InspectionsList from "./pages/qc/InspectionsList";
import QualityControlWarehouse from "./pages/inventory/QualityControl";
import ContainerLoading from "./pages/inventory/ContainerLoading";
import CreateInspection from "./pages/qc/CreateInspection";
import QCApprovals from "./pages/qc/QCApprovals";

// Barcode & Tracking
import BarcodesList from "./pages/barcodes/BarcodesList";
import GenerateBarcode from "./pages/barcodes/GenerateBarcode";
import ScanBarcode from "./pages/barcodes/ScanBarcode";
import BarcodeDetail from "./pages/barcodes/BarcodeDetail";

// Inventory
import ProductCatalog from "./pages/inventory/ProductCatalog";
import CreateProduct from "./pages/inventory/CreateProduct";
import InventoryBatches from "./pages/inventory/InventoryBatches";
import StockMovements from "./pages/inventory/StockMovements";
import Warehouses from "./pages/inventory/Warehouses";
import LowStockAlerts from "./pages/inventory/LowStockAlerts";
import DamagedStock from "./pages/inventory/DamagedStock";
import AvailableStock from "./pages/inventory/AvailableStock";
import ReservedStock from "./pages/inventory/ReservedStock";
import ExportReady from "./pages/inventory/ExportReady";
import BatchWiseStock from "./pages/inventory/BatchWiseStock";
import DamagedStockManagement from "./pages/inventory/DamagedStockManagement";
import ExpiryMonitoring from "./pages/inventory/ExpiryMonitoring";
import MultiWarehouse from "./pages/inventory/MultiWarehouse";

// Warehouse
import WarehouseDashboard from "./pages/warehouse/WarehouseDashboard";
import WarehouseRacks from "./pages/warehouse/WarehouseRacks";
import WarehouseZones from "./pages/warehouse/WarehouseZones";
import ReceivingGoods from "./pages/warehouse/ReceivingGoods";
import PackingManagement from "./pages/warehouse/PackingManagement";

// Reports
import ReportsHub from "./pages/reports/ReportsHub";
import StockSummaryReport from "./pages/reports/StockSummaryReport";
import BatchTrackingReport from "./pages/reports/BatchTrackingReport";
import DispatchReport from "./pages/reports/DispatchReport";
import ContainerLoadingReport from "./pages/reports/ContainerLoadingReport";
import DamageWastageReport from "./pages/reports/DamageWastageReport";
import InventoryAgingReport from "./pages/reports/InventoryAgingReport";
import ExportReadyStockReport from "./pages/reports/ExportReadyStockReport";

// Quotations
import QuotationsList from "./pages/quotations/QuotationsList";
import CreateQuotation from "./pages/quotations/CreateQuotation";
import QuotationPreview from "./pages/quotations/QuotationPreview";
import PublicQuotationView from "./pages/quotations/PublicQuotationView";
import QuotationApprovals from "./pages/quotations/Approvals";
import QuotationReport from "./pages/quotations/QuotationReport";
import ConvertQuotation from "./pages/quotations/Convert";
import EditQuotation from "./pages/quotations/EditQuotation";

// Orders
import OrdersList from "./pages/orders/OrdersList";
import OrderDetail from "./pages/orders/OrderDetail";
import CreateOrder from "./pages/orders/CreateOrder";
import OrderStatus from "./pages/orders/OrderStatus";
import Fulfillment from "./pages/orders/Fulfillment";

// Shipments
import ShipmentsList from "./pages/shipments/ShipmentsList";
import CreateShipment from "./pages/shipments/CreateShipment";
import ShipmentDetail from "./pages/shipments/ShipmentDetail";
import ContainerTracking from "./pages/shipments/ContainerTracking";
import DeliveryStatus from "./pages/shipments/DeliveryStatus";
import Dispatch from "./pages/shipments/Dispatch";

// Documents
import Invoices from "./pages/documents/Invoices";
import CommercialInvoices from "./pages/documents/CommercialInvoices";
import PackingLists from "./pages/documents/PackingLists";
import Certificates from "./pages/documents/Certificates";
import CreateCertificate from "./pages/documents/CreateCertificate";
import DocumentViewer from "./pages/documents/DocumentViewer";
import InvoiceReport from "./pages/documents/InvoiceReport";
import CreateInvoice from "./pages/documents/CreateInvoice";

// Payments
import PaymentsRegister from "./pages/payments/PaymentsRegister";
import OverduePayments from "./pages/payments/OverduePayments";
import Ledger from "./pages/payments/Ledger";
import FinancialReports from "./pages/payments/FinancialReports";

// Employees
import EmployeeDirectory from "./pages/employees/EmployeeDirectory";
import Attendance from "./pages/employees/Attendance";
import SalaryReport from "./pages/employees/SalaryReport";
import RolesPermissions from "./pages/employees/RolesPermissions";
import FaceAttendanceGuard from '@/guards/FaceAttendanceGuard';
import FaceAttendance from "./pages/FaceAttendance.tsx";
import RegisterFace from "./pages/RegisterFace.tsx";

// System
import Notifications from "./pages/system/Notifications";
import ActivityLogs from "./pages/system/ActivityLogs";
import AuditLogs from "./pages/system/AuditLogs";
import Subscriptions from "./pages/system/Subscriptions";
import Settings from "./pages/system/Settings";
import AccountSettings from "./pages/system/AccountSettings";
import Maintenance from "./pages/system/Maintenance";
import ZohoIntegration from "./pages/system/ZohoIntegration";
import Mailbox from "./pages/system/Mailbox";
import TallyIndex from "./pages/Tally/index";
import JournalEntry from "./pages/Tally/JournalEntry";

const queryClient = new QueryClient();

const DashboardRedirect = () => {
  const { roleSlugs, profile } = useAuth();
  const slugs = Array.from(roleSlugs).map(s => s.toLowerCase());
  const isAdmin = slugs.includes("admin");
  const isSecretary = slugs.includes("secretary");
  const isBde = slugs.includes("bd") ||
    slugs.includes("bde") ||
    (profile?.requested_role && ["bd", "bde"].includes(profile.requested_role.toLowerCase()));

  if (isAdmin) return <Navigate to="/dashboards/executive" replace />;
  if (isSecretary) return <Navigate to="/dashboards/finance-tally" replace />;
  if (isBde) return <Navigate to="/dashboards/bde" replace />;
  return <Navigate to="/dashboards/executive" replace />;
};

const RootRedirect = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const code = searchParams.get("code");
  const hash = location.hash;

  if (code || hash.includes("access_token") || hash.includes("error")) {
    return <Navigate to={`/auth/callback${location.search}${location.hash}`} replace />;
  }

  return <Navigate to="/auth" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FollowUpReminders />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/waiting-approval" element={<WaitingApproval />} />
            <Route path="/select-profile" element={<Navigate to="/dashboard" replace />} />

            {/* Public / Standalone Preview Routes (no AppLayout) */}
            <Route path="/invoices/:id/preview" element={<InvoicePreview />} />
            <Route path="/packing-lists/:id/preview" element={<PackingListPreview />} />
            <Route path="/documents/packing-lists/:id/preview" element={<PackingListPreview />} />
            <Route path="/documents/commercial-invoices/:id/preview" element={<InvoicePreview />} />
            <Route path="/certificates/:id/preview" element={<CertificatePreview />} />
            <Route path="/share/quote/:id" element={<PublicQuotationView />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/approvals" element={<Navigate to="/employees/roles" replace />} />

              {/* Dashboards */}
              <Route path="/dashboards/executive" element={<Executive />} />
              <Route path="/dashboards/finance-tally" element={<FinanceTally />} />
              <Route path="/dashboards/bde" element={<BdeDashboard />} />
              <Route path="/dashboards/sales" element={<SalesAnalytics />} />
              <Route path="/dashboards/shipments" element={<ShipmentAnalytics />} />
              <Route path="/dashboards/financial" element={<FinancialOverview />} />
              <Route path="/dashboards/employees" element={<EmployeeProductivity />} />

              {/* Farmers */}
              <Route path="/farmers" element={<FarmersList />} />
              <Route path="/farmers/create" element={<CreateFarmer />} />
              <Route path="/farmers/convert" element={<ConvertToCustomer />} />
              <Route path="/farmers/:id" element={<FarmerDetail />} />

              {/* Procurement */}

              <Route path="/procurement/orders" element={<PurchaseOrdersListLive />} />
              <Route path="/procurement/orders/create" element={<CreatePOLive />} />
              <Route path="/procurement/suppliers" element={<SuppliersList />} />
              <Route path="/procurement/suppliers/:id" element={<SupplierDetail />} />
              <Route path="/procurement/dashboard" element={<ProcurementDashboard />} />
              <Route path="/procurement/analytics" element={<Navigate to="/procurement/dashboard" replace />} />

              {/* Quality Control */}
              <Route path="/qc/inspections" element={<InspectionsList />} />
              <Route path="/qc/inspections/create" element={<CreateInspection />} />
              <Route path="/qc/approvals" element={<QCApprovals />} />
              <Route path="/warehouse/qc" element={<QualityControlWarehouse />} />
              <Route path="/warehouse/container-loading" element={<ContainerLoading />} />

              {/* Barcode & Tracking */}
              <Route path="/barcodes" element={<BarcodesList />} />
              <Route path="/barcodes/generate" element={<GenerateBarcode />} />
              <Route path="/barcodes/scan" element={<ScanBarcode />} />
              <Route path="/barcodes/:id" element={<BarcodeDetail />} />

              {/* Inventory */}
              <Route path="/inventory/products" element={<ProductCatalog />} />
              <Route path="/inventory/products/create" element={<CreateProduct />} />
              <Route path="/inventory/stock" element={<InventoryBatches />} />
              <Route path="/inventory/movements" element={<StockMovements />} />
              <Route path="/inventory/warehouses" element={<Warehouses />} />
              <Route path="/inventory/alerts" element={<LowStockAlerts />} />
              <Route path="/inventory/damaged" element={<DamagedStock />} />
              <Route path="/inventory/available-stock" element={<AvailableStock />} />
              <Route path="/inventory/reserved-stock" element={<ReservedStock />} />
              <Route path="/inventory/export-ready" element={<ExportReady />} />
              <Route path="/inventory/batch-wise" element={<BatchWiseStock />} />
              <Route path="/inventory/damaged-stock-management" element={<DamagedStockManagement />} />
              <Route path="/inventory/expiry-monitoring" element={<ExpiryMonitoring />} />
              <Route path="/inventory/multi-warehouse" element={<MultiWarehouse />} />

              {/* Warehouse */}
              <Route path="/warehouse/dashboard" element={<WarehouseDashboard />} />
              <Route path="/warehouse/racks" element={<WarehouseRacks />} />
              <Route path="/warehouse/zones" element={<WarehouseZones />} />
              <Route path="/warehouse/receiving" element={<ReceivingGoods />} />
              <Route path="/warehouse/packing" element={<PackingManagement />} />
              <Route path="/warehouse" element={<Navigate to="/warehouse/dashboard" replace />} />

              {/* Reports */}
              <Route path="/reports" element={<ReportsHub />} />
              <Route path="/reports/stock-summary" element={<StockSummaryReport />} />
              <Route path="/reports/batch-tracking" element={<BatchTrackingReport />} />
              <Route path="/reports/dispatch" element={<DispatchReport />} />
              <Route path="/reports/container-loading" element={<ContainerLoadingReport />} />
              <Route path="/reports/damage-wastage" element={<DamageWastageReport />} />
              <Route path="/reports/inventory-aging" element={<InventoryAgingReport />} />
              <Route path="/reports/export-ready" element={<ExportReadyStockReport />} />

              {/* Quotations */}
              <Route path="/quotations" element={<QuotationsList />} />
              <Route path="/quotations/create" element={<CreateQuotation />} />
              <Route path="/quotations/edit/:id" element={<EditQuotation />} />
              <Route path="/quotations/approvals" element={<QuotationApprovals />} />
              <Route path="/quotations/convert" element={<ConvertQuotation />} />
              <Route path="/quotations/:id" element={<QuotationPreview />} />
              <Route path="/quotations/:id/report" element={<QuotationReport />} />

              {/* CRM */}
              <Route path="/crm" element={<Navigate to="/crm/dashboard" replace />} />
              <Route path="/crm/dashboard" element={<CrmDashboard />} />
              <Route path="/crm/activities" element={<LeadActivities />} />
              <Route path="/crm/leads" element={<LeadsList />} />
              <Route path="/crm/follow-ups" element={<FollowUps />} />
              <Route path="/crm/leads/:id" element={<LeadDetail />} />
              <Route path="/crm/pipeline" element={<LeadPipeline />} />
              <Route path="/crm/email" element={<EmailIntegration />} />
              <Route path="/crm/tasks" element={<CrmTasks />} />
              <Route path="/crm/security" element={<CrmSecurity />} />
              <Route path="/crm/client-acquisition" element={<CrmClientAcquisition />} />
              <Route path="/crm/advanced-security" element={<CrmAdvancedSecurity />} />
              <Route path="/crm/reports" element={<CrmReports />} />
              <Route path="/crm/performance" element={<CrmPerformance />} />
              <Route path="/crm/revenue" element={<CrmRevenue />} />
              <Route path="/crm/communication" element={<CrmCommunication />} />
              <Route path="/crm/customer-database" element={<CrmCustomerDatabase />} />
              <Route path="/crm/employee-activity" element={<CrmEmployeeActivity />} />
              <Route path="/crm/convert" element={<CrmConvert />} />
              <Route path="/crm/customers" element={<CrmCustomersList />} />

              {/* Mobile pages – commented out, sidebar section disabled
              /mobile/login -> MobileLogin
              /mobile/push-notifications -> PushNotifications
              /mobile/call-logging -> CallLogging
              /mobile/gps-tracking -> GPSTracking
              /mobile/ip-tracking -> IPTracking
              /mobile/device-authorization -> DeviceAuthorization
              */}

              {/* Orders */}
              <Route path="/orders" element={<OrdersList />} />
              <Route path="/orders/create" element={<CreateOrder />} />
              <Route path="/orders/status" element={<OrderStatus />} />
              <Route path="/orders/fulfillment" element={<Fulfillment />} />
              <Route path="/orders/:id" element={<OrderDetail />} />

              {/* Shipments */}
              <Route path="/shipments" element={<ShipmentsList />} />
              <Route path="/shipments/create" element={<CreateShipment />} />
              <Route path="/shipments/:id" element={<ShipmentDetail />} />
              <Route path="/shipments/containers" element={<ContainerTracking />} />
              <Route path="/shipments/delivery" element={<DeliveryStatus />} />
              <Route path="/shipments/dispatch" element={<Dispatch />} />

              {/* Documents */}
              <Route path="/documents" element={<Navigate to="/documents/invoices" replace />} />
              <Route path="/documents/invoices" element={<Invoices />} />
              <Route path="/documents/invoices/create" element={<CreateInvoice />} />
              <Route path="/documents/invoices/:id" element={<InvoiceReport />} />
              <Route path="/documents/packing-lists" element={<PackingLists />} />
              <Route path="/documents/commercial-invoices" element={<CommercialInvoices />} />
              <Route path="/documents/certificates" element={<Certificates />} />
              <Route path="/certificates/create" element={<CreateCertificate />} />
              <Route path="/documents/viewer" element={<DocumentViewer />} />

              {/* Payments */}
              <Route path="/payments" element={<PaymentsRegister />} />
              <Route path="/payments/overdue" element={<OverduePayments />} />
              <Route path="/payments/ledger" element={<Ledger />} />
              <Route path="/payments/reports" element={<FinancialReports />} />

              {/* Tally */}
              <Route path="/tally/*" element={<TallyIndex />} />
              <Route path="/journal" element={<JournalEntry />} />
              <Route path="/gst-reports" element={<Navigate to="/tally/gst-reports" replace />} />

              {/* Employees */}
              <Route path="/employees" element={<EmployeeDirectory />} />
              <Route path="/employees/attendance" element={<Attendance />} />
              <Route path="/employees/salary" element={<SalaryReport />} />
              <Route path="/employees/face-attendance" element={<FaceAttendanceGuard><FaceAttendance /></FaceAttendanceGuard>} />
              <Route path="/employees/register-face" element={<RegisterFace />} />
              <Route path="/employees/roles" element={<RolesPermissions />} />

              {/* System */}
              <Route path="/system/notifications" element={<Notifications />} />
              <Route path="/system/logs" element={<ActivityLogs />} />
              <Route path="/system/audit-logs" element={<AuditLogs />} />
              <Route path="/system/subscriptions" element={<Subscriptions />} />
              <Route path="/system/settings" element={<Settings />} />
              <Route path="/system/account" element={<AccountSettings />} />
              <Route path="/system/maintenance" element={<Maintenance />} />
              <Route path="/system/integrations/zoho" element={<ZohoIntegration />} />
              <Route path="/system/mailbox" element={<Mailbox />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;