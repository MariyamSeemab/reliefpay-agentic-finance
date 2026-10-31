import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '../components/landing/HeroSection';
import { StatsSection } from '../components/landing/StatsSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { TestimonialSection } from '../components/landing/TestimonialSection';
import { FAQSection } from '../components/landing/FAQSection';
import { Heart, Mail, Smartphone, Globe, CheckCircle, Zap, Shield } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
              <img src="/imgs/logo.png" alt="ReliefPay Logo" className="h-12 w-auto" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-600 hover:text-slate-900 font-medium transition">About</button>
              <button onClick={() => document.getElementById('campaigns')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-600 hover:text-slate-900 font-medium transition">Campaigns</button>
              <button onClick={() => document.getElementById('impact')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-600 hover:text-slate-900 font-medium transition">Impact</button>
              <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-600 hover:text-slate-900 font-medium transition">Contact</button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-slate-900 font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="text-sm text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:shadow-lg font-semibold px-6 py-2 rounded-lg transition transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">
        {/* Hero Section */}
        <section id="about">
          <HeroSection
            onExploreClick={() => navigate('/map')}
            onApplyClick={() => navigate('/login')}
          />
        </section>

        {/* Stats Section */}
        <section id="campaigns">
          <StatsSection />
        </section>

        {/* How It Works */}
        <section id="impact">
          <HowItWorksSection />
        </section>

        {/* Testimonials */}
        <section>
          <TestimonialSection />
        </section>

        {/* FAQ */}
        <section id="faq">
          <FAQSection />
        </section>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-3xl p-16 text-white text-center space-y-6 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -ml-48 -mb-48"></div>
          
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl sm:text-5xl font-bold">Ready to Make Impact?</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Join thousands of donors, volunteers, and community members helping displaced families recover. Your action matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={() => navigate('/signup')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-lg transition shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Start Helping Today
              </button>
              <button
                onClick={() => navigate('/login')}
                className="bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white font-bold px-8 py-4 rounded-lg transition backdrop-blur-sm"
              >
                Sign In to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="py-12 px-6 bg-slate-50 rounded-2xl">
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-12">Why Organizations Trust ReliefPay</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-slate-900">100% Transparent</h4>
              <p className="text-sm text-slate-600">Every transaction tracked, every beneficiary verified, every dollar accounted for</p>
            </div>
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-slate-900">AI-Powered</h4>
              <p className="text-sm text-slate-600">Advanced verification with human oversight ensures legitimate beneficiaries receive aid</p>
            </div>
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-slate-900">Verified Impact</h4>
              <p className="text-sm text-slate-600">Real-time updates, volunteer verification, and audit trails for complete accountability</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src="/imgs/logo.png" alt="ReliefPay Logo" className="h-10 w-auto" />
              </div>
              <p className="text-sm text-slate-400">Transparent disaster relief. Every donation tracked. Every beneficiary verified.</p>
              <div className="flex gap-4 pt-2">
                <button className="text-slate-400 hover:text-emerald-400 transition">
                  <Smartphone className="w-5 h-5" />
                </button>
                <button className="text-slate-400 hover:text-emerald-400 transition">
                  <Mail className="w-5 h-5" />
                </button>
                <button className="text-slate-400 hover:text-emerald-400 transition">
                  <Globe className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Features</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Campaigns</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Pricing</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Documentation</button></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="text-slate-400 hover:text-emerald-400 transition">About Us</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Team</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Blog</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Contact</button></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Privacy Policy</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Terms of Service</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Security</button></li>
                <li><button className="text-slate-400 hover:text-emerald-400 transition">Compliance</button></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
            <p>&copy; 2026 ReliefPay. All rights reserved. Helping communities recover, one transaction at a time.</p>
            <div className="flex gap-6 mt-6 md:mt-0">
              <button className="hover:text-emerald-400 transition">Security</button>
              <button className="hover:text-emerald-400 transition">Status</button>
              <button className="hover:text-emerald-400 transition">Accessibility</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
