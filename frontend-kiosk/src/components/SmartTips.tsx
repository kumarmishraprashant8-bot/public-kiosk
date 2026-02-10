import { useState, useEffect } from "react";


interface Tip {
    tip: string;
    icon: string;
}

// Hardcoded Tips for Demo (Multilingual)
const TIPS_DATA: Record<string, Record<string, Tip[]>> = {
    water_outage: {
        en: [
            { tip: "Check if your main valve is open", icon: "🔧" },
            { tip: "Ask neighbors if they have the same issue", icon: "🏠" },
            { tip: "Check if water bill is paid", icon: "💰" }
        ],
        hi: [
            { tip: "जांचें कि आपका मुख्य वाल्व खुला है", icon: "🔧" },
            { tip: "पड़ोसियों से पूछें कि क्या उन्हें भी यही समस्या है", icon: "🏠" },
            { tip: "जांचें कि क्या पानी का बिल भरा गया है", icon: "💰" }
        ],
        ta: [
            { tip: "உங்கள் பிரதான வால்வு திறந்திருக்கிறதா என்று பார்க்கவும்", icon: "🔧" },
            { tip: "அண்டை வீட்டாருக்கு அதே பிரச்சனை உள்ளதா என்று கேட்கவும்", icon: "🏠" },
            { tip: "தண்ணீர் கட்டணம் செலுத்தப்பட்டதா என்று பார்க்கவும்", icon: "💰" }
        ]
    },
    electricity_outage: {
        en: [
            { tip: "Check your circuit breaker / MCB", icon: "⚡" },
            { tip: "See if street lights are ON", icon: "💡" }
        ],
        hi: [
            { tip: "अपना सर्किट ब्रेकर / MCB जांचें", icon: "⚡" },
            { tip: "देखें कि क्या स्ट्रीट लाइट जल रही हैं", icon: "💡" }
        ],
        ta: [
            { tip: "உங்கள் சர்க்யூட் பிரேக்கர் / MCB ஐச் சரிபார்க்கவும்", icon: "⚡" },
            { tip: "தெரு விளக்குகள் எரிகிறதா என்று பார்க்கவும்", icon: "💡" }
        ]
    },
    // Default fallback for other intents
    default: {
        en: [{ tip: "Provide clear photos for faster resolution", icon: "📸" }],
        hi: [{ tip: "तेजी से समाधान के लिए स्पष्ट फोटो दें", icon: "📸" }],
        ta: [{ tip: "விரைவான தீர்வுக்கு தெளிவான புகைப்படங்களை வழங்கவும்", icon: "📸" }]
    }
};

interface SmartTipsProps {
    intent: string;
    onSolved: () => void;
    lang?: "en" | "hi" | "ta";
}

export default function SmartTips({ intent, onSolved, lang = "en" }: SmartTipsProps) {
    const [tips, setTips] = useState<Tip[]>([]);
    // const [loading, setLoading] = useState(true); // Removed loading state for instant demo
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

    const t = { // Labels mapping moved inside or handled differently
        en: {
            title: "Quick Checks Before Submitting",
            subtitle: "These might help solve your issue",
            solvedButton: "Issue Solved! Cancel Submission",
            continueButton: "Issue Not Solved, Continue"
        },
        hi: {
            title: "सबमिट करने से पहले जांचें",
            subtitle: "ये आपकी समस्या हल कर सकते हैं",
            solvedButton: "समस्या हल हो गई! रद्द करें",
            continueButton: "समस्या नहीं हुई, जारी रखें"
        },
        ta: {
            title: "சமர்ப்பிக்கும் முன் சரிபார்க்கவும்",
            subtitle: "இவை உங்கள் பிரச்சனையை தீர்க்க உதவலாம்",
            solvedButton: "பிரச்சனை தீர்ந்தது! ரத்து செய்",
            continueButton: "பிரச்சனை தீரவில்லை, தொடரவும்"
        }
    }[lang];


    useEffect(() => {
        if (!intent) return;

        // Load tips from local data
        const intentTips = TIPS_DATA[intent] || TIPS_DATA["default"];
        setTips(intentTips[lang] || intentTips["en"]);

    }, [intent, lang]);

    const toggleCheck = (index: number) => {
        const newChecked = new Set(checkedItems);
        if (newChecked.has(index)) {
            newChecked.delete(index);
        } else {
            newChecked.add(index);
        }
        setCheckedItems(newChecked);
    };

    if (tips.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-5 border-2 border-purple-400/30 mb-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center">
                    <span className="text-2xl">💡</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-purple-200">{t.title}</h3>
                    <p className="text-purple-300/70 text-sm">{t.subtitle}</p>
                </div>
            </div>

            {/* Tips List */}
            <div className="space-y-3 mb-4">
                {tips.map((tip, idx) => (
                    <button
                        key={idx}
                        onClick={() => toggleCheck(idx)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${checkedItems.has(idx)
                            ? "bg-green-500/20 border-2 border-green-400/50"
                            : "bg-black/20 border-2 border-transparent hover:border-purple-400/30"
                            }`}
                    >
                        <span className="text-2xl flex-shrink-0">
                            {checkedItems.has(idx) ? "✅" : tip.icon}
                        </span>
                        <span className={`flex-1 ${checkedItems.has(idx) ? "text-green-200 line-through" : "text-white/80"}`}>
                            {tip.tip}
                        </span>
                    </button>
                ))}
            </div>

            {/* Actions */}
            {checkedItems.size > 0 && checkedItems.size === tips.length && (
                <button
                    onClick={onSolved}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl text-lg hover:from-green-600 hover:to-emerald-700 transition-all mb-2"
                >
                    🎉 {t.solvedButton}
                </button>
            )}
        </div>
    );
}
