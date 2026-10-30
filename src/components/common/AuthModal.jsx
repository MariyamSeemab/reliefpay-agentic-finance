import React from 'react';
import { X, CheckCircle2, ShieldAlert } from 'lucide-react';
import { INITIAL_USER_ACCOUNTS } from '../../data/mockData';

export const AuthModal = ({ isOpen, onClose, currentUser, setCurrentUser }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#123B4A] flex items-center justify-center text-white font-bold">
            RP
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Platform Portal Authentication</h3>
            <p className="text-xs text-slate-500">Select an authenticated active persona to test workflows.</p>
          </div>
        </div>

        <div className="space-y-2 mb-6 max-h-[380px] overflow-y-auto pr-1">
          {INITIAL_USER_ACCOUNTS.map((acc) => {
            const isSelected = currentUser.id === acc.id;
            return (
              <div
                key={acc.id}
                onClick={() => {
                  setCurrentUser(acc);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'border-[#087E83] bg-teal-50/50 ring-1 ring-[#087E83]' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                    acc.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' :
                    acc.role === 'REVIEWER' ? 'bg-amber-100 text-amber-700' :
                    acc.role === 'BENEFICIARY' ? 'bg-emerald-100 text-emerald-700' :
                    acc.role === 'DONOR' ? 'bg-teal-100 text-teal-700' :
                    acc.role === 'VOLUNTEER' ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {acc.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900 text-sm">{acc.name}</span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{acc.title} • {acc.org}</p>
                  </div>
                </div>

                {isSelected && <CheckCircle2 className="w-5 h-5 text-[#087E83]" />}
              </div>
            );
          })}
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start space-x-2 text-xs text-slate-600">
          <ShieldAlert className="w-4 h-4 text-[#087E83] shrink-0 mt-0.5" />
          <span>Switching accounts changes menu options, layout permissions, and active operational scope.</span>
        </div>

      </div>
    </div>
  );
};