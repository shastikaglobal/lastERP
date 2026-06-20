import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";

export default function PackingListPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: order, error } = await supabase
          .from("export_orders")
          .select("*, export_shipments(*)")
          .eq("id", id)
          .single();

        if (error) throw error;
        setData(order);
      } catch (err: any) {
        toast.error("Failed to load packing list");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDownload = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      if (!printRef.current) return;

      toast.info("Generating PDF...");

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`PackingList_${data?.order_number?.replace("EXP", "PL") || id}.pdf`);
      toast.success("PDF downloaded!");
    } catch (err) {
      toast.error("Failed to generate PDF");
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Loader2 className="h-10 w-10 animate-spin text-yellow-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-500">Packing list not found.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const shipment = data.export_shipments?.[0] || {};
  const today = new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' });
  const plNumber = data.order_number?.replace("EXP", "PL") || `PL-${id?.slice(0, 8)}`;
  
  const totalAmount = Number(data.total_amount || 0);
  const currencySym = data.currency || 'USD';

  // Constants for design
  const NAVY = "#1B3A6B";
  const MID_BLUE = "#2E5FA3";
  const LIGHT_BLUE = "#D6E4F7";
  const LIGHT_GRAY = "#F5F7FA";

  const SectionHeader = ({ label }: { label: string }) => (
    <div style={{
      background: MID_BLUE,
      color: "#fff",
      fontWeight: 700,
      fontSize: "10px",
      padding: "5px 12px",
      letterSpacing: "0.5px",
    }}>
      ▌ {label}
    </div>
  );

  const LabelVal = ({ label, value }: { label: string, value: any }) => (
    <div className="grid grid-cols-[130px_1fr] text-[10px] leading-relaxed">
      <span className="text-gray-600">{label}</span>
      <span className="font-bold">: {value || "—"}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-200 py-10 flex flex-col items-center print:bg-white print:py-0 font-sans">

      {/* ── Top Action Bar */}
      <div className="print:hidden sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between w-full max-w-[210mm] rounded-t-lg">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-gray-300 hover:text-white gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <span className="text-white font-mono font-bold text-sm tracking-wider">{plNumber}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-gray-600 text-gray-300 hover:text-white">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" onClick={handleDownload} className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-black font-bold">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div
        ref={printRef}
        className="bg-white shadow-2xl print:shadow-none border-[1.5px] border-black text-black leading-tight overflow-hidden p-[36px] print:p-0 w-[210mm] min-h-[297mm]"
      >
        
        {/* Header Section */}
        <div className="flex border-[1.5px] border-black mb-4">
          <div className="w-[60%] p-5 bg-white border-r-[1.5px] border-black">
            <div className="flex flex-col items-center mb-4">
              <img src="/logo.webp" alt="SGI Logo" className="w-20 h-auto mb-2" />
              <h1 className="text-[13px] font-extrabold text-[#1A5276] tracking-tight text-center">SHASTIKA GLOBAL IMPEX PRIVATE LIMITED</h1>
            </div>
            <div className="text-[9.5px] space-y-1 text-gray-800 text-center">
              <p>41/1, ST-5, Sathy Athani Main Road, Thuckanayakanpalayam, Erode – 638506, Tamil Nadu, India</p>
              <p><span className="font-bold">Phone:</span> +91 7397612015 &emsp; <span className="font-bold">GSTIN:</span> 33ABPCS0605LIZ8</p>
            </div>
          </div>
          <div className="w-[40%] p-5 bg-[#EBF2FD] flex flex-col justify-center items-center">
            <h2 className="text-[20px] font-black text-[#1B3A6B] tracking-widest leading-none text-center">PACKING LIST</h2>
            <p className="text-[9px] text-gray-500 italic mb-4">For Customs Clearance</p>
            <div className="w-full bg-white p-3 rounded space-y-1 text-[10px]">
              <div className="flex justify-between font-bold"><span>PL No:</span> <span>{plNumber}</span></div>
              <div className="flex justify-between"><span>Date:</span> <span>{today}</span></div>
              <div className="flex justify-between font-bold text-[#1B3A6B]"><span>Currency:</span> <span>{data.currency || 'USD'}</span></div>
            </div>
          </div>
        </div>

        {/* Exporter / Importer Section */}
        <div className="grid grid-cols-2 border-x-[1.5px] border-t-[1.5px] border-black">
          <div className="border-r-[1.5px] border-black">
            <SectionHeader label="EXPORTER / SELLER" />
            <div className="p-4 text-[10px] space-y-1 bg-[#F5F7FA]">
              <p className="font-bold text-[#1B3A6B]">SHASTIKA GLOBAL IMPEX PRIVATE LIMITED</p>
              <p>41/1, ST-5, Sathy Athani Main Road,</p>
              <p>Thuckanayakanpalayam, Erode - 638506,</p>
              <p>Tamil Nadu, India.</p>
              <p>GSTIN: 33ABPCS0605LIZ8</p>
            </div>
          </div>
          <div>
            <SectionHeader label="IMPORTER / CONSIGNEE" />
            <div className="p-4 text-[10px] space-y-1">
              <p className="font-bold text-[#1B3A6B] uppercase">{data.customer_name || 'Customer Name'}</p>
              <p className="whitespace-pre-wrap">{data.shipping_address || shipment.consignee_address || 'Address not provided'}</p>
              <p><span className="font-medium text-gray-500">Country:</span> {data.customer_country || '—'}</p>
            </div>
          </div>
        </div>

        {/* Shipment & Banking Section */}
        <div className="grid grid-cols-2 border-x-[1.5px] border-y-[1.5px] border-black">
          <div className="border-r-[1.5px] border-black">
            <SectionHeader label="SHIPMENT & TRADE DETAILS" />
            <div className="p-4 space-y-1 bg-[#F5F7FA]">
              <LabelVal label="Country of Origin" value={data.country_of_origin} />
              <LabelVal label="Mode of Transport" value={data.mode_of_transport || shipment.transport_mode} />
              <LabelVal label="Incoterms" value={data.incoterms} />
              <LabelVal label="Port of Loading" value={data.port_of_loading || shipment.port_of_loading} />
              <LabelVal label="Port of Discharge" value={data.port_of_discharge || shipment.port_of_discharge} />
              <LabelVal label="Container Type" value={data.container_type || shipment.container_type} />
              <LabelVal label="Loading Type" value={data.loading_type} />
            </div>
          </div>
          <div>
            <SectionHeader label="PAYMENT & BANKING DETAILS" />
            <div className="p-4 space-y-1">
              <LabelVal label="Payment Terms" value={data.payment_terms} />
              <LabelVal label="Invoice Currency" value={data.currency} />
              <LabelVal label="Bank Name" value={data.bank_name || 'State Bank of India'} />
              <LabelVal label="Branch" value={data.bank_branch || 'Erode, Tamil Nadu'} />
              <LabelVal label="Account No" value={data.account_no || '43841179923'} />
              <LabelVal label="IFSC Code" value={data.ifsc_code || 'SBIN02278'} />
              <LabelVal label="Swift Code" value={data.swift_code || 'SBININBB'} />
            </div>
          </div>
        </div>

        {/* Goods Table */}
        <div className="border-x-[1.5px] border-black">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#1B3A6B] text-white">
                <th className="border border-white/20 p-2 w-10">S.No</th>
                <th className="border border-white/20 p-2 text-left">Description</th>
                <th className="border border-white/20 p-2 text-center w-24">HS Code</th>
                <th className="border border-white/20 p-2 text-center w-20">No. of Pkgs</th>
                <th className="border border-white/20 p-2 text-center w-20">Qty (Nos)</th>
                <th className="border border-white/20 p-2 text-center w-14">Unit</th>
                <th className="border border-white/20 p-2 text-center w-24">Unit Price</th>
                <th className="border border-white/20 p-2 text-right w-28">Total Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#F5F7FA]">
                <td className="border border-black/10 p-2 text-center">1</td>
                <td className="border border-black/10 p-2 font-bold">{data.product}</td>
                <td className="border border-black/10 p-2 text-center">{data.hsn_code}</td>
                <td className="border border-black/10 p-2 text-center font-bold">{data.total_cartons}</td>
                <td className="border border-black/10 p-2 text-center font-bold">{data.quantity}</td>
                <td className="border border-black/10 p-2 text-center">{data.unit}</td>
                <td className="border border-black/10 p-2 text-center">{data.unit_price}</td>
                <td className="border border-black/10 p-2 text-right font-bold text-[#1B3A6B]">{currencySym} {totalAmount.toLocaleString()}</td>
              </tr>
              {[...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td className="border border-black/10 p-2">&nbsp;</td>
                  <td className="border border-black/10 p-2"></td>
                  <td className="border border-black/10 p-2"></td>
                  <td className="border border-black/10 p-2"></td>
                  <td className="border border-black/10 p-2"></td>
                  <td className="border border-black/10 p-2"></td>
                  <td className="border border-black/10 p-2"></td>
                  <td className="border border-black/10 p-2"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="border-r border-black/10 py-2"></td>
                <td className="p-2 font-bold bg-[#D6E4F7] text-[#1B3A6B] border border-black/10">Sub Total</td>
                <td className="p-2 font-bold bg-[#D6E4F7] text-[#1B3A6B] border border-black/10 text-right">{currencySym} {totalAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan={6} className="border-r border-black/10 py-1"></td>
                <td className="p-2 text-gray-500 border border-black/10 text-center">Tax / GST (Export 0%)</td>
                <td className="p-2 text-right text-gray-500 border border-black/10">0.00</td>
              </tr>
              <tr className="bg-[#1B3A6B] text-white">
                <td colSpan={6}></td>
                <td className="p-2 font-black text-center">TOTAL FOB VALUE</td>
                <td className="p-2 font-black text-right">{currencySym} {totalAmount.toLocaleString()}</td>
              </tr>
              <tr className="bg-[#D6E4F7]/50">
                <td colSpan={8} className="p-3 border-t-[1.5px] border-black text-[10px]">
                  <span className="font-bold text-[#1B3A6B]">Amount in Words:</span> <span className="italic uppercase ml-2 text-[9px]">Zero {data.currency} Only</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Packing & Weight Section */}
        <div className="grid grid-cols-2 border-x-[1.5px] border-y-[1.5px] border-black">
          <div className="border-r-[1.5px] border-black">
            <SectionHeader label="PACKING DETAILS" />
            <div className="p-4 space-y-1 bg-[#F5F7FA]">
              <LabelVal label="Packing Type" value={data.packing_details} />
              <LabelVal label="No. of Cartons" value={data.total_cartons} />
              <LabelVal label="Qty per Carton" value={data.qty_per_carton} />
              <LabelVal label="Total Quantity" value={`${data.quantity} ${data.unit}`} />
              <LabelVal label="Container Type" value={data.container_type || shipment.container_type} />
            </div>
          </div>
          <div>
            <SectionHeader label="WEIGHT DETAILS" />
            <div className="p-4 space-y-1">
              <LabelVal label="Net Wt / Unit" value={data.unit_net_weight} />
              <LabelVal label="Net Wt / Carton" value={data.unit_net_weight && data.qty_per_carton ? (data.unit_net_weight * data.qty_per_carton).toFixed(2) : null} />
              <LabelVal label="Gross Wt / Carton" value={data.gross_weight_per_carton} />
              <LabelVal label="Total Net Weight" value={data.total_net_weight} />
              <LabelVal label="Total Gross Weight" value={data.total_gross_weight} />
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="grid grid-cols-[60%_40%] border-x-[1.5px] border-b-[1.5px] border-black">
          <div className="border-r-[1.5px] border-black">
            <SectionHeader label="DECLARATION" />
            <div className="p-5 text-[9px] leading-relaxed space-y-2 bg-[#F5F7FA] text-gray-700">
              <p>1. The goods described in this packing list are of Indian origin.</p>
              <p>2. The details stated herein are true, correct and are the actual packing details.</p>
              <p>3. This document is issued solely for customs clearance and export purposes.</p>
            </div>
          </div>
          <div>
            <SectionHeader label="AUTHORISED SIGNATORY" />
            <div className="p-5 flex flex-col justify-between h-56 bg-white">
              <p className="font-extrabold text-[9px] text-[#1B3A6B]">For SHASTIKA GLOBAL IMPEX PVT LTD</p>
              <div className="mt-8 border-t border-black pt-2 flex flex-col items-center">
                <p className="text-[10px] font-bold">Authorised Signatory</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[8px] text-gray-400">
          Generated via ERP System | Shastika Global Impex Pvt Ltd
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 10mm; size: A4; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .shadow-2xl { box-shadow: none !important; }
          .w-\\[210mm\\] { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
        .font-sans { font-family: 'Roboto', sans-serif !important; }
      `}} />
    </div>
  );
}