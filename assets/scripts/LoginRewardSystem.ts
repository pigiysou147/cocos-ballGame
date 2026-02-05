import { _decorator, Component, Node, sys, EventTarget } from 'cc';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 奖励项
 */
export interface RewardItem {
    type: CurrencyType;
    amount: number;
}

/**
 * 每日登录奖励配置
 */
export interface DailyLoginReward {
    day: number;                    // 第几天
    rewards: RewardItem[];          // 奖励列表
    isSpecial: boolean;             // 是否特殊奖励日
    vipBonus?: number;              // VIP额外倍数
}

/**
 * 累计登录奖励配置
 */
export interface AccumulativeReward {
    totalDays: number;              // 累计天数
    rewards: RewardItem[];
    isMilestone: boolean;           // 是否里程碑
}

/**
 * 回归奖励配置
 */
export interface ReturnReward {
    absentDays: number;             // 离开天数要求
    rewards: RewardItem[];
}

/**
 * 登录数据
 */
export interface LoginData {
    totalLoginDays: number;         // 累计登录天数
    consecutiveDays: number;        // 连续登录天数
    lastLoginDate: number;          // 上次登录日期
    currentMonthDays: number;       // 当月已登录天数
    monthlyRewardsClaimed: number[];// 已领取的月度奖励天数
    accumulativeRewardsClaimed: number[]; // 已领取的累计奖励
    isReturnPlayer: boolean;        // 是否回归玩家
    returnRewardClaimed: boolean;   // 回归奖励是否已领取
}

/**
 * 登录奖励系统
 * Login Reward System - Daily and accumulative login rewards
 */
@ccclass('LoginRewardSystem')
export class LoginRewardSystem extends Component {
    private static _instance: LoginRewardSystem | null = null;

    // 登录数据
    private _data: LoginData = {
        totalLoginDays: 0,
        consecutiveDays: 0,
        lastLoginDate: 0,
        currentMonthDays: 0,
        monthlyRewardsClaimed: [],
        accumulativeRewardsClaimed: [],
        isReturnPlayer: false,
        returnRewardClaimed: false
    };

    // 每日登录奖励配置（30天循环）
    private _dailyRewards: DailyLoginReward[] = [];
    
    // 累计登录奖励
    private _accumulativeRewards: AccumulativeReward[] = [];
    
    // 回归奖励
    private _returnRewards: ReturnReward[] = [];

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_LOGIN_REWARD_AVAILABLE = 'login_reward_available';
    public static readonly EVENT_REWARD_CLAIMED = 'reward_claimed';
    public static readonly EVENT_MILESTONE_REACHED = 'milestone_reached';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_login_data';

    // 回归判定天数
    private readonly RETURN_PLAYER_DAYS = 7;

    public static get instance(): LoginRewardSystem | null {
        return LoginRewardSystem._instance;
    }

    public get data(): LoginData {
        return { ...this._data };
    }

    onLoad() {
        if (LoginRewardSystem._instance) {
            this.node.destroy();
            return;
        }
        LoginRewardSystem._instance = this;

        this.initRewards();
        this.loadData();
        this.checkLogin();
    }

    /**
     * 初始化奖励配置
     */
    private initRewards(): void {
        // 每日登录奖励（30天）
        this._dailyRewards = [
            { day: 1, rewards: [{ type: CurrencyType.GOLD, amount: 10000 }], isSpecial: false },
            { day: 2, rewards: [{ type: CurrencyType.STAMINA, amount: 60 }], isSpecial: false },
            { day: 3, rewards: [{ type: CurrencyType.EXP_POTION, amount: 500 }], isSpecial: false },
            { day: 4, rewards: [{ type: CurrencyType.DIAMOND, amount: 30 }], isSpecial: false },
            { day: 5, rewards: [{ type: CurrencyType.ENHANCE_STONE, amount: 20 }], isSpecial: false },
            { day: 6, rewards: [{ type: CurrencyType.GOLD, amount: 20000 }], isSpecial: false },
            { day: 7, rewards: [
                { type: CurrencyType.DIAMOND, amount: 100 },
                { type: CurrencyType.SUMMON_TICKET, amount: 1 }
            ], isSpecial: true, vipBonus: 1.5 },
            { day: 8, rewards: [{ type: CurrencyType.STAMINA, amount: 80 }], isSpecial: false },
            { day: 9, rewards: [{ type: CurrencyType.EXP_POTION, amount: 800 }], isSpecial: false },
            { day: 10, rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }], isSpecial: false },
            { day: 11, rewards: [{ type: CurrencyType.BREAKTHROUGH_STONE, amount: 3 }], isSpecial: false },
            { day: 12, rewards: [{ type: CurrencyType.GOLD, amount: 30000 }], isSpecial: false },
            { day: 13, rewards: [{ type: CurrencyType.ENHANCE_STONE, amount: 30 }], isSpecial: false },
            { day: 14, rewards: [
                { type: CurrencyType.DIAMOND, amount: 150 },
                { type: CurrencyType.SUMMON_TICKET, amount: 2 }
            ], isSpecial: true, vipBonus: 1.5 },
            { day: 15, rewards: [{ type: CurrencyType.STAMINA, amount: 100 }], isSpecial: false },
            { day: 16, rewards: [{ type: CurrencyType.EXP_POTION, amount: 1000 }], isSpecial: false },
            { day: 17, rewards: [{ type: CurrencyType.DIAMOND, amount: 60 }], isSpecial: false },
            { day: 18, rewards: [{ type: CurrencyType.GOLD, amount: 40000 }], isSpecial: false },
            { day: 19, rewards: [{ type: CurrencyType.BREAKTHROUGH_STONE, amount: 5 }], isSpecial: false },
            { day: 20, rewards: [{ type: CurrencyType.ENHANCE_STONE, amount: 40 }], isSpecial: false },
            { day: 21, rewards: [
                { type: CurrencyType.DIAMOND, amount: 200 },
                { type: CurrencyType.SUMMON_TICKET, amount: 3 }
            ], isSpecial: true, vipBonus: 1.5 },
            { day: 22, rewards: [{ type: CurrencyType.STAMINA, amount: 120 }], isSpecial: false },
            { day: 23, rewards: [{ type: CurrencyType.EXP_POTION, amount: 1500 }], isSpecial: false },
            { day: 24, rewards: [{ type: CurrencyType.DIAMOND, amount: 80 }], isSpecial: false },
            { day: 25, rewards: [{ type: CurrencyType.GOLD, amount: 50000 }], isSpecial: false },
            { day: 26, rewards: [{ type: CurrencyType.AWAKEN_CRYSTAL, amount: 3 }], isSpecial: false },
            { day: 27, rewards: [{ type: CurrencyType.ENHANCE_STONE, amount: 50 }], isSpecial: false },
            { day: 28, rewards: [
                { type: CurrencyType.DIAMOND, amount: 300 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 1 }
            ], isSpecial: true, vipBonus: 2 },
            { day: 29, rewards: [{ type: CurrencyType.BREAKTHROUGH_STONE, amount: 10 }], isSpecial: false },
            { day: 30, rewards: [
                { type: CurrencyType.DIAMOND, amount: 500 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 1 },
                { type: CurrencyType.AWAKEN_CRYSTAL, amount: 5 }
            ], isSpecial: true, vipBonus: 2 }
        ];

        // 累计登录奖励
        this._accumulativeRewards = [
            { totalDays: 3, rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }], isMilestone: false },
            { totalDays: 7, rewards: [
                { type: CurrencyType.DIAMOND, amount: 100 },
                { type: CurrencyType.SUMMON_TICKET, amount: 1 }
            ], isMilestone: true },
            { totalDays: 14, rewards: [
                { type: CurrencyType.DIAMOND, amount: 200 },
                { type: CurrencyType.SUMMON_TICKET, amount: 2 }
            ], isMilestone: false },
            { totalDays: 30, rewards: [
                { type: CurrencyType.DIAMOND, amount: 500 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 1 }
            ], isMilestone: true },
            { totalDays: 60, rewards: [
                { type: CurrencyType.DIAMOND, amount: 800 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 1 },
                { type: CurrencyType.AWAKEN_CRYSTAL, amount: 10 }
            ], isMilestone: true },
            { totalDays: 90, rewards: [
                { type: CurrencyType.DIAMOND, amount: 1000 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 2 }
            ], isMilestone: true },
            { totalDays: 180, rewards: [
                { type: CurrencyType.DIAMOND, amount: 2000 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 3 }
            ], isMilestone: true },
            { totalDays: 365, rewards: [
                { type: CurrencyType.DIAMOND, amount: 5000 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 5 }
            ], isMilestone: true }
        ];

        // 回归奖励
        this._returnRewards = [
            { absentDays: 7, rewards: [
                { type: CurrencyType.DIAMOND, amount: 300 },
                { type: CurrencyType.STAMINA, amount: 200 }
            ]},
            { absentDays: 14, rewards: [
                { type: CurrencyType.DIAMOND, amount: 500 },
                { type: CurrencyType.SUMMON_TICKET, amount: 5 },
                { type: CurrencyType.STAMINA, amount: 300 }
            ]},
            { absentDays: 30, rewards: [
                { type: CurrencyType.DIAMOND, amount: 1000 },
                { type: CurrencyType.SUMMON_TICKET_10, amount: 1 },
                { type: CurrencyType.STAMINA, amount: 500 }
            ]}
        ];
    }

    /**
     * 检查登录
     */
    public checkLogin(): void {
        const now = Date.now();
        const today = this.getDateStart(now);
        const lastLogin = this._data.lastLoginDate;

        // 首次登录
        if (lastLogin === 0) {
            this._data.totalLoginDays = 1;
            this._data.consecutiveDays = 1;
            this._data.currentMonthDays = 1;
            this._data.lastLoginDate = today;
            this.saveData();
            
            this.events.emit(LoginRewardSystem.EVENT_LOGIN_REWARD_AVAILABLE, {
                day: 1,
                isNewDay: true
            });
            return;
        }

        // 今日已登录
        if (lastLogin >= today) {
            return;
        }

        // 计算离开天数
        const daysPassed = Math.floor((today - lastLogin) / (24 * 60 * 60 * 1000));

        // 检查是否回归玩家
        if (daysPassed >= this.RETURN_PLAYER_DAYS && !this._data.returnRewardClaimed) {
            this._data.isReturnPlayer = true;
        }

        // 检查是否跨月
        const lastMonth = new Date(lastLogin).getMonth();
        const currentMonth = new Date(now).getMonth();
        if (lastMonth !== currentMonth) {
            this._data.currentMonthDays = 0;
            this._data.monthlyRewardsClaimed = [];
        }

        // 更新连续登录
        if (daysPassed === 1) {
            this._data.consecutiveDays++;
        } else {
            this._data.consecutiveDays = 1;
        }

        // 更新登录数据
        this._data.totalLoginDays++;
        this._data.currentMonthDays++;
        this._data.lastLoginDate = today;

        this.saveData();

        // 发送事件
        this.events.emit(LoginRewardSystem.EVENT_LOGIN_REWARD_AVAILABLE, {
            day: this._data.currentMonthDays,
            consecutiveDays: this._data.consecutiveDays,
            totalDays: this._data.totalLoginDays,
            isReturnPlayer: this._data.isReturnPlayer
        });

        // 检查累计登录里程碑
        this.checkMilestones();
    }

    /**
     * 检查里程碑
     */
    private checkMilestones(): void {
        for (const reward of this._accumulativeRewards) {
            if (this._data.totalLoginDays >= reward.totalDays &&
                !this._data.accumulativeRewardsClaimed.includes(reward.totalDays)) {
                
                if (reward.isMilestone) {
                    this.events.emit(LoginRewardSystem.EVENT_MILESTONE_REACHED, {
                        totalDays: reward.totalDays,
                        rewards: reward.rewards
                    });
                }
            }
        }
    }

    /**
     * 领取每日登录奖励
     */
    public claimDailyReward(): boolean {
        const day = this._data.currentMonthDays;
        
        // 检查是否已领取
        if (this._data.monthlyRewardsClaimed.includes(day)) {
            console.log('今日奖励已领取');
            return false;
        }

        // 获取奖励配置
        const rewardConfig = this.getDailyRewardConfig(day);
        if (!rewardConfig) {
            console.log('奖励配置不存在');
            return false;
        }

        // 发放奖励
        this.grantRewards(rewardConfig.rewards, `第${day}天登录奖励`);

        // 记录已领取
        this._data.monthlyRewardsClaimed.push(day);
        this.saveData();

        // 发送事件
        this.events.emit(LoginRewardSystem.EVENT_REWARD_CLAIMED, {
            type: 'daily',
            day,
            rewards: rewardConfig.rewards
        });

        return true;
    }

    /**
     * 领取累计登录奖励
     */
    public claimAccumulativeReward(totalDays: number): boolean {
        // 检查是否达到要求
        if (this._data.totalLoginDays < totalDays) {
            console.log('累计登录天数不足');
            return false;
        }

        // 检查是否已领取
        if (this._data.accumulativeRewardsClaimed.includes(totalDays)) {
            console.log('该累计奖励已领取');
            return false;
        }

        // 获取奖励配置
        const rewardConfig = this._accumulativeRewards.find(r => r.totalDays === totalDays);
        if (!rewardConfig) {
            console.log('奖励配置不存在');
            return false;
        }

        // 发放奖励
        this.grantRewards(rewardConfig.rewards, `累计${totalDays}天登录奖励`);

        // 记录已领取
        this._data.accumulativeRewardsClaimed.push(totalDays);
        this.saveData();

        // 发送事件
        this.events.emit(LoginRewardSystem.EVENT_REWARD_CLAIMED, {
            type: 'accumulative',
            totalDays,
            rewards: rewardConfig.rewards
        });

        return true;
    }

    /**
     * 领取回归奖励
     */
    public claimReturnReward(): boolean {
        if (!this._data.isReturnPlayer) {
            console.log('不是回归玩家');
            return false;
        }

        if (this._data.returnRewardClaimed) {
            console.log('回归奖励已领取');
            return false;
        }

        // 计算离开天数
        const now = Date.now();
        const daysPassed = Math.floor((now - this._data.lastLoginDate) / (24 * 60 * 60 * 1000));

        // 获取对应的回归奖励
        let bestReward: ReturnReward | null = null;
        for (const reward of this._returnRewards) {
            if (daysPassed >= reward.absentDays) {
                if (!bestReward || reward.absentDays > bestReward.absentDays) {
                    bestReward = reward;
                }
            }
        }

        if (!bestReward) {
            console.log('无可领取的回归奖励');
            return false;
        }

        // 发放奖励
        this.grantRewards(bestReward.rewards, '回归奖励');

        // 记录已领取
        this._data.returnRewardClaimed = true;
        this._data.isReturnPlayer = false;
        this.saveData();

        // 发送事件
        this.events.emit(LoginRewardSystem.EVENT_REWARD_CLAIMED, {
            type: 'return',
            absentDays: daysPassed,
            rewards: bestReward.rewards
        });

        return true;
    }

    /**
     * 发放奖励
     */
    private grantRewards(rewards: RewardItem[], reason: string): void {
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager) return;

        for (const reward of rewards) {
            currencyManager.addCurrency(reward.type, reward.amount, reason);
        }
    }

    /**
     * 获取每日奖励配置
     */
    public getDailyRewardConfig(day: number): DailyLoginReward | null {
        // 超过30天循环
        const adjustedDay = ((day - 1) % 30) + 1;
        return this._dailyRewards.find(r => r.day === adjustedDay) || null;
    }

    /**
     * 获取所有每日奖励配置
     */
    public getAllDailyRewards(): DailyLoginReward[] {
        return [...this._dailyRewards];
    }

    /**
     * 获取所有累计奖励配置
     */
    public getAllAccumulativeRewards(): AccumulativeReward[] {
        return [...this._accumulativeRewards];
    }

    /**
     * 检查今日是否可领取
     */
    public canClaimDaily(): boolean {
        return !this._data.monthlyRewardsClaimed.includes(this._data.currentMonthDays);
    }

    /**
     * 检查累计奖励是否可领取
     */
    public canClaimAccumulative(totalDays: number): boolean {
        return this._data.totalLoginDays >= totalDays &&
               !this._data.accumulativeRewardsClaimed.includes(totalDays);
    }

    /**
     * 获取下一个可领取的累计奖励
     */
    public getNextAccumulativeReward(): AccumulativeReward | null {
        for (const reward of this._accumulativeRewards) {
            if (!this._data.accumulativeRewardsClaimed.includes(reward.totalDays)) {
                return reward;
            }
        }
        return null;
    }

    /**
     * 获取待领取奖励数量
     */
    public getPendingRewardCount(): number {
        let count = 0;

        // 每日奖励
        if (this.canClaimDaily()) count++;

        // 累计奖励
        for (const reward of this._accumulativeRewards) {
            if (this.canClaimAccumulative(reward.totalDays)) count++;
        }

        // 回归奖励
        if (this._data.isReturnPlayer && !this._data.returnRewardClaimed) count++;

        return count;
    }

    // 时间工具
    private getDateStart(timestamp: number): number {
        const date = new Date(timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    // 存档
    public saveData(): void {
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(this._data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                this._data = { ...this._data, ...JSON.parse(saved) };
            } catch (e) {
                console.error('加载登录数据失败:', e);
            }
        }
    }

    public resetData(): void {
        this._data = {
            totalLoginDays: 0,
            consecutiveDays: 0,
            lastLoginDate: 0,
            currentMonthDays: 0,
            monthlyRewardsClaimed: [],
            accumulativeRewardsClaimed: [],
            isReturnPlayer: false,
            returnRewardClaimed: false
        };
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        if (LoginRewardSystem._instance === this) {
            LoginRewardSystem._instance = null;
        }
    }
}
