import "server-only";
import { cache } from "react";
import { DEFAULT_MAINTENANCE, DEFAULT_PROFILE, DEFAULT_SETTINGS } from "./defaults";
import { isDbConfigured } from "./server/db";
import * as repo from "./server/repo";

export { DEFAULT_PROFILE, DEFAULT_SETTINGS };

/** Runs a query and never throws — public pages degrade to empty states instead of 500s. */
async function safe<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  if (!isDbConfigured) return fallback;
  try {
    return await run();
  } catch (err) {
    console.error("[data]", err);
    return fallback;
  }
}

export const getProfile = cache(() => safe(DEFAULT_PROFILE, repo.fetchProfile));
export const getSettings = cache(() => safe(DEFAULT_SETTINGS, repo.fetchSettings));
export const getMaintenance = cache(() => safe(DEFAULT_MAINTENANCE, repo.fetchMaintenance));
export const getSkills = cache(() => safe([], repo.fetchSkills));
export const getExperiences = cache(() => safe([], repo.fetchExperiences));
export const getEducation = cache(() => safe([], repo.fetchEducation));
export const getProjects = cache(() => safe([], repo.fetchProjects));
export const getProject = cache((slug: string) => safe(null, () => repo.fetchProject(slug)));
export const getCertificates = cache(() => safe([], repo.fetchCertificates));
