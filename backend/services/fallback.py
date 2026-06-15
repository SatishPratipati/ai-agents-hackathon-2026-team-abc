import re
from typing import Dict, Any, List, Tuple

# Comprehensive Roman-to-Telugu dictionary mapping common travel vocabulary
ROMAN_TO_TELUGU_DICT = {
    "bus": "బస్సు",
    "bussu": "బస్సు",
    "eppudu": "ఎప్పుడు",
    "vasthadi": "వస్తది",
    "vasthundi": "వస్తుంది",
    "vosthadi": "వస్తది",
    "vosthundi": "వస్తుంది",
    "ekkada": "ఎక్కడ",
    "ekada": "ఎక్కడ",
    "manchi": "మంచి",
    "hotel": "హోటల్",
    "undi": "ఉంది",
    "undhi": "ఉంది",
    "vundi": "ఉంది",
    "angadi": "అంగడి",
    "angadiki": "అంగడికి",
    "etla": "ఎట్లా",
    "ettla": "ఎట్లా",
    "povala": "పోవాలా",
    "povalas": "పోవాలా",
    "povali": "పోవాలి",
    "ela": "ఎలా",
    "yela": "ఎలా",
    "ticket": "టికెట్",
    "dharalu": "ధరలు",
    "dhara": "ధర",
    "bhojanam": "భోజనం",
    "tinariki": "తినడానికి",
    "tinadaniki": "తినడానికి",
    "ekkadundi": "ఎక్కడుంది",
    "ekkadundhi": "ఎక్కడుంది",
    "dari": "దారి",
    "dhaari": "దారి",
    "edi": "ఏది",
    "yedi": "ఏది",
    "cheppandi": "చెప్పండి",
    "sahayam": "సహాయం",
    "kavali": "కావాలి",
    "kaavaali": "కావాలి",
    "vastaadi": "వస్తాది",
    "nayana": "నాయన",
    "naayana": "నాయన",
    "yada": "యాడ",
    "yaada": "యాడ",
    "cheppala": "చెప్పాల",
    "cheyala": "చేయాల",
    "raavali": "రావాలి",
    "raavala": "రావాల",
    "vellali": "వెళ్ళాలి",
    "vellala": "వెళ్ళాల",
    "mastu": "మస్తు",
    "masthu": "మస్తు",
    "chala": "చాలా",
    "chaala": "చాలా",
    "dukanam": "దుకాణం",
    "dukaanam": "దుకాణం",
    "undadi": "ఉండాది",
    "undaadhi": "ఉండాది",
    "metro": "మెట్రో",
    "train": "రైలు",
    "railu": "రైలు",
    "auto": "ఆటో",
    "room": "రూమ్",
    "lodge": "లాడ్జ్",
    "stay": "ఉండటానికి",
    "konali": "కొనాలి",
    "market": "మార్కెట్",
    "police": "పోలీస్",
    "pramadam": "ప్రమాదం",
    "kapadandi": "కాపాడండి",
    "doctor": "డాక్టర్",
    "mandhulu": "మందులు",
    "mandulu": "మందులు",
    "asupathri": "ఆసుపత్రి",
    "gudi": "గుడి",
    "temple": "గుడి",
    "fort": "కోట",
    "beach": "బీచ్",
    "visit": "చూడాలి"
}

# Dialect replacement map (Telugu Script words to Standard Telugu equivalents)
DIALECT_NORMALIZATION_MAP = {
    "వస్తది": "వస్తుంది",
    "వస్తాది": "వస్తుంది",
    "ఎట్లా": "ఎలా",
    "పోవాలా": "వెళ్ళాలా",
    "పోవాల": "వెళ్ళాలి",
    "అంగడి": "దుకాణం",
    "అంగడికి": "దుకాణానికి",
    "ఉండాది": "ఉంది",
    "యాడ": "ఎక్కడ",
    "యేడ": "ఎక్కడ",
    "చెప్పాల": "చెప్పాలి",
    "చేయాల": "చేయాలి",
    "రావాల": "రావాలి",
    "వెళ్ళాల": "వెళ్ళాలి",
    "మస్తు": "చాలా",
    "నాయన": "తండ్రి"
}

# Dialect markers to determine dialect region
DIALECT_MARKERS = {
    "Telangana": ["వస్తది", "ఎట్లా", "మస్తు", "పోవాలా", "అంగడి", "వస్తాది"],
    "Rayalaseema": ["ఉండాది", "పోవాలా", "నాయన", "యాడ", "యేడ"],
    "Uttarandhra": ["చెప్పాల", "చేయాల", "రావాల", "వెళ్ళాల"]
}

# Keyword list for intent classification
INTENT_KEYWORDS = {
    "Transportation": ["బస్సు", "రైలు", "టికెట్", "ఆటో", "మెట్రో", "bus", "train", "ticket", "auto", "metro", "valla", "eppudu", "నడుస్తుంది", "పోతుంది"],
    "Navigation / Direction": ["దారి", "ఎటు", "ఎట్లా", "ఎలా", "పోవాలి", "వెళ్ళాలి", "route", "way", "map", "address", "దగ్గర", "దూరం"],
    "Food / Dining": ["భోజనం", "అన్నం", "హోటల్", "రెస్టారెంట్", "తినాలి", "తినడానికి", "food", "hotel", "restaurant", "eat", "biryani", "ఆకలి"],
    "Accommodation": ["రూమ్", "లాడ్జ్", "ఉండటానికి", "stay", "room", "lodge", "accommodation", "గది", "నిద్రపోవడానికి"],
    "Shopping": ["కొనాలి", "అంగడి", "మార్కెట్", "ధర", "ధరలు", "buy", "shop", "market", "price", "cost", "దుకాణం", "దుకాణానికి"],
    "Emergency": ["కాపాడండి", "పోలీస్", "ప్రమాదం", "సహాయం", "help", "police", "accident", "emergency", "దొంగతనం", "భయం"],
    "Healthcare": ["డాక్టర్", "మందులు", "ఆసుపత్రి", "doctor", "medicine", "hospital", "sick", "నొప్పి", "జ్వరం"],
    "Tourism": ["చూడాలి", "గుడి", "కోట", "బీచ్", "visit", "temple", "beach", "fort", "tourism", "పర్యాటక", "తిరగడానికి"],
    "General Query": []
}

# Precise dictionary translations for standard sentences
EXACT_TRANSLATION_DICT = {
    "బస్సు ఎప్పుడు వస్తది?": {
        "en": "When will the bus arrive?",
        "ta": "பேருந்து எப்போது வரும்?",
        "ta_romanized": "Perunthu eppodhu varum?"
    },
    "బస్సు ఎప్పుడు వస్తుంది?": {
        "en": "When will the bus arrive?",
        "ta": "பேருந்து எப்போது வரும்?",
        "ta_romanized": "Perunthu eppodhu varum?"
    },
    "అంగడికి ఎట్లా పోవాలా?": {
        "en": "How do I go to the shop?",
        "ta": "கடைக்கு எப்படி செல்வது?",
        "ta_romanized": "Kadaikku eppadi selvathu?"
    },
    "దుకాణానికి ఎలా వెళ్ళాలి?": {
        "en": "How do I go to the shop?",
        "ta": "கடைக்கு எப்படி செல்வது?",
        "ta_romanized": "Kadaikku eppadi selvathu?"
    },
    "ఎక్కడ మంచి హోటల్ ఉంది?": {
        "en": "Where is a good hotel?",
        "ta": "ஒரு நல்ல ஹோட்டல் எங்கே இருக்கிறது?",
        "ta_romanized": "Oru nalla hotel enge irukkirathu?"
    }
}

# English/Tamil translation words for fallback builder
WORD_TRANSLATOR = {
    "బస్సు": {"en": "bus", "ta": "பேருந்து", "ta_rom": "perunthu"},
    "రైలు": {"en": "train", "ta": "இரயில்", "ta_rom": "irayil"},
    "టికెట్": {"en": "ticket", "ta": "சீட்டு", "ta_rom": "seettu"},
    "హోటల్": {"en": "hotel", "ta": "ஹோட்டல்", "ta_rom": "hotel"},
    "దుకాణం": {"en": "shop", "ta": "கடை", "ta_rom": "kadai"},
    "అంగడి": {"en": "shop", "ta": "கடை", "ta_rom": "kadai"},
    "దారి": {"en": "route", "ta": "வழி", "ta_rom": "vazhi"},
    "ధర": {"en": "price", "ta": "விலை", "ta_rom": "vilai"},
    "ధరలు": {"en": "prices", "ta": "விலைகள்", "ta_rom": "vilaigal"},
    "భోజనం": {"en": "food", "ta": "உணவு", "ta_rom": "unavu"},
    "ఆసుపత్రి": {"en": "hospital", "ta": "மருத்துவமனை", "ta_rom": "maruthuvamanai"},
    "మందులు": {"en": "medicines", "ta": "மருந்துகள்", "ta_rom": "marunthugal"},
    "డాక్టర్": {"en": "doctor", "ta": "மருத்துவர்", "ta_rom": "maruthuvar"},
    "గుడి": {"en": "temple", "ta": "கோவில்", "ta_rom": "kovil"},
    "బీచ్": {"en": "beach", "ta": "கடற்கரை", "ta_rom": "kadarkarai"},
    "కోట": {"en": "fort", "ta": "கோட்டை", "ta_rom": "kottai"},
    "సహాయం": {"en": "help", "ta": "உதவி", "ta_rom": "udhavi"},
    "పోలీస్": {"en": "police", "ta": "காவல்துறை", "ta_rom": "kaaval thurai"},
    "ప్రмаదం": {"en": "accident", "ta": "விபத்து", "ta_rom": "vibathu"},
    "రూమ్": {"en": "room", "ta": "அறை", "ta_rom": "arai"},
    "లాడ్జ్": {"en": "lodge", "ta": "விடுதி", "ta_rom": "vidhuthi"},
    "మంచి": {"en": "good", "ta": "நல்ல", "ta_rom": "nalla"},
    "ఎక్కడ": {"en": "where is", "ta": "எங்கே", "ta_rom": "enge"},
    "ఎప్పుడు": {"en": "when", "ta": "எப்போது", "ta_rom": "eppodhu"},
    "ఎలా": {"en": "how to", "ta": "எப்படி", "ta_rom": "eppadi"},
    "ఎట్లా": {"en": "how to", "ta": "எப்படி", "ta_rom": "eppadi"},
    "ఉంది": {"en": "available", "ta": "இருக்கிறது", "ta_rom": "irukkirathu"},
    "వెళ్ళాలి": {"en": "go to", "ta": "செல்ல வேண்டும்", "ta_rom": "sella vendum"},
    "పోవాలి": {"en": "go to", "ta": "செல்ல வேண்டும்", "ta_rom": "sella vendum"},
    "పోవాలా": {"en": "should go", "ta": "செல்ல வேண்டுமா", "ta_rom": "sella venduma"},
    "వస్తుంది": {"en": "arriving", "ta": "வரும்", "ta_rom": "varum"},
    "వస్తది": {"en": "arriving", "ta": "வரும்", "ta_rom": "varum"},
    "కావాలి": {"en": "need", "ta": "தேவை", "ta_rom": "thevai"}
}


def detect_language(text: str) -> str:
    """
    Detects if the input is Telugu Script or Romanized Telugu.
    If it contains any Telugu character (range 0C00-0C7F), it is Telugu Script.
    """
    if re.search(r"[\u0c00-\u0c7f]", text):
        return "Telugu Script"
    return "Roman Telugu"


def transliterate_roman_to_telugu(text: str) -> str:
    """
    Approximates Telugu Script from Roman Telugu for key travel terms.
    Preserves punctuation at word boundaries.
    """
    words = text.split()
    transliterated_words = []
    
    for word in words:
        # Match alphanumeric characters in the word, separating prefix and suffix punctuation
        prefix_match = re.match(r"^[^a-zA-Z0-9]*", word)
        prefix = prefix_match.group(0) if prefix_match else ""
        
        suffix_match = re.search(r"[^a-zA-Z0-9]*$", word)
        suffix = suffix_match.group(0) if suffix_match else ""
        
        mid_word = word[len(prefix):len(word)-len(suffix)] if len(suffix) > 0 else word[len(prefix):]
        lower_mid = mid_word.lower()
        
        if lower_mid in ROMAN_TO_TELUGU_DICT:
            transliterated_words.append(prefix + ROMAN_TO_TELUGU_DICT[lower_mid] + suffix)
        else:
            transliterated_words.append(word)
            
    return " ".join(transliterated_words)


def normalize_dialect(text: str) -> Tuple[str, str]:
    """
    Normalizes Telugu dialect words to Standard Telugu.
    Also returns the detected dialect based on the words replaced.
    """
    words = text.split()
    normalized_words = []
    detected_dialects = []
    
    for word in words:
        # Find prefix/suffix punctuation ignoring Telugu script and latin alpha characters
        prefix_match = re.match(r"^[^a-zA-Z0-9\u0c00-\u0c7f]*", word)
        prefix = prefix_match.group(0) if prefix_match else ""
        
        suffix_match = re.search(r"[^a-zA-Z0-9\u0c00-\u0c7f]*$", word)
        suffix = suffix_match.group(0) if suffix_match else ""
        
        mid_word = word[len(prefix):len(word)-len(suffix)] if len(suffix) > 0 else word[len(prefix):]
        
        # Check dialect markers
        found_dialect = None
        for dialect, markers in DIALECT_MARKERS.items():
            if mid_word in markers:
                found_dialect = dialect
                detected_dialects.append(dialect)
                break
                
        if mid_word in DIALECT_NORMALIZATION_MAP:
            normalized_words.append(prefix + DIALECT_NORMALIZATION_MAP[mid_word] + suffix)
        else:
            normalized_words.append(word)
            
    normalized_text = " ".join(normalized_words)
    
    # Determine dialect category
    if detected_dialects:
        from collections import Counter
        dialect = Counter(detected_dialects).most_common(1)[0][0]
    else:
        # Default to standard or unknown based on presence of standard keywords
        has_standard = any(w in DIALECT_NORMALIZATION_MAP.values() for w in normalized_words)
        dialect = "Standard Telugu" if has_standard else "Unknown"
        
    return normalized_text, dialect


def classify_intent(text: str) -> Tuple[str, float, Dict[str, float]]:
    """
    Detects travel intent from keywords.
    Returns: (intent, confidence_score, distribution)
    """
    text_lower = text.lower()
    
    # Count keyword matches for each intent
    scores = {intent: 0 for intent in INTENT_KEYWORDS.keys()}
    
    for intent, keywords in INTENT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                scores[intent] += 1
                
    # Normalize scores to create a probability distribution
    total_matches = sum(scores.values())
    
    if total_matches == 0:
        distribution = {intent: 0.0 for intent in INTENT_KEYWORDS.keys()}
        distribution["General Query"] = 1.0
        return "General Query", 70.0, distribution
        
    distribution = {}
    for intent, count in scores.items():
        distribution[intent] = round(count / total_matches, 2)
        
    # Get highest score intent
    best_intent = max(scores, key=scores.get)
    confidence = round((scores[best_intent] / total_matches) * 100.0, 1)
    
    if best_intent == "General Query" or scores[best_intent] == 0:
        best_intent = "General Query"
        confidence = 65.0
        distribution["General Query"] = 1.0
        
    return best_intent, confidence, distribution


def translate_fallback(text: str) -> Dict[str, str]:
    """
    Translates Telugu text into English and Tamil with Tamil Romanized.
    Uses exact sentence matches or constructs a translation from keywords.
    """
    cleaned_text = text.strip()
    if cleaned_text in EXACT_TRANSLATION_DICT:
        return EXACT_TRANSLATION_DICT[cleaned_text]
        
    if (cleaned_text + "?") in EXACT_TRANSLATION_DICT:
        return EXACT_TRANSLATION_DICT[cleaned_text + "?"]
        
    # Tokenize by whitespace to extract clean terms
    words = text.split()
    clean_words = []
    for word in words:
        clean = re.sub(r'^[^\w\u0c00-\u0c7f]+|[^\w\u0c00-\u0c7f]+$', '', word)
        if clean:
            clean_words.append(clean)
            
    # Extract structural keywords
    has_where = any(w in ["ఎక్కడ", "ఎక్కడుంది"] for w in clean_words) or "ఎక్కడుంది" in text
    has_when = "ఎప్పుడు" in clean_words
    has_how = any(w in ["ఎలా", "ఎట్లా"] for w in clean_words)
    has_good = "మంచి" in clean_words
    
    translated_nouns_en = []
    translated_nouns_ta = []
    translated_nouns_rom = []
    
    for w in clean_words:
        if w in WORD_TRANSLATOR:
            trans = WORD_TRANSLATOR[w]
            if w not in ["ఎక్కడ", "ఎప్పుడు", "ఎలా", "ఎట్లా", "మంచి"]:
                translated_nouns_en.append(trans["en"])
                translated_nouns_ta.append(trans["ta"])
                translated_nouns_rom.append(trans["ta_rom"])
                
    # Construct fallback sentences
    if has_where:
        noun_en = " ".join(translated_nouns_en) or "place"
        noun_ta = " ".join(translated_nouns_ta) or "இடம்"
        noun_rom = " ".join(translated_nouns_rom) or "idam"
        
        adj_en = "good " if has_good else ""
        adj_ta = "நல்ல " if has_good else ""
        adj_rom = "nalla " if has_good else ""
        
        en_trans = f"Where is a {adj_en}{noun_en}?"
        ta_trans = f"ஒரு {adj_ta}{noun_ta} எங்கே இருக்கிறது?"
        ta_rom = f"Oru {adj_rom}{noun_rom} enge irukkirathu?"
    elif has_when:
        noun_en = " ".join(translated_nouns_en) or "event"
        noun_ta = " ".join(translated_nouns_ta) or "நிகழ்வு"
        noun_rom = " ".join(translated_nouns_rom) or "nigazhvu"
        
        en_trans = f"When will the {noun_en} arrive?"
        ta_trans = f"{noun_ta} எப்போது வரும்?"
        ta_rom = f"{noun_rom.capitalize()} eppodhu varum?"
    elif has_how:
        noun_en = " ".join(translated_nouns_en) or "destination"
        noun_ta = " ".join(translated_nouns_ta) or "இடம்"
        noun_rom = " ".join(translated_nouns_rom) or "idam"
        
        en_trans = f"How to go to the {noun_en}?"
        ta_trans = f"{noun_ta}க்கு எப்படி செல்வது?"
        ta_rom = f"{noun_rom.capitalize()}ukku eppadi selvathu?"
    else:
        # General compilation of all translated words
        all_en = []
        all_ta = []
        all_rom = []
        for w in clean_words:
            if w in WORD_TRANSLATOR:
                all_en.append(WORD_TRANSLATOR[w]["en"])
                all_ta.append(WORD_TRANSLATOR[w]["ta"])
                all_rom.append(WORD_TRANSLATOR[w]["ta_rom"])
                
        if all_en:
            en_trans = " ".join(all_en).capitalize() + "."
            ta_trans = " ".join(all_ta) + "."
            ta_rom = " ".join(all_rom).capitalize() + "."
        else:
            en_trans = f"Travel query: '{text}'"
            ta_trans = f"பயண విனவல்: '{text}'"
            ta_rom = f"Payana vinaval: '{text}'"
            
    return {
        "en": en_trans,
        "ta": ta_trans,
        "ta_romanized": ta_rom
    }


def run_full_fallback(text: str) -> Dict[str, Any]:
    """
    Runs the entire pipeline using the offline fallback rules.
    """
    input_type = detect_language(text)
    
    if input_type == "Roman Telugu":
        telugu_script = transliterate_roman_to_telugu(text)
    else:
        telugu_script = text
        
    normalized_telugu, dialect = normalize_dialect(telugu_script)
    intent, confidence, distribution = classify_intent(normalized_telugu)
    translations = translate_fallback(normalized_telugu)
    
    return {
        "original_input": text,
        "input_type": input_type,
        "telugu_script": telugu_script,
        "normalized_telugu": normalized_telugu,
        "dialect": dialect,
        "intent": intent,
        "confidence": confidence,
        "intent_distribution": distribution,
        "en": translations["en"],
        "ta": translations["ta"],
        "ta_romanized": translations["ta_romanized"]
    }
