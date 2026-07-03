export const Marquee = ({ text }) => {
    const repeated = Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="mx-8 inline-flex items-center gap-8">
            {text}
            <span aria-hidden className="inline-block h-2 w-2 rotate-45 bg-brand-signal" />
        </span>
    ));
    return (
        <div className="overflow-hidden border-y border-brand-void bg-brand-void py-4 text-brand-surface">
            <div className="marquee-track font-heading font-black uppercase tracking-tighter text-3xl md:text-4xl">
                {repeated}
                {repeated}
            </div>
        </div>
    );
};

export default Marquee;
