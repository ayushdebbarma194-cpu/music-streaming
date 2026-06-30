"""
Module 7 — Translation
Uses the googletrans package or Google Cloud Translation API for text translation.
Bundles a static language list for frontend language picker.
"""

import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.http_client import get_http_client

router = APIRouter()

# Path to bundled language list
LANGUAGES_FILE = Path(__file__).parent.parent.parent / "assets" / "translator_languages.json"


@router.get("/translate")
async def translate_text(
    text: str = Query(..., description="Text to translate"),
    target: str = Query(..., description="Target language code (e.g., 'es', 'ja', 'fr')"),
    source: str = Query("auto", description="Source language code (default: auto-detect)"),
):
    """
    Translate text to target language.
    Uses Google Cloud Translation API if GCP key is configured,
    otherwise falls back to googletrans.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if settings.gcp_translation_api_key:
        return await _translate_gcp(text, target, source)
    else:
        return await _translate_googletrans(text, target, source)


@router.get("/translate/languages")
async def get_languages():
    """Get the list of supported languages for the frontend language picker."""
    if LANGUAGES_FILE.exists():
        with open(LANGUAGES_FILE, "r", encoding="utf-8") as f:
            languages = json.load(f)
        return {"languages": languages, "count": len(languages)}
    else:
        # Return a built-in subset if the file doesn't exist
        return {"languages": _get_builtin_languages(), "count": len(_get_builtin_languages())}


# ─── Google Cloud Translation ────────────────────────────────────

async def _translate_gcp(text: str, target: str, source: str) -> dict:
    """Translate using the documented Google Cloud Translation API."""
    client = get_http_client()

    url = "https://translation.googleapis.com/language/translate/v2"
    params = {
        "key": settings.gcp_translation_api_key,
        "q": text,
        "target": target,
        "format": "text",
    }
    if source and source != "auto":
        params["source"] = source

    try:
        resp = await client.post(url, data=params)
        data = resp.json()

        if "error" in data:
            raise HTTPException(
                status_code=502,
                detail=f"GCP Translation error: {data['error'].get('message', 'Unknown')}",
            )

        translations = data.get("data", {}).get("translations", [])
        if not translations:
            raise HTTPException(status_code=502, detail="No translation returned")

        result = translations[0]
        return {
            "translated_text": result.get("translatedText", ""),
            "detected_source_language": result.get("detectedSourceLanguage", source),
            "target_language": target,
            "provider": "gcp",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"GCP Translation failed: {str(e)}")


# ─── deep-translator fallback ────────────────────────────────────

async def _translate_googletrans(text: str, target: str, source: str) -> dict:
    """Translate using the deep-translator package (Google Translate, free)."""
    try:
        from deep_translator import GoogleTranslator

        src_lang = source if source and source != "auto" else "auto"
        translator = GoogleTranslator(source=src_lang, target=target)
        translated = translator.translate(text)

        return {
            "translated_text": translated,
            "detected_source_language": source if source != "auto" else "auto",
            "target_language": target,
            "provider": "google_translate",
        }
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="deep-translator package not installed and no GCP key configured. "
                   "Install with: pip install deep-translator",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Translation failed: {str(e)}")


# ─── Built-in language subset ────────────────────────────────────

def _get_builtin_languages() -> List[dict]:
    """Return a subset of commonly used languages as fallback."""
    return [
        {"name": "English", "code": "en"},
        {"name": "Spanish", "code": "es"},
        {"name": "French", "code": "fr"},
        {"name": "German", "code": "de"},
        {"name": "Italian", "code": "it"},
        {"name": "Portuguese", "code": "pt"},
        {"name": "Russian", "code": "ru"},
        {"name": "Japanese", "code": "ja"},
        {"name": "Korean", "code": "ko"},
        {"name": "Chinese (Simplified)", "code": "zh-cn"},
        {"name": "Chinese (Traditional)", "code": "zh-tw"},
        {"name": "Arabic", "code": "ar"},
        {"name": "Hindi", "code": "hi"},
        {"name": "Bengali", "code": "bn"},
        {"name": "Turkish", "code": "tr"},
        {"name": "Vietnamese", "code": "vi"},
        {"name": "Thai", "code": "th"},
        {"name": "Indonesian", "code": "id"},
        {"name": "Dutch", "code": "nl"},
        {"name": "Polish", "code": "pl"},
        {"name": "Swedish", "code": "sv"},
        {"name": "Norwegian", "code": "no"},
        {"name": "Danish", "code": "da"},
        {"name": "Finnish", "code": "fi"},
        {"name": "Greek", "code": "el"},
        {"name": "Czech", "code": "cs"},
        {"name": "Romanian", "code": "ro"},
        {"name": "Hungarian", "code": "hu"},
        {"name": "Hebrew", "code": "he"},
        {"name": "Ukrainian", "code": "uk"},
    ]
