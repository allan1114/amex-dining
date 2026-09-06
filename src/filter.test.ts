import { describe, expect, it } from 'vitest';
import { filterRestaurants, filterOptions, availableRegions, EMPTY_FILTERS } from './filters';
import type { Restaurant } from './model';

const restaurants: Restaurant[] = [
  { id: 'a', name: '海景餐廳', nameEn: 'Harbour TABLE', address: '中環皇后大道', addressEn: 'Queen Road Central', district: '中環', cuisine: '法國菜', region: 'HK', coordinates: { lat: 22.3, lng: 114.1 } },
  { id: 'b', name: '山景餐廳', address: '尖沙咀', district: '尖沙咀', cuisine: '法國菜', region: 'HK', coordinates: null },
  { id: 'c', name: '茶室', address: '中環', district: '中環', cuisine: '中菜', region: 'HK', coordinates: null },
  { id: 'd', name: '待分類', address: '香港', region: 'HK', coordinates: null },
  { id: 'e', name: 'Taipei 鮑魚', address: '台北市新生南路', district: 'Taipei City', cuisine: '中菜', region: 'TW', coordinates: { lat: 25.04, lng: 121.53 } },
  { id: 'f', name: 'Orchard 餐廳', address: 'Singapore', district: 'Singapore', cuisine: '西式', region: 'SG', coordinates: { lat: 1.3, lng: 103.85 } },
];
const empty = { ...EMPTY_FILTERS };

describe('restaurant discovery', () => {
  it('searches Chinese and English names and addresses, ignoring case, width and extra whitespace', () => {
    for (const query of ['海景', '  HARBOUR   table  ', 'ｈａｒｂｏｕｒ', 'queen central', '皇后']) expect(filterRestaurants(restaurants, { ...empty, query }).map((r) => r.id)).toEqual(['a']);
  });
  it('combines every search term and both exact filters with AND', () => {
    expect(filterRestaurants(restaurants, { ...empty, query: '餐廳', district: '中環', cuisine: '法國菜' }).map((r) => r.id)).toEqual(['a']);
    expect(filterRestaurants(restaurants, { ...empty, query: '海景', district: '尖沙咀' })).toEqual([]);
    expect(filterRestaurants(restaurants, { ...empty, district: '中' })).toEqual([]);
  });
  it('keeps unmapped entries and original order, resets without mutating source', () => {
    expect(filterRestaurants(restaurants, { ...empty, cuisine: '法國菜' }).map((r) => r.id)).toEqual(['a', 'b']);
    expect(filterRestaurants(restaurants, { ...empty, scope: 'all', query: '   ' })).toEqual(restaurants);
    expect(restaurants).toHaveLength(6);
  });
  it('returns unique nonempty options from the complete snapshot', () => {
    expect(filterOptions(restaurants, 'district')).toHaveLength(4);
    expect(filterOptions(restaurants, 'cuisine')).toEqual(expect.arrayContaining(['中菜', '法國菜', '西式']));
    expect(filterOptions([], 'district')).toEqual([]);
  });
});

describe('region & scope filtering (MVP 3)', () => {
  it('default scope is "local" so HK-only is the landing view', () => {
    expect(EMPTY_FILTERS.scope).toBe('local');
    expect(filterRestaurants(restaurants, empty).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('scope overseas hides HK rows', () => {
    expect(filterRestaurants(restaurants, { ...empty, scope: 'overseas' }).map((r) => r.id)).toEqual(['e', 'f']);
  });
  it('scope all returns every row', () => {
    expect(filterRestaurants(restaurants, { ...empty, scope: 'all' })).toHaveLength(6);
  });
  it('explicit region filter narrows within scope', () => {
    expect(filterRestaurants(restaurants, { ...empty, scope: 'all', region: 'TW' }).map((r) => r.id)).toEqual(['e']);
  });
  it('region filter combines with district and cuisine', () => {
    expect(filterRestaurants(restaurants, { ...empty, scope: 'all', region: 'SG', district: 'Singapore' }).map((r) => r.id)).toEqual(['f']);
  });
  it('availableRegions preserves canonical order from SUPPORTED_REGIONS', () => {
    expect(availableRegions(restaurants)).toEqual(['HK', 'SG', 'TW']);
  });
  it('derives district options from the current scope instead of the whole snapshot', () => {
    const localRows = filterRestaurants(restaurants, empty);
    expect(filterOptions(localRows, 'district')).toEqual(['中環', '尖沙咀']);
    const overseasRows = filterRestaurants(restaurants, {...empty, scope:'overseas'});
    expect(filterOptions(overseasRows, 'district')).toEqual(['Singapore', 'Taipei City']);
  });
});
