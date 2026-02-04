import { _decorator, Component, Node, Vec2, Vec3, director, PhysicsSystem2D, EPhysics2DDrawFlags } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 游戏管理器 - 控制游戏整体流程
 * Game Manager - Controls the overall game flow
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager | null = null;

    @property({ tooltip: '游戏是否正在运行' })
    public isGameRunning: boolean = false;

    @property({ tooltip: '当前关卡' })
    public currentLevel: number = 1;

    @property({ tooltip: '当前分数' })
    public score: number = 0;

    @property({ tooltip: '连击数' })
    public comboCount: number = 0;

    @property({ tooltip: '连击超时时间（秒）' })
    public comboTimeout: number = 2.0;

    private _comboTimer: number = 0;
    private _enemies: Node[] = [];
    private _characters: Node[] = [];

    public static get instance(): GameManager | null {
        return GameManager._instance;
    }

    onLoad() {
        if (GameManager._instance) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;
        
        // 启用物理系统调试绘制（开发时使用）
        // PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Shape;
        
        // 设置物理系统
        PhysicsSystem2D.instance.enable = true;
    }

    start() {
        this.startGame();
    }

    update(deltaTime: number) {
        if (!this.isGameRunning) return;

        // 更新连击计时器
        if (this.comboCount > 0) {
            this._comboTimer += deltaTime;
            if (this._comboTimer >= this.comboTimeout) {
                this.resetCombo();
            }
        }

        // 检查游戏是否结束
        this.checkGameState();
    }

    /**
     * 开始游戏
     */
    public startGame(): void {
        this.isGameRunning = true;
        this.score = 0;
        this.comboCount = 0;
        this._comboTimer = 0;
        console.log('游戏开始！');
    }

    /**
     * 暂停游戏
     */
    public pauseGame(): void {
        this.isGameRunning = false;
        director.pause();
        console.log('游戏暂停');
    }

    /**
     * 恢复游戏
     */
    public resumeGame(): void {
        this.isGameRunning = true;
        director.resume();
        console.log('游戏恢复');
    }

    /**
     * 游戏结束
     */
    public gameOver(): void {
        this.isGameRunning = false;
        console.log('游戏结束！最终得分:', this.score);
    }

    /**
     * 添加分数
     */
    public addScore(points: number): void {
        const comboMultiplier = 1 + this.comboCount * 0.1;
        const finalPoints = Math.floor(points * comboMultiplier);
        this.score += finalPoints;
        console.log(`得分 +${finalPoints} (连击加成: x${comboMultiplier.toFixed(1)})`);
    }

    /**
     * 增加连击
     */
    public addCombo(): void {
        this.comboCount++;
        this._comboTimer = 0;
        console.log(`连击: ${this.comboCount}`);
    }

    /**
     * 重置连击
     */
    public resetCombo(): void {
        if (this.comboCount > 0) {
            console.log(`连击结束: ${this.comboCount}`);
        }
        this.comboCount = 0;
        this._comboTimer = 0;
    }

    /**
     * 注册敌人
     */
    public registerEnemy(enemy: Node): void {
        this._enemies.push(enemy);
    }

    /**
     * 注销敌人
     */
    public unregisterEnemy(enemy: Node): void {
        const index = this._enemies.indexOf(enemy);
        if (index > -1) {
            this._enemies.splice(index, 1);
        }
    }

    /**
     * 注册角色
     */
    public registerCharacter(character: Node): void {
        this._characters.push(character);
    }

    /**
     * 获取所有敌人
     */
    public getEnemies(): Node[] {
        return this._enemies;
    }

    /**
     * 获取所有角色
     */
    public getCharacters(): Node[] {
        return this._characters;
    }

    /**
     * 检查游戏状态
     */
    private checkGameState(): void {
        // 检查所有敌人是否被消灭
        if (this._enemies.length === 0 && this.isGameRunning) {
            this.onLevelComplete();
        }
    }

    /**
     * 关卡完成
     */
    private onLevelComplete(): void {
        console.log(`关卡 ${this.currentLevel} 完成！`);
        // 这里可以添加加载下一关的逻辑
    }

    onDestroy() {
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }
}
