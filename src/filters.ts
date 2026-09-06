import type { Restaurant } from './model';
export interface Filters { query: string; district: string; cuisine: string }
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en').trim();
export function filterRestaurants(restaurants: Restaurant[], filters: Filters): Restaurant[] {
 const terms = normalize(filters.query).split(/\s+/).filter(Boolean);
 return restaurants.filter(r => {
  const text = normalize([r.name,r.nameEn,r.address,r.addressEn].filter(Boolean).join(' '));
  return (!filters.district || r.district === filters.district) && (!filters.cuisine || r.cuisine === filters.cuisine) && terms.every(term => text.includes(term));
 });
}
export function filterOptions(restaurants: Restaurant[], field: 'district' | 'cuisine'): string[] {
 return [...new Set(restaurants.map(r=>r[field]).filter((value): value is string => !!value?.trim()))].sort((a,b)=>a.localeCompare(b,'zh-HK'));
}
