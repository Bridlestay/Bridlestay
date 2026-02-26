/**
 * Weather utilities for route weather data
 * Uses Open-Meteo API with WMO weather codes
 */

// ---- Types ----

export interface WeatherCurrent {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  windGusts: number;
  precipitation: number;
  conditionText: string;
  icon: string;
  isWarning: boolean;
  isSevere: boolean;
}

export interface WeatherDay {
  date: string;
  dayName: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  windSpeedMax: number;
  conditionText: string;
  icon: string;
  isWarning: boolean;
  isSevere: boolean;
}

export interface WeatherData {
  current: WeatherCurrent;
  forecast: WeatherDay[];
  hasWarning: boolean;
  hasSevere: boolean;
  warningMessage: string | null;
  fetchedAt: string;
}

// ---- WMO Weather Code Mapping ----

interface WeatherCodeInfo {
  text: string;
  icon: string;
  isWarning: boolean;
  isSevere: boolean;
}

const WMO_CODES: Record<number, WeatherCodeInfo> = {
  0: { text: "Clear sky", icon: "☀️", isWarning: false, isSevere: false },
  1: { text: "Mainly clear", icon: "🌤️", isWarning: false, isSevere: false },
  2: { text: "Partly cloudy", icon: "⛅", isWarning: false, isSevere: false },
  3: { text: "Overcast", icon: "☁️", isWarning: false, isSevere: false },
  45: { text: "Fog", icon: "🌫️", isWarning: false, isSevere: false },
  48: { text: "Rime fog", icon: "🌫️", isWarning: true, isSevere: false },
  51: { text: "Light drizzle", icon: "🌦️", isWarning: false, isSevere: false },
  53: { text: "Drizzle", icon: "🌦️", isWarning: false, isSevere: false },
  55: { text: "Dense drizzle", icon: "🌦️", isWarning: false, isSevere: false },
  56: { text: "Freezing drizzle", icon: "🌨️", isWarning: true, isSevere: false },
  57: { text: "Heavy freezing drizzle", icon: "🌨️", isWarning: true, isSevere: false },
  61: { text: "Slight rain", icon: "🌧️", isWarning: false, isSevere: false },
  63: { text: "Moderate rain", icon: "🌧️", isWarning: false, isSevere: false },
  65: { text: "Heavy rain", icon: "🌧️", isWarning: true, isSevere: false },
  66: { text: "Freezing rain", icon: "🌨️", isWarning: true, isSevere: false },
  67: { text: "Heavy freezing rain", icon: "🌨️", isWarning: true, isSevere: true },
  71: { text: "Slight snow", icon: "❄️", isWarning: true, isSevere: false },
  73: { text: "Moderate snow", icon: "❄️", isWarning: true, isSevere: false },
  75: { text: "Heavy snow", icon: "❄️", isWarning: true, isSevere: true },
  77: { text: "Snow grains", icon: "❄️", isWarning: true, isSevere: false },
  80: { text: "Light showers", icon: "🌧️", isWarning: false, isSevere: false },
  81: { text: "Moderate showers", icon: "🌧️", isWarning: false, isSevere: false },
  82: { text: "Violent showers", icon: "🌧️", isWarning: true, isSevere: false },
  85: { text: "Light snow showers", icon: "❄️", isWarning: true, isSevere: false },
  86: { text: "Heavy snow showers", icon: "❄️", isWarning: true, isSevere: true },
  95: { text: "Thunderstorm", icon: "⛈️", isWarning: true, isSevere: true },
  96: { text: "Thunderstorm with hail", icon: "⛈️", isWarning: true, isSevere: true },
  99: { text: "Thunderstorm with heavy hail", icon: "⛈️", isWarning: true, isSevere: true },
};

export function getWeatherInfo(code: number): WeatherCodeInfo {
  return WMO_CODES[code] || {
    text: "Unknown",
    icon: "🌡️",
    isWarning: false,
    isSevere: false,
  };
}

// ---- Centroid Calculation ----

export function getRouteCentroid(
  coordinates: [number, number][]
): { lat: number; lng: number } | null {
  if (!coordinates || coordinates.length === 0) return null;

  const sumLng = coordinates.reduce((sum, c) => sum + c[0], 0);
  const sumLat = coordinates.reduce((sum, c) => sum + c[1], 0);

  return {
    lng: sumLng / coordinates.length,
    lat: sumLat / coordinates.length,
  };
}

/**
 * Round coordinates to 2 decimal places (~1.1km precision)
 * for use as cache keys so nearby routes share weather data.
 */
export function roundCoords(
  lat: number,
  lng: number
): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

export function weatherCacheKey(lat: number, lng: number): string {
  const r = roundCoords(lat, lng);
  return `weather:${r.lat}:${r.lng}`;
}

// ---- Warning Message Builder ----

export function buildWarningMessage(
  current: WeatherCurrent,
  forecast: WeatherDay[]
): string | null {
  const messages: string[] = [];

  if (current.isSevere) {
    messages.push(
      `Severe weather now: ${current.conditionText}. Riding is strongly discouraged.`
    );
  } else if (current.isWarning) {
    messages.push(
      `Weather warning: ${current.conditionText}. Take extra care when riding.`
    );
  }

  if (current.windGusts > 60) {
    messages.push(
      `Strong wind gusts of ${Math.round(current.windGusts)} km/h. Horses may spook.`
    );
  }

  const upcomingSevere = forecast.filter((d) => d.isSevere);
  if (upcomingSevere.length > 0 && !current.isSevere) {
    messages.push(
      `Severe weather expected: ${upcomingSevere.map((d) => d.dayName).join(", ")}.`
    );
  }

  return messages.length > 0 ? messages.join(" ") : null;
}
