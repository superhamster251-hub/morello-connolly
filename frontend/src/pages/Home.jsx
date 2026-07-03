import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Phone, MapPin, Menu, X, Sparkles, Check, Camera, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Marquee from "@/components/site/Marquee";
import { NAV, HERO, PRICING, FOUNDERS, SCHEDULE, CONTACT } from "@/constants/testIds";

const HERO_IMG = "https://images.pexels.com/photos/545575/pexels-photo-545575.jpeg";
const ABOUT_IMG = "https://images.pexels.com/photos/4348366/pexels-photo-4348366.jpeg";
const CONTACT_IMG = "https://images.unsplash.com/photo-1719858403364-83f7442a197e";

const PHONES = { ryan: "510-631-5990", ben: "510-827-3471" };
const TIME_SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

// ────────────────────────────────────────────
// Nav
// ────────────────────────────────────────────
const Nav = ({ onScrollTo }) => {
    const [open, setOpen] = useState(false);
    const links = [
        { key: "services", label: "Services", tid: NAV.linkServices },
        { key: "founders", label: "Founders", tid: NAV.linkFounders },
        { key: "schedule", label: "Schedule", tid: NAV.linkSchedule },
        { key: "contact", label: "Contact", tid: NAV.linkContact },
    ];
    return (
        <header className="sticky top-0 z-40 border-b border-brand-void bg-brand-base/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-12">
                <a href="#top" data-testid={NAV.logo} className="font-heading text-xl font-black tracking-tighter text-brand-void md:text-2xl">
                    MORELLO<span className="text-brand-signal">/</span>CONNALLY
                </a>
                <nav className="hidden items-center gap-8 md:flex">
                    {links.map((l) => (
                        <button key={l.key} data-testid={l.tid} onClick={() => onScrollTo(l.key)}
                            className="font-mono-label text-brand-void transition hover:text-brand-signal">
                            {l.label}
                        </button>
                    ))}
                    <a href="/admin/login" data-testid={NAV.adminLink} className="font-mono-label text-brand-muted hover:text-brand-void">Admin</a>
                    <Button data-testid={NAV.bookCallBtn} onClick={() => onScrollTo("schedule")}
                        className="group rounded-none bg-brand-signal font-mono-label text-brand-surface hover:bg-brand-signalHover">
                        Book a call <ArrowUpRight className="ml-2 h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Button>
                </nav>
                <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="menu">
                    {open ? <X /> : <Menu />}
                </button>
            </div>
            {open && (
                <div className="border-t border-brand-void bg-brand-base md:hidden">
                    <div className="flex flex-col p-6">
                        {links.map((l) => (
                            <button key={l.key} data-testid={`m-${l.tid}`} onClick={() => { onScrollTo(l.key); setOpen(false); }}
                                className="border-b border-brand-subtle py-4 text-left font-mono-label">
                                {l.label}
                            </button>
                        ))}
                        <a href="/admin/login" className="border-b border-brand-subtle py-4 font-mono-label">Admin</a>
                        <Button onClick={() => { onScrollTo("schedule"); setOpen(false); }}
                            className="mt-6 rounded-none bg-brand-signal font-mono-label text-brand-surface">
                            Book a call
                        </Button>
                    </div>
                </div>
            )}
        </header>
    );
};

// ────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────
const Hero = ({ onScrollTo }) => (
    <section id="top" className="relative border-b border-brand-void">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6 py-16 md:grid-cols-12 md:gap-12 md:px-12 md:py-28">
            <div className="col-span-12 md:col-span-8">
                <div className="mb-6 flex items-center gap-3 font-mono-label text-brand-muted">
                    <span className="inline-block h-2 w-2 rotate-45 bg-brand-signal" />
                    San Francisco · Est. 2026
                </div>
                <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    data-testid={HERO.headline}
                    className="font-heading text-5xl font-black leading-[0.92] tracking-tighter text-brand-void md:text-7xl lg:text-[8rem]">
                    Websites built<br />
                    <span className="italic">bold.</span> Delivered <span className="text-brand-signal">fast.</span>
                </motion.h1>
                <p className="mt-8 max-w-xl font-sans text-base text-brand-muted md:text-lg">
                    Morello Connally is a two-person studio out of San Francisco. We design, photograph and ship
                    websites that make small businesses look like they belong on the cover of a magazine.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                    <Button data-testid={HERO.bookBtn} onClick={() => onScrollTo("schedule")}
                        className="group h-14 rounded-none bg-brand-signal px-8 font-mono-label text-brand-surface hover:bg-brand-signalHover">
                        Book a discovery call <ArrowUpRight className="ml-2 h-4 w-4 transition group-hover:-translate-y-0.5" />
                    </Button>
                    <Button data-testid={HERO.packagesBtn} onClick={() => onScrollTo("services")} variant="outline"
                        className="h-14 rounded-none border-brand-void bg-transparent px-8 font-mono-label text-brand-void hover:bg-brand-void hover:text-brand-surface">
                        See packages →
                    </Button>
                </div>
            </div>
            <div className="col-span-12 md:col-span-4">
                <div className="relative aspect-[3/4] w-full overflow-hidden border border-brand-void grain">
                    <img src={HERO_IMG} alt="Studio" className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 border-t border-brand-void bg-brand-base p-4">
                        <div className="font-mono-label text-brand-muted">Index / 01</div>
                        <div className="font-heading text-xl font-bold">Studio · SF</div>
                    </div>
                </div>
                <div className="mt-6 border border-brand-void bg-brand-surface p-6">
                    <div className="font-mono-label text-brand-muted">What you get</div>
                    <ul className="mt-3 space-y-2 text-sm">
                        {["Custom design, no templates", "Live in 7-14 days", "Optional monthly upkeep"].map((x) => (
                            <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-signal" />{x}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </section>
);

// ────────────────────────────────────────────
// Services / Pricing
// ────────────────────────────────────────────
const MONTHLY_UPKEEP_PRICES = { starter: 10, professional: 20, premium: 20 };
const PHOTO_REFRESH_TIERS = new Set(["professional", "premium"]);

const BuyDialog = ({ pkg }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [includeMonthly, setIncludeMonthly] = useState(false);
    const [loading, setLoading] = useState(false);

    const hasCustomPhotoPerk = PHOTO_REFRESH_TIERS.has(pkg.id);
    const isEssential = pkg.id === "starter";
    const monthlyPrice = MONTHLY_UPKEEP_PRICES[pkg.id];
    const monthlyAmount = includeMonthly ? monthlyPrice : 0;
    const total = pkg.amount + monthlyAmount;

    const monthlyTitle = isEssential ? "Add monthly stock photo refresh" : "Add monthly upkeep";
    const monthlyDesc = isEssential
        ? "We rotate in fresh stock photography every month so your site never feels stale. First month is charged today; subsequent months billed separately once your site is live."
        : "Custom domain, hosting, backups & minor updates. First month is charged today; subsequent months billed separately once your site is live.";

    const submit = async () => {
        if (!name || !email) return toast.error("Name and email required");
        setLoading(true);
        try {
            const { data } = await api.post("/checkout/session", {
                package_id: pkg.id,
                origin_url: window.location.origin,
                customer_name: name,
                customer_email: email,
                customer_phone: phone,
                include_monthly: includeMonthly,
            });
            window.location.href = data.url;
        } catch (e) {
            toast.error(e.response?.data?.detail || "Checkout failed");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5" data-testid={PRICING.checkoutDialog}>
            <div className="border border-brand-void bg-brand-base p-4">
                <div className="font-mono-label text-brand-muted">Order</div>
                <div className="mt-1 flex items-baseline justify-between font-heading text-2xl font-bold">
                    <span>{pkg.name}</span>
                    <span>${pkg.amount.toFixed(2)}</span>
                </div>
                {includeMonthly && (
                    <div className="mt-1 flex items-baseline justify-between text-sm text-brand-muted">
                        <span>+ First month {isEssential ? "photo refresh" : "upkeep"}</span>
                        <span>${monthlyPrice.toFixed(2)}</span>
                    </div>
                )}
                <div className="mt-3 flex items-baseline justify-between border-t border-brand-void pt-3 font-heading text-xl font-black">
                    <span>Total today</span>
                    <span data-testid={PRICING.checkoutTotal} className="text-brand-signal">${total.toFixed(2)}</span>
                </div>
            </div>

            {/* Tier-aware monthly add-on */}
            <label className="flex cursor-pointer items-start gap-3 border border-brand-void bg-brand-surface p-4 hover:bg-brand-base">
                <Checkbox
                    data-testid={PRICING.checkoutMonthlyToggle}
                    checked={includeMonthly}
                    onCheckedChange={(v) => setIncludeMonthly(v === true)}
                    className="mt-1 rounded-none border-brand-void data-[state=checked]:bg-brand-signal data-[state=checked]:text-brand-surface"
                />
                <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="font-heading text-base font-bold">{monthlyTitle}</span>
                        <span className="font-mono text-sm text-brand-muted">${monthlyPrice}/mo</span>
                    </div>
                    <p className="mt-1 text-xs text-brand-muted">{monthlyDesc}</p>
                    {hasCustomPhotoPerk && includeMonthly && (
                        <div className="mt-3 flex items-start gap-2 border-l-2 border-brand-signal bg-brand-base px-3 py-2">
                            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-brand-signal" />
                            <div>
                                <div className="font-mono-label text-brand-void">Included at no extra cost</div>
                                <p className="mt-0.5 text-xs text-brand-muted">
                                    A quarterly photo refresh — we come out and re-shoot your business so your site never looks stale.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </label>

            <div className="space-y-3">
                <div>
                    <Label className="font-mono-label">Your name</Label>
                    <Input data-testid={PRICING.checkoutName} value={name} onChange={(e) => setName(e.target.value)}
                        className="mt-1 rounded-none border-brand-void" placeholder="Jane Doe" />
                </div>
                <div>
                    <Label className="font-mono-label">Email</Label>
                    <Input data-testid={PRICING.checkoutEmail} value={email} type="email" onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 rounded-none border-brand-void" placeholder="jane@company.com" />
                </div>
                <div>
                    <Label className="font-mono-label">Phone (optional)</Label>
                    <Input data-testid={PRICING.checkoutPhone} value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 rounded-none border-brand-void" placeholder="(415) 555-0100" />
                </div>
            </div>
            <Button data-testid={PRICING.checkoutSubmit} onClick={submit} disabled={loading}
                className="h-12 w-full rounded-none bg-brand-signal font-mono-label text-brand-surface hover:bg-brand-signalHover">
                {loading ? "Loading Stripe…" : "Continue to secure checkout →"}
            </Button>
            <p className="text-xs text-brand-muted">Powered by Stripe. You'll be redirected to a secure checkout page.</p>
        </div>
    );
};

const Services = () => {
    const tiers = [
        {
            id: "starter", label: "Essential", name: "The Essential Package", price: 300, tid: PRICING.starterCard, btnTid: PRICING.starterBuyBtn,
            icon: Sparkles,
            tagline: "The essentials, done well.",
            features: ["Custom-designed 1-4 page site", "Curated stock photography", "Mobile-first responsive", "Basic SEO setup", "Contact form"],
        },
        {
            id: "professional", label: "Creator", name: "The Creator Package", price: 500, tid: PRICING.professionalCard, btnTid: PRICING.professionalBuyBtn,
            icon: Camera, featured: true,
            tagline: "Curated to fit your business needs.",
            features: ["Everything in Essential", "On-site photography session", "Professional photo editing", "Up to 8 pages", "Analytics dashboard", "Quarterly photo re-shoot (with monthly upkeep)"],
        },
        {
            id: "premium", label: "Executive", name: "The Executive Package", price: 750, tid: PRICING.premiumCard, btnTid: PRICING.premiumBuyBtn,
            icon: CreditCard,
            tagline: "Sell, book & scale your business — from day one.",
            features: ["Everything in Creator", "Credit card / Stripe terminals", "Email list & newsletter setup", "Meeting scheduler", "Priority build queue", "Quarterly photo re-shoot (with monthly upkeep)"],
        },
    ];

    return (
        <section id="services" className="border-b border-brand-void bg-brand-base">
            <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-12 md:py-28">
                <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-12">
                    <div className="md:col-span-4">
                        <div className="font-mono-label text-brand-muted">§ 02 · Packages</div>
                        <h2 className="mt-3 font-heading text-4xl font-black tracking-tighter md:text-5xl">
                            Pick a lane.<br />Pay once.
                        </h2>
                    </div>
                    <p className="max-w-xl text-brand-muted md:col-span-8 md:text-lg">
                        Three fixed-price packages. No hourly billing surprises. Add optional monthly upkeep at checkout — Creator and Executive buyers get a quarterly custom photo re-shoot included; Essential buyers can add a monthly stock photo refresh.
                    </p>
                </div>

                <div className="grid grid-cols-1 border border-brand-void md:grid-cols-3">
                    {tiers.map((t, i) => {
                        const Icon = t.icon;
                        return (
                            <div key={t.id} data-testid={t.tid}
                                className={`relative flex flex-col p-8 ${i < tiers.length - 1 ? "md:border-r" : ""} border-brand-void ${i > 0 ? "border-t md:border-t-0" : ""} ${t.featured ? "bg-brand-void text-brand-surface" : "bg-brand-surface"}`}>
                                {t.featured && (
                                    <div className="absolute right-0 top-0 bg-brand-signal px-3 py-1 font-mono-label text-brand-surface">
                                        Most picked
                                    </div>
                                )}
                                <Icon className={`h-8 w-8 ${t.featured ? "text-brand-signal" : "text-brand-void"}`} />
                                <div className="mt-6 font-mono-label opacity-70">{t.label.toUpperCase()}</div>
                                <div className="mt-2 flex items-baseline gap-1 font-heading font-black tracking-tighter">
                                    <span className="text-6xl">${t.price}</span>
                                    <span className="font-mono text-sm opacity-60">/one-time</span>
                                </div>
                                <p className={`mt-4 font-heading text-xl ${t.featured ? "text-brand-surface" : "text-brand-void"}`}>{t.tagline}</p>
                                <ul className={`mt-6 flex-1 space-y-3 text-sm ${t.featured ? "text-neutral-300" : "text-brand-muted"}`}>
                                    {t.features.map((f) => (
                                        <li key={f} className="flex gap-2">
                                            <Check className={`h-4 w-4 shrink-0 ${t.featured ? "text-brand-signal" : "text-brand-void"}`} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button data-testid={t.btnTid}
                                            className={`mt-8 h-12 w-full rounded-none font-mono-label ${t.featured ? "bg-brand-signal text-brand-surface hover:bg-brand-signalHover" : "bg-brand-void text-brand-surface hover:bg-brand-signal"}`}>
                                            Purchase {t.label} →
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-none border-brand-void bg-brand-base sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="font-heading text-2xl font-black tracking-tighter">{t.name}</DialogTitle>
                                        </DialogHeader>
                                        <BuyDialog pkg={{ id: t.id, name: t.name, amount: t.price }} />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// ────────────────────────────────────────────
// Founders
// ────────────────────────────────────────────
const Founders = () => (
    <section id="founders" className="border-b border-brand-void">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-6">
                <div className="relative aspect-[4/5] w-full md:aspect-auto md:h-full">
                    <img src={ABOUT_IMG} alt="Workspace" className="h-full w-full object-cover grayscale" />
                </div>
            </div>
            <div className="border-brand-void md:col-span-6 md:border-l">
                <div className="p-8 md:p-16">
                    <div className="font-mono-label text-brand-muted">§ 03 · Who we are</div>
                    <h2 className="mt-3 font-heading text-4xl font-black tracking-tighter md:text-6xl">
                        Two people.<br />One phone call away.
                    </h2>
                    <p className="mt-6 max-w-lg text-brand-muted md:text-lg">
                        Small enough to answer your texts. Sharp enough to design something you'll be proud of.
                        Every project is handled personally by Ryan and Ben.
                    </p>
                </div>
                <div className="grid grid-cols-1 border-t border-brand-void md:grid-cols-2">
                    <div data-testid={FOUNDERS.ryanCard} className="border-brand-void p-8 md:border-r md:p-10">
                        <div className="font-mono-label text-brand-muted">Founder</div>
                        <div className="mt-2 font-heading text-3xl font-black tracking-tighter">Ryan Morello</div>
                        <p className="mt-2 text-sm text-brand-muted">Design & Photography</p>
                        <a href={`tel:${PHONES.ryan.replace(/-/g, "")}`} data-testid={FOUNDERS.ryanPhone}
                            className="mt-6 flex items-center gap-3 font-heading text-2xl font-bold text-brand-void hover:text-brand-signal">
                            <Phone className="h-5 w-5" />{PHONES.ryan}
                        </a>
                    </div>
                    <div data-testid={FOUNDERS.benCard} className="border-t border-brand-void p-8 md:border-t-0 md:p-10">
                        <div className="font-mono-label text-brand-muted">Founder</div>
                        <div className="mt-2 font-heading text-3xl font-black tracking-tighter">Ben Connally</div>
                        <p className="mt-2 text-sm text-brand-muted">Build & Systems</p>
                        <a href={`tel:${PHONES.ben.replace(/-/g, "")}`} data-testid={FOUNDERS.benPhone}
                            className="mt-6 flex items-center gap-3 font-heading text-2xl font-bold text-brand-void hover:text-brand-signal">
                            <Phone className="h-5 w-5" />{PHONES.ben}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

// ────────────────────────────────────────────
// Schedule
// ────────────────────────────────────────────
const Schedule = () => {
    const [date, setDate] = useState(undefined);
    const [time, setTime] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const submit = async () => {
        if (!date || !time || !name || !email) {
            toast.error("Please pick a date, time and fill your name + email");
            return;
        }
        setLoading(true);
        try {
            const iso = date.toISOString().split("T")[0];
            await api.post("/bookings", { name, email, phone, date: iso, time_slot: time, message });
            setSuccess(true);
            toast.success("Booking sent — we'll be in touch shortly");
        } catch (e) {
            toast.error(e.response?.data?.detail || "Could not submit booking");
        } finally {
            setLoading(false);
        }
    };

    const isPast = (d) => {
        const t = new Date(); t.setHours(0, 0, 0, 0);
        return d < t || d.getDay() === 0;
    };

    return (
        <section id="schedule" className="border-b border-brand-void bg-brand-void text-brand-surface">
            <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-12 md:py-28">
                <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-12">
                    <div className="md:col-span-7">
                        <div className="font-mono-label text-neutral-400">§ 04 · Schedule</div>
                        <h2 className="mt-3 font-heading text-4xl font-black tracking-tighter md:text-6xl">
                            Let's build something <span className="text-brand-signal">bold.</span>
                        </h2>
                        <p className="mt-4 max-w-lg text-neutral-300 md:text-lg">
                            Pick a date & time — we'll confirm within a few hours over text or email.
                            15-30 minutes. No pressure, no pitch deck.
                        </p>
                    </div>
                </div>

                {success ? (
                    <div data-testid={SCHEDULE.successMsg} className="border border-brand-surface bg-brand-signal p-10 text-center">
                        <div className="font-mono-label">Confirmed</div>
                        <div className="mt-3 font-heading text-3xl font-black tracking-tighter md:text-5xl">See you soon.</div>
                        <p className="mt-3 text-neutral-100">We'll text or email you shortly to lock the exact time.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 border border-brand-surface md:grid-cols-12">
                        <div className="border-brand-surface p-6 md:col-span-5 md:border-r md:p-8">
                            <div className="font-mono-label text-neutral-400">Choose a date</div>
                            <div data-testid={SCHEDULE.calendar} className="mt-4">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    disabled={isPast}
                                    className="rounded-none border border-brand-surface bg-brand-void p-3 text-brand-surface"
                                    classNames={{
                                        months: "flex flex-col space-y-4",
                                        month: "space-y-4",
                                        caption: "flex justify-center pt-1 relative items-center text-brand-surface",
                                        caption_label: "text-sm font-medium tracking-tight",
                                        nav_button: "h-8 w-8 bg-transparent border border-brand-surface p-0 opacity-80 hover:opacity-100 hover:bg-brand-surface hover:text-brand-void inline-flex items-center justify-center rounded-none",
                                        nav_button_previous: "absolute left-1",
                                        nav_button_next: "absolute right-1",
                                        table: "w-full border-collapse",
                                        head_row: "flex",
                                        head_cell: "text-neutral-500 w-9 font-mono text-[0.65rem] uppercase tracking-widest",
                                        row: "flex w-full mt-2",
                                        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                                        day: "h-9 w-9 p-0 font-medium text-brand-surface rounded-none hover:bg-brand-signal hover:text-brand-surface aria-selected:opacity-100 inline-flex items-center justify-center transition-colors",
                                        day_selected: "!bg-brand-signal !text-brand-surface hover:!bg-brand-signalHover focus:!bg-brand-signal",
                                        day_today: "border border-brand-signal text-brand-surface",
                                        day_outside: "text-neutral-600 opacity-40",
                                        day_disabled: "text-neutral-600 opacity-30 cursor-not-allowed hover:!bg-transparent",
                                        day_hidden: "invisible",
                                    }}
                                />
                            </div>
                        </div>
                        <div className="border-t border-brand-surface p-6 md:col-span-7 md:border-l-0 md:border-t-0 md:p-8">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <Label className="font-mono-label text-neutral-400">Time slot</Label>
                                    <Select value={time} onValueChange={setTime}>
                                        <SelectTrigger data-testid={SCHEDULE.timeSlot}
                                            className="mt-1 rounded-none border-brand-surface bg-brand-void text-brand-surface">
                                            <SelectValue placeholder="Pick a time" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none border-brand-void bg-brand-base text-brand-void">
                                            {TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s} PT</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="font-mono-label text-neutral-400">Your name</Label>
                                    <Input data-testid={SCHEDULE.nameInput} value={name} onChange={(e) => setName(e.target.value)}
                                        className="mt-1 rounded-none border-brand-surface bg-brand-void text-brand-surface" placeholder="Jane Doe" />
                                </div>
                                <div>
                                    <Label className="font-mono-label text-neutral-400">Email</Label>
                                    <Input data-testid={SCHEDULE.emailInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 rounded-none border-brand-surface bg-brand-void text-brand-surface" placeholder="jane@co.com" />
                                </div>
                                <div>
                                    <Label className="font-mono-label text-neutral-400">Phone (optional)</Label>
                                    <Input data-testid={SCHEDULE.phoneInput} value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="mt-1 rounded-none border-brand-surface bg-brand-void text-brand-surface" placeholder="(415) 555-0100" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <Label className="font-mono-label text-neutral-400">What are you building?</Label>
                                <Textarea data-testid={SCHEDULE.messageInput} value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                                    className="mt-1 rounded-none border-brand-surface bg-brand-void text-brand-surface" placeholder="A quick sentence or two about your project…" />
                            </div>
                            <Button data-testid={SCHEDULE.submitBtn} onClick={submit} disabled={loading}
                                className="mt-6 h-14 w-full rounded-none bg-brand-signal font-mono-label text-brand-surface hover:bg-brand-signalHover">
                                {loading ? "Submitting…" : "Request meeting →"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

// ────────────────────────────────────────────
// Testimonials
// ────────────────────────────────────────────
const Testimonials = () => {
    const quotes = [
        { q: "They came in, took beautiful photos of the shop, and had our new site up within two weeks. Customers actually tell us the website looks great now.", a: "Café owner · SoMa" },
        { q: "We picked Premium and honestly it's been huge — the online store works, we've got a real email list going, and clients can book us straight from the site.", a: "Boutique · Mission" },
        { q: "Fast, friendly and no BS. Highly recommend.", a: "Contractor · Oakland" },
    ];
    return (
        <section className="border-b border-brand-void">
            <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-12 md:py-24">
                <div className="mb-10 flex items-end justify-between gap-4">
                    <div>
                        <div className="font-mono-label text-brand-muted">§ 05 · Word of mouth</div>
                        <h2 className="mt-3 font-heading text-4xl font-black tracking-tighter md:text-5xl">
                            Locals talking.
                        </h2>
                    </div>
                    <ShieldCheck className="h-10 w-10 text-brand-signal" />
                </div>
                <div className="grid grid-cols-1 gap-0 border border-brand-void md:grid-cols-3">
                    {quotes.map((q, i) => (
                        <figure key={q.q} className={`p-8 ${i < 2 ? "md:border-r" : ""} border-brand-void ${i > 0 ? "border-t md:border-t-0" : ""}`}>
                            <blockquote className="font-heading text-xl font-bold leading-tight md:text-2xl">"{q.q}"</blockquote>
                            <figcaption className="mt-6 font-mono-label text-brand-muted">— {q.a}</figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ────────────────────────────────────────────
// Contact
// ────────────────────────────────────────────
const Contact = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!name || !email || !message) return toast.error("All fields are required");
        setLoading(true);
        try {
            await api.post("/contacts", { name, email, message });
            toast.success("Message sent — we'll reply shortly");
            setName(""); setEmail(""); setMessage("");
        } catch (e) {
            toast.error(e.response?.data?.detail || "Could not send");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="contact" data-testid={CONTACT.section} className="relative border-b border-brand-void">
            <div className="absolute inset-0">
                <img src={CONTACT_IMG} alt="San Francisco" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-brand-void/70" />
            </div>
            <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-6 py-16 text-brand-surface md:grid-cols-12 md:px-12 md:py-28">
                <div className="md:col-span-7">
                    <div className="font-mono-label text-neutral-300">§ 06 · Contact</div>
                    <h2 className="mt-3 font-heading text-5xl font-black tracking-tighter md:text-8xl">
                        San Francisco,<br />California.
                    </h2>
                    <div className="mt-8 flex items-center gap-3 font-mono-label text-neutral-300">
                        <MapPin className="h-5 w-5" /> Based in the Bay · Serving the whole peninsula
                    </div>
                    <div className="mt-8 space-y-4">
                        <a href={`tel:${PHONES.ryan.replace(/-/g, "")}`} data-testid={CONTACT.ryanPhone}
                            className="flex items-baseline justify-between border-b border-neutral-700 pb-3 hover:border-brand-signal">
                            <span className="font-mono-label text-neutral-400">Ryan Morello</span>
                            <span className="font-heading text-2xl font-black tracking-tighter md:text-4xl">{PHONES.ryan}</span>
                        </a>
                        <a href={`tel:${PHONES.ben.replace(/-/g, "")}`} data-testid={CONTACT.benPhone}
                            className="flex items-baseline justify-between border-b border-neutral-700 pb-3 hover:border-brand-signal">
                            <span className="font-mono-label text-neutral-400">Ben Connally</span>
                            <span className="font-heading text-2xl font-black tracking-tighter md:text-4xl">{PHONES.ben}</span>
                        </a>
                    </div>
                </div>
                <div className="md:col-span-5">
                    <div className="border border-brand-surface bg-brand-void/70 p-6 backdrop-blur-md md:p-8">
                        <div className="font-mono-label text-neutral-400">Send us a note</div>
                        <div className="mt-4 space-y-3">
                            <Input data-testid={CONTACT.nameInput} value={name} onChange={(e) => setName(e.target.value)}
                                className="rounded-none border-brand-surface bg-transparent text-brand-surface placeholder:text-neutral-500" placeholder="Your name" />
                            <Input data-testid={CONTACT.emailInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="rounded-none border-brand-surface bg-transparent text-brand-surface placeholder:text-neutral-500" placeholder="Email" />
                            <Textarea data-testid={CONTACT.messageInput} value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                                className="rounded-none border-brand-surface bg-transparent text-brand-surface placeholder:text-neutral-500" placeholder="What are you building?" />
                            <Button data-testid={CONTACT.submitBtn} onClick={submit} disabled={loading}
                                className="h-12 w-full rounded-none bg-brand-signal font-mono-label text-brand-surface hover:bg-brand-signalHover">
                                {loading ? "Sending…" : "Send message →"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────
const Footer = () => (
    <footer className="bg-brand-void py-16 text-brand-surface">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12">
            <div className="font-heading text-5xl font-black tracking-tighter md:text-8xl lg:text-9xl">
                MORELLO<span className="text-brand-signal">/</span>CONNALLY
            </div>
            <div className="mt-10 grid grid-cols-2 gap-8 border-t border-neutral-800 pt-8 md:grid-cols-4">
                <div>
                    <div className="font-mono-label text-neutral-400">Studio</div>
                    <div className="mt-2 text-sm">San Francisco, CA</div>
                </div>
                <div>
                    <div className="font-mono-label text-neutral-400">Ryan</div>
                    <a href={`tel:${PHONES.ryan.replace(/-/g, "")}`} className="mt-2 block text-sm hover:text-brand-signal">{PHONES.ryan}</a>
                </div>
                <div>
                    <div className="font-mono-label text-neutral-400">Ben</div>
                    <a href={`tel:${PHONES.ben.replace(/-/g, "")}`} className="mt-2 block text-sm hover:text-brand-signal">{PHONES.ben}</a>
                </div>
                <div>
                    <div className="font-mono-label text-neutral-400">Admin</div>
                    <a href="/admin/login" className="mt-2 block text-sm hover:text-brand-signal">Log in →</a>
                </div>
            </div>
            <div className="mt-8 flex items-center justify-between text-xs text-neutral-500">
                <span>© {new Date().getFullYear()} Morello Connally. All rights reserved.</span>
                <span className="font-mono">v.1.0</span>
            </div>
        </div>
    </footer>
);

// ────────────────────────────────────────────
// Page
// ────────────────────────────────────────────
export default function Home() {
    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    useEffect(() => { document.title = "Morello Connally · San Francisco Web Design"; }, []);

    return (
        <div className="min-h-screen bg-brand-base text-brand-void">
            <Nav onScrollTo={scrollTo} />
            <Hero onScrollTo={scrollTo} />
            <Marquee text="TRUSTED WEB DESIGN IN SAN FRANCISCO ·" />
            <Services />
            <Founders />
            <Schedule />
            <Testimonials />
            <Contact />
            <Footer />
        </div>
    );
}
