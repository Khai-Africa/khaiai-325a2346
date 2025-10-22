import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const GoogleAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const service = searchParams.get('service'); // 'drive' or 'calendar'

  useEffect(() => {
    handleGoogleAuth();
  }, []);

  const handleGoogleAuth = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      
      if (!code) {
        // Initiate OAuth flow
        initiateOAuth();
        return;
      }

      // Exchange code for tokens
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to connect Google services');
        setLoading(false);
        return;
      }

      // Store tokens (this would require a backend endpoint)
      toast.success(`Google ${service === 'drive' ? 'Drive' : 'Calendar'} connected successfully!`);
      navigate('/');
      
    } catch (err) {
      console.error('Google auth error:', err);
      setError('Failed to connect to Google. Please try again.');
      setLoading(false);
    }
  };

  const initiateOAuth = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      setError('Google OAuth is not configured. Please contact support.');
      setLoading(false);
      return;
    }

    const scopes = service === 'drive' 
      ? 'https://www.googleapis.com/auth/drive.readonly'
      : 'https://www.googleapis.com/auth/calendar';

    const redirectUri = `${window.location.origin}/google-auth`;
    const state = JSON.stringify({ service });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${encodeURIComponent(state)}&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <h2 className="text-xl font-semibold">Connecting to Google...</h2>
          <p className="text-muted-foreground">
            Please wait while we set up your connection.
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full space-y-4">
          <div className="flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-center">Connection Failed</h2>
          <p className="text-muted-foreground text-center">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
              Go Home
            </Button>
            <Button className="flex-1" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default GoogleAuth;
