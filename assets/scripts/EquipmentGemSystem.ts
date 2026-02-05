import { _decorator, Component, sys, EventTarget } from 'cc';
import { EquipmentStatType, EquipmentStat, EquipmentInstance, EquipmentRarity } from './EquipmentData';
import { EquipmentManager } from './EquipmentManager';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 宝石类型
 */
export enum GemType {
    RUBY = 'ruby',           // 红宝石 - 攻击
    SAPPHIRE = 'sapphire',   // 蓝宝石 - 生命
    EMERALD = 'emerald',     // 绿宝石 - 防御
    TOPAZ = 'topaz',         // 黄宝石 - 速度
    DIAMOND = 'diamond',     // 钻石 - 暴击
    AMETHYST = 'amethyst',   // 紫水晶 - 技能
    OPAL = 'opal'            // 蛋白石 - 综合
}

/**
 * 宝石等级
 */
export enum GemGrade {
    ROUGH = 1,       // 粗糙
    POLISHED = 2,    // 打磨
    FLAWLESS = 3,    // 完美
    RADIANT = 4,     // 璀璨
    PERFECT = 5      // 至臻
}

/**
 * 宝石配置
 */
export interface GemConfig {
    id: string;
    type: GemType;
    grade: GemGrade;
    name: string;
    description: string;
    icon: string;
    
    // 属性加成
    stats: EquipmentStat[];
    
    // 套装效果（同类型宝石）
    setBonus?: {
        count: number;
        stats: EquipmentStat[];
    };
}

/**
 * 宝石实例
 */
export interface GemInstance {
    uniqueId: string;
    configId: string;
    
    // 镶嵌信息
    equippedTo?: string;        // 装备uniqueId
    slotIndex?: number;         // 槽位索引
    
    // 额外属性
    extraStats?: EquipmentStat[];
    
    // 获取时间
    obtainedAt: number;
}

/**
 * 装备宝石槽位
 */
export interface EquipmentGemSlots {
    equipmentId: string;
    slots: (string | null)[];   // 宝石uniqueId数组
    maxSlots: number;
}

/**
 * 镶嵌结果
 */
export interface SocketResult {
    success: boolean;
    gemId?: string;
    slotIndex?: number;
    message: string;
}

/**
 * 合成结果
 */
export interface GemCombineResult {
    success: boolean;
    newGemId?: string;
    newGemConfig?: GemConfig;
    message: string;
}

/**
 * 宝石镶嵌系统
 * Equipment Gem System - Gem socketing and enhancement
 */
@ccclass('EquipmentGemSystem')
export class EquipmentGemSystem extends Component {
    private static _instance: EquipmentGemSystem | null = null;

    // 宝石配置
    private _gemConfigs: Map<string, GemConfig> = new Map();
    
    // 玩家宝石
    private _gems: Map<string, GemInstance> = new Map();
    
    // 装备槽位
    private _equipmentSlots: Map<string, EquipmentGemSlots> = new Map();

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_GEM_SOCKETED = 'gem_socketed';
    public static readonly EVENT_GEM_REMOVED = 'gem_removed';
    public static readonly EVENT_GEM_COMBINED = 'gem_combined';
    public static readonly EVENT_SLOT_UNLOCKED = 'slot_unlocked';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_equipment_gems';

    // 配置
    private readonly BASE_SLOTS_BY_RARITY: { [key: number]: number } = {
        [EquipmentRarity.COMMON]: 0,
        [EquipmentRarity.UNCOMMON]: 1,
        [EquipmentRarity.RARE]: 1,
        [EquipmentRarity.EPIC]: 2,
        [EquipmentRarity.LEGENDARY]: 2,
        [EquipmentRarity.MYTHIC]: 3
    };

    private readonly COMBINE_COUNT = 3;  // 合成所需宝石数量

    public static get instance(): EquipmentGemSystem | null {
        return EquipmentGemSystem._instance;
    }

    onLoad() {
        if (EquipmentGemSystem._instance) {
            this.node.destroy();
            return;
        }
        EquipmentGemSystem._instance = this;

        this.initGemConfigs();
        this.loadData();
    }

    /**
     * 初始化宝石配置
     */
    private initGemConfigs(): void {
        const gemTypes = [
            { type: GemType.RUBY, name: '红宝石', stat: EquipmentStatType.ATTACK, percentStat: EquipmentStatType.ATTACK_PERCENT },
            { type: GemType.SAPPHIRE, name: '蓝宝石', stat: EquipmentStatType.HP, percentStat: EquipmentStatType.HP_PERCENT },
            { type: GemType.EMERALD, name: '绿宝石', stat: EquipmentStatType.DEFENSE, percentStat: EquipmentStatType.DEFENSE_PERCENT },
            { type: GemType.TOPAZ, name: '黄宝石', stat: EquipmentStatType.SPEED, percentStat: EquipmentStatType.SPEED_PERCENT },
            { type: GemType.DIAMOND, name: '钻石', stat: EquipmentStatType.CRIT_RATE, percentStat: EquipmentStatType.CRIT_DAMAGE },
            { type: GemType.AMETHYST, name: '紫水晶', stat: EquipmentStatType.SKILL_POWER, percentStat: EquipmentStatType.ENERGY_REGEN }
        ];

        const grades = [
            { grade: GemGrade.ROUGH, prefix: '粗糙的', baseValue: 10, percentValue: 0.02 },
            { grade: GemGrade.POLISHED, prefix: '打磨的', baseValue: 25, percentValue: 0.04 },
            { grade: GemGrade.FLAWLESS, prefix: '完美的', baseValue: 50, percentValue: 0.06 },
            { grade: GemGrade.RADIANT, prefix: '璀璨的', baseValue: 100, percentValue: 0.08 },
            { grade: GemGrade.PERFECT, prefix: '至臻', baseValue: 200, percentValue: 0.12 }
        ];

        // 生成所有宝石配置
        for (const gemType of gemTypes) {
            for (const gradeInfo of grades) {
                const id = `gem_${gemType.type}_${gradeInfo.grade}`;
                const isPercent = gemType.stat === EquipmentStatType.CRIT_RATE || 
                                  gemType.stat === EquipmentStatType.SKILL_POWER;
                
                const config: GemConfig = {
                    id,
                    type: gemType.type,
                    grade: gradeInfo.grade,
                    name: `${gradeInfo.prefix}${gemType.name}`,
                    description: this.generateGemDescription(gemType.type, gradeInfo.grade),
                    icon: `textures/gems/${gemType.type}_${gradeInfo.grade}`,
                    stats: [
                        {
                            type: gemType.stat,
                            value: isPercent ? gradeInfo.percentValue : gradeInfo.baseValue,
                            isPercent
                        }
                    ]
                };

                // 高等级宝石有额外属性
                if (gradeInfo.grade >= GemGrade.FLAWLESS) {
                    config.stats.push({
                        type: gemType.percentStat,
                        value: gradeInfo.percentValue * 0.5,
                        isPercent: true
                    });
                }

                // 套装效果（3个相同类型）
                if (gradeInfo.grade >= GemGrade.POLISHED) {
                    config.setBonus = {
                        count: 3,
                        stats: [{
                            type: gemType.percentStat,
                            value: gradeInfo.percentValue,
                            isPercent: true
                        }]
                    };
                }

                this._gemConfigs.set(id, config);
            }
        }

        // 特殊宝石 - 蛋白石（综合）
        for (const gradeInfo of grades) {
            const id = `gem_opal_${gradeInfo.grade}`;
            const config: GemConfig = {
                id,
                type: GemType.OPAL,
                grade: gradeInfo.grade,
                name: `${gradeInfo.prefix}蛋白石`,
                description: '蕴含多种属性的神秘宝石',
                icon: `textures/gems/opal_${gradeInfo.grade}`,
                stats: [
                    { type: EquipmentStatType.HP, value: gradeInfo.baseValue * 0.5, isPercent: false },
                    { type: EquipmentStatType.ATTACK, value: gradeInfo.baseValue * 0.3, isPercent: false },
                    { type: EquipmentStatType.DEFENSE, value: gradeInfo.baseValue * 0.2, isPercent: false }
                ]
            };
            this._gemConfigs.set(id, config);
        }

        console.log(`宝石配置初始化完成，共 ${this._gemConfigs.size} 种宝石`);
    }

    /**
     * 生成宝石描述
     */
    private generateGemDescription(type: GemType, grade: GemGrade): string {
        const typeDesc: { [key: string]: string } = {
            [GemType.RUBY]: '增强攻击力的火焰宝石',
            [GemType.SAPPHIRE]: '增强生命力的海洋宝石',
            [GemType.EMERALD]: '增强防御力的大地宝石',
            [GemType.TOPAZ]: '增强速度的风之宝石',
            [GemType.DIAMOND]: '增强暴击的珍贵宝石',
            [GemType.AMETHYST]: '增强技能的神秘宝石'
        };
        return typeDesc[type] || '神秘的宝石';
    }

    // ==================== 宝石获取 ====================

    /**
     * 添加宝石
     */
    public addGem(configId: string): GemInstance | null {
        const config = this._gemConfigs.get(configId);
        if (!config) {
            console.log('宝石配置不存在');
            return null;
        }

        const instance: GemInstance = {
            uniqueId: `gem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            configId,
            obtainedAt: Date.now()
        };

        this._gems.set(instance.uniqueId, instance);
        this.saveData();

        return instance;
    }

    /**
     * 移除宝石
     */
    public removeGem(gemId: string): boolean {
        const gem = this._gems.get(gemId);
        if (!gem) return false;

        // 如果已镶嵌，先拆下
        if (gem.equippedTo) {
            this.unsocketGem(gem.equippedTo, gem.slotIndex!);
        }

        this._gems.delete(gemId);
        this.saveData();
        return true;
    }

    // ==================== 镶嵌系统 ====================

    /**
     * 镶嵌宝石
     */
    public socketGem(equipmentId: string, gemId: string, slotIndex?: number): SocketResult {
        const gem = this._gems.get(gemId);
        if (!gem) {
            return { success: false, message: '宝石不存在' };
        }

        if (gem.equippedTo) {
            return { success: false, message: '宝石已镶嵌在其他装备' };
        }

        // 获取装备槽位信息
        let slots = this._equipmentSlots.get(equipmentId);
        if (!slots) {
            // 初始化槽位
            slots = this.initEquipmentSlots(equipmentId);
            if (!slots) {
                return { success: false, message: '装备不存在' };
            }
        }

        // 查找空槽位
        let targetSlot = slotIndex;
        if (targetSlot === undefined) {
            targetSlot = slots.slots.findIndex(s => s === null);
        }

        if (targetSlot < 0 || targetSlot >= slots.maxSlots) {
            return { success: false, message: '没有可用槽位' };
        }

        if (slots.slots[targetSlot] !== null) {
            return { success: false, message: '该槽位已有宝石' };
        }

        // 镶嵌
        slots.slots[targetSlot] = gemId;
        gem.equippedTo = equipmentId;
        gem.slotIndex = targetSlot;

        this.saveData();

        this.events.emit(EquipmentGemSystem.EVENT_GEM_SOCKETED, {
            equipmentId,
            gemId,
            slotIndex: targetSlot
        });

        return { 
            success: true, 
            gemId, 
            slotIndex: targetSlot, 
            message: '镶嵌成功' 
        };
    }

    /**
     * 拆卸宝石
     */
    public unsocketGem(equipmentId: string, slotIndex: number, destroyGem: boolean = false): SocketResult {
        const slots = this._equipmentSlots.get(equipmentId);
        if (!slots) {
            return { success: false, message: '装备不存在' };
        }

        if (slotIndex < 0 || slotIndex >= slots.maxSlots) {
            return { success: false, message: '无效的槽位' };
        }

        const gemId = slots.slots[slotIndex];
        if (!gemId) {
            return { success: false, message: '该槽位没有宝石' };
        }

        // 检查拆卸费用
        if (!destroyGem) {
            const config = this.getGemConfig(gemId);
            if (config) {
                const cost = this.getUnsocketCost(config.grade);
                const currencyManager = CurrencyManager.instance;
                if (currencyManager && !currencyManager.hasCurrency(CurrencyType.GOLD, cost)) {
                    return { success: false, message: '金币不足' };
                }
                currencyManager?.spendCurrency(CurrencyType.GOLD, cost, '宝石拆卸');
            }
        }

        // 拆卸
        slots.slots[slotIndex] = null;

        const gem = this._gems.get(gemId);
        if (gem) {
            gem.equippedTo = undefined;
            gem.slotIndex = undefined;
        }

        if (destroyGem) {
            this._gems.delete(gemId);
        }

        this.saveData();

        this.events.emit(EquipmentGemSystem.EVENT_GEM_REMOVED, {
            equipmentId,
            gemId,
            slotIndex,
            destroyed: destroyGem
        });

        return { success: true, gemId, slotIndex, message: destroyGem ? '宝石已销毁' : '拆卸成功' };
    }

    /**
     * 获取拆卸费用
     */
    public getUnsocketCost(grade: GemGrade): number {
        const costs: { [key: number]: number } = {
            [GemGrade.ROUGH]: 100,
            [GemGrade.POLISHED]: 500,
            [GemGrade.FLAWLESS]: 2000,
            [GemGrade.RADIANT]: 10000,
            [GemGrade.PERFECT]: 50000
        };
        return costs[grade] || 100;
    }

    /**
     * 初始化装备槽位
     */
    private initEquipmentSlots(equipmentId: string): EquipmentGemSlots | null {
        const manager = EquipmentManager.instance;
        if (!manager) return null;

        const config = manager.getEquipmentConfig(equipmentId);
        if (!config) return null;

        const maxSlots = this.BASE_SLOTS_BY_RARITY[config.rarity] || 0;
        
        const slots: EquipmentGemSlots = {
            equipmentId,
            slots: new Array(maxSlots).fill(null),
            maxSlots
        };

        this._equipmentSlots.set(equipmentId, slots);
        return slots;
    }

    /**
     * 解锁额外槽位
     */
    public unlockSlot(equipmentId: string): boolean {
        let slots = this._equipmentSlots.get(equipmentId);
        if (!slots) {
            slots = this.initEquipmentSlots(equipmentId);
            if (!slots) return false;
        }

        const maxPossible = 4;  // 最多4个槽位
        if (slots.maxSlots >= maxPossible) {
            return false;
        }

        // 解锁费用
        const cost = Math.pow(10000, slots.maxSlots + 1);
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager?.hasCurrency(CurrencyType.DIAMOND, Math.floor(cost / 100))) {
            return false;
        }

        currencyManager.spendCurrency(CurrencyType.DIAMOND, Math.floor(cost / 100), '解锁宝石槽位');

        slots.maxSlots++;
        slots.slots.push(null);

        this.saveData();

        this.events.emit(EquipmentGemSystem.EVENT_SLOT_UNLOCKED, {
            equipmentId,
            newSlotCount: slots.maxSlots
        });

        return true;
    }

    // ==================== 宝石合成 ====================

    /**
     * 合成宝石
     */
    public combineGems(gemIds: string[]): GemCombineResult {
        if (gemIds.length < this.COMBINE_COUNT) {
            return { success: false, message: `需要${this.COMBINE_COUNT}个宝石` };
        }

        // 验证宝石
        const configs: GemConfig[] = [];
        for (const gemId of gemIds) {
            const gem = this._gems.get(gemId);
            if (!gem) {
                return { success: false, message: '宝石不存在' };
            }
            if (gem.equippedTo) {
                return { success: false, message: '请先拆下宝石' };
            }
            const config = this._gemConfigs.get(gem.configId);
            if (!config) {
                return { success: false, message: '宝石配置错误' };
            }
            configs.push(config);
        }

        // 检查是否同类型同等级
        const firstConfig = configs[0];
        for (const config of configs) {
            if (config.type !== firstConfig.type) {
                return { success: false, message: '需要相同类型的宝石' };
            }
            if (config.grade !== firstConfig.grade) {
                return { success: false, message: '需要相同等级的宝石' };
            }
        }

        // 检查是否可以升级
        if (firstConfig.grade >= GemGrade.PERFECT) {
            return { success: false, message: '已是最高等级' };
        }

        // 消耗金币
        const goldCost = this.getCombineCost(firstConfig.grade);
        const currencyManager = CurrencyManager.instance;
        if (currencyManager && !currencyManager.hasCurrency(CurrencyType.GOLD, goldCost)) {
            return { success: false, message: '金币不足' };
        }
        currencyManager?.spendCurrency(CurrencyType.GOLD, goldCost, '宝石合成');

        // 消耗宝石
        for (const gemId of gemIds.slice(0, this.COMBINE_COUNT)) {
            this._gems.delete(gemId);
        }

        // 生成新宝石
        const newGrade = firstConfig.grade + 1;
        const newConfigId = `gem_${firstConfig.type}_${newGrade}`;
        const newGem = this.addGem(newConfigId);

        if (!newGem) {
            return { success: false, message: '合成失败' };
        }

        const newConfig = this._gemConfigs.get(newConfigId);

        this.events.emit(EquipmentGemSystem.EVENT_GEM_COMBINED, {
            sourceGemIds: gemIds,
            newGemId: newGem.uniqueId,
            newConfig
        });

        return {
            success: true,
            newGemId: newGem.uniqueId,
            newGemConfig: newConfig,
            message: `合成成功！获得${newConfig?.name}`
        };
    }

    /**
     * 获取合成费用
     */
    public getCombineCost(grade: GemGrade): number {
        const costs: { [key: number]: number } = {
            [GemGrade.ROUGH]: 500,
            [GemGrade.POLISHED]: 2000,
            [GemGrade.FLAWLESS]: 10000,
            [GemGrade.RADIANT]: 50000
        };
        return costs[grade] || 500;
    }

    // ==================== 属性计算 ====================

    /**
     * 计算装备的宝石属性加成
     */
    public calculateGemStats(equipmentId: string): EquipmentStat[] {
        const stats: Map<EquipmentStatType, number> = new Map();
        const slots = this._equipmentSlots.get(equipmentId);
        
        if (!slots) return [];

        const socketedGems: GemConfig[] = [];

        // 收集镶嵌的宝石
        for (const gemId of slots.slots) {
            if (!gemId) continue;
            
            const gem = this._gems.get(gemId);
            if (!gem) continue;
            
            const config = this._gemConfigs.get(gem.configId);
            if (!config) continue;

            socketedGems.push(config);

            // 基础属性
            for (const stat of config.stats) {
                const current = stats.get(stat.type) || 0;
                stats.set(stat.type, current + stat.value);
            }

            // 额外属性
            if (gem.extraStats) {
                for (const stat of gem.extraStats) {
                    const current = stats.get(stat.type) || 0;
                    stats.set(stat.type, current + stat.value);
                }
            }
        }

        // 计算套装效果
        const gemTypeCounts: Map<GemType, number> = new Map();
        for (const config of socketedGems) {
            const count = gemTypeCounts.get(config.type) || 0;
            gemTypeCounts.set(config.type, count + 1);
        }

        for (const config of socketedGems) {
            if (!config.setBonus) continue;
            
            const count = gemTypeCounts.get(config.type) || 0;
            if (count >= config.setBonus.count) {
                for (const stat of config.setBonus.stats) {
                    const current = stats.get(stat.type) || 0;
                    // 套装效果只计算一次
                    const alreadyApplied = socketedGems.filter(g => 
                        g.type === config.type && g.setBonus
                    ).indexOf(config);
                    
                    if (alreadyApplied === 0) {
                        stats.set(stat.type, current + stat.value);
                    }
                }
            }
        }

        // 转换为数组
        const result: EquipmentStat[] = [];
        stats.forEach((value, type) => {
            const isPercent = type.includes('percent') || 
                             type === EquipmentStatType.CRIT_RATE || 
                             type === EquipmentStatType.CRIT_DAMAGE ||
                             type === EquipmentStatType.SKILL_POWER ||
                             type === EquipmentStatType.ENERGY_REGEN ||
                             type === EquipmentStatType.LIFESTEAL;
            result.push({ type, value, isPercent });
        });

        return result;
    }

    // ==================== 查询方法 ====================

    public getGemConfig(gemId: string): GemConfig | null {
        const gem = this._gems.get(gemId);
        if (!gem) return null;
        return this._gemConfigs.get(gem.configId) || null;
    }

    public getGemInstance(gemId: string): GemInstance | undefined {
        return this._gems.get(gemId);
    }

    public getAllGems(): GemInstance[] {
        return Array.from(this._gems.values());
    }

    public getUnequippedGems(): GemInstance[] {
        return this.getAllGems().filter(g => !g.equippedTo);
    }

    public getGemsByType(type: GemType): GemInstance[] {
        return this.getAllGems().filter(g => {
            const config = this._gemConfigs.get(g.configId);
            return config?.type === type;
        });
    }

    public getEquipmentSlots(equipmentId: string): EquipmentGemSlots | null {
        let slots = this._equipmentSlots.get(equipmentId);
        if (!slots) {
            slots = this.initEquipmentSlots(equipmentId);
        }
        return slots;
    }

    public getAllGemConfigs(): GemConfig[] {
        return Array.from(this._gemConfigs.values());
    }

    public getGemGradeName(grade: GemGrade): string {
        const names: { [key: number]: string } = {
            [GemGrade.ROUGH]: '粗糙',
            [GemGrade.POLISHED]: '打磨',
            [GemGrade.FLAWLESS]: '完美',
            [GemGrade.RADIANT]: '璀璨',
            [GemGrade.PERFECT]: '至臻'
        };
        return names[grade] || '未知';
    }

    public getGemTypeColor(type: GemType): string {
        const colors: { [key: string]: string } = {
            [GemType.RUBY]: '#FF4444',
            [GemType.SAPPHIRE]: '#4444FF',
            [GemType.EMERALD]: '#44FF44',
            [GemType.TOPAZ]: '#FFFF44',
            [GemType.DIAMOND]: '#FFFFFF',
            [GemType.AMETHYST]: '#AA44AA',
            [GemType.OPAL]: '#88FFFF'
        };
        return colors[type] || '#FFFFFF';
    }

    // ==================== 存档 ====================

    public saveData(): void {
        const data = {
            gems: Array.from(this._gems.entries()),
            equipmentSlots: Array.from(this._equipmentSlots.entries())
        };
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.gems) {
                    this._gems = new Map(data.gems);
                }
                if (data.equipmentSlots) {
                    this._equipmentSlots = new Map(data.equipmentSlots);
                }
            } catch (e) {
                console.error('加载宝石数据失败:', e);
            }
        }
    }

    public resetData(): void {
        this._gems.clear();
        this._equipmentSlots.clear();
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        if (EquipmentGemSystem._instance === this) {
            EquipmentGemSystem._instance = null;
        }
    }
}
