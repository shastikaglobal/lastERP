import { supabase } from "./supabase";

export interface PackingProtocol {
    id: string;
    receiving_id: string;
    product_name?: string;
    carton_count: number;
    net_weight: number;
    gross_weight: number;
    pallet_config: string;
    export_marks: string;
    status: "draft" | "in_progress" | "completed" | "archived";
    company_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePackingInput {
    receiving_id: string;
    product_name?: string;
    carton_count: number;
    net_weight: number;
    gross_weight: number;
    pallet_config: string;
    export_marks: string;
    status?: "draft" | "in_progress" | "completed";
}

// Helper to determine direct API target when running locally
const getApiUrl = (path: string) => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocalhost ? `http://127.0.0.1:8082${path}` : path;
};

// Create packing protocol
export async function createPackingProtocol(
    data: CreatePackingInput,
    companyId: string,
    userId: string
): Promise<PackingProtocol> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(getApiUrl('/api/warehouse/packing_protocols'), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                receiving_id: data.receiving_id,
                carton_count: data.carton_count,
                net_weight: data.net_weight,
                gross_weight: data.gross_weight,
                pallet_config: data.pallet_config,
                export_marks: data.export_marks,
                status: data.status || "draft",
                company_id: companyId,
                created_by: userId,
                is_deleted: false,
                deleted_at: null,
                deleted_by: null,
            })
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Failed to create packing protocol: ${res.status}`);
        }
        return await res.json();
    } catch (error: any) {
        console.error("Error in createPackingProtocol:", error);
        throw error;
    }
}

// Get all packing protocols for a company
export async function getPackingProtocols(
    companyId: string,
    filters?: {
        status?: string;
        search?: string;
    }
): Promise<PackingProtocol[]> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(getApiUrl('/api/warehouse/packing_protocols'), { headers });
        if (!res.ok) throw new Error(`Failed to fetch packing protocols: ${res.status}`);
        const data = await res.json();
        
        let filtered = (data || []).filter((p: any) => 
            !p.is_deleted && 
            p.company_id === companyId
        );
        
        if (filters?.status) {
            filtered = filtered.filter((p: any) => p.status === filters.status);
        }
        // order by created_at desc
        filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        return filtered as PackingProtocol[];
    } catch (error) {
        console.error("Error in getPackingProtocols:", error);
        throw error;
    }
}

// Get single packing protocol
export async function getPackingProtocolById(
    id: string
): Promise<PackingProtocol> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(getApiUrl(`/api/warehouse/packing_protocols`), { headers });
        if (!res.ok) throw new Error(`Failed to fetch packing protocols: ${res.status}`);
        const data = await res.json();
        const found = (data || []).find((p: any) => p.id === id);
        if (!found) throw new Error("Packing protocol not found");
        return found as PackingProtocol;
    } catch (error) {
        console.error("Error in getPackingProtocolById:", error);
        throw error;
    }
}

// Update packing protocol
export async function updatePackingProtocol(
    id: string,
    updates: Partial<PackingProtocol>
): Promise<PackingProtocol> {
    try {
        const { product_name, ...dbUpdates } = updates;
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(getApiUrl(`/api/warehouse/packing_protocols/${id}`), {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                ...dbUpdates,
                updated_at: new Date().toISOString()
            })
        });
        if (!res.ok) throw new Error(`Failed to update packing protocol: ${res.status}`);
        return await getPackingProtocolById(id);
    } catch (error) {
        console.error("Error in updatePackingProtocol:", error);
        throw error;
    }
}

// Delete packing protocol (Soft-delete)
export async function deletePackingProtocol(id: string): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(getApiUrl(`/api/warehouse/packing_protocols/${id}`), {
            method: 'DELETE',
            headers
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Failed to delete packing protocol: ${res.status}`);
        }
    } catch (error) {
        console.error("Error in deletePackingProtocol:", error);
        throw error;
    }
}

// Get packing statistics
export async function getPackingStats(companyId: string) {
    try {
        const protocols = await getPackingProtocols(companyId);
        const stats = {
            total: protocols.length,
            completed: protocols.filter((p) => p.status === "completed").length,
            in_progress: protocols.filter((p) => p.status === "in_progress").length,
            pending: protocols.filter((p) => p.status === "draft").length,
        };
        return stats;
    } catch (error) {
        console.error("Error in getPackingStats:", error);
        throw error;
    }
}

// Get packing data for PDF generation
export async function getPackingListPDF(packingId: string) {
    const packing = await getPackingProtocolById(packingId);

    const receiving = { receiving_number: packing.receiving_id };

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        // Fetch batches from VPS
        const resBatches = await fetch(getApiUrl('/api/inventory/inventory_batches'), { headers });
        if (resBatches.ok) {
            const batches = await resBatches.json();
            const foundBatch = (batches || []).find((b: any) => 
                b.id === packing.receiving_id || 
                b.lot_number === packing.receiving_id
            );
            if (foundBatch) {
                receiving.receiving_number = foundBatch.lot_number;
            }
        }
    } catch (e) {
        console.warn("Could not fetch receiving info, using raw ID", e);
    }

    // Get company details
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    const resCompany = await fetch(getApiUrl('/api/settings'), { headers });
    if (!resCompany.ok) throw new Error('Failed to fetch company settings');
    const company = await resCompany.json();

    return {
        packing,
        receiving,
        company,
    };
}

// Get receiving not yet packed
export async function getUnpackedReceivings(
    companyId: string
): Promise<any[]> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        
        // Fetch batches from VPS
        const resBatches = await fetch(getApiUrl('/api/inventory/inventory_batches'), { headers });
        if (!resBatches.ok) throw new Error('Failed to fetch inventory batches');
        const batches = await resBatches.json();
        
        // Fetch products from VPS to map product name
        const resProducts = await fetch(getApiUrl('/api/products'), { headers });
        if (!resProducts.ok) throw new Error('Failed to fetch products');
        const products = await resProducts.json();
        
        const filteredBatches = (batches || []).filter((batch: any) => 
            !batch.is_deleted && 
            (!companyId || batch.company_id === companyId)
        );
        
        return filteredBatches.map((batch: any) => {
            const product = (products || []).find((p: any) => p.id === batch.product_id);
            return {
                id: batch.id,
                receiving_number: batch.lot_number || `BATCH-${batch.id.substring(0, 6)}`,
                product_name: product?.name || "Unknown Product",
                status: batch.status,
                total_items: batch.quantity_kg,
                created_at: batch.received_date
            };
        });
    } catch (err) {
        console.error("Error in getUnpackedReceivings:", err);
        return [];
    }
}

// Validate packing data
export function validatePackingData(data: CreatePackingInput): string[] {
    const errors: string[] = [];

    // Basic required checks
    if (!data.receiving_id) errors.push("Receiving ID is required");

    // Cartons must be at least 1
    if (!data.carton_count || data.carton_count < 1) errors.push("Carton count must be at least 1");

    // Allow zero weights for draft or when weight is not yet measured.
    // Only enforce that gross >= net when weights are provided.
    if (typeof data.net_weight !== 'number' || isNaN(data.net_weight) || data.net_weight < 0) {
        errors.push("Net weight must be a non-negative number");
    }
    if (typeof data.gross_weight !== 'number' || isNaN(data.gross_weight) || data.gross_weight < 0) {
        errors.push("Gross weight must be a non-negative number");
    }
    if (typeof data.net_weight === 'number' && typeof data.gross_weight === 'number') {
        if (data.net_weight > data.gross_weight) {
            errors.push("Net weight cannot be greater than gross weight");
        }
    }

    return errors;
}
