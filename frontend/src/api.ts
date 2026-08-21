import axios from "axios";
import type { CurrentUser } from "./types";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});



api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

export async function login(username: string, password: string) {
  const { data } = await api.post<{ accessToken: string; user: CurrentUser }>("/auth/login", {
    username,
    password,
  });
  localStorage.setItem("access_token", data.accessToken);
  localStorage.setItem("current_user", JSON.stringify(data.user));
  return data.user;
}

export async function getMe() {
  const { data } = await api.get<CurrentUser>("/auth/me");
  localStorage.setItem("current_user", JSON.stringify(data)); // Cập nhật cache
  return data;
}

export async function changePassword(oldPassword: string, newPassword: string, confirmPassword: string) {
  const { data } = await api.patch("/auth/change-password", {
    oldPassword,
    newPassword,
    confirmPassword,
  });
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("current_user");
}

export function getStoredUser(): CurrentUser | null {
  const value = localStorage.getItem("current_user");
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}