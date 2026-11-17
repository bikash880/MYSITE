import { z } from "zod";
import type { IoniconName } from "./icons";
import { bool, int, optDate, optEmail, optText, optUrl, reqDate, reqText, slug, tags } from "./validations";

/*
 * Admin resource registry — mirrors the website's src/lib/admin/resources.ts so
 * both apps validate data identically. Add a field here and the list, form and
 * validation pick it up automatically.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "url"
  | "email"
  | "date"
  | "switch"
  | "select"
  | "tags"
  | "image"
  | "file"
  | "richtext"
  | "color";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  folder?: string;
}

export type BadgeFormat = "status" | "badge" | "stars" | "percent" | "bool";

export interface ResourceConfig {
  key: string;
  table: string;
  singular: string;
  plural: string;
  description: string;
  icon: IoniconName;
  fields: FieldConfig[];
  schema: z.ZodTypeAny;
  titleField: string;
  subtitleField?: string;
  imageField?: string;
  badges: { name: string; format: BadgeFormat; label?: string }[];
  orderBy: { column: string; ascending: boolean }[];
  slugFrom?: string;
  defaults: Record<string, unknown>;
}

const sort = { name: "sort_order", label: "Sort order", type: "number", help: "Lower numbers appear first" } as const;

const skills: ResourceConfig = {
  key: "skills",
  table: "skills",
  singular: "Skill",
  plural: "Skills",
  description: "Technologies and tools shown on About.",
  icon: "sparkles",
  titleField: "name",
  subtitleField: "category",
  fields: [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "React" },
    { name: "category", label: "Category", type: "text", required: true, placeholder: "Frontend" },
    { name: "level", label: "Proficiency (0–100)", type: "number" },
    { name: "icon", label: "Icon", type: "text", placeholder: "⚛️", help: "An emoji (optional)" },
    sort,
  ],
  schema: z.object({
    name: reqText("Name", 60),
    category: reqText("Category", 60),
    level: int(0, 100, "Level"),
    icon: optText(10),
    sort_order: int(0, 9999, "Sort order").default(0),
  }),
  badges: [{ name: "level", format: "percent" }],
  orderBy: [{ column: "sort_order", ascending: true }],
  defaults: { name: "", category: "", level: 80, icon: "", sort_order: 0 },
};

const timelineFields = (kind: "work" | "edu"): FieldConfig[] => [
  kind === "work"
    ? { name: "role", label: "Role", type: "text", required: true }
    : { name: "degree", label: "Degree", type: "text", required: true },
  kind === "work"
    ? { name: "company", label: "Company", type: "text", required: true }
    : { name: "institution", label: "Institution", type: "text", required: true },
  { name: "location", label: "Location", type: "text" },
  { name: "start_date", label: "Start date", type: "date", required: true },
  { name: "end_date", label: "End date", type: "date", help: "Leave empty if current" },
  { name: "is_current", label: kind === "work" ? "I currently work here" : "Currently studying", type: "switch" },
  { name: "description", label: "Description", type: "textarea" },
  sort,
];

const experiences: ResourceConfig = {
  key: "experiences",
  table: "experiences",
  singular: "Experience",
  plural: "Experience",
  description: "Your work history timeline.",
  icon: "briefcase",
  titleField: "role",
  subtitleField: "company",
  fields: timelineFields("work"),
  schema: z.object({
    role: reqText("Role", 120),
    company: reqText("Company", 120),
    location: optText(120),
    start_date: reqDate("Start date"),
    end_date: optDate(),
    is_current: bool(),
    description: optText(3000),
    sort_order: int(0, 9999, "Sort order").default(0),
  }),
  badges: [{ name: "is_current", format: "bool", label: "Current" }],
  orderBy: [
    { column: "sort_order", ascending: true },
    { column: "start_date", ascending: false },
  ],
  defaults: { role: "", company: "", location: "", start_date: "", end_date: "", is_current: false, description: "", sort_order: 0 },
};

const education: ResourceConfig = {
  key: "education",
  table: "education",
  singular: "Education",
  plural: "Education",
  description: "Degrees, certifications and courses.",
  icon: "school",
  titleField: "degree",
  subtitleField: "institution",
  fields: timelineFields("edu"),
  schema: z.object({
    degree: reqText("Degree", 160),
    institution: reqText("Institution", 160),
    location: optText(120),
    start_date: reqDate("Start date"),
    end_date: optDate(),
    is_current: bool(),
    description: optText(3000),
    sort_order: int(0, 9999, "Sort order").default(0),
  }),
  badges: [{ name: "is_current", format: "bool", label: "Current" }],
  orderBy: [
    { column: "sort_order", ascending: true },
    { column: "start_date", ascending: false },
  ],
  defaults: { degree: "", institution: "", location: "", start_date: "", end_date: "", is_current: false, description: "", sort_order: 0 },
};

const projects: ResourceConfig = {
  key: "projects",
  table: "projects",
  singular: "Project",
  plural: "Projects",
  description: "Portfolio work.",
  icon: "folder-open",
  titleField: "title",
  subtitleField: "summary",
  imageField: "image_url",
  slugFrom: "title",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", placeholder: "auto-generated from title" },
    { name: "summary", label: "Short description", type: "textarea", required: true },
    { name: "image_url", label: "Cover image", type: "image", folder: "projects" },
    { name: "category", label: "Category", type: "text", required: true, placeholder: "Web, Mobile, Design…" },
    { name: "tech", label: "Tech stack", type: "tags", placeholder: "Add a technology" },
    { name: "live_url", label: "Live URL", type: "url", placeholder: "https://" },
    { name: "github_url", label: "GitHub URL", type: "url", placeholder: "https://github.com/…" },
    { name: "content", label: "Details", type: "richtext", folder: "projects" },
    { name: "featured", label: "Featured on home", type: "switch" },
    { name: "published", label: "Published", type: "switch" },
    sort,
  ],
  schema: z.object({
    title: reqText("Title", 120),
    slug: slug(),
    summary: reqText("Short description", 400),
    content: optText(100_000),
    image_url: optUrl(),
    category: reqText("Category", 60),
    tech: tags(),
    live_url: optUrl(),
    github_url: optUrl(),
    featured: bool(),
    published: bool(),
    sort_order: int(0, 9999, "Sort order").default(0),
  }),
  badges: [
    { name: "published", format: "status" },
    { name: "category", format: "badge" },
  ],
  orderBy: [
    { column: "sort_order", ascending: true },
    { column: "created_at", ascending: false },
  ],
  defaults: {
    title: "", slug: "", summary: "", content: "", image_url: "", category: "", tech: [],
    live_url: "", github_url: "", featured: false, published: true, sort_order: 0,
  },
};

const certificates: ResourceConfig = {
  key: "certificates",
  table: "certificates",
  singular: "Certificate",
  plural: "Certificates",
  description: "Certifications and courses shown on Certificates and Resume.",
  icon: "ribbon",
  titleField: "title",
  subtitleField: "issuer",
  imageField: "image_url",
  fields: [
    { name: "title", label: "Certificate title", type: "text", required: true },
    { name: "issuer", label: "Issuing organisation", type: "text", required: true },
    { name: "issue_date", label: "Issue date", type: "date", required: true },
    { name: "expiry_date", label: "Expiry date", type: "date", help: "Leave empty if it doesn't expire" },
    { name: "credential_id", label: "Credential ID", type: "text" },
    { name: "credential_url", label: "Verification URL", type: "url", placeholder: "https://" },
    { name: "image_url", label: "Certificate image", type: "image", folder: "certificates" },
    { name: "skills", label: "Skills covered", type: "tags" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "featured", label: "Featured on home", type: "switch" },
    { name: "published", label: "Published", type: "switch" },
    sort,
  ],
  schema: z.object({
    title: reqText("Title", 160),
    issuer: reqText("Issuer", 120),
    issue_date: reqDate("Issue date"),
    expiry_date: optDate(),
    credential_id: optText(120),
    credential_url: optUrl(),
    image_url: optUrl(),
    skills: tags(),
    description: optText(1500),
    featured: bool(),
    published: bool(),
    sort_order: int(0, 9999, "Sort order").default(0),
  }),
  badges: [{ name: "published", format: "status" }],
  orderBy: [
    { column: "sort_order", ascending: true },
    { column: "issue_date", ascending: false },
  ],
  defaults: {
    title: "", issuer: "", issue_date: "", expiry_date: "", credential_id: "", credential_url: "",
    image_url: "", skills: [], description: "", featured: false, published: true, sort_order: 0,
  },
};

export const RESOURCES = { projects, certificates, skills, experiences, education } satisfies Record<
  string,
  ResourceConfig
>;

export type ResourceKey = keyof typeof RESOURCES;

export function isResourceKey(key: string): key is ResourceKey {
  return Object.prototype.hasOwnProperty.call(RESOURCES, key);
}

/* Singletons (one row, id = 1) */

export const profileForm = {
  fields: [
    { name: "full_name", label: "Full name", type: "text", required: true },
    { name: "title", label: "Title / role", type: "text", required: true },
    { name: "short_intro", label: "Short intro", type: "textarea", help: "Shown in the hero section" },
    { name: "bio", label: "Bio", type: "textarea", help: "Blank lines start new paragraphs" },
    { name: "photo_url", label: "Photo", type: "image", folder: "profile" },
    { name: "cv_url", label: "CV / Résumé (PDF)", type: "file", folder: "cv" },
    { name: "email", label: "Public email", type: "email" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "location", label: "Location", type: "text" },
    { name: "years_experience", label: "Years of experience", type: "number" },
    { name: "available", label: "Available for work", type: "switch" },
    { name: "github_url", label: "GitHub", type: "url" },
    { name: "linkedin_url", label: "LinkedIn", type: "url" },
    { name: "twitter_url", label: "X / Twitter", type: "url" },
    { name: "instagram_url", label: "Instagram", type: "url" },
    { name: "website_url", label: "Website", type: "url" },
  ] satisfies FieldConfig[],
  schema: z.object({
    full_name: reqText("Full name", 100),
    title: reqText("Title", 100),
    short_intro: optText(400),
    bio: optText(5000),
    photo_url: optUrl(),
    cv_url: optUrl(),
    email: optEmail(),
    phone: optText(40),
    location: optText(100),
    years_experience: int(0, 80, "Years of experience"),
    available: bool(),
    github_url: optUrl(),
    linkedin_url: optUrl(),
    twitter_url: optUrl(),
    instagram_url: optUrl(),
    website_url: optUrl(),
  }),
};

export const settingsForm = {
  fields: [
    { name: "site_title", label: "Site title", type: "text", required: true },
    { name: "seo_description", label: "SEO description", type: "textarea", required: true, help: "Ideally 120–160 characters" },
    { name: "seo_keywords", label: "SEO keywords", type: "text", help: "Comma separated" },
    { name: "theme_color", label: "Theme / accent colour", type: "color" },
    { name: "og_image_url", label: "Default social share image", type: "image", folder: "seo" },
  ] satisfies FieldConfig[],
  schema: z.object({
    site_title: reqText("Site title", 80),
    seo_description: reqText("SEO description", 300),
    seo_keywords: optText(300),
    theme_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #6C63FF"),
    og_image_url: optUrl(),
  }),
};

export type SingletonKind = "profile" | "settings";
export const SINGLETONS = { profile: profileForm, settings: settingsForm };

/** Converts DB nulls into controlled-input friendly values. */
export function toFormValues(fields: FieldConfig[], row: Record<string, unknown> | null | undefined, defaults: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row?.[f.name] ?? defaults[f.name];
    if (f.type === "switch") out[f.name] = Boolean(v);
    else if (f.type === "tags") out[f.name] = Array.isArray(v) ? v : [];
    else out[f.name] = v == null ? "" : String(v);
  }
  return out;
}
