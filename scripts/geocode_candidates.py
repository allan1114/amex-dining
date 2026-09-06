"""Fetch government building/address candidates for manual review. Never auto-select."""
import json, pathlib, time, urllib.request, urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
QUERIES=['史釗域道6號','海運大廈','麼地道64號','荷李活道10號','半島酒店','都爹利街1號','皇后大道中181號','星街9號','利園一期','H QUEEN\'S','彌敦道20號','M+','港島香格里拉','渣打銀行大廈','香港君悅酒店','太古城中心','香港海洋公園萬豪酒店','荷李活道56號','陸海通大廈','士丹頓街4號','環球貿易廣場','梳士巴利道18號','威靈頓街198號','駱克道138號','置地廣場']
QUERIES += ['博物館道38號','太古城道18號']
def run(start=0,end=None):
    p=ROOT/'data/geocode-candidates.json'; p.parent.mkdir(exist_ok=True)
    rows=json.loads(p.read_text()) if p.exists() else {}
    for query in QUERIES[start:end]:
        url='https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?'+urllib.parse.urlencode({'q':query})
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://portal.csdi.gov.hk/','Accept':'application/json'})
        try:
            with urllib.request.urlopen(req,timeout=30) as response: result=json.load(response)
            rows[query]={'url':url,'candidates':result}
            p.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
            print(query,json.dumps(result[:2],ensure_ascii=False),flush=True)
        except Exception as exc: print(query,str(exc),flush=True)
        time.sleep(.3)
if __name__=='__main__':
    import sys
    run(int(sys.argv[1]) if len(sys.argv)>1 else 0,int(sys.argv[2]) if len(sys.argv)>2 else None)
