import { _decorator, Component, Node, Vec2, Vec3, RigidBody2D, BoxCollider2D, PolygonCollider2D, Collider2D, Contact2DType, IPhysics2DContact, ERigidBody2DType, input, Input, EventKeyboard, KeyCode, EventTouch, tween, Quat } from 'cc';
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
 * 挡板类 - 底部的弹射挡板
 * Flipper class - Bottom paddle for bouncing the character
 */
@ccclass('Flipper')
export class Flipper extends Component {
    @property({ type: FlipperSide, tooltip: '挡板位置（左/右）' })
    public side: FlipperSide = FlipperSide.LEFT;

    @property({ tooltip: '弹射力度' })
    public flipForce: number = 1200;

    @property({ tooltip: '挡板旋转角度' })
    public flipAngle: number = 45;

    @property({ tooltip: '挡板旋转速度' })
    public flipSpeed: number = 0.1;

    @property({ tooltip: '自动挡板（是否自动弹射经过的角色）' })
    public autoFlip: boolean = false;

    private _isFlipping: boolean = false;
    private _originalRotation: number = 0;
    private _targetRotation: number = 0;
    private _collider: BoxCollider2D | null = null;
    private _leftKey: KeyCode = KeyCode.KEY_A;
    private _rightKey: KeyCode = KeyCode.KEY_D;

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
        const euler = this.node.eulerAngles;
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

        // 注册输入事件
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    start() {
        console.log(`挡板初始化: ${this.side === FlipperSide.LEFT ? '左' : '右'}`);
    }

    update(deltaTime: number) {
        // 挡板旋转动画由tween处理
    }

    /**
     * 执行弹射动作
     */
    public flip(): void {
        if (this._isFlipping) return;

        this._isFlipping = true;
        
        // 使用tween实现平滑旋转
        tween(this.node)
            .to(this.flipSpeed, { 
                eulerAngles: new Vec3(0, 0, this._targetRotation) 
            })
            .to(this.flipSpeed * 2, { 
                eulerAngles: new Vec3(0, 0, this._originalRotation) 
            })
            .call(() => {
                this._isFlipping = false;
            })
            .start();
    }

    /**
     * 保持弹起状态
     */
    public flipUp(): void {
        this._isFlipping = true;
        
        tween(this.node)
            .to(this.flipSpeed, { 
                eulerAngles: new Vec3(0, 0, this._targetRotation) 
            })
            .start();
    }

    /**
     * 放下挡板
     */
    public flipDown(): void {
        tween(this.node)
            .to(this.flipSpeed * 2, { 
                eulerAngles: new Vec3(0, 0, this._originalRotation) 
            })
            .call(() => {
                this._isFlipping = false;
            })
            .start();
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
            const force = new Vec2(
                flipDirection.x * this.flipForce,
                flipDirection.y * this.flipForce
            );
            
            character.applyFlipForce(force);
            console.log(`挡板弹射！方向: (${flipDirection.x.toFixed(2)}, ${flipDirection.y.toFixed(2)})`);
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
     * 键盘按下事件
     */
    private onKeyDown(event: EventKeyboard): void {
        if (this.side === FlipperSide.LEFT && 
            (event.keyCode === this._leftKey || event.keyCode === KeyCode.ARROW_LEFT)) {
            this.flipUp();
        } else if (this.side === FlipperSide.RIGHT && 
            (event.keyCode === this._rightKey || event.keyCode === KeyCode.ARROW_RIGHT)) {
            this.flipUp();
        }
    }

    /**
     * 键盘松开事件
     */
    private onKeyUp(event: EventKeyboard): void {
        if (this.side === FlipperSide.LEFT && 
            (event.keyCode === this._leftKey || event.keyCode === KeyCode.ARROW_LEFT)) {
            this.flipDown();
        } else if (this.side === FlipperSide.RIGHT && 
            (event.keyCode === this._rightKey || event.keyCode === KeyCode.ARROW_RIGHT)) {
            this.flipDown();
        }
    }

    /**
     * 触摸开始事件（移动端支持）
     */
    private onTouchStart(event: EventTouch): void {
        const location = event.getUILocation();
        const screenWidth = 960; // 假设屏幕宽度，实际应该从屏幕获取

        // 屏幕左半边控制左挡板，右半边控制右挡板
        if (this.side === FlipperSide.LEFT && location.x < screenWidth / 2) {
            this.flipUp();
        } else if (this.side === FlipperSide.RIGHT && location.x >= screenWidth / 2) {
            this.flipUp();
        }
    }

    /**
     * 触摸结束事件
     */
    private onTouchEnd(event: EventTouch): void {
        this.flipDown();
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    }
}
