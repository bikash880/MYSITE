// Mirrors the website's src/types/index.ts (same MongoDB collections, as returned by the REST API).

export interface Profile {
  id: number;
  full_name: string;
  title: string;
  short_intro: string | null;
  bio: string | null;
  photo_url: string | null;
  cv_url: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  years_experience: number | null;
  available: boolean;
  github_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  level: number;
  icon: string | null;
  sort_order: number;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string | null;
  image_url: string | null;
  category: string;
  tech: string[];
  live_url: string | null;
  github_url: string | null;
  featured: boolean;
  published: boolean;
  created_at: string;
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  image_url: string | null;
  skills: string[];
  description: string | null;
  featured: boolean;
  published: boolean;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Settings {
  id: number;
  site_title: string;
  seo_description: string;
  seo_keywords: string | null;
  theme_color: string;
  og_image_url: string | null;
}

export type Row = Record<string, unknown> & { id: string };
