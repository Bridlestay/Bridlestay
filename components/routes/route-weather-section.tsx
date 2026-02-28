"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/lib/weather";

interface RouteWeatherSectionProps {
  weatherData: WeatherData | null;
  loading: boolean;
}

export function RouteWeatherSection({ weatherData, loading }: RouteWeatherSectionProps) {
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

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <span className="text-base">{weatherData.current.icon}</span>
        Weather Conditions
      </h4>

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

      {/* Current Conditions Grid */}
      <div className="grid grid-cols-4 gap-2 py-3 border rounded-lg bg-slate-50/50 px-2">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">
            {weatherData.current.temperature}°
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            Temp
          </p>
        </div>
        <div className="text-center border-l border-slate-200">
          <p className="text-lg font-bold text-slate-900">
            {weatherData.current.icon}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate px-1">
            {weatherData.current.conditionText}
          </p>
        </div>
        <div className="text-center border-l border-slate-200">
          <p className="text-lg font-bold text-slate-900">
            {weatherData.current.windSpeed}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            Wind km/h
          </p>
        </div>
        <div className="text-center border-l border-slate-200">
          <p className="text-lg font-bold text-slate-900">
            {weatherData.current.precipitation}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            Rain mm
          </p>
        </div>
      </div>

      {/* 3-Day Forecast */}
      <div className="flex gap-2">
        {weatherData.forecast.map((day) => (
          <div
            key={day.date}
            className={cn(
              "flex-1 text-center rounded-lg border p-2",
              day.isSevere
                ? "bg-red-50 border-red-200"
                : day.isWarning
                  ? "bg-amber-50 border-amber-200"
                  : "bg-slate-50 border-slate-200"
            )}
          >
            <p className="text-xs font-medium text-slate-600">
              {day.dayName}
            </p>
            <p className="text-xl my-1">{day.icon}</p>
            <p className="text-sm font-bold text-slate-900">
              {day.tempMax}°
            </p>
            <p className="text-xs text-slate-500">{day.tempMin}°</p>
          </div>
        ))}
      </div>
    </div>
  );
}
