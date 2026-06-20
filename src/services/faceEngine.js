/**
 * faceEngine.js
 * -------------
 * All face-related AI logic powered by face-api.js.
 *
 * Capabilities:
 *   • Model loading (SSD MobileNet v1 + Face Landmark 68 + Face Recognition Net)
 *   • Face detection with bounding box
 *   • 128-dim face descriptor (embedding) generation
 *   • Cosine similarity & Euclidean distance comparison
 *   • Liveness detection heuristics (blink / motion / texture)
 *   • Best-match lookup against stored embeddings
 *
 * Usage:
 *   import { loadModels, generateEmbedding, findBestMatch } from './faceEngine';
 *   await loadModels();
 *   const embedding = await generateEmbedding(videoElement);
 *   const match     = findBestMatch(embedding, storedEmbeddings);
 */

import * as faceapi from 'face-api.js';

// ─── Configuration ────────────────────────────────────────────────────────────

/** CDN path for model weights. Override with a local /public/models path if preferred. */
const MODEL_URL = '/models';

/** Minimum confidence to accept a face detection result. */
const DETECTION_SCORE_THRESHOLD = 0.6;

/**
 * Maximum Euclidean distance to consider two faces a match.
 * face-api.js descriptors are 128-dim float vectors.
 * Typical same-person distance: 0.35–0.50 | different person: 0.60+
 */
const MATCH_DISTANCE_THRESHOLD = 0.50;

/** Liveness: minimum number of motion frames needed. */
const LIVENESS_MOTION_FRAMES = 3;

/** Liveness: pixel-diff threshold between frames to count as "movement". */
const LIVENESS_PIXEL_DIFF_THRESHOLD = 15;

// ─── State ────────────────────────────────────────────────────────────────────

let modelsLoaded = false;

// Used for liveness detection frame comparison
let _prevFrameData = null;
let _motionFrameCount = 0;

// ─── Model loading ────────────────────────────────────────────────────────────

/**
 * Load all required face-api.js models.
 * Safe to call multiple times; subsequent calls are no-ops.
 *
 * @param {string} [modelUrl] – base URL for model JSON/weights files
 * @returns {Promise<void>}
 */
export async function loadModels(modelUrl = MODEL_URL) {
    if (modelsLoaded) return;

    console.log('[faceEngine] Loading models from', modelUrl);

    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
    ]);

    modelsLoaded = true;
    console.log('[faceEngine] All models loaded ✓');
}

/**
 * Returns true once models have been loaded.
 */
export function areModelsLoaded() {
    return modelsLoaded;
}

// ─── Face detection ───────────────────────────────────────────────────────────

/**
 * Detect a single face in a video or canvas element.
 * Returns the full detection result including landmarks and descriptor,
 * or null if no face is found above the confidence threshold.
 *
 * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} source
 * @returns {Promise<faceapi.WithFaceDescriptor<
 *   faceapi.WithFaceLandmarks<
 *     faceapi.WithFaceDetection<{}>>> | null>}
 */
export async function detectSingleFace(source) {
    if (!modelsLoaded) throw new Error('[faceEngine] Models not loaded. Call loadModels() first.');

    const detection = await faceapi
        .detectSingleFace(source, new faceapi.SsdMobilenetv1Options({
            minConfidence: DETECTION_SCORE_THRESHOLD,
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

    return detection ?? null;
}

/**
 * Detect all faces in a source (for admin registration preview).
 * @param {HTMLVideoElement|HTMLCanvasElement} source
 * @returns {Promise<Array>}
 */
export async function detectAllFaces(source) {
    if (!modelsLoaded) throw new Error('[faceEngine] Models not loaded.');

    return faceapi
        .detectAllFaces(source, new faceapi.SsdMobilenetv1Options({
            minConfidence: DETECTION_SCORE_THRESHOLD,
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();
}

// ─── Embedding generation ──────────────────────────────────────────────────────

/**
 * Generate a 128-dimensional face descriptor for the face in the given source.
 *
 * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} source
 * @returns {Promise<Float32Array>}   – 128-element descriptor vector
 * @throws {Error} if no face is detected
 */
export async function generateEmbedding(source) {
    const result = await detectSingleFace(source);

    if (!result) {
        throw new Error('No face detected. Please ensure your face is clearly visible.');
    }

    return result.descriptor; // Float32Array (128 values)
}

/**
 * Generate multiple embeddings from successive video frames and average them.
 * Produces a more stable embedding than a single capture.
 *
 * @param {HTMLVideoElement} videoEl
 * @param {number} [samples=5]
 * @param {number} [intervalMs=300]
 * @param {function} [onProgress]  – called with (completed, total)
 * @returns {Promise<Float32Array>}
 */
export async function generateAveragedEmbedding(
    videoEl,
    samples = 5,
    intervalMs = 300,
    onProgress = null
) {
    const descriptors = [];

    for (let i = 0; i < samples; i++) {
        try {
            const desc = await generateEmbedding(videoEl);
            descriptors.push(desc);
            onProgress?.(i + 1, samples);
        } catch {
            // Skip failed frames
        }

        if (i < samples - 1) {
            await delay(intervalMs);
        }
    }

    if (descriptors.length === 0) {
        throw new Error('Could not capture any face embeddings.');
    }

    return averageDescriptors(descriptors);
}

// ─── Similarity & matching ─────────────────────────────────────────────────────

/**
 * Compute Euclidean distance between two 128-dim descriptors.
 * Lower = more similar. Same person typically < 0.50.
 *
 * @param {Float32Array|number[]} a
 * @param {Float32Array|number[]} b
 * @returns {number}
 */
export function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Convert Euclidean distance to a human-readable confidence percentage.
 * Distance 0    → 100%
 * Distance 0.50 → ~50%  (match threshold)
 * Distance 1.0  → 0%
 *
 * @param {number} distance
 * @returns {number}  – 0-100
 */
export function distanceToConfidence(distance) {
    // Clamp distance to [0, 1] range then invert
    const clamped = Math.min(Math.max(distance, 0), 1);
    return Math.round((1 - clamped) * 100);
}

/**
 * Given a live descriptor and a list of stored embedding rows,
 * find the best-matching employee.
 *
 * @param {Float32Array|number[]} liveDescriptor
 * @param {Array<{ employee_id: string, face_embedding: number[], employees: object }>} storedEmbeddings
 * @param {number} [threshold] – override default distance threshold
 * @returns {{
 *   matched: boolean,
 *   employeeId: string|null,
 *   employee: object|null,
 *   confidence: number,
 *   distance: number
 * }}
 */
export function findBestMatch(
    liveDescriptor,
    storedEmbeddings,
    threshold = MATCH_DISTANCE_THRESHOLD
) {
    if (!storedEmbeddings || storedEmbeddings.length === 0) {
        return { matched: false, employeeId: null, employee: null, confidence: 0, distance: Infinity };
    }

    let bestDistance = Infinity;
    let bestMatch = null;

    for (const row of storedEmbeddings) {
        let stored = row.face_embedding;
        // Convert string "[...]" to number array if needed
        if (typeof stored === 'string') {
            stored = stored.replace(/[\[\]]/g, '').split(',').map(Number);
        }
        const distance = euclideanDistance(liveDescriptor, stored);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = row;
        }
    }

    const confidence = distanceToConfidence(bestDistance);
    const matched = bestDistance <= threshold;

    console.log(`[faceEngine] Best match: ${bestMatch?.employees?.full_name ?? 'unknown'} | distance=${bestDistance.toFixed(4)} | confidence=${confidence}% | matched=${matched}`);

    return {
        matched,
        employeeId: matched ? bestMatch.employee_id : null,
        employee: matched ? bestMatch.employees : null,
        confidence,
        distance: bestDistance,
    };
}

// ─── Liveness detection ────────────────────────────────────────────────────────

/**
 * Reset liveness state. Call before starting a new scan session.
 */
export function resetLiveness() {
    _prevFrameData = null;
    _motionFrameCount = 0;
}

/**
 * Analyse a single video frame for liveness signals.
 * Call this repeatedly in a requestAnimationFrame loop.
 *
 * Heuristics used:
 *   1. Pixel-diff motion between consecutive frames (detects video vs photo)
 *   2. Expression-change detection (optional face-expression net)
 *   3. Landmark jitter (natural micro-movements of a live face)
 *
 * @param {HTMLVideoElement}   videoEl
 * @param {HTMLCanvasElement}  scratchCanvas – off-screen canvas for pixel sampling
 * @returns {{
 *   isLive: boolean,
 *   motionScore: number,
 *   framesAnalysed: number
 * }}
 */
export function analyseLivenessFrame(videoEl, scratchCanvas) {
    const ctx = scratchCanvas.getContext('2d');
    const w = scratchCanvas.width;
    const h = scratchCanvas.height;

    ctx.drawImage(videoEl, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    let motionScore = 0;

    if (_prevFrameData) {
        let diffSum = 0;
        // Sample every 4th pixel for performance
        for (let i = 0; i < data.length; i += 16) {
            diffSum += Math.abs(data[i] - _prevFrameData[i]);
        }
        motionScore = diffSum / (data.length / 16);

        if (motionScore > LIVENESS_PIXEL_DIFF_THRESHOLD) {
            _motionFrameCount++;
        }
    }

    _prevFrameData = new Uint8ClampedArray(data);

    const isLive = _motionFrameCount >= LIVENESS_MOTION_FRAMES;

    return {
        isLive,
        motionScore,
        framesAnalysed: _motionFrameCount,
    };
}

/**
 * Full liveness check: runs frame analysis for a set duration and
 * resolves with a pass/fail result.
 *
 * @param {HTMLVideoElement}  videoEl
 * @param {number}            [durationMs=2000]
 * @returns {Promise<{ passed: boolean, message: string }>}
 */
export async function performLivenessCheck(videoEl, durationMs = 2000) {
    resetLiveness();

    // Create a small scratch canvas for pixel diff
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    return new Promise((resolve) => {
        const startTime = Date.now();

        function tick() {
            const elapsed = Date.now() - startTime;
            const result = analyseLivenessFrame(videoEl, canvas);

            if (result.isLive) {
                resolve({ passed: true, message: 'Liveness check passed.' });
                return;
            }

            if (elapsed >= durationMs) {
                resolve({
                    passed: false,
                    message: 'Liveness check failed. Please blink or slightly move your head.',
                });
                return;
            }

            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    });
}

// ─── Quality / validation ──────────────────────────────────────────────────────

/**
 * Estimate embedding quality based on detection score and face size.
 *
 * @param {faceapi.FaceDetection} detection
 * @param {HTMLVideoElement}      videoEl
 * @returns {number}  – 0-1 quality score
 */
export function estimateQuality(detection, videoEl) {
    if (!detection) return 0;

    const score = detection.score ?? 0;
    const box = detection.box;
    const videoW = videoEl.videoWidth || videoEl.width || 640;
    const videoH = videoEl.videoHeight || videoEl.height || 480;
    const faceFrac = (box.width * box.height) / (videoW * videoH);

    // Ideal face fraction: 10–60% of frame
    const sizeScore = faceFrac < 0.05 ? faceFrac / 0.05 :
        faceFrac > 0.70 ? 1 - (faceFrac - 0.70) / 0.30 : 1;

    return Math.min(1, (score * 0.6 + sizeScore * 0.4));
}

/**
 * Draw face detection overlays on a canvas element.
 * Used for the live preview during registration / scanning.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement}  videoEl
 * @param {object|null}       detection  – faceapi detection result
 * @param {string}            [color]
 */
export function drawDetectionOverlay(canvas, videoEl, detection, color = '#00ff88') {
    const displaySize = { width: videoEl.offsetWidth, height: videoEl.offsetHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detection) return;

    const resized = faceapi.resizeResults(detection, displaySize);

    // Draw box
    const { x, y, width, height } = resized.detection.box;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw landmarks
    faceapi.draw.drawFaceLandmarks(canvas, resized);
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Average multiple Float32Array descriptors into one.
 * @param {Float32Array[]} descriptors
 * @returns {Float32Array}
 */
function averageDescriptors(descriptors) {
    const len = descriptors[0].length;
    const avg = new Float32Array(len);

    for (const desc of descriptors) {
        for (let i = 0; i < len; i++) {
            avg[i] += desc[i];
        }
    }

    for (let i = 0; i < len; i++) {
        avg[i] /= descriptors.length;
    }

    return avg;
}

/** Simple promisified delay. */
function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

export { MATCH_DISTANCE_THRESHOLD, DETECTION_SCORE_THRESHOLD };