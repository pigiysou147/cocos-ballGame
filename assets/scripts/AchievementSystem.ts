import { _decorator, Component, Node, sys, EventTarget } from 'cc';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 成就类别
 */
export enum AchievementCategory {
    BATTLE = 'battle',           // 战斗成就
    CHARACTER = 'character',     // 角色成就
    GACHA = 'gacha',            // 召唤成就
    LEVEL = 'level',            // 关卡成就
    COLLECTION = 'collection',   // 收集成就
    SOCIAL = 'social',          // 社交成就
    SPECIAL = 'special'          // 特殊成就
}

/**
 * 成就触发条件类型
 */
export enum AchievementTrigger {
    // 战斗相关
    ENEMY_KILL = 'enemy_kill',               // 击杀敌人数
    BOSS_KILL = 'boss_kill',                 // 击杀Boss数
    COMBO_REACH = 'combo_reach',             // 达到连击数
    DAMAGE_DEAL = 'damage_deal',             // 造成伤害
    BATTLE_WIN = 'battle_win',               // 战斗胜利次数
    NO_DAMAGE_WIN = 'no_damage_win',         // 无伤通关次数
    
    // 角色相关
    CHARACTER_COUNT = 'character_count',      // 拥有角色数
    CHARACTER_MAX_LEVEL = 'character_max_level', // 角色满级数
    CHARACTER_AWAKEN = 'character_awaken',    // 角色觉醒数
    
    // 召唤相关
    GACHA_PULL = 'gacha_pull',               // 抽卡次数
    SSR_GET = 'ssr_get',                     // 获得SSR数
    UR_GET = 'ur_get',                       // 获得UR数
    
    // 关卡相关
    LEVEL_CLEAR = 'level_clear',             // 关卡通关数
    LEVEL_THREE_STAR = 'level_three_star',   // 三星通关数
    CHAPTER_CLEAR = 'chapter_clear',         // 章节通关数
    
    // 收集相关
    EQUIPMENT_COUNT = 'equipment_count',      // 装备收集数
    ELEMENT_COLLECT = 'element_collect',      // 属性角色收集
    
    // 社交相关
    FRIEND_COUNT = 'friend_count',           // 好友数量
    GUILD_DONATE = 'guild_donate',           // 公会捐献次数
    
    // 特殊
    LOGIN_DAYS = 'login_days',               // 登录天数
    VIP_LEVEL = 'vip_level',                 // VIP等级
    TOTAL_SPEND = 'total_spend'              // 累计消费
}

/**
 * 成就奖励
 */
export interface AchievementReward {
    type: CurrencyType;
    amount: number;
}

/**
 * 成就配置
 */
export interface AchievementConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: AchievementCategory;
    
    // 触发条件
    trigger: AchievementTrigger;
    targetValue: number;
    
    // 奖励
    rewards: AchievementReward[];
    
    // 前置成就
    prerequisiteId?: string;
    
    // 是否隐藏（未解锁前不显示）
    isHidden: boolean;
    
    // 排序
    sortOrder: number;
}

/**
 * 成就进度
 */
export interface AchievementProgress {
    achievementId: string;
    currentValue: number;
    isCompleted: boolean;
    isRewardClaimed: boolean;
    completedTime?: number;
    claimedTime?: number;
}

/**
 * 成就系统 - 管理游戏成就
 * Achievement System - Game achievements management
 */
@ccclass('AchievementSystem')
export class AchievementSystem extends Component {
    private static _instance: AchievementSystem | null = null;

    // 成就配置
    private _achievements: Map<string, AchievementConfig> = new Map();
    
    // 成就进度
    private _progress: Map<string, AchievementProgress> = new Map();
    
    // 触发器值缓存
    private _triggerValues: Map<AchievementTrigger, number> = new Map();
    
    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_ACHIEVEMENT_COMPLETED = 'achievement_completed';
    public static readonly EVENT_ACHIEVEMENT_REWARD_CLAIMED = 'achievement_reward_claimed';
    public static readonly EVENT_PROGRESS_UPDATE = 'progress_update';
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_achievement_data';

    public static get instance(): AchievementSystem | null {
        return AchievementSystem._instance;
    }

    onLoad() {
        if (AchievementSystem._instance) {
            this.node.destroy();
            return;
        }
        AchievementSystem._instance = this;
        
        // 初始化成就
        this.initAchievements();
        
        // 加载存档
        this.loadData();
    }

    /**
     * 初始化成就配置
     */
    private initAchievements(): void {
        const achievements: AchievementConfig[] = [
            // ========== 战斗成就 ==========
            {
                id: 'ach_kill_10',
                name: '初出茅庐',
                description: '击败10个敌人',
                icon: 'icon_ach_kill',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.ENEMY_KILL,
                targetValue: 10,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 20 }],
                isHidden: false,
                sortOrder: 1
            },
            {
                id: 'ach_kill_100',
                name: '小有成就',
                description: '击败100个敌人',
                icon: 'icon_ach_kill',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.ENEMY_KILL,
                targetValue: 100,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }],
                prerequisiteId: 'ach_kill_10',
                isHidden: false,
                sortOrder: 2
            },
            {
                id: 'ach_kill_1000',
                name: '百战之师',
                description: '击败1000个敌人',
                icon: 'icon_ach_kill',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.ENEMY_KILL,
                targetValue: 1000,
                rewards: [
                    { type: CurrencyType.DIAMOND, amount: 100 },
                    { type: CurrencyType.SUMMON_TICKET, amount: 1 }
                ],
                prerequisiteId: 'ach_kill_100',
                isHidden: false,
                sortOrder: 3
            },
            {
                id: 'ach_boss_1',
                name: '勇者起步',
                description: '击败第一个Boss',
                icon: 'icon_ach_boss',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.BOSS_KILL,
                targetValue: 1,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }],
                isHidden: false,
                sortOrder: 10
            },
            {
                id: 'ach_boss_10',
                name: '猎龙者',
                description: '击败10个Boss',
                icon: 'icon_ach_boss',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.BOSS_KILL,
                targetValue: 10,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 100 }],
                prerequisiteId: 'ach_boss_1',
                isHidden: false,
                sortOrder: 11
            },
            {
                id: 'ach_combo_50',
                name: '连击新手',
                description: '达成50连击',
                icon: 'icon_ach_combo',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.COMBO_REACH,
                targetValue: 50,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 30 }],
                isHidden: false,
                sortOrder: 20
            },
            {
                id: 'ach_combo_100',
                name: '连击达人',
                description: '达成100连击',
                icon: 'icon_ach_combo',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.COMBO_REACH,
                targetValue: 100,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 80 }],
                prerequisiteId: 'ach_combo_50',
                isHidden: false,
                sortOrder: 21
            },
            {
                id: 'ach_combo_200',
                name: '连击大师',
                description: '达成200连击',
                icon: 'icon_ach_combo',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.COMBO_REACH,
                targetValue: 200,
                rewards: [
                    { type: CurrencyType.DIAMOND, amount: 150 },
                    { type: CurrencyType.SUMMON_TICKET, amount: 1 }
                ],
                prerequisiteId: 'ach_combo_100',
                isHidden: true,
                sortOrder: 22
            },
            {
                id: 'ach_no_damage_1',
                name: '完美躲避',
                description: '无伤通关1次',
                icon: 'icon_ach_perfect',
                category: AchievementCategory.BATTLE,
                trigger: AchievementTrigger.NO_DAMAGE_WIN,
                targetValue: 1,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }],
                isHidden: false,
                sortOrder: 30
            },

            // ========== 角色成就 ==========
            {
                id: 'ach_char_5',
                name: '小队成型',
                description: '拥有5个角色',
                icon: 'icon_ach_char',
                category: AchievementCategory.CHARACTER,
                trigger: AchievementTrigger.CHARACTER_COUNT,
                targetValue: 5,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 30 }],
                isHidden: false,
                sortOrder: 1
            },
            {
                id: 'ach_char_20',
                name: '角色收藏家',
                description: '拥有20个角色',
                icon: 'icon_ach_char',
                category: AchievementCategory.CHARACTER,
                trigger: AchievementTrigger.CHARACTER_COUNT,
                targetValue: 20,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 100 }],
                prerequisiteId: 'ach_char_5',
                isHidden: false,
                sortOrder: 2
            },
            {
                id: 'ach_char_max_1',
                name: '精心培养',
                description: '将1个角色升到满级',
                icon: 'icon_ach_max',
                category: AchievementCategory.CHARACTER,
                trigger: AchievementTrigger.CHARACTER_MAX_LEVEL,
                targetValue: 1,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }],
                isHidden: false,
                sortOrder: 10
            },
            {
                id: 'ach_awaken_1',
                name: '觉醒之力',
                description: '觉醒1个角色',
                icon: 'icon_ach_awaken',
                category: AchievementCategory.CHARACTER,
                trigger: AchievementTrigger.CHARACTER_AWAKEN,
                targetValue: 1,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 80 }],
                isHidden: false,
                sortOrder: 20
            },

            // ========== 召唤成就 ==========
            {
                id: 'ach_gacha_10',
                name: '初次召唤',
                description: '进行10次召唤',
                icon: 'icon_ach_gacha',
                category: AchievementCategory.GACHA,
                trigger: AchievementTrigger.GACHA_PULL,
                targetValue: 10,
                rewards: [{ type: CurrencyType.SUMMON_TICKET, amount: 1 }],
                isHidden: false,
                sortOrder: 1
            },
            {
                id: 'ach_gacha_100',
                name: '召唤达人',
                description: '进行100次召唤',
                icon: 'icon_ach_gacha',
                category: AchievementCategory.GACHA,
                trigger: AchievementTrigger.GACHA_PULL,
                targetValue: 100,
                rewards: [{ type: CurrencyType.SUMMON_TICKET, amount: 5 }],
                prerequisiteId: 'ach_gacha_10',
                isHidden: false,
                sortOrder: 2
            },
            {
                id: 'ach_ssr_1',
                name: '金光闪闪',
                description: '获得第一个SSR角色',
                icon: 'icon_ach_ssr',
                category: AchievementCategory.GACHA,
                trigger: AchievementTrigger.SSR_GET,
                targetValue: 1,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 100 }],
                isHidden: false,
                sortOrder: 10
            },
            {
                id: 'ach_ur_1',
                name: '传说降临',
                description: '获得第一个UR角色',
                icon: 'icon_ach_ur',
                category: AchievementCategory.GACHA,
                trigger: AchievementTrigger.UR_GET,
                targetValue: 1,
                rewards: [
                    { type: CurrencyType.DIAMOND, amount: 300 },
                    { type: CurrencyType.SUMMON_TICKET_10, amount: 1 }
                ],
                isHidden: true,
                sortOrder: 20
            },

            // ========== 关卡成就 ==========
            {
                id: 'ach_level_10',
                name: '探索者',
                description: '通关10个关卡',
                icon: 'icon_ach_level',
                category: AchievementCategory.LEVEL,
                trigger: AchievementTrigger.LEVEL_CLEAR,
                targetValue: 10,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 30 }],
                isHidden: false,
                sortOrder: 1
            },
            {
                id: 'ach_level_50',
                name: '冒险家',
                description: '通关50个关卡',
                icon: 'icon_ach_level',
                category: AchievementCategory.LEVEL,
                trigger: AchievementTrigger.LEVEL_CLEAR,
                targetValue: 50,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 100 }],
                prerequisiteId: 'ach_level_10',
                isHidden: false,
                sortOrder: 2
            },
            {
                id: 'ach_3star_10',
                name: '完美主义',
                description: '三星通关10个关卡',
                icon: 'icon_ach_star',
                category: AchievementCategory.LEVEL,
                trigger: AchievementTrigger.LEVEL_THREE_STAR,
                targetValue: 10,
                rewards: [{ type: CurrencyType.DIAMOND, amount: 50 }],
                isHidden: false,
                sortOrder: 10
            },
            {
                id: 'ach_chapter_1',
                name: '第一章完结',
                description: '通关第一章',
                icon: 'icon_ach_chapter',
                category: AchievementCategory.LEVEL,
                trigger: AchievementTrigger.CHAPTER_CLEAR,
                targetValue: 1,
                rewards: [
                    { type: CurrencyType.DIAMOND, amount: 100 },
                    { type: CurrencyType.SUMMON_TICKET, amount: 2 }
                ],
                isHidden: false,
                sortOrder: 20
            },

            // ========== 收集成就 ==========
            {
                id: 'ach_equip_10',
                name: '装备收集',
                description: '收集10件装备',
                icon: 'icon_ach_equip',
                category: AchievementCategory.COLLECTION,
                trigger: AchievementTrigger.EQUIPMENT_COUNT,
                targetValue: 10,
                rewards: [{ type: CurrencyType.GOLD, amount: 10000 }],
                isHidden: false,
                sortOrder: 1
            },

            // ========== 特殊成就 ==========
            {
                id: 'ach_login_7',
                name: '持之以恒',
                description: '累计登录7天',
                icon: 'icon_ach_login',
                category: AchievementCategory.SPECIAL,
                trigger: AchievementTrigger.LOGIN_DAYS,
                targetValue: 7,
                rewards: [{ type: CurrencyType.SUMMON_TICKET, amount: 1 }],
                isHidden: false,
                sortOrder: 1
            },
            {
                id: 'ach_login_30',
                name: '忠实玩家',
                description: '累计登录30天',
                icon: 'icon_ach_login',
                category: AchievementCategory.SPECIAL,
                trigger: AchievementTrigger.LOGIN_DAYS,
                targetValue: 30,
                rewards: [
                    { type: CurrencyType.SUMMON_TICKET_10, amount: 1 },
                    { type: CurrencyType.DIAMOND, amount: 500 }
                ],
                prerequisiteId: 'ach_login_7',
                isHidden: false,
                sortOrder: 2
            }
        ];

        for (const ach of achievements) {
            this._achievements.set(ach.id, ach);
        }
    }

    /**
     * 更新成就进度
     */
    public updateProgress(trigger: AchievementTrigger, value: number, isAbsolute: boolean = false): void {
        // 更新触发器值
        if (isAbsolute) {
            this._triggerValues.set(trigger, value);
        } else {
            const current = this._triggerValues.get(trigger) || 0;
            this._triggerValues.set(trigger, current + value);
        }

        const newValue = this._triggerValues.get(trigger) || 0;

        // 检查所有相关成就
        for (const [id, config] of this._achievements) {
            if (config.trigger !== trigger) continue;

            // 获取进度
            let progress = this._progress.get(id);
            if (!progress) {
                progress = {
                    achievementId: id,
                    currentValue: 0,
                    isCompleted: false,
                    isRewardClaimed: false
                };
                this._progress.set(id, progress);
            }

            // 已完成的跳过
            if (progress.isCompleted) continue;

            // 检查前置成就
            if (config.prerequisiteId) {
                const prereqProgress = this._progress.get(config.prerequisiteId);
                if (!prereqProgress?.isCompleted) continue;
            }

            // 更新进度
            const oldValue = progress.currentValue;
            progress.currentValue = Math.max(progress.currentValue, newValue);

            // 检查是否完成
            if (progress.currentValue >= config.targetValue && !progress.isCompleted) {
                progress.isCompleted = true;
                progress.completedTime = Date.now();

                console.log(`成就完成: ${config.name}`);

                // 发送完成事件
                this.events.emit(AchievementSystem.EVENT_ACHIEVEMENT_COMPLETED, {
                    achievementId: id,
                    config,
                    progress
                });
            } else if (progress.currentValue !== oldValue) {
                // 发送进度更新事件
                this.events.emit(AchievementSystem.EVENT_PROGRESS_UPDATE, {
                    achievementId: id,
                    config,
                    progress
                });
            }
        }

        this.saveData();
    }

    /**
     * 领取成就奖励
     */
    public claimReward(achievementId: string): boolean {
        const config = this._achievements.get(achievementId);
        const progress = this._progress.get(achievementId);

        if (!config || !progress) {
            console.log('成就不存在');
            return false;
        }

        if (!progress.isCompleted) {
            console.log('成就未完成');
            return false;
        }

        if (progress.isRewardClaimed) {
            console.log('奖励已领取');
            return false;
        }

        // 发放奖励
        const currencyManager = CurrencyManager.instance;
        if (currencyManager) {
            for (const reward of config.rewards) {
                currencyManager.addCurrency(reward.type, reward.amount, `成就奖励: ${config.name}`);
            }
        }

        progress.isRewardClaimed = true;
        progress.claimedTime = Date.now();

        this.saveData();

        // 发送事件
        this.events.emit(AchievementSystem.EVENT_ACHIEVEMENT_REWARD_CLAIMED, {
            achievementId,
            config,
            progress
        });

        console.log(`领取成就奖励: ${config.name}`);
        return true;
    }

    /**
     * 一键领取所有可领取的奖励
     */
    public claimAllRewards(): number {
        let count = 0;

        for (const [id, progress] of this._progress) {
            if (progress.isCompleted && !progress.isRewardClaimed) {
                if (this.claimReward(id)) {
                    count++;
                }
            }
        }

        return count;
    }

    // ========== 查询方法 ==========

    /**
     * 获取成就列表
     */
    public getAchievements(category?: AchievementCategory): AchievementConfig[] {
        let list = Array.from(this._achievements.values());

        if (category) {
            list = list.filter(a => a.category === category);
        }

        // 过滤隐藏成就（未解锁前置的）
        list = list.filter(a => {
            if (!a.isHidden) return true;
            const progress = this._progress.get(a.id);
            return progress?.isCompleted || false;
        });

        return list.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    /**
     * 获取成就进度
     */
    public getProgress(achievementId: string): AchievementProgress | undefined {
        return this._progress.get(achievementId);
    }

    /**
     * 获取完成的成就数
     */
    public getCompletedCount(): number {
        let count = 0;
        for (const progress of this._progress.values()) {
            if (progress.isCompleted) count++;
        }
        return count;
    }

    /**
     * 获取待领取奖励的成就数
     */
    public getPendingRewardCount(): number {
        let count = 0;
        for (const progress of this._progress.values()) {
            if (progress.isCompleted && !progress.isRewardClaimed) count++;
        }
        return count;
    }

    /**
     * 获取成就完成率
     */
    public getCompletionRate(): number {
        const total = this._achievements.size;
        if (total === 0) return 0;
        return this.getCompletedCount() / total;
    }

    /**
     * 获取触发器当前值
     */
    public getTriggerValue(trigger: AchievementTrigger): number {
        return this._triggerValues.get(trigger) || 0;
    }

    // ========== 便捷方法 ==========

    /** 击杀敌人 */
    public onEnemyKill(count: number = 1): void {
        this.updateProgress(AchievementTrigger.ENEMY_KILL, count);
    }

    /** 击杀Boss */
    public onBossKill(count: number = 1): void {
        this.updateProgress(AchievementTrigger.BOSS_KILL, count);
    }

    /** 达成连击 */
    public onComboReach(combo: number): void {
        this.updateProgress(AchievementTrigger.COMBO_REACH, combo, true);
    }

    /** 通关关卡 */
    public onLevelClear(): void {
        this.updateProgress(AchievementTrigger.LEVEL_CLEAR, 1);
    }

    /** 三星通关 */
    public onThreeStarClear(): void {
        this.updateProgress(AchievementTrigger.LEVEL_THREE_STAR, 1);
    }

    /** 无伤通关 */
    public onNoDamageWin(): void {
        this.updateProgress(AchievementTrigger.NO_DAMAGE_WIN, 1);
    }

    /** 抽卡 */
    public onGachaPull(count: number): void {
        this.updateProgress(AchievementTrigger.GACHA_PULL, count);
    }

    /** 获得SSR */
    public onSSRGet(count: number = 1): void {
        this.updateProgress(AchievementTrigger.SSR_GET, count);
    }

    /** 获得UR */
    public onURGet(count: number = 1): void {
        this.updateProgress(AchievementTrigger.UR_GET, count);
    }

    /** 角色数量变化 */
    public onCharacterCountChange(count: number): void {
        this.updateProgress(AchievementTrigger.CHARACTER_COUNT, count, true);
    }

    /** 登录 */
    public onLogin(): void {
        this.updateProgress(AchievementTrigger.LOGIN_DAYS, 1);
    }

    // ========== 存档 ==========

    public saveData(): void {
        const data: any = {
            progress: {},
            triggerValues: {}
        };

        for (const [id, progress] of this._progress) {
            data.progress[id] = progress;
        }

        for (const [trigger, value] of this._triggerValues) {
            data.triggerValues[trigger] = value;
        }

        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (!saved) return;

        try {
            const data = JSON.parse(saved);

            if (data.progress) {
                for (const [id, progress] of Object.entries(data.progress)) {
                    this._progress.set(id, progress as AchievementProgress);
                }
            }

            if (data.triggerValues) {
                for (const [trigger, value] of Object.entries(data.triggerValues)) {
                    this._triggerValues.set(trigger as AchievementTrigger, value as number);
                }
            }

            console.log('成就数据已加载');
        } catch (e) {
            console.error('加载成就数据失败:', e);
        }
    }

    onDestroy() {
        this.saveData();

        if (AchievementSystem._instance === this) {
            AchievementSystem._instance = null;
        }
    }
}
