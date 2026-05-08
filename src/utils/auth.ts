const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3005";

export interface User {
  username: string;
  sifraRadnika: number;
  vrstaRadnika: number;
}

let currentUser: User | null = null;

export const signIn = async (username: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        error: new Error(data.message || "Pogrešno korisničko ime ili lozinka"),
        data: null,
      };
    }

    currentUser = data.user;
    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.token) localStorage.setItem("authToken", data.token);
    return { data: data.user, error: null };
  } catch {
    return {
      error: new Error("Greška prilikom povezivanja sa serverom"),
      data: null,
    };
  }
};

export const signInByToken = async (rfidToken: string) => {
  try {
    const response = await fetch(`${API_URL}/api/auth/token-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ rfidToken }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        error: new Error(data.message || "Nepoznat token"),
        data: null,
      };
    }

    currentUser = data.user;
    localStorage.setItem("user", JSON.stringify(data.user));
    if (data.token) localStorage.setItem("authToken", data.token);
    return { data: data.user, error: null };
  } catch {
    return {
      error: new Error("Greška prilikom povezivanja sa serverom"),
      data: null,
    };
  }
};

export const signOut = async () => {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
  currentUser = null;
  localStorage.removeItem("user");
  localStorage.removeItem("authToken");
};

export const getCurrentUser = (): User | null => {
  if (currentUser) return currentUser;
  const stored = localStorage.getItem("user");
  if (stored) {
    try {
      currentUser = JSON.parse(stored);
      return currentUser;
    } catch {
      return null;
    }
  }
  return null;
};

export const getAuthToken = (): string | null =>
  localStorage.getItem("authToken");

export const verifyAuth = async (): Promise<User | null> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.authenticated) {
      const user: User = {
        username: data.username,
        sifraRadnika: data.sifraRadnika,
        vrstaRadnika: data.vrstaRadnika,
      };
      currentUser = user;
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    }
    return null;
  } catch {
    return null;
  }
};
