import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface RouteMapProps {
  positions: Array<{ lat: number; lng: number }>;
  isTracking: boolean;
  currentPosition: { lat: number; lng: number } | null;
}

interface MapInstance {
  map: google.maps.Map;
  polyline: google.maps.Polyline;
  currentMarker: google.maps.marker.AdvancedMarkerElement | null;
  isInitialized: boolean;
}

declare global {
  interface Window {
    google?: typeof google;
  }
}

export default function RouteMap({
  positions,
  isTracking,
  currentPosition,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance>({
    map: null as any,
    polyline: null as any,
    currentMarker: null,
    isInitialized: false,
  });
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptLoaded = useRef(false);

  // Load Google Maps API dynamically
  useEffect(() => {
    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    if (scriptLoaded.current) {
      setMapReady(true);
      return;
    }

    const loadScript = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoaded.current = true;
        setMapReady(true);
      };
      script.onerror = () => {
        setError('Failed to load Google Maps');
      };
      document.head.appendChild(script);
    };

    loadScript();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapReady || !containerRef.current || mapRef.current.isInitialized) return;

    const defaultCenter = currentPosition || { lat: 42.1181, lng: -8.8486 }; // Baiona (Camino Português start)

    try {
      const map = new google.maps.Map(containerRef.current, {
        zoom: 15,
        center: defaultCenter,
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
      });

      const polyline = new google.maps.Polyline({
        path: positions,
        geodesic: true,
        strokeColor: '#5A5A40',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map,
        clickable: false,
      });

      mapRef.current.map = map;
      mapRef.current.polyline = polyline;
      mapRef.current.isInitialized = true;

      // Add Weather Layer if API key is present
      const weatherApiKey = (import.meta as any).env.VITE_OPENWEATHER_API_KEY;
      if (weatherApiKey) {
        const weatherLayer = new google.maps.ImageMapType({
          getTileUrl: function(coord, zoom) {
            return `https://tile.openweathermap.org/map/precipitation_new/${zoom}/${coord.x}/${coord.y}.png?appid=${weatherApiKey}`;
          },
          tileSize: new google.maps.Size(256, 256),
          maxZoom: 18,
          name: "Precipitation",
          opacity: 0.6
        });
        map.overlayMapTypes.insertAt(0, weatherLayer);
      }
    } catch (err) {
      setError('Failed to initialize map');
      console.error(err);
    }
  }, [mapReady]);

  // Update route polyline as new positions are added
  useEffect(() => {
    if (!mapRef.current.isInitialized || !mapRef.current.polyline) return;

    mapRef.current.polyline.setPath(positions);

    // Fit bounds to show all positions
    if (positions.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      positions.forEach((pos) => {
        bounds.extend(new google.maps.LatLng(pos.lat, pos.lng));
      });
      mapRef.current.map.fitBounds(bounds, 50);
    }
  }, [positions]);

  // Update current position marker
  useEffect(() => {
    if (!mapRef.current.isInitialized || !currentPosition) return;

    const { lat, lng } = currentPosition;

    if (!mapRef.current.currentMarker) {
      // Create new marker
      mapRef.current.currentMarker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current.map,
        position: { lat, lng },
        title: 'Current Location',
        content: createCurrentPositionMarker(),
      });
    } else {
      // Update existing marker
      mapRef.current.currentMarker.position = { lat, lng };
    }

    // Center map on current position
    if (isTracking) {
      mapRef.current.map.panTo({ lat, lng });
    }
  }, [currentPosition, isTracking]);

  const createCurrentPositionMarker = () => {
    const div = document.createElement('div');
    div.className = 'relative flex items-center justify-center';
    div.innerHTML = `
      <div class="absolute inset-0 bg-blue-400 rounded-full opacity-25 animate-pulse" style="width: 32px; height: 32px;"></div>
      <div class="relative w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
    `;
    return div;
  };

  if (error) {
    return (
      <div className="bg-white rounded-[32px] p-8 shadow-lg border border-[#5A5A40]/5 h-[400px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#5A5A40] font-serif font-bold text-lg mb-2">Map Unavailable</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-[#5A5A40]/5"
    >
      <div className="relative h-[400px] w-full">
        <div
          ref={containerRef}
          className="w-full h-full rounded-[32px]"
          style={{ background: '#f5f5f0' }}
        />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f0]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin" />
              <p className="text-[#5A5A40]/60 text-sm font-medium">Loading map...</p>
            </div>
          </div>
        )}
        {isTracking && positions.length > 0 && (
          <div className="absolute top-4 left-4 bg-white rounded-full px-4 py-2 shadow-lg">
            <p className="text-[#5A5A40] font-bold text-sm">
              {positions.length} waypoint{positions.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
