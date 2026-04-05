import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapIcon, MapPin, Coffee, Bed, CloudRain } from 'lucide-react';

interface ComponentProps {}

// Mock data strictly for Beta Preview
const MOCK_CAMINO_PATH = [
  { lat: 42.1181, lng: -8.8486 }, // Baiona
  { lat: 42.1462, lng: -8.8105 }, // Nigran area
  { lat: 42.2406, lng: -8.7207 }, // Vigo
  { lat: 42.2831, lng: -8.6083 }, // Redondela
  { lat: 42.4338, lng: -8.6475 }, // Pontevedra
  { lat: 42.6027, lng: -8.6436 }, // Caldas de Reis
  { lat: 42.7380, lng: -8.6601 }, // Padron
  { lat: 42.8805, lng: -8.5456 }, // Santiago de Compostela
];

const MOCK_MARKERS = [
  { id: 'h1', lat: 42.1181, lng: -8.8486, title: 'Hotel Baiona (Arrival)', type: 'hotel', desc: 'Starting point for the Coastal route.' },
  { id: 'h2', lat: 42.2406, lng: -8.7207, title: 'Hotel NH Collection Vigo', type: 'hotel', desc: 'Booking for April 5.' },
  { id: 'h3', lat: 42.4338, lng: -8.6475, title: 'Parador de Pontevedra', type: 'hotel', desc: 'Booking for April 7.' },
  { id: 'f1', lat: 42.7380, lng: -8.6601, title: 'Pulpería Rial', type: 'food', desc: 'Famous for Pimientos de Padrón.' },
  { id: 'p1', lat: 42.8805, lng: -8.5456, title: 'Cathedral of Santiago', type: 'landmark', desc: 'The Pilgrim\'s Goal!' },
];

export default function CaminoPreviewMap() {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeWeatherNode, setActiveWeatherNode] = useState<{city: string, text: string} | null>(null);

  useEffect(() => {
    // Rely on RouteMap's injection or if doing alone, ensure maps logic
    if (!window.google) return;
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 42.49, lng: -8.69 }, // Center between Baiona and Santiago
        zoom: 10,
        mapTypeId: 'terrain',
        disableDefaultUI: true,
      });

      const routeLine = new google.maps.Polyline({
        path: MOCK_CAMINO_PATH,
        geodesic: true,
        strokeColor: '#5A5A40',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map: map,
      });

      // Simple mock markers
      MOCK_MARKERS.forEach(mark => {
        new google.maps.Marker({
          position: { lat: mark.lat, lng: mark.lng },
          map: map,
          title: mark.title,
          label: mark.type === 'hotel' ? '🛏️' : mark.type === 'food' ? '🍽️' : '⛪',
        }).addListener('click', () => {
          setActiveWeatherNode({
            city: mark.title,
            text: mark.desc + (mark.type === 'landmark' ? ' Historic April temp: 50-60°F, Expect spring rain.' : '')
          });
        });
      });
    } catch (e) {
      console.error('Map Preview init error:', e);
    }
  }, [mapReady]);

  return (
    <div className="relative w-full h-[600px] bg-[#f5f5f0] rounded-[32px] overflow-hidden shadow-xl border border-[#5A5A40]/10">
      <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur px-6 py-4 rounded-3xl shadow-lg border border-white/20 max-w-sm">
        <h3 className="font-serif font-bold text-[#5A5A40] flex items-center gap-2 mb-2">
          <MapIcon size={20} />
          Camino Português Beta Preview
        </h3>
        <p className="text-sm text-gray-600 mb-2">Route Baiona → Santiago de Compostela.</p>
        <div className="flex flex-wrap gap-2 text-xs">
           <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded-full flex gap-1 items-center"><Bed size={12}/> Hotels</span>
           <span className="bg-orange-50 text-orange-800 px-2 py-1 rounded-full flex gap-1 items-center"><Coffee size={12}/> Food</span>
           <span className="bg-purple-50 text-purple-800 px-2 py-1 rounded-full flex gap-1 items-center"><MapPin size={12}/> Landmark</span>
        </div>
      </div>

      <div ref={mapRef} className="w-full h-full" />

      {activeWeatherNode && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-6 left-6 z-10 bg-[#5A5A40] text-white px-6 py-4 rounded-[24px] shadow-2xl max-w-sm flex items-start gap-4"
        >
          <div className="bg-white/10 p-2 rounded-xl">
            <CloudRain size={24} className="text-blue-200" />
          </div>
          <div>
            <h4 className="font-bold font-serif">{activeWeatherNode.city}</h4>
            <p className="text-sm opacity-90 mt-1">{activeWeatherNode.text}</p>
            <button 
              onClick={() => setActiveWeatherNode(null)}
              className="mt-3 text-xs uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
