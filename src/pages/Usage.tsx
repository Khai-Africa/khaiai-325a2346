import { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, Image as ImageIcon, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface UsageData {
  message_count: number;
  image_count: number;
  usage_date: string;
}

const Usage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [todayUsage, setTodayUsage] = useState<UsageData | null>(null);
  const [weeklyUsage, setWeeklyUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);

  const MESSAGE_LIMIT = 50; // Free tier daily limit
  const IMAGE_LIMIT = 3; // Free tier daily limit

  useEffect(() => {
    if (user) {
      fetchUsage();
    }
  }, [user]);

  const fetchUsage = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Get today's usage
      const { data: todayData } = await supabase
        .from("user_usage")
        .select("*")
        .eq("user_id", user?.id)
        .eq("usage_date", today)
        .single();

      setTodayUsage(todayData);

      // Get last 7 days usage
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: weekData } = await supabase
        .from("user_usage")
        .select("*")
        .eq("user_id", user?.id)
        .gte("usage_date", weekAgo.toISOString().split("T")[0])
        .order("usage_date", { ascending: false });

      setWeeklyUsage(weekData || []);
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const messagePercentage = todayUsage 
    ? (todayUsage.message_count / MESSAGE_LIMIT) * 100 
    : 0;
  
  const imagePercentage = todayUsage 
    ? (todayUsage.image_count / IMAGE_LIMIT) * 100 
    : 0;

  const totalMessages = weeklyUsage.reduce((sum, day) => sum + day.message_count, 0);
  const totalImages = weeklyUsage.reduce((sum, day) => sum + day.image_count, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl py-12 px-4 space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Usage Dashboard</h1>
          <p className="text-muted-foreground">Track your AI usage and limits</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <CardTitle>Messages Today</CardTitle>
                  </div>
                  <CardDescription>Free tier: {MESSAGE_LIMIT} per day</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-bold">
                    {todayUsage?.message_count || 0}
                    <span className="text-lg text-muted-foreground ml-2">/ {MESSAGE_LIMIT}</span>
                  </div>
                  <Progress value={Math.min(messagePercentage, 100)} />
                  {messagePercentage >= 100 && (
                    <p className="text-sm text-destructive">Daily limit reached. Upgrade to Premium for unlimited messages!</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    <CardTitle>Images Today</CardTitle>
                  </div>
                  <CardDescription>Free tier: {IMAGE_LIMIT} per day</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-bold">
                    {todayUsage?.image_count || 0}
                    <span className="text-lg text-muted-foreground ml-2">/ {IMAGE_LIMIT}</span>
                  </div>
                  <Progress value={Math.min(imagePercentage, 100)} />
                  {imagePercentage >= 100 && (
                    <p className="text-sm text-destructive">Daily limit reached. Upgrade to Premium for unlimited images!</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <CardTitle>Last 7 Days</CardTitle>
                </div>
                <CardDescription>Your usage over the past week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Messages</Label>
                    <p className="text-2xl font-bold">{totalMessages}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Total Images</Label>
                    <p className="text-2xl font-bold">{totalImages}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {weeklyUsage.map((day) => (
                    <div key={day.usage_date} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{new Date(day.usage_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>{day.message_count} msgs</span>
                        <span>{day.image_count} imgs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-primary text-white">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2">Want Unlimited Access?</h3>
                <p className="mb-4 opacity-90">Upgrade to Premium for unlimited messages and image generation</p>
                <Button onClick={() => navigate("/premium")} variant="secondary">
                  Upgrade Now
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
);

export default Usage;
