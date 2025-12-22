"use client";

/**
 * Problem We Solve Section
 * Emotional but professional explanation of problems
 */

export default function ProblemWeSolveSection() {
  const problems = [
    {
      icon: "😕",
      title: "Confusion",
      description: "Too much information, conflicting advice, unclear what's real and what's marketing. You need clarity, not noise.",
    },
    {
      icon: "🚫",
      title: "Fake Listings",
      description: "Properties that don't exist, prices that aren't real, photos that mislead. You deserve honesty and transparency.",
    },
    {
      icon: "⏰",
      title: "Wasted Time",
      description: "Endless searching, viewing properties that don't match, missing opportunities. Your time is valuable.",
    },
    {
      icon: "❓",
      title: "Zero Trust",
      description: "Who can you believe? Agents pushing sales, websites with hidden agendas. You need unbiased insights.",
    },
    {
      icon: "💔",
      title: "Emotional Decisions",
      description: "Making big financial decisions based on feelings, not facts. You need data-driven clarity to feel confident.",
    },
  ];

  return (
    <section className="section-padding container-padding bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-orbitron text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-gray-900">
            The problem we solve
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Real estate decisions are stressful enough. You shouldn't have to navigate confusion, misinformation, and hidden agendas.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="glass-dark rounded-2xl p-6 hover:shadow-xl transition-all border-l-4 border-gold"
            >
              <div className="text-4xl mb-4">{problem.icon}</div>
              <h3 className="font-orbitron text-xl font-bold text-gray-900 mb-3">
                {problem.title}
              </h3>
              <p className="text-gray-700 leading-relaxed text-sm">{problem.description}</p>
            </div>
          ))}
        </div>

        {/* Solution CTA */}
        <div className="mt-12 text-center">
          <div className="glass-dark rounded-2xl p-8 max-w-2xl mx-auto border-2 border-gold/30">
            <h3 className="font-orbitron text-2xl font-bold text-gray-900 mb-4">
              We provide clarity, not confusion
            </h3>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Our Area Journals give you structured, honest insights. No marketing spin, no hidden agendas—just clear information to help you make confident decisions.
            </p>
            <a
              href="/journal"
              className="inline-block px-8 py-3 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all"
            >
              See How It Works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

