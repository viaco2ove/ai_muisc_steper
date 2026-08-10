# AI 音乐工程工作台

左侧 AI 对话 + 右侧工程工作台。哼唱 → AI 全流程编排技能 → 生成带和弦/歌词/分轨/MIDI/混音的完整歌曲工程。

## 快速启动

### 前置要求

- Python 3.12+
- Node.js 18+
- DeepSeek API Key (或配置 `models.json` 使用其他 LLM)

### 1. 后端 (API + WebSocket)

```bash
# 安装依赖
pip install -r backend/requirements.txt

# 启动后端
cd backend && python -m uvicorn app.main:app --reload --port 8000
# 或用脚本
backend/run.bat   # Windows
bash backend/run.sh  # Linux/Mac
```

访问: http://127.0.0.1:8000/api/health

### 2. 前端 (React 开发服务器)

```bash
cd frontend
npm install
npm run dev
```

访问: http://127.0.0.1:5173 (API 代理到后端 8000)

### 3. 生产构建

```bash
# 前端构建
cd frontend && npm run build

# Docker 一键部署
docker-compose up --build
```

访问: http://127.0.0.1:3000 (frontend+nginx) 或 http://127.0.0.1:8000 (API)

## LLM 配置

编辑 `models.json`:

```json
{
  "skill_ai": {"model": "deepseek"},
  "models": [
    {
      "id": "deepseek",
      "name": "deepseek",
      "model": "deepseek-v4-flash",
      "url": "https://api.deepseek.com/v1/chat/completions",
      "apiKey": "sk-your-key"
    }
  ]
}
```

支持: DeepSeek / 通义 / 豆包 / 本地 OpenAI 兼容 API。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/skills` | 技能列表 |
| GET | `/api/projects` | 工程列表 |
| GET | `/api/project/{name}` | 工程详情 |
| PUT | `/api/project/{name}/track/{id}` | 保存轨道 |
| POST | `/api/audio/upload` | 上传音频 |
| POST | `/api/skill/{tool}` | 执行技能 |
| WS | `/ws/chat` | AI 对话 |
| GET | `/api/export/{name}/{type}` | 导出文件 |

## 技能

22 个本地音乐技能 (`.workbuddy/skills/`):

- `audio_chord_recognizer` - 哼唱识别和弦/旋律
- `ai_chords_master` - 生成和弦进行
- `melody_master` - 旋律优化
- `muse-lyrics-gen` - 生成押韵歌词
- `musescore-cooperate` - 生成 MuseScore 乐谱
- `remix-master` - 多轨混音
- `DiffSingerMiniEngine` - 歌声合成
- `song_engineer` - 工程聚合诊断
- `minimax_cover_preprocess` - MiniMax 翻唱
- ... 等

## 项目结构

```
backend/          # FastAPI 后端
  app/
    api/        # REST 路由
    core/        # Agent Core / LLM / 工程管理
    schemas/     # Pydantic 模型
frontend/        # React + Vite + Tailwind
workspace/project/ # 歌曲工程目录
.workbuddy/skills/ # 音乐技能
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind + Zustand
- **后端**: Python + FastAPI + WebSocket
- **AI 层**: DeepSeek / 通义 / 豆包 (OpenAI 兼容协议)
- **存储**: 本地文件 (workspace) + SQLite (可选会话)
