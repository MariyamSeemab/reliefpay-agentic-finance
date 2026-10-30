import React, { useState } from 'react';
import { Heart, MapPin, Users, Calendar, TrendingUp } from 'lucide-react';

export const CampaignGrid = ({ campaigns, onSelectCampaign }) => {
  const [filter, setFilter] = useState('ALL');

  const filteredCampaigns = filter === 'ALL' 
    ? campaigns 
    : campaigns.filter(c => c.disasterType === filter);

  const disasterTypes = ['ALL', ...new Set(campaigns.map(c => c.disasterType))];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {disasterTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
              filter === type
                ? 'bg-[#087E83] text-white'
                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => {
          const progressPercentage = Math.min(100, Math.round((campaign.raisedAmount / campaign.targetAmount) * 100));
          const remainingAmount = campaign.targetAmount - campaign.raisedAmount;

          return (
            <button
              key={campaign.id}
              onClick={() => onSelectCampaign(campaign)}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition overflow-hidden group text-left"
            >
              {/* Header */}
              <div className="p-6 space-y-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="inline-block bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold uppercase px-2 py-1 rounded">
                    {campaign.disasterType}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    campaign.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-50 text-slate-700'
                  }`}>
                    {campaign.status}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 group-hover:text-[#087E83] transition text-base leading-tight">
                  {campaign.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2">{campaign.description}</p>
              </div>

              {/* Location & Beneficiaries */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{campaign.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>{campaign.beneficiariesCount} beneficiaries helped</span>
                </div>
              </div>

              {/* Progress */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Raised</p>
                    <p className="font-bold text-slate-900">₹{campaign.raisedAmount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 mb-1">Remaining</p>
                    <p className="font-bold text-slate-900">₹{remainingAmount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#087E83] to-[#16845B]"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-600 text-right">{progressPercentage}% funded</p>
                </div>

                <button className="w-full mt-4 bg-[#087E83] hover:bg-[#123B4A] text-white font-bold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 group-hover:shadow-md">
                  <Heart className="w-4 h-4" />
                  View & Support
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600">No campaigns found for the selected filter.</p>
        </div>
      )}
    </div>
  );
};
