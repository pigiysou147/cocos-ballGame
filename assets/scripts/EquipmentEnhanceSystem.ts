import { _decorator, Component, sys, EventTarget } from 'cc';
import { 
    EquipmentDatabase, 
    EquipmentInstance, 
    EquipmentRarity, 
    EquipmentStat, 
    EquipmentStatType,
    EquipmentConfig 
} from './EquipmentData';
import { EquipmentManager } from './EquipmentManager';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 强化结果
 */
export interface EnhanceResult {
    success: boolean;
    isGreatSuccess: boolean;     // 大成功（额外加成）
    newLevel: number;
    expGained: number;
    statsGained: EquipmentStat[];
    message: string;
}

/**
 * 分解结果
 */
export interface DecomposeResult {
    success: boolean;
    goldGained: number;
    enhanceStonesGained: number;
    materialsGained: DecomposeMaterial[];
    message: string;
}

/**
 * 分解材料
 */
export interface DecomposeMaterial {
    id: string;
    name: string;
    count: number;
    rarity: EquipmentRarity;
}

/**
 * 洗练结果
 */
export interface ReforgeResult {
    success: boolean;
    oldStats: EquipmentStat[];
    newStats: EquipmentStat[];
    canRevert: boolean;
    message: string;
}

/**
 * 传承结果
 */
export interface InheritResult {
    success: boolean;
    sourceDestroyed: boolean;
    levelTransferred: number;
    expLost: number;
    message: string;
}

/**
 * 强化保护配置
 */
export interface EnhanceProtection {
    enabled: boolean;
    preventDowngrade: boolean;   // 防止降级
    guaranteeSuccess: boolean;   // 保证成功
    costMultiplier: number;      // 费用倍率
}

/**
 * 装备强化系统
 * Equipment Enhance System - Enhancement, decomposition, reforge, inherit
 */
@ccclass('EquipmentEnhanceSystem')
export class EquipmentEnhanceSystem extends Component {
    private static _instance: EquipmentEnhanceSystem | null = null;

    // 强化材料库存
    private _materials: Map<string, number> = new Map();
    
    // 洗练保存（用于回退）
    private _reforgeBackup: Map<string, EquipmentStat[]> = new Map();

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_ENHANCE_SUCCESS = 'enhance_success';
    public static readonly EVENT_ENHANCE_FAIL = 'enhance_fail';
    public static readonly EVENT_DECOMPOSE = 'decompose';
    public static readonly EVENT_REFORGE = 'reforge';
    public static readonly EVENT_INHERIT = 'inherit';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_equipment_enhance';

    // 配置
    private readonly MAX_ENHANCE_LEVEL = 20;
    private readonly GREAT_SUCCESS_RATE = 0.1;  // 大成功概率
    private readonly GREAT_SUCCESS_BONUS = 1.5; // 大成功加成

    public static get instance(): EquipmentEnhanceSystem | null {
        return EquipmentEnhanceSystem._instance;
    }

    onLoad() {
        if (EquipmentEnhanceSystem._instance) {
            this.node.destroy();
            return;
        }
        EquipmentEnhanceSystem._instance = this;

        this.initMaterials();
        this.loadData();
    }

    /**
     * 初始化材料
     */
    private initMaterials(): void {
        // 强化石
        this._materials.set('enhance_stone_low', 0);
        this._materials.set('enhance_stone_mid', 0);
        this._materials.set('enhance_stone_high', 0);
        this._materials.set('enhance_stone_supreme', 0);
        
        // 洗练石
        this._materials.set('reforge_stone', 0);
        this._materials.set('reforge_stone_locked', 0);  // 锁定洗练石（保留部分属性）
        
        // 传承石
        this._materials.set('inherit_stone', 0);
        
        // 保护符
        this._materials.set('protection_charm', 0);      // 防止失败
        this._materials.set('blessing_charm', 0);        // 提升成功率
    }

    // ==================== 强化系统 ====================

    /**
     * 强化装备
     */
    public enhance(
        equipmentId: string, 
        useMaterials: { id: string; count: number }[],
        protection?: EnhanceProtection
    ): EnhanceResult {
        const manager = EquipmentManager.instance;
        if (!manager) {
            return { success: false, isGreatSuccess: false, newLevel: 0, expGained: 0, statsGained: [], message: '系统错误' };
        }

        const equipment = manager.getEquipmentInstance(equipmentId);
        const config = manager.getEquipmentConfig(equipmentId);
        if (!equipment || !config) {
            return { success: false, isGreatSuccess: false, newLevel: 0, expGained: 0, statsGained: [], message: '装备不存在' };
        }

        // 检查是否满级
        const maxLevel = config.maxLevel || this.MAX_ENHANCE_LEVEL;
        if (equipment.level >= maxLevel) {
            return { success: false, isGreatSuccess: false, newLevel: equipment.level, expGained: 0, statsGained: [], message: '装备已满级' };
        }

        // 计算费用
        const goldCost = this.calculateEnhanceCost(equipment.level, config.rarity, protection);
        
        // 检查金币
        const currencyManager = CurrencyManager.instance;
        if (currencyManager && !currencyManager.hasCurrency(CurrencyType.GOLD, goldCost)) {
            return { success: false, isGreatSuccess: false, newLevel: equipment.level, expGained: 0, statsGained: [], message: '金币不足' };
        }

        // 检查并消耗材料
        let totalExp = 0;
        for (const mat of useMaterials) {
            const have = this._materials.get(mat.id) || 0;
            if (have < mat.count) {
                return { success: false, isGreatSuccess: false, newLevel: equipment.level, expGained: 0, statsGained: [], message: `${mat.id}不足` };
            }
            totalExp += this.getMaterialExpValue(mat.id) * mat.count;
        }

        // 消耗资源
        currencyManager?.spendCurrency(CurrencyType.GOLD, goldCost, '装备强化');
        for (const mat of useMaterials) {
            this._materials.set(mat.id, (this._materials.get(mat.id) || 0) - mat.count);
        }

        // 消耗保护材料
        if (protection?.enabled) {
            if (protection.preventDowngrade) {
                this.consumeMaterial('protection_charm', 1);
            }
            if (protection.guaranteeSuccess) {
                this.consumeMaterial('blessing_charm', 1);
            }
        }

        // 计算成功率
        const baseSuccessRate = this.calculateSuccessRate(equipment.level, config.rarity);
        let successRate = baseSuccessRate;
        
        if (protection?.guaranteeSuccess) {
            successRate = 1.0;
        }

        // 判定成功
        const isSuccess = Math.random() < successRate;
        const isGreatSuccess = isSuccess && Math.random() < this.GREAT_SUCCESS_RATE;

        if (isSuccess) {
            // 计算实际获得经验
            let expGained = totalExp;
            if (isGreatSuccess) {
                expGained = Math.floor(expGained * this.GREAT_SUCCESS_BONUS);
            }

            // 增加经验并检查升级
            equipment.exp += expGained;
            const expRequired = this.getExpRequired(equipment.level, config.rarity);
            
            let levelsGained = 0;
            while (equipment.exp >= expRequired && equipment.level < maxLevel) {
                equipment.exp -= expRequired;
                equipment.level++;
                levelsGained++;
            }

            // 计算属性增长
            const statsGained: EquipmentStat[] = [];
            for (let i = 0; i < levelsGained; i++) {
                for (const stat of config.growthStats) {
                    statsGained.push({ ...stat });
                }
            }

            this.saveData();
            manager.saveData();

            this.events.emit(EquipmentEnhanceSystem.EVENT_ENHANCE_SUCCESS, {
                equipment,
                isGreatSuccess,
                levelsGained,
                statsGained
            });

            return {
                success: true,
                isGreatSuccess,
                newLevel: equipment.level,
                expGained,
                statsGained,
                message: isGreatSuccess ? '大成功！' : '强化成功！'
            };
        } else {
            // 强化失败
            if (!protection?.preventDowngrade && equipment.level > 5 && Math.random() < 0.1) {
                // 有概率降级
                equipment.level = Math.max(1, equipment.level - 1);
            }

            this.saveData();
            manager.saveData();

            this.events.emit(EquipmentEnhanceSystem.EVENT_ENHANCE_FAIL, { equipment });

            return {
                success: false,
                isGreatSuccess: false,
                newLevel: equipment.level,
                expGained: 0,
                statsGained: [],
                message: '强化失败'
            };
        }
    }

    /**
     * 计算强化费用
     */
    public calculateEnhanceCost(level: number, rarity: EquipmentRarity, protection?: EnhanceProtection): number {
        const baseCost = rarity * 500;
        let cost = Math.floor(baseCost * Math.pow(1.3, level));
        
        if (protection?.enabled) {
            cost = Math.floor(cost * (protection.costMultiplier || 2));
        }
        
        return cost;
    }

    /**
     * 计算成功率
     */
    public calculateSuccessRate(level: number, rarity: EquipmentRarity): number {
        const baseRate = 0.95;
        const decreasePerLevel = 0.03;
        const rarityBonus = rarity * 0.005;
        
        const rate = baseRate - level * (decreasePerLevel - rarityBonus);
        return Math.max(0.1, Math.min(1.0, rate));
    }

    /**
     * 获取升级所需经验
     */
    public getExpRequired(level: number, rarity: EquipmentRarity): number {
        const baseExp = 100 * rarity;
        return Math.floor(baseExp * Math.pow(1.4, level));
    }

    /**
     * 获取材料经验值
     */
    private getMaterialExpValue(materialId: string): number {
        const expMap: { [key: string]: number } = {
            'enhance_stone_low': 100,
            'enhance_stone_mid': 500,
            'enhance_stone_high': 2000,
            'enhance_stone_supreme': 10000
        };
        return expMap[materialId] || 0;
    }

    // ==================== 分解系统 ====================

    /**
     * 分解装备
     */
    public decompose(equipmentIds: string[]): DecomposeResult {
        const manager = EquipmentManager.instance;
        if (!manager) {
            return { success: false, goldGained: 0, enhanceStonesGained: 0, materialsGained: [], message: '系统错误' };
        }

        let totalGold = 0;
        let totalStones = 0;
        const materialsGained: DecomposeMaterial[] = [];
        const decomposedNames: string[] = [];

        for (const equipId of equipmentIds) {
            const equipment = manager.getEquipmentInstance(equipId);
            const config = manager.getEquipmentConfig(equipId);
            
            if (!equipment || !config) continue;
            
            if (equipment.isLocked) {
                continue;  // 跳过锁定的装备
            }
            
            if (equipment.equippedBy) {
                continue;  // 跳过已装备的
            }

            // 计算分解收益
            const { gold, stones, materials } = this.calculateDecomposeReward(equipment, config);
            
            totalGold += gold;
            totalStones += stones;
            
            for (const mat of materials) {
                const existing = materialsGained.find(m => m.id === mat.id);
                if (existing) {
                    existing.count += mat.count;
                } else {
                    materialsGained.push({ ...mat });
                }
            }

            decomposedNames.push(config.name);

            // 移除装备
            manager.removeEquipment(equipId);
        }

        if (decomposedNames.length === 0) {
            return { success: false, goldGained: 0, enhanceStonesGained: 0, materialsGained: [], message: '没有可分解的装备' };
        }

        // 发放收益
        const currencyManager = CurrencyManager.instance;
        if (currencyManager) {
            currencyManager.addCurrency(CurrencyType.GOLD, totalGold, '装备分解');
            currencyManager.addCurrency(CurrencyType.ENHANCE_STONE, totalStones, '装备分解');
        }

        // 添加材料
        for (const mat of materialsGained) {
            this.addMaterial(mat.id, mat.count);
        }

        this.saveData();

        this.events.emit(EquipmentEnhanceSystem.EVENT_DECOMPOSE, {
            count: decomposedNames.length,
            goldGained: totalGold,
            materialsGained
        });

        return {
            success: true,
            goldGained: totalGold,
            enhanceStonesGained: totalStones,
            materialsGained,
            message: `分解了${decomposedNames.length}件装备`
        };
    }

    /**
     * 计算分解收益
     */
    private calculateDecomposeReward(equipment: EquipmentInstance, config: EquipmentConfig): {
        gold: number;
        stones: number;
        materials: DecomposeMaterial[];
    } {
        const rarity = config.rarity;
        const level = equipment.level;

        // 基础金币
        const gold = Math.floor(rarity * 100 * (1 + level * 0.1));
        
        // 强化石（根据等级返还）
        const stones = Math.floor(level * rarity * 0.5);
        
        // 特殊材料
        const materials: DecomposeMaterial[] = [];
        
        // 根据稀有度给不同材料
        if (rarity >= EquipmentRarity.RARE) {
            materials.push({
                id: 'equip_essence_' + rarity,
                name: this.getEssenceName(rarity),
                count: Math.ceil(level / 5),
                rarity
            });
        }
        
        // 高级装备额外给洗练石
        if (rarity >= EquipmentRarity.EPIC) {
            materials.push({
                id: 'reforge_stone',
                name: '洗练石',
                count: Math.floor(rarity / 2),
                rarity: EquipmentRarity.RARE
            });
        }

        return { gold, stones, materials };
    }

    /**
     * 获取精华名称
     */
    private getEssenceName(rarity: EquipmentRarity): string {
        const names: { [key: number]: string } = {
            [EquipmentRarity.RARE]: '稀有精华',
            [EquipmentRarity.EPIC]: '史诗精华',
            [EquipmentRarity.LEGENDARY]: '传说精华',
            [EquipmentRarity.MYTHIC]: '神话精华'
        };
        return names[rarity] || '装备精华';
    }

    // ==================== 洗练系统 ====================

    /**
     * 洗练装备（重置随机属性）
     */
    public reforge(equipmentId: string, lockStatIndices?: number[]): ReforgeResult {
        const manager = EquipmentManager.instance;
        if (!manager) {
            return { success: false, oldStats: [], newStats: [], canRevert: false, message: '系统错误' };
        }

        const equipment = manager.getEquipmentInstance(equipmentId);
        const config = manager.getEquipmentConfig(equipmentId);
        if (!equipment || !config) {
            return { success: false, oldStats: [], newStats: [], canRevert: false, message: '装备不存在' };
        }

        // 检查洗练石
        const stoneCost = lockStatIndices && lockStatIndices.length > 0 ? 
            (this._materials.get('reforge_stone_locked') || 0) : 
            (this._materials.get('reforge_stone') || 0);
        
        const stoneType = lockStatIndices && lockStatIndices.length > 0 ? 'reforge_stone_locked' : 'reforge_stone';
        
        if (stoneCost < 1) {
            return { success: false, oldStats: [], newStats: [], canRevert: false, message: '洗练石不足' };
        }

        // 保存旧属性
        const oldStats = [...equipment.randomStats];
        this._reforgeBackup.set(equipmentId, oldStats);

        // 消耗洗练石
        this.consumeMaterial(stoneType, 1);

        // 生成新属性
        const newStats = this.generateReforgeStats(config, oldStats, lockStatIndices);
        equipment.randomStats = newStats;

        this.saveData();
        manager.saveData();

        this.events.emit(EquipmentEnhanceSystem.EVENT_REFORGE, {
            equipment,
            oldStats,
            newStats
        });

        return {
            success: true,
            oldStats,
            newStats,
            canRevert: true,
            message: '洗练成功'
        };
    }

    /**
     * 回退洗练
     */
    public revertReforge(equipmentId: string): boolean {
        const backup = this._reforgeBackup.get(equipmentId);
        if (!backup) return false;

        const manager = EquipmentManager.instance;
        const equipment = manager?.getEquipmentInstance(equipmentId);
        if (!equipment) return false;

        equipment.randomStats = backup;
        this._reforgeBackup.delete(equipmentId);

        manager.saveData();
        return true;
    }

    /**
     * 确认洗练
     */
    public confirmReforge(equipmentId: string): void {
        this._reforgeBackup.delete(equipmentId);
        this.saveData();
    }

    /**
     * 生成洗练属性
     */
    private generateReforgeStats(
        config: EquipmentConfig, 
        oldStats: EquipmentStat[], 
        lockIndices?: number[]
    ): EquipmentStat[] {
        const newStats: EquipmentStat[] = [];
        
        // 保留锁定的属性
        if (lockIndices) {
            for (const index of lockIndices) {
                if (index < oldStats.length) {
                    newStats.push({ ...oldStats[index] });
                }
            }
        }

        // 可能的属性池
        const possibleStats: EquipmentStatType[] = [
            EquipmentStatType.HP,
            EquipmentStatType.ATTACK,
            EquipmentStatType.DEFENSE,
            EquipmentStatType.SPEED,
            EquipmentStatType.CRIT_RATE,
            EquipmentStatType.CRIT_DAMAGE,
            EquipmentStatType.SKILL_POWER,
            EquipmentStatType.ENERGY_REGEN
        ];

        // 移除已有的属性类型
        const existingTypes = newStats.map(s => s.type);
        const availableStats = possibleStats.filter(s => !existingTypes.includes(s));

        // 生成剩余属性
        const targetCount = Math.min(config.rarity, 4);
        while (newStats.length < targetCount && availableStats.length > 0) {
            const index = Math.floor(Math.random() * availableStats.length);
            const type = availableStats[index];
            availableStats.splice(index, 1);

            const isPercent = type.includes('percent') || 
                             type === EquipmentStatType.CRIT_RATE || 
                             type === EquipmentStatType.CRIT_DAMAGE;
            
            let value: number;
            if (isPercent) {
                // 百分比：2%-15%（根据稀有度）
                const maxRate = 0.05 + config.rarity * 0.02;
                value = Math.random() * maxRate + 0.02;
                value = Math.round(value * 1000) / 1000;
            } else {
                // 固定值
                const baseValue = config.rarity * 15;
                value = Math.floor(baseValue + Math.random() * baseValue);
            }

            newStats.push({ type, value, isPercent });
        }

        return newStats;
    }

    // ==================== 传承系统 ====================

    /**
     * 传承（转移强化等级）
     */
    public inherit(sourceId: string, targetId: string): InheritResult {
        const manager = EquipmentManager.instance;
        if (!manager) {
            return { success: false, sourceDestroyed: false, levelTransferred: 0, expLost: 0, message: '系统错误' };
        }

        const source = manager.getEquipmentInstance(sourceId);
        const target = manager.getEquipmentInstance(targetId);
        const sourceConfig = manager.getEquipmentConfig(sourceId);
        const targetConfig = manager.getEquipmentConfig(targetId);

        if (!source || !target || !sourceConfig || !targetConfig) {
            return { success: false, sourceDestroyed: false, levelTransferred: 0, expLost: 0, message: '装备不存在' };
        }

        if (source.level <= 1) {
            return { success: false, sourceDestroyed: false, levelTransferred: 0, expLost: 0, message: '源装备等级不足' };
        }

        if (source.equippedBy || target.equippedBy) {
            return { success: false, sourceDestroyed: false, levelTransferred: 0, expLost: 0, message: '请先卸下装备' };
        }

        // 检查传承石
        if ((this._materials.get('inherit_stone') || 0) < 1) {
            return { success: false, sourceDestroyed: false, levelTransferred: 0, expLost: 0, message: '传承石不足' };
        }

        // 消耗传承石
        this.consumeMaterial('inherit_stone', 1);

        // 计算传承等级（80%保留）
        const transferLevel = Math.floor(source.level * 0.8);
        const expLost = Math.floor(source.exp * 0.5);

        // 应用到目标
        const maxLevel = targetConfig.maxLevel || this.MAX_ENHANCE_LEVEL;
        target.level = Math.min(maxLevel, target.level + transferLevel);

        // 销毁源装备
        manager.removeEquipment(sourceId);

        this.saveData();
        manager.saveData();

        this.events.emit(EquipmentEnhanceSystem.EVENT_INHERIT, {
            targetId,
            levelTransferred: transferLevel
        });

        return {
            success: true,
            sourceDestroyed: true,
            levelTransferred: transferLevel,
            expLost,
            message: `成功传承${transferLevel}级`
        };
    }

    // ==================== 材料管理 ====================

    /**
     * 添加材料
     */
    public addMaterial(materialId: string, count: number): void {
        const current = this._materials.get(materialId) || 0;
        this._materials.set(materialId, current + count);
        this.saveData();
    }

    /**
     * 消耗材料
     */
    public consumeMaterial(materialId: string, count: number): boolean {
        const current = this._materials.get(materialId) || 0;
        if (current < count) return false;
        this._materials.set(materialId, current - count);
        this.saveData();
        return true;
    }

    /**
     * 获取材料数量
     */
    public getMaterialCount(materialId: string): number {
        return this._materials.get(materialId) || 0;
    }

    /**
     * 获取所有材料
     */
    public getAllMaterials(): Map<string, number> {
        return new Map(this._materials);
    }

    // ==================== 存档 ====================

    public saveData(): void {
        const data = {
            materials: Object.fromEntries(this._materials),
            reforgeBackup: Object.fromEntries(this._reforgeBackup)
        };
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.materials) {
                    for (const [id, count] of Object.entries(data.materials)) {
                        this._materials.set(id, count as number);
                    }
                }
            } catch (e) {
                console.error('加载强化数据失败:', e);
            }
        }
    }

    public resetData(): void {
        this._materials.clear();
        this._reforgeBackup.clear();
        this.initMaterials();
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        if (EquipmentEnhanceSystem._instance === this) {
            EquipmentEnhanceSystem._instance = null;
        }
    }
}
