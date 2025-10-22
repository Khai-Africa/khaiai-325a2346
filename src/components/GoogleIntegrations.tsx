import { useState, useEffect } from "react";
import { Calendar, HardDrive, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const GoogleIntegrations = () => {
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<'calendar' | 'drive' | null>(null);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tokens } = await supabase
        .from('user_tokens')
        .select('provider')
        .eq('user_id', user.id)
        .in('provider', ['google_calendar', 'google_drive']);

      if (tokens) {
        setCalendarConnected(tokens.some(t => t.provider === 'google_calendar'));
        setDriveConnected(tokens.some(t => t.provider === 'google_drive'));
      }
    } catch (error) {
      console.error('Error checking connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (service: 'calendar' | 'drive') => {
    setConnecting(service);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to connect Google services");
        return;
      }

      const functionName = service === 'calendar' ? 'google-calendar' : 'google-drive';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'authorize' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth flow in new window
        const authWindow = window.open(data.authUrl, '_blank', 'width=600,height=700');
        
        // Listen for successful OAuth
        const checkInterval = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkInterval);
            checkConnections();
            toast.success(`Google ${service === 'calendar' ? 'Calendar' : 'Drive'} connected!`);
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error(`Error connecting ${service}:`, error);
      toast.error(error.message || `Failed to connect Google ${service}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (service: 'calendar' | 'drive') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const provider = service === 'calendar' ? 'google_calendar' : 'google_drive';
      
      const { error } = await supabase
        .from('user_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (error) throw error;

      if (service === 'calendar') {
        setCalendarConnected(false);
      } else {
        setDriveConnected(false);
      }

      toast.success(`Google ${service === 'calendar' ? 'Calendar' : 'Drive'} disconnected`);
    } catch (error: any) {
      console.error(`Error disconnecting ${service}:`, error);
      toast.error(`Failed to disconnect Google ${service}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <CardTitle>Google Calendar</CardTitle>
          </div>
          <CardDescription>
            Connect your Google Calendar to sync events and schedule tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {calendarConnected ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Connected to Google Calendar</p>
                  <p className="text-sm text-muted-foreground">Your calendar is synced</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Not Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Connect to access your calendar events
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            variant={calendarConnected ? "destructive" : "default"}
            onClick={() => calendarConnected ? handleDisconnect('calendar') : handleConnect('calendar')}
            disabled={connecting !== null}
            className="w-full"
          >
            {connecting === 'calendar' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : calendarConnected ? (
              <>Disconnect Calendar</>
            ) : (
              <>Connect Calendar</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            <CardTitle>Google Drive</CardTitle>
          </div>
          <CardDescription>
            Connect your Google Drive to access and store files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {driveConnected ? (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Connected to Google Drive</p>
                  <p className="text-sm text-muted-foreground">Your drive is accessible</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Not Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Connect to access your Google Drive files
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            variant={driveConnected ? "destructive" : "default"}
            onClick={() => driveConnected ? handleDisconnect('drive') : handleConnect('drive')}
            disabled={connecting !== null}
            className="w-full"
          >
            {connecting === 'drive' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : driveConnected ? (
              <>Disconnect Drive</>
            ) : (
              <>Connect Drive</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
