import { useState, useEffect, useCallback } from "react";
import { Language } from "../types";
import { useTTS, getStepPrompt } from "../hooks/useTTS";

interface AvatarHelpProps {
  text?: string;
  stepKey?: string;
  lang: Language;
  autoSpeak?: boolean;
  showHelpButton?: boolean;
  onHelpClick?: () => void;
}

export default function AvatarHelp({
  text,
  stepKey,
  lang,
  autoSpeak = true,
  showHelpButton = true,
  onHelpClick
}: AvatarHelpProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const { speak, stop, isSpeaking, speakStep, isSupported } = useTTS({
    lang,
    rate: 0.9,
    onStart: () => setIsAnimating(true),
    onEnd: () => setIsAnimating(false)
  });

  // Display text - either provided directly or from step prompts
  const displayText = text || (stepKey ? getStepPrompt(stepKey, lang) : '');

  useEffect(() => {
    if (autoSpeak && displayText) {
      speak(displayText);
    }
    return () => stop();
  }, [displayText, autoSpeak]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReplay = useCallback(() => {
    speak(displayText);
  }, [displayText, speak]);

  const handleHelpClick = useCallback(() => {
    // First speak the "need help" prompt, then replay the current step
    speakStep('needHelp');
    setTimeout(() => {
      speak(displayText);
    }, 3000);
    onHelpClick?.();
  }, [displayText, speak, speakStep, onHelpClick]);

  if (!displayText) return null;

  return (
    <div className="avatar-help-container mb-6">
      {/* Main avatar card */}
      <div className={`
        bg-gradient-to-r from-blue-50 to-indigo-50 
        border-2 border-blue-200 rounded-xl p-5
        transition-all duration-300
        ${isSpeaking ? 'ring-4 ring-blue-300 ring-opacity-50' : ''}
      `}>
        <div className="flex items-start gap-4">
          {/* Avatar with speaking animation */}
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center 
            text-4xl flex-shrink-0 shadow-lg
            transition-transform duration-200
            ${isAnimating ? 'animate-pulse scale-110 bg-blue-600' : 'bg-blue-500'}
          `}>
            <span className={isSpeaking ? 'animate-bounce' : ''}>
              {isSpeaking ? '🗣️' : '👤'}
            </span>
          </div>

          {/* Text content */}
          <div className="flex-1">
            <p className={`
              text-xl leading-relaxed text-gray-800
              ${lang === 'hi' || lang === 'ta' ? 'text-2xl' : ''}
            `}>
              {displayText}
            </p>

            {/* Speaking indicator */}
            {isSpeaking && (
              <div className="flex items-center gap-2 mt-2 text-blue-600">
                <div className="flex gap-1">
                  <span className="w-2 h-4 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-6 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-3 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '300ms' }}></span>
                  <span className="w-2 h-5 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '450ms' }}></span>
                </div>
                <span className="text-sm font-medium">Speaking...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {(showHelpButton || isSupported) && (
        <div className="flex gap-3 mt-3">
          {/* Replay button */}
          <button
            onClick={handleReplay}
            disabled={isSpeaking}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-lg
              text-lg font-medium transition-all duration-200
              ${isSpeaking
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'}
            `}
          >
            <span>🔊</span>
            <span>{lang === 'hi' ? 'फिर से सुनें' : lang === 'ta' ? 'மீண்டும் கேள்' : 'Listen Again'}</span>
          </button>

          {/* Stop button (when speaking) */}
          {isSpeaking && (
            <button
              onClick={stop}
              className="flex items-center gap-2 px-4 py-3 rounded-lg
                bg-red-100 text-red-700 hover:bg-red-200 
                text-lg font-medium transition-all duration-200 active:scale-95"
            >
              <span>⏹️</span>
              <span>{lang === 'hi' ? 'रोकें' : lang === 'ta' ? 'நிறுத்து' : 'Stop'}</span>
            </button>
          )}

          {/* Need Help button */}
          {showHelpButton && (
            <button
              onClick={handleHelpClick}
              className="flex items-center gap-2 px-4 py-3 rounded-lg
                bg-amber-100 text-amber-700 hover:bg-amber-200 
                text-lg font-medium transition-all duration-200 active:scale-95
                ml-auto"
            >
              <span>❓</span>
              <span>{lang === 'hi' ? 'मदद चाहिए' : lang === 'ta' ? 'உதவி தேவை' : 'I Need Help'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
