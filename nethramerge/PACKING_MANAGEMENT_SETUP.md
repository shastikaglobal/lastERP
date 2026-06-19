# 🔧 Packing Management - Database Setup

## ⚠️ Issue: "Failed to create packing protocol"

This error occurs because the `packing_protocols` table doesn't exist in your Supabase database yet.

## ✅ How to Fix

### Option 1: Run SQL in Supabase Dashboard (Recommended)

1. **Log in to Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run the Setup Script**
   - Open the file: `PACKING_SETUP.sql` in this project root
   - Copy ALL the SQL code
   - Paste it into the Supabase SQL Editor
   - Click "Run" button (▶️)

4. **Verify Success**
   - You should see output confirming the table exists
   - Look for: `table_name | packing_protocols`

---

### Option 2: Manual SQL Execution

If Option 1 doesn't work, run this SQL step by step in Supabase:

```sql
-- Create table
CREATE TABLE IF NOT EXISTS public.packing_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id TEXT NOT NULL,
  carton_count INTEGER NOT NULL DEFAULT 1,
  net_weight NUMERIC NOT NULL DEFAULT 0,
  gross_weight NUMERIC NOT NULL DEFAULT 0,
  pallet_config TEXT DEFAULT 'EUR',
  export_marks TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.packing_protocols ENABLE ROW LEVEL SECURITY;

-- Create basic policy
CREATE POLICY "Enable all for authenticated" 
  ON public.packing_protocols 
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

---

## 🧪 Testing After Setup

1. **Refresh the application**
   - Go to: http://localhost:8080
   - Navigate to Warehouse > Packing Management

2. **Try Creating a Packing Protocol**
   - Click "New Packing" button
   - Fill in the form:
     - Select/Enter Receiving Number
     - Enter Carton Count: 5
     - Enter Net Weight: 100
     - Enter Gross Weight: 110
   - Click "Create Packing Protocol"

3. **Expected Result**
   - Green success toast message
   - New packing protocol appears in the list

---

## ❓ Still Having Issues?

### Error: "relation packing_protocols does not exist"
- The table hasn't been created yet
- Follow the setup steps above

### Error: "permission denied"
- RLS policies may be too restrictive
- Try the manual SQL with the `USING (auth.uid() IS NOT NULL)` policy

### Error: "invalid input syntax"
- Check that all fields are filled correctly
- Ensure numbers are entered for weights/quantities

---

## 📋 Database Table Schema

The `packing_protocols` table structure:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | UUID | Yes | Auto-generated |
| `receiving_id` | TEXT | Yes | Receiving number (from goods_receiving or manual) |
| `carton_count` | INTEGER | Yes | Number of cartons/bags |
| `net_weight` | NUMERIC | Yes | Weight in kg without packaging |
| `gross_weight` | NUMERIC | Yes | Total weight in kg with packaging |
| `pallet_config` | TEXT | No | EUR, ISO, HALF_EUR, or CUSTOM |
| `export_marks` | TEXT | No | Shipping marks and handling instructions |
| `status` | TEXT | No | draft, in_progress, completed, or archived |
| `company_id` | UUID | Yes | Company identifier |
| `created_by` | UUID | Yes | User who created the record |
| `created_at` | TIMESTAMPTZ | No | Auto-generated timestamp |
| `updated_at` | TIMESTAMPTZ | No | Auto-updated timestamp |

---

## 🚀 After Database Setup

Once the table is created:
- ✅ All CRUD operations will work
- ✅ PDF generation will function
- ✅ Packing lists can be exported
- ✅ Statistics will display correctly

Need help? Check the console for detailed error messages (F12 in browser).
