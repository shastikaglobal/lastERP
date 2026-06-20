const db = require('../db');
(async () => {
  try {
    const companyId = '00000000-0000-0000-0000-00000000ae01';
    const q = `
      SELECT
        l.id,
        COALESCE(l.company_name, NULLIF(TRIM(l.contact_name), ''), 'Unknown') AS client_name,
        COALESCE(l.country, 'Unknown') AS country,
        COALESCE(ac.channel_name, 'Direct / Unknown') AS source,
        COALESCE(l.assigned_to, 'Unassigned') AS assigned_bde,
        COALESCE(l.converted_at, l.created_at) AS acquisition_date,
        COALESCE(l.interested_product, l.product_type, 'N/A') AS product_interested,
        0 AS deal_value,
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

    const res = await db.query(q, [companyId]);
    console.log('rows:', res.rows.length);
    console.table(res.rows);
  } catch (err) {
    console.error('error', err);
  }
  process.exit();
})();
