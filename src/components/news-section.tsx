'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, Zap, Clock, Tag, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// === Types ===

export interface NewsArticle {
  id: string;
  title: string;
  slug?: string;
  summary: string;
  content: string;
  category: string; // "Breaking" | "Match Report" | "Preview" | "Analysis" | "Transfer" | "Rumor"
  imageUrl: string;
  source: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  league: string;
  matchId?: string;
  isAiGenerated: boolean;
  publishedAt: string;
  createdAt: string;
}

interface NewsSectionProps {
  onArticleClick?: (article: NewsArticle) => void;
}

// === Category Config ===

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

const DEFAULT_CATEGORY_COLOR: CategoryColor = {
  bg: 'bg-muted/30',
  text: 'text-muted-foreground',
  border: 'border-border',
};

function getCategoryColor(category: string): CategoryColor {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}

// === Filter Tabs ===

const FILTER_TABS = ['All', 'Breaking', 'Match Report', 'Analysis', 'Transfer'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

// === Helpers ===

function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

// === Sub-Components ===

function CategoryBadge({ category }: { category: string }) {
  const color = getCategoryColor(category);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border ${color.bg} ${color.text} ${color.border}`}>
      {category === 'Breaking' && <Zap className="w-2.5 h-2.5" />}
      {category}
    </span>
  );
}

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold bg-neon/10 text-neon border border-neon/20 rounded-md">
      <Zap className="w-2 h-2" />
      AI
    </span>
  );
}

function LeagueBadge({ league }: { league: string }) {
  if (!league) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium bg-muted/40 text-muted-foreground rounded border border-border/50">
      {league}
    </span>
  );
}

function NewsCard({
  article,
  index,
  onClick,
}: {
  article: NewsArticle;
  index: number;
  onClick: () => void;
}) {
  const isNew = (() => {
    try {
      const d = new Date(article.publishedAt || article.createdAt)
      return Date.now() - d.getTime() < 300000 // 5 minutes = "new"
    } catch {
      return false
    }
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={`Read article: ${article.title}`}
      className={cn(
        "glass-card glass-card-hover rounded-xl p-5 cursor-pointer flex flex-col gap-3 transition-shadow duration-200",
        isNew && "ring-1 ring-neon/30"
      )}
    >
      {/* Cover Image */}
      {article.imageUrl && (
        <div className="relative h-32 w-full rounded-lg overflow-hidden">
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          {isNew && (
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-neon text-neon-foreground rounded-md shadow-md">
                NEW
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header: Category + AI badge + NEW badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <CategoryBadge category={article.category} />
        {article.isAiGenerated && <AiBadge />}
        {!article.imageUrl && isNew && (
          <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold bg-neon text-neon-foreground rounded-md shadow-sm">
            NEW
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
        {article.title}
      </h3>

      {/* Summary */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {article.summary}
      </p>

      {/* Footer: League, Time, Source */}
      <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
        <LeagueBadge league={article.league} />
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-2.5 h-2.5" />
          {getRelativeTime(article.publishedAt || article.createdAt)}
        </span>
        <span className="text-[10px] text-muted-foreground/70 ml-auto">
          {article.source}
        </span>
      </div>

      {/* Tags (show first 3, deduplicated) */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <Tag className="w-2.5 h-2.5 text-muted-foreground/50" />
          {[...new Set(article.tags)].slice(0, 3).map((tag, i) => (
            <span key={`tag-${article.id}-${i}-${tag}`} className="text-[9px] text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function NewsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-8 rounded" />
          </div>
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
          <div className="flex items-center gap-2 pt-1">
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-14 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
        <Newspaper className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">No news articles yet</p>
        <p className="text-xs text-muted-foreground">Articles will appear here when generated from the admin panel</p>
      </div>
    </motion.div>
  );
}

// === Main Component ===

export function NewsSection({ onArticleClick }: NewsSectionProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  // Fetch news from API
  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('Failed to fetch news');
      const data = await res.json();
      // Map API response to full NewsArticle shape (API may return partial data)
      const mapped: NewsArticle[] = data.map((item: Record<string, unknown>) => ({
        id: item.id as string || '',
        title: item.title as string || '',
        slug: item.slug as string || undefined,
        summary: item.summary as string || '',
        content: item.content as string || '',
        category: item.category as string || 'Analysis',
        imageUrl: item.imageUrl as string || '',
        source: item.source as string || 'GOALZONE',
        tags: Array.isArray(item.tags) ? item.tags as string[] : [],
        seoTitle: item.seoTitle as string || '',
        seoDescription: item.seoDescription as string || '',
        league: item.league as string || '',
        matchId: item.matchId as string || undefined,
        isAiGenerated: item.isAiGenerated as boolean ?? true,
        publishedAt: item.publishedAt as string || item.createdAt as string || new Date().toISOString(),
        createdAt: item.createdAt as string || new Date().toISOString(),
      }));
      setNews(mapped);
    } catch {
      // silently fail on refresh
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Auto-refresh every 15 seconds so admin-generated articles appear quickly
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNews();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // Filter news
  const filteredNews = activeFilter === 'All'
    ? news
    : news.filter((a) => a.category === activeFilter);

  return (
    <section id="news" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-lg font-bold text-foreground"
        >
          <Newspaper className="w-5 h-5 text-neon" />
          Latest News
        </motion.h2>

        <div className="flex items-center gap-2">
          {/* Auto-refresh indicator */}
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <RefreshCw className="w-3 h-3" />
            Auto-refresh
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeFilter === tab
                ? 'bg-neon/15 text-neon border border-neon/30 shadow-sm'
                : 'bg-muted/20 text-muted-foreground border border-transparent hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <NewsSkeleton />
      ) : filteredNews.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredNews.map((article, i) => (
              <NewsCard
                key={article.id}
                article={article}
                index={i}
                onClick={() => onArticleClick?.(article)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
