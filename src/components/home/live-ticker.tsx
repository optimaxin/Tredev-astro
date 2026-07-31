import { Circle, Phone, Star, MessageCircle, Gift, Sparkles } from "lucide-react";

const items = [
  { icon: Circle, text: "247 Astrologers Online Now", className: "fill-[var(--color-success)] text-[var(--color-success)]" },
  { icon: Phone, text: "1,234 Calls Today", className: "text-[var(--color-gold)]" },
  { icon: Star, text: "97.8% Satisfaction Rate", className: "fill-[var(--color-gold)] text-[var(--color-gold)]" },
  { icon: MessageCircle, text: "5,678 Chats Today", className: "text-[var(--color-gold)]" },
  { icon: Gift, text: "First 3 Mins Free", className: "text-[var(--color-gold)]" },
  { icon: Sparkles, text: "New Astrologers Added Daily", className: "text-[var(--color-gold)]" },
];

export function LiveTicker() {
  const doubled = [...items, ...items];
  return (
    <div className="cosmic-bg overflow-hidden border-y border-white/10 py-3 text-white">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {doubled.map(({ icon: Icon, text, className }, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Icon className={`size-3.5 ${className}`} />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
