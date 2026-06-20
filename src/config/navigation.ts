// Centralized navigation config for the AgriExportOS sidebar
import {
  LayoutDashboard, TrendingUp, Truck, DollarSign, Users, UserPlus,
  Sprout, MapPin, GitBranch, UserCheck,
  FileText, FilePlus, FileCheck, ArrowRightLeft,
  ShoppingCart, ClipboardList, PackageCheck, Package2, Boxes,
  Ship, Container, Navigation,
  Package, PackagePlus, Warehouse, AlertTriangle, History,
  Building2, Star, ShoppingBag,
  ClipboardCheck, FlaskConical, BadgeCheck,
  QrCode, ScanLine,
  FileSpreadsheet, FileBox, Award, BookOpen, Eye,
  Wallet, Receipt, AlertCircle, BarChart3, Coins,
  UsersRound, CalendarCheck, ShieldCheck,
  Bell, ScrollText, CreditCard, Settings, Mail, MinusSquare, Trash2, Inbox,
  Smartphone, Activity, ShieldAlert, Monitor, PhoneCall, Key, MessageSquare, Database, Globe,
  CheckSquare, Lock, Plane, Layers, AlertOctagon, Timer
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission?: string; // permission code required to see this item
  items?: NavItem[]; // nested sub-items
};

export type NavGroup = {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Dashboards",
    icon: LayoutDashboard,
    items: [
      { title: "Executive & Daily Report", url: "/dashboards/executive", icon: LayoutDashboard },
      { title: "Sales Analytics", url: "/dashboards/sales", icon: TrendingUp },
      { title: "Shipment Analytics", url: "/dashboards/shipments", icon: Truck },
      { title: "Financial Overview", url: "/dashboards/financial", icon: DollarSign },
      { title: "Employee Productivity", url: "/dashboards/employees", icon: Users },
      { title: "Roles & Permissions", url: "/employees/roles", icon: ShieldCheck },
    ],
  },
  {
    title: "Farmers",
    icon: Users,
    items: [
      { title: "Create Farmer", url: "/farmers/create", icon: UserPlus, permission: "farmers.create" },
      { title: "Farmers List", url: "/farmers", icon: Users, permission: "farmers.view" },
      { title: "Convert to Customer", url: "/farmers/convert", icon: UserCheck, permission: "farmers.manage" }
    ]
  },
  {
    title: "CRM",
    icon: Users,
    items: [
      { title: "Dashboard", url: "/crm/dashboard", icon: LayoutDashboard, permission: "farmers.view" },
      { title: "Leads", url: "/crm/leads", icon: Users, permission: "farmers.view" },
      { title: "Pipelines", url: "/crm/pipeline", icon: GitBranch, permission: "farmers.view" },
      { title: "Follow-Ups", url: "/crm/follow-ups", icon: CalendarCheck, permission: "farmers.view" },
      { title: "Communication", url: "/crm/communication", icon: MessageSquare, permission: "farmers.view" },
      { title: "Client Acquisition", url: "/crm/client-acquisition", icon: UserPlus, permission: "farmers.view" },
      { title: "Successful Conversation", url: "/crm/convert", icon: BadgeCheck, permission: "farmers.view" },
      { title: "Client Success", url: "/crm/customers", icon: Award, permission: "farmers.view" },
      { title: "Customer Database", url: "/crm/customer-database", icon: Database, permission: "farmers.view" },
      { title: "Task", url: "/crm/tasks", icon: ClipboardCheck, permission: "farmers.view" },
      { title: "Report", url: "/crm/reports", icon: BarChart3, permission: "farmers.view" },
      { title: "Mail Box", url: "/system/mailbox", icon: Inbox, permission: "farmers.view" },
      { title: "Email Integration", url: "/crm/email", icon: Mail, permission: "farmers.view" },
      // { title: "Security", url: "/crm/security", icon: ShieldCheck, permission: "farmers.view" },
      { title: "Advanced Security", url: "/crm/advanced-security", icon: ShieldAlert, permission: "farmers.view" },
      { title: "Zoho API Sync", url: "/system/integrations/zoho", icon: Mail, permission: "farmers.view" },
    ],
  },
  {
    title: "Revenue & Performance Analytics",
    icon: TrendingUp,
    items: [
      { title: "Performance", url: "/crm/performance", icon: TrendingUp, permission: "farmers.view" },
      { title: "Revenue Analytics", url: "/crm/revenue", icon: TrendingUp, permission: "farmers.view" },
    ]
  },
  // Mobile CRM – commented out, sidebar section disabled
  // {
  //   title: "Mobile CRM",
  //   icon: Smartphone,
  //   items: [
  //     { title: "Mobile Login", url: "/mobile/login", icon: Key, permission: "farmers.view" },
  //     { title: "Push Notifications", url: "/mobile/push-notifications", icon: Bell, permission: "farmers.view" },
  //     { title: "Call Logging", url: "/mobile/call-logging", icon: PhoneCall, permission: "farmers.view" },
  //     { title: "GPS Tracking", url: "/mobile/gps-tracking", icon: MapPin, permission: "farmers.view" },
  //     { title: "IP Tracking", url: "/mobile/ip-tracking", icon: Globe, permission: "farmers.view" },
  //     { title: "Device Authorization", url: "/mobile/device-authorization", icon: ShieldCheck, permission: "farmers.view" },
  //   ],
  // },

  {
    title: "Procurement",
    icon: ShoppingCart,
    items: [
      { title: "Dashboard", url: "/procurement/dashboard", icon: LayoutDashboard },
      { title: "Purchase Orders", url: "/procurement/orders", icon: ShoppingCart },
      { title: "Suppliers", url: "/procurement/suppliers", icon: Building2 },
    ],
  },
  {
    title: "Warehouse & Inventory",
    icon: Warehouse,
    items: [
      { title: "Dashboard", url: "/warehouse/dashboard", icon: LayoutDashboard },
      { title: "Receiving Goods", url: "/warehouse/receiving", icon: PackageCheck },
      {
        title: "Inventory",
        url: "/warehouse/inventory",
        icon: Boxes,
        items: [
          { title: "Multi-Warehouse Management", url: "/inventory/multi-warehouse", icon: Warehouse },
          { title: "Available Stock Management", url: "/inventory/available-stock", icon: CheckSquare },
          { title: "Batch-wise Stock Tracking", url: "/inventory/batch-wise", icon: Layers },
          { title: "Reserved Stock Tracking", url: "/inventory/reserved-stock", icon: Lock },
          { title: "Expiry Monitoring", url: "/inventory/expiry-monitoring", icon: Timer },
          { title: "Damaged Stock Management", url: "/inventory/damaged-stock-management", icon: AlertOctagon },
          { title: "Export Ready Inventory", url: "/inventory/export-ready", icon: Plane },
          { title: "Packing Management", url: "/warehouse/packing", icon: Package },
        ]
      },
      {
        title: "Quality Control",
        url: "/qc",
        icon: ClipboardCheck,
        items: [
          { title: "New Inspection", url: "/qc/inspections/create", icon: FlaskConical, permission: "qc.inspect" },
          { title: "Inspection", url: "/qc/inspections", icon: ClipboardCheck, permission: "qc.view" },
          { title: "Approvals", url: "/qc/approvals", icon: BadgeCheck, permission: "qc.approve" },
          { title: "Container Loading", url: "/warehouse/container-loading", icon: Container, permission: "shipments.manage" },
        ]
      },
      {
        title: "Barcode & Tracking",
        url: "/barcodes",
        icon: QrCode,
        items: [
          { title: "Barcodes", url: "/barcodes", icon: QrCode, permission: "inventory.view" },
          { title: "Generate QR", url: "/barcodes/generate", icon: FilePlus, permission: "inventory.manage" },
          { title: "Scan", url: "/barcodes/scan", icon: ScanLine, permission: "inventory.view" },
        ]
      },
      {
        title: "Quotations",
        url: "/quotations",
        icon: FileText,
        items: [
          { title: "Create Quotation", url: "/quotations/create", icon: FilePlus, permission: "orders.manage" },
          { title: "Quotations", url: "/quotations", icon: FileText, permission: "orders.view" },
          { title: "Approvals", url: "/quotations/approvals", icon: FileCheck, permission: "orders.manage" },
          { title: "Convert to Order", url: "/quotations/convert", icon: ArrowRightLeft, permission: "orders.manage" },
        ]
      },
      {
        title: "Export Orders",
        url: "/orders",
        icon: ShoppingCart,
        items: [
          { title: "Create Order", url: "/orders/create", icon: ClipboardList, permission: "orders.manage" },
          { title: "Orders", url: "/orders", icon: ShoppingCart, permission: "orders.view" },
          { title: "Status Tracking", url: "/orders/status", icon: PackageCheck, permission: "orders.view" },
          { title: "Fulfillment", url: "/orders/fulfillment", icon: Package2, permission: "orders.manage" },
        ]
      },
      {
        title: "Shipments",
        url: "/shipments",
        icon: Ship,
        items: [
          { title: "Create Shipment", url: "/shipments/create", icon: FilePlus, permission: "shipments.manage" },
          { title: "Shipment Register", url: "/shipments", icon: Ship, permission: "shipments.view" },
          { title: "Container Tracking", url: "/shipments/containers", icon: Container, permission: "shipments.view" },
          { title: "Dispatch", url: "/shipments/dispatch", icon: Truck, permission: "shipments.manage" },
          { title: "Delivery Status", url: "/shipments/delivery", icon: Navigation, permission: "shipments.view" },
        ]
      },
      {
        title: "Documents",
        url: "/documents",
        icon: FileSpreadsheet,
        items: [
          { title: "Invoices", url: "/documents/invoices", icon: FileSpreadsheet, permission: "orders.view" },
          { title: "Packing Lists", url: "/documents/packing-lists", icon: FileBox, permission: "shipments.view" },
          { title: "Certificate of Origin", url: "/documents/certificates", icon: Award, permission: "orders.view" },
          { title: "Document Viewer", url: "/documents/viewer", icon: Eye, permission: "orders.view" },
        ]
      },
    ],
  },

  {
    title: "Finance",
    icon: Wallet,
    items: [
      { title: "Payment Register", url: "/payments", icon: Receipt, permission: "finance.view" },
      { title: "Overdue", url: "/payments/overdue", icon: AlertCircle, permission: "finance.view" },
      { title: "Multi-Currency Ledger", url: "/payments/ledger", icon: Coins, permission: "finance.manage" },
      { title: "Financial Reports", url: "/payments/reports", icon: BarChart3, permission: "finance.view" },
    ],
  },
  {
    title: "TALLY",
    icon: FileSpreadsheet,
    items: [
      { title: "Tally Module", url: "/tally", icon: FileSpreadsheet },
      { title: "Counts", url: "/tally/counts", icon: MinusSquare },
    ],
  },
  {
    title: "Accounts",
    icon: Wallet,
    items: [
      { title: "Journal Entry", url: "/tally/journal-entry", icon: FileText },
      { title: "Ledger", url: "/tally/ledger", icon: FileText },
      { title: "Trial Balance", url: "/tally/trial-balance", icon: FileText },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    items: [
      { title: "GST Reports", url: "/tally/gst-reports", icon: BarChart3 },
      { title: "P&L Statement", url: "/tally/pl-statement", icon: BarChart3 },
      { title: "Balance Sheet", url: "/tally/balance-sheet", icon: BarChart3 },
    ],
  },
  {
    title: "Masters",
    icon: Users,
    items: [
      { title: "Parties", url: "/tally/parties", icon: Users },
      { title: "Chart of Accounts", url: "/tally/chart-of-accounts", icon: Users },
    ],
  },
  {
    title: "HR & Employees",
    icon: UsersRound,
    items: [
      { title: "Directory", url: "/employees", icon: UsersRound, permission: "hr.view" },
      { title: "Attendance", url: "/employees/attendance", icon: CalendarCheck, permission: "hr.view" },
      { title: "Salary Report", url: "/employees/salary", icon: Coins, permission: "hr.view" },
      { title: "Face Attendance", url: "/employees/face-attendance", icon: ScanLine },
      { title: "Register Face", url: "/employees/register-face", icon: UserCheck, permission: "hr.view" },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      { title: "Notifications", url: "/system/notifications", icon: Bell, permission: "settings.view" },
      { title: "Activity Logs", url: "/system/logs", icon: ScrollText, permission: "settings.view" },
      { title: "Subscriptions", url: "/system/subscriptions", icon: CreditCard, permission: "settings.manage" },
      { title: "Settings", url: "/system/settings", icon: Settings, permission: "settings.manage" },
      { title: "Zoho Integration", url: "/system/integrations/zoho", icon: Mail, permission: "settings.manage" },
      { title: "System Reset", url: "/system/maintenance", icon: Trash2, permission: "settings.manage" },
    ],
  },
];



