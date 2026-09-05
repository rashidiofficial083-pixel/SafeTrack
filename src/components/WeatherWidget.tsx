import { useEffect, useState } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Loader2,
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  weatherCode: number;
}

const DHAKA_LAT = 23.8103;
const DHAKA_LNG = 90.4125;

function weatherIcon(code: number) {
  if (code === 0) return Sun;
  if (code >= 1 && code <= 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if (code >= 61 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95 && code <= 99) return CloudLightning;
  return Cloud;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${DHAKA_LAT}&longitude=${DHAKA_LNG}&current_weather=true`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const cw = data?.current_weather;
        if (cw && typeof cw.temperature === 'number') {
          setWeather({
            temperature: cw.temperature,
            weatherCode: cw.weathercode ?? 0,
          });
        }
      } catch {
        // Silently fail — widget just shows placeholder
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const Icon = weather ? weatherIcon(weather.weatherCode) : Cloud;

  return (
    <div className="flex-1 rounded-xl bg-[#0f1115]/60 backdrop-blur-md border border-white/10 px-4 py-3 flex items-center justify-center gap-2.5 min-w-0">
      {loading ? (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      ) : weather ? (
        <>
          <Icon className="w-6 h-6 text-accent flex-shrink-0" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xl font-semibold text-white tabular-nums">
              {Math.round(weather.temperature)}°
            </span>
            <span className="text-[10px] text-gray-300">Dhaka</span>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5 text-gray-500" />
          <span className="text-[12px] text-gray-400">Weather N/A</span>
        </div>
      )}
    </div>
  );
}
