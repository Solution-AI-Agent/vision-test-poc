# -*- coding: utf-8 -*-
"""Extract actual source footage. Usage: python3 EXTRACT_CLIPS.py <ffmpeg> <output-dir>"""
from pathlib import Path
import subprocess,sys
base=Path(__file__).resolve().parent
out=Path(sys.argv[2]).resolve()
for name,start,length in [('q',24,12),('form',37,28),('submit',77,24)]:
    dest=out/name;dest.mkdir(parents=True,exist_ok=True)
    subprocess.run([sys.argv[1],'-loglevel','error','-ss',str(start),'-i',str(base/'ASSETS/order.webm'),'-t',str(length),'-r','6',str(dest/'%04d.png')],check=True)
