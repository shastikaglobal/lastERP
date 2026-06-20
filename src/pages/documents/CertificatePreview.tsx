import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function CertificatePreview() {
  const { id } = useParams();
  const [shipment, setShipment] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Loading certificate for ID:", id);
        
        // 1. Try finding as a Shipment
        const { data: shipmentData, error: shipErr } = await supabase
          .from("export_shipments")
          .select("*, export_orders(*), export_containers(*)")
          .eq("id", id)
          .maybeSingle();

        if (shipmentData) {
          console.log("Found as shipment");
          setShipment(shipmentData);
          
          const orderData = Array.isArray(shipmentData.export_orders) 
            ? shipmentData.export_orders[0] 
            : shipmentData.export_orders;
            
          await fetchExtraDetails(orderData);
          return;
        }

        // 2. If not found, try finding as an Order
        console.log("Shipment not found, trying as order...");
        const { data: orderOnly, error: orderErr } = await supabase
          .from("export_orders")
          .select("*, export_shipments(*)")
          .eq("id", id)
          .maybeSingle();

        if (orderOnly) {
          console.log("Found as order");
          // Create a mock shipment object for the UI
          const mockShipment = {
            customer_name: orderOnly.customer_name,
            shipment_number: orderOnly.order_number?.replace('EXP', 'SHP') || 'TBD',
            origin_port: 'CHENNAI, INDIA', // Default
            destination_port: 'AS PER ORDER',
            carrier: 'TBD',
            export_orders: orderOnly,
            export_containers: []
          };
          
          setShipment(mockShipment);
          await fetchExtraDetails(orderOnly);
          return;
        }

        // 3. Try finding as Standalone Certificate from VPS DB
        console.log("Order not found, trying as standalone certificate...");
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/documents/certificates', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        
        if (res.ok) {
          const standaloneCerts = await res.json();
          const standalone = standaloneCerts.find((c: any) => c.id === id);
          
          if (standalone) {
            console.log("Found as standalone certificate");
            
            // Map standalone format to the mock shipment format
            const mockStandalone = {
              customer_name: standalone.consignee_name,
              shipment_number: standalone.ref_number,
              origin_port: standalone.port_of_loading,
              destination_port: standalone.port_of_discharge,
              carrier: standalone.vessel,
              export_orders: {
                order_number: standalone.ref_number,
                shipping_address: standalone.consignee_address,
                customer_country: standalone.port_of_discharge?.split(',').pop()?.trim(),
                product: standalone.product_name,
                packing_details: standalone.packing_details,
                hsn_code: standalone.hs_code,
                quantity: standalone.quantity,
                unit: standalone.unit,
                gross_weight: standalone.gross_weight,
                company_id: standalone.company_id,
                created_by: standalone.created_by
              },
              export_containers: [],
              isStandalone: true,
              marks_and_nos: standalone.marks_and_nos // Special field for standalone
            };
            
            setShipment(mockStandalone);
            await fetchExtraDetails(mockStandalone.export_orders);
            return;
          }
        }

        throw new Error("Certificate not found in database.");

      } catch (err: any) {
        console.error("Report load error:", err);
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    const fetchExtraDetails = async (orderData: any) => {
      if (orderData?.company_id) {
        const { data: compData } = await supabase
          .from("companies")
          .select("*")
          .eq("id", orderData.company_id)
          .maybeSingle();
        setCompany(compData);
      }
      
      if (orderData?.created_by) {
        const { data: userData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", orderData.created_by)
          .maybeSingle();
        if (userData) {
          orderData.creator_name = userData.full_name;
        }
      }
    };
    if (id) fetchData();
  }, [id]);

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
      pdf.save(`CertificateOfOrigin-${shipment.shipment_number || 'download'}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div style={{ background: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  );

  if (error || !shipment) return (
    <div style={{ color: 'red', padding: '40px', background: 'white', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Failed to load certificate.</h2>
      <p>ID: {id}</p>
      <pre style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', color: '#d32f2f' }}>{error}</pre>
    </div>
  );

  const order = Array.isArray(shipment.export_orders) 
    ? (shipment.export_orders[0] || {}) 
    : (shipment.export_orders || {});
    
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div style={{ background: '#f5f5f5', color: 'black', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }} className="flex flex-col items-center print:bg-white print:py-0">
      
      <div className="mb-6 w-full max-w-[210mm] flex justify-end px-2 print:hidden">
        <Button 
          variant="outline"
          onClick={() => window.print()}
          className="bg-white border-[#1A5276] text-[#1A5276] hover:bg-[#1A5276]/5 font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all active:scale-95 mr-2"
        >
          <Printer className="h-4 w-4" />
          PRINT
        </Button>
        <Button 
          onClick={handleDownloadPDF} 
          disabled={downloading}
          className="bg-[#1A5276] hover:bg-[#154360] text-white font-bold py-2 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all active:scale-95"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          SAVE AS PDF
        </Button>
      </div>

      <div ref={invoiceRef} className="relative w-full max-w-[210mm] shadow-xl">
        <div className="bg-white text-black min-h-[297mm] flex flex-col relative border-[1px] border-black box-border">
          
          <div className="relative z-10 flex flex-col flex-1">
            
            <div className="grid grid-cols-2 border-b-[1px] border-black bg-transparent">
              <div className="p-4 border-r-[1px] border-black min-h-[140px]">
                <p className="text-[9px] font-bold text-gray-500 mb-2 uppercase">1. Exporter (Name, Address, Country)</p>
                <div className="font-bold text-[11px] uppercase">SHASTIKA GLOBAL IMPEX PRIVATE LIMITED</div>
                <div className="text-[9px] mt-2 space-y-0.5">
                  <p>41/1, ST-5, Sathy Athani Main Road,</p>
                  <p>Thuckanayakanpalayam</p>
                  <p>Erode - 638506, Tamil Nadu, India.</p>
                  <p>Phone no : 7397612015</p>
                  <p>GSTIN: 33ABPCS0605LIZ8</p>
                  <p className="font-bold mt-2">IE CODE: 0413045678</p>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="p-4 border-b-[1px] border-black min-h-[70px]">
                  <p className="text-[9px] font-bold text-gray-500 mb-1 uppercase">Reference No.</p>
                  <p className="font-mono font-bold text-[11px]">COO-{shipment.shipment_number?.slice(4) || 'TBD'}</p>
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
                <div className="font-bold text-[11px] mb-1">{shipment.customer_name}</div>
                <div className="text-[9px] leading-relaxed whitespace-pre-wrap">
                  {order.shipping_address || 'Address details as per order contract'}
                  {order.customer_country && <p className="mt-1 font-bold">{order.customer_country}</p>}
                </div>
              </div>
              <div className="p-0 flex flex-col">
                <div className="p-4 border-b-[1px] border-black flex-1">
                  <p className="text-[9px] font-bold text-gray-500 mb-2 uppercase">3. Transport Details (Vessel/Aircraft, Voyage No.)</p>
                  <div className="text-[10px] space-y-2">
                    <p><span className="text-gray-500">Vessel:</span> <span className="font-bold uppercase">{shipment.carrier || 'BY SEA'}</span></p>
                    <p><span className="text-gray-500">Port of Loading:</span> <span className="font-bold uppercase">{shipment.origin_port || 'CHENNAI, INDIA'}</span></p>
                    <p><span className="text-gray-500">Port of Discharge:</span> <span className="font-bold uppercase">{shipment.destination_port || 'AS PER BL'}</span></p>
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
                      {shipment.isStandalone ? shipment.marks_and_nos : (
                        <>{shipment.shipment_number?.slice(-4)}<br/>
                        PACKED IN<br/>
                        BULK/BAGS</>
                      )}
                    </td>
                    <td className="p-4 align-top border-r-[1px] border-black">
                      <div className="font-bold text-[11px] mb-2 uppercase">{order.product || 'Fresh Produce'}</div>
                      <p className="text-gray-600 mb-4 whitespace-pre-wrap">{order.packing_details || 'Packed as per export standards'}</p>
                      <div className="mt-4">
                        <p className="text-gray-500 text-[8px] mb-1">HS CODE:</p>
                        <p className="font-bold">{order.hsn_code || '08011910'}</p>
                      </div>
                    </td>
                    <td className="p-4 text-center align-top border-r-[1px] border-black">
                      <div className="bg-blue-50 text-blue-800 p-1 rounded font-bold text-[12px]">"P"</div>
                      <p className="text-[7px] mt-1 text-gray-500 uppercase">(Wholly Obtained)</p>
                    </td>
                    <td className="p-4 text-center align-top font-bold uppercase">{order.quantity} {order.unit}</td>
                  </tr>
                  
                  {/* Filler space */}
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
                    Authorized Signatory for SHASTIKA GLOBAL IMPEX PVT LTD
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

          {/* Footer info */}
          <div className="bg-gray-800 text-white p-1 text-center text-[7px] uppercase tracking-[5px] font-bold">
             Official Document · Issued by Shastika Global Impex ERP
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 10mm; size: A4; }
          body { background: white !important; margin: 0 !important; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .shadow-xl { box-shadow: none !important; }
          .max-w-\\[210mm\\] { max-width: 100% !important; width: 100% !important; margin: 0 !important; }
        }
      `}} />
    </div>
  );
}
