import React, { useState } from 'react';
import { Heart, Share2, MapPin, Calendar, Users, TrendingUp, AlertCircle, CheckCircle, Zap } from 'lucide-react';

export const CampaignDetail = ({ campaign, onClose }) => {
  const [donated, setDonated] = useState(false);
  const progressPercentage = Math.min(100, Math.round((campaign.raisedAmount / campaign.targetAmount) * 100));
  const remainingAmount = campaign.targetAmount - campaign.raisedAmount;
  const daysRemaining = 15; // Mock value

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="inline-block bg-white/20 px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase mb-3 backdrop-blur-sm border border-white/30">
              {campaign.disasterType}
            </span>
            <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
            <div className="flex items-center gap-2 text-emerald-100">
              <MapPin className="w-4 h-4" />
              <span>{campaign.location}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            ✕
          </button>
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-slate-600 font-semibold">Raised</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{campaign.raisedAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">{progressPercentage}% of goal</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-600" />
            <p className="text-xs text-slate-600 font-semibold">Target</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{campaign.targetAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-2">Remaining: ₹{remainingAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-slate-600 font-semibold">Beneficiaries</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{campaign.beneficiariesCount}</p>
          <p className="text-xs text-slate-500 mt-2">People helped so far</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-slate-600 font-semibold">Time Left</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{daysRemaining}</p>
          <p className="text-xs text-slate-500 mt-2">days remaining</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Campaign Progress</h3>
          <span className="text-2xl font-bold text-[#087E83]">{progressPercentage}%</span>
        </div>
        <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#087E83] to-[#16845B] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-slate-600 mt-3">
          {campaign.raisedAmount.toLocaleString()} of {campaign.targetAmount.toLocaleString()} collected
        </p>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Campaign Overview</h3>
        <p className="text-slate-700 leading-relaxed mb-6">{campaign.description}</p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 text-sm mb-1">Real-time Impact</p>
            <p className="text-sm text-blue-800">Every donation is tracked and verified. You'll see exactly how your contribution helps families recover.</p>
          </div>
        </div>
      </div>

      {/* Donation Action */}
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-50 rounded-2xl p-6 border border-emerald-200 space-y-4">
        <h3 className="font-bold text-slate-900">Support This Campaign</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1000, 5000, 10000, 25000].map((amount) => (
            <button
              key={amount}
              className="border-2 border-emerald-300 hover:bg-emerald-100 text-emerald-900 font-bold py-3 rounded-lg text-sm transition"
            >
              ₹{(amount / 1000).toFixed(0)}K
            </button>
          ))}
        </div>

        <button
          onClick={() => setDonated(true)}
          className="w-full bg-gradient-to-r from-[#087E83] to-[#16845B] hover:shadow-lg text-white font-bold py-4 rounded-lg text-base transition flex items-center justify-center gap-2"
        >
          <Heart className="w-5 h-5" />
          Donate Now
        </button>

        {donated && (
          <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Thank you for your donation!</p>
              <p className="text-sm text-emerald-800">Your contribution will help families in need. You'll receive updates on the campaign's impact.</p>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Campaign Timeline</h3>
        <div className="space-y-4">
          {[
            { date: 'Aug 1, 2026', event: 'Campaign Launched', status: 'completed' },
            { date: 'Oct 15, 2026', event: 'Fundraising Ongoing', status: 'active' },
            { date: 'Nov 30, 2026', event: 'Final Disbursement', status: 'pending' },
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                item.status === 'completed' ? 'bg-emerald-100 border-emerald-600' :
                item.status === 'active' ? 'bg-blue-100 border-blue-600' :
                'bg-slate-100 border-slate-400'
              }`}>
                {item.status === 'completed' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{item.event}</p>
                <p className="text-xs text-slate-500">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share */}
      <div className="flex gap-3">
        <button className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-900 font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition">
          <Share2 className="w-4 h-4" />
          Share Campaign
        </button>
      </div>
    </div>
  );
};
