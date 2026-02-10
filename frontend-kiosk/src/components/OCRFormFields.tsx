import { OCRParseResponse, Language } from "../types";

interface OCRFormFieldsProps {
  ocrData: OCRParseResponse;
  lang: Language;
  onFieldChange: (field: string, value: string) => void;
}

// Field labels in multiple languages
const FIELD_LABELS: Record<string, Record<Language, string>> = {
  name: { en: "Name", hi: "नाम", ta: "பெயர்" },
  account_no: { en: "Account Number", hi: "खाता संख्या", ta: "கணக்கு எண்" },
  address: { en: "Address", hi: "पता", ta: "முகவரி" },
  biller: { en: "Biller", hi: "बिलर", ta: "பில்லர்" },
  amount: { en: "Amount", hi: "राशि", ta: "தொகை" },
  date: { en: "Date", hi: "तारीख", ta: "தேதி" },
};

// Get confidence color and label
function getConfidenceStyle(confidence: number): { color: string; bg: string; label: string; icon: string } {
  if (confidence >= 0.85) {
    return { color: "text-green-700", bg: "bg-green-100 border-green-400", label: "High", icon: "✓" };
  } else if (confidence >= 0.60) {
    return { color: "text-amber-700", bg: "bg-amber-100 border-amber-400", label: "Medium", icon: "△" };
  } else if (confidence > 0) {
    return { color: "text-red-700", bg: "bg-red-100 border-red-400", label: "Low", icon: "!" };
  } else {
    return { color: "text-gray-400", bg: "bg-gray-50 border-gray-300", label: "Not found", icon: "?" };
  }
}

export default function OCRFormFields({ ocrData, lang, onFieldChange }: OCRFormFieldsProps) {
  const fields = ["name", "account_no", "address", "biller", "amount", "date"];

  // Get per-field confidence (with fallback)
  const fieldConfidence = ocrData.field_confidence || {};

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📋</span>
        <div>
          <h3 className="text-2xl font-bold text-gray-800">
            {lang === 'hi' ? 'पहचानी गई जानकारी' : lang === 'ta' ? 'கண்டறியப்பட்ட தகவல்' : 'Detected Information'}
          </h3>
          <p className="text-gray-600">
            {lang === 'hi' ? 'कृपया सत्यापित करें और यदि आवश्यक हो तो संपादित करें'
              : lang === 'ta' ? 'சரிபார்த்து தேவைப்பட்டால் திருத்தவும்'
                : 'Please verify and edit if needed'}
          </p>
        </div>
      </div>

      {/* Overall confidence bar */}
      <div className="mb-6 p-3 bg-white rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-700">
            {lang === 'hi' ? 'समग्र विश्वास' : lang === 'ta' ? 'ஒட்டுமொத்த நம்பிக்கை' : 'Overall Confidence'}
          </span>
          <span className={`font-bold ${ocrData.confidence >= 0.7 ? 'text-green-600' : ocrData.confidence >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
            {(ocrData.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${ocrData.confidence >= 0.7 ? 'bg-green-500' : ocrData.confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
              }`}
            style={{ width: `${ocrData.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        {fields.map((fieldKey) => {
          const value = ocrData.parsed_fields[fieldKey] || "";
          const confidence = fieldConfidence[fieldKey] || 0;
          const style = getConfidenceStyle(confidence);
          const label = FIELD_LABELS[fieldKey]?.[lang] || fieldKey;

          return (
            <div key={fieldKey} className="relative">
              {/* Label with confidence indicator */}
              <div className="flex items-center justify-between mb-2">
                <label className="text-lg font-semibold text-gray-700">
                  {label}
                </label>
                {/* Confidence badge */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${style.bg} ${style.color}`}>
                  <span className="text-xs">{style.icon}</span>
                  <span>{confidence > 0 ? `${(confidence * 100).toFixed(0)}%` : style.label}</span>
                </div>
              </div>

              {/* Input with confidence border */}
              <div className="relative">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onFieldChange(fieldKey, e.target.value)}
                  className={`
                    w-full px-4 py-4 text-xl border-2 rounded-lg 
                    focus:outline-none focus:ring-2 focus:ring-blue-400
                    transition-all duration-200
                    ${style.bg}
                  `}
                  placeholder={confidence === 0 ? (lang === 'hi' ? 'यहाँ टाइप करें...' : lang === 'ta' ? 'இங்கே தட்டச்சு செய்க...' : 'Type here...') : ''}
                  style={{ minHeight: "56px" }}
                />

                {/* Confidence dot indicator */}
                <div className={`
                  absolute right-3 top-1/2 -translate-y-1/2
                  w-4 h-4 rounded-full
                  ${confidence >= 0.85 ? 'bg-green-500' : confidence >= 0.60 ? 'bg-amber-500' : confidence > 0 ? 'bg-red-500' : 'bg-gray-300'}
                `} title={`Confidence: ${(confidence * 100).toFixed(0)}%`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <p className="mt-6 text-center text-gray-600 flex items-center justify-center gap-2">
        <span>💡</span>
        <span>
          {lang === 'hi' ? 'संपादित करने के लिए किसी भी फ़ील्ड पर टैप करें'
            : lang === 'ta' ? 'திருத்த எந்த புலத்தையும் தட்டவும்'
              : 'Tap any field to edit'}
        </span>
      </p>
    </div>
  );
}
