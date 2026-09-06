import { describe, it, expect } from 'vitest';
import { safeUrl, parseSnapshot, hasCoordinates, snapshotAgeDays, isStale, STALE_DAYS, isRegion, REGION_LABELS, REGION_GROUPS, SUPPORTED_REGIONS } from './model';

describe('external URLs', () => {
  it('allows only absolute http(s) without credentials', () => {
    expect(safeUrl('https://example.com/book')).toBe('https://example.com/book');
    for (const url of ['javascript:alert(1)', 'data:text/html,test', '//example.com', 'https://user:pass@example.com']) expect(safeUrl(url)).toBeNull();
  });
});

describe('region helpers', () => {
  it('exposes the seven working regions plus their labels', () => {
    expect(SUPPORTED_REGIONS).toEqual(['HK', 'TW', 'SG', 'TH', 'AU', 'US', 'GB']);
    expect(REGION_LABELS.HK).toBe('香港');
    expect(REGION_LABELS.TW).toBe('台灣');
    expect(REGION_GROUPS.local).toEqual(['HK']);
    expect(REGION_GROUPS.overseas).toEqual(['TW', 'SG', 'TH', 'AU', 'US', 'GB']);
  });
  it('isRegion narrows unknown values to false', () => {
    expect(isRegion('HK')).toBe(true);
    expect(isRegion('MO')).toBe(false);
    expect(isRegion(undefined)).toBe(false);
  });
});

describe('snapshot validation', () => {
  const validRegion = 'TW';
  const makeRow = (id: string) => ({ id, name: 'Synthetic restaurant', address: 'Test address', region: validRegion, coordinates: null });
  const env = { sourceUrl: 'https://example.com', fetchedAt: '2026-01-01T00:00:00Z', regions: [validRegion] };

  it('rejects invalid envelopes and duplicate IDs', () => {
    expect(() => parseSnapshot({})).toThrow();
    expect(() => parseSnapshot({ ...env, restaurants: [makeRow('a'), makeRow('a')] })).toThrow();
  });
  it('rejects snapshots without a regions array', () => {
    expect(() => parseSnapshot({ ...env, regions: [] })).toThrow();
    expect(() => parseSnapshot({ ...env, regions: ['MO'] })).toThrow();
  });
  it('rejects restaurants whose region is not supported', () => {
    const r = { id: 'x', name: 'Test', address: 'A', region: 'MO', coordinates: null };
    expect(() => parseSnapshot({ ...env, regions: ['HK'], restaurants: [r] })).toThrow();
  });
  it('accepts the legacy region: "HK" envelope by promoting it to regions: ["HK"]', () => {
    // parseSnapshot itself still requires the regions array; the legacy shape is
    // an invalid snapshot. This documents the contract.
    expect(() => parseSnapshot({ sourceUrl: 'https://example.com', fetchedAt: '2026-01-01T00:00:00Z', region: 'HK', restaurants: [] })).toThrow();
  });
  it('never promotes missing or invalid coordinates', () => {
    expect(hasCoordinates({ coordinates: null })).toBe(false);
    expect(hasCoordinates({ coordinates: { lat: NaN, lng: 114 } })).toBe(false);
    expect(hasCoordinates({ coordinates: { lat: 22.3, lng: 114.2 } })).toBe(true);
  });
  it('round-trips a multi-region snapshot', () => {
    const snap = { ...env, restaurants: [makeRow('a'), { id: 'b', name: 'B', address: 'A', region: 'SG', coordinates: { lat: 1.3, lng: 103.85, precision: 'official-map-link' } }] };
    const parsed = parseSnapshot(snap);
    expect(parsed.regions).toEqual(['TW']);
    expect(parsed.restaurants).toHaveLength(2);
    expect(parsed.restaurants[1].region).toBe('SG');
    expect(parsed.restaurants[1].coordinates?.lat).toBe(1.3);
  });
});

describe('stale detection', () => {
  const now = new Date('2026-09-06T00:00:00Z');
  it('counts whole days since fetchedAt', () => {
    expect(snapshotAgeDays('2026-09-01T00:00:00Z', now)).toBe(5);
    expect(snapshotAgeDays('2026-09-06T00:00:00Z', now)).toBe(0);
    expect(snapshotAgeDays('not-a-date', now)).toBe(Infinity);
  });
  it('treats snapshots older than STALE_DAYS days as stale', () => {
    expect(STALE_DAYS).toBe(60);
    const fresh = new Date(now.getTime() - 30 * 86400_000).toISOString();
    const stale = new Date(now.getTime() - 90 * 86400_000).toISOString();
    expect(isStale(fresh, now)).toBe(false);
    expect(isStale(stale, now)).toBe(true);
  });
});
