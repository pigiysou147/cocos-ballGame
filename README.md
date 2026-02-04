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

## 📋 待实现功能

- [x] 角色选择系统
- [x] 角色升级和培养
- [ ] 装备系统
- [ ] 多人协作模式
- [ ] 音效和背景音乐
- [x] 存档系统
- [ ] 成就系统
- [ ] 商店系统

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**注意**: 这是一个学习项目，仅供个人学习和研究使用。《时间弹射物语》(World Flipper) 是 Cygames 的注册商标。
