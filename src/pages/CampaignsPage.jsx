import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CampaignGrid } from '../components/campaigns/CampaignGrid';
import { CampaignDetail } from '../components/campaigns/CampaignDetail';
import { INITIAL_CAMPAIGNS } from '../data/mockData';
import { Search } from 'lucide-react';

export default function CampaignsPage() {
  const { isAuthenticated } = useAuth();
  const [campaigns] = useState(INITIAL_CAMPAIGNS);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCampaigns = campaigns.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedCampaign) {
    return (
      <div className="min-h-screen bg-[#F6F8F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CampaignDetail campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Relief Campaigns</h1>
            <p className="text-slate-600 mt-2">Support ongoing disaster relief efforts. Every contribution helps families rebuild their lives.</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none text-slate-900"
            />
          </div>
        </div>

        {/* Campaign Grid */}
        {isAuthenticated ? (
          <CampaignGrid campaigns={filteredCampaigns} onSelectCampaign={setSelectedCampaign} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">Please login to view and support campaigns</p>
            <a href="/login" className="inline-block bg-[#087E83] hover:bg-[#123B4A] text-white font-bold px-6 py-3 rounded-lg transition">
              Sign In
            </a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-8 border border-blue-200">
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900 mb-2">{campaigns.length}</p>
            <p className="text-slate-600">Active Campaigns</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900 mb-2">
              {campaigns.reduce((sum, c) => sum + c.beneficiariesCount, 0).toLocaleString()}+
            </p>
            <p className="text-slate-600">Beneficiaries Helped</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900 mb-2">
              ₹{campaigns.reduce((sum, c) => sum + c.raisedAmount, 0).toLocaleString().slice(0, -3)}Cr
            </p>
            <p className="text-slate-600">Total Raised</p>
          </div>
        </div>
      </div>
    </div>
  );
}
