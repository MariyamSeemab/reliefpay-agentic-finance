import React from 'react';

export const PieChart = ({ data, title, size = 200 }) => {
  if (!data || data.length === 0) return null;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -Math.PI / 2;

  const slices = data.map((item, index) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const startX = size + size * Math.cos(startAngle);
    const startY = size + size * Math.sin(startAngle);
    const endX = size + size * Math.cos(endAngle);
    const endY = size + size * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const path = [
      `M ${size} ${size}`,
      `L ${startX} ${startY}`,
      `A ${size} ${size} 0 ${largeArc} 1 ${endX} ${endY}`,
      'Z',
    ].join(' ');

    currentAngle += sliceAngle;

    return { path, color: item.color, label: item.label, percentage: Math.round((item.value / total) * 100) };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-4">{title}</h3>

      <div className="flex items-center justify-center">
        <svg width={size * 2} height={size * 2} viewBox={`0 0 ${size * 2} ${size * 2}`}>
          {slices.map((slice, index) => (
            <path
              key={`slice-${index}`}
              d={slice.path}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 space-y-2">
        {slices.map((slice, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-3 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: slice.color }}
            ></div>
            <span className="text-slate-600">{slice.label}</span>
            <span className="font-bold text-slate-900 ml-auto">{slice.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
