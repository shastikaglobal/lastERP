/**
 * supabase.js - src/services/supabase.js
 * Fixed: removed process.env (Vite only uses import.meta.env)
 */

import { createClient } from '@supabase/supabase-js';

// ─── Client initialisation ────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[supabase.js] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
});

// ─── Employee helpers ─────────────────────────────────────────────────────────

export async function getEmployees() {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('full_name');
    if (error) throw error;
    return data;
}

export async function getAllEmployees() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .eq('is_deleted', false)
        .order('full_name');
    if (error) throw error;
    return data;
}


export async function getEmployee(employeeId) {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
    if (error) throw error;
    return data;
}

export async function createEmployee(payload) {
    const { data, error } = await supabase
        .from('employees')
        .insert([payload])
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ─── Face Embedding helpers ───────────────────────────────────────────────────

export async function saveFaceEmbedding(employeeId, embeddingArray, sampleIndex = 0, qualityScore = null) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');
    const payload = {
        employee_id: employeeId,
        face_embedding: Array.from(embeddingArray),
        sample_index: sampleIndex,
        quality_score: qualityScore,
        model_version: 'face-api-ssd-mobilenetv1',
    };
    const res = await fetch('/api/employees/bio-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save face embedding to VPS DB');
    return await res.json();
}

export async function getEmployeeFaceEmbeddings(employeeId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');
    const res = await fetch(`/api/employees/${employeeId}/bio-data`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch face embeddings from VPS DB');
    return await res.json();
}

export async function getAllFaceEmbeddings() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');
    const res = await fetch('/api/employees/bio-data/all', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch all face embeddings from VPS DB');
    return await res.json();
}

export async function deleteFaceEmbeddings(employeeId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');
    const res = await fetch(`/api/employees/${employeeId}/bio-data`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!res.ok) throw new Error('Failed to delete face embeddings from VPS DB');
    return await res.json();
}

// ─── Attendance helpers ───────────────────────────────────────────────────────

export async function recordCheckIn(employeeId, confidenceScore) {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const hour = new Date().getHours();
    const mins = new Date().getMinutes();
    const status = (hour > 8 || (hour === 8 && mins > 0)) ? 'late' : 'present';

    // Verify employee exists to satisfy foreign key constraint
    const employee = await getEmployee(employeeId);
    if (!employee) {
        throw new Error(`Employee with ID ${employeeId} does not exist`);
    }
    const payload = {
        employee_id: employeeId,
        date: today,
        clock_in: now,
        status,
        is_manual: false,
        notes: confidenceScore ? `Face match: ${(confidenceScore * 100).toFixed(1)}%` : null,
    };
    const { data, error } = await supabase
        .from('attendance_logs')
        .upsert([payload], { onConflict: 'employee_id,date', ignoreDuplicates: false })
        .select()
        .single();
    if (error) throw error;
    
    // Sync to local database
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await fetch('/api/attendance/face-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    employee_id: employeeId,
                    date: today,
                    check_in: now,
                    status
                })
            });
        }
    } catch(err) {
        console.error("Local face-sync check-in error:", err);
    }
    
    return data;
}

export async function recordCheckOut(employeeId) {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

        // Verify employee exists to satisfy foreign key constraint using safe query
    const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .maybeSingle();
    if (empError) {
        throw empError;
    }
    if (!empData) {
        throw new Error(`Employee with ID ${employeeId} does not exist`);
    }

    const { data, error } = await supabase
        .from('attendance_logs')
        .update({ clock_out: now })
        .eq('employee_id', employeeId)
        .eq('date', today)
        .select()
        .single();
    if (error) throw error;

    // Sync to local database
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await fetch('/api/attendance/face-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    employee_id: employeeId,
                    date: today,
                    check_out: now
                })
            });
        }
    } catch(err) {
        console.error("Local face-sync check-out error:", err);
    }

    return data;
}

export async function getTodayAttendance(employeeId) {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', today)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function getAttendanceHistory(employeeId, limit = 30) {
    const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data;
}

export async function getTodaySummary() {
    const { data, error } = await supabase
        .from('today_attendance')
        .select('*')
        .order('name');
    if (error) throw error;
    return data;
}

export async function getAttendanceRange(from, to) {
    const { data, error } = await supabase
        .from('attendance_logs')
        .select(`*, employees ( full_name, role )`)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });
    if (error) throw error;
    return data;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export default supabase;