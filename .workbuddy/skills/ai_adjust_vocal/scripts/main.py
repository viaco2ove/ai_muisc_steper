"""ai_adjust_vocal - 后端 AI 人声演唱细节调整技能（executable）

针对人声轨 JSON 做演唱细节调整并写回：
  - track 级 singer 配置：voicebank / tension(-1~1) / breath(0~1) / gender(-1~1)
  - 音符级 singer_override（单音覆盖轨级，导出 ustx 用）
  - 音符 dynamics / velocity（力度）调整
  - 音符 alignment（auto/snap/manual）与 ph_durs（音素时长占比，Σ=1）

自然语言指令示例：
  "气声多一点"  -> breath += 0.2
  "更紧张"      -> tension += 0.2
  "换成女声"    -> gender = 0.6
  "声库 拼接妹" -> voicebank = "拼接妹"
  "力度加强"    -> velocity += 15
  "对齐改手动"  -> alignment = manual

scope：all(默认) / indices:i,j,k(选中音符)
结果打印到 stdout（JSON）。
"""
import json
import re
import sys
import unicodedata
from pathlib import Path


def norm(s):
    return unicodedata.normalize('NFC', str(s))


def resolve_child(base: Path, name: str) -> Path:
    base = Path(base)
    cand = base / name
    if cand.exists():
        return cand
    try:
        for p in base.iterdir():
            if norm(p.name) == norm(name):
                return p
    except Exception:
        pass
    return cand


def locate_track(project, track):
    base = resolve_child(Path('workspace') / 'project', project) / 'song_engineer' / 'track'
    if not base.exists():
        return None
    c = base / f'{track}.json'
    if c.exists():
        return c
    for f in sorted(base.glob('*.json')):
        stem = f.stem
        if stem == track or stem.startswith(track + '_') or stem.startswith(track):
            return f
    return None


def parse_instruction(instruction, cur=None):
    """返回 (singer_delta, voicebank, alignment, velocity_delta)"""
    t = (instruction or '').lower()
    cur = cur or {}
    singer = {}
    if '气' in t or 'breath' in t:
        d = 0.2 if ('多' in t or '加' in t or '更' in t) else (-0.2 if ('少' in t or '减' in t) else 0.2)
        singer['breath'] = round((cur.get('breath', 0) or 0) + d, 2)
    if '紧张' in t or 'tension' in t:
        singer['tension'] = round((cur.get('tension', 0) or 0) + 0.2, 2)
    if '放松' in t:
        singer['tension'] = round((cur.get('tension', 0) or 0) - 0.2, 2)
    if '男' in t:
        singer['gender'] = -0.6
    if '女' in t:
        singer['gender'] = 0.6
    if '声库' in t or 'voicebank' in t:
        m = re.search(r'声库\s*([^\s，。]+)', instruction)
        if m:
            singer['voicebank'] = m.group(1)
    alignment = None
    if '手动' in t:
        alignment = 'manual'
    elif '吸附' in t or 'snap' in t:
        alignment = 'snap'
    elif '自动' in t or 'auto' in t:
        alignment = 'auto'
    vel = 0
    if '力度' in t or '响' in t or '重' in t or '强' in t or '轻' in t or '弱' in t:
        if '轻' in t or '弱' in t:
            vel = -15
        else:
            vel = 15
    return singer, alignment, vel


def main(args: dict):
    project = args.get('project')
    track = args.get('track')
    instruction = args.get('instruction', '')
    scope = args.get('scope', 'all')
    # 显式覆盖
    singer_arg = args.get('singer') or {}
    alignment_arg = args.get('alignment')
    vel_arg = args.get('delta') if args.get('delta') is not None else args.get('velocity_delta')

    if not project or not track:
        print(json.dumps({'status': 'error', 'error': 'project/track 必填'}, ensure_ascii=False))
        return
    tf = locate_track(project, track)
    if not tf:
        print(json.dumps({'status': 'error', 'error': f'轨道不存在: {project}/{track}'}, ensure_ascii=False))
        return

    data = json.loads(tf.read_text(encoding='utf-8'))
    notes = data.get('notes', [])
    if not isinstance(notes, list):
        notes = []

    cur_singer = data.get('singer') or {}
    singer_delta, alignment, vel = parse_instruction(instruction, cur_singer)
    # 合并显式
    singer = dict(cur_singer)
    singer.update(singer_delta)
    singer.update({k: v for k, v in singer_arg.items() if v is not None})

    diff = []
    changed = 0

    # 1) track 级 singer 配置
    if singer:
        data['singer'] = singer
        changed += 1
        diff.append({'level': 'track', 'field': 'singer', 'after': singer})

    # 2) 作用域
    if scope == 'all':
        idxs = list(range(len(notes)))
    elif scope.startswith('indices:'):
        idxs = [int(x) for x in scope[8:].split(',') if x.strip()]
    else:
        idxs = list(range(len(notes)))

    # 3) 音符级：alignment / velocity / singer_override
    for i in idxs:
        n = notes[i]
        nch = False
        if alignment is not None and n.get('alignment') != alignment:
            n['alignment'] = alignment
            nch = True
            diff.append({'i': i, 'field': 'alignment', 'after': alignment})
        if vel:
            before = n.get('velocity')
            n['velocity'] = max(1, min(127, int(n.get('velocity', 80)) + vel))
            nch = True
            diff.append({'i': i, 'field': 'velocity', 'before': before, 'after': n['velocity']})
        if singer and args.get('per_note'):
            n['singer_override'] = dict(singer)
            nch = True
            diff.append({'i': i, 'field': 'singer_override', 'after': singer})
        if nch:
            changed += 1

    data['notes'] = notes
    data['note_count'] = len(notes)
    tf.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    out = {
        'status': 'ok',
        'project': project,
        'track': track,
        'singer': singer,
        'alignment': alignment,
        'affected': len(idxs),
        'changed': changed,
        'diff': diff[:20],
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    if len(sys.argv) > 1:
        try:
            main(json.loads(sys.argv[1]))
        except Exception as e:
            print(json.dumps({'status': 'error', 'error': str(e)}, ensure_ascii=False))
    else:
        main({})
