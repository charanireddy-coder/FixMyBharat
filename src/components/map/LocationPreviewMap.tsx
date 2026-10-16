'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isValidCoordinate } from '@/lib/map/hotspots';

export interface LocationPreviewMapProps {
  latitude: number | null;
  longitude: number | null;
  onCoordinatesChange?: (lat: number, lng: number) => void;
  height?: string;
}

export const LocationPreviewMap: React.FC<LocationPreviewMapProps> = ({
  latitude,
  longitude,
  onCoordinatesChange,
  height = '200px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  const hasValidCoords = isValidCoordinate(latitude, longitude);

  // Initialize or update map
  useEffect(() => {
    let isMounted = true;

    async function setupMap() {
      if (!mapContainerRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      const center: [number, number] = hasValidCoords
        ? [Number(latitude), Number(longitude)]
        : [17.3850, 78.4867];

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center,
          zoom: hasValidCoords ? 15 : 12,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
        }).addTo(map);

        // Click to update coordinates
        if (onCoordinatesChange) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.on('click', (e: any) => {
            const lat = Math.round(e.latlng.lat * 100000) / 100000;
            const lng = Math.round(e.latlng.lng * 100000) / 100000;
            onCoordinatesChange(lat, lng);
          });
        }

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      if (hasValidCoords) {
        const markerPos: [number, number] = [Number(latitude), Number(longitude)];
        map.setView(markerPos, 15);

        if (!markerRef.current) {
          const pinIcon = L.divIcon({
            html: `
              <div style="width: 24px; height: 24px; border-radius: 50%; background: #ea580c; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: white;"></div>
              </div>
            `,
            className: 'preview-location-pin',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          markerRef.current = L.marker(markerPos, { icon: pinIcon }).addTo(map);
        } else {
          markerRef.current.setLatLng(markerPos);
        }
      } else if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }

    setupMap();

    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, hasValidCoords, onCoordinatesChange]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Explicit user-triggered geolocation (Part 13)
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoNotice('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Math.round(pos.coords.latitude * 100000) / 100000;
        const lng = Math.round(pos.coords.longitude * 100000) / 100000;
        if (onCoordinatesChange) {
          onCoordinatesChange(lat, lng);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoNotice('Location permission was denied. You can still enter your address manually.');
        } else {
          setGeoNotice('Unable to acquire current location. Please enter coordinates or address manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <MapPin size={13} className="text-alert-600" />
          <span>Interactive Location Pin</span>
        </span>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleDetectLocation}
          disabled={isLocating}
          leftIcon={<Navigation size={12} className={isLocating ? 'animate-spin' : ''} />}
          className="text-xs py-1 h-auto"
        >
          {isLocating ? 'Detecting...' : 'Use My GPS Location'}
        </Button>
      </div>

      {geoNotice && (
        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-1.5">
          <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <span>{geoNotice}</span>
        </div>
      )}

      <div
        className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner relative bg-slate-100"
        style={{ height }}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-slate-600 border border-slate-200 font-medium shadow-sm">
          {hasValidCoords
            ? `Pin: ${latitude}, ${longitude} (Click map to reposition)`
            : 'Click on map or enter coordinates to set location pin'}
        </div>
      </div>
    </div>
  );
};
