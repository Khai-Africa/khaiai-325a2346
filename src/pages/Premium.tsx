import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowLeft, Sparkles, Zap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  billing_period: string;
  features: string[];
  message_limit: number | null;
}

const Premium = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price", { ascending: true });

      if (error) throw error;
      
      const formattedPlans: Plan[] = (data || []).map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        billing_period: plan.billing_period,
        features: Array.isArray(plan.features) 
          ? plan.features.map(f => String(f))
          : [],
        message_limit: plan.message_limit,
      }));
      
      setPlans(formattedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setSelectedPlan(planId);
    // This would integrate with a payment provider like Stripe
    toast.success("Redirecting to checkout...");
    // For now, just show a message
    setTimeout(() => {
      toast.info("Payment integration coming soon!");
      setSelectedPlan(null);
    }, 1500);
  };

  const getPlanIcon = (name: string) => {
    if (name.toLowerCase().includes("premium")) return Crown;
    if (name.toLowerCase().includes("free")) return Zap;
    return Sparkles;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Upgrade to Premium</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Unlock the Full Power of{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            Khai AI
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Get unlimited access to advanced AI capabilities, priority support, and exclusive features
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-8 animate-pulse">
                <div className="h-32 bg-muted rounded mb-4"></div>
                <div className="h-16 bg-muted rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const Icon = getPlanIcon(plan.name);
              const isPremium = plan.name.toLowerCase().includes("premium");
              
              return (
                <Card
                  key={plan.id}
                  className={`p-8 relative ${
                    isPremium
                      ? "border-primary shadow-lg scale-105"
                      : "border-border"
                  }`}
                >
                  {isPremium && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary text-white text-sm font-semibold rounded-full">
                      Most Popular
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground">
                        /{plan.billing_period === "yearly" ? "year" : "month"}
                      </span>
                    </div>
                    {plan.billing_period === "yearly" && plan.price > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        Save 17% with annual billing
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={selectedPlan === plan.id || plan.price === 0}
                    className={`w-full ${
                      isPremium
                        ? "bg-gradient-primary hover:opacity-90 text-white"
                        : ""
                    }`}
                    variant={isPremium ? "default" : "outline"}
                  >
                    {selectedPlan === plan.id
                      ? "Processing..."
                      : plan.price === 0
                      ? "Current Plan"
                      : "Upgrade Now"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16 border-t border-border">
        <h2 className="text-3xl font-bold text-center mb-12">
          Premium Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              icon: Sparkles,
              title: "Unlimited Messages",
              description: "No daily limits, chat as much as you need"
            },
            {
              icon: Crown,
              title: "Advanced AI Modes",
              description: "Access to deep research, thinking, and specialized modes"
            },
            {
              icon: Zap,
              title: "Image Generation",
              description: "Create stunning images with AI"
            },
            {
              icon: Check,
              title: "Web Search",
              description: "Get real-time information from the web"
            },
            {
              icon: Sparkles,
              title: "Priority Support",
              description: "Get help faster with priority assistance"
            },
            {
              icon: Crown,
              title: "Early Access",
              description: "Be first to try new features and capabilities"
            }
          ].map((feature, idx) => (
            <Card key={idx} className="p-6">
              <feature.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Premium;
