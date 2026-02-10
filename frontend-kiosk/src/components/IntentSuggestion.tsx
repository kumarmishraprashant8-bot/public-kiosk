interface IntentSuggestionProps {
    detectedIntent: string;
    selectedIntent: string;
    confidence: number;
    message: string;
    onSwitch: () => void;
    onKeep: () => void;
    lang?: "en" | "hi" | "ta";
}

const INTENT_LABELS: Record<string, { icon: string; en: string; hi: string; ta: string }> = {
    water_outage: { icon: "💧", en: "Water Issue", hi: "पानी की समस्या", ta: "நீர் பிரச்சனை" },
    electricity_outage: { icon: "⚡", en: "Electricity Issue", hi: "बिजली की समस्या", ta: "மின் பிரச்சனை" },
    garbage: { icon: "🗑️", en: "Garbage/Waste", hi: "कचरा", ta: "குப்பை" },
    road: { icon: "🛣️", en: "Road/Pothole", hi: "सड़क/गड्ढा", ta: "சாலை" },
    sewage: { icon: "🚰", en: "Sewage/Drainage", hi: "नाली/सीवर", ta: "கழிவுநீர்" },
    streetlight: { icon: "💡", en: "Streetlight", hi: "स्ट्रीट लाइट", ta: "தெரு விளக்கு" },
};

export default function IntentSuggestion({
    detectedIntent,
    selectedIntent,
    confidence,
    message,
    onSwitch,
    onKeep,
    lang = "en"
}: IntentSuggestionProps) {
    const detected = INTENT_LABELS[detectedIntent] || { icon: "❓", en: detectedIntent, hi: detectedIntent, ta: detectedIntent };
    const selected = INTENT_LABELS[selectedIntent] || { icon: "❓", en: selectedIntent, hi: selectedIntent, ta: selectedIntent };

    const labels = {
        en: {
            aiDetected: "AI Detected",
            youSelected: "You selected",
            switchTo: "Switch to",
            keepCurrent: "Keep current",
            confidence: `${Math.round(confidence * 100)}% confident`
        },
        hi: {
            aiDetected: "AI ने पहचाना",
            youSelected: "आपने चुना",
            switchTo: "बदलें",
            keepCurrent: "वर्तमान रखें",
            confidence: `${Math.round(confidence * 100)}% विश्वास`
        },
        ta: {
            aiDetected: "AI கண்டறிந்தது",
            youSelected: "நீங்கள் தேர்ந்தெடுத்தது",
            switchTo: "மாற்று",
            keepCurrent: "தற்போதையதை வை",
            confidence: `${Math.round(confidence * 100)}% நம்பிக்கை`
        }
    };

    const t = labels[lang];

    if (detectedIntent === selectedIntent) return null;

    return (
        <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-lg rounded-2xl p-5 border-2 border-blue-400/50 mb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-blue-200">
                        💡 {t.aiDetected}
                    </h3>
                    <p className="text-blue-300/70 text-sm">{t.confidence}</p>
                </div>
            </div>

            {/* Comparison */}
            <div className="bg-black/20 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                    {/* Selected */}
                    <div className="text-center">
                        <p className="text-white/50 text-xs mb-1">{t.youSelected}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{selected.icon}</span>
                            <span className="text-white/70">{selected[lang]}</span>
                        </div>
                    </div>

                    {/* Arrow */}
                    <span className="text-2xl text-blue-400">→</span>

                    {/* Detected */}
                    <div className="text-center">
                        <p className="text-blue-300 text-xs mb-1">{t.aiDetected}</p>
                        <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded-lg">
                            <span className="text-2xl">{detected.icon}</span>
                            <span className="text-white font-medium">{detected[lang]}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message */}
            <p className="text-white/80 text-center mb-4">{message}</p>

            {/* Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={onSwitch}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all"
                >
                    {t.switchTo} {detected[lang]}
                </button>
                <button
                    onClick={onKeep}
                    className="py-3 px-4 bg-white/10 text-white/70 rounded-xl hover:bg-white/20 transition-all border border-white/20"
                >
                    {t.keepCurrent}
                </button>
            </div>
        </div>
    );
}
