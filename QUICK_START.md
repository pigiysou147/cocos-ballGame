# 快速启动指南

## 环境要求

- **Cocos Creator 3.8.0+** (推荐最新版本)
- **Node.js 14+**

## 导入步骤

### 1. 在 Cocos Creator 中打开项目

1. 打开 **Cocos Dashboard**
2. 点击 **添加** 或 **Import**
3. 选择此项目文件夹
4. 等待 Cocos Creator 自动生成 `.meta` 文件

### 2. 创建游戏场景

1. 在 **Assets** 面板右键 → **Create** → **Scene**
2. 命名为 `GameScene`
3. 双击打开场景

### 3. 设置场景 (自动方式)

在场景中添加一个空节点并挂载 `SceneSetup` 组件，它会自动创建所有游戏元素：

1. 在 **Hierarchy** 面板右键 → **Create Empty Node**
2. 命名为 `GameSetup`
3. 在 **Inspector** 面板点击 **Add Component**
4. 搜索并添加 `SceneSetup`
5. 运行游戏！

### 4. 设置场景 (手动方式)

如果需要更多控制，可以手动设置：

#### 4.1 创建 Canvas
```
Hierarchy → 右键 → Create → UI → Canvas
```

#### 4.2 添加游戏管理器
```
Canvas 下创建空节点 "GameManager"
添加组件: GameManager, InputManager, LevelManager
```

#### 4.3 添加伤害系统
```
Canvas 下创建空节点 "DamageSystem"
添加组件: DamageSystem
```

#### 4.4 添加队伍战斗
```
Canvas 下创建空节点 "TeamBattle"
添加组件: TeamBattle
```

#### 4.5 创建角色和挡板
SceneSetup 组件会自动创建这些，或参考 SceneSetup.ts 手动创建。

## 物理设置

确保项目物理设置正确：

1. 打开 **Project Settings** → **Physics 2D**
2. 设置 **Gravity Y** = `-500`
3. 启用 **Enable Physics**

## 场景层级结构示例

```
Canvas
├── GameManager          [GameManager, InputManager, LevelManager]
├── DamageSystem         [DamageSystem]
├── TeamBattle           [TeamBattle]
├── Walls
│   ├── LeftWall         [Wall]
│   ├── RightWall        [Wall]
│   └── TopWall          [Wall]
├── Flippers
│   ├── LeftFlipper      [Flipper]
│   └── RightFlipper     [Flipper]
├── DeadZone             [DeadZone]
├── Enemies              [容器节点]
└── UI
    └── GameUI           [GameUI]
```

## UI 面板使用

各 UI 面板可以单独创建和测试：

```typescript
// 主界面
const mainMenu = new Node('MainMenu');
mainMenu.addComponent(MainMenuUI);

// 角色面板
const charPanel = new Node('CharacterPanel');
charPanel.addComponent(CharacterPanel);

// 背包面板
const invPanel = new Node('InventoryPanel');
invPanel.addComponent(InventoryPanel);

// 关卡选择
const levelSelect = new Node('LevelSelect');
levelSelect.addComponent(LevelSelectPanel);

// 领主战
const bossRaid = new Node('BossRaid');
bossRaid.addComponent(BossRaidPanel);
```

## 测试运行

1. 点击编辑器顶部的 **▶ 播放** 按钮
2. 使用 **A/D** 或 **←/→** 控制挡板
3. 使用 **Space** 或 **J** 释放技能

## 常见问题

### Q: 打开项目报错？
A: 确保使用 Cocos Creator 3.8.0 或更高版本。

### Q: 物理不工作？
A: 检查 Project Settings → Physics 2D 设置。

### Q: 看不到角色？
A: 确保场景有 Camera 组件，且角色在相机视野内。

### Q: 脚本找不到？
A: 等待 Cocos Creator 完成资源导入（查看底部进度条）。

## 下一步

- 替换程序化绘制为真实美术资源
- 添加音效和背景音乐
- 完善游戏流程
