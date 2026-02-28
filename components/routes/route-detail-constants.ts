// Constants and helpers extracted from route-detail-drawer.tsx

export const HAZARD_TYPES = [
  { value: "tree_fall", label: "Fallen Tree" },
  { value: "flooding", label: "Flooding" },
  { value: "erosion", label: "Path Erosion" },
  { value: "livestock", label: "Livestock Warning" },
  { value: "closure", label: "Path Closed" },
  { value: "poor_visibility", label: "Poor Visibility" },
  { value: "ice_snow", label: "Ice/Snow" },
  { value: "overgrown", label: "Overgrown Path" },
  { value: "damaged_path", label: "Damaged Surface" },
  { value: "dangerous_crossing", label: "Dangerous Crossing" },
  { value: "other", label: "Other" },
];

export const WARNING_TYPES = [
  { value: "slippery", label: "Slippery Conditions" },
  { value: "muddy", label: "Muddy/Waterlogged" },
  { value: "weather_warning", label: "Weather Warning" },
  { value: "restricted_access", label: "Restricted Access" },
  { value: "other_warning", label: "Other Warning" },
];

export const getTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return "Expired";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
};

export const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 border-blue-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

export const REVIEW_TAGS = [
  { id: "muddy_after_rain", label: "Muddy after rain", emoji: "🌧️" },
  { id: "road_crossings", label: "Road crossings", emoji: "🚗" },
  { id: "steady_horses", label: "Suitable for steady horses", emoji: "🐴" },
  { id: "experienced_horses", label: "Better for experienced horses", emoji: "⚡" },
  { id: "water_available", label: "Water available for horses", emoji: "💧" },
  { id: "group_friendly", label: "Group friendly", emoji: "👥" },
  { id: "parking_available", label: "Parking available", emoji: "🅿️" },
  { id: "good_waymarking", label: "Good waymarking", emoji: "🪧" },
  { id: "stunning_views", label: "Stunning views", emoji: "🏞️" },
  { id: "gates_to_open", label: "Gates to open", emoji: "🚪" },
  { id: "steep_sections", label: "Steep sections", emoji: "⛰️" },
  { id: "good_surface", label: "Good surface throughout", emoji: "✅" },
];

export const PHOTO_CATEGORIES = [
  { id: "view", label: "View", emoji: "🏞️" },
  { id: "feature", label: "Feature", emoji: "🌿" },
  { id: "seasonal", label: "Seasonal", emoji: "🍂" },
  { id: "horse", label: "Horse", emoji: "🐴" },
  { id: "hazard", label: "Hazard", emoji: "⚠️" },
  { id: "parking", label: "Parking", emoji: "🅿️" },
];

export const DIFFICULTY_CONFIG: Record<string, { color: string; label: string }> = {
  unrated: { color: "bg-gray-100 text-gray-800 border-gray-300", label: "Unrated" },
  easy: { color: "bg-green-100 text-green-800 border-green-300", label: "Easy" },
  moderate: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Moderate" },
  medium: { color: "bg-amber-100 text-amber-800 border-amber-300", label: "Medium" },
  difficult: { color: "bg-orange-100 text-orange-800 border-orange-300", label: "Difficult" },
  hard: { color: "bg-red-100 text-red-800 border-red-300", label: "Hard" },
  severe: { color: "bg-red-200 text-red-900 border-red-400", label: "Severe" },
};

export const getDifficultyInfo = (difficulty: string | undefined) => {
  if (!difficulty) return DIFFICULTY_CONFIG.moderate;
  return DIFFICULTY_CONFIG[difficulty.toLowerCase()] || DIFFICULTY_CONFIG.moderate;
};

// Calculate distance between two points in meters using Haversine formula
export const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
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
