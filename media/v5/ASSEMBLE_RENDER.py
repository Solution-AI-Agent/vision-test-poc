from pathlib import Path
import shutil,json,hashlib
root=Path('/Users/zpro/.buzz');out=root/'OUTBOX/VISION_TEST_LUMEN_V5'
old=(root/'OUTBOX/VISION_TEST_LUMEN_V4/RENDER.swift').read_text()
prefix=old[:old.index('func render(_ t:Double)')].replace('VISION_TEST_LUMEN_V4','VISION_TEST_LUMEN_V5')
body=(root/'.scratch/V5_FINAL_RENDER_BODY.swift').read_text()
tail=old[old.index('func savePNG('):].replace('VISION_TEST_LUMEN_ROUGHCUT_V4.mp4','VISION_TEST_LUMEN_V5.mp4')
tail=tail.replace('savePNG(render(t),scratch.appendingPathComponent','savePNG(render(t),base.appendingPathComponent("PREVIEWS").appendingPathComponent')
tail=tail.replace('let renderSeconds = sampleOnly ? 8 : total','let renderSeconds = total').replace('let timeOffset = sampleOnly ? 122.0 : 0.0','let timeOffset = 0.0')
(out/'RENDER.swift').write_text(prefix+body+tail)
for name in ['VERIFY.swift','PLAYBACK.swift']:shutil.copyfile(root/'OUTBOX/VISION_TEST_LUMEN_V4'/name,out/name)
report=json.loads((out/'WORKFLOW/CAPTURE_REPORT.json').read_text());assert report['sameHead'] and not report['errors'] and report['paidModelCalls']==0
manifest=json.loads((out/'EVIDENCE_MANIFEST.json').read_text())
for p in sorted((out/'WORKFLOW').glob('*.png')):
 q=out/'ASSETS'/('ui-'+p.name);shutil.copyfile(p,q)
 manifest['sources'].append(dict(original=str(p.relative_to(out)),copy=str(q.relative_to(out)),sha256=hashlib.sha256(q.read_bytes()).hexdigest(),kind='actual responsive UI workflow capture; not model input'))
manifest['workflow_record']='WORKFLOW/CAPTURE_REPORT.json'
(out/'EVIDENCE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(root/'.scratch/CAPTURE_V5_WORKFLOW.mjs',out/'CAPTURE_WORKFLOW.mjs')
shutil.copyfile(root/'.scratch/V5_FINAL_RENDER_BODY.swift',out/'RENDER_BODY.swift')
shutil.copyfile(__file__,out/'ASSEMBLE_RENDER.py')
print('Final renderer prepared; actual UI chronology and model inputs separately bound.')
