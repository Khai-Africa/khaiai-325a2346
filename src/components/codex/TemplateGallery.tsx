import { useState } from "react";
import { X, Sparkles, Layout, MousePointerClick, FileText, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  category: 'layout' | 'component' | 'form' | 'navigation';
}

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (prompt: string) => void;
}

const templates: Template[] = [
  // Layouts
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Beautiful hero section with CTA',
    icon: <Layout className="w-4 h-4" />,
    prompt: 'Create a modern landing page with a hero section, gradient background, headline, description, and two call-to-action buttons. Make it responsive and visually stunning with smooth animations.',
    category: 'layout'
  },
  {
    id: 'dashboard',
    name: 'Dashboard Layout',
    description: 'Grid-based dashboard with cards',
    icon: <Layout className="w-4 h-4" />,
    prompt: 'Create a responsive dashboard layout with a header, sidebar navigation, and grid of stat cards showing metrics. Use modern design with shadows and hover effects.',
    category: 'layout'
  },
  {
    id: 'pricing-table',
    name: 'Pricing Table',
    description: '3-column pricing comparison',
    icon: <Layout className="w-4 h-4" />,
    prompt: 'Create a 3-column pricing table with Basic, Pro, and Enterprise tiers. Include feature lists, pricing, and highlighted "Popular" option. Make it responsive and professional.',
    category: 'layout'
  },
  
  // Components
  {
    id: 'button-component',
    name: 'Button Set',
    description: 'Primary, secondary, outline styles',
    icon: <MousePointerClick className="w-4 h-4" />,
    prompt: 'Create a set of modern button components with primary, secondary, outline, and ghost variants. Include hover and active states with smooth transitions. Add size variations (sm, md, lg).',
    category: 'component'
  },
  {
    id: 'card-component',
    name: 'Card Component',
    description: 'Reusable card with image',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Create a beautiful card component with image, title, description, and action button. Include hover effects with shadow and slight lift. Make it responsive.',
    category: 'component'
  },
  {
    id: 'modal-component',
    name: 'Modal Dialog',
    description: 'Overlay modal with backdrop',
    icon: <MousePointerClick className="w-4 h-4" />,
    prompt: 'Create a modal dialog component with backdrop overlay, close button, header, content area, and action buttons. Include smooth fade-in animation and focus trap.',
    category: 'component'
  },
  
  // Forms
  {
    id: 'contact-form',
    name: 'Contact Form',
    description: 'Name, email, message fields',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Create a beautiful contact form with name, email, and message fields. Include validation, error states, and a submit button. Use modern styling with focus states.',
    category: 'form'
  },
  {
    id: 'signup-form',
    name: 'Signup Form',
    description: 'Registration with validation',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Create a signup form with email, password, and confirm password fields. Include real-time validation, password strength indicator, and terms checkbox. Make it secure and user-friendly.',
    category: 'form'
  },
  {
    id: 'search-bar',
    name: 'Search Bar',
    description: 'Search input with icon',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Create a modern search bar with magnifying glass icon, placeholder text, and clear button. Include focus states and smooth transitions. Make it responsive.',
    category: 'form'
  },
  
  // Navigation
  {
    id: 'navbar',
    name: 'Navigation Bar',
    description: 'Responsive navbar with menu',
    icon: <Navigation className="w-4 h-4" />,
    prompt: 'Create a responsive navigation bar with logo, menu links, and mobile hamburger menu. Include smooth transitions and sticky behavior on scroll. Use modern design.',
    category: 'navigation'
  },
  {
    id: 'sidebar',
    name: 'Sidebar Menu',
    description: 'Collapsible side navigation',
    icon: <Navigation className="w-4 h-4" />,
    prompt: 'Create a collapsible sidebar navigation with icons, labels, and active states. Include smooth slide animation and hover effects. Make it responsive.',
    category: 'navigation'
  },
  {
    id: 'breadcrumb',
    name: 'Breadcrumb',
    description: 'Navigation breadcrumb trail',
    icon: <Navigation className="w-4 h-4" />,
    prompt: 'Create a breadcrumb navigation component showing the current page path. Include separators, hover states, and proper semantic markup.',
    category: 'navigation'
  },
];

export const TemplateGallery = ({ open, onClose, onSelectTemplate }: TemplateGalleryProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All Templates', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'layout', label: 'Layouts', icon: <Layout className="w-3 h-3" /> },
    { id: 'component', label: 'Components', icon: <MousePointerClick className="w-3 h-3" /> },
    { id: 'form', label: 'Forms', icon: <FileText className="w-3 h-3" /> },
    { id: 'navigation', label: 'Navigation', icon: <Navigation className="w-3 h-3" /> },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-background border border-border rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Template Gallery</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 p-4 border-b border-border overflow-x-auto">
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="flex-shrink-0"
            >
              {cat.icon}
              <span className="ml-2">{cat.label}</span>
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => {
                  onSelectTemplate(template.prompt);
                  onClose();
                }}
                className={cn(
                  "group relative p-4 rounded-lg border border-border bg-card hover:bg-accent",
                  "transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
                  "text-left cursor-pointer"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/20">
          <p className="text-xs text-muted-foreground text-center">
            Select a template to generate customizable code with AI
          </p>
        </div>
      </div>
    </div>
  );
};
