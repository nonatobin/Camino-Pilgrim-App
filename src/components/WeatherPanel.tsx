import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, Droplets, Wind, AlertCircle, Sun, CloudRain } from 'lucide-react';

interface WeatherPanelProps {
  currentPosition: { lat: number; lng: number } | null;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  uv: number;
  icon: string;
}

interface ForecastDay {
  date: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
}

const DEMO_WEATHER: WeatherData = {
  temp: 62,
  feelsLike: 59,
  condition: 'Partly Cloudy',
  humidity: 65,
  windSpeed: 8,
  uv: 4,
  icon: '02d',
};

const DEMO_FORECAST: ForecastDay[] = [
  {
    date: 'Tomorrow',
    high: 64,
    low: 58,
    condition: 'Sunny',
    icon: '01d',
  },
  {
    date: 'In 2 days',
    high: 61,
    low: 55,
    condition: 'Cloudy',
    icon: '04d',
  },
  {
    date: 'In 3 days',
    high: 59,
    low: 52,
    condition: 'Rainy',
    icon: '10d',
  },
];

export default function WeatherPanel({ currentPosition }: WeatherPanelProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    if (!currentPosition) return;

    const fetchWeather = async () => {
      setLoading(true);
      const apiKey = (import.meta as any).env.VITE_OPENWEATHER_API_KEY;

      if (!apiKey) {
        setUsingDemo(true);
        setWeather(DEMO_WEATHER);
        setForecast(DEMO_FORECAST);
        setLoading(false);
        return;
      }

      try {
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${currentPosition.lat}&lon=${currentPosition.lng}&units=imperial&appid=${apiKey}`
        );

        if (!weatherResponse.ok) {
          throw new Error('Weather API error');
        }

        const weatherData = await weatherResponse.json();

        const forecastResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${currentPosition.lat}&lon=${currentPosition.lng}&units=imperial&appid=${apiKey}`
        );

        if (!forecastResponse.ok) {
          throw new Error('Forecast API error');
        }

        const forecastData = await forecastResponse.json();

        setWeather({
          temp: Math.round(weatherData.main.temp),
          feelsLike: Math.round(weatherData.main.feels_like),
          condition: weatherData.weather[0].main,
          humidity: weatherData.main.humidity,
          windSpeed: Math.round(weatherData.wind.speed),
          uv: 0,
          icon: weatherData.weather[0].icon,
        });

        const processedForecast: ForecastDay[] = [];
        for (let i = 8; i < forecastData.list.length; i += 8) {
          const day = forecastData.list[i];
          processedForecast.push({
            date: new Date(day.dt * 1000).toLocaleDateString('en-US', {
              weekday: 'short',
            }),
            high: Math.round(day.main.temp_max),
            low: Math.round(day.main.temp_min),
            condition: day.weather[0].main,
            icon: day.weather[0].icon,
          });
        }

        setForecast(processedForecast.slice(0, 3));
      } catch (err) {
        setUsingDemo(true);
        setWeather(DEMO_WEATHER);
        setForecast(DEMO_FORECAST);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [currentPosition]);

  const getWeatherEmoji = (iconCode: string): string => {
    if (iconCode.includes('01')) return '☀️';
    if (iconCode.includes('02')) return '⛅';
    if (iconCode.includes('03') || iconCode.includes('04')) return '☁️';
    if (iconCode.includes('09') || iconCode.includes('10')) return '🌧️';
    if (iconCode.includes('11')) return '⛈️';
    if (iconCode.includes('13')) return '❄️';
    return '🌤️';
  };

  if (!currentPosition) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-[32px] p-8 shadow-xl border border-[#5A5A40]/5"
      >
        <div className="flex items-center gap-3 mb-6">
          <Cloud size={24} className="text-[#5A5A40]" />
          <h3 className="text-2xl font-bold text-[#5A5A40] font-serif">Weather</h3>
        </div>
        <div className="p-8 text-center">
          <p className="text-gray-500">Enable location tracking to see weather</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-[32px] p-8 shadow-xl border border-[#5A5A40]/5"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Cloud size={24} className="text-[#5A5A40]" />
          <h3 className="text-2xl font-bold text-[#5A5A40] font-serif">Weather</h3>
        </div>
        {usingDemo && (
          <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
            Demo
          </span>
        )}
      </div>

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
            <p className="text-[#5A5A40]/60 text-sm mt-3">Loading weather...</p>
          </motion.div>
        ) : error && !usingDemo ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 rounded-[16px] flex items-start gap-3"
          >
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        ) : weather ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Current Weather */}
            <div className="mb-8 p-6 bg-gradient-to-br from-[#f5f5f0] to-[#f5f5f0]/50 rounded-[24px] border border-[#5A5A40]/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-[#5A5A40]/60 uppercase tracking-widest font-bold mb-1">
                    Right Now
                  </div>
                  <div className="text-5xl font-bold text-[#5A5A40]">
                    {weather.temp}°F
                  </div>
                  <p className="text-[#5A5A40]/70 font-medium mt-1">{weather.condition}</p>
                </div>
                <div className="text-6xl">{getWeatherEmoji(weather.icon)}</div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-[16px] p-3 text-center">
                  <p className="text-xs text-[#5A5A40]/60 font-bold mb-1">Feels Like</p>
                  <p className="text-lg font-bold text-[#5A5A40]">{weather.feelsLike}°F</p>
                </div>
                <div className="bg-white rounded-[16px] p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Droplets size={14} className="text-blue-500" />
                  </div>
                  <p className="text-xs text-[#5A5A40]/60 font-bold mb-1">Humidity</p>
                  <p className="text-lg font-bold text-[#5A5A40]">{weather.humidity}%</p>
                </div>
                <div className="bg-white rounded-[16px] p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Wind size={14} className="text-blue-500" />
                  </div>
                  <p className="text-xs text-[#5A5A40]/60 font-bold mb-1">Wind</p>
                  <p className="text-lg font-bold text-[#5A5A40]">{weather.windSpeed} mph</p>
                </div>
              </div>
            </div>

            {/* 3-Day Forecast */}
            <div>
              <h4 className="text-sm font-bold text-[#5A5A40] uppercase tracking-widest mb-3">
                3-Day Forecast
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {forecast.map((day, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 bg-[#f5f5f0] rounded-[16px] border border-[#5A5A40]/5 text-center"
                  >
                    <p className="text-xs font-bold text-[#5A5A40]/60 mb-2">{day.date}</p>
                    <p className="text-3xl mb-2">{getWeatherEmoji(day.icon)}</p>
                    <div className="mb-2">
                      <p className="text-sm font-bold text-[#5A5A40]">{day.high}°</p>
                      <p className="text-xs text-[#5A5A40]/60">{day.low}°</p>
                    </div>
                    <p className="text-xs text-[#5A5A40]/70 line-clamp-1">{day.condition}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Hiking Tips */}
            <div className="mt-6 p-4 bg-blue-50 rounded-[16px] border border-blue-200">
              <p className="text-xs font-bold text-blue-900 mb-1 uppercase tracking-widest">
                Hiking Tip
              </p>
              <p className="text-sm text-blue-800">
                {weather.temp < 50
                  ? 'Consider bringing an extra layer. It is cooler than typical.'
                  : weather.temp > 75
                    ? 'Stay hydrated. Bring extra water for this warm walk.'
                    : 'Perfect walking weather. Great conditions for the Camino!'}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
