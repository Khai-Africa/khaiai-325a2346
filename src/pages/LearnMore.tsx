import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Sparkles, MessageSquare, Globe2, Shield, Zap, Users, BookOpen, Code, Lightbulb, Clock, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/kai-ai-logo.png";

const LearnMore = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: MessageSquare,
      title: "Natural Conversations",
      description: "Chat naturally with our AI assistant. Ask questions, get detailed answers, and have meaningful conversations in multiple languages.",
      color: "text-blue-400",
    },
    {
      icon: Globe2,
      title: "African-Focused Content",
      description: "Get information and insights specifically designed for African contexts, cultures, and needs.",
      color: "text-green-400",
    },
    {
      icon: Code,
      title: "Code Generation",
      description: "Generate code snippets, debug errors, and learn programming concepts with AI-powered assistance.",
      color: "text-purple-400",
    },
    {
      icon: Lightbulb,
      title: "Creative Ideas",
      description: "Brainstorm business ideas, marketing strategies, content creation, and innovative solutions to your challenges.",
      color: "text-yellow-400",
    },
    {
      icon: BookOpen,
      title: "Learning Assistant",
      description: "Learn new topics, understand complex concepts, and get explanations tailored to your level of understanding.",
      color: "text-pink-400",
    },
    {
      icon: Zap,
      title: "Fast & Efficient",
      description: "Get instant responses powered by advanced AI technology, saving you time and boosting productivity.",
      color: "text-orange-400",
    },
  ];

  const howItWorks = [
    {
      icon: Users,
      title: "Start a Conversation",
      description: "Simply click 'Start Chatting' or select a suggestion to begin your conversation with Khai AI.",
      step: "01",
    },
    {
      icon: MessageSquare,
      title: "Ask Anything",
      description: "Type your question, request, or topic. Khai AI understands context and can help with a wide range of tasks.",
      step: "02",
    },
    {
      icon: Sparkles,
      title: "Get Intelligent Responses",
      description: "Receive detailed, accurate, and contextually relevant answers powered by advanced AI technology.",
      step: "03",
    },
    {
      icon: Heart,
      title: "Refine & Explore",
      description: "Continue the conversation, ask follow-up questions, or explore new topics as needed.",
      step: "04",
    },
  ];

  const useCases = [
    {
      icon: BookOpen,
      title: "Education",
      description: "Learn new subjects, get homework help, understand complex topics",
    },
    {
      icon: Code,
      title: "Development",
      description: "Write code, debug issues, learn programming languages",
    },
    {
      icon: Lightbulb,
      title: "Business",
      description: "Generate ideas, create content, plan strategies",
    },
    {
      icon: Globe2,
      title: "Translation",
      description: "Translate between languages, learn new phrases",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg border-b border-border/50 bg-background/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/?chat=true")}
              className="group"
            >
              <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Chat
            </Button>
            <button 
              onClick={() => navigate("/")}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="Khai AI" className="h-10 w-10 object-contain" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            How Khai AI Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your intelligent AI assistant designed to help you learn, create, and solve problems with the power of advanced artificial intelligence.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Simple Steps to Get Started
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card
                  key={index}
                  className="p-6 bg-card/50 backdrop-blur border-border hover:shadow-card transition-all hover:scale-105 group relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 text-6xl font-bold text-primary/5 group-hover:text-primary/10 transition-colors">
                    {step.step}
                  </div>
                  <Icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Powerful Features
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Khai AI is packed with features to help you accomplish more, faster and smarter.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-6 bg-card/50 backdrop-blur border-border hover:shadow-card transition-all hover:scale-105 group"
                >
                  <Icon className={`w-10 h-10 ${feature.color} mb-4 group-hover:scale-110 transition-transform`} />
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            What You Can Do
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Khai AI adapts to your needs, whether you're a student, developer, entrepreneur, or creative professional.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Card
                  key={index}
                  className="p-6 bg-card/50 backdrop-blur border-border hover:shadow-card transition-all hover:scale-105 group text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-transparent via-accent/5 to-transparent">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose Khai AI?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Safe & Secure</h3>
              <p className="text-muted-foreground">Your conversations are private and secure</p>
            </div>
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Clock className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">24/7 Available</h3>
              <p className="text-muted-foreground">Get help anytime, anywhere you need it</p>
            </div>
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Heart className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Made for Africa</h3>
              <p className="text-muted-foreground">Built with African contexts and needs in mind</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-8 bg-gradient-primary/10 backdrop-blur border border-border rounded-3xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of users who are already leveraging AI to learn, create, and innovate.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/")}
            className="bg-gradient-primary hover:opacity-90 text-white px-8 py-6 text-lg transition-all hover:shadow-glow group"
          >
            Start Chatting Now
            <Sparkles className="ml-2 group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 Khai AI. Designed for Africa.</p>
        </div>
      </footer>
    </div>
  );
};

export default LearnMore;
