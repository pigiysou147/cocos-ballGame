# 时间弹射物语 - World Flipper Clone

基于 Cocos Creator 3.x 开发的《时间弹射物语》(World Flipper) 复刻游戏。

## 🎮 游戏简介

这是一款弹珠类RPG游戏，玩家控制角色像弹珠一样在场景中弹射，通过底部的挡板控制角色方向，击败场景中的敌人。

### 核心玩法

- **弹射机制**: 角色作为弹珠在场景中自由弹射
- **挡板控制**: 通过左右挡板控制角色弹射方向
- **自动攻击**: 角色碰撞敌人时自动造成伤害
- **技能系统**: 积攒能量后释放强力技能
- **连击系统**: 连续击中获得更高分数加成

## 📁 项目结构

```
world-flipper-clone/
├── assets/
│   ├── scripts/           # 游戏脚本
│   │   ├── GameManager.ts     # 游戏管理器
│   │   ├── Character.ts       # 角色类（弹珠）
│   │   ├── Enemy.ts           # 敌人类
│   │   ├── Flipper.ts         # 挡板类
│   │   ├── Wall.ts            # 墙壁类
│   │   ├── Bumper.ts          # 弹射障碍物
│   │   ├── DeadZone.ts        # 死区
│   │   ├── GameUI.ts          # 游戏UI
│   │   ├── SkillSystem.ts     # 技能系统
│   │   ├── SceneSetup.ts      # 场景初始化
│   │   ├── LevelManager.ts    # 关卡管理
│   │   ├── InputManager.ts    # 输入管理
│   │   ├── CharacterData.ts   # 角色数据定义
│   │   ├── CharacterManager.ts # 角色管理器
│   │   ├── CharacterSelectUI.ts # 角色选择界面
│   │   ├── CharacterUpgrade.ts  # 角色升级养成
│   │   ├── TeamBattle.ts      # 队伍战斗系统
│   │   ├── SkillData.ts       # 技能池数据定义
│   │   ├── EquipmentData.ts   # 装备池数据定义
│   │   ├── EquipmentManager.ts # 装备管理器
│   │   ├── LevelData.ts       # 关卡章节数据
│   │   ├── LevelProgressManager.ts # 关卡进度管理
│   │   ├── DoodleGraphics.ts  # 涂鸦风格UI绘制工具
│   │   ├── MainMenuUI.ts      # 主界面/首页
│   │   ├── InventoryPanel.ts  # 背包面板
│   │   ├── CharacterPanel.ts  # 角色详情面板
│   │   ├── LevelSelectPanel.ts # 关卡选择面板
│   │   ├── BossRaidData.ts    # 领主战数据定义
│   │   ├── BossRaidManager.ts # 领主战管理器
│   │   ├── BossRaidPanel.ts   # 领主战UI面板
│   │   └── index.ts           # 模块导出
│   ├── scenes/            # 游戏场景
│   ├── prefabs/           # 预制体
│   ├── textures/          # 贴图资源
│   └── animations/        # 动画资源
├── settings/              # 项目设置
├── package.json           # 项目配置
└── tsconfig.json          # TypeScript配置
```

## 🎯 核心类说明

### GameManager - 游戏管理器
管理游戏整体流程，包括：
- 游戏状态控制（开始/暂停/结束）
- 分数和连击系统
- 敌人和角色注册管理

### Character - 角色类
玩家控制的弹珠角色：
- 物理弹射行为
- 生命值和攻击力
- 技能能量和释放
- 碰撞检测和伤害

### Flipper - 挡板类
底部控制挡板：
- 左右挡板独立控制
- 键盘和触摸输入支持
- 弹射力度和角度计算

### Enemy - 敌人类
场景中的敌人目标：
- 普通/精英/Boss类型
- 生命值和攻击力
- 击杀奖励

### SkillSystem - 技能系统
角色技能管理：
- 多种技能类型（伤害/治疗/增益）
- 能量充能机制
- 技能效果和特效

## 🎮 操作说明

### 键盘控制
| 按键 | 功能 |
|------|------|
| A / ← | 左挡板 |
| D / → | 右挡板 |
| S / ↓ | 同时激活双挡板 |
| Space / J | 释放技能 |
| ESC | 暂停游戏 |

### 触摸控制
- 屏幕左半边：控制左挡板
- 屏幕右半边：控制右挡板

## 🚀 快速开始

### 环境要求
- Cocos Creator 3.8.0+
- Node.js 14+

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd world-flipper-clone
```

2. 使用 Cocos Creator 打开项目
```bash
# 或直接在 Cocos Dashboard 中打开项目文件夹
```

3. 创建游戏场景
- 创建新场景或打开现有场景
- 在场景中添加空节点并挂载 `SceneSetup` 组件
- 运行游戏

### 使用场景初始化器

```typescript
// 场景会自动创建所有游戏元素
// SceneSetup 组件会自动创建：
// - 游戏管理器
// - 墙壁边界
// - 左右挡板
// - 死区
// - 角色
// - 敌人
// - 弹射障碍物
```

## 🔧 自定义配置

### 角色配置
在 `Character` 组件中可调整：
- `maxHP`: 最大生命值
- `attack`: 攻击力
- `bounceForce`: 弹射力度
- `maxSpeed` / `minSpeed`: 速度限制

### 挡板配置
在 `Flipper` 组件中可调整：
- `flipForce`: 弹射力度
- `flipAngle`: 旋转角度
- `flipSpeed`: 旋转速度

### 敌人配置
在 `Enemy` 组件中可调整：
- `enemyType`: 敌人类型
- `maxHP`: 生命值
- `attack`: 攻击力
- `scoreReward`: 分数奖励

## 📝 扩展开发

### 添加新技能
在 `SkillSystem.ts` 的 `initSkillDatabase()` 中添加：

```typescript
this._skillDatabase.set('newSkill', {
    id: 'newSkill',
    name: '新技能',
    description: '技能描述',
    type: SkillType.DAMAGE,
    target: SkillTarget.ALL_ENEMIES,
    baseDamage: 100,
    cooldown: 10,
    energyCost: 100,
    effectDuration: 1
});
```

### 添加新关卡
在 `LevelManager.ts` 的 `initLevelDatabase()` 中添加：

```typescript
this._levelDatabase.set(newId, {
    id: newId,
    name: '新关卡名',
    enemies: [...],
    bumpers: [...],
    targetScore: 1000
});
```

## 🎨 美术资源

当前版本使用程序化绘制（Graphics组件）生成简单图形。
实际项目中建议替换为：
- 角色精灵图
- 敌人精灵图和动画
- 场景背景和装饰
- UI界面图片
- 粒子特效

## 🎭 角色系统

### 角色数据 (CharacterData)
- **稀有度**: N/R/SR/SSR/UR 五个等级
- **属性类型**: 火/水/风/雷/光/暗 六种元素
- **职业类型**: 战士/法师/弓手/治疗/坦克/刺客/辅助

### 角色管理 (CharacterManager)
- 角色获取和存储
- 队伍编辑（最多5队，每队3人）
- 队长技能系统
- 抽卡系统（单抽/十连）
- 本地存档功能

### 角色养成 (CharacterUpgrade)
- 等级升级（经验书消耗）
- 星级突破（突破石消耗）
- 觉醒系统（觉醒结晶消耗）

### 队伍战斗 (TeamBattle)
- 多角色跟随效果
- 元素克制计算
- 队长技能加成
- 队伍技能释放
- 角色阵亡和切换

## 🔮 技能系统

采用**池化设计**，技能和角色分离，更灵活地扩展和配置。

### 技能数据 (SkillData)
- **技能类型**: 主动技能/队长技能/被动技能
- **目标类型**: 单体/全体/自身/范围
- **效果类型**: 伤害/治疗/护盾/增益/减益/控制等25+种
- **技能属性**: 冷却时间/能量消耗/伤害倍率/成长系数

### 技能数据库 (SkillDatabase)
- 预定义20+个技能
- 支持根据ID/类型/元素/标签查询
- 自动计算技能等级成长

### 角色技能配置
```typescript
// 角色通过ID引用技能池
skillSlots: {
    defaultSkillId: 'skill_fire_strike',
    leaderSkillId: 'skill_leader_atk_boost',
    passiveSkillIds: ['skill_passive_hp_regen'],
    learnableSkillIds: ['skill_fire_strike', 'skill_aoe_damage']
}
```

## ⚔️ 装备系统

### 装备数据 (EquipmentData)
- **装备类型**: 武器/头盔/铠甲/手套/鞋子/项链/戒指/徽章
- **稀有度**: N/R/SR/SSR/UR
- **属性类型**: 攻击/防御/生命/暴击等16种
- **套装效果**: 2件套/4件套特殊加成

### 装备管理 (EquipmentManager)
- 装备获取和背包管理
- 装备穿戴（支持职业/等级/元素限制）
- 装备强化（消耗金币和强化石）
- 套装效果计算
- 角色属性加成整合

### 特殊效果系统
- 触发条件（攻击时/受伤时/击杀时等）
- 特殊效果（吸血/反伤/连击等）
- 效果冷却控制

## 🗺️ 关卡系统

### 关卡数据 (LevelData)
- **章节系统**: 5+个主线章节，每章5关
- **关卡类型**: 普通/精英/Boss/活动/每日
- **难度等级**: 简单/普通/困难/地狱
- **波次系统**: 多波敌人，波次奖励

### 关卡目标
- 消灭所有敌人
- 限时通关
- 达成连击数
- 获得指定分数
- 无伤通关

### 奖励系统
- **首次通关奖励**: 钻石/金币/装备/角色
- **普通奖励**: 金币/经验/材料（掉落概率）
- **星级奖励**: 1/2/3星分别领取

### 关卡进度 (LevelProgressManager)
- 关卡通关记录
- 最佳分数/时间
- 星级获取追踪
- 章节解锁条件
- 体力系统（消耗/恢复）

### 关卡选择UI (LevelSelectPanel)
- 章节横向切换
- 关卡路径连线
- 进度星星显示
- 详情面板（目标/奖励/记录）
- 扫荡功能（3星通关后）

## 🎨 UI面板系统

### DoodleGraphics - 涂鸦风格绘制工具
使用 Graphics 组件程序化绘制所有UI，无需图片资源：
- 基础形状（圆形/矩形/星形）
- 游戏图标（剑/盾/戒指/元素图标）
- 复合元素（按钮/进度条/角色框）
- 随机抖动效果模拟手绘风格

### MainMenuUI - 主界面
- 玩家信息栏（等级/金币/钻石）
- 主功能按钮（冒险/队伍/角色/背包/召唤）
- 底部导航栏

### InventoryPanel - 背包面板
- 装备分类筛选
- 装备网格列表
- 装备详情展示
- 强化/穿戴操作

### CharacterPanel - 角色面板
- 角色列表滚动
- 角色详细属性
- 装备栏展示
- 技能信息
- 升级/突破操作

### LevelSelectPanel - 关卡选择
- 章节切换
- 关卡地图
- 进度显示
- 战斗入口

### BossRaidPanel - 领主战面板
- Boss列表展示
- 难度选择
- 战斗记录
- 伤害排行榜

## 👹 领主战系统

挑战强大Boss的特殊玩法，支持排行榜和丰厚奖励。

### 领主数据 (BossRaidData)
- **5个领主Boss**:
  - 伊弗利特（炎狱之主）- 火属性
  - 尼德霍格（永冻之龙）- 水属性
  - 托尔（雷霆战神）- 雷属性
  - 哈迪斯（冥界之王）- 暗属性
  - 尤格德拉希尔（创世之龙）- 光属性（世界Boss）
- **难度等级**: 普通/困难/极难/噩梦/地狱
- **阶段系统**: 每个Boss 3-5个战斗阶段

### Boss阶段机制
- HP阈值触发阶段转换
- 攻击/防御/速度倍率变化
- 特殊机制：护盾/回血/反伤/无敌

### Boss技能系统
- **技能类型**: 普攻/重击/范围/增益/减益/召唤/狂暴/必杀
- **预警系统**: 施法时间/预警时间
- **触发条件**: HP阈值/时间/随机

### 领主战管理 (BossRaidManager)
- 每日挑战次数限制
- 战斗状态管理
- 伤害记录和排行榜
- 首杀奖励追踪
- 挑战券系统

### 奖励系统
- **首杀奖励**: 钻石/金币/稀有装备/角色
- **普通奖励**: 金币/材料（掉落概率）
- **排名奖励**: 根据伤害排名发放

### 排行榜
- 按Boss和难度分榜
- 记录伤害/时间/战力
- 实时排名显示
- 玩家排名追踪

## 📋 待实现功能

- [x] 角色选择系统
- [x] 角色升级和培养
- [x] 技能系统（池化设计）
- [x] 装备系统
- [x] 关卡章节系统
- [x] 存档系统
- [x] UI面板（主界面/背包/角色/关卡）
- [x] 领主战系统
- [ ] 多人协作模式
- [ ] 音效和背景音乐
- [ ] 成就系统
- [ ] 商店系统
- [ ] 抽卡动画

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**注意**: 这是一个学习项目，仅供个人学习和研究使用。《时间弹射物语》(World Flipper) 是 Cygames 的注册商标。
