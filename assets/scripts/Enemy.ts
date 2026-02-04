import { _decorator, Component, Node, Vec2, Vec3, RigidBody2D, CircleCollider2D, BoxCollider2D, Collider2D, Contact2DType, ERigidBody2DType, Color, Sprite, UITransform } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * 敌人类型枚举
 */
export enum EnemyType {
    NORMAL = 0,     // 普通敌人
    ELITE = 1,      // 精英敌人
    BOSS = 2        // Boss
}

/**
 * 敌人类 - 玩家需要击败的目标
 * Enemy class - Targets that players need to defeat
 */
@ccclass('Enemy')
export class Enemy extends Component {
    @property({ tooltip: '敌人名称' })
    public enemyName: string = '史莱姆';

    @property({ type: EnemyType, tooltip: '敌人类型' })
    public enemyType: EnemyType = EnemyType.NORMAL;

    @property({ tooltip: '最大生命值' })
    public maxHP: number = 50;

    @property({ tooltip: '攻击力' })
    public attack: number = 5;

    @property({ tooltip: '分数奖励' })
    public scoreReward: number = 100;

    @property({ tooltip: '技能能量奖励' })
    public energyReward: number = 10;

    @property({ tooltip: '是否是静态敌人' })
    public isStatic: boolean = true;

    @property({ tooltip: '是否会反弹角色' })
    public canBounce: boolean = true;

    @property({ tooltip: '反弹力度' })
    public bounceForce: number = 300;

    private _currentHP: number = 50;
    private _rigidBody: RigidBody2D | null = null;
    private _collider: Collider2D | null = null;
    private _isDead: boolean = false;
    private _hitFlashTimer: number = 0;
    private _sprite: Sprite | null = null;
    private _originalColor: Color = new Color(255, 255, 255, 255);

    public get currentHP(): number {
        return this._currentHP;
    }

    public get hpPercent(): number {
        return this._currentHP / this.maxHP;
    }

    public get isDead(): boolean {
        return this._isDead;
    }

    onLoad() {
        // 获取或添加刚体组件
        this._rigidBody = this.getComponent(RigidBody2D);
        if (!this._rigidBody) {
            this._rigidBody = this.addComponent(RigidBody2D);
        }
        this._rigidBody.type = this.isStatic ? ERigidBody2DType.Static : ERigidBody2DType.Dynamic;
        this._rigidBody.gravityScale = this.isStatic ? 0 : 1;

        // 根据敌人类型设置碰撞器
        if (this.enemyType === EnemyType.BOSS) {
            // Boss使用矩形碰撞器
            this._collider = this.getComponent(BoxCollider2D);
            if (!this._collider) {
                this._collider = this.addComponent(BoxCollider2D);
                (this._collider as BoxCollider2D).size.width = 100;
                (this._collider as BoxCollider2D).size.height = 100;
            }
        } else {
            // 普通和精英敌人使用圆形碰撞器
            this._collider = this.getComponent(CircleCollider2D);
            if (!this._collider) {
                this._collider = this.addComponent(CircleCollider2D);
                (this._collider as CircleCollider2D).radius = this.enemyType === EnemyType.ELITE ? 40 : 25;
            }
        }
        
        if (this._collider) {
            this._collider.restitution = this.canBounce ? 1.0 : 0.3;
            this._collider.friction = 0.1;
            this._collider.apply();
        }

        // 获取Sprite组件用于受击闪烁
        this._sprite = this.getComponent(Sprite);

        // 根据类型调整属性
        this.applyTypeModifiers();
    }

    start() {
        this._currentHP = this.maxHP;
        
        // 注册到游戏管理器
        if (GameManager.instance) {
            GameManager.instance.registerEnemy(this.node);
        }
    }

    update(deltaTime: number) {
        // 受击闪烁效果
        if (this._hitFlashTimer > 0) {
            this._hitFlashTimer -= deltaTime;
            if (this._hitFlashTimer <= 0 && this._sprite) {
                this._sprite.color = this._originalColor;
            }
        }
    }

    /**
     * 根据敌人类型应用属性修正
     */
    private applyTypeModifiers(): void {
        switch (this.enemyType) {
            case EnemyType.NORMAL:
                // 普通敌人使用默认值
                break;
            case EnemyType.ELITE:
                // 精英敌人属性提升
                this.maxHP *= 2;
                this.attack *= 1.5;
                this.scoreReward *= 2;
                this.energyReward *= 2;
                break;
            case EnemyType.BOSS:
                // Boss属性大幅提升
                this.maxHP *= 10;
                this.attack *= 3;
                this.scoreReward *= 10;
                this.energyReward *= 5;
                break;
        }
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number): void {
        if (this._isDead) return;

        this._currentHP = Math.max(0, this._currentHP - damage);
        console.log(`${this.enemyName} 受到 ${damage.toFixed(1)} 伤害，剩余HP: ${this._currentHP.toFixed(1)}/${this.maxHP}`);

        // 受击闪烁效果
        this.showHitEffect();

        if (this._currentHP <= 0) {
            this.onDeath();
        }
    }

    /**
     * 显示受击效果
     */
    private showHitEffect(): void {
        if (this._sprite) {
            this._sprite.color = new Color(255, 100, 100, 255);
            this._hitFlashTimer = 0.1;
        }
    }

    /**
     * 敌人死亡
     */
    private onDeath(): void {
        if (this._isDead) return;
        
        this._isDead = true;
        console.log(`${this.enemyName} 被击败！`);

        // 给予奖励
        if (GameManager.instance) {
            GameManager.instance.addScore(this.scoreReward);
            GameManager.instance.unregisterEnemy(this.node);
        }

        // 播放死亡效果（这里简单地销毁节点）
        this.playDeathEffect();
    }

    /**
     * 播放死亡效果
     */
    private playDeathEffect(): void {
        // TODO: 添加粒子效果或动画
        // 简单实现：直接销毁节点
        this.scheduleOnce(() => {
            this.node.destroy();
        }, 0.1);
    }

    /**
     * 治疗
     */
    public heal(amount: number): void {
        this._currentHP = Math.min(this._currentHP + amount, this.maxHP);
        console.log(`${this.enemyName} 恢复 ${amount} HP，当前HP: ${this._currentHP}/${this.maxHP}`);
    }

    onDestroy() {
        // 确保从管理器中注销
        if (GameManager.instance && !this._isDead) {
            GameManager.instance.unregisterEnemy(this.node);
        }
    }
}
