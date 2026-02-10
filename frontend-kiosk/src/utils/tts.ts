let voices: SpeechSynthesisVoice[] = [];

// Helper to load voices reliably
const loadVoices = () => {
  const available = window.speechSynthesis.getVoices();
  if (available.length > 0) {
    voices = available;
    console.log(`[TTS] Loaded ${voices.length} voices`);
  }
};

// Initialize voices
if ("speechSynthesis" in window) {
  loadVoices();
  // Chrome loads voices asynchronously
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export function speak(text: string, lang: string = "en"): void {
  if (!("speechSynthesis" in window)) {
    console.error("[TTS] Speech synthesis not supported");
    return;
  }

  // Ensure voices are loaded (retry if empty)
  if (voices.length === 0) loadVoices();

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Voice Selection Logic
  let selectedVoice: SpeechSynthesisVoice | undefined;
  const targetLang = lang.toLowerCase();

  // 1. Try exact match for Indian languages (Google voices preferred)
  if (targetLang === "hi") {
    selectedVoice = voices.find(v => v.lang.toLowerCase().includes("hi-in") && v.name.includes("Google"));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes("hi"));
  } else if (targetLang === "ta") {
    // Try Google first, then Microsoft/Valluvar, then any Tamil voice
    selectedVoice = voices.find(v => v.lang.toLowerCase().includes("ta-in") && v.name.includes("Google"));
    if (!selectedVoice) selectedVoice = voices.find(v => v.name.toLowerCase().includes("valluvar"));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes("ta-in"));
    if (!selectedVoice) selectedVoice = voices.find(v => v.name.toLowerCase().includes("tamil"));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes("ta"));
  }

  // 2. English fallback (Indian English preferred)
  if (!selectedVoice && (targetLang === "en" || !selectedVoice)) {
    selectedVoice = voices.find(v => (v.lang.toLowerCase().includes("en-in") || v.lang.toLowerCase() === "en_in") && v.name.includes("Google"));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes("en-in"));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.toLowerCase().includes("en-us"));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang; // Important for correct intonation
    console.log(`[TTS] Speaking: "${text}" using ${selectedVoice.name} (${selectedVoice.lang})`);
  } else {
    // Set a reasonable default lang even if no specific voice match found
    const langMap: Record<string, string> = { hi: "hi-IN", ta: "ta-IN", en: "en-IN" };
    utterance.lang = langMap[targetLang] || "en-US";
    console.warn(`[TTS] No suitable voice found for ${lang}, using browser default for ${utterance.lang}.`);
  }

  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onerror = (e) => console.error("[TTS] Speech error:", e);

  // Small delay to ensure cancel impacts execution
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 10);
}

export function stopSpeaking(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
