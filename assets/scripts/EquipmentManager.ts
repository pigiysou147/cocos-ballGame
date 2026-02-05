import { _decorator, Component, Node, sys } from 'cc';
import { 
    EquipmentDatabase, 
    EquipmentConfig, 
    EquipmentInstance, 
    EquipmentType, 
    EquipmentRarity,
    EquipmentStat,
    EquipmentStatType,
    EquipmentSet,
    SetBonus
} from './EquipmentData';
import { CharacterManager } from './CharacterManager';
import { CharacterDatabase, CharacterStats } from './CharacterData';
const { ccclass, property } = _decorator;

/**
 * 强化结果
 */
export interface EnhanceResult {
    success: boolean;
    newLevel: number;
    statsGained: EquipmentStat[];
}

/**
 * 套装激活信息
 */
export interface ActiveSetInfo {
    set: EquipmentSet;
    equippedCount: number;
    activeBonuses: SetBonus[];
}

/**
 * 装备管理器 - 管理玩家拥有的装备
 * Equipment Manager - Manages player's equipment inventory
 */
@ccclass('EquipmentManager')
export class EquipmentManager extends Component {
    private static _instance: EquipmentManager | null = null;

    @property({ tooltip: '背包最大容量' })
    public maxInventorySize: number = 200;

    // 玩家拥有的装备
    private _inventory: Map<string, EquipmentInstance> = new Map();

    // 强化材料（金币）
    private _gold: number = 10000;

    // 强化石数量
    private _enhanceStones: number = 100;

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_equipment_data';

    public static get instance(): EquipmentManager | null {
        return EquipmentManager._instance;
    }

    public get gold(): number {
        return this._gold;
    }

    public get enhanceStones(): number {
        return this._enhanceStones;
    }

    onLoad() {
        if (EquipmentManager._instance) {
            this.node.destroy();
            return;
        }
        EquipmentManager._instance = this;
        
        this.loadData();

        // 如果没有装备，给予初始装备
        if (this._inventory.size === 0) {
            this.giveStarterEquipment();
        }
    }

    /**
     * 给予初始装备
     */
    private giveStarterEquipment(): void {
        this.addEquipment('equip_starter_sword');
        this.addEquipment('equip_cloth_armor');
        this.addEquipment('equip_copper_ring');
        console.log('已获得初始装备！');
    }

    /**
     * 添加装备到背包
     */
    public addEquipment(configId: string, randomStats?: EquipmentStat[]): EquipmentInstance | null {
        if (this._inventory.size >= this.maxInventorySize) {
            console.log('背包已满！');
            return null;
        }

        const config = EquipmentDatabase.instance.getEquipment(configId);
        if (!config) {
            console.error(`装备配置不存在: ${configId}`);
            return null;
        }

        // 生成随机属性
        const generatedRandomStats = randomStats || this.generateRandomStats(config);

        const instance: EquipmentInstance = {
            uniqueId: this.generateUniqueId(),
            configId: configId,
            level: 1,
            exp: 0,
            randomStats: generatedRandomStats,
            equippedBy: null,
            isLocked: false,
            obtainedAt: Date.now()
        };

        this._inventory.set(instance.uniqueId, instance);
        console.log(`获得装备: ${config.name}`);
        
        this.saveData();
        return instance;
    }

    /**
     * 生成随机属性
     */
    private generateRandomStats(config: EquipmentConfig): EquipmentStat[] {
        const stats: EquipmentStat[] = [];
        
        // 根据稀有度决定随机属性数量
        const statCount = Math.min(config.rarity, 4);
        
        // 可能的随机属性池
        const possibleStats: EquipmentStatType[] = [
            EquipmentStatType.HP,
            EquipmentStatType.ATTACK,
            EquipmentStatType.DEFENSE,
            EquipmentStatType.SPEED,
            EquipmentStatType.CRIT_RATE,
            EquipmentStatType.CRIT_DAMAGE
        ];

        // 随机选择属性
        const selectedTypes: EquipmentStatType[] = [];
        for (let i = 0; i < statCount && possibleStats.length > 0; i++) {
            const index = Math.floor(Math.random() * possibleStats.length);
            selectedTypes.push(possibleStats[index]);
            possibleStats.splice(index, 1);
        }

        // 生成属性值
        for (const type of selectedTypes) {
            const isPercent = type.includes('percent') || 
                              type === EquipmentStatType.CRIT_RATE || 
                              type === EquipmentStatType.CRIT_DAMAGE;
            
            let value: number;
            if (isPercent) {
                // 百分比属性：1%-10%
                value = (Math.random() * 0.09 + 0.01);
                value = Math.round(value * 1000) / 1000; // 保留3位小数
            } else {
                // 固定值属性：基于稀有度
                const baseValue = config.rarity * 10;
                value = Math.floor(baseValue + Math.random() * baseValue);
            }

            stats.push({ type, value, isPercent });
        }

        return stats;
    }

    /**
     * 移除装备
     */
    public removeEquipment(uniqueId: string): boolean {
        const instance = this._inventory.get(uniqueId);
        if (!instance) return false;

        if (instance.isLocked) {
            console.log('装备已锁定，无法移除');
            return false;
        }

        if (instance.equippedBy) {
            console.log('请先卸下装备');
            return false;
        }

        this._inventory.delete(uniqueId);
        this.saveData();
        return true;
    }

    /**
     * 获取装备实例
     */
    public getEquipmentInstance(uniqueId: string): EquipmentInstance | undefined {
        return this._inventory.get(uniqueId);
    }

    /**
     * 获取装备配置
     */
    public getEquipmentConfig(uniqueId: string): EquipmentConfig | undefined {
        const instance = this._inventory.get(uniqueId);
        if (!instance) return undefined;
        return EquipmentDatabase.instance.getEquipment(instance.configId);
    }

    /**
     * 获取所有装备
     */
    public getAllEquipments(): EquipmentInstance[] {
        return Array.from(this._inventory.values());
    }

    /**
     * 获取未装备的装备
     */
    public getUnequippedItems(): EquipmentInstance[] {
        return this.getAllEquipments().filter(e => !e.equippedBy);
    }

    /**
     * 根据类型筛选装备
     */
    public getEquipmentsByType(type: EquipmentType): EquipmentInstance[] {
        return this.getAllEquipments().filter(e => {
            const config = EquipmentDatabase.instance.getEquipment(e.configId);
            return config?.type === type;
        });
    }

    /**
     * 锁定/解锁装备
     */
    public toggleLock(uniqueId: string): boolean {
        const instance = this._inventory.get(uniqueId);
        if (!instance) return false;

        instance.isLocked = !instance.isLocked;
        this.saveData();
        return instance.isLocked;
    }

    // ==================== 装备穿戴 ====================

    /**
     * 为角色装备装备
     */
    public equipToCharacter(equipmentUniqueId: string, characterUniqueId: string): boolean {
        const equipment = this._inventory.get(equipmentUniqueId);
        if (!equipment) {
            console.log('装备不存在');
            return false;
        }

        const config = EquipmentDatabase.instance.getEquipment(equipment.configId);
        if (!config) return false;

        const charManager = CharacterManager.instance;
        if (!charManager) return false;

        const charInstance = charManager.getCharacterInstance(characterUniqueId);
        const charConfig = charManager.getCharacterConfig(characterUniqueId);
        if (!charInstance || !charConfig) {
            console.log('角色不存在');
            return false;
        }

        // 检查等级限制
        if (charInstance.level < config.requiredLevel) {
            console.log(`角色等级不足，需要 Lv.${config.requiredLevel}`);
            return false;
        }

        // 检查职业限制
        if (config.classRestrictions && config.classRestrictions.length > 0) {
            if (!config.classRestrictions.includes(charConfig.characterClass)) {
                console.log('职业不符合要求');
                return false;
            }
        }

        // 检查元素限制
        if (config.elementRestrictions && config.elementRestrictions.length > 0) {
            if (!config.elementRestrictions.includes(charConfig.element)) {
                console.log('元素不符合要求');
                return false;
            }
        }

        // 如果该槽位已有装备，先卸下
        const slotKey = this.getSlotKey(config.type);
        const currentEquipId = charInstance.equipmentSlots[slotKey as keyof typeof charInstance.equipmentSlots];
        if (currentEquipId) {
            this.unequipFromCharacter(currentEquipId);
        }

        // 如果装备已被其他角色穿戴，先卸下
        if (equipment.equippedBy && equipment.equippedBy !== characterUniqueId) {
            this.unequipFromCharacter(equipmentUniqueId);
        }

        // 装备
        equipment.equippedBy = characterUniqueId;
        (charInstance.equipmentSlots as any)[slotKey] = equipmentUniqueId;

        this.saveData();
        charManager.saveData();

        console.log(`${charConfig.name} 装备了 ${config.name}`);
        return true;
    }

    /**
     * 卸下装备
     */
    public unequipFromCharacter(equipmentUniqueId: string): boolean {
        const equipment = this._inventory.get(equipmentUniqueId);
        if (!equipment || !equipment.equippedBy) return false;

        const charManager = CharacterManager.instance;
        if (!charManager) return false;

        const charInstance = charManager.getCharacterInstance(equipment.equippedBy);
        if (charInstance) {
            const config = EquipmentDatabase.instance.getEquipment(equipment.configId);
            if (config) {
                const slotKey = this.getSlotKey(config.type);
                (charInstance.equipmentSlots as any)[slotKey] = undefined;
            }
        }

        equipment.equippedBy = null;

        this.saveData();
        charManager.saveData();

        return true;
    }

    /**
     * 获取槽位key
     */
    private getSlotKey(type: EquipmentType): string {
        switch (type) {
            case EquipmentType.WEAPON: return 'weapon';
            case EquipmentType.ARMOR: return 'armor';
            case EquipmentType.ACCESSORY: return 'accessory';
            default: return 'weapon';
        }
    }

    /**
     * 获取角色装备的所有装备
     */
    public getCharacterEquipments(characterUniqueId: string): EquipmentInstance[] {
        return this.getAllEquipments().filter(e => e.equippedBy === characterUniqueId);
    }

    // ==================== 装备强化 ====================

    /**
     * 强化装备
     */
    public enhanceEquipment(uniqueId: string): EnhanceResult {
        const equipment = this._inventory.get(uniqueId);
        if (!equipment) {
            return { success: false, newLevel: 0, statsGained: [] };
        }

        const config = EquipmentDatabase.instance.getEquipment(equipment.configId);
        if (!config) {
            return { success: false, newLevel: 0, statsGained: [] };
        }

        // 检查是否已满级
        if (equipment.level >= config.maxLevel) {
            console.log('装备已达最大等级');
            return { success: false, newLevel: equipment.level, statsGained: [] };
        }

        // 计算强化费用
        const goldCost = this.getEnhanceCost(equipment.level, config.rarity);
        const stoneCost = Math.ceil(config.rarity / 2);

        // 检查资源
        if (this._gold < goldCost) {
            console.log('金币不足');
            return { success: false, newLevel: equipment.level, statsGained: [] };
        }
        if (this._enhanceStones < stoneCost) {
            console.log('强化石不足');
            return { success: false, newLevel: equipment.level, statsGained: [] };
        }

        // 计算成功率
        const successRate = this.getEnhanceSuccessRate(equipment.level, config.rarity);
        const isSuccess = Math.random() < successRate;

        // 扣除资源
        this._gold -= goldCost;
        this._enhanceStones -= stoneCost;

        if (isSuccess) {
            equipment.level++;
            
            // 计算获得的属性
            const statsGained = config.growthStats.map(stat => ({
                ...stat
            }));

            console.log(`强化成功！${config.name} +${equipment.level}`);
            this.saveData();

            return { 
                success: true, 
                newLevel: equipment.level, 
                statsGained 
            };
        } else {
            console.log('强化失败...');
            this.saveData();

            return { 
                success: false, 
                newLevel: equipment.level, 
                statsGained: [] 
            };
        }
    }

    /**
     * 获取强化费用
     */
    public getEnhanceCost(currentLevel: number, rarity: EquipmentRarity): number {
        const baseCost = rarity * 100;
        return Math.floor(baseCost * Math.pow(1.5, currentLevel - 1));
    }

    /**
     * 获取强化成功率
     */
    public getEnhanceSuccessRate(currentLevel: number, rarity: EquipmentRarity): number {
        // 基础成功率
        const baseRate = 1.0;
        // 每级降低的成功率
        const decreasePerLevel = 0.05;
        // 稀有度越高，降低越慢
        const rarityBonus = rarity * 0.01;

        const rate = baseRate - (currentLevel - 1) * (decreasePerLevel - rarityBonus);
        return Math.max(0.1, Math.min(1.0, rate));
    }

    // ==================== 套装系统 ====================

    /**
     * 获取角色激活的套装效果
     */
    public getActiveSetBonuses(characterUniqueId: string): ActiveSetInfo[] {
        const equipments = this.getCharacterEquipments(characterUniqueId);
        const setCountMap: Map<string, number> = new Map();

        // 统计每个套装的装备数量
        for (const equip of equipments) {
            const config = EquipmentDatabase.instance.getEquipment(equip.configId);
            if (config?.setId) {
                const count = setCountMap.get(config.setId) || 0;
                setCountMap.set(config.setId, count + 1);
            }
        }

        // 获取激活的套装效果
        const activeSetInfos: ActiveSetInfo[] = [];

        setCountMap.forEach((count, setId) => {
            const set = EquipmentDatabase.instance.getSet(setId);
            if (set) {
                const activeBonuses = set.bonuses.filter(b => count >= b.requiredCount);
                if (activeBonuses.length > 0) {
                    activeSetInfos.push({
                        set,
                        equippedCount: count,
                        activeBonuses
                    });
                }
            }
        });

        return activeSetInfos;
    }

    // ==================== 属性计算 ====================

    /**
     * 计算装备提供的总属性加成
     */
    public calculateEquipmentStats(characterUniqueId: string): Map<EquipmentStatType, number> {
        const totalStats: Map<EquipmentStatType, number> = new Map();
        const equipments = this.getCharacterEquipments(characterUniqueId);

        // 装备基础属性
        for (const equip of equipments) {
            const config = EquipmentDatabase.instance.getEquipment(equip.configId);
            if (!config) continue;

            // 计算当前等级的属性
            const stats = EquipmentDatabase.instance.calculateStats(config, equip.level);
            for (const stat of stats) {
                const current = totalStats.get(stat.type) || 0;
                totalStats.set(stat.type, current + stat.value);
            }

            // 随机属性
            for (const stat of equip.randomStats) {
                const current = totalStats.get(stat.type) || 0;
                totalStats.set(stat.type, current + stat.value);
            }
        }

        // 套装效果
        const activeSets = this.getActiveSetBonuses(characterUniqueId);
        for (const setInfo of activeSets) {
            for (const bonus of setInfo.activeBonuses) {
                for (const stat of bonus.stats) {
                    const current = totalStats.get(stat.type) || 0;
                    totalStats.set(stat.type, current + stat.value);
                }
            }
        }

        return totalStats;
    }

    /**
     * 应用装备属性到角色基础属性
     */
    public applyEquipmentToStats(baseStats: CharacterStats, characterUniqueId: string): CharacterStats {
        const equipStats = this.calculateEquipmentStats(characterUniqueId);
        const result = { ...baseStats };

        // 先应用固定值加成
        if (equipStats.has(EquipmentStatType.HP)) {
            result.hp += equipStats.get(EquipmentStatType.HP)!;
        }
        if (equipStats.has(EquipmentStatType.ATTACK)) {
            result.attack += equipStats.get(EquipmentStatType.ATTACK)!;
        }
        if (equipStats.has(EquipmentStatType.DEFENSE)) {
            result.defense += equipStats.get(EquipmentStatType.DEFENSE)!;
        }
        if (equipStats.has(EquipmentStatType.SPEED)) {
            result.speed += equipStats.get(EquipmentStatType.SPEED)!;
        }

        // 再应用百分比加成
        if (equipStats.has(EquipmentStatType.HP_PERCENT)) {
            result.hp = Math.floor(result.hp * (1 + equipStats.get(EquipmentStatType.HP_PERCENT)!));
        }
        if (equipStats.has(EquipmentStatType.ATTACK_PERCENT)) {
            result.attack = Math.floor(result.attack * (1 + equipStats.get(EquipmentStatType.ATTACK_PERCENT)!));
        }
        if (equipStats.has(EquipmentStatType.DEFENSE_PERCENT)) {
            result.defense = Math.floor(result.defense * (1 + equipStats.get(EquipmentStatType.DEFENSE_PERCENT)!));
        }
        if (equipStats.has(EquipmentStatType.SPEED_PERCENT)) {
            result.speed = Math.floor(result.speed * (1 + equipStats.get(EquipmentStatType.SPEED_PERCENT)!));
        }

        // 暴击属性
        if (equipStats.has(EquipmentStatType.CRIT_RATE)) {
            result.critRate = Math.min(1, result.critRate + equipStats.get(EquipmentStatType.CRIT_RATE)!);
        }
        if (equipStats.has(EquipmentStatType.CRIT_DAMAGE)) {
            result.critDamage += equipStats.get(EquipmentStatType.CRIT_DAMAGE)!;
        }

        // 技能威力
        if (equipStats.has(EquipmentStatType.SKILL_POWER)) {
            result.skillPower += equipStats.get(EquipmentStatType.SKILL_POWER)!;
        }

        return result;
    }

    // ==================== 资源管理 ====================

    /**
     * 添加金币
     */
    public addGold(amount: number): void {
        this._gold += amount;
        this.saveData();
    }

    /**
     * 添加强化石
     */
    public addEnhanceStones(amount: number): void {
        this._enhanceStones += amount;
        this.saveData();
    }

    // ==================== 存档系统 ====================

    /**
     * 保存数据
     */
    public saveData(): void {
        const data = {
            inventory: Array.from(this._inventory.entries()),
            gold: this._gold,
            enhanceStones: this._enhanceStones
        };

        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    /**
     * 加载数据
     */
    public loadData(): void {
        const savedData = sys.localStorage.getItem(this.SAVE_KEY);
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);
            this._inventory = new Map(data.inventory);
            this._gold = data.gold || 10000;
            this._enhanceStones = data.enhanceStones || 100;

            console.log(`加载装备数据成功，拥有 ${this._inventory.size} 件装备`);
        } catch (e) {
            console.error('加载装备数据失败:', e);
        }
    }

    /**
     * 清除数据
     */
    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._inventory.clear();
        this._gold = 10000;
        this._enhanceStones = 100;
        this.giveStarterEquipment();
    }

    /**
     * 生成唯一ID
     */
    private generateUniqueId(): string {
        return `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    onDestroy() {
        this.saveData();
        if (EquipmentManager._instance === this) {
            EquipmentManager._instance = null;
        }
    }
}
