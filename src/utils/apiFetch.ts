import { getAuthToken } from "./auth";

export const apiFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken();
  const base = (options.headers as Record<string, string>) ?? {};
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...base,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};
