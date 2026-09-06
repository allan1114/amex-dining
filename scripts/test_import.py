import importlib.util, pathlib, unittest, copy, json
ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('importer', ROOT / 'scripts' / 'import_restaurants.py')
assert spec is not None and spec.loader is not None
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

class ImportTests(unittest.TestCase):
    HK_REGION = 'HK'
    def row(self, **overrides):
        base = {
            'id': 'test-venue',
            'name': 'Test fixture',
            'address': 'Fixture address',
            'showMerchant': True,
            'translations': {'zh_hk': {'name': '測試餐廳', 'address': None}},
            'city': {'title': 'Test district'},
            'cuisine': {'title': 'Test cuisine'},
            'googleMapsUrl': 'https://www.google.com/maps/@22.28,114.17',
            'businessData': {},
        }
        base.update(overrides)
        return base

    def test_official_link_coordinates(self):
        row = mod.normalize([self.row()], {}, self.HK_REGION)[0]
        self.assertEqual(row['coordinates']['lat'], 22.28); self.assertEqual(row['name'], '測試餐廳')
        self.assertEqual(row['region'], 'HK')

    def test_null_translation_falls_back(self):
        self.assertEqual(mod.normalize([self.row()], {}, self.HK_REGION)[0]['address'], 'Fixture address')

    def test_missing_coordinate_remains_null(self):
        row = self.row(); row['googleMapsUrl'] = 'https://maps.app.goo.gl/example'
        self.assertIsNone(mod.normalize([row], {}, self.HK_REGION)[0]['coordinates'])

    def test_stale_override_not_reused(self):
        row = self.row(); row['googleMapsUrl'] = ''
        self.assertIsNone(mod.normalize([row], {'test-venue': {'addressEn': 'Old address', 'coordinates': {'lat': 22.28, 'lng': 114.17}}}, self.HK_REGION)[0]['coordinates'])

    def test_hidden_excluded(self):
        row = self.row(); hidden = copy.deepcopy(row); hidden['id'] = 'hidden'; hidden['showMerchant'] = False
        self.assertEqual(len(mod.normalize([row, hidden], {}, self.HK_REGION)), 1)

    def test_duplicate_fails(self):
        with self.assertRaises(ValueError):
            mod.normalize([self.row(), self.row()], {}, self.HK_REGION)

    def test_bad_coordinates_fail(self):
        row = self.row(); row['googleMapsUrl'] = 'https://www.google.com/maps/@51.50,-0.12'
        with self.assertRaises(ValueError):
            mod.normalize([row], {}, self.HK_REGION)

    def test_snapshot_has_provenance_for_every_entry(self):
        data = json.loads((ROOT / 'public' / 'data' / 'restaurants.json').read_text())
        rows = data['restaurants']; self.assertTrue(rows)
        self.assertEqual(len(rows), len({r['id'] for r in rows}))
        for row in rows:
            self.assertTrue(row['name']); self.assertTrue(row['address']); self.assertTrue(row['googleMapsUrl'])
            self.assertIn(row['region'], mod.SUPPORTED_REGIONS, f"Unexpected region: {row['region']}")
            if row['coordinates']:
                self.assertTrue(row['coordinates']['source'].startswith('https://'))
                self.assertIn(row['coordinates']['precision'], ['building', 'official-map-link'])

    # MVP 3 — overseas regions
    def test_overseas_taiwan_coordinates_extracted(self):
        """TW restaurant whose googleMapsUrl embeds @lat,lng yields official coordinates."""
        row = self.row(
            id='tw-001',
            name='Test TW',
            googleMapsUrl='https://www.google.com/maps/search/121+GOOD+RESTAURANT,+Taipei+City/@25.0390503,121.5305694',
        )
        normalized = mod.normalize([row], {}, 'TW')[0]
        self.assertEqual(normalized['region'], 'TW')
        self.assertEqual(normalized['coordinates']['lat'], 25.0390503)
        self.assertEqual(normalized['coordinates']['lng'], 121.5305694)
        self.assertEqual(normalized['coordinates']['precision'], 'official-map-link')
        self.assertEqual(normalized['coordinates']['source'], row['googleMapsUrl'])

    def test_overseas_coordinates_outside_region_bbox_raise(self):
        """TW restaurant with HK coordinates must be rejected."""
        row = self.row(
            id='tw-bad',
            googleMapsUrl='https://www.google.com/maps/@22.28,114.17',
        )
        with self.assertRaises(ValueError):
            mod.normalize([row], {}, 'TW')

    def test_overseas_district_is_city(self):
        row = self.row(id='sg-001', city={'title': 'Singapore'}, googleMapsUrl='https://www.google.com/maps/@1.30,103.85')
        normalized = mod.normalize([row], {}, 'SG')[0]
        self.assertEqual(normalized['district'], 'Singapore')
        self.assertEqual(normalized['region'], 'SG')

    def test_supported_regions_include_working_codes(self):
        self.assertEqual(set(mod.SUPPORTED_REGIONS), {'HK', 'TW', 'SG', 'TH', 'AU', 'US', 'GB'})

    def test_region_bbox_exists_for_every_supported_region(self):
        for r in mod.SUPPORTED_REGIONS:
            bbox = mod.REGION_BBOX[r]
            self.assertEqual(len(bbox), 4, f'bbox for {r} has wrong arity')
            self.assertLess(bbox[0], bbox[1])
            self.assertLess(bbox[2], bbox[3])

if __name__ == '__main__':
    unittest.main()
