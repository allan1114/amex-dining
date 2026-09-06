# 資料來源與定位方法

## 範圍
MVP 1 為香港版，並非環球完整名單。餐廳參與資格完全以 AMEX 即時官方清單與條款為準，本網站不是 American Express 官方產品，也不保證簽賬回贈。

- 官方頁面：https://www.americanexpress.com/zh-hk/benefits/diningbenefit/
- 該頁面前端實際呼叫的公開資料 API：https://dining-offers-prod.amex.r53.tuimedia.com/api/country/HK/merchants?origin=hk
- 快照時間：`public/data/restaurants.json` 的 `fetchedAt`（UTC）。不是餐廳自行更新時間。
- 匯入保留 `showMerchant` 餐廳、官方 UUID、中英文名稱地址、地區、菜式、官網／訂位連結、電話及酒店付款提醒旗標。
- 沒有複製 AMEX 標誌、餐廳照片或 API 憑證欄位。原始資料的中文空值回退至英文。

## 座標與精確度
首個快照共 51 個唯一餐廳：22 個由 AMEX 提供的 Google Maps URL 直接擷取座標，29 個由香港政府地點搜尋結果人工核對所屬大廈。

- `official-map-link`：AMEX 地圖連結所載的位置，不保證是餐廳入口。
- `building`：香港政府大廈／地址位置，是近似定位，不是樓層或餐廳門口；同一大廈內餐廳可重疊，使用清單分別選取。
- 政府 endpoint：`https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?q=...`。提供 `x,y` HK1980 方格座標，以 pyproj EPSG:2326 → EPSG:4326（always_xy）轉換。
- 人工核對包括大廈名稱、門牌和地區，不能盲選搜尋第一項。例如麗晶酒店選香港麗晶酒店而非同址的維港文化匯；大館選中央警署大樓；M+ 使用博物館道38號而不是模糊的 `M+` 搜尋結果。
- `data/coordinate-overrides.json` 保留每個政府候選與證據 URL，並綁定官方英文地址，地址改變會停止重用座標。
- 無法可靠定位的新增餐廳保留在清單，座標為 null，絕不填入虛構座標或地區中心點。

## 更新（人工審閱，不自動發布）
```sh
python3 scripts/import_restaurants.py
python3 scripts/test_import.py
git diff -- public/data/restaurants.json
npm test
npm run build
```
更新 API 出錯不會覆蓋現有快照；更新成功先寫暫存再原子替換。若出現未定位餐廳，先用政府地址資料人工核對並新增 override。匯入脚本不需要 Python 第三方依賴；只有重建政府座標的 `build_reviewed_coordinates.py` 需要 `pyproj`。

`geocode_candidates.py` 是研究輔助工具，抓取結果存檔供審閱，不能自動發佈第一個候選。不要在未重新核對下刷新候選後直接使用舊索引。網站正常運行只讀版本控制內 JSON，不需要瀏覽器跨域呼叫 AMEX，不需要伺服器 API key。

## 限制
資料只代表快照，餐廳可能搬遷、暫停營業或退出計劃。用餐／付款前應再次查看 AMEX 及餐廳官方資訊。酒店餐廳需直接於餐廳付款，不能掛帳房間，詳見官方條款。地圖圖磚依賴外部供應商及其使用條款；網絡失敗時仍可使用清單和外部地圖連結。
