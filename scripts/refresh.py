"""Diff the current restaurants.json against a fresh fetch.

Usage:
  python3 scripts/refresh.py                # diff HK against current snapshot
  python3 scripts/refresh.py --region HK,TW # diff those regions
  python3 scripts/refresh.py --write         # apply: replace public/data/restaurants.json with the new snapshot

Prints added / removed / changed counts grouped per region. Never overwrites
the snapshot unless --write is passed, so a human can review the diff first.
"""
import argparse, json, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
IMPORT_SCRIPT = ROOT / 'scripts' / 'import_restaurants.py'
SNAPSHOT = ROOT / 'public' / 'data' / 'restaurants.json'

def load_existing():
    if not SNAPSHOT.exists():
        return {'restaurants': []}
    return json.loads(SNAPSHOT.read_text())

def fetch_fresh(regions):
    """Run import_restaurants.py in library mode to capture the rows without
    writing to the public path.
    """
    import importlib.util
    spec = importlib.util.spec_from_file_location('importer', IMPORT_SCRIPT)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    overrides_path = ROOT / 'data' / 'coordinate-overrides.json'
    overrides = json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    all_rows = []
    for region in regions:
        raw = mod.fetch_region(region)
        rows = mod.normalize(raw, overrides, region)
        all_rows.extend(rows)
    return all_rows

def diff(old_rows, new_rows):
    old_by_id = {r['id']: r for r in old_rows}
    new_by_id = {r['id']: r for r in new_rows}
    added = [r for rid, r in new_by_id.items() if rid not in old_by_id]
    removed = [r for rid, r in old_by_id.items() if rid not in new_by_id]
    changed = []
    for rid, new_r in new_by_id.items():
        if rid in old_by_id:
            old_r = old_by_id[rid]
            diff_fields = {}
            for f in ('name', 'address', 'googleMapsUrl', 'district', 'cuisine', 'isNew'):
                if old_r.get(f) != new_r.get(f):
                    diff_fields[f] = {'old': old_r.get(f), 'new': new_r.get(f)}
            old_coords = old_r.get('coordinates'); new_coords = new_r.get('coordinates')
            if (old_coords or {}).get('lat') != (new_coords or {}).get('lat') or \
               (old_coords or {}).get('lng') != (new_coords or {}).get('lng'):
                diff_fields['coordinates'] = {'old': old_coords, 'new': new_coords}
            if diff_fields:
                changed.append({'id': rid, 'name': new_r['name'], 'region': new_r.get('region'), 'changes': diff_fields})
    return added, removed, changed

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--region', default='HK')
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--write', action='store_true', help='Replace public/data/restaurants.json with the fresh snapshot.')
    args = parser.parse_args()
    if args.all:
        regions = list(__import__('import_restaurants').SUPPORTED_REGIONS)
    else:
        from import_restaurants import SUPPORTED_REGIONS
        regions = [r.strip().upper() for r in args.region.split(',') if r.strip()]
        for r in regions:
            if r not in SUPPORTED_REGIONS:
                raise SystemExit(f'Unsupported region: {r}')
    existing = load_existing()
    new_rows = fetch_fresh(regions)
    old_rows = [r for r in existing.get('restaurants', []) if r.get('region') in regions]
    added, removed, changed = diff(old_rows, new_rows)
    print(f'Regions: {",".join(regions)}')
    print(f'  existing rows: {len(old_rows)}')
    print(f'  fresh rows:    {len(new_rows)}')
    print(f'  added:   {len(added)}')
    print(f'  removed: {len(removed)}')
    print(f'  changed: {len(changed)}')
    if added:
        print('\n  Added (sample 10):')
        for r in added[:10]:
            print(f'    + [{r.get("region")}] {r["name"]}  ({r.get("district","")})')
    if removed:
        print('\n  Removed (sample 10):')
        for r in removed[:10]:
            print(f'    - [{r.get("region")}] {r["name"]}  ({r.get("district","")})')
    if changed:
        print('\n  Changed (sample 10):')
        for c in changed[:10]:
            fields = ', '.join(c['changes'].keys())
            print(f'    * [{c["region"]}] {c["name"]}  ({fields})')
    if args.write:
        # Merge fresh rows with existing rows from other regions.
        all_rows = [r for r in existing.get('restaurants', []) if r.get('region') not in regions]
        all_rows.extend(new_rows)
        import datetime
        snapshot = {
            'sourceUrl': existing.get('sourceUrl', 'https://www.americanexpress.com/zh-hk/benefits/diningbenefit/'),
            'apiUrl': existing.get('apiUrl', ''),
            'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'regions': sorted({r.get('region') for r in all_rows if r.get('region')}),
            'restaurants': all_rows,
        }
        SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
        temp = SNAPSHOT.with_suffix('.tmp')
        temp.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
        temp.replace(SNAPSHOT)
        print(f'\nWrote {SNAPSHOT}  ({len(all_rows)} rows across {len(snapshot["regions"])} regions)')
    else:
        print('\n(dry run — pass --write to apply)')

if __name__ == '__main__':
    main()
