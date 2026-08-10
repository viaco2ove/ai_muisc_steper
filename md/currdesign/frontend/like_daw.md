# 分轨和轨道编辑。应该类似DAW 的图像编辑模式。 可以直观的显示分轨混音，音量，力度，是否静音 ，乐器音色，歌手音色 等情况。 轨道编辑 可以直接编辑轨道的每个音符的音高等信息。 主唱，和声分轨点击进去后可以编辑音高和歌词和 歌手配置，每个音符的对齐/分段/音素/ph_dur 等。
## 歌手编辑部分在like_xstudio 文档中说明
[like_xstudio.md](like_xstudio.md)

## 类似 daw的分轨显示和编辑的设计说明

> 本文档定义「分轨混音」与「轨道编辑（钢琴卷帘）」两块的**视觉与交互规范**，
> 作为前端落地的参考基准。歌手/人声的逐音符编辑（音素、ph_dur、对齐、歌手配置）见
> [like_xstudio.md](like_xstudio.md)。原型见 `prototype_html/daw.html`。

---

## 1. 参考 DAW 产品速查

| 产品 | Mix / 分轨特色 | Note 编辑（钢琴卷帘）特色 |
|---|---|---|
| **Reaper** | 轨道头含 M/S、音量、声像、FX 链、文件夹轨（分组/总线）；极紧凑的信息密度 | 钢琴卷帘支持 draggable note、velocity lane、inline 力度编辑、网格吸附/量化 |
| **Logic Pro** | 智能控制（Smart Controls）、轨道 Alternatives | 钢琴卷帘 + Step Editor（音素/分区编辑）、乐句量化 |
| **Ableton Live** | Session/Arrangement 双视图；Clip 片段是核心单元 |  Clip 内编辑音符，强调循环与启动 |
| **Cubase** | 通道条（Channel Strip）、VSTi 乐器轨 | 就地编辑器（In-place）、表达式映射（音素/力度分层） |
| **Studio One** | 调音台与编曲视图联动；和声轨 | 钢琴卷帘 + 和弦轨、Inspector 多页 |
| **FL Studio** | 播放列表（Playlist）横向片段排布 | Piano Roll 的节奏切片、力度渐变曲线 |

**共性结论（我们直接复用）：**
1. 分轨 = **轨道头（控制） + 横向时间轴（片段/音符）** 两栏结构。
2. 轨道头永远显示：静音(M)、独奏(S)、音量、声像、音色/声库名。
3. 钢琴卷帘是逐音符编辑的**唯一主战场**，所有音符属性（音高/时值/力度/歌词）都从这里直接操作。
4. 力度(velocity) 普遍用**颜色 + 高度/明度**双编码，不用纯数字。

---

## 2. 信息架构：两层

```
工作台 / 工作区
├─ 分轨混音 (Mix View)        ← 所有轨道一览，偏"宏观/混音"
│   └─ 点轨道 → 载入右侧编辑器
└─ 轨道编辑 (Note Editor)     ← 单轨深入，偏"微观/逐音符"
    ├─ 钢琴卷帘 (Piano Roll)
    └─ 检查器 (Inspector)      ← 选中音符/轨道的属性面板
```

人声轨（主唱/和声）进来的编辑器，检查器额外展开「歌词 / 音素 / 歌手配置」
（详见 like_xstudio.md）。

---

## 3. Mix 视图规格（分轨混音）

### 3.1 轨道 lane 字段清单
每条轨道一条横向 lane，左为轨道头（固定宽 ~172px），右为时间轴：

| 字段 | 显示 | 交互 | 数据来源 |
|---|---|---|---|
| 轨道号/名 | `01_吉他` | 点击选轨 | `track.id` / `track.name` |
| **M 静音** | 按钮，on=琥珀 | 切换 `mute` | `track.mute` |
| **S 独奏** | 按钮，on=蓝 | 切换 `solo` | `track.solo` |
| **音色 / 声库 chip** | 胶囊标签 | 点击打开音色选择 | 乐器轨 `instrument.name`；人声轨 `singer.bank` |
| **音量** | 横向推子 + 数值 | 拖动改 `volume` | `track.volume` (0–100) |
| **力度条** | 迷你条（按 velocity 着色） | 只读（聚合值） | `track.velocity`（均值/峰值） |
| 时间轴片段 | 色块 | 点击选轨/定位 | `track.notes` 投影 |

**独奏逻辑**：任一轨 `solo=true` 时，其余非 solo 轨整体变暗（dim），符合所有 DAW 习惯。

### 3.2 横向时间轴：片段(clip) vs 音符块
- **乐器/打击乐轨**：直接把每个 `note` 投影成色块（左=`startBeat`，宽=`durationBeat`，色=`velocity`）。
- **人声轨**：色块上叠加**歌词首字**（如「走」），一眼区分歌唱内容。
- 时间轴背景用**每拍 1 格**的竖线，每 4 拍（小节）加粗，提供节拍锚点。

> 设计取舍：Mix 视图用「色块」而非完整钢琴卷帘，是为了在有限高度内**并列看到全部 14 轨**。
> 真正的逐音符编辑留给右侧 Note Editor（§4），避免信息过载。

### 3.3 力度着色规范（velocity → color）
统一色阶（与 daw.html 一致）：
```
v ≤ 40  → 琥珀 #f59e0b  (轻)
40<v≤80 → 蓝紫过渡
v ≥ 100 → 主紫 #6d5efc  (重)
```
公式：`rgb(245,158,11) → rgb(109,94,252)` 线性插值，按 `v/127`。

### 3.4 分组 / 总线（预留）
- 文件夹轨（如「吉他组」含 01/05/06/08）可用缩进 + 左侧 ▸ 折叠表达，Mix 头显示组音量。
- 当前「走在」工程未强制分组，原型先不展开，但 lane 结构需预留 `parentId` 字段。

### 3.5 主音量
Mix 视图顶部固定一个**主音量推子**（master），作用于整体 playback 预览。

---

## 4. Note 编辑器规格（钢琴卷帘）

### 4.1 坐标系
- **纵轴**：音高（MIDI），含黑键底纹；自动按当前轨音域裁剪（±3 半音余量）。
- **横轴**：时间（beat），每 4 beat 一条小节线，每 beat 一条细线。
- **左侧音名标尺**（ruler）：仅标白键音名（C4/D4…），黑键留空。

### 4.2 直接操作手势（核心交互）
| 手势 | 行为 | 对应字段 |
|---|---|---|
| 单击音符 | 选中 → 检查器显示属性 | `note.selected` |
| **上下拖动音符** | 改音高（吸附到半音） | `note.pitch` |
| 拖动音符左右边 | 改时值（起拍/长度） | `note.startBeat` / `note.durationBeat` |
| 拖动音符主体左右 | 平移（保持时值） | `note.startBeat` |
| 双击空白格 | 新增音符（默认 1 beat） | 新建 `note` |
| 框选多个 | 批量选中 | 多选集 |
| 右键音符 | 上下文菜单（分割/删除/量化） | —— |

### 4.3 量化与吸附
- 量化档位：1/4、1/8、1/16、1/32（原型工具条「量化 1/16」）。
- 吸附(🧲) 开关：开启时拖动/新增自动贴到最近网格；关闭可自由定位（微调对齐用）。

### 4.4 力度编辑（inline velocity lane）
- 每个音符块内高度或顶部明度已编码力度（§3.3）。
- 进阶：在卷帘底部加一条 **velocity 包络 lane**（折线），拖动节点改单音符力度——
  此为 Reaper/Cubase 标准，建议 v2 再加，原型先用检查器里的力度滑块。

### 4.5 人声叠加
- 人声轨音符块上直接显示**歌词**；若选中，检查器展开 like_xstudio.md 的音素编辑。
- 钢琴卷帘可叠加一条**音素迷你轨**（在音符内部分段显示声母/韵母边界），见 like_xstudio.md §3.2。

---

## 5. 数据模型映射（track JSON / MD → DAW 字段）

工作台唯一真相源是 `workspace/project/{歌名}/song_engineer/track/{NN_轨名}.json`。
建议前端统一成如下规范对象（与 daw.html 原型一致）：

```ts
type TrackType = 'vocal' | 'instr' | 'drum';

interface Track {
  id: string;            // "02"
  name: string;          // "主唱"
  type: TrackType;
  instrument?: { name: string; uid: string };  // 乐器轨: Acoustic Nylon / 13010
  singer?: { bank: string; voice: string };    // 人声轨: Sopranos / Altos
  mute: boolean; solo: boolean;
  volume: number;        // 0-100
  pan?: number;          // -64..64 (预留)
  velocity: number;      // 聚合力度 0-127
  notes: Note[];
}

interface Note {
  id?: string;
  pitch: number;         // MIDI; 打击乐=GM number (如 38/74)
  startBeat: number;     // 拍 (支持 .5 八分)
  durationBeat: number;  // 拍 (最小 0.25)
  velocity: number;      // 0-127
  lyric?: string;        // 人声轨
  phonemes?: Phoneme[];  // 人声轨 (见 like_xstudio.md)
  alignment?: 'auto' | 'snap' | 'manual';
  articulation?: string; // 勾弦/琶音/柱式 (乐器轨)
}
```

> 与现有 `song_engineer` 笔记格式的差异：现有轨道 JSON 用 `beat_pos`（两段/三段）、
> `actual`（MIDI 或 GM 串）、`notes[]`/`bars[].beats[]` 两种结构。前端 loader
> 应统一归一到上面的 `Note` 模型（`mscx_generator.load()` 已做类似兼容），
> 不要在 UI 层暴露两种格式。

---

## 6. 与 prototype daw.html 的对应 & 待补

| 本文档条目 | daw.html 状态 | 待补 |
|---|---|---|
| §3.1 轨道头 M/S/音量/音色 | ✅ 已实现 | 声像(pan) 未做 |
| §3.2 横向片段时间轴 | ✅ 已实现 | 多轨纵向对齐总览(arrange) 未做 |
| §3.3 力度着色 | ✅ 已实现 | —— |
| §4.2 拖音高/点选 | ✅ 已实现 | 拖边改时值、双击加音符、框选 未做 |
| §4.3 量化/吸附 | ⚠️ 工具条占位 | 未真正生效 |
| §4.4 velocity lane | ❌ | v2 |
| §5 数据模型 | ✅ 原型一致 | 接真实 JSON 待做 |

**建议下一步（按性价比）：**
1. 补齐 §4.2 拖边改时值 + 双击加音符（编辑器可用性门槛）。
2. Mix 视图顶部加「多轨纵向对齐总览」开关（所有轨叠在同一时间轴，像 arrange 窗口）。
3. 量化/吸附真正生效（改 `startBeat`/`durationBeat` 并 snap 到网格）。

---

## 7. LLM 协助（AI 协同编辑）

钢琴卷帘 / Mix 视图不只是手动编辑。用户在编辑器里**选中一个作用域**，再用自然语言描述意图，由 LLM 把意图翻译成对选中范围的**结构化音符改动（patch）**，前端以 diff 预览、确认后写回。这是架在手动拖拽之上的「copilot 层」。

### 7.1 四种作用域（scope）

| scope | 怎么选 | 典型指令 |
|---|---|---|
| **整轨** | Mix 视图点轨道头 / Note 编辑器当前轨 | "把整条吉他轨力度整体 +10，前奏再轻一点"；"给节奏吉他加切分，打破匀速八分"；"整轨移高一个八度" |
| **小节范围** | 在卷帘 / 时间轴标尺上拖选小节号（如 25–32） | "把副歌 25–32 做力度渐强"；"在 33 小节后插 4 小节 bridge，转到 Am" |
| **音符选择** | 框选若干音符 / 点选单个 | "选中的音都缩成八分，做断奏"；"把这几个音改成琶音上行"；"让选中力度随机化，像真人" |
| **插入乐段** | 选中「在第 N 小节后」锚点（右键 / 标尺菜单） | **"在第 24 小节后面加 4 个小节的间奏乐段，用 Cadd9→Em 走向、更松弛"** |

> 用户举的「在第几个小节后面增加 4 个小结的乐段」= scope `kind:'insert'`（`afterBar=24, barCount=4`）+ instruction。
> 「选择几个音符 / 小节后叫 AI 如何调整」= scope `kind:'notes'` / `kind:'measures'` + instruction。

### 7.2 交互流程

```
选中范围 ──► 浮现「✦ AI 调整」按钮（或右键菜单）
   │
   ▼
自然语言输入框（带快捷 chips：移调 / 力度包络 / 量化 / 加装饰音 / 生成变奏 / 插段）
   │ 提交
   ▼
对话区生成 tool_call：
  task_chain:[{ tool:'ai_adjust_track', args:{ scope, instruction, current_notes } }]
   │
   ▼
后端 LLM（orcg）解析 instruction → 生成 note 级 patch JSON
   │
   ▼
前端在卷帘上叠加 diff 预览：
  新增音符=绿 / 删除=红 / 改动=黄，ToolCallCard 显示「改 12 / 新增 8 / 删 2」
   │
   ├─ 应用 ► 写回 track.json + 重渲染 + 入 undo 栈
   ├─ 重试 ► 重新生成（换 temperature）
   └─ 撤销 ► 丢弃 patch
```

### 7.3 scope 序列化模型（前端↔后端契约）

```ts
type EditScope =
  | { kind:'track';    trackId:string }
  | { kind:'measures'; trackId:string; fromBar:number; toBar:number }   // 闭区间
  | { kind:'notes';    trackId:string; noteIds:string[] }
  | { kind:'insert';   trackId:string; afterBar:number; barCount:number };

interface AdjustRequest {
  scope: EditScope;
  instruction: string;           // 自然语言意图
  referenceNotes?: Note[];        // 当前 scope 内的音符（喂给 LLM 作上下文）
  constraint?: string;           // 可选硬约束（如"保持和弦骨架不变"）
}
```

### 7.4 后端如何支撑

- 复用底座：`AgentCore` 的 `task_chain` 机制（见 `04_后端支撑改造.md`）+ 对话区事件流投影（见 `03_组件详细设计.md` 对话区章节）。
- 新增技能 `ai_track_editor`（建议 `executable:false` 纯提示词，或轻量 executable 做 patch 校验）：
  - 输入：当前 scope 的 `notes` JSON + `instruction` + 工程调性 / BPM 上下文。
  - LLM（默认本地 `orcg`）按系统提示词输出**结构化 patch**（不要自由文本）：
    ```json
    {
      "add":    [{ "pitch":72, "startBeat":96, "durationBeat":1, "velocity":90 }],
      "remove": ["n_031"],
      "update": [{ "noteId":"n_012", "pitch":74, "velocity":60 }]
    }
    ```
  - 和弦 / 调性相关建议可内部调用 `ai_chords_master` / `melody_master` 取走向。
- patch 必须**可被前端 diff 预览**，因此 LLM 输出要 deterministic schema，后端做 schema 校验后再下发（避免把整轨音符冲掉）。
- 插入乐段（`insert`）时，patch 的 `startBeat` 要整体后移 `barCount*4` 拍给新乐段让位；后端算好偏移再返回，前端无需自己重排。

### 7.5 与 daw.html 现状

daw.html 当前**未实现** LLM 协助（只有手动拖拽 + 检查器）。本功能是 v2 核心增量，建议优先级：
1. 先做「整轨 / 音符选择」的文本指令 → patch（数据流最清晰）。
2. 再做「插入乐段」（涉及整体偏移，需后端算 fill）。
3. 最后做快捷 chips 与 diff 预览动画。

---

## 8. 开放问题
- 分轨时间轴是否要支持 **clip 概念**（把一段 MIDI 包成一个可整体拖移的片段），还是始终是展开音符？建议保持"展开音符"直到工程变大再引入 clip。
- 力度聚合值展示用**均值**还是**峰值**？建议峰值（更直观反映最响处）。
- 多轨同时编辑（如主唱+和声同屏对照）是否必要？人声轨建议支持双轨叠显。
