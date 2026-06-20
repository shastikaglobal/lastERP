# 🔍 Face Recognition Attendance Module
## SHASTIKA GLOBAL IMPEX — AGRI EXPORT ERP

---

## 📁 File Structure (என்ன files இருக்கு)

```
face-attendance/
├── supabase/
│   └── migrations/
│       └── 001_face_attendance.sql     ← Step 1: Supabase-ல் run பண்ண
│
├── src/
│   ├── lib/
│   │   ├── supabase.js                 ← Supabase client + all DB functions
│   │   └── faceEngine.js              ← face-api.js face detection + liveness
│   │
│   ├── api/
│   │   └── face-scan.js               ← POST /api/face-scan (Next.js API route)
│   │
│   └── pages/
│       ├── FaceAttendance.jsx          ← Main attendance page (drop into ERP)
│       └── RegisterFace.jsx           ← Admin: register employee faces
│
└── .env.example                        ← Supabase keys template
```

---

## 🚀 STEP BY STEP SETUP (இப்படி பண்ணு)

---

### STEP 1 — Supabase Project Setup

1. https://supabase.com → New Project உருவாக்கு
2. Project name: `shastika-erp`
3. Database password: strong password வை (save பண்ணிக்கோ)
4. Region: `Southeast Asia (Singapore)` தேர்ந்தெடு

---

### STEP 2 — Database Tables Create பண்ண

1. Supabase Dashboard திற
2. Left menu → **SQL Editor** click
3. **New Query** button click
4. `supabase/migrations/001_face_attendance.sql` கோப்பை திற
5. எல்லா content-ஐயும் copy paste பண்ணு
6. **Run** button (Ctrl+Enter) press பண்ணு
7. ✅ "Success. No rows returned" வந்தா OK!

---

### STEP 3 — Storage Bucket Create (face photos-க்கு)

1. Supabase Dashboard → **Storage** → **New Bucket**
2. Bucket name: `face-data`
3. Public: **OFF** (private வை)
4. **Create Bucket** click

---

### STEP 4 — API Keys எடுக்கணும்

1. Supabase Dashboard → **Settings** → **API**
2. இந்த 3 values copy பண்ணிக்கோ:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGci...`
   - **service_role key**: `eyJhbGci...` ⚠ இதை secret-ஆ வை

---

### STEP 5 — .env.local File

Project root-ல் `.env.local` file create பண்ணு:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

### STEP 6 — npm packages install பண்ண

```bash
npm install @supabase/supabase-js face-api.js
```

---

### STEP 7 — face-api.js Models Download

```bash
# public/models/ folder create பண்ணி இந்த files download பண்ணு:
mkdir -p public/models

# இந்த URL-ல் இருந்து download பண்ணு:
# https://github.com/justadudewhohacks/face-api.js/tree/master/weights
```

**Required model files** (public/models/-ல் வை):
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_expression_model-weights_manifest.json`
- `face_expression_model-shard1`

**Quick download script** (terminal-ல் run பண்ணு):
```bash
cd public/models
BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
for f in tiny_face_detector_model face_landmark_68_model face_recognition_model face_expression_model; do
  curl -O "$BASE/${f}-weights_manifest.json"
  curl -O "$BASE/${f}-shard1"
done
```

---

### STEP 8 — ERP-ல் Pages இணை

உங்கள் existing router file-ல் சேர்:
```jsx
import FaceAttendance from './src/pages/FaceAttendance'
import RegisterFace from './src/pages/RegisterFace'

// Router-ல்:
<Route path="/employees/face-attendance" element={<FaceAttendance />} />
<Route path="/employees/register-face" element={<RegisterFace />} />
```

API route (Next.js app):
```
pages/api/face-scan.js  ←  src/api/face-scan.js content-ஐ இங்க வை
```

---

### STEP 9 — First Time Employee Face Register

1. http://localhost:3000/employees/register-face திற
2. Employee dropdown-ல் select பண்ணு
3. "Start Camera" click
4. Employee camera முன்னாடி நிக்கணும்
5. "Capture Face" click → 5 samples auto capture ஆகும்
6. ✅ Face registered!

---

### STEP 10 — Test Attendance

1. http://localhost:3000/employees/face-attendance திற
2. "Start Camera & Scan" click
3. Camera allow பண்ணு
4. Liveness checks pass ஆகும் (blink பண்ணு, கொஞ்சம் move ஆகு)
5. Face match ஆனா ✅ Attendance auto-marked!

---

## 🔧 HOW IT WORKS (technical flow)

```
User opens page
      ↓
Camera starts (getUserMedia)
      ↓
Liveness Detection (10fps loop)
  ├── Motion check (nose movement)
  ├── Blink detection (Eye Aspect Ratio)
  ├── Depth check (face size variance)
  └── Anti-spoof (all 3 combined)
      ↓
All 4 checks pass?
  ├── NO  → "Liveness failed" error
  └── YES → Face embedding extracted (128-dim vector)
              ↓
         POST /api/face-scan
              ↓
         Supabase match_face() RPC
         (cosine similarity on pgvector)
              ↓
         Match > 78%?
          ├── NO  → "Face not recognized"
          └── YES → mark_attendance() called
                    ├── Check if late (vs shift_config)
                    ├── Calculate salary cut
                    ├── INSERT attendance_logs
                    └── Return result to UI
```

---

## 📊 Supabase Tables Summary

| Table | Purpose |
|-------|---------|
| `employees` | Employee data + face_embedding (vector) |
| `attendance_logs` | Daily punch in/out records |
| `face_scan_events` | Every scan attempt (audit log) |
| `shift_config` | Office timings + late rules |
| `leave_requests` | Leave management |

---

## ⚙️ Configuration (customize பண்ண)

**Face match threshold** change பண்ண (`supabase.js`):
```js
matchFaceToEmployee(embedding, 0.78)  // 0.78 = 78% similarity required
// Increase to 0.85 for stricter matching
// Decrease to 0.70 for more lenient
```

**Shift timing** change (`001_face_attendance.sql`):
```sql
INSERT INTO shift_config (shift_name, start_time, late_threshold_mins, salary_cut_per_min)
VALUES ('General Shift', '09:00', 15, 5.00);
-- late_threshold_mins = 9:15 வரை on-time
-- salary_cut_per_min = ₹5 per minute late
```

---

## ❓ Troubleshooting

**Camera not working?**
→ HTTPS வேணும் (localhost is fine, but deployed app needs HTTPS)

**Models loading slow?**
→ `public/models/` folder check பண்ணு — all 8 files இருக்கா?

**Face not matching?**
→ Re-register face in good lighting
→ Threshold 0.78 → 0.70 குறை

**pgvector error?**
→ SQL Editor-ல் `CREATE EXTENSION IF NOT EXISTS vector;` run பண்ணு

---

## 🔒 Security Notes

- Service role key = server-side only (never frontend)
- Face embeddings = encrypted vectors (not actual images)
- RLS policies = only authenticated users can read
- Liveness detection = prevents photo/video spoofing

---

*Built for SHASTIKA GLOBAL IMPEX — AGRI EXPORT ERP*
