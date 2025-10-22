import { ArrowLeft, HelpCircle, MessageSquare, Crown, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Help = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "How do I upgrade to Premium?",
      answer: "Click on the 'Premium' link in the sidebar or visit the Premium page. Choose your preferred plan and payment method (Mobile Money for African currencies or Card for international payments)."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept credit/debit cards via Stripe for international payments, and Mobile Money (MTN, Orange Money) via Flutterwave for African countries including XAF, GHS, KES, NGN, and more."
    },
    {
      question: "What's the difference between Free and Premium?",
      answer: "Free tier includes 50 messages and 3 image generations per day. Premium offers unlimited messages, unlimited image generation, advanced AI modes, web search, and priority support."
    },
    {
      question: "How do I generate images?",
      answer: "Click the '+' button in the chat input and select 'Create Image', or use the Image Generator page. Describe what you want to see, and our AI will create it for you."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes! You can cancel your subscription at any time from the 'Manage Subscription' button on the Premium page. Your access will continue until the end of your billing period."
    },
    {
      question: "How do I export my chat history?",
      answer: "Go to Settings and click 'Export My Data'. This will download all your conversations and data in JSON format."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. We use industry-standard encryption and security practices. Your conversations are stored securely and are only accessible to you. Read our Privacy Policy for more details."
    },
    {
      question: "How do I use different AI modes?",
      answer: "Click the '+' button in the chat and select from Thinking Mode (complex reasoning), Deep Research (in-depth analysis), Web Search (real-time info), or Canvas Mode (collaborative editing)."
    },
    {
      question: "Can I use Khai AI on mobile?",
      answer: "Yes! Khai AI is a Progressive Web App (PWA). You can install it on your mobile device for an app-like experience by clicking 'Add to Home Screen' in your browser menu."
    },
    {
      question: "What currencies do you support?",
      answer: "We support USD, XAF (Central African Franc), GHS (Ghana Cedi), KES (Kenyan Shilling), NGN (Nigerian Naira), UGX (Ugandan Shilling), TZS (Tanzanian Shilling), RWF (Rwandan Franc), XOF (West African Franc), EUR, and GBP."
    }
  ];

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
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-muted-foreground text-lg">Find answers to common questions</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/premium")}>
            <CardContent className="pt-6 text-center">
              <Crown className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Premium</h3>
              <p className="text-sm text-muted-foreground">Upgrade</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/usage")}>
            <CardContent className="pt-6 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Usage</h3>
              <p className="text-sm text-muted-foreground">Track limits</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/image-gen")}>
            <CardContent className="pt-6 text-center">
              <Image className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Images</h3>
              <p className="text-sm text-muted-foreground">Generate AI art</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/settings")}>
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Settings</h3>
              <p className="text-sm text-muted-foreground">Preferences</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            Frequently Asked Questions
          </h2>
          
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-2">Still need help?</h3>
            <p className="text-muted-foreground mb-4">
              Contact our support team at support@khai-ai.com or check our documentation for more detailed guides.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/terms")}>Terms of Service</Button>
              <Button variant="outline" onClick={() => navigate("/privacy")}>Privacy Policy</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Help;
