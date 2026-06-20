import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function previewDocument(filename: string) {
  const newTab = window.open("", "_blank");
  if (!newTab) return;

  const dateStr = new Date().toLocaleDateString();
  const docId = filename.split('.')[0];
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PI PREVIEW - ` + filename + `</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 40px;
          display: flex;
          justify-content: center;
        }
        .page {
          background: white;
          width: 210mm;
          min-height: 297mm;
          padding: 40px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          box-sizing: border-box;
        }
        .header {
          border-bottom: 2px solid #111827;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0 0 10px 0;
          color: #111827;
          font-size: 24px;
        }
        .meta {
          color: #6b7280;
          font-size: 14px;
        }
        .content {
          color: #374151;
          line-height: 1.6;
        }
        .detail-row {
          display: flex;
          margin-bottom: 15px;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 10px;
        }
        .detail-label {
          font-weight: 600;
          width: 150px;
          color: #111827;
        }
        .detail-value {
          flex: 1;
        }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          background: #dcfce7;
          color: #166534;
          font-weight: 500;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <h1>SGI - PROFORMA INVOICE PREVIEW</h1>
          <div class="meta">Generated: ` + dateStr + `</div>
        </div>
        
        <div class="content">
          <p style="margin-bottom: 30px;">
            This is an auto-generated preview of the document. Since this module is currently using mock data, this preview serves as a placeholder.
          </p>
          
          <h2 style="font-size: 18px; margin-bottom: 20px;">Document Details</h2>
          
          <div class="detail-row">
            <div class="detail-label">File Name</div>
            <div class="detail-value" style="font-family: monospace;">` + filename + `</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Document ID</div>
            <div class="detail-value">` + docId + `</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Status</div>
            <div class="detail-value"><span class="badge">Approved</span></div>
          </div>
          
          <div style="margin-top: 60px; padding-top: 20px; border-top: 1px dashed #d1d5db; text-align: center; color: #9ca3af; font-size: 14px;">
            End of Document
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  newTab.document.open();
  newTab.document.write(html);
  newTab.document.close();
}
