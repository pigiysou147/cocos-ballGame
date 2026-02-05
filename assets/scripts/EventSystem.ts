import { _decorator, Component, sys, EventTarget } from 'cc';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 活动类型
 */
export enum EventType {
    LIMITED_TIME = 'limited_time',      // 限时活动
    GACHA_UP = 'gacha_up',              // 抽卡UP
    DOUBLE_DROP = 'double_drop',        // 双倍掉落
    DISCOUNT = 'discount',              // 折扣
    CHALLENGE = 'challenge',            // 挑战
    LOGIN = 'login',                    // 登录活动
    RANKING = 'ranking',                // 排行榜
    EXCHANGE = 'exchange',              // 兑换
    COLLECTION = 'collection'           // 收集
}

/**
 * 活动状态
 */
export enum EventStatus {
    NOT_STARTED = 'not_started',
    ACTIVE = 'active',
    ENDED = 'ended'
}

/**
 * 活动奖励
 */
export interface EventReward {
    type: CurrencyType;
    amount: number;
}

/**
 * 活动任务
 */
export interface EventTask {
    id: string;
    name: string;
    description: string;
    target: number;
    rewards: EventReward[];
}

/**
 * 活动配置
 */
export interface GameEventConfig {
    id: string;
    type: EventType;
    name: string;
    description: string;
    bannerImage?: string;
    startTime: number;
    endTime: number;
    tasks?: EventTask[];
    rewards?: EventReward[];
    multiplier?: number;              // 倍率(双倍掉落等)
    discount?: number;                // 折扣(0.5 = 50%off)
    targetCharacters?: string[];      // 目标角色(UP池等)
    isRerun?: boolean;                // 是否复刻
    sortOrder: number;                // 排序
}

/**
 * 活动进度
 */
export interface EventProgress {
    eventId: string;
    taskProgress: { [taskId: string]: number };
    claimedRewards: string[];
    exchangeCount: { [itemId: string]: number };
    points: number;                    // 活动点数
    lastUpdateTime: number;
}

/**
 * 兑换商品
 */
export interface ExchangeItem {
    id: string;
    name: string;
    cost: number;                      // 活动点数消耗
    costType: CurrencyType | 'event_point';
    reward: EventReward;
    limit: number;                     // 限购数量
}

/**
 * 活动系统
 * Event System - Limited time events and challenges
 */
@ccclass('EventSystem')
export class EventSystem extends Component {
    private static _instance: EventSystem | null = null;

    // 活动配置
    private _events: Map<string, GameEventConfig> = new Map();
    
    // 活动进度
    private _progress: Map<string, EventProgress> = new Map();
    
    // 兑换商店
    private _exchangeShops: Map<string, ExchangeItem[]> = new Map();

    // 事件
    public eventTarget: EventTarget = new EventTarget();
    public static readonly EVENT_STARTED = 'event_started';
    public static readonly EVENT_ENDED = 'event_ended';
    public static readonly EVENT_TASK_COMPLETE = 'event_task_complete';
    public static readonly EVENT_REWARD_CLAIMED = 'event_reward_claimed';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_event_progress';

    public static get instance(): EventSystem | null {
        return EventSystem._instance;
    }

    onLoad() {
        if (EventSystem._instance) {
            this.node.destroy();
            return;
        }
        EventSystem._instance = this;

        this.initEvents();
        this.loadProgress();
        
        // 定时检查活动状态
        this.schedule(this.checkEventStatus.bind(this), 60);
    }

    /**
     * 初始化示例活动
     */
    private initEvents(): void {
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        // 双倍金币活动
        this.addEvent({
            id: 'double_gold_weekly',
            type: EventType.DOUBLE_DROP,
            name: '金币大丰收',
            description: '关卡金币掉落翻倍！',
            startTime: now,
            endTime: now + 7 * day,
            multiplier: 2,
            sortOrder: 1
        });

        // UP抽卡活动
        this.addEvent({
            id: 'gacha_up_fire',
            type: EventType.GACHA_UP,
            name: '火属性角色UP',
            description: 'SSR火属性角色出现概率大幅提升！',
            startTime: now,
            endTime: now + 14 * day,
            targetCharacters: ['fire_warrior', 'fire_mage'],
            sortOrder: 2
        });

        // 限时挑战
        this.addEvent({
            id: 'boss_challenge',
            type: EventType.CHALLENGE,
            name: '领主挑战赛',
            description: '挑战强力领主，获取丰厚奖励！',
            startTime: now,
            endTime: now + 7 * day,
            tasks: [
                {
                    id: 'kill_boss_1',
                    name: '击败领主10次',
                    description: '在任意难度下击败领主',
                    target: 10,
                    rewards: [{ type: CurrencyType.DIAMOND, amount: 100 }]
                },
                {
                    id: 'kill_boss_2',
                    name: '击败领主50次',
                    description: '在任意难度下击败领主',
                    target: 50,
                    rewards: [{ type: CurrencyType.DIAMOND, amount: 300 }]
                },
                {
                    id: 'kill_boss_hard',
                    name: '困难模式挑战',
                    description: '在困难模式下击败领主',
                    target: 5,
                    rewards: [{ type: CurrencyType.SUMMON_TICKET, amount: 1 }]
                }
            ],
            sortOrder: 3
        });

        // 收集活动
        this.addEvent({
            id: 'collection_spring',
            type: EventType.COLLECTION,
            name: '春日收集',
            description: '收集春日限定道具兑换奖励！',
            startTime: now,
            endTime: now + 14 * day,
            tasks: [
                {
                    id: 'collect_100',
                    name: '收集100个春日花瓣',
                    description: '通关关卡获取',
                    target: 100,
                    rewards: [{ type: CurrencyType.GOLD, amount: 50000 }]
                },
                {
                    id: 'collect_500',
                    name: '收集500个春日花瓣',
                    description: '通关关卡获取',
                    target: 500,
                    rewards: [{ type: CurrencyType.DIAMOND, amount: 200 }]
                },
                {
                    id: 'collect_1000',
                    name: '收集1000个春日花瓣',
                    description: '通关关卡获取',
                    target: 1000,
                    rewards: [{ type: CurrencyType.SUMMON_TICKET_10, amount: 1 }]
                }
            ],
            sortOrder: 4
        });

        // 初始化兑换商店
        this._exchangeShops.set('collection_spring', [
            {
                id: 'spring_ticket',
                name: '抽卡券',
                cost: 100,
                costType: 'event_point',
                reward: { type: CurrencyType.SUMMON_TICKET, amount: 1 },
                limit: 10
            },
            {
                id: 'spring_gold',
                name: '金币礼包',
                cost: 50,
                costType: 'event_point',
                reward: { type: CurrencyType.GOLD, amount: 10000 },
                limit: 50
            },
            {
                id: 'spring_stamina',
                name: '体力药水',
                cost: 30,
                costType: 'event_point',
                reward: { type: CurrencyType.STAMINA, amount: 60 },
                limit: 30
            },
            {
                id: 'spring_exp',
                name: '经验药水',
                cost: 40,
                costType: 'event_point',
                reward: { type: CurrencyType.EXP_POTION, amount: 500 },
                limit: 20
            }
        ]);

        // 登录活动
        this.addEvent({
            id: 'login_special',
            type: EventType.LOGIN,
            name: '特别登录奖励',
            description: '活动期间每日登录获取额外奖励！',
            startTime: now,
            endTime: now + 7 * day,
            tasks: [
                { id: 'day1', name: '第1天', description: '登录游戏', target: 1, rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }] },
                { id: 'day2', name: '第2天', description: '登录游戏', target: 1, rewards: [{ type: CurrencyType.STAMINA, amount: 100 }] },
                { id: 'day3', name: '第3天', description: '登录游戏', target: 1, rewards: [{ type: CurrencyType.DIAMOND, amount: 100 }] },
                { id: 'day4', name: '第4天', description: '登录游戏', target: 1, rewards: [{ type: CurrencyType.GOLD, amount: 50000 }] },
                { id: 'day5', name: '第5天', description: '登录游戏', target: 1, rewards: [{ type: CurrencyType.DIAMOND, amount: 150 }] },
                { id: 'day6', name: '第6天', description: '登录游戏', target: 1, rewards: [{ type: CurrencyType.EXP_POTION, amount: 1000 }] },
                { id: 'day7', name: '第7天', description: '登录游戏', target: 1, rewards: [{ type: CurrencyType.SUMMON_TICKET_10, amount: 1 }] }
            ],
            sortOrder: 5
        });

        // 折扣活动
        this.addEvent({
            id: 'shop_discount',
            type: EventType.DISCOUNT,
            name: '商店折扣节',
            description: '限时商店商品8折优惠！',
            startTime: now,
            endTime: now + 3 * day,
            discount: 0.8,
            sortOrder: 6
        });
    }

    /**
     * 添加活动
     */
    public addEvent(config: GameEventConfig): void {
        this._events.set(config.id, config);
        
        // 初始化进度
        if (!this._progress.has(config.id)) {
            const progress: EventProgress = {
                eventId: config.id,
                taskProgress: {},
                claimedRewards: [],
                exchangeCount: {},
                points: 0,
                lastUpdateTime: Date.now()
            };
            
            // 初始化任务进度
            if (config.tasks) {
                for (const task of config.tasks) {
                    progress.taskProgress[task.id] = 0;
                }
            }
            
            this._progress.set(config.id, progress);
        }
    }

    /**
     * 获取活动状态
     */
    public getEventStatus(eventId: string): EventStatus {
        const event = this._events.get(eventId);
        if (!event) return EventStatus.ENDED;
        
        const now = Date.now();
        if (now < event.startTime) return EventStatus.NOT_STARTED;
        if (now > event.endTime) return EventStatus.ENDED;
        return EventStatus.ACTIVE;
    }

    /**
     * 获取所有活动
     */
    public getAllEvents(): GameEventConfig[] {
        return Array.from(this._events.values())
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    /**
     * 获取进行中的活动
     */
    public getActiveEvents(): GameEventConfig[] {
        return this.getAllEvents()
            .filter(e => this.getEventStatus(e.id) === EventStatus.ACTIVE);
    }

    /**
     * 获取指定类型的活动倍率
     */
    public getMultiplier(type: EventType): number {
        const events = this.getActiveEvents().filter(e => e.type === type);
        let multiplier = 1;
        for (const event of events) {
            if (event.multiplier) {
                multiplier *= event.multiplier;
            }
        }
        return multiplier;
    }

    /**
     * 获取折扣
     */
    public getDiscount(): number {
        const events = this.getActiveEvents().filter(e => e.type === EventType.DISCOUNT);
        let discount = 1;
        for (const event of events) {
            if (event.discount) {
                discount = Math.min(discount, event.discount);
            }
        }
        return discount;
    }

    /**
     * 更新任务进度
     */
    public updateTaskProgress(eventId: string, taskId: string, value: number, isAbsolute: boolean = false): void {
        const progress = this._progress.get(eventId);
        if (!progress) return;
        
        const event = this._events.get(eventId);
        if (!event || this.getEventStatus(eventId) !== EventStatus.ACTIVE) return;
        
        const task = event.tasks?.find(t => t.id === taskId);
        if (!task) return;
        
        const current = progress.taskProgress[taskId] || 0;
        const newValue = isAbsolute ? value : current + value;
        const clamped = Math.min(newValue, task.target);
        
        if (clamped > current) {
            progress.taskProgress[taskId] = clamped;
            progress.lastUpdateTime = Date.now();
            this.saveProgress();
            
            // 检查是否完成
            if (clamped >= task.target && current < task.target) {
                this.eventTarget.emit(EventSystem.EVENT_TASK_COMPLETE, {
                    eventId,
                    taskId,
                    task
                });
            }
        }
    }

    /**
     * 增加活动点数
     */
    public addEventPoints(eventId: string, points: number): void {
        const progress = this._progress.get(eventId);
        if (!progress) return;
        
        if (this.getEventStatus(eventId) !== EventStatus.ACTIVE) return;
        
        progress.points += points;
        progress.lastUpdateTime = Date.now();
        this.saveProgress();
    }

    /**
     * 领取任务奖励
     */
    public claimTaskReward(eventId: string, taskId: string): boolean {
        const progress = this._progress.get(eventId);
        if (!progress) return false;
        
        const event = this._events.get(eventId);
        if (!event) return false;
        
        const task = event.tasks?.find(t => t.id === taskId);
        if (!task) return false;
        
        // 检查是否完成
        const current = progress.taskProgress[taskId] || 0;
        if (current < task.target) {
            console.log('任务未完成');
            return false;
        }
        
        // 检查是否已领取
        if (progress.claimedRewards.includes(taskId)) {
            console.log('奖励已领取');
            return false;
        }
        
        // 发放奖励
        this.grantRewards(task.rewards, `${event.name}-${task.name}`);
        
        // 记录已领取
        progress.claimedRewards.push(taskId);
        progress.lastUpdateTime = Date.now();
        this.saveProgress();
        
        this.eventTarget.emit(EventSystem.EVENT_REWARD_CLAIMED, {
            eventId,
            taskId,
            rewards: task.rewards
        });
        
        return true;
    }

    /**
     * 兑换商品
     */
    public exchange(eventId: string, itemId: string): boolean {
        const progress = this._progress.get(eventId);
        if (!progress) return false;
        
        if (this.getEventStatus(eventId) !== EventStatus.ACTIVE) {
            console.log('活动未开启');
            return false;
        }
        
        const shop = this._exchangeShops.get(eventId);
        if (!shop) return false;
        
        const item = shop.find(i => i.id === itemId);
        if (!item) return false;
        
        // 检查限购
        const exchanged = progress.exchangeCount[itemId] || 0;
        if (exchanged >= item.limit) {
            console.log('已达兑换上限');
            return false;
        }
        
        // 检查并扣除货币
        if (item.costType === 'event_point') {
            if (progress.points < item.cost) {
                console.log('活动点数不足');
                return false;
            }
            progress.points -= item.cost;
        } else {
            const currencyManager = CurrencyManager.instance;
            if (!currencyManager || !currencyManager.hasCurrency(item.costType, item.cost)) {
                console.log('货币不足');
                return false;
            }
            currencyManager.spendCurrency(item.costType, item.cost, `兑换-${item.name}`);
        }
        
        // 发放奖励
        this.grantRewards([item.reward], `活动兑换-${item.name}`);
        
        // 记录兑换次数
        progress.exchangeCount[itemId] = exchanged + 1;
        progress.lastUpdateTime = Date.now();
        this.saveProgress();
        
        return true;
    }

    /**
     * 获取活动进度
     */
    public getProgress(eventId: string): EventProgress | null {
        return this._progress.get(eventId) || null;
    }

    /**
     * 获取兑换商店
     */
    public getExchangeShop(eventId: string): ExchangeItem[] {
        return this._exchangeShops.get(eventId) || [];
    }

    /**
     * 检查活动状态变化
     */
    private checkEventStatus(): void {
        const now = Date.now();
        
        for (const [eventId, event] of this._events) {
            const status = this.getEventStatus(eventId);
            const progress = this._progress.get(eventId);
            
            if (!progress) continue;
            
            // 检查活动开始
            if (status === EventStatus.ACTIVE && progress.lastUpdateTime < event.startTime) {
                this.eventTarget.emit(EventSystem.EVENT_STARTED, { eventId, event });
            }
            
            // 检查活动结束
            if (status === EventStatus.ENDED && progress.lastUpdateTime < event.endTime) {
                this.eventTarget.emit(EventSystem.EVENT_ENDED, { eventId, event });
            }
        }
    }

    /**
     * 发放奖励
     */
    private grantRewards(rewards: EventReward[], reason: string): void {
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager) return;
        
        for (const reward of rewards) {
            currencyManager.addCurrency(reward.type, reward.amount, reason);
        }
    }

    /**
     * 获取剩余时间文本
     */
    public getTimeLeftText(eventId: string): string {
        const event = this._events.get(eventId);
        if (!event) return '';
        
        const status = this.getEventStatus(eventId);
        if (status === EventStatus.ENDED) return '已结束';
        
        const now = Date.now();
        const target = status === EventStatus.NOT_STARTED ? event.startTime : event.endTime;
        const diff = target - now;
        
        if (diff <= 0) return status === EventStatus.NOT_STARTED ? '即将开始' : '已结束';
        
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        
        if (days > 0) return `${days}天${hours}小时`;
        if (hours > 0) return `${hours}小时${minutes}分`;
        return `${minutes}分钟`;
    }

    // 存档
    public saveProgress(): void {
        const data: { [key: string]: EventProgress } = {};
        for (const [eventId, progress] of this._progress) {
            data[eventId] = progress;
        }
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadProgress(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                for (const [eventId, progress] of Object.entries(data)) {
                    this._progress.set(eventId, progress as EventProgress);
                }
            } catch (e) {
                console.error('加载活动进度失败:', e);
            }
        }
    }

    onDestroy() {
        this.saveProgress();
        this.unscheduleAllCallbacks();
        if (EventSystem._instance === this) {
            EventSystem._instance = null;
        }
    }
}
