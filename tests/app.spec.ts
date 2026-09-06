import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const snapshot = JSON.parse(readFileSync(new URL('../public/data/restaurants.json', import.meta.url), 'utf8'));
test('real snapshot renders and list opens pin details', async ({page},testInfo)=>{
 await page.goto('/');
 await expect(page.locator('.restaurant-button')).toHaveCount(snapshot.restaurants.length);
 await page.locator('.restaurant-button').first().click();
 await expect(page.locator('.leaflet-popup-content h3')).toHaveText(snapshot.restaurants[0].name);
 await expect(page.locator('.leaflet-popup-content a', {hasText:'美國運通官方禮遇'})).toHaveAttribute('rel','noopener noreferrer');
 await page.locator('.leaflet-popup-close-button').click();
 if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'餐廳名單',exact:true}).click();
 await page.locator('.restaurant-button').first().click();
 await expect(page.locator('.leaflet-popup-content h3')).toHaveText(snapshot.restaurants[0].name);
 await page.getByRole('button',{name:'重設視野'}).click();
 await expect(page.locator('.leaflet-popup-content')).toHaveCount(0);
 if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'餐廳名單',exact:true}).click();
 // Click the first restaurant again to bring its individual marker into view via cluster zoom
 await page.locator('.restaurant-button').first().click();
 await expect(page.locator('.leaflet-popup-content h3')).toHaveText(snapshot.restaurants[0].name);
 // Close popup then click the actual map marker (now individually rendered) and verify it still opens the right restaurant
 await page.locator('.leaflet-popup-close-button').click({force:true});
 await page.locator('[title="' + snapshot.restaurants[0].name + '"].leaflet-interactive').first().click({force:true});
 await expect(page.locator('.leaflet-popup-content h3')).toHaveText(snapshot.restaurants[0].name);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/${testInfo.project.name}-app.png`,fullPage:true});
});
test('failed data load has working retry',async({page})=>{
 let fail=true; await page.route('**/data/restaurants.json',route=> fail?route.fulfill({status:503,body:'unavailable'}):route.continue());
 await page.goto('/'); await expect(page.getByRole('heading',{name:'暫時無法載入餐廳名單'})).toBeVisible();
 fail=false; await page.getByRole('button',{name:'重新載入'}).click(); await expect(page.locator('.restaurant-button')).toHaveCount(snapshot.restaurants.length);
});
test('unmapped, unsafe URLs, shared coordinates and tile failures remain usable',async({page},testInfo)=>{
 const base={nameEn:'Synthetic test fixture',address:'測試地址',district:'測試區',cuisine:'測試菜式',isInHotel:true,phone:'+852 1234 5678',googleMapsUrl:'https://maps.google.com',website:'javascript:alert(1)'};
 const restaurants=[{...base,id:'fixture-a',name:'測試甲',coordinates:{lat:22.3,lng:114.17,precision:'building'}},{...base,id:'fixture-b',name:'測試乙',coordinates:{lat:22.3,lng:114.17,precision:'building'}},{...base,id:'fixture-c',name:'測試待定位',coordinates:null}];
 await page.route('**/data/restaurants.json',route=>route.fulfill({json:{...snapshot,restaurants}}));
 await page.route('**/*.tile.openstreetmap.org/**',route=>route.abort());
 await page.goto('/');
 await page.getByRole('button',{name:/測試待定位/}).click();
 await expect(page.locator('.list-panel .details')).toContainText('尚未有可靠座標');
 await expect(page.locator('.list-panel .details a',{hasText:'餐廳官網'})).toHaveCount(0);
 await page.locator('.restaurant-button').filter({hasText:'測試甲'}).click();
 await expect(page.locator('.leaflet-popup-content h3')).toHaveText('測試甲');
 await expect(page.locator('.leaflet-popup-content')).toContainText('約略位置');
 if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'餐廳名單',exact:true}).click();
 await page.locator('.restaurant-button').filter({hasText:'測試乙'}).click();
 await expect(page.locator('.leaflet-popup-content h3')).toHaveCount(1);
 await expect(page.locator('.leaflet-popup-content h3')).toHaveText('測試乙');
 await expect(page.getByRole('status')).toContainText('餐廳名單及詳情仍可使用');
});
