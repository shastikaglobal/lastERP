import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [productsList, setProductsList] = useState<{id: string, name: string, unit?: string}[]>([]);
  const [leadsList, setLeadsList] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.company_id) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const [leadsRes, productsRes] = await Promise.all([
          fetch('/api/leads', { headers }).catch(err => {
            console.warn("Leads fetch failed:", err);
            return { ok: false, status: 500, text: () => Promise.resolve(err.message) } as Response;
          }),
          fetch('/api/products', { headers }).catch(err => {
            console.warn("Products fetch failed:", err);
            return { ok: false, status: 500, text: () => Promise.resolve(err.message) } as Response;
          })
        ]);

        let leadsData = [];
        if (leadsRes.ok) {
          leadsData = await leadsRes.json();
        } else {
          console.warn("Failed to load leads from sync API, trying Supabase fallback...");
          const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) {
            console.error("Supabase leads fallback error:", error);
          } else {
            leadsData = data || [];
          }
        }
        const activeLeads = leadsData.filter((l: any) => l.is_deleted !== true);
        setLeadsList(activeLeads);

        let productsData = [];
        if (productsRes.ok) {
          productsData = await productsRes.json();
        } else {
          console.warn("Failed to load products from sync API, trying Supabase fallback...");
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('company_id', profile.company_id);
          if (error) {
            console.error("Supabase products fallback error:", error);
          } else {
            productsData = data || [];
          }
        }
        const activeProducts = productsData.filter((p: any) => p.is_deleted !== true && p.company_id === profile.company_id);
        
        // Filter to only unique product names (case-insensitive and trimmed)
        const uniqueProducts: any[] = [];
        const seenNames = new Set<string>();
        for (const prod of activeProducts) {
          const nameKey = (prod.name || '').trim().toLowerCase();
          if (nameKey && !seenNames.has(nameKey)) {
            seenNames.add(nameKey);
            uniqueProducts.push(prod);
          }
        }
        setProductsList(uniqueProducts);
      } catch (err: any) {
        console.error("Error loading order form data:", err);
        toast.error("Failed to load form data: " + (err.message || err));
      }
    };
    loadData();
  }, [profile?.company_id]);

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCountry, setCustomerCountry] = useState("");
  const [product, setProduct] = useState("");
  
  // Update fields when a lead is selected
  useEffect(() => {
    if (!selectedLeadId) return;
    const lead = leadsList.find(l => l.id === selectedLeadId);
    if (lead) {
      setCustomerName(lead.company_name || "");
      setCustomerPhone(lead.mobile || "");
      setCustomerEmail(lead.email || "");
      setCustomerCountry(lead.country || "");
    }
  }, [selectedLeadId, leadsList]);

  const [quantity, setQuantity] = useState<number | "">("");
  const [unit, setUnit] = useState("");
  
  // Update unit when product is selected
  useEffect(() => {
    if (!product) return;
    const p = productsList.find(item => item.name === product);
    if (p?.unit) setUnit(p.unit);
  }, [product, productsList]);
  
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const currencies = [
    { code: "AED", name: "UAE Dirham" },
    { code: "AFN", name: "Afghan Afghani" },
    { code: "ALL", name: "Albanian Lek" },
    { code: "AMD", name: "Armenian Dram" },
    { code: "ANG", name: "Netherlands Antillean Guilder" },
    { code: "AOA", name: "Angolan Kwanza" },
    { code: "ARS", name: "Argentine Peso" },
    { code: "AUD", name: "Australian Dollar" },
    { code: "AWG", name: "Aruban Florin" },
    { code: "AZN", name: "Azerbaijani Manat" },
    { code: "BAM", name: "Bosnia-Herzegovina Convertible Mark" },
    { code: "BBD", name: "Barbadian Dollar" },
    { code: "BDT", name: "Bangladeshi Taka" },
    { code: "BGN", name: "Bulgarian Lev" },
    { code: "BHD", name: "Bahraini Dinar" },
    { code: "BIF", name: "Burundian Franc" },
    { code: "BMD", name: "Bermudan Dollar" },
    { code: "BND", name: "Brunei Dollar" },
    { code: "BOB", name: "Bolivian Boliviano" },
    { code: "BRL", name: "Brazilian Real" },
    { code: "BSD", name: "Bahamian Dollar" },
    { code: "BTN", name: "Bhutanese Ngultrum" },
    { code: "BWP", name: "Botswanan Pula" },
    { code: "BYN", name: "Belarusian Ruble" },
    { code: "BZD", name: "Belize Dollar" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "CDF", name: "Congolese Franc" },
    { code: "CHF", name: "Swiss Franc" },
    { code: "CLP", name: "Chilean Peso" },
    { code: "CNY", name: "Chinese Yuan" },
    { code: "COP", name: "Colombian Peso" },
    { code: "CRC", name: "Costa Rican Colon" },
    { code: "CUP", name: "Cuban Peso" },
    { code: "CVE", name: "Cape Verdean Escudo" },
    { code: "CZK", name: "Czech Koruna" },
    { code: "DJF", name: "Djiboutian Franc" },
    { code: "DKK", name: "Danish Krone" },
    { code: "DOP", name: "Dominican Peso" },
    { code: "DZD", name: "Algerian Dinar" },
    { code: "EGP", name: "Egyptian Pound" },
    { code: "ERN", name: "Eritrean Nakfa" },
    { code: "ETB", name: "Ethiopian Birr" },
    { code: "EUR", name: "Euro" },
    { code: "FJD", name: "Fijian Dollar" },
    { code: "GBP", name: "British Pound" },
    { code: "GEL", name: "Georgian Lari" },
    { code: "GHS", name: "Ghanaian Cedi" },
    { code: "GMD", name: "Gambian Dalasi" },
    { code: "GNF", name: "Guinean Franc" },
    { code: "GTQ", name: "Guatemalan Quetzal" },
    { code: "GYD", name: "Guyanaese Dollar" },
    { code: "HKD", name: "Hong Kong Dollar" },
    { code: "HNL", name: "Honduran Lempira" },
    { code: "HRK", name: "Croatian Kuna" },
    { code: "HTG", name: "Haitian Gourde" },
    { code: "HUF", name: "Hungarian Forint" },
    { code: "IDR", name: "Indonesian Rupiah" },
    { code: "ILS", name: "Israeli Shekel" },
    { code: "INR", name: "Indian Rupee" },
    { code: "IQD", name: "Iraqi Dinar" },
    { code: "IRR", name: "Iranian Rial" },
    { code: "ISK", name: "Icelandic Krona" },
    { code: "JMD", name: "Jamaican Dollar" },
    { code: "JOD", name: "Jordanian Dinar" },
    { code: "JPY", name: "Japanese Yen" },
    { code: "KES", name: "Kenyan Shilling" },
    { code: "KGS", name: "Kyrgystani Som" },
    { code: "KHR", name: "Cambodian Riel" },
    { code: "KMF", name: "Comorian Franc" },
    { code: "KPW", name: "North Korean Won" },
    { code: "KRW", name: "South Korean Won" },
    { code: "KWD", name: "Kuwaiti Dinar" },
    { code: "KYD", name: "Cayman Islands Dollar" },
    { code: "KZT", name: "Kazakhstani Tenge" },
    { code: "LAK", name: "Laotian Kip" },
    { code: "LBP", name: "Lebanese Pound" },
    { code: "LKR", name: "Sri Lankan Rupee" },
    { code: "LRD", name: "Liberian Dollar" },
    { code: "LSL", name: "Lesotho Loti" },
    { code: "LYD", name: "Libyan Dinar" },
    { code: "MAD", name: "Moroccan Dirham" },
    { code: "MDL", name: "Moldovan Leu" },
    { code: "MGA", name: "Malagasy Ariary" },
    { code: "MKD", name: "Macedonian Denar" },
    { code: "MMK", name: "Myanmar Kyat" },
    { code: "MNT", name: "Mongolian Tugrik" },
    { code: "MOP", name: "Macanese Pataca" },
    { code: "MRU", name: "Mauritanian Ouguiya" },
    { code: "MUR", name: "Mauritian Rupee" },
    { code: "MVR", name: "Maldivian Rufiyaa" },
    { code: "MWK", name: "Malawian Kwacha" },
    { code: "MXN", name: "Mexican Peso" },
    { code: "MYR", name: "Malaysian Ringgit" },
    { code: "MZN", name: "Mozambican Metical" },
    { code: "NAD", name: "Namibian Dollar" },
    { code: "NGN", name: "Nigerian Naira" },
    { code: "NIO", name: "Nicaraguan Cordoba" },
    { code: "NOK", name: "Norwegian Krone" },
    { code: "NPR", name: "Nepalese Rupee" },
    { code: "NZD", name: "New Zealand Dollar" },
    { code: "OMR", name: "Omani Rial" },
    { code: "PAB", name: "Panamanian Balboa" },
    { code: "PEN", name: "Peruvian Sol" },
    { code: "PGK", name: "Papua New Guinean Kina" },
    { code: "PHP", name: "Philippine Peso" },
    { code: "PKR", name: "Pakistani Rupee" },
    { code: "PLN", name: "Polish Zloty" },
    { code: "PYG", name: "Paraguayan Guarani" },
    { code: "QAR", name: "Qatari Riyal" },
    { code: "RON", name: "Romanian Leu" },
    { code: "RSD", name: "Serbian Dinar" },
    { code: "RUB", name: "Russian Ruble" },
    { code: "RWF", name: "Rwandan Franc" },
    { code: "SAR", name: "Saudi Riyal" },
    { code: "SBD", name: "Solomon Islands Dollar" },
    { code: "SCR", name: "Seychellois Rupee" },
    { code: "SDG", name: "Sudanese Pound" },
    { code: "SEK", name: "Swedish Krona" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "SLL", name: "Sierra Leonean Leone" },
    { code: "SOS", name: "Somali Shilling" },
    { code: "SRD", name: "Surinamese Dollar" },
    { code: "STN", name: "São Tomé and Príncipe Dobra" },
    { code: "SVC", name: "Salvadoran Colon" },
    { code: "SYP", name: "Syrian Pound" },
    { code: "SZL", name: "Swazi Lilangeni" },
    { code: "THB", name: "Thai Baht" },
    { code: "TJS", name: "Tajikistani Somoni" },
    { code: "TMT", name: "Turkmenistani Manat" },
    { code: "TND", name: "Tunisian Dinar" },
    { code: "TOP", name: "Tongan Paʻanga" },
    { code: "TRY", name: "Turkish Lira" },
    { code: "TTD", name: "Trinidad and Tobago Dollar" },
    { code: "TWD", name: "New Taiwan Dollar" },
    { code: "TZS", name: "Tanzanian Shilling" },
    { code: "UAH", name: "Ukrainian Hryvnia" },
    { code: "UGX", name: "Ugandan Shilling" },
    { code: "USD", name: "US Dollar" },
    { code: "UYU", name: "Uruguayan Peso" },
    { code: "UZS", name: "Uzbekistan Som" },
    { code: "VES", name: "Venezuelan Bolívar" },
    { code: "VND", name: "Vietnamese Dong" },
    { code: "VUV", name: "Vanuatu Vatu" },
    { code: "WST", name: "Samoan Tala" },
    { code: "XAF", name: "Central African CFA Franc" },
    { code: "XCD", name: "East Caribbean Dollar" },
    { code: "XOF", name: "West African CFA Franc" },
    { code: "XPF", name: "CFP Franc" },
    { code: "YER", name: "Yemeni Rial" },
    { code: "ZAR", name: "South African Rand" },
    { code: "ZMW", name: "Zambian Kwacha" },
    { code: "ZWL", name: "Zimbabwean Dollar" },
  ];

  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [incoterms, setIncoterms] = useState("CIF");
  const [packingDetails, setPackingDetails] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("90 % of the invoice value to be paid in advance, and the remaining 10 % of the invoice value to be paid after the loading of goods.\n\nNote : Including packing, loading and Transport.");
  const [notes, setNotes] = useState("");
  const [totalCartons, setTotalCartons] = useState<number | "">("");
  const [unitNetWeight, setUnitNetWeight] = useState<number | "">("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("India");
  const [portOfLoading, setPortOfLoading] = useState("Nhava Sheva Port, India");
  const [portOfDischarge, setPortOfDischarge] = useState("");
  const [modeOfTransport, setModeOfTransport] = useState("Sea");

  // New Shipment details states
  const [containerType, setContainerType] = useState("");
  const [loadingType, setLoadingType] = useState("");
  const [qtyPerCarton, setQtyPerCarton] = useState<number | "">("");
  const [grossWeightPerCarton, setGrossWeightPerCarton] = useState<number | "">("");
  const [totalNetWeight, setTotalNetWeight] = useState<number | "">("");
  const [totalGrossWeight, setTotalGrossWeight] = useState<number | "">("");

  // New Bank details states
  const [bankName, setBankName] = useState("State Bank of India");
  const [bankBranch, setBankBranch] = useState("Erode, Tamil Nadu");
  const [accountNo, setAccountNo] = useState("43841179923");
  const [ifscCode, setIfscCode] = useState("SBIN02278");
  const [swiftCode, setSwiftCode] = useState("SBININBB");

  // Auto-calculate Total Net Weight & Total Gross Weight
  useEffect(() => {
    if (totalCartons && unitNetWeight) {
      const calculatedNet = Number(totalCartons) * Number(unitNetWeight) * (Number(qtyPerCarton) || 1);
      setTotalNetWeight(Number(calculatedNet.toFixed(2)));
    } else {
      setTotalNetWeight("");
    }
  }, [totalCartons, unitNetWeight, qtyPerCarton]);

  useEffect(() => {
    if (totalCartons && grossWeightPerCarton) {
      const calculatedGross = Number(totalCartons) * Number(grossWeightPerCarton);
      setTotalGrossWeight(Number(calculatedGross.toFixed(2)));
    } else {
      setTotalGrossWeight("");
    }
  }, [totalCartons, grossWeightPerCarton]);

  const totalAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  const handleSave = async () => {
    if (!customerName || !product || !quantity || !unitPrice) {
      return toast.error("Please fill all required fields (Customer, Product, Quantity, Price)");
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Authentication required to create orders");

      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      // Auto-create product if typed manually and doesn't exist
      const resolvedProductName = product.trim();
      const existingProduct = productsList.find(p => p.name.trim().toLowerCase() === resolvedProductName.toLowerCase());
      if (!existingProduct && resolvedProductName) {
        try {
          await fetch('/api/products', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: resolvedProductName,
              unit: unit || 'kg',
              is_active: true,
              company_id: profile!.company_id
            })
          });
          toast.info(`Auto-created product "${resolvedProductName}" in catalog.`);
        } catch (err) {
          console.warn("Failed to auto-create product in catalog, proceeding anyway:", err);
        }
      }

      // Generate order number EXP-2026-XXX
      const year = new Date().getFullYear();
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderNumber = `EXP-${year}-${rand}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          company_id: profile!.company_id,
          order_number: orderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_gst: customerGst,
          customer_email: customerEmail,
          customer_country: customerCountry,
          product,
          quantity: Number(quantity),
          unit,
          unit_price: Number(unitPrice),
          total_amount: totalAmount,
          currency,
          expected_delivery: expectedDelivery ? new Date(expectedDelivery).toISOString() : null,
          shipping_address: shippingAddress,
          hsn_code: hsnCode,
          incoterms: incoterms,
          packing_details: packingDetails,
          payment_terms: paymentTerms,
          notes,
          total_cartons: totalCartons ? Number(totalCartons) : null,
          unit_net_weight: unitNetWeight ? Number(unitNetWeight) : null,
          country_of_origin: countryOfOrigin || 'India',
          port_of_loading: portOfLoading || null,
          port_of_discharge: portOfDischarge || null,
          mode_of_transport: modeOfTransport || null,
          container_type: containerType || null,
          loading_type: loadingType || null,
          qty_per_carton: qtyPerCarton ? Number(qtyPerCarton) : null,
          gross_weight_per_carton: grossWeightPerCarton ? Number(grossWeightPerCarton) : null,
          total_net_weight: totalNetWeight ? Number(totalNetWeight) : null,
          total_gross_weight: totalGrossWeight ? Number(totalGrossWeight) : null,
          bank_name: bankName || null,
          bank_branch: bankBranch || null,
          account_no: accountNo || null,
          ifsc_code: ifscCode || null,
          swift_code: swiftCode || null,
          created_by: userId,
          status: 'pending',
          payment_status: 'unpaid'
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let message = "Failed to create order";
        try {
          const parsed = JSON.parse(errText);
          message = parsed.error || message;
        } catch {
          if (errText) message = errText;
        }
        throw new Error(message);
      }

      toast.success("Invoice created successfully!");
      navigate("/documents/invoices");
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/documents/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Commercial Invoice</h1>
          <p className="text-sm text-muted-foreground">Generate a new commercial invoice</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-primary font-bold">Select CRM Buyer / Lead</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="bg-primary/5 border-primary/20">
                  <SelectValue placeholder="Choose a Lead from CRM" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {leadsList.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      <div className="flex flex-col">
                        <span className="font-bold">{l.company_name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{l.country || 'Global'} Buyer</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground italic">Note: Export Orders are created for Buyers. For Farmers/Suppliers, use the Procurement section.</p>
            </div>
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Company or Individual Name" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="e.g. +1 234 567 890" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GSTIN (Optional)</Label>
                <Input value={customerGst} onChange={e => setCustomerGst(e.target.value)} placeholder="e.g. 29ABCDE1234F1Z5" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={customerCountry} onChange={e => setCustomerCountry(e.target.value)} placeholder="e.g. UAE, UK" />
            </div>
            <div className="space-y-2">
              <Label>Company Address (Bill To)</Label>
              <Textarea value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} className="h-24" placeholder="Full address for the invoice" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Type or select product..."
                list="products-datalist"
              />
              <datalist id="products-datalist">
                {productsList.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input type="number" min="0" value={quantity} onChange={e => setQuantity(Number(e.target.value) || "")} />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="ton">ton</SelectItem>
                    <SelectItem value="piece">piece</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Price *</Label>
                <Input type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value) || "")} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={currencyOpen}
                      className="w-full justify-between"
                    >
                      {currency
                        ? `${currency} - ${currencies.find((c) => c.code === currency)?.name}`
                        : "Select currency..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search currency..." />
                      <CommandList>
                        <CommandEmpty>No currency found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {currencies.map((c) => (
                            <CommandItem
                              key={c.code}
                              value={`${c.code} ${c.name}`}
                              onSelect={() => {
                                setCurrency(c.code);
                                setCurrencyOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  currency === c.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {c.code} - {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border mt-2 flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Total Amount</span>
              <span className="text-xl font-bold">{currency} {totalAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Trade Terms (Incoterms)</Label>
              <Select value={incoterms} onValueChange={setIncoterms}>
                <SelectTrigger><SelectValue placeholder="Select Terms" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CIF">CIF (Cost, Insurance, Freight)</SelectItem>
                  <SelectItem value="FOB">FOB (Free On Board)</SelectItem>
                  <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                  <SelectItem value="CNF">CNF (Cost and Freight)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>HSN Code</Label>
              <Input value={hsnCode} onChange={e => setHsnCode(e.target.value)} placeholder="e.g. 08039010" />
            </div>
            <div className="space-y-2">
              <Label>Mode of Transport</Label>
              <Select value={modeOfTransport} onValueChange={setModeOfTransport}>
                <SelectTrigger><SelectValue placeholder="Select Transport" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Air">Air</SelectItem>
                  <SelectItem value="Sea">Sea</SelectItem>
                  <SelectItem value="Road">Road</SelectItem>
                  <SelectItem value="Courier">Courier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Container Type</Label>
              <Select value={containerType} onValueChange={setContainerType}>
                <SelectTrigger><SelectValue placeholder="Select Container Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="20ft FCL">20ft FCL</SelectItem>
                  <SelectItem value="40ft FCL">40ft FCL</SelectItem>
                  <SelectItem value="40ft HQ">40ft HQ</SelectItem>
                  <SelectItem value="LCL">LCL</SelectItem>
                  <SelectItem value="—">— (None)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loading Type</Label>
              <Select value={loadingType} onValueChange={setLoadingType}>
                <SelectTrigger><SelectValue placeholder="Select Loading Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FCL">FCL (Full Container Load)</SelectItem>
                  <SelectItem value="LCL">LCL (Less than Container Load)</SelectItem>
                  <SelectItem value="—">— (None)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Packing & Weight Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Country of Origin</Label>
              <Input value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)} placeholder="e.g. India" />
            </div>
            <div className="space-y-2">
              <Label>Port of Loading</Label>
              <Input value={portOfLoading} onChange={e => setPortOfLoading(e.target.value)} placeholder="e.g. Nhava Sheva Port" />
            </div>
            <div className="space-y-2">
              <Label>Port of Discharge</Label>
              <Input value={portOfDischarge} onChange={e => setPortOfDischarge(e.target.value)} placeholder="e.g. Jebel Ali Port" />
            </div>
            <div className="space-y-2">
              <Label>Packing Type</Label>
              <Input value={packingDetails} onChange={e => setPackingDetails(e.target.value)} placeholder="e.g. Cartons, Bags, Pallets" />
            </div>
            <div className="space-y-2">
              <Label>Total Cartons</Label>
              <Input type="number" value={totalCartons} onChange={e => setTotalCartons(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 100" />
            </div>
            <div className="space-y-2">
              <Label>Qty per Carton</Label>
              <Input type="number" value={qtyPerCarton} onChange={e => setQtyPerCarton(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 24" />
            </div>
            <div className="space-y-2">
              <Label>Net Wt / Unit (Kg)</Label>
              <Input type="number" step="0.001" value={unitNetWeight} onChange={e => setUnitNetWeight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 13.50" />
            </div>
            <div className="space-y-2">
              <Label>Gross Wt / Carton (Kg)</Label>
              <Input type="number" step="0.001" value={grossWeightPerCarton} onChange={e => setGrossWeightPerCarton(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 14.20" />
            </div>
            <div className="space-y-2">
              <Label>Total Net Weight (Kg)</Label>
              <Input type="number" step="0.01" value={totalNetWeight} onChange={e => setTotalNetWeight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Calculated automatically" />
            </div>
            <div className="space-y-2">
              <Label>Total Gross Weight (Kg)</Label>
              <Input type="number" step="0.01" value={totalGrossWeight} onChange={e => setTotalGrossWeight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Calculated automatically" />
            </div>
            
            <div className="space-y-2 md:col-span-2 pt-4 border-t">
              <h4 className="font-bold text-sm text-primary">Bank & Payment details (Optional)</h4>
            </div>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input value={bankBranch} onChange={e => setBankBranch(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account No</Label>
              <Input value={accountNo} onChange={e => setAccountNo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input value={ifscCode} onChange={e => setIfscCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Swift Code</Label>
              <Input value={swiftCode} onChange={e => setSwiftCode(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2 pt-4 border-t">
              <Label>Terms of Payment</Label>
              <Textarea value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g. 90% advance..." className="h-20" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes, etc..." className="h-20" />
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t p-4 mt-2">
            <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto min-w-[150px]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Invoice
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
