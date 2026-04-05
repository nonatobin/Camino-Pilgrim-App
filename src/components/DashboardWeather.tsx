import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Cloud, Droplets, Wind, MapPin } from 'lucide-react';

interface DashboardWeatherProps {
  startLocation?: string;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  city: string;
}

// Camino Português stage locations for geocoding fallback
const CAMINO_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'baiona': { lat: 42.1181, lng: -8.8486 },
  'tui': { lat: 42.0467, lng: -8.6450 },
  'porto': { lat: 41.1579, lng: -8.6291 },
  'sarria': { lat: 42.7717, lng: -7.4142 },
  'santiago': { lat: 42.8782, lng: -8.5448 },
  'santiago de compostela': { lat: 42.8782, lng: -8.5448 },
  'finisterre': { lat: 42.9081, lng: -9.2643 },
  'leon': { lat: 42.5987, lng: -5.5671 },
  'burgos': { lat: 42.3440, lng: -3.6969 },
  'pamplona': { lat: 42.8125, lng: -1.6458 },
  'saint jean': { lat: 43.1634, lng: -1.2364 },
  'saint-jean-pied-de-port': { lat: 43.1634, lng: -1.2364 },
};

const DEMO_WEATHER: WeatherData = {
  temp: 62,
  feelsLike: 59,
  condition: 'Partly Cloudy',
  humidity: 65,
  windSpeed: 8,
  icon: '02d',
  city: 'Camino Trail',
};

const getWeatherEmoji = (iconCode: string): string => {
  if (iconCode.includes('01')) return '☀️';
  if (iconCode.includes('02')) return '⛅';
  if (iconCode.includes('03') || iconCode.includes('04')) return '☁️';
  if (iconCode.includes('09') || iconCode.includes('10')) return '🌧️';
  if (iconCode.includes('11')) return '⛈️';
  if (iconCode.includes('13')) return '❄️';
  return '🌤️';
};

export default function DashboardWeather({ startLocation }: DashboardWeatherProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    const apiKey = (import.meta as any).env.VITE_OPENWEATHER_API_KEY;

    if (!apiKey) {
      setUsingDemo(true);
      setWeather(DEMO_WEATHER);
      setLoading(false);
      return;
    }

    const fetchWeatherForCoords = async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${apiKey}`
        );

        if (!response.ok) throw new Error('Weather API error');

        const data = await response.json();

        setWeather({
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          condition: data.weather[0].main,
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed),
          icon: data.weather[0].icon,
          city: data.name || startLocation || 'Your Location',
        });
      } catch (err) {
        setUsingDemo(true);
        setWeather(DEMO_WEATHER);
      } finally {
        setLoading(false);
      }
    };

    // Try real GPS location first, then fall back to Camino location lookup
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherForCoords(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Geolocation denied — fall back to Camino location lookup
          const locLower = (startLocation || '').toLowerCase().trim();
          let coords = CAMINO_LOCATIONS[locLower];
          if (!coords) {
            for (const [key, val] of Object.entries(CAMINO_LOCATIONS)) {
              if (locLower.includes(key) || key.includes(locLower)) {
                coords = val;
                break;
              }
            }
          }
          if (!coords) coords = CAMINO_LOCATIONS['santiago'];
          fetchWeatherForCoords(coords.lat, coords.lng);
        },
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      // No geolocation available — use Camino locations
      const locLower = (startLocation || '').toLowerCase().trim();
      let coords = CAMINO_LOCATIONS[locLower] || CAMINO_LOCATIONS['santiago'];
      fetchWeatherForCoords(coords.lat, coords.lng);
    }
  }, [startLocation]);

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#5A5A40]/5 animate-pulse">
        <div className="h-24 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (!weather) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="bg-white rounded-[32px] p-6 shadow-sm border border-[#5A5A40]/5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud size={18} className="text-[#5A5A40]" />
          <h4 className="font-bold text-[#5A5A40] text-lg">Trail Weather</h4>
        </div>
        {usingDemo && (
          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
            Demo
          </span>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Emoji + Temp */}
        <div className="flex items-center gap-3">
          <span className="text-5xl">{getWeatherEmoji(weather.icon)}</span>
          <div>
            <div className="text-4xl font-bold text-[#5A5A40]">{weather.temp}°F</div>
            <p className="text-sm text-[#5A5A40]/60 font-medium">{weather.condition}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-16 bg-[#5A5A40]/10" />

        {/* Details */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Droplets size={14} className="text-blue-400" />
            <span className="text-sm text-[#5A5A40]/70">{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind size={14} className="text-blue-400" />
            <span className="text-sm text-[#5A5A40]/70">{weather.windSpeed} mph</span>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <MapPin size={14} className="text-[#5A5A40]/40" />
            <span className="text-xs text-[#5A5A40]/50 font-medium truncate">{weather.city}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
