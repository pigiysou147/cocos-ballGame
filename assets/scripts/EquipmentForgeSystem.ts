import { _decorator, Component, sys, EventTarget } from 'cc';
import { 
    EquipmentDatabase, 
    EquipmentConfig, 
    EquipmentRarity, 
    EquipmentType,
    EquipmentStat,
    EquipmentStatType
} from './EquipmentData';
import { EquipmentManager } from './EquipmentManager';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 锻造配方
 */
export interface ForgeRecipe {
    id: string;
    name: string;
    description: string;
    resultEquipmentId: string;      // 产出装备ID
    resultCount: number;            // 产出数量
    
    // 材料
    materials: ForgeMaterial[];
    
    // 费用
    goldCost: number;
    
    // 解锁条件
    unlockLevel?: number;
    unlockRecipeIds?: string[];     // 前置配方
    
    // 成功率
    successRate: number;
    
    // 额外产出
    bonusDrops?: BonusDrop[];
    
    // 标签
    tags: string[];
}

/**
 * 锻造材料
 */
export interface ForgeMaterial {
    type: 'equipment' | 'currency' | 'material';
    id: string;                     // 装备ID/货币类型/材料ID
    count: number;
    rarity?: EquipmentRarity;       // 装备稀有度要求（可选）
    equipmentType?: EquipmentType;  // 装备类型要求（可选）
}

/**
 * 额外掉落
 */
export interface BonusDrop {
    type: 'equipment' | 'material';
    id: string;
    count: number;
    chance: number;                 // 掉落概率
}

/**
 * 锻造结果
 */
export interface ForgeResult {
    success: boolean;
    resultEquipmentIds: string[];   // 产出的装备uniqueId
    bonusDrops: { id: string; count: number }[];
    isCritical: boolean;            // 暴击（额外产出）
    message: string;
}

/**
 * 合成配方（多个低级装备合成高级）
 */
export interface SynthesisRecipe {
    id: string;
    name: string;
    sourceRarity: EquipmentRarity;
    sourceType: EquipmentType;
    sourceCount: number;
    resultRarity: EquipmentRarity;
    resultType: EquipmentType;
    goldCost: number;
    successRate: number;
}

/**
 * 装备锻造系统
 * Equipment Forge System - Crafting and synthesis
 */
@ccclass('EquipmentForgeSystem')
export class EquipmentForgeSystem extends Component {
    private static _instance: EquipmentForgeSystem | null = null;

    // 配方库
    private _recipes: Map<string, ForgeRecipe> = new Map();
    
    // 合成配方
    private _synthesisRecipes: SynthesisRecipe[] = [];
    
    // 已解锁配方
    private _unlockedRecipes: Set<string> = new Set();
    
    // 锻造材料库存
    private _forgeMaterials: Map<string, number> = new Map();

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_FORGE_SUCCESS = 'forge_success';
    public static readonly EVENT_FORGE_FAIL = 'forge_fail';
    public static readonly EVENT_SYNTHESIS_SUCCESS = 'synthesis_success';
    public static readonly EVENT_RECIPE_UNLOCKED = 'recipe_unlocked';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_equipment_forge';

    // 暴击概率
    private readonly CRITICAL_CHANCE = 0.1;

    public static get instance(): EquipmentForgeSystem | null {
        return EquipmentForgeSystem._instance;
    }

    onLoad() {
        if (EquipmentForgeSystem._instance) {
            this.node.destroy();
            return;
        }
        EquipmentForgeSystem._instance = this;

        this.initRecipes();
        this.initSynthesisRecipes();
        this.initForgeMaterials();
        this.loadData();
    }

    /**
     * 初始化锻造配方
     */
    private initRecipes(): void {
        // ==================== 武器配方 ====================
        
        this.addRecipe({
            id: 'recipe_iron_sword',
            name: '铁剑锻造',
            description: '锻造一把普通的铁剑',
            resultEquipmentId: 'equip_iron_sword',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'iron_ore', count: 5 },
                { type: 'material', id: 'wood', count: 2 }
            ],
            goldCost: 500,
            successRate: 1.0,
            tags: ['weapon', 'basic']
        });

        this.addRecipe({
            id: 'recipe_steel_sword',
            name: '精钢长剑锻造',
            description: '使用精炼钢材锻造优质长剑',
            resultEquipmentId: 'equip_steel_sword',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'steel_ingot', count: 3 },
                { type: 'material', id: 'magic_crystal', count: 1 },
                { type: 'equipment', id: 'equip_iron_sword', count: 1 }
            ],
            goldCost: 2000,
            unlockRecipeIds: ['recipe_iron_sword'],
            successRate: 0.9,
            bonusDrops: [
                { type: 'material', id: 'weapon_fragment', count: 1, chance: 0.3 }
            ],
            tags: ['weapon', 'advanced']
        });

        this.addRecipe({
            id: 'recipe_flame_sword',
            name: '烈焰之剑锻造',
            description: '注入火焰精华，锻造传说级火焰之剑',
            resultEquipmentId: 'equip_flame_sword',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'fire_essence', count: 10 },
                { type: 'material', id: 'dragon_scale', count: 3 },
                { type: 'material', id: 'legendary_core', count: 1 },
                { type: 'equipment', id: 'equip_steel_sword', count: 1 }
            ],
            goldCost: 50000,
            unlockLevel: 30,
            unlockRecipeIds: ['recipe_steel_sword'],
            successRate: 0.6,
            bonusDrops: [
                { type: 'material', id: 'fire_crystal', count: 2, chance: 0.5 }
            ],
            tags: ['weapon', 'legendary', 'fire']
        });

        // ==================== 护甲配方 ====================

        this.addRecipe({
            id: 'recipe_cloth_armor',
            name: '布甲制作',
            description: '制作基础布甲',
            resultEquipmentId: 'equip_cloth_armor',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'cloth', count: 5 },
                { type: 'material', id: 'thread', count: 3 }
            ],
            goldCost: 300,
            successRate: 1.0,
            tags: ['armor', 'basic']
        });

        this.addRecipe({
            id: 'recipe_flame_armor',
            name: '烈焰战甲锻造',
            description: '锻造燃烧不灭火焰的传说战甲',
            resultEquipmentId: 'equip_flame_armor',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'fire_essence', count: 8 },
                { type: 'material', id: 'dragon_leather', count: 5 },
                { type: 'material', id: 'legendary_core', count: 1 }
            ],
            goldCost: 45000,
            unlockLevel: 30,
            successRate: 0.6,
            tags: ['armor', 'legendary', 'fire']
        });

        this.addRecipe({
            id: 'recipe_frost_armor',
            name: '寒冰重甲锻造',
            description: '锻造永冻守护的寒冰重甲',
            resultEquipmentId: 'equip_frost_armor',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'ice_essence', count: 8 },
                { type: 'material', id: 'frost_steel', count: 5 },
                { type: 'material', id: 'legendary_core', count: 1 }
            ],
            goldCost: 45000,
            unlockLevel: 30,
            successRate: 0.6,
            tags: ['armor', 'legendary', 'water']
        });

        // ==================== 饰品配方 ====================

        this.addRecipe({
            id: 'recipe_copper_ring',
            name: '铜戒指制作',
            description: '打造简单的铜戒指',
            resultEquipmentId: 'equip_copper_ring',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'copper_ore', count: 3 }
            ],
            goldCost: 200,
            successRate: 1.0,
            tags: ['accessory', 'basic']
        });

        this.addRecipe({
            id: 'recipe_flame_ring',
            name: '烈焰戒指锻造',
            description: '制作封印火焰精灵的魔法戒指',
            resultEquipmentId: 'equip_flame_ring',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'fire_essence', count: 5 },
                { type: 'material', id: 'gold_ingot', count: 2 },
                { type: 'material', id: 'magic_gem', count: 1 }
            ],
            goldCost: 30000,
            unlockLevel: 30,
            successRate: 0.7,
            tags: ['accessory', 'legendary', 'fire']
        });

        // ==================== 材料合成配方 ====================

        this.addRecipe({
            id: 'recipe_steel_ingot',
            name: '精钢锭熔炼',
            description: '将铁矿石熔炼成精钢锭',
            resultEquipmentId: '',
            resultCount: 1,
            materials: [
                { type: 'material', id: 'iron_ore', count: 5 },
                { type: 'material', id: 'coal', count: 3 }
            ],
            goldCost: 100,
            successRate: 0.95,
            bonusDrops: [
                { type: 'material', id: 'steel_ingot', count: 1, chance: 1.0 }
            ],
            tags: ['material', 'basic']
        });

        this.addRecipe({
            id: 'recipe_fire_essence',
            name: '火焰精华提炼',
            description: '从火焰结晶中提炼火焰精华',
            resultEquipmentId: '',
            resultCount: 0,
            materials: [
                { type: 'material', id: 'fire_crystal', count: 3 }
            ],
            goldCost: 500,
            successRate: 0.9,
            bonusDrops: [
                { type: 'material', id: 'fire_essence', count: 1, chance: 1.0 }
            ],
            tags: ['material', 'element']
        });

        this.addRecipe({
            id: 'recipe_legendary_core',
            name: '传说核心合成',
            description: '将多个精华合成传说核心',
            resultEquipmentId: '',
            resultCount: 0,
            materials: [
                { type: 'material', id: 'fire_essence', count: 2 },
                { type: 'material', id: 'ice_essence', count: 2 },
                { type: 'material', id: 'wind_essence', count: 2 },
                { type: 'material', id: 'thunder_essence', count: 2 }
            ],
            goldCost: 10000,
            successRate: 0.5,
            bonusDrops: [
                { type: 'material', id: 'legendary_core', count: 1, chance: 1.0 }
            ],
            tags: ['material', 'legendary']
        });

        console.log(`锻造配方初始化完成，共 ${this._recipes.size} 个配方`);
    }

    /**
     * 初始化合成配方
     */
    private initSynthesisRecipes(): void {
        // 普通 -> 优秀
        this._synthesisRecipes.push({
            id: 'synthesis_common_to_uncommon',
            name: '普通装备合成',
            sourceRarity: EquipmentRarity.COMMON,
            sourceType: EquipmentType.WEAPON,
            sourceCount: 3,
            resultRarity: EquipmentRarity.UNCOMMON,
            resultType: EquipmentType.WEAPON,
            goldCost: 1000,
            successRate: 0.9
        });

        // 优秀 -> 稀有
        this._synthesisRecipes.push({
            id: 'synthesis_uncommon_to_rare',
            name: '优秀装备合成',
            sourceRarity: EquipmentRarity.UNCOMMON,
            sourceType: EquipmentType.WEAPON,
            sourceCount: 3,
            resultRarity: EquipmentRarity.RARE,
            resultType: EquipmentType.WEAPON,
            goldCost: 5000,
            successRate: 0.7
        });

        // 稀有 -> 史诗
        this._synthesisRecipes.push({
            id: 'synthesis_rare_to_epic',
            name: '稀有装备合成',
            sourceRarity: EquipmentRarity.RARE,
            sourceType: EquipmentType.WEAPON,
            sourceCount: 3,
            resultRarity: EquipmentRarity.EPIC,
            resultType: EquipmentType.WEAPON,
            goldCost: 20000,
            successRate: 0.5
        });

        // 史诗 -> 传说
        this._synthesisRecipes.push({
            id: 'synthesis_epic_to_legendary',
            name: '史诗装备合成',
            sourceRarity: EquipmentRarity.EPIC,
            sourceType: EquipmentType.WEAPON,
            sourceCount: 3,
            resultRarity: EquipmentRarity.LEGENDARY,
            resultType: EquipmentType.WEAPON,
            goldCost: 100000,
            successRate: 0.3
        });

        // 护甲合成
        for (let i = 0; i < this._synthesisRecipes.length; i++) {
            const weaponRecipe = this._synthesisRecipes[i];
            this._synthesisRecipes.push({
                ...weaponRecipe,
                id: weaponRecipe.id.replace('weapon', 'armor'),
                sourceType: EquipmentType.ARMOR,
                resultType: EquipmentType.ARMOR
            });
        }

        // 饰品合成
        const baseLength = this._synthesisRecipes.length;
        for (let i = 0; i < baseLength / 2; i++) {
            const recipe = this._synthesisRecipes[i];
            this._synthesisRecipes.push({
                ...recipe,
                id: recipe.id.replace('weapon', 'accessory'),
                sourceType: EquipmentType.ACCESSORY,
                resultType: EquipmentType.ACCESSORY
            });
        }
    }

    /**
     * 初始化锻造材料
     */
    private initForgeMaterials(): void {
        const materials = [
            // 基础材料
            'iron_ore', 'copper_ore', 'coal', 'wood', 'cloth', 'thread',
            // 进阶材料
            'steel_ingot', 'gold_ingot', 'magic_crystal', 'magic_gem',
            // 元素精华
            'fire_essence', 'ice_essence', 'wind_essence', 'thunder_essence',
            'light_essence', 'dark_essence',
            // 元素结晶
            'fire_crystal', 'ice_crystal', 'wind_crystal', 'thunder_crystal',
            // 稀有材料
            'dragon_scale', 'dragon_leather', 'frost_steel', 'legendary_core',
            // 碎片
            'weapon_fragment', 'armor_fragment', 'accessory_fragment'
        ];

        for (const mat of materials) {
            this._forgeMaterials.set(mat, 0);
        }
    }

    /**
     * 添加配方
     */
    private addRecipe(recipe: ForgeRecipe): void {
        this._recipes.set(recipe.id, recipe);
        
        // 基础配方默认解锁
        if (!recipe.unlockLevel && !recipe.unlockRecipeIds) {
            this._unlockedRecipes.add(recipe.id);
        }
    }

    /**
     * 锻造装备
     */
    public forge(recipeId: string): ForgeResult {
        const recipe = this._recipes.get(recipeId);
        if (!recipe) {
            return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '配方不存在' };
        }

        // 检查是否解锁
        if (!this._unlockedRecipes.has(recipeId)) {
            return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '配方未解锁' };
        }

        // 检查材料
        if (!this.checkMaterials(recipe.materials)) {
            return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '材料不足' };
        }

        // 检查金币
        const currencyManager = CurrencyManager.instance;
        if (currencyManager && !currencyManager.hasCurrency(CurrencyType.GOLD, recipe.goldCost)) {
            return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '金币不足' };
        }

        // 消耗材料
        this.consumeMaterials(recipe.materials);
        currencyManager?.spendCurrency(CurrencyType.GOLD, recipe.goldCost, '装备锻造');

        // 判定成功
        const isSuccess = Math.random() < recipe.successRate;
        const isCritical = isSuccess && Math.random() < this.CRITICAL_CHANCE;

        if (isSuccess) {
            const resultEquipmentIds: string[] = [];
            const bonusDrops: { id: string; count: number }[] = [];

            // 产出装备
            if (recipe.resultEquipmentId) {
                const manager = EquipmentManager.instance;
                const count = isCritical ? recipe.resultCount * 2 : recipe.resultCount;
                
                for (let i = 0; i < count && manager; i++) {
                    const equipment = manager.addEquipment(recipe.resultEquipmentId);
                    if (equipment) {
                        resultEquipmentIds.push(equipment.uniqueId);
                    }
                }
            }

            // 额外产出
            if (recipe.bonusDrops) {
                for (const drop of recipe.bonusDrops) {
                    if (Math.random() < drop.chance) {
                        const count = isCritical ? drop.count * 2 : drop.count;
                        if (drop.type === 'material') {
                            this.addMaterial(drop.id, count);
                        }
                        bonusDrops.push({ id: drop.id, count });
                    }
                }
            }

            this.saveData();

            this.events.emit(EquipmentForgeSystem.EVENT_FORGE_SUCCESS, {
                recipeId,
                resultEquipmentIds,
                bonusDrops,
                isCritical
            });

            return {
                success: true,
                resultEquipmentIds,
                bonusDrops,
                isCritical,
                message: isCritical ? '大成功！产出翻倍！' : '锻造成功！'
            };
        } else {
            this.events.emit(EquipmentForgeSystem.EVENT_FORGE_FAIL, { recipeId });

            return {
                success: false,
                resultEquipmentIds: [],
                bonusDrops: [],
                isCritical: false,
                message: '锻造失败，材料损失'
            };
        }
    }

    /**
     * 合成装备
     */
    public synthesize(equipmentIds: string[], targetRarity: EquipmentRarity, targetType: EquipmentType): ForgeResult {
        const manager = EquipmentManager.instance;
        if (!manager) {
            return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '系统错误' };
        }

        // 找到对应的合成配方
        const recipe = this._synthesisRecipes.find(r => 
            r.resultRarity === targetRarity && r.resultType === targetType
        );

        if (!recipe) {
            return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '无效的合成目标' };
        }

        // 检查数量
        if (equipmentIds.length < recipe.sourceCount) {
            return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: `需要${recipe.sourceCount}件装备` };
        }

        // 验证装备
        for (const equipId of equipmentIds) {
            const equipment = manager.getEquipmentInstance(equipId);
            const config = manager.getEquipmentConfig(equipId);
            
            if (!equipment || !config) {
                return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '装备不存在' };
            }
            
            if (config.rarity !== recipe.sourceRarity) {
                return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '装备稀有度不符' };
            }
            
            if (config.type !== recipe.sourceType) {
                return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '装备类型不符' };
            }
            
            if (equipment.equippedBy || equipment.isLocked) {
                return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '请先卸下或解锁装备' };
            }
        }

        // 检查金币
        const currencyManager = CurrencyManager.instance;
        if (currencyManager && !currencyManager.hasCurrency(CurrencyType.GOLD, recipe.goldCost)) {
            return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '金币不足' };
        }

        // 消耗材料装备
        for (const equipId of equipmentIds.slice(0, recipe.sourceCount)) {
            manager.removeEquipment(equipId);
        }
        currencyManager?.spendCurrency(CurrencyType.GOLD, recipe.goldCost, '装备合成');

        // 判定成功
        const isSuccess = Math.random() < recipe.successRate;

        if (isSuccess) {
            // 随机选择一个目标稀有度的装备
            const possibleEquipments = EquipmentDatabase.instance.getEquipmentsByRarity(targetRarity)
                .filter(e => e.type === targetType);
            
            if (possibleEquipments.length === 0) {
                return { success: false, resultEquipmentIds: [], bonusDrops: [], isCritical: false, message: '无可合成的装备' };
            }

            const selectedConfig = possibleEquipments[Math.floor(Math.random() * possibleEquipments.length)];
            const newEquipment = manager.addEquipment(selectedConfig.id);

            if (newEquipment) {
                this.events.emit(EquipmentForgeSystem.EVENT_SYNTHESIS_SUCCESS, {
                    resultEquipmentId: newEquipment.uniqueId,
                    resultRarity: targetRarity
                });

                return {
                    success: true,
                    resultEquipmentIds: [newEquipment.uniqueId],
                    bonusDrops: [],
                    isCritical: false,
                    message: `合成成功！获得${selectedConfig.name}`
                };
            }
        }

        return {
            success: false,
            resultEquipmentIds: [],
            bonusDrops: [],
            isCritical: false,
            message: '合成失败，材料损失'
        };
    }

    /**
     * 检查材料是否足够
     */
    private checkMaterials(materials: ForgeMaterial[]): boolean {
        const manager = EquipmentManager.instance;

        for (const mat of materials) {
            if (mat.type === 'material') {
                if ((this._forgeMaterials.get(mat.id) || 0) < mat.count) {
                    return false;
                }
            } else if (mat.type === 'equipment') {
                if (!manager) return false;
                const owned = manager.getAllEquipments().filter(e => {
                    if (e.equippedBy || e.isLocked) return false;
                    const config = manager.getEquipmentConfig(e.uniqueId);
                    if (!config) return false;
                    if (mat.id && config.id !== mat.id) return false;
                    if (mat.rarity && config.rarity < mat.rarity) return false;
                    if (mat.equipmentType && config.type !== mat.equipmentType) return false;
                    return true;
                });
                if (owned.length < mat.count) return false;
            } else if (mat.type === 'currency') {
                const currencyManager = CurrencyManager.instance;
                if (!currencyManager?.hasCurrency(mat.id as CurrencyType, mat.count)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 消耗材料
     */
    private consumeMaterials(materials: ForgeMaterial[]): void {
        const manager = EquipmentManager.instance;

        for (const mat of materials) {
            if (mat.type === 'material') {
                this.consumeMaterial(mat.id, mat.count);
            } else if (mat.type === 'equipment' && manager) {
                // 找到并消耗符合条件的装备
                const owned = manager.getAllEquipments().filter(e => {
                    if (e.equippedBy || e.isLocked) return false;
                    const config = manager.getEquipmentConfig(e.uniqueId);
                    if (!config) return false;
                    if (mat.id && config.id !== mat.id) return false;
                    if (mat.rarity && config.rarity < mat.rarity) return false;
                    if (mat.equipmentType && config.type !== mat.equipmentType) return false;
                    return true;
                });
                
                for (let i = 0; i < mat.count && i < owned.length; i++) {
                    manager.removeEquipment(owned[i].uniqueId);
                }
            } else if (mat.type === 'currency') {
                CurrencyManager.instance?.spendCurrency(mat.id as CurrencyType, mat.count, '锻造消耗');
            }
        }
    }

    /**
     * 解锁配方
     */
    public unlockRecipe(recipeId: string): boolean {
        const recipe = this._recipes.get(recipeId);
        if (!recipe) return false;

        if (this._unlockedRecipes.has(recipeId)) return false;

        // 检查前置配方
        if (recipe.unlockRecipeIds) {
            for (const preId of recipe.unlockRecipeIds) {
                if (!this._unlockedRecipes.has(preId)) {
                    return false;
                }
            }
        }

        this._unlockedRecipes.add(recipeId);
        this.saveData();

        this.events.emit(EquipmentForgeSystem.EVENT_RECIPE_UNLOCKED, { recipeId, recipe });

        return true;
    }

    /**
     * 获取所有配方
     */
    public getAllRecipes(): ForgeRecipe[] {
        return Array.from(this._recipes.values());
    }

    /**
     * 获取已解锁的配方
     */
    public getUnlockedRecipes(): ForgeRecipe[] {
        return Array.from(this._recipes.values()).filter(r => this._unlockedRecipes.has(r.id));
    }

    /**
     * 获取合成配方
     */
    public getSynthesisRecipes(): SynthesisRecipe[] {
        return [...this._synthesisRecipes];
    }

    /**
     * 检查配方是否解锁
     */
    public isRecipeUnlocked(recipeId: string): boolean {
        return this._unlockedRecipes.has(recipeId);
    }

    // ==================== 材料管理 ====================

    public addMaterial(materialId: string, count: number): void {
        const current = this._forgeMaterials.get(materialId) || 0;
        this._forgeMaterials.set(materialId, current + count);
        this.saveData();
    }

    public consumeMaterial(materialId: string, count: number): boolean {
        const current = this._forgeMaterials.get(materialId) || 0;
        if (current < count) return false;
        this._forgeMaterials.set(materialId, current - count);
        this.saveData();
        return true;
    }

    public getMaterialCount(materialId: string): number {
        return this._forgeMaterials.get(materialId) || 0;
    }

    public getAllMaterials(): Map<string, number> {
        return new Map(this._forgeMaterials);
    }

    // ==================== 存档 ====================

    public saveData(): void {
        const data = {
            unlockedRecipes: Array.from(this._unlockedRecipes),
            materials: Object.fromEntries(this._forgeMaterials)
        };
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.unlockedRecipes) {
                    this._unlockedRecipes = new Set(data.unlockedRecipes);
                }
                if (data.materials) {
                    for (const [id, count] of Object.entries(data.materials)) {
                        this._forgeMaterials.set(id, count as number);
                    }
                }
            } catch (e) {
                console.error('加载锻造数据失败:', e);
            }
        }
    }

    public resetData(): void {
        this._unlockedRecipes.clear();
        this._forgeMaterials.clear();
        this.initForgeMaterials();
        
        // 重新解锁基础配方
        for (const [id, recipe] of this._recipes) {
            if (!recipe.unlockLevel && !recipe.unlockRecipeIds) {
                this._unlockedRecipes.add(id);
            }
        }
        
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        if (EquipmentForgeSystem._instance === this) {
            EquipmentForgeSystem._instance = null;
        }
    }
}
