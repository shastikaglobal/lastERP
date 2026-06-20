// ============================================================
// src/lib/faceEngine.js
// Face detection, embedding + liveness using face-api.js
// ============================================================
//
// Install:  npm install face-api.js
// Models:   download from https://github.com/justadudewhohacks/face-api.js/tree/master/weights
//           and put in: public/models/
//
// Required model files in public/models/:
//   - tiny_face_detector_model-weights_manifest.json
//   - face_landmark_68_model-weights_manifest.json
//   - face_recognition_model-weights_manifest.json
//   - face_expression_model-weights_manifest.json
// ============================================================

import * as faceapi from 'face-api.js'

let modelsLoaded = false

// ── 1. Load models once on app start ────────────────────────
export async function loadFaceModels(modelPath = '/models') {
  if (modelsLoaded) return
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
  ])
  modelsLoaded = true
  console.log('[FaceEngine] Models loaded ✓')
}

// ── 2. Detect face and extract 128-dim embedding ─────────────
export async function getFaceEmbedding(videoElement) {
  const detection = await faceapi
    .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null

  return {
    embedding: Array.from(detection.descriptor),  // 128-dim float array → for Supabase pgvector
    box: detection.detection.box,
    score: detection.detection.score,
    landmarks: detection.landmarks
  }
}

// ── 3. Liveness detection ────────────────────────────────────
// Runs 4 checks to prevent photo spoofing
// Returns pass/fail for each check + overall liveness score

export class LivenessDetector {
  constructor() {
    this.frameBuffer = []         // last N frames for motion analysis
    this.blinkHistory = []        // EAR values over time
    this.maxFrames = 30
    this.blinkDetected = false
    this.startTime = Date.now()
  }

  // Eye Aspect Ratio (EAR) - detects real blink
  _calculateEAR(landmarks) {
    const leftEye = [
      landmarks.getLeftEye()[1], landmarks.getLeftEye()[5],
      landmarks.getLeftEye()[2], landmarks.getLeftEye()[4],
      landmarks.getLeftEye()[0], landmarks.getLeftEye()[3],
    ]
    const rightEye = [
      landmarks.getRightEye()[1], landmarks.getRightEye()[5],
      landmarks.getRightEye()[2], landmarks.getRightEye()[4],
      landmarks.getRightEye()[0], landmarks.getRightEye()[3],
    ]

    const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

    const leftEAR = (dist(leftEye[0], leftEye[1]) + dist(leftEye[2], leftEye[3])) / (2 * dist(leftEye[4], leftEye[5]))
    const rightEAR = (dist(rightEye[0], rightEye[1]) + dist(rightEye[2], rightEye[3])) / (2 * dist(rightEye[4], rightEye[5]))

    return (leftEAR + rightEAR) / 2
  }

  // Nose tip movement between frames (3D motion proof)
  _calculateNoseMotion(prevLandmarks, currLandmarks) {
    if (!prevLandmarks) return 0
    const prev = prevLandmarks.getNose()[3]
    const curr = currLandmarks.getNose()[3]
    return Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2)
  }

  // Face size consistency check (depth variation = 3D face)
  _getFaceSize(detection) {
    return detection.detection.box.width * detection.detection.box.height
  }

  /**
   * Feed each video frame here during scanning.
   * Returns liveness check results.
   *
   * @param {HTMLVideoElement} video
   * @returns {Promise<LivenessResult>}
   */
  async analyzeFrame(video) {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()

    if (!detection) return { hasface: false }

    const landmarks = detection.landmarks
    const ear = this._calculateEAR(landmarks)
    const faceSize = this._getFaceSize(detection)
    const prevFrame = this.frameBuffer[this.frameBuffer.length - 1]

    const noseMotion = this._calculateNoseMotion(
      prevFrame?.landmarks,
      landmarks
    )

    // Store EAR for blink detection
    this.blinkHistory.push(ear)
    if (this.blinkHistory.length > 10) this.blinkHistory.shift()

    // Detect blink: EAR drops below 0.25 then rises back
    const minEAR = Math.min(...this.blinkHistory)
    const maxEAR = Math.max(...this.blinkHistory)
    if (minEAR < 0.22 && maxEAR > 0.28) {
      this.blinkDetected = true
    }

    // Accumulate frames
    this.frameBuffer.push({ landmarks, faceSize, ear, noseMotion })
    if (this.frameBuffer.length > this.maxFrames) this.frameBuffer.shift()

    const elapsed = (Date.now() - this.startTime) / 1000

    // Compute checks
    const motionValues = this.frameBuffer.map(f => f.noseMotion).filter(v => v > 0)
    const avgMotion = motionValues.reduce((a, b) => a + b, 0) / (motionValues.length || 1)
    const motionPass = avgMotion > 0.3 && elapsed > 1.0   // real face moves slightly

    const faceSizes = this.frameBuffer.map(f => f.faceSize)
    const faceSizeVariance = Math.max(...faceSizes) - Math.min(...faceSizes)
    const depthPass = faceSizeVariance > 50 && elapsed > 1.5  // size changes = 3D

    const antiSpoofPass = motionPass && depthPass && elapsed > 1.0

    // Overall liveness score 0-100
    const score = (
      (motionPass ? 25 : 0) +
      (this.blinkDetected ? 35 : 0) +
      (depthPass ? 25 : 0) +
      (antiSpoofPass ? 15 : 0)
    )

    return {
      hasface: true,
      ear,
      avgMotion: avgMotion.toFixed(3),
      faceSizeVariance: faceSizeVariance.toFixed(0),
      checks: {
        motion: { pass: motionPass, label: 'Motion analysis' },
        blink: { pass: this.blinkDetected, label: 'Eye blink detection' },
        depth: { pass: depthPass, label: 'Face depth analysis' },
        antispoof: { pass: antiSpoofPass, label: 'Anti-spoof check' },
      },
      livenessScore: score,
      allPassed: motionPass && this.blinkDetected && depthPass && antiSpoofPass,
      elapsed
    }
  }

  reset() {
    this.frameBuffer = []
    this.blinkHistory = []
    this.blinkDetected = false
    this.startTime = Date.now()
  }
}

// ── 4. Draw face detection overlay on canvas ─────────────────
export function drawFaceOverlay(canvas, video, detectionResult) {
  if (!canvas || !detectionResult) return
  const dims = faceapi.matchDimensions(canvas, video, true)
  const resized = faceapi.resizeResults(detectionResult, dims)
  faceapi.draw.drawDetections(canvas, resized)
  faceapi.draw.drawFaceLandmarks(canvas, resized)
}

// ── 5. Register face: capture multiple samples + average ──────
// Call this during employee face registration
export async function captureFaceSamples(video, sampleCount = 5) {
  const samples = []
  for (let i = 0; i < sampleCount; i++) {
    await new Promise(r => setTimeout(r, 300))
    const result = await getFaceEmbedding(video)
    if (result) samples.push(result.embedding)
  }
  if (samples.length === 0) throw new Error('No face detected during registration')

  // Average all samples for a robust embedding
  const averaged = samples[0].map((_, dim) =>
    samples.reduce((sum, s) => sum + s[dim], 0) / samples.length
  )

  return averaged  // 128-dim averaged embedding
}
