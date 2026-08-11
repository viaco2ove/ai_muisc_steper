
import sys, json, importlib.util, os, inspect
sys.path.insert(0, os.getcwd())

# 从 JSON 文件加载 args，避免命令行编码问题
with open(r'D:\Users\viaco\PycharmProjects\ai_muice_steper\backend\tmp00h31_gs.json', encoding='utf-8') as f:
    kw = json.load(f)

# 重建 sys.argv，让脚本内部的 argparse.parse_args() 能读到正确参数
sys.argv = ['main.py']
for k, v in kw.items():
    if v is None or v is False:
        continue
    sys.argv.append('--' + k.lstrip('-'))
    if v is not True:
        sys.argv.append(str(v))

# 加载脚本模块
script = r'D:/Users/viaco/PycharmProjects/ai_muice_steper/.workbuddy/skills/ai_track_editor/scripts/main.py'
spec = importlib.util.spec_from_file_location('__skill__', script)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# 调用 main：检查签名决定传参方式
if hasattr(mod, 'main'):
    try:
        sig = inspect.signature(mod.main)
        params = list(sig.parameters.keys())
        if params:
            # main(kwargs) 形式
            mod.main(kw)
        else:
            # main() 无参数形式（内部用 argparse）
            mod.main()
    except SystemExit as e:
        sys.exit(0 if e.code is None else e.code)
    except Exception:
        pass
