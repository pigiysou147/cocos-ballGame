import { _decorator, Component, Node, Graphics, Color, UITransform, Vec3, Label, tween, UIOpacity, view, Rect, EventTouch, input, Input, Sprite, Size } from 'cc';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 引导步骤类型
 */
export enum TutorialStepType {
    DIALOG = 'dialog',               // 对话框
    HIGHLIGHT = 'highlight',         // 高亮区域（强制点击）
    HIGHLIGHT_AREA = 'highlight_area', // 高亮区域（允许区域内任意点击）
    ARROW = 'arrow',                 // 箭头指引
    HAND = 'hand',                   // 手势指引
    BATTLE_DEMO = 'battle_demo',     // 战斗演示
    FREE = 'free',                   // 自由操作（带提示）
    WAIT = 'wait',                   // 等待条件
    AUTO = 'auto'                    // 自动播放
}

/**
 * 引导触发条件
 */
export enum TutorialTrigger {
    IMMEDIATE = 'immediate',         // 立即触发
    CLICK = 'click',                 // 点击触发
    DELAY = 'delay',                 // 延迟触发
    EVENT = 'event',                 // 事件触发
    CONDITION = 'condition'          // 条件触发
}

/**
 * 对话位置
 */
export enum DialogPosition {
    TOP = 'top',
    BOTTOM = 'bottom',
    CENTER = 'center',
    LEFT = 'left',
    RIGHT = 'right'
}

/**
 * 引导步骤配置
 */
export interface TutorialStep {
    id: string;
    type: TutorialStepType;
    
    // 对话内容
    title?: string;
    content: string;
    character?: string;              // 说话角色
    characterImage?: string;         // 角色立绘
    
    // 高亮配置
    highlightTarget?: string;        // 高亮目标节点路径
    highlightRect?: { x: number; y: number; width: number; height: number };
    highlightPadding?: number;       // 高亮区域padding
    
    // 箭头/手势配置
    arrowPosition?: { x: number; y: number };
    arrowRotation?: number;
    handAnimation?: 'tap' | 'swipe_left' | 'swipe_right' | 'drag';
    
    // 对话框配置
    dialogPosition?: DialogPosition;
    dialogOffset?: { x: number; y: number };
    
    // 触发配置
    trigger: TutorialTrigger;
    triggerDelay?: number;           // 延迟时间(秒)
    triggerEvent?: string;           // 触发事件名
    triggerCondition?: () => boolean; // 触发条件
    
    // 完成条件
    completeEvent?: string;          // 完成事件
    completeCondition?: () => boolean;
    autoComplete?: boolean;          // 自动完成（用于对话）
    autoCompleteDelay?: number;      // 自动完成延迟
    
    // 其他
    canSkip?: boolean;               // 是否可跳过
    blockInput?: boolean;            // 是否屏蔽输入
    playAudio?: string;              // 播放音效
    
    // 回调
    onEnter?: () => void;            // 进入步骤回调
    onExit?: () => void;             // 离开步骤回调
}

/**
 * 引导章节
 */
export interface TutorialChapter {
    id: string;
    name: string;
    description: string;
    steps: TutorialStep[];
    canSkip: boolean;
    unlockCondition?: () => boolean;
}

/**
 * 引导进度
 */
export interface TutorialProgress {
    completedChapters: string[];
    currentChapterId: string | null;
    currentStepIndex: number;
    isSkipped: boolean;
}

/**
 * 新手引导系统
 * Tutorial System - Guide new players through the game
 */
@ccclass('TutorialSystem')
export class TutorialSystem extends Component {
    private static _instance: TutorialSystem | null = null;

    // 引导章节
    private _chapters: Map<string, TutorialChapter> = new Map();
    
    // 当前状态
    private _currentChapter: TutorialChapter | null = null;
    private _currentStepIndex: number = 0;
    private _isPlaying: boolean = false;
    private _isPaused: boolean = false;
    
    // 进度
    private _progress: TutorialProgress = {
        completedChapters: [],
        currentChapterId: null,
        currentStepIndex: 0,
        isSkipped: false
    };
    
    // UI节点
    private _maskNode: Node | null = null;
    private _highlightNode: Node | null = null;
    private _dialogNode: Node | null = null;
    private _arrowNode: Node | null = null;
    private _handNode: Node | null = null;
    private _skipButton: Node | null = null;
    
    // 屏幕尺寸
    private _screenWidth: number = 720;
    private _screenHeight: number = 1280;
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_tutorial_progress';

    public static get instance(): TutorialSystem | null {
        return TutorialSystem._instance;
    }

    public get isPlaying(): boolean {
        return this._isPlaying;
    }

    onLoad() {
        if (TutorialSystem._instance) {
            this.node.destroy();
            return;
        }
        TutorialSystem._instance = this;
        
        // 获取屏幕尺寸
        const size = view.getVisibleSize();
        this._screenWidth = size.width;
        this._screenHeight = size.height;
        
        // 初始化引导章节
        this.initChapters();
        
        // 加载进度
        this.loadProgress();
        
        // 创建UI
        this.createUI();
    }

    /**
     * 初始化引导章节
     */
    private initChapters(): void {
        // 第一章：基础操作
        this._chapters.set('chapter_basic', {
            id: 'chapter_basic',
            name: '基础操作',
            description: '学习游戏的基本操作方式',
            canSkip: false,
            steps: [
                {
                    id: 'welcome',
                    type: TutorialStepType.DIALOG,
                    title: '欢迎来到弹射世界！',
                    content: '我是你的向导小精灵，接下来我会教你如何进行游戏。',
                    character: '向导精灵',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.IMMEDIATE,
                    autoComplete: true,
                    autoCompleteDelay: 0,
                    blockInput: true
                },
                {
                    id: 'explain_goal',
                    type: TutorialStepType.DIALOG,
                    title: '游戏目标',
                    content: '在这个游戏中，你需要控制角色弹射，攻击敌人！',
                    character: '向导精灵',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'teach_left_flipper',
                    type: TutorialStepType.HIGHLIGHT_AREA,
                    title: '左挡板',
                    content: '点击屏幕左侧，控制左边的挡板弹起！',
                    highlightRect: { x: 0, y: 0, width: 0.5, height: 0.4 }, // 比例
                    handAnimation: 'tap',
                    dialogPosition: DialogPosition.TOP,
                    trigger: TutorialTrigger.IMMEDIATE,
                    completeEvent: 'left_flipper_used',
                    blockInput: false
                },
                {
                    id: 'teach_right_flipper',
                    type: TutorialStepType.HIGHLIGHT_AREA,
                    title: '右挡板',
                    content: '很好！现在点击屏幕右侧，控制右边的挡板！',
                    highlightRect: { x: 0.5, y: 0, width: 0.5, height: 0.4 },
                    handAnimation: 'tap',
                    dialogPosition: DialogPosition.TOP,
                    trigger: TutorialTrigger.IMMEDIATE,
                    completeEvent: 'right_flipper_used',
                    blockInput: false
                },
                {
                    id: 'explain_both',
                    type: TutorialStepType.DIALOG,
                    title: '双挡板',
                    content: '你可以同时按住两侧，让两个挡板一起弹起！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'teach_attack',
                    type: TutorialStepType.FREE,
                    title: '攻击敌人',
                    content: '角色碰到敌人时会自动攻击，试着用挡板把角色弹向敌人吧！',
                    dialogPosition: DialogPosition.TOP,
                    trigger: TutorialTrigger.IMMEDIATE,
                    completeEvent: 'enemy_hit',
                    blockInput: false
                },
                {
                    id: 'combo_explain',
                    type: TutorialStepType.DIALOG,
                    title: '连击系统',
                    content: '连续击中敌人可以积累连击，连击越高伤害越大！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'basic_complete',
                    type: TutorialStepType.DIALOG,
                    title: '基础教学完成！',
                    content: '太棒了！你已经学会了基本操作，接下来学习技能系统吧！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                }
            ]
        });

        // 第二章：技能系统
        this._chapters.set('chapter_skill', {
            id: 'chapter_skill',
            name: '技能系统',
            description: '学习如何使用角色技能',
            canSkip: true,
            steps: [
                {
                    id: 'skill_intro',
                    type: TutorialStepType.DIALOG,
                    title: '技能系统',
                    content: '每个角色都有独特的技能，攻击敌人可以积累技能能量！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'skill_button',
                    type: TutorialStepType.HIGHLIGHT,
                    title: '技能按钮',
                    content: '这是技能按钮，当能量充满时会发光，点击即可释放技能！',
                    highlightTarget: 'MobileUI/SkillButton',
                    arrowRotation: -90,
                    dialogPosition: DialogPosition.TOP,
                    trigger: TutorialTrigger.IMMEDIATE,
                    autoComplete: true,
                    autoCompleteDelay: 3,
                    blockInput: true
                },
                {
                    id: 'charge_skill',
                    type: TutorialStepType.FREE,
                    title: '积累能量',
                    content: '攻击敌人来积累技能能量吧！',
                    dialogPosition: DialogPosition.TOP,
                    trigger: TutorialTrigger.IMMEDIATE,
                    completeEvent: 'skill_ready',
                    blockInput: false
                },
                {
                    id: 'use_skill',
                    type: TutorialStepType.HIGHLIGHT,
                    title: '释放技能',
                    content: '能量已满！点击技能按钮释放强力技能！',
                    highlightTarget: 'MobileUI/SkillButton',
                    handAnimation: 'tap',
                    dialogPosition: DialogPosition.TOP,
                    trigger: TutorialTrigger.IMMEDIATE,
                    completeEvent: 'skill_used',
                    blockInput: false
                },
                {
                    id: 'skill_complete',
                    type: TutorialStepType.DIALOG,
                    title: '技能教学完成！',
                    content: '很好！合理使用技能可以造成大量伤害，记住在关键时刻释放技能！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                }
            ]
        });

        // 第三章：队伍系统
        this._chapters.set('chapter_team', {
            id: 'chapter_team',
            name: '队伍系统',
            description: '学习如何编辑队伍',
            canSkip: true,
            steps: [
                {
                    id: 'team_intro',
                    type: TutorialStepType.DIALOG,
                    title: '队伍系统',
                    content: '你可以编辑自己的队伍，最多放置3名角色！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'main_menu_team',
                    type: TutorialStepType.HIGHLIGHT,
                    title: '队伍按钮',
                    content: '点击"队伍"按钮进入队伍编辑界面',
                    highlightTarget: 'MainMenu/TeamButton',
                    handAnimation: 'tap',
                    dialogPosition: DialogPosition.TOP,
                    trigger: TutorialTrigger.IMMEDIATE,
                    completeEvent: 'team_panel_opened',
                    blockInput: false
                },
                {
                    id: 'leader_explain',
                    type: TutorialStepType.DIALOG,
                    title: '队长',
                    content: '队伍中的第一个角色是队长，队长技能会在战斗中生效！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'element_explain',
                    type: TutorialStepType.DIALOG,
                    title: '属性克制',
                    content: '注意角色属性！火克风、风克雷、雷克水、水克火，光暗互克！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'team_complete',
                    type: TutorialStepType.DIALOG,
                    title: '队伍教学完成！',
                    content: '根据关卡敌人的属性来搭配队伍，可以事半功倍！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                }
            ]
        });

        // 第四章：抽卡系统
        this._chapters.set('chapter_gacha', {
            id: 'chapter_gacha',
            name: '召唤系统',
            description: '学习如何召唤新角色',
            canSkip: true,
            steps: [
                {
                    id: 'gacha_intro',
                    type: TutorialStepType.DIALOG,
                    title: '召唤系统',
                    content: '通过召唤可以获得新的角色，让我们去看看吧！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'gacha_button',
                    type: TutorialStepType.HIGHLIGHT,
                    title: '召唤入口',
                    content: '点击"召唤"按钮进入召唤界面',
                    highlightTarget: 'MainMenu/GachaButton',
                    handAnimation: 'tap',
                    dialogPosition: DialogPosition.TOP,
                    trigger: TutorialTrigger.IMMEDIATE,
                    completeEvent: 'gacha_panel_opened',
                    blockInput: false
                },
                {
                    id: 'gacha_pools',
                    type: TutorialStepType.DIALOG,
                    title: '卡池',
                    content: '这里有不同的卡池，限定卡池有特别的角色UP！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'gacha_pity',
                    type: TutorialStepType.DIALOG,
                    title: '保底机制',
                    content: '每个卡池都有保底机制，多抽几次一定能获得稀有角色！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true
                },
                {
                    id: 'free_gacha',
                    type: TutorialStepType.DIALOG,
                    title: '新手福利',
                    content: '作为新手福利，送你10张召唤券，去抽卡吧！',
                    dialogPosition: DialogPosition.CENTER,
                    trigger: TutorialTrigger.CLICK,
                    blockInput: true,
                    onExit: () => {
                        // 发放新手召唤券
                        console.log('发放新手召唤券');
                    }
                }
            ]
        });
    }

    /**
     * 创建UI节点
     */
    private createUI(): void {
        // 设置本节点
        const uiTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        uiTransform.setContentSize(this._screenWidth, this._screenHeight);
        
        // 创建遮罩层
        this.createMask();
        
        // 创建高亮层
        this.createHighlight();
        
        // 创建对话框
        this.createDialog();
        
        // 创建箭头
        this.createArrow();
        
        // 创建手势
        this.createHand();
        
        // 创建跳过按钮
        this.createSkipButton();
        
        // 默认隐藏所有UI
        this.hideAllUI();
    }

    /**
     * 创建遮罩层
     */
    private createMask(): void {
        this._maskNode = new Node('TutorialMask');
        const transform = this._maskNode.addComponent(UITransform);
        transform.setContentSize(this._screenWidth, this._screenHeight);
        
        const graphics = this._maskNode.addComponent(Graphics);
        graphics.fillColor = new Color(0, 0, 0, 180);
        graphics.rect(-this._screenWidth/2, -this._screenHeight/2, this._screenWidth, this._screenHeight);
        graphics.fill();
        
        this._maskNode.addComponent(UIOpacity);
        this.node.addChild(this._maskNode);
    }

    /**
     * 创建高亮层
     */
    private createHighlight(): void {
        this._highlightNode = new Node('TutorialHighlight');
        const transform = this._highlightNode.addComponent(UITransform);
        transform.setContentSize(200, 100);
        
        const graphics = this._highlightNode.addComponent(Graphics);
        // 高亮边框
        graphics.strokeColor = new Color(255, 255, 100, 255);
        graphics.lineWidth = 4;
        graphics.roundRect(-100, -50, 200, 100, 10);
        graphics.stroke();
        
        // 动画效果
        this._highlightNode.addComponent(UIOpacity);
        
        this.node.addChild(this._highlightNode);
    }

    /**
     * 创建对话框
     */
    private createDialog(): void {
        this._dialogNode = new Node('TutorialDialog');
        const transform = this._dialogNode.addComponent(UITransform);
        transform.setContentSize(600, 200);
        
        const graphics = this._dialogNode.addComponent(Graphics);
        
        // 对话框背景
        graphics.fillColor = new Color(30, 30, 50, 240);
        graphics.roundRect(-300, -100, 600, 200, 15);
        graphics.fill();
        
        // 边框
        graphics.strokeColor = new Color(100, 150, 255, 255);
        graphics.lineWidth = 3;
        graphics.roundRect(-300, -100, 600, 200, 15);
        graphics.stroke();
        
        // 标题
        const titleNode = new Node('Title');
        titleNode.setPosition(0, 60);
        const titleTransform = titleNode.addComponent(UITransform);
        titleTransform.setContentSize(500, 40);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '';
        titleLabel.fontSize = 28;
        titleLabel.color = new Color(255, 220, 100);
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._dialogNode.addChild(titleNode);
        
        // 内容
        const contentNode = new Node('Content');
        contentNode.setPosition(0, -10);
        const contentTransform = contentNode.addComponent(UITransform);
        contentTransform.setContentSize(550, 100);
        const contentLabel = contentNode.addComponent(Label);
        contentLabel.string = '';
        contentLabel.fontSize = 22;
        contentLabel.color = new Color(255, 255, 255);
        contentLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        contentLabel.overflow = Label.Overflow.CLAMP;
        this._dialogNode.addChild(contentNode);
        
        // 点击继续提示
        const tipNode = new Node('Tip');
        tipNode.setPosition(0, -80);
        const tipTransform = tipNode.addComponent(UITransform);
        tipTransform.setContentSize(200, 30);
        const tipLabel = tipNode.addComponent(Label);
        tipLabel.string = '点击继续';
        tipLabel.fontSize = 18;
        tipLabel.color = new Color(150, 150, 150);
        tipLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._dialogNode.addChild(tipNode);
        
        this._dialogNode.addComponent(UIOpacity);
        this.node.addChild(this._dialogNode);
    }

    /**
     * 创建箭头
     */
    private createArrow(): void {
        this._arrowNode = new Node('TutorialArrow');
        const transform = this._arrowNode.addComponent(UITransform);
        transform.setContentSize(60, 60);
        
        const graphics = this._arrowNode.addComponent(Graphics);
        graphics.fillColor = new Color(255, 220, 100);
        
        // 绘制箭头
        graphics.moveTo(0, 30);
        graphics.lineTo(20, -10);
        graphics.lineTo(8, -10);
        graphics.lineTo(8, -30);
        graphics.lineTo(-8, -30);
        graphics.lineTo(-8, -10);
        graphics.lineTo(-20, -10);
        graphics.close();
        graphics.fill();
        
        this._arrowNode.addComponent(UIOpacity);
        this.node.addChild(this._arrowNode);
    }

    /**
     * 创建手势指引
     */
    private createHand(): void {
        this._handNode = new Node('TutorialHand');
        const transform = this._handNode.addComponent(UITransform);
        transform.setContentSize(80, 80);
        
        const graphics = this._handNode.addComponent(Graphics);
        graphics.fillColor = new Color(255, 255, 255, 200);
        
        // 简单的手指形状
        graphics.circle(0, 0, 25);
        graphics.fill();
        graphics.fillColor = new Color(255, 220, 150);
        graphics.circle(0, -40, 15);
        graphics.fill();
        
        this._handNode.addComponent(UIOpacity);
        this.node.addChild(this._handNode);
    }

    /**
     * 创建跳过按钮
     */
    private createSkipButton(): void {
        this._skipButton = new Node('SkipButton');
        this._skipButton.setPosition(this._screenWidth/2 - 80, this._screenHeight/2 - 50);
        
        const transform = this._skipButton.addComponent(UITransform);
        transform.setContentSize(120, 40);
        
        const graphics = this._skipButton.addComponent(Graphics);
        graphics.fillColor = new Color(50, 50, 50, 200);
        graphics.roundRect(-60, -20, 120, 40, 10);
        graphics.fill();
        
        const label = this._skipButton.addComponent(Label);
        label.string = '跳过';
        label.fontSize = 20;
        label.color = new Color(200, 200, 200);
        
        this._skipButton.addComponent(UIOpacity);
        this.node.addChild(this._skipButton);
    }

    /**
     * 隐藏所有UI
     */
    private hideAllUI(): void {
        if (this._maskNode) this._maskNode.active = false;
        if (this._highlightNode) this._highlightNode.active = false;
        if (this._dialogNode) this._dialogNode.active = false;
        if (this._arrowNode) this._arrowNode.active = false;
        if (this._handNode) this._handNode.active = false;
        if (this._skipButton) this._skipButton.active = false;
    }

    /**
     * 开始引导章节
     */
    public startChapter(chapterId: string): boolean {
        const chapter = this._chapters.get(chapterId);
        if (!chapter) {
            console.log(`引导章节不存在: ${chapterId}`);
            return false;
        }
        
        // 检查是否已完成
        if (this._progress.completedChapters.includes(chapterId)) {
            console.log(`引导章节已完成: ${chapterId}`);
            return false;
        }
        
        // 检查解锁条件
        if (chapter.unlockCondition && !chapter.unlockCondition()) {
            console.log(`引导章节未解锁: ${chapterId}`);
            return false;
        }
        
        this._currentChapter = chapter;
        this._currentStepIndex = 0;
        this._isPlaying = true;
        this._progress.currentChapterId = chapterId;
        this._progress.currentStepIndex = 0;
        
        console.log(`开始引导章节: ${chapter.name}`);
        
        // 显示跳过按钮
        if (this._skipButton && chapter.canSkip) {
            this._skipButton.active = true;
        }
        
        // 执行第一步
        this.executeCurrentStep();
        
        return true;
    }

    /**
     * 执行当前步骤
     */
    private executeCurrentStep(): void {
        if (!this._currentChapter) return;
        
        const step = this._currentChapter.steps[this._currentStepIndex];
        if (!step) {
            this.completeChapter();
            return;
        }
        
        console.log(`执行引导步骤: ${step.id}`);
        
        // 调用进入回调
        step.onEnter?.();
        
        // 播放音效
        if (step.playAudio) {
            AudioManager.instance?.playSFX(step.playAudio as SFXType);
        }
        
        // 根据类型显示UI
        switch (step.type) {
            case TutorialStepType.DIALOG:
                this.showDialog(step);
                break;
            case TutorialStepType.HIGHLIGHT:
            case TutorialStepType.HIGHLIGHT_AREA:
                this.showHighlight(step);
                break;
            case TutorialStepType.ARROW:
                this.showArrow(step);
                break;
            case TutorialStepType.FREE:
                this.showFreeMode(step);
                break;
            case TutorialStepType.AUTO:
                this.handleAutoStep(step);
                break;
        }
        
        // 处理触发
        this.handleTrigger(step);
    }

    /**
     * 显示对话框
     */
    private showDialog(step: TutorialStep): void {
        if (!this._dialogNode) return;
        
        // 显示遮罩
        if (this._maskNode) {
            this._maskNode.active = step.blockInput !== false;
        }
        
        // 设置对话框内容
        const titleLabel = this._dialogNode.getChildByName('Title')?.getComponent(Label);
        const contentLabel = this._dialogNode.getChildByName('Content')?.getComponent(Label);
        const tipLabel = this._dialogNode.getChildByName('Tip')?.getComponent(Label);
        
        if (titleLabel) titleLabel.string = step.title || '';
        if (contentLabel) contentLabel.string = step.content;
        if (tipLabel) {
            tipLabel.node.active = step.trigger === TutorialTrigger.CLICK;
        }
        
        // 设置位置
        this.setDialogPosition(step.dialogPosition || DialogPosition.CENTER);
        
        this._dialogNode.active = true;
        
        // 淡入动画
        const opacity = this._dialogNode.getComponent(UIOpacity);
        if (opacity) {
            opacity.opacity = 0;
            tween(opacity).to(0.3, { opacity: 255 }).start();
        }
    }

    /**
     * 设置对话框位置
     */
    private setDialogPosition(position: DialogPosition): void {
        if (!this._dialogNode) return;
        
        switch (position) {
            case DialogPosition.TOP:
                this._dialogNode.setPosition(0, this._screenHeight/2 - 150);
                break;
            case DialogPosition.BOTTOM:
                this._dialogNode.setPosition(0, -this._screenHeight/2 + 150);
                break;
            case DialogPosition.CENTER:
                this._dialogNode.setPosition(0, 0);
                break;
            case DialogPosition.LEFT:
                this._dialogNode.setPosition(-this._screenWidth/4, 0);
                break;
            case DialogPosition.RIGHT:
                this._dialogNode.setPosition(this._screenWidth/4, 0);
                break;
        }
    }

    /**
     * 显示高亮
     */
    private showHighlight(step: TutorialStep): void {
        // 显示对话
        this.showDialog(step);
        
        // 显示高亮区域
        if (this._highlightNode && step.highlightRect) {
            const rect = step.highlightRect;
            // 转换比例为实际坐标
            const x = (rect.x - 0.5) * this._screenWidth + rect.width * this._screenWidth / 2;
            const y = (rect.y - 0.5) * this._screenHeight + rect.height * this._screenHeight / 2;
            const w = rect.width * this._screenWidth;
            const h = rect.height * this._screenHeight;
            
            this._highlightNode.setPosition(x, y);
            
            const transform = this._highlightNode.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(w, h);
            }
            
            // 重绘高亮框
            const graphics = this._highlightNode.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                graphics.strokeColor = new Color(255, 255, 100, 255);
                graphics.lineWidth = 4;
                graphics.roundRect(-w/2, -h/2, w, h, 10);
                graphics.stroke();
            }
            
            this._highlightNode.active = true;
            
            // 闪烁动画
            this.playHighlightAnimation();
        }
        
        // 显示手势
        if (step.handAnimation && this._handNode) {
            this.playHandAnimation(step);
        }
    }

    /**
     * 播放高亮动画
     */
    private playHighlightAnimation(): void {
        if (!this._highlightNode) return;
        
        const opacity = this._highlightNode.getComponent(UIOpacity);
        if (opacity) {
            tween(opacity)
                .to(0.5, { opacity: 100 })
                .to(0.5, { opacity: 255 })
                .union()
                .repeatForever()
                .start();
        }
    }

    /**
     * 播放手势动画
     */
    private playHandAnimation(step: TutorialStep): void {
        if (!this._handNode) return;
        
        this._handNode.active = true;
        
        // 设置手势位置
        if (step.highlightRect) {
            const rect = step.highlightRect;
            const x = (rect.x + rect.width/2 - 0.5) * this._screenWidth;
            const y = (rect.y + rect.height/2 - 0.5) * this._screenHeight;
            this._handNode.setPosition(x, y - 30);
        }
        
        // 点击动画
        if (step.handAnimation === 'tap') {
            const startPos = this._handNode.position.clone();
            tween(this._handNode)
                .to(0.3, { position: new Vec3(startPos.x, startPos.y - 20, 0) })
                .to(0.3, { position: startPos })
                .delay(0.2)
                .union()
                .repeatForever()
                .start();
        }
    }

    /**
     * 显示箭头
     */
    private showArrow(step: TutorialStep): void {
        this.showDialog(step);
        
        if (this._arrowNode && step.arrowPosition) {
            this._arrowNode.setPosition(step.arrowPosition.x, step.arrowPosition.y);
            if (step.arrowRotation !== undefined) {
                this._arrowNode.setRotationFromEuler(0, 0, step.arrowRotation);
            }
            this._arrowNode.active = true;
            
            // 上下浮动动画
            const startY = step.arrowPosition.y;
            tween(this._arrowNode)
                .to(0.5, { position: new Vec3(step.arrowPosition.x, startY + 15, 0) })
                .to(0.5, { position: new Vec3(step.arrowPosition.x, startY, 0) })
                .union()
                .repeatForever()
                .start();
        }
    }

    /**
     * 显示自由模式
     */
    private showFreeMode(step: TutorialStep): void {
        // 只显示提示对话，不阻挡操作
        this.showDialog(step);
        
        // 关闭遮罩
        if (this._maskNode) {
            this._maskNode.active = false;
        }
    }

    /**
     * 处理自动步骤
     */
    private handleAutoStep(step: TutorialStep): void {
        // 自动执行后进入下一步
        const delay = step.autoCompleteDelay || 0;
        this.scheduleOnce(() => {
            this.nextStep();
        }, delay);
    }

    /**
     * 处理触发
     */
    private handleTrigger(step: TutorialStep): void {
        switch (step.trigger) {
            case TutorialTrigger.CLICK:
                // 点击继续 - 监听点击事件
                input.once(Input.EventType.TOUCH_END, this.onTutorialClick, this);
                break;
                
            case TutorialTrigger.DELAY:
                // 延迟触发
                if (step.triggerDelay) {
                    this.scheduleOnce(() => {
                        if (step.autoComplete) {
                            this.nextStep();
                        }
                    }, step.triggerDelay);
                }
                break;
                
            case TutorialTrigger.IMMEDIATE:
                // 立即触发 - 检查完成条件
                if (step.autoComplete) {
                    const delay = step.autoCompleteDelay || 2;
                    this.scheduleOnce(() => {
                        this.nextStep();
                    }, delay);
                }
                break;
        }
    }

    /**
     * 点击事件处理
     */
    private onTutorialClick(event: EventTouch): void {
        if (!this._isPlaying || this._isPaused) return;
        
        const step = this._currentChapter?.steps[this._currentStepIndex];
        if (!step) return;
        
        // 检查是否点击了跳过按钮
        // (简化处理，实际应该检查点击区域)
        
        // 点击继续
        if (step.trigger === TutorialTrigger.CLICK) {
            AudioManager.instance?.playClick();
            this.nextStep();
        }
    }

    /**
     * 触发事件（外部调用）
     */
    public triggerEvent(eventName: string): void {
        if (!this._isPlaying || !this._currentChapter) return;
        
        const step = this._currentChapter.steps[this._currentStepIndex];
        if (!step) return;
        
        // 检查完成事件
        if (step.completeEvent === eventName) {
            console.log(`引导事件触发: ${eventName}`);
            this.nextStep();
        }
    }

    /**
     * 下一步
     */
    public nextStep(): void {
        if (!this._currentChapter) return;
        
        const currentStep = this._currentChapter.steps[this._currentStepIndex];
        
        // 调用退出回调
        currentStep?.onExit?.();
        
        // 停止所有动画
        this.stopAllAnimations();
        
        // 隐藏当前UI
        this.hideAllUI();
        
        // 显示跳过按钮
        if (this._skipButton && this._currentChapter.canSkip) {
            this._skipButton.active = true;
        }
        
        // 进入下一步
        this._currentStepIndex++;
        this._progress.currentStepIndex = this._currentStepIndex;
        
        if (this._currentStepIndex >= this._currentChapter.steps.length) {
            this.completeChapter();
        } else {
            this.executeCurrentStep();
        }
        
        this.saveProgress();
    }

    /**
     * 停止所有动画
     */
    private stopAllAnimations(): void {
        if (this._highlightNode) {
            tween(this._highlightNode).stop();
            tween(this._highlightNode.getComponent(UIOpacity)!).stop();
        }
        if (this._handNode) {
            tween(this._handNode).stop();
        }
        if (this._arrowNode) {
            tween(this._arrowNode).stop();
        }
    }

    /**
     * 完成章节
     */
    private completeChapter(): void {
        if (!this._currentChapter) return;
        
        console.log(`完成引导章节: ${this._currentChapter.name}`);
        
        // 记录完成
        if (!this._progress.completedChapters.includes(this._currentChapter.id)) {
            this._progress.completedChapters.push(this._currentChapter.id);
        }
        
        this._currentChapter = null;
        this._currentStepIndex = 0;
        this._isPlaying = false;
        this._progress.currentChapterId = null;
        this._progress.currentStepIndex = 0;
        
        this.hideAllUI();
        this.saveProgress();
    }

    /**
     * 跳过当前章节
     */
    public skipChapter(): void {
        if (!this._currentChapter || !this._currentChapter.canSkip) return;
        
        console.log(`跳过引导章节: ${this._currentChapter.name}`);
        this.completeChapter();
    }

    /**
     * 跳过所有引导
     */
    public skipAll(): void {
        for (const chapter of this._chapters.values()) {
            if (!this._progress.completedChapters.includes(chapter.id)) {
                this._progress.completedChapters.push(chapter.id);
            }
        }
        
        this._progress.isSkipped = true;
        this._isPlaying = false;
        this._currentChapter = null;
        
        this.hideAllUI();
        this.saveProgress();
    }

    /**
     * 检查是否需要引导
     */
    public needsTutorial(chapterId: string): boolean {
        if (this._progress.isSkipped) return false;
        return !this._progress.completedChapters.includes(chapterId);
    }

    /**
     * 获取章节
     */
    public getChapter(chapterId: string): TutorialChapter | undefined {
        return this._chapters.get(chapterId);
    }

    /**
     * 获取所有章节
     */
    public getAllChapters(): TutorialChapter[] {
        return Array.from(this._chapters.values());
    }

    // ========== 存档 ==========

    public saveProgress(): void {
        const data = JSON.stringify(this._progress);
        localStorage.setItem(this.SAVE_KEY, data);
    }

    public loadProgress(): void {
        const saved = localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                this._progress = JSON.parse(saved);
            } catch (e) {
                console.error('加载引导进度失败:', e);
            }
        }
    }

    public resetProgress(): void {
        this._progress = {
            completedChapters: [],
            currentChapterId: null,
            currentStepIndex: 0,
            isSkipped: false
        };
        this.saveProgress();
    }

    onDestroy() {
        this.saveProgress();
        input.off(Input.EventType.TOUCH_END, this.onTutorialClick, this);
        
        if (TutorialSystem._instance === this) {
            TutorialSystem._instance = null;
        }
    }
}
