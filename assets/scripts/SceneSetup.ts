import { _decorator, Component, Node, Vec2, Vec3, Prefab, instantiate, UITransform, Graphics, Color, Size, Canvas, Camera, view } from 'cc';
import { Wall, WallType } from './Wall';
import { Flipper, FlipperSide } from './Flipper';
import { DeadZone } from './DeadZone';
import { Bumper } from './Bumper';
import { Enemy, EnemyType } from './Enemy';
import { Character } from './Character';
import { GameManager } from './GameManager';
import { SkillSystem } from './SkillSystem';
import { InputManager } from './InputManager';
import { MobileUI } from './MobileUI';
const { ccclass, property } = _decorator;

/**
 * 场景配置接口
 */
interface SceneConfig {
    width: number;
    height: number;
    wallThickness: number;
    flipperWidth: number;
    flipperGap: number;
}

/**
 * 场景初始化类 - 创建游戏场景的所有元素
 * Scene Setup - Creates all elements of the game scene
 */
@ccclass('SceneSetup')
export class SceneSetup extends Component {
    @property({ tooltip: '场景宽度' })
    public sceneWidth: number = 720;

    @property({ tooltip: '场景高度' })
    public sceneHeight: number = 1280;

    @property({ tooltip: '墙壁厚度' })
    public wallThickness: number = 20;

    @property({ tooltip: '挡板宽度' })
    public flipperWidth: number = 120;

    @property({ tooltip: '挡板间距' })
    public flipperGap: number = 100;

    @property({ tooltip: '是否自动创建场景' })
    public autoSetup: boolean = true;

    @property({ tooltip: '敌人数量' })
    public enemyCount: number = 5;

    @property({ tooltip: '弹射物数量' })
    public bumperCount: number = 3;

    @property({ tooltip: '是否创建移动端UI' })
    public createMobileUI: boolean = true;

    @property({ tooltip: '是否显示触摸区域指示' })
    public showTouchZones: boolean = true;

    private _wallContainer: Node | null = null;
    private _enemyContainer: Node | null = null;
    private _bumperContainer: Node | null = null;
    private _characterNode: Node | null = null;
    private _leftFlipperNode: Node | null = null;
    private _rightFlipperNode: Node | null = null;
    private _inputManagerNode: Node | null = null;
    private _mobileUINode: Node | null = null;

    onLoad() {
        if (this.autoSetup) {
            this.setupScene();
        }
    }

    /**
     * 设置完整场景
     */
    public setupScene(): void {
        console.log('开始创建游戏场景（移动端专用）...');

        // 更新场景尺寸为设备尺寸
        this.updateSceneSizeForMobile();

        // 创建容器节点
        this.createContainers();

        // 创建游戏管理器
        this.createGameManager();

        // 创建技能系统
        this.createSkillSystem();

        // 创建输入管理器（移动端触摸控制）
        this.createInputManager();

        // 创建墙壁边界
        this.createWalls();

        // 创建挡板
        this.createFlippers();

        // 创建死区
        this.createDeadZone();

        // 创建角色
        this.createCharacter();

        // 创建敌人
        this.createEnemies();

        // 创建弹射障碍物
        this.createBumpers();

        // 创建移动端UI
        if (this.createMobileUI) {
            this.createMobileUIPanel();
        }

        // 设置输入管理器的引用
        this.setupInputManagerReferences();

        console.log('游戏场景创建完成！');
    }

    /**
     * 更新场景尺寸以适应移动端
     */
    private updateSceneSizeForMobile(): void {
        const visibleSize = view.getVisibleSize();
        // 保持设计尺寸的比例，但可以根据实际屏幕调整
        console.log(`设备屏幕尺寸: ${visibleSize.width}x${visibleSize.height}`);
    }

    /**
     * 创建容器节点
     */
    private createContainers(): void {
        // 墙壁容器
        this._wallContainer = new Node('Walls');
        this.node.addChild(this._wallContainer);

        // 敌人容器
        this._enemyContainer = new Node('Enemies');
        this.node.addChild(this._enemyContainer);

        // 弹射物容器
        this._bumperContainer = new Node('Bumpers');
        this.node.addChild(this._bumperContainer);
    }

    /**
     * 创建游戏管理器
     */
    private createGameManager(): void {
        const existing = this.node.getComponentInChildren(GameManager);
        if (!existing) {
            const managerNode = new Node('GameManager');
            managerNode.addComponent(GameManager);
            this.node.addChild(managerNode);
        }
    }

    /**
     * 创建技能系统
     */
    private createSkillSystem(): void {
        const existing = this.node.getComponentInChildren(SkillSystem);
        if (!existing) {
            const skillNode = new Node('SkillSystem');
            skillNode.addComponent(SkillSystem);
            this.node.addChild(skillNode);
        }
    }

    /**
     * 创建输入管理器（移动端触摸控制）
     */
    private createInputManager(): void {
        const existing = this.node.getComponentInChildren(InputManager);
        if (!existing) {
            this._inputManagerNode = new Node('InputManager');
            const inputManager = this._inputManagerNode.addComponent(InputManager);
            
            // 配置移动端触摸参数
            inputManager.touchDivider = 0.5; // 屏幕中间分界
            inputManager.flipperZoneHeight = 0.4; // 底部40%为挡板区域
            inputManager.skillButtonRadius = 80; // 技能按钮半径
            inputManager.skillButtonOffsetY = 150; // 技能按钮距底部距离
            inputManager.vibrationEnabled = true; // 启用震动反馈
            
            this.node.addChild(this._inputManagerNode);
        } else {
            this._inputManagerNode = existing.node;
        }
    }

    /**
     * 创建移动端UI面板
     */
    private createMobileUIPanel(): void {
        const existing = this.node.getComponentInChildren(MobileUI);
        if (!existing) {
            this._mobileUINode = new Node('MobileUI');
            
            // 添加UITransform
            const uiTransform = this._mobileUINode.addComponent(UITransform);
            uiTransform.setContentSize(this.sceneWidth, this.sceneHeight);
            
            const mobileUI = this._mobileUINode.addComponent(MobileUI);
            mobileUI.showTouchZones = this.showTouchZones;
            mobileUI.skillButtonSize = 120;
            mobileUI.pauseButtonSize = 60;
            
            this.node.addChild(this._mobileUINode);
        }
    }

    /**
     * 设置输入管理器的引用
     */
    private setupInputManagerReferences(): void {
        const inputManager = InputManager.instance;
        if (inputManager && this._leftFlipperNode && this._rightFlipperNode) {
            inputManager.setFlippers(this._leftFlipperNode, this._rightFlipperNode);
        }
        if (inputManager && this._characterNode) {
            inputManager.setCharacter(this._characterNode);
        }
    }

    /**
     * 创建墙壁边界
     */
    private createWalls(): void {
        if (!this._wallContainer) return;

        const halfWidth = this.sceneWidth / 2;
        const halfHeight = this.sceneHeight / 2;

        // 左墙
        this.createWall(
            'LeftWall',
            new Vec3(-halfWidth + this.wallThickness / 2, 0, 0),
            this.wallThickness,
            this.sceneHeight,
            WallType.NORMAL
        );

        // 右墙
        this.createWall(
            'RightWall',
            new Vec3(halfWidth - this.wallThickness / 2, 0, 0),
            this.wallThickness,
            this.sceneHeight,
            WallType.NORMAL
        );

        // 顶部墙
        this.createWall(
            'TopWall',
            new Vec3(0, halfHeight - this.wallThickness / 2, 0),
            this.sceneWidth,
            this.wallThickness,
            WallType.BOUNCY
        );

        // 左下斜坡墙
        this.createWall(
            'LeftSlopeWall',
            new Vec3(-halfWidth + 80, -halfHeight + 150, 0),
            150,
            this.wallThickness,
            WallType.NORMAL
        );
        // 设置旋转
        const leftSlope = this._wallContainer.getChildByName('LeftSlopeWall');
        if (leftSlope) {
            leftSlope.setRotationFromEuler(0, 0, 30);
        }

        // 右下斜坡墙
        this.createWall(
            'RightSlopeWall',
            new Vec3(halfWidth - 80, -halfHeight + 150, 0),
            150,
            this.wallThickness,
            WallType.NORMAL
        );
        // 设置旋转
        const rightSlope = this._wallContainer.getChildByName('RightSlopeWall');
        if (rightSlope) {
            rightSlope.setRotationFromEuler(0, 0, -30);
        }
    }

    /**
     * 创建单个墙壁
     */
    private createWall(name: string, position: Vec3, width: number, height: number, type: WallType): Node {
        const wallNode = new Node(name);
        wallNode.setPosition(position);

        // 添加Wall组件
        const wall = wallNode.addComponent(Wall);
        wall.wallWidth = width;
        wall.wallHeight = height;
        wall.wallType = type;

        // 添加UITransform用于可视化
        const uiTransform = wallNode.addComponent(UITransform);
        uiTransform.setContentSize(width, height);

        // 添加Graphics组件绘制墙壁
        const graphics = wallNode.addComponent(Graphics);
        graphics.fillColor = new Color(100, 100, 100, 255);
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();

        if (this._wallContainer) {
            this._wallContainer.addChild(wallNode);
        }

        return wallNode;
    }

    /**
     * 创建挡板
     */
    private createFlippers(): void {
        const flipperY = -this.sceneHeight / 2 + 100;
        const flipperOffset = this.flipperGap / 2 + this.flipperWidth / 2;

        // 左挡板
        this._leftFlipperNode = this.createFlipper(
            'LeftFlipper',
            new Vec3(-flipperOffset, flipperY, 0),
            FlipperSide.LEFT
        );

        // 右挡板
        this._rightFlipperNode = this.createFlipper(
            'RightFlipper',
            new Vec3(flipperOffset, flipperY, 0),
            FlipperSide.RIGHT
        );
    }

    /**
     * 创建单个挡板
     */
    private createFlipper(name: string, position: Vec3, side: FlipperSide): Node {
        const flipperNode = new Node(name);
        flipperNode.setPosition(position);

        // 添加Flipper组件
        const flipper = flipperNode.addComponent(Flipper);
        flipper.side = side;

        // 添加UITransform
        const uiTransform = flipperNode.addComponent(UITransform);
        uiTransform.setContentSize(this.flipperWidth, 20);

        // 添加Graphics绘制挡板
        const graphics = flipperNode.addComponent(Graphics);
        graphics.fillColor = new Color(50, 150, 255, 255);
        graphics.roundRect(-this.flipperWidth / 2, -10, this.flipperWidth, 20, 5);
        graphics.fill();

        this.node.addChild(flipperNode);
        return flipperNode;
    }

    /**
     * 创建死区
     */
    private createDeadZone(): void {
        const deadZoneNode = new Node('DeadZone');
        deadZoneNode.setPosition(0, -this.sceneHeight / 2 - 50, 0);

        const deadZone = deadZoneNode.addComponent(DeadZone);
        deadZone.zoneWidth = this.sceneWidth;
        deadZone.zoneHeight = 100;
        deadZone.respawnPosition = new Vec3(0, 200, 0);

        this.node.addChild(deadZoneNode);
    }

    /**
     * 创建角色
     */
    private createCharacter(): void {
        const characterNode = new Node('Character');
        characterNode.setPosition(0, 0, 0);

        // 添加Character组件
        const character = characterNode.addComponent(Character);
        character.characterName = '主角';
        character.maxHP = 100;
        character.attack = 15;

        // 添加UITransform
        const uiTransform = characterNode.addComponent(UITransform);
        uiTransform.setContentSize(60, 60);

        // 添加Graphics绘制角色
        const graphics = characterNode.addComponent(Graphics);
        graphics.fillColor = new Color(255, 200, 50, 255);
        graphics.circle(0, 0, 30);
        graphics.fill();
        
        // 绘制眼睛
        graphics.fillColor = new Color(50, 50, 50, 255);
        graphics.circle(-10, 5, 5);
        graphics.circle(10, 5, 5);
        graphics.fill();

        this.node.addChild(characterNode);
        this._characterNode = characterNode;
    }

    /**
     * 创建敌人
     */
    private createEnemies(): void {
        if (!this._enemyContainer) return;

        const halfWidth = this.sceneWidth / 2 - 100;
        const startY = this.sceneHeight / 4;

        for (let i = 0; i < this.enemyCount; i++) {
            const x = (Math.random() - 0.5) * halfWidth * 2;
            const y = startY + Math.random() * 300;
            
            // 随机敌人类型
            const type = i === this.enemyCount - 1 ? EnemyType.ELITE : EnemyType.NORMAL;
            
            this.createEnemy(
                `Enemy_${i}`,
                new Vec3(x, y, 0),
                type
            );
        }
    }

    /**
     * 创建单个敌人
     */
    private createEnemy(name: string, position: Vec3, type: EnemyType): Node {
        const enemyNode = new Node(name);
        enemyNode.setPosition(position);

        // 添加Enemy组件
        const enemy = enemyNode.addComponent(Enemy);
        enemy.enemyType = type;
        enemy.enemyName = type === EnemyType.ELITE ? '精英怪' : '史莱姆';

        // 根据类型设置大小
        const size = type === EnemyType.ELITE ? 80 : 50;

        // 添加UITransform
        const uiTransform = enemyNode.addComponent(UITransform);
        uiTransform.setContentSize(size, size);

        // 添加Graphics绘制敌人
        const graphics = enemyNode.addComponent(Graphics);
        const color = type === EnemyType.ELITE ? 
            new Color(200, 50, 50, 255) : 
            new Color(50, 200, 50, 255);
        graphics.fillColor = color;
        graphics.circle(0, 0, size / 2);
        graphics.fill();

        // 绘制眼睛
        graphics.fillColor = new Color(255, 255, 255, 255);
        graphics.circle(-size / 6, size / 8, size / 8);
        graphics.circle(size / 6, size / 8, size / 8);
        graphics.fill();

        if (this._enemyContainer) {
            this._enemyContainer.addChild(enemyNode);
        }

        return enemyNode;
    }

    /**
     * 创建弹射障碍物
     */
    private createBumpers(): void {
        if (!this._bumperContainer) return;

        const positions = [
            new Vec3(-150, 100, 0),
            new Vec3(150, 100, 0),
            new Vec3(0, 250, 0),
        ];

        for (let i = 0; i < Math.min(this.bumperCount, positions.length); i++) {
            this.createBumper(`Bumper_${i}`, positions[i]);
        }
    }

    /**
     * 创建单个弹射障碍物
     */
    private createBumper(name: string, position: Vec3): Node {
        const bumperNode = new Node(name);
        bumperNode.setPosition(position);

        // 添加Bumper组件
        const bumper = bumperNode.addComponent(Bumper);
        bumper.colliderRadius = 35;
        bumper.bounceForce = 1000;

        // 添加UITransform
        const uiTransform = bumperNode.addComponent(UITransform);
        uiTransform.setContentSize(70, 70);

        // 添加Graphics绘制弹射物
        const graphics = bumperNode.addComponent(Graphics);
        graphics.fillColor = new Color(255, 150, 0, 255);
        graphics.circle(0, 0, 35);
        graphics.fill();
        
        // 内圈
        graphics.fillColor = new Color(255, 200, 100, 255);
        graphics.circle(0, 0, 25);
        graphics.fill();

        if (this._bumperContainer) {
            this._bumperContainer.addChild(bumperNode);
        }

        return bumperNode;
    }

    /**
     * 获取角色节点
     */
    public getCharacterNode(): Node | null {
        return this._characterNode;
    }
}
