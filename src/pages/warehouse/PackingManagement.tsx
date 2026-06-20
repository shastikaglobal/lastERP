import React, { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import Card from "@/components/Card";
import { Button } from "@/components/ui/button";
import { PackingForm } from "@/components/warehouse/PackingForm";
import { PackingsList } from "@/components/warehouse/PackingsList";
import {
    Package,
    ClipboardList,
    Loader2,
    Plus,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    FileText,
    Printer,
    Weight,
    Layers,
    Tag,
    BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
    createPackingProtocol,
    updatePackingProtocol,
    deletePackingProtocol,
    getPackingProtocols,
    getPackingStats,
    getPackingListPDF,
} from "@/lib/packing-service";
import {
    generatePackingListPDF,
    generatePackingSlipPDF,
    generateCartonLabelsPDF,
} from "@/lib/packing-export";
import { logAudit } from "@/lib/auditLog";

export default function PackingManagement() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingProtocol, setEditingProtocol] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    // Fetch packing protocols
    const { data: packingList = [], isLoading: isLoadingList } = useQuery({
        queryKey: ["packing-protocols", profile?.company_id],
        queryFn: () => getPackingProtocols(profile?.company_id || ""),
        enabled: !!profile?.company_id,
    });

    // Fetch statistics
    const { data: stats = { total: 0, completed: 0, in_progress: 0, pending: 0 } } =
        useQuery({
            queryKey: ["packing-stats", profile?.company_id],
            queryFn: () => getPackingStats(profile?.company_id || ""),
            enabled: !!profile?.company_id,
        });

    const handleCreatePacking = async (data: any) => {
        if (!profile?.company_id) {
            toast.error("Company information not available");
            return;
        }

        setIsSaving(true);
        try {
            let actionType = "create";
            if (editingProtocol) {
                await updatePackingProtocol(editingProtocol.id, data);
                actionType = "update";
            } else {
                await createPackingProtocol(data, profile.company_id, profile.id);
            }

            // Audit log
            await logAudit({
                action: actionType as any,
                resourceType: "packing_protocols",
                resourceName: `${actionType === "update" ? "Updated" : "Created"} packing protocol for receiving ${data.receiving_id}`,
            });

            // Refresh data
            queryClient.invalidateQueries({
                queryKey: ["packing-protocols", profile.company_id],
            });
            queryClient.invalidateQueries({
                queryKey: ["packing-stats", profile.company_id],
            });

            toast.success(`Packing protocol ${editingProtocol ? "updated" : "created"} successfully`);
            setShowForm(false);
            setEditingProtocol(null);
        } catch (error) {
            console.error("Error saving packing protocol:", error);
            toast.error(`Failed to ${editingProtocol ? "update" : "create"} packing protocol`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePacking = async (id: string) => {
        if (!profile?.company_id) return;

        setIsDeletingId(id);
        try {
            await deletePackingProtocol(id);

            // Audit log
            await logAudit({
                action: "delete",
                resourceType: "packing_protocols",
                resourceId: id,
                resourceName: `Deleted packing protocol ${id}`,
            });

            // Refresh data
            queryClient.invalidateQueries({
                queryKey: ["packing-protocols", profile.company_id],
            });
            queryClient.invalidateQueries({
                queryKey: ["packing-stats", profile.company_id],
            });

            toast.success("Packing protocol deleted");
        } catch (error) {
            console.error("Error deleting packing protocol:", error);
            toast.error("Failed to delete packing protocol");
        } finally {
            setIsDeletingId(null);
        }
    };

    const handleExportPDF = async (id: string, type: string) => {
        try {
            const data = await getPackingListPDF(id);

            switch (type) {
                case "list":
                    await generatePackingListPDF(data);
                    toast.success("Packing List exported");
                    break;
                case "slip":
                    await generatePackingSlipPDF(data);
                    toast.success("Packing Slip exported");
                    break;
                case "labels":
                    await generateCartonLabelsPDF(data);
                    toast.success("Carton Labels exported");
                    break;
            }
        } catch (error) {
            console.error("Error exporting PDF:", error);
            toast.error("Failed to export document");
        }
    };

    if (!profile?.company_id) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Packing Management"
                description="Manage export packing operations, generate documents, and track packing status"
                breadcrumbs={[{ label: "Warehouse" }, { label: "Packing Management" }]}
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Packings</p>
                            <p className="text-2xl font-bold mt-1">{stats.total}</p>
                        </div>
                        <Package className="h-8 w-8 text-primary opacity-20" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold mt-1 text-emerald-600">
                                {stats.completed}
                            </p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-20" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                            <p className="text-2xl font-bold mt-1 text-blue-600">
                                {stats.in_progress}
                            </p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-500 opacity-20" />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Pending</p>
                            <p className="text-2xl font-bold mt-1 text-amber-600">
                                {stats.pending}
                            </p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-amber-500 opacity-20" />
                    </div>
                </Card>
            </div>

            {/* Features Grid */}
            <Card className="p-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Available Features
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            icon: FileText,
                            title: "Packing List Generation",
                            description: "Generate detailed export packing lists with item breakdown",
                            color: "text-blue-500",
                        },
                        {
                            icon: Package,
                            title: "Carton/Bag Quantity Entry",
                            description: "Track and manage carton and bag quantities during packing",
                            color: "text-purple-500",
                        },
                        {
                            icon: Weight,
                            title: "Weight Management",
                            description: "Record net and gross weights with automatic packaging weight calculation",
                            color: "text-emerald-500",
                        },
                        {
                            icon: Tag,
                            title: "Barcode & Label Printing",
                            description: "Generate CODE128 barcodes and printable carton labels",
                            color: "text-rose-500",
                        },
                        {
                            icon: Layers,
                            title: "Pallet Management",
                            description: "Configure pallet types and arrangements for shipments",
                            color: "text-cyan-500",
                        },
                        {
                            icon: FileText,
                            title: "Export Marking",
                            description: "Add shipping marks and handling instructions to packages",
                            color: "text-amber-500",
                        },
                    ].map((feature, idx) => (
                        <div
                            key={idx}
                            className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors hover:shadow-md bg-muted/30"
                        >
                            <div className="flex items-start gap-3">
                                <feature.icon
                                    className={`h-5 w-5 ${feature.color} flex-shrink-0`}
                                />
                                <div>
                                    <h3 className="font-bold text-sm">{feature.title}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Form Section */}
            {showForm && (
                <Card className="p-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Create New Packing Protocol
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setShowForm(false);
                                setEditingProtocol(null);
                            }}
                            className="h-8 w-8 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <PackingForm
                        onSubmit={handleCreatePacking}
                        isLoading={isSaving}
                        companyId={profile.company_id}
                        initialData={editingProtocol}
                    />
                </Card>
            )}

            {/* Documents & Printing Section */}
            <Card className="p-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                    <Printer className="h-5 w-5 text-primary" />
                    Generated Documents
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Packing List */}
                    <div className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors hover:shadow-md cursor-pointer bg-muted/30">
                        <div className="flex items-start justify-between mb-3">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    <h3 className="font-bold text-sm">Packing List</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Comprehensive item breakdown with order details
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            Format: PDF | A4 | Professional
                        </p>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-full text-xs"
                            onClick={() =>
                                packingList.length > 0
                                    ? handleExportPDF(packingList[0].id, "list")
                                    : toast.info("No packing records available")
                            }
                        >
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Export
                        </Button>
                    </div>

                    {/* Packing Slip */}
                    <div className="border border-border rounded-lg p-4 hover:border-emerald-500/50 transition-colors hover:shadow-md cursor-pointer bg-muted/30">
                        <div className="flex items-start justify-between mb-3">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-emerald-500" />
                                    <h3 className="font-bold text-sm">Packing Slip</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    For internal dispatch & carrier reference
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            Format: PDF | A4 | Compact
                        </p>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-full text-xs"
                            onClick={() =>
                                packingList.length > 0
                                    ? handleExportPDF(packingList[0].id, "slip")
                                    : toast.info("No packing records available")
                            }
                        >
                            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                            Export
                        </Button>
                    </div>

                    {/* Carton Labels */}
                    <div className="border border-border rounded-lg p-4 hover:border-purple-500/50 transition-colors hover:shadow-md cursor-pointer bg-muted/30">
                        <div className="flex items-start justify-between mb-3">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-5 w-5 text-purple-500" />
                                    <h3 className="font-bold text-sm">Carton Labels</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Shipping marks & handling instructions
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            Format: PDF | 100x150mm | Multi-page
                        </p>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-full text-xs"
                            onClick={() =>
                                packingList.length > 0
                                    ? handleExportPDF(packingList[0].id, "labels")
                                    : toast.info("No packing records available")
                            }
                        >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Print
                        </Button>
                    </div>
                </div>
            </Card>

            {/* List Section */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        Packing Protocols
                    </h2>
                    <Button
                        onClick={() => setShowForm(!showForm)}
                        className="gap-2"
                        disabled={showForm}
                    >
                        <Plus className="h-4 w-4" />
                        New Packing
                    </Button>
                </div>

                <PackingsList
                    data={packingList}
                    isLoading={isLoadingList}
                    isDeletingId={isDeletingId}
                    onEdit={(id) => {
                        const protocol = packingList.find((p: any) => p.id === id);
                        if (protocol) {
                            setEditingProtocol(protocol);
                            setShowForm(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                    onDelete={handleDeletePacking}
                    onExport={(id) => {
                        handleExportPDF(id, "list");
                    }}
                />
            </Card>
        </div>
    );
}
