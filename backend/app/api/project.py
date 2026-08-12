"""project 路由：工程 CRUD + 单轨读写 + 文件浏览/预览"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from ..schemas.schemas import NewProjectReq, SaveTrackReq
from ..core.project_manager import ProjectManager
from ..core import noteconv

router = APIRouter(tags=["project"])
pm = ProjectManager()


def _assert_safe_id(s: str, label: str) -> None:
    """拒绝可构成路径穿越的标识符（工程名 / 轨道ID）。

    用户可控的 name、tid、track_id、CreateTrackReq.id 会直接参与文件名拼接，
    必须挡掉路径分隔符与父目录引用（..），否则可在工程目录外落盘/读取。
    """
    if not s:
        raise HTTPException(400, f"非法的{label}：不能为空")
    if s in (".", "..") or "/" in s or "\\" in s or ".." in s:
        raise HTTPException(400, f"非法的{label}：不允许路径分隔符或父目录引用")

# Track 请求模型
class CreateTrackReq(BaseModel):
    id: str
    name: str
    type: str = "乐器"
    role: str = ""
    instrument: str = ""
    volume: float = 0.8

class UpdateTrackReq(BaseModel):
    name: str = ""
    role: str = ""
    status: str = ""
    instrument: str = ""
    volume: float = 0.8
    muted: bool = False


@router.get("/projects")
def list_projects():
    return pm.list_projects()


@router.post("/project/new")
def new_project(req: NewProjectReq):
    return pm.init_project(req.name, req.style, req.bpm, req.key)


@router.get("/project/{name}")
def get_project(name: str):
    try:
        return pm.get_project(name)
    except FileNotFoundError:
        raise HTTPException(404, f"工程不存在: {name}")


@router.get("/project/{name}/track/{tid}")
def get_track(name: str, tid: str):
    _assert_safe_id(name, "工程名")
    _assert_safe_id(tid, "轨道ID")
    return pm.get_track(name, tid)


@router.put("/project/{name}/track/{tid}")
def save_track(name: str, tid: str, req: SaveTrackReq):
    _assert_safe_id(name, "工程名")
    _assert_safe_id(tid, "轨道ID")
    return pm.save_track(name, tid, req.md)


@router.get("/project/{name}/files")
def list_files(name: str):
    return pm.list_files(name)


# 文件预览/下载：返回原始文件流，按扩展名决定媒体类型
_MIME = {
    "wav": "audio/wav", "mp3": "audio/mpeg", "ogg": "audio/ogg", "m4a": "audio/mp4",
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif",
    "svg": "image/svg+xml", "webp": "image/webp",
    "json": "application/json", "md": "text/markdown; charset=utf-8",
    "txt": "text/plain; charset=utf-8", "csv": "text/csv; charset=utf-8",
    "mscx": "application/xml", "xml": "application/xml", "ustx": "application/xml",
    "mid": "audio/midi", "midi": "audio/midi",
}


@router.get("/project/{name}/file")
def get_file(name: str, path: str = Query(..., description="工程内相对路径")):
    root = pm.pdir.resolve()
    # 防穿越（双层）：
    # 1) base 必须在工程根目录内——否则 name=".." 会让 base 逃逸到父目录
    # 2) target 必须仍在 base 内
    base = (pm.pdir / name).resolve()
    try:
        base.relative_to(root)
    except ValueError:
        raise HTTPException(400, "非法工程名：超出工程目录")
    if not base.exists():
        raise HTTPException(404, f"工程不存在: {name}")
    target = (base / path).resolve()
    try:
        target.relative_to(base)
    except ValueError:
        raise HTTPException(400, "非法路径：超出工程目录")
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "文件不存在")
    ext = target.suffix.lower().lstrip(".")
    mime = _MIME.get(ext, "application/octet-stream")
    return FileResponse(str(target), media_type=mime, filename=target.name)


@router.delete("/project/{name}")
def delete_project(name: str):
    """删除工程"""
    try:
        return pm.delete_project(name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/project/{name}/rename")
def rename_project(name: str, new_name: str):
    """重命名工程"""
    try:
        return pm.rename_project(name, new_name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except FileExistsError as e:
        raise HTTPException(409, str(e))


# ----- Track CRUD -----
@router.get("/project/{name}/tracks")
def list_tracks(name: str):
    """列出所有轨道"""
    try:
        return pm.list_tracks(name)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.post("/project/{name}/track")
def create_track(name: str, req: CreateTrackReq):
    """创建新轨道"""
    _assert_safe_id(name, "工程名")
    _assert_safe_id(req.id, "轨道ID")
    try:
        return pm.create_track(name, req.model_dump())
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.delete("/project/{name}/track/{track_id}")
def delete_track(name: str, track_id: str):
    """删除轨道"""
    _assert_safe_id(name, "工程名")
    _assert_safe_id(track_id, "轨道ID")
    try:
        return pm.delete_track(name, track_id)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.put("/project/{name}/track/{track_id}/info")
def update_track(name: str, track_id: str, req: UpdateTrackReq):
    """更新轨道元数据（改名/状态/音量等）。

    原路径与 save_track 的 PUT /track/{tid} 冲突，Starlette 按注册顺序取前者，
    导致本函数成死代码、元数据更新永远 422。现移到 /info 子路径。
    """
    _assert_safe_id(name, "工程名")
    _assert_safe_id(track_id, "轨道ID")
    try:
        return pm.update_track(name, track_id, req.model_dump(exclude_unset=True))
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


# ----- 音符读写（A1：前端 DAW 卷帘 <-> 轨道 JSON 双向同步） -----
class SaveNotesReq(BaseModel):
    notes: list  # 前端 Note[]（midi/startBeat/durBeats/velocity + 透传字段）


@router.get("/project/{name}/track/{tid}/notes")
def get_track_notes(name: str, tid: str):
    """返回轨道规范格式 notes（前端 normalizeNotes 解析为 startBeat/durBeats）"""
    _assert_safe_id(name, "工程名")
    _assert_safe_id(tid, "轨道ID")
    try:
        tj = pm.get_track(name, tid).get("json", {})
        return {"notes": tj.get("notes", [])}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.put("/project/{name}/track/{tid}/notes")
def put_track_notes(name: str, tid: str, req: SaveNotesReq):
    """接收前端 Note[]，转规范格式写回轨道 JSON（mscx 生成器可消费）"""
    _assert_safe_id(name, "工程名")
    _assert_safe_id(tid, "轨道ID")
    try:
        tj = pm.get_track(name, tid).get("json", {})
        original = tj.get("notes", []) if isinstance(tj.get("notes"), list) else []
        canonical = noteconv.fe_to_canonical(req.notes, original)
        pm.update_track(name, tid, {"notes": canonical, "note_count": len(canonical)})
        return {"status": "ok", "count": len(canonical), "source": "backend"}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(400, f"音符落盘失败: {e}")