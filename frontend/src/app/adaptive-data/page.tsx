"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, RefreshCw, Layers, Database, Sparkles, 
  ThumbsUp, ThumbsDown, BarChart, TrendingUp, Table, AlertCircle, Award
} from "lucide-react";
import Link from "next/link";

interface AnalyticsData {
  total_queries: number;
  dataset_growths: {
    normalization_examples: number;
    intent_examples: number;
    translation_examples: number;
  };
  feedback_statistics: {
    correct_count: number;
    incorrect_count: number;
    rated_count: number;
    accuracy_percentage: number;
    acceptance_rate: number;
    corrections_received: number;
  };
  dialect_statistics: Record<string, number>;
  accuracy_trends: {
    daily: Array<{ date: string; accuracy: number; total_rated: number }>;
    weekly: Array<{ date: string; accuracy: number; total_rated: number }>;
    monthly: Array<{ date: string; accuracy: number; total_rated: number }>;
  };
  translation_metrics: {
    most_corrected_phrases: Array<{
      original_telugu: string;
      predicted_en: string;
      corrected_en: string;
      predicted_ta: string;
      corrected_ta: string;
    }>;
  };
}

const MOCK_DATA: AnalyticsData = {
  total_queries: 54,
  dataset_growths: {
    normalization_examples: 26,
    intent_examples: 22,
    translation_examples: 20
  },
  feedback_statistics: {
    correct_count: 28,
    incorrect_count: 6,
    rated_count: 34,
    accuracy_percentage: 82.4,
    acceptance_rate: 82.4,
    corrections_received: 6
  },
  dialect_statistics: {
    "Telangana": 28,
    "Rayalaseema": 16,
    "Uttarandhra": 8,
    "Standard Telugu": 2
  },
  accuracy_trends: {
    daily: [
      { date: "2026-05-24", accuracy: 75.0, total_rated: 4 },
      { date: "2026-05-25", accuracy: 80.0, total_rated: 5 },
      { date: "2026-05-26", accuracy: 85.7, total_rated: 7 },
      { date: "2026-05-27", accuracy: 80.0, total_rated: 5 },
      { date: "2026-05-28", accuracy: 83.3, total_rated: 6 },
      { date: "2026-05-29", accuracy: 90.0, total_rated: 4 },
      { date: "2026-05-30", accuracy: 82.4, total_rated: 3 }
    ],
    weekly: [
      { date: "Wk 18", accuracy: 76.2, total_rated: 12 },
      { date: "Wk 19", accuracy: 80.0, total_rated: 15 },
      { date: "Wk 20", accuracy: 85.0, total_rated: 20 },
      { date: "Wk 21", accuracy: 82.4, total_rated: 17 }
    ],
    monthly: [
      { date: "Mar 2026", accuracy: 72.5, total_rated: 45 },
      { date: "Apr 2026", accuracy: 78.4, total_rated: 51 },
      { date: "May 2026", accuracy: 82.4, total_rated: 54 }
    ]
  },
  translation_metrics: {
    most_corrected_phrases: [
      {
        original_telugu: "అంగడికి ఎట్లా పోవాలా?",
        predicted_en: "How to go to the shop?",
        corrected_en: "How do I walk to the market shop?",
        predicted_ta: "கடைக்கு எப்படி செல்வது?",
        corrected_ta: "கடைக்கு எப்படி நடந்து செல்வது?"
      },
      {
        original_telugu: "బస్సు ఎప్పుడు వస్తది?",
        predicted_en: "When will the bus arrive?",
        corrected_en: "When does the bus come?",
        predicted_ta: "பேருந்து எப்போது வரும்?",
        corrected_ta: "பஸ் எப்போது வரும்?"
      },
      {
        original_telugu: "నాయన ఎక్కడున్నాడు?",
        predicted_en: "Where is father?",
        corrected_en: "Where is my dad?",
        predicted_ta: "தந்தை எங்கே?",
        corrected_ta: "அப்பா எங்கே இருக்கிறார்?"
      }
    ]
  }
};

export default function AdaptiveDataPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [trendTab, setTrendTab] = useState<"daily" | "weekly" | "monthly">("daily");

  const API_HOST = "http://localhost:8000";

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_HOST}/analytics`);
        if (!res.ok) throw new Error("Could not fetch database stats");
        const json = await res.json();
        
        // If SQLite feedback is completely blank (e.g. fresh environment), show mock stats for rich preview
        if (!json.dataset_growths || json.dataset_growths.normalization_examples === 0) {
          setData(MOCK_DATA);
          setIsUsingMock(true);
        } else {
          setData(json);
          setIsUsingMock(false);
        }
      } catch (err) {
        console.error("Using mock statistics: Backend offline or error occurred.", err);
        setData(MOCK_DATA);
        setIsUsingMock(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-card rounded-md w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-card rounded-custom" />
          <div className="h-28 bg-card rounded-custom" />
          <div className="h-28 bg-card rounded-custom" />
        </div>
        <div className="h-80 bg-card rounded-custom" />
      </div>
    );
  }

  const stats = data || MOCK_DATA;

  // Calculate percentages for Dialect Coverage progress lines
  const telanganaCount = stats.dialect_statistics["Telangana"] || 0;
  const rayalaseemaCount = stats.dialect_statistics["Rayalaseema"] || 0;
  const uttarandhraCount = stats.dialect_statistics["Uttarandhra"] || 0;
  const totalDialectCount = telanganaCount + rayalaseemaCount + uttarandhraCount || 1;

  const telanganaPct = Math.round((telanganaCount / totalDialectCount) * 100);
  const rayalaseemaPct = Math.round((rayalaseemaCount / totalDialectCount) * 100);
  const uttarandhraPct = Math.round((uttarandhraCount / totalDialectCount) * 100);

  // SVG parameters for trend graph
  const trendHistory = stats.accuracy_trends[trendTab] || [];
  const lineWidth = 600;
  const lineHeight = 200;
  const padding = 30;
  const chartWidth = lineWidth - padding * 2;
  const chartHeight = lineHeight - padding * 2;

  const points = trendHistory.map((item, index) => {
    const x = padding + (index / Math.max(1, trendHistory.length - 1)) * chartWidth;
    const y = padding + chartHeight - (item.accuracy / 100) * chartHeight;
    return { x, y, ...item };
  });

  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX1 = prev.x + (curr.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (curr.x - prev.x) / 2;
      const cpY2 = curr.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
  }

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${lineHeight - padding} L ${points[0].x} ${lineHeight - padding} Z`
    : "";

  return (
    <div className="space-y-10">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-custom pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Link href="/" className="p-1 hover:bg-card rounded-full smooth-hover" title="Back to Translator">
              <ArrowLeft size={16} />
            </Link>
            <h2 className="font-outfit font-extrabold text-2xl">Adaptive Data Track</h2>
          </div>
          <p className="text-text-muted text-[13px] mt-0.5">
            Evolving dataset metrics, dialect coverages, and translation correction metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isUsingMock && (
            <span className="px-3 py-1.5 bg-accent/15 border border-accent/20 text-primary text-[11px] font-extrabold rounded-custom flex items-center gap-1.5 uppercase tracking-wider">
              <AlertCircle size={13} />
              Demonstration Mode
            </span>
          )}
          <button 
            onClick={() => setRefreshTrigger(t => t + 1)}
            className="p-2 border border-border-custom hover:bg-card rounded-custom smooth-hover text-text-muted hover:text-text-main flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Flagship Highlight banner */}
      <section className="bg-card border border-border-custom rounded-custom p-6 flex flex-col md:flex-row items-center justify-between gap-6 custom-shadow">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-primary/10 rounded-custom text-primary flex-shrink-0">
            <Award size={28} />
          </div>
          <div className="space-y-1 max-w-xl">
            <h3 className="font-outfit font-extrabold text-[15px] text-text-main flex items-center gap-2">
              Human-in-the-Loop Adaptive Learning Core
              <span className="px-2 py-0.5 bg-success/20 text-success text-[9px] uppercase tracking-widest font-extrabold rounded-full">ACTIVE</span>
            </h3>
            <p className="text-text-muted text-xs leading-relaxed">
              Traveler correction feedback immediately updates our SQLite database records. Future translations query this database first to intercept and correct pipeline mistakes. Corrections also feed dynamically into the Gemini prompt as in-context few-shot examples!
            </p>
          </div>
        </div>
        <div className="text-center bg-background border border-border-custom px-5 py-3.5 rounded-custom shadow-sm min-w-[140px]">
          <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold block">Learning Loop</span>
          <span className="text-xl font-extrabold text-primary font-outfit mt-0.5 block">100% Dynamic</span>
        </div>
      </section>

      {/* Dataset Growths Section */}
      <section className="space-y-4">
        <h3 className="font-outfit font-extrabold text-sm text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Database size={14} className="text-primary" />
          Dataset Growth Metrics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Dialect Normalization examples */}
          <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow relative overflow-hidden group">
            <div className="space-y-3 z-10 relative">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Dataset 1</span>
              <h4 className="font-outfit font-extrabold text-[14px] text-text-main">Dialect Normalizations</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary font-outfit">
                  {stats.dataset_growths.normalization_examples}
                </span>
                <span className="text-xs text-text-muted font-medium">Examples stored</span>
              </div>
              <p className="text-[10px] text-text-muted">Maps regional dialect input to standard Telugu spellings</p>
            </div>
            <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Layers size={90} className="text-primary" />
            </div>
          </div>

          {/* Card 2: Travel Intent examples */}
          <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow relative overflow-hidden group">
            <div className="space-y-3 z-10 relative">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Dataset 2</span>
              <h4 className="font-outfit font-extrabold text-[14px] text-text-main">Travel Intents</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary font-outfit">
                  {stats.dataset_growths.intent_examples}
                </span>
                <span className="text-xs text-text-muted font-medium">Examples stored</span>
              </div>
              <p className="text-[10px] text-text-muted">Provides classification patterns for the 9 travel categories</p>
            </div>
            <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles size={90} className="text-primary" />
            </div>
          </div>

          {/* Card 3: Translation Dataset examples */}
          <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow relative overflow-hidden group">
            <div className="space-y-3 z-10 relative">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Dataset 3</span>
              <h4 className="font-outfit font-extrabold text-[14px] text-text-main">Multilingual Translations</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary font-outfit">
                  {stats.dataset_growths.translation_examples}
                </span>
                <span className="text-xs text-text-muted font-medium">Examples stored</span>
              </div>
              <p className="text-[10px] text-text-muted">Accumulates Telugu-English-Tamil-Roman Tamil translation pairs</p>
            </div>
            <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Database size={90} className="text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Statistics & Dialect Coverage */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Feedback Statistics */}
        <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-6">
          <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider flex items-center gap-2">
            <ThumbsUp size={16} className="text-primary" />
            Feedback logs Statistics
          </h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-[9px] text-text-muted uppercase tracking-widest block font-extrabold">Acceptance Rate</span>
              <span className="text-2xl font-extrabold text-primary font-outfit">{stats.feedback_statistics.acceptance_rate}%</span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-text-muted uppercase tracking-widest block font-extrabold">Correct Feedback</span>
              <span className="text-2xl font-extrabold text-success font-outfit">{stats.feedback_statistics.correct_count}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-text-muted uppercase tracking-widest block font-extrabold">Corrections Stored</span>
              <span className="text-2xl font-extrabold text-error font-outfit">{stats.feedback_statistics.corrections_received}</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border-custom text-[11px] font-semibold text-text-muted flex justify-between">
            <span>Rated queries: {stats.feedback_statistics.rated_count}</span>
            <span>Total processed queries: {stats.total_queries}</span>
          </div>
        </div>

        {/* Dialect Coverage Split */}
        <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-6">
          <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider flex items-center gap-2">
            <BarChart size={16} className="text-primary" />
            Dialect Region Coverage
          </h4>
          
          <div className="space-y-3.5 text-[13px] font-inter">
            {/* Telangana */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-main">Telangana Dialect</span>
                <span className="text-text-muted font-bold">{telanganaCount} queries ({telanganaPct}%)</span>
              </div>
              <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${telanganaPct}%` }} />
              </div>
            </div>
            
            {/* Rayalaseema */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-main">Rayalaseema Dialect</span>
                <span className="text-text-muted font-bold">{rayalaseemaCount} queries ({rayalaseemaPct}%)</span>
              </div>
              <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                <div className="bg-secondary h-full rounded-full" style={{ width: `${rayalaseemaPct}%` }} />
              </div>
            </div>

            {/* Uttarandhra */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-text-main">Uttarandhra Dialect</span>
                <span className="text-text-muted font-bold">{uttarandhraCount} queries ({uttarandhraPct}%)</span>
              </div>
              <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                <div className="bg-accent h-full rounded-full" style={{ width: `${uttarandhraPct}%` }} />
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Dynamic Intent Accuracy Trends Chart */}
      <section className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Travel Intent Accuracy Trends
          </h4>
          
          {/* Timeline Tab buttons */}
          <div className="flex items-center bg-background border border-border-custom rounded-custom p-0.5 text-[11px] font-semibold text-text-muted">
            <button
              onClick={() => setTrendTab("daily")}
              className={`px-3 py-1 rounded-custom transition-all ${trendTab === "daily" ? "bg-primary text-white" : "hover:text-text-main"}`}
            >
              Daily
            </button>
            <button
              onClick={() => setTrendTab("weekly")}
              className={`px-3 py-1 rounded-custom transition-all ${trendTab === "weekly" ? "bg-primary text-white" : "hover:text-text-main"}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTrendTab("monthly")}
              className={`px-3 py-1 rounded-custom transition-all ${trendTab === "monthly" ? "bg-primary text-white" : "hover:text-text-main"}`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* SVG Accuracy Trend line */}
        <div className="relative w-full h-[220px]">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${lineWidth} ${lineHeight}`} 
            preserveAspectRatio="none"
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5E3C" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8B5E3C" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid Line Marks */}
            <line x1={padding} y1={padding} x2={lineWidth-padding} y2={padding} stroke="#E8DCCF" strokeDasharray="4 4" />
            <line x1={padding} y1={padding + chartHeight/2} x2={lineWidth-padding} y2={padding + chartHeight/2} stroke="#E8DCCF" strokeDasharray="4 4" />
            <line x1={padding} y1={lineHeight - padding} x2={lineWidth-padding} y2={lineHeight - padding} stroke="#E8DCCF" />

            {/* Accuracy Labels (Y Axis) */}
            <text x={padding - 5} y={padding + 4} textAnchor="end" className="fill-text-muted text-[8px] font-bold">100%</text>
            <text x={padding - 5} y={padding + chartHeight/2 + 4} textAnchor="end" className="fill-text-muted text-[8px] font-bold">50%</text>
            <text x={padding - 5} y={lineHeight - padding + 4} textAnchor="end" className="fill-text-muted text-[8px] font-bold">0%</text>

            {/* Shaded Area */}
            {points.length > 1 && (
              <path d={areaD} fill="url(#trendGradient)" />
            )}

            {/* SVG Path Line */}
            {points.length > 1 && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="#8B5E3C" 
                strokeWidth="3.5" 
                strokeLinecap="round"
              />
            )}

            {/* Interactive Coordinate points */}
            {points.map((p, i) => (
              <g key={i} className="group cursor-pointer">
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="5" 
                  fill="#ffffff" 
                  stroke="#8B5E3C" 
                  strokeWidth="2.5" 
                  className="transition-all hover:r-6"
                />
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="12" 
                  fill="transparent"
                />
                <text 
                  x={p.x} 
                  y={p.y - 10} 
                  textAnchor="middle" 
                  className="fill-text-main text-[9px] font-extrabold hidden group-hover:block"
                >
                  {p.accuracy}% ({p.total_rated} rated)
                </text>
              </g>
            ))}

            {/* Axis date labels */}
            {points.map((p, i) => (
              <text 
                key={i} 
                x={p.x} 
                y={lineHeight - padding + 15} 
                textAnchor="middle" 
                className="fill-text-muted text-[8px] font-bold uppercase tracking-wider"
              >
                {trendTab === "daily" ? p.date.substring(5) : p.date}
              </text>
            ))}
          </svg>
        </div>
      </section>

      {/* Most Corrected Phrases Table */}
      <section className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-4">
        <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Table size={16} className="text-primary" />
          Flagship Translation Improvements (Most Corrected Phrases)
        </h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-inter">
            <thead>
              <tr className="border-b border-border-custom text-text-muted uppercase text-[10px] tracking-wider font-extrabold">
                <th className="py-3 px-4">Standard Telugu</th>
                <th className="py-3 px-4">Baseline English Output</th>
                <th className="py-3 px-4 text-primary">Corrected English Translation</th>
                <th className="py-3 px-4">Baseline Tamil Output</th>
                <th className="py-3 px-4 text-primary">Corrected Tamil Translation</th>
              </tr>
            </thead>
            <tbody>
              {stats.translation_metrics.most_corrected_phrases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-4 text-center text-text-muted text-xs">
                    No translation corrections received yet. Submit an incorrect rating correction on the translator screen!
                  </td>
                </tr>
              ) : (
                stats.translation_metrics.most_corrected_phrases.map((phrase, idx) => (
                  <tr key={idx} className="border-b border-border-custom hover:bg-background/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-text-main font-outfit">{phrase.original_telugu}</td>
                    <td className="py-4 px-4 text-text-muted line-through">"{phrase.predicted_en}"</td>
                    <td className="py-4 px-4 text-primary font-bold">"{phrase.corrected_en}"</td>
                    <td className="py-4 px-4 text-text-muted line-through">"{phrase.predicted_ta}"</td>
                    <td className="py-4 px-4 text-primary font-bold">"{phrase.corrected_ta}"</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
