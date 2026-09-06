import { describe, it, expect } from 'vitest';
import { safeUrl, parseSnapshot, hasCoordinates } from './model';
describe('external URLs', () => {
  it('allows only absolute http(s) without credentials', () => {
    expect(safeUrl('https://example.com/book')).toBe('https://example.com/book');
    for (const url of ['javascript:alert(1)', 'data:text/html,test', '//example.com', 'https://user:pass@example.com']) expect(safeUrl(url)).toBeNull();
  });
});
describe('snapshot validation', () => {
 it('rejects invalid envelopes and duplicate IDs', () => {
   expect(() => parseSnapshot({})).toThrow();
   const r = {id:'test',name:'Synthetic restaurant',address:'Test address',coordinates:null};
   expect(() => parseSnapshot({sourceUrl:'https://example.com',fetchedAt:'2026-01-01',region:'HK',restaurants:[r,r]})).toThrow();
 });
 it('never promotes missing or invalid coordinates', () => {
  expect(hasCoordinates({coordinates:null})).toBe(false);
  expect(hasCoordinates({coordinates:{lat:NaN,lng:114}})).toBe(false);
  expect(hasCoordinates({coordinates:{lat:22.3,lng:114.2}})).toBe(true);
 });
});