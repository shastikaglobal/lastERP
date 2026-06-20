import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import Card from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
    ArrowRight,
    Truck,
    PackageCheck,
    ClipboardCheck,
    CheckCircle2,
    Database,
    UploadCloud,
    Image as ImageIcon,
    List,
    Plus,
    Loader2,
    Trash2,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STAGES = [
    { id: "supplier", label: "Supplier", icon: Truck },
    { id: "arrival", label: "Goods Arrival", icon: PackageCheck },
    { id: "verification", label: "Verification", icon: CheckCircle2 },
    { id: "quality", label: "Quality Check", icon: ClipboardCheck },
    { id: "stock", label: "Stock Entry", icon: Database },
];

const COMPANY_PRODUCT_NAMES = [
    "Tender Coconut",
    "Green Coconut",
    "Husked Coconut",
    "Semi-Husked Coconut",
    "Dehusked Coconut",
    "Fresh Organic Coconut",
    "Tomato",
    "Watermelon",
    "Black Diamond Watermelon",
    "Yellow Pumpkin",
    "White Pumpkin",
    "Yellow Cucumber",
    "Cavendish Banana",
    "Baby Banana",
    "Nendran Banana",
    "Red Banana",
];

export default function ReceivingGoods() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<"entry" | "list">("entry");

    const { data: suppliers = [], isLoading: suppliersLoading, error: suppliersError } = useQuery({
        queryKey: ["warehouse-suppliers"],
        enabled: true,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('farmers')
                .select('id, full_name, email, phone')
                .neq('is_deleted', true)
                .eq('is_active', true)
                .order('full_name', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
        queryKey: ["warehouse-products"],
        enabled: true,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select('id, name, grade:default_grade, unit')
                .neq('is_deleted', true)
                .eq('is_active', true)
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    const { data: warehouses = [], isLoading: warehousesLoading, error: warehousesError } = useQuery({
        queryKey: ["warehouse-locations", profile?.company_id],
        enabled: true,
        queryFn: async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/warehouse/warehouses', {
                    headers: { 'Authorization': `Bearer ${session?.access_token}` }
                });
                if (!res.ok) throw new Error('Failed to fetch warehouses');
                const data = await res.json();
                const filtered = (data || []).filter((w: any) => !w.is_deleted && (!profile?.company_id || w.company_id === profile.company_id));
                return filtered;
            } catch (err: any) {
                console.error("Error fetching warehouses:", err);
                return [];
            }
        }
    });

    const { data: dbBatches = [] } = useQuery({
        queryKey: ["warehouse-received-batches", profile?.company_id],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : undefined;
            const res = await fetch('/api/inventory/inventory_batches', { headers });
            if (!res.ok) throw new Error('Failed to fetch batches');
            const data = await res.json();
            return (data || []).filter((b: any) => !b.is_deleted && (!profile?.company_id || b.company_id === profile.company_id));
        }
    });

    const savedStocks = useMemo(() => {
        return dbBatches.map((b: any) => {
            const prod = products.find((p: any) => p.id === b.product_id);
            const supplier = suppliers.find((s: any) => s.id === b.farmer_id);
            return {
                id: b.id,
                entryDate: b.received_date ? b.received_date.split('T')[0] : '—',
                grn: b.grn_number || '—',
                batchNumber: b.lot_number,
                supplierInfo: supplier ? supplier.full_name : 'Direct Stock',
                receivedQty: b.quantity_kg,
                qualityStatus: b.status === 'approved' ? 'pass' : 'rejected'
            };
        });
    }, [dbBatches, products, suppliers]);

    // Edit Batch State
    const [editingBatch, setEditingBatch] = useState<any | null>(null);
    const [editReceivedQty, setEditReceivedQty] = useState("");
    const [editStatus, setEditStatus] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const handleOpenEdit = (stock: any) => {
        const batch = dbBatches.find((b: any) => b.id === stock.id);
        if (batch) {
            setEditingBatch(batch);
            setEditReceivedQty(String(batch.quantity_kg || ""));
            setEditStatus(batch.status === 'approved' ? 'pass' : 'rejected');
            setEditNotes(batch.damaged_notes || "");
        }
    };

    const handleSaveEdit = async () => {
        if (!editingBatch) return;
        setIsSavingEdit(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/inventory/inventory_batches/${editingBatch.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    quantity_kg: Number(editReceivedQty) || 0,
                    quantity_remaining_kg: Number(editReceivedQty) || 0,
                    status: editStatus === 'pass' ? 'approved' : 'pending_qc',
                    is_export_ready: editStatus === 'pass',
                    damaged_notes: editNotes
                })
            });

            if (!res.ok) throw new Error(await res.text() || "Failed to update batch");

            toast.success("Stock entry updated successfully!");
            setEditingBatch(null);
            queryClient.invalidateQueries({ queryKey: ["warehouse-received-batches"] });
            queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
            queryClient.invalidateQueries({ queryKey: ["inventory_batches"] });
            queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });
        } catch (err: any) {
            toast.error(err.message || "Failed to update stock entry");
        } finally {
            setIsSavingEdit(false);
        }
    };

    const [currentStage, setCurrentStage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        grn: `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierId: "",
        supplierInfo: "",
        productId: "",
        productName: "",
        warehouseId: "",
        expectedQty: "",
        receivedQty: "",
        qualityStatus: "",
        batchNumber: `BATCH-${Math.floor(100000 + Math.random() * 900000)}`,
        entryDate: new Date().toISOString().split("T")[0],
        notes: ""
    });

    const formatSupplierInfo = (supplier: any) => {
        if (!supplier) return "";
        const parts = [supplier.full_name];
        if (supplier.phone) parts.push(supplier.phone);
        if (supplier.email) parts.push(supplier.email);
        return parts.filter(Boolean).join(" — ");
    };

    const handleInputChange = (field: string, value: string) => {
        const stringValue = String(value || "");
        setFormData(prev => {
            if (field === "supplierId") {
                const supplier = suppliers.find((s: any) => String(s.id) === stringValue);
                return {
                    ...prev,
                    supplierId: stringValue,
                    supplierInfo: stringValue ? formatSupplierInfo(supplier) : "",
                };
            }
            if (field === "supplierInfo") {
                const found = suppliers.find((s: any) => s.full_name.trim().toLowerCase() === stringValue.trim().toLowerCase());
                return {
                    ...prev,
                    supplierId: found ? String(found.id) : "",
                    supplierInfo: value,
                };
            }
            if (field === "productName") {
                const found = uniqueProducts.find((p: any) => p.name.trim().toLowerCase() === stringValue.trim().toLowerCase());
                return {
                    ...prev,
                    productId: found ? String(found.id) : "",
                    productName: value,
                };
            }
            if (field === "productId" || field === "warehouseId") {
                return { ...prev, [field]: stringValue };
            }
            return { ...prev, [field]: value };
        });
    };

    const uniqueProducts = useMemo(() => {
        const normalizedProducts = (products || [])
            .filter((p: any) => p && p.name)
            .map((p: any) => ({
                ...p,
                id: String(p.id),
                normalizedName: String(p.name).trim().toLowerCase(),
                normalizedGrade: String(p.grade || "").trim().toLowerCase(),
                normalizedUnit: String(p.unit || "").trim().toLowerCase(),
            }));

        const productMap = normalizedProducts.reduce((map: Record<string, any>, product: any) => {
            if (!map[product.normalizedName]) {
                map[product.normalizedName] = product;
            }
            return map;
        }, {} as Record<string, any>);

        return COMPANY_PRODUCT_NAMES.map((name, index) => {
            const normalizedName = name.trim().toLowerCase();
            const product = productMap[normalizedName];
            if (product) {
                return product;
            }
            return {
                id: `fallback-product-${index}`,
                name,
                grade: "",
                unit: "kg",
                isFallback: true,
            };
        });
    }, [products]);

    const selectedProduct = useMemo(
        () => uniqueProducts.find((product: any) => product.id === formData.productId),
        [uniqueProducts, formData.productId]
    );

    const selectedWarehouse = useMemo(
        () => warehouses.find((warehouse: any) => String(warehouse.id) === formData.warehouseId),
        [warehouses, formData.warehouseId]
    );

    const selectedSupplier = useMemo(
        () => suppliers.find((supplier: any) => String(supplier.id) === formData.supplierId),
        [suppliers, formData.supplierId]
    );

    const nextStage = async () => {
        if (currentStage === 0) {
            if (!formData.supplierId && !formData.supplierInfo) {
                toast.error("Select a supplier or enter supplier details to continue.");
                return;
            }
            if (!formData.productId && !formData.productName) {
                toast.error("Select a product for this receiving entry.");
                return;
            }
            setCurrentStage(prev => prev + 1);
            return;
        }

        if (currentStage === 1) {
            if (!formData.warehouseId) {
                toast.error("Please select a warehouse location.");
                return;
            }
            if (!formData.expectedQty) {
                toast.error("Please enter expected quantity.");
                return;
            }
            setCurrentStage(prev => prev + 1);
            return;
        }

        if (currentStage === 2) {
            if (!formData.receivedQty) {
                toast.error("Please enter received quantity.");
                return;
            }
            setCurrentStage(prev => prev + 1);
            return;
        }

        if (currentStage === 3) {
            if (!formData.qualityStatus) {
                toast.error("Please select quality status.");
                return;
            }
            setCurrentStage(prev => prev + 1);
            return;
        }

        if (currentStage === STAGES.length - 1) {
            setIsSubmitting(true);
            try {
                let company_id = profile?.company_id;

                if (!company_id) {
                    const { data: { session } } = await supabase.auth.getSession();
                    const userId = session?.user?.id;

                    if (userId) {
                        const { data: profileData, error: profileError } = await supabase
                            .from('profiles')
                            .select('company_id')
                            .eq('id', userId)
                            .single();
                        if (profileError) throw profileError;
                        company_id = profileData?.company_id;
                    }
                }

                if (!company_id) {
                    throw new Error('Unable to determine company association for this user.');
                }

                if ((!formData.productId && !formData.productName) || !formData.warehouseId) {
                    toast.error("Please select product and warehouse before confirming.");
                    setIsSubmitting(false);
                    return;
                }

                const quantityValue = Number(formData.receivedQty) || 0;
                const status = formData.qualityStatus === 'pass' ? 'approved' : 'pending_qc';
                const isExportReady = formData.qualityStatus === 'pass';

                // 1. Resolve or create Farmer/Supplier on the fly
                let resolvedFarmerId = formData.supplierId;
                if (!resolvedFarmerId && formData.supplierInfo) {
                    const typedName = formData.supplierInfo.split(" — ")[0].trim();
                    const existingSupplier = suppliers.find((s: any) => s.full_name.trim().toLowerCase() === typedName.toLowerCase());
                    if (existingSupplier) {
                        resolvedFarmerId = existingSupplier.id;
                    } else {
                        const { data: { session: currentSession } } = await supabase.auth.getSession();
                        const createRes = await fetch('/api/farmers', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${currentSession?.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                company_id,
                                full_name: typedName,
                                is_active: true,
                            })
                        });
                        
                        if (!createRes.ok) {
                            console.error("Failed to auto-create farmer:", await createRes.text());
                            toast.error(`Failed to create supplier "${typedName}".`);
                            setIsSubmitting(false);
                            return;
                        }
                        const newFarmer = await createRes.json();
                        resolvedFarmerId = newFarmer.id;
                        toast.info(`Auto-created supplier "${typedName}" in your directory.`);
                        queryClient.invalidateQueries({ queryKey: ["warehouse-suppliers"] });
                    }
                }

                // 2. Resolve or create Product on the fly
                let resolvedProductId = formData.productId;
                if (!resolvedProductId && formData.productName) {
                    const existingProduct = products.find((p: any) => p.name.trim().toLowerCase() === formData.productName.trim().toLowerCase());
                    if (existingProduct) {
                        resolvedProductId = existingProduct.id;
                    } else {
                        const { data: { session: currentSession } } = await supabase.auth.getSession();
                        const createRes = await fetch('/api/inventory/products', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${currentSession?.access_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: formData.productName.trim(),
                                unit: 'kg',
                                is_active: true,
                                company_id,
                            })
                        });
                        
                        if (!createRes.ok) {
                            console.error("Failed to auto-create product:", await createRes.text());
                            toast.error(`Failed to create product "${formData.productName}".`);
                            setIsSubmitting(false);
                            return;
                        }
                        const newProduct = await createRes.json();
                        resolvedProductId = newProduct.id;
                        toast.info(`Auto-created product "${formData.productName}" in your catalog.`);
                        queryClient.invalidateQueries({ queryKey: ["warehouse-products"] });
                    }
                } else if (resolvedProductId.startsWith('fallback-product-')) {
                    const fallbackProduct = uniqueProducts.find((p: any) => p.id === resolvedProductId);
                    if (!fallbackProduct) {
                        toast.error("Selected product not found. Please re-select.");
                        setIsSubmitting(false);
                        return;
                    }
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    const createRes = await fetch('/api/inventory/products', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${currentSession?.access_token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: fallbackProduct.name,
                            unit: fallbackProduct.unit || 'kg',
                            is_active: true,
                            company_id,
                        })
                    });
                    
                    if (!createRes.ok) {
                        console.error("Failed to auto-create product:", await createRes.text());
                        toast.error(`Failed to create product "${fallbackProduct.name}". Please add it manually in Products first.`);
                        setIsSubmitting(false);
                        return;
                    }
                    const newProduct = await createRes.json();
                    resolvedProductId = newProduct.id;
                    toast.info(`Auto-created product "${fallbackProduct.name}" in your catalog.`);
                    queryClient.invalidateQueries({ queryKey: ["warehouse-products"] });
                }

                const { data: { session: currentSession } } = await supabase.auth.getSession();
                const res = await fetch('/api/inventory/inventory_batches', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentSession?.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        company_id,
                        lot_number: formData.batchNumber,
                        product_id: resolvedProductId,
                        warehouse_id: formData.warehouseId,
                        farmer_id: resolvedFarmerId || null,
                        quantity_kg: quantityValue,
                        quantity_remaining_kg: quantityValue,
                        status,
                        is_export_ready: isExportReady,
                        received_date: formData.entryDate,
                        ...(formData.notes ? { damaged_notes: formData.notes } : {})
                    })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    console.error("Database insert error:", errData);
                    throw new Error(errData.error || "Failed to insert inventory batch");
                }

                // Update warehouse stock summary if the table exists
                try {
                    const productName = formData.productName || selectedProduct?.name || '';
                    const { data: existingStock, error: stockError } = await supabase
                        .from('warehouse_stock')
                        .select('id, quantity, unit')
                        .eq('warehouse_id', formData.warehouseId)
                        .eq('product_name', productName)
                        .maybeSingle();

                    if (stockError) {
                        throw stockError;
                    }

                    if (existingStock) {
                        const updatedQty = Number(existingStock.quantity || 0) + quantityValue;
                        await supabase.from('warehouse_stock').update({
                            quantity: updatedQty,
                            unit: selectedProduct?.unit || 'kg',
                            last_updated: new Date().toISOString(),
                            notes: `Updated from receiving ${formData.batchNumber}`
                        }).eq('id', existingStock.id);
                    } else {
                        await supabase.from('warehouse_stock').insert({
                            warehouse_id: formData.warehouseId,
                            product_name: productName,
                            quantity: quantityValue,
                            unit: selectedProduct?.unit || 'kg',
                            last_updated: new Date().toISOString(),
                            notes: `Stock added from receiving ${formData.batchNumber}`
                        });
                    }
                } catch (stockErr) {
                    console.warn('Warehouse stock update skipped:', stockErr);
                }

                queryClient.invalidateQueries({ queryKey: ["warehouse-received-batches"] });

                toast.success("Goods received and saved to database successfully!");
                queryClient.invalidateQueries({ queryKey: ["warehouse-inventory"] });
                queryClient.invalidateQueries({ queryKey: ["inventory_batches"] });
                queryClient.invalidateQueries({ queryKey: ["warehouse-stock"] });

                setTimeout(() => {
                    setCurrentStage(0);
                    setActiveTab("list");
                    setFormData({
                        grn: `GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                        supplierId: "",
                        supplierInfo: "",
                        productId: "",
                        productName: "",
                        warehouseId: "",
                        expectedQty: "",
                        receivedQty: "",
                        qualityStatus: "",
                        batchNumber: `BATCH-${Math.floor(100000 + Math.random() * 900000)}`,
                        entryDate: new Date().toISOString().split("T")[0],
                        notes: ""
                    });
                    setSelectedFile(null);
                }, 1500);
            } catch (err: any) {
                console.error("Backend error:", err);
                toast.error(err.message || "Failed to save to database. Please check your connection and try again.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const prevStage = () => {
        if (currentStage > 0) {
            setCurrentStage(prev => prev - 1);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in max-w-5xl mx-auto">
            <PageHeader
                title="Goods Receiving"
                description="Process incoming shipments, perform quality checks, and allocate to stock"
                breadcrumbs={[{ label: "Warehouse" }, { label: "Receiving" }]}
            />

            {/* Show warnings if data is missing */}
            {(productsError || warehousesError || (!productsLoading && products.length === 0) || (!warehousesLoading && warehouses.length === 0)) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-600">Configuration Required</p>
                        <p className="text-sm text-amber-600/80">
                            {!productsLoading && products.length === 0 && "No products configured. "}
                            {!warehousesLoading && warehouses.length === 0 && "No warehouses configured. "}
                            Please set up products and warehouses before receiving goods.
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-1 p-1 bg-muted/30 rounded-lg max-w-sm border border-border">
                <button
                    type="button"
                    onClick={() => setActiveTab('entry')}
                    className={`pointer-events-auto flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'entry' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Plus className="w-4 h-4" />
                    New Entry
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className={`pointer-events-auto flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <List className="w-4 h-4" />
                    Stock List
                </button>
            </div>

            {activeTab === 'entry' && (
                <>
                    {/* Workflow Progress */}
                    <div className="w-full mb-8">
                        <div className="flex items-center justify-between relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border rounded-full -z-10"></div>
                            <div
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full -z-10 transition-all duration-300"
                                style={{ width: `${(currentStage / (STAGES.length - 1)) * 100}%` }}
                            ></div>

                            {STAGES.map((stage, index) => {
                                const Icon = stage.icon;
                                const isActive = index === currentStage;
                                const isCompleted = index < currentStage;

                                return (
                                    <div key={stage.id} className="flex flex-col items-center gap-2">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-background transition-colors ${isActive ? 'bg-primary text-primary-foreground shadow-[0_0_15px_var(--primary)]'
                                                : isCompleted ? 'bg-primary/80 text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground'}`}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={`text-xs font-semibold ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {stage.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div >
                    </div >

                    <Card className="bg-card border-border overflow-hidden shadow-lg">
                        <div className="p-6 border-b border-border bg-muted/30">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                                {React.createElement(STAGES[currentStage].icon, { className: "w-6 h-6" })}
                                {STAGES[currentStage].label}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Complete the required details for this step to proceed to the next stage.
                            </p>
                        </div>

                        <div className="p-6 space-y-6 min-h-[300px]">
                            {currentStage === 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                    <div className="space-y-4 md:col-span-2">
                                        <div>
                                            <Label>Goods Receipt Note (GRN)</Label>
                                            <Input
                                                value={formData.grn}
                                                readOnly
                                                className="bg-muted font-mono font-bold text-primary mt-1.5"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">Auto-generated unique receipt identifier.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Supplier</Label>
                                        <Input
                                            value={formData.supplierInfo}
                                            onChange={(e) => handleInputChange("supplierInfo", e.target.value)}
                                            placeholder="Type or select supplier..."
                                            list="suppliers-list"
                                            className="mt-1.5"
                                        />
                                        <datalist id="suppliers-list">
                                            {suppliers.map((supplier: any) => (
                                                <option key={supplier.id} value={supplier.full_name} />
                                            ))}
                                        </datalist>
                                        <p className="text-xs text-muted-foreground">Choose an existing farmer/supplier or type to enter supplier details manually.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Product</Label>
                                        <Input
                                            value={formData.productName || ""}
                                            onChange={(e) => handleInputChange("productName", e.target.value)}
                                            placeholder="Type or select product..."
                                            list="products-list"
                                            className="mt-1.5"
                                        />
                                        <datalist id="products-list">
                                            {uniqueProducts.map((product: any) => (
                                                <option key={product.id} value={product.name} />
                                            ))}
                                        </datalist>
                                        <p className="text-xs text-muted-foreground">Select the product batch being received.</p>
                                    </div>

                                    <div className="space-y-4 md:col-span-2">
                                        <div>
                                            <Label>Supplier Details</Label>
                                            <Input
                                                placeholder="Enter Supplier Name or contact details"
                                                value={formData.supplierInfo}
                                                onChange={(e) => handleInputChange("supplierInfo", e.target.value)}
                                                className="mt-1.5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStage === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                    <div className="space-y-4">
                                        <Label>Warehouse Location</Label>
                                        <Select value={formData.warehouseId || undefined} onValueChange={(value) => handleInputChange("warehouseId", value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={warehousesLoading ? "Loading warehouses..." : "Select warehouse"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {warehouses.length > 0 ? warehouses.map((warehouse: any) => (
                                                        <SelectItem key={warehouse.id} value={String(warehouse.id)}>{warehouse.name} - {[warehouse.location, warehouse.city].filter(Boolean).join(", ")}</SelectItem>
                                                )) : null}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-4">
                                        <Label>Warehouse Entry Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.entryDate}
                                            onChange={(e) => handleInputChange("entryDate", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <Label>Expected Quantity (kg)</Label>
                                        <Input
                                            type="number"
                                            placeholder="0"
                                            value={formData.expectedQty}
                                            onChange={(e) => handleInputChange("expectedQty", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-4 md:col-span-2">
                                        <Label>Arrival Notes</Label>
                                        <Textarea
                                            placeholder="Condition of package, driver details, etc."
                                            value={formData.notes}
                                            onChange={(e) => handleInputChange("notes", e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStage === 2 && (
                                <div className="grid grid-cols-1 gap-6 animate-fade-in">
                                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                                        <h3 className="font-semibold text-primary mb-2">Quantity Reconciliation</h3>
                                        <div className="flex justify-between items-center text-sm">
                                            <span>Expected: <strong className="text-foreground">{formData.expectedQty || '0'}</strong></span>
                                            <span>Difference: <strong className={`${Number(formData.receivedQty) - Number(formData.expectedQty) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {formData.receivedQty ? Number(formData.receivedQty) - Number(formData.expectedQty) : '0'}
                                            </strong>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label>Actual Received Quantity</Label>
                                        <Input
                                            type="number"
                                            placeholder="Enter physical count"
                                            value={formData.receivedQty}
                                            onChange={(e) => handleInputChange("receivedQty", e.target.value)}
                                            className="text-lg py-6"
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStage === 3 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                    <div className="space-y-4 md:col-span-2">
                                        <Label>Product Quality Inspection</Label>
                                        <Select value={formData.qualityStatus || undefined} onValueChange={(v) => handleInputChange("qualityStatus", v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Inspection Result" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pass">Passed - Good Condition</SelectItem>
                                                <SelectItem value="minor_defect">Passed with Minor Defects</SelectItem>
                                                <SelectItem value="quarantine">Quarantine Needed</SelectItem>
                                                <SelectItem value="rejected">Rejected - Return to Supplier</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Image Upload section */}
                                    <div className="space-y-4 md:col-span-2 mt-4">
                                        <Label>Product Image Upload</Label>
                                        <div
                                            className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/20 cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setSelectedFile(e.target.files[0]);
                                                        toast.success(`Selected image: ${e.target.files[0].name}`);
                                                    }
                                                }}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                            {selectedFile ? (
                                                <>
                                                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                                        <CheckCircle2 className="h-8 w-8" />
                                                    </div>
                                                    <p className="font-semibold text-foreground mb-1">{selectedFile.name}</p>
                                                    <p className="text-xs text-muted-foreground mb-4">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                                                        Remove Image
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                    <p className="font-semibold text-foreground mb-1">Click to upload or drag and drop</p>
                                                    <p className="text-xs text-muted-foreground mb-4">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                                        <UploadCloud className="h-4 w-4 mr-2" />
                                                        Select Image
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStage === 4 && (
                                <div className="grid grid-cols-1 gap-6 animate-fade-in">
                                    <div className="space-y-4">
                                        <Label>Allocated Batch Number</Label>
                                        <div className="flex gap-4">
                                            <Input
                                                value={formData.batchNumber}
                                                onChange={(e) => handleInputChange("batchNumber", e.target.value)}
                                                className="font-mono text-lg font-bold"
                                            />
                                            <Button variant="outline" onClick={() => handleInputChange("batchNumber", `BATCH-${Math.floor(100000 + Math.random() * 900000)}`)}>
                                                Generate New
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">This batch number will be used for all internal tracking and export procedures.</p>
                                    </div>

                                    <div className="bg-muted p-4 rounded-lg mt-6 border border-border">
                                        <h4 className="font-bold mb-3 text-sm flex items-center"><Database className="h-4 w-4 mr-2" /> Stock Entry Summary</h4>
                                        <ul className="space-y-2 text-sm">
                                            <li className="flex justify-between"><span className="text-muted-foreground">GRN:</span> <strong>{formData.grn}</strong></li>
                                            <li className="flex justify-between"><span className="text-muted-foreground">Supplier:</span> <strong>{selectedSupplier?.full_name || formData.supplierInfo || 'Not specified'}</strong></li>
                                            <li className="flex justify-between"><span className="text-muted-foreground">Product:</span> <strong>{formData.productName || selectedProduct?.name || 'Not selected'}</strong></li>
                                            <li className="flex justify-between"><span className="text-muted-foreground">Warehouse:</span> <strong>{selectedWarehouse?.name || 'Not selected'}</strong></li>
                                            <li className="flex justify-between"><span className="text-muted-foreground">Quantity:</span> <strong>{formData.receivedQty || '0'} kg</strong></li>
                                            <li className="flex justify-between"><span className="text-muted-foreground">Quality:</span> <strong>{formData.qualityStatus === 'pass' ? 'Passed' : formData.qualityStatus || 'Pending'}</strong></li>
                                            <li className="flex justify-between text-primary mt-2 pt-2 border-t border-border"><span className="font-semibold">Allocated Batch:</span> <strong className="font-mono">{formData.batchNumber}</strong></li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div >

                        <div className="p-4 border-t border-border bg-muted/10 flex justify-between">
                            <Button
                                variant="outline"
                                onClick={prevStage}
                                disabled={currentStage === 0 || isSubmitting}
                            >
                                Previous Step
                            </Button>

                            <Button
                                onClick={nextStage}
                                disabled={isSubmitting || (currentStage === STAGES.length - 1 && (products.length === 0 || warehouses.length === 0))}
                                className={currentStage === STAGES.length - 1 ? "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed" : ""}
                            >
                                {isSubmitting ? (
                                    <>Saving... <Loader2 className="w-4 h-4 ml-2 animate-spin" /></>
                                ) : currentStage === STAGES.length - 1 ? (
                                    <>Confirm Stock Entry <CheckCircle2 className="w-4 h-4 ml-2" /></>
                                ) : (
                                    <>Next Step <ArrowRight className="w-4 h-4 ml-2" /></>
                                )}
                            </Button>
                        </div>
                    </Card >
                </>
            )}

            {activeTab === 'list' && (
                <Card className="bg-card border-border overflow-hidden shadow-lg p-6 animate-fade-in">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />
                        Received Stock List
                    </h2>

                    {savedStocks.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
                            <List className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No stock entries found.</p>
                            <Button variant="outline" className="mt-4" onClick={() => setActiveTab('entry')}>
                                Create First Entry
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b border-border">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Date</th>
                                        <th className="px-6 py-4 font-semibold">GRN</th>
                                        <th className="px-6 py-4 font-semibold">Batch</th>
                                        <th className="px-6 py-4 font-semibold">Supplier</th>
                                        <th className="px-6 py-4 font-semibold">Quantity</th>
                                        <th className="px-6 py-4 font-semibold">Quality</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {savedStocks.map((stock) => (
                                        <tr key={stock.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">{stock.entryDate}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{stock.grn}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-primary font-bold">{stock.batchNumber}</td>
                                            <td className="px-6 py-4">{stock.supplierInfo || '—'}</td>
                                            <td className="px-6 py-4 font-semibold">{stock.receivedQty || '0'} units</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 flex items-center w-max gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${stock.qualityStatus === 'pass' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${stock.qualityStatus === 'pass' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                                    {stock.qualityStatus === 'pass' ? 'Passed' : stock.qualityStatus || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenEdit(stock)}
                                                    className="text-primary hover:bg-primary/10 h-8"
                                                >
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {editingBatch && (
                <Dialog open={!!editingBatch} onOpenChange={(open) => !open && setEditingBatch(null)}>
                    <DialogContent className="max-w-md bg-card border-border text-white">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-primary">Edit Stock Entry</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-sm">
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Batch Number</Label>
                                <Input value={editingBatch.lot_number} readOnly className="bg-muted font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Actual Received Quantity (kg)</Label>
                                <Input
                                    type="number"
                                    value={editReceivedQty}
                                    onChange={(e) => setEditReceivedQty(e.target.value)}
                                    placeholder="Enter physical count"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Quality Status</Label>
                                <Select value={editStatus} onValueChange={setEditStatus}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-white/10 text-white">
                                        <SelectItem value="pass">Passed - Good Condition</SelectItem>
                                        <SelectItem value="rejected">Rejected / Pending QC</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Notes</Label>
                                <Textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Damaged notes, condition, driver info..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setEditingBatch(null)} disabled={isSavingEdit}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
                                {isSavingEdit ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div >
    );
}
