import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const DAY = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Serve cached data instantly, refetch in the background, keep it for a week offline.
      staleTime: 60 * 1000,
      gcTime: 7 * DAY,
      networkMode: "offlineFirst",
      retry: 2,
    },
    mutations: {
      // Fail fast instead of silently queueing writes while offline.
      networkMode: "always",
    },
  },
});

/** Persists the query cache to disk so the app opens with content when offline. */
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "portfolio-query-cache",
  throttleTime: 1000,
});

export const PERSIST_MAX_AGE = 7 * DAY;

// Tell React Query about connectivity and app focus (React Native has no window events).
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
);

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (status) => focusManager.setFocused(status === "active"));
}

export const qk = {
  public: (name: string, ...args: unknown[]) => ["public", name, ...args] as const,
  admin: (name: string, ...args: unknown[]) => ["admin", name, ...args] as const,
};
