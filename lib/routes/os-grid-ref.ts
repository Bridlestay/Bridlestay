/**
 * Convert WGS84 latitude/longitude to UK Ordnance Survey Grid Reference
 * e.g. latLngToOSGridRef(51.93966, -1.16294) → "SP 5763 2712"
 *
 * Algorithm: WGS84 → OSGB36 (Helmert transform) → Transverse Mercator projection → Grid letters
 */

// Ellipsoid parameters
const WGS84 = { a: 6378137, b: 6356752.3142, f: 1 / 298.257223563 };
const AIRY1830 = { a: 6377563.396, b: 6356256.909, f: 1 / 299.3249646 };

// Helmert transform parameters: WGS84 → OSGB36
const HELMERT = {
  tx: -446.448,
  ty: 125.157,
  tz: -542.06,
  rx: (-0.1502 / 3600) * (Math.PI / 180), // arcseconds → radians
  ry: (-0.247 / 3600) * (Math.PI / 180),
  rz: (-0.8421 / 3600) * (Math.PI / 180),
  s: 20.4894e-6, // ppm → scale factor
};

// National Grid projection origin
const OSGB = {
  lat0: (49 * Math.PI) / 180,
  lng0: (-2 * Math.PI) / 180,
  F0: 0.9996012717,
  N0: -100000,
  E0: 400000,
};

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Convert lat/lng/height to cartesian (x,y,z)
function latLngToCartesian(
  lat: number,
  lng: number,
  h: number,
  ellipsoid: { a: number; b: number; f: number }
) {
  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLng = Math.sin(lng);
  const cosLng = Math.cos(lng);
  const eSq = 2 * ellipsoid.f - ellipsoid.f ** 2;
  const nu = ellipsoid.a / Math.sqrt(1 - eSq * sinLat ** 2);
  return {
    x: (nu + h) * cosLat * cosLng,
    y: (nu + h) * cosLat * sinLng,
    z: (nu * (1 - eSq) + h) * sinLat,
  };
}

// Convert cartesian to lat/lng/height
function cartesianToLatLng(
  x: number,
  y: number,
  z: number,
  ellipsoid: { a: number; b: number; f: number }
) {
  const eSq = 2 * ellipsoid.f - ellipsoid.f ** 2;
  const p = Math.sqrt(x ** 2 + y ** 2);
  let lat = Math.atan2(z, p * (1 - eSq));

  for (let i = 0; i < 10; i++) {
    const sinLat = Math.sin(lat);
    const nu = ellipsoid.a / Math.sqrt(1 - eSq * sinLat ** 2);
    lat = Math.atan2(z + eSq * nu * sinLat, p);
  }

  const sinLat = Math.sin(lat);
  const nu = ellipsoid.a / Math.sqrt(1 - eSq * sinLat ** 2);
  const lng = Math.atan2(y, x);
  const h = p / Math.cos(lat) - nu;

  return { lat, lng, h };
}

// Apply Helmert transform
function helmertTransform(cart: { x: number; y: number; z: number }) {
  const { tx, ty, tz, rx, ry, rz, s } = HELMERT;
  return {
    x: tx + (1 + s) * cart.x - rz * cart.y + ry * cart.z,
    y: ty + rz * cart.x + (1 + s) * cart.y - rx * cart.z,
    z: tz - ry * cart.x + rx * cart.y + (1 + s) * cart.z,
  };
}

// Transverse Mercator projection: OSGB36 lat/lng → easting/northing
function latLngToEastingNorthing(lat: number, lng: number) {
  const { a, b } = AIRY1830;
  const { lat0, lng0, F0, N0, E0 } = OSGB;

  const eSq = (a ** 2 - b ** 2) / a ** 2;
  const n = (a - b) / (a + b);

  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);

  const nu = (a * F0) / Math.sqrt(1 - eSq * sinLat ** 2);
  const rho =
    (a * F0 * (1 - eSq)) / (1 - eSq * sinLat ** 2) ** 1.5;
  const eta2 = nu / rho - 1;

  // Meridional arc
  const Ma =
    (1 + n + (5 / 4) * n ** 2 + (5 / 4) * n ** 3) * (lat - lat0);
  const Mb =
    (3 * n + 3 * n ** 2 + (21 / 8) * n ** 3) *
    Math.sin(lat - lat0) *
    Math.cos(lat + lat0);
  const Mc =
    ((15 / 8) * n ** 2 + (15 / 8) * n ** 3) *
    Math.sin(2 * (lat - lat0)) *
    Math.cos(2 * (lat + lat0));
  const Md =
    ((35 / 24) * n ** 3) *
    Math.sin(3 * (lat - lat0)) *
    Math.cos(3 * (lat + lat0));
  const M = b * F0 * (Ma - Mb + Mc - Md);

  const dLng = lng - lng0;
  const cos3 = cosLat ** 3;
  const cos5 = cosLat ** 5;
  const tan2 = tanLat ** 2;
  const tan4 = tanLat ** 4;

  const I = M + N0;
  const II = (nu / 2) * sinLat * cosLat;
  const III =
    (nu / 24) * sinLat * cos3 * (5 - tan2 + 9 * eta2);
  const IIIA =
    (nu / 720) *
    sinLat *
    cos5 *
    (61 - 58 * tan2 + tan4);
  const IV = nu * cosLat;
  const V =
    (nu / 6) * cos3 * (nu / rho - tan2);
  const VI =
    (nu / 120) *
    cos5 *
    (5 - 18 * tan2 + tan4 + 14 * eta2 - 58 * tan2 * eta2);

  const N =
    I +
    II * dLng ** 2 +
    III * dLng ** 4 +
    IIIA * dLng ** 6;
  const E =
    E0 +
    IV * dLng +
    V * dLng ** 3 +
    VI * dLng ** 5;

  return { easting: E, northing: N };
}

// Grid letters from 100km square
const GRID_LETTERS = "VWXYZQRSTULMNOPFGHJKABCDE";

function eastingNorthingToGridRef(
  easting: number,
  northing: number,
  digits: number = 4
): string {
  // 500km squares
  const e100 = Math.floor(easting / 500000);
  const n100 = Math.floor(northing / 500000);
  const letter1 = GRID_LETTERS[5 * n100 + e100];

  // 100km squares within the 500km square
  const e100km = Math.floor((easting % 500000) / 100000);
  const n100km = Math.floor((northing % 500000) / 100000);
  const letter2 = GRID_LETTERS[5 * n100km + e100km];

  // Remaining easting/northing
  const eRem = easting % 100000;
  const nRem = northing % 100000;

  const div = 10 ** (5 - digits / 2);
  const ePart = Math.floor(eRem / div)
    .toString()
    .padStart(digits / 2, "0");
  const nPart = Math.floor(nRem / div)
    .toString()
    .padStart(digits / 2, "0");

  return `${letter1}${letter2} ${ePart} ${nPart}`;
}

/**
 * Convert WGS84 lat/lng to Ordnance Survey Grid Reference
 * Returns grid ref string (e.g. "SP 5763 2712") or null if outside UK grid
 */
export function latLngToOSGridRef(
  lat: number,
  lng: number,
  digits: number = 8
): string | null {
  // Quick bounds check (rough UK area)
  if (lat < 49.8 || lat > 61 || lng < -8.7 || lng > 1.8) {
    return null;
  }

  const latRad = toRadians(lat);
  const lngRad = toRadians(lng);

  // WGS84 → cartesian
  const wgs84Cart = latLngToCartesian(latRad, lngRad, 0, WGS84);

  // Helmert transform → OSGB36 cartesian
  const osgb36Cart = helmertTransform(wgs84Cart);

  // Cartesian → OSGB36 lat/lng
  const osgb36 = cartesianToLatLng(
    osgb36Cart.x,
    osgb36Cart.y,
    osgb36Cart.z,
    AIRY1830
  );

  // OSGB36 lat/lng → easting/northing
  const { easting, northing } = latLngToEastingNorthing(
    osgb36.lat,
    osgb36.lng
  );

  // Check if within grid bounds
  if (easting < 0 || easting > 700000 || northing < 0 || northing > 1300000) {
    return null;
  }

  return eastingNorthingToGridRef(easting, northing, digits);
}
