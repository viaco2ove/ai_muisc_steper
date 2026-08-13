# 一、DAW标准音频插件全分类 + 行业标杆代表插件
按混音处理流程排序（录音/人声制作标准链路：降噪→均衡→动态压缩→音色塑形→空间混响→创意效果），分6大类，每类说明作用+经典代表（商业+免费开源都标注，方便你自研对标）

## 1. 降噪/修复类（前置预处理，AI人声必备）
作用：去除底噪、电流声、齿音、爆破音、修正跑调、修复断音，人声第一步处理
### 代表插件
1. iZotope RX 系列（行业天花板，AI修复全能）
2. Waves DeEsser（经典去齿音）
3. C4 / Waves NS1 自动降噪
4. 开源对标：Noisegate、Auburn Sounds Graillon（免费修音+降噪）
自研适配：底噪消除、齿音抑制、爆破音过滤、MIDI联动自动降噪

## 2. EQ均衡类（塑形音色，最核心基础插件）
作用：切割/提升频段，调整人声明亮度、厚度、低频浑浊、消除刺耳频段，分三类EQ
### 细分+代表
1. 线性相位均衡（录音母带，干净无相位偏移）
    代表：iZotope Ozone EQ、FabFilter Pro-Q3（公认行业标杆，可视化频谱）
2. 模拟硬件EQ（温暖染色，流行人声）
    代表：SSL EQ、Neve 1073、API 550
3. 高通/低切简易EQ（快速低切80Hz去除胸腔杂音）
    代表：各类DAW自带HighCut/LowCut
自研适配：多点参量EQ、高低切、高低搁架、模拟硬件染色EQ

## 3. 动态处理类（控制音量起伏，解决AI人声平直无感情）
### 3.1 压缩器 Compressor（人声刚需）
作用：压平音量差距，弱音放大、强音收住，增加人声稳定度
代表：
- 数字透明：FabFilter Pro-C 2
- 模拟温暖：SSL G-Master Comp、LA-2A（人声神器，柔和压缩）、1176（爆发力）
- 多段压缩：iZotope Multiband Comp（分频段控制，解决高音刺耳）
### 3.2 限制器 Limiter（导出前防爆音，提升整体响度）
代表：Ozone Maximizer、FabFilter Pro-L 2
### 3.3 门控 Noise Gate（静音段自动降噪，换气间隙关闭杂音）
代表：SSL Gate、Waves SSL Gate
### 3.4 扩展器 Expander（拉开强弱对比，增加呼吸层次感）
自研适配：单段压缩、多段压缩、软拐点模拟压缩、人声专用轻压缩、输出限制器、噪声门

## 4. 音色染色/谐波塑形类（改变人声质感，消除AI电子塑料感）
作用：增加谐波失真、温暖饱和、虚实声变化、磁性厚度
### 代表插件
1. 饱和失真 Saturation
    Soundtoys Decapitator（模拟电子管/磁带饱和）、Ozone Saturate
2. 电子管/磁带模拟器
    Waves Abbey Road、Klanghelm IVGI（免费饱和）
3. 激励器 Exciter（提亮高频空气感，人声通透）
    Aphex Aural Exciter、FabFilter Pro-DS附带高频激励
自研适配：电子管饱和、磁带轻微失真、高频空气激励、低频加厚染色

## 5. 空间混响&延迟类（营造声场、距离感，抒情歌曲核心）
### 5.1 混响 Reverb（细分4种）
1. 房间混响 Room：近距干声，适合主歌
    代表：FabFilter Pro-R
2. 厅堂混响 Hall：宏大抒情、副歌
    代表：Lexicon 224（殿堂级硬件混响标杆）
3. 板式混响 Plate：复古流行人声，柔和顺滑
    代表：Soundtoys Little Plate
4. 卷积混响 IR Reverb（真实采样房间/教堂，真实度最高）
    代表：Convology XT（免费）、LiquidSonics
### 5.2 延迟 Delay（回声、层次感、节奏氛围感）
代表：Soundtoys EchoBoy、Waves H-Delay（模拟磁带延迟）
衍生：乒乓延迟、同步节拍延迟、预延迟（配合混响使用）
### 5.3 立体声加宽 Stereo Width
代表：Ozone Imager，拉宽人声声场，避免居中单调
自研适配：房间/板式/厅堂混响、卷积采样混响、同步延迟、立体声宽度调节、预延迟控制

## 6. 调制&创意特效类（风格化人声：古风、R&B、电子、哭腔）
作用：制造特殊演唱效果，颤音、移调、镶边、合唱
### 代表
1. 合唱 Chorus（加厚单薄人声）：Waves Chorus
2. 镶边 Flanger / 相位 Phaser（电子风格）
3. 移调/音高调制 Pitch Shifter（和声、哭腔、变声）：Graillon、Soundtoys Little AlterBoy
4. 自动音量Automation、颤音调制 Tremolo
5. 滤波扫频 Wah（电音人声）
自研适配：人声合唱加厚、简易移调变声、节拍同步镶边、颤音调制

## 7. 母带综合套件（轨道总输出统一美化，分轨导出后使用）
一体化集成EQ、压缩、饱和、限制器一站式处理
代表：iZotope Ozone 全系列、Wave SSL G-Master Buss Compressor

# 二、人声标准处理插件链路（你DiffSinger工程直接套用）
人声分轨渲染后处理顺序：
降噪/去齿音 → 低切EQ塑形音色 → 人声压缩 → 电子管饱和染色 → 混响+延迟空间效果 → 立体声加宽 → 输出限制器

# 三、自研插件优先级推荐（先做刚需，再做创意）
1. 第一优先级（必做，解决AI人声基础缺陷）
低切EQ、单段人声压缩、噪声门、去齿音、房间混响、输出限制器
2. 第二优先级（提升真人质感）
多段压缩、板式混响、磁带饱和激励、立体声宽度、节拍延迟
3. 第三优先级（风格创意）
合唱加厚、移调变声、厅堂卷积混响、镶边特效