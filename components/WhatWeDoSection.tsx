/**
 * What We Do Section Component
 * Services and features offered by Meta Real Estate
 */

export default function WhatWeDoSection() {
  const services = [
    {
      icon: "🔗",
      title: "Perfect Matching",
      description: "Our intelligent system connects buyers with sellers based on preferences, budget, and location, ensuring the perfect match every time.",
    },
    {
      icon: "🏠",
      title: "Dream Properties",
      description: "Find your dream house, apartment, or investment property from our extensive global network of premium listings.",
    },
    {
      icon: "💎",
      title: "Smart Investments",
      description: "Discover lucrative real estate opportunities tailored to your investment goals and financial strategy.",
    },
    {
      icon: "🌍",
      title: "Global Reach",
      description: "Access properties worldwide, connecting with communities across continents to find your perfect match.",
    },
    {
      icon: "🤖",
      title: "AI-Powered Insights",
      description: "Leverage cutting-edge artificial intelligence to get personalized property recommendations and market analysis.",
    },
    {
      icon: "📊",
      title: "Market Analysis",
      description: "Get comprehensive market insights, trends, and analytics to make informed real estate decisions.",
    },
  ];

  return (
    <section id="what-we-do" className="py-20 px-4 bg-gradient-to-b from-transparent to-gray-100/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-orbitron text-4xl md:text-5xl font-bold text-center mb-6 text-gold-dark">
          What We Do
        </h2>
        <p className="text-center text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          We provide comprehensive real estate services powered by advanced technology
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className="glass rounded-2xl p-6 hover:scale-105 hover:shadow-xl transition-all"
            >
              <div className="text-5xl mb-4">{service.icon}</div>
              <h3 className="font-orbitron text-xl font-bold text-gold-dark mb-3">
                {service.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

