import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Printer, FileUp, RefreshCcw, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DocumentViewer() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type. Please upload PDF, JPG, or PNG.");
      return;
    }

    setFile(selectedFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    toast.success("Document loaded successfully");
  };

  const handlePrint = () => {
    if (!previewUrl || !file) return;

    if (file.type === 'application/pdf') {
      // For PDFs, opening in a new tab is the most reliable way to preserve high resolution and formatting
      window.open(previewUrl, '_blank');
    } else {
      // For images, we create a dedicated print window to avoid app UI clutter
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print - ${file.name}</title>
              <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                img { max-width: 100%; height: auto; margin: auto; }
              </style>
            </head>
            <body>
              <img src="${previewUrl}" onload="window.print();window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-20 selection:bg-amber-500/30">
      <div className="print:hidden">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
        />

        <PageHeader 
          title="Document Viewer" 
          description="Manage and preview your export documentation suite" 
          breadcrumbs={[{ label: "Documents" }, { label: "Viewer" }]}
          actions={
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(-1)}
                className="text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              {file && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white text-xs"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" /> Edit / Correct
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handlePrint}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 shadow-lg shadow-amber-500/20 transition-all active:scale-95 text-xs"
                  >
                    <Printer className="h-4 w-4 mr-2" /> Print Preview
                  </Button>
                </>
              )}
            </div>
          } 
        />
      </div>

      <div className="px-6 mx-auto max-w-6xl mt-8">
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative cursor-pointer border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-3xl bg-slate-900/50 backdrop-blur-sm min-h-[500px] flex flex-col items-center justify-center p-20 transition-all duration-500 hover:shadow-2xl hover:shadow-amber-500/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="bg-slate-800 p-8 rounded-full mb-8 group-hover:scale-110 group-hover:bg-slate-700 transition-all duration-500 shadow-xl">
              <FileUp className="h-14 w-14 text-amber-500" />
            </div>
            
            <h3 className="text-2xl font-bold mb-3 tracking-tight text-white">Select Export Document</h3>
            <p className="text-slate-500 text-center max-w-xs mb-10 leading-relaxed font-medium">
              Upload PDF, JPG, or PNG files for instant high-fidelity viewing and professional printing.
            </p>
            
            <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-10 py-7 rounded-2xl text-base shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
              Pick from Computer
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Info Section */}
            <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-white/5 print:hidden shadow-xl">
              <div className="flex items-center gap-5">
                <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  {file.type === 'application/pdf' ? (
                    <FileText className="h-6 w-6 text-amber-500" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-1">Active Documentation</div>
                  <div className="font-bold text-lg text-white truncate max-w-lg">{file.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right print:hidden">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Print Status</div>
                    <div className="text-xs font-bold text-emerald-500 flex items-center gap-1.5 justify-end">
                       <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ready for Export
                    </div>
                 </div>
                 <div className="w-[1px] h-10 bg-slate-800 mx-2" />
                 <Button onClick={handlePrint} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-8 py-6 rounded-xl shadow-lg shadow-amber-500/10 transition-all active:scale-95">
                  <Printer className="h-4 w-4 mr-2" /> Print Document
                </Button>
              </div>
            </div>

            {/* Document Container */}
            <div className="document-print-area bg-white min-h-[1000px] flex items-start justify-center overflow-hidden transition-all duration-500 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
              {file.type === 'application/pdf' ? (
                <iframe 
                  src={previewUrl + '#view=FitH&toolbar=0'} 
                  className="w-full min-h-[1000px] border-none"
                  title="PDF Preview"
                />
              ) : (
                <img 
                  src={previewUrl} 
                  alt="Document Preview" 
                  className="w-full h-auto block"
                />
              )}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            margin: 0 !important; 
            size: auto;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          aside, header, nav, footer, .print\\:hidden, #notif-bell-btn { 
            display: none !important; 
          }

          body * {
            visibility: hidden !important;
          }

          .document-print-area, .document-print-area * {
            visibility: visible !important;
          }

          .document-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }

          iframe, img {
            width: 100% !important;
            height: 100vh !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
        }
      `}} />
    </div>
  );
}
