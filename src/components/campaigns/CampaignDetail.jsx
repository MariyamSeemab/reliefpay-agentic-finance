import React, { useState } from 'react';
import { Heart, Share2, MapPin, Calendar, Users, TrendingUp, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { PayPalDonateButtons } from './PayPalDonateButtons';

const PRESET_AMOUNTS = [10, 25, 50, 100];

export const CampaignDetail = ({ campaign, onClose, onCampaignUpdated }) => {
  const [donated, setDonated] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const donationAmount = customAmount !== '' ? Math.round(Number(customAmount) * 100) / 100 : selectedAmount;
  const currency = campaign.currency || 'USD';

  const handleDonated = (updatedCampaign, donation) => {
    setDonated(donation);
    onCampaignUpdated?.(updatedCampaign);
  };
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
          <p className="text-2xl font-bold text-slate-900">{formatMoney(campaign.raisedAmount, currency)}</p>
          <p className="text-xs text-slate-500 mt-2">{progressPercentage}% of goal</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-red-600" />
            <p className="text-xs text-slate-600 font-semibold">Target</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatMoney(campaign.targetAmount, currency)}</p>
          <p className="text-xs text-slate-500 mt-2">Remaining: {formatMoney(remainingAmount, currency)}</p>
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
          {formatMoney(campaign.raisedAmount, currency)} of {formatMoney(campaign.targetAmount, currency)} collected
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
          {PRESET_AMOUNTS.map((amount) => {
            const isSelected = customAmount === '' && selectedAmount === amount;
            return (
              <button
                key={amount}
                type="button"
                onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                className={`border-2 font-bold py-3 rounded-lg text-sm transition ${
                  isSelected
                    ? 'border-[#087E83] bg-[#087E83] text-white'
                    : 'border-emerald-300 hover:bg-emerald-100 text-emerald-900'
                }`}
              >
                {formatMoney(amount, currency)}
              </button>
            );
          })}
        </div>

        <div>
          <label htmlFor="custom-amount" className="block text-xs font-semibold text-slate-600 mb-1">
            Or enter a custom amount ({currency})
          </label>
          <input
            id="custom-amount"
            type="number"
            min="1"
            step="0.01"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="e.g. 40"
            className="w-full px-4 py-2.5 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Heart className="w-4 h-4 text-[#087E83]" />
          <span>
            Donating <strong>{formatMoney(Number.isFinite(donationAmount) ? donationAmount : 0, currency)}</strong> via PayPal sandbox
          </span>
        </div>

        <PayPalDonateButtons campaign={campaign} amount={donationAmount} onDonated={handleDonated} />

        {donated && (
          <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-4 flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Thank you for your donation!</p>
              <p className="text-sm text-emerald-800">
                {formatMoney(donated.amount, donated.currency)} was captured by PayPal
                {donated.paypalCaptureId ? <> (capture <span className="font-mono">{donated.paypalCaptureId}</span>)</> : null}.
                Your contribution will help families in need.
              </p>
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
