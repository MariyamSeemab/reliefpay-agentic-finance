import React, { useState } from 'react';
import { X, Heart, MapPin, Target } from 'lucide-react';

export const LaunchCampaignModal = ({ isOpen, onClose, onLaunch }) => {
  const [formData, setFormData] = useState({
    title: '',
    disasterType: 'Flood Relief',
    location: '',
    targetAmount: '',
    description: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newCampaign = {
      id: `cmp-${Date.now()}`,
      ...formData,
      targetAmount: parseInt(formData.targetAmount),
      raisedAmount: 0,
      disbursedAmount: 0,
      status: 'ACTIVE',
      beneficiariesCount: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
      coordinates: [19.1796, 73.0231], // Default coordinates
    };

    onLaunch(newCampaign);
    setFormData({
      title: '',
      disasterType: 'Flood Relief',
      location: '',
      targetAmount: '',
      description: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#123B4A] to-[#087E83] p-6 text-white flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6" />
            Launch New Campaign
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Campaign Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Campaign Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Monsoon Relief 2026"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Disaster Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Disaster Type
            </label>
            <select
              name="disasterType"
              value={formData.disasterType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none"
            >
              <option>Flood Relief</option>
              <option>Earthquake Recovery</option>
              <option>Landslide & Flood</option>
              <option>Riverine Flooding</option>
              <option>Storm Damage</option>
              <option>Other Emergency</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Mumbai, Maharashtra"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Target Amount (USD)
            </label>
            <input
              type="number"
              name="targetAmount"
              value={formData.targetAmount}
              onChange={handleChange}
              placeholder="5000"
              min="100"
              step="100"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Campaign Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the relief effort and impact..."
              rows="4"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#087E83] focus:border-transparent outline-none resize-none"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#123B4A] to-[#087E83] text-white font-bold rounded-lg hover:shadow-lg transition"
            >
              Launch Campaign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
