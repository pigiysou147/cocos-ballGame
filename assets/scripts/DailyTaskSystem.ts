import { _decorator, Component, Node, sys, EventTarget } from 'cc';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 任务类型
 */
export enum TaskType {
    DAILY = 'daily',             // 每日任务
    WEEKLY = 'weekly',           // 每周任务
    MAIN = 'main',               // 主线任务
    SIDE = 'side',               // 支线任务
    EVENT = 'event'              // 活动任务
}

/**
 * 任务触发条件
 */
export enum TaskTrigger {
    // 战斗
    BATTLE_WIN = 'battle_win',           // 战斗胜利
    ENEMY_KILL = 'enemy_kill',           // 击杀敌人
    BOSS_KILL = 'boss_kill',             // 击杀Boss
    USE_SKILL = 'use_skill',             // 使用技能
    COMBO_REACH = 'combo_reach',         // 达成连击
    
    // 关卡
    LEVEL_CLEAR = 'level_clear',         // 通关关卡
    LEVEL_SWEEP = 'level_sweep',         // 扫荡关卡
    DAILY_DUNGEON = 'daily_dungeon',     // 每日副本
    BOSS_RAID = 'boss_raid',             // 领主战
    
    // 养成
    CHARACTER_UPGRADE = 'character_upgrade',     // 角色升级
    EQUIPMENT_ENHANCE = 'equipment_enhance',     // 装备强化
    EQUIPMENT_EQUIP = 'equipment_equip',         // 穿戴装备
    
    // 召唤
    GACHA_PULL = 'gacha_pull',           // 抽卡
    FRIEND_GACHA = 'friend_gacha',       // 友情召唤
    
    // 社交
    FRIEND_ASSIST = 'friend_assist',     // 使用好友助战
    GUILD_DONATE = 'guild_donate',       // 公会捐献
    SEND_STAMINA = 'send_stamina',       // 赠送体力
    
    // 商店
    SHOP_PURCHASE = 'shop_purchase',     // 商店购买
    
    // 其他
    LOGIN = 'login',                     // 登录
    STAMINA_SPEND = 'stamina_spend',     // 消耗体力
    CLAIM_REWARD = 'claim_reward',       // 领取奖励
    COMPLETE_TASK = 'complete_task'      // 完成任务（用于活跃度）
}

/**
 * 任务奖励
 */
export interface TaskReward {
    type: CurrencyType;
    amount: number;
}

/**
 * 任务配置
 */
export interface TaskConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: TaskType;
    
    // 触发条件
    trigger: TaskTrigger;
    targetValue: number;
    
    // 奖励
    rewards: TaskReward[];
    
    // 活跃度奖励
    activityPoints: number;
    
    // 跳转
    jumpTo?: string;             // 跳转功能
    
    // 排序
    sortOrder: number;
}

/**
 * 任务进度
 */
export interface TaskProgress {
    taskId: string;
    currentValue: number;
    isCompleted: boolean;
    isRewardClaimed: boolean;
}

/**
 * 活跃度奖励配置
 */
export interface ActivityRewardConfig {
    requiredPoints: number;
    rewards: TaskReward[];
    isClaimed: boolean;
}

/**
 * 签到配置
 */
export interface SignInConfig {
    day: number;
    rewards: TaskReward[];
    isSpecial: boolean;          // 是否特殊奖励（如第7天）
}

/**
 * 每日任务系统 - 管理每日/每周任务和签到
 * Daily Task System - Daily/Weekly tasks and sign-in management
 */
@ccclass('DailyTaskSystem')
export class DailyTaskSystem extends Component {
    private static _instance: DailyTaskSystem | null = null;

    // 任务配置
    private _dailyTasks: Map<string, TaskConfig> = new Map();
    private _weeklyTasks: Map<string, TaskConfig> = new Map();
    
    // 任务进度
    private _dailyProgress: Map<string, TaskProgress> = new Map();
    private _weeklyProgress: Map<string, TaskProgress> = new Map();
    
    // 活跃度
    private _dailyActivityPoints: number = 0;
    private _activityRewards: ActivityRewardConfig[] = [];
    
    // 签到
    private _signInDays: number = 0;            // 当月累计签到天数
    private _lastSignInDate: number = 0;        // 上次签到日期
    private _signInRewards: SignInConfig[] = [];
    
    // 重置时间
    private _lastDailyReset: number = 0;
    private _lastWeeklyReset: number = 0;
    
    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_TASK_COMPLETED = 'task_completed';
    public static readonly EVENT_TASK_REWARD_CLAIMED = 'task_reward_claimed';
    public static readonly EVENT_ACTIVITY_REWARD_CLAIMED = 'activity_reward_claimed';
    public static readonly EVENT_SIGN_IN_SUCCESS = 'sign_in_success';
    public static readonly EVENT_DAILY_RESET = 'daily_reset';
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_daily_task_data';

    public static get instance(): DailyTaskSystem | null {
        return DailyTaskSystem._instance;
    }

    onLoad() {
        if (DailyTaskSystem._instance) {
            this.node.destroy();
            return;
        }
        DailyTaskSystem._instance = this;
        
        // 初始化
        this.initDailyTasks();
        this.initWeeklyTasks();
        this.initActivityRewards();
        this.initSignInRewards();
        
        // 加载存档
        this.loadData();
        
        // 检查重置
        this.checkReset();
    }

    start() {
        // 每小时检查重置
        this.schedule(this.checkReset, 3600);
    }

    /**
     * 初始化每日任务
     */
    private initDailyTasks(): void {
        const tasks: TaskConfig[] = [
            {
                id: 'daily_login',
                name: '每日登录',
                description: '今日登录游戏',
                icon: 'icon_task_login',
                type: TaskType.DAILY,
                trigger: TaskTrigger.LOGIN,
                targetValue: 1,
                rewards: [{ type: CurrencyType.STAMINA, amount: 20 }],
                activityPoints: 10,
                sortOrder: 1
            },
            {
                id: 'daily_battle_3',
                name: '战斗达人',
                description: '完成3次战斗',
                icon: 'icon_task_battle',
                type: TaskType.DAILY,
                trigger: TaskTrigger.BATTLE_WIN,
                targetValue: 3,
                rewards: [{ type: CurrencyType.GOLD, amount: 5000 }],
                activityPoints: 10,
                jumpTo: 'level_select',
                sortOrder: 2
            },
            {
                id: 'daily_battle_10',
                name: '战无不胜',
                description: '完成10次战斗',
                icon: 'icon_task_battle',
                type: TaskType.DAILY,
                trigger: TaskTrigger.BATTLE_WIN,
                targetValue: 10,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 20 }],
                activityPoints: 20,
                jumpTo: 'level_select',
                sortOrder: 3
            },
            {
                id: 'daily_stamina_60',
                name: '体力消耗',
                description: '消耗60点体力',
                icon: 'icon_task_stamina',
                type: TaskType.DAILY,
                trigger: TaskTrigger.STAMINA_SPEND,
                targetValue: 60,
                rewards: [{ type: CurrencyType.EXP_POTION, amount: 200 }],
                activityPoints: 15,
                sortOrder: 4
            },
            {
                id: 'daily_stamina_120',
                name: '精力充沛',
                description: '消耗120点体力',
                icon: 'icon_task_stamina',
                type: TaskType.DAILY,
                trigger: TaskTrigger.STAMINA_SPEND,
                targetValue: 120,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 30 }],
                activityPoints: 25,
                sortOrder: 5
            },
            {
                id: 'daily_upgrade',
                name: '角色培养',
                description: '进行1次角色升级',
                icon: 'icon_task_upgrade',
                type: TaskType.DAILY,
                trigger: TaskTrigger.CHARACTER_UPGRADE,
                targetValue: 1,
                rewards: [{ type: CurrencyType.EXP_POTION, amount: 100 }],
                activityPoints: 10,
                jumpTo: 'character_panel',
                sortOrder: 6
            },
            {
                id: 'daily_enhance',
                name: '装备强化',
                description: '进行1次装备强化',
                icon: 'icon_task_enhance',
                type: TaskType.DAILY,
                trigger: TaskTrigger.EQUIPMENT_ENHANCE,
                targetValue: 1,
                rewards: [{ type: CurrencyType.ENHANCE_STONE, amount: 10 }],
                activityPoints: 10,
                jumpTo: 'inventory_panel',
                sortOrder: 7
            },
            {
                id: 'daily_gacha',
                name: '召唤一次',
                description: '进行1次召唤',
                icon: 'icon_task_gacha',
                type: TaskType.DAILY,
                trigger: TaskTrigger.GACHA_PULL,
                targetValue: 1,
                rewards: [{ type: CurrencyType.SUMMON_TICKET, amount: 1 }],
                activityPoints: 10,
                jumpTo: 'gacha_panel',
                sortOrder: 8
            },
            {
                id: 'daily_boss',
                name: '领主挑战',
                description: '挑战1次领主战',
                icon: 'icon_task_boss',
                type: TaskType.DAILY,
                trigger: TaskTrigger.BOSS_RAID,
                targetValue: 1,
                rewards: [{ type: CurrencyType.RAID_TICKET, amount: 1 }],
                activityPoints: 20,
                jumpTo: 'boss_raid',
                sortOrder: 9
            },
            {
                id: 'daily_shop',
                name: '商店购物',
                description: '在商店购买1次',
                icon: 'icon_task_shop',
                type: TaskType.DAILY,
                trigger: TaskTrigger.SHOP_PURCHASE,
                targetValue: 1,
                rewards: [{ type: CurrencyType.GOLD, amount: 3000 }],
                activityPoints: 10,
                jumpTo: 'shop',
                sortOrder: 10
            }
        ];

        for (const task of tasks) {
            this._dailyTasks.set(task.id, task);
        }
    }

    /**
     * 初始化每周任务
     */
    private initWeeklyTasks(): void {
        const tasks: TaskConfig[] = [
            {
                id: 'weekly_battle_30',
                name: '周战斗达人',
                description: '本周完成30次战斗',
                icon: 'icon_task_battle',
                type: TaskType.WEEKLY,
                trigger: TaskTrigger.BATTLE_WIN,
                targetValue: 30,
                rewards: [
                    { type: CurrencyType.DIAMOND, amount: 100 },
                    { type: CurrencyType.SUMMON_TICKET, amount: 1 }
                ],
                activityPoints: 0,
                sortOrder: 1
            },
            {
                id: 'weekly_boss_5',
                name: '周领主挑战',
                description: '本周挑战5次领主战',
                icon: 'icon_task_boss',
                type: TaskType.WEEKLY,
                trigger: TaskTrigger.BOSS_RAID,
                targetValue: 5,
                rewards: [
                    { type: CurrencyType.DIAMOND, amount: 80 },
                    { type: CurrencyType.RAID_TICKET, amount: 2 }
                ],
                activityPoints: 0,
                sortOrder: 2
            },
            {
                id: 'weekly_gacha_10',
                name: '周召唤达人',
                description: '本周进行10次召唤',
                icon: 'icon_task_gacha',
                type: TaskType.WEEKLY,
                trigger: TaskTrigger.GACHA_PULL,
                targetValue: 10,
                rewards: [{ type: CurrencyType.SUMMON_TICKET, amount: 3 }],
                activityPoints: 0,
                sortOrder: 3
            },
            {
                id: 'weekly_upgrade_10',
                name: '周角色培养',
                description: '本周进行10次角色升级',
                icon: 'icon_task_upgrade',
                type: TaskType.WEEKLY,
                trigger: TaskTrigger.CHARACTER_UPGRADE,
                targetValue: 10,
                rewards: [{ type: CurrencyType.EXP_POTION, amount: 1000 }],
                activityPoints: 0,
                sortOrder: 4
            },
            {
                id: 'weekly_enhance_10',
                name: '周装备强化',
                description: '本周进行10次装备强化',
                icon: 'icon_task_enhance',
                type: TaskType.WEEKLY,
                trigger: TaskTrigger.EQUIPMENT_ENHANCE,
                targetValue: 10,
                rewards: [{ type: CurrencyType.ENHANCE_STONE, amount: 50 }],
                activityPoints: 0,
                sortOrder: 5
            },
            {
                id: 'weekly_login_7',
                name: '周活跃玩家',
                description: '本周登录7天',
                icon: 'icon_task_login',
                type: TaskType.WEEKLY,
                trigger: TaskTrigger.LOGIN,
                targetValue: 7,
                rewards: [
                    { type: CurrencyType.DIAMOND, amount: 200 },
                    { type: CurrencyType.SUMMON_TICKET_10, amount: 1 }
                ],
                activityPoints: 0,
                sortOrder: 6
            }
        ];

        for (const task of tasks) {
            this._weeklyTasks.set(task.id, task);
        }
    }

    /**
     * 初始化活跃度奖励
     */
    private initActivityRewards(): void {
        this._activityRewards = [
            {
                requiredPoints: 30,
                rewards: [{ type: CurrencyType.GOLD, amount: 5000 }],
                isClaimed: false
            },
            {
                requiredPoints: 60,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 20 }],
                isClaimed: false
            },
            {
                requiredPoints: 90,
                rewards: [{ type: CurrencyType.STAMINA, amount: 30 }],
                isClaimed: false
            },
            {
                requiredPoints: 120,
                rewards: [
                    { type: CurrencyType.DIAMOND, amount: 50 },
                    { type: CurrencyType.SUMMON_TICKET, amount: 1 }
                ],
                isClaimed: false
            }
        ];
    }

    /**
     * 初始化签到奖励
     */
    private initSignInRewards(): void {
        this._signInRewards = [
            { day: 1, rewards: [{ type: CurrencyType.GOLD, amount: 10000 }], isSpecial: false },
            { day: 2, rewards: [{ type: CurrencyType.STAMINA, amount: 60 }], isSpecial: false },
            { day: 3, rewards: [{ type: CurrencyType.EXP_POTION, amount: 500 }], isSpecial: false },
            { day: 4, rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }], isSpecial: false },
            { day: 5, rewards: [{ type: CurrencyType.ENHANCE_STONE, amount: 30 }], isSpecial: false },
            { day: 6, rewards: [{ type: CurrencyType.BREAKTHROUGH_STONE, amount: 5 }], isSpecial: false },
            { day: 7, rewards: [
                { type: CurrencyType.DIAMOND, amount: 100 },
                { type: CurrencyType.SUMMON_TICKET, amount: 2 }
            ], isSpecial: true },
            { day: 14, rewards: [
                { type: CurrencyType.DIAMOND, amount: 200 },
                { type: CurrencyType.SUMMON_TICKET, amount: 3 }
            ], isSpecial: true },
            { day: 21, rewards: [
                { type: CurrencyType.DIAMOND, amount: 300 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 1 }
            ], isSpecial: true },
            { day: 28, rewards: [
                { type: CurrencyType.DIAMOND, amount: 500 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 1 },
                { type: CurrencyType.AWAKEN_CRYSTAL, amount: 5 }
            ], isSpecial: true }
        ];
    }

    /**
     * 更新任务进度
     */
    public updateProgress(trigger: TaskTrigger, value: number = 1): void {
        // 更新每日任务
        this.updateTaskProgress(this._dailyTasks, this._dailyProgress, trigger, value, true);
        
        // 更新每周任务
        this.updateTaskProgress(this._weeklyTasks, this._weeklyProgress, trigger, value, false);
        
        this.saveData();
    }

    /**
     * 更新指定任务列表的进度
     */
    private updateTaskProgress(
        tasks: Map<string, TaskConfig>,
        progress: Map<string, TaskProgress>,
        trigger: TaskTrigger,
        value: number,
        addActivity: boolean
    ): void {
        for (const [id, config] of tasks) {
            if (config.trigger !== trigger) continue;

            let taskProgress = progress.get(id);
            if (!taskProgress) {
                taskProgress = {
                    taskId: id,
                    currentValue: 0,
                    isCompleted: false,
                    isRewardClaimed: false
                };
                progress.set(id, taskProgress);
            }

            if (taskProgress.isCompleted) continue;

            taskProgress.currentValue += value;

            if (taskProgress.currentValue >= config.targetValue) {
                taskProgress.isCompleted = true;
                
                // 添加活跃度
                if (addActivity) {
                    this._dailyActivityPoints += config.activityPoints;
                }

                console.log(`任务完成: ${config.name}`);
                
                this.events.emit(DailyTaskSystem.EVENT_TASK_COMPLETED, {
                    taskId: id,
                    config,
                    progress: taskProgress
                });
            }
        }
    }

    /**
     * 领取任务奖励
     */
    public claimTaskReward(taskId: string): boolean {
        // 先检查每日任务
        let config = this._dailyTasks.get(taskId);
        let progress = this._dailyProgress.get(taskId);

        // 再检查每周任务
        if (!config) {
            config = this._weeklyTasks.get(taskId);
            progress = this._weeklyProgress.get(taskId);
        }

        if (!config || !progress) return false;
        if (!progress.isCompleted || progress.isRewardClaimed) return false;

        // 发放奖励
        const currencyManager = CurrencyManager.instance;
        if (currencyManager) {
            for (const reward of config.rewards) {
                currencyManager.addCurrency(reward.type, reward.amount, `任务奖励: ${config.name}`);
            }
        }

        progress.isRewardClaimed = true;
        this.saveData();

        this.events.emit(DailyTaskSystem.EVENT_TASK_REWARD_CLAIMED, {
            taskId,
            config,
            progress
        });

        return true;
    }

    /**
     * 领取活跃度奖励
     */
    public claimActivityReward(index: number): boolean {
        if (index < 0 || index >= this._activityRewards.length) return false;

        const reward = this._activityRewards[index];
        if (reward.isClaimed) return false;
        if (this._dailyActivityPoints < reward.requiredPoints) return false;

        // 发放奖励
        const currencyManager = CurrencyManager.instance;
        if (currencyManager) {
            for (const r of reward.rewards) {
                currencyManager.addCurrency(r.type, r.amount, `活跃度奖励`);
            }
        }

        reward.isClaimed = true;
        this.saveData();

        this.events.emit(DailyTaskSystem.EVENT_ACTIVITY_REWARD_CLAIMED, {
            index,
            reward
        });

        return true;
    }

    /**
     * 签到
     */
    public signIn(): boolean {
        const today = this.getDateStart(Date.now());
        
        // 检查是否已签到
        if (this._lastSignInDate >= today) {
            console.log('今日已签到');
            return false;
        }

        // 检查是否跨月
        const lastMonth = new Date(this._lastSignInDate).getMonth();
        const currentMonth = new Date().getMonth();
        if (lastMonth !== currentMonth) {
            this._signInDays = 0;
        }

        // 签到
        this._signInDays++;
        this._lastSignInDate = today;

        // 获取签到奖励
        const reward = this.getSignInReward(this._signInDays);
        if (reward) {
            const currencyManager = CurrencyManager.instance;
            if (currencyManager) {
                for (const r of reward.rewards) {
                    currencyManager.addCurrency(r.type, r.amount, `签到奖励第${this._signInDays}天`);
                }
            }
        }

        // 同时触发登录任务
        this.updateProgress(TaskTrigger.LOGIN, 1);

        this.saveData();

        this.events.emit(DailyTaskSystem.EVENT_SIGN_IN_SUCCESS, {
            day: this._signInDays,
            reward
        });

        return true;
    }

    /**
     * 获取签到奖励
     */
    private getSignInReward(day: number): SignInConfig | null {
        // 优先查找特殊日奖励
        const special = this._signInRewards.find(r => r.day === day);
        if (special) return special;

        // 返回基础奖励（循环使用前7天的奖励）
        const baseDay = ((day - 1) % 7) + 1;
        return this._signInRewards.find(r => r.day === baseDay) || null;
    }

    /**
     * 检查并执行重置
     */
    private checkReset(): void {
        const now = Date.now();
        const today = this.getDateStart(now);
        const thisWeek = this.getWeekStart(now);

        // 每日重置
        if (this._lastDailyReset < today) {
            this.resetDaily();
            this._lastDailyReset = today;
        }

        // 每周重置
        if (this._lastWeeklyReset < thisWeek) {
            this.resetWeekly();
            this._lastWeeklyReset = thisWeek;
        }

        this.saveData();
    }

    /**
     * 每日重置
     */
    private resetDaily(): void {
        this._dailyProgress.clear();
        this._dailyActivityPoints = 0;
        
        // 重置活跃度奖励
        for (const reward of this._activityRewards) {
            reward.isClaimed = false;
        }

        console.log('每日任务已重置');
        this.events.emit(DailyTaskSystem.EVENT_DAILY_RESET);
    }

    /**
     * 每周重置
     */
    private resetWeekly(): void {
        this._weeklyProgress.clear();
        console.log('每周任务已重置');
    }

    // ========== 时间计算 ==========

    private getDateStart(timestamp: number): number {
        const date = new Date(timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    private getWeekStart(timestamp: number): number {
        const date = new Date(timestamp);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    // ========== 查询方法 ==========

    /** 获取每日任务列表 */
    public getDailyTasks(): { config: TaskConfig; progress: TaskProgress }[] {
        return Array.from(this._dailyTasks.values())
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(config => ({
                config,
                progress: this._dailyProgress.get(config.id) || {
                    taskId: config.id,
                    currentValue: 0,
                    isCompleted: false,
                    isRewardClaimed: false
                }
            }));
    }

    /** 获取每周任务列表 */
    public getWeeklyTasks(): { config: TaskConfig; progress: TaskProgress }[] {
        return Array.from(this._weeklyTasks.values())
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(config => ({
                config,
                progress: this._weeklyProgress.get(config.id) || {
                    taskId: config.id,
                    currentValue: 0,
                    isCompleted: false,
                    isRewardClaimed: false
                }
            }));
    }

    /** 获取当前活跃度 */
    public getActivityPoints(): number {
        return this._dailyActivityPoints;
    }

    /** 获取活跃度奖励列表 */
    public getActivityRewards(): ActivityRewardConfig[] {
        return [...this._activityRewards];
    }

    /** 获取签到天数 */
    public getSignInDays(): number {
        return this._signInDays;
    }

    /** 检查今日是否已签到 */
    public hasSignedInToday(): boolean {
        const today = this.getDateStart(Date.now());
        return this._lastSignInDate >= today;
    }

    /** 获取签到奖励预览 */
    public getSignInRewards(): SignInConfig[] {
        return [...this._signInRewards];
    }

    /** 获取待领取奖励数 */
    public getPendingRewardCount(): number {
        let count = 0;

        // 每日任务
        for (const [id, progress] of this._dailyProgress) {
            if (progress.isCompleted && !progress.isRewardClaimed) count++;
        }

        // 每周任务
        for (const [id, progress] of this._weeklyProgress) {
            if (progress.isCompleted && !progress.isRewardClaimed) count++;
        }

        // 活跃度奖励
        for (const reward of this._activityRewards) {
            if (!reward.isClaimed && this._dailyActivityPoints >= reward.requiredPoints) {
                count++;
            }
        }

        // 签到
        if (!this.hasSignedInToday()) count++;

        return count;
    }

    // ========== 便捷方法 ==========

    /** 战斗胜利 */
    public onBattleWin(): void {
        this.updateProgress(TaskTrigger.BATTLE_WIN, 1);
    }

    /** 消耗体力 */
    public onStaminaSpend(amount: number): void {
        this.updateProgress(TaskTrigger.STAMINA_SPEND, amount);
    }

    /** 角色升级 */
    public onCharacterUpgrade(): void {
        this.updateProgress(TaskTrigger.CHARACTER_UPGRADE, 1);
    }

    /** 装备强化 */
    public onEquipmentEnhance(): void {
        this.updateProgress(TaskTrigger.EQUIPMENT_ENHANCE, 1);
    }

    /** 抽卡 */
    public onGachaPull(count: number = 1): void {
        this.updateProgress(TaskTrigger.GACHA_PULL, count);
    }

    /** 领主战 */
    public onBossRaid(): void {
        this.updateProgress(TaskTrigger.BOSS_RAID, 1);
    }

    /** 商店购买 */
    public onShopPurchase(): void {
        this.updateProgress(TaskTrigger.SHOP_PURCHASE, 1);
    }

    // ========== 存档 ==========

    public saveData(): void {
        const data: any = {
            dailyProgress: {},
            weeklyProgress: {},
            dailyActivityPoints: this._dailyActivityPoints,
            activityRewardsClaimed: this._activityRewards.map(r => r.isClaimed),
            signInDays: this._signInDays,
            lastSignInDate: this._lastSignInDate,
            lastDailyReset: this._lastDailyReset,
            lastWeeklyReset: this._lastWeeklyReset
        };

        for (const [id, progress] of this._dailyProgress) {
            data.dailyProgress[id] = progress;
        }

        for (const [id, progress] of this._weeklyProgress) {
            data.weeklyProgress[id] = progress;
        }

        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (!saved) return;

        try {
            const data = JSON.parse(saved);

            if (data.dailyProgress) {
                for (const [id, progress] of Object.entries(data.dailyProgress)) {
                    this._dailyProgress.set(id, progress as TaskProgress);
                }
            }

            if (data.weeklyProgress) {
                for (const [id, progress] of Object.entries(data.weeklyProgress)) {
                    this._weeklyProgress.set(id, progress as TaskProgress);
                }
            }

            this._dailyActivityPoints = data.dailyActivityPoints || 0;

            if (data.activityRewardsClaimed) {
                for (let i = 0; i < data.activityRewardsClaimed.length && i < this._activityRewards.length; i++) {
                    this._activityRewards[i].isClaimed = data.activityRewardsClaimed[i];
                }
            }

            this._signInDays = data.signInDays || 0;
            this._lastSignInDate = data.lastSignInDate || 0;
            this._lastDailyReset = data.lastDailyReset || 0;
            this._lastWeeklyReset = data.lastWeeklyReset || 0;

            console.log('每日任务数据已加载');
        } catch (e) {
            console.error('加载每日任务数据失败:', e);
        }
    }

    onDestroy() {
        this.saveData();
        this.unschedule(this.checkReset);

        if (DailyTaskSystem._instance === this) {
            DailyTaskSystem._instance = null;
        }
    }
}
