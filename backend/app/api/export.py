"""export 路由：导出文件 + 文件下载 + 全曲渲染"""
import io
import zipfile
import subprocess
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from ..config import config

router = APIRouter(tags=["export"])


@router.get("/export/{name}/{ftype}")
def export_file(name: str, ftype: str):
    """导出工程内最新文件。ftype: mid/wav/mscx/lyrics/mp3"""
    pdir = config.project_dir / name
    if not pdir.exists():
        raise HTTPException(404, f"工程不存在: {name}")
    ext_map = {"mid": ".mid", "wav": ".wav", "mscx": ".mscx",
               "lyrics": ".txt", "mp3": ".mp3"}
    ext = ext_map.get(ftype)
    if not ext:
        raise HTTPException(400, f"不支持的类型: {ftype}")
    # 找最新的该类型文件
    files = sorted(pdir.rglob(f"*{ext}"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not files:
        raise HTTPException(404, f"工程内无 {ftype} 文件")
    f = files[0]
    return FileResponse(str(f), filename=f.name)


@router.post("/render/{name}")
def render_project(name: str):
    """全曲预览渲染（MuseScore → MP3/WAV）

    调用 render_mscx 技能，将工程的 .mscx 文件渲染为音频文件
    """
    pdir = config.project_dir / name
    if not pdir.exists():
        raise HTTPException(404, f"工程不存在: {name}")

    # 找 mscx 文件
    mscx_files = sorted(pdir.rglob("*.mscx"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not mscx_files:
        # 尝试从 MIDI 生成
        return {
            "status": "no_mscx",
            "message": "工程内无 .mscx 文件，请先生成乐谱"
        }

    mscx_path = mscx_files[0]
    out_dir = pdir / "song_engineer" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{name}_preview.wav"

    # 调用 render_mscx 技能
    skill_dir = Path(__file__).resolve().parents[3] / ".workbuddy" / "skills" / "render_mscx"
    skill_script = skill_dir / "scripts" / "render_mscx.py"

    if not skill_script.exists():
        # 直接返回最新的 wav 文件
        wav_files = sorted(pdir.rglob("*.wav"), key=lambda f: f.stat().st_mtime, reverse=True)
        if wav_files:
            return {
                "status": "existing",
                "output": str(wav_files[0]),
                "format": "wav"
            }
        return {"status": "no_renderer", "message": "渲染器不可用"}

    try:
        result = subprocess.run(
            [config.python_exe, "-X", "utf8", str(skill_script), str(mscx_path), "--out", str(out_path)],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode == 0 and out_path.exists():
            return {
                "status": "ok",
                "output": str(out_path),
                "format": "wav"
            }
        return {
            "status": "error",
            "message": result.stderr[:500]
        }
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "message": "渲染超时"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/export/{name}/zip")
def export_project_zip(name: str):
    """导出整个工程为 zip 包"""
    pdir = config.project_dir / name
    if not pdir.exists():
        raise HTTPException(404, f"工程不存在: {name}")

    # 创建内存中的 zip 文件
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path in pdir.rglob("*"):
            if file_path.is_file():
                # 计算相对于工程根目录的路径
                rel_path = file_path.relative_to(pdir)
                zf.write(file_path, rel_path)

    buffer.seek(0)
    return FileResponse(
        io.BytesIO(buffer.getvalue()),
        filename=f"{name}.zip",
        media_type="application/zip"
    )


@router.get("/file/{path:path}")
def serve_file(path: str):
    """下载工程内任意文件"""
    # path 格式: 工程名/子路径/文件名
    parts = path.split("/", 1)
    if len(parts) < 2:
        raise HTTPException(400, "路径格式: 工程名/子路径/文件名")
    name, rel_path = parts[0], parts[1]
    pdir = config.project_dir / name
    if not pdir.exists():
        raise HTTPException(404, f"工程不存在: {name}")
    file_path = pdir / rel_path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(404, f"文件不存在: {rel_path}")
    return FileResponse(str(file_path), filename=file_path.name)