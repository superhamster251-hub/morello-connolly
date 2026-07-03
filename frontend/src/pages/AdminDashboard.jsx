import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, DollarSign, Calendar as CalIcon, MessageSquare, TrendingUp, MessagesSquare } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ADMIN } from "@/constants/testIds";

const UNAUTHORIZED_STATUS = 401;

const StatCard = ({ label, value, icon: Icon, tid }) => (
    <div data-testid={tid} className="border border-brand-void bg-brand-surface p-6">
        <div className="flex items-center justify-between">
            <div className="font-mono-label text-brand-muted">{label}</div>
            <Icon className="h-5 w-5 text-brand-signal" />
        </div>
        <div className="mt-4 font-heading text-4xl font-black tracking-tighter">{value}</div>
    </div>
);

const StatusBadge = ({ status }) => {
    const s = (status || "").toLowerCase();
    let cls = "bg-brand-void text-brand-surface";
    if (s === "paid" || s === "complete" || s === "completed") cls = "bg-brand-signal text-brand-surface";
    else if (s === "initiated" || s === "open" || s === "pending") cls = "bg-neutral-200 text-brand-void";
    else if (s === "unpaid" || s === "expired" || s === "cancelled") cls = "bg-brand-void text-brand-surface";
    return <Badge className={`rounded-none font-mono-label ${cls}`}>{status}</Badge>;
};

export default function AdminDashboard() {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [chats, setChats] = useState([]);
    const [tab, setTab] = useState("overview");

    useEffect(() => {
        document.title = "Dashboard · Morello Connolly";
        if (loading) return;
        if (!user || user.role !== "admin") navigate("/admin/login", { replace: true });
    }, [user, loading, navigate]);

    const fetchAll = useCallback(async () => {
        try {
            const [s, b, p, c, ch] = await Promise.all([
                api.get("/admin/summary"),
                api.get("/admin/bookings"),
                api.get("/admin/purchases"),
                api.get("/admin/contacts"),
                api.get("/admin/chats"),
            ]);
            setSummary(s.data);
            setBookings(b.data.items);
            setPurchases(p.data.items);
            setContacts(c.data.items);
            setChats(ch.data.items);
        } catch (e) {
            if (e.response?.status === UNAUTHORIZED_STATUS) navigate("/admin/login", { replace: true });
        }
    }, [navigate]);

    useEffect(() => { if (user && user.role === "admin") fetchAll(); }, [user, fetchAll]);

    const doLogout = async () => {
        await logout();
        toast.success("Signed out");
        navigate("/admin/login", { replace: true });
    };

    if (loading || !user || user.role !== "admin") return null;

    return (
        <div className="min-h-screen bg-brand-base">
            <header className="sticky top-0 z-30 border-b border-brand-void bg-brand-base/90 backdrop-blur">
                <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 md:px-10">
                    <div>
                        <div className="font-mono-label text-brand-muted">Control room</div>
                        <div className="font-heading text-xl font-black tracking-tighter">
                            MORELLO<span className="text-brand-signal">/</span>CONNOLLY
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden text-right md:block">
                            <div className="font-mono-label text-brand-muted">Signed in as</div>
                            <div className="text-sm font-medium">{user.name}</div>
                        </div>
                        <Button data-testid={ADMIN.logoutBtn} variant="outline" onClick={doLogout}
                            className="rounded-none border-brand-void font-mono-label text-brand-void hover:bg-brand-void hover:text-brand-surface">
                            <LogOut className="mr-2 h-4 w-4" /> Sign out
                        </Button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-[1400px] p-6 md:p-10">
                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="rounded-none border border-brand-void bg-brand-surface p-0">
                        <TabsTrigger data-testid={ADMIN.tabOverview} value="overview" className="rounded-none data-[state=active]:bg-brand-void data-[state=active]:text-brand-surface">Overview</TabsTrigger>
                        <TabsTrigger data-testid={ADMIN.tabBookings} value="bookings" className="rounded-none data-[state=active]:bg-brand-void data-[state=active]:text-brand-surface">Bookings</TabsTrigger>
                        <TabsTrigger data-testid={ADMIN.tabPurchases} value="purchases" className="rounded-none data-[state=active]:bg-brand-void data-[state=active]:text-brand-surface">Purchases</TabsTrigger>
                        <TabsTrigger data-testid={ADMIN.tabContacts} value="contacts" className="rounded-none data-[state=active]:bg-brand-void data-[state=active]:text-brand-surface">Contacts</TabsTrigger>
                        <TabsTrigger data-testid={ADMIN.tabChats} value="chats" className="rounded-none data-[state=active]:bg-brand-void data-[state=active]:text-brand-surface">Chats</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                            <StatCard tid={ADMIN.revenue} label="Revenue" value={`$${(summary?.revenue ?? 0).toFixed(2)}`} icon={DollarSign} />
                            <StatCard tid={ADMIN.purchasesCount} label="Paid orders" value={summary?.paid_purchases ?? 0} icon={TrendingUp} />
                            <StatCard tid={ADMIN.bookingsCount} label="Meeting requests" value={summary?.bookings ?? 0} icon={CalIcon} />
                            <StatCard label="Contact messages" value={summary?.contacts ?? 0} icon={MessageSquare} />
                            <StatCard tid={ADMIN.chatsCount} label="Chat conversations" value={summary?.chats ?? 0} icon={MessagesSquare} />
                        </div>
                    </TabsContent>

                    <TabsContent value="bookings" className="mt-6">
                        <div className="border border-brand-void bg-brand-surface">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-brand-void bg-brand-void hover:bg-brand-void">
                                        <TableHead className="text-brand-surface font-mono-label">Name</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Email</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Phone</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Date</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Time</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="py-10 text-center text-brand-muted">No bookings yet.</TableCell></TableRow>
                                    ) : bookings.map((b) => (
                                        <TableRow key={b.id} className="border-brand-subtle">
                                            <TableCell className="font-medium">{b.name}</TableCell>
                                            <TableCell className="text-brand-muted">{b.email}</TableCell>
                                            <TableCell className="text-brand-muted">{b.phone || "—"}</TableCell>
                                            <TableCell>{b.date}</TableCell>
                                            <TableCell>{b.time_slot}</TableCell>
                                            <TableCell><StatusBadge status={b.status} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="purchases" className="mt-6">
                        <div className="border border-brand-void bg-brand-surface">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-brand-void bg-brand-void hover:bg-brand-void">
                                        <TableHead className="text-brand-surface font-mono-label">Customer</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Package</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Monthly</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Amount</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Payment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchases.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="py-10 text-center text-brand-muted">No purchases yet.</TableCell></TableRow>
                                    ) : purchases.map((p) => (
                                        <TableRow key={p.id} className="border-brand-subtle">
                                            <TableCell>
                                                <div className="font-medium">{p.customer_name}</div>
                                                <div className="text-xs text-brand-muted">{p.customer_email}</div>
                                            </TableCell>
                                            <TableCell>{p.package_name}</TableCell>
                                            <TableCell>${(p.monthly_maintenance ?? 0).toFixed(2)}</TableCell>
                                            <TableCell className="font-medium">${(p.amount ?? 0).toFixed(2)}</TableCell>
                                            <TableCell><StatusBadge status={p.payment_status} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="contacts" className="mt-6">
                        <div className="border border-brand-void bg-brand-surface">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-brand-void bg-brand-void hover:bg-brand-void">
                                        <TableHead className="text-brand-surface font-mono-label">Name</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Email</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Message</TableHead>
                                        <TableHead className="text-brand-surface font-mono-label">Received</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contacts.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="py-10 text-center text-brand-muted">No messages yet.</TableCell></TableRow>
                                    ) : contacts.map((c) => (
                                        <TableRow key={c.id} className="border-brand-subtle">
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell className="text-brand-muted">{c.email}</TableCell>
                                            <TableCell className="max-w-md truncate">{c.message}</TableCell>
                                            <TableCell className="text-brand-muted text-xs">{c.created_at?.substring(0, 10)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="chats" className="mt-6">
                        <div className="grid grid-cols-1 gap-4">
                            {chats.length === 0 ? (
                                <div className="border border-brand-void bg-brand-surface p-10 text-center text-brand-muted">
                                    No chat conversations yet.
                                </div>
                            ) : chats.map((c) => (
                                <div key={c.session_id} className="border border-brand-void bg-brand-surface">
                                    <div className="flex items-center justify-between border-b border-brand-void bg-brand-void px-4 py-3 text-brand-surface">
                                        <div>
                                            <div className="font-mono-label text-neutral-400">
                                                {c.visitor_name ? c.visitor_name : "Anonymous visitor"}
                                                {c.visitor_email ? ` · ${c.visitor_email}` : ""}
                                            </div>
                                            <div className="mt-1 font-mono text-xs text-neutral-500">Session {c.session_id.slice(-10)}</div>
                                        </div>
                                        <div className="text-right font-mono-label text-neutral-500">
                                            {c.updated_at?.substring(0, 16).replace("T", " ")}
                                        </div>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto p-4 space-y-3">
                                        {(c.messages || []).map((m, i) => (
                                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[80%] whitespace-pre-wrap border px-3 py-2 text-sm ${m.role === "user" ? "border-brand-void bg-brand-void text-brand-surface" : "border-brand-subtle bg-brand-base text-brand-void"}`}>
                                                    {m.content}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
