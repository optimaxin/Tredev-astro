const items = [
  "🟢 247 Astrologers Online Now",
  "📞 1,234 Calls Today",
  "⭐ 98% Satisfaction Rate",
  "💬 5,678 Chats Today",
  "🎁 First 3 Mins Free",
  "🔮 New Astrologers Added Daily",
];

export function LiveTicker() {
  const doubled = [...items, ...items];
  return (
    <div className="cosmic-bg overflow-hidden border-y border-white/10 py-3 text-white">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="text-sm font-medium">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
