'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, Info } from 'lucide-react';
import { TimelineTrendPoint, AnalyticsDateRange } from '@/lib/analytics/types';

interface TimelineTrendChartProps {
  trendData: TimelineTrendPoint[];
  dateRange: AnalyticsDateRange;
  totalFiltered: number;
}

export const TimelineTrendChart: React.FC<TimelineTrendChartProps> = ({
  trendData,
  dateRange,
  totalFiltered,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<TimelineTrendPoint | null>(null);

  // Calculate SVG dimensions and scale coordinates
  const { points, pathD, areaD } = useMemo(() => {
    if (trendData.length === 0) {
      return { points: [], pathD: '', areaD: '' };
    }

    const counts = trendData.map((d) => d.count);
    const max = Math.max(...counts, 4); // ensure min scale of at least 4

    const width = 800;
    const height = 220;
    const paddingX = 30;
    const paddingTop = 20;
    const paddingBottom = 30;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingTop - paddingBottom;

    const numPoints = trendData.length;
    const stepX = numPoints > 1 ? chartWidth / (numPoints - 1) : 0;

    const computedPoints = trendData.map((d, i) => {
      const x = paddingX + i * stepX;
      const y = paddingTop + chartHeight - (d.count / max) * chartHeight;
      return { ...d, x, y };
    });

    // Build SVG path
    let pathString = '';
    computedPoints.forEach((p, idx) => {
      if (idx === 0) {
        pathString += `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      } else {
        // Subtle curve control
        const prev = computedPoints[idx - 1];
        const cpX1 = prev.x + (p.x - prev.x) / 2;
        const cpX2 = prev.x + (p.x - prev.x) / 2;
        pathString += ` C ${cpX1.toFixed(1)} ${prev.y.toFixed(1)}, ${cpX2.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      }
    });

    const groundY = paddingTop + chartHeight;
    const firstX = computedPoints[0].x;
    const lastX = computedPoints[computedPoints.length - 1].x;
    const areaString = `${pathString} L ${lastX.toFixed(1)} ${groundY.toFixed(1)} L ${firstX.toFixed(1)} ${groundY.toFixed(1)} Z`;

    return {
      points: computedPoints,
      pathD: pathString,
      areaD: areaString,
    };
  }, [trendData]);

  const rangeLabel =
    dateRange === '7d'
      ? 'Daily Submissions (Past 7 Days)'
      : dateRange === '30d'
      ? 'Daily Submissions (Past 30 Days)'
      : dateRange === '90d'
      ? 'Daily Submissions (Past 90 Days)'
      : 'Submissions Timeline';

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-navy-950 border border-navy-800 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-navy-800">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-teal-400" />
          <h3 className="text-sm font-bold text-white">{rangeLabel}</h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-2.5 h-0.5 bg-civic-400 rounded-full" />
            <span>Complaint Submissions</span>
          </span>
          <span className="text-slate-500">•</span>
          <span>{trendData.length} Calendar Days</span>
        </div>
      </div>

      {/* Hover Info Tag */}
      <div className="h-7 mb-2 flex items-center justify-between text-xs px-2">
        {hoveredPoint ? (
          <div className="flex items-center gap-2 text-white animate-in fade-in-50 duration-100">
            <Calendar size={13} className="text-civic-400" />
            <span className="font-semibold">{hoveredPoint.displayDate}:</span>
            <span className="font-mono font-bold text-teal-300">
              {hoveredPoint.count} complaint{hoveredPoint.count === 1 ? '' : 's'} recorded
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500">
            Hover over timeline points to inspect exact daily complaint counts
          </span>
        )}

        <div className="text-[11px] text-slate-400 font-mono">
          Peak Day: <strong className="text-white">{Math.max(...trendData.map((d) => d.count), 0)}</strong>
        </div>
      </div>

      {/* Responsive SVG Area Chart */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 800 220"
          className="w-full h-48 sm:h-56 select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="30" y1="20" x2="770" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="30" y1="65" x2="770" y2="65" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="30" y1="110" x2="770" y2="110" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="30" y1="155" x2="770" y2="155" stroke="#1e293b" strokeDasharray="3 3" />
          <line x1="30" y1="190" x2="770" y2="190" stroke="#334155" />

          {/* Fill Area & Line Path */}
          {areaD && <path d={areaD} fill="url(#trendGradient)" />}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Points */}
          {points.map((p) => {
            const isHovered = hoveredPoint?.dateKey === p.dateKey;
            return (
              <g
                key={p.dateKey}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                {/* Hit target */}
                <rect
                  x={p.x - (trendData.length > 30 ? 6 : 12)}
                  y="10"
                  width={trendData.length > 30 ? 12 : 24}
                  height="190"
                  fill="transparent"
                />

                {/* Point dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : p.count > 0 ? 3.5 : 2}
                  fill={isHovered ? '#38bdf8' : p.count > 0 ? '#0284c7' : '#475569'}
                  stroke={isHovered ? '#ffffff' : '#0f172a'}
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-all duration-150"
                />

                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1="20"
                    x2={p.x}
                    y2="190"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* X-Axis Date Labels */}
        <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-slate-400 font-mono">
          <span>{trendData[0]?.displayDate || 'Start'}</span>
          {trendData.length > 4 && (
            <span>
              {trendData[Math.floor(trendData.length / 2)]?.displayDate}
            </span>
          )}
          <span>{trendData[trendData.length - 1]?.displayDate || 'End'}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-navy-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info size={12} className="text-slate-500" />
          <span>Dates without submissions display zero (0), reflecting factual intake data.</span>
        </div>
        <span className="font-mono">
          Total period intake: <strong className="text-white">{totalFiltered}</strong>
        </span>
      </div>
    </div>
  );
};
