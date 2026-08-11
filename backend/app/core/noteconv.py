"""noteconv.py - 前端音符格式 <-> 轨道 JSON 规范格式 互转

前端 Note（DAW 视图用）：midi / startBeat(拍,从0) / durBeats / velocity / chord / lyric / phonemes / ...
轨道 JSON 规范（mscx 生成器消费）：midi / beat_pos("小节.拍.子拍") / duration("4分"中文词) / velocity / ...

两种格式互转，保证编辑落盘后被 mscx 生成器正确消费。
"""
import re

DUR_MAP = {'1分': 4.0, '2分': 2.0, '4分': 1.0, '8分': 0.5, '16分': 0.25, '32分': 0.125}
DUR_INV = {v: k for k, v in DUR_MAP.items()}

# 前端 Note 透传字段（落盘时保留，mscx 生成器忽略未知字段也不影响）
PASS_FIELDS = ['chord', 'lyric', 'phonemes', 'isRest', 'technique', 'timbreUid',
               'alignment', 'phDurs', 'phOffset', 'singerOverride', 'char', 'dynamics',
               'note', 'actual', 'finger']


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


def fe_to_canonical(fe_notes, original_notes=None):
    """前端 Note[] -> 规范 JSON notes[]。original_notes 用于保留 note/actual/finger 等展示字段。"""
    out = []
    orig = original_notes or []
    for i, n in enumerate(fe_notes):
        c = {}
        if n.get('midi') is not None:
            c['midi'] = int(n['midi'])
        if n.get('startBeat') is not None:
            c['beat_pos'] = to_beat_pos(n['startBeat'])
        if n.get('durBeats') is not None:
            c['duration'] = nearest_dur(n['durBeats'])
        if n.get('velocity') is not None:
            c['velocity'] = int(n['velocity'])
        for k in PASS_FIELDS:
            if k in n and n[k] is not None:
                c[k] = n[k]
        # 保留原展示字段（索引对齐，best-effort）
        if i < len(orig):
            for k in ('note', 'actual', 'finger'):
                if k in orig[i] and k not in c:
                    c[k] = orig[i][k]
        out.append(c)
    return out


def canonical_to_fe(canonical_notes):
    """规范 JSON notes[] -> 前端 Note[]（startBeat/durBeats 由 beat_pos/duration 解析）"""
    out = []
    for i, n in enumerate(canonical_notes):
        out.append({
            'id': n.get('id', f'n{i}'),
            'midi': n.get('midi', 60),
            'startBeat': parse_beat_pos(n.get('beat_pos')),
            'durBeats': parse_duration(n.get('duration')),
            'velocity': n.get('velocity', 80),
            'chord': n.get('chord'),
            'lyric': n.get('lyric'),
            'phonemes': n.get('phonemes'),
            'isRest': n.get('isRest'),
            'technique': n.get('technique'),
            'timbreUid': n.get('timbreUid'),
            'alignment': n.get('alignment'),
            'phDurs': n.get('phDurs'),
            'phOffset': n.get('phOffset'),
            'singerOverride': n.get('singerOverride'),
        })
    return out
