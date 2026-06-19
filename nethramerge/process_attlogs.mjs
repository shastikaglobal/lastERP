/**
 * AttLogs → attendance_logs bridge processor
 * Reads raw punches from AttLogs (populated by VPS) and upserts into attendance_logs
 * Can be run manually or on a schedule.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function processAttLogs(dateStr = null) {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  console.log(`\n⏳ Processing AttLogs → attendance_logs for date: ${targetDate}`);

  // 1. Load profiles map: biometric_id → { id, company_id }
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, company_id, biometric_id')
    .not('biometric_id', 'is', null);

  if (profErr) throw new Error('Failed to load profiles: ' + profErr.message);

  const profileMap = {};
  for (const p of profiles) profileMap[String(p.biometric_id)] = p;
  console.log(`👤 Loaded ${profiles.length} profiles with biometric IDs.`);

  // 2. Load all AttLogs for the target date
  const { data: logs, error: logsErr } = await supabase
    .from('AttLogs')
    .select('*')
    .gte('LogDateTime', `${targetDate}T00:00:00`)
    .lte('LogDateTime', `${targetDate}T23:59:59`)
    .order('LogDateTime', { ascending: true });

  if (logsErr) throw new Error('Failed to load AttLogs: ' + logsErr.message);
  console.log(`📥 Found ${logs.length} AttLog entries for ${targetDate}.`);

  if (logs.length === 0) {
    console.log('😴 Nothing to process.');
    return;
  }

  // 3. Group punches by EmployeeCode
  const byEmployee = {};
  for (const log of logs) {
    const empCode = String(log.EmployeeCode).trim();
    if (!byEmployee[empCode]) byEmployee[empCode] = [];
    byEmployee[empCode].push({
      time: new Date(log.LogDateTime + '+05:30'), // IST → UTC
      direction: String(log.Direction || '').toLowerCase(),
    });
  }

  let successCount = 0;
  let skippedCount = 0;

  // 4. For each employee, compute clock_in / clock_out and upsert
  for (const [empCode, punches] of Object.entries(byEmployee)) {
    const profile = profileMap[empCode];
    if (!profile) {
      console.warn(`⚠️ Skipped: No profile found for biometric_id [${empCode}]`);
      skippedCount++;
      continue;
    }

    punches.sort((a, b) => a.time - b.time);

    const inPunches  = punches.filter(p => p.direction === 'in').map(p => p.time);
    const outPunches = punches.filter(p => p.direction === 'out').map(p => p.time);
    const allTimes   = punches.map(p => p.time);

    // Earliest IN punch = clock_in; latest OUT punch = clock_out
    let clockIn  = inPunches.length  > 0 ? inPunches[0]                        : allTimes[0];
    let clockOut = outPunches.length > 0 ? outPunches[outPunches.length - 1]   : null;

    // Fallback: if no out punch but last punch is 15+ min after first, treat as clock_out
    if (!clockOut && allTimes.length > 1) {
      const last = allTimes[allTimes.length - 1];
      if (last - clockIn >= 15 * 60 * 1000) clockOut = last;
    }

    const clockInIso  = clockIn  ? clockIn.toISOString()  : null;
    const clockOutIso = clockOut ? clockOut.toISOString() : null;

    console.log(`🔄 [${empCode}] clock_in=${clockInIso?.substring(11,19)} clock_out=${clockOutIso?.substring(11,19) || '-'}`);

    // Check existing record
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('id, clock_in, clock_out')
      .eq('employee_id', profile.id)
      .eq('date', targetDate)
      .maybeSingle();

    if (existing) {
      // Keep earliest clock_in, latest clock_out
      const finalIn  = existing.clock_in
        ? (new Date(existing.clock_in) < new Date(clockInIso) ? existing.clock_in : clockInIso)
        : clockInIso;

      const finalOut = existing.clock_out && clockOutIso
        ? (new Date(existing.clock_out) > new Date(clockOutIso) ? existing.clock_out : clockOutIso)
        : (clockOutIso || existing.clock_out);

      const { error } = await supabase
        .from('attendance_logs')
        .update({ clock_in: finalIn, clock_out: finalOut, status: 'present' })
        .eq('id', existing.id);

      if (error) console.error(`❌ Update failed for [${empCode}]:`, error.message);
      else { console.log(`  ✅ Updated`); successCount++; }
    } else {
      const { error } = await supabase
        .from('attendance_logs')
        .insert({
          employee_id: profile.id,
          company_id:  profile.company_id,
          date:        targetDate,
          status:      'present',
          clock_in:    clockInIso,
          clock_out:   clockOutIso,
        });

      if (error) console.error(`❌ Insert failed for [${empCode}]:`, error.message);
      else { console.log(`  ✅ Inserted`); successCount++; }
    }
  }

  console.log(`\n🎉 Done! Processed: ${successCount}, Skipped (unmapped): ${skippedCount}`);
}

// Run for today
await processAttLogs();
