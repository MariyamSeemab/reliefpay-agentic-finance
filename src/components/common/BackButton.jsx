import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export const BackButton = ({ to = -1, label = 'Back', isDark = false }) => {
  const navigate = useNavigate();
  
  const textClass = isDark 
    ? 'text-slate-300 hover:text-white' 
    : 'text-slate-600 hover:text-slate-900';
  
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center gap-1 ${textClass} font-medium transition mb-6`}
    >
      <ChevronLeft className="w-5 h-5" />
      {label}
    </button>
  );
};
