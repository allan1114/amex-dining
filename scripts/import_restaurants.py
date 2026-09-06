"""Import the public API used by the AMEX HK dining page (Python 3 stdlib).
No credentials needed. Coordinates without reviewed evidence remain null.

Supports multiple regions (HK + overseas dining benefit). Amex's merchant
API endpoint `dining-offers-prod.amex.r53.tuimedia.com/api/country/{REGION}/merchants`
uses the official `/api/countries` metadata. The regions below are active,
visible to the Hong Kong market, and currently return one or more merchants.
"""
import datetime, json, pathlib, re, urllib.request, urllib.error, argparse, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = 'https://www.americanexpress.com/zh-hk/benefits/diningbenefit/'
API_BASE = 'https://dining-offers-prod.amex.r53.tuimedia.com/api/country/{region}/merchants?origin=hk'
# Active countries from /api/countries which are visible to the HK market and
# currently return merchants for origin=hk. JP is active but returns zero rows,
# so it is deliberately omitted until Amex publishes participating merchants.
SUPPORTED_REGIONS = [
    'HK', 'AU', 'NZ', 'SG', 'TW', 'TH',
    'AT', 'FR', 'DE', 'IT', 'ES', 'GB',
    'CA', 'MX', 'US',
]
# Loose bounding boxes that comfortably cover each region's land area.
# Used as a sanity check on coordinates extracted from the official Google Maps
# link (precision: official-map-link).
REGION_BBOX = {
    'HK': (22.10, 22.60, 113.80, 114.50),
    'TW': (21.50, 25.40, 119.50, 122.10),
    'SG': ( 1.10,   1.55, 103.55, 104.10),
    'TH': ( 6.85,  20.50,  97.20, 105.80),
    'AU': (-44.50, -10.50, 112.50, 154.50),
    'NZ': (-48.00, -33.00, 165.00, 179.90),
    'AT': (45.00, 50.00,  8.00, 18.00),
    'FR': (41.00, 52.00, -6.00, 10.00),
    'DE': (47.00, 56.00,  5.00, 16.00),
    'IT': (35.00, 48.00,  6.00, 19.00),
    'ES': (27.00, 44.50, -19.00,  5.00),
    'US': ( 18.00,  72.00, -180.00, -65.00),
    'GB': ( 49.50,  61.00,  -8.50,   2.50),
    'CA': (41.00, 84.00, -142.00, -52.00),
    'MX': (14.00, 33.50, -119.00, -86.00),
}

def localized(obj, field, fallback=''):
    return (obj.get('translations', {}).get('zh_hk') or {}).get(field) or obj.get(field) or fallback

def fetch_region(region):
    """Fetch and parse the Amex merchant list for one region. Returns a list of raw rows."""
    url = API_BASE.format(region=region)
    req = urllib.request.Request(url, headers={'User-Agent': 'AMEXDiningMap/1.0 (+https://github.com/allan1114/amex-dining)'})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            return json.load(response)
    except urllib.error.HTTPError as e:
        if e.code == 422:
            print(f'  skip {region}: API returned 422 (region not exposed by Amex HK origin)', file=sys.stderr)
            return []
        raise

def normalize(raw, overrides, region):
    result = []
    bbox = REGION_BBOX[region]
    for row in raw:
        if not row.get('showMerchant', False) or row.get('isMerchantGroup'):
            continue
        business = row.get('businessData') or {}
        url = row.get('googleMapsUrl') or ''
        match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', url)
        coordinates = None
        if match:
            coordinates = {'lat': float(match[1]), 'lng': float(match[2]), 'source': url, 'precision': 'official-map-link'}
        else:
            reviewed = overrides.get(row['id'])
            if reviewed and reviewed['addressEn'] == row.get('address'):
                coordinates = reviewed['coordinates']
        if coordinates:
            lat, lng = coordinates['lat'], coordinates['lng']
            if not (bbox[0] < lat < bbox[1] and bbox[2] < lng < bbox[3]):
                print(f'  warning {region}: ignoring out-of-bounds official coordinates ({lat},{lng}) for {row["name"]}', file=sys.stderr)
                coordinates = None
        result.append({
            'id': row['id'],
            'name': localized(row, 'name'),
            'nameEn': row['name'],
            'address': localized(row, 'address'),
            'addressEn': row.get('address') or '',
            'district': localized(row.get('city') or {}, 'title'),
            'cuisine': localized(row.get('cuisine') or {}, 'title'),
            'website': business.get('website') or '',
            'phone': business.get('phone') or '',
            'googleMapsUrl': url,
            'isInHotel': bool(business.get('isInHotel')),
            'isNew': bool(business.get('isNew')),
            'region': region,
            'coordinates': coordinates,
        })
    ids = [r['id'] for r in result]
    if not result or len(ids) != len(set(ids)):
        raise ValueError('Empty or duplicate restaurant IDs in ' + region)
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--region', default='HK', help='Comma-separated region codes (default: HK). Use --all for every supported region.')
    parser.add_argument('--all', action='store_true', help='Fetch every region in SUPPORTED_REGIONS.')
    parser.add_argument('--input', type=pathlib.Path, help='Read raw rows from a local JSON file (skips HTTP). Must contain {"region": "...", "rows": [...]} or a bare list for the HK-style flow.')
    args = parser.parse_args()
    if args.all:
        regions = list(SUPPORTED_REGIONS)
    else:
        regions = [r.strip().upper() for r in args.region.split(',') if r.strip()]
        for r in regions:
            if r not in SUPPORTED_REGIONS:
                raise SystemExit(f'Unsupported region: {r}. Supported: {",".join(SUPPORTED_REGIONS)}')
    overrides_path = ROOT / 'data' / 'coordinate-overrides.json'
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    all_restaurants = []
    for region in regions:
        if args.input:
            payload = json.loads(args.input.read_text())
            raw = payload if isinstance(payload, list) else payload.get('rows', [])
        else:
            raw = fetch_region(region)
        rows = normalize(raw, overrides, region)
        print(f'  {region}: {len(rows)} restaurants, {sum(r["coordinates"] is not None for r in rows)} mapped', file=sys.stderr)
        all_restaurants.extend(rows)
    snapshot = {
        'sourceUrl': SOURCE,
        'apiUrl': API_BASE,
        'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'regions': regions,
        'restaurants': all_restaurants,
    }
    path = ROOT / 'public' / 'data' / 'restaurants.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)
    print(json.dumps({'regions': regions, 'restaurants': len(all_restaurants), 'mapped': sum(r['coordinates'] is not None for r in all_restaurants), 'file': str(path)}))

if __name__ == '__main__':
    main()
