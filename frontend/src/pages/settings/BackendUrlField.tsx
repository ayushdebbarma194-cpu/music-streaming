/**
 * Backend URL override. Persists a custom base URL (e.g. non-default port) and
 * lets the user test reachability against /health. Since the API client reads
 * the URL from uiPrefs at call time, changes take effect immediately.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uiPrefs } from "@/lib/uiPrefs";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";

const DEFAULT_URL = "http://localhost:8000";

type TestState = "idle" | "testing" | "ok" | "fail";

export function BackendUrlField() {
  const [url, setUrl] = useState(() => uiPrefs.getBackendUrl());
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>("idle");
  const qc = useQueryClient();

  const save = () => {
    const cleaned = url.trim().replace(/\/+$/, "");
    uiPrefs.setBackendUrl(cleaned || DEFAULT_URL);
    setUrl(cleaned || DEFAULT_URL);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    // Invalidate everything so queries refetch against the new backend.
    void qc.invalidateQueries();
  };

  const testConnection = async () => {
    setTest("testing");
    try {
      const res = await fetch(`${url.trim().replace(/\/+$/, "")}/health`);
      setTest(res.ok ? "ok" : "fail");
    } catch {
      setTest("fail");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setTest("idle");
          }}
          placeholder={DEFAULT_URL}
          aria-label="Backend URL"
          className="flex-1 rounded-m3-md bg-surface-container-high px-4 py-3 font-mono text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button
          type="button"
          onClick={save}
          className="rounded-m3-md bg-primary px-5 py-3 text-label-lg text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void testConnection()}
          className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-label-lg text-on-surface transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {test === "testing" ? <Spinner size={16} /> : <Icon name="wifi_tethering" size={18} />}
          Test connection
        </button>
        {test === "ok" && (
          <span className="inline-flex items-center gap-1 text-label-md text-primary">
            <Icon name="check_circle" size={18} filled /> Connected
          </span>
        )}
        {test === "fail" && (
          <span className="inline-flex items-center gap-1 text-label-md text-error">
            <Icon name="error" size={18} filled /> Unreachable
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setUrl(DEFAULT_URL);
            uiPrefs.setBackendUrl(DEFAULT_URL);
            setTest("idle");
          }}
          className="ml-auto text-label-md text-primary hover:underline"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
