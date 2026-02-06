import { _decorator, EventTarget } from 'cc';
import { 
    WeaponSoulOrbSystem, 
    WeaponInstance, 
    WeaponConfig, 
    WeaponRarity,
    WeaponMaterialType,
    WeaponEnhanceResult,
    WeaponAwakeningResult,
    SoulOrbInstance
} from './WeaponSoulOrbSystem';

/**
 * 强化阶段
 */
export enum EnhanceStage {
    STAGE_1 = 1,    // 1-69级
    STAGE_2 = 2,    // 70级突破
    STAGE_3 = 3     // 70-99级
}

/**
 * 强化材料需求
 */
export interface EnhanceMaterialRequirement {
    type: WeaponMaterialType;
    amount: number;
}

/**
 * 觉醒材料需求
 */
export interface AwakeningMaterialRequirement {
    // 重复武器OR铁钢
    duplicateWeapon: boolean;       // 是否需要重复武器
    ironIngotType?: WeaponMaterialType; // 替代铁钢类型
    ironIngotAmount?: number;       // 替代铁钢数量
    
    // 锻造石
    forgingStoneAmount: number;
    
    // 金币
    goldCost: number;
}

/**
 * 强化配置
 */
export interface EnhanceConfig {
    // 基础经验需求（每级）
    baseExpRequired: number;
    
    // 经验成长系数
    expGrowthRate: number;
    
    // 材料配置
    materialConfigs: {
        stage: EnhanceStage;
        materials: EnhanceMaterialRequirement[];
        goldPerLevel: number;
    }[];
    
    // 突破材料（70级）
    breakthroughMaterials: EnhanceMaterialRequirement[];
    breakthroughGold: number;
}

/**
 * 觉醒配置
 */
export interface AwakeningConfig {
    // 每阶段需求
    stageRequirements: {
        stage: number;          // 1-5
        materials: AwakeningMaterialRequirement;
    }[];
    
    // 铁粒转铁钢比例
    ironParticleToIngotRatio: number;
}

/**
 * 武器觉醒与强化系统
 */
export class WeaponAwakeningSystem {
    private static _instance: WeaponAwakeningSystem | null = null;
    
    // 强化配置（按稀有度）
    private _enhanceConfigs: Map<WeaponRarity, EnhanceConfig> = new Map();
    
    // 觉醒配置（按稀有度）
    private _awakeningConfigs: Map<WeaponRarity, AwakeningConfig> = new Map();
    
    // 事件
    private _eventTarget: EventTarget = new EventTarget();
    
    public static get instance(): WeaponAwakeningSystem {
        if (!WeaponAwakeningSystem._instance) {
            WeaponAwakeningSystem._instance = new WeaponAwakeningSystem();
            WeaponAwakeningSystem._instance.initConfigs();
        }
        return WeaponAwakeningSystem._instance;
    }
    
    /**
     * 初始化配置
     */
    private initConfigs(): void {
        this.initEnhanceConfigs();
        this.initAwakeningConfigs();
        console.log('武器觉醒与强化系统初始化完成');
    }
    
    /**
     * 初始化强化配置
     */
    private initEnhanceConfigs(): void {
        // N级武器配置
        this._enhanceConfigs.set(WeaponRarity.N, {
            baseExpRequired: 50,
            expGrowthRate: 1.05,
            materialConfigs: [
                {
                    stage: EnhanceStage.STAGE_1,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 1 }
                    ],
                    goldPerLevel: 100
                }
            ],
            breakthroughMaterials: [],
            breakthroughGold: 0
        });
        
        // R级武器配置
        this._enhanceConfigs.set(WeaponRarity.R, {
            baseExpRequired: 80,
            expGrowthRate: 1.08,
            materialConfigs: [
                {
                    stage: EnhanceStage.STAGE_1,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 1 }
                    ],
                    goldPerLevel: 200
                },
                {
                    stage: EnhanceStage.STAGE_3,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 2 },
                        { type: WeaponMaterialType.STARLIGHT_CRYSTAL, amount: 1 }
                    ],
                    goldPerLevel: 500
                }
            ],
            breakthroughMaterials: [
                { type: WeaponMaterialType.STARLIGHT_CRYSTAL, amount: 5 }
            ],
            breakthroughGold: 5000
        });
        
        // SR级武器配置
        this._enhanceConfigs.set(WeaponRarity.SR, {
            baseExpRequired: 120,
            expGrowthRate: 1.1,
            materialConfigs: [
                {
                    stage: EnhanceStage.STAGE_1,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 2 }
                    ],
                    goldPerLevel: 300
                },
                {
                    stage: EnhanceStage.STAGE_3,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 3 },
                        { type: WeaponMaterialType.STARLIGHT_CRYSTAL, amount: 2 },
                        { type: WeaponMaterialType.ABYSS_MATTER, amount: 1 }
                    ],
                    goldPerLevel: 800
                }
            ],
            breakthroughMaterials: [
                { type: WeaponMaterialType.STARLIGHT_CRYSTAL, amount: 10 },
                { type: WeaponMaterialType.ABYSS_MATTER, amount: 2 }
            ],
            breakthroughGold: 10000
        });
        
        // SSR级武器配置
        this._enhanceConfigs.set(WeaponRarity.SSR, {
            baseExpRequired: 180,
            expGrowthRate: 1.12,
            materialConfigs: [
                {
                    stage: EnhanceStage.STAGE_1,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 3 }
                    ],
                    goldPerLevel: 500
                },
                {
                    stage: EnhanceStage.STAGE_3,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 4 },
                        { type: WeaponMaterialType.STARLIGHT_CRYSTAL, amount: 3 },
                        { type: WeaponMaterialType.ABYSS_MATTER, amount: 2 }
                    ],
                    goldPerLevel: 1200
                }
            ],
            breakthroughMaterials: [
                { type: WeaponMaterialType.STARLIGHT_CRYSTAL, amount: 15 },
                { type: WeaponMaterialType.ABYSS_MATTER, amount: 5 },
                { type: WeaponMaterialType.ELEMENT_CRYSTAL, amount: 1 }
            ],
            breakthroughGold: 20000
        });
        
        // UR级武器配置（最高级）
        this._enhanceConfigs.set(WeaponRarity.UR, {
            baseExpRequired: 250,
            expGrowthRate: 1.15,
            materialConfigs: [
                {
                    stage: EnhanceStage.STAGE_1,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 4 }
                    ],
                    goldPerLevel: 800
                },
                {
                    stage: EnhanceStage.STAGE_3,
                    materials: [
                        { type: WeaponMaterialType.MEMORY_STONE, amount: 5 },
                        { type: WeaponMaterialType.STARLIGHT_CRYSTAL, amount: 4 },
                        { type: WeaponMaterialType.ABYSS_MATTER, amount: 3 }
                    ],
                    goldPerLevel: 2000
                }
            ],
            breakthroughMaterials: [
                { type: WeaponMaterialType.STARLIGHT_CRYSTAL, amount: 20 },
                { type: WeaponMaterialType.ABYSS_MATTER, amount: 8 },
                { type: WeaponMaterialType.ELEMENT_CRYSTAL, amount: 2 }
            ],
            breakthroughGold: 50000
        });
    }
    
    /**
     * 初始化觉醒配置
     */
    private initAwakeningConfigs(): void {
        // N级武器觉醒配置
        this._awakeningConfigs.set(WeaponRarity.N, {
            stageRequirements: [
                { stage: 1, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_N, ironIngotAmount: 1, forgingStoneAmount: 1, goldCost: 500 }},
                { stage: 2, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_N, ironIngotAmount: 1, forgingStoneAmount: 2, goldCost: 1000 }},
                { stage: 3, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_N, ironIngotAmount: 2, forgingStoneAmount: 3, goldCost: 2000 }},
                { stage: 4, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_N, ironIngotAmount: 2, forgingStoneAmount: 4, goldCost: 3000 }},
                { stage: 5, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_N, ironIngotAmount: 3, forgingStoneAmount: 5, goldCost: 5000 }}
            ],
            ironParticleToIngotRatio: 10
        });
        
        // R级武器觉醒配置
        this._awakeningConfigs.set(WeaponRarity.R, {
            stageRequirements: [
                { stage: 1, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_R, ironIngotAmount: 1, forgingStoneAmount: 2, goldCost: 1000 }},
                { stage: 2, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_R, ironIngotAmount: 1, forgingStoneAmount: 3, goldCost: 2000 }},
                { stage: 3, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_R, ironIngotAmount: 2, forgingStoneAmount: 4, goldCost: 4000 }},
                { stage: 4, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_R, ironIngotAmount: 2, forgingStoneAmount: 5, goldCost: 6000 }},
                { stage: 5, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_R, ironIngotAmount: 3, forgingStoneAmount: 6, goldCost: 10000 }}
            ],
            ironParticleToIngotRatio: 10
        });
        
        // SR级武器觉醒配置
        this._awakeningConfigs.set(WeaponRarity.SR, {
            stageRequirements: [
                { stage: 1, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SR, ironIngotAmount: 1, forgingStoneAmount: 3, goldCost: 3000 }},
                { stage: 2, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SR, ironIngotAmount: 1, forgingStoneAmount: 4, goldCost: 5000 }},
                { stage: 3, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SR, ironIngotAmount: 2, forgingStoneAmount: 5, goldCost: 8000 }},
                { stage: 4, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SR, ironIngotAmount: 2, forgingStoneAmount: 6, goldCost: 12000 }},
                { stage: 5, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SR, ironIngotAmount: 3, forgingStoneAmount: 8, goldCost: 20000 }}
            ],
            ironParticleToIngotRatio: 10
        });
        
        // SSR级武器觉醒配置
        this._awakeningConfigs.set(WeaponRarity.SSR, {
            stageRequirements: [
                { stage: 1, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SSR, ironIngotAmount: 1, forgingStoneAmount: 5, goldCost: 5000 }},
                { stage: 2, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SSR, ironIngotAmount: 1, forgingStoneAmount: 6, goldCost: 10000 }},
                { stage: 3, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SSR, ironIngotAmount: 2, forgingStoneAmount: 8, goldCost: 15000 }},
                { stage: 4, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SSR, ironIngotAmount: 2, forgingStoneAmount: 10, goldCost: 25000 }},
                { stage: 5, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_SSR, ironIngotAmount: 3, forgingStoneAmount: 12, goldCost: 40000 }}
            ],
            ironParticleToIngotRatio: 10
        });
        
        // UR级武器觉醒配置
        this._awakeningConfigs.set(WeaponRarity.UR, {
            stageRequirements: [
                { stage: 1, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_UR, ironIngotAmount: 1, forgingStoneAmount: 8, goldCost: 10000 }},
                { stage: 2, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_UR, ironIngotAmount: 1, forgingStoneAmount: 10, goldCost: 20000 }},
                { stage: 3, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_UR, ironIngotAmount: 2, forgingStoneAmount: 12, goldCost: 35000 }},
                { stage: 4, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_UR, ironIngotAmount: 2, forgingStoneAmount: 15, goldCost: 50000 }},
                { stage: 5, materials: { duplicateWeapon: true, ironIngotType: WeaponMaterialType.IRON_INGOT_UR, ironIngotAmount: 3, forgingStoneAmount: 20, goldCost: 80000 }}
            ],
            ironParticleToIngotRatio: 10
        });
    }
    
    // ========== 强化系统 ==========
    
    /**
     * 获取当前强化阶段
     */
    public getEnhanceStage(level: number): EnhanceStage {
        if (level < 70) return EnhanceStage.STAGE_1;
        if (level === 70) return EnhanceStage.STAGE_2;
        return EnhanceStage.STAGE_3;
    }
    
    /**
     * 获取升级所需经验
     */
    public getExpRequired(rarity: WeaponRarity, currentLevel: number): number {
        const config = this._enhanceConfigs.get(rarity);
        if (!config) return Infinity;
        
        return Math.floor(config.baseExpRequired * Math.pow(config.expGrowthRate, currentLevel - 1));
    }
    
    /**
     * 获取强化材料需求
     */
    public getEnhanceMaterials(rarity: WeaponRarity, currentLevel: number): EnhanceMaterialRequirement[] {
        const config = this._enhanceConfigs.get(rarity);
        if (!config) return [];
        
        const stage = this.getEnhanceStage(currentLevel);
        const stageConfig = config.materialConfigs.find(c => c.stage === stage);
        
        return stageConfig?.materials || [];
    }
    
    /**
     * 获取强化金币需求
     */
    public getEnhanceGoldCost(rarity: WeaponRarity, currentLevel: number): number {
        const config = this._enhanceConfigs.get(rarity);
        if (!config) return 0;
        
        const stage = this.getEnhanceStage(currentLevel);
        const stageConfig = config.materialConfigs.find(c => c.stage === stage);
        
        return stageConfig?.goldPerLevel || 0;
    }
    
    /**
     * 检查是否可以强化
     */
    public canEnhance(weaponUniqueId: string): { canEnhance: boolean; reason?: string } {
        const system = WeaponSoulOrbSystem.instance;
        const weapon = system.getWeaponInstance(weaponUniqueId);
        if (!weapon) {
            return { canEnhance: false, reason: '武器不存在' };
        }
        
        const config = system.getWeaponConfig(weapon.configId);
        if (!config) {
            return { canEnhance: false, reason: '武器配置不存在' };
        }
        
        // 检查等级上限
        if (weapon.level >= 99) {
            return { canEnhance: false, reason: '已达最大等级' };
        }
        
        // 检查是否需要突破
        if (weapon.level === 69) {
            return { canEnhance: false, reason: '需要先进行70级突破' };
        }
        
        // 检查材料
        const materials = this.getEnhanceMaterials(config.rarity, weapon.level);
        for (const mat of materials) {
            if (system.getMaterialCount(mat.type) < mat.amount) {
                return { canEnhance: false, reason: `材料不足: ${this.getMaterialName(mat.type)}` };
            }
        }
        
        // 检查金币
        const goldCost = this.getEnhanceGoldCost(config.rarity, weapon.level);
        if (system.gold < goldCost) {
            return { canEnhance: false, reason: '金币不足' };
        }
        
        return { canEnhance: true };
    }
    
    /**
     * 执行强化
     */
    public enhance(weaponUniqueId: string): WeaponEnhanceResult {
        const check = this.canEnhance(weaponUniqueId);
        if (!check.canEnhance) {
            console.log(`强化失败: ${check.reason}`);
            return {
                success: false,
                previousLevel: 0,
                newLevel: 0,
                materialsConsumed: [],
                goldConsumed: 0
            };
        }
        
        const system = WeaponSoulOrbSystem.instance;
        const weapon = system.getWeaponInstance(weaponUniqueId)!;
        const config = system.getWeaponConfig(weapon.configId)!;
        
        const previousLevel = weapon.level;
        const materials = this.getEnhanceMaterials(config.rarity, weapon.level);
        const goldCost = this.getEnhanceGoldCost(config.rarity, weapon.level);
        
        // 消耗材料
        const consumed: { type: WeaponMaterialType; amount: number }[] = [];
        for (const mat of materials) {
            system.consumeMaterial(mat.type, mat.amount);
            consumed.push({ type: mat.type, amount: mat.amount });
        }
        
        // 消耗金币
        system.consumeGold(goldCost);
        
        // 升级
        weapon.level++;
        
        console.log(`武器强化成功: ${config.name} Lv.${previousLevel} → Lv.${weapon.level}`);
        
        this._eventTarget.emit('weapon-enhanced', {
            weaponId: weaponUniqueId,
            previousLevel,
            newLevel: weapon.level
        });
        
        return {
            success: true,
            previousLevel,
            newLevel: weapon.level,
            materialsConsumed: consumed,
            goldConsumed: goldCost
        };
    }
    
    /**
     * 批量强化到指定等级
     */
    public enhanceToLevel(weaponUniqueId: string, targetLevel: number): WeaponEnhanceResult[] {
        const results: WeaponEnhanceResult[] = [];
        
        const system = WeaponSoulOrbSystem.instance;
        let weapon = system.getWeaponInstance(weaponUniqueId);
        
        while (weapon && weapon.level < targetLevel) {
            const result = this.enhance(weaponUniqueId);
            results.push(result);
            
            if (!result.success) break;
            
            weapon = system.getWeaponInstance(weaponUniqueId);
        }
        
        return results;
    }
    
    /**
     * 70级突破
     */
    public breakthrough(weaponUniqueId: string): WeaponEnhanceResult {
        const system = WeaponSoulOrbSystem.instance;
        const weapon = system.getWeaponInstance(weaponUniqueId);
        
        if (!weapon) {
            return { success: false, previousLevel: 0, newLevel: 0, materialsConsumed: [], goldConsumed: 0 };
        }
        
        if (weapon.level !== 69) {
            console.log('只有69级的武器才能进行70级突破');
            return { success: false, previousLevel: weapon.level, newLevel: weapon.level, materialsConsumed: [], goldConsumed: 0 };
        }
        
        const config = system.getWeaponConfig(weapon.configId);
        if (!config) {
            return { success: false, previousLevel: weapon.level, newLevel: weapon.level, materialsConsumed: [], goldConsumed: 0 };
        }
        
        const enhanceConfig = this._enhanceConfigs.get(config.rarity);
        if (!enhanceConfig) {
            return { success: false, previousLevel: weapon.level, newLevel: weapon.level, materialsConsumed: [], goldConsumed: 0 };
        }
        
        // 检查突破材料
        for (const mat of enhanceConfig.breakthroughMaterials) {
            if (system.getMaterialCount(mat.type) < mat.amount) {
                console.log(`突破材料不足: ${this.getMaterialName(mat.type)}`);
                return { success: false, previousLevel: weapon.level, newLevel: weapon.level, materialsConsumed: [], goldConsumed: 0 };
            }
        }
        
        // 检查金币
        if (system.gold < enhanceConfig.breakthroughGold) {
            console.log('突破金币不足');
            return { success: false, previousLevel: weapon.level, newLevel: weapon.level, materialsConsumed: [], goldConsumed: 0 };
        }
        
        // 消耗材料
        const consumed: { type: WeaponMaterialType; amount: number }[] = [];
        for (const mat of enhanceConfig.breakthroughMaterials) {
            system.consumeMaterial(mat.type, mat.amount);
            consumed.push({ type: mat.type, amount: mat.amount });
        }
        
        // 消耗金币
        system.consumeGold(enhanceConfig.breakthroughGold);
        
        // 突破
        const previousLevel = weapon.level;
        weapon.level = 70;
        
        console.log(`武器突破成功: ${config.name} 突破至70级!`);
        
        this._eventTarget.emit('weapon-breakthrough', {
            weaponId: weaponUniqueId,
            previousLevel,
            newLevel: weapon.level
        });
        
        return {
            success: true,
            previousLevel,
            newLevel: weapon.level,
            materialsConsumed: consumed,
            goldConsumed: enhanceConfig.breakthroughGold
        };
    }
    
    // ========== 觉醒系统 ==========
    
    /**
     * 获取觉醒材料需求
     */
    public getAwakeningMaterials(rarity: WeaponRarity, currentAwakening: number): AwakeningMaterialRequirement | null {
        const config = this._awakeningConfigs.get(rarity);
        if (!config) return null;
        
        const targetStage = currentAwakening + 1;
        const stageReq = config.stageRequirements.find(s => s.stage === targetStage);
        
        return stageReq?.materials || null;
    }
    
    /**
     * 检查是否可以觉醒
     */
    public canAwaken(
        weaponUniqueId: string, 
        useDuplicate: boolean = true,
        duplicateWeaponId?: string
    ): { canAwaken: boolean; reason?: string } {
        const system = WeaponSoulOrbSystem.instance;
        const weapon = system.getWeaponInstance(weaponUniqueId);
        
        if (!weapon) {
            return { canAwaken: false, reason: '武器不存在' };
        }
        
        if (weapon.awakening >= 5) {
            return { canAwaken: false, reason: '已达最大觉醒阶段' };
        }
        
        const config = system.getWeaponConfig(weapon.configId);
        if (!config) {
            return { canAwaken: false, reason: '武器配置不存在' };
        }
        
        const materials = this.getAwakeningMaterials(config.rarity, weapon.awakening);
        if (!materials) {
            return { canAwaken: false, reason: '觉醒配置不存在' };
        }
        
        // 检查重复武器或铁钢
        if (useDuplicate) {
            if (!duplicateWeaponId) {
                return { canAwaken: false, reason: '需要提供重复武器' };
            }
            const duplicateWeapon = system.getWeaponInstance(duplicateWeaponId);
            if (!duplicateWeapon || duplicateWeapon.configId !== weapon.configId) {
                return { canAwaken: false, reason: '重复武器不匹配' };
            }
            if (duplicateWeapon.equippedBy) {
                return { canAwaken: false, reason: '重复武器已装备，请先卸下' };
            }
        } else {
            // 使用铁钢
            if (materials.ironIngotType && materials.ironIngotAmount) {
                if (system.getMaterialCount(materials.ironIngotType) < materials.ironIngotAmount) {
                    return { canAwaken: false, reason: `铁钢不足: ${this.getMaterialName(materials.ironIngotType)}` };
                }
            }
        }
        
        // 检查锻造石
        if (system.getMaterialCount(WeaponMaterialType.FORGING_STONE) < materials.forgingStoneAmount) {
            return { canAwaken: false, reason: '锻造石不足' };
        }
        
        // 检查金币
        if (system.gold < materials.goldCost) {
            return { canAwaken: false, reason: '金币不足' };
        }
        
        return { canAwaken: true };
    }
    
    /**
     * 执行觉醒
     */
    public awaken(
        weaponUniqueId: string,
        useDuplicate: boolean = true,
        duplicateWeaponId?: string
    ): WeaponAwakeningResult {
        const check = this.canAwaken(weaponUniqueId, useDuplicate, duplicateWeaponId);
        if (!check.canAwaken) {
            console.log(`觉醒失败: ${check.reason}`);
            return {
                success: false,
                previousAwakening: 0,
                newAwakening: 0,
                materialsConsumed: []
            };
        }
        
        const system = WeaponSoulOrbSystem.instance;
        const weapon = system.getWeaponInstance(weaponUniqueId)!;
        const config = system.getWeaponConfig(weapon.configId)!;
        const materials = this.getAwakeningMaterials(config.rarity, weapon.awakening)!;
        
        const previousAwakening = weapon.awakening;
        const consumed: { type: WeaponMaterialType; amount: number }[] = [];
        
        // 消耗重复武器或铁钢
        if (useDuplicate && duplicateWeaponId) {
            // 移除重复武器
            const allWeapons = system.getAllWeapons();
            const idx = allWeapons.findIndex(w => w.uniqueId === duplicateWeaponId);
            if (idx >= 0) {
                // 这里需要实现删除武器的方法
                console.log('消耗重复武器');
            }
        } else if (materials.ironIngotType && materials.ironIngotAmount) {
            system.consumeMaterial(materials.ironIngotType, materials.ironIngotAmount);
            consumed.push({ type: materials.ironIngotType, amount: materials.ironIngotAmount });
        }
        
        // 消耗锻造石
        system.consumeMaterial(WeaponMaterialType.FORGING_STONE, materials.forgingStoneAmount);
        consumed.push({ type: WeaponMaterialType.FORGING_STONE, amount: materials.forgingStoneAmount });
        
        // 消耗金币
        system.consumeGold(materials.goldCost);
        
        // 觉醒
        weapon.awakening++;
        
        // 生成魂珠
        const soulOrb = system.generateSoulOrb(weapon);
        
        // 检查是否解锁新被动
        let unlockedPassive: any = undefined;
        for (const passiveEntry of config.passives) {
            if (passiveEntry.awakening === weapon.awakening) {
                unlockedPassive = passiveEntry.passive;
                break;
            }
        }
        
        console.log(`武器觉醒成功: ${config.name} 觉醒 ${previousAwakening} → ${weapon.awakening}`);
        if (soulOrb) {
            const orbConfig = system.getSoulOrbConfig(soulOrb.configId);
            console.log(`获得魂珠: ${orbConfig?.name}`);
        }
        if (unlockedPassive) {
            console.log(`解锁被动: ${unlockedPassive.name}`);
        }
        
        this._eventTarget.emit('weapon-awakened', {
            weaponId: weaponUniqueId,
            previousAwakening,
            newAwakening: weapon.awakening,
            soulOrbId: soulOrb?.uniqueId
        });
        
        return {
            success: true,
            previousAwakening,
            newAwakening: weapon.awakening,
            soulOrbGenerated: soulOrb || undefined,
            passiveUnlocked: unlockedPassive,
            materialsConsumed: consumed
        };
    }
    
    // ========== 铁粒转铁钢 ==========
    
    /**
     * 铁粒转换为铁钢
     */
    public convertIronParticleToIngot(targetIngotType: WeaponMaterialType, amount: number): boolean {
        const system = WeaponSoulOrbSystem.instance;
        const particleNeeded = amount * 10; // 10铁粒 = 1铁钢
        
        if (system.getMaterialCount(WeaponMaterialType.IRON_PARTICLE) < particleNeeded) {
            console.log('铁粒不足');
            return false;
        }
        
        system.consumeMaterial(WeaponMaterialType.IRON_PARTICLE, particleNeeded);
        system.addMaterial(targetIngotType, amount);
        
        console.log(`转换成功: ${particleNeeded}铁粒 → ${amount}${this.getMaterialName(targetIngotType)}`);
        return true;
    }
    
    // ========== 分解系统 ==========
    
    /**
     * 分解武器获得材料
     */
    public decomposeWeapon(weaponUniqueId: string): { 
        success: boolean; 
        materialsGained: { type: WeaponMaterialType; amount: number }[] 
    } {
        const system = WeaponSoulOrbSystem.instance;
        const weapon = system.getWeaponInstance(weaponUniqueId);
        
        if (!weapon) {
            return { success: false, materialsGained: [] };
        }
        
        if (weapon.isLocked) {
            console.log('武器已锁定，无法分解');
            return { success: false, materialsGained: [] };
        }
        
        if (weapon.equippedBy) {
            console.log('武器已装备，请先卸下');
            return { success: false, materialsGained: [] };
        }
        
        const config = system.getWeaponConfig(weapon.configId);
        if (!config) {
            return { success: false, materialsGained: [] };
        }
        
        // 根据稀有度和等级计算返还材料
        const materialsGained: { type: WeaponMaterialType; amount: number }[] = [];
        
        // 返还铁粒
        const ironParticleAmount = config.rarity * 5 + Math.floor(weapon.level / 10);
        materialsGained.push({ type: WeaponMaterialType.IRON_PARTICLE, amount: ironParticleAmount });
        
        // 觉醒阶段返还部分锻造石
        if (weapon.awakening > 0) {
            const forgingStoneReturn = weapon.awakening * 2;
            materialsGained.push({ type: WeaponMaterialType.FORGING_STONE, amount: forgingStoneReturn });
        }
        
        // 高等级返还记忆石
        if (weapon.level > 50) {
            const memoryStoneReturn = Math.floor((weapon.level - 50) / 10);
            materialsGained.push({ type: WeaponMaterialType.MEMORY_STONE, amount: memoryStoneReturn });
        }
        
        // 添加材料
        for (const mat of materialsGained) {
            system.addMaterial(mat.type, mat.amount);
        }
        
        // 删除武器（这里需要实现删除逻辑）
        console.log(`分解武器: ${config.name}`);
        
        return { success: true, materialsGained };
    }
    
    // ========== 辅助方法 ==========
    
    /**
     * 获取材料名称
     */
    public getMaterialName(type: WeaponMaterialType): string {
        switch (type) {
            case WeaponMaterialType.MEMORY_STONE: return '记忆石';
            case WeaponMaterialType.STARLIGHT_CRYSTAL: return '星空记忆晶';
            case WeaponMaterialType.ABYSS_MATTER: return '深渊物质';
            case WeaponMaterialType.ELEMENT_CRYSTAL: return '属性记忆晶';
            case WeaponMaterialType.IRON_PARTICLE: return '铁粒';
            case WeaponMaterialType.IRON_INGOT_N: return 'N级铁钢';
            case WeaponMaterialType.IRON_INGOT_R: return 'R级铁钢';
            case WeaponMaterialType.IRON_INGOT_SR: return 'SR级铁钢';
            case WeaponMaterialType.IRON_INGOT_SSR: return 'SSR级铁钢';
            case WeaponMaterialType.IRON_INGOT_UR: return 'UR级铁钢';
            case WeaponMaterialType.FORGING_STONE: return '锻造石';
            default: return '未知材料';
        }
    }
    
    /**
     * 计算强化到满级所需材料
     */
    public calculateTotalMaterialsToMax(rarity: WeaponRarity, currentLevel: number): {
        materials: { type: WeaponMaterialType; amount: number }[];
        gold: number;
        estimatedDays: number;
    } {
        const config = this._enhanceConfigs.get(rarity);
        if (!config) {
            return { materials: [], gold: 0, estimatedDays: 0 };
        }
        
        const materialMap: Map<WeaponMaterialType, number> = new Map();
        let totalGold = 0;
        
        for (let level = currentLevel; level < 99; level++) {
            // 跳过70级突破
            if (level === 69) {
                for (const mat of config.breakthroughMaterials) {
                    const current = materialMap.get(mat.type) || 0;
                    materialMap.set(mat.type, current + mat.amount);
                }
                totalGold += config.breakthroughGold;
                continue;
            }
            
            const stage = this.getEnhanceStage(level);
            const stageConfig = config.materialConfigs.find(c => c.stage === stage);
            if (stageConfig) {
                for (const mat of stageConfig.materials) {
                    const current = materialMap.get(mat.type) || 0;
                    materialMap.set(mat.type, current + mat.amount);
                }
                totalGold += stageConfig.goldPerLevel;
            }
        }
        
        const materials: { type: WeaponMaterialType; amount: number }[] = [];
        materialMap.forEach((amount, type) => {
            materials.push({ type, amount });
        });
        
        // 估算天数（基于每日追忆试炼产出）
        const dailyMemoryStone = 3; // 假设每天获得3个记忆石
        const memoryStoneNeeded = materialMap.get(WeaponMaterialType.MEMORY_STONE) || 0;
        const estimatedDays = Math.ceil(memoryStoneNeeded / dailyMemoryStone);
        
        return { materials, gold: totalGold, estimatedDays };
    }
    
    // ========== 事件订阅 ==========
    
    public onWeaponEnhanced(callback: (data: any) => void): void {
        this._eventTarget.on('weapon-enhanced', callback);
    }
    
    public onWeaponBreakthrough(callback: (data: any) => void): void {
        this._eventTarget.on('weapon-breakthrough', callback);
    }
    
    public onWeaponAwakened(callback: (data: any) => void): void {
        this._eventTarget.on('weapon-awakened', callback);
    }
}
