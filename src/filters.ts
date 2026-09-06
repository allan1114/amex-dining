import type { Region, Restaurant } from './model';
import { SUPPORTED_REGIONS, isRegion } from './model';
export type Scope = 'local' | 'overseas' | 'all';
export interface Filters { query: string; district: string; cuisine: string; scope: Scope; region: Region | '' }
const EMPTY_FILTERS: Filters = { query: '', district: '', cuisine: '', scope: 'local', region: '' };
export { EMPTY_FILTERS };
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en').trim();
function matchesScope(region: Region, scope: Scope): boolean {
  if (scope === 'all') return true;
  const isLocal = region === 'HK';
  return scope === 'local' ? isLocal : !isLocal;
}
export function filterRestaurants(restaurants: Restaurant[], filters: Filters): Restaurant[] {
  const terms = normalize(filters.query).split(/\s+/).filter(Boolean);
  return restaurants.filter((r) => {
    const text = normalize([r.name, r.nameEn, r.address, r.addressEn].filter(Boolean).join(' '));
    return (!filters.district || r.district === filters.district) &&
      (!filters.cuisine || r.cuisine === filters.cuisine) &&
      (!filters.region || r.region === filters.region) &&
      matchesScope(r.region, filters.scope) &&
      terms.every((term) => text.includes(term));
  });
}
export function filterOptions(restaurants: Restaurant[], field: 'district' | 'cuisine' | 'region'): string[] {
  return [...new Set(restaurants.map((r) => r[field]).filter((value): value is string => !!value?.trim()))]
    .sort((a, b) => a.localeCompare(b, 'zh-HK'));
}
export function availableRegions(restaurants: Restaurant[]): Region[] {
  const present = new Set(restaurants.map((r) => r.region).filter(isRegion));
  return SUPPORTED_REGIONS.filter((r) => present.has(r));
}
