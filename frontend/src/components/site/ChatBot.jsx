import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { CHATBOT } from "@/constants/testIds";

const STORAGE_KEY = "mc_chat_session";

const getSessionId = () => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
};

const WELCOME = "Hey! I'm the Morello Connolly concierge. Ask me anything — packages, pricing, timelines, or which tier fits your business.";

export default function ChatBot() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }]);
    const [streaming, setStreaming] = useState(false);
    const scrollRef = useRef(null);
    const sessionId = useRef(getSessionId());

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, open]);

    const send = async () => {
        const text = input.trim();
        if (!text || streaming) return;
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
        setStreaming(true);

        try {
            const response = await fetch(`${API_BASE}/chat/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId.current, message: text }),
            });
            if (!response.ok || !response.body) {
                throw new Error(`HTTP ${response.status}`);
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantContent = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split("\n\n");
                buffer = chunks.pop() || "";
                for (const chunk of chunks) {
                    if (!chunk.startsWith("data: ")) continue;
                    try {
                        const evt = JSON.parse(chunk.slice(6));
                        if (evt.delta) {
                            assistantContent += evt.delta;
                            setMessages((prev) => {
                                const copy = [...prev];
                                copy[copy.length - 1] = { role: "assistant", content: assistantContent };
                                return copy;
                            });
                        }
                        if (evt.error) {
                            assistantContent = "I'm having trouble reaching my brain right now. Please try again in a moment or reach Ryan directly at 510-631-5990.";
                            setMessages((prev) => {
                                const copy = [...prev];
                                copy[copy.length - 1] = { role: "assistant", content: assistantContent };
                                return copy;
                            });
                        }
                    } catch { /* ignore malformed SSE frames */ }
                }
            }
        } catch (err) {
            setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                    role: "assistant",
                    content: "Sorry — I couldn't connect. Please text Ryan at 510-631-5990 or Ben at 510-827-3471.",
                };
                return copy;
            });
        } finally {
            setStreaming(false);
        }
    };

    const onKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <>
            {/* Floating toggle button */}
            <button
                data-testid={CHATBOT.button}
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close chat" : "Open chat"}
                className={`fixed bottom-20 right-6 z-50 flex h-14 w-14 items-center justify-center border border-brand-void bg-brand-signal text-brand-surface shadow-[4px_4px_0_0_var(--brand-void)] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-brand-signalHover hover:shadow-[6px_6px_0_0_var(--brand-void)] ${open ? "rotate-90" : ""}`}
            >
                {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </button>

            {/* Chat panel */}
            {open && (
                <div
                    data-testid={CHATBOT.panel}
                    className="fixed bottom-40 right-6 z-40 flex h-[520px] w-[calc(100vw-3rem)] max-w-[380px] flex-col border border-brand-void bg-brand-base shadow-[8px_8px_0_0_var(--brand-void)]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-brand-void bg-brand-void px-4 py-3 text-brand-surface">
                        <div>
                            <div className="font-mono-label text-neutral-400">Live · AI concierge</div>
                            <div className="font-heading text-lg font-black tracking-tighter">Morello / Connolly</div>
                        </div>
                        <button
                            data-testid={CHATBOT.closeBtn}
                            onClick={() => setOpen(false)}
                            aria-label="close"
                            className="p-1 text-brand-surface hover:text-brand-signal"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        data-testid={CHATBOT.messages}
                        className="flex-1 space-y-3 overflow-y-auto p-4"
                    >
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] whitespace-pre-wrap border px-3 py-2 text-sm ${
                                        m.role === "user"
                                            ? "border-brand-void bg-brand-void text-brand-surface"
                                            : "border-brand-void bg-brand-surface text-brand-void"
                                    }`}
                                >
                                    {m.content || (streaming && i === messages.length - 1 ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-brand-muted" />
                                    ) : null)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="flex gap-2 border-t border-brand-void bg-brand-surface p-3">
                        <input
                            data-testid={CHATBOT.input}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKey}
                            disabled={streaming}
                            placeholder="Ask about packages, timeline, photos…"
                            className="flex-1 rounded-none border border-brand-void bg-brand-base px-3 py-2 text-sm text-brand-void placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-signal"
                        />
                        <button
                            data-testid={CHATBOT.sendBtn}
                            onClick={send}
                            disabled={streaming || !input.trim()}
                            className="flex h-10 w-10 items-center justify-center border border-brand-void bg-brand-signal text-brand-surface hover:bg-brand-signalHover disabled:opacity-50"
                            aria-label="send"
                        >
                            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
