import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapIcon, Clock, Activity, X, Navigation } from 'lucide-react';
import { getFavoriteRoutes } from '../lib/localStore';
import RouteMap from './RouteMap';

export default function FavoriteRoutes() {
  const [routes, setRoutes] = useState(getFavoriteRoutes());
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);

  const formatPace = (pace: number) => pace ? `${pace.toFixed(1)} mph` : 'N/A';
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[#5A5A40] uppercase tracking-widest font-bold text-sm mb-4">
        <Navigation size={18} />
        Favorite Training Routes
      </div>

      {routes.length === 0 ? (
        <div className="bg-white rounded-[32px] p-8 text-center text-gray-500 shadow-sm border border-[#5A5A40]/5">
          <p>No favorite routes saved yet.</p>
          <p className="text-sm mt-2">After completing a track, choose "Save as Favorite".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((route: any) => (
            <motion.button
              key={route.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRoute(route)}
              className="bg-white p-6 rounded-[24px] border border-[#5A5A40]/5 shadow-sm text-left flex flex-col gap-2"
            >
              <h4 className="font-bold text-[#5A5A40] text-lg">{route.routeName || 'Unnamed Route'}</h4>
              <p className="text-xs text-gray-400">{new Date(route.date).toLocaleDateString()}</p>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-[#5A5A40]/80">
                <span className="flex items-center gap-1"><Activity size={14} /> {route.distance} mi</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {formatTime(route.duration)}</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Modal for viewing the route exactly as tracked */}
      <AnimatePresence>
        {selectedRoute && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedRoute(null)}
          >
             <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] overflow-hidden shadow-2xl w-full max-w-4xl"
            >
              <div className="flex justify-between items-center bg-[#5A5A40] text-white p-6">
                <div>
                  <h3 className="text-2xl font-bold font-serif">{selectedRoute.routeName}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
                    <span>{selectedRoute.distance} mi</span>
                    <span>•</span>
                    <span>{formatPace(selectedRoute.speed)}</span>
                    <span>•</span>
                    <span>{formatTime(selectedRoute.duration)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoute(null)}
                  className="p-2 rounded-full hover:bg-white/20 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Embed RouteMap with the saved geometry */}
              <div className="h-[500px]">
                <RouteMap
                  positions={selectedRoute.geometry || []}
                  isTracking={false}
                  currentPosition={null}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
