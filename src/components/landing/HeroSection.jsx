import React, { useState, useEffect } from 'react';
import { Heart, Zap, Users, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';

export const HeroSection = ({ onExploreClick, onApplyClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Array of image paths
  const images = [
    '/imgs/images.jfif',
    '/imgs/images (1).jfif',
    '/imgs/images (2).jfif',
    '/imgs/images (3).jfif',
    '/imgs/images (4).jfif',
    '/imgs/images (5).jfif',
    '/imgs/images (6).jfif',
    '/imgs/images (7).jfif',
    '/imgs/images (8).jfif',
    '/imgs/images (9).jfif',
    '/imgs/images (10).jfif',
  ];

  // Auto-rotate images every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="space-y-12">
      {/* Main Hero with Images Behind Text */}
      <div className="relative overflow-hidden rounded-2xl h-96 shadow-xl">
        {/* Background Images - Scrolling Carousel */}
        <div className="absolute inset-0">
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Relief scene ${idx + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ))}
          {/* Subtle overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-black/50"></div>
        </div>

        {/* Content Overlay - Text in Front */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 lg:p-10 text-white">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs uppercase tracking-widest font-bold bg-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-200 border border-emerald-400/50 inline-block">
              Transparent Relief Platform
            </span>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Relief That Reaches Those Who Need It Most
            </h1>
            
            <p className="text-base sm:text-lg text-slate-100 max-w-xl leading-relaxed">
              ReliefPay connects emergency financial assistance directly to verified beneficiaries. No middlemen. No delays. Just transparent, human-centered disaster relief powered by AI verification.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-300">$620K</div>
                <p className="text-xs sm:text-sm text-slate-200 mt-0.5">Distributed to Beneficiaries</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-300">1,240+</div>
                <p className="text-xs sm:text-sm text-slate-200 mt-0.5">Lives Impacted</p>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-300">98%</div>
                <p className="text-xs sm:text-sm text-slate-200 mt-0.5">Verification Rate</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons at Bottom */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button 
              onClick={onApplyClick}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
            >
              Request Assistance
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
            <button 
              onClick={onExploreClick}
              className="bg-white/20 hover:bg-white/30 border border-white/40 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition backdrop-blur-sm flex items-center justify-center gap-2"
            >
              Explore Impact Map
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image indicators/dots */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImageIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentImageIndex
                  ? 'bg-emerald-400 w-6'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`View image ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Key Features Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-8 border border-emerald-200 hover:shadow-lg transition">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 mb-3 text-lg">Direct Impact</h3>
          <p className="text-sm text-slate-700">100% of donations reach verified beneficiaries with transparent tracking and real-time updates.</p>
          <div className="mt-4 pt-4 border-t border-emerald-200">
            <p className="text-xs text-emerald-700 font-semibold">✓ Zero intermediaries</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-8 border border-blue-200 hover:shadow-lg transition">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 mb-3 text-lg">AI-Powered Verification</h3>
          <p className="text-sm text-slate-700">Advanced algorithms detect fraud while maintaining human oversight for ethical decision-making.</p>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-700 font-semibold">✓ 98% accuracy rate</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-8 border border-purple-200 hover:shadow-lg transition">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 mb-3 text-lg">Community Verified</h3>
          <p className="text-sm text-slate-700">Volunteers and experts verify claims through field visits and evidence collection.</p>
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-xs text-purple-700 font-semibold">✓ Real-time updates</p>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
        <p className="text-sm text-slate-600 text-center mb-6">Trusted by leading organizations and beneficiary communities</p>
        <div className="flex flex-wrap justify-center gap-8 items-center">
          <div className="text-center">
            <p className="font-semibold text-slate-900">NDRF</p>
            <p className="text-xs text-slate-500">Disaster Relief</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">Red Cross</p>
            <p className="text-xs text-slate-500">Partner Org</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">GiveIndia</p>
            <p className="text-xs text-slate-500">Certification</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">UNESCO</p>
            <p className="text-xs text-slate-500">Recognition</p>
          </div>
        </div>
      </div>

      {/* Key Features Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-8 border border-emerald-200 hover:shadow-lg transition">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 mb-3 text-lg">Direct Impact</h3>
          <p className="text-sm text-slate-700">100% of donations reach verified beneficiaries with transparent tracking and real-time updates.</p>
          <div className="mt-4 pt-4 border-t border-emerald-200">
            <p className="text-xs text-emerald-700 font-semibold">✓ Zero intermediaries</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-8 border border-blue-200 hover:shadow-lg transition">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 mb-3 text-lg">AI-Powered Verification</h3>
          <p className="text-sm text-slate-700">Advanced algorithms detect fraud while maintaining human oversight for ethical decision-making.</p>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-700 font-semibold">✓ 98% accuracy rate</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-8 border border-purple-200 hover:shadow-lg transition">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-bold text-slate-900 mb-3 text-lg">Community Verified</h3>
          <p className="text-sm text-slate-700">Volunteers and experts verify claims through field visits and evidence collection.</p>
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-xs text-purple-700 font-semibold">✓ Real-time updates</p>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200">
        <p className="text-sm text-slate-600 text-center mb-6">Trusted by leading organizations and beneficiary communities</p>
        <div className="flex flex-wrap justify-center gap-8 items-center">
          <div className="text-center">
            <p className="font-semibold text-slate-900">NDRF</p>
            <p className="text-xs text-slate-500">Disaster Relief</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">Red Cross</p>
            <p className="text-xs text-slate-500">Partner Org</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">GiveIndia</p>
            <p className="text-xs text-slate-500">Certification</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-900">UNESCO</p>
            <p className="text-xs text-slate-500">Recognition</p>
          </div>
        </div>
      </div>
    </div>
  );
};
