"""Reproduce SWS Platinum's local Real-ESRGAN x4plus -> exact 2x workflow.

Each sprite/glyph is padded before inference to prevent neighbouring atlas cells
from contaminating one another. Original alpha coverage is replicated exactly.
Requires Pillow and an existing realesrgan-ncnn-vulkan installation.
"""
from pathlib import Path
import argparse, hashlib, json, math, subprocess
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(tool_dir):
    manifest = json.loads((ROOT/'data/assets.json').read_text())
    work = ROOT/'.local/upscale'
    work.mkdir(parents=True, exist_ok=True)
    output = ROOT/'assets/enhanced'
    output.mkdir(parents=True, exist_ok=True)
    exe = tool_dir/'realesrgan-ncnn-vulkan.exe'
    model = tool_dir/'models/realesrgan-x4plus.bin'
    model_hash = digest(model)
    groups = []
    for sheet in manifest['sprites'].values():
        groups.append((sheet['image'], list(sheet['ids'].values())))
    for font in manifest['fonts'].values():
        # Copyright is an alias of the final glyph, not another rectangle.
        unique = {(g['x'],g['y'],g['w'],g['h']):g for g in font['glyphs'].values()}
        groups.append((font['image'], list(unique.values())))
    for title in manifest['titles'].values():
        groups.append((title['image'], [dict(x=0,y=0,w=title['width'],h=title['height'])]))
    rows = []
    for source, rects in groups:
        src = ROOT/source
        original_hash = digest(src)
        original = Image.open(src).convert('RGBA')
        pad = 12
        cellw = max(r['w'] for r in rects)+pad*2
        cellh = max(r['h'] for r in rects)+pad*2
        cols = min(12,len(rects))
        packed = Image.new('RGB',(cols*cellw,math.ceil(len(rects)/cols)*cellh),'black')
        placements = []
        for i,r in enumerate(rects):
            x,y=(i%cols)*cellw+pad,(i//cols)*cellh+pad
            crop=original.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
            packed.paste(crop,(x,y),crop.getchannel('A'))
            placements.append((r,x,y))
        key=hashlib.sha256(packed.tobytes()+model_hash.encode()).hexdigest()[:24]
        inp,out=work/(key+'.png'),work/(key+'-4x.png')
        packed.save(inp)
        if not out.exists():
            for tile in (128,64,32):
                proc=subprocess.run([str(exe),'-i',str(inp),'-o',str(out),'-s','4',
                    '-n','realesrgan-x4plus','-m',str(tool_dir/'models'),'-t',str(tile),'-j','1:1:1'],capture_output=True)
                log=(proc.stdout+proc.stderr).decode(errors='replace')
                (work/(key+'.log')).write_text(log,encoding='utf-8')
                if proc.returncode==0 and 'failed' not in log.lower() and out.exists():
                    break
            else:
                raise RuntimeError(f'GPU enhancement failed for {source}: {log[-2000:]}')
        enhanced4=Image.open(out).convert('RGB')
        assert enhanced4.size==(packed.width*4,packed.height*4)
        result=Image.new('RGBA',(original.width*2,original.height*2))
        for r,x,y in placements:
            crop=enhanced4.crop((x*4,y*4,(x+r['w'])*4,(y+r['h'])*4)).resize((r['w']*2,r['h']*2),Image.Resampling.LANCZOS)
            alpha=original.getchannel('A').crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])).resize(crop.size,Image.Resampling.NEAREST)
            crop.putalpha(alpha)
            result.paste(crop,(r['x']*2,r['y']*2))
        dest=output/src.name
        result.save(dest,optimize=True)
        expected_alpha=original.getchannel('A').resize(result.size,Image.Resampling.NEAREST)
        assert ImageChops.difference(result.getchannel('A'),expected_alpha).getbbox() is None
        assert digest(src)==original_hash
        rows.append(dict(source=source,image=dest.relative_to(ROOT).as_posix(),scale=2,
            sourceSize=list(original.size),outputSize=list(result.size),cells=len(rects),
            sourceSha256=original_hash,outputSha256=digest(dest),alpha='nearest-neighbour exact coverage'))
        print(f'{len(rows)}/{len(groups)} {source}: {original.size} -> {result.size}',flush=True)
    report=dict(model='RealESRGAN_x4plus',tool='realesrgan-ncnn-vulkan-20220424-windows',
        modelSha256=model_hash,method='isolated padded cells, neural 4x, Lanczos downsample to 2x',images=rows)
    (ROOT/'data/enhanced.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    license_file=tool_dir.parent/'Real-ESRGAN-LICENSE.txt'
    if license_file.exists():
        (output/'Real-ESRGAN-LICENSE.txt').write_bytes(license_file.read_bytes())
    print('Verified all output dimensions, alpha coverage and original checksums.',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--tool-dir',type=Path,required=True)
    run(parser.parse_args().tool_dir.resolve())
