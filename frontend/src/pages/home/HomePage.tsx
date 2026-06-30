/**
 * Home — recently played (mock until backend library endpoints exist),
 * quick-access playlists, and an AI-curated "for you" section that gracefully
 * hides if no AI provider is configured.
 */

import { PageHeader } from "@/components/ui/PageHeader";
import { useAiProviders } from "@/lib/hooks";
import { AiForYou } from "./AiForYou";
import { Artwork } from "@/components/ui/Artwork";

// TODO: backend endpoint pending — /api/library/recently-played
const MOCK_RECENT = [
  "Daily Mix 1",
  "Liked Songs",
  "Chill Lofi Beats",
  "Late Night Drive",
  "Focus Flow",
  "Throwback Hits",
];

export function HomePage() {
  const providers = useAiProviders();
  const hasAi =
    providers.data?.providers?.some((p) => p.available) ?? false;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <PageHeader title="Home" subtitle="Pick up where you left off" />

      <section aria-labelledby="quick-access" className="mb-10">
        <h2 id="quick-access" className="mb-3 text-title-lg text-on-surface">
          Quick access
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
          {MOCK_RECENT.map((name) => (
            <button
              key={name}
              type="button"
              className="flex items-center gap-3 overflow-hidden rounded-m3-md bg-surface-container-high pr-3 text-left transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Artwork
                src={null}
                seedKey={name}
                alt={name}
                rounded="rounded-none"
                className="h-16 w-16 shrink-0"
              />
              <span className="truncate text-title-sm text-on-surface">
                {name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* AI "for you" — hidden entirely if no provider configured */}
      {hasAi && <AiForYou />}

      <section aria-labelledby="recently-played">
        <h2 id="recently-played" className="mb-3 text-title-lg text-on-surface">
          Recently played
        </h2>
        {/* TODO: backend endpoint pending — populate from /api/library/* */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {MOCK_RECENT.map((name) => (
            <button
              key={name}
              type="button"
              className="group flex flex-col gap-2 rounded-m3-md p-2 text-left transition-colors hover:bg-on-surface/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Artwork
                src={null}
                seedKey={name}
                alt={name}
                className="aspect-square w-full"
              />
              <span className="truncate text-body-md text-on-surface">{name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
