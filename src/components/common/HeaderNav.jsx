import React from 'react';
import { HeartHandshake, LogIn, User } from 'lucide-react';

export const HeaderNav = ({ currentUser, activeTab, setActiveTab, setIsAuthModalOpen }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#123B4A] text-white border-b border-slate-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('landing')} 
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#087E83] to-[#16845B] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <HeartHandshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight">RELIEFPAY</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                PROD
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Emergency Assistance Platform</p>
          </div>
        </div>

        {/* Global Navigation */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button 
            onClick={() => setActiveTab('map')}
            className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition ${
              activeTab === 'map' ? 'bg-[#087E83] text-white' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            GIS Map
          </button>
          
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition ${
              activeTab === 'campaigns' ? 'bg-[#087E83] text-white' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            Campaigns
          </button>

          {/* User Account / Role Badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs sm:text-sm transition"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <div className="text-left hidden md:block">
                <div className="font-semibold text-slate-100 text-xs">{currentUser.name}</div>
                <div className="text-[10px] text-emerald-300 font-mono tracking-wider">{currentUser.role}</div>
              </div>
              <LogIn className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};