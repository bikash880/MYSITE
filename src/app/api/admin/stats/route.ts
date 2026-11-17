import { adminRoute, json } from "@/lib/server/http";
import { dashboardStats } from "@/lib/server/repo";

export const GET = adminRoute(async () => json(await dashboardStats()));
