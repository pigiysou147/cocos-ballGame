import { _decorator, Component, Node, Graphics, Color, UITransform, Label, Vec3, tween, UIOpacity, Tween, view } from 'cc';
import { CharacterRarity } from './CharacterData';
import { GachaResult } from './GachaSystem';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 抽卡动画阶段
 */
export enum GachaAnimationPhase {
    IDLE = 'idle',
    PULLING = 'pulling',           // 抽卡中
    REVEALING = 'revealing',       // 揭晓中
    SHOWING_SINGLE = 'showing_single', // 展示单个结果
    SHOWING_ALL = 'showing_all',   // 展示所有结果
    COMPLETE = 'complete'
}

/**
 * 抽卡动画配置
 */
export interface GachaAnimationConfig {
    skipEnabled: boolean;          // 是否可跳过
    showSingleFirst: boolean;      // 是否先单个展示
    autoNextDelay: number;         // 自动下一个延迟
}

/**
 * 抽卡动画管理器
 * Gacha Animation - Summoning animation effects
 */
@ccclass('GachaAnimation')
export class GachaAnimation extends Component {
    private static _instance: GachaAnimation | null = null;

    // 动画配置
    private _config: GachaAnimationConfig = {
        skipEnabled: true,
        showSingleFirst: true,
        autoNextDelay: 1.5
    };

    // 当前状态
    private _phase: GachaAnimationPhase = GachaAnimationPhase.IDLE;
    private _results: GachaResult[] = [];
    private _currentIndex: number = 0;
    private _isSkipping: boolean = false;

    // UI节点
    private _rootNode: Node | null = null;
    private _bgNode: Node | null = null;
    private _cardNode: Node | null = null;
    private _particleContainer: Node | null = null;
    private _resultContainer: Node | null = null;
    private _skipButton: Node | null = null;
    private _infoNode: Node | null = null;

    // 屏幕尺寸
    private _screenWidth: number = 720;
    private _screenHeight: number = 1280;

    // 回调
    private _onComplete: (() => void) | null = null;

    public static get instance(): GachaAnimation | null {
        return GachaAnimation._instance;
    }

    public get isPlaying(): boolean {
        return this._phase !== GachaAnimationPhase.IDLE && this._phase !== GachaAnimationPhase.COMPLETE;
    }

    onLoad() {
        if (GachaAnimation._instance) {
            this.node.destroy();
            return;
        }
        GachaAnimation._instance = this;

        const size = view.getVisibleSize();
        this._screenWidth = size.width;
        this._screenHeight = size.height;

        this.createUI();
        this.hide();
    }

    /**
     * 创建UI
     */
    private createUI(): void {
        this._rootNode = new Node('GachaAnimationRoot');
        const rootTransform = this._rootNode.addComponent(UITransform);
        rootTransform.setContentSize(this._screenWidth, this._screenHeight);
        this._rootNode.addComponent(UIOpacity);
        this.node.addChild(this._rootNode);

        // 背景
        this.createBackground();

        // 粒子容器
        this._particleContainer = new Node('ParticleContainer');
        this._particleContainer.addComponent(UITransform).setContentSize(this._screenWidth, this._screenHeight);
        this._rootNode.addChild(this._particleContainer);

        // 卡片
        this.createCard();

        // 结果容器
        this._resultContainer = new Node('ResultContainer');
        this._resultContainer.addComponent(UITransform).setContentSize(this._screenWidth, this._screenHeight);
        this._rootNode.addChild(this._resultContainer);

        // 信息节点
        this.createInfoNode();

        // 跳过按钮
        this.createSkipButton();
    }

    /**
     * 创建背景
     */
    private createBackground(): void {
        this._bgNode = new Node('Background');
        const transform = this._bgNode.addComponent(UITransform);
        transform.setContentSize(this._screenWidth, this._screenHeight);

        const graphics = this._bgNode.addComponent(Graphics);
        graphics.fillColor = new Color(10, 10, 20, 250);
        graphics.rect(-this._screenWidth/2, -this._screenHeight/2, this._screenWidth, this._screenHeight);
        graphics.fill();

        this._rootNode?.addChild(this._bgNode);
    }

    /**
     * 创建卡片
     */
    private createCard(): void {
        this._cardNode = new Node('Card');
        const transform = this._cardNode.addComponent(UITransform);
        transform.setContentSize(300, 400);

        const graphics = this._cardNode.addComponent(Graphics);
        // 卡片背面
        graphics.fillColor = new Color(40, 40, 80);
        graphics.roundRect(-150, -200, 300, 400, 20);
        graphics.fill();
        graphics.strokeColor = new Color(100, 100, 180);
        graphics.lineWidth = 4;
        graphics.roundRect(-150, -200, 300, 400, 20);
        graphics.stroke();

        // 卡片花纹
        graphics.strokeColor = new Color(80, 80, 140);
        graphics.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            graphics.circle(0, 0, 50 + i * 25);
        }
        graphics.stroke();

        this._cardNode.addComponent(UIOpacity);
        this._rootNode?.addChild(this._cardNode);
    }

    /**
     * 创建信息节点
     */
    private createInfoNode(): void {
        this._infoNode = new Node('InfoNode');
        this._infoNode.setPosition(0, -280);
        
        const transform = this._infoNode.addComponent(UITransform);
        transform.setContentSize(400, 100);

        // 角色名称
        const nameNode = new Node('Name');
        nameNode.setPosition(0, 20);
        const nameTransform = nameNode.addComponent(UITransform);
        nameTransform.setContentSize(400, 40);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = '';
        nameLabel.fontSize = 32;
        nameLabel.color = new Color(255, 255, 255);
        this._infoNode.addChild(nameNode);

        // 稀有度
        const rarityNode = new Node('Rarity');
        rarityNode.setPosition(0, -30);
        const rarityTransform = rarityNode.addComponent(UITransform);
        rarityTransform.setContentSize(400, 30);
        const rarityLabel = rarityNode.addComponent(Label);
        rarityLabel.string = '';
        rarityLabel.fontSize = 24;
        rarityLabel.color = new Color(200, 200, 200);
        this._infoNode.addChild(rarityNode);

        this._infoNode.addComponent(UIOpacity);
        this._rootNode?.addChild(this._infoNode);
    }

    /**
     * 创建跳过按钮
     */
    private createSkipButton(): void {
        this._skipButton = new Node('SkipButton');
        this._skipButton.setPosition(this._screenWidth/2 - 80, this._screenHeight/2 - 60);

        const transform = this._skipButton.addComponent(UITransform);
        transform.setContentSize(120, 45);

        const graphics = this._skipButton.addComponent(Graphics);
        graphics.fillColor = new Color(50, 50, 50, 180);
        graphics.roundRect(-60, -22, 120, 44, 10);
        graphics.fill();

        const label = this._skipButton.addComponent(Label);
        label.string = '跳过';
        label.fontSize = 20;
        label.color = new Color(200, 200, 200);

        this._skipButton.addComponent(UIOpacity);
        this._rootNode?.addChild(this._skipButton);
    }

    /**
     * 播放抽卡动画
     */
    public play(results: GachaResult[], onComplete?: () => void): void {
        if (this.isPlaying) return;

        this._results = results;
        this._currentIndex = 0;
        this._isSkipping = false;
        this._onComplete = onComplete || null;

        this.show();
        this.startPullingAnimation();
    }

    /**
     * 显示
     */
    private show(): void {
        if (!this._rootNode) return;
        this._rootNode.active = true;

        const opacity = this._rootNode.getComponent(UIOpacity);
        if (opacity) {
            opacity.opacity = 0;
            tween(opacity).to(0.3, { opacity: 255 }).start();
        }
    }

    /**
     * 隐藏
     */
    private hide(): void {
        if (!this._rootNode) return;

        const opacity = this._rootNode.getComponent(UIOpacity);
        if (opacity) {
            tween(opacity).to(0.3, { opacity: 0 }).call(() => {
                this._rootNode!.active = false;
                this._phase = GachaAnimationPhase.IDLE;
            }).start();
        }
    }

    /**
     * 开始抽卡动画
     */
    private startPullingAnimation(): void {
        this._phase = GachaAnimationPhase.PULLING;

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.GACHA_START);

        // 卡片初始化
        if (this._cardNode) {
            this._cardNode.setPosition(0, 0);
            this._cardNode.setScale(0.5, 0.5, 1);
            this._cardNode.active = true;

            // 旋转动画
            tween(this._cardNode)
                .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();

            // 持续旋转
            this.scheduleOnce(() => {
                this.startRevealAnimation();
            }, 1.5);
        }

        // 播放粒子特效
        this.playPullingParticles();
    }

    /**
     * 播放抽卡粒子
     */
    private playPullingParticles(): void {
        if (!this._particleContainer) return;

        // 创建光点粒子
        for (let i = 0; i < 30; i++) {
            this.scheduleOnce(() => {
                this.createParticle(
                    (Math.random() - 0.5) * this._screenWidth,
                    -this._screenHeight/2 - 50,
                    new Color(100, 150, 255, 200)
                );
            }, i * 0.05);
        }
    }

    /**
     * 创建粒子
     */
    private createParticle(x: number, startY: number, color: Color): void {
        if (!this._particleContainer) return;

        const particle = new Node('Particle');
        particle.setPosition(x, startY);

        const transform = particle.addComponent(UITransform);
        const size = 5 + Math.random() * 10;
        transform.setContentSize(size, size);

        const graphics = particle.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.circle(0, 0, size/2);
        graphics.fill();

        const opacity = particle.addComponent(UIOpacity);
        this._particleContainer.addChild(particle);

        // 动画
        const duration = 1 + Math.random();
        const targetY = startY + 500 + Math.random() * 500;
        const targetX = x + (Math.random() - 0.5) * 200;

        tween(particle)
            .to(duration, { position: new Vec3(targetX, targetY, 0) })
            .start();

        tween(opacity)
            .delay(duration * 0.7)
            .to(duration * 0.3, { opacity: 0 })
            .call(() => {
                particle.destroy();
            })
            .start();
    }

    /**
     * 开始揭晓动画
     */
    private startRevealAnimation(): void {
        this._phase = GachaAnimationPhase.REVEALING;

        const highestRarity = this.getHighestRarity();
        const color = this.getRarityColor(highestRarity);

        // 播放对应稀有度的音效
        this.playRaritySFX(highestRarity);

        // 闪光效果
        this.playFlashEffect(color);

        // 延迟后显示结果
        this.scheduleOnce(() => {
            if (this._results.length === 1 || this._config.showSingleFirst) {
                this.showSingleResult();
            } else {
                this.showAllResults();
            }
        }, 0.8);
    }

    /**
     * 获取最高稀有度
     */
    private getHighestRarity(): CharacterRarity {
        let highest = CharacterRarity.N;
        const order = [CharacterRarity.N, CharacterRarity.R, CharacterRarity.SR, CharacterRarity.SSR, CharacterRarity.UR];

        for (const result of this._results) {
            if (order.indexOf(result.rarity) > order.indexOf(highest)) {
                highest = result.rarity;
            }
        }

        return highest;
    }

    /**
     * 获取稀有度颜色
     */
    private getRarityColor(rarity: CharacterRarity): Color {
        switch (rarity) {
            case CharacterRarity.UR: return new Color(255, 50, 200);
            case CharacterRarity.SSR: return new Color(255, 200, 50);
            case CharacterRarity.SR: return new Color(200, 100, 255);
            case CharacterRarity.R: return new Color(100, 150, 255);
            case CharacterRarity.N: return new Color(200, 200, 200);
            default: return new Color(255, 255, 255);
        }
    }

    /**
     * 获取稀有度文本
     */
    private getRarityText(rarity: CharacterRarity): string {
        switch (rarity) {
            case CharacterRarity.UR: return '★★★★★ UR';
            case CharacterRarity.SSR: return '★★★★ SSR';
            case CharacterRarity.SR: return '★★★ SR';
            case CharacterRarity.R: return '★★ R';
            case CharacterRarity.N: return '★ N';
            default: return '';
        }
    }

    /**
     * 播放稀有度音效
     */
    private playRaritySFX(rarity: CharacterRarity): void {
        switch (rarity) {
            case CharacterRarity.UR:
                AudioManager.instance?.playSFX(SFXType.GACHA_RESULT_UR);
                break;
            case CharacterRarity.SSR:
                AudioManager.instance?.playSFX(SFXType.GACHA_RESULT_SSR);
                break;
            case CharacterRarity.SR:
                AudioManager.instance?.playSFX(SFXType.GACHA_RESULT_SR);
                break;
            case CharacterRarity.R:
                AudioManager.instance?.playSFX(SFXType.GACHA_RESULT_R);
                break;
            default:
                AudioManager.instance?.playSFX(SFXType.GACHA_RESULT_N);
        }
    }

    /**
     * 播放闪光效果
     */
    private playFlashEffect(color: Color): void {
        if (!this._rootNode) return;

        const flash = new Node('Flash');
        const transform = flash.addComponent(UITransform);
        transform.setContentSize(this._screenWidth, this._screenHeight);

        const graphics = flash.addComponent(Graphics);
        graphics.fillColor = new Color(color.r, color.g, color.b, 200);
        graphics.rect(-this._screenWidth/2, -this._screenHeight/2, this._screenWidth, this._screenHeight);
        graphics.fill();

        const opacity = flash.addComponent(UIOpacity);
        this._rootNode.addChild(flash);

        tween(opacity)
            .to(0.2, { opacity: 255 })
            .to(0.5, { opacity: 0 })
            .call(() => {
                flash.destroy();
            })
            .start();
    }

    /**
     * 显示单个结果
     */
    private showSingleResult(): void {
        this._phase = GachaAnimationPhase.SHOWING_SINGLE;

        if (this._currentIndex >= this._results.length) {
            this.showAllResults();
            return;
        }

        const result = this._results[this._currentIndex];
        const color = this.getRarityColor(result.rarity);

        // 隐藏卡片
        if (this._cardNode) {
            tween(this._cardNode)
                .to(0.3, { scale: new Vec3(0, 1, 1) })
                .call(() => {
                    this._cardNode!.active = false;
                })
                .start();
        }

        // 创建角色展示
        this.createCharacterDisplay(result, 0, 50);

        // 更新信息
        this.updateInfo(result);

        // 播放粒子
        this.playResultParticles(color);

        // 自动下一个或等待点击
        if (this._results.length > 1) {
            this.scheduleOnce(() => {
                this._currentIndex++;
                if (this._currentIndex < this._results.length && !this._isSkipping) {
                    this.showNextResult();
                } else {
                    this.showAllResults();
                }
            }, this._config.autoNextDelay);
        }
    }

    /**
     * 显示下一个结果
     */
    private showNextResult(): void {
        // 清除当前显示
        this._resultContainer?.removeAllChildren();

        // 显示下一个
        this.showSingleResult();
    }

    /**
     * 创建角色展示
     */
    private createCharacterDisplay(result: GachaResult, x: number, y: number): void {
        if (!this._resultContainer) return;

        const charNode = new Node('CharacterDisplay');
        charNode.setPosition(x, y);

        const transform = charNode.addComponent(UITransform);
        transform.setContentSize(250, 320);

        const color = this.getRarityColor(result.rarity);

        const graphics = charNode.addComponent(Graphics);
        
        // 背景光晕
        const gradient = [
            new Color(color.r, color.g, color.b, 100),
            new Color(color.r, color.g, color.b, 0)
        ];
        graphics.fillColor = gradient[0];
        graphics.circle(0, 0, 150);
        graphics.fill();

        // 角色框
        graphics.fillColor = new Color(30, 30, 50, 230);
        graphics.roundRect(-120, -155, 240, 310, 15);
        graphics.fill();
        graphics.strokeColor = color;
        graphics.lineWidth = 4;
        graphics.roundRect(-120, -155, 240, 310, 15);
        graphics.stroke();

        // 角色图标（简化用圆形代替）
        graphics.fillColor = new Color(color.r, color.g, color.b, 150);
        graphics.circle(0, 30, 80);
        graphics.fill();

        // NEW标签
        if (result.isNew) {
            graphics.fillColor = new Color(255, 100, 100);
            graphics.roundRect(60, 100, 50, 25, 5);
            graphics.fill();
        }

        // UP标签
        if (result.isUp) {
            graphics.fillColor = new Color(255, 200, 50);
            graphics.roundRect(-110, 100, 40, 25, 5);
            graphics.fill();
        }

        const opacity = charNode.addComponent(UIOpacity);
        opacity.opacity = 0;
        this._resultContainer.addChild(charNode);

        // 入场动画
        charNode.setScale(0.5, 0.5, 1);
        tween(charNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        tween(opacity)
            .to(0.3, { opacity: 255 })
            .start();
    }

    /**
     * 更新信息显示
     */
    private updateInfo(result: GachaResult): void {
        if (!this._infoNode) return;

        const nameLabel = this._infoNode.getChildByName('Name')?.getComponent(Label);
        const rarityLabel = this._infoNode.getChildByName('Rarity')?.getComponent(Label);

        if (nameLabel) {
            nameLabel.string = result.characterId; // 实际应该获取角色名称
            nameLabel.color = this.getRarityColor(result.rarity);
        }

        if (rarityLabel) {
            rarityLabel.string = this.getRarityText(result.rarity);
            rarityLabel.color = this.getRarityColor(result.rarity);
        }

        // 显示动画
        const opacity = this._infoNode.getComponent(UIOpacity);
        if (opacity) {
            opacity.opacity = 0;
            tween(opacity).to(0.3, { opacity: 255 }).start();
        }
    }

    /**
     * 播放结果粒子
     */
    private playResultParticles(color: Color): void {
        if (!this._particleContainer) return;

        for (let i = 0; i < 20; i++) {
            this.scheduleOnce(() => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 100 + Math.random() * 100;
                this.createParticle(
                    Math.cos(angle) * distance,
                    Math.sin(angle) * distance + 50,
                    new Color(color.r, color.g, color.b, 180)
                );
            }, i * 0.03);
        }
    }

    /**
     * 显示所有结果
     */
    private showAllResults(): void {
        this._phase = GachaAnimationPhase.SHOWING_ALL;

        // 清除之前的显示
        this._resultContainer?.removeAllChildren();

        // 隐藏卡片
        if (this._cardNode) {
            this._cardNode.active = false;
        }

        // 隐藏单个信息
        if (this._infoNode) {
            const opacity = this._infoNode.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.2, { opacity: 0 }).start();
            }
        }

        // 排列所有结果
        const cols = this._results.length <= 5 ? this._results.length : 5;
        const rows = Math.ceil(this._results.length / cols);
        const itemWidth = 130;
        const itemHeight = 170;
        const startX = -(cols - 1) * itemWidth / 2;
        const startY = (rows - 1) * itemHeight / 2;

        for (let i = 0; i < this._results.length; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = startX + col * itemWidth;
            const y = startY - row * itemHeight;

            this.scheduleOnce(() => {
                this.createSmallCharacterDisplay(this._results[i], x, y);
            }, i * 0.1);
        }

        // 添加确认按钮
        this.scheduleOnce(() => {
            this.createConfirmButton();
        }, this._results.length * 0.1 + 0.5);
    }

    /**
     * 创建小角色展示
     */
    private createSmallCharacterDisplay(result: GachaResult, x: number, y: number): void {
        if (!this._resultContainer) return;

        const charNode = new Node('SmallCharacter');
        charNode.setPosition(x, y);

        const transform = charNode.addComponent(UITransform);
        transform.setContentSize(110, 150);

        const color = this.getRarityColor(result.rarity);

        const graphics = charNode.addComponent(Graphics);

        // 背景
        graphics.fillColor = new Color(30, 30, 50, 230);
        graphics.roundRect(-55, -75, 110, 150, 10);
        graphics.fill();
        graphics.strokeColor = color;
        graphics.lineWidth = 2;
        graphics.roundRect(-55, -75, 110, 150, 10);
        graphics.stroke();

        // 角色图标
        graphics.fillColor = new Color(color.r, color.g, color.b, 150);
        graphics.circle(0, 10, 40);
        graphics.fill();

        // 稀有度文字
        // (简化处理)

        // NEW标签
        if (result.isNew) {
            graphics.fillColor = new Color(255, 100, 100);
            graphics.roundRect(25, 45, 25, 18, 3);
            graphics.fill();
        }

        const opacity = charNode.addComponent(UIOpacity);
        opacity.opacity = 0;
        this._resultContainer.addChild(charNode);

        // 入场动画
        charNode.setScale(0, 0, 1);
        tween(charNode)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        tween(opacity)
            .to(0.2, { opacity: 255 })
            .start();

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.COIN_GET);
    }

    /**
     * 创建确认按钮
     */
    private createConfirmButton(): void {
        if (!this._resultContainer) return;

        const btnNode = new Node('ConfirmButton');
        btnNode.setPosition(0, -this._screenHeight/2 + 100);

        const transform = btnNode.addComponent(UITransform);
        transform.setContentSize(200, 55);

        const graphics = btnNode.addComponent(Graphics);
        graphics.fillColor = new Color(80, 140, 200);
        graphics.roundRect(-100, -27, 200, 54, 12);
        graphics.fill();

        const label = btnNode.addComponent(Label);
        label.string = '确认';
        label.fontSize = 24;
        label.color = new Color(255, 255, 255);

        const opacity = btnNode.addComponent(UIOpacity);
        opacity.opacity = 0;
        this._resultContainer.addChild(btnNode);

        tween(opacity).to(0.3, { opacity: 255 }).start();
    }

    /**
     * 跳过动画
     */
    public skip(): void {
        if (!this._config.skipEnabled || this._phase === GachaAnimationPhase.IDLE) return;

        this._isSkipping = true;
        this.unscheduleAllCallbacks();

        if (this._phase === GachaAnimationPhase.PULLING || this._phase === GachaAnimationPhase.REVEALING) {
            this.showAllResults();
        } else if (this._phase === GachaAnimationPhase.SHOWING_SINGLE) {
            this.showAllResults();
        }
    }

    /**
     * 完成并关闭
     */
    public complete(): void {
        this._phase = GachaAnimationPhase.COMPLETE;

        // 清理
        this._particleContainer?.removeAllChildren();
        this._resultContainer?.removeAllChildren();

        // 隐藏
        this.hide();

        // 回调
        this._onComplete?.();
        this._onComplete = null;
        this._results = [];
    }

    onDestroy() {
        if (GachaAnimation._instance === this) {
            GachaAnimation._instance = null;
        }
    }
}
