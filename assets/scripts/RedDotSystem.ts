import { _decorator, Component, Node, EventTarget } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 红点类型
 */
export enum RedDotType {
    // 主要入口
    MAIL = 'mail',                      // 邮箱
    GACHA = 'gacha',                    // 抽卡
    SHOP = 'shop',                      // 商店
    CHARACTER = 'character',            // 角色
    EQUIPMENT = 'equipment',            // 装备
    SKILL = 'skill',                    // 技能
    TASK = 'task',                      // 任务
    ACHIEVEMENT = 'achievement',        // 成就
    EVENT = 'event',                    // 活动
    SETTINGS = 'settings',              // 设置
    
    // 邮箱子项
    MAIL_UNREAD = 'mail_unread',        // 未读邮件
    MAIL_UNCLAIMED = 'mail_unclaimed',  // 未领取附件
    
    // 抽卡子项
    GACHA_FREE = 'gacha_free',          // 免费抽卡
    GACHA_TICKET = 'gacha_ticket',      // 有抽卡券
    
    // 商店子项
    SHOP_FREE = 'shop_free',            // 免费商品
    SHOP_REFRESH = 'shop_refresh',      // 可刷新
    
    // 角色子项
    CHARACTER_UPGRADE = 'char_upgrade', // 可升级
    CHARACTER_BREAKTHROUGH = 'char_breakthrough', // 可突破
    CHARACTER_AWAKEN = 'char_awaken',   // 可觉醒
    CHARACTER_NEW = 'char_new',         // 新角色
    
    // 装备子项
    EQUIPMENT_UPGRADE = 'equip_upgrade',// 可升级
    EQUIPMENT_NEW = 'equip_new',        // 新装备
    
    // 任务子项
    TASK_DAILY = 'task_daily',          // 每日任务
    TASK_WEEKLY = 'task_weekly',        // 每周任务
    TASK_ACTIVITY = 'task_activity',    // 活跃度奖励
    TASK_SIGNIN = 'task_signin',        // 签到
    
    // 成就子项
    ACHIEVEMENT_CLAIMABLE = 'achievement_claimable', // 可领取
    
    // 活动子项
    EVENT_NEW = 'event_new',            // 新活动
    EVENT_CLAIMABLE = 'event_claimable',// 可领取
    
    // 其他
    LOGIN_REWARD = 'login_reward',      // 登录奖励
    DAILY_FREE = 'daily_free',          // 每日免费
}

/**
 * 红点状态
 */
export interface RedDotState {
    type: RedDotType;
    count: number;                      // 数量 (0表示无红点)
    hasNew: boolean;                    // 是否有"NEW"标识
    lastUpdateTime: number;
}

/**
 * 红点配置
 */
export interface RedDotConfig {
    type: RedDotType;
    parent?: RedDotType;                // 父级红点
    checker?: () => number;             // 检查函数，返回红点数量
    priority: number;                   // 优先级 (用于排序)
}

/**
 * 红点通知系统
 * Red Dot System - Badge notification management
 */
@ccclass('RedDotSystem')
export class RedDotSystem extends Component {
    private static _instance: RedDotSystem | null = null;

    // 红点状态
    private _states: Map<RedDotType, RedDotState> = new Map();
    
    // 红点配置
    private _configs: Map<RedDotType, RedDotConfig> = new Map();
    
    // 父子关系
    private _parentMap: Map<RedDotType, RedDotType> = new Map();
    private _childrenMap: Map<RedDotType, RedDotType[]> = new Map();

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_RED_DOT_CHANGED = 'red_dot_changed';
    public static readonly EVENT_RED_DOT_CLEARED = 'red_dot_cleared';

    public static get instance(): RedDotSystem | null {
        return RedDotSystem._instance;
    }

    onLoad() {
        if (RedDotSystem._instance) {
            this.node.destroy();
            return;
        }
        RedDotSystem._instance = this;

        this.initConfigs();
        this.initStates();
    }

    /**
     * 初始化配置
     */
    private initConfigs(): void {
        // 主入口
        this.registerConfig({ type: RedDotType.MAIL, priority: 1 });
        this.registerConfig({ type: RedDotType.GACHA, priority: 2 });
        this.registerConfig({ type: RedDotType.SHOP, priority: 3 });
        this.registerConfig({ type: RedDotType.CHARACTER, priority: 4 });
        this.registerConfig({ type: RedDotType.EQUIPMENT, priority: 5 });
        this.registerConfig({ type: RedDotType.TASK, priority: 6 });
        this.registerConfig({ type: RedDotType.ACHIEVEMENT, priority: 7 });
        this.registerConfig({ type: RedDotType.EVENT, priority: 8 });

        // 邮箱子项
        this.registerConfig({ type: RedDotType.MAIL_UNREAD, parent: RedDotType.MAIL, priority: 1 });
        this.registerConfig({ type: RedDotType.MAIL_UNCLAIMED, parent: RedDotType.MAIL, priority: 2 });

        // 抽卡子项
        this.registerConfig({ type: RedDotType.GACHA_FREE, parent: RedDotType.GACHA, priority: 1 });
        this.registerConfig({ type: RedDotType.GACHA_TICKET, parent: RedDotType.GACHA, priority: 2 });

        // 商店子项
        this.registerConfig({ type: RedDotType.SHOP_FREE, parent: RedDotType.SHOP, priority: 1 });
        this.registerConfig({ type: RedDotType.SHOP_REFRESH, parent: RedDotType.SHOP, priority: 2 });

        // 角色子项
        this.registerConfig({ type: RedDotType.CHARACTER_NEW, parent: RedDotType.CHARACTER, priority: 1 });
        this.registerConfig({ type: RedDotType.CHARACTER_UPGRADE, parent: RedDotType.CHARACTER, priority: 2 });
        this.registerConfig({ type: RedDotType.CHARACTER_BREAKTHROUGH, parent: RedDotType.CHARACTER, priority: 3 });
        this.registerConfig({ type: RedDotType.CHARACTER_AWAKEN, parent: RedDotType.CHARACTER, priority: 4 });

        // 装备子项
        this.registerConfig({ type: RedDotType.EQUIPMENT_NEW, parent: RedDotType.EQUIPMENT, priority: 1 });
        this.registerConfig({ type: RedDotType.EQUIPMENT_UPGRADE, parent: RedDotType.EQUIPMENT, priority: 2 });

        // 任务子项
        this.registerConfig({ type: RedDotType.TASK_DAILY, parent: RedDotType.TASK, priority: 1 });
        this.registerConfig({ type: RedDotType.TASK_WEEKLY, parent: RedDotType.TASK, priority: 2 });
        this.registerConfig({ type: RedDotType.TASK_ACTIVITY, parent: RedDotType.TASK, priority: 3 });
        this.registerConfig({ type: RedDotType.TASK_SIGNIN, parent: RedDotType.TASK, priority: 4 });

        // 成就子项
        this.registerConfig({ type: RedDotType.ACHIEVEMENT_CLAIMABLE, parent: RedDotType.ACHIEVEMENT, priority: 1 });

        // 活动子项
        this.registerConfig({ type: RedDotType.EVENT_NEW, parent: RedDotType.EVENT, priority: 1 });
        this.registerConfig({ type: RedDotType.EVENT_CLAIMABLE, parent: RedDotType.EVENT, priority: 2 });

        // 独立红点
        this.registerConfig({ type: RedDotType.LOGIN_REWARD, priority: 1 });
        this.registerConfig({ type: RedDotType.DAILY_FREE, priority: 2 });
    }

    /**
     * 注册红点配置
     */
    private registerConfig(config: RedDotConfig): void {
        this._configs.set(config.type, config);

        // 建立父子关系
        if (config.parent) {
            this._parentMap.set(config.type, config.parent);
            
            if (!this._childrenMap.has(config.parent)) {
                this._childrenMap.set(config.parent, []);
            }
            this._childrenMap.get(config.parent)!.push(config.type);
        }
    }

    /**
     * 初始化状态
     */
    private initStates(): void {
        for (const [type] of this._configs) {
            this._states.set(type, {
                type,
                count: 0,
                hasNew: false,
                lastUpdateTime: 0
            });
        }
    }

    /**
     * 设置红点数量
     */
    public setRedDot(type: RedDotType, count: number, hasNew: boolean = false): void {
        const state = this._states.get(type);
        if (!state) return;

        const prevCount = state.count;
        state.count = Math.max(0, count);
        state.hasNew = hasNew;
        state.lastUpdateTime = Date.now();

        // 更新父级红点
        this.updateParentRedDot(type);

        // 发送事件
        if (prevCount !== state.count) {
            this.events.emit(RedDotSystem.EVENT_RED_DOT_CHANGED, {
                type,
                count: state.count,
                hasNew: state.hasNew
            });
        }
    }

    /**
     * 增加红点数量
     */
    public addRedDot(type: RedDotType, count: number = 1): void {
        const state = this._states.get(type);
        if (!state) return;
        this.setRedDot(type, state.count + count);
    }

    /**
     * 减少红点数量
     */
    public reduceRedDot(type: RedDotType, count: number = 1): void {
        const state = this._states.get(type);
        if (!state) return;
        this.setRedDot(type, state.count - count);
    }

    /**
     * 清除红点
     */
    public clearRedDot(type: RedDotType): void {
        this.setRedDot(type, 0, false);
        this.events.emit(RedDotSystem.EVENT_RED_DOT_CLEARED, { type });
    }

    /**
     * 获取红点状态
     */
    public getRedDot(type: RedDotType): RedDotState | null {
        return this._states.get(type) || null;
    }

    /**
     * 检查是否有红点
     */
    public hasRedDot(type: RedDotType): boolean {
        const state = this._states.get(type);
        return state ? state.count > 0 : false;
    }

    /**
     * 获取红点数量
     */
    public getRedDotCount(type: RedDotType): number {
        const state = this._states.get(type);
        return state ? state.count : 0;
    }

    /**
     * 更新父级红点
     */
    private updateParentRedDot(type: RedDotType): void {
        const parent = this._parentMap.get(type);
        if (!parent) return;

        const children = this._childrenMap.get(parent) || [];
        let totalCount = 0;
        let hasNew = false;

        for (const childType of children) {
            const state = this._states.get(childType);
            if (state) {
                totalCount += state.count;
                if (state.hasNew) hasNew = true;
            }
        }

        this.setRedDot(parent, totalCount, hasNew);
    }

    /**
     * 刷新所有红点（通过checker函数）
     */
    public refreshAll(): void {
        for (const [type, config] of this._configs) {
            if (config.checker) {
                const count = config.checker();
                this.setRedDot(type, count);
            }
        }
    }

    /**
     * 刷新指定红点
     */
    public refresh(type: RedDotType): void {
        const config = this._configs.get(type);
        if (config?.checker) {
            const count = config.checker();
            this.setRedDot(type, count);
        }
    }

    /**
     * 注册红点检查函数
     */
    public registerChecker(type: RedDotType, checker: () => number): void {
        const config = this._configs.get(type);
        if (config) {
            config.checker = checker;
        }
    }

    /**
     * 获取所有有红点的类型
     */
    public getAllActiveRedDots(): RedDotState[] {
        const result: RedDotState[] = [];
        for (const [, state] of this._states) {
            if (state.count > 0) {
                result.push({ ...state });
            }
        }
        return result.sort((a, b) => {
            const configA = this._configs.get(a.type);
            const configB = this._configs.get(b.type);
            return (configA?.priority || 0) - (configB?.priority || 0);
        });
    }

    /**
     * 获取子级红点
     */
    public getChildRedDots(parent: RedDotType): RedDotState[] {
        const children = this._childrenMap.get(parent) || [];
        const result: RedDotState[] = [];
        
        for (const childType of children) {
            const state = this._states.get(childType);
            if (state) {
                result.push({ ...state });
            }
        }
        
        return result.sort((a, b) => {
            const configA = this._configs.get(a.type);
            const configB = this._configs.get(b.type);
            return (configA?.priority || 0) - (configB?.priority || 0);
        });
    }

    /**
     * 批量设置红点
     */
    public batchSetRedDots(updates: { type: RedDotType; count: number; hasNew?: boolean }[]): void {
        for (const update of updates) {
            this.setRedDot(update.type, update.count, update.hasNew || false);
        }
    }

    /**
     * 重置所有红点
     */
    public resetAll(): void {
        for (const [type] of this._states) {
            this.clearRedDot(type);
        }
    }

    onDestroy() {
        if (RedDotSystem._instance === this) {
            RedDotSystem._instance = null;
        }
    }
}
