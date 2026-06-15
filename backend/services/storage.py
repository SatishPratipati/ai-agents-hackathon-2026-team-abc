import os
import json
import datetime
from typing import Dict, Any, List, Optional
from models import FeedbackRequest

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
FEEDBACK_FILE = os.path.join(DATA_DIR, "feedback.json")

def _init_storage():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(FEEDBACK_FILE):
        with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)

def load_queries() -> List[Dict[str, Any]]:
    _init_storage()
    try:
        with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_queries(queries: List[Dict[str, Any]]):
    _init_storage()
    with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
        json.dump(queries, f, indent=2)

def log_query(original_text: str, input_type: str, telugu_script: str, normalized_telugu: str, dialect: str, intent: str) -> None:
    queries = load_queries()
    
    # Avoid duplicate logging if frontend calls multiple times quickly with exact same text in short window
    # check if the last query was identical and within 5 seconds
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Check if there is already an identical query in the log
    # To keep it simple, we just append a new log entry
    query_entry = {
        "id": len(queries) + 1,
        "timestamp": now,
        "original_text": original_text,
        "input_type": input_type,
        "telugu_script": telugu_script,
        "normalized_telugu": normalized_telugu,
        "dialect": dialect,
        "intent": intent,
        "feedback_type": "unrated",  # "unrated", "correct", "incorrect"
        "corrected_intent": None,
        "corrected_english": None,
        "corrected_tamil": None,
        "english_translation": "",
        "tamil_translation": "",
        "tamil_romanized": ""
    }
    queries.append(query_entry)
    save_queries(queries)

def log_query_with_translations(original_text: str, input_type: str, telugu_script: str, 
                                normalized_telugu: str, dialect: str, intent: str,
                                english: str, tamil: str, tamil_romanized: str) -> None:
    queries = load_queries()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    query_entry = {
        "id": len(queries) + 1,
        "timestamp": now,
        "original_text": original_text,
        "input_type": input_type,
        "telugu_script": telugu_script,
        "normalized_telugu": normalized_telugu,
        "dialect": dialect,
        "intent": intent,
        "feedback_type": "unrated",
        "corrected_intent": None,
        "corrected_english": None,
        "corrected_tamil": None,
        "english_translation": english,
        "tamil_translation": tamil,
        "tamil_romanized": tamil_romanized
    }
    queries.append(query_entry)
    save_queries(queries)

def save_feedback(feedback: FeedbackRequest) -> None:
    queries = load_queries()
    
    # Find the most recent query with matching original text to update its feedback
    updated = False
    for item in reversed(queries):
        if item["original_text"].strip().lower() == feedback.original_text.strip().lower() and item["feedback_type"] == "unrated":
            item["feedback_type"] = feedback.feedback_type
            if feedback.feedback_type == "incorrect":
                item["corrected_intent"] = feedback.corrected_intent or feedback.detected_intent
                item["corrected_english"] = feedback.english_translation
                item["corrected_tamil"] = feedback.tamil_translation
            updated = True
            break
            
    # If no unrated match is found, append or update the last matching one
    if not updated:
        for item in reversed(queries):
            if item["original_text"].strip().lower() == feedback.original_text.strip().lower():
                item["feedback_type"] = feedback.feedback_type
                if feedback.feedback_type == "incorrect":
                    item["corrected_intent"] = feedback.corrected_intent or feedback.detected_intent
                    item["corrected_english"] = feedback.english_translation
                    item["corrected_tamil"] = feedback.tamil_translation
                updated = True
                break

    # If still not found, create a new entry for feedback
    if not updated:
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        new_entry = {
            "id": len(queries) + 1,
            "timestamp": now,
            "original_text": feedback.original_text,
            "input_type": "Unknown",
            "telugu_script": feedback.normalized_text,
            "normalized_telugu": feedback.normalized_text,
            "dialect": "Unknown",
            "intent": feedback.detected_intent,
            "feedback_type": feedback.feedback_type,
            "corrected_intent": feedback.corrected_intent if feedback.feedback_type == "incorrect" else None,
            "corrected_english": feedback.english_translation if feedback.feedback_type == "incorrect" else None,
            "corrected_tamil": feedback.tamil_translation if feedback.feedback_type == "incorrect" else None,
            "english_translation": feedback.english_translation,
            "tamil_translation": feedback.tamil_translation,
            "tamil_romanized": ""
        }
        queries.append(new_entry)
        
    save_queries(queries)

def get_analytics() -> Dict[str, Any]:
    queries = load_queries()
    
    total = len(queries)
    intent_stats = {}
    dialect_stats = {}
    
    correct_count = 0
    incorrect_count = 0
    rated_count = 0
    
    # Track accuracy trend (e.g. by date)
    daily_accuracy = {}
    
    # Query frequencies
    query_freq = {}
    
    for q in queries:
        # 1. Dialect stats
        d = q.get("dialect", "Unknown") or "Unknown"
        dialect_stats[d] = dialect_stats.get(d, 0) + 1
        
        # 2. Intent stats (use corrected intent if incorrect and updated)
        i = q.get("intent", "General Query") or "General Query"
        if q.get("feedback_type") == "incorrect" and q.get("corrected_intent"):
            i = q.get("corrected_intent")
        intent_stats[i] = intent_stats.get(i, 0) + 1
        
        # 3. Accuracy counting
        fb = q.get("feedback_type", "unrated")
        if fb == "correct":
            correct_count += 1
            rated_count += 1
        elif fb == "incorrect":
            incorrect_count += 1
            rated_count += 1
            
        # 4. Group by date for line chart
        # Parse timestamp
        try:
            date_str = q["timestamp"][:10]  # YYYY-MM-DD
        except Exception:
            date_str = datetime.date.today().isoformat()
            
        if date_str not in daily_accuracy:
            daily_accuracy[date_str] = {"correct": 0, "total_rated": 0}
            
        if fb in ["correct", "incorrect"]:
            daily_accuracy[date_str]["total_rated"] += 1
            if fb == "correct":
                daily_accuracy[date_str]["correct"] += 1
                
        # 5. Query frequencies
        text = q.get("original_text", "").strip()
        if text:
            if text not in query_freq:
                query_freq[text] = {
                    "text": text,
                    "count": 0,
                    "dialect": d,
                    "intent": i
                }
            query_freq[text]["count"] += 1
            
    # Calculate accuracy percentage
    accuracy_percentage = 100.0 if rated_count == 0 else (correct_count / rated_count) * 100.0
    
    # Compile line chart accuracy history
    # Sort dates and calculate rolling or daily accuracy
    sorted_dates = sorted(daily_accuracy.keys())
    accuracy_history = []
    for d_str in sorted_dates:
        day_total = daily_accuracy[d_str]["total_rated"]
        day_correct = daily_accuracy[d_str]["correct"]
        day_pct = 100.0 if day_total == 0 else (day_correct / day_total) * 100.0
        accuracy_history.append({
            "date": d_str,
            "accuracy": round(day_pct, 1),
            "total_rated": day_total
        })
        
    # If history is empty, populate with today
    if not accuracy_history:
        accuracy_history.append({
            "date": datetime.date.today().isoformat(),
            "accuracy": 100.0,
            "total_rated": 0
        })

    # Sort queries by count descending
    common_queries = sorted(query_freq.values(), key=lambda x: x["count"], reverse=True)[:10]

    return {
        "total_queries": total,
        "intent_statistics": intent_stats,
        "dialect_statistics": dialect_stats,
        "accuracy_metrics": {
            "rated_count": rated_count,
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "accuracy_percentage": round(accuracy_percentage, 1),
            "accuracy_history": accuracy_history
        },
        "most_common_queries": common_queries
    }
