# 歌手 / 人声编辑 · 类似 X Studio 的形态参考

> 本文档定义**主唱、和声等人声轨**的逐音符编辑规范：音高、歌词、音素(phoneme)、
> ph_dur、对齐(alignment)、分段(segmentation)、歌手配置(singer config)。
> 是 [like_daw.md](like_daw.md) 中「歌手编辑部分」的展开，也是 `prototype_html/daw.html`
> 检查器(Inspector) 人声模式的依据。
>
> 真实数据管线的来源：`.workbuddy/skills/openutau_lyrics/`（CV 音素、`R` 休止、X Studio 填词对齐）。

---

## 1. 定位

人声轨 ≠ 普通 MIDI 轨。一个「音符」除了音高/时值/力度，还承载：
- **语义层**：歌词（汉字）、音素（声母+韵母，如 `走 = z+ou`）
- **时间细化层**：音素在音符内的边界（ph_dur / ph_offset）——决定咬字快慢、连读
- **声学层**：歌手参数（tension / breath / gender / opening）——决定音色质感

前端必须把这三层都能**可视化 + 直接编辑**，否则无法做真人声微调。参考产品：

| 产品 | 人声模型特点 | 对我们最有价值的参考 |
|---|---|---|
| **OpenUtau (USTX)** | 开源；音符含 `lyric` + `phonemes[]`（每音素 `phoneme`/`phonemeDuration`/`position`）；note expression：`gender`/`tension`/`breathiness`/`opening`/`voicing` | 音素边界、ph_dur、歌手参数字段标准 |
| **NetEase X Studio** | AI 歌唱；导入 MIDI + 逐行歌词（`R`=休止）；选音源(洛天依/乐正绫…)；自动按时间填词；参数：气声/情绪/性别 | 歌词逐行填词、R 占位、音源选择 |
| **Synthesizer V** | AI 歌唱；歌词自动转音素；参数：张力/气声/性别 + 音高过渡/颤音 | 自动音素 + 平滑参数曲线 |
| **DeepVocal / ACE** | 录制式声库；手动音素对齐 | 手动对齐交互 |

**结论**：采用 **OpenUtau 的音素/参数字段标准** 作为数据存储，采用 **X Studio 的逐行歌词 + R 占位** 作为歌词输入/导出格式。

---

## 2. 人声音符数据模型（核心字段）

```ts
interface VocalNote extends Note {        // 继承 like_daw.md §5 的 Note
  lyric: string;                          // 汉字，如 "走"；休止="R"
  phonemes: Phoneme[];                    // 声母+韵母，CV 格式
  alignment: 'auto' | 'snap' | 'manual';  // 音素对齐方式
}

interface Phoneme {
  symbol: string;     // 音素符号，如 "z" / "ou"（CV 用 + 连接展示，存储拆开）
  ph_dur: number;     // 该音素占音符时长比例 0–1，∑ph_dur (+ ph_offset) = 1
  ph_offset?: number; // 音符起始到首音素的静默间隙 0–1（留白/气口）
}

interface SingerConfig {
  bank: string;       // 声库名: Sopranos / Altos / 洛天依 / 乐正绫 ...
  voice: string;      // 具体音源 id
  tension: number;    // -100..100  张力（明亮↔柔和）
  breath: number;     // 0..100     气声
  gender: number;     // -100..100  性别（音色明暗）
  opening?: number;   // 0..100     开口度（预留）
}
```

### 2.1 与 openutau_lyrics 技能的对应
- `phonemes` 的 CV 格式直接来自技能：`门 = m+en` → `[{symbol:'m'},{symbol:'en'}]`，
  存储时**拆成数组**，UI 用 `+` 连接展示（与 SKILL.md 的 CV 表一致）。
- 零声母字（啊=a、嗯=en→`eN`）只有一个音素；轻声字（了=le→`l+e`）按正常两音素。
- `lyric='R'` 对应 X Studio 的休止符（见 §7 填词对齐）。

---

## 3. 音素与对齐可视化

### 3.1 音素边界标在音符上（mini phoneme track）
在钢琴卷帘的人声音符**内部**，画一条细分段，每段标注音素符号：
```
┌───────────────────────────────┐
│ z │──── ou ────│ 走 (C4)       │   ← 音符内：z 占 42%，ou 占 58%
└───────────────────────────────┘
```
- 分段边界 = 累积 `ph_dur` 的位置。
- 首音素前的 `ph_offset` 显示为左侧留白（气口）。
- 鼠标悬停音素段显示其 `ph_dur` 数值。

### 3.2 ph_dur 占比编辑
- 检查器里每个音素一行：音素符号输入框 + **占比滑块**（如 42% / 58%）。
- 多音素时滑块联动：调一个，其余按比例缩放，保证 ∑=1（或提示超出）。
- 导出 USTX 时：`phonemeDuration(ms) = ph_dur × note.durationMs`；
  `position(ms) = 前置音素时长累加 + ph_offset×note.durationMs`。

### 3.3 对齐方式（alignment）
| 模式 | 含义 | 前端表现 |
|---|---|---|
| **auto** | 由 `gen_xstudio_lyrics.py` 自动按时间顺序填词、装饰音标 `R` | 音素边界锁定，不可手拖（灰显） |
| **snap** | 音素边界吸附到节拍/半拍网格 | 拖动边界自动贴网格 |
| **manual** | 完全手动，自由拖边界 | 任意位置，实时改 ph_dur |

> `auto` 对应技能输出；用户想微调咬字时切 `snap`/`manual`。

### 3.4 特殊字处理（来自技能 SKILL.md）
- **零声母**：`啊=a` 单音素，边界即音符起点。
- **轻声/短装饰音**：优先标 `R`（休止），长音优先配词（`gen_xstudio_lyrics.py` 阈值 3 拍逐级下调）。
- **跨音符连读**：同一歌词跨两音符时，用「分组(group)」标记，避免音素被切断（见 §4）。

---

## 4. 分段 / 分组（segmentation）

| 操作 | 行为 | 数据变化 |
|---|---|---|
| **中点分段** | 把选中音符切成两个等长音符 | 拆 `phonemes[]` 为前后两半（按 ph_dur 累加中点切），新建第二个 `VocalNote` |
| **合并** | 选中相邻两音符合并 | 拼接 `phonemes[]`，时长相加 |
| **分组(group)** | 标记若干音符为同一语义单元（如一个词的两个字） | 加 `groupId`，渲染时连线下划线，音素跨音符平滑 |
| **滑音(portamento)** | 两音符间加滑音过渡 | 加 `portamento:true`，卷帘画斜连线 |

> 分段在 daw.html 已实现「中点分段」按钮（原型），合并/分组为 v2。

---

## 5. 歌手配置面板（Singer Config）

人声轨检查器底部固定一块「歌手配置」，作用于整轨（也可下钻到音符级覆盖）：

| 参数 | 范围 | 含义 | 对应 USTX |
|---|---|---|---|
| 声库 bank | 枚举 | Sopranos / Altos / 洛天依… | Singer |
| 张力 tension | -100..100 | 明亮↔柔和，影响共振峰 | note expression `tension` |
| 气声 breath | 0..100 | 气声量，影响齿音/气息 | `breathiness` |
| 性别 gender | -100..100 | 音色明暗（男↔女） | `gender` |
| 开口度 opening | 0..100 | 元音开口度（预留） | `opening` |

- 整轨参数 → 写入 `track.singer`。
- 单音符想覆盖（如某字更气声）→ 在检查器音符级也放同样滑块，写入该 `VocalNote`。
- 导出：整轨参数写入 USTX 的 track/singer 默认，音符级写入 note expression。

---

## 6. 与 openutau_lyrics 技能对接

技能已提供两条生成链路，前端编辑结果应能以同格式回写/导出：

### 6.1 CV 音素（gen_phonemes.py）
- 输入：`02_主唱.md`（逐音符旋律）
- 输出：`02_主唱_phonemes.md`（CV 音素对照表）
- 前端：检查器「音素表」编辑的 `phonemes[]` 应可导出成该 CV 格式。

### 6.2 X Studio 歌词（gen_xstudio_lyrics.py）
- 输入：`02_主唱.mid` + SKILL.md 歌词表（按段落小节匹配）
- 对齐规则：**保持时间顺序填词**；装饰音(短音)优先标 `R`；长音优先配词；阈值从 3 拍逐级下调至 0.5 拍；歌词利用率应=100%，多余歌词截断告警。
- 输出：`02_主唱_xstudio_lyrics.txt`（逐行，每行一字，`R`=休止）—— X Studio 直接导入。
- 前端：检查器 `lyric` 字段 + `alignment='auto'` 即对应此流程；用户手动改词/分段后，可重新导出该 txt。

> 关键约束：**歌词必须保持时间顺序、装饰音留 R**，否则 X Studio / OpenUtau 渲染会错位。
> 前端在 `auto` 模式下应禁止破坏该约束的编辑（或给出强告警）。

---

## 7. 数据模型映射 + daw.html 检查器对应

| 本文档字段 | daw.html 检查器位置 | 状态 |
|---|---|---|
| `lyric` | 检查器「歌词」输入框 | ✅ |
| `phonemes[].symbol` | 检查器「音素表」每行 sym | ✅ |
| `phonemes[].ph_dur` | 检查器「音素表」每行滑块 | ✅ |
| `alignment` | 检查器「对齐」下拉 | ✅（占位，未联动 auto 锁定） |
| 中点分段 | 检查器「✂ 在中点分段」 | ✅ |
| `singer.{bank,tension,breath,gender}` | 检查器「歌手配置」 | ✅ |
| `ph_offset`（气口） | —— | ❌ 待加 |
| 合并/分组/滑音 | —— | ❌ v2 |
| velocity lane 内嵌音素 | 卷帘内 mini phoneme track | ❌ 待加（§3.1） |
| 音符级歌手参数覆盖 | —— | ❌ v2 |

---

## 8. LLM 协助（歌词 / 演唱细节）

人声轨的 AI 协助与 like_daw §7 **同构**，只是作用对象换成**歌词 / 音素 / 歌手参数**，且必须尊重 OpenUtau / X Studio 的对齐约束（见 §6）。

### 8.1 作用域

| scope | 怎么选 | 典型指令 |
|---|---|---|
| **歌词段落** | 在卷帘 / 时间轴选段落小节（如主歌A 5–12） | "把主歌A 口语化一点，更像聊天"；"副歌结尾加一句呼应和声"；"给这段每句尾加 R 气口" |
| **若干音符** | 人声轨框选若干音符 | "选中的字咬字放慢、字头更轻"；"这几个音更气声"；"把选中音符声母延长 20%" |
| **单音符** | 点选一个音符 | "这个字改轻声"；"韵母 ph_dur 拉长"；"对齐从 auto 改 snap 吸附半拍" |
| **整轨歌手** | 检查器歌手配置面板 | "副歌 tension 整体 +15"；"这段换更明亮的声库" |

> 用户举的「歌词、演唱细节调整」即上面前三类。scope 复用 like_daw §7.3 模型并扩展：

```ts
type VocalEditScope =
  | { kind:'lyric-section'; trackId:string; fromBar:number; toBar:number }
  | { kind:'notes';         trackId:string; noteIds:string[] }
  | { kind:'note';          trackId:string; noteId:string }
  | { kind:'singer-track';  trackId:string };
```

### 8.2 典型指令族

- **歌词改写**：押韵优化、口语化、情绪一致、补 / 删字 → 产出新 `lyric` 序列。
- **音素 / ph_dur**：声母 / 韵母时长再分配、连读、气口 → 改 `phonemes[].ph_dur` / `ph_offset`。
- **对齐**：auto → snap / manual、吸附网格 → 改 `alignment`。
- **分段**：中点分段、按词分组 → 触发 §4 的分割 / group。
- **歌手配置**：tension / breath / gender / 声库 → 改 `singer` / 音符级 override。

### 8.3 后端支撑 & 约束

- 复用 `openutau_lyrics` 技能（`gen_xstudio_lyrics.py` 填词对齐 + `gen_phonemes.py` CV 音素），在其之上加 LLM 层做「歌词改写 / 音素微调」。
- 指令 → LLM 生成新方案 → **仍须走 auto 模式的对齐约束**：保持时间顺序填词、装饰音留 `R`、∑ph_dur≤1，否则 X Studio / OpenUtau 渲染错位（见 §6.2）。
- 前端在**预览阶段做校验**，违反则强告警并高亮越界音符（如某段歌词时间序被破坏、ph_dur 累加 >1）。
- 同样以 tool_call 形态进入对话区（如 `ai_adjust_vocal`），patch 结构类比 like_daw §7.4 的增量：
  ```json
  {
    "lyric":  [{ "noteId":"n_012", "lyric":"走" }],
    "phonemes":[{ "noteId":"n_012", "phonemes":[{"symbol":"z","ph_dur":0.4},{"symbol":"ou","ph_dur":0.6}] }],
    "singer": { "tension":15, "breath":30 }
  }
  ```

### 8.4 预览与确认

- 歌词改动 → 卷帘音符块文字变色预览；音素改动 → mini phoneme track 边界移动预览（见 §3.1）；歌手参数 → SingerConfig 面板数值预览。
- 确认后写回 `track.json` + 重新导出 USTX / X Studio txt（若处于 auto 模式需重跑 `gen_xstudio_lyrics.py` 对齐校验）。

---

## 9. 开放问题
- `ph_dur` 用比例(0–1) 还是绝对 ms 存储？建议**比例**（编辑直观），导出时乘 `note.durationMs` 转 ms。
- 零声母/轻声/跨音符连读是否需要 UI 特殊提示？建议音素表对零声母标「(零声母)」、跨组标连线。
- 歌手参数整轨 vs 音符级：是否默认整轨、仅允许用户对个别音符「override」？建议默认整轨 + 音符级 override 旗标。
- 多音源（如主唱用 Sopranos、和声用 Altos）是否在同一工程并存？当前「走在」是，前端需支持每轨独立 `singer`。
