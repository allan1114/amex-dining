"""Rebuild manually reviewed HK1980 building geocodes. Requires pyproj.
These selections were checked against the restaurant's official address.
They identify the building, NOT its floor/entrance. Do not auto-update indexes.
"""
import json,pathlib,sys
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parents[1]
# Restaurant name -> government query, reviewed candidate index
SELECTIONS={
'aera':('史釗域道6號',0),'ANA TEN':('海運大廈',0),'Angelini':('麼地道64號',0),
'Cantina':('荷李活道10號',1),'Chesa':('半島酒店',0),'Estro':('都爹利街1號',0),
"Gaddi's":('半島酒店',0),'Gaia Ristorante':('皇后大道中181號',0),
'Giando Italian Restaurant & Bar':('星街9號',0),'Kanizen':('利園一期',0),
'LPM Restaurant & Bar':("H QUEEN'S",0),"Morton's of Chicago":('彌敦道20號',0),
'MOSU Hong Kong':('博物館道38號',0),'Nadaman (Island Shangri-la)':('港島香格里拉',1),
'Nadaman (Kowloon Shangri-la)':('麼地道64號',0),'ODDS':('渣打銀行大廈',0),
'One Harbour Road':('香港君悅酒店',0),'PENNA':('太古城道18號',0),
'Prohibition Grill house & Cocktail bar':('香港海洋公園萬豪酒店',0),'Quinary':('荷李活道56號',0),
'Roganic':('利園一期',0),'SPIGA':('陸海通大廈',0),'The Orient':('海運大廈',0),
'The Savory Project':('士丹頓街4號',0),'The Sky Boss':('環球貿易廣場',0),
'The Steakhouse':('梳士巴利道18號',1),'VEA Restaurant':('威靈頓街198號',0),
'Xin Rong Ji':('駱克道138號',0),'Zuma Hong Kong':('置地廣場',0)}
def main():
    rows=json.loads(pathlib.Path(sys.argv[1]).read_text())
    candidates=json.loads((ROOT/'data/geocode-candidates.json').read_text())
    transform=Transformer.from_crs('EPSG:2326','EPSG:4326',always_xy=True)
    overrides={}
    for row in rows:
        if row['name'] not in SELECTIONS: continue
        query,index=SELECTIONS[row['name']];entry=candidates[query];candidate=entry['candidates'][index]
        lng,lat=transform.transform(candidate['x'],candidate['y'])
        overrides[row['id']]={'nameEn':row['name'],'addressEn':row['address'],'query':query,'candidate':candidate,
          'coordinates':{'lat':round(lat,7),'lng':round(lng,7),'source':entry['url'],'precision':'building'}}
    (ROOT/'data/coordinate-overrides.json').write_text(json.dumps(overrides,ensure_ascii=False,indent=2)+'\n')
    print('Reviewed building coordinates:',len(overrides))
if __name__=='__main__':main()
