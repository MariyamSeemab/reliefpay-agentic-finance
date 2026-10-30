import React from 'react';

export const ProgressChart = ({ campaigns, title }) => {
  const totalTarget = campaigns.reduce((sum, c) => sum + c.targetAmount, 0);
  const totalRaised = campaigns.reduce((sum, c) => sum + c.raisedAmount, 0);
  const percentage = Math.round((totalRaised / totalTarget) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-6">{title}</h3>

      <div className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">Overall Funding Goal</span>
            <span className="text-2xl font-bold text-[#087E83]">{percentage}%</span>
          </div>
          <div className="w-full h-6 bg-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div
              className="h-full bg-gradient-to-r from-[#087E83] to-[#16845B] transition-all duration-500"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600 font-semibold">
            <span>₹{totalRaised.toLocaleString()}</span>
            <span>₹{totalTarget.toLocaleString()}</span>
          </div>
        </div>

        {/* Individual Campaign Progress */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-900">Campaign Breakdown</h4>
          {campaigns.map((campaign) => {
            const campPercentage = Math.round((campaign.raisedAmount / campaign.targetAmount) * 100);
            return (
              <div key={campaign.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-slate-700">{campaign.title}</p>
                  <span className="text-xs font-bold text-slate-900">{campPercentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                    style={{ width: `${Math.min(campPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
