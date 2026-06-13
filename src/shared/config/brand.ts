export const APP_NAME =
  (import.meta.env.VITE_APP_NAME || "Sipsip").trim() || "Sipsip";

export const APP_WEBSITE_URL = (import.meta.env.VITE_APP_WEBSITE_URL || "")
  .trim()
  .replace(/\/$/, "");

export const APP_GITHUB_URL = (import.meta.env.VITE_APP_GITHUB_URL || "")
  .trim()
  .replace(/\/$/, "");

export const FEEDBACK_EMAIL = (import.meta.env.VITE_FEEDBACK_EMAIL || "").trim();

export const ANNOUNCEMENT_PING_URL = (
  import.meta.env.VITE_ANNOUNCEMENT_PING_URL || ""
)
  .trim()
  .replace(/\/$/, "");

export const THEME_STORE_API_BASE = (
  import.meta.env.VITE_THEME_STORE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
)
  .trim()
  .replace(/\/$/, "");

export const THEME_STORE_TOKEN_KEY = "sipsip_theme_store_token";
export const THEME_STORE_USERNAME_KEY = "sipsip_theme_store_username";
export const UPDATER_ENABLED =
  import.meta.env.VITE_ENABLE_UPDATER === "true";
