import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CHECKOUT_RESULT } from "@/constants/testIds";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 8;

export default function CheckoutResult({ mode }) {
    const [params] = useSearchParams();
    const [status, setStatus] = useState("checking");
    const [payment, setPayment] = useState(null);

    useEffect(() => {
        document.title = mode === "success" ? "Payment · Morello Connolly" : "Cancelled · Morello Connolly";
        if (mode !== "success") return;
        const sid = params.get("session_id");
        if (!sid) { setStatus("error"); return; }

        let attempts = 0;

        const poll = async () => {
            try {
                const { data } = await api.get(`/checkout/status/${sid}`);
                if (data.payment_status === "paid") {
                    setPayment(data);
                    setStatus("paid");
                    return;
                }
                if (data.status === "expired") { setStatus("expired"); return; }
                attempts += 1;
                if (attempts >= MAX_POLL_ATTEMPTS) { setStatus("timeout"); return; }
                setTimeout(poll, POLL_INTERVAL_MS);
            } catch (err) {
                if (process.env.NODE_ENV !== "production") {
                    console.error("checkout status poll failed:", err);
                }
                setStatus("error");
            }
        };
        poll();
    }, [mode, params]);

    if (mode === "cancel") {
        return (
            <div className="min-h-screen bg-brand-base flex items-center justify-center p-6">
                <div className="max-w-lg w-full border border-brand-void bg-brand-surface p-10 text-center">
                    <XCircle className="mx-auto h-14 w-14 text-brand-signal" />
                    <h1 className="mt-6 font-heading text-4xl font-black tracking-tighter">Payment cancelled</h1>
                    <p data-testid={CHECKOUT_RESULT.statusMsg} className="mt-4 text-brand-muted">
                        No worries — nothing was charged. Come back when you're ready.
                    </p>
                    <Link to="/">
                        <Button data-testid={CHECKOUT_RESULT.homeBtn} className="mt-8 h-12 w-full rounded-none bg-brand-void font-mono-label text-brand-surface">
                            Back to site
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-base flex items-center justify-center p-6">
            <div className="max-w-lg w-full border border-brand-void bg-brand-surface p-10 text-center">
                {status === "checking" && (
                    <>
                        <Loader2 className="mx-auto h-14 w-14 animate-spin text-brand-void" />
                        <h1 className="mt-6 font-heading text-3xl font-black tracking-tighter">Confirming payment…</h1>
                        <p data-testid={CHECKOUT_RESULT.statusMsg} className="mt-4 text-brand-muted">Hang tight while we check with Stripe.</p>
                    </>
                )}
                {status === "paid" && (
                    <>
                        <CheckCircle2 className="mx-auto h-14 w-14 text-brand-signal" />
                        <h1 className="mt-6 font-heading text-4xl font-black tracking-tighter">Payment received.</h1>
                        <p data-testid={CHECKOUT_RESULT.statusMsg} className="mt-4 text-brand-muted">
                            Thank you{payment?.metadata?.customer_name ? `, ${payment.metadata.customer_name}` : ""}!
                            We'll reach out within one business day to kick off <strong>{payment?.metadata?.package_name}</strong>.
                        </p>
                        {payment?.amount_total && (
                            <div className="mt-6 border border-brand-void bg-brand-base p-4 text-left">
                                <div className="font-mono-label text-brand-muted">Total charged</div>
                                <div className="font-heading text-2xl font-black">${(payment.amount_total / 100).toFixed(2)} {payment.currency?.toUpperCase()}</div>
                            </div>
                        )}
                        <Link to="/">
                            <Button data-testid={CHECKOUT_RESULT.homeBtn} className="mt-8 h-12 w-full rounded-none bg-brand-signal font-mono-label text-brand-surface hover:bg-brand-signalHover">
                                Back to site →
                            </Button>
                        </Link>
                    </>
                )}
                {(status === "expired" || status === "error" || status === "timeout") && (
                    <>
                        <XCircle className="mx-auto h-14 w-14 text-brand-signal" />
                        <h1 className="mt-6 font-heading text-3xl font-black tracking-tighter">
                            {status === "expired" ? "Session expired" : "Couldn't confirm payment"}
                        </h1>
                        <p data-testid={CHECKOUT_RESULT.statusMsg} className="mt-4 text-brand-muted">
                            Please reach out — we'll help sort it out.
                        </p>
                        <Link to="/">
                            <Button data-testid={CHECKOUT_RESULT.homeBtn} className="mt-8 h-12 w-full rounded-none bg-brand-void font-mono-label text-brand-surface">
                                Back to site
                            </Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
