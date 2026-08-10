"""frontmatter_parser.py - SKILL.md YAML Frontmatter 解析"""
import re
from typing import Dict, Any


def parse_skill_frontmatter(text: str) -> Dict[str, Any]:
    """解析 SKILL.md 的 YAML frontmatter
    返回 {name, description, 触发词, entry_script, params, executable}
    """
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        return {}
    try:
        import yaml
        meta = yaml.safe_load(m.group(1)) or {}
    except Exception:
        meta = {}
        for line in m.group(1).splitlines():
            if ":" in line:
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip().strip('"').strip("'")
    if "params" in meta and isinstance(meta["params"], str):
        try:
            import json
            meta["params"] = json.loads(meta["params"])
        except Exception:
            pass
    if "executable" in meta:
        meta["executable"] = bool(meta["executable"])
    else:
        meta["executable"] = False
    return meta