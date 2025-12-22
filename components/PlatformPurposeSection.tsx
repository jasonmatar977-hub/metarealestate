"use client";

/**
 * Platform Purpose Section
 * Explains what the platform is for with visual cards
 */

export default function PlatformPurposeSection() {
  const purposes = [
    {
      icon: "📊",
      title: "Area Intelligence",
      description: "Clear, structured understanding of each area's reality and outlook. Know what's happening, why it matters, and what to expect.",
      color: "from-blue-50 to-blue-100",
      iconBg: "bg-blue-100",
    },
    {
      icon: "🔒",
      title: "Trust & Transparency",
      description: "No fake listings, no hidden agendas, no paid opinions. We show you verified data and honest insights from people actually in the market.",
      color: "from-green-50 to-green-100",
      iconBg: "bg-green-100",
    },
    {
      icon: "💡",
      title: "Smarter Decisions",
      description: "Reduce stress, save time, avoid costly mistakes. Make informed choices based on real market conditions, not marketing hype.",
      color: "from-purple-50 to-purple-100",
      iconBg: "bg-purple-100",
    },
    {
      icon: "👥",
      title: "Community Insight",
      description: "Ground-level observations from people actually in the market. Verified contributors share what they're seeing on the ground.",
      color: "from-amber-50 to-amber-100",
      iconBg: "bg-amber-100",
    },
  ];

  return (
    <section className="section-padding container-padding bg-gradient-to-b from-white to-gray-50/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-orbitron text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            What is this platform for?
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We help you understand real estate markets with clarity and confidence
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {purposes.map((purpose, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${purpose.color} rounded-2xl p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1`}
            >
              <div className="flex items-start gap-4">
                <div className={`${purpose.iconBg} rounded-xl p-4 text-3xl flex-shrink-0`}>
                  {purpose.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-orbitron text-xl font-bold text-gray-900 mb-3">
                    {purpose.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{purpose.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

