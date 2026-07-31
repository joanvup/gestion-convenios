export const APP_VERSION = "1.0.7";

/**
 * Utility to fetch the current app version from static version.json or API, falling back to APP_VERSION
 */
export async function fetchAppVersion(): Promise<string> {
  try {
    const res = await fetch('/version.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        return data.version;
      }
    }
  } catch {
    // Fall back to API
  }

  try {
    const res = await fetch('/api/system/version');
    if (res.ok) {
      const data = await res.json();
      if (data && data.version) {
        return data.version;
      }
    }
  } catch {
    // Fall back to APP_VERSION
  }

  return APP_VERSION;
}
