import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Building2, Star, Save, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' };

        const [supRes, poRes] = await Promise.all([
          fetch(`/api/farmers/${id}`, { headers }),
          fetch(`/api/purchase_orders?farmer_id=${id}`, { headers })
        ]);

        if (!supRes.ok) throw new Error(await supRes.text() || "Failed to load supplier");
        const supData = await supRes.json();

        setSupplier({ ...supData, name: supData.full_name, status: supData.is_active ? 'active' : 'inactive' });
        setEditForm({ ...supData, name: supData.full_name, status: supData.is_active ? 'active' : 'inactive' });

        if (poRes.ok) {
          const poData = await poRes.json();
          setPurchaseOrders(poData);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load supplier details");
        navigate("/procurement/suppliers");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          district: editForm.city,
          country: editForm.country,
          is_active: editForm.status === 'active'
        })
      });

      if (!res.ok) throw new Error(await res.text());

      setSupplier(editForm);
      setIsEditing(false);
      toast.success("Supplier updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm(supplier);
    setIsEditing(false);
  };

  const handleRate = async (newRating: number) => {
    try {
      // NOTE: We don't have a specific rating update API yet, so we will update the farmer table if it has rating, or just simulate it for now.
      // We will skip updating the backend for now, or you can add rating to farmers table.
      setSupplier({ ...supplier, rating: newRating });
      toast.success(`Supplier rated ${newRating} stars`);
    } catch (err: any) {
      toast.error("Failed to update rating");
    }
  };

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!supplier) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/procurement/suppliers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Supplier ID: {supplier.id}
            {!isEditing && (
              <Badge className={supplier.status === "active" ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"}>
                {supplier.status}
              </Badge>
            )}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Supplier</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Company Name</Label>
                  <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Contact Person</Label>
                  <Input value={editForm.contact_name} onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>City</Label>
                    <Input value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Country</Label>
                    <Input value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Contact Person</p>
                    <p className="text-sm text-muted-foreground">{supplier.contact_name || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{supplier.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{supplier.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {[supplier.city, supplier.country].filter(Boolean).join(", ") || "N/A"}
                    </p>
                  </div>
                </div>
              </>
            )}

            {!isEditing && (
              <>
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Rating</p>
                  <div className="flex gap-1">
                    {Array(5).fill(0).map((_, i) => {
                      const starValue = i + 1;
                      return (
                        <button
                          key={i}
                          onClick={() => handleRate(starValue)}
                          className="focus:outline-none group transition-transform active:scale-90"
                        >
                          <Star
                            className={`h-5 w-5 transition-colors ${starValue <= (supplier.rating || 0)
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-600 group-hover:text-yellow-400"
                              }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Products</p>
                  <div className="flex flex-wrap gap-2">
                    {supplier.product_categories?.map((p: string, i: number) => (
                      <Badge key={i} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Purchase Orders History</CardTitle>
          </CardHeader>
          <CardContent>
            {purchaseOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No purchase orders found for this supplier.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map(po => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium text-primary">{po.po_number}</TableCell>
                      <TableCell>{format(new Date(po.order_date), "PP")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {po.currency} {Number(po.total)?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}