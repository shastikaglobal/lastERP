const db = require('./db');
async function run() {
  const { rows } = await db.query('SELECT * FROM face_embeddings');
  console.log("face_embeddings rows:", rows.map(r => r.employee_id));
}
run();
