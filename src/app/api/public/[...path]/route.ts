import { errorJson, json, publicRoute } from "@/lib/server/http";
import * as repo from "@/lib/server/repo";

/**
 * Read-only public content for the mobile app (published items only).
 *   /api/public/profile | settings | skills | experiences | education
 *   /api/public/projects[/:slug] | certificates
 *   /api/public/status   → { maintenance, message, starts_at, eta } (always available)
 */
const LISTS: Record<string, () => Promise<unknown>> = {
  profile: repo.fetchProfile,
  settings: repo.fetchSettings,
  skills: repo.fetchSkills,
  experiences: repo.fetchExperiences,
  education: repo.fetchEducation,
  projects: repo.fetchProjects,
  certificates: repo.fetchCertificates,
};

const CACHE = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

export const GET = publicRoute<{ params: Promise<{ path: string[] }> }>(async (_req, { params }) => {
  const [name, slug, ...rest] = (await params).path;
  if (!name || rest.length) return errorJson("Not found", 404);

  // Always available: lets the maintenance page (and the mobile app) know when the site is back.
  const maintenance = await repo.fetchMaintenance();
  if (name === "status" && !slug) {
    return json({ maintenance: maintenance.enabled, message: maintenance.message, starts_at: maintenance.starts_at, eta: maintenance.eta });
  }
  if (maintenance.enabled) {
    return json(
      { error: "The site is temporarily down for maintenance.", maintenance: true, message: maintenance.message, starts_at: maintenance.starts_at, eta: maintenance.eta },
      503,
      { "Retry-After": "300" },
    );
  }

  if (slug) {
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return errorJson("Not found", 404);
    const item = name === "projects" ? await repo.fetchProject(slug) : undefined;
    if (item === undefined) return errorJson("Not found", 404);
    return item ? json(item, 200, CACHE) : errorJson("Not found", 404);
  }

  const fetcher = LISTS[name];
  return fetcher ? json(await fetcher(), 200, CACHE) : errorJson("Not found", 404);
});
