import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Star, Navigation2, Clock, AlertCircle } from 'lucide-react';

interface NearbyPlacesProps {
  currentPosition: { lat: number; lng: number } | null;
}

interface Place {
  id: string;
  name: string;
  rating: number | null;
  distance: number; // in meters
  isOpen: boolean | null;
  address: string;
  types: string[];
  location: { lat: number; lng: number };
}

type CategoryType = 'restaurant' | 'lodging' | 'church' | 'pharmacy' | 'water';

interface Category {
  id: CategoryType;
  label: string;
  types: string[];
  emoji: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'restaurant',
    label: 'Food',
    types: ['restaurant', 'cafe', 'bakery'],
    emoji: '\u{1F37D}\u{FE0F}',
  },
  {
    id: 'lodging',
    label: 'Lodging',
    types: ['lodging', 'hostel'],
    emoji: '\u{1F3E8}',
  },
  {
    id: 'church',
    label: 'Churches',
    types: ['church', 'chapel'],
    emoji: '\u{26EA}',
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    types: ['pharmacy'],
    emoji: '\u{1F48A}',
  },
  {
    id: 'water',
    label: 'Water',
    types: ['water_fountain', 'drinking_water'],
    emoji: '\u{1F4A7}',
  },
];

declare global {
  interface Window {
    google?: typeof google;
  }
}

export default function NearbyPlaces({ currentPosition }: NearbyPlacesProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('restaurant');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);
  const scriptLoaded = useRef(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Load Google Maps API
  useEffect(() => {
    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setError('Google Maps API key not configured');
      return;
    }

    if (scriptLoaded.current) return;

    const loadScript = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        scriptLoaded.current = true;
        // Create a hidden map for the PlacesService
        const hiddenDiv = document.createElement('div');
        hiddenDiv.style.display = 'none';
        document.body.appendChild(hiddenDiv);

        const map = new google.maps.Map(hiddenDiv, {
          center: currentPosition || { lat: 42.8125, lng: -1.6458 },
          zoom: 15,
        });
        mapRef.current = map;
        serviceRef.current = new google.maps.places.PlacesService(map);
      };
      script.onerror = () => {
        setError('Failed to load Google Maps');
      };
      document.head.appendChild(script);
    };

    loadScript();
  }, []);

  // Fetch nearby places when category or position changes
  useEffect(() => {
    if (!currentPosition || !serviceRef.current) return;

    setLoading(true);
    setError(null);

    const category = CATEGORIES.find((c) => c.id === activeCategory);
    if (!category) return;

    const requests = category.types.map((type) =>
      new Promise<Place[]>((resolve) => {
        const request: google.maps.places.PlacesNearbyRequest = {
          location: currentPosition,
          radius: 2000, // 2km radius
          type: type as any,
          rankBy: undefined,
        };

        serviceRef.current!.nearbySearch(
          request,
          (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const places = results.slice(0, 10).map((place) => ({
                id: place.place_id || Math.random().toString(),
                name: place.name || 'Unknown',
                rating: place.rating || null,
                distance: calculateDistance(
                  currentPosition.lat,
                  currentPosition.lng,
                  place.geometry?.location?.lat() || 0,
                  place.geometry?.location?.lng() || 0
                ),
                isOpen: place.opening_hours?.isOpen() ?? null,
                address: place.vicinity || '',
                types: place.types || [],
                location: {
                  lat: place.geometry?.location?.lat() || 0,
                  lng: place.geometry?.location?.lng() || 0,
                },
              }));
              resolve(places);
            } else {
              resolve([]);
            }
          }
        );
      })
    );

    Promise.all(requests)
      .then((results) => {
        const merged = results
          .flat()
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 15);
        setPlaces(merged);
      })
      .catch(() => {
        setError('Failed to fetch nearby places');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentPosition, activeCategory]);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const openInMaps = (place: Place) => {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(place.name)}/@${place.location.lat},${place.location.lng},15z`;
    window.open(url, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-white rounded-[32px] p-8 shadow-xl border border-[#5A5A40]/5"
    >
      <div className="flex items-center gap-3 mb-6">
        <MapPin size={24} className="text-[#5A5A40]" />
        <h3 className="text-2xl font-bold text-[#5A5A40] font-serif">Nearby Places</h3>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-[16px] flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-700 text-sm">{error}</p>
        </div>
      )}

      {!currentPosition ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">Enable location tracking to see nearby places</p>
        </div>
      ) : (
        <>
          {/* Category Filter */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-8 px-8">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                  activeCategory === category.id
                    ? 'bg-[#5A5A40] text-white shadow-lg'
                    : 'bg-[#f5f5f0] text-[#5A5A40] hover:bg-[#5A5A40]/10'
                }`}
              >
                <span className="mr-2">{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </div>

          {/* Places List */}
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 text-center"
                >
                  <div className="w-8 h-8 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin mx-auto" />
                  <p className="text-[#5A5A40]/60 text-sm mt-3">Finding nearby {CATEGORIES.find(c => c.id === activeCategory)?.label.toLowerCase()}...</p>
                </motion.div>
              ) : places.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 text-center"
                >
                  <p className="text-[#5A5A40]/60">No places found nearby</p>
                </motion.div>
              ) : (
                <motion.div
                  key="places"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {places.map((place, index) => (
                    <motion.button
                      key={place.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => openInMaps(place)}
                      className="w-full p-4 bg-[#f5f5f0] hover:bg-[#5A5A40]/5 rounded-[20px] text-left transition-colors border border-transparent hover:border-[#5A5A40]/10"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-[#5A5A40] flex-1">{place.name}</h4>
                        <div className="flex items-center gap-1 ml-2">
                          <Navigation2 size={14} className="text-[#5A5A40]/60" />
                          <span className="text-xs text-[#5A5A40]/60 font-medium">
                            {formatDistance(place.distance)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#5A5A40]/60 mb-3 line-clamp-1">{place.address}</p>

                      <div className="flex items-center gap-4 text-xs">
                        {place.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-amber-500 fill-amber-500" />
                            <span className="text-[#5A5A40]/70">{place.rating.toFixed(1)}</span>
                          </div>
                        )}
                        {place.isOpen !== null && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} className={place.isOpen ? 'text-green-600' : 'text-red-600'} />
                            <span className={place.isOpen ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {place.isOpen ? 'Open' : 'Closed'}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}
