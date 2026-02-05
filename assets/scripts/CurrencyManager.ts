import { _decorator, Component, Node, sys, EventTarget } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 货币类型枚举
 */
export enum CurrencyType {
    // 基础货币
    GOLD = 'gold',                      // 金币 - 通用货币
    DIAMOND = 'diamond',                // 钻石 - 高级货币
    STAMINA = 'stamina',                // 体力 - 关卡消耗
    
    // 召唤货币
    SUMMON_TICKET = 'summon_ticket',    // 召唤券 - 单抽券
    SUMMON_TICKET_10 = 'summon_ticket_10', // 十连券
    
    // 养成货币
    EXP_POTION = 'exp_potion',          // 经验药水
    ENHANCE_STONE = 'enhance_stone',    // 强化石
    BREAKTHROUGH_STONE = 'breakthrough_stone', // 突破石
    AWAKEN_CRYSTAL = 'awaken_crystal',  // 觉醒结晶
    
    // 社交货币
    FRIEND_POINT = 'friend_point',      // 友情点
    GUILD_COIN = 'guild_coin',          // 公会币
    ARENA_COIN = 'arena_coin',          // 竞技场币
    
    // 活动货币
    EVENT_TOKEN = 'event_token',        // 活动代币
    RAID_TICKET = 'raid_ticket',        // 领主战挑战券
    
    // VIP相关
    VIP_EXP = 'vip_exp',                // VIP经验
    MONTHLY_CARD_DAYS = 'monthly_card_days' // 月卡剩余天数
}

/**
 * 货币配置接口
 */
export interface CurrencyConfig {
    type: CurrencyType;
    name: string;
    description: string;
    icon: string;                       // 图标名称
    color: string;                      // 显示颜色(hex)
    maxAmount: number;                  // 最大持有量
    canBuy: boolean;                    // 是否可购买
    buyPrice?: number;                  // 购买价格(钻石)
    buyAmount?: number;                 // 购买数量
    recoverable: boolean;               // 是否自动恢复
    recoveryRate?: number;              // 恢复速率(每分钟)
    recoveryMax?: number;               // 恢复上限
}

/**
 * 货币变化记录
 */
export interface CurrencyTransaction {
    type: CurrencyType;
    amount: number;                     // 正数为获得，负数为消耗
    reason: string;                     // 变化原因
    timestamp: number;                  // 时间戳
    balance: number;                    // 变化后余额
}

/**
 * 货币不足错误信息
 */
export interface InsufficientCurrencyError {
    type: CurrencyType;
    required: number;
    current: number;
    shortage: number;
}

/**
 * 货币管理器 - 统一管理所有游戏货币
 * Currency Manager - Centralized management for all game currencies
 */
@ccclass('CurrencyManager')
export class CurrencyManager extends Component {
    private static _instance: CurrencyManager | null = null;

    // 货币持有量
    private _currencies: Map<CurrencyType, number> = new Map();
    
    // 货币配置
    private _configs: Map<CurrencyType, CurrencyConfig> = new Map();
    
    // 交易记录
    private _transactions: CurrencyTransaction[] = [];
    private _maxTransactionHistory: number = 100;
    
    // 上次恢复时间
    private _lastRecoveryTime: Map<CurrencyType, number> = new Map();
    
    // 事件系统
    public events: EventTarget = new EventTarget();
    
    // 事件类型
    public static readonly EVENT_CURRENCY_CHANGED = 'currency_changed';
    public static readonly EVENT_CURRENCY_INSUFFICIENT = 'currency_insufficient';
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_currency_data';

    public static get instance(): CurrencyManager | null {
        return CurrencyManager._instance;
    }

    onLoad() {
        if (CurrencyManager._instance) {
            this.node.destroy();
            return;
        }
        CurrencyManager._instance = this;
        
        // 初始化货币配置
        this.initCurrencyConfigs();
        
        // 加载存档
        this.loadData();
        
        // 如果是新玩家，给予初始货币
        if (this._currencies.size === 0) {
            this.giveStarterCurrencies();
        }
    }

    start() {
        // 启动自动恢复检查
        this.schedule(this.updateRecovery, 60); // 每分钟检查一次
        
        // 立即执行一次恢复计算（补偿离线时间）
        this.updateRecovery();
    }

    /**
     * 初始化货币配置
     */
    private initCurrencyConfigs(): void {
        const configs: CurrencyConfig[] = [
            // 基础货币
            {
                type: CurrencyType.GOLD,
                name: '金币',
                description: '通用货币，用于强化装备、升级角色等',
                icon: 'icon_gold',
                color: '#FFD700',
                maxAmount: 999999999,
                canBuy: true,
                buyPrice: 10,
                buyAmount: 10000,
                recoverable: false
            },
            {
                type: CurrencyType.DIAMOND,
                name: '钻石',
                description: '高级货币，用于召唤、购买道具等',
                icon: 'icon_diamond',
                color: '#64C8FF',
                maxAmount: 999999,
                canBuy: false, // 需要充值
                recoverable: false
            },
            {
                type: CurrencyType.STAMINA,
                name: '体力',
                description: '挑战关卡消耗的体力',
                icon: 'icon_stamina',
                color: '#7CFC00',
                maxAmount: 999,
                canBuy: true,
                buyPrice: 50,
                buyAmount: 60,
                recoverable: true,
                recoveryRate: 1, // 每分钟恢复1点
                recoveryMax: 120 // 自然恢复上限120
            },
            
            // 召唤货币
            {
                type: CurrencyType.SUMMON_TICKET,
                name: '召唤券',
                description: '可进行一次召唤',
                icon: 'icon_summon_ticket',
                color: '#FFB6C1',
                maxAmount: 9999,
                canBuy: true,
                buyPrice: 300,
                buyAmount: 1,
                recoverable: false
            },
            {
                type: CurrencyType.SUMMON_TICKET_10,
                name: '十连券',
                description: '可进行十次召唤',
                icon: 'icon_summon_ticket_10',
                color: '#FF69B4',
                maxAmount: 999,
                canBuy: true,
                buyPrice: 2700,
                buyAmount: 1,
                recoverable: false
            },
            
            // 养成货币
            {
                type: CurrencyType.EXP_POTION,
                name: '经验药水',
                description: '用于角色升级',
                icon: 'icon_exp_potion',
                color: '#9370DB',
                maxAmount: 99999,
                canBuy: true,
                buyPrice: 1,
                buyAmount: 100,
                recoverable: false
            },
            {
                type: CurrencyType.ENHANCE_STONE,
                name: '强化石',
                description: '用于装备强化',
                icon: 'icon_enhance_stone',
                color: '#4169E1',
                maxAmount: 99999,
                canBuy: true,
                buyPrice: 5,
                buyAmount: 10,
                recoverable: false
            },
            {
                type: CurrencyType.BREAKTHROUGH_STONE,
                name: '突破石',
                description: '用于角色突破',
                icon: 'icon_breakthrough_stone',
                color: '#FF8C00',
                maxAmount: 9999,
                canBuy: true,
                buyPrice: 50,
                buyAmount: 1,
                recoverable: false
            },
            {
                type: CurrencyType.AWAKEN_CRYSTAL,
                name: '觉醒结晶',
                description: '用于角色觉醒',
                icon: 'icon_awaken_crystal',
                color: '#FF1493',
                maxAmount: 9999,
                canBuy: true,
                buyPrice: 100,
                buyAmount: 1,
                recoverable: false
            },
            
            // 社交货币
            {
                type: CurrencyType.FRIEND_POINT,
                name: '友情点',
                description: '通过助战获得，可用于友情召唤',
                icon: 'icon_friend_point',
                color: '#FF6347',
                maxAmount: 99999,
                canBuy: false,
                recoverable: false
            },
            {
                type: CurrencyType.GUILD_COIN,
                name: '公会币',
                description: '参与公会活动获得',
                icon: 'icon_guild_coin',
                color: '#20B2AA',
                maxAmount: 99999,
                canBuy: false,
                recoverable: false
            },
            {
                type: CurrencyType.ARENA_COIN,
                name: '竞技场币',
                description: '参与竞技场获得',
                icon: 'icon_arena_coin',
                color: '#DC143C',
                maxAmount: 99999,
                canBuy: false,
                recoverable: false
            },
            
            // 活动货币
            {
                type: CurrencyType.EVENT_TOKEN,
                name: '活动代币',
                description: '参与限时活动获得',
                icon: 'icon_event_token',
                color: '#FFD700',
                maxAmount: 99999,
                canBuy: false,
                recoverable: false
            },
            {
                type: CurrencyType.RAID_TICKET,
                name: '挑战券',
                description: '用于额外挑战领主战',
                icon: 'icon_raid_ticket',
                color: '#8B0000',
                maxAmount: 99,
                canBuy: true,
                buyPrice: 100,
                buyAmount: 1,
                recoverable: false
            },
            
            // VIP相关
            {
                type: CurrencyType.VIP_EXP,
                name: 'VIP经验',
                description: '累计充值获得',
                icon: 'icon_vip_exp',
                color: '#FFD700',
                maxAmount: 9999999,
                canBuy: false,
                recoverable: false
            },
            {
                type: CurrencyType.MONTHLY_CARD_DAYS,
                name: '月卡天数',
                description: '月卡剩余天数',
                icon: 'icon_monthly_card',
                color: '#FFD700',
                maxAmount: 365,
                canBuy: false,
                recoverable: false
            }
        ];
        
        for (const config of configs) {
            this._configs.set(config.type, config);
        }
    }

    /**
     * 给予新手初始货币
     */
    private giveStarterCurrencies(): void {
        // 初始货币
        this.setCurrency(CurrencyType.GOLD, 10000, '新手奖励');
        this.setCurrency(CurrencyType.DIAMOND, 1000, '新手奖励');
        this.setCurrency(CurrencyType.STAMINA, 120, '新手奖励');
        this.setCurrency(CurrencyType.SUMMON_TICKET, 10, '新手奖励');
        this.setCurrency(CurrencyType.EXP_POTION, 1000, '新手奖励');
        this.setCurrency(CurrencyType.ENHANCE_STONE, 100, '新手奖励');
        this.setCurrency(CurrencyType.BREAKTHROUGH_STONE, 10, '新手奖励');
        this.setCurrency(CurrencyType.RAID_TICKET, 3, '新手奖励');
        
        console.log('已发放新手货币奖励！');
    }

    /**
     * 获取货币数量
     */
    public getCurrency(type: CurrencyType): number {
        return this._currencies.get(type) || 0;
    }

    /**
     * 获取货币配置
     */
    public getCurrencyConfig(type: CurrencyType): CurrencyConfig | undefined {
        return this._configs.get(type);
    }

    /**
     * 设置货币数量（内部使用）
     */
    private setCurrency(type: CurrencyType, amount: number, reason: string): void {
        const config = this._configs.get(type);
        const maxAmount = config?.maxAmount || 999999999;
        const finalAmount = Math.min(Math.max(0, amount), maxAmount);
        
        const oldAmount = this._currencies.get(type) || 0;
        this._currencies.set(type, finalAmount);
        
        // 记录交易
        this.recordTransaction(type, finalAmount - oldAmount, reason, finalAmount);
        
        // 发送变化事件
        this.events.emit(CurrencyManager.EVENT_CURRENCY_CHANGED, {
            type,
            oldAmount,
            newAmount: finalAmount,
            change: finalAmount - oldAmount,
            reason
        });
    }

    /**
     * 增加货币
     */
    public addCurrency(type: CurrencyType, amount: number, reason: string = '未知来源'): boolean {
        if (amount <= 0) return false;
        
        const current = this.getCurrency(type);
        this.setCurrency(type, current + amount, reason);
        
        console.log(`获得 ${this.getCurrencyConfig(type)?.name || type} x${amount} (${reason})`);
        return true;
    }

    /**
     * 消耗货币
     */
    public spendCurrency(type: CurrencyType, amount: number, reason: string = '未知消耗'): boolean {
        if (amount <= 0) return false;
        
        const current = this.getCurrency(type);
        if (current < amount) {
            // 货币不足
            this.events.emit(CurrencyManager.EVENT_CURRENCY_INSUFFICIENT, {
                type,
                required: amount,
                current,
                shortage: amount - current
            } as InsufficientCurrencyError);
            
            console.log(`${this.getCurrencyConfig(type)?.name || type}不足！需要${amount}，当前${current}`);
            return false;
        }
        
        this.setCurrency(type, current - amount, reason);
        console.log(`消耗 ${this.getCurrencyConfig(type)?.name || type} x${amount} (${reason})`);
        return true;
    }

    /**
     * 检查是否有足够的货币
     */
    public hasCurrency(type: CurrencyType, amount: number): boolean {
        return this.getCurrency(type) >= amount;
    }

    /**
     * 批量检查货币是否足够
     */
    public hasAllCurrencies(requirements: { type: CurrencyType; amount: number }[]): boolean {
        for (const req of requirements) {
            if (!this.hasCurrency(req.type, req.amount)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 批量消耗货币
     */
    public spendMultipleCurrencies(
        requirements: { type: CurrencyType; amount: number }[], 
        reason: string
    ): boolean {
        // 先检查是否都足够
        if (!this.hasAllCurrencies(requirements)) {
            return false;
        }
        
        // 全部消耗
        for (const req of requirements) {
            this.spendCurrency(req.type, req.amount, reason);
        }
        
        return true;
    }

    /**
     * 使用钻石购买其他货币
     */
    public buyWithDiamond(type: CurrencyType, times: number = 1): boolean {
        const config = this._configs.get(type);
        if (!config || !config.canBuy || !config.buyPrice || !config.buyAmount) {
            console.log('该货币不可购买');
            return false;
        }
        
        const totalCost = config.buyPrice * times;
        const totalGain = config.buyAmount * times;
        
        if (!this.spendCurrency(CurrencyType.DIAMOND, totalCost, `购买${config.name}`)) {
            return false;
        }
        
        this.addCurrency(type, totalGain, '钻石购买');
        return true;
    }

    /**
     * 记录交易
     */
    private recordTransaction(
        type: CurrencyType, 
        amount: number, 
        reason: string, 
        balance: number
    ): void {
        this._transactions.push({
            type,
            amount,
            reason,
            timestamp: Date.now(),
            balance
        });
        
        // 限制记录数量
        if (this._transactions.length > this._maxTransactionHistory) {
            this._transactions.shift();
        }
    }

    /**
     * 获取交易记录
     */
    public getTransactions(type?: CurrencyType, limit: number = 20): CurrencyTransaction[] {
        let records = this._transactions;
        
        if (type) {
            records = records.filter(t => t.type === type);
        }
        
        return records.slice(-limit);
    }

    /**
     * 更新自动恢复
     */
    private updateRecovery(): void {
        const now = Date.now();
        
        for (const [type, config] of this._configs) {
            if (!config.recoverable || !config.recoveryRate || !config.recoveryMax) {
                continue;
            }
            
            const lastTime = this._lastRecoveryTime.get(type) || now;
            const elapsed = (now - lastTime) / 60000; // 转换为分钟
            const recovery = Math.floor(elapsed * config.recoveryRate);
            
            if (recovery > 0) {
                const current = this.getCurrency(type);
                if (current < config.recoveryMax) {
                    const newAmount = Math.min(current + recovery, config.recoveryMax);
                    if (newAmount > current) {
                        this.setCurrency(type, newAmount, '自动恢复');
                    }
                }
                this._lastRecoveryTime.set(type, now);
            }
        }
    }

    /**
     * 获取货币恢复信息
     */
    public getRecoveryInfo(type: CurrencyType): { 
        isRecoverable: boolean; 
        currentAmount: number;
        maxRecovery: number;
        recoveryRate: number;
        nextRecoveryTime: number; // 下次恢复的时间戳
        fullRecoveryTime: number; // 完全恢复的时间戳
    } | null {
        const config = this._configs.get(type);
        if (!config || !config.recoverable) {
            return null;
        }
        
        const current = this.getCurrency(type);
        const recoveryMax = config.recoveryMax || 0;
        const recoveryRate = config.recoveryRate || 0;
        
        const now = Date.now();
        const shortage = Math.max(0, recoveryMax - current);
        const recoveryMinutes = recoveryRate > 0 ? shortage / recoveryRate : 0;
        
        return {
            isRecoverable: true,
            currentAmount: current,
            maxRecovery: recoveryMax,
            recoveryRate: recoveryRate,
            nextRecoveryTime: current < recoveryMax ? now + 60000 / recoveryRate : 0,
            fullRecoveryTime: now + recoveryMinutes * 60000
        };
    }

    /**
     * 获取所有货币状态
     */
    public getAllCurrencies(): { type: CurrencyType; amount: number; config: CurrencyConfig }[] {
        const result: { type: CurrencyType; amount: number; config: CurrencyConfig }[] = [];
        
        for (const [type, config] of this._configs) {
            result.push({
                type,
                amount: this.getCurrency(type),
                config
            });
        }
        
        return result;
    }

    /**
     * 格式化货币数量（大数字简写）
     */
    public formatCurrency(amount: number): string {
        if (amount >= 1000000000) {
            return (amount / 1000000000).toFixed(1) + 'B';
        }
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        }
        if (amount >= 10000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toString();
    }

    /**
     * 保存数据
     */
    public saveData(): void {
        const data: any = {
            currencies: {},
            lastRecoveryTime: {},
            transactions: this._transactions.slice(-50) // 只保存最近50条
        };
        
        for (const [type, amount] of this._currencies) {
            data.currencies[type] = amount;
        }
        
        for (const [type, time] of this._lastRecoveryTime) {
            data.lastRecoveryTime[type] = time;
        }
        
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
        console.log('货币数据已保存');
    }

    /**
     * 加载数据
     */
    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (!saved) return;
        
        try {
            const data = JSON.parse(saved);
            
            if (data.currencies) {
                for (const [type, amount] of Object.entries(data.currencies)) {
                    this._currencies.set(type as CurrencyType, amount as number);
                }
            }
            
            if (data.lastRecoveryTime) {
                for (const [type, time] of Object.entries(data.lastRecoveryTime)) {
                    this._lastRecoveryTime.set(type as CurrencyType, time as number);
                }
            }
            
            if (data.transactions) {
                this._transactions = data.transactions;
            }
            
            console.log('货币数据已加载');
        } catch (e) {
            console.error('加载货币数据失败:', e);
        }
    }

    /**
     * 重置数据（测试用）
     */
    public resetData(): void {
        this._currencies.clear();
        this._transactions = [];
        this._lastRecoveryTime.clear();
        sys.localStorage.removeItem(this.SAVE_KEY);
        this.giveStarterCurrencies();
        console.log('货币数据已重置');
    }

    // ========== 便捷方法 ==========

    /** 获取金币 */
    public get gold(): number { return this.getCurrency(CurrencyType.GOLD); }
    
    /** 获取钻石 */
    public get diamond(): number { return this.getCurrency(CurrencyType.DIAMOND); }
    
    /** 获取体力 */
    public get stamina(): number { return this.getCurrency(CurrencyType.STAMINA); }
    
    /** 获取召唤券 */
    public get summonTicket(): number { return this.getCurrency(CurrencyType.SUMMON_TICKET); }

    /** 添加金币 */
    public addGold(amount: number, reason: string = '获得金币'): boolean {
        return this.addCurrency(CurrencyType.GOLD, amount, reason);
    }

    /** 消耗金币 */
    public spendGold(amount: number, reason: string = '消耗金币'): boolean {
        return this.spendCurrency(CurrencyType.GOLD, amount, reason);
    }

    /** 添加钻石 */
    public addDiamond(amount: number, reason: string = '获得钻石'): boolean {
        return this.addCurrency(CurrencyType.DIAMOND, amount, reason);
    }

    /** 消耗钻石 */
    public spendDiamond(amount: number, reason: string = '消耗钻石'): boolean {
        return this.spendCurrency(CurrencyType.DIAMOND, amount, reason);
    }

    /** 消耗体力 */
    public spendStamina(amount: number, reason: string = '挑战关卡'): boolean {
        return this.spendCurrency(CurrencyType.STAMINA, amount, reason);
    }

    /** 恢复体力 */
    public addStamina(amount: number, reason: string = '恢复体力'): boolean {
        return this.addCurrency(CurrencyType.STAMINA, amount, reason);
    }

    onDestroy() {
        this.saveData();
        this.unschedule(this.updateRecovery);
        
        if (CurrencyManager._instance === this) {
            CurrencyManager._instance = null;
        }
    }
}
