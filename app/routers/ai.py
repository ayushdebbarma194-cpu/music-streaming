"""
Module 6 — AI features
Multi-provider LLM interface for curation and lyrics translation.
Supports: Anthropic Claude, OpenAI, Google Gemini, OpenRouter.
Only enables providers whose API key is present in .env.
"""

from enum import Enum
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter()


class AIProvider(str, Enum):
    claude = "claude"
    openai = "openai"
    gemini = "gemini"
    openrouter = "openrouter"


class CurateRequest(BaseModel):
    prompt: str
    provider: AIProvider


class TranslateLyricsRequest(BaseModel):
    lyrics: str
    target_language: str
    provider: AIProvider


# ─── Endpoints ───────────────────────────────────────────────────

@router.post("/ai/curate")
async def curate(request: CurateRequest):
    """
    AI-powered music curation. Returns suggested tracks/queries.
    System prompt: "You are a music curator helping build a playlist."
    """
    _check_provider_configured(request.provider)

    system_prompt = "You are a music curator helping build a playlist. Based on the user's request, suggest specific tracks with artist names that would fit. Format your suggestions as a numbered list."
    response = await _call_provider(
        provider=request.provider,
        system_prompt=system_prompt,
        user_message=request.prompt,
    )

    return {"provider": request.provider.value, "response": response}


@router.post("/ai/translate-lyrics")
async def translate_lyrics(request: TranslateLyricsRequest):
    """
    AI-powered lyrics translation.
    System prompt: "You are an expert song lyrics translator producing natural, accurate phrasing."
    """
    _check_provider_configured(request.provider)

    system_prompt = (
        "You are an expert song lyrics translator producing natural, accurate phrasing. "
        "Translate the following lyrics while preserving poetic structure, rhythm, and emotional tone. "
        "Maintain line breaks as in the original."
    )
    user_message = f"Translate the following lyrics to {request.target_language}:\n\n{request.lyrics}"

    response = await _call_provider(
        provider=request.provider,
        system_prompt=system_prompt,
        user_message=user_message,
    )

    return {
        "provider": request.provider.value,
        "target_language": request.target_language,
        "translated_lyrics": response,
    }


@router.get("/ai/providers")
async def list_providers():
    """List available AI providers (only those with configured API keys)."""
    providers = []
    if settings.anthropic_configured:
        providers.append({"id": "claude", "name": "Anthropic Claude", "available": True})
    if settings.openai_configured:
        providers.append({"id": "openai", "name": "OpenAI", "available": True})
    if settings.gemini_configured:
        providers.append({"id": "gemini", "name": "Google Gemini", "available": True})
    if settings.openrouter_configured:
        providers.append({"id": "openrouter", "name": "OpenRouter", "available": True})

    if not providers:
        return {
            "providers": [],
            "message": "No AI providers configured. Add API keys to .env file.",
        }

    return {"providers": providers}


# ─── Provider checks ─────────────────────────────────────────────

def _check_provider_configured(provider: AIProvider):
    """Check if the requested provider has its API key configured."""
    config_map = {
        AIProvider.claude: settings.anthropic_configured,
        AIProvider.openai: settings.openai_configured,
        AIProvider.gemini: settings.gemini_configured,
        AIProvider.openrouter: settings.openrouter_configured,
    }
    if not config_map.get(provider, False):
        raise HTTPException(
            status_code=503,
            detail=f"Provider '{provider.value}' is not configured. "
                   f"Add the corresponding API key to your .env file.",
        )


# ─── Provider dispatch ───────────────────────────────────────────

async def _call_provider(provider: AIProvider, system_prompt: str, user_message: str) -> str:
    """Dispatch to the appropriate AI provider."""
    if provider == AIProvider.claude:
        return await _call_claude(system_prompt, user_message)
    elif provider == AIProvider.openai:
        return await _call_openai(system_prompt, user_message)
    elif provider == AIProvider.gemini:
        return await _call_gemini(system_prompt, user_message)
    elif provider == AIProvider.openrouter:
        return await _call_openrouter(system_prompt, user_message)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")


# ─── Anthropic Claude ────────────────────────────────────────────

async def _call_claude(system_prompt: str, user_message: str) -> str:
    """Call Anthropic Claude API."""
    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return message.content[0].text
    except ImportError:
        raise HTTPException(status_code=503, detail="anthropic package not installed")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {str(e)}")


# ─── OpenAI ──────────────────────────────────────────────────────

async def _call_openai(system_prompt: str, user_message: str) -> str:
    """Call OpenAI API."""
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except ImportError:
        raise HTTPException(status_code=503, detail="openai package not installed")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")


# ─── Google Gemini ───────────────────────────────────────────────

async def _call_gemini(system_prompt: str, user_message: str) -> str:
    """Call Google Gemini API."""
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            "gemini-1.5-flash",
            system_instruction=system_prompt,
        )
        response = await model.generate_content_async(user_message)
        return response.text
    except ImportError:
        raise HTTPException(status_code=503, detail="google-generativeai package not installed")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")


# ─── OpenRouter ──────────────────────────────────────────────────

async def _call_openrouter(system_prompt: str, user_message: str) -> str:
    """Call OpenRouter API (OpenAI-compatible)."""
    from app.http_client import get_http_client

    client = get_http_client()

    try:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json={
                "model": "anthropic/claude-sonnet-4-20250514",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                "max_tokens": 1024,
            },
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "ArchiveTune Backend",
            },
        )
        data = resp.json()
        if "choices" in data and data["choices"]:
            return data["choices"][0]["message"]["content"]
        else:
            raise Exception(f"Unexpected response: {data}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenRouter API error: {str(e)}")
