// ============================================================
// src/lib/supabase.js
// Supabase client + all face attendance helper functions
// ============================================================

import { createClient } from '@supabase/supabase-js'

// ── Put your Supabase keys here ──────────────────────────────
// Get from: Supabase Dashboard > Settings > API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'
const SUPABASE_SERVICE_KEY = typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : 'YOUR_SERVICE_KEY'

// Public client (frontend)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Admin client (backend API routes only - never expose to frontend)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)


// ============================================================
// EMPLOYEE FUNCTIONS
// ============================================================

/**
 * Get all active employees
 */
export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

/**
 * Get today's attendance for all employees
 */
export async function getTodayAttendance() {
  const { data, error } = await supabase
    .from('today_attendance')
    .select('*')
  if (error) throw error
  return data
}

/**
 * Get attendance history for one employee
 */
export async function getEmployeeHistory(employeeId, fromDate, toDate) {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      employees(name, bio_id, department)
    `)
    .eq('employee_id', employeeId)
    .not('is_deleted', 'eq', true)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Get monthly report for admin
 */
export async function getMonthlyReport(month) {
  const { data, error } = await supabase
    .from('monthly_report')
    .select('*')
    .eq('month', month)
    .order('name')
  if (error) throw error
  return data
}


// ============================================================
// FACE RECOGNITION FUNCTIONS
// ============================================================

/**
 * Find employee by face embedding vector
 * Uses pgvector cosine similarity
 *
 * @param {number[]} embedding - 128-dim float array from face-api.js
 * @param {number} threshold - minimum match score (0.0-1.0), default 0.80
 */
export async function matchFaceToEmployee(embedding, threshold = 0.80) {
  const { data, error } = await supabase.rpc('match_face', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: 1
  })
  if (error) throw error
  return data?.[0] || null   // Returns { id, name, bio_id, department, similarity } or null
}

/**
 * Register / update a face embedding for an employee
 *
 * @param {string} employeeId
 * @param {number[]} embedding - 128-dim array
 * @param {File|null} faceImageFile - optional face photo to store
 */
export async function registerFaceEmbedding(employeeId, embedding, faceImageFile = null) {
  let faceImageUrl = null

  // Upload face image to Supabase Storage if provided
  if (faceImageFile) {
    const fileName = `${employeeId}_${Date.now()}.jpg`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('face-data')
      .upload(`faces/${fileName}`, faceImageFile, {
        contentType: 'image/jpeg',
        upsert: true
      })
    if (uploadError) throw uploadError
    faceImageUrl = uploadData.path
  }

  const { data, error } = await supabaseAdmin
    .from('employees')
    .update({
      face_embedding: embedding,
      face_registered_at: new Date().toISOString(),
      ...(faceImageUrl && { face_image_url: faceImageUrl }),
      updated_at: new Date().toISOString()
    })
    .eq('id', employeeId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark attendance using the database stored procedure
 *
 * @param {string} employeeId
 * @param {number} confidence - match score 0-100
 * @param {boolean} livenessPass
 */
export async function markAttendance(employeeId, confidence, livenessPass, ip = null) {
  const { data, error } = await supabaseAdmin.rpc('mark_attendance', {
    p_employee_id: employeeId,
    p_confidence: confidence,
    p_liveness: livenessPass,
    p_ip: ip
  })
  if (error) throw error
  return data  // { action: 'punch_in'|'punch_out', employee, is_late, late_by_mins, salary_cut }
}

/**
 * Log every face scan attempt (matched or failed)
 */
export async function logFaceScanEvent({
  employeeId = null,
  matchScore,
  livenessScore,
  motionPass,
  blinkPass,
  depthPass,
  spoofPass,
  status,   // 'matched' | 'failed' | 'spoof_detected' | 'no_face'
  errorReason = null,
  ip = null
}) {
  const { error } = await supabaseAdmin
    .from('face_scan_events')
    .insert({
      employee_id: employeeId,
      match_score: matchScore,
      liveness_score: livenessScore,
      motion_pass: motionPass,
      blink_pass: blinkPass,
      depth_pass: depthPass,
      spoof_pass: spoofPass,
      status,
      error_reason: errorReason,
      ip_address: ip,
      scanned_at: new Date().toISOString()
    })
  if (error) throw error
}

/**
 * Realtime subscription: listen for new attendance punches
 * Updates UI live when any employee scans in
 *
 * @param {function} onInsert - callback({ new: attendanceRow })
 * @returns unsubscribe function
 */
export function subscribeToAttendance(onInsert) {
  const channel = supabase
    .channel('attendance_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'attendance_logs' },
      onInsert
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

/**
 * Realtime: listen for new face scan events (for activity log)
 */
export function subscribeToScanEvents(onNew) {
  const channel = supabase
    .channel('scan_events_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'face_scan_events' },
      onNew
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}


// ============================================================
// ADMIN REPORT FUNCTIONS
// ============================================================

/**
 * Get attendance report with filters
 */
export async function getAttendanceReport({ fromDate, toDate, department = null }) {
  let query = supabase
    .from('attendance_logs')
    .select(`
      *,
      employees(name, bio_id, department, role)
    `)
    .not('is_deleted', 'eq', true)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: false })

  if (department) {
    query = query.eq('employees.department', department)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Get salary cut report for payroll
 */
export async function getSalaryCutReport(month) {
  const startDate = `${month}-01`
  const endDate = new Date(month + '-01')
  endDate.setMonth(endDate.getMonth() + 1)
  endDate.setDate(0)
  const endDateStr = endDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('attendance_logs')
    .select(`
      employee_id,
      salary_cut,
      late_by_mins,
      is_late,
      date,
      employees(name, bio_id, department)
    `)
    .not('is_deleted', 'eq', true)
    .gte('date', startDate)
    .lte('date', endDateStr)
    .eq('is_late', true)
    .order('date')

  if (error) throw error
  return data
}

/**
 * Get today's summary stats (for dashboard header cards)
 */
export async function getTodayStats() {
  const today = new Date().toISOString().split('T')[0]

  const [{ count: totalEmp }, { count: present }, { count: late }, { data: cuts }] =
    await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present').not('is_deleted', 'eq', true),
      supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).eq('date', today).eq('is_late', true).not('is_deleted', 'eq', true),
      supabase.from('attendance_logs').select('salary_cut').eq('date', today).not('is_deleted', 'eq', true)
    ])

  const totalCut = cuts?.reduce((sum, r) => sum + (r.salary_cut || 0), 0) || 0

  return {
    totalEmployees: totalEmp || 0,
    presentToday: present || 0,
    lateToday: late || 0,
    totalSalaryCut: totalCut
  }
}
