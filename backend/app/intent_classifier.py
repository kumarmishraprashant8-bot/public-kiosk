"""
Simple intent classifier using keyword matching and TF-IDF fallback.
"""
import re
from typing import Dict, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import pickle
import os

# Keyword-based intent mapping
INTENT_KEYWORDS = {
    "water_outage": ["water", "tap", "no water", "water supply", "pipeline", "leak"],
    "electricity_outage": ["electric", "power", "meter", "current", "voltage", "blackout"],
    "garbage": ["garbage", "waste", "trash", "bin", "collection", "dirty"],
    "road": ["road", "pothole", "street", "traffic", "repair", "damage"],
    "sewage": ["sewage", "drain", "sewer", "overflow", "blocked"],
    "other": []
}

class IntentClassifier:
    def __init__(self):
        self.vectorizer = None
        self.model = None
        self._load_or_init_model()
    
    def _load_or_init_model(self):
        """Load trained model or initialize with defaults"""
        model_path = "app/models/intent_model.pkl"
        if os.path.exists(model_path):
            try:
                with open(model_path, "rb") as f:
                    data = pickle.load(f)
                    self.vectorizer = data["vectorizer"]
                    self.model = data["model"]
                return
            except:
                pass
        
        # Initialize with default TF-IDF + Logistic Regression
        self.vectorizer = TfidfVectorizer(max_features=100, stop_words="english")
        # Dummy training data - will be replaced in seed script
        dummy_texts = ["water outage", "electricity problem", "garbage issue"]
        dummy_labels = [0, 1, 2]
        X = self.vectorizer.fit_transform(dummy_texts)
        self.model = LogisticRegression()
        self.model.fit(X, dummy_labels)
    
    def classify(self, text: str) -> Dict[str, any]:
        """
        Classify intent from text.
        Returns: {intent: str, confidence: float, method: str}
        """
        text_lower = text.lower()
        
        # Try keyword matching first
        for intent, keywords in INTENT_KEYWORDS.items():
            if intent == "other":
                continue
            for keyword in keywords:
                if keyword in text_lower:
                    return {
                        "intent": intent,
                        "confidence": 0.8,
                        "method": "keyword"
                    }
        
        # Fallback to TF-IDF + model
        try:
            X = self.vectorizer.transform([text])
            proba = self.model.predict_proba(X)[0]
            intent_idx = proba.argmax()
            confidence = float(proba[intent_idx])
            
            intent_map = ["water_outage", "electricity_outage", "garbage"]
            intent = intent_map[intent_idx] if intent_idx < len(intent_map) else "other"
            
            return {
                "intent": intent,
                "confidence": confidence,
                "method": "tfidf"
            }
        except:
            return {
                "intent": "other",
                "confidence": 0.5,
                "method": "fallback"
            }

# Global classifier instance
classifier = IntentClassifier()
