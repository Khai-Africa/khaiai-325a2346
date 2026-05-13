import { useState } from "react";
import { ArrowLeft, HelpCircle, MessageSquare, Crown, Image, FileText, Send, MessageCircle, Code2, Zap, Github, Download, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Help = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to submit a ticket");
      navigate("/auth?redirect=help");
      return;
    }
    
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to submit a ticket");
        navigate("/auth?redirect=help");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('submit-ticket', {
        body: {
          subject: ticketSubject,
          message: ticketMessage,
          priority: ticketPriority,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      toast.success("Ticket submitted! We'll respond within 48 hours.");
      setTicketSubject("");
      setTicketMessage("");
      setTicketPriority("medium");
    } catch (error) {
      console.error("Error submitting ticket:", error);
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleWhatsAppSupport = () => {
    if (!isPremium) {
      toast.error("WhatsApp support is only available for Premium members");
      navigate("/premium");
      return;
    }
    
    const phoneNumber = "447306827526";
    const message = encodeURIComponent("Welcome to Kmer AI. How can I help you today?");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const faqs = [
    {
      question: "How do I go Premium?",
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
      question: "Can I use Kmer AI on mobile?",
      answer: "Yes! Kmer AI is a Progressive Web App (PWA). You can install it on your mobile device for an app-like experience by clicking 'Add to Home Screen' in your browser menu."
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
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl py-8 sm:py-12 px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Help Center</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Find answers to common questions</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/premium")}>
            <CardContent className="pt-4 sm:pt-6 text-center">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">Premium</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Upgrade</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/usage")}>
            <CardContent className="pt-4 sm:pt-6 text-center">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">Usage</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Track limits</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/image-gen")}>
            <CardContent className="pt-4 sm:pt-6 text-center">
              <Image className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">Images</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Generate AI art</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/settings")}>
            <CardContent className="pt-4 sm:pt-6 text-center">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold text-sm sm:text-base">Settings</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Preferences</p>
            </CardContent>
          </Card>
        </div>

        {/* Vibe Coding Section */}
        <section id="vibe-coding" className="mb-8 sm:mb-12 scroll-mt-20">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Code2 className="w-8 h-8 text-primary" />
                <CardTitle className="text-2xl">Vibe Coding - AI-Powered Code Generation</CardTitle>
              </div>
              <CardDescription className="text-base">
                Your intelligent coding companion that transforms ideas into production-ready code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  What is Vibe Coding?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Vibe Coding is an advanced AI code generation and analysis platform integrated into Kmer AI. 
                  It helps developers, students, and coding enthusiasts generate, analyze, and manage code projects 
                  with the power of artificial intelligence. Whether you're building a new feature, debugging existing code, 
                  or learning programming concepts, Vibe Coding accelerates your development workflow.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Code2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">Intelligent Code Generation</h4>
                      <p className="text-sm text-muted-foreground">
                        Generate complete code files from natural language descriptions. Simply describe what you want to build, 
                        and Vibe Coding creates production-ready code in your preferred programming language with proper structure, 
                        comments, and best practices.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <HelpCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">Code Analysis & Q&A</h4>
                      <p className="text-sm text-muted-foreground">
                        Upload your existing code and ask questions about it. Get explanations, identify bugs, suggest improvements, 
                        understand complex algorithms, or learn how specific functions work. Perfect for code reviews and learning.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <FolderTree className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">Project Management</h4>
                      <p className="text-sm text-muted-foreground">
                        Organize your code in projects with multiple files. Create, edit, and manage files in a familiar tree structure. 
                        Track your tasks and development progress with an integrated task list showing all AI-generated code and analysis.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Github className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">GitHub Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Connect your GitHub account to sync your Vibe Coding projects with GitHub repositories. Push changes, 
                        pull updates, and maintain version control seamlessly. Perfect for collaboration and backup.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Download className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">Code Download System</h4>
                      <p className="text-sm text-muted-foreground">
                        Free users get 3 complimentary downloads to try the service. Download individual files or entire projects 
                        as ZIP archives. Premium members enjoy unlimited downloads with no restrictions.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <FileText className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">Built-in Code Editor</h4>
                      <p className="text-sm text-muted-foreground">
                        Edit your code directly in the browser with syntax highlighting, line numbers, and a clean interface. 
                        Save changes instantly and see them reflected in your project structure. Supports multiple file types 
                        and programming languages.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">How to Use Vibe Coding</h3>
                <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                  <li className="leading-relaxed">
                    <strong>Access Vibe Coding:</strong> Click the "Vibe Coding" button in the sidebar or navigate to /codex
                  </li>
                  <li className="leading-relaxed">
                    <strong>Create Your First Project:</strong> On first visit, you'll see a prompt input. Describe what you want to code, 
                    and a project will be auto-created with your generated code
                  </li>
                  <li className="leading-relaxed">
                    <strong>Choose Your Mode:</strong> Use "Ask" mode to analyze existing code and get answers, or "Code" mode to generate new code files
                  </li>
                  <li className="leading-relaxed">
                    <strong>Upload Files (Optional):</strong> Upload your existing code files (up to 20MB each) to provide context or for analysis
                  </li>
                  <li className="leading-relaxed">
                    <strong>Review & Edit:</strong> Generated code appears in the file tree. Click any file to view and edit it in the built-in editor
                  </li>
                  <li className="leading-relaxed">
                    <strong>Track Progress:</strong> Switch to the "Tasks" tab to see your AI interaction history and generated outputs
                  </li>
                  <li className="leading-relaxed">
                    <strong>Download:</strong> Click the download button on any file. Free users have 3 downloads; Premium users have unlimited
                  </li>
                  <li className="leading-relaxed">
                    <strong>Connect GitHub (Optional):</strong> Link your GitHub account to sync projects and enable version control
                  </li>
                </ol>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Pricing & Limits</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Free Users:</span>
                    <span className="font-medium">3 free downloads</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Premium Users:</span>
                    <span className="font-medium">Unlimited downloads</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Upload Limit:</span>
                    <span className="font-medium">20MB per file</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional Downloads:</span>
                    <span className="font-medium">$0.83 per file</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={() => navigate("/codex")} size="lg" className="w-full">
                  <Code2 className="w-5 h-5 mr-2" />
                  Start Coding with Vibe Coding
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
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

        {/* WhatsApp Support for Premium Members */}
        {user && isPremium && (
          <Card className="bg-gradient-primary text-white mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                Kmer Help Centre - WhatsApp Support
              </CardTitle>
              <CardDescription className="text-white/90">
                Premium members get direct WhatsApp support
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleWhatsAppSupport}
                variant="secondary"
                className="w-full"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat on WhatsApp
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Support Ticket System */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-6 h-6" />
              Submit a Support Ticket
            </CardTitle>
            <CardDescription>
              Get help from our support team. We respond within 48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue in detail..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  rows={6}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={submitting}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? "Submitting..." : "Submit Ticket"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-2">Other Resources</h3>
            <p className="text-muted-foreground mb-4">
              Contact our support team at support@kmercoders.com or check our documentation for more detailed guides.
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
