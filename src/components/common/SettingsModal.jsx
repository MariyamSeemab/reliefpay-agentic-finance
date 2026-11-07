import React, { useEffect, useState } from 'react';
import { Bell, LogOut, Settings, User, X } from 'lucide-react';

const NOTIFICATION_OPTIONS = [
  { key: 'email', label: 'Email notifications', help: 'Donation receipts, application and payout updates' },
  { key: 'campaigns', label: 'Campaign alerts', help: 'New disaster relief campaigns near you' },
  { key: 'weekly', label: 'Weekly impact summary', help: 'A short weekly report of verified impact' },
];
const DEFAULT_PREFS = { email: true, campaigns: true, weekly: false };

function storageKey(user) {
  return `reliefpay.notifications.${user?.id || user?.email || 'guest'}`;
}

function readPrefs(user) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(user)) || 'null');
    return { ...DEFAULT_PREFS, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

// Profile details, notification preferences (browser localStorage only) and sign out.
export function SettingsModal({ user, onClose, onSignOut }) {
  const [prefs, setPrefs] = useState(() => readPrefs(user));

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(storageKey(user), JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); keep the in-memory value.
      }
      return next;
    });
  };

  const profile = [
    ['Name', user?.name],
    ['Email', user?.email],
    ['Role', user?.role],
    ['Organization', user?.org],
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="settings-title" className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" /> Settings
          </h2>
          <button onClick={onClose} aria-label="Close settings" className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <section className="mb-6">
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" /> Profile
          </h3>
          <dl className="bg-slate-50 border border-slate-200 rounded-lg divide-y divide-slate-200">
            {profile.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-4 py-2 text-sm">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold text-slate-900 text-right break-all">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mb-6">
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </h3>
          <div className="space-y-3">
            {NOTIFICATION_OPTIONS.map((opt) => (
              <div key={opt.key} className="flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                  <span className="block text-xs text-slate-500">{opt.help}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[opt.key]}
                  aria-label={opt.label}
                  onClick={() => toggle(opt.key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition ${prefs[opt.key] ? 'bg-emerald-600' : 'bg-slate-300'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition ${prefs[opt.key] ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Preferences are saved in this browser.</p>
        </section>

        <button
          onClick={onSignOut}
          className="w-full px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-semibold transition text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
