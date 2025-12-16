/**
 * About Section Component
 * Information about Meta Real Estate mission and vision
 */

export default function AboutSection() {
  return (
    <section id="about" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-orbitron text-4xl md:text-5xl font-bold text-center mb-6 text-gold-dark">
          About Us
        </h2>
        <div className="glass-dark rounded-3xl p-8 md:p-12 shadow-xl">
          <p className="text-lg md:text-xl text-gray-700 mb-6 text-center leading-relaxed">
            At <strong className="text-gold">Meta Real Estate</strong>, we revolutionize the way you discover and acquire property. 
            Our advanced matching technology connects <strong className="text-gold">buyers with sellers</strong>, creating perfect 
            partnerships that transform dreams into reality.
          </p>
          <p className="text-lg md:text-xl text-gray-700 mb-8 text-center leading-relaxed">
            Whether you're searching for your <strong className="text-gold">dream house</strong>, seeking the perfect 
            <strong className="text-gold"> investment opportunity</strong>, or looking to sell your property to the right buyer, 
            we make the right match—<strong className="text-gold">your way</strong>.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-orbitron text-xl font-bold text-gold-dark mb-2">Our Mission</h3>
              <p className="text-gray-600">Connect buyers and sellers through intelligent matching technology</p>
            </div>
            <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform">
              <div className="text-4xl mb-4">👁️</div>
              <h3 className="font-orbitron text-xl font-bold text-gold-dark mb-2">Our Vision</h3>
              <p className="text-gray-600">Transform real estate discovery with AI-powered insights</p>
            </div>
            <div className="glass rounded-2xl p-6 text-center hover:scale-105 transition-transform">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="font-orbitron text-xl font-bold text-gold-dark mb-2">Our Values</h3>
              <p className="text-gray-600">Innovation, transparency, and customer-first approach</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

