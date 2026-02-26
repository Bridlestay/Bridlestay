import { NextRequest, NextResponse } from "next/server";
import {
  getWeatherInfo,
  buildWarningMessage,
  roundCoords,
  type WeatherCurrent,
  type WeatherDay,
  type WeatherData,
} from "@/lib/weather";

// Server-side in-memory cache (per serverless instance)
const serverCache = new Map<
  string,
  { data: WeatherData; expiresAt: number }
>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { error: "lat and lng query parameters are required" },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "lat and lng must be valid numbers" },
        { status: 400 }
      );
    }

    // Validate reasonable UK bounds
    if (lat < 49 || lat > 61 || lng < -11 || lng > 3) {
      return NextResponse.json(
        { error: "Coordinates outside UK bounds" },
        { status: 400 }
      );
    }

    // Round coordinates for cache key
    const rounded = roundCoords(lat, lng);
    const cacheKey = `${rounded.lat}:${rounded.lng}`;

    // Check server-side cache
    const cached = serverCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }

    // Fetch from Open-Meteo
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(rounded.lat));
    url.searchParams.set("longitude", String(rounded.lng));
    url.searchParams.set(
      "current",
      "temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation"
    );
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max"
    );
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("timezone", "Europe/London");

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(
        "[WEATHER] Open-Meteo error:",
        response.status,
        await response.text()
      );
      return NextResponse.json(
        { error: "Weather service unavailable" },
        { status: 502 }
      );
    }

    const raw = await response.json();

    // Parse current weather
    const currentCode = raw.current?.weather_code ?? 0;
    const currentInfo = getWeatherInfo(currentCode);
    const current: WeatherCurrent = {
      temperature: Math.round(raw.current?.temperature_2m ?? 0),
      weatherCode: currentCode,
      windSpeed: Math.round(raw.current?.wind_speed_10m ?? 0),
      windGusts: Math.round(raw.current?.wind_gusts_10m ?? 0),
      precipitation: raw.current?.precipitation ?? 0,
      conditionText: currentInfo.text,
      icon: currentInfo.icon,
      isWarning: currentInfo.isWarning,
      isSevere: currentInfo.isSevere,
    };

    // Parse daily forecast
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const forecast: WeatherDay[] = (raw.daily?.time || []).map(
      (date: string, i: number) => {
        const code = raw.daily.weather_code[i];
        const info = getWeatherInfo(code);
        const d = new Date(date + "T12:00:00");
        const isToday =
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate();

        return {
          date,
          dayName: isToday ? "Today" : dayNames[d.getDay()],
          weatherCode: code,
          tempMax: Math.round(raw.daily.temperature_2m_max[i]),
          tempMin: Math.round(raw.daily.temperature_2m_min[i]),
          precipitationSum: raw.daily.precipitation_sum[i] ?? 0,
          windSpeedMax: Math.round(raw.daily.wind_speed_10m_max[i] ?? 0),
          conditionText: info.text,
          icon: info.icon,
          isWarning: info.isWarning,
          isSevere: info.isSevere,
        };
      }
    );

    const hasWarning =
      current.isWarning || forecast.some((d) => d.isWarning);
    const hasSevere =
      current.isSevere || forecast.some((d) => d.isSevere);

    const weatherData: WeatherData = {
      current,
      forecast,
      hasWarning,
      hasSevere,
      warningMessage: buildWarningMessage(current, forecast),
      fetchedAt: new Date().toISOString(),
    };

    // Store in server cache
    serverCache.set(cacheKey, {
      data: weatherData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    // Clean up old cache entries to prevent memory leak
    if (serverCache.size > 500) {
      const now = Date.now();
      for (const [k, v] of serverCache.entries()) {
        if (now > v.expiresAt) serverCache.delete(k);
      }
    }

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error("[WEATHER] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
