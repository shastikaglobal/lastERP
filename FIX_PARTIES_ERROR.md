# Fix: Parties Table Missing - Setup Instructions

## Problem
The Parties section in Masters layout is showing: **"Unable to load parties. Check your database connection."**

This is because the `parties` table doesn't exist in your Supabase database.

## Solution

### Step 1: Apply the Migration to Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the SQL migration from `supabase/migrations/20260610_create_parties_table.sql`
6. Click **Execute**

The SQL will:
- Create the `parties` table with proper schema
- Set up Row Level Security (RLS) policies
- Seed sample data with 6 parties (3 customers + 3 vendors)

### Step 2: Verify the Setup

After running the migration, verify that everything works:

1. Refresh your application in the browser
2. Navigate to **Masters > Parties**
3. You should see the list of parties with the sample data

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

### Alternative: Use Environment Variables (Node.js)

If you want to run the migration programmatically:

```bash
# Set environment variables
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run migration
node run_migration.mjs supabase/migrations/20260610_create_parties_table.sql
```

## Schema Overview

The `parties` table has these fields:

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| company_id | UUID | Reference to company (RLS filter) |
| name | TEXT | Party name (required) |
| gstin | TEXT | GST Identification Number |
| type | ENUM | 'Customer' or 'Vendor' |
| state | TEXT | State/Province |
| credit_limit | NUMERIC | Credit limit amount |
| outstanding | NUMERIC | Outstanding balance |
| overdue | NUMERIC | Overdue amount |
| status | ENUM | 'Active', 'Pending', or 'Inactive' |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Sample Data

The migration seeds 6 parties:

**Customers:**
- Sahara Traders (₹12,00,000 credit limit)
- Rural Agri (₹9,75,000 credit limit)
- Greenfield Exports (₹6,50,000 credit limit)

**Vendors:**
- Metro Suppliers (₹8,50,000 credit limit)
- Nexa Industries (₹15,00,000 credit limit)
- Apex Logistics (₹11,00,000 credit limit)

## Support

If the issue persists:

1. Check the database logs in Supabase dashboard
2. Verify RLS is enabled: Supabase > Database > Policies > parties
3. Ensure all policies are created (should see 4 policies: SELECT, INSERT, UPDATE, DELETE)
4. Check your user's company assignment in the `profiles` table
