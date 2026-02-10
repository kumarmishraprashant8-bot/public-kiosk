import { Language } from "../types";

interface LanguageSelectorProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function LanguageSelector({ currentLang, onLanguageChange }: LanguageSelectorProps) {
  const languages: { code: Language; name: string }[] = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिंदी" },
    { code: "ta", name: "தமிழ்" },
  ];

  return (
    <div className="absolute top-4 right-4">
      <select
        value={currentLang}
        onChange={(e) => onLanguageChange(e.target.value as Language)}
        className="px-4 py-2 text-lg border-2 border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500"
        style={{ minHeight: "48px", fontSize: "18px" }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
