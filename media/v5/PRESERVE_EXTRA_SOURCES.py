from pathlib import Path
from decimal import Decimal
import json,shutil,hashlib
root=Path('/Users/zpro/.buzz');out=root/'OUTBOX/VISION_TEST_LUMEN_V5';repo=root/'REPOS/vision-test-maker'
manifest=json.loads((out/'EVIDENCE_MANIFEST.json').read_text())
extra=[('evaluation/demo-screenshot.pw.ts-snapshots/order-darwin.png','ASSETS/screenshot-reference.png','actual Playwright normal reference PNG'),('evaluation/demo-screenshot.pw.ts','SOURCES/demo-screenshot.pw.ts','actual screenshot assertion source')]
matrices=[]
for folder,label in [('demo-probe-2026-10-05T01-20-29-400Z','selection-probe'),('demo-candidate-2026-10-05T01-21-26-894Z','selection-candidate'),('blind-extraction-2026-10-05T01-15-09-254Z','blind-diagnostic')]:
 extra.append(('artifacts/'+folder+'/RESULTS.json','APPENDIX/'+label+'-RESULTS.json','separate experiment raw matrix'))
 if label!='blind-diagnostic':matrices.append(json.loads((repo/'artifacts'/folder/'RESULTS.json').read_text()))
for rel,dest,kind in extra:
 p=repo/rel;q=out/dest;shutil.copyfile(p,q)
 manifest['sources'].append(dict(original=str(p.relative_to(root)),copy=dest,sha256=hashlib.sha256(q.read_bytes()).hexdigest(),kind=kind))
verify=json.loads((out/'SOURCES/RESULTS.json').read_text())
records=[r for m in matrices+[verify] for r in m['results']]
assert sum(r['calls'] for r in records)==9
assert sum(Decimal(str(r['reportedCost'])) for r in records)==Decimal('0.00356816')
manifest['selection']['raw_nine_calls_and_cost_verified']=True
manifest['screenshot_reference']='ASSETS/screenshot-reference.png'
(out/'EVIDENCE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
video=out/'VISION_TEST_LUMEN_V5.mp4'
draft=root/'OUTBOX/VISION_TEST_LUMEN_V5_DRAFT_RENDER_01.mp4'
assert not draft.exists();video.rename(draft)
shutil.copyfile(__file__,out/'PRESERVE_EXTRA_SOURCES.py')
print('Actual screenshot reference copied; selected nine-call record verified; initial draft retained separately.')
