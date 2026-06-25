import { getAuthToken } from "./auth";

export const apiFetch = (url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> => {
  const token = getAuthToken();
  const base = (options.headers as Record<string, string>) ?? {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    credentials: "include",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...base,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }).finally(() => clearTimeout(timeoutId));
};
