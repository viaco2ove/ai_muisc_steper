"""ai_track_editor - 后端 AI 整轨/小节/音符 调整技能（executable）

在轨道 JSON 的规范格式上做变换并写回：
  note.midi          音高(0-127)
  note.duration      中文时值词（"4分"/"8分"/...）
  note.beat_pos      "小节.拍.子拍"（子拍为半拍：1=0, 2=+0.5拍）
  note.velocity      力度(1-127)

op：transpose(移调) / velocity(力度) / duration(时值) / reverse(反转) / insert(插段)
scope：all(默认) / bars:A-B(小节区间) / indices:1,2,3(音符下标)

调用方式（agent_core 经 wrapper 传 dict）：
  main({"project": "走在", "track": "13_轻贝斯", "instruction": "升八度", "scope": "all"})
  main({"project": "走在", "track": "01_吉他", "instruction": "第20小节后插入4小节", "op": "insert", "after_bar": 20, "bars": 4})
结果打印到 stdout（JSON）：{"status","project","track","op","scope","changed","diff":[...]}
"""
import json
import re
import sys
import unicodedata
from pathlib import Path


def norm(s):
    return unicodedata.normalize('NFC', str(s))


def resolve_child(base: Path, name: str) -> Path:
    """归一化不敏感地解析 base 下的子目录/文件（应对 Windows 中文名 NFC/NFD 差异）"""
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


DUR_MAP = {'1分': 4.0, '2分': 2.0, '4分': 1.0, '8分': 0.5, '16分': 0.25, '32分': 0.125}
DUR_INV = {v: k for k, v in DUR_MAP.items()}


def parse_duration(d):
    if not d:
        return 1.0
    m = re.search(r'(\d+)\s*分', str(d))
    if m:
        return DUR_MAP.get(m.group(1) + '分', 1.0)
    return 1.0


def parse_beat_pos(bp):
    if not bp:
        return 0.0
    parts = str(bp).split('.')
    bar = int(parts[0]) if len(parts) > 0 and parts[0] else 1
    beat = int(parts[1]) if len(parts) > 1 and parts[1] else 1
    sub = int(parts[2]) if len(parts) > 2 and parts[2] else 1
    return (bar - 1) * 4 + (beat - 1) + (sub - 1) * 0.5


def to_beat_pos(start):
    start = round(float(start) * 2) / 2  # 量化到半拍
    bar_idx = int(start // 4)
    bar = bar_idx + 1
    rem = start - bar_idx * 4
    beat_idx = int(rem // 1)
    beat = beat_idx + 1
    sub = 1 if (rem - beat_idx) < 0.25 else 2
    return f"{bar}.{beat}.{sub}"


def nearest_dur(beats):
    beats = round(beats * 1000) / 1000
    best = min(DUR_MAP.values(), key=lambda v: abs(v - beats))
    return DUR_INV[best]


def locate_track(project, track):
    """找到轨道 json 文件（支持前缀匹配 + 归一化容错）"""
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


def parse_instruction(instruction):
    """返回 (op, params) —— 关键词解析（后端 D5 未接 LLM 时的兜底，LLM 接入后可由 args.op 覆盖）"""
    t = (instruction or '').lower()
    # 插段
    m = re.search(r'第\s*(\d+)\s*小?节?\s*(后|之后)?\s*插入\s*(\d+)\s*小?节', t)
    if m:
        return 'insert', {'after_bar': int(m.group(1)), 'bars': int(m.group(3))}
    if '插入' in t or ('加' in t and '小节' in t):
        mb = re.search(r'(\d+)\s*小?节', t)
        return 'insert', {'after_bar': mb.group(1) if mb else 20, 'bars': 4}
    # 移调 / 转调
    if re.search(r'(\d+)\s*半音', t):
        semis = int(re.search(r'([+-]?\d+)\s*半音', t).group(1))
        return 'transpose', {'semis': semis}
    if '八度' in t:
        return 'transpose', {'semis': -12 if '降' in t else 12}
    if '升' in t or '#' in t:
        return 'transpose', {'semis': 2}
    if '降' in t or 'b' in t:
        return 'transpose', {'semis': -2}
    if '移调' in t or '转调' in t:
        return 'transpose', {'semis': 0}
    # 力度
    if '力度' in t or '响' in t or '重' in t or '强' in t or '轻' in t or '弱' in t:
        if '轻' in t or '弱' in t:
            return 'velocity', {'delta': -15}
        if '重' in t or '强' in t or '响' in t:
            return 'velocity', {'delta': 15}
        return 'velocity', {'delta': 10}
    # 时值
    if '拉长' in t or '延长' in t or '加长' in t or '慢' in t:
        return 'duration', {'scale': 1.5}
    if '缩短' in t or '加快' in t or '快' in t or '紧凑' in t:
        return 'duration', {'scale': 0.66}
    # 反转
    if '反转' in t or '倒序' in t or '翻转' in t:
        return 'reverse', {}
    return 'noop', {}


def select_indices(notes, scope):
    if not scope or scope == 'all':
        return list(range(len(notes)))
    if scope.startswith('bars:'):
        rng = scope[5:]
        a, b = rng.split('-')
        lo = (int(a) - 1) * 4
        hi = int(b) * 4
        return [i for i, n in enumerate(notes) if lo <= parse_beat_pos(n.get('beat_pos')) < hi]
    if scope.startswith('indices:'):
        return [int(x) for x in scope[8:].split(',') if x.strip()]
    return list(range(len(notes)))


def apply_op(notes, op, params, idxs):
    diff = []
    changed = 0
    if op == 'transpose':
        semis = int(params.get('semis', 0))
        for i in idxs:
            n = notes[i]
            before = n.get('midi')
            n['midi'] = max(0, min(127, int(n.get('midi', 60)) + semis))
            changed += 1
            diff.append({'i': i, 'field': 'midi', 'before': before, 'after': n['midi']})
    elif op == 'velocity':
        delta = int(params.get('delta', 0))
        for i in idxs:
            n = notes[i]
            before = n.get('velocity')
            n['velocity'] = max(1, min(127, int(n.get('velocity', 80)) + delta))
            changed += 1
            diff.append({'i': i, 'field': 'velocity', 'before': before, 'after': n['velocity']})
    elif op == 'duration':
        scale = float(params.get('scale', 1))
        for i in idxs:
            n = notes[i]
            before = n.get('duration')
            db = parse_duration(n.get('duration')) * scale
            n['duration'] = nearest_dur(db)
            changed += 1
            diff.append({'i': i, 'field': 'duration', 'before': before, 'after': n['duration']})
    elif op == 'reverse':
        if idxs:
            sub = [notes[i] for i in idxs]
            sub.reverse()
            # 重新铺排：从原区间起点顺序排布，保留各自时值
            start0 = min(parse_beat_pos(notes[i].get('beat_pos')) for i in idxs)
            cur = start0
            for i, n in zip(idxs, sub):
                db = parse_duration(n.get('duration'))
                notes[i] = dict(n)
                notes[i]['beat_pos'] = to_beat_pos(cur)
                cur += db
                changed += 1
                diff.append({'i': i, 'field': 'beat_pos', 'before': n.get('beat_pos'), 'after': notes[i]['beat_pos']})
    elif op == 'insert':
        after_bar = int(params.get('after_bar', 20))
        bars = int(params.get('bars', 4))
        insert_start = (after_bar - 1) * 4
        shift = bars * 4
        # 1) 插入点之后的右移
        for n in notes:
            if parse_beat_pos(n.get('beat_pos')) >= insert_start:
                n['beat_pos'] = to_beat_pos(parse_beat_pos(n.get('beat_pos')) + shift)
                changed += 1
        # 2) 复制插入点前 8 拍模式进新区域（演示，后端 LLM 可生成新乐思）
        src = [n for n in notes if insert_start - 8 <= parse_beat_pos(n.get('beat_pos')) < insert_start]
        for k, n in enumerate(src):
            cp = dict(n)
            cp['beat_pos'] = to_beat_pos(parse_beat_pos(n.get('beat_pos')) + shift - 8)
            notes.append(cp)
            changed += 1
            diff.append({'i': len(notes) - 1, 'field': 'inserted', 'after': cp['beat_pos']})
        notes.sort(key=lambda n: parse_beat_pos(n.get('beat_pos')))
    return changed, diff


def main(args: dict):
    project = args.get('project')
    track = args.get('track')
    instruction = args.get('instruction', '')
    scope = args.get('scope', 'all')
    op = args.get('op')
    params = {}
    # 显式参数优先
    if args.get('semis') is not None:
        params['semis'] = int(args['semis'])
    if args.get('delta') is not None:
        params['delta'] = int(args['delta'])
    if args.get('scale') is not None:
        params['scale'] = float(args['scale'])
    if args.get('after_bar') is not None:
        params['after_bar'] = int(args['after_bar'])
    if args.get('bars') is not None:
        params['bars'] = int(args['bars'])

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

    if not op or op == 'noop':
        parsed_op, parsed_params = parse_instruction(instruction)
        op = op or parsed_op
        # 合并：显式 params 优先
        for k, v in parsed_params.items():
            params.setdefault(k, v)

    if op == 'noop':
        print(json.dumps({'status': 'noop', 'message': '未识别指令（后端 LLM 接入后将支持自然语言）',
                          'project': project, 'track': track}, ensure_ascii=False))
        return

    idxs = select_indices(notes, scope)
    changed, diff = apply_op(notes, op, params, idxs)

    data['notes'] = notes
    data['note_count'] = len(notes)
    tf.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    out = {
        'status': 'ok',
        'project': project,
        'track': track,
        'op': op,
        'scope': scope,
        'affected': len(idxs),
        'changed': changed,
        'diff': diff[:20],
    }
    print(json.dumps(out, ensure_ascii=False))


if __name__ == '__main__':
    # 允许命令行直接调试：python main.py '{"project":..., "track":...}'
    if len(sys.argv) > 1:
        try:
            payload = json.loads(sys.argv[1])
            main(payload)
        except Exception as e:
            print(json.dumps({'status': 'error', 'error': str(e)}, ensure_ascii=False))
    else:
        main({})
