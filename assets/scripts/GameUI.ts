import { _decorator, Component, Node, Label, ProgressBar, Button, Vec3, tween, input, Input, EventKeyboard, KeyCode } from 'cc';
import { GameManager } from './GameManager';
import { Character } from './Character';
const { ccclass, property } = _decorator;

/**
 * 游戏UI管理器
 * Game UI Manager
 */
@ccclass('GameUI')
export class GameUI extends Component {
    @property({ type: Label, tooltip: '分数标签' })
    public scoreLabel: Label | null = null;

    @property({ type: Label, tooltip: '连击标签' })
    public comboLabel: Label | null = null;

    @property({ type: ProgressBar, tooltip: '角色HP进度条' })
    public hpBar: ProgressBar | null = null;

    @property({ type: ProgressBar, tooltip: '技能能量进度条' })
    public skillBar: ProgressBar | null = null;

    @property({ type: Node, tooltip: '技能按钮' })
    public skillButton: Node | null = null;

    @property({ type: Node, tooltip: '暂停按钮' })
    public pauseButton: Node | null = null;

    @property({ type: Node, tooltip: '暂停面板' })
    public pausePanel: Node | null = null;

    @property({ type: Node, tooltip: '游戏结束面板' })
    public gameOverPanel: Node | null = null;

    @property({ type: Label, tooltip: '最终分数标签' })
    public finalScoreLabel: Label | null = null;

    @property({ type: Node, tooltip: '角色节点引用' })
    public characterNode: Node | null = null;

    private _character: Character | null = null;
    private _lastComboCount: number = 0;

    onLoad() {
        // 初始化UI状态
        if (this.pausePanel) {
            this.pausePanel.active = false;
        }
        if (this.gameOverPanel) {
            this.gameOverPanel.active = false;
        }

        // 注册按钮事件
        this.setupButtonListeners();

        // 注册键盘事件
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    start() {
        // 获取角色组件
        if (this.characterNode) {
            this._character = this.characterNode.getComponent(Character);
        }
    }

    update(deltaTime: number) {
        this.updateScoreDisplay();
        this.updateComboDisplay();
        this.updateHPBar();
        this.updateSkillBar();
        this.checkGameOver();
    }

    /**
     * 设置按钮监听器
     */
    private setupButtonListeners(): void {
        if (this.skillButton) {
            this.skillButton.on(Node.EventType.TOUCH_END, this.onSkillButtonClick, this);
        }
        if (this.pauseButton) {
            this.pauseButton.on(Node.EventType.TOUCH_END, this.onPauseButtonClick, this);
        }
    }

    /**
     * 更新分数显示
     */
    private updateScoreDisplay(): void {
        if (this.scoreLabel && GameManager.instance) {
            this.scoreLabel.string = `分数: ${GameManager.instance.score}`;
        }
    }

    /**
     * 更新连击显示
     */
    private updateComboDisplay(): void {
        if (!this.comboLabel || !GameManager.instance) return;

        const currentCombo = GameManager.instance.comboCount;
        
        if (currentCombo > 0) {
            this.comboLabel.node.active = true;
            this.comboLabel.string = `${currentCombo} 连击!`;

            // 连击增加时播放动画
            if (currentCombo > this._lastComboCount) {
                this.playComboAnimation();
            }
        } else {
            this.comboLabel.node.active = false;
        }

        this._lastComboCount = currentCombo;
    }

    /**
     * 播放连击动画
     */
    private playComboAnimation(): void {
        if (!this.comboLabel) return;

        const node = this.comboLabel.node;
        node.setScale(1.5, 1.5, 1);
        
        tween(node)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    /**
     * 更新HP进度条
     */
    private updateHPBar(): void {
        if (this.hpBar && this._character) {
            this.hpBar.progress = this._character.currentHP / this._character.maxHP;
        }
    }

    /**
     * 更新技能能量进度条
     */
    private updateSkillBar(): void {
        if (this.skillBar && this._character) {
            this.skillBar.progress = this._character.skillEnergy / this._character.maxSkillEnergy;
        }

        // 技能就绪时高亮按钮
        if (this.skillButton && this._character) {
            // 这里可以添加按钮高亮效果
        }
    }

    /**
     * 检查游戏是否结束
     */
    private checkGameOver(): void {
        if (!GameManager.instance) return;

        if (!GameManager.instance.isGameRunning && this._character && this._character.currentHP <= 0) {
            this.showGameOver();
        }
    }

    /**
     * 技能按钮点击
     */
    private onSkillButtonClick(): void {
        if (this._character) {
            this._character.useSkill();
        }
    }

    /**
     * 暂停按钮点击
     */
    private onPauseButtonClick(): void {
        if (GameManager.instance) {
            if (GameManager.instance.isGameRunning) {
                GameManager.instance.pauseGame();
                this.showPausePanel();
            } else {
                GameManager.instance.resumeGame();
                this.hidePausePanel();
            }
        }
    }

    /**
     * 显示暂停面板
     */
    private showPausePanel(): void {
        if (this.pausePanel) {
            this.pausePanel.active = true;
            this.pausePanel.setScale(0, 0, 1);
            tween(this.pausePanel)
                .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }

    /**
     * 隐藏暂停面板
     */
    private hidePausePanel(): void {
        if (this.pausePanel) {
            tween(this.pausePanel)
                .to(0.1, { scale: new Vec3(0, 0, 1) })
                .call(() => {
                    if (this.pausePanel) {
                        this.pausePanel.active = false;
                    }
                })
                .start();
        }
    }

    /**
     * 显示游戏结束面板
     */
    private showGameOver(): void {
        if (this.gameOverPanel && !this.gameOverPanel.active) {
            this.gameOverPanel.active = true;
            
            if (this.finalScoreLabel && GameManager.instance) {
                this.finalScoreLabel.string = `最终分数: ${GameManager.instance.score}`;
            }

            this.gameOverPanel.setScale(0, 0, 1);
            tween(this.gameOverPanel)
                .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }

    /**
     * 重新开始游戏
     */
    public restartGame(): void {
        // 重新加载当前场景
        const director = require('cc').director;
        director.loadScene(director.getScene().name);
    }

    /**
     * 键盘事件处理
     */
    private onKeyDown(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.SPACE:
                // 空格键使用技能
                if (this._character) {
                    this._character.useSkill();
                }
                break;
            case KeyCode.ESCAPE:
                // ESC键暂停
                this.onPauseButtonClick();
                break;
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        
        if (this.skillButton) {
            this.skillButton.off(Node.EventType.TOUCH_END, this.onSkillButtonClick, this);
        }
        if (this.pauseButton) {
            this.pauseButton.off(Node.EventType.TOUCH_END, this.onPauseButtonClick, this);
        }
    }
}
