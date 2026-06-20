import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Supplier = {
  id: string;
  name: string;
  contact_name: string;
  country: string;
  product_categories: string[];
  rating: number;
  status: string;
};

export default function SuppliersList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [categories, setCategories] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/farmers`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      const data = await res.json();

      const mapped = (data || []).map((f: any) => ({
        ...f,
        name: f.full_name,
        contact_name: "-", // Farmers don't have a separate contact_name
        rating: 4,
        status: f.is_active ? 'active' : 'inactive',
        product_categories: f.primary_crops || []
      }));
      setSuppliers(mapped as any[]);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error("Supplier name is required");
    if (!profile?.company_id) return toast.error("Authentication error. Please refresh.");

    setSubmitting(true);
    try {
      const prodCategories = categories.split(",").map(c => c.trim()).filter(Boolean);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/farmers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          company_id: profile.company_id,
          full_name: name,
          email,
          phone,
          country,
          district: city, // Map city to district
          primary_crops: prodCategories,
          is_active: true
        })
      });

      if (!res.ok) throw new Error("Failed to add supplier");

      toast.success("Supplier added successfully");
      setIsDialogOpen(false);
      setName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setCountry("");
      setCity("");
      setCategories("");
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.message || "Failed to add supplier");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to delete supplier");
      toast.success("Supplier hidden from the app");
      setSuppliers(suppliers.filter(s => s.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete supplier");
    }
  };

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star key={i} className={`h-4 w-4 inline ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Supplier</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSupplier} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Products (comma separated)</Label>
                <Textarea
                  value={categories}
                  onChange={(e) => setCategories(e.target.value)}
                  placeholder="Rice, Wheat, Spices..."
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Supplier
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No suppliers found.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((sup) => (
                <TableRow
                  key={sup.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/procurement/suppliers/${sup.id}`)}
                >
                  <TableCell className="font-medium">{sup.name}</TableCell>
                  <TableCell>{sup.contact_name || "-"}</TableCell>
                  <TableCell>{sup.country || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sup.product_categories?.slice(0, 3).map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                      {(sup.product_categories?.length || 0) > 3 && (
                        <Badge variant="outline" className="text-xs">+{sup.product_categories.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex">{renderStars(Number(sup.rating) || 0)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={sup.status === "active" ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"}>
                      {sup.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this supplier?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will hide the supplier from the app, but keep it in the database.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              // Ensure no bubbling just in case
                              e.stopPropagation();
                              handleDelete(sup.id);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}