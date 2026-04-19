/**
 * i18n - Internationalization utilities
 *
 * Simple JSON-based translation system for Electron + native HTML apps.
 * Uses language setting from settings handler to determine locale.
 */

import en from "./en.json";
import zhCN from "./zh-CN.json";

export type Locale = "en" | "zh-CN";

// Translation data
const translations: Record<Locale, typeof en> = {
  en,
  "zh-CN": zhCN,
};

// Current locale (default to English)
let currentLocale: Locale = "en";

// Fallback locale
const fallbackLocale: Locale = "en";

/**
 * Get nested value from object by dot-notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // Return path as fallback
    }
  }

  return typeof result === "string" ? result : path;
}

/**
 * Set current locale
 */
export function setLocale(locale: Locale): void {
  if (locale in translations) {
    currentLocale = locale;
  }
}

/**
 * Get current locale
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Translate a key
 *
 * @param key Dot-notation key (e.g., "floating.status.idle")
 * @param params Optional parameters for interpolation
 * @returns Translated string
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = getNestedValue(translations[currentLocale] as unknown as Record<string, unknown>, key);

  // Fallback to English if not found in current locale
  if (text === key && currentLocale !== fallbackLocale) {
    text = getNestedValue(translations[fallbackLocale] as unknown as Record<string, unknown>, key);
  }

  // Interpolate parameters
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
    }
  }

  return text;
}

/**
 * Load locale from language code string
 */
export function loadLocaleFromCode(code: string): Locale {
  // Normalize code (e.g., "zh-CN" -> "zh-CN", "zh" -> "zh-CN")
  if (code === "zh-CN" || code === "zh-Hans" || code.startsWith("zh")) {
    return "zh-CN";
  }
  if (code.startsWith("en")) {
    return "en";
  }
  return "en";
}

export default { t, setLocale, getLocale, loadLocaleFromCode };
