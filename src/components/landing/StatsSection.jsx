import React from 'react';
import { TrendingUp, Users, Target, Clock, ArrowUp } from 'lucide-react';

export const StatsSection = () => {
  const stats = [
    { icon: TrendingUp, label: 'Total Distributed', value: '₹5.2 Crores', change: '+23% this month', color: 'emerald' },
    { icon: Users, label: 'Active Beneficiaries', value: '1,240+', change: '+156 this week', color: 'blue' },
    { icon: Target, label: 'Verification Rate', value: '98.5%', change: 'Highly accurate', color: 'purple' },
    { icon: Clock, label: 'Avg Payout Time', value: '2.3 hrs', change: 'Faster than bank transfers', color: 'orange' },
  ];

  const colorConfig = {
    emerald: { bg: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
    blue: { bg: 'from-blue-50 to-blue-100/50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    purple: { bg: 'from-purple-50 to-purple-100/50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700' },
    orange: { bg: 'from-orange-50 to-orange-100/50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-bold text-slate-900">Proven Impact & Results</h2>
        <p className="text-lg text-slate-600">Real data showing real lives changed</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const colors = colorConfig[stat.color];
          return (
            <div key={idx} className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-8 border ${colors.border} hover:shadow-lg transition transform hover:-translate-y-1`}>
              <div className="flex items-start justify-between mb-6">
                <div className={`w-12 h-12 ${colors.icon} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1 ${colors.badge} px-2 py-1 rounded-lg text-xs font-semibold`}>
                  <ArrowUp className="w-3 h-3" />
                  {idx === 2 ? stat.change : `+${(idx + 1) * 5}%`}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-600">{stat.change}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
