import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

// Back link plus the ReliefPay logo on the right, so every inner page shows
// the logo. Pages that already show a large logo pass showLogo={false}.
export const BackButton = ({ to = -1, label = 'Back', isDark = false, showLogo = true }) => {
  const navigate = useNavigate();

  const textClass = isDark
    ? 'text-slate-300 hover:text-white'
    : 'text-slate-600 hover:text-slate-900';

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <button
        onClick={() => navigate(to)}
        className={`flex items-center gap-1 ${textClass} font-medium transition`}
      >
        <ChevronLeft className="w-5 h-5" />
        {label}
      </button>
      {showLogo && <BrandLogo className="h-12" />}
    </div>
  );
};
