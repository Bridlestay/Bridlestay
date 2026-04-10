"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Droplets, Wind, Sun, Cloud, CloudRain, Snowflake, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/lib/weather";
import { useState } from "react";

interface RouteWeatherSectionProps {
  weatherData: WeatherData | null;
  loading: boolean;
}

// Generate dynamic weather tips based on conditions
function getWeatherTips(weatherData: WeatherData): string[] {
  const tips: string[] = [];
  const temp = weatherData.current.temperature;
  const wind = weatherData.current.windSpeed;
  const precipitation = weatherData.current.precipitation;
  const condition = weatherData.current.conditionText.toLowerCase();

  // Temperature tips
  if (temp > 25) {
    tips.push("🌡️ Hot day expected — bring plenty of water and sun protection");
  } else if (temp < 5) {
    tips.push("❄️ Cold conditions — dress in layers and check for ice on trails");
  } else if (temp < 15) {
    tips.push("🧥 Cool weather — bring a light jacket for comfort");
  }

  // Wind tips
  if (wind > 30) {
    tips.push("💨 Strong winds expected — riding may be challenging in exposed areas");
  } else if (wind > 20) {
    tips.push("🌬️ Moderate winds — be prepared for gusts on open sections");
  }

  // Precipitation tips
  if (precipitation > 5 || condition.includes("rain") || condition.includes("shower")) {
    tips.push("☔ Rain expected — trails may be muddy, bring waterproof gear");
  } else if (condition.includes("snow")) {
    tips.push("⛄ Snow possible — check trail conditions before heading out");
  } else if (precipitation === 0 && !condition.includes("cloud")) {
    tips.push("☀️ Clear skies — great day for a ride!");
  }

  // Default tip if no specific conditions
  if (tips.length === 0) {
    tips.push("🐴 Check current conditions before heading out");
  }

  return tips;
}

export function RouteWeatherSection({ weatherData, loading }: RouteWeatherSectionProps) {
  const [showAllDays, setShowAllDays] = useState(false);
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-24 flex-1 rounded-lg" />
          <Skeleton className="h-24 flex-1 rounded-lg" />
          <Skeleton className="h-24 flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!weatherData) return null;

  const weatherTips = getWeatherTips(weatherData);
  const displayForecast = showAllDays ? weatherData.forecast : weatherData.forecast.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      {weatherData.warningMessage && (
        <div
          className={cn(
            "rounded-lg p-3 text-sm font-medium flex items-start gap-2",
            weatherData.hasSevere
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          )}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{weatherData.warningMessage}</span>
        </div>
      )}

      {/* Current Conditions — Cleaner Komoot-style */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-50 to-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">{weatherData.current.icon}</span>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">
                {weatherData.current.temperature}°
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                {weatherData.current.conditionText}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1.5">
              <Wind className="h-4 w-4" />
              <span>{weatherData.current.windSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4" />
              <span>{weatherData.current.precipitation} mm</span>
            </div>
          </div>
        </div>

        {/* Forecast Cards */}
        <div className="p-3 space-y-2">
          {displayForecast.map((day, idx) => (
            <div
              key={day.date}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                day.isSevere
                  ? "bg-red-50 border-red-200"
                  : day.isWarning
                    ? "bg-amber-50 border-amber-200"
                    : "bg-slate-50 border-slate-100 hover:bg-slate-100"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{day.icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {day.dayName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {day.date}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {day.tempMax}° / {day.tempMin}°
                </p>
              </div>
            </div>
          ))}
          {weatherData.forecast.length > 3 && (
            <button
              onClick={() => setShowAllDays(!showAllDays)}
              className="w-full text-xs text-primary hover:text-green-700 font-medium py-1"
            >
              {showAllDays ? "Show less" : `Show ${weatherData.forecast.length - 3} more days`}
            </button>
          )}
        </div>
      </div>

      {/* Additional Weather Tips (Soft Muted Style) */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
        <h4 className="text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-400" />
          Weather tips
        </h4>
        <ul className="space-y-2">
          {weatherTips.map((tip, idx) => (
            <li key={idx} className="text-sm text-slate-600 leading-relaxed flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
