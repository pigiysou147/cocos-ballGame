import { _decorator, Component, sys, EventTarget } from 'cc';
const { ccclass, property } = _decorator;

/**
 * VIP等级配置
 */
export interface VIPLevelConfig {
    level: number;
    expRequired: number;             // 升级所需经验
    name: string;                    // 等级名称
    icon?: string;                   // 等级图标
    
    // 特权
    privileges: VIPPrivileges;
}

/**
 * VIP特权
 */
export interface VIPPrivileges {
    // 抽卡
    dailyFreeGacha: number;          // 每日免费抽数
    gachaDiscount: number;           // 抽卡折扣 (0.9 = 9折)
    
    // 体力
    maxStamina: number;              // 体力上限加成
    staminaRecoveryBonus: number;    // 体力恢复加速 (1.2 = 20%加速)
    dailyStaminaGift: number;        // 每日体力赠送
    
    // 战斗
    expBonus: number;                // 经验加成 (1.5 = 50%加成)
    goldBonus: number;               // 金币加成
    dropRateBonus: number;           // 掉落率加成
    
    // 商店
    shopDiscount: number;            // 商店折扣
    dailyShopRefresh: number;        // 每日免费刷新次数
    exclusiveShopAccess: boolean;    // VIP专属商店
    
    // 社交
    friendSlots: number;             // 好友位加成
    guildContribution: number;       // 公会贡献加成
    
    // 其他
    fastBattle: boolean;             // 快速战斗
    autoRepeat: boolean;             // 自动重复
    skipAnimation: boolean;          // 跳过动画
    prioritySupport: boolean;        // 优先客服
}

/**
 * VIP数据
 */
export interface VIPData {
    level: number;
    exp: number;
    totalPaid: number;               // 累计充值（用于计算VIP经验）
    lastLoginReward: number;         // 上次领取登录礼包时间
    dailyGachaClaimed: boolean;      // 今日免费抽已领取
    dailyStaminaClaimed: boolean;    // 今日体力已领取
    dailyShopRefreshUsed: number;    // 今日已用刷新次数
}

/**
 * VIP系统
 * VIP System - Premium membership and privileges
 */
@ccclass('VIPSystem')
export class VIPSystem extends Component {
    private static _instance: VIPSystem | null = null;

    // VIP等级配置
    private _levels: VIPLevelConfig[] = [];
    
    // VIP数据
    private _data: VIPData = {
        level: 0,
        exp: 0,
        totalPaid: 0,
        lastLoginReward: 0,
        dailyGachaClaimed: false,
        dailyStaminaClaimed: false,
        dailyShopRefreshUsed: 0
    };

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_LEVEL_UP = 'vip_level_up';
    public static readonly EVENT_EXP_GAINED = 'vip_exp_gained';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_vip';

    public static get instance(): VIPSystem | null {
        return VIPSystem._instance;
    }

    public get data(): VIPData {
        return { ...this._data };
    }

    public get level(): number {
        return this._data.level;
    }

    public get currentLevelConfig(): VIPLevelConfig | null {
        return this._levels[this._data.level] || null;
    }

    public get privileges(): VIPPrivileges {
        return this.currentLevelConfig?.privileges || this.getDefaultPrivileges();
    }

    onLoad() {
        if (VIPSystem._instance) {
            this.node.destroy();
            return;
        }
        VIPSystem._instance = this;

        this.initLevels();
        this.loadData();
        this.checkDailyReset();
    }

    /**
     * 初始化VIP等级配置
     */
    private initLevels(): void {
        this._levels = [
            // VIP 0 (非VIP)
            {
                level: 0,
                expRequired: 0,
                name: '普通玩家',
                privileges: this.getDefaultPrivileges()
            },
            // VIP 1
            {
                level: 1,
                expRequired: 100,
                name: 'VIP 1',
                privileges: {
                    dailyFreeGacha: 1,
                    gachaDiscount: 1.0,
                    maxStamina: 10,
                    staminaRecoveryBonus: 1.0,
                    dailyStaminaGift: 20,
                    expBonus: 1.05,
                    goldBonus: 1.05,
                    dropRateBonus: 1.0,
                    shopDiscount: 1.0,
                    dailyShopRefresh: 1,
                    exclusiveShopAccess: false,
                    friendSlots: 5,
                    guildContribution: 1.0,
                    fastBattle: false,
                    autoRepeat: false,
                    skipAnimation: false,
                    prioritySupport: false
                }
            },
            // VIP 2
            {
                level: 2,
                expRequired: 300,
                name: 'VIP 2',
                privileges: {
                    dailyFreeGacha: 1,
                    gachaDiscount: 1.0,
                    maxStamina: 20,
                    staminaRecoveryBonus: 1.05,
                    dailyStaminaGift: 40,
                    expBonus: 1.1,
                    goldBonus: 1.1,
                    dropRateBonus: 1.02,
                    shopDiscount: 0.98,
                    dailyShopRefresh: 2,
                    exclusiveShopAccess: false,
                    friendSlots: 10,
                    guildContribution: 1.05,
                    fastBattle: false,
                    autoRepeat: false,
                    skipAnimation: false,
                    prioritySupport: false
                }
            },
            // VIP 3
            {
                level: 3,
                expRequired: 600,
                name: 'VIP 3',
                privileges: {
                    dailyFreeGacha: 1,
                    gachaDiscount: 0.98,
                    maxStamina: 30,
                    staminaRecoveryBonus: 1.1,
                    dailyStaminaGift: 60,
                    expBonus: 1.15,
                    goldBonus: 1.15,
                    dropRateBonus: 1.05,
                    shopDiscount: 0.95,
                    dailyShopRefresh: 3,
                    exclusiveShopAccess: false,
                    friendSlots: 15,
                    guildContribution: 1.1,
                    fastBattle: true,
                    autoRepeat: false,
                    skipAnimation: false,
                    prioritySupport: false
                }
            },
            // VIP 4
            {
                level: 4,
                expRequired: 1000,
                name: 'VIP 4',
                privileges: {
                    dailyFreeGacha: 2,
                    gachaDiscount: 0.95,
                    maxStamina: 40,
                    staminaRecoveryBonus: 1.15,
                    dailyStaminaGift: 80,
                    expBonus: 1.2,
                    goldBonus: 1.2,
                    dropRateBonus: 1.08,
                    shopDiscount: 0.92,
                    dailyShopRefresh: 4,
                    exclusiveShopAccess: true,
                    friendSlots: 20,
                    guildContribution: 1.15,
                    fastBattle: true,
                    autoRepeat: true,
                    skipAnimation: false,
                    prioritySupport: false
                }
            },
            // VIP 5
            {
                level: 5,
                expRequired: 2000,
                name: 'VIP 5',
                privileges: {
                    dailyFreeGacha: 2,
                    gachaDiscount: 0.92,
                    maxStamina: 50,
                    staminaRecoveryBonus: 1.2,
                    dailyStaminaGift: 100,
                    expBonus: 1.3,
                    goldBonus: 1.3,
                    dropRateBonus: 1.1,
                    shopDiscount: 0.9,
                    dailyShopRefresh: 5,
                    exclusiveShopAccess: true,
                    friendSlots: 30,
                    guildContribution: 1.2,
                    fastBattle: true,
                    autoRepeat: true,
                    skipAnimation: true,
                    prioritySupport: false
                }
            },
            // VIP 6
            {
                level: 6,
                expRequired: 5000,
                name: 'VIP 6',
                privileges: {
                    dailyFreeGacha: 3,
                    gachaDiscount: 0.9,
                    maxStamina: 60,
                    staminaRecoveryBonus: 1.25,
                    dailyStaminaGift: 120,
                    expBonus: 1.4,
                    goldBonus: 1.4,
                    dropRateBonus: 1.15,
                    shopDiscount: 0.88,
                    dailyShopRefresh: 6,
                    exclusiveShopAccess: true,
                    friendSlots: 40,
                    guildContribution: 1.25,
                    fastBattle: true,
                    autoRepeat: true,
                    skipAnimation: true,
                    prioritySupport: true
                }
            },
            // VIP 7 (最高等级)
            {
                level: 7,
                expRequired: 10000,
                name: 'VIP 7',
                privileges: {
                    dailyFreeGacha: 5,
                    gachaDiscount: 0.85,
                    maxStamina: 80,
                    staminaRecoveryBonus: 1.3,
                    dailyStaminaGift: 150,
                    expBonus: 1.5,
                    goldBonus: 1.5,
                    dropRateBonus: 1.2,
                    shopDiscount: 0.85,
                    dailyShopRefresh: 10,
                    exclusiveShopAccess: true,
                    friendSlots: 50,
                    guildContribution: 1.3,
                    fastBattle: true,
                    autoRepeat: true,
                    skipAnimation: true,
                    prioritySupport: true
                }
            }
        ];
    }

    /**
     * 获取默认特权
     */
    private getDefaultPrivileges(): VIPPrivileges {
        return {
            dailyFreeGacha: 0,
            gachaDiscount: 1.0,
            maxStamina: 0,
            staminaRecoveryBonus: 1.0,
            dailyStaminaGift: 0,
            expBonus: 1.0,
            goldBonus: 1.0,
            dropRateBonus: 1.0,
            shopDiscount: 1.0,
            dailyShopRefresh: 0,
            exclusiveShopAccess: false,
            friendSlots: 0,
            guildContribution: 1.0,
            fastBattle: false,
            autoRepeat: false,
            skipAnimation: false,
            prioritySupport: false
        };
    }

    /**
     * 添加VIP经验（充值时调用）
     */
    public addExp(amount: number): void {
        this._data.exp += amount;
        this._data.totalPaid += amount;
        
        this.events.emit(VIPSystem.EVENT_EXP_GAINED, { amount, total: this._data.exp });
        
        // 检查升级
        this.checkLevelUp();
        this.saveData();
    }

    /**
     * 检查VIP升级
     */
    private checkLevelUp(): void {
        const maxLevel = this._levels.length - 1;
        
        while (this._data.level < maxLevel) {
            const nextLevel = this._levels[this._data.level + 1];
            if (this._data.exp >= nextLevel.expRequired) {
                this._data.level++;
                
                this.events.emit(VIPSystem.EVENT_LEVEL_UP, {
                    level: this._data.level,
                    config: this._levels[this._data.level]
                });
                
                console.log(`VIP升级! 当前等级: VIP ${this._data.level}`);
            } else {
                break;
            }
        }
    }

    /**
     * 获取升级进度
     */
    public getLevelProgress(): { current: number; required: number; percent: number } {
        const currentLevel = this._levels[this._data.level];
        const nextLevel = this._levels[this._data.level + 1];
        
        if (!nextLevel) {
            return { current: this._data.exp, required: currentLevel.expRequired, percent: 100 };
        }
        
        const current = this._data.exp - currentLevel.expRequired;
        const required = nextLevel.expRequired - currentLevel.expRequired;
        const percent = Math.min(100, (current / required) * 100);
        
        return { current, required, percent };
    }

    /**
     * 领取每日免费抽
     */
    public claimDailyFreeGacha(): number {
        if (this._data.dailyGachaClaimed) {
            return 0;
        }
        
        const freeGacha = this.privileges.dailyFreeGacha;
        if (freeGacha <= 0) {
            return 0;
        }
        
        this._data.dailyGachaClaimed = true;
        this.saveData();
        
        return freeGacha;
    }

    /**
     * 领取每日体力
     */
    public claimDailyStamina(): number {
        if (this._data.dailyStaminaClaimed) {
            return 0;
        }
        
        const stamina = this.privileges.dailyStaminaGift;
        if (stamina <= 0) {
            return 0;
        }
        
        this._data.dailyStaminaClaimed = true;
        this.saveData();
        
        return stamina;
    }

    /**
     * 使用商店刷新
     */
    public useShopRefresh(): boolean {
        if (this._data.dailyShopRefreshUsed >= this.privileges.dailyShopRefresh) {
            return false;
        }
        
        this._data.dailyShopRefreshUsed++;
        this.saveData();
        
        return true;
    }

    /**
     * 获取剩余免费刷新次数
     */
    public getRemainingShopRefresh(): number {
        return Math.max(0, this.privileges.dailyShopRefresh - this._data.dailyShopRefreshUsed);
    }

    /**
     * 检查每日重置
     */
    private checkDailyReset(): void {
        const now = Date.now();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();
        
        if (this._data.lastLoginReward < todayStart) {
            this._data.dailyGachaClaimed = false;
            this._data.dailyStaminaClaimed = false;
            this._data.dailyShopRefreshUsed = 0;
            this._data.lastLoginReward = now;
            this.saveData();
        }
    }

    /**
     * 获取所有VIP等级配置
     */
    public getAllLevels(): VIPLevelConfig[] {
        return [...this._levels];
    }

    /**
     * 获取指定等级配置
     */
    public getLevelConfig(level: number): VIPLevelConfig | null {
        return this._levels[level] || null;
    }

    /**
     * 计算折扣后价格
     */
    public applyDiscount(price: number, isShop: boolean = true): number {
        const discount = isShop ? this.privileges.shopDiscount : this.privileges.gachaDiscount;
        return Math.floor(price * discount);
    }

    /**
     * 计算加成后数值
     */
    public applyBonus(value: number, type: 'exp' | 'gold' | 'drop'): number {
        let bonus = 1;
        switch (type) {
            case 'exp': bonus = this.privileges.expBonus; break;
            case 'gold': bonus = this.privileges.goldBonus; break;
            case 'drop': bonus = this.privileges.dropRateBonus; break;
        }
        return Math.floor(value * bonus);
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
                console.error('加载VIP数据失败:', e);
            }
        }
    }

    public resetData(): void {
        this._data = {
            level: 0,
            exp: 0,
            totalPaid: 0,
            lastLoginReward: 0,
            dailyGachaClaimed: false,
            dailyStaminaClaimed: false,
            dailyShopRefreshUsed: 0
        };
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        if (VIPSystem._instance === this) {
            VIPSystem._instance = null;
        }
    }
}
