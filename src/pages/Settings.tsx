import { useState } from "react";
import { ArrowLeft, User, Bell, Globe, Palette, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { selectedCurrency, currencies, updateCurrency } = useCurrency();
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    try {
      toast.loading("Exporting your data...");
      
      const { data: conversations } = await supabase
        .from("conversations")
        .select("*, messages(*)")
        .eq("user_id", user?.id);

      const dataStr = JSON.stringify(conversations, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `khai-ai-data-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      toast.info("Please contact support@khai-ai.com to delete your account");
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to sign out");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/?chat=true")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl py-12 px-4 space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and settings</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <CardTitle>Account</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
            </div>
            <div>
              <Label>User ID</Label>
              <p className="text-sm text-muted-foreground mt-1 font-mono">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <CardTitle>Currency</CardTitle>
            </div>
            <CardDescription>Choose your preferred currency for pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCurrency} onValueChange={updateCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name} ({currency.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications in the app</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Updates</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch checked={emailUpdates} onCheckedChange={setEmailUpdates} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              <CardTitle>Data Export</CardTitle>
            </div>
            <CardDescription>Download all your data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportData} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleDeleteAccount} 
              variant="destructive" 
              className="w-full"
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
