import importlib.util, pathlib, unittest, copy, json
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('importer',ROOT/'scripts/import_restaurants.py')
assert spec is not None and spec.loader is not None
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class ImportTests(unittest.TestCase):
    def row(self):
        return {'id':'test-venue','name':'Test fixture','address':'Fixture address','showMerchant':True,
          'translations':{'zh_hk':{'name':'測試餐廳','address':None}},'city':{'title':'Test district'},
          'cuisine':{'title':'Test cuisine'},'googleMapsUrl':'https://www.google.com/maps/@22.28,114.17','businessData':{}}
    def test_official_link_coordinates(self):
        row=mod.normalize([self.row()],{})[0]
        self.assertEqual(row['coordinates']['lat'],22.28);self.assertEqual(row['name'],'測試餐廳')
    def test_null_translation_falls_back(self):
        self.assertEqual(mod.normalize([self.row()],{})[0]['address'],'Fixture address')
    def test_missing_coordinate_remains_null(self):
        row=self.row();row['googleMapsUrl']='https://maps.app.goo.gl/example'
        self.assertIsNone(mod.normalize([row],{})[0]['coordinates'])
    def test_stale_override_not_reused(self):
        row=self.row();row['googleMapsUrl']=''
        self.assertIsNone(mod.normalize([row],{'test-venue':{'addressEn':'Old address','coordinates':{'lat':22.28,'lng':114.17}}})[0]['coordinates'])
    def test_hidden_excluded(self):
        row=self.row();hidden=copy.deepcopy(row);hidden['id']='hidden';hidden['showMerchant']=False
        self.assertEqual(len(mod.normalize([row,hidden],{})),1)
    def test_duplicate_fails(self):
        with self.assertRaises(ValueError):mod.normalize([self.row(),self.row()],{})
    def test_bad_coordinates_fail(self):
        row=self.row();row['googleMapsUrl']='https://www.google.com/maps/@51.50,-0.12'
        with self.assertRaises(ValueError):mod.normalize([row],{})
    def test_snapshot_has_provenance_for_every_entry(self):
        data=json.loads((ROOT/'public/data/restaurants.json').read_text())
        rows=data['restaurants'];self.assertTrue(rows)
        self.assertEqual(len(rows),len({r['id'] for r in rows}))
        for row in rows:
            self.assertTrue(row['name']);self.assertTrue(row['address']);self.assertTrue(row['googleMapsUrl'])
            if row['coordinates']:
                self.assertTrue(row['coordinates']['source'].startswith('https://'))
                self.assertIn(row['coordinates']['precision'],['building','official-map-link'])
if __name__=='__main__':unittest.main()
