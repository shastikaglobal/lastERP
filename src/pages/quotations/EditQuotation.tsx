import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Item = { id: string; db_id?: string; product_id: string; product_name: string; hsn_code: string; qty: number; unit: string; price: number };

interface Lead {
  id: string;
  company_name?: string;
  contact_name?: string;
  interested_product?: string;
  email?: string;
  mobile?: string;
  country?: string;
}

interface Product {
  id: string;
  name: string;
  hs_code?: string;
  sku?: string;
  unit?: string;
}

interface MetaData {
  name: string;
}

export default function EditQuotation() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [containerTypesList, setContainerTypesList] = useState<MetaData[]>([]);
  const [packagingTypesList, setPackagingTypesList] = useState<MetaData[]>([]);

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [validUntil, setValidUntil] = useState("");
  const [incoterm, setIncoterm] = useState("CIF");
  const [containerType, setContainerType] = useState("");
  const [packagingType, setPackagingType] = useState("");
  const [packagingCost, setPackagingCost] = useState(0);
  const [shipmentType, setShipmentType] = useState("");
  const [shipmentCost, setShipmentCost] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [countryOfOrigin, setCountryOfOrigin] = useState("India");
  const [portOfLoading, setPortOfLoading] = useState("Nhava Sheva Port, India");
  const [portOfDischarge, setPortOfDischarge] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [deletedItems, setDeletedItems] = useState<string[]>([]);
  const [quoteNumber, setQuoteNumber] = useState("");
  const unitOptions = ["KG", "MT", "G", "LB", "PCS", "BOX", "CTN", "BAG", "L", "ML"];
  const [estimatedShipmentDate, setEstimatedShipmentDate] = useState("");
  const [packingPerBag, setPackingPerBag] = useState("");
  const [bagWeight, setBagWeight] = useState("");

  // New Packaging Type State
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState("");
  const [savingPkg, setSavingPkg] = useState(false);

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case "USD": return "$";
      case "EUR": return "€";
      case "INR": return "₹";
      default: return curr;
    }
  };

  const handleLeadChange = (val: string) => {
    setSelectedLeadId(val);
    const lead = leadsList.find(l => l.id === val);
    if (lead) {
      setCustomerName(lead.company_name || lead.contact_name || "");
      if (lead.mobile) setCustomerPhone(lead.mobile);
      if (lead.country) setCustomerAddress(lead.country);
    }
  };

  useEffect(() => {
    const loadMetadataAndQuotation = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const leadsQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
        let productsQuery = supabase.from('products').select('*');

        if (profile?.company_id) {
          productsQuery = productsQuery.eq('company_id', profile.company_id);
        }

        // Load metadata options
        const [leadsRes, productsRes, containersRes, pkgsRes] = await Promise.all([
          leadsQuery,
          productsQuery,
          supabase.from('container_types').select('name').order('name'),
          supabase.from('packaging_types').select('name').order('name')
        ]);

        if (leadsRes.data) setLeadsList(leadsRes.data);
        if (productsRes.data) {
          const uniqueProducts: any[] = [];
          const seenNames = new Set<string>();
          for (const prod of productsRes.data) {
            const nameKey = (prod.name || '').trim().toLowerCase();
            if (nameKey && !seenNames.has(nameKey)) {
              seenNames.add(nameKey);
              uniqueProducts.push(prod);
            }
          }
          setProductsList(uniqueProducts);
        }
        if (containersRes.data) setContainerTypesList(containersRes.data);
        if (pkgsRes.data) setPackagingTypesList(pkgsRes.data);

        // Load quotation via API
        const { data: { session } } = await supabase.auth.getSession();
        const quoteRes = await fetch(`/api/quotations/${id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!quoteRes.ok) throw new Error("Failed to load quotation");
        const q = await quoteRes.json();
        
        if (q) {
          setQuoteNumber(q.quotation_number);
          setSelectedLeadId(q.lead_id || "");
          setCustomerName(q.customers?.name || "");
          setCustomerAddress(q.customers?.address || "");
          setCustomerPhone(q.customer_phone || q.customers?.phone || "");
          setCurrency(q.currency || "USD");
          setValidUntil(q.valid_until ? q.valid_until.split('T')[0] : "");
          setIncoterm(q.incoterm || "CIF");
          setContainerType(q.container_type || "");
          setPackagingType(q.packaging_type || "");
          setPackagingCost(Number(q.packaging_cost) || 0);
          setShipmentType(q.shipment_type || "");
          setShipmentCost(Number(q.shipping_cost) || 0);
          setCountryOfOrigin(q.country_of_origin || "India");
          setPortOfLoading(q.port_of_loading || "Nhava Sheva Port, India");
          setPortOfDischarge(q.port_of_discharge || "");
          setNetWeight(q.net_weight || "");
          setTaxRate(Number(q.tax_rate) || 0);
          setPaymentTerms(q.payment_terms || "");
          setEstimatedShipmentDate(q.estimated_shipment_date || "");
          setPackingPerBag(q.packing_per_bag || "");
          setBagWeight(q.bag_weight || "");
        }

        // Load items via API
        const itemsRes = await fetch(`/api/quotations/${id}/items`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          const loadedItems = itemsData.map((i: any) => ({
            id: i.id,
            db_id: i.id,
            product_id: i.product_id || "",
            product_name: i.description || "",
            hsn_code: i.hsn_code || "",
            qty: Number(i.quantity) || 1,
            unit: i.unit || "KG",
            price: Number(i.unit_price) || 0
          }));
          setItems(loadedItems.length > 0 ? loadedItems : [{ id: Date.now().toString(), product_id: "", product_name: "", hsn_code: "", qty: 1, unit: "KG", price: 0 }]);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load quotation details");
      } finally {
        setLoading(false);
      }
    };
    loadMetadataAndQuotation();
  }, [profile?.company_id, id]);

  const loadPackagingTypes = async () => {
    const { data } = await supabase.from('packaging_types').select('name').order('name');
    if (data) setPackagingTypesList(data);
  };

  const handleAddPackaging = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName) return toast.error("Packaging type name is required");

    setSavingPkg(true);
    try {
      const { error } = await supabase.from("packaging_types").insert({ name: newPkgName });
      if (error) throw error;
      toast.success("New packaging type added successfully");
      setIsPkgModalOpen(false);
      setNewPkgName("");
      loadPackagingTypes();
    } catch (err: any) {
      toast.error(err.message || "Failed to add packaging type");
    } finally {
      setSavingPkg(false);
    }
  };

  const addItem = () => setItems((s) => [...s, { id: Date.now().toString(), product_id: "", product_name: "", hsn_code: "", qty: 1, unit: "KG", price: 0 }]);
  const removeItem = (id: string) => {
    const itemToRemove = items.find(i => i.id === id);
    if (itemToRemove && itemToRemove.db_id) {
      setDeletedItems(prev => [...prev, itemToRemove.db_id!]);
    }
    setItems((s) => s.filter((i) => i.id !== id));
  };
  const updateItem = (id: string, patch: Partial<Item>) => setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const subtotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0);
  const taxableAmount = subtotal + Number(packagingCost) + Number(shipmentCost);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  const handleSave = async () => {
    if (!customerName || !customerAddress || !customerPhone || items.length === 0 || !items[0].product_name) {
      return toast.error("Please provide a customer name, address, phone number, and at least one product.");
    }

    setSaving(true);
    try {
      // 1. Find or Create Customer
      let customerId = null;
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', profile!.company_id)
        .eq('name', customerName)
        .limit(1);

      if (existingCust && existingCust.length > 0) {
        customerId = existingCust[0].id;
        await supabase
          .from('customers')
          .update({
            address: customerAddress || null,
            phone: customerPhone || null
          })
          .eq('id', customerId);
      } else {
        const { data: custData, error: custErr } = await supabase
          .from('customers')
          .insert({
            company_id: profile!.company_id,
            name: customerName,
            address: customerAddress || null,
            phone: customerPhone || null
          })
          .select('id').single();

        if (!custErr && custData) customerId = custData.id;
      }

      // 2. Update Quotation and Items via API
      const quotationPayload = {
        customer_id: customerId,
        customer_phone: customerPhone || null,
        amount: totalAmount,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        container_type: containerType || null,
        packaging_type: packagingType || null,
        packaging_cost: Number(packagingCost),
        shipment_type: shipmentType || null,
        shipping_cost: Number(shipmentCost),
        country_of_origin: countryOfOrigin || null,
        port_of_loading: portOfLoading || null,
        port_of_discharge: portOfDischarge || null,
        net_weight: netWeight || null,
        estimated_shipment_date: estimatedShipmentDate || null,
        packing_per_bag: packingPerBag || null,
        bag_weight: bagWeight || null,
        quotation_number: quoteNumber,
        currency,
        items_count: items.length,
        valid_until: validUntil || null,
        incoterm: incoterm || "CIF",
        payment_terms: paymentTerms,
        lead_id: selectedLeadId || null
      };

      const itemsToUpdate = items.filter(i => i.db_id).map(i => ({
        id: i.db_id,
        product_id: i.product_id || null,
        quantity: Number(i.qty),
        unit_price: Number(i.price),
        total_price: Number(i.qty) * Number(i.price),
        description: i.product_name,
        hsn_code: i.hsn_code
      }));

      const itemsToInsert = items.filter(i => !i.db_id && i.product_name).map(i => ({
        product_id: i.product_id || null,
        quantity: Number(i.qty),
        unit_price: Number(i.price),
        total_price: Number(i.qty) * Number(i.price),
        description: i.product_name,
        hsn_code: i.hsn_code
      }));

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          quotation: quotationPayload, 
          itemsToUpdate, 
          itemsToInsert,
          itemsToDelete: deletedItems
        })
      });

      if (!res.ok) throw new Error("Failed to update quotation");

      toast.success("Quotation updated successfully!");
      nav("/quotations");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update quotation");
    } finally {
      setSaving(false);
    }
  };

  const getAlphaIndex = (index: number) => String.fromCharCode(65 + index);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit Quotation ${quoteNumber}`}
        breadcrumbs={[{ label: "Quotations", to: "/quotations" }, { label: "Edit" }]}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1.5" />Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Changes
          </Button>
        </>}
      />

      <Dialog open={isPkgModalOpen} onOpenChange={setIsPkgModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Packaging Type</DialogTitle></DialogHeader>
          <form onSubmit={handleAddPackaging} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Packaging Name *</label>
              <Input value={newPkgName} onChange={e => setNewPkgName(e.target.value)} placeholder="e.g., Plastic Bag, Box, etc." required />
            </div>
            <Button type="submit" disabled={savingPkg} className="w-full">
              {savingPkg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Packaging Type
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <Section title="Customer & Terms">
          <FormGrid cols={3}>
            <FormRow label="Select CRM Lead">
              <Select value={selectedLeadId} onValueChange={handleLeadChange}>
                <SelectTrigger><SelectValue placeholder="Link a lead (optional)" /></SelectTrigger>
                <SelectContent>
                  {leadsList.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.company_name || l.contact_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Quotation No.">
              <Input value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="e.g. QT-2026-001" />
            </FormRow>
            <FormRow label="Customer Name *" required>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Company or contact name" />
            </FormRow>
            <FormRow label="Customer Phone *" required>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="e.g. +491729819755" />
            </FormRow>
            <FormRow label="Customer Address *" required>
              <Input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Customer address (used in Bill To)" />
            </FormRow>
            <FormRow label="Currency">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Valid until">
              <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </FormRow>
            <FormRow label="Incoterm">
              <Select value={incoterm} onValueChange={setIncoterm}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOB">FOB</SelectItem>
                  <SelectItem value="CIF">CIF</SelectItem>
                  <SelectItem value="EXW">EXW</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Container Type">
              <Select value={containerType} onValueChange={setContainerType}>
                <SelectTrigger><SelectValue placeholder="Select container type" /></SelectTrigger>
                <SelectContent>
                  {containerTypesList.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Packaging Type">
              <div className="flex gap-2">
                <Select value={packagingType} onValueChange={setPackagingType}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select packaging type" /></SelectTrigger>
                  <SelectContent>
                    {packagingTypesList.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setIsPkgModalOpen(true)} title="Add new packaging type">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormRow>
            <FormRow label="Packaging Cost">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">{getCurrencySymbol(currency)}</span>
                <Input type="number" min="0" className="pl-7" value={packagingCost || ""} onChange={e => setPackagingCost(Number(e.target.value) || 0)} placeholder="0.00" />
              </div>
            </FormRow>
            <FormRow label="Shipment Type">
              <Select value={shipmentType} onValueChange={setShipmentType}>
                <SelectTrigger><SelectValue placeholder="Select shipment type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Air">Air</SelectItem>
                  <SelectItem value="Sea">Sea</SelectItem>
                  <SelectItem value="Road">Road</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Shipment Cost">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">{getCurrencySymbol(currency)}</span>
                <Input type="number" min="0" className="pl-7" value={shipmentCost || ""} onChange={e => setShipmentCost(Number(e.target.value) || 0)} placeholder="0.00" />
              </div>
            </FormRow>
            <FormRow label="Net Weight">
              <Input value={netWeight} onChange={e => setNetWeight(e.target.value)} placeholder="e.g. 15.00 Kg" />
            </FormRow>
            <FormRow label="Country of Origin">
              <Input value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)} placeholder="e.g. India" />
            </FormRow>
            <FormRow label="Port of Loading">
              <Input value={portOfLoading} onChange={e => setPortOfLoading(e.target.value)} placeholder="e.g. Nhava Sheva Port" />
            </FormRow>
            <FormRow label="Port of Discharge">
              <Input value={portOfDischarge} onChange={e => setPortOfDischarge(e.target.value)} placeholder="e.g. Jebel Ali Port" />
            </FormRow>
            <FormRow label="Est. Shipment Date">
              <Input type="date" value={estimatedShipmentDate} onChange={e => setEstimatedShipmentDate(e.target.value)} />
            </FormRow>
            <FormRow label="Packing Per Bag">
              <Input value={packingPerBag} onChange={e => setPackingPerBag(e.target.value)} placeholder="e.g. 25" />
            </FormRow>
            <FormRow label="Bag Weight (Kg)">
              <Input value={bagWeight} onChange={e => setBagWeight(e.target.value)} placeholder="e.g. 13" />
            </FormRow>
            <FormRow label="Tax Rate (%)">
              <Input type="number" min="0" max="100" step="any" value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 0)} placeholder="0.00" />
            </FormRow>
          </FormGrid>
          <div className="mt-4">
            <FormRow label="Terms of Payment">
              <textarea
                className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                placeholder="Enter payment terms..."
              />
            </FormRow>
          </div>
        </Section>

        <Section title="Line Items" actions={<Button variant="outline" size="sm" onClick={addItem} disabled={saving}><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>}>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-2 w-16">#</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Product Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2 w-32">HSN</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2 w-48">Qty / Unit</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2 w-32">Unit Price</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2 w-32">Total</th>
                <th className="px-3 py-2 w-10" />
              </tr></thead>
              <tbody>
                {items.map((i, index) => (
                  <tr key={i.id} className="border-b last:border-0 border-border">
                    <td className="px-5 py-2 font-medium text-muted-foreground">{getAlphaIndex(index)}</td>
                    <td className="px-3 py-2">
                      <Input
                        value={i.product_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          const prod = productsList.find(p => p.name === val);
                          updateItem(i.id, {
                            product_name: val,
                            product_id: prod?.id || "",
                            hsn_code: prod?.hs_code || i.hsn_code,
                            unit: prod?.unit || i.unit
                          });
                        }}
                        placeholder="Type product name..."
                        list={`products-list-${i.id}`}
                      />
                      <datalist id={`products-list-${i.id}`}>
                        {productsList.map(p => <option key={p.id} value={p.name} />)}
                      </datalist>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={i.hsn_code}
                        onChange={(e) => updateItem(i.id, { hsn_code: e.target.value })}
                        placeholder="HSN Code"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={i.qty}
                          onChange={(e) => updateItem(i.id, { qty: Number(e.target.value) || 0 })}
                          className="w-20"
                        />
                        <Select value={i.unit} onValueChange={(val) => updateItem(i.id, { unit: val })}>
                          <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {unitOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-3 py-2"><Input type="number" min="0" value={i.price} onChange={(e) => updateItem(i.id, { price: Number(e.target.value) || 0 })} /></td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{(i.qty * i.price).toLocaleString()}</td>
                    <td className="px-3 py-2"><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeItem(i.id)} disabled={items.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between font-bold text-base">
                <span>Total Amount</span>
                <span className="tabular-nums text-primary">{getCurrencySymbol(currency)} {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
