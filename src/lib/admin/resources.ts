import { z } from "zod";
import {
  bool,
  int,
  optDate,
  optEmail,
  optText,
  optUrl,
  reqDate,
  reqText,
  slug,
  tags,
} from "@/lib/validations";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "range"
  | "url"
  | "email"
  | "date"
  | "switch"
  | "select"
  | "tags"
  | "image"
  | "file"
  | "richtext"
  | "color"
  | "location";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  required?: boolean;
  /** Spans both columns of the form grid. */
  full?: boolean;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  accept?: string;
  /** Storage folder for uploads. */
  folder?: string;
  /** Optional group heading rendered before the first field of each section. */
  section?: string;
}

export type ColumnFormat = "text" | "date" | "bool" | "badge" | "tags" | "stars" | "progress" | "status";

export interface ColumnConfig {
  name: string;
  label: string;
  format?: ColumnFormat;
  /** Hidden on small screens in the table view. */
  hideOnMobile?: boolean;
}

export interface ResourceConfig {
  key: string;
  table: string;
  singular: string;
  plural: string;
  description: string;
  fields: FieldConfig[];
  schema: z.ZodTypeAny;
  /** Field used as the card / row title. */
  titleField: string;
  subtitleField?: string;
  imageField?: string;
  columns: ColumnConfig[];
  orderBy: { column: string; ascending: boolean }[];
  /** If set, an empty `slug` is generated from this field. */
  slugFrom?: string;
  /** Default values for a new record. */
  defaults: Record<string, unknown>;
  /** Public path(s) to revalidate when this resource changes. */
  revalidate: string[];
}

/* ------------------------------------------------------------------ */
/*  Collections                                                        */
/* ------------------------------------------------------------------ */

const skills: ResourceConfig = {
  key: "skills",
  table: "skills",
  singular: "Skill",
  plural: "Skills",
  description: "Technologies and tools shown on the About page.",
  titleField: "name",
  subtitleField: "category",
  fields: [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "React" },
    { name: "category", label: "Category", type: "text", required: true, placeholder: "Frontend" },
    { name: "level", label: "Proficiency", type: "range", min: 0, max: 100, help: "0–100%" },
    { name: "icon", label: "Icon", type: "text", placeholder: "⚛️", help: "An emoji or short text (optional)" },
    { name: "sort_order", label: "Sort order", type: "number", help: "Lower numbers appear first" },
  ],
  schema: z.object({
    name: reqText("Name", 60),
    category: reqText("Category", 60),
    level: int(0, 100, "Level"),
    icon: optText(10),
    sort_order: int(0, 9999, "Sort order").default(0),
  }),
  columns: [
    { name: "category", label: "Category", format: "badge" },
    { name: "level", label: "Level", format: "progress" },
  ],
  orderBy: [{ column: "sort_order", ascending: true }],
  defaults: { name: "", category: "", level: 80, icon: "", sort_order: 0 },
  revalidate: ["/about", "/resume"],
};

const experiences: ResourceConfig = {
  key: "experiences",
  table: "experiences",
  singular: "Experience",
  plural: "Experience",
  description: "Your work history timeline.",
  titleField: "role",
  subtitleField: "company",
  fields: [
    { name: "role", label: "Role", type: "text", required: true, placeholder: "Senior Developer" },
    { name: "company", label: "Company", type: "text", required: true },
    { name: "location", label: "Location", type: "text", placeholder: "Remote" },
    { name: "sort_order", label: "Sort order", type: "number" },
    { name: "start_date", label: "Start date", type: "date", required: true },
    { name: "end_date", label: "End date", type: "date", help: "Leave empty if current" },
    { name: "is_current", label: "I currently work here", type: "switch", full: true },
    { name: "description", label: "Description", type: "textarea", full: true },
  ],
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
  columns: [
    { name: "start_date", label: "Start", format: "date", hideOnMobile: true },
    { name: "is_current", label: "Current", format: "bool" },
  ],
  orderBy: [
    { column: "sort_order", ascending: true },
    { column: "start_date", ascending: false },
  ],
  defaults: {
    role: "",
    company: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
    sort_order: 0,
  },
  revalidate: ["/about", "/resume"],
};

const education: ResourceConfig = {
  key: "education",
  table: "education",
  singular: "Education",
  plural: "Education",
  description: "Degrees, certifications and courses.",
  titleField: "degree",
  subtitleField: "institution",
  fields: [
    { name: "degree", label: "Degree", type: "text", required: true, placeholder: "B.Tech Computer Science" },
    { name: "institution", label: "Institution", type: "text", required: true },
    { name: "location", label: "Location", type: "text" },
    { name: "sort_order", label: "Sort order", type: "number" },
    { name: "start_date", label: "Start date", type: "date", required: true },
    { name: "end_date", label: "End date", type: "date" },
    { name: "is_current", label: "Currently studying", type: "switch", full: true },
    { name: "description", label: "Description", type: "textarea", full: true },
  ],
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
  columns: [
    { name: "start_date", label: "Start", format: "date", hideOnMobile: true },
    { name: "is_current", label: "Current", format: "bool" },
  ],
  orderBy: [
    { column: "sort_order", ascending: true },
    { column: "start_date", ascending: false },
  ],
  defaults: {
    degree: "",
    institution: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
    sort_order: 0,
  },
  revalidate: ["/about", "/resume"],
};

const projects: ResourceConfig = {
  key: "projects",
  table: "projects",
  singular: "Project",
  plural: "Projects",
  description: "Portfolio work shown on the Projects page.",
  titleField: "title",
  subtitleField: "summary",
  imageField: "image_url",
  slugFrom: "title",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", placeholder: "auto-generated from title" },
    { name: "summary", label: "Short description", type: "textarea", required: true, full: true },
    { name: "image_url", label: "Cover image", type: "image", folder: "projects", full: true },
    { name: "category", label: "Category", type: "text", required: true, placeholder: "Web, Mobile, Design…" },
    { name: "tech", label: "Tech stack", type: "tags", placeholder: "Type and press Enter" },
    { name: "live_url", label: "Live URL", type: "url", placeholder: "https://" },
    { name: "github_url", label: "GitHub URL", type: "url", placeholder: "https://github.com/…" },
    { name: "content", label: "Details", type: "richtext", full: true, folder: "projects" },
    { name: "sort_order", label: "Sort order", type: "number" },
    { name: "featured", label: "Featured on home page", type: "switch" },
    { name: "published", label: "Published", type: "switch" },
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
  columns: [
    { name: "category", label: "Category", format: "badge" },
    { name: "featured", label: "Featured", format: "bool", hideOnMobile: true },
    { name: "published", label: "Status", format: "status" },
  ],
  orderBy: [
    { column: "sort_order", ascending: true },
    { column: "created_at", ascending: false },
  ],
  defaults: {
    title: "",
    slug: "",
    summary: "",
    content: "",
    image_url: "",
    category: "",
    tech: [],
    live_url: "",
    github_url: "",
    featured: false,
    published: true,
    sort_order: 0,
  },
  revalidate: ["/", "/projects"],
};

const certificates: ResourceConfig = {
  key: "certificates",
  table: "certificates",
  singular: "Certificate",
  plural: "Certificates",
  description: "Certifications, courses and awards shown on the Certificates and Resume pages.",
  titleField: "title",
  subtitleField: "issuer",
  imageField: "image_url",
  fields: [
    { name: "title", label: "Certificate title", type: "text", required: true, full: true, placeholder: "AWS Certified Cloud Practitioner" },
    { name: "issuer", label: "Issuing organisation", type: "text", required: true, placeholder: "Amazon Web Services" },
    { name: "credential_id", label: "Credential ID", type: "text", placeholder: "Optional" },
    { name: "issue_date", label: "Issue date", type: "date", required: true },
    { name: "expiry_date", label: "Expiry date", type: "date", help: "Leave empty if it doesn't expire" },
    { name: "credential_url", label: "Verification URL", type: "url", full: true, placeholder: "https://… (link to verify the credential)" },
    { name: "image_url", label: "Certificate image", type: "image", folder: "certificates", full: true, help: "A screenshot or scan of the certificate" },
    { name: "skills", label: "Skills covered", type: "tags", full: true, placeholder: "Type and press Enter" },
    { name: "description", label: "Description", type: "textarea", full: true },
    { name: "sort_order", label: "Sort order", type: "number", help: "Lower numbers appear first" },
    { name: "featured", label: "Featured on home page", type: "switch" },
    { name: "published", label: "Published", type: "switch" },
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
  columns: [
    { name: "issue_date", label: "Issued", format: "date" },
    { name: "featured", label: "Featured", format: "bool", hideOnMobile: true },
    { name: "published", label: "Status", format: "status" },
  ],
  orderBy: [
    { column: "sort_order", ascending: true },
    { column: "issue_date", ascending: false },
  ],
  defaults: {
    title: "",
    issuer: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    credential_url: "",
    image_url: "",
    skills: [],
    description: "",
    featured: false,
    published: true,
    sort_order: 0,
  },
  revalidate: ["/", "/certificates", "/resume"],
};

export const RESOURCES = {
  projects,
  certificates,
  skills,
  experiences,
  education,
} satisfies Record<string, ResourceConfig>;

export type ResourceKey = keyof typeof RESOURCES;

export function isResourceKey(key: string): key is ResourceKey {
  return Object.prototype.hasOwnProperty.call(RESOURCES, key);
}

/* ------------------------------------------------------------------ */
/*  Singletons (one row, id = 1)                                       */
/* ------------------------------------------------------------------ */

export const profileForm = {
  fields: [
    { name: "full_name", label: "Full name", type: "text", required: true, section: "Personal" },
    { name: "title", label: "Title / role", type: "text", required: true, placeholder: "Full-Stack Developer", section: "Personal" },
    { name: "short_intro", label: "Short intro", type: "textarea", full: true, help: "Shown in the hero section", section: "Personal" },
    { name: "bio", label: "Professional summary / bio", type: "textarea", full: true, help: "Shown on About and Resume. Blank lines start new paragraphs.", section: "Personal" },
    { name: "photo_url", label: "Profile photo", type: "image", folder: "profile", full: true, section: "Personal" },
    { name: "email", label: "Public email", type: "email", section: "Contact details" },
    { name: "phone", label: "Phone", type: "text", section: "Contact details" },
    { name: "location", label: "Location", type: "location", full: true, help: "Type it, or capture your current location to fill it in automatically.", section: "Contact details" },
    { name: "website_url", label: "Website", type: "url", section: "Contact details" },
    { name: "available", label: "Available for work", type: "switch", full: true, section: "Contact details" },
    { name: "cv_url", label: "CV / Résumé file (PDF)", type: "file", folder: "cv", accept: "application/pdf,.doc,.docx", full: true, section: "Resume", help: "Powers every “Download CV / PDF” button" },
    { name: "years_experience", label: "Years of experience", type: "number", min: 0, max: 80, section: "Resume" },
    { name: "github_url", label: "GitHub", type: "url", placeholder: "https://github.com/…", section: "Social links" },
    { name: "linkedin_url", label: "LinkedIn", type: "url", placeholder: "https://linkedin.com/in/…", section: "Social links" },
    { name: "twitter_url", label: "X / Twitter", type: "url", placeholder: "https://x.com/…", section: "Social links" },
    { name: "instagram_url", label: "Instagram", type: "url", section: "Social links" },
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
    { name: "site_title", label: "Site title", type: "text", required: true, full: true },
    { name: "seo_description", label: "SEO description", type: "textarea", required: true, full: true, help: "Ideally 120–160 characters" },
    { name: "seo_keywords", label: "SEO keywords", type: "text", full: true, help: "Comma separated" },
    { name: "theme_color", label: "Theme / accent colour", type: "color" },
    { name: "og_image_url", label: "Default social share image", type: "image", folder: "seo", help: "1200×630 recommended" },
  ] satisfies FieldConfig[],
  schema: z.object({
    site_title: reqText("Site title", 80),
    seo_description: reqText("SEO description", 300),
    seo_keywords: optText(300),
    theme_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #6C63FF"),
    og_image_url: optUrl(),
  }),
};
