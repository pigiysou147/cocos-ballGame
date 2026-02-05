import { _decorator, Component, Node, Vec2, Vec3, RigidBody2D, BoxCollider2D, PolygonCollider2D, Collider2D, Contact2DType, IPhysics2DContact, ERigidBody2DType, tween, Quat, Tween } from 'cc';
import { Character } from './Character';
const { ccclass, property } = _decorator;

/**
 * 挡板类型枚举
 */
export enum FlipperSide {
    LEFT = 0,
    RIGHT = 1
}

/**
 * 挡板类 - 底部的弹射挡板（移动端专用，由InputManager统一控制）
 * Flipper class - Bottom paddle for bouncing the character (Mobile-only, controlled by InputManager)
 */
@ccclass('Flipper')
export class Flipper extends Component {
    @property({ type: FlipperSide, tooltip: '挡板位置（左/右）' })
    public side: FlipperSide = FlipperSide.LEFT;

    @property({ tooltip: '弹射力度' })
    public flipForce: number = 1200;

    @property({ tooltip: '挡板旋转角度' })
    public flipAngle: number = 45;

    @property({ tooltip: '挡板弹起速度(秒)' })
    public flipUpSpeed: number = 0.08;

    @property({ tooltip: '挡板回落速度(秒)' })
    public flipDownSpeed: number = 0.15;

    @property({ tooltip: '自动挡板（是否自动弹射经过的角色）' })
    public autoFlip: boolean = false;

    @property({ tooltip: '弹射时额外力度加成（正在弹起时碰撞）' })
    public flipBonusForce: number = 1.5;

    private _isFlipping: boolean = false;
    private _isUp: boolean = false;
    private _originalRotation: number = 0;
    private _targetRotation: number = 0;
    private _collider: BoxCollider2D | null = null;
    private _currentTween: Tween<Node> | null = null;

    // 弹射事件回调
    private _onFlipCallback: ((side: FlipperSide) => void) | null = null;

    /**
     * 获取挡板是否处于弹起状态
     */
    public get isUp(): boolean {
        return this._isUp;
    }

    /**
     * 获取挡板是否正在移动中
     */
    public get isFlipping(): boolean {
        return this._isFlipping;
    }

    onLoad() {
        // 获取或添加碰撞器
        this._collider = this.getComponent(BoxCollider2D);
        if (!this._collider) {
            this._collider = this.addComponent(BoxCollider2D);
        }
        this._collider.size.width = 120;
        this._collider.size.height = 20;
        this._collider.restitution = 0.9;
        this._collider.friction = 0.3;
        this._collider.apply();

        // 设置初始旋转角度
        if (this.side === FlipperSide.LEFT) {
            this._originalRotation = -20;
            this._targetRotation = this._originalRotation + this.flipAngle;
        } else {
            this._originalRotation = 20;
            this._targetRotation = this._originalRotation - this.flipAngle;
        }
        this.node.setRotationFromEuler(0, 0, this._originalRotation);

        // 注册碰撞回调
        this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }

    start() {
        console.log(`挡板初始化: ${this.side === FlipperSide.LEFT ? '左' : '右'}`);
    }

    /**
     * 执行弹射动作（单次弹射）
     */
    public flip(): void {
        if (this._isFlipping) return;

        this.stopCurrentTween();
        this._isFlipping = true;
        
        // 使用tween实现平滑旋转
        this._currentTween = tween(this.node)
            .to(this.flipUpSpeed, { 
                eulerAngles: new Vec3(0, 0, this._targetRotation) 
            })
            .call(() => {
                this._isUp = true;
                this._onFlipCallback?.(this.side);
            })
            .to(this.flipDownSpeed, { 
                eulerAngles: new Vec3(0, 0, this._originalRotation) 
            })
            .call(() => {
                this._isFlipping = false;
                this._isUp = false;
            })
            .start();
    }

    /**
     * 保持弹起状态
     */
    public flipUp(): void {
        if (this._isUp && !this._isFlipping) return;
        
        this.stopCurrentTween();
        this._isFlipping = true;
        
        this._currentTween = tween(this.node)
            .to(this.flipUpSpeed, { 
                eulerAngles: new Vec3(0, 0, this._targetRotation) 
            })
            .call(() => {
                this._isFlipping = false;
                this._isUp = true;
                this._onFlipCallback?.(this.side);
            })
            .start();
    }

    /**
     * 放下挡板
     */
    public flipDown(): void {
        if (!this._isUp && !this._isFlipping) return;
        
        this.stopCurrentTween();
        this._isFlipping = true;
        
        this._currentTween = tween(this.node)
            .to(this.flipDownSpeed, { 
                eulerAngles: new Vec3(0, 0, this._originalRotation) 
            })
            .call(() => {
                this._isFlipping = false;
                this._isUp = false;
            })
            .start();
    }

    /**
     * 停止当前的tween动画
     */
    private stopCurrentTween(): void {
        if (this._currentTween) {
            this._currentTween.stop();
            this._currentTween = null;
        }
    }

    /**
     * 设置弹射回调
     */
    public setFlipCallback(callback: (side: FlipperSide) => void): void {
        this._onFlipCallback = callback;
    }

    /**
     * 碰撞开始回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        const character = otherCollider.node.getComponent(Character);
        if (character) {
            if (this.autoFlip) {
                this.flip();
            }
            
            // 计算弹射方向
            const flipDirection = this.getFlipDirection();
            
            // 如果挡板正在弹起中，给予额外力度加成
            let forceMultiplier = 1.0;
            if (this._isFlipping && !this._isUp) {
                forceMultiplier = this.flipBonusForce;
            }
            
            const force = new Vec2(
                flipDirection.x * this.flipForce * forceMultiplier,
                flipDirection.y * this.flipForce * forceMultiplier
            );
            
            character.applyFlipForce(force);
            
            if (forceMultiplier > 1) {
                console.log(`挡板弹射！(强力) 方向: (${flipDirection.x.toFixed(2)}, ${flipDirection.y.toFixed(2)})`);
            } else {
                console.log(`挡板弹射！方向: (${flipDirection.x.toFixed(2)}, ${flipDirection.y.toFixed(2)})`);
            }
        }
    }

    /**
     * 获取弹射方向
     */
    private getFlipDirection(): Vec2 {
        // 基于挡板位置和当前旋转计算弹射方向
        const angleRad = (this.node.eulerAngles.z * Math.PI) / 180;
        
        if (this.side === FlipperSide.LEFT) {
            // 左挡板向右上方弹射
            return new Vec2(
                Math.cos(angleRad + Math.PI / 4),
                Math.sin(angleRad + Math.PI / 4) + 0.8
            ).normalize();
        } else {
            // 右挡板向左上方弹射
            return new Vec2(
                -Math.cos(-angleRad + Math.PI / 4),
                Math.sin(-angleRad + Math.PI / 4) + 0.8
            ).normalize();
        }
    }

    /**
     * 获取当前旋转角度
     */
    public getCurrentRotation(): number {
        return this.node.eulerAngles.z;
    }

    /**
     * 获取弹起角度
     */
    public getTargetRotation(): number {
        return this._targetRotation;
    }

    /**
     * 获取初始角度
     */
    public getOriginalRotation(): number {
        return this._originalRotation;
    }

    /**
     * 立即重置到初始状态
     */
    public resetImmediate(): void {
        this.stopCurrentTween();
        this.node.setRotationFromEuler(0, 0, this._originalRotation);
        this._isFlipping = false;
        this._isUp = false;
    }

    onDestroy() {
        this.stopCurrentTween();
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}
