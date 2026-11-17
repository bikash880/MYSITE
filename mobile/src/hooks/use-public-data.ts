import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api, ApiError, isApiConfigured } from "@/lib/api";
import { qk } from "@/lib/query";
import type { Certificate, Education, Experience, Profile, Project, Settings, Skill } from "@/lib/types";

/** GET /api/public/<path> (published content only). Returns the fallback when the API isn't configured. */
async function get<T>(path: string, fallback: T): Promise<T> {
  if (!isApiConfigured) return fallback;
  return api<T>(`/api/public/${path}`);
}

/** Like get(), but a 404 means "doesn't exist" (null) rather than an error. */
async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await get<T | null>(path, null);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export const DEFAULT_PROFILE: Profile = {
  id: 1,
  full_name: "Your Name",
  title: "Full-Stack Developer",
  short_intro: "I build fast, accessible and beautiful experiences.",
  bio: null,
  photo_url: null,
  cv_url: null,
  email: null,
  phone: null,
  location: null,
  years_experience: 0,
  available: true,
  github_url: null,
  linkedin_url: null,
  twitter_url: null,
  instagram_url: null,
  website_url: null,
};

export const useProfile = () =>
  useQuery({
    queryKey: qk.public("profile"),
    queryFn: () => get<Profile>("profile", DEFAULT_PROFILE),
    placeholderData: DEFAULT_PROFILE,
  });

export const useSettings = () =>
  useQuery({ queryKey: qk.public("settings"), queryFn: () => get<Settings | null>("settings", null) });

export const useSkills = () => useQuery({ queryKey: qk.public("skills"), queryFn: () => get<Skill[]>("skills", []) });

export const useExperiences = () =>
  useQuery({ queryKey: qk.public("experiences"), queryFn: () => get<Experience[]>("experiences", []) });

export const useEducation = () =>
  useQuery({ queryKey: qk.public("education"), queryFn: () => get<Education[]>("education", []) });

export const useProjects = () =>
  useQuery({ queryKey: qk.public("projects"), queryFn: () => get<Project[]>("projects", []) });

export function useProject(slug: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.public("project", slug),
    queryFn: () => getOrNull<Project>(`projects/${encodeURIComponent(slug)}`),
    // Show the list's copy instantly (and offline) while the detail loads.
    initialData: () => qc.getQueryData<Project[]>(qk.public("projects"))?.find((p) => p.slug === slug),
  });
}

export const useCertificates = () =>
  useQuery({ queryKey: qk.public("certificates"), queryFn: () => get<Certificate[]>("certificates", []) });

/** Pull-to-refresh helper: refetches the given queries and exposes a spinner flag. */
export function useRefresh(...refetchers: (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(refetchers.map((r) => r()));
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refetchers);
  return { refreshing, onRefresh };
}
