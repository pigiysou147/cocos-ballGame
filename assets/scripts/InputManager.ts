import { _decorator, Component, Node, input, Input, EventTouch, Vec2, Vec3, view, UITransform, Rect } from 'cc';
import { Character } from './Character';
import { Flipper, FlipperSide } from './Flipper';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * 触摸区域类型
 */
export enum TouchZone {
    LEFT_FLIPPER = 'left',
    RIGHT_FLIPPER = 'right',
    SKILL_BUTTON = 'skill',
    PAUSE_BUTTON = 'pause'
}

/**
 * 输入管理器 - 移动端专用触摸输入处理
 * Input Manager - Mobile-only touch input handling
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

    @property({ tooltip: '触摸分界线比例（0-1）左右挡板区域分界' })
    public touchDivider: number = 0.5;

    @property({ tooltip: '底部挡板区域高度比例（0-1）' })
    public flipperZoneHeight: number = 0.4;

    @property({ tooltip: '技能按钮区域半径（像素）' })
    public skillButtonRadius: number = 80;

    @property({ tooltip: '技能按钮位置X（相对屏幕中心的偏移）' })
    public skillButtonOffsetX: number = 0;

    @property({ tooltip: '技能按钮位置Y（距底部的距离）' })
    public skillButtonOffsetY: number = 150;

    @property({ tooltip: '支持多点触控' })
    public multiTouchEnabled: boolean = true;

    @property({ tooltip: '触摸震动反馈' })
    public vibrationEnabled: boolean = true;

    @property({ tooltip: '震动强度(毫秒)' })
    public vibrationDuration: number = 10;

    private _leftFlipperComp: Flipper | null = null;
    private _rightFlipperComp: Flipper | null = null;
    private _characterComp: Character | null = null;
    private _isLeftTouching: boolean = false;
    private _isRightTouching: boolean = false;
    private _touchIds: Map<number, TouchZone> = new Map();
    private _screenSize: { width: number; height: number } = { width: 720, height: 1280 };
    
    // 技能按钮回调
    private _skillCallback: (() => void) | null = null;
    private _pauseCallback: (() => void) | null = null;
    
    // 触摸统计（用于调试和优化）
    private _touchStats = {
        leftFlipperCount: 0,
        rightFlipperCount: 0,
        skillCount: 0,
        totalTouches: 0
    };

    public static get instance(): InputManager | null {
        return InputManager._instance;
    }

    onLoad() {
        if (InputManager._instance) {
            this.node.destroy();
            return;
        }
        InputManager._instance = this;

        // 获取屏幕尺寸
        this.updateScreenSize();

        // 注册触摸事件（移动端专用）
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);

        // 监听屏幕旋转/尺寸变化
        view.on('canvas-resize', this.updateScreenSize, this);
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
     * 更新屏幕尺寸
     */
    private updateScreenSize(): void {
        const size = view.getVisibleSize();
        this._screenSize = {
            width: size.width,
            height: size.height
        };
        console.log(`屏幕尺寸: ${this._screenSize.width}x${this._screenSize.height}`);
    }

    /**
     * 判断触摸位置属于哪个区域
     */
    private getTouchZone(x: number, y: number): TouchZone {
        const { width, height } = this._screenSize;
        
        // 计算技能按钮中心位置
        const skillCenterX = width / 2 + this.skillButtonOffsetX;
        const skillCenterY = this.skillButtonOffsetY;
        
        // 检查是否在技能按钮区域内
        const distToSkill = Math.sqrt(
            Math.pow(x - skillCenterX, 2) + 
            Math.pow(y - skillCenterY, 2)
        );
        
        if (distToSkill <= this.skillButtonRadius) {
            return TouchZone.SKILL_BUTTON;
        }
        
        // 检查是否在挡板控制区域（屏幕底部区域）
        const flipperZoneTop = height * this.flipperZoneHeight;
        
        if (y <= flipperZoneTop) {
            // 在挡板区域内，根据左右分区
            if (x < width * this.touchDivider) {
                return TouchZone.LEFT_FLIPPER;
            } else {
                return TouchZone.RIGHT_FLIPPER;
            }
        }
        
        // 屏幕上半部分也可以控制挡板（更大的操作区域）
        if (x < width * this.touchDivider) {
            return TouchZone.LEFT_FLIPPER;
        } else {
            return TouchZone.RIGHT_FLIPPER;
        }
    }

    /**
     * 触摸开始事件
     */
    private onTouchStart(event: EventTouch): void {
        if (!GameManager.instance?.isGameRunning) return;

        const touches = event.getAllTouches();
        
        for (const touch of touches) {
            const touchId = touch.getID();
            
            // 跳过已记录的触摸点
            if (this._touchIds.has(touchId)) continue;
            
            const location = touch.getUILocation();
            const zone = this.getTouchZone(location.x, location.y);
            
            this._touchIds.set(touchId, zone);
            this._touchStats.totalTouches++;
            
            // 触摸震动反馈
            this.triggerVibration();
            
            switch (zone) {
                case TouchZone.LEFT_FLIPPER:
                    this.activateLeftFlipper();
                    this._touchStats.leftFlipperCount++;
                    break;
                    
                case TouchZone.RIGHT_FLIPPER:
                    this.activateRightFlipper();
                    this._touchStats.rightFlipperCount++;
                    break;
                    
                case TouchZone.SKILL_BUTTON:
                    this.useSkill();
                    this._touchStats.skillCount++;
                    break;
                    
                case TouchZone.PAUSE_BUTTON:
                    this.triggerPause();
                    break;
            }
        }
    }

    /**
     * 触摸移动事件（用于检测手指滑动切换挡板）
     */
    private onTouchMove(event: EventTouch): void {
        if (!GameManager.instance?.isGameRunning) return;

        const touch = event.touch;
        if (!touch) return;

        const touchId = touch.getID();
        const oldZone = this._touchIds.get(touchId);
        
        if (!oldZone) return;
        
        // 技能按钮不支持滑动
        if (oldZone === TouchZone.SKILL_BUTTON || oldZone === TouchZone.PAUSE_BUTTON) {
            return;
        }
        
        const location = touch.getUILocation();
        const newZone = this.getTouchZone(location.x, location.y);
        
        // 检测是否滑动切换了挡板
        if (newZone !== oldZone && 
            (newZone === TouchZone.LEFT_FLIPPER || newZone === TouchZone.RIGHT_FLIPPER)) {
            
            // 停用旧挡板
            if (oldZone === TouchZone.LEFT_FLIPPER) {
                this.deactivateLeftFlipper();
            } else if (oldZone === TouchZone.RIGHT_FLIPPER) {
                this.deactivateRightFlipper();
            }
            
            // 激活新挡板
            if (newZone === TouchZone.LEFT_FLIPPER) {
                this.activateLeftFlipper();
            } else if (newZone === TouchZone.RIGHT_FLIPPER) {
                this.activateRightFlipper();
            }
            
            this._touchIds.set(touchId, newZone);
            this.triggerVibration();
        }
    }

    /**
     * 触摸结束事件
     */
    private onTouchEnd(event: EventTouch): void {
        const touch = event.touch;
        if (!touch) return;

        const touchId = touch.getID();
        const zone = this._touchIds.get(touchId);

        if (zone === TouchZone.LEFT_FLIPPER) {
            // 检查是否还有其他触摸在左挡板区域
            if (!this.hasOtherTouchInZone(touchId, TouchZone.LEFT_FLIPPER)) {
                this.deactivateLeftFlipper();
            }
        } else if (zone === TouchZone.RIGHT_FLIPPER) {
            // 检查是否还有其他触摸在右挡板区域
            if (!this.hasOtherTouchInZone(touchId, TouchZone.RIGHT_FLIPPER)) {
                this.deactivateRightFlipper();
            }
        }

        this._touchIds.delete(touchId);
    }

    /**
     * 检查是否有其他触摸点在同一区域
     */
    private hasOtherTouchInZone(excludeTouchId: number, zone: TouchZone): boolean {
        for (const [id, z] of this._touchIds) {
            if (id !== excludeTouchId && z === zone) {
                return true;
            }
        }
        return false;
    }

    /**
     * 触摸取消事件
     */
    private onTouchCancel(event: EventTouch): void {
        this.onTouchEnd(event);
    }

    /**
     * 触发震动反馈
     */
    private triggerVibration(): void {
        if (!this.vibrationEnabled) return;
        
        // 使用 Vibration API（如果支持）
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(this.vibrationDuration);
        }
    }

    /**
     * 激活左挡板
     */
    public activateLeftFlipper(): void {
        if (this._leftFlipperComp && !this._isLeftTouching) {
            this._isLeftTouching = true;
            this._leftFlipperComp.flipUp();
        }
    }

    /**
     * 停用左挡板
     */
    public deactivateLeftFlipper(): void {
        if (this._leftFlipperComp && this._isLeftTouching) {
            this._isLeftTouching = false;
            this._leftFlipperComp.flipDown();
        }
    }

    /**
     * 激活右挡板
     */
    public activateRightFlipper(): void {
        if (this._rightFlipperComp && !this._isRightTouching) {
            this._isRightTouching = true;
            this._rightFlipperComp.flipUp();
        }
    }

    /**
     * 停用右挡板
     */
    public deactivateRightFlipper(): void {
        if (this._rightFlipperComp && this._isRightTouching) {
            this._isRightTouching = false;
            this._rightFlipperComp.flipDown();
        }
    }

    /**
     * 同时激活双挡板（双指操作）
     */
    public activateBothFlippers(): void {
        this.activateLeftFlipper();
        this.activateRightFlipper();
    }

    /**
     * 同时停用双挡板
     */
    public deactivateBothFlippers(): void {
        this.deactivateLeftFlipper();
        this.deactivateRightFlipper();
    }

    /**
     * 使用技能
     */
    public useSkill(): void {
        if (this._skillCallback) {
            this._skillCallback();
        } else if (this._characterComp) {
            this._characterComp.useSkill();
        }
    }

    /**
     * 设置技能回调
     */
    public setSkillCallback(callback: () => void): void {
        this._skillCallback = callback;
    }

    /**
     * 触发暂停
     */
    private triggerPause(): void {
        if (this._pauseCallback) {
            this._pauseCallback();
        } else {
            GameManager.instance?.pauseGame();
        }
    }

    /**
     * 设置暂停回调
     */
    public setPauseCallback(callback: () => void): void {
        this._pauseCallback = callback;
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

    /**
     * 获取触摸统计信息
     */
    public getTouchStats(): typeof this._touchStats {
        return { ...this._touchStats };
    }

    /**
     * 重置触摸统计
     */
    public resetTouchStats(): void {
        this._touchStats = {
            leftFlipperCount: 0,
            rightFlipperCount: 0,
            skillCount: 0,
            totalTouches: 0
        };
    }

    /**
     * 获取技能按钮位置（供UI层使用）
     */
    public getSkillButtonPosition(): { x: number; y: number; radius: number } {
        return {
            x: this._screenSize.width / 2 + this.skillButtonOffsetX,
            y: this.skillButtonOffsetY,
            radius: this.skillButtonRadius
        };
    }

    /**
     * 设置技能按钮位置
     */
    public setSkillButtonPosition(offsetX: number, offsetY: number, radius?: number): void {
        this.skillButtonOffsetX = offsetX;
        this.skillButtonOffsetY = offsetY;
        if (radius !== undefined) {
            this.skillButtonRadius = radius;
        }
    }

    /**
     * 检查当前是否有活跃的触摸
     */
    public hasActiveTouches(): boolean {
        return this._touchIds.size > 0;
    }

    /**
     * 获取活跃触摸数量
     */
    public getActiveTouchCount(): number {
        return this._touchIds.size;
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        view.off('canvas-resize', this.updateScreenSize, this);

        if (InputManager._instance === this) {
            InputManager._instance = null;
        }
    }
}
