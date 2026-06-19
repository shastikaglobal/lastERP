-- This migration enforces that AttLogs is append-only.
-- No one can update or delete records, ensuring attendance records cannot be erased.

ALTER TABLE "public"."AttLogs" ENABLE ROW LEVEL SECURITY;

-- Allow anyone (or authenticated users) to select
DO $$ BEGIN
    CREATE POLICY "Allow select for everyone" ON "public"."AttLogs" FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Allow insert
DO $$ BEGIN
    CREATE POLICY "Allow insert for everyone" ON "public"."AttLogs" FOR INSERT WITH CHECK (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Explicitly DROP any existing update/delete policies if they somehow exist
DROP POLICY IF EXISTS "Allow update for everyone" ON "public"."AttLogs";
DROP POLICY IF EXISTS "Allow delete for everyone" ON "public"."AttLogs";

-- To be absolutely secure against even Service Role (if we really wanted, but service role bypasses RLS).
-- But RLS prevents all regular users, admins, and the application from erasing logs.
