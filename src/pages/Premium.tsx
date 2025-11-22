import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowLeft, Sparkles, Zap, Crown, Settings, Globe, Code2, FolderGit2, Download, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useCurrency } from "@/hooks/useCurrency";
import { STRIPE_CONFIG } from "@/constants/stripe";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Plan {
  id: string;
  name: string;
  price: number;
  billing_period: string;
  features: string[];
  message_limit: number | null;
  stripe_price_id: string | null;
}

const Premium = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isPremium, loading: subLoading, refetch } = useSubscription();
  const { selectedCurrency, currencies, formatPrice, updateCurrency, convertPrice } = useCurrency();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "flutterwave">("flutterwave");

  // Safety: auto-clear any stuck processing state after 10s
  useEffect(() => {
    if (!selectedPlan) return;
    const t = setTimeout(() => setSelectedPlan(null), 10000);
    return () => clearTimeout(t);
  }, [selectedPlan]);

  useEffect(() => {
    fetchPlans();
    
    // Clear any selected plan state when component mounts
    setSelectedPlan(null);
    
    // Handle success/cancel from Stripe or Flutterwave
    const success = searchParams.get("success");
    const payment = searchParams.get("payment");
    const ref = searchParams.get("ref");
    const canceled = searchParams.get("canceled");
    
    // Clear URL parameters immediately to prevent re-verification on refresh
    if (success || payment || ref || canceled) {
      window.history.replaceState({}, "", "/premium");
    }
    
    // Check for cancellation first to avoid verification attempts
    if (canceled || payment === "canceled") {
      toast.info("Payment canceled. No charges were made.");
      setSelectedPlan(null);
      return;
    }
    
    // Handle successful payment
    if (success || payment === "success") {
      if (ref) {
        // Verify Flutterwave payment
        verifyFlutterwavePayment(ref);
      } else {
        toast.success("Subscription activated! Welcome to Premium!");
        refetch();
      }
    }
  }, [searchParams, refetch]);

  const verifyFlutterwavePayment = async (reference: string) => {
    let loadingToast: string | number | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      loadingToast = toast.loading("Verifying payment...");

      const { data, error } = await supabase.functions.invoke("flutterwave-verify", {
        body: { reference },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Dismiss loading toast before showing result
      if (loadingToast) toast.dismiss(loadingToast);

      if (error) throw error;

      if (data?.success) {
        toast.success("Payment verified! Welcome to Premium!");
        refetch();
      } else if (data?.alreadyFailed) {
        toast.error(data.message || "This payment was not completed. Please try again.");
      } else {
        toast.error("Payment verification failed. Please contact support if you completed the payment.");
      }
    } catch (error: any) {
      // Dismiss loading toast if still active
      if (loadingToast) toast.dismiss(loadingToast);
      
      console.error("Verification error:", error);
      const errorMessage = error.message || "Failed to verify payment";
      
      // Show single, specific error message
      if (errorMessage.includes("not completed")) {
        toast.error("Payment was not completed. Please try again.");
      } else if (errorMessage.includes("not found")) {
        toast.error("Transaction not found. Please try upgrading again.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

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
        stripe_price_id: plan.stripe_price_id || null,
      }));
      
      setPlans(formattedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string, planName: string, usdPrice: number) => {
    setSelectedPlan(priceId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to upgrade");
        navigate("/auth?redirect=premium");
        setSelectedPlan(null);
        return;
      }

      toast.loading("Creating checkout session...");

      if (paymentProvider === "flutterwave") {
        // Convert USD price to selected currency
        const convertedAmount = convertPrice(usdPrice, selectedCurrency);
        
        const { data, error } = await supabase.functions.invoke("flutterwave-checkout", {
          body: { 
            amount: convertedAmount,
            currency: selectedCurrency,
            planName 
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;
        
        if (data?.url) {
          // User is being redirected, don't clear state
          window.location.href = data.url;
        } else {
          setSelectedPlan(null);
        }
      } else {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { priceId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;
        
        if (data?.url) {
          // User is being redirected, don't clear state
          window.location.href = data.url;
        } else {
          setSelectedPlan(null);
        }
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to create checkout session");
      setSelectedPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to manage subscription");
        return;
      }

      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      toast.error(error.message || "Failed to open customer portal");
    } finally {
      setManagingPortal(false);
    }
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
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="gap-2 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select value={selectedCurrency} onValueChange={updateCurrency}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Globe className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentProvider} onValueChange={(v) => setPaymentProvider(v as any)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flutterwave">Mobile Money</SelectItem>
                <SelectItem value="stripe">Card Payments</SelectItem>
              </SelectContent>
            </Select>
          
            {isPremium && (
              <Button
                onClick={handleManageSubscription}
                variant="outline"
                size="sm"
                disabled={managingPortal}
                className="w-full sm:w-auto"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 sm:py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4 sm:mb-6">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Go Premium</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 px-2">
          Unlock the Full Power of{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            Khai AI
          </span>
        </h1>
        <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
          Get unlimited access to advanced AI capabilities, priority support, and exclusive features
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-12 sm:pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const Icon = getPlanIcon(plan.name);
              const isPremiumPlan = plan.name.toLowerCase().includes("premium");
              const isYearly = plan.billing_period === "yearly";
              const isPopular = isPremiumPlan && isYearly;
              const priceIdUsed = plan.stripe_price_id || (isPremiumPlan ? STRIPE_CONFIG.premium.price_id : null);
              
              return (
                <Card
                  key={plan.id}
                  className={`p-8 relative ${
                    isPopular
                      ? "border-primary shadow-lg scale-105"
                      : "border-border"
                  }`}
                >
                  {isPopular && (
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
                        {formatPrice(plan.price)}
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
                    onClick={() => {
                      if (plan.price === 0) return;
                      if (!plan.stripe_price_id && paymentProvider === "stripe") {
                        toast.error("Stripe price not configured for this plan. Please use Mobile Money.");
                        return;
                      }
                      handleUpgrade(
                        priceIdUsed || "", 
                        plan.name, 
                        plan.price
                      );
                    }}
                    disabled={
                      plan.price === 0 || 
                      selectedPlan === priceIdUsed ||
                      (isPremium && plan.name.toLowerCase().includes("premium"))
                    }
                    className={`w-full ${
                      plan.name.toLowerCase().includes("premium")
                        ? "bg-gradient-primary hover:opacity-90 text-white"
                        : ""
                    }`}
                    variant={plan.name.toLowerCase().includes("premium") ? "default" : "outline"}
                  >
                    {plan.price === 0
                      ? "Current Plan"
                      : selectedPlan === priceIdUsed
                      ? "Processing..."
                      : (isPremium && plan.name.toLowerCase().includes("premium"))
                      ? "Current Plan"
                      : "Upgrade Now"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Codex Teaser Section */}
      <div className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Premium Exclusive</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Unlock <span className="bg-gradient-primary bg-clip-text text-transparent">Coda House</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your AI-powered coding companion with intelligent code generation, live preview, and seamless project management
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Feature Grid */}
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <Code2 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Smart Code Generation</h3>
              <p className="text-muted-foreground mb-4">
                Generate HTML, CSS, JavaScript, and React components with AI-powered intelligence. Auto-organized file tree with smart naming.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Intelligent component detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Auto file organization</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Syntax highlighting & formatting</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-secondary/5 to-transparent">
              <FolderGit2 className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Live Preview & File Management</h3>
              <p className="text-muted-foreground mb-4">
                See your code come to life instantly with real-time preview. Organize files with drag-and-drop, version control, and more.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Real-time code preview</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Version history & restore</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Drag-and-drop file organization</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-accent/5 to-transparent">
              <Download className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">Project Downloads</h3>
              <p className="text-muted-foreground mb-4">
                Download your generated code as ready-to-use project files. Premium members get unlimited downloads.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Unlimited downloads</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Complete project structure</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Production-ready code</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <GitBranch className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-3">GitHub Integration</h3>
              <p className="text-muted-foreground mb-4">
                Seamlessly sync your projects with GitHub repositories. Push changes and collaborate with your team.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Direct GitHub sync</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Branch management</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Team collaboration</span>
                </li>
              </ul>
            </Card>
          </div>

          {!isPremium && (
            <div className="text-center">
              <Card className="p-8 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 border-primary/30 max-w-2xl mx-auto">
                <Crown className="w-16 h-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-3">Ready to Start Coding?</h3>
                <p className="text-muted-foreground mb-6">
                  Upgrade to Premium and unlock Coda House with unlimited code generation, downloads, and GitHub integration
                </p>
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:opacity-90 text-white"
                  onClick={() => {
                    const premiumSection = document.querySelector('.container');
                    premiumSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Upgrade to Premium
                </Button>
              </Card>
            </div>
          )}
        </div>
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
              title: "Unlimited Image Generation",
              description: "Create stunning AI images without daily limits (Free: 3/day)"
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
