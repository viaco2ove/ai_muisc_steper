# 一、现有 singer.json voice_conf 扩容方案（轨道全局音色参数）
基于 DiffSinger / OpenUtau 标准参数体系，在原有基础上新增**真人演唱必备全局控制项**，兼顾全局基调、演唱技巧、气息、共振峰、颤音、滑音、动态包络。
## 完整扩展后 singer.json 示例
```json
{
  "input_mid": "workspace/project/走在/song_engineer/track/02_主唱.mid",
  "input_lyrics": "workspace/project/走在/song_engineer/track/03_lyrics.json",
  "singer": "D:\\OpenUtau\\Singers\\Singers\\YunYe_DiffSinger_CE_26.07.16.zip",
  "output_mid": "workspace/project/走在/song_engineer/track/singer/02_主唱.mid",
  "output_lyrics": "workspace/project/走在/song_engineer/track/singer/02_主唱.lyrics.txt",
  "output_ustx_json": "workspace/project/走在/song_engineer/track/singer/02_主唱.ustx.json",
  "output_wav": "workspace/project/走在/song_engineer/track/singer/02_主唱.wav",
  "voice_conf": {
    // 原有基础参数
    "gender": 0.0,
    "expr": 1.0,
    "breathiness": 0.0,
    "voicing": 0.0,
    "tension": 0.0,
    "velocity": 1.0,

    // ========== 新增1：动态响度/能量控制（真人强弱起伏核心）
    "dynamics": 1.0,          // DYN 整体动态响度，0~2，默认1；副歌拉高、主歌压低
    "energy_balance": 0.0,    // 能量均衡，负=柔和弱起，正=爆发力强唱

    // ========== 新增2：口腔共振/明亮度/开口度（改善AI塑料感）
    "brightness": 0.0,        // 高频明亮度，负=低沉沙哑，正=清亮通透
    "opening": 1.0,           // 口腔开合度，0~1；偏小=收声内敛，偏大=开放抒情
    "nasal": 0.0,             // 鼻音分量，抒情民谣轻微加，流行减到负数

    // ========== 新增3：颤音全局预设（长音真人灵魂）
    "vib_depth": 0.2,         // 颤音深度 0~0.8，默认0.2
    "vib_rate": 5.0,          // 颤音频率(Hz)，4~6温柔，6~8爆发力
    "vib_delay": 0.3,         // 音符启动后多久出颤音(秒)，模拟真人不会一开口就抖

    // ========== 新增4：滑音/转音控制（解决生硬断音）
    "portamento": 0.4,        // 滑音过渡时长系数 0~1，抒情拉满、快歌降低
    "pitch_smooth": 0.6,      // 全局音高平滑度，消除AI锯齿音高

    // ========== 新增5：起音/尾音包络（Attack/Release，自然收尾）
    "attack": 0.2,            // 起音快慢，0=爆发硬起，0.4=轻柔缓入
    "release": 0.3,           // 尾音衰减长度，抒情加长，快歌缩短
    "breath_tail": 0.5,       // 尾音自动追加呼吸气声（对应你需求“增加呼吸”）

    // ========== 新增6：演唱模式/声区切换（真声/假声/混声）
    "falsetto": 0.0,          // 假声占比，0真声，0.3混声，0.8纯假声
    "mix_balance": 0.0,       // 混声平衡，高音自动过渡虚实声

    // ========== 新增7：辅音/咬字细节（解决咬字糊、太机械）
    "consonant_strength": 1.0,// 辅音清晰度，0.7温柔含糊，1.3咬字清晰有力
    "soft_palate": 0.0,       // 软腭松弛度，负数更慵懒气声，正数紧实咬字

    // ========== 新增8：全局音高偏移/修音宽容度（模拟真人跑调偏差）
    "pitch_offset": 0.0,      // 轨道整体音高偏移半音
    "pitch_tolerance": 0.15,  // 允许轻微音高浮动，完全0会极度机械

    // ========== 新增9：扩散推理质感微调（渲染层面自然度）
    "noise_soften": 0.1,      // 轻微噪声柔化，减少AI干净电子感
    "variance_weight": 1.0    // Variance方差模型权重，越高演唱细节越丰富
  },
  // 新增：轨道全局演唱风格预设，快速切换抒情/摇滚/古风
  "style_preset": "ballad",
  // 新增：轨道专属呼吸采样开关，单独渲染句间换气
  "auto_breath_insert": true,
  "breath_volume": 0.35
}
```

## 各新增参数作用说明（贴合DiffSinger底层方差/声学模型）
1. **dynamics / energy_balance**
   控制整轨音量动态范围，真人唱歌不会全程响度一致；主歌压低、副歌拉高，大幅弱化AI平直感。
2. **brightness / opening / nasal**
   共振峰调节，改变音色冷暖，解决AI统一“标准电子嗓”；古风降低brightness、民谣轻微加nasal。
3. **vib_* 颤音三参数**
   全局默认颤音模板，长音符自动叠加自然抖动，替代生硬直线音高；vib_delay模拟真人唱稳再颤。
4. **portamento / pitch_smooth**
   音高过渡平滑系数，高低音跳转不再生硬断层，贴近真人滑音转音习惯。
5. **attack / release / breath_tail**
   音符包络控制：起音柔和、尾音缓慢衰减，尾音自动混气声，直接满足你需求「增加呼吸」。
6. **falsetto / mix_balance**
   虚实声混合控制，高音自动混入假声，避免高音刺耳僵硬。
7. **consonant_strength**
   辅音轻重，情歌弱化辅音更温柔，说唱/流行增强咬字力度。
8. **pitch_tolerance**
   允许音高微小浮动，完全无浮动会像电子琴，轻微浮动才有真人不完美的自然感。
9. **auto_breath_insert / breath_volume**
   全局自动在长乐句末尾插入换气声，配套breath_tail实现完整呼吸链。

# 二、单音符级可调参数（写入ustx.json plan结构，分轨音符独立控制）
当前代码只做轨道全局voice_conf，**音符粒度参数是实现精细拟人化的关键**，每个音符单独覆盖全局配置，写入`plan["notes"][i]`下的`note_params`。
## 单音符完整参数字段（可集成进 PlanBuilder）
```json
"notes": [
  {
    "position": 0,
    "duration": 480,
    "pitch": 60,
    "lyric": "走",
    "phonemes": ["z", "ou"],
    // 单音符覆盖全局音色，优先级高于voice_conf
    "note_params": {
      // 基础覆盖
      "gender": null,
      "breathiness": 0.4,
      "tension": 0.8,
      "voicing": 0.6,
      "velocity": 1.2,

      // 动态响度（单字强弱）
      "dynamics": 1.3,
      "energy_balance": 0.2,

      // 颤音单音符开关（长音开启，短音关闭）
      "vib_enable": true,
      "vib_depth": 0.35,
      "vib_rate": 5.5,
      "vib_delay": 0.25,

      // 起音尾音包络
      "attack": 0.1,
      "release": 0.4,
      "breath_tail": 0.6,

      // 滑音（前一个音符到本音的滑音时长）
      "portamento_in": 0.5,
      "portamento_out": 0.2,

      // 音高微调（单音符跑调/哭腔）
      "pitch_shift": -0.12, // 半音偏移，负值轻微下沉做哭腔
      "pitch_wobble": 0.08, // 单音微小音高抖动

      // 声区切换
      "falsetto": 0.2,

      // 咬字细节
      "consonant_strength": 1.1,

      // 特殊技巧标记（供渲染器做特殊处理）
      "is_breath_note": false, // 纯换气音符
      "is_glissando": false,   // 连续滑音长音
      "is_staccato": false     // 断音、短促吐字
    }
  }
]
```
## 音符参数拟人化使用场景
1. **副歌重拍音符**：拉高dynamics、tension，加大consonant_strength，增强爆发力；
2. **抒情长音尾字**：开启vib，提高breath_tail、release，增加气声衰减；
3. **悲伤哭腔段落**：pitch_shift轻微负偏移，提升breathiness，降低tension；
4. **高低音跳转音符**：增大portamento_in，音高平滑过渡；
5. **短句短促咬字**：开启staccato，缩短release、提高attack硬起；
6. **句末换气位**：单独插入空音符 `is_breath_note: true`，只输出纯呼吸噪声。

# 三、对应 Python 渲染代码改造要点（适配新参数）
## 1. 读取 singer.json 扩展 voice_conf 全部字段
在现有读取voice_conf代码后，补充读取新增参数，无值时设置安全默认：
```python
# 原有读取逻辑不变，追加扩展参数
conf_dyn = float(voice_conf.get("dynamics", 1.0))
conf_energy_bal = float(voice_conf.get("energy_balance", 0.0))
conf_bright = float(voice_conf.get("brightness", 0.0))
conf_opening = float(voice_conf.get("opening", 1.0))
conf_nasal = float(voice_conf.get("nasal", 0.0))

conf_vib_depth = float(voice_conf.get("vib_depth", 0.2))
conf_vib_rate = float(voice_conf.get("vib_rate", 5.0))
conf_vib_delay = float(voice_conf.get("vib_delay", 0.3))

conf_porta = float(voice_conf.get("portamento", 0.4))
conf_pitch_smooth = float(voice_conf.get("pitch_smooth", 0.6))

conf_attack = float(voice_conf.get("attack", 0.2))
conf_release = float(voice_conf.get("release", 0.3))
conf_breath_tail = float(voice_conf.get("breath_tail", 0.5))

conf_falsetto = float(voice_conf.get("falsetto", 0.0))
conf_mix_bal = float(voice_conf.get("mix_balance", 0.0))

conf_consonant = float(voice_conf.get("consonant_strength", 1.0))
conf_soft_palate = float(voice_conf.get("soft_palate", 0.0))

conf_pitch_offset = float(voice_conf.get("pitch_offset", 0.0))
conf_pitch_tol = float(voice_conf.get("pitch_tolerance", 0.15))

conf_noise_soft = float(voice_conf.get("noise_soften", 0.1))
conf_var_weight = float(voice_conf.get("variance_weight", 1.0))

# 全局呼吸开关
auto_breath = voice_conf.get("auto_breath_insert", True)
breath_vol = float(voice_conf.get("breath_volume", 0.35))
```

## 2. Renderer 类入参扩展，传入全部全局音色参数
```python
r = Renderer(
    vb, sess, args.steps, args.steps_pitch, args.steps_variance,
    gender=conf_gender, velocity=conf_vel, expr=conf_expr,
    breathiness=conf_breath, voicing=conf_voice, tension=conf_tension,
    # 新增扩展全局参数传入
    dynamics=conf_dyn, energy_balance=conf_energy_bal,
    brightness=conf_bright, opening=conf_opening, nasal=conf_nasal,
    vib_depth=conf_vib_depth, vib_rate=conf_vib_rate, vib_delay=conf_vib_delay,
    portamento=conf_porta, pitch_smooth=conf_pitch_smooth,
    attack=conf_attack, release=conf_release, breath_tail=conf_breath_tail,
    falsetto=conf_falsetto, mix_balance=conf_mix_bal,
    consonant_strength=conf_consonant, soft_palate=conf_soft_palate,
    pitch_offset=conf_pitch_offset, pitch_tolerance=conf_pitch_tol,
    noise_soften=conf_noise_soft, variance_weight=conf_var_weight,
    auto_breath=auto_breath, breath_volume=breath_vol
)
```

## 3. synth_from_plan 内单音符参数覆盖逻辑
遍历plan["notes"]时，读取每个音符`note_params`，**音符参数优先级 > 轨道全局voice_conf**，实现单字独立微调：
```python
for note in plan["notes"]:
    note_p = note.get("note_params", {})
    # 音符参数缺省回退全局配置
    note_breath = float(note_p.get("breathiness", conf_breath))
    note_tension = float(note_p.get("tension", conf_tension))
    note_vib_depth = float(note_p.get("vib_depth", conf_vib_depth))
    note_breath_tail = float(note_p.get("breath_tail", conf_breath_tail))
    note_porta_in = float(note_p.get("portamento_in", conf_porta))
    note_shift = float(note_p.get("pitch_shift", 0.0))
    # 传入单音符参数给方差/声学模型推理
```

# 四、配套前端编辑器缺失功能补充（对应review.md里的bug）
你文档里UI存在大量缺失，新增参数后前端需要配套界面：
1. **分轨面板 singer.json 全局音色面板**
   - 原有：gender/expr/breathiness/tension/velocity
   - 新增分组：动态响度、明亮度共振、颤音全局、起音尾音、虚实声、咬字、自动呼吸开关
2. **音符属性弹窗（选中音符后弹窗）**
   展示全部note_params，支持滑块调节、重置为轨道全局默认；
3. **曲线编辑器**
   新增曲线轨道：DYN（响度）、VIB（颤音深度）、BREATH（气声）、PORTA（滑音）、PITCH_SHIFT（音高偏移），和OpenUtau对齐；
4. **自动呼吸生成按钮**
   一键扫描MIDI乐句，自动插入`is_breath_note`换气音符；
5. **歌手声库选择完整面板**
   支持切换zip声库、预览音色、保存多套singer.json音色预设（抒情/流行/古风）。

# 五、提升真人感核心设计思路总结
1. **双层参数架构**：轨道全局基调 + 单音符精细微调，兼顾批量统一和局部情感；
2. **补齐人类演唱四大缺失维度**
   - 气息系统：全局自动换气 + 音符尾音气声衰减
   - 动态强弱：DYN响度包络，消除AI平直音量
   - 音高自然度：颤音、滑音过渡、微小音高浮动宽容度
   - 音色虚实切换：真声/混声/假声、口腔开合、鼻音、明亮度
3. **兼容现有DiffSinger推理链路**
   所有参数对接Variance方差模型、Acoustic声学模型，不改动底层扩散推理逻辑，仅扩展条件输入；
4. **完全对齐OpenUtau标准参数命名**
   前端用户学习成本低，可直接兼容OpenUtau工程参数逻辑。
