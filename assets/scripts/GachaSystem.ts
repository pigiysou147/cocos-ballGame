import { _decorator, Component, Node, sys, EventTarget } from 'cc';
import { CharacterRarity, ElementType, CharacterDatabase } from './CharacterData';
import { CharacterManager } from './CharacterManager';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 卡池类型
 */
export enum GachaPoolType {
    NORMAL = 'normal',           // 常驻池
    LIMITED = 'limited',         // 限定池
    ELEMENT = 'element',         // 属性池
    WEAPON = 'weapon',           // 武器池
    FRIEND = 'friend',           // 友情池
    NEWBIE = 'newbie'            // 新手池
}

/**
 * 召唤类型
 */
export enum SummonType {
    SINGLE = 'single',           // 单抽
    MULTI_10 = 'multi_10',       // 十连
    FRIEND_SINGLE = 'friend_single',  // 友情单抽
    FRIEND_MULTI = 'friend_multi'     // 友情十连
}

/**
 * 卡池配置
 */
export interface GachaPoolConfig {
    id: string;
    name: string;
    type: GachaPoolType;
    description: string;
    bannerImage: string;
    
    // 时间限制
    startTime?: number;
    endTime?: number;
    
    // UP角色（提升概率）
    upCharacterIds: string[];
    upRateBoost: number;          // UP角色概率提升倍率
    
    // 可抽取角色
    availableCharacterIds: string[];
    
    // 基础概率配置
    rates: GachaRateConfig;
    
    // 保底配置
    pity: PityConfig;
    
    // 消耗配置
    singleCost: { type: CurrencyType; amount: number };
    multiCost: { type: CurrencyType; amount: number };
    
    // 是否启用
    isActive: boolean;
}

/**
 * 概率配置
 */
export interface GachaRateConfig {
    [CharacterRarity.UR]: number;    // UR概率
    [CharacterRarity.SSR]: number;   // SSR概率
    [CharacterRarity.SR]: number;    // SR概率
    [CharacterRarity.R]: number;     // R概率
    [CharacterRarity.N]: number;     // N概率
}

/**
 * 保底配置
 */
export interface PityConfig {
    enabled: boolean;
    
    // 硬保底（必出最高稀有度）
    hardPity: number;             // 多少抽必出
    
    // 软保底（概率提升）
    softPityStart: number;        // 软保底开始抽数
    softPityRateIncrease: number; // 每抽概率增加
    
    // UP保底
    upGuarantee: boolean;         // 是否有UP保底
    upGuaranteeCount: number;     // 多少次非UP后保底UP
    
    // 十连保底
    multiGuaranteeRarity: CharacterRarity; // 十连保底稀有度
}

/**
 * 抽卡结果
 */
export interface GachaResult {
    characterId: string;
    rarity: CharacterRarity;
    isNew: boolean;               // 是否新角色
    isUp: boolean;                // 是否UP角色
    convertedItems?: {            // 重复角色转换
        type: string;
        amount: number;
    };
}

/**
 * 卡池抽卡记录
 */
export interface GachaHistory {
    poolId: string;
    totalPulls: number;           // 总抽数
    lastPullTime: number;         // 上次抽卡时间
    pityCounter: number;          // 当前保底计数
    upPityCounter: number;        // UP保底计数
    results: GachaResult[];       // 最近抽卡结果
}

/**
 * 抽卡统计
 */
export interface GachaStats {
    totalPulls: number;
    totalSpentDiamond: number;
    totalSpentTickets: number;
    rarityCount: { [key in CharacterRarity]?: number };
    upCount: number;
    newCharacterCount: number;
}

/**
 * 抽卡系统 - 管理角色召唤
 * Gacha System - Character summoning management
 */
@ccclass('GachaSystem')
export class GachaSystem extends Component {
    private static _instance: GachaSystem | null = null;

    // 卡池配置
    private _pools: Map<string, GachaPoolConfig> = new Map();
    
    // 抽卡历史
    private _history: Map<string, GachaHistory> = new Map();
    
    // 全局统计
    private _stats: GachaStats = {
        totalPulls: 0,
        totalSpentDiamond: 0,
        totalSpentTickets: 0,
        rarityCount: {},
        upCount: 0,
        newCharacterCount: 0
    };
    
    // 事件系统
    public events: EventTarget = new EventTarget();
    
    // 事件类型
    public static readonly EVENT_GACHA_RESULT = 'gacha_result';
    public static readonly EVENT_NEW_CHARACTER = 'new_character';
    public static readonly EVENT_PITY_RESET = 'pity_reset';
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_gacha_data';

    public static get instance(): GachaSystem | null {
        return GachaSystem._instance;
    }

    onLoad() {
        if (GachaSystem._instance) {
            this.node.destroy();
            return;
        }
        GachaSystem._instance = this;
        
        // 初始化卡池
        this.initPools();
        
        // 加载存档
        this.loadData();
    }

    /**
     * 初始化卡池配置
     */
    private initPools(): void {
        // 常驻池
        this._pools.set('pool_normal', {
            id: 'pool_normal',
            name: '常驻召唤',
            type: GachaPoolType.NORMAL,
            description: '包含所有常驻角色的召唤池',
            bannerImage: 'banner_normal',
            upCharacterIds: [],
            upRateBoost: 1,
            availableCharacterIds: this.getNormalPoolCharacters(),
            rates: {
                [CharacterRarity.UR]: 0.01,   // 1%
                [CharacterRarity.SSR]: 0.03,  // 3%
                [CharacterRarity.SR]: 0.12,   // 12%
                [CharacterRarity.R]: 0.40,    // 40%
                [CharacterRarity.N]: 0.44     // 44%
            },
            pity: {
                enabled: true,
                hardPity: 90,
                softPityStart: 75,
                softPityRateIncrease: 0.05,
                upGuarantee: false,
                upGuaranteeCount: 0,
                multiGuaranteeRarity: CharacterRarity.SR
            },
            singleCost: { type: CurrencyType.DIAMOND, amount: 300 },
            multiCost: { type: CurrencyType.DIAMOND, amount: 2700 },
            isActive: true
        });

        // 限定UP池
        this._pools.set('pool_limited', {
            id: 'pool_limited',
            name: '限定召唤・炎龙骑士',
            type: GachaPoolType.LIMITED,
            description: '限定角色「炎龙骑士·雷欧」概率UP！',
            bannerImage: 'banner_limited',
            upCharacterIds: ['char_fire_001'],
            upRateBoost: 5,
            availableCharacterIds: this.getLimitedPoolCharacters(),
            rates: {
                [CharacterRarity.UR]: 0.015,  // 1.5%
                [CharacterRarity.SSR]: 0.035, // 3.5%
                [CharacterRarity.SR]: 0.12,   // 12%
                [CharacterRarity.R]: 0.40,    // 40%
                [CharacterRarity.N]: 0.43     // 43%
            },
            pity: {
                enabled: true,
                hardPity: 80,
                softPityStart: 65,
                softPityRateIncrease: 0.06,
                upGuarantee: true,
                upGuaranteeCount: 2,
                multiGuaranteeRarity: CharacterRarity.SR
            },
            singleCost: { type: CurrencyType.DIAMOND, amount: 300 },
            multiCost: { type: CurrencyType.DIAMOND, amount: 2700 },
            isActive: true
        });

        // 属性UP池（火属性）
        this._pools.set('pool_fire', {
            id: 'pool_fire',
            name: '烈焰召唤',
            type: GachaPoolType.ELEMENT,
            description: '火属性角色出现概率大幅提升！',
            bannerImage: 'banner_fire',
            upCharacterIds: this.getElementCharacters(ElementType.FIRE),
            upRateBoost: 3,
            availableCharacterIds: this.getNormalPoolCharacters(),
            rates: {
                [CharacterRarity.UR]: 0.012,
                [CharacterRarity.SSR]: 0.033,
                [CharacterRarity.SR]: 0.12,
                [CharacterRarity.R]: 0.40,
                [CharacterRarity.N]: 0.435
            },
            pity: {
                enabled: true,
                hardPity: 90,
                softPityStart: 75,
                softPityRateIncrease: 0.05,
                upGuarantee: false,
                upGuaranteeCount: 0,
                multiGuaranteeRarity: CharacterRarity.SR
            },
            singleCost: { type: CurrencyType.DIAMOND, amount: 300 },
            multiCost: { type: CurrencyType.DIAMOND, amount: 2700 },
            isActive: true
        });

        // 友情召唤池
        this._pools.set('pool_friend', {
            id: 'pool_friend',
            name: '友情召唤',
            type: GachaPoolType.FRIEND,
            description: '使用友情点进行召唤',
            bannerImage: 'banner_friend',
            upCharacterIds: [],
            upRateBoost: 1,
            availableCharacterIds: this.getFriendPoolCharacters(),
            rates: {
                [CharacterRarity.UR]: 0,
                [CharacterRarity.SSR]: 0.005,  // 0.5%
                [CharacterRarity.SR]: 0.05,    // 5%
                [CharacterRarity.R]: 0.30,     // 30%
                [CharacterRarity.N]: 0.645     // 64.5%
            },
            pity: {
                enabled: false,
                hardPity: 0,
                softPityStart: 0,
                softPityRateIncrease: 0,
                upGuarantee: false,
                upGuaranteeCount: 0,
                multiGuaranteeRarity: CharacterRarity.R
            },
            singleCost: { type: CurrencyType.FRIEND_POINT, amount: 200 },
            multiCost: { type: CurrencyType.FRIEND_POINT, amount: 2000 },
            isActive: true
        });

        // 新手池（首次十连必出SSR+）
        this._pools.set('pool_newbie', {
            id: 'pool_newbie',
            name: '新手召唤',
            type: GachaPoolType.NEWBIE,
            description: '首次十连必得SSR以上角色！仅限一次',
            bannerImage: 'banner_newbie',
            upCharacterIds: [],
            upRateBoost: 1,
            availableCharacterIds: this.getNormalPoolCharacters(),
            rates: {
                [CharacterRarity.UR]: 0.02,
                [CharacterRarity.SSR]: 0.08,
                [CharacterRarity.SR]: 0.20,
                [CharacterRarity.R]: 0.40,
                [CharacterRarity.N]: 0.30
            },
            pity: {
                enabled: true,
                hardPity: 10,
                softPityStart: 1,
                softPityRateIncrease: 0,
                upGuarantee: false,
                upGuaranteeCount: 0,
                multiGuaranteeRarity: CharacterRarity.SSR
            },
            singleCost: { type: CurrencyType.DIAMOND, amount: 150 },  // 半价
            multiCost: { type: CurrencyType.DIAMOND, amount: 1350 },  // 半价
            isActive: true
        });
    }

    /**
     * 获取常驻池角色
     */
    private getNormalPoolCharacters(): string[] {
        const db = CharacterDatabase.instance;
        if (!db) return ['char_starter_001'];
        
        return db.getAllCharacters()
            .filter(c => c.rarity !== CharacterRarity.UR) // 常驻池不含UR
            .map(c => c.id);
    }

    /**
     * 获取限定池角色
     */
    private getLimitedPoolCharacters(): string[] {
        const db = CharacterDatabase.instance;
        if (!db) return ['char_starter_001'];
        
        return db.getAllCharacters().map(c => c.id);
    }

    /**
     * 获取友情池角色（低稀有度）
     */
    private getFriendPoolCharacters(): string[] {
        const db = CharacterDatabase.instance;
        if (!db) return ['char_starter_001'];
        
        return db.getAllCharacters()
            .filter(c => c.rarity === CharacterRarity.N || 
                        c.rarity === CharacterRarity.R || 
                        c.rarity === CharacterRarity.SR)
            .map(c => c.id);
    }

    /**
     * 获取指定属性角色
     */
    private getElementCharacters(element: ElementType): string[] {
        const db = CharacterDatabase.instance;
        if (!db) return [];
        
        return db.getCharactersByElement(element).map(c => c.id);
    }

    /**
     * 执行抽卡
     */
    public pull(poolId: string, type: SummonType): GachaResult[] | null {
        const pool = this._pools.get(poolId);
        if (!pool || !pool.isActive) {
            console.log('卡池不存在或已关闭');
            return null;
        }

        // 检查卡池时间限制
        if (pool.startTime && Date.now() < pool.startTime) {
            console.log('卡池尚未开放');
            return null;
        }
        if (pool.endTime && Date.now() > pool.endTime) {
            console.log('卡池已结束');
            return null;
        }

        // 确定抽卡次数和消耗
        let pullCount: number;
        let cost: { type: CurrencyType; amount: number };
        
        switch (type) {
            case SummonType.SINGLE:
            case SummonType.FRIEND_SINGLE:
                pullCount = 1;
                cost = pool.singleCost;
                break;
            case SummonType.MULTI_10:
            case SummonType.FRIEND_MULTI:
                pullCount = 10;
                cost = pool.multiCost;
                break;
            default:
                return null;
        }

        // 检查并消耗货币
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager) {
            console.log('货币系统未初始化');
            return null;
        }

        // 也可以使用召唤券
        let usedTicket = false;
        if (cost.type === CurrencyType.DIAMOND) {
            if (pullCount === 1 && currencyManager.hasCurrency(CurrencyType.SUMMON_TICKET, 1)) {
                // 使用单抽券
                if (!currencyManager.spendCurrency(CurrencyType.SUMMON_TICKET, 1, `${pool.name}单抽`)) {
                    return null;
                }
                usedTicket = true;
                this._stats.totalSpentTickets += 1;
            } else if (pullCount === 10 && currencyManager.hasCurrency(CurrencyType.SUMMON_TICKET_10, 1)) {
                // 使用十连券
                if (!currencyManager.spendCurrency(CurrencyType.SUMMON_TICKET_10, 1, `${pool.name}十连`)) {
                    return null;
                }
                usedTicket = true;
                this._stats.totalSpentTickets += 10;
            } else {
                // 使用钻石
                if (!currencyManager.spendCurrency(cost.type, cost.amount, `${pool.name}召唤`)) {
                    return null;
                }
                this._stats.totalSpentDiamond += cost.amount;
            }
        } else {
            // 友情点等其他货币
            if (!currencyManager.spendCurrency(cost.type, cost.amount, `${pool.name}召唤`)) {
                return null;
            }
        }

        // 获取或创建历史记录
        let history = this._history.get(poolId);
        if (!history) {
            history = {
                poolId,
                totalPulls: 0,
                lastPullTime: 0,
                pityCounter: 0,
                upPityCounter: 0,
                results: []
            };
            this._history.set(poolId, history);
        }

        // 执行抽卡
        const results: GachaResult[] = [];
        let guaranteedHighRarity = false;

        for (let i = 0; i < pullCount; i++) {
            const result = this.singlePull(pool, history);
            results.push(result);
            
            // 更新历史
            history.totalPulls++;
            history.pityCounter++;
            this._stats.totalPulls++;
            
            // 统计稀有度
            this._stats.rarityCount[result.rarity] = 
                (this._stats.rarityCount[result.rarity] || 0) + 1;
            
            if (result.isUp) {
                this._stats.upCount++;
            }
            if (result.isNew) {
                this._stats.newCharacterCount++;
            }

            // 检查是否触发保底
            if (result.rarity === CharacterRarity.UR || result.rarity === CharacterRarity.SSR) {
                history.pityCounter = 0;
                guaranteedHighRarity = true;
                
                // UP保底检查
                if (pool.pity.upGuarantee && !result.isUp && pool.upCharacterIds.length > 0) {
                    history.upPityCounter++;
                } else if (result.isUp) {
                    history.upPityCounter = 0;
                }
            }
        }

        // 十连保底（如果没有抽到高稀有度）
        if (pullCount === 10 && !guaranteedHighRarity && pool.pity.multiGuaranteeRarity) {
            // 替换最后一个结果
            const guaranteedResult = this.pullWithMinRarity(pool, history, pool.pity.multiGuaranteeRarity);
            results[results.length - 1] = guaranteedResult;
        }

        // 更新历史时间
        history.lastPullTime = Date.now();
        
        // 保存最近结果（最多保留100条）
        history.results.push(...results);
        if (history.results.length > 100) {
            history.results = history.results.slice(-100);
        }

        // 保存数据
        this.saveData();

        // 发送事件
        this.events.emit(GachaSystem.EVENT_GACHA_RESULT, {
            poolId,
            results,
            totalPulls: history.totalPulls,
            pityCounter: history.pityCounter
        });

        // 检查新角色
        for (const result of results) {
            if (result.isNew) {
                this.events.emit(GachaSystem.EVENT_NEW_CHARACTER, {
                    characterId: result.characterId,
                    rarity: result.rarity
                });
            }
        }

        return results;
    }

    /**
     * 单次抽卡
     */
    private singlePull(pool: GachaPoolConfig, history: GachaHistory): GachaResult {
        // 计算实际概率（考虑保底）
        const rates = this.calculateActualRates(pool, history);
        
        // 随机选择稀有度
        const rarity = this.rollRarity(rates);
        
        // 随机选择角色
        const characterId = this.rollCharacter(pool, rarity, history);
        
        // 检查是否为新角色
        const characterManager = CharacterManager.instance;
        const isNew = characterManager ? !characterManager.hasCharacter(characterId) : true;
        
        // 检查是否为UP角色
        const isUp = pool.upCharacterIds.includes(characterId);
        
        // 添加角色到玩家
        if (characterManager) {
            if (isNew) {
                characterManager.addCharacter(characterId);
            } else {
                // 重复角色转换为碎片或其他物品
                // 这里简化处理
            }
        }

        return {
            characterId,
            rarity,
            isNew,
            isUp,
            convertedItems: isNew ? undefined : {
                type: 'character_shard',
                amount: this.getConvertAmount(rarity)
            }
        };
    }

    /**
     * 带最低稀有度保底的抽卡
     */
    private pullWithMinRarity(
        pool: GachaPoolConfig, 
        history: GachaHistory, 
        minRarity: CharacterRarity
    ): GachaResult {
        // 强制最低稀有度
        const rarityOrder = [
            CharacterRarity.N, 
            CharacterRarity.R, 
            CharacterRarity.SR, 
            CharacterRarity.SSR, 
            CharacterRarity.UR
        ];
        const minIndex = rarityOrder.indexOf(minRarity);
        
        // 从最低稀有度开始随机
        const availableRarities = rarityOrder.slice(minIndex);
        const rarity = availableRarities[Math.floor(Math.random() * availableRarities.length)];
        
        const characterId = this.rollCharacter(pool, rarity, history);
        const characterManager = CharacterManager.instance;
        const isNew = characterManager ? !characterManager.hasCharacter(characterId) : true;
        const isUp = pool.upCharacterIds.includes(characterId);
        
        if (characterManager && isNew) {
            characterManager.addCharacter(characterId);
        }

        return {
            characterId,
            rarity,
            isNew,
            isUp
        };
    }

    /**
     * 计算实际概率（考虑软保底）
     */
    private calculateActualRates(pool: GachaPoolConfig, history: GachaHistory): GachaRateConfig {
        const rates = { ...pool.rates };
        
        if (!pool.pity.enabled) {
            return rates;
        }

        const pityCount = history.pityCounter;
        
        // 硬保底
        if (pityCount >= pool.pity.hardPity - 1) {
            rates[CharacterRarity.UR] = 1;
            rates[CharacterRarity.SSR] = 0;
            rates[CharacterRarity.SR] = 0;
            rates[CharacterRarity.R] = 0;
            rates[CharacterRarity.N] = 0;
            return rates;
        }

        // 软保底
        if (pityCount >= pool.pity.softPityStart) {
            const extraPulls = pityCount - pool.pity.softPityStart;
            const extraRate = extraPulls * pool.pity.softPityRateIncrease;
            
            rates[CharacterRarity.UR] = Math.min(
                rates[CharacterRarity.UR] + extraRate,
                1
            );
            
            // 重新分配其他概率
            const totalOther = 1 - rates[CharacterRarity.UR];
            const originalOther = 1 - pool.rates[CharacterRarity.UR];
            const scale = totalOther / originalOther;
            
            rates[CharacterRarity.SSR] *= scale;
            rates[CharacterRarity.SR] *= scale;
            rates[CharacterRarity.R] *= scale;
            rates[CharacterRarity.N] *= scale;
        }

        return rates;
    }

    /**
     * 随机稀有度
     */
    private rollRarity(rates: GachaRateConfig): CharacterRarity {
        const roll = Math.random();
        let cumulative = 0;

        const order: CharacterRarity[] = [
            CharacterRarity.UR,
            CharacterRarity.SSR,
            CharacterRarity.SR,
            CharacterRarity.R,
            CharacterRarity.N
        ];

        for (const rarity of order) {
            cumulative += rates[rarity];
            if (roll < cumulative) {
                return rarity;
            }
        }

        return CharacterRarity.N;
    }

    /**
     * 随机角色
     */
    private rollCharacter(
        pool: GachaPoolConfig, 
        rarity: CharacterRarity,
        history: GachaHistory
    ): string {
        const db = CharacterDatabase.instance;
        if (!db) return 'char_starter_001';

        // 获取该稀有度的可用角色
        let candidates = pool.availableCharacterIds
            .map(id => db.getCharacter(id))
            .filter(c => c && c.rarity === rarity)
            .map(c => c!.id);

        if (candidates.length === 0) {
            // 如果没有该稀有度角色，返回默认
            return 'char_starter_001';
        }

        // UP角色处理
        const upCandidates = candidates.filter(id => pool.upCharacterIds.includes(id));
        
        // UP保底检查
        if (pool.pity.upGuarantee && 
            upCandidates.length > 0 && 
            history.upPityCounter >= pool.pity.upGuaranteeCount) {
            // 必出UP角色
            return upCandidates[Math.floor(Math.random() * upCandidates.length)];
        }

        // UP概率提升
        if (upCandidates.length > 0 && pool.upRateBoost > 1) {
            const upWeight = pool.upRateBoost;
            const totalWeight = candidates.length - upCandidates.length + upCandidates.length * upWeight;
            const roll = Math.random() * totalWeight;
            
            if (roll < upCandidates.length * upWeight) {
                // 抽中UP角色
                return upCandidates[Math.floor(Math.random() * upCandidates.length)];
            }
        }

        // 普通随机
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    /**
     * 重复角色转换数量
     */
    private getConvertAmount(rarity: CharacterRarity): number {
        switch (rarity) {
            case CharacterRarity.UR: return 50;
            case CharacterRarity.SSR: return 20;
            case CharacterRarity.SR: return 5;
            case CharacterRarity.R: return 2;
            case CharacterRarity.N: return 1;
            default: return 1;
        }
    }

    // ========== 查询方法 ==========

    /**
     * 获取卡池信息
     */
    public getPool(poolId: string): GachaPoolConfig | undefined {
        return this._pools.get(poolId);
    }

    /**
     * 获取所有活跃卡池
     */
    public getActivePools(): GachaPoolConfig[] {
        const now = Date.now();
        return Array.from(this._pools.values()).filter(pool => {
            if (!pool.isActive) return false;
            if (pool.startTime && now < pool.startTime) return false;
            if (pool.endTime && now > pool.endTime) return false;
            return true;
        });
    }

    /**
     * 获取卡池历史
     */
    public getHistory(poolId: string): GachaHistory | undefined {
        return this._history.get(poolId);
    }

    /**
     * 获取保底进度
     */
    public getPityProgress(poolId: string): { current: number; max: number; rate: number } | null {
        const pool = this._pools.get(poolId);
        const history = this._history.get(poolId);
        
        if (!pool || !pool.pity.enabled) return null;
        
        const current = history?.pityCounter || 0;
        const max = pool.pity.hardPity;
        const rates = this.calculateActualRates(pool, history || {
            poolId,
            totalPulls: 0,
            lastPullTime: 0,
            pityCounter: 0,
            upPityCounter: 0,
            results: []
        });
        
        return {
            current,
            max,
            rate: rates[CharacterRarity.UR] + rates[CharacterRarity.SSR]
        };
    }

    /**
     * 获取全局统计
     */
    public getStats(): GachaStats {
        return { ...this._stats };
    }

    /**
     * 检查能否抽卡
     */
    public canPull(poolId: string, type: SummonType): boolean {
        const pool = this._pools.get(poolId);
        if (!pool || !pool.isActive) return false;
        
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager) return false;

        const isMulti = type === SummonType.MULTI_10 || type === SummonType.FRIEND_MULTI;
        const cost = isMulti ? pool.multiCost : pool.singleCost;

        // 检查召唤券
        if (cost.type === CurrencyType.DIAMOND) {
            if (!isMulti && currencyManager.hasCurrency(CurrencyType.SUMMON_TICKET, 1)) {
                return true;
            }
            if (isMulti && currencyManager.hasCurrency(CurrencyType.SUMMON_TICKET_10, 1)) {
                return true;
            }
        }

        return currencyManager.hasCurrency(cost.type, cost.amount);
    }

    // ========== 存档 ==========

    /**
     * 保存数据
     */
    public saveData(): void {
        const data: any = {
            history: {},
            stats: this._stats
        };
        
        for (const [poolId, history] of this._history) {
            data.history[poolId] = history;
        }
        
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    /**
     * 加载数据
     */
    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (!saved) return;
        
        try {
            const data = JSON.parse(saved);
            
            if (data.history) {
                for (const [poolId, history] of Object.entries(data.history)) {
                    this._history.set(poolId, history as GachaHistory);
                }
            }
            
            if (data.stats) {
                this._stats = data.stats;
            }
            
            console.log('抽卡数据已加载');
        } catch (e) {
            console.error('加载抽卡数据失败:', e);
        }
    }

    onDestroy() {
        this.saveData();
        
        if (GachaSystem._instance === this) {
            GachaSystem._instance = null;
        }
    }
}
