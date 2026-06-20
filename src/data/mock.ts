// Centralized mock data for the demo ERP

export const leads = [
  { id: "L-1042", company: "Mumbai Textiles Ltd", contact: "Rajiv Mehta", country: "India", status: "Hot", value: 48500, source: "Trade Show", owner: "John Doe", updatedAt: "2025-04-18" },
  { id: "L-1041", company: "Berlin Auto GmbH", contact: "Klaus Werner", country: "Germany", status: "Warm", value: 124000, source: "Website", owner: "Sara Kim", updatedAt: "2025-04-17" },
  { id: "L-1040", company: "Lagos Foods Co", contact: "Adaeze Okafor", country: "Nigeria", status: "New", value: 32000, source: "Referral", owner: "John Doe", updatedAt: "2025-04-17" },
  { id: "L-1039", company: "Osaka Electronics", contact: "Hiroshi Tanaka", country: "Japan", status: "Hot", value: 215000, source: "LinkedIn", owner: "Maria Lopez", updatedAt: "2025-04-16" },
  { id: "L-1038", company: "Cairo Spices LLC", contact: "Yusuf Hassan", country: "Egypt", status: "Cold", value: 18000, source: "Cold Call", owner: "Sara Kim", updatedAt: "2025-04-15" },
  { id: "L-1037", company: "Sao Paulo Coffee", contact: "Lucia Santos", country: "Brazil", status: "Warm", value: 67000, source: "Website", owner: "John Doe", updatedAt: "2025-04-14" },
  { id: "L-1036", company: "Sydney Wines Pty", contact: "Emma Wright", country: "Australia", status: "Lost", value: 0, source: "Email", owner: "Maria Lopez", updatedAt: "2025-04-13" },
  { id: "L-1035", company: "Toronto Pharma Inc", contact: "Daniel Chen", country: "Canada", status: "New", value: 89000, source: "Trade Show", owner: "Sara Kim", updatedAt: "2025-04-12" },
];

export const quotations = [
  { id: "QT-2025-0142", customer: "Mumbai Textiles Ltd", items: 12, amount: 48500, currency: "USD", status: "Approved", validUntil: "2025-05-15", createdAt: "2025-04-15" },
  { id: "QT-2025-0141", customer: "Berlin Auto GmbH", items: 4, amount: 124000, currency: "EUR", status: "Pending", validUntil: "2025-05-12", createdAt: "2025-04-14" },
  { id: "QT-2025-0140", customer: "Osaka Electronics", items: 28, amount: 215000, currency: "USD", status: "Approved", validUntil: "2025-05-10", createdAt: "2025-04-12" },
  { id: "QT-2025-0139", customer: "Lagos Foods Co", items: 6, amount: 32000, currency: "USD", status: "Draft", validUntil: "2025-05-08", createdAt: "2025-04-10" },
  { id: "QT-2025-0138", customer: "Sao Paulo Coffee", items: 8, amount: 67000, currency: "USD", status: "In Review", validUntil: "2025-05-06", createdAt: "2025-04-08" },
  { id: "QT-2025-0137", customer: "Toronto Pharma Inc", items: 16, amount: 89000, currency: "CAD", status: "Rejected", validUntil: "2025-05-04", createdAt: "2025-04-06" },
  { id: "QT-2025-0136", customer: "Cairo Spices LLC", items: 22, amount: 18000, currency: "USD", status: "Approved", validUntil: "2025-05-02", createdAt: "2025-04-04" },
];

export const orders = [
  { id: "SO-2025-0089", customer: "Mumbai Textiles Ltd", items: 12, amount: 48500, currency: "USD", status: "Processing", incoterm: "FOB", createdAt: "2025-04-16", deliveryDate: "2025-05-20" },
  { id: "SO-2025-0088", customer: "Osaka Electronics", items: 28, amount: 215000, currency: "USD", status: "Shipped", incoterm: "CIF", createdAt: "2025-04-13", deliveryDate: "2025-05-18" },
  { id: "SO-2025-0087", customer: "Berlin Auto GmbH", items: 4, amount: 124000, currency: "EUR", status: "Pending", incoterm: "EXW", createdAt: "2025-04-15", deliveryDate: "2025-05-22" },
  { id: "SO-2025-0086", customer: "Cairo Spices LLC", items: 22, amount: 18000, currency: "USD", status: "Delivered", incoterm: "FOB", createdAt: "2025-04-05", deliveryDate: "2025-04-18" },
  { id: "SO-2025-0085", customer: "Sao Paulo Coffee", items: 8, amount: 67000, currency: "USD", status: "Processing", incoterm: "CFR", createdAt: "2025-04-09", deliveryDate: "2025-05-15" },
  { id: "SO-2025-0084", customer: "Lagos Foods Co", items: 6, amount: 32000, currency: "USD", status: "Cancelled", incoterm: "FOB", createdAt: "2025-04-08", deliveryDate: "—" },
];

export const shipments = [
  { id: "SH-2025-0045", orderId: "SO-2025-0088", customer: "Osaka Electronics", origin: "Mumbai, IN", destination: "Osaka, JP", status: "In Transit", carrier: "Maersk", containerCount: 2, eta: "2025-05-18", departedAt: "2025-04-14" },
  { id: "SH-2025-0044", orderId: "SO-2025-0086", customer: "Cairo Spices LLC", origin: "Mumbai, IN", destination: "Alexandria, EG", status: "Delivered", carrier: "MSC", containerCount: 1, eta: "2025-04-18", departedAt: "2025-04-05" },
  { id: "SH-2025-0043", orderId: "SO-2025-0085", customer: "Sao Paulo Coffee", origin: "Chennai, IN", destination: "Santos, BR", status: "Processing", carrier: "CMA CGM", containerCount: 3, eta: "2025-05-15", departedAt: "—" },
  { id: "SH-2025-0042", orderId: "SO-2025-0089", customer: "Mumbai Textiles Ltd", origin: "Mumbai, IN", destination: "Hamburg, DE", status: "In Transit", carrier: "Hapag-Lloyd", containerCount: 1, eta: "2025-05-20", departedAt: "2025-04-17" },
  { id: "SH-2025-0041", orderId: "SO-2025-0083", customer: "Toronto Pharma Inc", origin: "Mumbai, IN", destination: "Toronto, CA", status: "Pending", carrier: "ONE", containerCount: 2, eta: "2025-05-25", departedAt: "—" },
];

export const products = [
  { id: "P-001", sku: "AGRI-CCN-HSK", name: "Husked Brown Coconut", category: "Coconuts", uom: "Piece", stock: 5000, reorder: 1000, price: 0.5, currency: "USD", status: "In Stock" },
  { id: "P-002", sku: "AGRI-CCN-SHK", name: "Semi-Husked Brown Coconut", category: "Coconuts", uom: "Piece", stock: 3500, reorder: 500, price: 0.55, currency: "USD", status: "In Stock" },
  { id: "P-003", sku: "AGRI-CCN-DHK", name: "Dehusked Brown Coconut", category: "Coconuts", uom: "Piece", stock: 2000, reorder: 500, price: 0.6, currency: "USD", status: "In Stock" },
  { id: "P-004", sku: "AGRI-CCN-TND", name: "Tender Green Coconut", category: "Coconuts", uom: "Piece", stock: 1500, reorder: 300, price: 0.8, currency: "USD", status: "In Stock" },
  { id: "P-005", sku: "AGRI-CCN-GRN", name: "Fresh Green Coconut", category: "Coconuts", uom: "Piece", stock: 1200, reorder: 300, price: 0.75, currency: "USD", status: "In Stock" },
  { id: "P-006", sku: "AGRI-PMK-YEL", name: "Yellow Pumpkin", category: "Vegetables", uom: "Ton", stock: 85, reorder: 15, price: 320.0, currency: "USD", status: "In Stock" },
  { id: "P-007", sku: "AGRI-PMK-WHT", name: "White Pumpkin", category: "Vegetables", uom: "Ton", stock: 60, reorder: 15, price: 340.0, currency: "USD", status: "In Stock" },
  { id: "P-008", sku: "AGRI-WML-REG", name: "Watermelon", category: "Fruits", uom: "Ton", stock: 120, reorder: 20, price: 450.0, currency: "USD", status: "In Stock" },
  { id: "P-009", sku: "AGRI-WML-BLK", name: "Black Diamond Watermelon", category: "Fruits", uom: "Ton", stock: 45, reorder: 10, price: 850.0, currency: "USD", status: "In Stock" },
  { id: "P-010", sku: "AGRI-CUC-001", name: "Cucumber", category: "Vegetables", uom: "Ton", stock: 200, reorder: 50, price: 280.0, currency: "USD", status: "In Stock" },
  { id: "P-011", sku: "AGRI-BAN-CAV", name: "Cavendish Banana", category: "Bananas", uom: "Ton", stock: 500, reorder: 100, price: 400.0, currency: "USD", status: "In Stock" },
  { id: "P-012", sku: "AGRI-BAN-BBY", name: "Baby Banana", category: "Bananas", uom: "Ton", stock: 150, reorder: 30, price: 600.0, currency: "USD", status: "In Stock" },
  { id: "P-013", sku: "AGRI-BAN-NEN", name: "Nendran Banana", category: "Bananas", uom: "Ton", stock: 200, reorder: 40, price: 550.0, currency: "USD", status: "In Stock" },
  { id: "P-014", sku: "AGRI-BAN-RED", name: "Red Banana", category: "Bananas", uom: "Ton", stock: 180, reorder: 35, price: 750.0, currency: "USD", status: "In Stock" },
  { id: "P-015", sku: "AGRI-TOM-001", name: "Tomatoes", category: "Vegetables", uom: "Ton", stock: 45, reorder: 10, price: 680.0, currency: "USD", status: "In Stock" },
];

export const suppliers = [
  { id: "SUP-001", name: "Gujarat Cotton Mills", country: "India", category: "Textiles", contact: "Vikram Patel", rating: 4.8, openPOs: 3, totalSpend: 245000, status: "Active" },
  { id: "SUP-002", name: "Shenzhen Electronics", country: "China", category: "Electronics", contact: "Li Wei", rating: 4.6, openPOs: 5, totalSpend: 412000, status: "Active" },
  { id: "SUP-003", name: "Kerala Spice Estates", country: "India", category: "Spices", contact: "Anil Nair", rating: 4.9, openPOs: 2, totalSpend: 128000, status: "Active" },
  { id: "SUP-004", name: "Pune Auto Components", country: "India", category: "Auto Parts", contact: "Suresh Joshi", rating: 4.2, openPOs: 1, totalSpend: 89000, status: "Active" },
  { id: "SUP-005", name: "Punjab Grain Co.", country: "India", category: "Food", contact: "Harpreet Singh", rating: 4.7, openPOs: 4, totalSpend: 312000, status: "Active" },
];

export const purchaseOrders = [
  { id: "PO-2025-0078", supplier: "Gujarat Cotton Mills", items: 5, amount: 32500, currency: "USD", status: "Approved", expectedAt: "2025-05-02", createdAt: "2025-04-12" },
  { id: "PO-2025-0077", supplier: "Shenzhen Electronics", items: 12, amount: 86200, currency: "USD", status: "In Transit", expectedAt: "2025-04-28", createdAt: "2025-04-08" },
  { id: "PO-2025-0076", supplier: "Kerala Spice Estates", items: 4, amount: 12800, currency: "USD", status: "Pending", expectedAt: "2025-05-05", createdAt: "2025-04-15" },
  { id: "PO-2025-0075", supplier: "Punjab Grain Co.", items: 8, amount: 54000, currency: "USD", status: "Delivered", expectedAt: "2025-04-15", createdAt: "2025-04-01" },
];

export const invoices = [
  { id: "INV-2025-0156", customer: "Mumbai Textiles Ltd", orderId: "SO-2025-0089", amount: 48500, currency: "USD", status: "Pending", issuedAt: "2025-04-16", dueAt: "2025-05-16" },
  { id: "INV-2025-0155", customer: "Osaka Electronics", orderId: "SO-2025-0088", amount: 215000, currency: "USD", status: "Paid", issuedAt: "2025-04-13", dueAt: "2025-05-13" },
  { id: "INV-2025-0154", customer: "Cairo Spices LLC", orderId: "SO-2025-0086", amount: 18000, currency: "USD", status: "Paid", issuedAt: "2025-04-05", dueAt: "2025-05-05" },
  { id: "INV-2025-0153", customer: "Berlin Auto GmbH", orderId: "SO-2025-0087", amount: 124000, currency: "EUR", status: "Overdue", issuedAt: "2025-03-15", dueAt: "2025-04-14" },
  { id: "INV-2025-0152", customer: "Sao Paulo Coffee", orderId: "SO-2025-0085", amount: 67000, currency: "USD", status: "Pending", issuedAt: "2025-04-09", dueAt: "2025-05-09" },
];

export const payments = [
  { id: "PAY-2025-0093", invoiceId: "INV-2025-0155", customer: "Osaka Electronics", amount: 215000, currency: "USD", method: "Wire Transfer", status: "Completed", receivedAt: "2025-04-20" },
  { id: "PAY-2025-0092", invoiceId: "INV-2025-0154", customer: "Cairo Spices LLC", amount: 18000, currency: "USD", method: "LC", status: "Completed", receivedAt: "2025-04-18" },
  { id: "PAY-2025-0091", invoiceId: "INV-2025-0150", customer: "Toronto Pharma Inc", amount: 89000, currency: "CAD", method: "Wire Transfer", status: "Pending", receivedAt: "—" },
];

export const employees = [
  { id: "E-001", name: "Preethi", role: "Manager", department: "Management", email: "preethi@acme.com", phone: "+91 98765 00001", status: "Active", joinedAt: "2020-01-15" },
  { id: "E-002", name: "Madhumitha", role: "Secretary", department: "Admin", email: "madhumithamurugesan2005@gmail.com", phone: "+91 98765 00002", status: "Active", joinedAt: "2021-02-10" },
  { id: "E-003", name: "Uma Parameshwari", role: "Networks and Security", department: "IT", email: "uma@acme.com", phone: "+91 98765 00003", status: "Active", joinedAt: "2021-03-22" },
  { id: "E-004", name: "Karunya", role: "Software Developer", department: "IT", email: "karunyaahjothiprakash@gmail.com", phone: "+91 98765 00004", status: "Active", joinedAt: "2022-05-18" },
  { id: "E-005", name: "Nethra", role: "Software Developer Intern", department: "IT", email: "sreenethra681@gmail.com", phone: "+91 98765 00005", status: "Active", joinedAt: "2024-01-10" },
  { id: "E-006", name: "Swathi", role: "Software Developer Intern", department: "IT", email: "swathi@acme.com", phone: "+91 98765 00006", status: "Active", joinedAt: "2024-01-10" },
  { id: "E-008", name: "Jaya Sri", role: "Data Analyst", department: "Data", email: "jayasri@acme.com", phone: "+91 98765 00008", status: "Active", joinedAt: "2023-04-12" },
  { id: "E-009", name: "Gayathri", role: "BDE", department: "Sales", email: "gayathrishanmugam813@gmail.com", phone: "+91 98765 00009", status: "Active", joinedAt: "2022-08-25" },
  { id: "E-010", name: "Vemula Navya lahari", role: "BDE", department: "Sales", email: "vemulanavyalahari009@gmail.com", phone: "+91 98765 00010", status: "Active", joinedAt: "2024-05-01" },
];

export const notifications = [
  { id: "N-1", type: "info", title: "New quotation approved", body: "QT-2025-0142 was approved by David Park", time: "5m ago", read: false },
  { id: "N-2", type: "warning", title: "Shipment delay risk", body: "SH-2025-0042 may be delayed by 2 days", time: "1h ago", read: false },
  { id: "N-3", type: "destructive", title: "Overdue payment", body: "INV-2025-0153 is 5 days overdue", time: "3h ago", read: false },
  { id: "N-4", type: "success", title: "Payment received", body: "USD 215,000 from Osaka Electronics", time: "1d ago", read: true },
  { id: "N-5", type: "info", title: "Low stock alert", body: "Cardamom Pods Grade A is below reorder level", time: "2d ago", read: true },
];

export const activityLogs = [
  { id: "A-1", actor: "John Doe", action: "Created quotation QT-2025-0142", entity: "quotation", time: "2025-04-15 10:23", team: "Sales" },
  { id: "A-2", actor: "Sara Kim", action: "Updated lead L-1041 status to Warm", entity: "lead", time: "2025-04-17 14:08", team: "Sales" },
  { id: "A-3", actor: "David Park", action: "Approved invoice INV-2025-0156", entity: "invoice", time: "2025-04-16 09:42", team: "Finance" },
  { id: "A-4", actor: "Maria Lopez", action: "Marked SH-2025-0044 as Delivered", entity: "shipment", time: "2025-04-18 16:55", team: "Logistics" },
  { id: "A-5", actor: "System", action: "Auto-generated PO-2025-0076 from low stock", entity: "po", time: "2025-04-15 03:00", team: "System" },
];

export const salesByMonth = [
  { month: "Nov", revenue: 412000, orders: 28 },
  { month: "Dec", revenue: 528000, orders: 34 },
  { month: "Jan", revenue: 491000, orders: 31 },
  { month: "Feb", revenue: 612000, orders: 38 },
  { month: "Mar", revenue: 745000, orders: 45 },
  { month: "Apr", revenue: 892000, orders: 52 },
];

export const revenueByCountry = [
  { country: "USA", revenue: 1240000 },
  { country: "Germany", revenue: 892000 },
  { country: "Japan", revenue: 728000 },
  { country: "UAE", revenue: 412000 },
  { country: "Brazil", revenue: 318000 },
  { country: "Others", revenue: 245000 },
];

export const shipmentStatusBreakdown = [
  { name: "Delivered", value: 142, color: "hsl(var(--chart-2))" },
  { name: "In Transit", value: 38, color: "hsl(var(--chart-4))" },
  { name: "Processing", value: 22, color: "hsl(var(--chart-3))" },
  { name: "Pending", value: 14, color: "hsl(var(--chart-5))" },
];
