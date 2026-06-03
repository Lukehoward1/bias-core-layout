export interface EducationArticle {
  id: string;
  title: string;
  description: string;
  readTime: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  content: string;
}

export interface EducationTip {
  id: string;
  title: string;
  description: string;
  readTime: string;
  tags: string[];
  content: string;
}

export const articles: EducationArticle[] = [
  {
    id: "a1",
    title: "Understanding Market Structure",
    description: "The foundation of all technical analysis — learn to read how price actually moves.",
    readTime: "6 min",
    level: "Beginner",
    tags: ["Technical", "Price Action"],
    content: `Market structure is the backbone of technical analysis. Before any indicator or pattern makes sense, you must understand how price builds: through a series of highs and lows that reveal whether buyers or sellers are currently in control.

UPTREND STRUCTURE
A healthy uptrend creates Higher Highs (HH) and Higher Lows (HL). Price rallies, pulls back to a level above the last low, then rallies again. Each swing low is a higher platform than the one before it. If price closes below a Higher Low, that's your first warning — structure may be shifting.

DOWNTREND STRUCTURE
A downtrend creates Lower Highs (LH) and Lower Lows (LL). Each rally is capped below the previous peak, and each pullback breaks below the last low. Sellers are progressively gaining ground.

BREAK OF STRUCTURE (BOS)
A Break of Structure occurs when price decisively closes beyond a key swing point. A bullish BOS happens when price breaks above a previous swing high. A bearish BOS happens when price breaks below a previous swing low. The BOS is the market's announcement that momentum has shifted.

CHANGE OF CHARACTER (CHoCH)
A Change of Character is the first signal of a potential trend reversal — happening before a full BOS. In an uptrend, a CHoCH is a lower low being formed. It suggests momentum is weakening even if the trend hasn't fully reversed yet.

HOW TO USE THIS IN PRACTICE
1. Zoom out to your higher timeframe (H4 or Daily) first — establish the macro structure.
2. Drop to your execution timeframe (M15 or H1) to find entry precision within the direction of the higher timeframe bias.
3. Only take trades that align with structure. If the Daily is bearish, avoid longing on the M5.

Market structure alone won't make you a great trader, but ignoring it will guarantee poor decisions. Make it your first filter for every trade.`,
  },
  {
    id: "a2",
    title: "The Psychology of Drawdowns",
    description: "Losing streaks are inevitable. What separates professionals is how they respond.",
    readTime: "8 min",
    level: "Intermediate",
    tags: ["Psychology", "Mindset"],
    content: `Every trader, regardless of their win rate, will experience drawdowns. A drawdown is simply the decline from a peak equity level to a subsequent trough. Understanding them psychologically is just as important as managing them mathematically.

WHY DRAWDOWNS HIT HARDER THAN WINS FEEL GOOD
Loss aversion — a well-documented cognitive bias — means that psychologically, losses feel roughly twice as painful as equivalent gains feel rewarding. A £500 loss hurts more than a £500 win feels good. This asymmetry creates dangerous pressure to "make it back" quickly.

THE REVENGE TRADING TRAP
After a loss (or series of losses), the brain wants resolution. The dangerous instinct is to increase position size, skip confirmation, or trade outside your plan to recoup losses faster. Revenge trading typically converts a manageable drawdown into an account-damaging one.

Signs you're revenge trading:
• You're taking setups you'd normally skip
• Your position size has increased after a loss
• You're still angry or frustrated from the previous trade
• You're screen-watching intensely between setups

WHAT TO DO DURING A DRAWDOWN
1. Reduce your position size. Half size means half the emotional impact per trade, which improves decision-making.
2. Review, don't react. Look at your losing trades — are they strategy failures, or execution errors? Only one requires a strategy change.
3. Take a break. A 24–48 hour reset can interrupt the psychological loop.
4. Trust your edge. If your strategy has positive expectancy over a sample of 100+ trades, five or ten consecutive losses are statistically normal.

WHAT NORMAL DRAWDOWNS LOOK LIKE
Even a 65% win rate strategy with a 1.5R average will experience streaks of 5–7 consecutive losses regularly. This is not a strategy problem. This is variance. Expecting zero drawdowns means expecting an impossible edge.

The traders who survive long enough to compound are the ones who treat drawdowns as information, not punishment.`,
  },
  {
    id: "a3",
    title: "Session Trading 101",
    description: "Maximize your results by aligning trades with the best liquidity windows.",
    readTime: "5 min",
    level: "Beginner",
    tags: ["Strategy", "Sessions"],
    content: `Forex and CFD markets don't operate uniformly across 24 hours. Liquidity, volatility, and institutional participation vary dramatically depending on which financial centres are open. Understanding sessions is one of the highest-leverage adjustments a trader can make.

THE THREE MAJOR SESSIONS

Asian Session (00:00 – 06:00 GMT)
Centred on Tokyo and Sydney. This session tends to have lower volatility and tighter ranges. Pairs like USD/JPY and AUD/USD see their most concentrated activity here. Many traders avoid this session because large moves are less common — but it can be a good time to observe range formation that the next session will break.

London Session (07:00 – 16:00 GMT)
The largest session by volume. European institutions, banks, and funds drive significant order flow. The "London Open" (07:00–09:00 GMT) is often where the day's major move begins. Volatility is high, spreads are tight, and most major pairs move meaningfully.

New York Session (12:00 – 21:00 GMT)
Overlaps with London from 12:00–16:00 GMT — this overlap is the single highest-liquidity window of the day. US economic releases (CPI, NFP, FOMC) drop during NY session hours and can trigger large directional moves.

THE OVERLAP IS KING
The London–New York overlap (12:00–16:00 GMT) is statistically the best window for trading major pairs. Both institutions are active simultaneously, spreads are at their tightest, and most significant intraday moves complete or accelerate during this window.

PRACTICAL SESSION RULES
• Know which session you're trading before you open the platform.
• If you trade the Asian session, expect ranges — not trends.
• Set alerts for London Open if you're targeting breakouts.
• Time your risk around economic releases — either avoid the 5 minutes around a release, or have a specific release-trading plan.

Session awareness alone won't create an edge, but trading against session timing is a consistent way to give back profits to the market.`,
  },
  {
    id: "a4",
    title: "Order Flow Basics",
    description: "Learn to read institutional footprints and understand why price moves where it does.",
    readTime: "10 min",
    level: "Advanced",
    tags: ["Technical", "Institutional"],
    content: `Order flow is the study of buying and selling pressure as it manifests in price itself — without the need for a DOM (Depth of Market) feed. It's about understanding where institutions have placed large orders and how the market will behave when those levels are revisited.

THE MYTH OF RETAIL VS INSTITUTIONAL
Large players — banks, hedge funds, prop desks — do not move price arbitrarily. They need liquidity to fill large positions without moving the market against themselves. This liquidity requirement creates predictable behaviour: institutions accumulate positions at certain levels, defend those levels, and then drive price through areas with opposing orders.

KEY ORDER FLOW CONCEPTS

Order Blocks
An Order Block (OB) is the last bearish candle before a significant bullish move (bullish OB) or the last bullish candle before a significant bearish move (bearish OB). These represent the candles where institutional orders were placed. When price returns to these areas, it often reacts because those same institutions are defending their original positions.

Fair Value Gaps (FVG / Imbalance)
An FVG occurs when three consecutive candles create a gap between the wick of the first candle and the wick of the third candle — the middle candle moves so aggressively that normal two-sided trading didn't occur in that zone. Price frequently returns to these imbalances to "fill" them before continuing.

Liquidity
Institutional players need to fill large orders. They source that liquidity from stop orders placed by retail traders. This is why stop hunts occur — price sweeps equal lows (where retail buy stop-losses and sell-stops are concentrated), fills the institutional order, then reverses. Understanding where retail stops are clustered tells you where institutions are likely to reach.

READING ORDER FLOW ON A CHART
1. Identify the most recent impulse move — where did price go aggressively in one direction?
2. Find the origin candle(s) of that move — this is your Order Block.
3. Look for FVGs created during that move.
4. Wait for price to retrace back into the OB or FVG zone.
5. Look for confirmation (lower timeframe structure shift) before entering.

Order flow analysis is not a guarantee — it's a probability framework. The goal is to identify where large players are likely participating and align your trades in that direction.`,
  },
  {
    id: "a5",
    title: "Risk/Reward Ratios in Practice",
    description: "Why the ratio matters more than your win rate — and how to use it correctly.",
    readTime: "5 min",
    level: "Beginner",
    tags: ["Risk Management", "Fundamentals"],
    content: `Most new traders focus on win rate. Professionals focus on expectancy — a function of both win rate and risk/reward ratio. Understanding this distinction is one of the most important mindset shifts in trading.

WHAT IS RISK/REWARD RATIO?
The R:R ratio compares the potential profit of a trade to its potential loss. A 2:1 R:R means for every £1 risked, you target £2 in profit. If your stop loss is 30 pips and your target is 60 pips, that's a 2:1 trade.

THE EXPECTANCY FORMULA
Expectancy = (Win Rate × Average Win) – (Loss Rate × Average Loss)

Example with 50% win rate and 2:1 R:R:
Expectancy = (0.50 × 2R) – (0.50 × 1R) = 1R – 0.5R = +0.5R per trade

This means even winning only half your trades, you make 0.5R profit per trade on average. Over 100 trades risking £100 each, that's £5,000 profit.

THE MINIMUM THRESHOLD
At a 1:1 R:R, you need to win over 50% of trades just to break even (ignoring spread). At 2:1 R:R, you only need a 34% win rate to be profitable. At 3:1 R:R, you only need 26%. Higher R:R ratios give you more room for error.

COMMON MISTAKES
• Moving stop losses to improve the ratio. If you move your stop closer after entry to fake a higher R:R, you're increasing the probability of being stopped out. The ratio is only meaningful at trade setup, not manipulated after entry.
• Taking small profits early. If a 3:1 setup exits at 1:1 "to lock in profits," your actual R:R collapses. Trust your plan.
• Not accounting for spread and commissions. A 1:1 R:R trade with 2 pips of spread on a 10-pip target is actually a losing trade.

HOW TO APPLY IT
Every trade should have a defined stop loss and target before entry. Write down the R:R. If it's below 1.5:1 for a strategy that doesn't have an 80%+ win rate, reconsider the setup.`,
  },
  {
    id: "a6",
    title: "Reading Economic Releases",
    description: "Turn news events from threats into opportunities with a structured approach.",
    readTime: "7 min",
    level: "Intermediate",
    tags: ["Fundamental", "Risk Management"],
    content: `Economic data releases move markets. The question is whether you treat them as threats — unpredictable volatility to avoid — or as structured events with repeatable patterns.

THE KEY RELEASES (UK/US FOCUSED)

Non-Farm Payrolls (NFP) — First Friday of each month, 13:30 GMT
The most anticipated US employment figure. A significantly higher-than-expected print is bullish USD; lower is bearish. The initial spike can reverse — a common trap for reactive traders.

Consumer Price Index (CPI) — Mid-month, 13:30 GMT
Core inflation data. Higher-than-expected CPI signals potential rate hikes, bullish for that currency. Watch for the "buy the rumour, sell the news" dynamic if the market has already priced in the expectation.

FOMC Interest Rate Decision — Eight times per year, 19:00 GMT
The most important US announcement. Markets are forward-looking — the rate decision itself is rarely a surprise. The statement and press conference that follow often drive more sustained moves than the initial decision.

Bank of England (BoE) — Eight times per year, 12:00 GMT
The UK equivalent. GBP pairs will react strongly. Watch for the Governor's press conference tone.

HOW TO TRADE AROUND RELEASES

Option 1: Avoid entirely. Step out of active trades 5 minutes before and re-evaluate after. This is the safest approach for discretionary traders.

Option 2: Wait for the dust to settle. Let price spike, reverse, and establish a new level. Then trade the structure from that new level. The 15–30 minute period after a major release often sets up cleaner entries than the initial spike.

Option 3: Straddle (advanced). Place opposing pending orders above and below the current price before the release, expecting one to trigger. Requires careful management — both orders can trigger in a whipsaw.

THE DEVIATION FORMULA
What moves markets is the difference between actual and expected. A 200K NFP print when 150K was expected is more bullish than a 250K print when 300K was expected. Always compare actual vs. consensus, not just the absolute number.

Most economic calendars show previous, forecast, and actual values. The "actual vs. forecast" gap is your trading signal — not the number in isolation.`,
  },
  {
    id: "a7",
    title: "The Power of Higher Timeframes",
    description: "Why your lower timeframe trades are only as good as your higher timeframe context.",
    readTime: "6 min",
    level: "Intermediate",
    tags: ["Technical", "Price Action"],
    content: `One of the most common mistakes in retail trading is overweighting the timeframe you execute on. The M5 or M15 chart tells you where to enter. The H4 or Daily chart tells you whether the trade makes sense in the first place.

THE TIMEFRAME HIERARCHY
Think of markets in layers:

Monthly / Weekly — The macro bias. Where is price in the grand scheme? Is this an established trend or a long-term range? Institutions use these charts.

Daily / H4 — The intermediate trend. Is today's session in an uptrend or downtrend? Where are the major support and resistance zones? This is where your trade direction is confirmed.

H1 / M30 — Refinement. Where are the key levels within today's range? This is where you look for patterns and setups to form.

M15 / M5 — Entry and management. Where do you actually pull the trigger? What's the specific candle pattern or structure shift that triggers entry?

TOP-DOWN ANALYSIS
Always start from the top and work down. A bullish setup on M5 inside a bearish Daily trend is a counter-trend trade — statistically lower probability. Most losses in retail trading come from taking entries without checking the context above.

Step 1: Check Daily bias (up/down/range).
Step 2: Find the key H4 level you're approaching.
Step 3: Drop to H1 for entry structure.
Step 4: Use M15/M5 for the actual entry trigger.

THE MAGNIFICATION PRINCIPLE
A support zone on the H4 chart may span 50–80 pips. On the M15, that same zone might be a specific range of 5–10 pips. Higher timeframe zones are more significant — more participants are watching them — but they require lower timeframe precision to enter without excessive stop loss distance.

WHY MOST TRADERS IGNORE THIS
The lower timeframe is more exciting. More movement, more "action," more apparent opportunities. But those apparent opportunities are often noise within a larger, cleaner move. The trader who understands that the M5 bounce is happening at an H4 support zone will hold longer and size better than the trader who only sees the M5.`,
  },
  {
    id: "a8",
    title: "Stop Loss Placement Strategies",
    description: "Bad stop placement is as damaging as a bad entry. Here's how to place them correctly.",
    readTime: "6 min",
    level: "Beginner",
    tags: ["Risk Management", "Technical"],
    content: `The stop loss is not an afterthought — it's the most important part of the trade setup. Its placement determines your risk, affects your R:R, and tells you whether a trade idea is invalidated.

PRINCIPLE: STOP BEHIND STRUCTURE
Your stop loss should go where, if price reaches it, your trade idea is definitively wrong. Not where you've decided to risk a certain number of pips — where the market structure invalidates your thesis.

For a long trade: place the stop below the swing low that supports your bullish case. If that low is taken out, the structure has failed.
For a short trade: place the stop above the swing high that caps the move. If that high is breached, your bearish thesis is wrong.

COMMON STOP PLACEMENT MISTAKES

1. Round Number Stops
Placing a stop at exactly 30 pips, or at a round price level (1.2500), puts you alongside thousands of other retail traders. Institutional algorithms are often programmed to sweep these clusters. Place stops a few pips beyond key levels, not at them.

2. Stops Inside the Range
If price is in a 20-pip range and you place your stop 10 pips away inside that range, you will be stopped out by normal volatility before the trade has time to develop.

3. Moving Stops Against the Trade
The most damaging behaviour: widening your stop to avoid being stopped out. This violates the original trade premise and compounds risk. Your stop was placed where the idea is wrong — that hasn't changed.

4. Stops Too Tight for the Timeframe
A 5-pip stop on a 15-minute chart is almost guaranteed to be hit by spread alone on some pairs. Each timeframe has a natural volatility range. H1 trades need H1-scale stops.

ATR-BASED POSITIONING
The Average True Range (ATR) measures recent volatility. Placing stops at 1x ATR beyond your structural level ensures the stop is sized to the pair's natural movement. A pair with a 20-pip ATR on H1 shouldn't have a 5-pip stop.

THE RIGHT WORKFLOW
1. Identify the structural level that invalidates your trade.
2. Add 5–10 pips buffer beyond that level.
3. Calculate position size based on that stop distance.
4. Confirm the R:R is at least 1.5:1 before taking the trade.`,
  },
  {
    id: "a9",
    title: "Trade Management — Scaling Out",
    description: "How to manage open trades to maximise profit while protecting your initial gain.",
    readTime: "7 min",
    level: "Advanced",
    tags: ["Strategy", "Risk Management"],
    content: `Taking a full position size to full target works statistically over a large sample — but it can create significant drawdown in the middle of a trade. Scaling out is a method of managing this by taking partial profits at interim levels while letting the remainder run.

WHAT IS SCALING OUT?
Scaling out means closing a portion of your position at a predetermined target, then managing the remainder with a trailing stop or a second target.

Example: You're long 2 lots at 1.2850, stop at 1.2820 (30 pips risk), target at 1.2940 (90 pips, 3:1 R:R).
Scale 1: Close 1 lot at 1.2880 (30 pips profit, 1:1 R:R). Move stop to breakeven.
Scale 2: Let remaining 1 lot run to 1.2940.

Result: If price reverses from 1.2880, you've locked in 30 pips on lot 1 and broken even on lot 2 — net +30 pips. If it hits full target, you make 30+90 = 120 pips across the position.

THE TRADEOFFS

Advantages:
• Reduces emotional pressure once the first partial is taken.
• Guarantees some profit if the trade partially works.
• Frees psychological capital to hold the remainder to full target.

Disadvantages:
• Reduces average win size compared to holding full position.
• If full target is always hit, scaling out underperforms a "hold full" approach.
• Requires more management decisions (where to move stop, when to close remainder).

BREAKEVEN STOP — A DOUBLE-EDGED TOOL
Moving your stop to breakeven after scale 1 is protective, but it introduces a new problem: normal volatility can stop you out at breakeven before the trade fully develops. Consider moving stop to +5 or +10 pips (a slight profit) rather than exactly to entry.

TRAILING STOP APPROACHES
• Fixed pip trail: Move stop up every X pips that price advances.
• Structure-based trail: Move stop below each new Higher Low as the trade runs.
• ATR trail: Move stop 1x ATR below the current price, updating as price moves.

Structure-based trailing tends to give trades the most room to run while still capturing the bulk of a swing. Fixed pip trails are simpler but can be stopped out by minor retracements.

WHEN TO HOLD FULL
If your strategy has strong statistical basis (50%+ win rate with 2:1+ R:R tested over 200+ trades), holding full to target will produce higher absolute returns than scaling out. Scaling out is psychologically beneficial but mathematically inferior in a strong-edge strategy.`,
  },
  {
    id: "a10",
    title: "Confirmation vs. Anticipation",
    description: "Two valid entry approaches with different risk profiles — know which suits your strategy.",
    readTime: "6 min",
    level: "Intermediate",
    tags: ["Strategy", "Execution"],
    content: `There are two fundamental ways to enter a trade: waiting for confirmation that the move is happening, or anticipating it in advance. Both are valid. The choice depends on your risk tolerance, win rate targets, and R:R requirements.

ANTICIPATION ENTRIES (LIMIT ORDERS)
You identify a level — an Order Block, a Fibonacci retracement, a previous high-turned-support — and place a limit order to enter as price approaches it, before any confirmation.

Advantages:
• Tighter entry price = better R:R (smaller stop to same target).
• Less screen time required.
• Works well in trending markets where pullbacks are consistent.

Disadvantages:
• Price may not reach your level (missed trade).
• Price reaches the level and continues through it (immediate loss with no confirmation).
• Requires high conviction in the level's significance.

CONFIRMATION ENTRIES (MARKET ORDERS)
You wait for price to arrive at the level and show you a signal — a rejection candle, a lower timeframe structure shift, a bullish/bearish engulfing pattern — before entering.

Advantages:
• Higher probability entry (the level held, you've seen evidence).
• Fewer losses to "level ran through" scenarios.
• More psychological confidence in the trade.

Disadvantages:
• Larger stop required (structure shift takes price further from the ideal entry).
• Lower R:R than an anticipation entry to the same target.
• Requires screen presence and manual execution.

WHICH IS BETTER?
Neither — they serve different strategies. A trader targeting 3:1 R:R setups on H4 may prefer anticipation entries because the R:R at limit is excellent. A trader on M15 who needs to see confirmation before committing capital will take confirmation entries and accept tighter R:R.

The real danger is mixing them inconsistently: placing a limit order (anticipation) but then second-guessing the entry and cancelling if price doesn't confirm — then chasing the move after it's gone.

Pick an approach per setup type and stick to it. Consistency in entry logic creates consistency in results.`,
  },
  {
    id: "a11",
    title: "Position Sizing: The Formula That Matters",
    description: "Never guess your lot size again — calculate it from your account risk every time.",
    readTime: "5 min",
    level: "Beginner",
    tags: ["Risk Management", "Fundamentals"],
    content: `Position sizing is the bridge between your stop loss placement and your account risk management. Getting it wrong is one of the fastest ways to blow an account. Getting it right creates mathematical consistency regardless of what the market does.

THE CORE PRINCIPLE
Never think in terms of lot sizes first. Think in terms of:
1. How much of my account am I willing to risk on this trade? (e.g., 1%)
2. Where is my stop loss? (e.g., 30 pips from entry)
3. What lot size achieves exactly that £ risk at that stop?

THE FORMULA
Position Size (lots) = Account Risk (£) ÷ (Stop Loss in pips × Pip Value per lot)

For most major pairs (GBP/USD, EUR/USD), 1 standard lot = £10/pip, 1 mini lot = £1/pip, 1 micro lot = £0.10/pip.

WORKED EXAMPLE
Account: £5,000
Risk per trade: 1% = £50
Stop loss: 30 pips
Pip value (1 lot): £10/pip

Position Size = £50 ÷ (30 × £10) = £50 ÷ £300 = 0.167 lots (approximately 0.16 lots)

If your broker allows 0.01 increments, enter 0.16 lots. Your maximum loss on this trade is £48 — within your 1% rule.

THE 1% RULE EXPLAINED
Risking 1% per trade means you'd need 100 consecutive losses to lose your entire account. In practice, this is mathematically impossible for most strategies. It also means a drawdown of 10 consecutive losses only reduces your account by ~9.5% (compounding effect) — a recoverable situation with no emotional crisis.

Risking 5% per trade means 20 consecutive losses wipes you out. A 5-loss streak — entirely normal for any strategy — cuts your account by over 22%.

ACCOUNT SIZE AND LOT SIZING
• Micro accounts (£100–£500): Trade micro lots (0.01–0.05)
• Mini accounts (£1,000–£5,000): Trade mini to small standard lots (0.05–0.3)
• Standard accounts (£10,000+): Trade in 0.1–1.0 lot range depending on stop

The math doesn't change. Always start with account risk, not with lot preference.`,
  },
  {
    id: "a12",
    title: "The Weekly Trading Prep Routine",
    description: "What professional traders do before markets open — and why it changes everything.",
    readTime: "6 min",
    level: "Beginner",
    tags: ["Mindset", "Process"],
    content: `Preparation separates traders who react from traders who execute a plan. A consistent weekly prep routine reduces in-session cognitive load, improves decision quality, and ensures you're trading with context rather than impulse.

SUNDAY EVENING: THE WEEKLY SETUP (30–45 minutes)

1. Review Last Week's Trades (10 min)
Before looking forward, look back. Were there any trades that violated your rules? Any missed setups? Any patterns in your losses? Note one specific improvement for the coming week.

2. Mark Weekly and Daily Key Levels (15 min)
Open your charts on the Daily and Weekly timeframe. Mark:
• Previous weekly high and low
• Major support and resistance from recent months
• Any unfilled Fair Value Gaps or Order Blocks from the Daily
These levels are where price is most likely to react next week.

3. Check the Economic Calendar (5 min)
Use an economic calendar to identify high-impact events for the week:
• Are there any FOMC meetings, CPI releases, or NFP prints?
• On what day and time? Note them and decide in advance: will you trade through them or step aside?

4. Write Your Weekly Bias (5–10 min)
For each pair you trade, write one sentence: "This week, I am looking for [long/short/neutral] opportunities because [reason from Daily/H4 structure]."

This sentence is your anchor. It prevents you from taking counter-trend trades impulsively.

THE DAILY ROUTINE (10–15 minutes per session)

Before each session, review:
• Did anything in the overnight session invalidate your weekly bias?
• Where is price in relation to your marked key levels?
• What specific setups am I watching for today?

After each session:
• Log any trades taken (win or loss, notes on execution)
• Update your levels if price has broken through any key zones

THE COMPOUND BENEFIT
A trader with a weekly prep routine has already made the important decisions before the market opens. During the session, they're executing a plan — not making it. This removes the emotional component that destroys most retail accounts.

The routine takes less than an hour per week. The return on that hour, compounded over a trading career, is immeasurable.`,
  },
];

export const tips: EducationTip[] = [
  {
    id: "t1",
    title: "Always set your stop loss first",
    description: "Define your risk before you think about profit.",
    readTime: "1 min",
    tags: ["Risk Management"],
    content: `Before you enter any trade, define your stop loss level — not after you're in, not "approximately," not "I'll set it when I get in." Before.

WHY THIS MATTERS
Your stop loss defines your risk. Without it placed at entry, every losing trade has an undefined downside. It's human nature to move a stop further away once you're watching an open loss — the trade "just needs more room." This is how manageable losses become account-threatening ones.

THE DISCIPLINE
Place your stop at the level where your trade thesis is invalidated by the market. Then calculate your position size based on that stop distance and your account risk percentage. Enter the trade knowing exactly what the worst-case outcome is.

A trade without a stop loss isn't a trade — it's a gamble.`,
  },
  {
    id: "t2",
    title: "Wait for the candle to close",
    description: "A wick can become a body. Price needs time to confirm.",
    readTime: "1 min",
    tags: ["Execution"],
    content: `One of the most consistent execution mistakes is entering based on a candle that hasn't closed yet. An aggressive bearish push during a candle might look like a rejection — until the candle closes as a bullish engulfing.

THE RULE
Wait for the candle to close on your confirmation timeframe before entering. The pattern doesn't exist until it's complete.

WHY THIS SAVES MONEY
Markets routinely probe levels during a candle period before reversing before close. Entering on an "almost confirmation" means you're entering on market noise, not on a confirmed signal.

The practical cost is a slightly worse entry price. The practical benefit is a dramatically higher accuracy rate on your entries. The extra few pips of entry price are almost always worth the confirmation.`,
  },
  {
    id: "t3",
    title: "Trade the London–NY overlap",
    description: "The highest-liquidity window of the trading day.",
    readTime: "1 min",
    tags: ["Sessions", "Strategy"],
    content: `The London–New York overlap runs from approximately 12:00 to 16:00 GMT. During this four-hour window, two of the world's three largest financial centres are simultaneously open for business.

WHAT THIS MEANS IN PRACTICE
• Spreads are at their tightest (lower transaction cost per trade)
• Volume is highest (your orders are filled faster with less slippage)
• Major intraday moves are most likely to initiate or complete here
• US economic releases drop into this window (13:30 GMT)

IF YOU HAVE LIMITED SCREEN TIME
This is the session to prioritise. A trader with one focused hour from 13:00–14:00 GMT will see better average conditions than one who trades randomly across the full 24-hour cycle.

You don't need to be in the market all day. You need to be in the right part of the day.`,
  },
  {
    id: "t4",
    title: "Journal every trade",
    description: "Data you don't record can't improve you.",
    readTime: "1 min",
    tags: ["Psychology", "Process"],
    content: `A trading journal is the difference between repeating mistakes and systematically eliminating them. Without data on your own performance, every loss is isolated — you can't see the patterns across 50 or 100 trades that reveal your actual edge (or lack of one).

WHAT TO LOG
• Date, pair, direction, entry price, stop, target
• Actual exit price and P&L
• Why you took the trade (setup type)
• Emotional state at entry (1–5 scale)
• Rating of execution quality (did you follow your rules?)
• Notes on what you'd do differently

THE REVIEW
Set aside 20–30 minutes at the end of each week to review the last 10 trades. Look for patterns: Are your losses concentrated in a specific session? A specific pair? After a loss? These patterns are invisible without the journal and obvious with it.

Most traders know they should journal. Almost none do it consistently. This is one of the clearest edges available to any trader — and it costs nothing.`,
  },
  {
    id: "t5",
    title: "Size down during losing streaks",
    description: "Protect your capital and your mindset when variance goes against you.",
    readTime: "1 min",
    tags: ["Risk Management", "Psychology"],
    content: `When you experience consecutive losses — regardless of whether those losses were strategy violations or simply variance — the correct response is to reduce position size, not maintain or increase it.

WHY THIS WORKS MECHANICALLY
Smaller size means smaller P&L swings. Smaller swings reduce the emotional impact of each trade. Reduced emotional impact improves decision quality. Better decisions lead to better trades. This is how you break the losing-streak cycle rather than accelerating into it.

THE PRACTICAL RULE
After 3 consecutive losses, drop to half your normal position size. After 5, drop to quarter size. Only return to full size after 3 consecutive winning trades at the reduced size.

This rule won't feel good in the moment — your first winning trade at half size will generate half the profit. That's the point. You're proving to yourself and your account that you've broken the cycle before committing full risk again.

Losing streaks end. Blown accounts don't recover.`,
  },
  {
    id: "t6",
    title: "Never chase a missed move",
    description: "The market always offers another opportunity. Your entry price isn't negotiable.",
    readTime: "1 min",
    tags: ["Execution", "Psychology"],
    content: `You identified a setup. You hesitated. Price moved 80 pips in your direction without you. Now you're watching it and thinking: should I chase it?

THE ANSWER IS NO.

WHY CHASING DESTROYS ACCOUNTS
When you enter a move that's already extended, you have two problems:
1. Your entry is at a worse price than the original setup.
2. The original stop level is now much further away — or meaningless.
This means a worse R:R and a higher probability of catching the reversal that typically follows a sharp extension.

WHAT TO DO INSTEAD
Mark why you missed it. Was it hesitation? Distraction? Not watching the right timeframe? Then wait. Price revisits significant levels more often than not. If it doesn't, the next opportunity is hours or days away — not worth the degraded entry quality of chasing.

"The trade I didn't take" is one of the most expensive entries in trading.`,
  },
];
