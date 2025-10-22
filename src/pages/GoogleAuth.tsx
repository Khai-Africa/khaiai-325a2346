import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const GoogleAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state"); // This is the service (drive/calendar)
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        toast.error("Authorization cancelled");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        toast.error("Invalid callback parameters");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const { data, error: exchangeError } = await supabase.functions.invoke(
          "google-oauth",
          {
            body: { action: "exchange", code, service: state },
          }
        );

        if (exchangeError) throw exchangeError;
        if (data.error) throw new Error(data.error);

        setStatus("success");
        const serviceName = state === "drive" ? "Google Drive" : "Google Calendar";
        toast.success(`${serviceName} connected successfully!`);
        setTimeout(() => navigate("/"), 2000);
      } catch (err) {
        console.error("OAuth error:", err);
        setStatus("error");
        toast.error("Failed to connect. Please try again.");
        setTimeout(() => navigate("/"), 2000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="text-lg text-muted-foreground">Connecting your account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg text-foreground">Connected successfully!</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg text-foreground">Connection failed</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleAuth;
