import { _decorator, Component, Node, Color, Vec3, UITransform, tween, Sprite, Label, ScrollView, Prefab, instantiate, Graphics, UIOpacity, Button, sys } from 'cc';
import { DoodleGraphics } from './DoodleGraphics';
import { LevelDatabase, LevelConfig, ChapterConfig, LevelType, LevelDifficulty } from './LevelData';
import { LevelProgressManager, LevelResult } from './LevelProgressManager';
const { ccclass, property } = _decorator;

/**
 * 关卡选择面板
 * Level Select Panel - UI for selecting chapters and levels
 */
@ccclass('LevelSelectPanel')
export class LevelSelectPanel extends Component {
    // UI节点
    private _topBar: Node | null = null;
    private _chapterList: Node | null = null;
    private _levelList: Node | null = null;
    private _levelDetail: Node | null = null;
    private _bottomBar: Node | null = null;

    // 状态
    private _selectedChapterId: string = 'chapter_1';
    private _selectedLevelId: string = '';
    private _chapterNodes: Map<string, Node> = new Map();
    private _levelNodes: Map<string, Node> = new Map();

    onLoad() {
        this.setupUI();
    }

    start() {
        this.refreshPanel();
    }

    private setupUI(): void {
        const uiTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        uiTransform.setContentSize(720, 1280);
        
        // 背景
        this.createBackground();

        // 顶部栏
        this.createTopBar();

        // 章节选择
        this.createChapterList();

        // 关卡列表
        this.createLevelList();

        // 关卡详情
        this.createLevelDetail();

        // 底部栏
        this.createBottomBar();
    }

    private createBackground(): void {
        const bg = new Node('Background');
        bg.parent = this.node;
        bg.setPosition(0, 0);

        const graphics = bg.addComponent(Graphics);
        const uiTransform = bg.addComponent(UITransform);
        uiTransform.setContentSize(720, 1280);

        // 渐变背景
        graphics.fillColor = new Color(45, 55, 72, 255);
        graphics.fillRect(-360, -640, 720, 1280);

        // 装饰元素 - 路径
        graphics.strokeColor = new Color(100, 120, 140, 80);
        graphics.lineWidth = 4;
        
        for (let i = 0; i < 5; i++) {
            graphics.moveTo(-300 + i * 150, -640);
            graphics.bezierCurveTo(
                -300 + i * 150 + 50, -300,
                -300 + i * 150 - 50, 300,
                -300 + i * 150, 640
            );
        }
        graphics.stroke();

        // 星星装饰
        graphics.fillColor = new Color(255, 255, 150, 40);
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 700;
            const y = (Math.random() - 0.5) * 1200;
            DoodleGraphics.drawStar(graphics, x, y, 3 + Math.random() * 5, 5);
        }
    }

    private createTopBar(): void {
        this._topBar = new Node('TopBar');
        this._topBar.parent = this.node;
        this._topBar.setPosition(0, 580);

        const graphics = this._topBar.addComponent(Graphics);
        const uiTransform = this._topBar.addComponent(UITransform);
        uiTransform.setContentSize(720, 100);

        // 背景
        graphics.fillColor = new Color(30, 40, 55, 230);
        DoodleGraphics.drawRoundedRect(graphics, -360, -50, 720, 100, 0);

        // 返回按钮
        const backBtn = this.createIconButton('Back', -320, 0, 'back');
        backBtn.parent = this._topBar;

        // 标题
        const title = this.createLabel('选择关卡', 0, 0, 32, Color.WHITE);
        title.parent = this._topBar;

        // 体力显示
        const staminaNode = new Node('Stamina');
        staminaNode.parent = this._topBar;
        staminaNode.setPosition(250, 0);

        const staminaGraphics = staminaNode.addComponent(Graphics);
        staminaNode.addComponent(UITransform).setContentSize(120, 40);

        // 体力图标
        graphics.fillColor = new Color(100, 200, 100, 255);
        DoodleGraphics.drawCircle(staminaGraphics, -40, 0, 12);
        staminaGraphics.fillColor = new Color(50, 150, 50, 255);
        DoodleGraphics.drawCircle(staminaGraphics, -40, 0, 6);

        // 体力文字
        const staminaLabel = this.createLabel('100/100', 20, 0, 20, new Color(150, 255, 150, 255));
        staminaLabel.parent = staminaNode;
        staminaLabel.name = 'StaminaValue';
    }

    private createChapterList(): void {
        this._chapterList = new Node('ChapterList');
        this._chapterList.parent = this.node;
        this._chapterList.setPosition(0, 450);

        const uiTransform = this._chapterList.addComponent(UITransform);
        uiTransform.setContentSize(700, 120);

        // 章节容器
        const content = new Node('Content');
        content.parent = this._chapterList;
        content.setPosition(-300, 0);

        const chapters = LevelDatabase.instance.getAllChapters();
        
        chapters.forEach((chapter, index) => {
            const chapterNode = this.createChapterButton(chapter, index * 140, 0);
            chapterNode.parent = content;
            this._chapterNodes.set(chapter.id, chapterNode);
        });
    }

    private createChapterButton(chapter: ChapterConfig, x: number, y: number): Node {
        const node = new Node(`Chapter_${chapter.id}`);
        node.setPosition(x, y);

        const graphics = node.addComponent(Graphics);
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(130, 100);

        const progress = LevelProgressManager.instance?.getChapterProgress(chapter.id);
        const isUnlocked = progress?.unlocked ?? false;
        const isSelected = chapter.id === this._selectedChapterId;

        // 背景
        if (isSelected) {
            graphics.fillColor = new Color(80, 120, 180, 255);
        } else if (isUnlocked) {
            graphics.fillColor = new Color(60, 70, 90, 255);
        } else {
            graphics.fillColor = new Color(40, 45, 55, 255);
        }
        DoodleGraphics.drawRoundedRect(graphics, -60, -45, 120, 90, 12);

        // 边框
        graphics.strokeColor = isSelected ? new Color(150, 200, 255, 255) : new Color(80, 90, 110, 255);
        graphics.lineWidth = isSelected ? 3 : 2;
        DoodleGraphics.drawRoundedRect(graphics, -60, -45, 120, 90, 12);
        graphics.stroke();

        // 章节图标
        if (isUnlocked) {
            this.drawChapterIcon(graphics, 0, 10, chapter.orderIndex);
        } else {
            // 锁图标
            graphics.fillColor = new Color(100, 100, 100, 255);
            DoodleGraphics.drawRoundedRect(graphics, -15, -5, 30, 30, 5);
            graphics.fillColor = new Color(80, 80, 80, 255);
            DoodleGraphics.drawCircle(graphics, 0, 25, 12);
        }

        // 章节编号
        const numLabel = this.createLabel(chapter.orderIndex.toString(), 0, -25, 18, 
            isUnlocked ? Color.WHITE : new Color(100, 100, 100, 255));
        numLabel.parent = node;

        // 星星进度
        if (isUnlocked && progress) {
            const maxStars = chapter.levelIds.length * 3;
            const starLabel = this.createLabel(`${progress.totalStars}/${maxStars}`, 0, -40, 12, 
                new Color(255, 220, 100, 255));
            starLabel.parent = node;
        }

        // 点击事件
        if (isUnlocked) {
            node.on(Node.EventType.TOUCH_END, () => {
                this.selectChapter(chapter.id);
            });
        }

        return node;
    }

    private drawChapterIcon(graphics: Graphics, x: number, y: number, chapterIndex: number): void {
        const colors = [
            new Color(100, 200, 100, 255),  // 绿色 - 草原
            new Color(100, 80, 120, 255),   // 紫色 - 森林
            new Color(255, 100, 50, 255),   // 红色 - 火山
            new Color(100, 180, 255, 255),  // 蓝色 - 雪原
            new Color(255, 255, 100, 255)   // 黄色 - 峡谷
        ];

        graphics.fillColor = colors[chapterIndex - 1] || colors[0];
        
        switch (chapterIndex) {
            case 1: // 草原 - 树
                DoodleGraphics.drawCircle(graphics, x, y + 10, 18);
                graphics.fillColor = new Color(139, 90, 43, 255);
                graphics.fillRect(x - 4, y - 15, 8, 15);
                break;
            case 2: // 森林 - 蘑菇
                DoodleGraphics.drawCircle(graphics, x, y + 10, 15);
                graphics.fillColor = new Color(200, 200, 180, 255);
                graphics.fillRect(x - 5, y - 10, 10, 15);
                break;
            case 3: // 火山 - 火焰
                DoodleGraphics.drawFlame(graphics, x, y, 20);
                break;
            case 4: // 雪原 - 雪花
                DoodleGraphics.drawWater(graphics, x, y, 20);
                break;
            case 5: // 峡谷 - 闪电
                DoodleGraphics.drawLightning(graphics, x, y, 20);
                break;
        }
    }

    private createLevelList(): void {
        this._levelList = new Node('LevelList');
        this._levelList.parent = this.node;
        this._levelList.setPosition(0, 100);

        const uiTransform = this._levelList.addComponent(UITransform);
        uiTransform.setContentSize(700, 600);

        // 关卡网格容器
        const content = new Node('Content');
        content.parent = this._levelList;
    }

    private refreshLevelList(): void {
        if (!this._levelList) return;

        const content = this._levelList.getChildByName('Content');
        if (!content) return;

        // 清除现有关卡
        content.removeAllChildren();
        this._levelNodes.clear();

        // 获取当前章节的关卡
        const levels = LevelDatabase.instance.getChapterLevels(this._selectedChapterId);
        const chapter = LevelDatabase.instance.getChapter(this._selectedChapterId);

        // 绘制关卡路径
        this.drawLevelPath(content, levels.length);

        // 创建关卡节点
        levels.forEach((level, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = col === 0 ? -120 : 120;
            const y = 200 - row * 150;

            // 奇数行交错
            const offset = row % 2 === 1 ? 60 : 0;

            const levelNode = this.createLevelNode(level, x + offset, y, index);
            levelNode.parent = content;
            this._levelNodes.set(level.id, levelNode);
        });
    }

    private drawLevelPath(parent: Node, levelCount: number): void {
        const pathNode = new Node('Path');
        pathNode.parent = parent;
        pathNode.setSiblingIndex(0);

        const graphics = pathNode.addComponent(Graphics);
        graphics.strokeColor = new Color(100, 130, 160, 150);
        graphics.lineWidth = 6;

        // 绘制连接路径
        let prevX = 0;
        let prevY = 280;

        for (let i = 0; i < levelCount; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = col === 0 ? -120 : 120;
            const y = 200 - row * 150;
            const offset = row % 2 === 1 ? 60 : 0;

            const currentX = x + offset;
            const currentY = y;

            if (i > 0) {
                graphics.moveTo(prevX, prevY);
                graphics.bezierCurveTo(
                    prevX, prevY - 50,
                    currentX, currentY + 50,
                    currentX, currentY
                );
            }

            prevX = currentX;
            prevY = currentY;
        }

        graphics.stroke();
    }

    private createLevelNode(level: LevelConfig, x: number, y: number, index: number): Node {
        const node = new Node(`Level_${level.id}`);
        node.setPosition(x, y);

        const graphics = node.addComponent(Graphics);
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(140, 140);

        const progress = LevelProgressManager.instance?.getLevelProgress(level.id);
        const canEnter = LevelProgressManager.instance?.canEnterLevel(level.id);
        const isUnlocked = canEnter?.canEnter ?? false;
        const isCleared = progress?.cleared ?? false;
        const stars = progress?.stars ?? 0;
        const isSelected = level.id === this._selectedLevelId;

        // 关卡类型颜色
        let typeColor: Color;
        switch (level.type) {
            case LevelType.BOSS:
                typeColor = new Color(200, 50, 50, 255);
                break;
            case LevelType.ELITE:
                typeColor = new Color(150, 50, 200, 255);
                break;
            default:
                typeColor = new Color(80, 120, 180, 255);
        }

        // 外圈
        if (isSelected) {
            graphics.strokeColor = new Color(255, 220, 100, 255);
            graphics.lineWidth = 4;
            DoodleGraphics.drawCircle(graphics, 0, 15, 55);
            graphics.stroke();
        }

        // 主圆圈
        if (isCleared) {
            graphics.fillColor = typeColor;
        } else if (isUnlocked) {
            graphics.fillColor = new Color(typeColor.r * 0.6, typeColor.g * 0.6, typeColor.b * 0.6, 255);
        } else {
            graphics.fillColor = new Color(60, 60, 70, 255);
        }
        DoodleGraphics.drawCircle(graphics, 0, 15, 50);

        // 边框
        graphics.strokeColor = isUnlocked ? new Color(150, 160, 180, 255) : new Color(80, 80, 90, 255);
        graphics.lineWidth = 3;
        DoodleGraphics.drawCircle(graphics, 0, 15, 50);
        graphics.stroke();

        // 关卡图标
        if (!isUnlocked) {
            // 锁
            graphics.fillColor = new Color(100, 100, 100, 255);
            DoodleGraphics.drawRoundedRect(graphics, -15, 5, 30, 25, 5);
            graphics.fillColor = new Color(80, 80, 80, 255);
            DoodleGraphics.drawCircle(graphics, 0, 35, 10);
        } else {
            // 关卡编号或Boss图标
            if (level.type === LevelType.BOSS) {
                graphics.fillColor = new Color(255, 100, 100, 255);
                DoodleGraphics.drawStar(graphics, 0, 20, 20, 5);
            } else {
                const numLabel = this.createLabel((index + 1).toString(), 0, 15, 28, Color.WHITE);
                numLabel.parent = node;
            }
        }

        // 关卡名称
        const nameLabel = this.createLabel(level.name, 0, -35, 14, 
            isUnlocked ? Color.WHITE : new Color(120, 120, 120, 255));
        nameLabel.parent = node;

        // 星星显示
        if (isCleared) {
            for (let i = 0; i < 3; i++) {
                const starX = (i - 1) * 20;
                if (i < stars) {
                    graphics.fillColor = new Color(255, 220, 50, 255);
                } else {
                    graphics.fillColor = new Color(80, 80, 80, 255);
                }
                DoodleGraphics.drawStar(graphics, starX, -55, 8, 5);
            }
        }

        // 难度标签
        if (isUnlocked) {
            const diffColor = new Color().fromHEX(LevelDatabase.instance.getDifficultyColor(level.difficulty));
            graphics.fillColor = diffColor;
            DoodleGraphics.drawRoundedRect(graphics, -25, 55, 50, 16, 4);
            
            const diffLabel = this.createLabel(
                LevelDatabase.instance.getDifficultyName(level.difficulty), 
                0, 62, 10, Color.WHITE
            );
            diffLabel.parent = node;
        }

        // 点击事件
        if (isUnlocked) {
            node.on(Node.EventType.TOUCH_END, () => {
                this.selectLevel(level.id);
            });
        }

        return node;
    }

    private createLevelDetail(): void {
        this._levelDetail = new Node('LevelDetail');
        this._levelDetail.parent = this.node;
        this._levelDetail.setPosition(0, -350);

        const uiTransform = this._levelDetail.addComponent(UITransform);
        uiTransform.setContentSize(680, 280);

        const graphics = this._levelDetail.addComponent(Graphics);

        // 背景面板
        graphics.fillColor = new Color(40, 50, 65, 240);
        DoodleGraphics.drawRoundedRect(graphics, -340, -140, 680, 280, 16);

        // 边框
        graphics.strokeColor = new Color(100, 120, 150, 255);
        graphics.lineWidth = 2;
        DoodleGraphics.drawRoundedRect(graphics, -340, -140, 680, 280, 16);
        graphics.stroke();

        // 初始提示
        const hintLabel = this.createLabel('选择一个关卡查看详情', 0, 0, 20, new Color(150, 150, 150, 255));
        hintLabel.parent = this._levelDetail;
        hintLabel.name = 'HintLabel';
    }

    private refreshLevelDetail(): void {
        if (!this._levelDetail || !this._selectedLevelId) return;

        // 清除现有内容
        this._levelDetail.removeAllChildren();

        const level = LevelDatabase.instance.getLevel(this._selectedLevelId);
        if (!level) return;

        const progress = LevelProgressManager.instance?.getLevelProgress(this._selectedLevelId);

        // 重新绘制背景
        const graphics = this._levelDetail.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            graphics.fillColor = new Color(40, 50, 65, 240);
            DoodleGraphics.drawRoundedRect(graphics, -340, -140, 680, 280, 16);
            graphics.strokeColor = new Color(100, 120, 150, 255);
            graphics.lineWidth = 2;
            DoodleGraphics.drawRoundedRect(graphics, -340, -140, 680, 280, 16);
            graphics.stroke();
        }

        // 左侧：关卡信息
        const leftX = -220;

        // 关卡名称
        const nameLabel = this.createLabel(level.name, leftX, 100, 24, Color.WHITE);
        nameLabel.parent = this._levelDetail;

        // 关卡描述
        const descLabel = this.createLabel(level.description, leftX, 70, 14, new Color(180, 180, 180, 255));
        descLabel.parent = this._levelDetail;

        // 类型和难度
        const typeNode = new Node('TypeInfo');
        typeNode.parent = this._levelDetail;
        typeNode.setPosition(leftX, 40);

        const typeGraphics = typeNode.addComponent(Graphics);
        
        // 类型标签
        let typeColor: Color;
        switch (level.type) {
            case LevelType.BOSS: typeColor = new Color(200, 50, 50, 255); break;
            case LevelType.ELITE: typeColor = new Color(150, 50, 200, 255); break;
            default: typeColor = new Color(80, 120, 180, 255);
        }
        typeGraphics.fillColor = typeColor;
        DoodleGraphics.drawRoundedRect(typeGraphics, -50, -10, 40, 20, 4);

        const typeLabel = this.createLabel(LevelDatabase.instance.getLevelTypeName(level.type), -30, 0, 12, Color.WHITE);
        typeLabel.parent = typeNode;

        // 难度标签
        const diffColor = new Color().fromHEX(LevelDatabase.instance.getDifficultyColor(level.difficulty));
        typeGraphics.fillColor = diffColor;
        DoodleGraphics.drawRoundedRect(typeGraphics, 10, -10, 50, 20, 4);

        const diffLabel = this.createLabel(LevelDatabase.instance.getDifficultyName(level.difficulty), 35, 0, 12, Color.WHITE);
        diffLabel.parent = typeNode;

        // 推荐战力
        const powerLabel = this.createLabel(`推荐战力: ${level.recommendedPower}`, leftX, 10, 16, new Color(255, 180, 100, 255));
        powerLabel.parent = this._levelDetail;

        // 体力消耗
        const staminaLabel = this.createLabel(`体力消耗: ${level.staminaCost}`, leftX, -15, 14, new Color(100, 200, 100, 255));
        staminaLabel.parent = this._levelDetail;

        // 右侧：目标和奖励
        const rightX = 100;

        // 目标标题
        const objTitle = this.createLabel('关卡目标', rightX, 100, 18, new Color(255, 220, 100, 255));
        objTitle.parent = this._levelDetail;

        // 目标列表
        level.objectives.forEach((obj, index) => {
            const y = 70 - index * 25;
            
            // 星星
            const starNode = new Node(`Star_${index}`);
            starNode.parent = this._levelDetail;
            starNode.setPosition(rightX - 100, y);
            
            const starGraphics = starNode.addComponent(Graphics);
            const isCompleted = progress && progress.stars > index;
            starGraphics.fillColor = isCompleted ? new Color(255, 220, 50, 255) : new Color(80, 80, 80, 255);
            DoodleGraphics.drawStar(starGraphics, 0, 0, 10, 5);

            // 目标描述
            const objLabel = this.createLabel(obj.description, rightX, y, 14, 
                isCompleted ? new Color(150, 255, 150, 255) : Color.WHITE);
            objLabel.parent = this._levelDetail;
        });

        // 奖励预览
        const rewardTitle = this.createLabel('首通奖励', rightX, -30, 16, new Color(200, 150, 255, 255));
        rewardTitle.parent = this._levelDetail;

        // 奖励图标
        const rewardsNode = new Node('Rewards');
        rewardsNode.parent = this._levelDetail;
        rewardsNode.setPosition(rightX, -70);

        const rewardsGraphics = rewardsNode.addComponent(Graphics);
        
        level.firstClearRewards.slice(0, 4).forEach((reward, index) => {
            const rx = (index - 1.5) * 50;
            
            // 奖励框
            rewardsGraphics.fillColor = new Color(60, 70, 85, 255);
            DoodleGraphics.drawRoundedRect(rewardsGraphics, rx - 20, -20, 40, 40, 6);

            // 奖励图标（根据类型）
            this.drawRewardIcon(rewardsGraphics, rx, 0, reward.type);

            // 数量
            const amountLabel = this.createLabel(`x${reward.amount}`, rx, -30, 10, Color.WHITE);
            amountLabel.parent = rewardsNode;
        });

        // 已领取标记
        if (progress?.firstClearClaimed) {
            const claimedLabel = this.createLabel('(已领取)', rightX + 100, -30, 12, new Color(150, 150, 150, 255));
            claimedLabel.parent = this._levelDetail;
        }

        // 开始按钮
        const startBtn = this.createButton('开始战斗', 0, -110, 200, 50, new Color(80, 180, 80, 255));
        startBtn.parent = this._levelDetail;
        startBtn.on(Node.EventType.TOUCH_END, () => {
            this.startLevel();
        });

        // 最佳记录
        if (progress?.cleared) {
            const recordLabel = this.createLabel(
                `最佳: ${progress.bestScore}分 | ${progress.bestTime}秒`, 
                0, -140, 12, new Color(180, 180, 180, 255)
            );
            recordLabel.parent = this._levelDetail;
        }
    }

    private drawRewardIcon(graphics: Graphics, x: number, y: number, type: string): void {
        switch (type) {
            case 'gold':
                graphics.fillColor = new Color(255, 215, 0, 255);
                DoodleGraphics.drawCircle(graphics, x, y, 12);
                break;
            case 'diamond':
                graphics.fillColor = new Color(100, 200, 255, 255);
                DoodleGraphics.drawStar(graphics, x, y, 12, 4);
                break;
            case 'exp':
                graphics.fillColor = new Color(100, 255, 100, 255);
                DoodleGraphics.drawStar(graphics, x, y, 12, 6);
                break;
            case 'equipment':
                graphics.fillColor = new Color(200, 150, 100, 255);
                DoodleGraphics.drawSword(graphics, x, y, 20);
                break;
            case 'character':
                graphics.fillColor = new Color(255, 150, 200, 255);
                DoodleGraphics.drawCircle(graphics, x, y, 12);
                break;
            default:
                graphics.fillColor = new Color(150, 150, 150, 255);
                DoodleGraphics.drawCircle(graphics, x, y, 10);
        }
    }

    private createBottomBar(): void {
        this._bottomBar = new Node('BottomBar');
        this._bottomBar.parent = this.node;
        this._bottomBar.setPosition(0, -580);

        const graphics = this._bottomBar.addComponent(Graphics);
        const uiTransform = this._bottomBar.addComponent(UITransform);
        uiTransform.setContentSize(720, 100);

        // 背景
        graphics.fillColor = new Color(25, 30, 40, 240);
        DoodleGraphics.drawRoundedRect(graphics, -360, -50, 720, 100, 0);

        // 总星星数
        const totalStars = LevelProgressManager.instance?.getTotalStars() ?? 0;
        
        const starsNode = new Node('TotalStars');
        starsNode.parent = this._bottomBar;
        starsNode.setPosition(-200, 0);

        const starsGraphics = starsNode.addComponent(Graphics);
        starsGraphics.fillColor = new Color(255, 220, 50, 255);
        DoodleGraphics.drawStar(starsGraphics, -30, 0, 15, 5);

        const starsLabel = this.createLabel(`${totalStars}`, 10, 0, 24, new Color(255, 220, 100, 255));
        starsLabel.parent = starsNode;

        // 通关数
        const cleared = LevelProgressManager.instance?.getTotalCleared() ?? 0;
        const clearedLabel = this.createLabel(`已通关: ${cleared}关`, 100, 0, 18, new Color(180, 180, 180, 255));
        clearedLabel.parent = this._bottomBar;

        // 扫荡按钮
        const sweepBtn = this.createButton('扫荡', 280, 0, 100, 40, new Color(150, 100, 200, 255));
        sweepBtn.parent = this._bottomBar;
        sweepBtn.on(Node.EventType.TOUCH_END, () => {
            this.sweepLevel();
        });
    }

    // ==================== 交互方法 ====================

    public selectChapter(chapterId: string): void {
        if (this._selectedChapterId === chapterId) return;

        this._selectedChapterId = chapterId;
        this._selectedLevelId = '';

        // 刷新章节按钮状态
        this.refreshChapterButtons();
        
        // 刷新关卡列表
        this.refreshLevelList();

        // 清空关卡详情
        this.refreshLevelDetail();
    }

    public selectLevel(levelId: string): void {
        this._selectedLevelId = levelId;

        // 刷新关卡节点状态
        this.refreshLevelNodes();

        // 刷新详情面板
        this.refreshLevelDetail();
    }

    public startLevel(): void {
        if (!this._selectedLevelId) {
            console.log('请先选择关卡');
            return;
        }

        const canStart = LevelProgressManager.instance?.startLevel(this._selectedLevelId);
        if (canStart) {
            console.log(`开始关卡: ${this._selectedLevelId}`);
            // 这里应该跳转到战斗场景
            // director.loadScene('BattleScene');
        }
    }

    public sweepLevel(): void {
        if (!this._selectedLevelId) {
            console.log('请先选择关卡');
            return;
        }

        const progress = LevelProgressManager.instance?.getLevelProgress(this._selectedLevelId);
        if (!progress?.cleared || progress.stars < 3) {
            console.log('需要3星通关才能扫荡');
            return;
        }

        console.log(`扫荡关卡: ${this._selectedLevelId}`);
        // 扫荡逻辑...
    }

    public refreshPanel(): void {
        this.refreshChapterButtons();
        this.refreshLevelList();
        this.updateStaminaDisplay();
    }

    private refreshChapterButtons(): void {
        this._chapterNodes.forEach((node, chapterId) => {
            const chapter = LevelDatabase.instance.getChapter(chapterId);
            if (!chapter) return;

            // 重新创建按钮
            const parent = node.parent;
            const pos = node.position.clone();
            node.destroy();

            const newNode = this.createChapterButton(chapter, pos.x, pos.y);
            if (parent) newNode.parent = parent;
            this._chapterNodes.set(chapterId, newNode);
        });
    }

    private refreshLevelNodes(): void {
        this._levelNodes.forEach((node, levelId) => {
            const graphics = node.getComponent(Graphics);
            if (!graphics) return;

            const isSelected = levelId === this._selectedLevelId;
            
            // 更新选中效果
            graphics.clear();
            
            const level = LevelDatabase.instance.getLevel(levelId);
            const progress = LevelProgressManager.instance?.getLevelProgress(levelId);
            const canEnter = LevelProgressManager.instance?.canEnterLevel(levelId);
            
            if (level) {
                // 这里简化处理，实际应该完全重绘
                if (isSelected) {
                    graphics.strokeColor = new Color(255, 220, 100, 255);
                    graphics.lineWidth = 4;
                    DoodleGraphics.drawCircle(graphics, 0, 15, 55);
                    graphics.stroke();
                }
            }
        });
    }

    private updateStaminaDisplay(): void {
        const staminaNode = this._topBar?.getChildByName('Stamina');
        const staminaLabel = staminaNode?.getChildByName('StaminaValue')?.getComponent(Label);
        
        if (staminaLabel) {
            const current = LevelProgressManager.instance?.stamina ?? 100;
            const max = LevelProgressManager.instance?.maxStamina ?? 100;
            staminaLabel.string = `${current}/${max}`;
        }
    }

    // ==================== UI工具方法 ====================

    private createLabel(text: string, x: number, y: number, size: number, color: Color): Node {
        const node = new Node('Label');
        node.setPosition(x, y);

        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;

        const uiTransform = node.getComponent(UITransform) || node.addComponent(UITransform);
        uiTransform.setContentSize(200, size + 10);

        return node;
    }

    private createButton(text: string, x: number, y: number, width: number, height: number, bgColor: Color): Node {
        const node = new Node('Button');
        node.setPosition(x, y);

        const graphics = node.addComponent(Graphics);
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(width, height);

        // 背景
        graphics.fillColor = bgColor;
        DoodleGraphics.drawRoundedRect(graphics, -width/2, -height/2, width, height, 10);

        // 边框
        graphics.strokeColor = new Color(255, 255, 255, 100);
        graphics.lineWidth = 2;
        DoodleGraphics.drawRoundedRect(graphics, -width/2, -height/2, width, height, 10);
        graphics.stroke();

        // 文字
        const label = this.createLabel(text, 0, 0, 18, Color.WHITE);
        label.parent = node;

        return node;
    }

    private createIconButton(name: string, x: number, y: number, icon: string): Node {
        const node = new Node(name);
        node.setPosition(x, y);

        const graphics = node.addComponent(Graphics);
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(50, 50);

        // 背景
        graphics.fillColor = new Color(60, 70, 85, 255);
        DoodleGraphics.drawCircle(graphics, 0, 0, 22);

        // 图标
        graphics.strokeColor = Color.WHITE;
        graphics.lineWidth = 2;

        if (icon === 'back') {
            graphics.moveTo(5, 0);
            graphics.lineTo(-8, 0);
            graphics.moveTo(-8, 0);
            graphics.lineTo(-2, -6);
            graphics.moveTo(-8, 0);
            graphics.lineTo(-2, 6);
            graphics.stroke();
        }

        node.on(Node.EventType.TOUCH_END, () => {
            this.onBackClicked();
        });

        return node;
    }

    private onBackClicked(): void {
        console.log('返回主界面');
        this.node.active = false;
        // 或者 director.loadScene('MainMenu');
    }
}
