"use client";

/**
 * Footer Component
 * Professional footer with brand, links, contact, and social icons
 */

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="glass-dark rounded-t-3xl mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <h3 className="font-orbitron text-2xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent mb-4">
              META REAL ESTATE
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {t('home.description') || 'The future of property discovery through cutting-edge AI technology'}
            </p>
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} Meta Real Estate. All rights reserved.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">{t('navbar.about') || 'Quick Links'}</h4>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-gray-600 hover:text-gold transition-colors text-sm">
                  {t('navbar.about')}
                </a>
              </li>
              <li>
                <a href="#what-we-do" className="text-gray-600 hover:text-gold transition-colors text-sm">
                  {t('navbar.whatWeDo')}
                </a>
              </li>
              <li>
                <a href="#testimonials" className="text-gray-600 hover:text-gold transition-colors text-sm">
                  {t('navbar.testimonials')}
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-600 hover:text-gold transition-colors text-sm">
                  {t('navbar.contact')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">{t('navbar.contact') || 'Contact'}</h4>
            <ul className="space-y-2">
              <li className="text-gray-600 text-sm">
                <span className="mr-2">📧</span>
                <a href="mailto:info@metarealestate.com" className="hover:text-gold transition-colors">
                  info@metarealestate.com
                </a>
              </li>
              <li className="text-gray-600 text-sm">
                <span className="mr-2">📞</span>
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3 mt-4">
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-gold/20 hover:bg-gold/40 flex items-center justify-center transition-colors"
                  aria-label="Facebook"
                >
                  <span className="text-xl">📘</span>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-gold/20 hover:bg-gold/40 flex items-center justify-center transition-colors"
                  aria-label="Twitter"
                >
                  <span className="text-xl">🐦</span>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-gold/20 hover:bg-gold/40 flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <span className="text-xl">📷</span>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-gold/20 hover:bg-gold/40 flex items-center justify-center transition-colors"
                  aria-label="LinkedIn"
                >
                  <span className="text-xl">💼</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gold/20 pt-6 text-center">
          <p className="text-gray-500 text-xs">
            Built with ❤️ for the future of real estate
          </p>
        </div>
      </div>
    </footer>
  );
}




