import { _decorator, Component, Node, Graphics, Color, UITransform, Vec3, tween, Label, view, UIOpacity, Widget, Sprite, Size } from 'cc';
import { InputManager, TouchZone } from './InputManager';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * 移动端UI组件 - 显示触摸区域和虚拟按钮
 * Mobile UI Component - Display touch zones and virtual buttons
 */
@ccclass('MobileUI')
export class MobileUI extends Component {
    @property({ tooltip: '是否显示触摸区域指示' })
    public showTouchZones: boolean = true;

    @property({ tooltip: '触摸区域透明度' })
    public touchZoneAlpha: number = 30;

    @property({ tooltip: '技能按钮大小' })
    public skillButtonSize: number = 120;

    @property({ tooltip: '暂停按钮大小' })
    public pauseButtonSize: number = 60;

    @property({ tooltip: '按钮按下缩放' })
    public pressScale: number = 0.9;

    @property({ tooltip: '技能按钮充能颜色' })
    public skillReadyColor: Color = new Color(100, 200, 255, 200);

    @property({ tooltip: '技能按钮未充能颜色' })
    public skillNotReadyColor: Color = new Color(100, 100, 100, 150);

    // UI节点
    private _leftZoneNode: Node | null = null;
    private _rightZoneNode: Node | null = null;
    private _skillButtonNode: Node | null = null;
    private _pauseButtonNode: Node | null = null;
    private _energyFillNode: Node | null = null;
    private _comboNode: Node | null = null;

    // 技能状态
    private _skillEnergy: number = 0;
    private _maxEnergy: number = 100;
    private _isSkillReady: boolean = false;

    // 屏幕尺寸
    private _screenWidth: number = 720;
    private _screenHeight: number = 1280;

    onLoad() {
        this.updateScreenSize();
        view.on('canvas-resize', this.updateScreenSize, this);
    }

    start() {
        this.createMobileUI();
    }

    /**
     * 更新屏幕尺寸
     */
    private updateScreenSize(): void {
        const size = view.getVisibleSize();
        this._screenWidth = size.width;
        this._screenHeight = size.height;
    }

    /**
     * 创建移动端UI
     */
    public createMobileUI(): void {
        // 设置UI节点层级
        const uiTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        uiTransform.setContentSize(this._screenWidth, this._screenHeight);

        if (this.showTouchZones) {
            this.createTouchZones();
        }

        this.createSkillButton();
        this.createPauseButton();
        this.createComboDisplay();
    }

    /**
     * 创建触摸区域指示
     */
    private createTouchZones(): void {
        const inputManager = InputManager.instance;
        if (!inputManager) return;

        const divider = inputManager.touchDivider || 0.5;
        const flipperZoneHeight = inputManager.flipperZoneHeight || 0.4;

        // 左侧区域
        this._leftZoneNode = new Node('LeftTouchZone');
        this._leftZoneNode.setPosition(-this._screenWidth / 4, -this._screenHeight / 2 + (this._screenHeight * flipperZoneHeight) / 2, 0);
        const leftTransform = this._leftZoneNode.addComponent(UITransform);
        leftTransform.setContentSize(this._screenWidth * divider, this._screenHeight * flipperZoneHeight);
        
        const leftGraphics = this._leftZoneNode.addComponent(Graphics);
        leftGraphics.fillColor = new Color(100, 150, 255, this.touchZoneAlpha);
        leftGraphics.rect(
            -leftTransform.width / 2, 
            -leftTransform.height / 2, 
            leftTransform.width, 
            leftTransform.height
        );
        leftGraphics.fill();
        
        // 绘制左箭头指示
        leftGraphics.fillColor = new Color(255, 255, 255, 50);
        this.drawArrow(leftGraphics, 0, 0, 40, 'left');
        
        this.node.addChild(this._leftZoneNode);

        // 右侧区域
        this._rightZoneNode = new Node('RightTouchZone');
        this._rightZoneNode.setPosition(this._screenWidth / 4, -this._screenHeight / 2 + (this._screenHeight * flipperZoneHeight) / 2, 0);
        const rightTransform = this._rightZoneNode.addComponent(UITransform);
        rightTransform.setContentSize(this._screenWidth * (1 - divider), this._screenHeight * flipperZoneHeight);
        
        const rightGraphics = this._rightZoneNode.addComponent(Graphics);
        rightGraphics.fillColor = new Color(255, 150, 100, this.touchZoneAlpha);
        rightGraphics.rect(
            -rightTransform.width / 2, 
            -rightTransform.height / 2, 
            rightTransform.width, 
            rightTransform.height
        );
        rightGraphics.fill();
        
        // 绘制右箭头指示
        rightGraphics.fillColor = new Color(255, 255, 255, 50);
        this.drawArrow(rightGraphics, 0, 0, 40, 'right');
        
        this.node.addChild(this._rightZoneNode);
    }

    /**
     * 绘制箭头
     */
    private drawArrow(g: Graphics, x: number, y: number, size: number, direction: string): void {
        g.moveTo(x, y);
        
        switch (direction) {
            case 'left':
                g.lineTo(x - size, y + size / 2);
                g.lineTo(x - size / 3, y);
                g.lineTo(x - size, y - size / 2);
                break;
            case 'right':
                g.lineTo(x + size, y + size / 2);
                g.lineTo(x + size / 3, y);
                g.lineTo(x + size, y - size / 2);
                break;
            case 'up':
                g.lineTo(x + size / 2, y + size);
                g.lineTo(x, y + size / 3);
                g.lineTo(x - size / 2, y + size);
                break;
        }
        
        g.close();
        g.fill();
    }

    /**
     * 创建技能按钮
     */
    private createSkillButton(): void {
        const inputManager = InputManager.instance;
        const buttonPos = inputManager?.getSkillButtonPosition() || {
            x: this._screenWidth / 2,
            y: 150,
            radius: 60
        };

        this._skillButtonNode = new Node('SkillButton');
        // 转换为相对于中心的坐标
        this._skillButtonNode.setPosition(
            buttonPos.x - this._screenWidth / 2, 
            buttonPos.y - this._screenHeight / 2, 
            0
        );
        
        const transform = this._skillButtonNode.addComponent(UITransform);
        transform.setContentSize(this.skillButtonSize, this.skillButtonSize);

        // 背景圆环
        const graphics = this._skillButtonNode.addComponent(Graphics);
        this.drawSkillButton(graphics);

        // 能量填充层
        this._energyFillNode = new Node('EnergyFill');
        this._energyFillNode.setPosition(0, 0, 0);
        const fillTransform = this._energyFillNode.addComponent(UITransform);
        fillTransform.setContentSize(this.skillButtonSize, this.skillButtonSize);
        this._energyFillNode.addComponent(Graphics);
        this._skillButtonNode.addChild(this._energyFillNode);

        // 技能图标
        const iconNode = new Node('SkillIcon');
        iconNode.setPosition(0, 0, 0);
        const iconTransform = iconNode.addComponent(UITransform);
        iconTransform.setContentSize(60, 60);
        const iconGraphics = iconNode.addComponent(Graphics);
        this.drawSkillIcon(iconGraphics);
        this._skillButtonNode.addChild(iconNode);

        this.node.addChild(this._skillButtonNode);

        // 初始化能量显示
        this.updateEnergyDisplay();
    }

    /**
     * 绘制技能按钮背景
     */
    private drawSkillButton(g: Graphics): void {
        const radius = this.skillButtonSize / 2;
        
        // 外圈
        g.lineWidth = 4;
        g.strokeColor = new Color(200, 200, 200, 200);
        g.fillColor = new Color(50, 50, 50, 180);
        g.circle(0, 0, radius);
        g.fill();
        g.stroke();
        
        // 内圈装饰
        g.strokeColor = new Color(150, 150, 150, 100);
        g.lineWidth = 2;
        g.circle(0, 0, radius - 10);
        g.stroke();
    }

    /**
     * 绘制技能图标
     */
    private drawSkillIcon(g: Graphics): void {
        // 绘制闪电/能量图标
        g.fillColor = new Color(255, 220, 100, 255);
        
        // 闪电形状
        g.moveTo(-5, 20);
        g.lineTo(5, 5);
        g.lineTo(0, 5);
        g.lineTo(10, -20);
        g.lineTo(-5, -5);
        g.lineTo(0, -5);
        g.close();
        g.fill();
    }

    /**
     * 创建暂停按钮
     */
    private createPauseButton(): void {
        this._pauseButtonNode = new Node('PauseButton');
        // 放在右上角
        this._pauseButtonNode.setPosition(
            this._screenWidth / 2 - this.pauseButtonSize - 20,
            this._screenHeight / 2 - this.pauseButtonSize - 40,
            0
        );
        
        const transform = this._pauseButtonNode.addComponent(UITransform);
        transform.setContentSize(this.pauseButtonSize, this.pauseButtonSize);

        const graphics = this._pauseButtonNode.addComponent(Graphics);
        this.drawPauseButton(graphics);

        this.node.addChild(this._pauseButtonNode);
    }

    /**
     * 绘制暂停按钮
     */
    private drawPauseButton(g: Graphics): void {
        const size = this.pauseButtonSize;
        const radius = size / 2;
        
        // 圆形背景
        g.fillColor = new Color(50, 50, 50, 150);
        g.circle(0, 0, radius);
        g.fill();
        
        // 暂停图标（两条竖线）
        g.fillColor = new Color(255, 255, 255, 200);
        const barWidth = 6;
        const barHeight = 20;
        const gap = 6;
        
        g.rect(-gap - barWidth / 2, -barHeight / 2, barWidth, barHeight);
        g.rect(gap - barWidth / 2, -barHeight / 2, barWidth, barHeight);
        g.fill();
    }

    /**
     * 创建连击显示
     */
    private createComboDisplay(): void {
        this._comboNode = new Node('ComboDisplay');
        // 放在屏幕上方中间
        this._comboNode.setPosition(0, this._screenHeight / 2 - 100, 0);
        
        const transform = this._comboNode.addComponent(UITransform);
        transform.setContentSize(200, 60);

        // 添加透明度组件
        const opacity = this._comboNode.addComponent(UIOpacity);
        opacity.opacity = 0; // 初始隐藏

        const graphics = this._comboNode.addComponent(Graphics);
        
        // 背景
        graphics.fillColor = new Color(0, 0, 0, 150);
        graphics.roundRect(-100, -30, 200, 60, 10);
        graphics.fill();

        this.node.addChild(this._comboNode);
    }

    /**
     * 更新技能能量显示
     */
    public updateEnergyDisplay(): void {
        if (!this._energyFillNode) return;
        
        const graphics = this._energyFillNode.getComponent(Graphics);
        if (!graphics) return;
        
        graphics.clear();
        
        const radius = this.skillButtonSize / 2 - 8;
        const ratio = Math.min(this._skillEnergy / this._maxEnergy, 1);
        
        if (ratio > 0) {
            // 绘制能量填充弧形
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + ratio * Math.PI * 2;
            
            graphics.fillColor = this._isSkillReady ? this.skillReadyColor : this.skillNotReadyColor;
            graphics.moveTo(0, 0);
            graphics.arc(0, 0, radius, startAngle, endAngle, false);
            graphics.close();
            graphics.fill();
        }
        
        // 如果技能准备好，添加发光效果
        if (this._isSkillReady && this._skillButtonNode) {
            this.playSkillReadyEffect();
        }
    }

    /**
     * 设置技能能量
     */
    public setSkillEnergy(current: number, max: number): void {
        this._skillEnergy = current;
        this._maxEnergy = max;
        
        const wasReady = this._isSkillReady;
        this._isSkillReady = current >= max;
        
        this.updateEnergyDisplay();
        
        // 技能刚刚充满时播放特效
        if (this._isSkillReady && !wasReady) {
            this.playSkillReadyEffect();
        }
    }

    /**
     * 播放技能准备好的特效
     */
    private playSkillReadyEffect(): void {
        if (!this._skillButtonNode) return;
        
        // 缩放动画
        tween(this._skillButtonNode)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 播放技能按下效果
     */
    public playSkillPressEffect(): void {
        if (!this._skillButtonNode) return;
        
        tween(this._skillButtonNode)
            .to(0.05, { scale: new Vec3(this.pressScale, this.pressScale, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 显示连击数
     */
    public showCombo(count: number): void {
        if (!this._comboNode) return;
        
        const opacity = this._comboNode.getComponent(UIOpacity);
        if (!opacity) return;
        
        // 重绘连击数
        const graphics = this._comboNode.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            
            // 背景
            graphics.fillColor = new Color(0, 0, 0, 150);
            graphics.roundRect(-100, -30, 200, 60, 10);
            graphics.fill();
            
            // 绘制连击数字（简单绘制）
            graphics.fillColor = this.getComboColor(count);
            graphics.strokeColor = new Color(255, 255, 255, 200);
            graphics.lineWidth = 2;
            
            // 连击文字效果
            const fontSize = Math.min(24 + count, 40);
            // 这里简化处理，实际应该用Label组件
        }
        
        // 显示动画
        opacity.opacity = 255;
        
        tween(this._comboNode)
            .to(0.1, { scale: new Vec3(1.3, 1.3, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
        
        // 延迟隐藏
        tween(opacity)
            .delay(1.5)
            .to(0.3, { opacity: 0 })
            .start();
    }

    /**
     * 获取连击颜色
     */
    private getComboColor(count: number): Color {
        if (count >= 50) return new Color(255, 50, 50, 255);   // 红色
        if (count >= 30) return new Color(255, 150, 0, 255);   // 橙色
        if (count >= 20) return new Color(255, 220, 0, 255);   // 黄色
        if (count >= 10) return new Color(100, 200, 255, 255); // 蓝色
        return new Color(255, 255, 255, 255); // 白色
    }

    /**
     * 显示触摸区域高亮
     */
    public highlightTouchZone(zone: TouchZone): void {
        let targetNode: Node | null = null;
        
        switch (zone) {
            case TouchZone.LEFT_FLIPPER:
                targetNode = this._leftZoneNode;
                break;
            case TouchZone.RIGHT_FLIPPER:
                targetNode = this._rightZoneNode;
                break;
            case TouchZone.SKILL_BUTTON:
                targetNode = this._skillButtonNode;
                break;
        }
        
        if (targetNode) {
            tween(targetNode)
                .to(0.05, { scale: new Vec3(0.95, 0.95, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }

    /**
     * 隐藏触摸区域指示
     */
    public hideTouchZones(): void {
        if (this._leftZoneNode) {
            this._leftZoneNode.active = false;
        }
        if (this._rightZoneNode) {
            this._rightZoneNode.active = false;
        }
    }

    /**
     * 显示触摸区域指示
     */
    public showTouchZonesUI(): void {
        if (this._leftZoneNode) {
            this._leftZoneNode.active = true;
        }
        if (this._rightZoneNode) {
            this._rightZoneNode.active = true;
        }
    }

    /**
     * 更新UI布局（屏幕旋转时调用）
     */
    public updateLayout(): void {
        this.updateScreenSize();
        
        // 清理旧节点
        this.node.removeAllChildren();
        
        // 重新创建UI
        this.createMobileUI();
    }

    onDestroy() {
        view.off('canvas-resize', this.updateScreenSize, this);
    }
}
