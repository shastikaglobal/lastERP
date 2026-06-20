import { toast } from "sonner";
import { useAuth } from "./useAuth";
import { softDeleteRecord, restoreRecord as restoreRecordBase } from "@/lib/softDelete";

export function useSoftDelete() {
    const { user } = useAuth();

    const softDelete = async (tableName: string, id: string, label: string = "Record") => {
        if (!user) {
            toast.error("You must be logged in to delete records");
            return false;
        }

        try {
            await softDeleteRecord(tableName, id, {
                deletedBy: user.id,
                resourceType: tableName,
                resourceName: label,
            });

            toast.success(`${label} removed (soft-deleted)`);
            return true;
        } catch (error: any) {
            console.error(`Error deleting from ${tableName}:`, error);
            toast.error(error.message || `Failed to delete ${label}`);
            return false;
        }
    };

    const restoreRecord = async (tableName: string, id: string, label: string = "Record") => {
        if (!user) {
            toast.error("You must be logged in to restore records");
            return false;
        }

        try {
            await restoreRecordBase(tableName, id, {
                resourceType: tableName,
                resourceName: label,
            });

            toast.success(`${label} restored successfully`);
            return true;
        } catch (error: any) {
            console.error(`Error restoring ${tableName}:`, error);
            toast.error(error.message || `Failed to restore ${label}`);
            return false;
        }
    };

    return { softDelete, restoreRecord };
}
