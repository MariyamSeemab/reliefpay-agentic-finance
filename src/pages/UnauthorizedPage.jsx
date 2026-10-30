import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400 mt-2">You don't have permission to access this page. Please contact an administrator if you believe this is a mistake.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#087E83] hover:bg-[#123B4A] text-white font-semibold rounded-lg transition"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
