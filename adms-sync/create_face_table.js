const db = require('./db');

const sql = `
CREATE TABLE IF NOT EXISTS face_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'present',
  confidence NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);
`;

db.query(sql).then(() => console.log('VPS face_attendance table created')).catch(console.error).finally(()=>process.exit());
