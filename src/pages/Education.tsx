import { useState, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ArticleCard } from "@/components/education/ArticleCard";
import { TipCard } from "@/components/education/TipCard";
import { ResourceCard } from "@/components/education/ResourceCard";
import { EducationContentModal } from "@/components/education/EducationContentModal";

type TabType = 'articles' | 'tips' | 'resources';

interface Article {
  id: string;
  title: string;
  preview: string;
  content: string;
  readTime: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
}

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface Resource {
  id: string;
  title: string;
  description: string;
  content: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  type: 'video' | 'pdf' | 'course' | 'lesson';
  progress: number;
}

// Mock data
const articles: Article[] = [
  {
    id: '1',
    title: 'Understanding Market Structure: The Foundation of Technical Analysis',
    preview: 'Learn how to identify key market structures including higher highs, lower lows, and trend changes that form the basis of all technical trading strategies.',
    content: `Market structure is the backbone of technical analysis. Understanding how price moves in waves and creates patterns is essential for any trader.\n\nKey Concepts:\n\n1. Higher Highs and Higher Lows (Uptrend)\nIn an uptrend, price consistently makes higher highs and higher lows. This pattern indicates buying pressure is dominant.\n\n2. Lower Highs and Lower Lows (Downtrend)\nDowntrends are characterized by consecutive lower highs and lower lows, showing sellers are in control.\n\n3. Break of Structure (BOS)\nA break of structure occurs when price breaks a significant swing point, potentially signaling a trend change.\n\n4. Change of Character (CHoCH)\nThis is the first sign of a potential reversal, where price fails to continue the current structure.\n\nPractical Application:\n- Wait for clear structure before entering trades\n- Use structure breaks to identify potential reversal zones\n- Combine with volume analysis for confirmation\n- Always respect the higher timeframe structure`,
    readTime: '8 min read',
    level: 'Beginner',
    tags: ['Technical Analysis', 'Market Structure', 'Trends']
  },
  {
    id: '2',
    title: 'Risk Management: Position Sizing for Consistent Growth',
    preview: 'Discover the mathematical approach to position sizing that protects your capital while maximizing growth potential.',
    content: `Proper position sizing is what separates professional traders from amateurs. It's not about how much you can make, but how much you can lose.\n\nThe 1% Rule:\nNever risk more than 1-2% of your account on any single trade. This ensures you can survive losing streaks and remain in the game.\n\nCalculating Position Size:\nPosition Size = (Account Risk) / (Stop Loss in Points × Point Value)\n\nExample:\n- Account: $10,000\n- Risk: 1% = $100\n- Stop Loss: 50 pips\n- Pip Value: $10/pip (1 standard lot)\n- Position Size: $100 / (50 × $10) = 0.2 lots\n\nRisk of Ruin:\nWith 1% risk per trade, you would need 100 consecutive losses to blow your account. This is statistically almost impossible with any edge-based strategy.\n\nKey Takeaways:\n- Size positions based on stop loss, not potential profit\n- Keep risk consistent regardless of conviction\n- Scale up only when account grows, not when you "feel confident"`,
    readTime: '6 min read',
    level: 'Beginner',
    tags: ['Risk Management', 'Position Sizing', 'Capital Protection']
  },
  {
    id: '3',
    title: 'Order Flow Analysis: Reading the Institutional Footprint',
    preview: 'Advanced techniques for understanding how institutional traders move markets and how to position alongside them.',
    content: `Order flow analysis reveals the true supply and demand behind price movements. Unlike traditional indicators that lag, order flow shows real-time market participation.\n\nKey Order Flow Concepts:\n\n1. Liquidity Pools\nAreas where stop losses cluster create liquidity pools. Institutions need this liquidity to fill large orders.\n\n2. Order Blocks\nThese are areas where institutional orders were executed, often becoming future support/resistance.\n\n3. Fair Value Gaps\nRapid price movements that leave gaps in the order book. Price often returns to fill these inefficiencies.\n\n4. Absorption\nWhen aggressive buying/selling is absorbed by passive orders, indicating potential reversals.\n\nPractical Application:\n- Identify where retail stops are likely placed\n- Wait for liquidity sweeps before entering\n- Use order blocks as entry zones\n- Trade fair value gaps for mean reversion\n\nRemember: Institutions need retail traders on the wrong side to fill their positions.`,
    readTime: '12 min read',
    level: 'Advanced',
    tags: ['Order Flow', 'Institutional Trading', 'Liquidity']
  },
  {
    id: '4',
    title: 'Session Trading: Maximizing the London-New York Overlap',
    preview: 'How to capitalize on the most volatile and liquid trading hours of the day for optimal trade execution.',
    content: `The London-New York overlap (8:00 AM - 12:00 PM EST) is the most active trading period, offering the best opportunities for directional trades.\n\nWhy This Session Matters:\n- Highest volume and liquidity\n- Major economic releases\n- Clear directional moves\n- Tightest spreads\n\nSession Strategy:\n1. Prepare before London open (3:00 AM EST)\n2. Note overnight high/low levels\n3. Wait for initial volatility to settle\n4. Look for breakout trades during overlap\n5. Close positions before NY close\n\nKey Times (EST):\n- 3:00 AM: London Open\n- 8:00 AM: New York Open\n- 8:30 AM: Major US data releases\n- 12:00 PM: London Close\n- 4:00 PM: New York Close\n\nBest Pairs:\nEURUSD, GBPUSD, and USDJPY typically offer the cleanest moves during the overlap.`,
    readTime: '5 min read',
    level: 'Intermediate',
    tags: ['Session Trading', 'London', 'New York', 'Volatility']
  },
  {
    id: '5',
    title: 'The Psychology of Drawdowns: Mental Frameworks for Recovery',
    preview: 'Develop the psychological resilience needed to navigate losing streaks without abandoning your strategy.',
    content: `Every trader faces drawdowns. How you handle them determines your long-term success.\n\nUnderstanding Drawdowns:\nA drawdown is the peak-to-trough decline in your account. Even profitable strategies can have 20-30% drawdowns.\n\nMental Framework:\n\n1. Expected vs. Unexpected Drawdowns\n- If your strategy has a historical max drawdown of 25%, experiencing 15% is normal\n- Panic only when drawdowns exceed historical norms significantly\n\n2. The Recovery Mindset\n- A 20% loss requires 25% gain to recover\n- A 50% loss requires 100% gain to recover\n- This is why small, consistent losses are manageable\n\n3. Process Over Outcome\n- Focus on executing your system correctly\n- Review trades for execution errors, not just results\n- Accept that individual trade outcomes are random\n\nRecovery Protocol:\n- Reduce position size during drawdowns (not increase)\n- Take a 24-48 hour break after large losses\n- Review your edge with historical data\n- Re-enter slowly with half positions\n- Never revenge trade`,
    readTime: '10 min read',
    level: 'Intermediate',
    tags: ['Psychology', 'Drawdowns', 'Mental Resilience']
  }
];

const tips: Tip[] = [
  { id: '1', title: 'Always set your stop loss before entering a trade', content: 'Define your risk before thinking about profit. Place stops at logical levels where your trade idea is invalidated.', category: 'Risk Management', level: 'Beginner' },
  { id: '2', title: 'Use the 1% rule religiously', content: 'Never risk more than 1% of your account on a single trade. This keeps you in the game through inevitable losing streaks.', category: 'Risk Management', level: 'Beginner' },
  { id: '3', title: 'Mark the previous day high and low', content: 'These levels act as magnets for price and often provide excellent entry and exit points.', category: 'Charting', level: 'Beginner' },
  { id: '4', title: 'Wait for candle close before entering', content: 'A wick can become a body. Always wait for the candle to close before confirming your setup.', category: 'Execution', level: 'Beginner' },
  { id: '5', title: 'Trade the first hour with caution', content: 'The first hour of any session is often choppy. Let the market show its hand before committing.', category: 'Execution', level: 'Intermediate' },
  { id: '6', title: 'Keep a trading journal', content: 'Record every trade with screenshots and notes. Review weekly to identify patterns in your behavior.', category: 'Psychology', level: 'Beginner' },
  { id: '7', title: 'Avoid trading around major news', content: 'Unless you trade news specifically, close positions 15 minutes before high-impact releases.', category: 'Risk Management', level: 'Intermediate' },
  { id: '8', title: 'Higher timeframe bias, lower timeframe entry', content: 'Use H4/Daily for direction, H1/M15 for entries. This alignment improves win rate significantly.', category: 'Charting', level: 'Intermediate' },
  { id: '9', title: 'Scale out, not in', content: 'Take partial profits at logical levels. Never add to losing positions hoping they will recover.', category: 'Risk Management', level: 'Advanced' },
  { id: '10', title: 'Your edge exists over 100+ trades', content: 'Individual trades are coin flips. Your strategy\'s edge only manifests over a large sample size.', category: 'Psychology', level: 'Intermediate' },
  { id: '11', title: 'Avoid revenge trading at all costs', content: 'After a loss, take a break. Emotional trading compounds losses and destroys accounts.', category: 'Psychology', level: 'Beginner' },
  { id: '12', title: 'Trade less, not more', content: 'Quality over quantity. The best traders take 2-3 setups per week, not 20 per day.', category: 'Execution', level: 'Advanced' }
];

const resources: Resource[] = [
  { id: '1', title: 'Complete Price Action Masterclass', description: 'A comprehensive 4-hour video course covering all aspects of price action trading from basics to advanced concepts.', content: 'This masterclass covers everything you need to know about price action trading...', duration: '4 hours', level: 'Beginner', type: 'course', progress: 45 },
  { id: '2', title: 'Risk Management Calculator Guide', description: 'Downloadable PDF with position sizing formulas, risk of ruin tables, and practical worksheets.', content: 'Complete guide to calculating position sizes and managing risk...', duration: '30 min read', level: 'Beginner', type: 'pdf', progress: 100 },
  { id: '3', title: 'Order Flow Fundamentals', description: 'Understanding how institutional orders affect price movement and how to trade alongside smart money.', content: 'Order flow analysis reveals the true supply and demand...', duration: '2 hours', level: 'Advanced', type: 'video', progress: 0 },
  { id: '4', title: 'Session Trading Blueprint', description: 'Learn to trade the London and New York sessions with specific strategies for each time zone.', content: 'Each trading session has unique characteristics...', duration: '1.5 hours', level: 'Intermediate', type: 'lesson', progress: 75 },
  { id: '5', title: 'Trading Psychology Workbook', description: 'Interactive PDF with exercises for developing mental discipline and emotional control.', content: 'Psychology is 80% of trading success...', duration: '45 min read', level: 'Intermediate', type: 'pdf', progress: 20 },
  { id: '6', title: 'Advanced Chart Pattern Recognition', description: 'Deep dive into complex chart patterns including harmonics, Elliott Wave, and Wyckoff method.', content: 'Advanced patterns offer high-probability setups...', duration: '3 hours', level: 'Advanced', type: 'course', progress: 0 }
];

export default function Education() {
  const [activeTab, setActiveTab] = useState<TabType>('articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContent, setSelectedContent] = useState<{
    title: string;
    type: 'article' | 'tip' | 'resource';
    level?: 'Beginner' | 'Intermediate' | 'Advanced';
    readTime?: string;
    duration?: string;
    tags?: string[];
    content: string;
  } | null>(null);
  const [bookmarkedResources, setBookmarkedResources] = useState<string[]>([]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'articles', label: 'Articles & Guides' },
    { id: 'tips', label: 'Tips' },
    { id: 'resources', label: 'Educational Resources' }
  ];

  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(query) || 
      a.preview.toLowerCase().includes(query) ||
      a.tags.some(t => t.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const filteredTips = useMemo(() => {
    if (!searchQuery) return tips;
    const query = searchQuery.toLowerCase();
    return tips.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.content.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredResources = useMemo(() => {
    if (!searchQuery) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter(r => 
      r.title.toLowerCase().includes(query) || 
      r.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleArticleClick = (article: Article) => {
    setSelectedContent({
      title: article.title,
      type: 'article',
      level: article.level,
      readTime: article.readTime,
      tags: article.tags,
      content: article.content
    });
  };

  const handleTipClick = (tip: Tip) => {
    setSelectedContent({
      title: tip.title,
      type: 'tip',
      level: tip.level,
      tags: [tip.category],
      content: tip.content
    });
  };

  const handleResourceClick = (resource: Resource) => {
    setSelectedContent({
      title: resource.title,
      type: 'resource',
      level: resource.level,
      duration: resource.duration,
      content: resource.content
    });
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedResources(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Education" />
      
      <div className="flex-1 p-6 overflow-y-auto scrollbar-hidden">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search articles, tips, resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>

          {/* Tab Bar */}
          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          {activeTab === 'articles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  title={article.title}
                  preview={article.preview}
                  readTime={article.readTime}
                  level={article.level}
                  tags={article.tags}
                  onClick={() => handleArticleClick(article)}
                />
              ))}
              {filteredArticles.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No articles found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTips.map((tip) => (
                <TipCard
                  key={tip.id}
                  title={tip.title}
                  content={tip.content}
                  category={tip.category}
                  level={tip.level}
                  onClick={() => handleTipClick(tip)}
                />
              ))}
              {filteredTips.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No tips found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  title={resource.title}
                  description={resource.description}
                  duration={resource.duration}
                  level={resource.level}
                  type={resource.type}
                  progress={resource.progress}
                  isBookmarked={bookmarkedResources.includes(resource.id)}
                  onClick={() => handleResourceClick(resource)}
                  onBookmark={() => toggleBookmark(resource.id)}
                />
              ))}
              {filteredResources.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No resources found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Modal */}
      <EducationContentModal
        isOpen={!!selectedContent}
        onClose={() => setSelectedContent(null)}
        content={selectedContent}
      />
    </div>
  );
}
