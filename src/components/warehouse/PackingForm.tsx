import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Card from "@/components/Card";
import { AlertCircle, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { getUnpackedReceivings, validatePackingData } from "@/lib/packing-service";
import { toast } from "sonner";

interface PackingFormProps {
    onSubmit: (data: any) => Promise<void>;
    isLoading?: boolean;
    companyId: string;
    initialData?: any;
}

export function PackingForm({
    onSubmit,
    isLoading = false,
    companyId,
    initialData,
}: PackingFormProps) {
    const [manualMode, setManualMode] = useState(!!initialData);
    const [formData, setFormData] = useState(initialData || {
        receiving_id: "",
        product_name: "",
        carton_count: 1,
        net_weight: 0,
        gross_weight: 0,
        pallet_config: "EUR",
        export_marks: "",
        status: "draft",
    });
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setManualMode(true); // Open in manual mode for edits so ID shows explicitly
        }
    }, [initialData]);

    // Fetch unpacked receivings
    const { data: receivings = [], isLoading: isLoadingReceivings } = useQuery({
        queryKey: ["unpacked_receivings", companyId],
        enabled: !!companyId,
        queryFn: () => getUnpackedReceivings(companyId),
    });

    const { data: products = [], isLoading: isLoadingProducts } = useQuery({
        queryKey: ["products-list", companyId],
        enabled: !!companyId,
        queryFn: async () => {
             let query = supabase.from('products' as any).select('*').eq('is_active', true).order('name');
             if (companyId) {
                 query = query.or(`company_id.eq.${companyId},company_id.is.null`);
             }
             const { data, error } = await query;
             if (error) throw error;
             return data || [];
        }
    });

    const handleInputChange = (field: string, value: any) => {
        const newFormData = { ...formData, [field]: value };
        
        // Auto-fill product details when receiving is selected
        if (field === "receiving_id" && !manualMode) {
            const selectedRec = receivings.find(r => r.id === value);
            if (selectedRec && selectedRec.product_name) {
                newFormData.product_name = selectedRec.product_name;
            }
        }
        
        setFormData(newFormData);
        setErrors([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const validationErrors = validatePackingData(formData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix the errors");
            return;
        }

        try {
            await onSubmit(formData);
            if (!initialData) {
                setFormData({
                    receiving_id: "",
                    carton_count: 1,
                    net_weight: 0,
                    gross_weight: 0,
                    pallet_config: "EUR",
                    export_marks: "",
                    status: "draft",
                });
                setManualMode(false);
            }
        } catch (error) {
            console.error("Error submitting packing form:", error);
            toast.error("Failed to create packing protocol");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                    <h3 className="font-semibold text-sm">Entry Mode</h3>
                    <p className="text-xs text-muted-foreground">
                        {manualMode
                            ? "Manually enter receiving details"
                            : "Select from existing receivings"}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setManualMode(!manualMode)}
                    className="gap-2"
                >
                    {manualMode ? (
                        <ToggleRight className="h-5 w-5" />
                    ) : (
                        <ToggleLeft className="h-5 w-5" />
                    )}
                </Button>
            </div>

            {/* Error Display */}
            {errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    {errors.map((error, idx) => (
                        <div key={idx} className="flex gap-2 text-sm text-red-800">
                            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Receiving Selection / Manual Entry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!manualMode ? (
                    // Select Mode
                    <>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-2 block">
                                Select Receiving <span className="text-red-500">*</span>
                            </label>
                            <Select
                                value={formData.receiving_id}
                                onValueChange={(value) =>
                                    handleInputChange("receiving_id", value)
                                }
                            >
                                <SelectTrigger disabled={isLoadingReceivings}>
                                    <SelectValue placeholder="Choose a receiving..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {receivings.map((rec) => (
                                        <SelectItem key={rec.id} value={rec.id}>
                                            {rec.receiving_number} - {rec.product_name} - {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                ) : (
                    // Manual Mode
                    <>
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                Receiving Number <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g., REC-2024-001"
                                value={formData.receiving_id}
                                onChange={(e) =>
                                    handleInputChange("receiving_id", e.target.value)
                                }
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <Select
                                value={formData.product_name}
                                onValueChange={(value) => handleInputChange("product_name", value)}
                            >
                                <SelectTrigger disabled={isLoadingProducts}>
                                    <SelectValue placeholder="Select Product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground">No products available</div>
                                    ) : (
                                        products.map((p: any) => (
                                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}
            </div>

            {/* Carton Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Carton/Bag Quantity <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="number"
                        min="1"
                        value={formData.carton_count}
                        onChange={(e) =>
                            handleInputChange("carton_count", parseInt(e.target.value) || 0)
                        }
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Pallet Configuration
                    </label>
                    <Select
                        value={formData.pallet_config}
                        onValueChange={(value) =>
                            handleInputChange("pallet_config", value)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EUR">EUR (1200x800mm)</SelectItem>
                            <SelectItem value="ISO">ISO (1200x1000mm)</SelectItem>
                            <SelectItem value="HALF_EUR">Half EUR (600x800mm)</SelectItem>
                            <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Weight Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Net Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.net_weight}
                        onChange={(e) =>
                            handleInputChange("net_weight", parseFloat(e.target.value) || 0)
                        }
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">
                        Gross Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.gross_weight}
                        onChange={(e) =>
                            handleInputChange("gross_weight", parseFloat(e.target.value) || 0)
                        }
                    />
                </div>
            </div>

            {/* Weight Summary */}
            {formData.net_weight > 0 && formData.gross_weight > 0 && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Net Weight</p>
                            <p className="font-bold text-base">
                                {formData.net_weight.toFixed(2)} kg
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Packaging Weight</p>
                            <p className="font-bold text-base text-emerald-600">
                                {(formData.gross_weight - formData.net_weight).toFixed(2)} kg
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Gross Weight</p>
                            <p className="font-bold text-base">
                                {formData.gross_weight.toFixed(2)} kg
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Export Marking */}
            <div>
                <label className="text-sm font-medium mb-2 block">
                    Export Marks & Handling
                </label>
                <Textarea
                    placeholder="Enter shipping marks, handling instructions, warnings, etc."
                    value={formData.export_marks}
                    onChange={(e) =>
                        handleInputChange("export_marks", e.target.value)
                    }
                    className="min-h-24"
                />
            </div>

            {/* Status */}
            <div>
                <label className="text-sm font-medium mb-2 block">
                    Status
                </label>
                <Select
                    value={formData.status}
                    onValueChange={(value) =>
                        handleInputChange("status", value)
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isLoadingReceivings}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                    </>
                ) : initialData ? (
                    "Update Packing Protocol"
                ) : (
                    "Create Packing Protocol"
                )}
            </Button>
        </form>
    );
}
