export const AMEX_URL = 'https://www.americanexpress.com/zh-hk/benefits/diningbenefit/';
export const SUPPORTED_REGIONS = ['HK', 'TW', 'SG', 'TH', 'AU', 'US', 'GB'] as const;
export type Region = typeof SUPPORTED_REGIONS[number];
export const REGION_LABELS: Record<Region, string> = {
  HK: '香港',
  TW: '台灣',
  SG: '新加坡',
  TH: '泰國',
  AU: '澳洲',
  US: '美國',
  GB: '英國',
};
export const REGION_GROUPS: Record<'local' | 'overseas', Region[]> = {
  local: ['HK'],
  overseas: ['TW', 'SG', 'TH', 'AU', 'US', 'GB'],
};
export function isRegion(value: unknown): value is Region {
  return typeof value === 'string' && (SUPPORTED_REGIONS as readonly string[]).includes(value);
}
export interface Restaurant {
  id: string;
  name: string;
  nameEn?: string;
  address: string;
  addressEn?: string;
  district?: string;
  cuisine?: string;
  website?: string;
  phone?: string;
  googleMapsUrl?: string;
  isInHotel?: boolean;
  isNew?: boolean;
  region: Region;
  coordinates: null | { lat: number; lng: number; source?: string; precision?: string };
}
export interface Snapshot {
  sourceUrl: string;
  fetchedAt: string;
  regions: Region[];
  restaurants: Restaurant[];
}
export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}
export function hasCoordinates(r: { coordinates: { lat: number; lng: number } | null }): boolean {
  const c = r.coordinates;
  return !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180;
}
/** Days since the snapshot was fetched, rounded down. Returns Infinity if the date is unparseable. */
export function snapshotAgeDays(fetchedAt: string, now: Date = new Date()): number {
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return Infinity;
  const diffMs = now.getTime() - t;
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}
export const STALE_DAYS = 60;
export function isStale(fetchedAt: string, now: Date = new Date()): boolean {
  return snapshotAgeDays(fetchedAt, now) > STALE_DAYS;
}
export function parseSnapshot(raw: unknown): Snapshot {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid snapshot');
  const d = raw as Snapshot;
  if (!safeUrl(d.sourceUrl) || typeof d.fetchedAt !== 'string' || !Number.isFinite(Date.parse(d.fetchedAt))) throw new Error('Invalid snapshot');
  const regionList: Region[] = Array.isArray(d.regions) ? d.regions.filter(isRegion) : [];
  if (regionList.length === 0) throw new Error('Invalid snapshot: regions missing or unsupported');
  if (!Array.isArray(d.restaurants)) throw new Error('Invalid snapshot');
  const ids = new Set<string>();
  const restaurants = d.restaurants.map((r) => {
    if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id) || typeof r.name !== 'string' || !r.name || typeof r.address !== 'string') throw new Error('Invalid restaurant');
    ids.add(r.id);
    for (const key of ['nameEn', 'addressEn', 'district', 'cuisine', 'website', 'phone', 'googleMapsUrl'] as const) {
      if (r[key] != null && typeof r[key] !== 'string') throw new Error('Invalid restaurant field');
    }
    if (!isRegion(r.region)) throw new Error(`Invalid restaurant region: ${r.region}`);
    return { ...r, coordinates: hasCoordinates(r) ? r.coordinates : null };
  });
  return { sourceUrl: d.sourceUrl, fetchedAt: d.fetchedAt, regions: regionList, restaurants };
}
