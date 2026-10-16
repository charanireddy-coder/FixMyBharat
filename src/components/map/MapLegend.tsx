'use client';

import React from 'react';

export const MapLegend: React.FC = () => {
  return (
    <div className="bg-navy-950/90 backdrop-blur-md border border-navy-800 rounded-xl p-3 shadow-xl text-xs space-y-2.5 max-w-[240px]">
      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Severity Prominence
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/30" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-500/20" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>Low</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-navy-800/80">
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Civic Categories
        </span>
        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Pothole
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Garbage
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Water Leak
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400" /> Drainage
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> Streetlight
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-400" /> Footpath
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Manhole
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Other
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-navy-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded-full bg-orange-500/20 border border-orange-500 flex items-center justify-center text-[8px] font-bold text-orange-300">
          H
        </span>
        <span>Reported Hotspot Zone</span>
      </div>
    </div>
  );
};
