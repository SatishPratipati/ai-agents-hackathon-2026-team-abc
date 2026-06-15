"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  BarChart, PieChart, TrendingUp, HelpCircle, 
  ArrowLeft, RefreshCw, Layers, ThumbsUp, AlertCircle
} from "lucide-react";
import Link from "next/link";

interface AnalyticsData {
  total_queries: number;

  intent_statistics: Record<string, number>;

  dialect_statistics: Record<string, number>;

  dataset_growths?: {
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

  accuracy_trends: {
    daily: Array<{
      date: string;
      accuracy: number;
      total_rated: number;
    }>;

    weekly: Array<{
      date: string;
      accuracy: number;
      total_rated: number;
    }>;

    monthly: Array<{
      date: string;
      accuracy: number;
      total_rated: number;
    }>;
  };

  translation_metrics?: {
    most_corrected_phrases: any[];
  };

  most_common_queries: Array<{
    text: string;
    count: number;
    dialect: string;
    intent: string;
  }>;
}

const COLORS = [
  "#8B5E3C", // Primary
  "#B08968", // Secondary
  "#D4A373", // Accent
  "#3D2B1F", // Dark Text
  "#7A6A5C", // Muted
  "#C4A484", // Light Brown
  "#E6D7C3", // Tan
  "#A3C1AD"  // Sage
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const API_HOST = "http://localhost:8000";

  useEffect(() => {
    async function fetchAnalytics() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_HOST}/analytics`);
        if (!res.ok) throw new Error("Could not fetch database stats");
        const json = await res.json();
        
        // If database is completely empty (0 queries), default to mock to present dashboard correctly
        if (json.total_queries === 0) {
          setData(MOCK_ANALYTICS);
          setIsUsingMock(true);
        } else {
          setData(json);
          setIsUsingMock(false);
        }
      } catch (err) {
        console.error("Using mock statistics: Backend offline or error occurred.", err);
        setData(MOCK_ANALYTICS);
        setIsUsingMock(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 bg-card rounded-custom" />
          <div className="h-80 bg-card rounded-custom" />
        </div>
      </div>
    );
  }

  const stats = data || MOCK_ANALYTICS;

  // Compute values for Donut SVG Pie Chart
  const dialectEntries = Object.entries(stats.dialect_statistics);
  const totalDialectCount = dialectEntries.reduce((acc, [_, count]) => acc + count, 0);
  
  let accumulatedPercent = 0;
  const pieSlices = dialectEntries.map(([name, count], index) => {
    const percent = totalDialectCount > 0 ? (count / totalDialectCount) : 0;
    const startPercent = accumulatedPercent;
    accumulatedPercent += percent;
    return {
      name,
      count,
      percent,
      startPercent,
      color: COLORS[index % COLORS.length]
    };
  });

  // SVG parameters for donut chart
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;

  // Compute values for Line Chart SVG
  const history = stats && stats.accuracy_trends && stats.accuracy_trends.daily ? stats.accuracy_trends.daily: [];
  const lineWidth = 500;
  const lineHeight = 180;
  const padding = 25;
  const chartHeight = lineHeight - padding * 2;
  const chartWidth = lineWidth - padding * 2;

  const points = history.map((item, index) => {
    const x = padding + (index / Math.max(1, history.length - 1)) * chartWidth;
    // Invert Y because SVG coordinates start from top-left (0,0)
    const y = padding + chartHeight - (item.accuracy / 100) * chartHeight;
    return { x, y, ...item };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");

  // Create smooth bezier path string for line chart
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

  // Create area path filled with brown/accent gradient
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${lineHeight - padding} L ${points[0].x} ${lineHeight - padding} Z`
    : "";

  return (
    <div className="space-y-10">
      
      {/* Header and status info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-custom pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Link href="/" className="p-1 hover:bg-card rounded-full smooth-hover" title="Back to Translator">
              <ArrowLeft size={16} />
            </Link>
            <h2 className="font-outfit font-extrabold text-2xl">Analytics Dashboard</h2>
          </div>
          <p className="text-text-muted text-[13px] mt-0.5">Real-time usage insights, linguistic distributions, and feedback logs.</p>
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

      {/* Main Highlights Stats Tiles */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Total Queries */}
        <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Total Queries</span>
            <h3 className="text-3xl font-extrabold text-primary font-outfit mt-1">{stats.total_queries}</h3>
            <p className="text-[11px] text-text-muted mt-1">Processed since deployment</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-custom text-primary">
            <Layers size={24} />
          </div>
        </div>

        {/* Metric 2: Primary Accuracy */}
        <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Feedback Accuracy</span>
            <h3 className="text-3xl font-extrabold text-primary font-outfit mt-1">{stats.feedback_statistics?.accuracy_percentage ?? 0}%</h3>
            <p className="text-[11px] text-text-muted mt-1">{stats.feedback_statistics.rated_count} queries rated by users</p>
          </div>
          <div className="p-4 bg-accent/10 rounded-custom text-accent">
            <ThumbsUp size={24} />
          </div>
        </div>

        {/* Metric 3: Dialect Share */}
        <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Telangana Dominance</span>
            <h3 className="text-3xl font-extrabold text-primary font-outfit mt-1">
              {stats.dialect_statistics["Telangana"] 
                ? Math.round((stats.dialect_statistics["Telangana"] / Math.max(1, totalDialectCount)) * 100)
                : 0}%
            </h3>
            <p className="text-[11px] text-text-muted mt-1">Highest dialect region share</p>
          </div>
          <div className="p-4 bg-secondary/15 rounded-custom text-text-main">
            <TrendingUp size={24} />
          </div>
        </div>

      </section>

      {/* Distribution Charts Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Donut Chart: Dialect Distribution */}
        <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-6">
          <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider flex items-center gap-2">
            <PieChart size={16} className="text-primary" />
            Dialect Distribution
          </h4>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
            
            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36">
              <svg width="100%" height="100%" viewBox="0 0 160 160" className="-rotate-90">
                {/* Background Ring */}
                <circle 
                  cx="80" 
                  cy="80" 
                  r={donutRadius} 
                  fill="transparent" 
                  stroke="#E8DCCF" 
                  strokeWidth="16" 
                />
                
                {/* Slices */}
                {pieSlices.map((slice, i) => {
                  const strokeDasharray = `${slice.percent * donutCircumference} ${donutCircumference}`;
                  const strokeDashoffset = -slice.startPercent * donutCircumference;
                  return (
                    <circle
                      key={i}
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="16"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap={slice.percent > 0.05 ? "round" : "butt"}
                      className="transition-all duration-500 ease-out"
                    />
                  );
                })}
              </svg>
              {/* Central text info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Total</span>
                <span className="text-lg font-extrabold text-primary font-outfit">{totalDialectCount}</span>
              </div>
            </div>

            {/* Chart Legend */}
            <div className="space-y-2.5 flex-1 max-w-[200px] text-[13px] font-inter">
              {pieSlices.map((slice, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="text-text-main font-medium">{slice.name}</span>
                  </div>
                  <span className="font-semibold text-text-muted">
                    {slice.count} ({Math.round(slice.percent * 100)}%)
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Horizontal Bar Chart: Intent Distribution */}
        <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-6">
          <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider flex items-center gap-2">
            <BarChart size={16} className="text-primary" />
            Travel Intent Distribution
          </h4>
          
          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
            {Object.entries(stats.intent_statistics).map(([intent, count], i) => {
              const maxCount = Math.max(...Object.values(stats.intent_statistics));
              const pctOfMax = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={intent} className="space-y-1 text-[13px] font-inter">
                  <div className="flex items-center justify-between">
                    <span className="text-text-main font-semibold">{intent}</span>
                    <span className="font-semibold text-text-muted">{count} queries</span>
                  </div>
                  <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pctOfMax}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className="bg-primary h-full rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* Accuracy Line Chart */}
      <section className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Feedback Accuracy Trend
          </h4>
          <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
            Rating History (Last {history.length} active periods)
          </span>
        </div>

        {/* Line Chart Draw Area */}
        <div className="relative w-full h-[200px]">
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${lineWidth} ${lineHeight}`} 
            preserveAspectRatio="none"
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5E3C" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#8B5E3C" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid Line Marks */}
            <line x1={padding} y1={padding} x2={lineWidth-padding} y2={padding} stroke="#E8DCCF" strokeDasharray="4 4" />
            <line x1={padding} y1={padding + chartHeight / 2} x2={lineWidth-padding} y2={padding + chartHeight / 2} stroke="#E8DCCF" strokeDasharray="4 4" />
            <line x1={padding} y1={lineHeight - padding} x2={lineWidth-padding} y2={lineHeight - padding} stroke="#E8DCCF" />

            {/* Accuracy Labels (Y Axis) */}
            <text x={padding - 5} y={padding + 4} textAnchor="end" className="fill-text-muted text-[9px] font-bold">100%</text>
            <text x={padding - 5} y={padding + chartHeight/2 + 4} textAnchor="end" className="fill-text-muted text-[9px] font-bold">50%</text>
            <text x={padding - 5} y={lineHeight - padding + 4} textAnchor="end" className="fill-text-muted text-[9px] font-bold">0%</text>

            {/* Shaded Area */}
            {points.length > 1 && (
              <path d={areaD} fill="url(#chartGradient)" />
            )}

            {/* SVG Path Line */}
            {points.length > 1 && (
              <path 
                d={pathD} 
                fill="none" 
                stroke="#8B5E3C" 
                strokeWidth="3.5" 
                strokeLinecap="round"
                className="stroke-draw"
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
                  className="transition-all hover:r-7"
                />
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="12" 
                  fill="transparent"
                />
                {/* Visual Tooltip label */}
                <text 
                  x={p.x} 
                  y={p.y - 10} 
                  textAnchor="middle" 
                  className="fill-text-main text-[9px] font-extrabold hidden group-hover:block"
                >
                  {p.accuracy}% ({p.total_rated} ratings)
                </text>
              </g>
            ))}

            {/* Date Labels (X Axis) */}
            {points.map((p, i) => (
              <text 
                key={i} 
                x={p.x} 
                y={lineHeight - padding + 15} 
                textAnchor="middle" 
                className="fill-text-muted text-[8px] font-bold uppercase tracking-wider"
              >
                {p.date.substring(5)} {/* MM-DD */}
              </text>
            ))}
          </svg>
        </div>
      </section>

      {/* Most Common Queries Table */}
      <section className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-4">
        <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider flex items-center gap-2">
          Most Common Queries
        </h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-inter">
            <thead>
              <tr className="border-b border-border-custom text-text-muted uppercase text-[10px] tracking-wider font-extrabold">
                <th className="py-3 px-4">Query</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Detected Dialect</th>
                <th className="py-3 px-4">Classified Intent</th>
              </tr>
            </thead>
            <tbody>
              {stats.most_common_queries.map((q, idx) => (
                <tr key={idx} className="border-b border-border-custom hover:bg-background/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-text-main">{q.text}</td>
                  <td className="py-3 px-4 text-primary font-bold">{q.count} times</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-background border border-border-custom rounded-full text-[11px]">
                      {q.dialect}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-muted font-medium">{q.intent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
