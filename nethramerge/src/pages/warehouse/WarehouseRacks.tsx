import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "lucide-react";

export default function WarehouseRacks() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Racks & Bins</h1>
        <p className="text-muted-foreground mt-2">Manage warehouse racks and bin storage locations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="h-5 w-5" />
            Racks & Bins Management
          </CardTitle>
          <CardDescription>View and manage storage racks and bin locations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
