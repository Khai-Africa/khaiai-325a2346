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
    const { action, projectId, files, branch = 'main', commitMessage } = await req.json();

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

    // Get project and GitHub connection
    const { data: project, error: projectError } = await supabase
      .from('codex_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!project.github_repo_url) {
      return new Response(JSON.stringify({ error: 'No GitHub repository connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get GitHub token
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'github')
      .maybeSingle();

    if (!tokenData || !tokenData.access_token) {
      return new Response(JSON.stringify({ 
        error: 'GitHub not authenticated',
        message: 'Please authenticate with GitHub in your user profile settings'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const githubToken = tokenData.access_token;
    
    // Extract owner and repo from URL
    const repoMatch = project.github_repo_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      return new Response(JSON.stringify({ error: 'Invalid GitHub repository URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [, owner, repo] = repoMatch;

    if (action === 'push') {
      // Push files to GitHub
      const results = [];
      
      for (const file of files) {
        try {
          // Get current file SHA if it exists
          let sha: string | undefined;
          try {
            const getFileResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`,
              {
                headers: {
                  'Authorization': `Bearer ${githubToken}`,
                  'Accept': 'application/vnd.github.v3+json',
                },
              }
            );
            
            if (getFileResponse.ok) {
              const existingFile = await getFileResponse.json();
              sha = existingFile.sha;
            }
          } catch (error) {
            // File doesn't exist, that's okay
            console.log(`File ${file.path} doesn't exist, will create new`);
          }

          // Create or update file
          const content = btoa(file.content); // Base64 encode
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: commitMessage || `Update ${file.path} via Codex`,
                content,
                sha,
                branch,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.json();
            results.push({ path: file.path, success: false, error: error.message });
          } else {
            results.push({ path: file.path, success: true });
          }
        } catch (error: any) {
          results.push({ path: file.path, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      return new Response(JSON.stringify({ 
        success: successCount > 0,
        results,
        message: `Pushed ${successCount} of ${files.length} files to GitHub`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'pull') {
      // Pull files from GitHub
      const pulledFiles = [];

      for (const filePath of files) {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
            {
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
              },
            }
          );

          if (!response.ok) {
            continue;
          }

          const fileData = await response.json();
          const content = atob(fileData.content); // Decode base64

          pulledFiles.push({
            path: filePath,
            content,
            sha: fileData.sha,
          });
        } catch (error) {
          console.error(`Error pulling ${filePath}:`, error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        files: pulledFiles,
        message: `Pulled ${pulledFiles.length} files from GitHub`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in github-sync:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
