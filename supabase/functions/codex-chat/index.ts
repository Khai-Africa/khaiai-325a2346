import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, projectId } = await req.json();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get project context
    const { data: project } = await supabase
      .from('codex_projects')
      .select('name, description')
      .eq('id', projectId)
      .single();

    // Get recent files for context
    const { data: files } = await supabase
      .from('codex_files')
      .select('file_name, file_type, file_content')
      .eq('project_id', projectId)
      .limit(5);

    // Get conversation history
    const { data: history } = await supabase
      .from('codex_chat_messages')
      .select('role, content')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(20);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build context
    let contextMessage = `You are an expert coding assistant helping with the project "${project?.name || 'Untitled Project'}".`;
    
    if (project?.description) {
      contextMessage += `\n\nProject description: ${project.description}`;
    }

    if (files && files.length > 0) {
      contextMessage += '\n\nRecent project files:\n';
      files.forEach(file => {
        contextMessage += `\n${file.file_name} (${file.file_type}):\n\`\`\`\n${file.file_content.substring(0, 500)}${file.file_content.length > 500 ? '...' : ''}\n\`\`\`\n`;
      });
    }

    contextMessage += '\n\nProvide helpful, concise coding advice and solutions. When suggesting code, provide complete, working examples.';

    // Build messages array
    const messages = [
      { role: 'system', content: contextMessage },
      ...(history || []).map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];

    // Save user message
    await supabase
      .from('codex_chat_messages')
      .insert({
        project_id: projectId,
        user_id: user.id,
        role: 'user',
        content: message,
      });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream the response and collect the full content
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullContent += content;
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }

            // Forward the chunk to the client
            controller.enqueue(value);
          }

          // After streaming completes, save the assistant message and detect code blocks
          if (fullContent) {
            // Save assistant message
            await supabase
              .from('codex_chat_messages')
              .insert({
                project_id: projectId,
                user_id: user.id,
                role: 'assistant',
                content: fullContent,
              });

            // Detect and save code blocks
            const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
            const matches = [...fullContent.matchAll(codeBlockRegex)];
            const createdFiles = [];

            for (const match of matches) {
              const language = match[1] || 'txt';
              const code = match[2].trim();
              
              if (code) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const extension = getFileExtension(language);
                const fileName = `chat_generated_${timestamp}${extension}`;

                const { data: fileData, error: fileError } = await supabase
                  .from('codex_files')
                  .insert({
                    project_id: projectId,
                    user_id: user.id,
                    file_name: fileName,
                    file_path: `/${fileName}`,
                    file_type: language,
                    file_content: code,
                    file_size: code.length,
                    is_modified: false,
                  })
                  .select()
                  .single();

                if (!fileError && fileData) {
                  createdFiles.push({ fileName, fileId: fileData.id });
                }
              }
            }

            // Send file creation info as final event
            if (createdFiles.length > 0) {
              const fileInfoEvent = `data: ${JSON.stringify({ type: 'files_created', files: createdFiles })}\n\n`;
              controller.enqueue(encoder.encode(fileInfoEvent));
            }
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error in codex-chat:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getFileExtension(language: string): string {
  const extensionMap: Record<string, string> = {
    javascript: '.js',
    js: '.js',
    typescript: '.ts',
    ts: '.ts',
    jsx: '.jsx',
    tsx: '.tsx',
    python: '.py',
    py: '.py',
    java: '.java',
    cpp: '.cpp',
    'c++': '.cpp',
    c: '.c',
    html: '.html',
    css: '.css',
    json: '.json',
    xml: '.xml',
    sql: '.sql',
    shell: '.sh',
    bash: '.sh',
    yaml: '.yaml',
    yml: '.yml',
    markdown: '.md',
    md: '.md',
  };
  
  return extensionMap[language.toLowerCase()] || '.txt';
}
