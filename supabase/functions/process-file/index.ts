import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-FILE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const conversationId = formData.get("conversationId") as string;

    if (!file) throw new Error("No file provided");
    
    logStep("File received", { 
      name: file.name, 
      type: file.type, 
      size: file.size 
    });

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("File size exceeds 20MB limit");
    }

    let extractedText = "";
    const fileType = file.type;

    // Process based on file type
    if (fileType.startsWith("text/") || 
        fileType === "application/json" ||
        fileType === "application/xml") {
      // Plain text files
      extractedText = await file.text();
      logStep("Text file processed");
    } else if (fileType === "application/pdf") {
      // For PDF processing, you would need a PDF parsing library
      // For now, we'll store it and note it needs processing
      extractedText = "[PDF file uploaded - text extraction not yet implemented]";
      logStep("PDF file detected");
    } else if (fileType.startsWith("image/")) {
      // For images, we could use OCR or vision API
      extractedText = "[Image file uploaded - OCR not yet implemented]";
      logStep("Image file detected");
    } else {
      extractedText = `[${file.name} uploaded]`;
      logStep("Other file type");
    }

    // Store file metadata in database
    const { data: fileRecord, error: insertError } = await supabaseClient
      .from("uploaded_files")
      .insert({
        user_id: user.id,
        conversation_id: conversationId || null,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        extracted_text: extractedText.substring(0, 10000), // Limit to 10k chars
        metadata: {
          original_name: file.name,
          processed_at: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (insertError) {
      logStep("Database insert error", insertError);
      throw new Error(`Failed to store file: ${insertError.message}`);
    }

    logStep("File processed successfully", { fileId: fileRecord.id });

    return new Response(
      JSON.stringify({
        success: true,
        fileId: fileRecord.id,
        fileName: file.name,
        extractedText: extractedText.substring(0, 1000), // Return first 1k chars
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
