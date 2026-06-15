"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ThumbsUp, ThumbsDown, HelpCircle, 
  Search, MessageSquare, Clock, Filter, AlertCircle
} from "lucide-react";
import Link from "next/link";

interface LogEntry {
  id: number;
  timestamp: string;
  original_text: string;
  input_type: string;
  telugu_script: string;
  normalized_telugu: string;
  dialect: string;
  intent: string;
  feedback_type: "unrated" | "correct" | "incorrect";
  corrected_intent: string | null;
  corrected_english: string | null;
  corrected_tamil: string | null;
  english_translation: string;
  tamil_translation: string;
  tamil_romanized: string;
}

const MOCK_LOGS: LogEntry[] = [
  {
    id: 1,
    timestamp: new Date().toISOString(),
    original_text: "bus eppudu vasthadi?",
    input_type: "Roman Telugu",
    telugu_script: "బస్సు ఎప్పుడు వస్తది?",
    normalized_telugu: "బస్సు ఎప్పుడు వస్తుంది?",
    dialect: "Telangana",
    intent: "Transportation",
    feedback_type: "correct",
    corrected_intent: null,
    corrected_english: null,
    corrected_tamil: null,
    english_translation: "When will the bus arrive?",
    tamil_translation: "பேருந்து எப்போது வரும்?",
    tamil_romanized: "Perunthu eppodhu varum?"
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    original_text: "అంగడికి ఎట్లా పోవాలా?",
    input_type: "Telugu Script",
    telugu_script: "అంగడికి ఎట్లా పోవాలా?",
    normalized_telugu: "దుకాణానికి ఎలా వెళ్ళాలి?",
    dialect: "Rayalaseema",
    intent: "Navigation / Direction",
    feedback_type: "incorrect",
    corrected_intent: "Shopping",
    corrected_english: "How do I walk to the market shop?",
    corrected_tamil: "கடைக்கு எப்படி நடந்து செல்வது?",
    english_translation: "How to go to the shop?",
    tamil_translation: "கடைக்கு எப்படி செல்வது?",
    tamil_romanized: "Kadaikku eppadi selvathu?"
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    original_text: "ekkada manchi hotel undi?",
    input_type: "Roman Telugu",
    telugu_script: "ఎక్కడ మంచి హోటల్ ఉంది?",
    normalized_telugu: "ఎక్కడ మంచి హోటల్ ఉంది?",
    dialect: "Standard Telugu",
    intent: "Food / Dining",
    feedback_type: "unrated",
    corrected_intent: null,
    corrected_english: null,
    corrected_tamil: null,
    english_translation: "Where is a good hotel?",
    tamil_translation: "ஒரு நல்ல ஹோட்டல் எங்கே இருக்கிறது?",
    tamil_romanized: "Oru nalla hotel enge irukkirathu?"
  }
];

export default function FeedbackLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "correct" | "incorrect" | "unrated">("all");

  const API_HOST = "http://localhost:8000";

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_HOST}/feedback`);
        if (!res.ok) throw new Error("Could not load feedback logs");
        const data = await res.json();
        
        if (data.length === 0) {
          setLogs(MOCK_LOGS);
          setIsUsingMock(true);
        } else {
          // Sort logs to show most recent first
          const sorted = [...data].reverse();
          setLogs(sorted);
          setIsUsingMock(false);
        }
      } catch (err) {
        console.error("Using mock logs: API unreachable or error occurred.", err);
        setLogs(MOCK_LOGS);
        setIsUsingMock(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  const filteredLogs = logs.filter(log => {
    // 1. Text Search Match
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      log.original_text.toLowerCase().includes(searchLower) ||
      log.normalized_telugu.toLowerCase().includes(searchLower) ||
      log.english_translation.toLowerCase().includes(searchLower) ||
      (log.corrected_english && log.corrected_english.toLowerCase().includes(searchLower)) ||
      log.dialect.toLowerCase().includes(searchLower) ||
      log.intent.toLowerCase().includes(searchLower);

    // 2. Filter Tab Match
    const matchesFilter = statusFilter === "all" || log.feedback_type === statusFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-custom pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Link href="/" className="p-1 hover:bg-card rounded-full smooth-hover" title="Back to Translator">
              <ArrowLeft size={16} />
            </Link>
            <h2 className="font-outfit font-extrabold text-2xl">Feedback Logs</h2>
          </div>
          <p className="text-text-muted text-[13px] mt-0.5">Historical log records of travel translations and user-submitted corrections.</p>
        </div>

        {isUsingMock && (
          <span className="self-start sm:self-center px-3 py-1.5 bg-accent/15 border border-accent/20 text-primary text-[11px] font-extrabold rounded-custom flex items-center gap-1.5 uppercase tracking-wider">
            <AlertCircle size={13} />
            Demonstration Mode
          </span>
        )}
      </div>

      {/* Control panel: Search & Filters */}
      <section className="bg-card border border-border-custom rounded-custom p-4 md:p-6 custom-shadow space-y-4 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4">
          
          {/* Search Box */}
          <div className="flex-1 flex items-center bg-background border border-border-custom rounded-custom px-3 py-2 focus-within:border-primary transition-all">
            <Search size={16} className="text-text-muted mr-2" />
            <input 
              type="text" 
              placeholder="Search by query, translation, dialect, or intent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-[13px] text-text-main placeholder:text-text-muted/60 w-full"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-background border border-border-custom rounded-custom p-1 text-[12px] font-semibold text-text-muted">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-custom transition-all ${statusFilter === "all" ? "bg-primary text-white" : "hover:text-text-main"}`}
            >
              All Logs
            </button>
            <button
              onClick={() => setStatusFilter("correct")}
              className={`px-3 py-1.5 rounded-custom transition-all flex items-center gap-1 ${statusFilter === "correct" ? "bg-primary text-white" : "hover:text-text-main"}`}
            >
              <ThumbsUp size={12} />
              Correct
            </button>
            <button
              onClick={() => setStatusFilter("incorrect")}
              className={`px-3 py-1.5 rounded-custom transition-all flex items-center gap-1 ${statusFilter === "incorrect" ? "bg-primary text-white" : "hover:text-text-main"}`}
            >
              <ThumbsDown size={12} />
              Corrected
            </button>
            <button
              onClick={() => setStatusFilter("unrated")}
              className={`px-3 py-1.5 rounded-custom transition-all flex items-center gap-1 ${statusFilter === "unrated" ? "bg-primary text-white" : "hover:text-text-main"}`}
            >
              <HelpCircle size={12} />
              Unrated
            </button>
          </div>

        </div>

        <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
          Found {filteredLogs.length} matching log entries
        </div>
      </section>

      {/* Logs List Container */}
      <section className="max-w-5xl mx-auto space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center p-12 bg-card border border-border-custom rounded-custom">
            <MessageSquare size={36} className="text-text-muted/50 mx-auto mb-3" />
            <h4 className="font-outfit font-bold text-[15px] text-text-main">No Logs Found</h4>
            <p className="text-text-muted text-[13px] mt-1">Try adjusting your search terms or status filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                layout
                className="bg-card border border-border-custom rounded-custom p-6 custom-shadow space-y-4"
              >
                
                {/* Log Header info */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-custom pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wider border ${
                      log.feedback_type === "correct" ? "bg-success/10 text-success border-success/20" :
                      log.feedback_type === "incorrect" ? "bg-error/10 text-error border-error/20" :
                      "bg-background text-text-muted border-border-custom"
                    }`}>
                      {log.feedback_type === "correct" ? "👍 Correct" :
                       log.feedback_type === "incorrect" ? "👎 Corrected" :
                       "⏳ Unrated"}
                    </span>
                    
                    <span className="px-2 py-0.5 bg-background border border-border-custom rounded-full text-[10px] text-text-muted font-bold uppercase tracking-wider">
                      {log.dialect}
                    </span>
                    <span className="px-2 py-0.5 bg-background border border-border-custom rounded-full text-[10px] text-text-muted font-bold uppercase tracking-wider">
                      {log.intent}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-semibold">
                    <Clock size={12} />
                    <span>{formatDate(log.timestamp)}</span>
                  </div>
                </div>

                {/* Script details and comparisons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] font-inter">
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold block">Original Text ({log.input_type})</span>
                      <p className="font-semibold text-text-main mt-0.5">"{log.original_text}"</p>
                    </div>
                    {log.input_type === "Roman Telugu" && (
                      <div>
                        <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold block">Telugu Transliteration</span>
                        <p className="font-bold text-primary font-outfit mt-0.5">{log.telugu_script}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold block">Standard Normalised Telugu</span>
                      <p className="font-extrabold text-primary font-outfit mt-0.5">{log.normalized_telugu}</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-border-custom pt-3 md:pt-0 md:pl-4">
                    
                    {/* Show outputs comparison based on feedback */}
                    {log.feedback_type === "incorrect" ? (
                      <div className="space-y-3">
                        <span className="text-[10px] text-error uppercase tracking-widest font-extrabold block">User Submitted Corrections</span>
                        
                        {log.corrected_intent && log.corrected_intent !== log.intent && (
                          <div>
                            <span className="text-[9px] text-text-muted block">Corrected Intent</span>
                            <span className="font-bold text-text-main line-through mr-2 opacity-50">{log.intent}</span>
                            <span className="font-bold text-primary">{log.corrected_intent}</span>
                          </div>
                        )}
                        
                        {log.corrected_english && (
                          <div>
                            <span className="text-[9px] text-text-muted block">Corrected English translation</span>
                            <span className="font-bold text-text-main line-through block text-xs opacity-50">"{log.english_translation}"</span>
                            <span className="font-bold text-primary">"{log.corrected_english}"</span>
                          </div>
                        )}
                        
                        {log.corrected_tamil && (
                          <div>
                            <span className="text-[9px] text-text-muted block">Corrected Tamil translation</span>
                            <span className="font-bold text-text-main line-through block text-xs opacity-50">"{log.tamil_translation}"</span>
                            <span className="font-bold text-primary">"{log.corrected_tamil}"</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold block">AI Output translations</span>
                        <div>
                          <span className="text-[9px] text-text-muted block">English</span>
                          <p className="font-semibold text-text-main">"{log.english_translation}"</p>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-muted block">Tamil ({log.tamil_romanized})</span>
                          <p className="font-semibold text-text-main">"{log.tamil_translation}"</p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </motion.div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
