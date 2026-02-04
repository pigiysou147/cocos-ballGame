import { _decorator, Component, Node, Vec2, RigidBody2D, BoxCollider2D, PolygonCollider2D, Collider2D, ERigidBody2DType } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 墙壁类型枚举
 */
export enum WallType {
    NORMAL = 0,     // 普通墙壁
    BOUNCY = 1,     // 弹性墙壁
    STICKY = 2,     // 粘性墙壁
    BREAKABLE = 3   // 可破坏墙壁
}

/**
 * 墙壁类 - 场景边界和障碍物
 * Wall class - Scene boundaries and obstacles
 */
@ccclass('Wall')
export class Wall extends Component {
    @property({ type: WallType, tooltip: '墙壁类型' })
    public wallType: WallType = WallType.NORMAL;

    @property({ tooltip: '墙壁宽度' })
    public wallWidth: number = 20;

    @property({ tooltip: '墙壁高度' })
    public wallHeight: number = 500;

    @property({ tooltip: '弹性系数' })
    public restitution: number = 0.8;

    @property({ tooltip: '摩擦系数' })
    public friction: number = 0.2;

    @property({ tooltip: '可破坏墙壁的生命值' })
    public hp: number = 100;

    private _rigidBody: RigidBody2D | null = null;
    private _collider: BoxCollider2D | null = null;
    private _currentHP: number = 100;

    onLoad() {
        // 获取或添加刚体组件
        this._rigidBody = this.getComponent(RigidBody2D);
        if (!this._rigidBody) {
            this._rigidBody = this.addComponent(RigidBody2D);
        }
        this._rigidBody.type = ERigidBody2DType.Static;

        // 获取或添加碰撞器
        this._collider = this.getComponent(BoxCollider2D);
        if (!this._collider) {
            this._collider = this.addComponent(BoxCollider2D);
        }
        
        // 设置碰撞器尺寸
        this._collider.size.width = this.wallWidth;
        this._collider.size.height = this.wallHeight;

        // 根据墙壁类型设置物理属性
        this.applyWallTypeProperties();
        this._collider.apply();
    }

    start() {
        this._currentHP = this.hp;
    }

    /**
     * 根据墙壁类型应用物理属性
     */
    private applyWallTypeProperties(): void {
        if (!this._collider) return;

        switch (this.wallType) {
            case WallType.NORMAL:
                this._collider.restitution = 0.8;
                this._collider.friction = 0.2;
                break;
            case WallType.BOUNCY:
                this._collider.restitution = 1.2; // 超弹性
                this._collider.friction = 0.1;
                break;
            case WallType.STICKY:
                this._collider.restitution = 0.2;
                this._collider.friction = 0.9;
                break;
            case WallType.BREAKABLE:
                this._collider.restitution = 0.5;
                this._collider.friction = 0.3;
                break;
        }
    }

    /**
     * 对可破坏墙壁造成伤害
     */
    public takeDamage(damage: number): void {
        if (this.wallType !== WallType.BREAKABLE) return;

        this._currentHP -= damage;
        console.log(`墙壁受到 ${damage} 伤害，剩余: ${this._currentHP}/${this.hp}`);

        if (this._currentHP <= 0) {
            this.onBreak();
        }
    }

    /**
     * 墙壁被破坏
     */
    private onBreak(): void {
        console.log('墙壁被破坏！');
        // TODO: 添加破坏效果
        this.node.destroy();
    }
}
