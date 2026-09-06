export const AMEX_URL = 'https://www.americanexpress.com/zh-hk/benefits/diningbenefit/';
export interface Restaurant { id: string; name: string; nameEn?: string; address: string; addressEn?: string; district?: string; cuisine?: string; website?: string; phone?: string; googleMapsUrl?: string; isInHotel?: boolean; isNew?: boolean; coordinates: null | {lat:number; lng:number; source?:string; precision?:string}; }
export interface Snapshot { sourceUrl:string; fetchedAt:string; region:'HK'; restaurants:Restaurant[]; }
export function safeUrl(value: unknown): string | null {
  if(typeof value !== 'string') return null;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function hasCoordinates(r: {coordinates: {lat:number; lng:number} | null}): boolean {
 const c = r.coordinates;
 return !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat)<=90 && Math.abs(c.lng)<=180;
}
export function parseSnapshot(raw: unknown): Snapshot {
 if(!raw || typeof raw !== 'object') throw new Error('Invalid snapshot');
 const d = raw as Snapshot;
 if(d.region !== 'HK' || !safeUrl(d.sourceUrl) || typeof d.fetchedAt !== 'string' || !Number.isFinite(Date.parse(d.fetchedAt)) || !Array.isArray(d.restaurants)) throw new Error('Invalid snapshot');
 const ids = new Set<string>();
 const restaurants = d.restaurants.map(r => {
   if(!r || typeof r.id !== 'string' || !r.id || ids.has(r.id) || typeof r.name !== 'string' || !r.name || typeof r.address !== 'string') throw new Error('Invalid restaurant');
   ids.add(r.id);
   for(const key of ['nameEn','addressEn','district','cuisine','website','phone','googleMapsUrl'] as const) if(r[key] != null && typeof r[key] !== 'string') throw new Error('Invalid restaurant field');
   return {...r, coordinates: hasCoordinates(r) ? r.coordinates : null};
 });
 return {...d, restaurants};
}
