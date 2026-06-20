import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Edit,
    Trash2,
    Download,
    Loader2,
    Search,
    AlertCircle,
} from "lucide-react";
import { useState } from "react";

interface PackingRecord {
    id: string;
    receiving_id: string;
    carton_count: number;
    net_weight: number;
    gross_weight: number;
    pallet_config: string;
    export_marks: string;
    status: "draft" | "in_progress" | "completed" | "archived";
    created_at: string;
}

interface PackingsListProps {
    data: PackingRecord[];
    isLoading: boolean;
    isDeletingId: string | null;
    onEdit: (id: string) => void;
    onDelete: (id: string) => Promise<void>;
    onExport: (id: string) => void;
}

export function PackingsList({
    data,
    isLoading,
    isDeletingId,
    onEdit,
    onDelete,
    onExport,
}: PackingsListProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const filtered = data.filter((item) => {
        const matchSearch =
            item.receiving_id.toLowerCase().includes(search.toLowerCase()) ||
            item.id.toLowerCase().includes(search.toLowerCase());

        const matchStatus =
            statusFilter === "all" || item.status === statusFilter;

        return matchSearch && matchStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "draft":
                return "bg-slate-100 text-slate-800";
            case "in_progress":
                return "bg-blue-100 text-blue-800";
            case "completed":
                return "bg-emerald-100 text-emerald-800";
            case "archived":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4" style={{ position: 'relative', zIndex: 200000, pointerEvents: 'auto' }}>
            {/* Filters */}
            <div className="flex gap-4 flex-col md:flex-row">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by receiving ID or packing ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-center">
                    <div>
                        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">
                            {data.length === 0
                                ? "No packing protocols created yet"
                                : "No packing protocols match your filters"}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden" style={{ pointerEvents: 'auto' }}>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Status</TableHead>
                                <TableHead>Receiving ID</TableHead>
                                <TableHead className="text-right">Cartons</TableHead>
                                <TableHead className="text-right">Net Weight</TableHead>
                                <TableHead className="text-right">Gross Weight</TableHead>
                                <TableHead>Pallet Config</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <Badge className={getStatusColor(item.status)}>
                                            {item.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {item.receiving_id}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.carton_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(item.net_weight || 0).toFixed(2)} kg
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(item.gross_weight || 0).toFixed(2)} kg
                                    </TableCell>
                                    <TableCell>{item.pallet_config}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end" style={{ pointerEvents: 'auto', zIndex: 200001 }}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onEdit(item.id)}
                                                className="h-8 w-8 p-0"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onExport(item.id)}
                                                className="h-8 w-8 p-0"
                                                title="Export"
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setDeleteId(item.id)}
                                                className="h-8 w-8 p-0 text-destructive"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogTitle>Delete Packing Protocol?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. The packing protocol will be permanently deleted.
                    </AlertDialogDescription>
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (deleteId) {
                                    await onDelete(deleteId);
                                    setDeleteId(null);
                                }
                            }}
                            disabled={isDeletingId === deleteId}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeletingId === deleteId ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
