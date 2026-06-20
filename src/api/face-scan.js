// ============================================================
// src/api/face-scan.js
// Next.js API Route  →  POST /api/face-scan
//
// Called by frontend with:
//   { embedding: number[], livenessResult: {...} }
//
// Returns:
//   { matched: bool, employee: {...}, attendance: {...}, error? }
// ============================================================

import { matchFaceToEmployee, markAttendance, logFaceScanEvent } from '../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { embedding, livenessResult } = req.body
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress

  // ── Validate input ──────────────────────────────────────────
  if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
    return res.status(400).json({ error: 'Invalid face embedding. Expected 128-dim array.' })
  }

  // ── 1. Liveness check FIRST (anti-spoof gate) ───────────────
  if (!livenessResult?.allPassed) {
    await logFaceScanEvent({
      matchScore: 0,
      livenessScore: livenessResult?.livenessScore || 0,
      motionPass: livenessResult?.checks?.motion?.pass || false,
      blinkPass: livenessResult?.checks?.blink?.pass || false,
      depthPass: livenessResult?.checks?.depth?.pass || false,
      spoofPass: false,
      status: 'spoof_detected',
      errorReason: 'Liveness check failed',
      ip
    })
    return res.status(200).json({
      matched: false,
      error: 'Liveness check failed. Please look at the camera naturally and blink.',
      code: 'LIVENESS_FAIL'
    })
  }

  try {
    // ── 2. Match face against employee database ─────────────────
    const match = await matchFaceToEmployee(embedding, 0.78)

    if (!match) {
      // No match found
      await logFaceScanEvent({
        matchScore: 0,
        livenessScore: livenessResult.livenessScore,
        motionPass: livenessResult.checks.motion.pass,
        blinkPass: livenessResult.checks.blink.pass,
        depthPass: livenessResult.checks.depth.pass,
        spoofPass: true,
        status: 'failed',
        errorReason: 'No matching employee found',
        ip
      })
      return res.status(200).json({
        matched: false,
        error: 'Face not recognized. Please contact your admin.',
        code: 'NO_MATCH'
      })
    }

    // ── 3. Mark attendance ──────────────────────────────────────
    const confidenceScore = Math.round(match.similarity * 100)
    const attendance = await markAttendance(
      match.id,
      confidenceScore,
      true,
      ip
    )

    // ── 4. Log successful scan event ────────────────────────────
    await logFaceScanEvent({
      employeeId: match.id,
      matchScore: confidenceScore,
      livenessScore: livenessResult.livenessScore,
      motionPass: livenessResult.checks.motion.pass,
      blinkPass: livenessResult.checks.blink.pass,
      depthPass: livenessResult.checks.depth.pass,
      spoofPass: true,
      status: 'matched',
      ip
    })

    return res.status(200).json({
      matched: true,
      employee: {
        id: match.id,
        name: match.name,
        bio_id: match.bio_id,
        department: match.department
      },
      attendance: {
        action: attendance.action,     // 'punch_in' or 'punch_out'
        is_late: attendance.is_late,
        late_by_mins: attendance.late_by_mins,
        salary_cut: attendance.salary_cut,
        confidence: confidenceScore,
        timestamp: new Date().toISOString()
      }
    })

  } catch (err) {
    console.error('[face-scan API]', err)
    return res.status(500).json({ error: 'Server error during face scan', detail: err.message })
  }
}
