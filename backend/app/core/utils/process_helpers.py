"""process_helpers.py - UTF-8 Windows 编码绕过包装器

绕过 Windows CMD 命令行 UTF-8 参数传递破坏问题:
- args 写入临时 JSON 文件
- 创建 wrapper.py import 脚本, 通过 sys.argv + JSON 文件重建参数
"""
import json
import tempfile
from pathlib import Path
from typing import Dict


def build_args_via_jsonfile(args: Dict) -> tuple[str, list]:
    """将 args 写入临时 JSON 文件, 返回 (args_file_path, sys.argv_tail)

    sys.argv_tail = [script_name, ...flags from args]
    """
    args_file = tempfile.NamedTemporaryFile(
        mode='w', suffix='.json', encoding='utf-8', delete=False, dir='.'
    )
    json.dump(args, args_file, ensure_ascii=False)
    args_file.close()
    return args_file.name, []


def make_wrapper_script(script_path: str, args_file_basename: str = '') -> str:
    """生成临时 wrapper.py 内容, 用于绕过 Windows CMD 编码

    策略:
      1. 从 JSON 文件读 kwargs (无中文编码问题)
      2. 先 patch argparse (在 import 前)
      3. 然后 import 脚本
      4. 如果有 main() 接受 kwargs, 直接传
      5. 否则脚本会用 patched 的 parse_args 获取参数
    """
    args_basename = args_file_basename or "args.json"
    return f'''
# -*- coding: utf-8 -*-
import sys, json, importlib.util, os, inspect, argparse, ast
# 强制 UTF-8 IO (避免 Windows GBK 默认)
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())

# 从 JSON 文件加载 args (强制 UTF-8)
import io
args_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), r'{args_basename}')
with io.open(args_path, 'r', encoding='utf-8') as f:
    kw = json.load(f)

# 规范化 kwargs (支持 --xxx 或 xxx 两种格式)
ns_kwargs = {{}}
for k, v in kw.items():
    key = k.lstrip('-').replace('-', '_')
    ns_kwargs[key] = v

# 解析脚本里的 add_argument 字段 (在 import 前做, 因为脚本可能模块级调用 parse_args)
try:
    with open(r'{script_path}', encoding='utf-8') as f:
        tree = ast.parse(f.read())
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func = getattr(node, 'func', None)
            if isinstance(func, ast.Attribute) and func.attr == 'add_argument':
                for arg in getattr(node, 'args', []):
                    if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                        fname = arg.value.lstrip('-').replace('-', '_')
                        if fname not in ns_kwargs:
                            ns_kwargs[fname] = None
except Exception:
    pass

# 预先 patch argparse (在 import 脚本之前, 捕获模块级 parse_args 调用)
ns = argparse.Namespace(**ns_kwargs)
_orig_parse_args = argparse.ArgumentParser.parse_args
def _fake_parse_args(self, *args, **kwargs):
    return ns
argparse.ArgumentParser.parse_args = _fake_parse_args

# import 脚本
spec = importlib.util.spec_from_file_location('__skill__', r'{script_path}')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# 恢复原始 parse_args
argparse.ArgumentParser.parse_args = _orig_parse_args

# 如果 main() 存在, 调用它
if hasattr(mod, 'main'):
    sig = inspect.signature(mod.main)
    params = list(sig.parameters.keys())
    if params:
        norm_kw = {{}}
        for k, v in kw.items():
            key = k.lstrip('-').replace('-', '_')
            norm_kw[key] = v
        filtered = {{k: v for k, v in norm_kw.items() if k in params}}
        try:
            mod.main(**filtered) if filtered else mod.main(kw)
        except SystemExit as e:
            sys.exit(0 if e.code is None else e.code)
    else:
        try:
            mod.main()
        except SystemExit as e:
            sys.exit(0 if e.code is None else e.code)
elif hasattr(mod, 'main_entry'):
    mod.main_entry(kw)
'''