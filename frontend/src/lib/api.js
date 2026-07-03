import axios from "axios";

// Bearer token is read from localStorage because httpOnly cookies do not always
// cross the preview origin. See src/context/AuthContext.jsx for the tradeoff note.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("mc_admin_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;
