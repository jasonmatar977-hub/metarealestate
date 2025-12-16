"use client";

/**
 * Contact Section Component
 * Contact form with validation
 */

import { useState } from "react";
import { validateEmail, validateRequired, getEmailError } from "@/lib/validation";

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!validateRequired(formData.name)) {
      newErrors.name = "Name is required";
    }

    // Validate email
    const emailError = getEmailError(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Validate message
    if (!validateRequired(formData.message)) {
      newErrors.message = "Message is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // SECURITY NOTE: In production, this should send to a backend API
    // that validates and sanitizes the input before processing
    console.log("Contact form submitted:", formData);
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
    
    // Reset submitted message after 5 seconds
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <section id="contact" className="py-20 px-4 bg-gradient-to-b from-transparent to-gray-100/50">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-orbitron text-4xl md:text-5xl font-bold text-center mb-6 text-gold-dark">
          Contact Us
        </h2>
        <p className="text-center text-lg text-gray-600 mb-12">
          Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </p>

        <div className="glass-dark rounded-3xl p-8 md:p-12 shadow-xl">
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-xl font-bold text-gold-dark mb-2">Thank you!</p>
              <p className="text-gray-600">We've received your message and will get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.name ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none transition-colors`}
                  placeholder="Your name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.email ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none transition-colors`}
                  placeholder="your.email@example.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${
                    errors.message ? "border-red-500" : "border-gold/40"
                  } focus:border-gold focus:outline-none transition-colors resize-none`}
                  placeholder="Your message..."
                />
                {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
              </div>

              <button
                type="submit"
                className="w-full px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-gray-900 font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

