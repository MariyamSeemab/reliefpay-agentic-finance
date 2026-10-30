import React, { useState } from 'react';
import { Heart, TrendingUp, Award, Calendar, BarChart3, Download } from 'lucide-react';
import { INITIAL_DONATIONS, INITIAL_CAMPAIGNS } from '../../data/mockData';

export const DonorDashboard = ({ currentUser }) => {
  const [donations] = useState(INITIAL_DONATIONS);
  const [campaigns] = useState(INITIAL_CAMPAIGNS);

  const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
  const beneficiariesHelped = 450; // Mock value
  const impactPercentage = 87; // Mock value

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {currentUser?.name}</h1>
        <p className="text-emerald-100">Your donations are making a real difference. Track your impact below.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Heart className="w-8 h-8 text-red-500" />
            <span className="text-xs font-semibold bg-red-50 text-red-700 px-2 py-1 rounded">Lifetime</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">Total Donated</p>
          <p className="text-2xl font-bold text-slate-900">₹{totalDonated.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Award className="w-8 h-8 text-yellow-500" />
            <span className="text-xs font-semibold bg-yellow-50 text-yellow-700 px-2 py-1 rounded">This Month</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">Beneficiaries Helped</p>
          <p className="text-2xl font-bold text-slate-900">{beneficiariesHelped}+</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded">Verified</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">Impact Score</p>
          <p className="text-2xl font-bold text-slate-900">{impactPercentage}%</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 text-purple-500" />
            <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2 py-1 rounded">Active</span>
          </div>
          <p className="text-xs text-slate-600 mb-1">Active Donations</p>
          <p className="text-2xl font-bold text-slate-900">{donations.length}</p>
        </div>
      </div>

      {/* Donation History & Active Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Donations */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Recent Donations</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {donations.slice(0, 5).map((donation) => (
              <div key={donation.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{donation.campaignTitle}</p>
                  <p className="text-xs text-slate-500">{donation.timestamp}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">₹{donation.amount.toLocaleString()}</p>
                  <p className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded inline-block mt-1">{donation.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Statistics */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-lg">Your Statistics</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Donation Distribution</span>
                <span className="text-sm font-bold text-slate-900">₹{totalDonated.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200">
              <div className="text-center">
                <p className="text-xs text-slate-500">Health</p>
                <p className="text-sm font-bold text-slate-900">23%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Housing</p>
                <p className="text-sm font-bold text-slate-900">45%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Food</p>
                <p className="text-sm font-bold text-slate-900">32%</p>
              </div>
            </div>
          </div>

          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Download Tax Receipt
          </button>
        </div>
      </div>

      {/* Featured Campaigns to Support */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Recommended Campaigns</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {campaigns.slice(0, 3).map((campaign) => {
            const pct = Math.min(100, Math.round((campaign.raisedAmount / campaign.targetAmount) * 100));
            return (
              <div key={campaign.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-blue-50 text-blue-700">
                      {campaign.disasterType}
                    </span>
                    <span className="text-xs text-slate-500">{campaign.location}</span>
                  </div>
                  <h3 className="font-bold text-slate-900">{campaign.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{campaign.description}</p>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>₹{campaign.raisedAmount.toLocaleString()}</span>
                    <span className="text-slate-500">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>

                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg text-sm transition">
                  Support Campaign
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
