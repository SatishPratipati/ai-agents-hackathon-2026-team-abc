"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, ArrowRight, ThumbsUp, ThumbsDown, Copy, Check, 
  RotateCcw, HelpCircle, AlertCircle, Compass, MapPin, 
  MessageSquare, Volume2, Globe, Sparkles
} from "lucide-react";

// List of travel intents supported
const INTENTS = [
  "Transportation",
  "Navigation / Direction",
  "Food / Dining",
  "Accommodation",
  "Shopping",
  "Emergency",
  "Healthcare",
  "Tourism",
  "General Query"
];

// Example travel queries provided in the prompt
const EXAMPLES = [
  { text: "బస్సు ఎప్పుడు వస్తది?", label: "Telangana Dialect (Script)" },
  { text: "bus eppudu vasthadi?", label: "Roman Telugu" },
  { text: "అంగడికి ఎట్లా పోవాలా?", label: "Rayalaseema Dialect" },
  { text: "ekkada manchi hotel undi?", label: "Roman Telugu" }
];

interface PipelineState {
  original_input: string;
  input_type: string;
  telugu_script: string;
  normalized_telugu: string;
  dialect: string;
  intent: string;
  confidence: number;
  intent_distribution: Record<string, number>;
  en: string;
  ta: string;
  ta_romanized: string;
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [results, setResults] = useState<PipelineState | null>(null);
  
  // Feedback states
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctedIntent, setCorrectedIntent] = useState("");
  const [correctedNormal, setCorrectedNormal] = useState("");
  const [correctedEnglish, setCorrectedEnglish] = useState("");
  const [correctedTamil, setCorrectedTamil] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // UI utilities
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Backend host definition
  const API_HOST = "http://localhost:8000";

  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    if (type === "success") {
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(null), 3000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    triggerToast(`Copied ${field} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExampleClick = (text: string) => {
    setQuery(text);
    handleSubmit(text);
  };

  const resetForm = () => {
    setQuery("");
    setResults(null);
    setFeedbackGiven(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (textToSubmit?: string) => {
    const inputQuery = textToSubmit || query;
    if (!inputQuery.trim()) return;

    setIsProcessing(true);
    setResults(null);
    setFeedbackGiven(false);
    setErrorMsg(null);

    try {
      // Step 1: Detect & Normalise
      setActiveStep(1);
      const normalizeRes = await fetch(`${API_HOST}/normalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputQuery })
      });
      
      if (!normalizeRes.ok) {
        throw new Error("Backend server is currently offline. Please start the FastAPI backend.");
      }
      
      const normalizeData = await normalizeRes.json();
      
      // Step 2: Intent Classification
      setActiveStep(2);
      // Wait slightly to show animated transition
      await new Promise(r => setTimeout(r, 400));
      const intentRes = await fetch(`${API_HOST}/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: normalizeData.normalized_telugu })
      });
      const intentData = await intentRes.json();
      
      // Step 3: Translations
      setActiveStep(3);
      await new Promise(r => setTimeout(r, 400));
      const translateRes = await fetch(`${API_HOST}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: normalizeData.normalized_telugu })
      });
      const translateData = await translateRes.json();
      
      // Complete state consolidation
      setResults({
        original_input: normalizeData.original_input,
        input_type: normalizeData.input_type,
        telugu_script: normalizeData.telugu_script,
        normalized_telugu: normalizeData.normalized_telugu,
        dialect: normalizeData.dialect,
        intent: intentData.intent,
        confidence: intentData.confidence,
        intent_distribution: intentData.intent_distribution,
        en: translateData.en,
        ta: translateData.ta,
        ta_romanized: translateData.ta_romanized
      });
      
      // Setup correction defaults in case they edit
      setCorrectedIntent(intentData.intent);
      setCorrectedNormal(normalizeData.normalized_telugu);
      setCorrectedEnglish(translateData.en);
      setCorrectedTamil(translateData.ta);
      
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "An unexpected error occurred.", "error");
    } finally {
      setIsProcessing(false);
      setActiveStep(0);
    }
  };

  const handleFeedback = async (type: "correct" | "incorrect") => {
    if (!results) return;

    if (type === "correct") {
      setIsSubmittingFeedback(true);
      try {
        const res = await fetch(`${API_HOST}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_text: results.original_input,
            normalized_text: results.normalized_telugu,
            detected_intent: results.intent,
            english_translation: results.en,
            tamil_translation: results.ta,
            feedback_type: "correct"
          })
        });
        if (res.ok) {
          setFeedbackGiven(true);
          triggerToast("Thank you for your feedback!");
        }
      } catch (err) {
        triggerToast("Failed to record feedback.", "error");
      } finally {
        setIsSubmittingFeedback(false);
      }
    } else {
      setShowCorrectionModal(true);
    }
  };

  const submitCorrection = async () => {
    if (!results) return;
    setIsSubmittingFeedback(true);
    try {
      const res = await fetch(`${API_HOST}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_text: results.original_input,
          normalized_text: correctedNormal,
          detected_intent: results.intent,
          corrected_intent: correctedIntent,
          english_translation: correctedEnglish,
          tamil_translation: correctedTamil,
          feedback_type: "incorrect"
        })
      });
      if (res.ok) {
        setFeedbackGiven(true);
        setShowCorrectionModal(false);
        triggerToast("Correction recorded. Thank you for improving AMTA!");
        // Update local results display so the page reflects user inputs immediately
        setResults({
          ...results,
          normalized_telugu: correctedNormal,
          intent: correctedIntent,
          en: correctedEnglish,
          ta: correctedTamil
        });
      }
    } catch (err) {
      triggerToast("Failed to submit corrections.", "error");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="space-y-12">
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {successToast && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-primary text-white px-4 py-3 rounded-custom border border-accent/20 flex items-center gap-2.5 shadow-lg text-[13px] font-medium"
            >
              <Check size={16} />
              <span>{successToast}</span>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-error text-white px-4 py-3 rounded-custom flex items-center gap-2.5 shadow-lg text-[13px] font-medium"
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Hero & Description */}
      <section className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-card border border-border-custom rounded-full text-xs font-semibold text-primary uppercase tracking-wider">
          <Sparkles size={12} />
          Adaptive Linguistic Core
        </div>
        <h2 className="text-3xl md:text-4xl font-outfit font-extrabold text-text-main leading-tight">
          Navigate Telugu Dialects Effortlessly
        </h2>
        <p className="text-text-muted text-[15px] max-w-2xl mx-auto font-inter font-normal">
          Type queries in either standard Telugu script or Romanized script. AMTA automatically normalises regional dialects, identifies travel intents, and translates them to English and Tamil.
        </p>
      </section>

      {/* Input Section */}
      <section className="bg-card border border-border-custom rounded-custom p-6 md:p-8 custom-shadow max-w-4xl mx-auto space-y-6">
        
        {/* Large Input Container */}
        <div className="relative flex items-center bg-background border border-border-custom rounded-custom p-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-300">
          <textarea
            className="flex-1 resize-none bg-transparent outline-none pl-4 pr-12 py-3 text-[15px] font-inter text-text-main placeholder:text-text-muted/60 h-20 min-h-[5rem] max-h-[8rem]"
            placeholder="Type in Telugu or Roman Telugu..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            id="query-input"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={isProcessing || !query.trim()}
            className="absolute right-4 bottom-4 p-3 bg-primary text-white rounded-custom hover:bg-primary/95 transition-all smooth-hover disabled:bg-border-custom disabled:text-text-muted shadow-sm hover:shadow"
            title="Process query"
            id="submit-query"
          >
            {isProcessing ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        </div>

        {/* Example prompts cards */}
        <div className="space-y-2.5">
          <span className="text-[12px] uppercase tracking-wider font-extrabold text-text-muted flex items-center gap-1.5">
            <Compass size={12} className="text-secondary" />
            Try Common Dialect Examples
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXAMPLES.map((ex, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(ex.text)}
                disabled={isProcessing}
                className="text-left p-3.5 bg-background hover:bg-card border border-border-custom rounded-custom smooth-hover transition-all custom-shadow-hover hover:border-primary/40 group flex flex-col justify-between h-20"
              >
                <span className="text-[13px] font-semibold text-text-main font-outfit truncate w-full group-hover:text-primary">
                  {ex.text}
                </span>
                <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">
                  {ex.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Action controls */}
        {query.trim() && (
          <div className="flex items-center justify-between border-t border-border-custom pt-4 text-xs font-semibold text-text-muted">
            <span>{query.length} characters</span>
            <button 
              onClick={resetForm}
              className="flex items-center gap-1.5 hover:text-text-main smooth-hover"
            >
              <RotateCcw size={13} />
              Reset Input
            </button>
          </div>
        )}
      </section>

      {/* Loading Steps UI */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto bg-card border border-border-custom rounded-custom p-6 space-y-4"
          >
            <h3 className="font-outfit font-bold text-sm text-text-main flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Linguistic Pipeline Execution...
            </h3>
            
            <div className="space-y-3 font-inter text-[13px]">
              <div className="flex items-center justify-between">
                <span className={activeStep >= 1 ? "text-primary font-semibold" : "text-text-muted"}>
                  1. Language Detection & Transliteration
                </span>
                {activeStep > 1 ? (
                  <Check size={16} className="text-success" />
                ) : activeStep === 1 ? (
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-border-custom rounded-full" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={activeStep >= 2 ? "text-primary font-semibold" : "text-text-muted"}>
                  2. Dialect Detection & Normalisation
                </span>
                {activeStep > 2 ? (
                  <Check size={16} className="text-success" />
                ) : activeStep === 2 ? (
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-border-custom rounded-full" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={activeStep >= 3 ? "text-primary font-semibold" : "text-text-muted"}>
                  3. Travel Intent Classification & Distribution
                </span>
                {activeStep > 3 ? (
                  <Check size={16} className="text-success" />
                ) : activeStep === 3 ? (
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-border-custom rounded-full" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={activeStep >= 4 ? "text-primary font-semibold" : "text-text-muted"}>
                  4. Machine Translation (English & Tamil with Transliteration)
                </span>
                {activeStep === 4 ? (
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-border-custom rounded-full" />
                )}
              </div>
            </div>
            
            <div className="w-full bg-border-custom h-1.5 rounded-full overflow-hidden">
              <motion.div 
                className="bg-primary h-full"
                animate={{ width: `${(activeStep / 4) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Dashboard Grid */}
      <AnimatePresence>
        {results && !isProcessing && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
            id="results-dashboard"
          >
            <div className="flex items-center justify-between max-w-7xl mx-auto border-b border-border-custom pb-3">
              <h3 className="font-outfit font-extrabold text-lg text-primary flex items-center gap-2">
                <Globe size={18} />
                Linguistic Analysis Result
              </h3>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-text-muted bg-card px-2.5 py-1 rounded-full border border-border-custom">
                Query Processed
              </span>
            </div>

            {/* Main Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Card 1: Input Analysis */}
              <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider">
                    Input Analysis
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Original Input</span>
                      <p className="text-[14px] font-semibold text-text-main">{results.original_input}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Input Type</span>
                      <div className="mt-1">
                        <span className="px-2.5 py-0.5 bg-background border border-border-custom text-text-main text-[11px] font-bold rounded-full">
                          {results.input_type}
                        </span>
                      </div>
                    </div>
                    {results.input_type === "Roman Telugu" && (
                      <div>
                        <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Telugu Script Version</span>
                        <p className="text-[15px] font-bold text-primary font-outfit mt-0.5">{results.telugu_script}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Dialect Normalization */}
              <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider">
                    Normalization
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Dialect Region</span>
                      <div className="mt-1">
                        <span className={`px-2.5 py-0.5 text-[11px] font-extrabold rounded-full border uppercase tracking-wider ${
                          results.dialect === "Telangana" ? "bg-accent/15 text-primary border-accent/20" :
                          results.dialect === "Rayalaseema" ? "bg-secondary/15 text-text-main border-secondary/20" :
                          results.dialect === "Uttarandhra" ? "bg-primary/15 text-white border-primary/20" :
                          results.dialect === "Standard Telugu" ? "bg-success/10 text-success border-success/20" :
                          "bg-border-custom text-text-muted border-border-custom"
                        }`}>
                          {results.dialect}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Standard Telugu</span>
                      <p className="text-[16px] font-extrabold text-primary font-outfit mt-1 leading-relaxed">
                        {results.normalized_telugu}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Intent Classification */}
              <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow md:col-span-2 lg:col-span-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-outfit font-extrabold text-[14px] text-text-muted uppercase tracking-wider">
                      Intent Detection
                    </h4>
                    <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-extrabold rounded-full">
                      {results.confidence}% Confidence
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Primary Classification</span>
                      <p className="text-[15px] font-extrabold text-text-main mt-0.5">{results.intent}</p>
                    </div>
                    
                    {/* Probability Distribution Chart */}
                    <div className="space-y-2 border-t border-border-custom pt-3">
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold block">Intent Probability Distribution</span>
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {Object.entries(results.intent_distribution || {}).map(([intent, prob]) => {
                          const pct = Math.round(prob * 100);
                          const isPrimary = intent === results.intent;
                          return (
                            <div key={intent} className="space-y-0.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className={isPrimary ? "font-bold text-primary" : "text-text-muted"}>{intent}</span>
                                <span className="font-semibold">{pct}%</span>
                              </div>
                              <div className="w-full bg-background h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isPrimary ? "bg-primary" : "bg-secondary"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: English Translation */}
              <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">English Translation</span>
                    <button
                      onClick={() => copyToClipboard(results.en, "English translation")}
                      className="p-1.5 hover:bg-background text-text-muted hover:text-text-main rounded-custom transition-all"
                      title="Copy English Translation"
                    >
                      {copiedField === "English translation" ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[15px] font-bold text-text-main leading-relaxed font-outfit">
                    "{results.en}"
                  </p>
                </div>
              </div>

              {/* Card 5: Tamil Translation */}
              <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Tamil Translation</span>
                    <button
                      onClick={() => copyToClipboard(results.ta, "Tamil translation")}
                      className="p-1.5 hover:bg-background text-text-muted hover:text-text-main rounded-custom transition-all"
                      title="Copy Tamil Translation"
                    >
                      {copiedField === "Tamil translation" ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[16px] font-bold text-text-main leading-relaxed">
                    "{results.ta}"
                  </p>
                </div>
              </div>

              {/* Card 6: Tamil Romanization */}
              <div className="bg-card border border-border-custom rounded-custom p-6 custom-shadow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Tamil Romanization</span>
                    <button
                      onClick={() => copyToClipboard(results.ta_romanized, "Tamil romanization")}
                      className="p-1.5 hover:bg-background text-text-muted hover:text-text-main rounded-custom transition-all"
                      title="Copy Romanization"
                    >
                      {copiedField === "Tamil romanization" ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-[15px] font-medium text-primary italic leading-relaxed">
                    "{results.ta_romanized}"
                  </p>
                </div>
              </div>

            </div>

            {/* Feedback Footer Container */}
            <div className="bg-card border border-border-custom rounded-custom p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-4xl mx-auto custom-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-custom text-primary">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="font-outfit font-extrabold text-[14px] text-text-main">
                    Was this translation response correct?
                  </h4>
                  <p className="text-text-muted text-[11px]">
                    Your input helps retrain the local rule engine and feedback logs.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {feedbackGiven ? (
                  <span className="px-4 py-2 bg-success/15 border border-success/20 text-success text-[12px] font-bold rounded-custom flex items-center gap-1.5">
                    <Check size={14} />
                    Feedback Captured!
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => handleFeedback("correct")}
                      disabled={isSubmittingFeedback}
                      className="px-4 py-2 border border-border-custom bg-background hover:bg-accent hover:text-white rounded-custom smooth-hover text-[12px] font-bold flex items-center gap-1.5"
                    >
                      <ThumbsUp size={13} />
                      Correct
                    </button>
                    <button
                      onClick={() => handleFeedback("incorrect")}
                      disabled={isSubmittingFeedback}
                      className="px-4 py-2 border border-border-custom bg-background hover:bg-error hover:text-white rounded-custom smooth-hover text-[12px] font-bold flex items-center gap-1.5"
                    >
                      <ThumbsDown size={13} />
                      Incorrect
                    </button>
                  </>
                )}
              </div>
            </div>

          </motion.section>
        )}
      </AnimatePresence>

      {/* Correction Feedback Modal */}
      <AnimatePresence>
        {showCorrectionModal && results && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border-custom rounded-custom w-full max-w-lg p-6 md:p-8 custom-shadow space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border-custom pb-4">
                <div>
                  <h3 className="font-outfit font-extrabold text-[16px] text-text-main">
                    Provide Translation Correction
                  </h3>
                  <p className="text-text-muted text-[11px]">Help us refine the Telugu travel translator rules.</p>
                </div>
                <button
                  onClick={() => setShowCorrectionModal(false)}
                  className="p-1.5 hover:bg-background rounded-full smooth-hover"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-[13px] font-inter">
                
                {/* Standard Telugu Normalization Correction */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Correct Standard Telugu</label>
                  <input
                    type="text"
                    value={correctedNormal}
                    onChange={(e) => setCorrectedNormal(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-custom p-2.5 text-text-main outline-none focus:border-primary"
                  />
                </div>

                {/* Intent Correction */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Correct Travel Intent</label>
                  <select
                    value={correctedIntent}
                    onChange={(e) => setCorrectedIntent(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-custom p-2.5 text-text-main outline-none focus:border-primary"
                  >
                    {INTENTS.map((intent) => (
                      <option key={intent} value={intent}>
                        {intent}
                      </option>
                    ))}
                  </select>
                </div>

                {/* English Correction */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Correct English Translation</label>
                  <textarea
                    value={correctedEnglish}
                    onChange={(e) => setCorrectedEnglish(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-custom p-2.5 text-text-main outline-none focus:border-primary resize-none h-16"
                  />
                </div>

                {/* Tamil Correction */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-text-muted uppercase tracking-widest font-extrabold">Correct Tamil Translation</label>
                  <textarea
                    value={correctedTamil}
                    onChange={(e) => setCorrectedTamil(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-custom p-2.5 text-text-main outline-none focus:border-primary resize-none h-16"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 border-t border-border-custom pt-4">
                <button
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 border border-border-custom text-text-muted rounded-custom hover:bg-background text-xs font-semibold smooth-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCorrection}
                  disabled={isSubmittingFeedback || !correctedEnglish.trim() || !correctedTamil.trim()}
                  className="px-5 py-2 bg-primary text-white rounded-custom hover:bg-primary/95 text-xs font-bold smooth-hover disabled:bg-border-custom disabled:text-text-muted"
                >
                  {isSubmittingFeedback ? "Submitting..." : "Submit Correction"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple absolute close SVG mapping for modal
function X({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
