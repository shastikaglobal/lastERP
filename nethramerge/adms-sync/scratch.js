const db = require('./db');

async function run() {
  try {
    // Check if face_embeddings table exists
    const res = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));

    // Create face_embeddings table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS face_embeddings (
        id SERIAL PRIMARY KEY,
        employee_id UUID NOT NULL,
        face_embedding JSONB NOT NULL,
        sample_index INTEGER DEFAULT 0,
        quality_score NUMERIC DEFAULT NULL,
        model_version VARCHAR(255) DEFAULT 'face-api-ssd-mobilenetv1',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, sample_index)
      )
    `);
    console.log('face_embeddings table created/verified');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
