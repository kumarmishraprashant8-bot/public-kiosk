from langdetect import detect, LangDetectException
import logging

logger = logging.getLogger(__name__)

def detect_language(text: str) -> str:
    """
    Detect language of the text.
    Returns ISO 639-1 code (e.g., 'en', 'hi', 'ta').
    Defaults to 'en' on error.
    """
    if not text or len(text.strip()) < 3:
        return "en"
    
    try:
        lang = detect(text)
        return lang
    except LangDetectException as e:
        logger.warning(f"Language detection failed: {e}")
        return "en"
    except Exception as e:
        logger.error(f"Unexpected error in language detection: {e}")
        return "en"
