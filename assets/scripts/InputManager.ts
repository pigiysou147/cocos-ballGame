import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode, EventTouch, Vec2, Vec3, view, UITransform } from 'cc';
import { Character } from './Character';
import { Flipper, FlipperSide } from './Flipper';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * 输入管理器 - 统一处理所有输入
 * Input Manager - Centralized input handling
 */
@ccclass('InputManager')
export class InputManager extends Component {
    private static _instance: InputManager | null = null;

    @property({ type: Node, tooltip: '左挡板节点' })
    public leftFlipper: Node | null = null;

    @property({ type: Node, tooltip: '右挡板节点' })
    public rightFlipper: Node | null = null;

    @property({ type: Node, tooltip: '角色节点' })
    public characterNode: Node | null = null;

    @property({ tooltip: '触摸分界线比例（0-1）' })
    public touchDivider: number = 0.5;

    private _leftFlipperComp: Flipper | null = null;
    private _rightFlipperComp: Flipper | null = null;
    private _characterComp: Character | null = null;
    private _isLeftTouching: boolean = false;
    private _isRightTouching: boolean = false;
    private _touchIds: Map<number, string> = new Map(); // touch id -> 'left' | 'right'

    public static get instance(): InputManager | null {
        return InputManager._instance;
    }

    onLoad() {
        if (InputManager._instance) {
            this.node.destroy();
            return;
        }
        InputManager._instance = this;

        // 注册输入事件
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    start() {
        // 获取组件引用
        if (this.leftFlipper) {
            this._leftFlipperComp = this.leftFlipper.getComponent(Flipper);
        }
        if (this.rightFlipper) {
            this._rightFlipperComp = this.rightFlipper.getComponent(Flipper);
        }
        if (this.characterNode) {
            this._characterComp = this.characterNode.getComponent(Character);
        }
    }

    /**
     * 键盘按下事件
     */
    private onKeyDown(event: EventKeyboard): void {
        if (!GameManager.instance?.isGameRunning) return;

        switch (event.keyCode) {
            // 左挡板控制
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.activateLeftFlipper();
                break;

            // 右挡板控制
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.activateRightFlipper();
                break;

            // 技能
            case KeyCode.SPACE:
            case KeyCode.KEY_J:
                this.useSkill();
                break;

            // 同时激活两个挡板
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.activateLeftFlipper();
                this.activateRightFlipper();
                break;
        }
    }

    /**
     * 键盘松开事件
     */
    private onKeyUp(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.deactivateLeftFlipper();
                break;

            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.deactivateRightFlipper();
                break;

            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.deactivateLeftFlipper();
                this.deactivateRightFlipper();
                break;
        }
    }

    /**
     * 触摸开始事件
     */
    private onTouchStart(event: EventTouch): void {
        if (!GameManager.instance?.isGameRunning) return;

        const touch = event.touch;
        if (!touch) return;

        const touchId = touch.getID();
        const location = touch.getUILocation();
        const screenWidth = view.getVisibleSize().width;

        // 根据触摸位置决定激活哪个挡板
        if (location.x < screenWidth * this.touchDivider) {
            this._touchIds.set(touchId, 'left');
            this.activateLeftFlipper();
        } else {
            this._touchIds.set(touchId, 'right');
            this.activateRightFlipper();
        }
    }

    /**
     * 触摸结束事件
     */
    private onTouchEnd(event: EventTouch): void {
        const touch = event.touch;
        if (!touch) return;

        const touchId = touch.getID();
        const side = this._touchIds.get(touchId);

        if (side === 'left') {
            this.deactivateLeftFlipper();
        } else if (side === 'right') {
            this.deactivateRightFlipper();
        }

        this._touchIds.delete(touchId);
    }

    /**
     * 触摸取消事件
     */
    private onTouchCancel(event: EventTouch): void {
        this.onTouchEnd(event);
    }

    /**
     * 激活左挡板
     */
    private activateLeftFlipper(): void {
        if (this._leftFlipperComp && !this._isLeftTouching) {
            this._isLeftTouching = true;
            this._leftFlipperComp.flipUp();
        }
    }

    /**
     * 停用左挡板
     */
    private deactivateLeftFlipper(): void {
        if (this._leftFlipperComp && this._isLeftTouching) {
            this._isLeftTouching = false;
            this._leftFlipperComp.flipDown();
        }
    }

    /**
     * 激活右挡板
     */
    private activateRightFlipper(): void {
        if (this._rightFlipperComp && !this._isRightTouching) {
            this._isRightTouching = true;
            this._rightFlipperComp.flipUp();
        }
    }

    /**
     * 停用右挡板
     */
    private deactivateRightFlipper(): void {
        if (this._rightFlipperComp && this._isRightTouching) {
            this._isRightTouching = false;
            this._rightFlipperComp.flipDown();
        }
    }

    /**
     * 使用技能
     */
    private useSkill(): void {
        if (this._characterComp) {
            this._characterComp.useSkill();
        }
    }

    /**
     * 设置挡板引用
     */
    public setFlippers(left: Node, right: Node): void {
        this.leftFlipper = left;
        this.rightFlipper = right;
        this._leftFlipperComp = left.getComponent(Flipper);
        this._rightFlipperComp = right.getComponent(Flipper);
    }

    /**
     * 设置角色引用
     */
    public setCharacter(character: Node): void {
        this.characterNode = character;
        this._characterComp = character.getComponent(Character);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);

        if (InputManager._instance === this) {
            InputManager._instance = null;
        }
    }
}
