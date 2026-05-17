'use client';

import { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Share2, Link2, Twitter, Facebook, MessageCircle, Tag, Newspaper, Zap } from 'lucide-react';
import { toast } from 'sonner';
import type { NewsArticle } from '@/components/news-section';

// === Types ===

interface NewsDetailModalProps {
  article: NewsArticle | null;
  isOpen: boolean;
  onClose: () => void;
}

// === Category Colors (duplicated to avoid circular deps) ===

type CategoryColor = {
  bg: string;
  text: string;
  border: string;
};

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  Breaking: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  'Match Report': { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  Analysis: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  Transfer: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  Preview: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  Rumor: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

const DEFAULT_COLOR: CategoryColor = { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border' };

function getCategoryColor(category: string): CategoryColor {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

// === Helpers ===

function getReadingTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getArticleUrl(article: NewsArticle): string {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin;
  const slug = article.slug || article.id;
  return `${base}/news/${slug}`;
}

// === JSON-LD Structured Data ===

function buildJsonLd(article: NewsArticle) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.seoTitle || article.title,
    description: article.seoDescription || article.summary,
    image: article.imageUrl || undefined,
    datePublished: article.publishedAt,
    dateCreated: article.createdAt,
    author: {
      '@type': article.isAiGenerated ? 'Organization' : 'Person',
      name: article.source,
    },
    publisher: {
      '@type': 'Organization',
      name: 'GOALZONE',
    },
    articleSection: article.category,
    keywords: article.tags?.join(', ') || '',
  };
}

// === Social Sharing ===

function SocialShareBar({ article }: { article: NewsArticle }) {
  const url = getArticleUrl(article);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(article.title);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [url]);

  const shareTwitter = useCallback(() => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  }, [encodedTitle, encodedUrl]);

  const shareFacebook = useCallback(() => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  }, [encodedUrl]);

  const shareWhatsApp = useCallback(() => {
    window.open(
      `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, [encodedTitle, encodedUrl]);

  const shareButtons = [
    { icon: Link2, label: 'Copy Link', action: copyLink, color: 'text-muted-foreground hover:text-foreground' },
    { icon: Twitter, label: 'Share on X', action: shareTwitter, color: 'text-sky-400 hover:text-sky-300' },
    { icon: Facebook, label: 'Share on Facebook', action: shareFacebook, color: 'text-blue-400 hover:text-blue-300' },
    { icon: MessageCircle, label: 'Share on WhatsApp', action: shareWhatsApp, color: 'text-green-400 hover:text-green-300' },
  ];

  return (
    <div className="flex items-center gap-1.5">
      <Share2 className="w-3.5 h-3.5 text-muted-foreground mr-1" />
      {shareButtons.map(({ icon: Icon, label, action, color }) => (
        <button
          key={label}
          onClick={action}
          aria-label={label}
          className={`p-2 rounded-lg bg-muted/20 border border-border/50 transition-colors ${color}`}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

// === Article Content Renderer ===

function ArticleContent({ content }: { content: string }) {
  const paragraphs = useMemo(() => {
    if (!content) return [];
    return content.split('\n\n').filter((p) => p.trim().length > 0);
  }, [content]);

  if (paragraphs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Full article content coming soon...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="text-sm text-foreground/90 leading-relaxed">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

// === Main Modal Component ===

export function NewsDetailModal({ article, isOpen, onClose }: NewsDetailModalProps) {
  if (!article) return null;

  const color = getCategoryColor(article.category);
  const readingTime = getReadingTime(article.content);
  const jsonLd = buildJsonLd(article);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="news-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Slide-in Panel */}
          <motion.div
            key="news-panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl flex flex-col"
          >
            <div className="flex flex-col h-full glass-card border-l border-border rounded-l-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close article"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin">
                {/* Header */}
                <div className="space-y-4 pr-8">
                  {/* Category + AI badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border ${color.bg} ${color.text} ${color.border}`}>
                      {article.category === 'Breaking' && <Zap className="w-2.5 h-2.5" />}
                      {article.category}
                    </span>
                    {article.isAiGenerated && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold bg-neon/10 text-neon border border-neon/20 rounded-md">
                        <Zap className="w-2 h-2" />
                        AI Generated
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    {article.title}
                  </h1>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Newspaper className="w-3 h-3" />
                      {article.source}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(article.publishedAt)}
                    </span>
                    {article.league && (
                      <span className="px-1.5 py-0.5 bg-muted/30 rounded border border-border/50 text-[10px]">
                        {article.league}
                      </span>
                    )}
                    <span className="text-muted-foreground/60">
                      {readingTime} min read
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border/50" />

                {/* Article Content */}
                <ArticleContent content={article.content} />

                {/* Divider */}
                {article.tags && article.tags.length > 0 && (
                  <>
                    <div className="h-px bg-border/50" />
                    {/* Tags */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="w-3 h-3" />
                        Tags
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[...new Set(article.tags)].map((tag, i) => (
                          <span
                            key={`${tag}-${i}`}
                            className="px-2 py-1 text-[10px] font-medium bg-muted/20 text-muted-foreground border border-border/50 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Divider */}
                <div className="h-px bg-border/50" />

                {/* Social Sharing */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Share this article</span>
                  <SocialShareBar article={article} />
                </div>

                {/* Bottom spacer for scroll */}
                <div className="h-4" />
              </div>
            </div>
          </motion.div>

          {/* JSON-LD Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
