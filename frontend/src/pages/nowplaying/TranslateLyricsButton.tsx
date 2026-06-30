/**
 * "Translate lyrics" control wired to /api/ai/translate-lyrics. Lets the user
 * pick a target language; returns translated lines shown beneath originals.
 * Disabled when no AI provider is configured.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { uiPrefs } from "@/lib/uiPrefs";
import { useAiProviders } from "@/lib/hooks";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import type { AiProvider, LyricLine } from "@/lib/types";

const LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh-cn", name: "Chinese" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
  { code: "en", name: "English" },
];

interface Props {
  lines: LyricLine[];
  onTranslated: (lines: string[] | null) => void;
}

export function TranslateLyricsButton({ lines, onTranslated }: Props) {
  const [open, setOpen] = useState(false);
  const providers = useAiProviders();
  const available = providers.data?.providers?.filter((p) => p.available) ?? [];
  const preferred = uiPrefs.getAiProvider() as AiProvider;
  const provider: AiProvider | undefined =
    available.find((p) => p.id === preferred)?.id ?? available[0]?.id;

  const translate = useMutation({
    mutationFn: async (target: string) => {
      const joined = lines.map((l) => l.text).join("\n");
      const res = await api.aiTranslateLyrics(joined, target, provider as AiProvider);
      return res.translated_lyrics.split("\n");
    },
    onSuccess: (translatedLines) => {
      onTranslated(translatedLines);
      setOpen(false);
    },
  });

  if (!provider) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-label-lg text-on-surface transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {translate.isPending ? (
          <Spinner size={18} />
        ) : (
          <Icon name="translate" size={18} className="text-primary" />
        )}
        Translate
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-10 mb-2 w-44 overflow-hidden rounded-m3-md bg-surface-container-highest py-1 shadow-lg"
        >
          {translate.isError && (
            <p className="px-4 py-2 text-body-sm text-error">Translation failed.</p>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => onTranslated(null)}
            className="block w-full px-4 py-2 text-left text-body-md text-on-surface-variant hover:bg-on-surface/8"
          >
            Show original only
          </button>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="menuitem"
              onClick={() => translate.mutate(lang.code)}
              className="block w-full px-4 py-2 text-left text-body-md text-on-surface hover:bg-on-surface/8"
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
