'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { Complaint } from '@/types';
import { getCategoryLabel, formatComplaintDate } from '@/lib/complaints';
import { HotspotCluster, isValidCoordinate } from '@/lib/map/hotspots';
import { cn } from '@/lib/utils';

export interface CivicMapProps {
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (complaint: Complaint) => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  height?: string;
  className?: string;
  showHotspots?: boolean;
  hotspotClusters?: HotspotCluster[];
  baseHref?: '/official/complaints' | '/citizen/reports';
}

// Color palettes for civic categories
const CATEGORY_COLORS: Record<string, string> = {
  pothole: '#f59e0b', // amber
  garbage: '#10b981', // emerald
  water_leakage: '#06b6d4', // cyan
  drainage: '#6366f1', // indigo
  streetlight: '#eab308', // yellow
  footpath: '#8b5cf6', // violet
  open_manhole: '#f43f5e', // rose
  other: '#64748b', // slate
};

// Border & ring styles for complaint severity
const SEVERITY_BORDER: Record<string, { border: string; ring: string; pulse: boolean }> = {
  critical: { border: '#ef4444', ring: 'rgba(239, 68, 68, 0.5)', pulse: true },
  high: { border: '#f97316', ring: 'rgba(249, 115, 22, 0.3)', pulse: false },
  medium: { border: '#fbbf24', ring: 'transparent', pulse: false },
  low: { border: '#94a3b8', ring: 'transparent', pulse: false },
};

export const CivicMap: React.FC<CivicMapProps> = ({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  defaultCenter = [17.3850, 78.4867], // Hyderabad default
  defaultZoom = 13,
  height = '580px',
  className,
  showHotspots = true,
  hotspotClusters = [],
  baseHref = '/official/complaints',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hotspotCirclesRef = useRef<any[]>([]);

  const [activePopupComplaint, setActivePopupComplaint] = useState<Complaint | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize Leaflet map instance once
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      try {
        const L = (await import('leaflet')).default;

        if (!isMounted || !mapContainerRef.current) return;

        // Create map instance
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        // Add standard OpenStreetMap tiles (no paid API key required)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
      } catch (err: unknown) {
        console.error('Failed to initialize Leaflet map:', err);
        if (isMounted) {
          setMapError('Unable to load the interactive map right now.');
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [defaultCenter, defaultZoom]);

  // Update Markers and Hotspots whenever complaints, filters, or clusters change
  useEffect(() => {
    let isMounted = true;

    async function updateMarkers() {
      const map = mapInstanceRef.current;
      if (!map) return;

      try {
        const L = (await import('leaflet')).default;
        if (!isMounted || !mapInstanceRef.current) return;

        // Clear existing complaint markers
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current.clear();

        // Clear existing hotspot circles
        hotspotCirclesRef.current.forEach((circle) => circle.remove());
        hotspotCirclesRef.current = [];

        // 1. Draw Hotspot Overlays (if enabled)
        if (showHotspots && hotspotClusters.length > 0) {
          for (const cluster of hotspotClusters) {
            const circle = L.circle(cluster.center, {
              radius: cluster.radiusMeters,
              color: '#ea580c',
              weight: 2,
              opacity: 0.8,
              dashArray: '4, 6',
              fillColor: '#f97316',
              fillOpacity: 0.16,
            }).addTo(map);

            circle.bindTooltip(
              `<strong>Reported Issue Hotspot</strong><br/>${cluster.complaintCount} reports clustered<br/>Dominant: ${getCategoryLabel(cluster.dominantCategory)}`,
              { sticky: true, className: 'hotspot-tooltip' }
            );

            hotspotCirclesRef.current.push(circle);
          }
        }

        // 2. Plot Complaint Markers
        const validCoords: [number, number][] = [];

        for (const complaint of complaints) {
          if (!isValidCoordinate(complaint.latitude, complaint.longitude)) {
            continue;
          }

          const lat = Number(complaint.latitude);
          const lng = Number(complaint.longitude);
          validCoords.push([lat, lng]);

          const catColor = CATEGORY_COLORS[complaint.category.toLowerCase()] || '#64748b';
          const sevStyle = SEVERITY_BORDER[(complaint.severity || 'medium').toLowerCase()] || SEVERITY_BORDER.medium;

          // Create custom accessible HTML divIcon
          const iconHtml = `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              <div 
                class="${sevStyle.pulse ? 'pulse-critical' : ''}"
                style="
                  width: 26px; 
                  height: 26px; 
                  border-radius: 50%; 
                  background-color: ${catColor}; 
                  border: 2.5px solid ${sevStyle.border}; 
                  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-weight: 800;
                  font-size: 11px;
                "
              >
                ${complaint.complaint_number || '•'}
              </div>
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-civic-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
          });

          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

          // Build popup HTML
          const popupHtml = `
            <div style="font-family: inherit; min-width: 220px; max-width: 280px; color: #f8fafc;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                <span style="font-family: monospace; font-size: 11px; font-weight: 800; color: #f59e0b;">
                  Report #${complaint.complaint_number}
                </span>
                <span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 9999px; background: #1e293b; color: #94a3b8; text-transform: uppercase;">
                  ${complaint.status}
                </span>
              </div>
              <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; line-height: 1.3; color: white;">
                ${complaint.title}
              </h4>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 11px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${catColor};"></span>
                <span style="font-weight: 600; color: #e2e8f0;">${getCategoryLabel(complaint.category)}</span>
                <span style="color: #64748b;">•</span>
                <span style="font-weight: 600; color: ${sevStyle.border}; text-transform: capitalize;">${complaint.severity}</span>
              </div>
              ${
                complaint.address
                  ? `<p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; line-height: 1.3;">📍 ${complaint.address}</p>`
                  : ''
              }
              <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #1e293b; padding-top: 8px; font-size: 10px; color: #64748b;">
                <span>${formatComplaintDate(complaint.created_at)}</span>
                <a 
                  href="${baseHref}/${complaint.id}" 
                  style="color: #38bdf8; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 3px;"
                >
                  View Report →
                </a>
              </div>
            </div>
          `;

          marker.bindPopup(popupHtml);

          marker.on('click', () => {
            setActivePopupComplaint(complaint);
            if (onSelectComplaint) {
              onSelectComplaint(complaint);
            }
          });

          markersRef.current.set(complaint.id, marker);
        }

        // 3. Fit bounds to all valid coordinates (Part 10)
        if (validCoords.length > 1) {
          const bounds = L.latLngBounds(validCoords);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
        } else if (validCoords.length === 1) {
          map.setView(validCoords[0], 15);
        }
      } catch (err) {
        console.warn('Error rendering markers:', err);
      }
    }

    updateMarkers();

    return () => {
      isMounted = false;
    };
  }, [complaints, showHotspots, hotspotClusters, baseHref, onSelectComplaint]);

  // Handle external selection (pan to complaint and open popup)
  useEffect(() => {
    if (!selectedComplaintId || !mapInstanceRef.current) return;

    const marker = markersRef.current.get(selectedComplaintId);
    if (marker) {
      const map = mapInstanceRef.current;
      map.panTo(marker.getLatLng(), { animate: true, duration: 0.8 });
      marker.openPopup();
    }
  }, [selectedComplaintId]);

  if (mapError) {
    return (
      <div
        style={{ height }}
        className={cn(
          'w-full rounded-2xl bg-navy-950 border border-navy-800 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3',
          className
        )}
      >
        <AlertTriangle size={32} className="text-amber-400" />
        <p className="text-sm font-semibold text-white">{mapError}</p>
        <p className="text-xs max-w-sm">The complaint list remains accessible for tracking and review.</p>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full rounded-2xl overflow-hidden border border-navy-800 shadow-xl', className)}>
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* Floating active selection card helper if needed on mobile */}
      {activePopupComplaint && (
        <div className="absolute bottom-3 left-3 right-3 sm:hidden z-10 bg-navy-950/95 backdrop-blur-md border border-navy-800 p-3 rounded-xl shadow-2xl flex items-center justify-between text-xs">
          <div className="truncate mr-2">
            <span className="font-mono text-alert-400 font-bold block text-[10px]">
              Report #{activePopupComplaint.complaint_number}
            </span>
            <span className="font-bold text-white truncate block">{activePopupComplaint.title}</span>
          </div>
          <Link
            href={`${baseHref}/${activePopupComplaint.id}`}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-civic-600 text-white font-bold text-[11px] flex items-center gap-1"
          >
            <span>Open</span>
            <ExternalLink size={11} />
          </Link>
        </div>
      )}
    </div>
  );
};
