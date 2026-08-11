"""project 路由：工程 CRUD + 单轨读写"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..schemas.schemas import NewProjectReq, SaveTrackReq
from ..core.project_manager import ProjectManager
from ..core import noteconv

router = APIRouter(tags=["project"])
pm = ProjectManager()

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
    return pm.get_track(name, tid)


@router.put("/project/{name}/track/{tid}")
def save_track(name: str, tid: str, req: SaveTrackReq):
    return pm.save_track(name, tid, req.md)


@router.get("/project/{name}/files")
def list_files(name: str):
    return pm.list_files(name)


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
    try:
        return pm.create_track(name, req.model_dump())
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.delete("/project/{name}/track/{track_id}")
def delete_track(name: str, track_id: str):
    """删除轨道"""
    try:
        return pm.delete_track(name, track_id)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.put("/project/{name}/track/{track_id}")
def update_track(name: str, track_id: str, req: UpdateTrackReq):
    """更新轨道"""
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
    try:
        tj = pm.get_track(name, tid).get("json", {})
        return {"notes": tj.get("notes", [])}
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))


@router.put("/project/{name}/track/{tid}/notes")
def put_track_notes(name: str, tid: str, req: SaveNotesReq):
    """接收前端 Note[]，转规范格式写回轨道 JSON（mscx 生成器可消费）"""
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