import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

// Note on token storage:
// The admin token is stored in BOTH an httpOnly cookie (set by the backend on login)
// AND in localStorage (used by the axios interceptor to attach a Bearer header).
// The dual approach is a pragmatic tradeoff for cross-origin preview URLs where
// httpOnly cookies do not always propagate from api.preview → app.preview. The
// admin surface has zero user-generated content, so the XSS risk of localStorage
// is acceptable for this scope. Do not remove without also fixing cookie routing.

const isDev = process.env.NODE_ENV !== "production";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchMe = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
        } catch (err) {
            if (isDev && err.response?.status !== 401) console.error("auth/me failed:", err);
            setUser(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMe(); }, [fetchMe]);

    const login = useCallback(async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        if (data.token) localStorage.setItem("mc_admin_token", data.token);
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        } catch (err) {
            if (isDev) console.error("logout failed:", err);
        }
        localStorage.removeItem("mc_admin_token");
        setUser(false);
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, logout, refresh: fetchMe }),
        [user, loading, login, logout, fetchMe],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
