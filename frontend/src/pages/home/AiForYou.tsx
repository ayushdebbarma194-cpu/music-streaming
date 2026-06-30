/**
 * AI-curated "for you" row. Calls /api/ai/curate with a generic prompt on
 * load. Hidden by the parent when no provider is configured; also handles its
 * own error/loading states defensively.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { uiPrefs } from "@/lib/uiPrefs";
import { useAiProviders } from "@/lib/hooks";
import { Spinner } from "@/components/ui/Spinner";
import { Icon } from "@/components/ui/Icon";
import type { AiProvider } from "@/lib/types";

const CURATE_PROMPT =
  "Suggest a short, varied list of songs for a relaxed evening listening session. Mix genres and eras.";

export function AiForYou() {
  const providers = useAiProviders();

  // Prefer the user's chosen provider if it's available, else first available.
  const preferred = uiPrefs.getAiProvider() as AiProvider;
  const available = providers.data?.providers?.filter((p) => p.available) ?? [];
  const provider: AiProvider | undefined =
    available.find((p) => p.id === preferred)?.id ?? available[0]?.id;

  const curate = useQuery({
    queryKey: ["ai", "curate", "home", provider],
    queryFn: () => api.aiCurate(CURATE_PROMPT, provider as AiProvider),
    enabled: Boolean(provider),
    staleTime: 10 * 60_000,
    retry: false,
  });

  if (!provider) return null;

  return (
    <section aria-labelledby="for-you" className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <Icon name="auto_awesome" className="text-primary" size={22} />
        <h2 id="for-you" className="text-title-lg text-on-surface">
          For you
        </h2>
      </div>

      <div className="rounded-m3-lg bg-surface-container p-5">
        {curate.isLoading && (
          <div className="flex items-center gap-3 text-on-surface-variant">
            <Spinner size={20} />
            <span className="text-body-md">Curating suggestions…</span>
          </div>
        )}
        {curate.isError && (
          <p className="text-body-md text-on-surface-variant">
            Couldn't load AI suggestions right now.
          </p>
        )}
        {curate.data && (
          <p className="whitespace-pre-wrap text-body-md leading-relaxed text-on-surface">
            {curate.data.response}
          </p>
        )}
      </div>
    </section>
  );
}
