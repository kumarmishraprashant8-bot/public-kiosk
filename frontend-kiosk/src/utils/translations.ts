import { Language } from "../types";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    welcome: "Welcome to CivicPulse",
    selectLanguage: "Select Language",
    enterPhone: "Enter Phone Number",
    requestOTP: "Request OTP",
    enterOTP: "Enter OTP",
    verify: "Verify",
    uploadPhoto: "Upload Photo",
    describeIssue: "Describe Your Issue",
    submit: "Submit",
    receipt: "Receipt",
    queued: "Queued for Sync",
    syncing: "Syncing...",
    language: "Language",
  },
  hi: {
    welcome: "CivicPulse में आपका स्वागत है",
    selectLanguage: "भाषा चुनें",
    enterPhone: "फोन नंबर दर्ज करें",
    requestOTP: "OTP अनुरोध करें",
    enterOTP: "OTP दर्ज करें",
    verify: "सत्यापित करें",
    uploadPhoto: "फोटो अपलोड करें",
    describeIssue: "अपनी समस्या बताएं",
    submit: "जमा करें",
    receipt: "रसीद",
    queued: "सिंक के लिए कतारबद्ध",
    syncing: "सिंक हो रहा है...",
    language: "भाषा",
  },
  ta: {
    welcome: "CivicPulse-க்கு வரவேற்கிறோம்",
    selectLanguage: "மொழியைத் தேர்ந்தெடுக்கவும்",
    enterPhone: "தொலைபேசி எண்ணை உள்ளிடவும்",
    requestOTP: "OTP கோரவும்",
    enterOTP: "OTP உள்ளிடவும்",
    verify: "சரிபார்க்கவும்",
    uploadPhoto: "புகைப்படம் பதிவேற்றவும்",
    describeIssue: "உங்கள் சிக்கலை விவரிக்கவும்",
    submit: "சமர்ப்பிக்கவும்",
    receipt: "ரசீது",
    queued: "ஒத்திசைவுக்காக வரிசையில்",
    syncing: "ஒத்திசைக்கப்படுகிறது...",
    language: "மொழி",
  },
};

export function t(key: string, lang: Language): string {
  return translations[lang][key] || translations.en[key] || key;
}
