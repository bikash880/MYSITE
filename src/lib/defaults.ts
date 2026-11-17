import type { MaintenanceState, Profile, Settings } from "@/types";

export const DEFAULT_PROFILE: Profile = {
  id: 1,
  full_name: "Your Name",
  title: "Full-Stack Developer",
  short_intro: "I build fast, accessible and beautiful web experiences.",
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
  updated_at: new Date(0).toISOString(),
};

export const DEFAULT_MAINTENANCE: MaintenanceState = { enabled: false, message: null, starts_at: null, eta: null, updated_at: null };

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  site_title: "My Portfolio",
  seo_description: "Personal portfolio — projects, blog and services.",
  seo_keywords: null,
  theme_color: "#6C63FF",
  og_image_url: null,
  updated_at: new Date(0).toISOString(),
};
