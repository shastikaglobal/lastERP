const fs = require('fs');
const db = require('./adms-sync/db.js');

async function importLeads() {
  try {
    const data = fs.readFileSync('all_leads.json', 'utf8');
    const leads = JSON.parse(data);
    
    if (!Array.isArray(leads) || leads.length === 0) {
      console.log("No leads found in all_leads.json");
      return;
    }

    console.log(`Found ${leads.length} leads to import.`);

    await db.query('ALTER TABLE leads DISABLE TRIGGER ALL');

    for (const lead of leads) {
      // Check if lead exists
      const { rows } = await db.query('SELECT id FROM leads WHERE id = $1', [lead.id]);
      
      if (rows.length > 0) {
        console.log(`Lead ${lead.id} already exists. Skipping.`);
        continue;
      }

      const cols = Object.keys(lead).filter(k => lead[k] !== undefined && lead[k] !== null);
      const vals = cols.map(k => lead[k]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

      try {
        await db.query(
          `INSERT INTO leads (${cols.join(', ')}) VALUES (${placeholders})`,
          vals
        );
        console.log(`Inserted lead: ${lead.company_name || lead.id}`);
      } catch (err) {
        console.error(`Error inserting lead ${lead.id}:`, err.message);
      }
    }
    
    await db.query('ALTER TABLE leads ENABLE TRIGGER ALL');
    console.log("Import complete!");
  } catch (err) {
    console.error("Fatal Error:", err);
  } finally {
    process.exit(0);
  }
}

importLeads();
