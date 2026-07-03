import axios from "axios";

// We do NOT send cookies cross-origin — the admin Bearer token in localStorage
// (attached via the interceptor below) is the source of truth for auth. This
// avoids the browser rejection of "Access-Control-Allow-Origin: *" with
// "Access-Control-Allow-Credentials: true" that occurred when the frontend was
// deployed to a different origin (e.g., Vercel) than the backend.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: false,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("mc_admin_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;
