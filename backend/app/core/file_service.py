"""file_service.py - 附件上传/下载/预览"""
import shutil
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, File
from ..config import config


class FileService:
    """文件服务：上传/下载/检查存在"""

    @staticmethod
    def upload_file(file: UploadFile, project: str, subdir: str = "") -> str:
        """上传文件到 workspace/project/{project}/{subdir}/"""
        dest_dir = config.project_dir / project
        if subdir:
            dest_dir = dest_dir / subdir
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / file.filename
        with dest.open("wb") as f:
            shutil.copyfileobj(file.file, f)
        return str(dest)

    @staticmethod
    def get_project_dir(project: str) -> Path:
        return config.project_dir / project

    @staticmethod
    def file_exists(project: str, filename: str, subdir: str = "") -> bool:
        p = config.project_dir / project
        if subdir:
            p = p / subdir
        return (p / filename).exists()

    @staticmethod
    def list_files(project: str, subdir: str = "", ext: Optional[str] = None) -> list[Path]:
        """列出工程目录下文件"""
        p = config.project_dir / project
        if subdir:
            p = p / subdir
        if not p.exists():
            return []
        if ext:
            return sorted(p.rglob(f"*{ext}"))
        return sorted(p.rglob("*"))

    @staticmethod
    def copy_to_project(src: Path, project: str, subdir: str = "") -> str:
        """复制文件到工程目录"""
        dest_dir = config.project_dir / project
        if subdir:
            dest_dir = dest_dir / subdir
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / src.name
        shutil.copy2(src, dest)
        return str(dest)
