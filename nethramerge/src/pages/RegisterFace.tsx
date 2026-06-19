import React, { useState, useRef, useCallback, useEffect } from 'react';
import FaceScanner from '../components/FaceScanner';
import { supabase } from '@/integrations/supabase/client';
import {
  saveFaceEmbedding,
  deleteFaceEmbeddings,
  getEmployeeFaceEmbeddings,
} from '../services/supabase';
import {
  loadModels,
  generateEmbedding,
  areModelsLoaded,
} from '../services/faceEngine';

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_SAMPLES = 5;
const SAMPLE_DELAY_MS = 800;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SampleDot({ filled, active }) {
  return (
    <div style={{
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      border: `2px solid ${filled ? '#00ff88' : active ? '#00c8ff' : '#334155'}`,
      background: filled ? '#00ff88' : active ? 'rgba(0,200,255,0.2)' : 'transparent',
      transition: 'all 0.3s ease',
      boxShadow: filled ? '0 0 8px rgba(0,255,136,0.5)' : 'none',
    }} />
  );
}

function Alert({ type, children }) {
  const colours = {
    success: { bg: 'rgba(0,255,136,0.08)', border: '#00ff88', text: '#00ff88' },
    error: { bg: 'rgba(255,68,102,0.08)', border: '#ff4466', text: '#ff8099' },
    info: { bg: 'rgba(0,200,255,0.08)', border: '#00c8ff', text: '#7dd3fc' },
  };
  const c = colours[type] || colours.info;
  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '8px',
      padding: '10px 14px',
      color: c.text,
      fontSize: '13px',
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RegisterFace() {
  // Employee list + selection
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // New employee form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ full_name: '', email: '', department: '' });
  const [creatingEmployee, setCreatingEmployee] = useState(false);

  // Registration state
  const [phase, setPhase] = useState('select');   // select | camera | capturing | done
  const [samples, setSamples] = useState([]);         // collected Float32Arrays
  const [captureIndex, setCaptureIndex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingSamples, setExistingSamples] = useState(0);

  // Feedback
  const [message, setMessage] = useState(null); // { type, text }

  const scannerRef = useRef(null);
  const videoRef = useRef(null);    // direct video ref for frame capture
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchEmployees();
    if (!areModelsLoaded()) loadModels('/models');
    return () => { isMounted.current = false; };
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────

  async function fetchEmployees() {
    setLoadingEmployees(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch from API');
      const data = await res.json();
      if (isMounted.current) setEmployees(data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load employees: ' + err.message });
    } finally {
      if (isMounted.current) setLoadingEmployees(false);
    }
  }

  async function handleSelectEmployee(emp) {
    setSelectedEmployee(emp);
    setMessage(null);
    setSamples([]);
    setCaptureIndex(0);

    try {
      const existing = await getEmployeeFaceEmbeddings(emp.id);
      setExistingSamples(existing.length);
    } catch {
      setExistingSamples(0);
    }
  }

  // ── New employee creation ─────────────────────────────────────────────────

  async function handleCreateEmployee(e) {
    e.preventDefault();
    setMessage({ type: 'error', text: 'Please create new employees through the Directory or Auth page to ensure they sync properly.' });
    setShowNewForm(false);
  }

  // ── Camera phase ──────────────────────────────────────────────────────────

  function handleStartCamera() {
    if (!selectedEmployee) {
      setMessage({ type: 'error', text: 'Please select an employee first.' });
      return;
    }
    setSamples([]);
    setCaptureIndex(0);
    setMessage(null);
    setPhase('camera');
  }

  function handleStopCamera() {
    setPhase('select');
    scannerRef.current?.stopCamera();
  }

  // ── Sample capture ────────────────────────────────────────────────────────

  /**
   * Called for each sample capture.
   * FaceScanner.onScanComplete fires with the embedding.
   * We accumulate REQUIRED_SAMPLES then save all to Supabase.
   */
  const handleSampleCaptured = useCallback(async (embedding) => {
    if (!isMounted.current) return;

    setSamples((prev) => {
      const updated = [...prev, Array.from(embedding)];
      const newIndex = updated.length;
      setCaptureIndex(newIndex);

      if (newIndex >= REQUIRED_SAMPLES) {
        // All samples collected — save asynchronously
        saveAllSamples(updated);
      } else {
        // Ready for next sample
        setTimeout(() => {
          if (isMounted.current) setCapturing(false);
        }, SAMPLE_DELAY_MS);
      }

      return updated;
    });
  }, [selectedEmployee]);

  async function saveAllSamples(allSamples) {
    setSaving(true);
    setPhase('capturing');
    setMessage({ type: 'info', text: 'Saving face data to database…' });

    try {
      // Optionally clear previous embeddings before saving fresh ones
      await deleteFaceEmbeddings(selectedEmployee.id);

      // Save each sample with its index
      for (let i = 0; i < allSamples.length; i++) {
        await saveFaceEmbedding(selectedEmployee.id, allSamples[i], i, null);
      }

      if (isMounted.current) {
        setPhase('done');
        setMessage({
          type: 'success',
          text: `✓ Face registered successfully for ${selectedEmployee.full_name}. ${allSamples.length} samples saved.`,
        });
        setExistingSamples(allSamples.length);
        scannerRef.current?.stopCamera();
      }
    } catch (err) {
      if (isMounted.current) {
        setPhase('camera');
        setMessage({ type: 'error', text: 'Failed to save embeddings: ' + err.message });
      }
    } finally {
      if (isMounted.current) setSaving(false);
    }
  }

  // ── Trigger next capture ──────────────────────────────────────────────────

  function handleCapture() {
    if (capturing || saving) return;
    setCapturing(true);
    scannerRef.current?.startScan();
  }

  // ── Re-register (clear + restart) ────────────────────────────────────────

  function handleReRegister() {
    setSamples([]);
    setCaptureIndex(0);
    setPhase('camera');
    setMessage(null);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const progress = Math.round((captureIndex / REQUIRED_SAMPLES) * 100);

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.badge}>ADMIN</div>
          <h1 style={styles.title}>Face Registration</h1>
          <p style={styles.subtitle}>Register employee faces for attendance recognition</p>
        </div>

        {/* ── Feedback alert ────────────────────────────────────────────── */}
        {message && (
          <Alert type={message.type}>{message.text}</Alert>
        )}

        {/* ── Step 1 — Employee selection ───────────────────────────────── */}
        {(phase === 'select' || phase === 'done') && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <span style={styles.stepBadge}>1</span>
              Select Employee
            </h2>

            {loadingEmployees ? (
              <p style={styles.muted}>Loading employees…</p>
            ) : (
              <>
                <div style={styles.employeeGrid}>
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      style={{
                        ...styles.empCard,
                        ...(selectedEmployee?.id === emp.id ? styles.empCardActive : {}),
                      }}
                      onClick={() => handleSelectEmployee(emp)}
                    >
                      <div style={styles.empAvatar}>
                        {emp.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.empInfo}>
                        <span style={styles.empName}>{emp.full_name}</span>
                        <span style={styles.empDept}>{emp.department || 'No dept'}</span>
                      </div>
                    </button>
                  ))}

                  <button
                    style={styles.addCard}
                    onClick={() => setShowNewForm((v) => !v)}
                  >
                    <span style={{ fontSize: '22px', color: '#00c8ff' }}>+</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>New Employee</span>
                  </button>
                </div>

                {/* New employee form */}
                {showNewForm && (
                  <form onSubmit={handleCreateEmployee} style={styles.newForm}>
                    <h3 style={{ ...styles.sectionTitle, fontSize: '14px', marginBottom: '12px' }}>
                      Create New Employee
                    </h3>
                    {[
                      { key: 'full_name', label: 'Full Name *', type: 'text' },
                      { key: 'email', label: 'Email *', type: 'email' },
                      { key: 'department', label: 'Department', type: 'text' },
                    ].map(({ key, label, type }) => (
                      <div key={key} style={styles.formGroup}>
                        <label style={styles.label}>{label}</label>
                        <input
                          type={type}
                          value={newEmployee[key]}
                          onChange={(e) => setNewEmployee((p) => ({ ...p, [key]: e.target.value }))}
                          style={styles.input}
                          placeholder={label.replace(' *', '')}
                        />
                      </div>
                    ))}
                    <button
                      type="submit"
                      disabled={creatingEmployee}
                      style={styles.btnPrimary}
                    >
                      {creatingEmployee ? 'Creating…' : 'Create Employee'}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Selected employee summary */}
            {selectedEmployee && (
              <div style={styles.selectedInfo}>
                <div style={styles.selectedAvatar}>
                  {selectedEmployee.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={styles.selectedName}>{selectedEmployee.full_name}</div>
                  <div style={styles.selectedMeta}>
                    {selectedEmployee.department} &nbsp;·&nbsp;
                    {existingSamples > 0
                      ? `${existingSamples} face sample${existingSamples !== 1 ? 's' : ''} registered`
                      : 'No face registered yet'}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={styles.actions}>
              <button
                style={{ ...styles.btnPrimary, opacity: selectedEmployee ? 1 : 0.4 }}
                disabled={!selectedEmployee}
                onClick={handleStartCamera}
              >
                {existingSamples > 0 ? '↺ Re-register Face' : '+ Register Face'}
              </button>
            </div>
          </section>
        )}

        {/* ── Step 2 — Camera capture ───────────────────────────────────── */}
        {(phase === 'camera' || phase === 'capturing') && (
          <section style={styles.section}>
            <div style={styles.captureHeader}>
              <h2 style={styles.sectionTitle}>
                <span style={styles.stepBadge}>2</span>
                Capture Samples for <em>{selectedEmployee?.full_name}</em>
              </h2>
              <button style={styles.btnGhost} onClick={handleStopCamera}>
                ✕ Cancel
              </button>
            </div>

            <p style={styles.muted}>
              We'll capture {REQUIRED_SAMPLES} samples. Slightly vary your angle for each.
            </p>

            {/* Sample progress dots */}
            <div style={styles.dotsRow}>
              {Array.from({ length: REQUIRED_SAMPLES }).map((_, i) => (
                <SampleDot
                  key={i}
                  filled={i < captureIndex}
                  active={i === captureIndex}
                />
              ))}
              <span style={{ ...styles.muted, marginLeft: '8px', fontSize: '12px' }}>
                {captureIndex} / {REQUIRED_SAMPLES}
              </span>
            </div>

            {/* Progress bar */}
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>

            {/* Scanner */}
            <FaceScanner
              ref={scannerRef}
              isActive={true}
              onScanComplete={handleSampleCaptured}
              onError={(msg) => setMessage({ type: 'error', text: msg })}
            />

            {/* Capture button */}
            <button
              style={{
                ...styles.btnCapture,
                opacity: (capturing || saving || captureIndex >= REQUIRED_SAMPLES) ? 0.4 : 1,
              }}
              disabled={capturing || saving || captureIndex >= REQUIRED_SAMPLES}
              onClick={handleCapture}
            >
              {saving
                ? 'Saving…'
                : capturing
                  ? 'Processing…'
                  : captureIndex >= REQUIRED_SAMPLES
                    ? 'All samples captured'
                    : `📸 Capture Sample ${captureIndex + 1}`}
            </button>
          </section>
        )}

        {/* ── Step 3 — Done ─────────────────────────────────────────────── */}
        {phase === 'done' && (
          <section style={styles.section}>
            <div style={styles.successCard}>
              <div style={styles.successIcon}>✓</div>
              <h3 style={styles.successTitle}>Registration Complete</h3>
              <p style={styles.muted}>
                {selectedEmployee?.full_name}'s face has been registered with {captureIndex} samples.
                They can now use face recognition for attendance.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button style={styles.btnPrimary} onClick={handleReRegister}>
                  ↺ Re-register
                </button>
                <button
                  style={styles.btnGhost}
                  onClick={() => { setPhase('select'); setSelectedEmployee(null); setMessage(null); }}
                >
                  Register Another
                </button>
              </div>
            </div>
          </section>
        )}

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: '100vh',
    background: '#060b14',
    padding: '32px 16px 64px',
    fontFamily: '"DM Sans", "Segoe UI", system-ui, sans-serif',
    color: '#e2e8f0',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    animation: 'fadeIn 0.4s ease',
  },
  header: {
    textAlign: 'center',
    paddingTop: '16px',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    color: '#f87171',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '3px 8px',
    marginBottom: '12px',
  },
  title: {
    fontSize: 'clamp(22px,5vw,32px)',
    fontWeight: 700,
    margin: 0,
    color: '#f1f5f9',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    marginTop: '6px',
  },
  section: {
    background: '#0d1424',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#cbd5e1',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  stepBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(0,200,255,0.12)',
    border: '1px solid rgba(0,200,255,0.3)',
    color: '#00c8ff',
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0,
  },
  muted: { color: '#64748b', fontSize: '13px', margin: 0 },

  // Employee grid
  employeeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '10px',
  },
  empCard: {
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    color: 'inherit',
    textAlign: 'center',
  },
  empCardActive: {
    border: '1px solid #00c8ff',
    background: 'rgba(0,200,255,0.06)',
    boxShadow: '0 0 12px rgba(0,200,255,0.15)',
  },
  empAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  empInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  empName: { fontSize: '13px', fontWeight: 600, color: '#e2e8f0' },
  empDept: { fontSize: '11px', color: '#64748b' },

  addCard: {
    background: '#111827',
    border: '1px dashed #334155',
    borderRadius: '10px',
    padding: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'border-color 0.2s ease',
  },

  // New employee form
  newForm: {
    background: '#0a0f1a',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'fadeIn 0.3s ease',
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', color: '#94a3b8', fontWeight: 500 },
  input: {
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
  },

  // Selected info
  selectedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#060b14',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    padding: '12px 16px',
  },
  selectedAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  selectedName: { fontSize: '14px', fontWeight: 600, color: '#e2e8f0' },
  selectedMeta: { fontSize: '12px', color: '#64748b', marginTop: '2px' },

  // Buttons
  actions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  btnPrimary: {
    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    flex: 1,
  },
  btnGhost: {
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
  },
  btnCapture: {
    background: 'linear-gradient(135deg, #00ff88, #00c8ff)',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    color: '#060b14',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    letterSpacing: '0.02em',
  },

  // Capture header
  captureHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },

  // Sample dots
  dotsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  progressTrack: {
    width: '100%',
    height: '3px',
    background: '#1e293b',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #0ea5e9, #00ff88)',
    transition: 'width 0.4s ease',
  },

  // Success card
  successCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '24px 16px',
    gap: '8px',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(0,255,136,0.12)',
    border: '2px solid #00ff88',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: '#00ff88',
    marginBottom: '8px',
    boxShadow: '0 0 24px rgba(0,255,136,0.25)',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
};