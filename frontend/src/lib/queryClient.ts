import { QueryClient } from "@tanstack/react-query";

/**
 * Single React Query client for all server state. The backend is the source
 * of truth; we lean on Query for caching/refetch and never duplicate
 * backend-owned state into a separate client store.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
