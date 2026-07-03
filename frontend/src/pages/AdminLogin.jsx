import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { ADMIN } from "@/constants/testIds";
import { ArrowLeft } from "lucide-react";

export default function AdminLogin() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        document.title = "Admin · Morello Connally";
        if (user && user.role === "admin") navigate("/admin", { replace: true });
    }, [user, navigate]);

    const submit = async (e) => {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        try {
            await login(email, password);
            toast.success("Welcome back");
            navigate("/admin", { replace: true });
        } catch (err) {
            toast.error(err.response?.data?.detail || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-base flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <a href="/" className="mb-6 inline-flex items-center gap-2 font-mono-label text-brand-muted hover:text-brand-void">
                    <ArrowLeft className="h-4 w-4" /> Back to site
                </a>
                <form onSubmit={submit} className="border border-brand-void bg-brand-surface p-8">
                    <div className="font-mono-label text-brand-muted">Restricted</div>
                    <h1 className="mt-2 font-heading text-3xl font-black tracking-tighter">Admin login</h1>
                    <p className="mt-2 text-sm text-brand-muted">For Morello Connally staff only.</p>
                    <div className="mt-6 space-y-4">
                        <div>
                            <Label className="font-mono-label">Email</Label>
                            <Input data-testid={ADMIN.emailInput} type="email" value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 rounded-none border-brand-void" placeholder="ryan@morelloconnally.com" />
                        </div>
                        <div>
                            <Label className="font-mono-label">Password</Label>
                            <Input data-testid={ADMIN.passwordInput} type="password" value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 rounded-none border-brand-void" placeholder="••••••••" />
                        </div>
                    </div>
                    <Button data-testid={ADMIN.loginBtn} disabled={loading} type="submit"
                        className="mt-6 h-12 w-full rounded-none bg-brand-signal font-mono-label text-brand-surface hover:bg-brand-signalHover">
                        {loading ? "Signing in…" : "Sign in →"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
