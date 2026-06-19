import { supabase } from "@/integrations/supabase/client";

// ── Stock Summary Report ──────────────────────────────────────────────────
export async function getStockSummaryData(filters: {
  warehouse_id?: string;
  date_from?: string;
  date_to?: string;
  company_id?: string;
}) {
  try {
    let query = supabase
      .from("inventory_batches")
      .neq("is_deleted", true)
      .select(`
        id,
        lot_number,
        quantity_kg,
        quantity_remaining_kg,
        reserved_quantity,
        is_export_ready,
        status,
        grade,
        received_date,
        product:products(id, name, sku, min_stock_level),
        warehouse:warehouses(id, name)
      `);

    if (filters.warehouse_id) {
      query = query.eq("warehouse_id", filters.warehouse_id);
    }

    if (filters.company_id) {
      query = query.eq("company_id", filters.company_id);
    }

    if (filters.date_from) {
      query = query.gte("received_date", filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte("received_date", filters.date_to);
    }

    const { data, error } = await query
      .order("received_date", { ascending: false })
      .limit(5000);

    if (error) throw error;

    // Calculate summary statistics
    const summary = {
      total_quantity: data?.reduce((sum, b) => sum + (b.quantity_kg || 0), 0) || 0,
      total_remaining: data?.reduce((sum, b) => sum + (b.quantity_remaining_kg || 0), 0) || 0,
      total_consumed: data?.reduce((sum, b) => sum + ((b.quantity_kg || 0) - (b.quantity_remaining_kg || 0)), 0) || 0,
      batch_count: data?.length || 0,
      status_breakdown: getStatusBreakdown(data || []),
      grade_breakdown: getGradeBreakdown(data || []),
    };

    return { data, summary };
  } catch (error) {
    console.error("Error fetching stock summary:", error);
    throw error;
  }
}

// ── Batch Tracking Report ─────────────────────────────────────────────────
export async function getBatchTrackingData(filters: {
  batch_id?: string;
  status?: string;
  company_id?: string;
  limit?: number;
}) {
  try {
    let query = supabase
      .from("inventory_batches")
      .neq("is_deleted", true)
      .select(`
        id,
        lot_number,
        quantity_kg,
        quantity_remaining_kg,
        status,
        is_export_ready,
        received_date,
        created_at,
        grade,
        moisture_pct,
        product:products(id, name, sku),
        warehouse:warehouses(id, name)
      `);

    if (filters.batch_id) {
      const searchTerm = `%${filters.batch_id}%`;
      query = query.or(`id.ilike.${searchTerm},lot_number.ilike.${searchTerm}`);
    }

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.company_id) {
      query = query.eq("company_id", filters.company_id);
    }

    if (filters.limit !== undefined) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query
      .order("received_date", { ascending: false });

    if (error) throw error;

    // Enrich with movement history using single query with left join
    const batchIds = (data || []).map(b => b.id);
    
    if (batchIds.length === 0) {
      return [];
    }

    const { data: movements, error: movementError } = await supabase
      .from("inventory_movements")
      .neq("is_deleted", true)
      .select("*")
      .in("batch_id", batchIds)
      .order("created_at", { ascending: false });

    if (movementError) throw movementError;

    // Group movements by batch_id
    const movementsByBatch = (movements || []).reduce((acc, movement) => {
      if (!acc[movement.batch_id]) acc[movement.batch_id] = [];
      acc[movement.batch_id].push(movement);
      return acc;
    }, {} as Record<string, any[]>);

    // Enrich data with grouped movements
    const enrichedData = (data || []).map(batch => ({
      ...batch,
      movements: movementsByBatch[batch.id] || []
    }));

    return enrichedData;
  } catch (error) {
    console.error("Error fetching batch tracking data:", error);
    throw error;
  }
}

// ── Dispatch Report ──────────────────────────────────────────────────────
export async function getDispatchReportData(filters: {
  date_from?: string;
  date_to?: string;
  status?: string;
  company_id?: string;
}) {
  try {
    let query = supabase
      .from("export_shipments")
      .neq("is_deleted", true)
      .select(`
        id,
        shipment_number,
        status,
        total_quantity_kg,
        carton_count,
        container_number,
        created_at,
        dispatch_date,
        estimated_delivery,
        destination_port,
        customer:customers(id, name)
      `);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.company_id) {
      query = query.eq("company_id", filters.company_id);
    }

    if (filters.date_from) {
      query = query.gte("created_at", filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte("created_at", filters.date_to);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error fetching dispatch report data:", error);
    throw error;
  }
}

// ── Container Loading Report ──────────────────────────────────────────────
export async function getContainerLoadingData(filters: {
  container_id?: string;
  status?: string;
  company_id?: string;
}) {
  try {
    let query = supabase
      .from("export_shipments")
      .neq("is_deleted", true)
      .select(`
        id,
        container_number,
        container_type,
        status,
        total_quantity_kg,
        carton_count,
        net_weight_kg,
        gross_weight_kg,
        seal_number,
        created_at,
        product:products(id, name, sku)
      `);

    if (filters.container_id) {
      query = query.eq("container_number", filters.container_id);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.company_id) {
      query = query.eq("company_id", filters.company_id);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Calculate container utilization
    const enrichedData = (data || []).map(container => ({
      ...container,
      utilization_percentage: container.total_quantity_kg ? 
        ((container.total_quantity_kg / 20000) * 100).toFixed(2) : 0,
    }));

    return enrichedData;
  } catch (error) {
    console.error("Error fetching container loading data:", error);
    throw error;
  }
}

// ── Damage/Wastage Report ─────────────────────────────────────────────────
export async function getDamageWastageData(filters: {
  date_from?: string;
  date_to?: string;
  severity?: string;
  company_id?: string;
}) {
  try {
    let query = supabase
      .from("inventory_batches")
      .neq("is_deleted", true)
      .select(`
        id,
        lot_number,
        quantity_kg,
        status,
        grade,
        received_date,
        product:products(id, name, sku),
        warehouse:warehouses(id, name)
      `)
      .in("status", ["damaged", "rejected", "quarantine", "pending_qc"]);

    if (filters.company_id) {
      query = query.eq("company_id", filters.company_id);
    }

    if (filters.date_from) {
      query = query.gte("received_date", filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte("received_date", filters.date_to);
    }

    const { data, error } = await query
      .order("received_date", { ascending: false })
      .limit(3000);

    if (error) throw error;

    // Calculate damage statistics
    const summary = {
      total_damaged_quantity: data?.reduce((sum, b) => sum + (b.quantity_kg || 0), 0) || 0,
      total_damage_incidents: data?.length || 0,
      status_distribution: getStatusBreakdown(data || []),
      value_impact: 0, // Would calculate based on product pricing
    };

    return { data, summary };
  } catch (error) {
    console.error("Error fetching damage/wastage data:", error);
    throw error;
  }
}

// ── Inventory Aging Report ───────────────────────────────────────────────
export async function getInventoryAgingData(filters: {
  company_id?: string;
  warehouse_id?: string;
}) {
  try {
    let query = supabase
      .from("inventory_batches")
      .neq("is_deleted", true)
      .select(`
        id,
        lot_number,
        quantity_remaining_kg,
        received_date,
        product:products(id, name, sku),
        warehouse:warehouses(id, name)
      `)
      .neq("quantity_remaining_kg", 0);

    if (filters.company_id) {
      query = query.eq("company_id", filters.company_id);
    }

    if (filters.warehouse_id) {
      query = query.eq("warehouse_id", filters.warehouse_id);
    }

    const { data, error } = await query
      .order("received_date", { ascending: true })
      .limit(5000);

    if (error) throw error;

    // Calculate aging buckets
    const now = new Date();
    const enrichedData = (data || []).map(batch => {
      const receivedDate = new Date(batch.received_date);
      const daysOld = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let agingBucket = "0-30 days";
      if (daysOld > 180) agingBucket = "180+ days";
      else if (daysOld > 90) agingBucket = "90-180 days";
      else if (daysOld > 30) agingBucket = "30-90 days";

      return { ...batch, daysOld, agingBucket };
    });

    const ageingSummary = {
      "0-30 days": enrichedData.filter(b => b.agingBucket === "0-30 days").reduce((s, b) => s + (b.quantity_remaining_kg || 0), 0),
      "30-90 days": enrichedData.filter(b => b.agingBucket === "30-90 days").reduce((s, b) => s + (b.quantity_remaining_kg || 0), 0),
      "90-180 days": enrichedData.filter(b => b.agingBucket === "90-180 days").reduce((s, b) => s + (b.quantity_remaining_kg || 0), 0),
      "180+ days": enrichedData.filter(b => b.agingBucket === "180+ days").reduce((s, b) => s + (b.quantity_remaining_kg || 0), 0),
    };

    return { data: enrichedData, summary: ageingSummary };
  } catch (error) {
    console.error("Error fetching inventory aging data:", error);
    throw error;
  }
}

// ── Export Ready Stock Report ─────────────────────────────────────────────
export async function getExportReadyStockData(filters: {
  company_id?: string;
  warehouse_id?: string;
  product_id?: string;
}) {
  try {
    let query = supabase
      .from("inventory_batches")
      .select(`
        id,
        lot_number,
        quantity_remaining_kg,
        grade,
        is_export_ready,
        status,
        received_date,
        product:products(id, name, sku, hs_code),
        warehouse:warehouses(id, name)
      `)
      .eq("is_export_ready", true)
      .eq("status", "qc_passed");

    if (filters.company_id) {
      query = query.eq("company_id", filters.company_id);
    }

    if (filters.warehouse_id) {
      query = query.eq("warehouse_id", filters.warehouse_id);
    }

    if (filters.product_id) {
      query = query.eq("product_id", filters.product_id);
    }

    const { data, error } = await query
      .order("received_date", { ascending: true })
      .limit(5000);

    if (error) throw error;

    // Calculate readiness summary
    const summary = {
      total_export_ready_quantity: data?.reduce((sum, b) => sum + (b.quantity_remaining_kg || 0), 0) || 0,
      export_ready_batches: data?.length || 0,
      by_grade: getGradeBreakdown(data || []),
      by_warehouse: getWarehouseBreakdown(data || []),
    };

    return { data, summary };
  } catch (error) {
    console.error("Error fetching export ready stock data:", error);
    throw error;
  }
}

// ── Helper Functions ──────────────────────────────────────────────────────
function getStatusBreakdown(data: any[]) {
  const breakdown: Record<string, number> = {};
  data.forEach(item => {
    const status = item.status || "unknown";
    breakdown[status] = (breakdown[status] || 0) + (item.quantity_kg || 0);
  });
  return breakdown;
}

function getGradeBreakdown(data: any[]) {
  const breakdown: Record<string, number> = {};
  data.forEach(item => {
    const grade = item.grade || "ungraded";
    breakdown[grade] = (breakdown[grade] || 0) + (item.quantity_kg || item.quantity_remaining_kg || 0);
  });
  return breakdown;
}

function getWarehouseBreakdown(data: any[]) {
  const breakdown: Record<string, number> = {};
  data.forEach(item => {
    const warehouse = item.warehouse?.name || "unknown";
    breakdown[warehouse] = (breakdown[warehouse] || 0) + (item.quantity_remaining_kg || 0);
  });
  return breakdown;
}

// ── Export Functions ──────────────────────────────────────────────────────
export function generateCSV(data: any[], columns: string[]) {
  const headers = columns.join(",");
  const rows = data.map(row =>
    columns.map(col => {
      const value = col.split(".").reduce((obj, key) => obj?.[key], row);
      return typeof value === "string" && value.includes(",") ? `"${value}"` : value || "";
    }).join(",")
  );
  return [headers, ...rows].join("\n");
}

export function generatePDF(data: any[], title: string) {
  // This would use jsPDF library
  console.log(`Generating PDF for ${title}:`, data);
}
