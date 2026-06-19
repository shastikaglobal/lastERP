import React, { useState, useRef, useEffect } from "react";
import { Loader2, Download, Printer, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";

export default function CreateCertificate() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [company, setCompany] = useState<any>(null);

  const [formData, setFormData] = useState({
    refNumber: `COO-${Math.floor(1000 + Math.random() * 9000)}`,
    consigneeName: "",
    consigneeAddress: "",
    vessel: "",
    portOfLoading: "",
    portOfDischarge: "",
    marksAndNos: "",
    productName: "",
    packingDetails: "",
    hsCode: "",
    quantity: "",
    unit: "",
    grossWeight: "",
  });

  useEffect(() => {
    const fetchCompany = async () => {
      if (profile?.company_id) {
        const { data: compData } = await supabase
          .from("companies")
          .select("*")
          .eq("id", profile.company_id)
          .maybeSingle();
        setCompany(compData);
      }
    };
    fetchCompany();
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveToDatabase = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        company_id: profile?.company_id,
        ref_number: formData.refNumber,
        consignee_name: formData.consigneeName,
        consignee_address: formData.consigneeAddress,
        vessel: formData.vessel,
        port_of_loading: formData.portOfLoading,
        port_of_discharge: formData.portOfDischarge,
        marks_and_nos: formData.marksAndNos,
        product_name: formData.productName,
        packing_details: formData.packingDetails,
        hs_code: formData.hsCode,
        quantity: formData.quantity,
        unit: formData.unit,
        gross_weight: formData.grossWeight
      };

      const res = await fetch('/api/documents/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save to database");
      
      alert("Certificate saved to database successfully!");
      navigate('/documents/certificates');
    } catch (err: any) {
      console.error(err);
      alert("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setDownloading(true);
    
    try {
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${formData.refNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Generate Certificate of Origin</h1>
            <p className="text-sm text-muted-foreground">Standalone Generator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={handleSaveToDatabase}
            disabled={saving}
            className="font-bold flex items-center gap-2 border-primary text-primary hover:bg-primary/5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save to DB
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.print()}
            className="font-bold flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button 
            onClick={handleDownloadPDF} 
            disabled={downloading}
            className="font-bold flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Save as PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Form */}
        <div className="w-1/3 min-w-[400px] border-r bg-muted/10 p-6 overflow-y-auto space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-sm uppercase text-muted-foreground">Reference & Transport</h3>
              <div className="space-y-2">
                <Label>Reference No.</Label>
                <Input name="refNumber" value={formData.refNumber} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vessel</Label>
                  <Input name="vessel" value={formData.vessel} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Port of Loading</Label>
                  <Input name="portOfLoading" value={formData.portOfLoading} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Port of Discharge</Label>
                <Input name="portOfDischarge" value={formData.portOfDischarge} onChange={handleChange} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-sm uppercase text-muted-foreground">Consignee</h3>
              <div className="space-y-2">
                <Label>Consignee Name</Label>
                <Input name="consigneeName" value={formData.consigneeName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Consignee Address</Label>
                <Textarea name="consigneeAddress" value={formData.consigneeAddress} onChange={handleChange} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-sm uppercase text-muted-foreground">Product Details</h3>
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input name="productName" value={formData.productName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Packing Details</Label>
                <Input name="packingDetails" value={formData.packingDetails} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Marks & Nos</Label>
                <Textarea name="marksAndNos" value={formData.marksAndNos} onChange={handleChange} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input name="quantity" value={formData.quantity} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Unit (e.g. MT)</Label>
                  <Input name="unit" value={formData.unit} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HS Code</Label>
                  <Input name="hsCode" value={formData.hsCode} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Gross Weight</Label>
                  <Input name="grossWeight" value={formData.grossWeight} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Preview */}
        <div className="flex-1 bg-[#525659] overflow-y-auto flex justify-center py-8">
          <div ref={invoiceRef} className="relative w-[210mm] shadow-xl bg-white text-black flex flex-col border-[1px] border-black box-border font-sans">
            <div className="relative z-10 flex flex-col flex-1">
              
              <div className="grid grid-cols-2 border-b-[1px] border-black bg-transparent">
                <div className="p-4 border-r-[1px] border-black min-h-[140px]">
                  <p className="text-[9px] font-bold text-gray-500 mb-2 uppercase">1. Exporter (Name, Address, Country)</p>
                  <div className="font-bold text-[11px] uppercase">{company?.name || "SHASTIKA GLOBAL IMPEX PRIVATE LIMITED"}</div>
                  <div className="text-[9px] mt-2 space-y-0.5 whitespace-pre-wrap">
                    {company?.address || "41/1, ST-5, Sathy Athani Main Road,\nThuckanayakanpalayam\nErode - 638506, Tamil Nadu, India."}
                  </div>
                  <div className="text-[9px] mt-2">
                    <p>Phone: {company?.phone || "7397612015"}</p>
                    <p className="font-bold mt-1">IE CODE: 0413045678</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="p-4 border-b-[1px] border-black min-h-[70px]">
                    <p className="text-[9px] font-bold text-gray-500 mb-1 uppercase">Reference No.</p>
                    <p className="font-mono font-bold text-[11px]">{formData.refNumber}</p>
                  </div>
                  <div className="p-3 bg-[#f8fafc] flex-1 flex flex-col items-center justify-center text-center">
                    <h1 className="font-bold text-[14px] leading-tight text-[#1A5276]">CERTIFICATE OF ORIGIN</h1>
                    <p className="text-[8px] text-gray-500 mt-1 uppercase tracking-wider">(COMBINED DECLARATION AND CERTIFICATE)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-b-[1px] border-black bg-transparent">
                <div className="p-4 border-r-[1px] border-black min-h-[140px]">
                  <p className="text-[9px] font-bold text-gray-500 mb-2 uppercase">2. Consignee (Name, Address, Country)</p>
                  <div className="font-bold text-[11px] mb-1">{formData.consigneeName}</div>
                  <div className="text-[9px] leading-relaxed whitespace-pre-wrap">
                    {formData.consigneeAddress}
                  </div>
                </div>
                <div className="p-0 flex flex-col">
                  <div className="p-4 border-b-[1px] border-black flex-1">
                    <p className="text-[9px] font-bold text-gray-500 mb-2 uppercase">3. Transport Details (Vessel/Aircraft, Voyage No.)</p>
                    <div className="text-[10px] space-y-2">
                      <p><span className="text-gray-500">Vessel:</span> <span className="font-bold uppercase">{formData.vessel}</span></p>
                      <p><span className="text-gray-500">Port of Loading:</span> <span className="font-bold uppercase">{formData.portOfLoading}</span></p>
                      <p><span className="text-gray-500">Port of Discharge:</span> <span className="font-bold uppercase">{formData.portOfDischarge}</span></p>
                    </div>
                  </div>
                  <div className="p-4 flex-1">
                    <p className="text-[9px] font-bold text-gray-500 mb-1 uppercase">4. For Official Use Only</p>
                    <div className="border border-dashed border-gray-300 rounded h-12 flex items-center justify-center">
                      <span className="text-[8px] text-gray-400 italic">Official Stamp Area</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-transparent">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border-b-[1px] border-black p-2 text-left w-12 text-[8px] text-gray-500">5. S.No</th>
                      <th className="border-b-[1px] border-black p-2 text-left w-24 text-[8px] text-gray-500">6. Marks & Nos</th>
                      <th className="border-b-[1px] border-black p-2 text-left text-[8px] text-gray-500">7. Number & Kind of Packages; Description of Goods</th>
                      <th className="border-b-[1px] border-black p-2 text-center w-24 text-[8px] text-gray-500">8. Origin Criterion</th>
                      <th className="border-b-[1px] border-black p-2 text-center w-24 text-[8px] text-gray-500">9. Gross Weight</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent font-medium">
                    <tr>
                      <td className="p-4 text-center align-top border-r-[1px] border-black">01</td>
                      <td className="p-4 align-top border-r-[1px] border-black text-[9px] font-mono whitespace-pre-wrap">
                        {formData.marksAndNos}
                      </td>
                      <td className="p-4 align-top border-r-[1px] border-black">
                        <div className="font-bold text-[11px] mb-2 uppercase">{formData.productName}</div>
                        <p className="text-gray-600 mb-4 whitespace-pre-wrap">{formData.packingDetails}</p>
                        <div className="mt-4">
                          <p className="text-gray-500 text-[8px] mb-1">HS CODE:</p>
                          <p className="font-bold">{formData.hsCode}</p>
                        </div>
                      </td>
                      <td className="p-4 text-center align-top border-r-[1px] border-black">
                        <div className="bg-blue-50 text-blue-800 p-1 rounded font-bold text-[12px]">"P"</div>
                        <p className="text-[7px] mt-1 text-gray-500 uppercase">(Wholly Obtained)</p>
                      </td>
                      <td className="p-4 text-center align-top font-bold uppercase">{formData.quantity} {formData.unit}<br/><br/>GW: {formData.grossWeight}</td>
                    </tr>
                    
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="h-16">
                        <td className="border-r-[1px] border-black"></td>
                        <td className="border-r-[1px] border-black"></td>
                        <td className="border-r-[1px] border-black"></td>
                        <td className="border-r-[1px] border-black"></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 border-t-[1px] border-black bg-transparent">
                <div className="p-6 border-r-[1px] border-black bg-transparent min-h-[180px]">
                  <p className="text-[9px] font-bold text-gray-500 mb-4 uppercase leading-tight">10. Declaration by the Exporter:</p>
                  <p className="text-[9px] leading-relaxed text-gray-700">
                    The undersigned hereby declares that the above details and statements are correct; that all the goods were produced in 
                    <span className="font-bold border-b border-black mx-1 px-4">INDIA</span>
                    and that they comply with the origin requirements specified for those goods in the trade agreement or country rules.
                  </p>
                  <div className="mt-10 flex flex-col items-center">
                    <div className="h-16 flex items-center justify-center">
                      {company?.signature_url && (
                        <img src={company.signature_url} alt="Signature" className="h-full w-auto object-contain mix-blend-multiply" />
                      )}
                    </div>
                    <div className="border-t border-black w-full text-center pt-1 mt-1 text-[8px] font-bold uppercase tracking-widest">
                      Authorized Signatory for {company?.name || "SHASTIKA GLOBAL IMPEX PVT LTD"}
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-transparent flex flex-col">
                  <p className="text-[9px] font-bold text-gray-500 mb-4 uppercase leading-tight">11. Certification:</p>
                  <p className="text-[9px] leading-relaxed text-gray-700 italic">
                    It is hereby certified, on the basis of control carried out, that the declaration by the exporter is correct.
                  </p>
                  <div className="mt-auto flex flex-col items-center border-[1px] border-gray-200 p-4 rounded bg-gray-50/50">
                     <div className="w-20 h-20 border-2 border-gray-200 rounded-full flex items-center justify-center opacity-20 relative">
                        <span className="text-[8px] rotate-12 font-bold text-center">CHAMBER OF COMMERCE<br/>INDIA</span>
                     </div>
                     <p className="text-[8px] text-gray-400 mt-4 uppercase">Place and date, signature and stamp of certifying authority</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 text-white p-1 text-center text-[7px] uppercase tracking-[5px] font-bold">
               Official Document · Issued by Shastika Global Impex ERP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
