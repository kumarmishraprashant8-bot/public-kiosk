"""
Similarity and NLP utilities for CivicPulse AI features.
Lightweight implementations using keyword scoring and cosine similarity.
"""

import re
import math
from typing import Dict, List, Tuple, Optional
from collections import Counter

# Intent keywords for classification
INTENT_KEYWORDS = {
    "water_outage": [
        "water", "supply", "tap", "pipeline", "leak", "leaking", "no water",
        "low pressure", "pressure", "bwssb", "tank", "bore", "borewell",
        "पानी", "जल", "नल", "आपूर्ति", "लीक",
        "நீர்", "குழாய்", "தண்ணீர்", "வழங்கல்", "கசிவு", "தண்ணீர் இல்லை"
    ],
    "electricity_outage": [
        "power", "electricity", "light", "current", "voltage", "transformer",
        "wire", "electrical", "bescom", "power cut", "outage", "blackout",
        "बिजली", "करंट", "वोल्टेज", "अंधेरा", "पावर कट",
        "மின்சாரம்", "மின்வெட்டு", "மின்", "மின்சாரம் இல்லை", "இருட்டு"
    ],
    "garbage": [
        "garbage", "trash", "waste", "dustbin", "dump", "dumping", "smell",
        "stink", "collection", "bbmp", "sanitation", "rubbish",
        "कचरा", "कूड़ा", "गंदगी", "सफाई",
        "குப்பை", "கழிவு", "துர்நாற்றம்", "அழுக்கு"
    ],
    "road": [
        "road", "pothole", "street", "footpath", "pavement", "crack",
        "damaged", "broken", "repair", "asphalt", "tar",
        "सड़क", "गड्ढा", "मार्ग", "टूटा", "मुरम्मत",
        "சாலை", "குழி", "தெரு", "சேதம்", "பழுது"
    ],
    "sewage": [
        "sewage", "drain", "drainage", "sewer", "overflow", "blocked",
        "clogged", "stormwater", "manhole", "gutter",
        "नाला", "नाली", "सीवेज", "जाम",
        "கழிவுநீர்", "சாக்கடை", "அடைப்பு", "கால்வாய்"
    ],
    "streetlight": [
        "streetlight", "street light", "lamp", "pole", "bulb", "lighting",
        "dark", "night", "light pole",
        "स्ट्रीट लाइट", "खंबा", "बल्ब", "रोशनी",
        "தெரு விளக்கு", "விளக்கு", "கம்பம்", "எரியவில்லை"
    ]
}

# Severity keywords for priority scoring
SEVERITY_KEYWORDS = {
    "critical": ["emergency", "urgent", "danger", "dangerous", "accident", "fire", "flooding", "collapsed", "life", "death", "hospital", "ambulance"],
    "high": ["immediate", "severe", "major", "serious", "many", "entire", "all", "whole", "days", "week"],
    "medium": ["problem", "issue", "complaint", "since", "morning", "yesterday", "hours"],
    "low": ["minor", "small", "little", "sometimes", "occasional"]
}

# Category weights for priority
CATEGORY_WEIGHTS = {
    "water_outage": 25,
    "electricity_outage": 25,
    "sewage": 20,
    "road": 15,
    "garbage": 10,
    "streetlight": 10,
    "other": 5
}


def tokenize(text: str) -> List[str]:
    """Simple tokenization - lowercase and split on non-alphanumeric."""
    if not text:
        return []
    text = text.lower()
    return re.findall(r'\b\w+\b', text)


def calculate_text_similarity(text1: str, text2: str) -> float:
    """
    Calculate cosine similarity between two texts using TF weighting.
    Returns value between 0 and 1.
    """
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    
    if not tokens1 or not tokens2:
        return 0.0
    
    # Create term frequency vectors
    tf1 = Counter(tokens1)
    tf2 = Counter(tokens2)
    
    # Get all unique terms
    all_terms = set(tf1.keys()) | set(tf2.keys())
    
    # Calculate dot product and magnitudes
    dot_product = sum(tf1.get(term, 0) * tf2.get(term, 0) for term in all_terms)
    magnitude1 = math.sqrt(sum(v ** 2 for v in tf1.values()))
    magnitude2 = math.sqrt(sum(v ** 2 for v in tf2.values()))
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return dot_product / (magnitude1 * magnitude2)


def extract_keywords(text: str, top_n: int = 10) -> List[str]:
    """Extract top keywords from text by frequency."""
    tokens = tokenize(text)
    # Remove common stop words
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "and", "or", "it", "this", "that", "my", "i", "we", "our", "has", "have", "been", "not", "no"}
    filtered = [t for t in tokens if t not in stop_words and len(t) > 2]
    counts = Counter(filtered)
    return [word for word, _ in counts.most_common(top_n)]


def detect_intent_from_text(text: str) -> Tuple[str, float]:
    """
    Detect intent category from text using keyword matching.
    Returns (intent, confidence).
    Improved for multilingual script and substring handling.
    """
    if not text:
        return ("other", 0.0)
    
    text_lower = text.lower()
    tokens = set(tokenize(text))
    
    scores = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            keyword_lower = keyword.lower()
            # 1. Exact phrase match in text (High confidence)
            if keyword_lower in text_lower:
                # Weight by keyword length to favor specific terms over short common ones
                score += len(keyword_lower) * 2
            # 2. Individual word match in tokens
            elif keyword_lower in tokens:
                score += len(keyword_lower)
        scores[intent] = score
    
    if not scores or max(scores.values()) == 0:
        return ("other", 0.0)
    
    best_intent = max(scores, key=scores.get)
    max_score = scores[best_intent]
    
    # Normalize confidence based on score density
    # A score of ~15-20 usually means 2-3 solid matches
    confidence = min(max_score / 20.0, 1.0)
    
    return (best_intent, confidence)


def calculate_severity_score(text: str) -> int:
    """
    Calculate severity score from text keywords.
    Returns 0-30 score.
    """
    if not text:
        return 0
    
    text_lower = text.lower()
    score = 0
    
    for word in SEVERITY_KEYWORDS["critical"]:
        if word in text_lower:
            score += 10
    
    for word in SEVERITY_KEYWORDS["high"]:
        if word in text_lower:
            score += 5
    
    for word in SEVERITY_KEYWORDS["medium"]:
        if word in text_lower:
            score += 2
    
    # Cap at 30
    return min(score, 30)


def calculate_priority_score(
    text: str,
    intent: str,
    similar_count: int = 0,
    hours_since_first: float = 0,
    is_peak_hours: bool = False
) -> Dict:
    """
    Calculate priority score for a submission.
    
    Formula:
        severity_keywords * 30% +
        similar_complaints * 25% +
        hours_since_first * 20% +
        category_weight * 15% +
        time_of_day * 10%
    
    Returns dict with score (0-100) and level (LOW/MEDIUM/HIGH/CRITICAL).
    """
    # Severity from keywords (0-30)
    severity = calculate_severity_score(text)
    
    # Similar complaints nearby (0-25)
    similar_score = min(similar_count * 5, 25)
    
    # Hours since first report (0-20)
    time_score = min(hours_since_first * 2, 20)
    
    # Category weight (0-25)
    category_score = CATEGORY_WEIGHTS.get(intent, 5)
    
    # Peak hours bonus (0-10)
    peak_score = 10 if is_peak_hours else 0
    
    # Total score
    total = severity + similar_score + time_score + category_score + peak_score
    total = min(total, 100)
    
    # Determine level and ETA
    if total >= 76:
        level = "CRITICAL"
        response_time = "1h ± 15m"
        eta_seconds = 3600
        confidence = 0.95
    elif total >= 51:
        level = "HIGH"
        response_time = "3h ± 30m"
        eta_seconds = 10800
        confidence = 0.85
    elif total >= 26:
        level = "MEDIUM"
        response_time = "6h ± 1h"
        eta_seconds = 21600
        confidence = 0.75
    else:
        level = "LOW"
        response_time = "24h ± 4h"
        eta_seconds = 86400
        confidence = 0.60
    
    return {
        "score": total,
        "level": level,
        "estimated_response": response_time,
        "eta_seconds": eta_seconds,
        "confidence": confidence,
        "breakdown": {
            "severity_keywords": severity,
            "similar_complaints": similar_score,
            "time_factor": time_score,
            "category_weight": category_score,
            "peak_hours": peak_score
        }
    }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points in meters using Haversine formula.
    """
    R = 6371000  # Earth radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


# Troubleshooting tips for smart guidance
TROUBLESHOOT_TIPS = {
    "water_outage": [
        {"tip": "Check if your main valve is open", "icon": "🔧"},
        {"tip": "Ask neighbors if they have the same issue", "icon": "🏠"},
        {"tip": "Check if water bill is paid", "icon": "💰"},
        {"tip": "Look for any visible pipeline leaks", "icon": "👀"}
    ],
    "electricity_outage": [
        {"tip": "Check if your MCB/fuse is tripped", "icon": "⚡"},
        {"tip": "Is it affecting your entire building or just your unit?", "icon": "🏢"},
        {"tip": "Check if electricity bill is paid", "icon": "💰"},
        {"tip": "Look for any sparking wires nearby", "icon": "⚠️"}
    ],
    "garbage": [
        {"tip": "Check if today is a collection day for your area", "icon": "📅"},
        {"tip": "Is the dustbin overflowing or just full?", "icon": "🗑️"},
        {"tip": "Take a photo of the garbage pile", "icon": "📷"}
    ],
    "road": [
        {"tip": "Is the pothole on main road or side lane?", "icon": "🛣️"},
        {"tip": "Estimate the size of the pothole", "icon": "📏"},
        {"tip": "Mark location with a visible object if safe", "icon": "📍"}
    ],
    "sewage": [
        {"tip": "Check if it's after heavy rain", "icon": "🌧️"},
        {"tip": "Is the drain completely blocked?", "icon": "🚫"},
        {"tip": "Keep distance if there's bad smell", "icon": "👃"}
    ],
    "streetlight": [
        {"tip": "Note the pole number if visible", "icon": "🔢"},
        {"tip": "Is it a single light or multiple lights?", "icon": "💡"},
        {"tip": "Check if it flickers or completely off", "icon": "⚫"}
    ]
}


def get_troubleshoot_tips(intent: str) -> List[Dict]:
    """Get smart troubleshooting tips for an intent."""
    return TROUBLESHOOT_TIPS.get(intent, [])


# Sathi Conversational Responses
SATHI_RESPONSES = {
    "welcome": [
        "Namaste! I am Sathi, your city companion. How can I help you today?",
        "Hello! I'm Sathi. You can report an issue or ask about your city.",
        "Vanakkam! I am Sathi. Tell me, what's happening in your area?"
    ],
    "water_outage": [
        "I understand you have a water problem. Is it a supply cut or a leak?",
        "Water issues are serious. I'll help you report this immediately.",
        "Noted. Is the water dirty or is there no supply at all?"
    ],
    "electricity_outage": [
        "Power cuts can be frustrating. Is the whole street dark?",
        "I see. Is it a voltage fluctuation or a complete blackout?",
        "Captured. Please stay safe if there are sparking wires."
    ],
    "garbage": [
        "I'll note down the garbage issue. Is the bin overflowing?",
        "Clean cities are happy cities. Where is this garbage pile exactly?",
        "Got it. Is the collection vehicle not coming?"
    ],
    "road": [
        "Potholes can be dangerous. Is it on the main road?",
        "I'm noting this road damage. Is it blocking traffic?",
        "Safety first! How big is this pothole approx?"
    ],
    "default": [
        "I'm listening. Please tell me more.",
        "Could you clarify that? I want to make sure I get it right.",
        "I am here to help. Go on."
    ]
}


def get_sathi_response(intent: str) -> str:
    """Get a conversational response for the identified intent."""
    import random
    responses = SATHI_RESPONSES.get(intent, SATHI_RESPONSES["default"])
    return random.choice(responses)

