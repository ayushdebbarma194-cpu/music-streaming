/**
 * Settings — seed color picker (live-previews the regenerated Material You
 * scheme while dragging), Light/Dark/Pure Black toggle, AI provider selection,
 * and a backend URL override for non-default ports.
 */

import { PageHeader } from "@/components/ui/PageHeader";
import { SeedColorPicker } from "./SeedColorPicker";
import { ThemeModeToggle } from "./ThemeModeToggle";
import { AiProviderSelect } from "./AiProviderSelect";
import { BackendUrlField } from "./BackendUrlField";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-m3-lg bg-surface-container p-5">
      <h2 className="text-title-md text-on-surface">{title}</h2>
      {description && (
        <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <PageHeader title="Settings" />

      <div className="flex flex-col gap-4">
        <Section
          title="Appearance"
          description="Choose how light or dark the interface looks."
        >
          <ThemeModeToggle />
        </Section>

        <Section
          title="Accent color"
          description="The whole interface is generated from this seed color, just like the source app. Drag to preview live."
        >
          <SeedColorPicker />
        </Section>

        <Section
          title="AI provider"
          description="Used for curation and lyric translation. Only providers configured on the backend are selectable."
        >
          <AiProviderSelect />
        </Section>

        <Section
          title="Backend"
          description="Point the app at your backend if it runs on a non-default host or port."
        >
          <BackendUrlField />
        </Section>
      </div>
    </div>
  );
}
