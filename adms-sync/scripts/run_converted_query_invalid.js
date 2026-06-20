const db = require('../db');
(async () => {
  const companyId = ''; // intentionally invalid to reproduce DB error
  const q = `
    SELECT
      l.id,
      COALESCE(l.company_name, NULLIF(TRIM(CONCAT(l.first_name, ' ', l.last_name)), ''), 'Unknown') AS client_name,
      COALESCE(l.country, 'Unknown') AS country,
      COALESCE(ac.channel_name, 'Direct / Unknown') AS source,
      COALESCE(l.assigned_to, 'Unassigned') AS assigned_bde,
      COALESCE(l.converted_at, l.created_at) AS acquisition_date,
      COALESCE(l.interested_product, l.product, l.product_interest, 'N/A') AS product_interested,
      COALESCE(l.deal_value, l.value, 0) AS deal_value,
      l.stage AS status
    FROM leads l
    LEFT JOIN acquisition_channels ac ON ac.id = l.source_id
    WHERE l.company_id = $1
      AND l.is_deleted IS NOT TRUE
      AND (
        l.stage ILIKE '%client%'
        OR l.stage ILIKE '%convert%'
        OR l.stage ILIKE '%won%'
      )
    ORDER BY l.created_at DESC
  `;

  try {
    const res = await db.query(q, [companyId]);
    console.log('rows:', res.rows.length);
  } catch (err) {
    // Print raw error object and stack
    console.error('RAW ERROR OUTPUT:');
    console.error(err);
    if (err && err.stack) console.error('STACK:\n', err.stack);
  }
  process.exit();
})();
