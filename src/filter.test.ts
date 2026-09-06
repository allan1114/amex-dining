import { describe, expect, it } from 'vitest';
import { filterRestaurants, filterOptions } from './filters';
import type { Restaurant } from './model';
const restaurants: Restaurant[] = [
 {id:'a',name:'海景餐廳',nameEn:'Harbour TABLE',address:'中環皇后大道',addressEn:'Queen Road Central',district:'中環',cuisine:'法國菜',coordinates:{lat:22.3,lng:114.1}},
 {id:'b',name:'山景餐廳',address:'尖沙咀',district:'尖沙咀',cuisine:'法國菜',coordinates:null},
 {id:'c',name:'茶室',address:'中環',district:'中環',cuisine:'中菜',coordinates:null},
 {id:'d',name:'待分類',address:'香港',coordinates:null},
];
const empty = {query:'',district:'',cuisine:''};
describe('restaurant discovery',()=>{
 it('searches Chinese and English names and addresses, ignoring case, width and extra whitespace',()=>{
  for(const query of ['海景','  HARBOUR   table  ','ｈａｒｂｏｕｒ','queen central','皇后']) expect(filterRestaurants(restaurants,{...empty,query}).map(r=>r.id)).toEqual(['a']);
 });
 it('combines every search term and both exact filters with AND',()=>{
  expect(filterRestaurants(restaurants,{query:'餐廳',district:'中環',cuisine:'法國菜'}).map(r=>r.id)).toEqual(['a']);
  expect(filterRestaurants(restaurants,{query:'海景',district:'尖沙咀',cuisine:''})).toEqual([]);
  expect(filterRestaurants(restaurants,{...empty,district:'中'})).toEqual([]);
 });
 it('keeps unmapped entries and original order, resets without mutating source',()=>{
  expect(filterRestaurants(restaurants,{...empty,cuisine:'法國菜'}).map(r=>r.id)).toEqual(['a','b']);
  expect(filterRestaurants(restaurants,{...empty,query:'   '})).toEqual(restaurants);
  expect(restaurants).toHaveLength(4);
 });
 it('returns unique nonempty options from the complete snapshot',()=>{
  expect(filterOptions(restaurants,'district')).toHaveLength(2);
  expect(filterOptions(restaurants,'cuisine')).toEqual(expect.arrayContaining(['中菜','法國菜']));
  expect(filterOptions([],'district')).toEqual([]);
 });
});
