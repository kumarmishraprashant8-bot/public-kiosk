import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PsychicBanner from "../components/PsychicBanner";
import LiveStatsBar from "../components/LiveStatsBar";
import FeaturedResolutions from "../components/FeaturedResolutions";
import CityHeroesTicker from "../components/CityHeroesTicker";
import { Language } from "../types";
import { speak, stopSpeaking } from "../utils/tts";

const LANGUAGES = [
  { code: "en" as Language, name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hi" as Language, name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ta" as Language, name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
];

export default function HomePage() {
  const [step, setStep] = useState<"welcome" | "language">("welcome");
  const [selectedLang, setSelectedLang] = useState<Language | null>(null);
  const navigate = useNavigate();

  // Stop speech on step change, then speak welcome or language prompt
  useEffect(() => {
    stopSpeaking(); // Always stop previous speech first

    let timers: number[] = [];

    if (selectedLang) {
      const welcomeTexts = {
        en: "English selected.",
        hi: "हिंदी चुनी गई।",
        ta: "தமிழ் தேர்வு.",
      };
      speak(welcomeTexts[selectedLang], selectedLang);
    } else if (step === "welcome") {
      // Start speaking immediately (100ms delay just for safety)
      timers.push(window.setTimeout(() => {
        speak("Welcome to CivicPulse. Tap start.", "en");
      }, 100));
    } else if (step === "language") {
      // Speak prompts sequentially with enough time for each to complete
      // English: ~2s, Hindi: ~3s, Tamil: ~3s
      timers.push(window.setTimeout(() => speak("Select your language", "en"), 200));
      timers.push(window.setTimeout(() => speak("अपनी भाषा चुनें", "hi"), 2500));
      timers.push(window.setTimeout(() => speak("மொழி தேர்வு", "ta"), 6000));
    }

    return () => {
      timers.forEach(clearTimeout);
      stopSpeaking();
    };
  }, [step, selectedLang]);

  const handleStart = () => {
    stopSpeaking(); // Stop immediately on click
    setStep("language");
  };

  // Helper to navigate and always stop speech first
  const safeNavigate = (path: string, options?: any) => {
    stopSpeaking();
    navigate(path, options);
  };

  const handleLanguageSelect = (lang: Language) => {
    stopSpeaking(); // Stop any ongoing speech first
    setSelectedLang(lang);
    sessionStorage.setItem("selectedLanguage", lang);

    // Navigate after speech starts
    setTimeout(() => {
      stopSpeaking(); // Stop lang confirmation before navigating
      navigate("/phone", { state: { lang } });
    }, 2000); // Reduced to 2 seconds
  };

  // Welcome Screen - LANGUAGE NEUTRAL (minimal text, icons focus)
  if (step === "welcome") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto animate-slide-up">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-36 h-36 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl animate-float">
              <span className="text-7xl">🏛️</span>
            </div>
          </div>

          {/* Title - Show in ALL languages */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            <span className="block">CivicPulse</span>
            <span className="block text-2xl text-white/60 mt-2">सिविकपल्स • சிவிக்பல்ஸ்</span>
          </h1>

          {/* Subtitle in all 3 languages */}
          <div className="mb-10 space-y-1">
            <p className="text-lg text-white/50">Smart Urban Helpdesk</p>
            <p className="text-lg text-white/50">स्मार्ट शहरी हेल्पडेस्क</p>
            <p className="text-lg text-white/50">ஸ்மார்ட் அர்பன் ஹெல்ப்டெஸ்க்</p>
          </div>


          {/* LIVE STATS BAR - Social Proof */}
          <LiveStatsBar />

          {/* CITY HEROES TICKER - God Mode */}
          <CityHeroesTicker />

          {/* FEATURED RESOLUTIONS - Before/After Proof */}
          <FeaturedResolutions />

          {/* PSYCHIC INTERCEPT BANNER */}
          <PsychicBanner />

          {/* Features - ICONS ONLY, no text bias */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="glass-card p-5 flex flex-col items-center">
              <span className="text-4xl mb-2">📸</span>
            </div>
            <div className="glass-card p-5 flex flex-col items-center">
              <span className="text-4xl mb-2">✍️</span>
            </div>
            <div className="glass-card p-5 flex flex-col items-center">
              <span className="text-4xl mb-2">🎫</span>
            </div>
          </div>

          {/* Start Button - Multilingual */}
          <button
            onClick={handleStart}
            className="group relative px-12 py-7 text-2xl font-bold text-white rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-100 w-full max-w-md mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 animate-pulse-glow"></div>
            <span className="relative z-10 flex flex-col items-center gap-1">
              <span className="text-3xl">👆</span>
              <span>START • शुरू करें • தொடங்கு</span>
            </span>
          </button>

          {/* Footer Links for Navigation */}
          <div className="mt-8 text-center flex flex-wrap justify-center gap-4">
            <button
              onClick={() => safeNavigate("/stats")}
              className="text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              📊 City Stats
            </button>
            <button
              onClick={() => safeNavigate("/profile")}
              className="text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              👤 My Profile
            </button>
            <button
              onClick={() => safeNavigate("/ar")}
              className="text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              👓 Field Crew
            </button>
            <button
              onClick={() => safeNavigate("/crew")}
              className="text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              🚀 Crew App
            </button>
            <button
              onClick={() => safeNavigate("/admin")}
              className="text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              💻 Command
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Language Selection Screen
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-3xl w-full mx-auto animate-slide-up">
        {/* Back Button */}
        <button
          onClick={() => setStep("welcome")}
          className="mb-8 p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <span className="text-white text-2xl">←</span>
        </button>

        {/* Header - ALL LANGUAGES EQUAL */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Select Language
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            भाषा चुनें
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-white">
            மொழியைத் தேர்ந்தெடுக்கவும்
          </h3>
        </div>

        {/* Language Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              disabled={selectedLang !== null}
              className={`group relative p-8 rounded-3xl border-3 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 ${selectedLang === lang.code
                ? "bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-green-400 scale-105"
                : "glass-card border-transparent hover:border-white/30"
                }`}
              style={{ minHeight: "200px" }}
            >
              {/* Flag */}
              <div className="text-7xl mb-4 transform group-hover:scale-110 transition-transform">
                {lang.flag}
              </div>

              {/* Native Name - BIG */}
              <h2 className="text-4xl font-bold text-white mb-2">
                {lang.nativeName}
              </h2>

              {/* Selection Indicator */}
              {selectedLang === lang.code && (
                <div className="absolute top-4 right-4 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-xl">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Selection Indicator & Voice Test */}
        {selectedLang && (
          <div className="text-center mt-8 animate-fade-in">
            <button
              onClick={() => {
                const testTexts = {
                  en: "Testing voice. If you can hear this, sound is working.",
                  hi: "आवाज़ की जांच हो रही है। यदि आप इसे सुन पा रहे हैं, तो आवाज़ काम कर रही है।",
                  ta: "குரல் சோதனை. இதை நீங்கள் கேட்டால், ஒலி வேலை செய்கிறது.",
                };
                speak(testTexts[selectedLang], selectedLang);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition-all border border-white/10 mb-4"
            >
              <span className="text-xl">🔊</span>
              <span>Listen again • மீண்டும் கேட்கவும்</span>
            </button>
            <div className="flex items-center justify-center gap-3 text-white/60">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Entering... உள்ளே நுழைகிறது...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
