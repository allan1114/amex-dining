"""Import the public API used by the AMEX HK dining page (Python 3 stdlib).
No credentials needed. Coordinates without reviewed evidence remain null.
"""
import datetime, json, pathlib, re, urllib.request, argparse
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = 'https://www.americanexpress.com/zh-hk/benefits/diningbenefit/'
API = 'https://dining-offers-prod.amex.r53.tuimedia.com/api/country/HK/merchants?origin=hk'
def localized(obj, field, fallback=''):
    return (obj.get('translations', {}).get('zh_hk') or {}).get(field) or obj.get(field) or fallback

def normalize(raw, overrides):
    result=[]
    for row in raw:
        if not row.get('showMerchant', False) or row.get('isMerchantGroup'): continue
        business=row.get('businessData') or {}
        url=row.get('googleMapsUrl') or ''
        match=re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)',url)
        coordinates=None
        if match:
            coordinates={'lat':float(match[1]),'lng':float(match[2]),'source':url,'precision':'official-map-link'}
        else:
            reviewed=overrides.get(row['id'])
            # Never silently reuse a geocode after a venue changes address.
            if reviewed and reviewed['addressEn']==row.get('address'):
                coordinates=reviewed['coordinates']
        if coordinates and not (22.1 < coordinates['lat'] < 22.6 and 113.8 < coordinates['lng'] < 114.5):
            raise ValueError('Coordinates outside HK: '+row['name'])
        result.append({'id':row['id'],'name':localized(row,'name'),'nameEn':row['name'],
          'address':localized(row,'address'),'addressEn':row.get('address') or '',
          'district':localized(row.get('city') or {},'title'),
          'cuisine':localized(row.get('cuisine') or {},'title'),
          'website':business.get('website') or '', 'phone':business.get('phone') or '',
          'googleMapsUrl':url,'isInHotel':bool(business.get('isInHotel')),
          'isNew':bool(business.get('isNew')),'coordinates':coordinates})
    ids=[r['id'] for r in result]
    if not result or len(ids)!=len(set(ids)): raise ValueError('Empty or duplicate restaurant IDs')
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--input',type=pathlib.Path);args=parser.parse_args()
    if args.input: raw=json.loads(args.input.read_text())
    else:
        req=urllib.request.Request(API,headers={'User-Agent':'AMEXDiningMap/1.0 (+https://github.com/allan1114/amex-dining)'})
        with urllib.request.urlopen(req,timeout=45) as response: raw=json.load(response)
    overrides_path=ROOT/'data/coordinate-overrides.json'
    overrides=json.loads(overrides_path.read_text()) if overrides_path.exists() else {}
    restaurants=normalize(raw,overrides)
    snapshot={'sourceUrl':SOURCE,'apiUrl':API,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'region':'HK','restaurants':restaurants}
    path=ROOT/'public/data/restaurants.json';path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n');temp.replace(path)
    print(json.dumps({'officialRows':len(raw),'restaurants':len(restaurants),'mapped':sum(r['coordinates'] is not None for r in restaurants),'file':str(path)}))
if __name__=='__main__': main()
