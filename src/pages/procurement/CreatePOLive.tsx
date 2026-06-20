import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus, Trash2, Save, Send, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import cc from "currency-codes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const getCurrencySymbol = (code: string) => {
  try {
    return (0).toLocaleString('en-US', { style: 'currency', currency: code }).replace(/[\d.,\s]/g, '').trim()
  } catch(e) {
    return code
  }
};

type POItem = {
  id: string;
  product: string;
  productName?: string;
  quantity: number;
  unit: string;
  unit_price: number;
};

function ProductCombobox({ products, value, onChange }: { products: { id: string, name: string }[], value: string, onChange: (val: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = products.find(p => p.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex w-full items-center justify-between border-none bg-transparent hover:bg-white/5 h-8 focus:ring-1 focus:ring-primary/50 transition-colors px-3 text-left">
          {selected ? selected.name : <span className="text-muted-foreground">Select product...</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-card border-white/10" align="start">
        <Command>
          <CommandInput placeholder="Search product..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => {
                    onChange(p.id, p.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.id ? "opacity-100" : "opacity-0")} />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CurrencyCombobox({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const codes = cc.codes();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          {value ? `${value} (${getCurrencySymbol(value)})` : "Select currency"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-card border-white/10" align="start">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {codes.map((code) => (
                <CommandItem
                  key={code}
                  value={code}
                  onSelect={() => {
                    onChange(code);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === code ? "opacity-100" : "opacity-0")} />
                  {code} ({getCurrencySymbol(code)})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CreatePOLive() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [suppliers, setSuppliers] = useState<{ id: string, name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string, name: string, unit: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [supplierId, setSupplierId] = useState("");
  const [supplierInput, setSupplierInput] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [items, setItems] = useState<POItem[]>([
    { id: "1", product: "", productName: "", quantity: 1, unit: "kg", unit_price: 0 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { 'Authorization': `Bearer ${session?.access_token}` };

        const [supRes, prodRes] = await Promise.all([
          fetch(`/api/farmers`, { headers }),
          fetch(`/api/products`, { headers })
        ]);

        if (!supRes.ok) throw new Error("Failed to fetch suppliers");
        if (!prodRes.ok) throw new Error("Failed to fetch products");

        const supData = await supRes.json();
        const prodData = await prodRes.json();

        setSuppliers((supData || []).map((f: any) => ({ id: f.id, name: f.full_name })));
        
        // Filter to unique product names (case-insensitive and trimmed)
        const uniqueProducts: any[] = [];
        const seenNames = new Set<string>();
        for (const p of (prodData || [])) {
          const nameKey = (p.name || '').trim().toLowerCase();
          if (nameKey && !seenNames.has(nameKey)) {
            seenNames.add(nameKey);
            uniqueProducts.push({ id: p.id, name: p.name, unit: p.unit });
          }
        }
        setProducts(uniqueProducts);
      } catch (err: any) {
        toast.error("Failed to load catalog data");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), product: "", productName: "", quantity: 1, unit: "kg", unit_price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof POItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // If product changes, try to auto-fill the unit
        if (field === 'product') {
          const prod = products.find(p => p.id === value);
          if (prod) updated.unit = prod.unit;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!user?.id || !profile?.company_id) {
      return toast.error("Authentication error. Please refresh and try again.");
    }
    const finalSupplierName = supplierInput.trim();
    if (!finalSupplierName) return toast.error("Please provide a supplier");
    if (items.some(i => !i.product && !i.productName)) return toast.error("Select or enter a product for all items");

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Resolve or create Farmer/Supplier on the fly
      let resolvedSupplierId = supplierId;
      if (!resolvedSupplierId && finalSupplierName) {
        const existingSupplier = suppliers.find(s => s.name.trim().toLowerCase() === finalSupplierName.toLowerCase());
        if (existingSupplier) {
          resolvedSupplierId = existingSupplier.id;
        } else {
          const createRes = await fetch('/api/farmers', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              company_id: profile.company_id,
              full_name: finalSupplierName,
              is_active: true
            })
          });
          if (!createRes.ok) {
            throw new Error(`Failed to auto-create supplier "${finalSupplierName}"`);
          }
          const newFarmer = await createRes.json();
          resolvedSupplierId = newFarmer.id;
          toast.info(`Auto-created supplier "${finalSupplierName}" in directory.`);
        }
      }

      // 2. Resolve or create Products for each line item on the fly
      const resolvedItems = [];
      for (const item of items) {
        let resolvedProductId = item.product;
        const finalProdName = (item.productName || '').trim();

        if (!resolvedProductId && finalProdName) {
          const existingProduct = products.find(p => p.name.trim().toLowerCase() === finalProdName.toLowerCase());
          if (existingProduct) {
            resolvedProductId = existingProduct.id;
          } else {
            const createRes = await fetch('/api/products', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: finalProdName,
                unit: item.unit || 'kg',
                is_active: true,
                company_id: profile.company_id
              })
            });
            if (!createRes.ok) {
              throw new Error(`Failed to auto-create product "${finalProdName}"`);
            }
            const newProduct = await createRes.json();
            resolvedProductId = newProduct.id;
            toast.info(`Auto-created product "${finalProdName}" in catalog.`);
          }
        }
        resolvedItems.push({
          product_id: resolvedProductId,
          quantity: item.quantity,
          unit_price: item.unit_price
        });
      }

      // Step 3: Generate a professional PO number instantly
      const timestamp = new Date().getTime().toString().slice(-4);
      const year = new Date().getFullYear();
      const generatedPoNumber = `PO-${year}-${timestamp}`;

      // Step 4: Create the PO header and items via POST
      const res = await fetch('/api/purchase_orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          po_number: generatedPoNumber,
          company_id: profile.company_id,
          farmer_id: resolvedSupplierId,
          status: status === 'draft' ? 'draft' : 'approved',
          expected_delivery: expectedDate || null,
          total: totalAmount,
          subtotal: totalAmount,
          currency,
          notes,
          created_by: user.id,
          order_date: new Date().toISOString().split('T')[0],
          items: resolvedItems
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create purchase order");
      }

      const po = await res.json();
      toast.success(`Purchase order ${po.po_number} ${status === 'draft' ? 'saved' : 'issued'} successfully`);
      navigate("/procurement/orders");
    } catch (err: any) {
      toast.error(err.message || "Failed to create purchase order");
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/procurement/orders")} className="rounded-full hover:bg-white/5 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Create Purchase Order</h1>
            <p className="text-sm text-muted-foreground mt-1">Draft a new professional order to your supplier</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 erp-card overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full" />
                Order Items
              </CardTitle>
              <div className="text-xs text-muted-foreground font-mono bg-white/5 px-2 py-1 rounded">
                ITEMS: {items.length}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="py-4 pl-6 text-xs uppercase tracking-wider font-bold">Product</TableHead>
                    <TableHead className="py-4 w-28 text-xs uppercase tracking-wider font-bold">Qty</TableHead>
                    <TableHead className="py-4 w-32 text-xs uppercase tracking-wider font-bold">Unit</TableHead>
                    <TableHead className="py-4 w-36 text-xs uppercase tracking-wider font-bold">Price</TableHead>
                    <TableHead className="py-4 text-right w-36 text-xs uppercase tracking-wider font-bold">Total</TableHead>
                    <TableHead className="py-4 w-12 pr-6"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id} className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <TableCell className="pl-6 py-4">
                        <ProductCombobox
                          products={products}
                          value={item.product || ""}
                          onChange={(val, name) => {
                            const prod = products.find(p => p.id === val);
                            if (prod) {
                              updateItem(item.id, "product", prod.id);
                              updateItem(item.id, "productName", prod.name);
                              updateItem(item.id, "unit", prod.unit || "kg");
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <Input
                          type="number" min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="border-none bg-transparent focus-visible:ring-1 focus-visible:ring-primary/50 h-8 px-2"
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <Select value={item.unit} onValueChange={(val) => updateItem(item.id, "unit", val)}>
                          <SelectTrigger className="border-none bg-transparent hover:bg-white/5 h-8 focus:ring-1 focus:ring-primary/50 transition-colors">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-white/10">
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="ton">ton</SelectItem>
                            <SelectItem value="piece">piece</SelectItem>
                            <SelectItem value="box">box</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs pl-2">
                            {getCurrencySymbol(currency)}
                          </span>
                          <Input
                            type="number" min="0" step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, "unit_price", Number(e.target.value))}
                            className="border-none bg-transparent focus-visible:ring-1 focus-visible:ring-primary/50 h-8 pl-6 pr-2 text-right font-mono"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4 font-mono font-medium text-white pr-4">
                        {(item.quantity * item.unit_price).toLocaleString()}
                      </TableCell>
                      <TableCell className="pr-6 py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 bg-white/[0.02] border-t border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={addItem}
                className="w-full h-12 border-2 border-dashed border-white/5 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all gap-2"
              >
                <Plus className="h-4 w-4" /> Add Item Line
              </Button>
            </div>
          </CardContent>
          <CardFooter className="justify-end p-8 bg-black/20 backdrop-blur-sm border-t border-white/5">
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Order Total</span>
              <div className="text-3xl font-bold text-gradient-gold font-mono">
                {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card className="erp-card h-fit">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Supplier *</Label>
                <Input
                  value={supplierInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupplierInput(val);
                    const found = suppliers.find(s => s.name.trim().toLowerCase() === val.trim().toLowerCase());
                    if (found) {
                      setSupplierId(found.id);
                    } else {
                      setSupplierId("");
                    }
                  }}
                  placeholder="Type or select Supplier..."
                  list="suppliers-datalist"
                  className="bg-white/5 border-white/10 hover:border-primary/50 transition-colors"
                />
                <datalist id="suppliers-datalist">
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Currency</Label>
                  <CurrencyCombobox value={currency} onChange={setCurrency} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Expected Delivery</Label>
                  <Input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Notes / Instructions</Label>
                <Textarea
                  placeholder="Enter any special instructions or terms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-28 bg-white/5 border-white/10 focus:border-primary/50 transition-colors resize-none"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 p-6 pt-0">
              <Button
                className="w-full btn-gold h-12 text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => handleSave('sent')}
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                Issue Purchase Order
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 border-white/10 hover:bg-white/5 hover:text-white transition-all"
                onClick={() => handleSave('draft')}
                disabled={saving}
              >
                <Save className="mr-2 h-5 w-5" /> Save as Draft
              </Button>
            </CardFooter>
          </Card>

          {/* Quick Stats or Info Panel */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-xs text-muted-foreground leading-relaxed">
            <p><strong>Note:</strong> Issuing this purchase order will notify the supplier and create a pending record in your procurement ledger.</p>
          </div>
        </div>
      </div>
    </div>

  );
}