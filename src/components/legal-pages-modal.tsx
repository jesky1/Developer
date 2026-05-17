'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Mail, Shield, FileText, Users, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// === Types ===

export type LegalPage = 'about' | 'contact' | 'privacy' | 'terms';

interface LegalPagesModalProps {
  page: LegalPage | null;
  isOpen: boolean;
  onClose: () => void;
}

// === Page Icons ===

const PAGE_ICONS: Record<LegalPage, typeof Zap> = {
  about: Users,
  contact: Mail,
  privacy: Shield,
  terms: FileText,
};

const PAGE_TITLES: Record<LegalPage, string> = {
  about: 'About GOALZONE',
  contact: 'Contact Us',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
};

// === About Content ===

function AboutContent() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-neon/10 border border-neon/20">
          <Zap className="w-6 h-6 text-neon" />
        </div>
        <div>
          <h3 className="text-lg font-bold neon-text">GOALZONE</h3>
          <p className="text-xs text-muted-foreground">Premium Football Experience</p>
        </div>
      </div>

      <div className="h-px bg-border/50" />

      <div className="space-y-4">
        <p className="text-sm text-foreground/90 leading-relaxed">
          GOALZONE is your premium destination for live football scores, real-time match updates, and comprehensive statistics. We cover top European leagues including Premier League, La Liga, Serie A, Bundesliga, and Ligue 1, as well as BRI Liga 1 Indonesia, Eredivisie, and the UEFA Champions League.
        </p>

        <div className="glass-card rounded-xl p-4 space-y-2 border-neon/10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon" />
            <span className="text-xs font-semibold text-neon uppercase tracking-wider">Our Mission</span>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Our mission is to bring football fans closer to the action with real-time data, AI-powered match analysis, and comprehensive coverage of the beautiful game.
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Founded 2025</span>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Founded in 2025, GOALZONE leverages cutting-edge technology to deliver the fastest and most accurate football data to fans worldwide.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-neon">8+</p>
            <p className="text-[10px] text-muted-foreground mt-1">Leagues Covered</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-neon">Real-time</p>
            <p className="text-[10px] text-muted-foreground mt-1">Match Updates</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-neon">AI</p>
            <p className="text-[10px] text-muted-foreground mt-1">Powered Analysis</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// === Contact Content ===

function ContactContent() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Message sent! We\'ll get back to you soon.');
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/90 leading-relaxed">
        Have a question, suggestion, or just want to say hello? We&apos;d love to hear from you. Fill out the form below and our team will get back to you as soon as possible.
      </p>

      <div className="h-px bg-border/50" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="contact-name" className="text-xs font-medium text-foreground">
            Name
          </label>
          <Input
            id="contact-name"
            placeholder="Your name"
            className="bg-muted/20 border-border/50 focus-visible:border-neon/50 focus-visible:ring-neon/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-email" className="text-xs font-medium text-foreground">
            Email
          </label>
          <Input
            id="contact-email"
            type="email"
            placeholder="your@email.com"
            className="bg-muted/20 border-border/50 focus-visible:border-neon/50 focus-visible:ring-neon/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-subject" className="text-xs font-medium text-foreground">
            Subject
          </label>
          <Input
            id="contact-subject"
            placeholder="What's this about?"
            className="bg-muted/20 border-border/50 focus-visible:border-neon/50 focus-visible:ring-neon/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contact-message" className="text-xs font-medium text-foreground">
            Message
          </label>
          <Textarea
            id="contact-message"
            placeholder="Tell us what's on your mind..."
            rows={4}
            className="bg-muted/20 border-border/50 focus-visible:border-neon/50 focus-visible:ring-neon/20 resize-none"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-neon/20 text-neon border border-neon/30 hover:bg-neon/30 hover:text-neon transition-all"
        >
          <Send className="w-4 h-4" />
          Send Message
        </Button>
      </form>

      <div className="h-px bg-border/50" />

      <div className="glass-card rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-neon" />
          <span className="text-xs font-semibold text-foreground">Direct Email</span>
        </div>
        <p className="text-xs text-muted-foreground">
          For urgent inquiries, reach us at{' '}
          <a href="mailto:hello@goalzone.app" className="text-neon hover:underline">
            hello@goalzone.app
          </a>
        </p>
      </div>
    </div>
  );
}

// === Privacy Content ===

function PrivacyContent() {
  const sections = [
    {
      number: '1',
      title: 'Information We Collect',
      content: 'We collect match preference data, browsing patterns, and device information. This includes your selected leagues, favorite teams, match viewing history, and basic device metadata to optimize your experience.',
    },
    {
      number: '2',
      title: 'How We Use Your Information',
      content: 'To provide personalized football content, improve our services, and send relevant notifications. Your preferences help us tailor the GOALZONE experience to show you the matches, news, and statistics that matter most to you.',
    },
    {
      number: '3',
      title: 'Data Storage',
      content: 'Your data is stored securely and encrypted. We use industry-standard encryption protocols to protect your personal information both in transit and at rest. Our infrastructure is regularly audited for security compliance.',
    },
    {
      number: '4',
      title: 'Cookies',
      content: 'We use essential cookies for site functionality and analytics cookies to improve your experience. Essential cookies enable core features like live match updates and session management. Analytics cookies help us understand how you use GOALZONE so we can make it better.',
    },
    {
      number: '5',
      title: 'Third-Party Services',
      content: 'We may use third-party APIs for match data and analytics. These services are carefully vetted to ensure they meet our privacy standards. We never sell your personal data to third parties.',
    },
    {
      number: '6',
      title: 'Your Rights',
      content: 'You can request data deletion at any time. You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at privacy@goalzone.app.',
    },
    {
      number: '7',
      title: 'Contact',
      content: 'For privacy concerns, contact privacy@goalzone.app. We aim to respond to all privacy-related inquiries within 48 hours.',
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Last updated: March 2025</p>

      <div className="h-px bg-border/50" />

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.number} className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-neon/10 border border-neon/20 text-neon text-[10px] font-bold shrink-0 mt-0.5">
                {section.number}
              </span>
              <div className="space-y-1.5 flex-1">
                <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                <p className="text-xs text-foreground/80 leading-relaxed">{section.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Terms Content ===

function TermsContent() {
  const sections = [
    {
      number: '1',
      title: 'Acceptance',
      content: 'By using GOALZONE, you agree to these terms. If you do not agree with any part of these terms, you should not use our service. Your continued use of GOALZONE constitutes acceptance of these terms.',
    },
    {
      number: '2',
      title: 'Service Description',
      content: 'GOALZONE provides live football scores, statistics, and news. We strive to provide accurate and timely information but cannot guarantee uninterrupted availability of our service.',
    },
    {
      number: '3',
      title: 'User Conduct',
      content: 'Users must not abuse the service or attempt to disrupt it. This includes, but is not limited to, attempting to gain unauthorized access to our systems, using automated tools to scrape data, or engaging in any activity that could harm the service or other users.',
    },
    {
      number: '4',
      title: 'Intellectual Property',
      content: 'All content is owned by GOALZONE or its licensors. This includes text, graphics, logos, icons, images, data compilations, and software. Unauthorized use of any content may violate copyright, trademark, and other laws.',
    },
    {
      number: '5',
      title: 'Disclaimer',
      content: 'Match data is provided "as is" and may be subject to delays. While we make every effort to ensure accuracy, we cannot guarantee that all information is error-free or up-to-date at all times.',
    },
    {
      number: '6',
      title: 'Limitation of Liability',
      content: 'GOALZONE is not liable for any losses from using our service. This includes direct, indirect, incidental, special, or consequential damages arising from the use or inability to use the service.',
    },
    {
      number: '7',
      title: 'Changes',
      content: 'We may update these terms at any time. Changes will be posted on this page with an updated revision date. Your continued use of GOALZONE after any changes constitutes acceptance of the new terms.',
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Last updated: March 2025</p>

      <div className="h-px bg-border/50" />

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.number} className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-neon/10 border border-neon/20 text-neon text-[10px] font-bold shrink-0 mt-0.5">
                {section.number}
              </span>
              <div className="space-y-1.5 flex-1">
                <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                <p className="text-xs text-foreground/80 leading-relaxed">{section.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Page Content Router ===

function PageContent({ page }: { page: LegalPage }) {
  switch (page) {
    case 'about':
      return <AboutContent />;
    case 'contact':
      return <ContactContent />;
    case 'privacy':
      return <PrivacyContent />;
    case 'terms':
      return <TermsContent />;
  }
}

// === Main Modal Component ===

export function LegalPagesModal({ page, isOpen, onClose }: LegalPagesModalProps) {
  if (!page) return null;

  const Icon = PAGE_ICONS[page];
  const title = PAGE_TITLES[page];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="legal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal - slide up on mobile, center on desktop */}
          <motion.div
            key="legal-modal"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <div className="relative w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col glass-card rounded-t-2xl sm:rounded-2xl border border-border/50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-0 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neon/10 border border-neon/20">
                    <Icon className="w-4 h-4 text-neon" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{title}</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Divider */}
              <div className="mx-5 mt-4 h-px bg-border/50 shrink-0" />

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                <PageContent page={page} />

                {/* Bottom spacer */}
                <div className="h-6" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
