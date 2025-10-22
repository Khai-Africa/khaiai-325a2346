import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { operation, targetUserId, role } = await req.json();

    let result;

    switch (operation) {
      case "list_users":
        // Get all users with their emails and roles
        const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (usersError) throw usersError;

        // Get additional user data
        const userIds = users.users.map(u => u.id);
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("id, username, created_at")
          .in("id", userIds);

        const { data: roles } = await supabaseClient
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const { data: usage } = await supabaseClient
          .from("user_usage")
          .select("user_id, message_count, image_count")
          .in("user_id", userIds);

        // Combine all data
        const enrichedUsers = users.users.map(user => {
          const profile = profiles?.find(p => p.id === user.id);
          const userRoles = roles?.filter(r => r.user_id === user.id) || [];
          const userUsage = usage?.filter(u => u.user_id === user.id) || [];
          
          return {
            id: user.id,
            email: user.email,
            username: profile?.username,
            created_at: profile?.created_at || user.created_at,
            roles: userRoles.map(r => r.role),
            message_count: userUsage.reduce((sum, u) => sum + (u.message_count || 0), 0),
            image_count: userUsage.reduce((sum, u) => sum + (u.image_count || 0), 0),
          };
        });

        result = { users: enrichedUsers };
        break;

      case "delete_user":
        if (!targetUserId) throw new Error("Target user ID required");
        
        // Log the action
        await supabaseClient.from("admin_logs").insert({
          admin_id: userData.user.id,
          action: "delete_user",
          target_user_id: targetUserId,
          details: { timestamp: new Date().toISOString() },
        });

        // Delete the user using admin API
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        
        if (deleteError) throw deleteError;
        
        result = { success: true, message: "User deleted successfully" };
        break;

      case "update_role":
        if (!targetUserId || !role) throw new Error("Target user ID and role required");
        
        // Check if role exists
        const { data: existingRole } = await supabaseClient
          .from("user_roles")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("role", role)
          .single();

        if (existingRole) {
          // Remove role
          await supabaseClient
            .from("user_roles")
            .delete()
            .eq("id", existingRole.id);
          
          await supabaseClient.from("admin_logs").insert({
            admin_id: userData.user.id,
            action: "remove_role",
            target_user_id: targetUserId,
            details: { role, timestamp: new Date().toISOString() },
          });

          result = { success: true, message: `Role ${role} removed` };
        } else {
          // Add role
          await supabaseClient
            .from("user_roles")
            .insert({ user_id: targetUserId, role });
          
          await supabaseClient.from("admin_logs").insert({
            admin_id: userData.user.id,
            action: "add_role",
            target_user_id: targetUserId,
            details: { role, timestamp: new Date().toISOString() },
          });

          result = { success: true, message: `Role ${role} added` };
        }
        break;

      default:
        throw new Error("Invalid operation");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Admin operation error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
