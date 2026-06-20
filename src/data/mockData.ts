export const journalEntries = [
  { id: 'JV-2026-001', date: '10 Mar 2026', narration: 'Sales to ABC Corp', voucher: 'Sales', debit: 50000, credit: null, status: 'Posted' },
  { id: 'JV-2026-002', date: '11 Mar 2026', narration: 'Payment to Supplier', voucher: 'Payment', debit: null, credit: 20000, status: 'Posted' },
  { id: 'JV-2026-003', date: '12 Mar 2026', narration: 'Office Rent', voucher: 'Journal', debit: 15000, credit: null, status: 'Draft' },
  { id: 'JV-2026-004', date: '13 Mar 2026', narration: 'Cash Deposit', voucher: 'Contra', debit: 10000, credit: null, status: 'Posted' },
  { id: 'JV-2026-005', date: '14 Mar 2026', narration: 'Salary Payment', voucher: 'Payment', debit: null, credit: 80000, status: 'Posted' },
]

export const gstrData = [
  { inv: 'INV-2026-101', party: 'Kaveri Traders', gstin: '33AABCE1234F1Z5', date: '01 Mar 2026', taxable: 45000, cgst: 4050, sgst: 4050, igst: 0, total: 53100 },
  { inv: 'INV-2026-102', party: 'Shree Agro', gstin: '33AACCK1234B1Z9', date: '05 Mar 2026', taxable: 78000, cgst: 7020, sgst: 7020, igst: 0, total: 92040 },
  { inv: 'INV-2026-103', party: 'Green Leaf Foods', gstin: '33AAECE1234F1Z1', date: '12 Mar 2026', taxable: 52000, cgst: 4680, sgst: 4680, igst: 0, total: 61360 },
  { inv: 'INV-2026-104', party: 'Mysuru Mills', gstin: '33AABCE1234F1Z5', date: '18 Mar 2026', taxable: 69000, cgst: 6210, sgst: 6210, igst: 0, total: 81420 },
  { inv: 'INV-2026-105', party: 'Sri Sai Suppliers', gstin: '33AABCE1234F1Z5', date: '22 Mar 2026', taxable: 36000, cgst: 3240, sgst: 3240, igst: 0, total: 42480 },
]

export const ledgerEntries = [
  { date: '01 Mar 2026', particulars: 'Sales to Raj Exports', voucher: 'INV-123', type: 'Invoice', debit: 0, credit: 220000, balance: 220000, balType: 'Cr' },
  { date: '04 Mar 2026', particulars: 'Cash Deposit', voucher: 'JV-0043', type: 'Journal', debit: 15000, credit: 0, balance: 205000, balType: 'Cr' },
  { date: '10 Mar 2026', particulars: 'Payment from Kaveri Traders', voucher: 'REC-789', type: 'Receipt', debit: 0, credit: 450000, balance: 655000, balType: 'Cr' },
  { date: '16 Mar 2026', particulars: 'Salary Payment', voucher: 'BP-554', type: 'Payment', debit: 80000, credit: 0, balance: 575000, balType: 'Cr' },
  { date: '21 Mar 2026', particulars: 'Purchase of Raw Material', voucher: 'PUR-321', type: 'Purchase', debit: 120000, credit: 0, balance: 455000, balType: 'Cr' },
  { date: '28 Mar 2026', particulars: 'Interest Income', voucher: 'INC-101', type: 'Income', debit: 0, credit: 50000, balance: 505000, balType: 'Cr' },
]

export const parties = [
  { name: 'Sahara Traders', gstin: '29AABCS1234F1Z2', type: 'Customer', state: 'Karnataka', creditLimit: '₹12,00,000', outstanding: 175000, overdue: 25000, status: 'Active' },
  { name: 'Metro Suppliers', gstin: '27AABCM1234F1Z4', type: 'Vendor', state: 'Maharashtra', creditLimit: '₹8,50,000', outstanding: -95000, overdue: 0, status: 'Active' },
  { name: 'Rural Agri', gstin: '33AAEER1234F1Z9', type: 'Customer', state: 'Karnataka', creditLimit: '₹9,75,000', outstanding: 62000, overdue: 17000, status: 'Active' },
  { name: 'Nexa Industries', gstin: '07AABCN1234F1Z6', type: 'Vendor', state: 'Uttar Pradesh', creditLimit: '₹15,00,000', outstanding: -42000, overdue: 0, status: 'Active' },
  { name: 'Greenfield Exports', gstin: '29AABCG1234F1Z7', type: 'Customer', state: 'Karnataka', creditLimit: '₹6,50,000', outstanding: 43000, overdue: 8800, status: 'Pending' },
  { name: 'Apex Logistics', gstin: '33AABCA1234F1Z8', type: 'Vendor', state: 'Tamil Nadu', creditLimit: '₹11,00,000', outstanding: -20500, overdue: 0, status: 'Active' },
]

export const trialBalance = [
  { account: 'Cash', group: 'Assets', openDr: 150000, openCr: 0, txnDr: 22000, txnCr: 0, closeDr: 172000, closeCr: 0 },
  { account: 'Accounts Receivable', group: 'Debtors', openDr: 420000, openCr: 0, txnDr: 80000, txnCr: 0, closeDr: 500000, closeCr: 0 },
  { account: 'Inventory', group: 'Assets', openDr: 310000, openCr: 0, txnDr: 45000, txnCr: 0, closeDr: 355000, closeCr: 0 },
  { account: 'Accounts Payable', group: 'Liability', openDr: 0, openCr: 230000, txnDr: 0, txnCr: 67000, closeDr: 0, closeCr: 297000 },
  { account: 'Capital', group: 'Capital', openDr: 0, openCr: 560000, txnDr: 0, txnCr: 0, closeDr: 0, closeCr: 560000 },
  { account: 'Sales Revenue', group: 'Revenue', openDr: 0, openCr: 780000, txnDr: 0, txnCr: 22000, closeDr: 0, closeCr: 802000 },
  { account: 'Purchase Expense', group: 'Expense', openDr: 230000, openCr: 0, txnDr: 0, txnCr: 32000, closeDr: 198000, closeCr: 0 },
  { account: 'Rent Expense', group: 'Expense', openDr: 120000, openCr: 0, txnDr: 0, txnCr: 0, closeDr: 120000, closeCr: 0 },
]

export const fmt = (n: number | null | undefined) => n ? n.toLocaleString('en-IN') : '—'
