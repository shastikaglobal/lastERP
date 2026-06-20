import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("ZOHO_OFFICE_INTEGRATOR_API_KEY");
    const domain = Deno.env.get("ZOHO_OFFICE_INTEGRATOR_DOMAIN") || "zoho.in"; // Can be zoho.com or zoho.in

    if (!apiKey) {
      throw new Error("ZOHO_OFFICE_INTEGRATOR_API_KEY is not set in Supabase Secrets.");
    }

    // ==========================================
    // ACTION: SAVE (Zoho Webhook Callback)
    // ==========================================
    if (action === "save") {
      const storagePath = url.searchParams.get("path");
      if (!storagePath) throw new Error("Missing storage path for save action.");

      console.log(`Received save webhook from Zoho for path: ${storagePath}`);

      // Zoho sends the updated file in a multipart form-data under the 'content' field
      const formData = await req.formData();
      const file = formData.get("content");

      if (!file || !(file instanceof File)) {
        throw new Error("No file content found in Zoho callback payload.");
      }

      const fileBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileBuffer);

      // Save updated document back to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("email-attachments")
        .upload(storagePath, uint8Array, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        console.error("Failed to save updated file from Zoho back to Storage:", uploadError);
        return new Response(JSON.stringify({ status: "failure", error: uploadError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`Successfully saved updated sheet to Supabase Storage path: ${storagePath}`);
      return new Response(JSON.stringify({ status: "success" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ==========================================
    // ACTION: CREATE SESSION
    // ==========================================
    const { path, filename, displayName, userId } = await req.json();

    if (!path || !filename) {
      throw new Error("Missing required parameters: path or filename.");
    }

    console.log(`Creating Zoho Office Integrator session for: ${filename} (${path})`);

    // 1. Download file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("email-attachments")
      .download(path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download attachment from storage: ${downloadError?.message || "File empty"}`);
    }

    // 2. Determine the correct MIME type from filename extension
    let ext = filename.toLowerCase().split('.').pop() || "";
    // If filename has no extension (split returned the whole filename), force xlsx
    if (ext === filename.toLowerCase()) {
      ext = "xlsx";
    }

    const mimeMap: Record<string, string> = {
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      csv: "text/csv",
      ods: "application/vnd.oasis.opendocument.spreadsheet",
      tsv: "text/tab-separated-values",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      odt: "application/vnd.oasis.opendocument.text",
      rtf: "application/rtf",
      txt: "text/plain",
      html: "text/html",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      odp: "application/vnd.oasis.opendocument.presentation",
      pdf: "application/pdf",
    };
    
    // Default to spreadsheet if unknown
    const correctMime = mimeMap[ext] || mimeMap["xlsx"];
    
    // Determine which Zoho API to use based on file type
    const documentExts = ["doc", "docx", "odt", "rtf", "txt", "html"];
    const presentationExts = ["ppt", "pptx", "odp"];
    
    // User explicitly wants Zoho Sheet for everything including PDFs (likely a misnamed spreadsheet)
    let zohoApiPath = "sheet/officeapi/v1/spreadsheet"; // default: spreadsheet
    let saveFormat = "xlsx";
    if (documentExts.includes(ext)) {
      zohoApiPath = "writer/officeapi/v1/document";
      saveFormat = "docx";
    } else if (presentationExts.includes(ext)) {
      zohoApiPath = "show/officeapi/v1/presentation";
      saveFormat = "pptx";
    }

    // 3. Prepare Zoho request with correct MIME type
    const zohoFormData = new FormData();
    zohoFormData.append("apikey", apiKey);
    
    // Create a new Blob with the correct MIME type so Zoho recognizes the format
    let finalExt = ext;
    if (ext === "pdf" || ext === "application/octet-stream") {
      finalExt = "xlsx"; // Force spreadsheet for PDFs based on user request
      correctMime = mimeMap["xlsx"];
    }
    const correctBlob = new Blob([await fileData.arrayBuffer()], { type: correctMime });
    
    // If filename doesn't have an extension, append the guessed one so Zoho knows how to parse it
    // If it's a PDF, we replace .pdf with .xlsx so Zoho Sheet accepts it
    let finalFilename = filename;
    if (ext === "pdf" && filename.toLowerCase().endsWith(".pdf")) {
      finalFilename = filename.slice(0, -4) + ".xlsx";
    } else if (!filename.toLowerCase().endsWith(`.${finalExt}`)) {
      finalFilename = `${filename}.${finalExt}`;
    }
    
    zohoFormData.append("document", correctBlob, finalFilename);

    const docId = path.replace(/[^a-zA-Z0-9]/g, "-"); // Create clean document ID
    zohoFormData.append(
      "document_info",
      JSON.stringify({
        document_id: docId,
        document_name: finalFilename
      })
    );

    // Save URL links back to this same function with action=save
    const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/zoho-office-integrator?action=save&path=${encodeURIComponent(path)}`;
    zohoFormData.append(
      "callback_settings",
      JSON.stringify({
        save_url: functionUrl,
        save_format: saveFormat,
      })
    );

    zohoFormData.append(
      "user_info",
      JSON.stringify({
        user_id: userId || "erp-user",
        display_name: displayName || "ERP User",
      })
    );

    zohoFormData.append(
      "editor_settings",
      JSON.stringify({
        language: "en",
      })
    );

    // 4. Request Session URL from Zoho Office Integrator
    const tld = domain.split('.').pop() || "in";
    const zohoUrl = `https://api.office-integrator.${tld}/${zohoApiPath}`;
    console.log(`Sending session request to Zoho URL: ${zohoUrl} (ext: ${ext}, mime: ${correctMime})`);
    
    const zohoResponse = await fetch(zohoUrl, {
      method: "POST",
      body: zohoFormData,
    });

    const responseText = await zohoResponse.text();
    console.log(`Zoho response (status ${zohoResponse.status}): ${responseText.slice(0, 1000)}`);

    let zohoResult;
    try {
      zohoResult = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse Zoho API response (Status ${zohoResponse.status}): ${responseText.slice(0, 300)}`);
    }

    // Check for errors in the response body too (Zoho sometimes returns 200 with error)
    if (!zohoResponse.ok || zohoResult.error || (!zohoResult.document_url && !zohoResult.documentUrl)) {
      const errMsg = zohoResult.message || zohoResult.error || JSON.stringify(zohoResult);
      throw new Error(`Zoho API Error: ${errMsg} | Debug: file="${filename}", ext="${ext}", mime="${correctMime}", api="${zohoApiPath}", status=${zohoResponse.status}`);
    }

    const editorUrl = zohoResult.document_url || zohoResult.documentUrl;
    console.log(`Successfully created Zoho session. Editor URL: ${editorUrl}`);

    return new Response(JSON.stringify({ 
      success: true, 
      document_url: editorUrl
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Zoho Office Integrator Session Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
