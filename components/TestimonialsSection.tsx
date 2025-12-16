/**
 * Testimonials Section Component
 * Customer testimonials and reviews
 */

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Property Buyer",
      quote: "Meta Real Estate helped me find my dream home in just two weeks! The AI matching system understood exactly what I was looking for.",
      avatar: "SJ",
    },
    {
      name: "Michael Chen",
      role: "Real Estate Investor",
      quote: "The market insights and property recommendations are incredibly accurate. I've made three successful investments using their platform.",
      avatar: "MC",
    },
    {
      name: "Emma Rodriguez",
      role: "Property Seller",
      quote: "Selling my property was seamless. The platform connected me with serious buyers quickly, and I got a great price.",
      avatar: "ER",
    },
  ];

  return (
    <section id="testimonials" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-orbitron text-4xl md:text-5xl font-bold text-center mb-6 text-gold-dark">
          Testimonials
        </h2>
        <p className="text-center text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          See what our clients say about their experience with Meta Real Estate
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="glass-dark rounded-2xl p-8 hover:scale-105 transition-transform"
            >
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gold to-gold-light flex items-center justify-center text-gray-900 font-bold text-xl mr-4">
                  {testimonial.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{testimonial.name}</h3>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-gray-700 italic leading-relaxed">"{testimonial.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

