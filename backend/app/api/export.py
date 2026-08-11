"""export 路由：导出文件 + 文件下载"""
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