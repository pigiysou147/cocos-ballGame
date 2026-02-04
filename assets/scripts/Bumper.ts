import { _decorator, Component, Node, Vec2, Vec3, RigidBody2D, CircleCollider2D, Collider2D, Contact2DType, IPhysics2DContact, ERigidBody2DType, tween, Color, Sprite } from 'cc';
import { Character } from './Character';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * 弹射障碍物类型
 */
export enum BumperType {
    CIRCLE = 0,     // 圆形弹射物
    TRIANGLE = 1,   // 三角形弹射物
    MUSHROOM = 2    // 蘑菇形弹射物
}

/**
 * 弹射障碍物类 - 接触时将角色弹开
 * Bumper class - Bounces character on contact
 */
@ccclass('Bumper')
export class Bumper extends Component {
    @property({ type: BumperType, tooltip: '弹射物类型' })
    public bumperType: BumperType = BumperType.CIRCLE;

    @property({ tooltip: '弹射力度' })
    public bounceForce: number = 800;

    @property({ tooltip: '弹射时给予的分数' })
    public scoreBonus: number = 10;

    @property({ tooltip: '弹射时给予的技能能量' })
    public energyBonus: number = 5;

    @property({ tooltip: '碰撞半径' })
    public colliderRadius: number = 40;

    @property({ tooltip: '是否启用弹射动画' })
    public enableAnimation: boolean = true;

    private _rigidBody: RigidBody2D | null = null;
    private _collider: CircleCollider2D | null = null;
    private _sprite: Sprite | null = null;
    private _originalScale: Vec3 = new Vec3(1, 1, 1);
    private _originalColor: Color = new Color(255, 255, 255, 255);

    onLoad() {
        // 添加静态刚体
        this._rigidBody = this.getComponent(RigidBody2D);
        if (!this._rigidBody) {
            this._rigidBody = this.addComponent(RigidBody2D);
        }
        this._rigidBody.type = ERigidBody2DType.Static;

        // 添加圆形碰撞器
        this._collider = this.getComponent(CircleCollider2D);
        if (!this._collider) {
            this._collider = this.addComponent(CircleCollider2D);
        }
        this._collider.radius = this.colliderRadius;
        this._collider.restitution = 1.5; // 超弹性
        this._collider.friction = 0;
        this._collider.apply();

        // 获取Sprite组件
        this._sprite = this.getComponent(Sprite);
        this._originalScale = this.node.scale.clone();

        // 注册碰撞回调
        this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }

    /**
     * 碰撞开始回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        const character = otherCollider.node.getComponent(Character);
        if (character) {
            this.onHit(character, otherCollider.node);
        }
    }

    /**
     * 被击中时的处理
     */
    private onHit(character: Character, characterNode: Node): void {
        // 计算弹射方向（从弹射物中心指向角色）
        const direction = new Vec2(
            characterNode.position.x - this.node.position.x,
            characterNode.position.y - this.node.position.y
        ).normalize();

        // 施加弹射力
        const rigidBody = characterNode.getComponent(RigidBody2D);
        if (rigidBody) {
            const force = new Vec2(
                direction.x * this.bounceForce,
                direction.y * this.bounceForce
            );
            rigidBody.linearVelocity = force;
        }

        // 给予奖励
        if (GameManager.instance) {
            GameManager.instance.addScore(this.scoreBonus);
            GameManager.instance.addCombo();
        }

        // 给予技能能量
        character.addSkillEnergy(this.energyBonus);

        // 播放弹射动画
        if (this.enableAnimation) {
            this.playBounceAnimation();
        }

        console.log(`弹射！方向: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)})`);
    }

    /**
     * 播放弹射动画
     */
    private playBounceAnimation(): void {
        // 缩放动画
        tween(this.node)
            .to(0.05, { scale: new Vec3(
                this._originalScale.x * 0.8,
                this._originalScale.y * 0.8,
                this._originalScale.z
            )})
            .to(0.1, { scale: this._originalScale }, { easing: 'backOut' })
            .start();

        // 颜色闪烁
        if (this._sprite) {
            this._sprite.color = new Color(255, 200, 100, 255);
            this.scheduleOnce(() => {
                if (this._sprite) {
                    this._sprite.color = this._originalColor;
                }
            }, 0.1);
        }
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}
