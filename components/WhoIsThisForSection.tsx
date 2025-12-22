"use client";

/**
 * Who Is This For Section
 * Shows target audience with icons and descriptions
 */

export default function WhoIsThisForSection() {
  const audiences = [
    {
      icon: "🏠",
      title: "Buyers",
      description: "Find the right area before you commit. Understand market conditions, price trends, and what to expect.",
      gradient: "from-blue-500/10 to-blue-600/10",
    },
    {
      icon: "🔑",
      title: "Renters",
      description: "Know which neighborhoods offer the best value, what's changing, and where you'll feel at home.",
      gradient: "from-green-500/10 to-green-600/10",
    },
    {
      icon: "📈",
      title: "Investors",
      description: "Get data-driven insights on market trends, risks, and opportunities to make smarter investment decisions.",
      gradient: "from-purple-500/10 to-purple-600/10",
    },
    {
      icon: "📍",
      title: "Residents",
      description: "Understand your area better. See what's driving change, what to watch for, and how your neighborhood is evolving.",
      gradient: "from-amber-500/10 to-amber-600/10",
    },
  ];

  return (
    <section className="section-padding container-padding">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-orbitron text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            Who is this for?
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Whether you're buying, renting, investing, or just want to understand your area better
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((audience, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${audience.gradient} glass rounded-2xl p-6 text-center hover:scale-105 transition-all hover:shadow-xl`}
            >
              <div className="text-5xl mb-4">{audience.icon}</div>
              <h3 className="font-orbitron text-xl font-bold text-gray-900 mb-3">
                {audience.title}
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{audience.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

