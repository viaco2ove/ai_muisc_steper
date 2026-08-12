
# -*- coding: utf-8 -*-
import sys, json, importlib.util, os, inspect, argparse
# 强制 UTF-8 IO (避免 Windows GBK 默认)
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())

# 从 JSON 文件加载 args (强制 UTF-8)
import io
args_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), r'args.json')
with io.open(args_path, 'r', encoding='utf-8') as f:
    kw = json.load(f)

# import 脚本
spec = importlib.util.spec_from_file_location('__skill__', r'D:\Users\viaco\PycharmProjects\ai_muice_steper\.workbuddy\skills\ai_track_editor\scripts\main.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# 如果 main() 接受 kwargs → 直接传
if hasattr(mod, 'main'):
    sig = inspect.signature(mod.main)
    params = list(sig.parameters.keys())
    if params:
        norm_kw = {}
        for k, v in kw.items():
            key = k.lstrip('-').replace('-', '_')
            norm_kw[key] = v
        filtered = {k: v for k, v in norm_kw.items() if k in params}
        try:
            mod.main(**filtered) if filtered else mod.main(kw)
        except SystemExit as e:
            sys.exit(0 if e.code is None else e.code)
    else:
        # main() 无参, 内部用 argparse.parse_args()
        # Monkey-patch: parse_args 返回带默认值的 Namespace
        # 这样绕过 sys.argv 的中文编码问题
        ns_kwargs = {}
        for k, v in kw.items():
            ns_kwargs[k.lstrip('-').replace('-', '_')] = v
        # 解析脚本里的 argparse, 收集所有已知字段, 缺省值 None
        import ast
        try:
            with open(r'D:\Users\viaco\PycharmProjects\ai_muice_steper\.workbuddy\skills\ai_track_editor\scripts\main.py', encoding='utf-8') as f:
                tree = ast.parse(f.read())
            # 简单 AST 分析: 找 add_argument 的 "--xxx" / "xxx"
            for node in ast.walk(tree):
                if isinstance(node, ast.Call):
                    func = node.func
                    if isinstance(func, ast.Attribute) and func.attr == 'add_argument':
                        # 提取 '--xxx' 或 'xxx'
                        for arg in node.args:
                            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                                if arg.value.startswith('--'):
                                    fname = arg.value[2:].replace('-', '_')
                                    if fname not in ns_kwargs:
                                        ns_kwargs[fname] = None
                                elif arg.value.startswith('-'):
                                    continue
                                else:
                                    fname = arg.value.replace('-', '_')
                                    if fname not in ns_kwargs:
                                        ns_kwargs[fname] = None
        except Exception:
            pass

        ns = argparse.Namespace(**ns_kwargs)
        orig_parse_args = argparse.ArgumentParser.parse_args
        def fake_parse_args(self, *args, **kwargs):
            return ns
        argparse.ArgumentParser.parse_args = fake_parse_args
        try:
            mod.main()
        finally:
            argparse.ArgumentParser.parse_args = orig_parse_args
elif hasattr(mod, 'main_entry'):
    mod.main_entry(kw)
