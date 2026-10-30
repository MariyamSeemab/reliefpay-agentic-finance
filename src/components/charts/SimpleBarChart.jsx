import React from 'react';

export const SimpleBarChart = ({ data, title, height = 300 }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-6">{title}</h3>
      
      <div className="space-y-5">
        {data.map((item, index) => (
          <div key={index}>
            {/* Label and Value */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              <span className="text-sm font-bold text-slate-900">{item.value}%</span>
            </div>
            
            {/* Bar Container */}
            <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden shadow-sm">
              {/* Actual Bar */}
              <div
                className="h-full flex items-center justify-end pr-3 transition-all duration-500 rounded-full"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || '#087E83',
                }}
              >
                <span className="text-white text-xs font-bold">{item.value}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Info */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          <span className="font-semibold">Max Value:</span> {Math.max(...data.map(d => d.value))}% | 
          <span className="font-semibold ml-3">Total Campaigns:</span> {data.length}
        </p>
      </div>
    </div>
  );
};
