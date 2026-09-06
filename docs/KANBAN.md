# AMEX Dining — 分階段 Kanban

每個 MVP 先完成實作及驗證，交 Alan 檢視，再開始下一階段。此檔是 repo 內可讀狀態摘要；持久工作卡位於 Hermes 專案看板 `amex-dining`。GitHub Issues 留存同一階段的討論與驗收。

## 進行中

### MVP 1：香港餐廳地圖＋資訊卡
- Hermes：`t_553e1960`
- GitHub：[Issue #1](https://github.com/allan1114/amex-dining/issues/1)
- 狀態：實作／驗證中。
- 範圍：官方香港名單、可靠座標與來源、地圖點選資訊卡、餐廳清單、手機版、Vercel-ready。
- 資料：51 個唯一餐廳；22 個官方地圖座標、29 個政府大廈定位。
- 地圖並非環球完整名單；海外涵蓋屬 MVP 3。
- 真正 Vercel 上線：本機 CLI 憑證失效，需帳戶持有人登入／於 Vercel 匯入私人 GitHub repo，與 build-ready 驗收分開。

## Backlog（前一階段驗收後再啟動）

### MVP 2：搜尋、篩選及地圖互動
- Hermes：`t_c269f982`，`todo`（等待 MVP 1 review，已設父卡依賴）。
- GitHub：[Issue #2](https://github.com/allan1114/amex-dining/issues/2)
- 餐廳名／地址搜尋、地區及菜式篩選。
- 群組標記及重疊位置體驗、地圖與清單同步。
- 搜尋無結果、手機互動及可存取性驗證。

### MVP 3：海外餐廳與可持續資料更新
- Hermes：`t_f6ec07a3`，`todo`（等待 MVP 2 驗收，已設父卡依賴）。
- GitHub：[Issue #3](https://github.com/allan1114/amex-dining/issues/3)
- 擴展官方海外資料，按國家／城市漸進加入。
- 更新差異檢查、座標人工審核、舊資料提示。
- 保留每筆來源，不虛構地址、座標或禮遇。

## 檢視實際看板
```sh
hermes kanban --board amex-dining list
hermes kanban --board amex-dining show t_553e1960 --json
```
亦可在 Hermes WebUI 的 Kanban 選擇 **AMEX Dining Map**。本專案使用單一 default profile 也能保留完整狀態，不需要建立其他 profile。
