import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.similarity import detect_intent_from_text

test_cases = [
    ("தண்ணீர் வரவில்லை", "water_outage"),
    ("மின்சாரம் இல்லை", "electricity_outage"),
    ("குப்பை அதிகமாக உள்ளது", "garbage"),
    ("சாலை சரியில்லை", "road"),
    ("கழிவுநீர் ஓடுகிறது", "sewage"),
    ("தெரு விளக்கு எரியவில்லை", "streetlight")
]

print("Testing Tamil Intent Detection:")
for text, expected in test_cases:
    intent, confidence = detect_intent_from_text(text)
    print(f"Text: {text} | Expected: {expected} | Detected: {intent} ({confidence:.2f})")
