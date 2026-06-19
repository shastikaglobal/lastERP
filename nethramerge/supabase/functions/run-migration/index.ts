import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

Deno.serve(async (req) => {
  try {
    const databaseUrl = Deno.env.get("SUPABASE_DB_URL") || Deno.env.get("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("No database connection string found in environment variables");
    }

    // Connect to the database
    const sql = postgres(databaseUrl);

    // SQL to run
    const migrationSql = `
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS monthly_salary numeric default 0,
      ADD COLUMN IF NOT EXISTS punch_deadline time default '08:00:00';

      ALTER TABLE public.attendance_logs
      ADD COLUMN IF NOT EXISTS is_manual boolean default false;

      -- Backfill initial salaries
      UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%gayathri%';
      UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%kaviya%';
      UPDATE public.profiles SET monthly_salary = 30000 WHERE lower(full_name) LIKE '%lakshmana gokul%';
      UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%madhumitha%';
      UPDATE public.profiles SET monthly_salary = 17000 WHERE lower(full_name) LIKE '%uma%';
      UPDATE public.profiles SET monthly_salary = 8000 WHERE lower(full_name) LIKE '%nethra%';
      UPDATE public.profiles SET monthly_salary = 8000 WHERE lower(full_name) LIKE '%swathi%';
      UPDATE public.profiles SET monthly_salary = 30000 WHERE lower(full_name) LIKE '%preethi%';
      UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%karunya%';
      UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%jayasri%';
      UPDATE public.profiles SET monthly_salary = 12000 WHERE lower(full_name) LIKE '%sathpreethika%';
    `;

    // Run the SQL commands as a single block
    await sql.unsafe(migrationSql);

    await sql.end();

    return new Response(JSON.stringify({ success: true, message: "Migration executed successfully!" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
