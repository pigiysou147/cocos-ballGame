import { _decorator, Component, Node, Label, Button, Graphics, Color, UITransform, Vec3, tween, director } from 'cc';
import { DoodleGraphics } from './DoodleGraphics';
import { CharacterManager } from './CharacterManager';
import { EquipmentManager } from './EquipmentManager';
const { ccclass, property } = _decorator;

/**
 * 主界面/首页
 * Main Menu UI - Game's home screen
 */
@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    @property({ type: Node, tooltip: '角色面板' })
    public characterPanel: Node | null = null;

    @property({ type: Node, tooltip: '背包面板' })
    public inventoryPanel: Node | null = null;

    @property({ type: Node, tooltip: '编队面板' })
    public teamPanel: Node | null = null;

    @property({ type: Node, tooltip: '商店面板' })
    public shopPanel: Node | null = null;

    @property({ type: Node, tooltip: '抽卡面板' })
    public gachaPanel: Node | null = null;

    @property({ type: Label, tooltip: '玩家名称' })
    public playerNameLabel: Label | null = null;

    @property({ type: Label, tooltip: '玩家等级' })
    public playerLevelLabel: Label | null = null;

    @property({ type: Label, tooltip: '金币数量' })
    public goldLabel: Label | null = null;

    @property({ type: Label, tooltip: '钻石数量' })
    public diamondLabel: Label | null = null;

    // 玩家数据
    private _playerName: string = '冒险者';
    private _playerLevel: number = 1;
    private _diamond: number = 1000;

    // 按钮节点
    private _buttons: Map<string, Node> = new Map();

    onLoad() {
        this.createMainMenu();
    }

    start() {
        this.updateResourceDisplay();
    }

    /**
     * 创建主界面
     */
    private createMainMenu(): void {
        // 创建背景
        this.createBackground();

        // 创建顶部信息栏
        this.createTopBar();

        // 创建游戏Logo/标题
        this.createTitle();

        // 创建主按钮区域
        this.createMainButtons();

        // 创建底部导航栏
        this.createBottomNav();
    }

    /**
     * 创建背景
     */
    private createBackground(): void {
        const bg = new Node('Background');
        const transform = bg.addComponent(UITransform);
        transform.setContentSize(720, 1280);

        const graphics = bg.addComponent(Graphics);
        
        // 渐变背景效果（用多个矩形模拟）
        const height = 1280;
        const segments = 20;
        const segHeight = height / segments;

        for (let i = 0; i < segments; i++) {
            const ratio = i / segments;
            const r = Math.floor(30 + ratio * 20);
            const g = Math.floor(40 + ratio * 30);
            const b = Math.floor(60 + ratio * 40);
            
            graphics.fillColor = new Color(r, g, b);
            graphics.rect(-360, -640 + i * segHeight, 720, segHeight + 1);
            graphics.fill();
        }

        // 添加一些装饰性涂鸦圆点
        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 600;
            const y = (Math.random() - 0.5) * 1100;
            const size = 5 + Math.random() * 15;
            const alpha = 20 + Math.random() * 30;
            
            graphics.fillColor = new Color(255, 255, 255, alpha);
            graphics.circle(x, y, size);
            graphics.fill();
        }

        this.node.addChild(bg);
        bg.setSiblingIndex(0);
    }

    /**
     * 创建顶部信息栏
     */
    private createTopBar(): void {
        const topBar = new Node('TopBar');
        topBar.setPosition(0, 550);
        
        const transform = topBar.addComponent(UITransform);
        transform.setContentSize(700, 80);

        const graphics = topBar.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 700, 80,
            new Color(30, 30, 40, 220),
            new Color(80, 80, 100),
            2, 10
        );

        // 玩家头像框
        const avatarFrame = new Node('AvatarFrame');
        avatarFrame.setPosition(-280, 0);
        const avatarGraphics = avatarFrame.addComponent(Graphics);
        DoodleGraphics.drawDoodleCircle(
            avatarGraphics, 0, 0, 30,
            new Color(100, 150, 200),
            new Color(150, 200, 255),
            3
        );
        // 简易头像
        avatarGraphics.fillColor = new Color(255, 220, 180);
        avatarGraphics.circle(0, 0, 22);
        avatarGraphics.fill();
        topBar.addChild(avatarFrame);

        // 玩家名称
        const nameNode = new Node('PlayerName');
        nameNode.setPosition(-180, 10);
        this.playerNameLabel = nameNode.addComponent(Label);
        this.playerNameLabel.string = this._playerName;
        this.playerNameLabel.fontSize = 18;
        this.playerNameLabel.color = Color.WHITE;
        topBar.addChild(nameNode);

        // 玩家等级
        const levelNode = new Node('PlayerLevel');
        levelNode.setPosition(-180, -15);
        this.playerLevelLabel = levelNode.addComponent(Label);
        this.playerLevelLabel.string = `Lv.${this._playerLevel}`;
        this.playerLevelLabel.fontSize = 14;
        this.playerLevelLabel.color = new Color(200, 200, 200);
        topBar.addChild(levelNode);

        // 金币显示
        const goldNode = new Node('Gold');
        goldNode.setPosition(100, 0);
        const goldGraphics = goldNode.addComponent(Graphics);
        DoodleGraphics.drawDoodleCircle(
            goldGraphics, -40, 0, 12,
            new Color(255, 215, 0),
            new Color(200, 160, 0),
            2
        );
        this.goldLabel = goldNode.addComponent(Label);
        this.goldLabel.string = '0';
        this.goldLabel.fontSize = 16;
        this.goldLabel.color = new Color(255, 230, 150);
        topBar.addChild(goldNode);

        // 钻石显示
        const diamondNode = new Node('Diamond');
        diamondNode.setPosition(250, 0);
        const diamondGraphics = diamondNode.addComponent(Graphics);
        // 简易钻石图标
        diamondGraphics.fillColor = new Color(100, 200, 255);
        diamondGraphics.moveTo(-40, -8);
        diamondGraphics.lineTo(-48, 0);
        diamondGraphics.lineTo(-40, 12);
        diamondGraphics.lineTo(-32, 0);
        diamondGraphics.close();
        diamondGraphics.fill();
        this.diamondLabel = diamondNode.addComponent(Label);
        this.diamondLabel.string = '0';
        this.diamondLabel.fontSize = 16;
        this.diamondLabel.color = new Color(150, 220, 255);
        topBar.addChild(diamondNode);

        this.node.addChild(topBar);
    }

    /**
     * 创建标题
     */
    private createTitle(): void {
        const titleNode = new Node('Title');
        titleNode.setPosition(0, 380);

        // 标题背景装饰
        const bgGraphics = titleNode.addComponent(Graphics);
        bgGraphics.strokeColor = new Color(255, 200, 100, 100);
        bgGraphics.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            const offset = i * 8;
            DoodleGraphics.drawDoodleRect(
                bgGraphics, 0, 0, 400 - offset * 2, 80 - offset,
                new Color(0, 0, 0, 0),
                new Color(255, 200, 100, 50 - i * 15),
                2, 5
            );
        }

        // 游戏标题
        const titleLabel = new Node('TitleText');
        const label = titleLabel.addComponent(Label);
        label.string = '时间弹射物语';
        label.fontSize = 36;
        label.color = new Color(255, 230, 150);
        label.enableBold = true;
        titleNode.addChild(titleLabel);

        // 副标题
        const subTitle = new Node('SubTitle');
        subTitle.setPosition(0, -35);
        const subLabel = subTitle.addComponent(Label);
        subLabel.string = 'World Flipper Clone';
        subLabel.fontSize = 14;
        subLabel.color = new Color(180, 180, 200);
        titleNode.addChild(subTitle);

        this.node.addChild(titleNode);
    }

    /**
     * 创建主按钮区域
     */
    private createMainButtons(): void {
        const buttonArea = new Node('ButtonArea');
        buttonArea.setPosition(0, 100);

        // 开始游戏按钮（大按钮）
        this.createMainButton(buttonArea, '开始冒险', 0, 80, 280, 70, 
            new Color(80, 180, 80), () => this.onStartGame());

        // 编队按钮
        this.createMainButton(buttonArea, '编队', -100, -20, 130, 55,
            new Color(80, 130, 200), () => this.onOpenTeam());

        // 角色按钮
        this.createMainButton(buttonArea, '角色', 100, -20, 130, 55,
            new Color(200, 130, 80), () => this.onOpenCharacter());

        // 背包按钮
        this.createMainButton(buttonArea, '背包', -100, -90, 130, 55,
            new Color(180, 80, 180), () => this.onOpenInventory());

        // 抽卡按钮
        this.createMainButton(buttonArea, '召唤', 100, -90, 130, 55,
            new Color(200, 180, 80), () => this.onOpenGacha());

        this.node.addChild(buttonArea);
    }

    /**
     * 创建单个主按钮
     */
    private createMainButton(
        parent: Node,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        color: Color,
        callback: () => void
    ): Node {
        const btn = new Node(`Btn_${text}`);
        btn.setPosition(x, y);

        const transform = btn.addComponent(UITransform);
        transform.setContentSize(width, height);

        const graphics = btn.addComponent(Graphics);
        DoodleGraphics.drawDoodleButton(graphics, 0, 0, width, height, color);

        // 按钮文字
        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = height > 60 ? 24 : 18;
        label.color = Color.WHITE;
        label.enableBold = true;
        btn.addChild(labelNode);

        // 按钮组件
        const button = btn.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        btn.on(Button.EventType.CLICK, callback, this);

        parent.addChild(btn);
        this._buttons.set(text, btn);

        return btn;
    }

    /**
     * 创建底部导航栏
     */
    private createBottomNav(): void {
        const navBar = new Node('BottomNav');
        navBar.setPosition(0, -520);

        const transform = navBar.addComponent(UITransform);
        transform.setContentSize(700, 100);

        const graphics = navBar.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 700, 100,
            new Color(25, 25, 35, 240),
            new Color(60, 60, 80),
            2, 15
        );

        // 导航按钮
        const navItems = [
            { name: '首页', icon: 'home', x: -250 },
            { name: '角色', icon: 'character', x: -125 },
            { name: '背包', icon: 'bag', x: 0 },
            { name: '商店', icon: 'shop', x: 125 },
            { name: '设置', icon: 'settings', x: 250 }
        ];

        for (const item of navItems) {
            const navBtn = this.createNavButton(item.name, item.icon, item.x);
            navBar.addChild(navBtn);
        }

        this.node.addChild(navBar);
    }

    /**
     * 创建导航按钮
     */
    private createNavButton(name: string, icon: string, x: number): Node {
        const btn = new Node(`Nav_${name}`);
        btn.setPosition(x, 0);

        const transform = btn.addComponent(UITransform);
        transform.setContentSize(80, 80);

        const graphics = btn.addComponent(Graphics);
        
        // 图标背景
        DoodleGraphics.drawDoodleCircle(
            graphics, 0, 10, 25,
            new Color(60, 60, 80),
            new Color(100, 100, 130),
            2
        );

        // 简易图标
        graphics.fillColor = new Color(200, 200, 220);
        switch (icon) {
            case 'home':
                // 房子图标
                graphics.moveTo(0, 25);
                graphics.lineTo(-15, 10);
                graphics.lineTo(-10, 10);
                graphics.lineTo(-10, 0);
                graphics.lineTo(10, 0);
                graphics.lineTo(10, 10);
                graphics.lineTo(15, 10);
                graphics.close();
                graphics.fill();
                break;
            case 'character':
                // 人物图标
                graphics.circle(0, 18, 8);
                graphics.fill();
                graphics.fillRect(-10, 0, 20, 12);
                break;
            case 'bag':
                // 背包图标
                DoodleGraphics.drawDoodleRect(graphics, 0, 10, 25, 20, 
                    new Color(200, 200, 220), new Color(0,0,0,0), 0, 3);
                graphics.fillRect(-8, 20, 16, 5);
                break;
            case 'shop':
                // 商店图标
                graphics.moveTo(-12, 5);
                graphics.lineTo(12, 5);
                graphics.lineTo(8, 20);
                graphics.lineTo(-8, 20);
                graphics.close();
                graphics.fill();
                graphics.fillRect(-5, 20, 10, 5);
                break;
            case 'settings':
                // 齿轮图标
                graphics.circle(0, 10, 12);
                graphics.fill();
                graphics.fillColor = new Color(60, 60, 80);
                graphics.circle(0, 10, 6);
                graphics.fill();
                break;
        }

        // 文字
        const labelNode = new Node('Label');
        labelNode.setPosition(0, -25);
        const label = labelNode.addComponent(Label);
        label.string = name;
        label.fontSize = 12;
        label.color = new Color(180, 180, 200);
        btn.addChild(labelNode);

        // 按钮组件
        const button = btn.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        btn.on(Button.EventType.CLICK, () => this.onNavClick(name), this);

        return btn;
    }

    /**
     * 更新资源显示
     */
    public updateResourceDisplay(): void {
        if (this.goldLabel && EquipmentManager.instance) {
            this.goldLabel.string = this.formatNumber(EquipmentManager.instance.gold);
        }
        if (this.diamondLabel) {
            this.diamondLabel.string = this.formatNumber(this._diamond);
        }
        if (this.playerNameLabel) {
            this.playerNameLabel.string = this._playerName;
        }
        if (this.playerLevelLabel) {
            this.playerLevelLabel.string = `Lv.${this._playerLevel}`;
        }
    }

    /**
     * 格式化数字
     */
    private formatNumber(num: number): string {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // ==================== 按钮回调 ====================

    private onStartGame(): void {
        console.log('开始游戏');
        // 加载游戏场景
        // director.loadScene('GameScene');
    }

    private onOpenTeam(): void {
        console.log('打开编队面板');
        if (this.teamPanel) {
            this.teamPanel.active = true;
        }
    }

    private onOpenCharacter(): void {
        console.log('打开角色面板');
        if (this.characterPanel) {
            this.characterPanel.active = true;
        }
    }

    private onOpenInventory(): void {
        console.log('打开背包面板');
        if (this.inventoryPanel) {
            this.inventoryPanel.active = true;
        }
    }

    private onOpenGacha(): void {
        console.log('打开抽卡面板');
        if (this.gachaPanel) {
            this.gachaPanel.active = true;
        }
    }

    private onNavClick(name: string): void {
        console.log(`导航点击: ${name}`);
        switch (name) {
            case '首页':
                // 已在首页
                break;
            case '角色':
                this.onOpenCharacter();
                break;
            case '背包':
                this.onOpenInventory();
                break;
            case '商店':
                if (this.shopPanel) this.shopPanel.active = true;
                break;
            case '设置':
                // 打开设置面板
                break;
        }
    }

    /**
     * 设置玩家信息
     */
    public setPlayerInfo(name: string, level: number): void {
        this._playerName = name;
        this._playerLevel = level;
        this.updateResourceDisplay();
    }

    /**
     * 设置钻石数量
     */
    public setDiamond(amount: number): void {
        this._diamond = amount;
        this.updateResourceDisplay();
    }
}
