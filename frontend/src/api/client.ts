import { clearStaticDemoUser, handleStaticDemoRequest } from "./demoFallback";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

let staticDemoActive = false;

export function isStaticDemoActive(): boolean {
  return staticDemoActive;
}

export function clearStaticDemoSession(): void {
  clearStaticDemoUser();
}

export function isSampleDemoImage(url?: string | null): boolean {
  if (!url) return false;
  return url.includes("/demo-photos/") || url.includes("/demo_");
}

export function getCategoryFallbackPhoto(category?: string, type: "BEFORE" | "AFTER" = "BEFORE"): string {
  if (type === "AFTER") {
    if (category === "garbage_accumulation") return "/demo-photos/garbage_after_2.jpg";
    if (category === "drainage_blockage") return "/demo-photos/drain_after_1.jpg";
    return "/demo-photos/road_repair_1.jpg";
  }
  if (category === "garbage_accumulation") return "/demo-photos/garbage_1.jpg";
  if (category === "drainage_blockage") return "/demo-photos/drain_1.jpg";
  return "/demo-photos/pothole_2.jpg";
}

export function getImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("/demo-photos/")) {
    return url;
  }
  return `${API_BASE}${url}`;
}

export function getStoredToken(): string | null {
  return localStorage.getItem("civictrack_token");
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (staticDemoActive) {
    return handleStaticDemoRequest<T>(path, options);
  }

  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const contentType = resp.headers.get("content-type") || "";
    // On static hosts like Netlify without VITE_API_BASE_URL, SPA fallback returns HTML for /api/*
    if (!API_BASE && (resp.status === 404 || contentType.includes("text/html"))) {
      staticDemoActive = true;
      return handleStaticDemoRequest<T>(path, options);
    }

    if (!resp.ok) {
      let message = `Request failed (${resp.status})`;
      try {
        const err = await resp.json();
        if (err.detail) {
          message = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
        }
      } catch {
        // keep default
      }
      throw new Error(message);
    }
    return (await resp.json()) as T;
  } catch (err) {
    // Network unreachable and no explicit VITE_API_BASE_URL configured -> enter clearly labelled static demo mode
    if (!API_BASE && err instanceof TypeError) {
      staticDemoActive = true;
      return handleStaticDemoRequest<T>(path, options);
    }
    throw err;
  }
}
