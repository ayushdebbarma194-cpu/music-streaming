/**
 * AI provider selection. Lists the four providers; those not configured on the
 * backend are shown disabled. The chosen provider is stored as a UI pref and
 * used by curation and lyric translation.
 */

import { useState } from "react";
import { useAiProviders } from "@/lib/hooks";
import { uiPrefs } from "@/lib/uiPrefs";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import type { AiProvider } from "@/lib/types";

const ALL_PROVIDERS: { id: AiProvider; name: string }[] = [
  { id: "claude", name: "Anthropic Claude" },
  { id: "openai", name: "OpenAI" },
  { id: "gemini", name: "Google Gemini" },
  { id: "openrouter", name: "OpenRouter" },
];

export function AiProviderSelect() {
  const providers = useAiProviders();
  const [selected, setSelected] = useState<AiProvider>(
    () => uiPrefs.getAiProvider() as AiProvider,
  );

  const availableIds = new Set(
    (providers.data?.providers ?? [])
      .filter((p) => p.available)
      .map((p) => p.id),
  );

  const choose = (id: AiProvider) => {
    setSelected(id);
    uiPrefs.setAiProvider(id);
  };

  if (providers.isLoading) {
    return (
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Spinner size={18} />
        <span className="text-body-md">Checking configured providers…</span>
      </div>
    );
  }

  const noneAvailable = availableIds.size === 0;

  return (
    <div className="flex flex-col gap-2">
      {noneAvailable && (
        <div className="mb-1 flex items-start gap-2 rounded-m3-md bg-surface-container-high p-3 text-body-sm text-on-surface-variant">
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          <span>
            No AI providers are configured on the backend. Add an API key to the
            backend's <code>.env</code> to enable curation and translation.
          </span>
        </div>
      )}
      {ALL_PROVIDERS.map((p) => {
        const available = availableIds.has(p.id);
        const isSelected = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            disabled={!available}
            onClick={() => choose(p.id)}
            className={`flex items-center justify-between rounded-m3-md border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${
              isSelected && available
                ? "border-primary bg-primary-container text-on-primary-container"
                : "border-outline-variant text-on-surface hover:bg-on-surface/8 disabled:hover:bg-transparent"
            }`}
          >
            <span className="text-body-lg">{p.name}</span>
            {available ? (
              isSelected ? (
                <Icon name="radio_button_checked" className="text-primary" />
              ) : (
                <Icon name="radio_button_unchecked" className="text-on-surface-variant" />
              )
            ) : (
              <span className="text-label-md text-on-surface-variant">
                Not configured
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
