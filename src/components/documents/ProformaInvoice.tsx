import React, { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProformaInvoiceProps {
  shipment: any;
  onClose: () => void;
}

export function ProformaInvoice({ shipment, onClose }: ProformaInvoiceProps) {
  if (!shipment) return null;

  useEffect(() => {
    // Automatically trigger print dialog after a short delay to allow logo/fonts to load
    const timer = setTimeout(() => {
      window.print();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  try {
    // Supabase often returns joined data as an array. We handle both cases here.
    const order = Array.isArray(shipment.export_orders) 
      ? (shipment.export_orders[0] || {}) 
      : (shipment.export_orders || {});
      
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const validityDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const totalAmount = Number(order.total_amount || 0);
    const currencySym = order.currency === 'USD' ? '$' : (order.currency || '');

    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md overflow-auto p-4 flex justify-center items-start py-12">
        <div className="relative w-full max-w-[210mm] print:m-0 animate-in fade-in zoom-in duration-300">
          
          {/* Floating Controls */}
          <div className="absolute -top-14 left-0 right-0 flex justify-between items-center print:hidden px-2">
            <div className="flex gap-3">
              <Button onClick={handlePrint} className="bg-[#1A5276] text-white hover:bg-[#154360] shadow-lg rounded-full px-6">
                <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
              </Button>
            </div>
            <Button variant="outline" onClick={onClose} className="bg-white/10 text-white hover:bg-white/20 border-white/20 rounded-full h-10 w-10 p-0">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* The Invoice Document */}
          <div className="bg-white text-black shadow-2xl min-h-[297mm] flex flex-col font-sans relative border-[2px] border-black box-border">
            
            {/* Watermark Logo */}
            <div className="absolute top-[30%] left-[20%] right-[20%] bottom-[30%] z-0 flex items-center justify-center opacity-15 pointer-events-none">
              <img src="/logo.webp" alt="Watermark" className="w-full h-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
            </div>

            {/* Content Container (z-10) */}
            <div className="relative z-10 flex flex-col flex-1">
              
              {/* Header Row */}
              <div className="grid grid-cols-2 border-b-[2px] border-black min-h-[160px]">
                {/* Left Section */}
                <div className="p-4 border-r-[2px] border-black flex flex-col justify-center">
                  <h1 className="font-bold text-[14px] text-[#1A5276] text-center mb-6">SHASTIKA GLOBAL IMPEX PRIVATE LIMITED</h1>
                  <div className="flex items-center gap-6 px-4">
                    <img src="/logo.webp" alt="Logo" className="w-20 h-20 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    <div className="flex flex-col space-y-2 text-[10px]">
                      <div className="grid grid-cols-[60px_1fr]"><span>Address:</span> <span>41/1, ST-5, Sathy Athani Main Road,</span></div>
                      <div className="grid grid-cols-[60px_1fr]"><span></span> <span>Thuckanayakanpalayam</span></div>
                      <div className="grid grid-cols-[60px_1fr]"><span></span> <span>Erode - 638506, Tamil Nadu, India.</span></div>
                      <div className="grid grid-cols-[60px_1fr] mt-2"><span>Phone no:</span> <span className="font-bold">7397612015</span></div>
                      <div className="grid grid-cols-[60px_1fr]"><span>GSTIN:</span> <span className="font-bold">33ABPCS0605LIZ8</span></div>
                    </div>
                  </div>
                </div>
                {/* Right Section */}
                <div className="p-6 flex flex-col justify-center items-center">
                  <h2 className="font-bold text-[16px] text-[#1A5276] tracking-wide mb-8">PROFORMA INVOICE</h2>
                  <div className="w-full max-w-[200px] text-[10px] space-y-4">
                    <div className="grid grid-cols-[90px_1fr]"><span>PI NO :</span> <span className="font-bold">{String(order.order_number || '').replace('EXP', 'PI') || 'TBD'}</span></div>
                    <div className="grid grid-cols-[90px_1fr]"><span>DATE :</span> <span className="font-bold">{today}</span></div>
                    <div className="grid grid-cols-[90px_1fr]"><span>VALID PI DATE :</span> <span className="font-bold">{validityDate}</span></div>
                  </div>
                </div>
              </div>

              {/* Sub Header Titles */}
              <div className="grid grid-cols-[30%_35%_35%] border-b-[1px] border-black text-[10px] font-bold text-[#1A5276] uppercase text-center h-8 items-center">
                <div className="border-r-[1px] border-black h-full flex items-center justify-center">BILL TO :</div>
                <div className="border-r-[1px] border-black h-full flex items-center justify-center">SHIPMENT & TRADE TERMS</div>
                <div className="h-full flex items-center justify-center">PACKING DETAILS</div>
              </div>

              {/* Grid Section Content */}
              <div className="grid grid-cols-[30%_35%_35%] border-b-[2px] border-black min-h-[160px] text-[10px]">
                {/* Bill To */}
                <div className="p-4 border-r-[1px] border-black">
                  <div className="font-bold text-[12px]">{shipment.customer_name}</div>
                  <div className="text-gray-800 mt-2 whitespace-pre-wrap leading-relaxed">{order.shipping_address || order.customer_country || ''}</div>
                </div>
                
                {/* Shipment & Trade Terms */}
                <div className="p-4 border-r-[1px] border-black">
                  <div className="space-y-3">
                    <div className="grid grid-cols-[130px_1fr]"><span>Country of Origin :</span> <span className="font-bold">India</span></div>
                    <div className="grid grid-cols-[130px_1fr]"><span>Mode of Transport :</span> <span className="font-bold">Sea</span></div>
                    <div className="grid grid-cols-[130px_1fr]"><span>Incoterms :</span> <span className="font-bold">{order.incoterms || 'CIF'}</span></div>
                    <div className="grid grid-cols-[130px_1fr]"><span>Port of Loading :</span> <span className="font-bold">{shipment.origin_port}</span></div>
                    <div className="grid grid-cols-[130px_1fr]"><span>Port of Discharge :</span> <span className="font-bold">{shipment.destination_port}</span></div>
                    <div className="grid grid-cols-[130px_1fr]"><span>Estimated shipment date :</span> <span className="font-bold">{shipment.departure_date ? new Date(shipment.departure_date).toLocaleDateString('en-GB') : 'TBD'}</span></div>
                  </div>
                </div>

                {/* Packing Details */}
                <div className="p-4">
                  <div className="grid grid-cols-[90px_1fr]"><span>Packing Type:</span> <span className="font-bold">{order.packing_details || '13 Kg Box'}</span></div>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 flex flex-col">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-[1px] border-black text-[10px] font-bold text-[#1A5276] uppercase h-10">
                      <th className="border-r-[1px] border-black w-10 text-center">ID</th>
                      <th className="border-r-[1px] border-black px-2 text-center">DESCRIPTION</th>
                      <th className="border-r-[1px] border-black w-20 text-center">HSN</th>
                      <th className="border-r-[1px] border-black w-20 text-center">QUANTITY</th>
                      <th className="border-r-[1px] border-black w-16 text-center">UNIT</th>
                      <th className="border-r-[1px] border-black w-24 text-center">PRICE</th>
                      <th className="w-28 text-center">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px]">
                    <tr className="border-b-[1px] border-black h-12 align-top">
                      <td className="border-r-[1px] border-black text-center pt-2">1</td>
                      <td className="border-r-[1px] border-black px-2 pt-2">{order.product || ''}</td>
                      <td className="border-r-[1px] border-black text-center pt-2">{order.hsn_code || ''}</td>
                      <td className="border-r-[1px] border-black text-center pt-2">{order.quantity || ''}</td>
                      <td className="border-r-[1px] border-black text-center pt-2">{order.unit || ''}</td>
                      <td className="border-r-[1px] border-black text-center pt-2">
                        {order.unit_price ? `${currencySym} ${Number(order.unit_price).toLocaleString()}` : ''}
                      </td>
                      <td className="text-center pt-2">
                        {totalAmount ? `${currencySym} ${totalAmount.toLocaleString()}` : ''}
                      </td>
                    </tr>
                    {/* Empty Rows */}
                    {[...Array(4)].map((_, i) => (
                      <tr key={i} className="h-10 border-b-[1px] border-black">
                        <td className="border-r-[1px] border-black"></td>
                        <td className="border-r-[1px] border-black"></td>
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

              {/* Footer Row */}
              <div className="grid grid-cols-[50%_50%] border-t-[2px] border-black min-h-[160px]">
                {/* Legal/Terms */}
                <div className="border-r-[2px] border-black text-[10px] flex flex-col justify-between">
                  <div className="border-b-[1px] border-black p-3 flex-1">
                    <h4 className="font-bold text-[#1A5276] mb-2">Terms of Payment</h4>
                    <p className="leading-relaxed mb-4">
                      90 % of the invoice value to be paid in advance, and the remaining 10 % of the invoice value to be paid after the loading of goods.
                    </p>
                    <p className="leading-relaxed">
                      Note : Including packing, loading and Transport.
                    </p>
                  </div>
                  <div className="p-3 h-20">
                    <p className="leading-relaxed">
                      Declaration : We hereby certify that the goods mentioned above are of Indian origin and the price and details stated in this proforma invoice are true and correct.
                    </p>
                  </div>
                </div>

                {/* Totals & Signature */}
                <div className="flex flex-col">
                  <div className="flex flex-col border-b-[2px] border-black text-[10px]">
                    <div className="grid grid-cols-2 border-b-[1px] border-black px-3 py-2">
                      <span>SUB TOTAL</span>
                      <span className="text-right">{currencySym} {totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 border-b-[1px] border-black px-3 py-2">
                      <span>Tax Rate</span>
                      <span className="text-right">0%</span>
                    </div>
                    <div className="grid grid-cols-2 border-b-[1px] border-black px-3 py-2">
                      <span>Tax</span>
                      <span className="text-right">0.00</span>
                    </div>
                    <div className="grid grid-cols-2 bg-[#BDD7EE] px-3 py-2 text-[11px]">
                      <span>Total</span>
                      <span className="text-right">{currencySym} {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="p-3 flex flex-col justify-between flex-1 text-[10px] min-h-[100px]">
                    <div className="mb-4">FOR SHASTIKA GLOBAL IMPEX PRIVATE LIMITED</div>
                    <div className="mt-auto space-y-4">
                      <div>Authorized Signatory :</div>
                      <div>Seal & Sign :</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 10mm; size: A4; }
            body { background: white !important; -webkit-print-color-adjust: exact; }
            .fixed { position: absolute !important; inset: 0 !important; padding: 0 !important; background: white !important; backdrop-filter: none !important; }
            .print\\:hidden { display: none !important; }
            .shadow-2xl { box-shadow: none !important; }
            .max-w-\\[210mm\\] { max-width: 100% !important; width: 100% !important; margin: 0 !important; }
          }
        `}} />
      </div>
    );
  } catch (error: any) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg max-w-lg w-full text-black">
          <h2 className="text-red-600 text-xl font-bold mb-4">Error Rendering Invoice</h2>
          <p className="mb-4">An error occurred while displaying the invoice data. This usually means some expected order data is missing or malformed.</p>
          <pre className="bg-slate-100 p-4 rounded text-xs overflow-auto font-mono text-red-500 mb-6">
            {error.message || String(error)}
          </pre>
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        </div>
      </div>
    );
  }
}

