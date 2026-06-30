/**
 * App shell: left sidebar + scrollable main content + persistent mini-player.
 * The Now Playing full view is a routed overlay above this layout.
 */

import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { MiniPlayer } from "./components/MiniPlayer";
import { HomePage } from "./pages/home/HomePage";
import { SearchPage } from "./pages/search/SearchPage";
import { LibraryPage } from "./pages/library/LibraryPage";
import { DownloadsPage } from "./pages/downloads/DownloadsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { NowPlayingPage } from "./pages/nowplaying/NowPlayingPage";
import { useDownloadsSocket } from "./lib/useDownloadsSocket";

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  // Keep the downloads socket alive app-wide so progress updates even when
  // the Downloads page isn't mounted.
  useDownloadsSocket();

  const isNowPlaying = location.pathname === "/now-playing";

  return (
    <div className="flex h-full w-full flex-col bg-background text-on-background">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Now Playing renders as overlay below; route kept for deep-link */}
            <Route path="/now-playing" element={<HomePage />} />
          </Routes>
        </main>
      </div>

      <MiniPlayer />

      {isNowPlaying && <NowPlayingPage onClose={() => navigate(-1)} />}
    </div>
  );
}
