import {
  StrictMode,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import {
  AMEX_URL,
  hasCoordinates,
  parseSnapshot,
  safeUrl,
  isStale,
  snapshotAgeDays,
  REGION_LABELS,
  REGION_GROUPS,
  type Region,
  type Restaurant,
  type Snapshot,
} from "./model";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { ClusteredPins } from "./ClusteredPins";
import {
  EMPTY_FILTERS,
  filterRestaurants,
  filterOptions,
  availableRegions,
  type Scope,
  type Filters,
} from "./filters";

type Language = "zh" | "en";

const REGION_LABELS_EN: Record<Region, string> = {
  HK: "Hong Kong",
  AU: "Australia",
  NZ: "New Zealand",
  SG: "Singapore",
  TW: "Taiwan",
  TH: "Thailand",
  AT: "Austria",
  FR: "France",
  DE: "Germany",
  IT: "Italy",
  ES: "Spain",
  GB: "United Kingdom",
  CA: "Canada",
  MX: "Mexico",
  US: "United States",
};

const copy = {
  zh: {
    skip: "跳至餐廳名單",
    home: "餐桌地圖首頁",
    brand: "餐桌地圖",
    source: "官方禮遇名單",
    hero: (
      <>
        下一席，<em>在香港。</em>
      </>
    ),
    intro: (
      <>
        從一頓精緻晚餐，到一次城市探索。
        <br className="mobile-break" /> 在地圖上，找到你的美國運通餐飲禮遇餐廳。
      </>
    ),
    guide: "香港餐飲指南",
    edition: "一城・百味",
    unofficial: "獨立整理 · 非官方網站",
    loadError: "暫時無法載入餐廳名單",
    loadHelp: "請檢查網絡連線，然後重試。你亦可直接參考官方名單。",
    reload: "重新載入",
    loading: "正在準備你的餐桌地圖…",
    explore: "探索餐廳",
    restaurants: "間餐廳",
    mapped: "間已定位",
    unmapped: "間待定位",
    snapshot: "資料快照",
    stale: "超過 60 日",
    regions: "個地區",
    filters: "搜尋與篩選",
    search: "搜尋餐廳",
    placeholder: "餐廳名稱或地址（中／英文）",
    district: "地區",
    allDistricts: "所有地區",
    cuisine: "菜式",
    allCuisines: "所有菜式",
    scope: "範圍",
    scopeLabel: "本地或海外",
    local: "本地（香港）",
    overseas: "海外",
    all: "全部",
    overseasRegion: "海外地區",
    allOverseas: "所有海外地區",
    clear: "清除篩選",
    found: "找到",
    mapShows: "地圖顯示",
    viewDetails: "待定位餐廳可於名單查看詳情",
    browse: "瀏覽方式",
    list: "餐廳名單",
    map: "地圖探索",
    explorer: "餐廳地圖與名單",
    next: "你的下一站",
    choose: "選擇餐廳以查看詳情 ↗",
    located: "已定位",
    hotel: "酒店餐廳",
    new: "新登場",
    noResults: "找不到符合條件的餐廳",
    tryOther: "試試其他名稱、地址，或放寬地區及菜式篩選。",
    showAll: "顯示所有餐廳",
    mapLabel: "香港餐廳地圖",
    benefit: "餐飲禮遇餐廳",
    reset: "⌖ 重設視野",
    tileError: "地圖底圖暫時無法載入；餐廳名單及詳情仍可使用。",
    retry: "重試",
    positions: "餐廳位置",
    noMarkers: "沒有符合條件的地圖標記",
    chooseMapped: "切換到「全部」或揀返有座標嘅餐廳",
    awaiting: "符合條件的餐廳尚待定位，請查看名單地址。",
    caption: "以一席美味，重新認識香港。",
    captionNote: "位置僅供參考 · 請以餐廳地址為準",
    selected: "已選餐廳詳情",
    footerTitle: "出發之前，先確認禮遇。",
    footer:
      "本網站為非官方獨立指南，與 American Express／美國運通並無關聯。餐廳名單及禮遇或會更改；適用卡種、預訂、付款方式及其他條款，均以美國運通及餐廳最新公布為準。地圖座標僅供參考，並不保證入口位置。",
    terms: "查看官方條款",
  },
  en: {
    skip: "Skip to restaurant list",
    home: "Dining Atlas home",
    brand: "Dining Atlas",
    source: "Official benefit list",
    hero: (
      <>
        Your next table, <em>in Hong Kong.</em>
      </>
    ),
    intro: (
      <>
        From a memorable dinner to a new way to explore the city.
        <br className="mobile-break" /> Find American Express dining benefit
        restaurants on the map.
      </>
    ),
    guide: "Hong Kong dining guide",
    edition: "One city · Many flavours",
    unofficial: "Independently curated · Unofficial",
    loadError: "Unable to load the restaurant list",
    loadHelp: "Check your connection and try again, or view the official list.",
    reload: "Reload",
    loading: "Preparing your dining map…",
    explore: "Explore restaurants",
    restaurants: "restaurants",
    mapped: "mapped",
    unmapped: "awaiting location",
    snapshot: "Data snapshot",
    stale: "Over 60 days old",
    regions: "regions",
    filters: "Search and filters",
    search: "Search restaurants",
    placeholder: "Restaurant name or address (Chinese / English)",
    district: "District",
    allDistricts: "All districts",
    cuisine: "Cuisine",
    allCuisines: "All cuisines",
    scope: "Scope",
    scopeLabel: "Local or overseas",
    local: "Local (Hong Kong)",
    overseas: "Overseas",
    all: "All",
    overseasRegion: "Overseas region",
    allOverseas: "All overseas regions",
    clear: "Clear filters",
    found: "Found",
    mapShows: "shown on map",
    viewDetails: "unmapped restaurants remain available in the list",
    browse: "Browse view",
    list: "Restaurant list",
    map: "Explore map",
    explorer: "Restaurant map and list",
    next: "Your next stop",
    choose: "Select a restaurant for details ↗",
    located: "Mapped",
    hotel: "Hotel restaurant",
    new: "New",
    noResults: "No matching restaurants",
    tryOther:
      "Try another name or address, or broaden the district and cuisine filters.",
    showAll: "Show all restaurants",
    mapLabel: "Restaurant map",
    benefit: "Dining benefit restaurant",
    reset: "⌖ Reset view",
    tileError:
      "Map tiles are temporarily unavailable; the restaurant list and details still work.",
    retry: "Retry",
    positions: "Restaurant locations",
    noMarkers: "No matching map markers",
    chooseMapped: "Switch to All or choose restaurants with map coordinates",
    awaiting:
      "Matching restaurants are awaiting location; check their addresses in the list.",
    caption: "Rediscover Hong Kong, one meal at a time.",
    captionNote: "Locations are indicative · Check the restaurant address",
    selected: "Selected restaurant details",
    footerTitle: "Confirm the benefit before you go.",
    footer:
      "This independent guide is unofficial and is not affiliated with American Express. Restaurant participation and benefits may change. Eligible cards, booking and payment requirements, and all other terms are governed by the latest information from American Express and each restaurant. Map coordinates are indicative only.",
    terms: "View official terms",
  },
} as const;

function External({
  href,
  children,
  className,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  const url = safeUrl(href);
  return url ? (
    <a
      href={url}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  ) : null;
}
function Details({ r, language }: { r: Restaurant; language: Language }) {
  const phone = r.phone?.replace(/[\s().-]/g, "");
  const english = language === "en";
  return (
    <div className="details">
      <p className="eyebrow">
        {r.district || (english ? "Hong Kong" : "香港")} ·{" "}
        {r.cuisine || (english ? "Dining benefit" : "餐飲禮遇")}
      </p>
      <h3>{english ? r.nameEn || r.name : r.name}</h3>
      {!english && r.nameEn && r.nameEn !== r.name && (
        <p className="english">{r.nameEn}</p>
      )}
      <p className="address">
        {english ? r.addressEn || r.address : r.address}
      </p>
      {r.coordinates?.precision === "building" && (
        <p className="hotel-note">
          {english
            ? "Approximate location · Pinned to the building, not necessarily the entrance."
            : "約略位置 · 按建築物定位，並非餐廳入口。請以餐廳地址為準。"}
        </p>
      )}
      {r.isInHotel && (
        <p className="hotel-note">
          {english
            ? "Hotel restaurant · Pay the restaurant directly rather than charging the meal to your room; official terms apply."
            : "酒店內餐廳 · 如入住該酒店，需於餐廳直接付款，不能掛帳於房間；以官方條款為準。"}
        </p>
      )}
      {!hasCoordinates(r) && (
        <p className="hotel-note">
          {english
            ? "Awaiting location · Reliable coordinates are unavailable; use the address or Google Maps."
            : "待定位 · 尚未有可靠座標，請參考地址或開啟 Google 地圖。"}
        </p>
      )}
      <div className="detail-links">
        <External href={r.website}>
          {english ? "Restaurant website / booking" : "餐廳官網／訂座"}
        </External>
        {phone && /^\+?[\d]{6,15}$/.test(phone) && (
          <a href={`tel:${phone}`}>
            {english ? "Call" : "致電"} {r.phone}
          </a>
        )}
        <External href={r.googleMapsUrl}>Google Maps</External>
        <External href={AMEX_URL}>
          {english ? "Official American Express benefit" : "美國運通官方禮遇"}
        </External>
      </div>
    </div>
  );
}
function ViewControl({
  restaurants,
  reset,
}: {
  restaurants: Restaurant[];
  reset: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.closePopup();
    const points = restaurants
      .filter(hasCoordinates)
      .map((r) => [r.coordinates!.lat, r.coordinates!.lng] as [number, number]);
    if (points.length)
      map.fitBounds(points, { padding: [45, 45], maxZoom: 14, animate: false });
    else map.setView([22.31, 114.17], 11);
  }, [map, restaurants, reset]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  // Click-outside on the map (not on a marker or popup) closes any open popup.
  // This complements the bottom-positioned .map-actions bar so neither overlay
  // ever visually traps the popup close button on narrow viewports.
  useEffect(() => {
    const onMapClick = (event: L.LeafletMouseEvent) => {
      const target = event.originalEvent.target as HTMLElement | null;
      if (!target) {
        map.closePopup();
        return;
      }
      if (
        target.closest(".leaflet-popup") ||
        target.closest(".leaflet-marker-icon") ||
        target.closest(".map-actions")
      )
        return;
      map.closePopup();
    };
    map.on("click", onMapClick);
    return () => {
      map.off("click", onMapClick);
    };
  }, [map]);
  return null;
}
function App() {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem("amex-dining-language") === "en" ? "en" : "zh",
  );
  const t = copy[language];
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [revision, setRevision] = useState(0),
    [reset, setReset] = useState(0),
    [tileError, setTileError] = useState(false),
    [view, setView] = useState<"list" | "map">("list");
  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "zh-HK";
    localStorage.setItem("amex-dining-language", language);
  }, [language]);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(`${import.meta.env.BASE_URL}data/restaurants.json`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error("load");
        return r.json();
      })
      .then(parseSnapshot)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  // Phase 4A — warn in the console when the snapshot is older than the freshness window.
  useEffect(() => {
    if (!data) return;
    const age = snapshotAgeDays(data.fetchedAt);
    if (isStale(data.fetchedAt))
      console.warn(
        `[amex-dining] snapshot is ${age} days old; consider running \`python3 scripts/refresh.py --all --write\``,
      );
  }, [data]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const presentRegions = useMemo(
    () => availableRegions(data?.restaurants ?? []),
    [data],
  );
  const visible = useMemo(
    () => filterRestaurants(data?.restaurants ?? [], filters),
    [data, filters],
  );
  const mapped = useMemo(() => visible.filter(hasCoordinates), [visible]);
  const optionRows = useMemo(
    () =>
      filterRestaurants(data?.restaurants ?? [], {
        ...EMPTY_FILTERS,
        scope: filters.scope,
        region: filters.region,
      }),
    [data, filters.scope, filters.region],
  );
  const districts = useMemo(
    () => filterOptions(optionRows, "district"),
    [optionRows],
  );
  const cuisines = useMemo(
    () => filterOptions(optionRows, "cuisine"),
    [optionRows],
  );
  const active = visible.find((r) => r.id === selected);
  function setScope(next: Scope) {
    updateFilters({
      ...filters,
      scope: next,
      region: next === "local" ? "" : filters.region,
      district: "",
      cuisine: "",
    });
  }
  function updateFilters(next: Filters) {
    setFilters(next);
    setSelected(null);
  }
  function clearFilters() {
    updateFilters(EMPTY_FILTERS);
    setReset((n) => n + 1);
  }

  function select(r: Restaurant, fromList = false) {
    setSelected(r.id);
    setRevision((n) => n + 1);
    if (fromList && hasCoordinates(r)) setView("map");
  }
  const fetchedDate = data
    ? new Intl.DateTimeFormat(language === "en" ? "en-GB" : "zh-HK", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Hong_Kong",
      }).format(new Date(data.fetchedAt))
    : "";
  const stale = data && isStale(data.fetchedAt);
  const overseasRegions = presentRegions.filter((r) =>
    REGION_GROUPS.overseas.includes(r),
  );
  return (
    <>
      <a className="skip-link" href="#restaurant-list">
        {t.skip}
      </a>
      <header className="masthead">
        <a className="brand" href="./" aria-label={t.home}>
          <span className="brand-icon" aria-hidden="true">
            ✳
          </span>{" "}
          {t.brand}
          <span className="brand-en">THE DINING ATLAS</span>
        </a>
        <div className="header-actions">
          <External href={AMEX_URL} className="source-link">
            {t.source}
          </External>
          <button
            className="language-toggle"
            type="button"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            aria-label={language === "zh" ? "Switch to English" : "切換至中文"}
          >
            {language === "zh" ? "EN" : "中文"}
          </button>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">HONG KONG / DINING COLLECTION</p>
            <h1>{t.hero}</h1>
            <p className="intro-copy">{t.intro}</p>
          </div>
          <div className="edition">
            <span>{t.guide}</span>
            <strong>{t.edition}</strong>
            <small>{t.unofficial}</small>
          </div>
        </section>
        {!data ? (
          <section className="load-state" aria-live="polite">
            {error ? (
              <>
                <h2>{t.loadError}</h2>
                <p>{t.loadHelp}</p>
                <button onClick={() => setAttempt((n) => n + 1)}>
                  {t.reload}
                </button>
              </>
            ) : (
              <>
                <span className="loading-dot" />
                <h2>{t.loading}</h2>
              </>
            )}
          </section>
        ) : (
          <>
            <div className="collection-bar">
              <div>
                <h2>{t.explore}</h2>
                <span>
                  <b>{visible.length}</b> / {data.restaurants.length}{" "}
                  {t.restaurants} <i /> <b>{mapped.length}</b> {t.mapped} <i />{" "}
                  {visible.length - mapped.length} {t.unmapped}
                </span>
              </div>
              <p className="snapshot-meta">
                {t.snapshot} ·{" "}
                <time dateTime={data.fetchedAt}>{fetchedDate}</time>
                {stale && (
                  <span
                    className="stale-pill"
                    title={
                      language === "en"
                        ? "Data is over 60 days old; run scripts/refresh.py"
                        : "資料超過 60 日，請執行 scripts/refresh.py"
                    }
                  >
                    {" "}
                    {t.stale}
                  </span>
                )}
                {overseasRegions.length > 0 && (
                  <span className="regions-pill">
                    {" "}
                    {data.restaurants.length} {t.restaurants} ·{" "}
                    {presentRegions.length} {t.regions}
                  </span>
                )}
              </p>
            </div>
            <section className="filters" aria-label={t.filters}>
              <label className="search-field">
                {t.search}
                <input
                  type="search"
                  value={filters.query}
                  onChange={(e) =>
                    updateFilters({ ...filters, query: e.target.value })
                  }
                  placeholder={t.placeholder}
                />
              </label>
              <label>
                {t.district}
                <select
                  value={filters.district}
                  onChange={(e) =>
                    updateFilters({ ...filters, district: e.target.value })
                  }
                >
                  <option value="">{t.allDistricts}</option>
                  {districts.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                {t.cuisine}
                <select
                  value={filters.cuisine}
                  onChange={(e) =>
                    updateFilters({ ...filters, cuisine: e.target.value })
                  }
                >
                  <option value="">{t.allCuisines}</option>
                  {cuisines.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              {overseasRegions.length > 0 && (
                <label>
                  {t.scope}
                  <select
                    value={filters.scope}
                    onChange={(e) => setScope(e.target.value as Scope)}
                    aria-label={t.scopeLabel}
                  >
                    <option value="local">{t.local}</option>
                    <option value="overseas">{t.overseas}</option>
                    <option value="all">{t.all}</option>
                  </select>
                </label>
              )}
              {filters.scope !== "local" && overseasRegions.length > 0 && (
                <label>
                  {t.overseasRegion}
                  <select
                    value={filters.region}
                    onChange={(e) =>
                      updateFilters({
                        ...filters,
                        region: e.target.value as Region | "",
                        district: "",
                        cuisine: "",
                      })
                    }
                    aria-label={t.overseasRegion}
                  >
                    <option value="">{t.allOverseas}</option>
                    {overseasRegions.map((r) => (
                      <option key={r} value={r}>
                        {language === "en"
                          ? REGION_LABELS_EN[r]
                          : REGION_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="clear-filters"
                onClick={clearFilters}
                disabled={
                  !filters.query &&
                  !filters.district &&
                  !filters.cuisine &&
                  filters.scope === "local" &&
                  !filters.region
                }
              >
                {t.clear}
              </button>
              <p
                className="result-summary"
                aria-live="polite"
                aria-atomic="true"
              >
                {t.found} {visible.length} {t.restaurants} · {t.mapShows}{" "}
                {mapped.length}
                {visible.length > mapped.length ? ` · ${t.viewDetails}` : ""}
              </p>
            </section>
            <div className="mobile-tabs" aria-label={t.browse}>
              <button
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                {t.list}
              </button>
              <button
                aria-pressed={view === "map"}
                onClick={() => setView("map")}
              >
                {t.map}
              </button>
            </div>
            <section
              className={`explorer show-${view}`}
              aria-label={t.explorer}
            >
              <aside className="list-panel" id="restaurant-list" tabIndex={-1}>
                <div className="list-hint">
                  {t.next} <span>{t.choose}</span>
                </div>
                <ul>
                  {visible.map((r, i) => (
                    <li
                      key={r.id}
                      className={selected === r.id ? "active" : ""}
                    >
                      <button
                        className="restaurant-button"
                        aria-pressed={selected === r.id}
                        onClick={() => select(r, true)}
                      >
                        <span className="restaurant-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="restaurant-summary">
                          <span className="restaurant-meta">
                            {language === "en"
                              ? REGION_LABELS_EN[r.region]
                              : REGION_LABELS[r.region]}
                            {r.district ? ` · ${r.district}` : ""}
                            {r.cuisine ? ` · ${r.cuisine}` : ""}
                          </span>
                          <span className="restaurant-name">
                            {language === "en" ? r.nameEn || r.name : r.name}
                          </span>
                          {language === "zh" &&
                            r.nameEn &&
                            r.nameEn !== r.name && (
                              <span className="restaurant-en">{r.nameEn}</span>
                            )}
                          <span className="restaurant-address">
                            {language === "en"
                              ? r.addressEn || r.address
                              : r.address}
                          </span>
                          <span className="tags">
                            {!hasCoordinates(r) ? (
                              <span className="unmapped">{t.unmapped}</span>
                            ) : (
                              <span>{t.located}</span>
                            )}
                            {r.isInHotel && <span>{t.hotel}</span>}
                            {r.isNew && <span>{t.new}</span>}
                            {r.region !== "HK" && (
                              <span className="overseas-tag">
                                {language === "en"
                                  ? REGION_LABELS_EN[r.region]
                                  : REGION_LABELS[r.region]}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="card-arrow" aria-hidden="true">
                          ↗
                        </span>
                      </button>
                      {selected === r.id && !hasCoordinates(r) && (
                        <Details r={r} language={language} />
                      )}
                    </li>
                  ))}
                </ul>
                {visible.length === 0 && (
                  <div className="empty">
                    <h3>{t.noResults}</h3>
                    <p>{t.tryOther}</p>
                    <button onClick={clearFilters}>{t.showAll}</button>
                  </div>
                )}
              </aside>
              <div className="map-panel" aria-label={t.mapLabel}>
                <div className="map-actions">
                  <span>
                    <span className="legend-dot" /> {t.benefit}
                  </span>
                  <button
                    onClick={() => {
                      setReset((n) => n + 1);
                      setSelected(null);
                    }}
                  >
                    {t.reset}
                  </button>
                </div>
                {tileError && (
                  <div className="tile-notice" role="status">
                    {t.tileError}
                    <button
                      onClick={() => {
                        setTileError(false);
                        setAttempt((n) => n + 1);
                      }}
                    >
                      {t.retry}
                    </button>
                  </div>
                )}
                <MapContainer
                  center={[22.31, 114.17]}
                  zoom={11}
                  scrollWheelZoom={false}
                  className="map"
                  aria-label={t.positions}
                >
                  <TileLayer
                    key={attempt}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    eventHandlers={{ tileerror: () => setTileError(true) }}
                  />
                  <ViewControl restaurants={visible} reset={reset} />
                  <ClusteredPins
                    restaurants={mapped}
                    selected={selected}
                    revision={revision}
                    onSelect={select}
                    details={(r) => <Details r={r} language={language} />}
                  />
                </MapContainer>
                {mapped.length === 0 && (
                  <div className="map-empty">
                    {visible.length === 0
                      ? t.noMarkers
                      : visible.length > 0 &&
                          filters.scope !== "local" &&
                          overseasRegions.length > 0
                        ? t.chooseMapped
                        : t.awaiting}
                  </div>
                )}
                <div className="map-caption">
                  {t.caption}
                  <span>{t.captionNote}</span>
                </div>
              </div>
            </section>
            {active && hasCoordinates(active) && (
              <section
                className="accessible-details"
                aria-label={t.selected}
                aria-live="polite"
              >
                <Details r={active} language={language} />
              </section>
            )}
          </>
        )}
        <footer>
          <div>
            <strong>{t.footerTitle}</strong>
            <p>{t.footer}</p>
          </div>
          <External href={AMEX_URL}>{t.terms}</External>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
