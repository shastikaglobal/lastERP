# Fix: Chart of Accounts Table Missing - Setup Instructions

## Problem
The Chart of Accounts section in Masters layout is showing: **"Unable to load accounts. Showing defaults until the database is available."**

This is because the `chart_of_accounts` table doesn't exist in your Supabase database.

## Solution

### Step 1: Apply the Migration to Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the SQL migration from `supabase/migrations/20260610_create_chart_of_accounts_table.sql`
6. Click **Execute**

The SQL will:
- Create the `chart_of_accounts` table with proper schema
- Set up Row Level Security (RLS) policies for company-level access
- Seed sample data with 23 standard accounting accounts across all categories

### Step 2: Verify the Setup

After running the migration, verify that everything works:

1. Refresh your application in the browser
2. Navigate to **Masters > Chart of Accounts**
3. You should see the list of accounts grouped by category (Assets, Liabilities, Equity, Revenue, Expenses)

### If You Still Get an Error

Check the browser console for the actual error message:

1. Open **Developer Tools** (F12)
2. Go to **Console** tab
3. Copy the detailed error message
4. Check these common issues:

#### Issue A: RLS Policy Blocking Access
- Make sure your user has a valid `company_id` in the `profiles` table
- Go to Supabase **Table Editor** > `profiles` table
- Verify your user record has a `company_id` value

#### Issue B: Authentication Issue
- Check the **Console** tab for auth-related errors
- Make sure you're logged in to the application
- Check if the auth token is expired

#### Issue C: Database Connection Issue
- Go to Supabase **Database** tab
- Check connection status
- Click **Reset Password** if needed to restore access

## Schema Overview

The `chart_of_accounts` table has these fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| company_id | UUID | Reference to company (RLS filter) |
| code | TEXT | Account code (unique, e.g., "1001") |
| name | TEXT | Account name (required) |
| group | TEXT | Account group (e.g., "Current Assets") |
| type | ENUM | Account type: Asset, Liability, Income, Expense, Equity |
| balance | NUMERIC | Current account balance |
| gst | BOOLEAN | Whether account is subject to GST |
| status | ENUM | 'Active' or 'Inactive' |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Sample Data Included

The migration seeds 23 standard accounts:

**Current Assets (4)**
- 1001: Cash
- 1002: Bank Account
- 1003: Accounts Receivable
- 1004: Short-term Investments

**Fixed Assets (3)**
- 1100: Land & Building
- 1101: Plant & Equipment
- 1102: Furniture & Fixtures

**Current Liabilities (3)**
- 2001: Accounts Payable
- 2002: Short-term Loan
- 2003: Salary Payable

**Long-term Liabilities (1)**
- 2100: Long-term Loan

**Equity (2)**
- 3001: Owner Capital
- 3002: Retained Earnings

**Revenue (3)**
- 4001: Sales Revenue
- 4002: Service Revenue
- 4003: Other Income

**Direct Expenses (2)**
- 5001: Cost of Goods Sold
- 5002: Raw Materials

**Indirect Expenses (7)**
- 6001: Salary & Wages
- 6002: Rent Expense
- 6003: Utilities
- 6004: Office Supplies
- 6005: Marketing & Advertising
- 6006: Depreciation
- 6007: Interest Expense

## Account Type Definitions

- **Asset**: Resources owned by the company (Cash, Equipment, Buildings, etc.)
- **Liability**: Money owed by the company (Loans, Accounts Payable, etc.)
- **Equity**: Owner's stake in the company (Capital, Retained Earnings)
- **Income**: Money earned by the company (Sales, Service Revenue)
- **Expense**: Money spent by the company (Rent, Salaries, Utilities)

## GST Applicability

Accounts marked with GST = true include:
- Sales Revenue
- Service Revenue
- Cost of Goods Sold
- Raw Materials
- Rent Expense
- Utilities
- Office Supplies
- Marketing & Advertising

## Support

If the issue persists:

1. Check the database logs in Supabase dashboard
2. Verify RLS is enabled: Supabase > Database > Policies > chart_of_accounts
3. Ensure all 4 policies are created: SELECT, INSERT, UPDATE, DELETE
4. Check your user's company assignment in the `profiles` table
5. Verify both migration files have been executed:
   - `20260610_create_parties_table.sql`
   - `20260610_create_chart_of_accounts_table.sql`
