import { _decorator, Component, sys, EventTarget } from 'cc';
import { CharacterDatabase, CharacterConfig, ElementType, CharacterClass, CharacterRarity } from './CharacterData';
import { CharacterManager } from './CharacterManager';
import { CharacterStats } from './CharacterData';
const { ccclass, property } = _decorator;

/**
 * 羁绊类型枚举
 */
export enum BondType {
    ELEMENT = 'element',           // 元素羁绊
    CLASS = 'class',               // 职业羁绊
    FACTION = 'faction',           // 阵营羁绊
    STORY = 'story',               // 剧情羁绊
    COMBINATION = 'combination'     // 组合羁绊（特定角色组合）
}

/**
 * 羁绊激活条件
 */
export interface BondCondition {
    type: 'character' | 'element' | 'class' | 'rarity';
    ids?: string[];                // 角色ID列表（当type为character时）
    elements?: ElementType[];      // 元素列表（当type为element时）
    classes?: CharacterClass[];    // 职业列表（当type为class时）
    rarities?: CharacterRarity[];  // 稀有度列表（当type为rarity时）
    count: number;                 // 需要满足条件的角色数量
}

/**
 * 羁绊效果
 */
export interface BondEffect {
    // 属性加成（百分比）
    hpPercent?: number;
    attackPercent?: number;
    defensePercent?: number;
    speedPercent?: number;
    critRateAdd?: number;
    critDamageAdd?: number;
    skillPowerPercent?: number;

    // 特殊效果
    elementDamageBonus?: { [element: string]: number };  // 元素伤害加成
    elementResistBonus?: { [element: string]: number };  // 元素抗性加成
    healingBonus?: number;          // 治疗效果加成
    energyRecoveryBonus?: number;   // 能量恢复加成
    expBonus?: number;              // 经验获取加成
    goldBonus?: number;             // 金币获取加成
}

/**
 * 羁绊配置
 */
export interface BondConfig {
    id: string;
    name: string;
    description: string;
    type: BondType;
    iconPath?: string;

    // 激活条件
    conditions: BondCondition[];

    // 多级羁绊效果（根据满足条件的角色数量）
    levels: BondLevel[];

    // 是否需要所有条件角色都存活
    requireAllAlive: boolean;
}

/**
 * 羁绊等级
 */
export interface BondLevel {
    level: number;
    requiredCount: number;      // 需要的角色数量
    effect: BondEffect;
    description: string;
}

/**
 * 当前激活的羁绊
 */
export interface ActiveBond {
    bondId: string;
    level: number;
    activeCharacters: string[];  // 贡献此羁绊的角色ID
    effect: BondEffect;
}

/**
 * 队伍羁绊状态
 */
export interface TeamBondStatus {
    teamId: string;
    activeBonds: ActiveBond[];
    totalEffect: BondEffect;
}

/**
 * 角色羁绊系统
 * Character Bond System
 */
@ccclass('CharacterBondSystem')
export class CharacterBondSystem extends Component {
    private static _instance: CharacterBondSystem | null = null;

    // 事件目标
    public readonly events: EventTarget = new EventTarget();

    // 事件类型
    public static readonly EVENT_BOND_ACTIVATED = 'bond-activated';
    public static readonly EVENT_BOND_DEACTIVATED = 'bond-deactivated';
    public static readonly EVENT_BOND_LEVEL_CHANGED = 'bond-level-changed';

    // 羁绊配置数据库
    private _bondDatabase: Map<string, BondConfig> = new Map();

    // 缓存的队伍羁绊状态
    private _teamBondCache: Map<string, TeamBondStatus> = new Map();

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_bond_data';

    public static get instance(): CharacterBondSystem | null {
        return CharacterBondSystem._instance;
    }

    onLoad() {
        if (CharacterBondSystem._instance) {
            this.node.destroy();
            return;
        }
        CharacterBondSystem._instance = this;

        this.initBondDatabase();
    }

    /**
     * 初始化羁绊数据库
     */
    private initBondDatabase(): void {
        // ========== 元素羁绊 ==========
        
        // 火元素羁绊
        this.addBond({
            id: 'bond_element_fire',
            name: '烈焰之心',
            description: '火属性角色组合，燃烧一切的力量。',
            type: BondType.ELEMENT,
            conditions: [{
                type: 'element',
                elements: [ElementType.FIRE],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { attackPercent: 0.10 }, description: '攻击+10%' },
                { level: 2, requiredCount: 3, effect: { attackPercent: 0.20, elementDamageBonus: { fire: 0.15 } }, description: '攻击+20%, 火属性伤害+15%' }
            ],
            requireAllAlive: false
        });

        // 水元素羁绊
        this.addBond({
            id: 'bond_element_water',
            name: '潮汐之护',
            description: '水属性角色组合，海洋的守护。',
            type: BondType.ELEMENT,
            conditions: [{
                type: 'element',
                elements: [ElementType.WATER],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { hpPercent: 0.10, healingBonus: 0.10 }, description: 'HP+10%, 治疗效果+10%' },
                { level: 2, requiredCount: 3, effect: { hpPercent: 0.20, healingBonus: 0.20, defensePercent: 0.10 }, description: 'HP+20%, 治疗效果+20%, 防御+10%' }
            ],
            requireAllAlive: false
        });

        // 风元素羁绊
        this.addBond({
            id: 'bond_element_wind',
            name: '疾风之舞',
            description: '风属性角色组合，迅捷如风。',
            type: BondType.ELEMENT,
            conditions: [{
                type: 'element',
                elements: [ElementType.WIND],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { speedPercent: 0.15, critRateAdd: 0.05 }, description: '速度+15%, 暴击率+5%' },
                { level: 2, requiredCount: 3, effect: { speedPercent: 0.25, critRateAdd: 0.10, critDamageAdd: 0.20 }, description: '速度+25%, 暴击率+10%, 暴击伤害+20%' }
            ],
            requireAllAlive: false
        });

        // 雷元素羁绊
        this.addBond({
            id: 'bond_element_thunder',
            name: '雷霆之怒',
            description: '雷属性角色组合，天罚降临。',
            type: BondType.ELEMENT,
            conditions: [{
                type: 'element',
                elements: [ElementType.THUNDER],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { critDamageAdd: 0.25 }, description: '暴击伤害+25%' },
                { level: 2, requiredCount: 3, effect: { critDamageAdd: 0.40, skillPowerPercent: 0.15 }, description: '暴击伤害+40%, 技能威力+15%' }
            ],
            requireAllAlive: false
        });

        // 光元素羁绊
        this.addBond({
            id: 'bond_element_light',
            name: '圣光之辉',
            description: '光属性角色组合，神圣的庇护。',
            type: BondType.ELEMENT,
            conditions: [{
                type: 'element',
                elements: [ElementType.LIGHT],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { defensePercent: 0.15, elementResistBonus: { dark: 0.20 } }, description: '防御+15%, 暗属性抗性+20%' },
                { level: 2, requiredCount: 3, effect: { defensePercent: 0.25, elementResistBonus: { dark: 0.35 }, healingBonus: 0.15 }, description: '防御+25%, 暗属性抗性+35%, 治疗效果+15%' }
            ],
            requireAllAlive: false
        });

        // 暗元素羁绊
        this.addBond({
            id: 'bond_element_dark',
            name: '暗影之力',
            description: '暗属性角色组合，深渊的力量。',
            type: BondType.ELEMENT,
            conditions: [{
                type: 'element',
                elements: [ElementType.DARK],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { attackPercent: 0.12, skillPowerPercent: 0.10 }, description: '攻击+12%, 技能威力+10%' },
                { level: 2, requiredCount: 3, effect: { attackPercent: 0.22, skillPowerPercent: 0.20, elementDamageBonus: { dark: 0.15 } }, description: '攻击+22%, 技能威力+20%, 暗属性伤害+15%' }
            ],
            requireAllAlive: false
        });

        // ========== 职业羁绊 ==========

        // 战士羁绊
        this.addBond({
            id: 'bond_class_warrior',
            name: '战士之魂',
            description: '战士职业组合，勇猛无畏。',
            type: BondType.CLASS,
            conditions: [{
                type: 'class',
                classes: [CharacterClass.WARRIOR],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { attackPercent: 0.08, hpPercent: 0.08 }, description: '攻击+8%, HP+8%' },
                { level: 2, requiredCount: 3, effect: { attackPercent: 0.15, hpPercent: 0.15, defensePercent: 0.05 }, description: '攻击+15%, HP+15%, 防御+5%' }
            ],
            requireAllAlive: false
        });

        // 法师羁绊
        this.addBond({
            id: 'bond_class_mage',
            name: '魔法之源',
            description: '法师职业组合，强大的魔力。',
            type: BondType.CLASS,
            conditions: [{
                type: 'class',
                classes: [CharacterClass.MAGE],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { skillPowerPercent: 0.15 }, description: '技能威力+15%' },
                { level: 2, requiredCount: 3, effect: { skillPowerPercent: 0.28, energyRecoveryBonus: 0.15 }, description: '技能威力+28%, 能量恢复+15%' }
            ],
            requireAllAlive: false
        });

        // 治疗羁绊
        this.addBond({
            id: 'bond_class_healer',
            name: '生命守护',
            description: '治疗职业组合，守护生命。',
            type: BondType.CLASS,
            conditions: [{
                type: 'class',
                classes: [CharacterClass.HEALER],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { healingBonus: 0.20, hpPercent: 0.10 }, description: '治疗效果+20%, HP+10%' },
                { level: 2, requiredCount: 3, effect: { healingBonus: 0.35, hpPercent: 0.20, defensePercent: 0.10 }, description: '治疗效果+35%, HP+20%, 防御+10%' }
            ],
            requireAllAlive: false
        });

        // 刺客羁绊
        this.addBond({
            id: 'bond_class_assassin',
            name: '暗影猎手',
            description: '刺客职业组合，致命一击。',
            type: BondType.CLASS,
            conditions: [{
                type: 'class',
                classes: [CharacterClass.ASSASSIN],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { critRateAdd: 0.10, critDamageAdd: 0.15 }, description: '暴击率+10%, 暴击伤害+15%' },
                { level: 2, requiredCount: 3, effect: { critRateAdd: 0.18, critDamageAdd: 0.30, speedPercent: 0.10 }, description: '暴击率+18%, 暴击伤害+30%, 速度+10%' }
            ],
            requireAllAlive: false
        });

        // 坦克羁绊
        this.addBond({
            id: 'bond_class_tank',
            name: '钢铁壁垒',
            description: '坦克职业组合，坚不可摧。',
            type: BondType.CLASS,
            conditions: [{
                type: 'class',
                classes: [CharacterClass.TANK],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { defensePercent: 0.20, hpPercent: 0.15 }, description: '防御+20%, HP+15%' },
                { level: 2, requiredCount: 3, effect: { defensePercent: 0.35, hpPercent: 0.25 }, description: '防御+35%, HP+25%' }
            ],
            requireAllAlive: false
        });

        // ========== 混合羁绊 ==========

        // 攻守兼备
        this.addBond({
            id: 'bond_combo_balanced',
            name: '攻守兼备',
            description: '战士与坦克的完美配合。',
            type: BondType.COMBINATION,
            conditions: [
                { type: 'class', classes: [CharacterClass.WARRIOR], count: 1 },
                { type: 'class', classes: [CharacterClass.TANK], count: 1 }
            ],
            levels: [
                { level: 1, requiredCount: 2, effect: { attackPercent: 0.08, defensePercent: 0.12 }, description: '攻击+8%, 防御+12%' }
            ],
            requireAllAlive: true
        });

        // 魔法协同
        this.addBond({
            id: 'bond_combo_magic',
            name: '魔法协同',
            description: '法师与辅助的魔法共鸣。',
            type: BondType.COMBINATION,
            conditions: [
                { type: 'class', classes: [CharacterClass.MAGE], count: 1 },
                { type: 'class', classes: [CharacterClass.SUPPORT], count: 1 }
            ],
            levels: [
                { level: 1, requiredCount: 2, effect: { skillPowerPercent: 0.12, energyRecoveryBonus: 0.10 }, description: '技能威力+12%, 能量恢复+10%' }
            ],
            requireAllAlive: true
        });

        // 突击编队
        this.addBond({
            id: 'bond_combo_assault',
            name: '突击编队',
            description: '战士与刺客的攻击组合。',
            type: BondType.COMBINATION,
            conditions: [
                { type: 'class', classes: [CharacterClass.WARRIOR], count: 1 },
                { type: 'class', classes: [CharacterClass.ASSASSIN], count: 1 }
            ],
            levels: [
                { level: 1, requiredCount: 2, effect: { attackPercent: 0.15, critRateAdd: 0.05 }, description: '攻击+15%, 暴击率+5%' }
            ],
            requireAllAlive: true
        });

        // 治愈之光
        this.addBond({
            id: 'bond_combo_holy',
            name: '治愈之光',
            description: '治疗与光属性的神圣组合。',
            type: BondType.COMBINATION,
            conditions: [
                { type: 'class', classes: [CharacterClass.HEALER], count: 1 },
                { type: 'element', elements: [ElementType.LIGHT], count: 1 }
            ],
            levels: [
                { level: 1, requiredCount: 2, effect: { healingBonus: 0.25, defensePercent: 0.08 }, description: '治疗效果+25%, 防御+8%' }
            ],
            requireAllAlive: true
        });

        // ========== 特殊角色羁绊 ==========

        // 火焰双子
        this.addBond({
            id: 'bond_story_fire_duo',
            name: '烈焰双子',
            description: '烈焰剑士与火焰法师的组合，火焰的完美融合。',
            type: BondType.STORY,
            conditions: [{
                type: 'character',
                ids: ['char_fire_001', 'char_fire_002'],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { 
                    attackPercent: 0.12, 
                    elementDamageBonus: { fire: 0.25 },
                    skillPowerPercent: 0.10
                }, description: '攻击+12%, 火属性伤害+25%, 技能威力+10%' }
            ],
            requireAllAlive: true
        });

        // 神圣裁决
        this.addBond({
            id: 'bond_story_light_dark',
            name: '光暗交织',
            description: '圣光天使与暗影领主的对立统一。',
            type: BondType.STORY,
            conditions: [{
                type: 'character',
                ids: ['char_light_001', 'char_dark_001'],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { 
                    attackPercent: 0.18,
                    skillPowerPercent: 0.15,
                    elementDamageBonus: { light: 0.20, dark: 0.20 }
                }, description: '攻击+18%, 技能威力+15%, 光/暗属性伤害+20%' }
            ],
            requireAllAlive: true
        });

        // 冰火传奇
        this.addBond({
            id: 'bond_story_ice_fire',
            name: '冰火传奇',
            description: '火与水的碰撞，产生无限可能。',
            type: BondType.COMBINATION,
            conditions: [
                { type: 'element', elements: [ElementType.FIRE], count: 1 },
                { type: 'element', elements: [ElementType.WATER], count: 1 }
            ],
            levels: [
                { level: 1, requiredCount: 2, effect: { 
                    attackPercent: 0.10,
                    defensePercent: 0.10,
                    skillPowerPercent: 0.08
                }, description: '攻击+10%, 防御+10%, 技能威力+8%' }
            ],
            requireAllAlive: false
        });

        // ========== 稀有度羁绊 ==========

        // 传说队伍
        this.addBond({
            id: 'bond_rarity_legend',
            name: '传说之队',
            description: '由UR角色组成的传奇队伍。',
            type: BondType.FACTION,
            conditions: [{
                type: 'rarity',
                rarities: [CharacterRarity.UR],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { 
                    attackPercent: 0.10,
                    hpPercent: 0.10,
                    expBonus: 0.20
                }, description: '攻击+10%, HP+10%, 经验获取+20%' },
                { level: 2, requiredCount: 3, effect: { 
                    attackPercent: 0.20,
                    hpPercent: 0.20,
                    expBonus: 0.30,
                    goldBonus: 0.15
                }, description: '攻击+20%, HP+20%, 经验+30%, 金币+15%' }
            ],
            requireAllAlive: false
        });

        // 精英队伍
        this.addBond({
            id: 'bond_rarity_elite',
            name: '精英之师',
            description: '由SSR角色组成的精英队伍。',
            type: BondType.FACTION,
            conditions: [{
                type: 'rarity',
                rarities: [CharacterRarity.SSR],
                count: 2
            }],
            levels: [
                { level: 1, requiredCount: 2, effect: { 
                    attackPercent: 0.08,
                    defensePercent: 0.08
                }, description: '攻击+8%, 防御+8%' },
                { level: 2, requiredCount: 3, effect: { 
                    attackPercent: 0.15,
                    defensePercent: 0.12,
                    critRateAdd: 0.05
                }, description: '攻击+15%, 防御+12%, 暴击率+5%' }
            ],
            requireAllAlive: false
        });

        console.log(`羁绊数据库初始化完成，共 ${this._bondDatabase.size} 种羁绊`);
    }

    /**
     * 添加羁绊配置
     */
    private addBond(config: BondConfig): void {
        this._bondDatabase.set(config.id, config);
    }

    /**
     * 获取羁绊配置
     */
    public getBondConfig(bondId: string): BondConfig | undefined {
        return this._bondDatabase.get(bondId);
    }

    /**
     * 获取所有羁绊配置
     */
    public getAllBonds(): BondConfig[] {
        return Array.from(this._bondDatabase.values());
    }

    /**
     * 根据类型获取羁绊
     */
    public getBondsByType(type: BondType): BondConfig[] {
        return this.getAllBonds().filter(b => b.type === type);
    }

    /**
     * 计算队伍的羁绊状态
     */
    public calculateTeamBonds(characterIds: string[]): TeamBondStatus {
        const activeBonds: ActiveBond[] = [];
        
        // 获取角色配置
        const characters: CharacterConfig[] = [];
        for (const id of characterIds) {
            const config = CharacterDatabase.instance.getCharacter(id);
            if (config) {
                characters.push(config);
            }
        }

        // 遍历所有羁绊
        for (const bond of this._bondDatabase.values()) {
            const result = this.checkBondActivation(bond, characters, characterIds);
            if (result.activated) {
                activeBonds.push({
                    bondId: bond.id,
                    level: result.level,
                    activeCharacters: result.activeCharacters,
                    effect: result.effect
                });
            }
        }

        // 合并所有羁绊效果
        const totalEffect = this.mergeEffects(activeBonds.map(b => b.effect));

        return {
            teamId: '',
            activeBonds,
            totalEffect
        };
    }

    /**
     * 检查羁绊是否激活
     */
    private checkBondActivation(
        bond: BondConfig,
        characters: CharacterConfig[],
        characterIds: string[]
    ): { activated: boolean; level: number; effect: BondEffect; activeCharacters: string[] } {
        const activeCharacters: string[] = [];

        // 检查所有条件
        for (const condition of bond.conditions) {
            const matching = this.findMatchingCharacters(condition, characters);
            if (matching.length < condition.count) {
                return { activated: false, level: 0, effect: {}, activeCharacters: [] };
            }
            
            // 记录匹配的角色
            for (let i = 0; i < condition.count; i++) {
                if (!activeCharacters.includes(matching[i].id)) {
                    activeCharacters.push(matching[i].id);
                }
            }
        }

        // 确定羁绊等级
        let activatedLevel = 0;
        let activatedEffect: BondEffect = {};

        for (const level of bond.levels) {
            if (activeCharacters.length >= level.requiredCount) {
                activatedLevel = level.level;
                activatedEffect = level.effect;
            }
        }

        if (activatedLevel === 0) {
            return { activated: false, level: 0, effect: {}, activeCharacters: [] };
        }

        return {
            activated: true,
            level: activatedLevel,
            effect: activatedEffect,
            activeCharacters
        };
    }

    /**
     * 查找符合条件的角色
     */
    private findMatchingCharacters(condition: BondCondition, characters: CharacterConfig[]): CharacterConfig[] {
        return characters.filter(char => {
            switch (condition.type) {
                case 'character':
                    return condition.ids?.includes(char.id);
                case 'element':
                    return condition.elements?.includes(char.element);
                case 'class':
                    return condition.classes?.includes(char.characterClass);
                case 'rarity':
                    return condition.rarities?.includes(char.rarity);
                default:
                    return false;
            }
        });
    }

    /**
     * 合并多个羁绊效果
     */
    private mergeEffects(effects: BondEffect[]): BondEffect {
        const result: BondEffect = {
            elementDamageBonus: {},
            elementResistBonus: {}
        };

        for (const effect of effects) {
            // 合并百分比加成
            if (effect.hpPercent) result.hpPercent = (result.hpPercent || 0) + effect.hpPercent;
            if (effect.attackPercent) result.attackPercent = (result.attackPercent || 0) + effect.attackPercent;
            if (effect.defensePercent) result.defensePercent = (result.defensePercent || 0) + effect.defensePercent;
            if (effect.speedPercent) result.speedPercent = (result.speedPercent || 0) + effect.speedPercent;
            if (effect.critRateAdd) result.critRateAdd = (result.critRateAdd || 0) + effect.critRateAdd;
            if (effect.critDamageAdd) result.critDamageAdd = (result.critDamageAdd || 0) + effect.critDamageAdd;
            if (effect.skillPowerPercent) result.skillPowerPercent = (result.skillPowerPercent || 0) + effect.skillPowerPercent;
            if (effect.healingBonus) result.healingBonus = (result.healingBonus || 0) + effect.healingBonus;
            if (effect.energyRecoveryBonus) result.energyRecoveryBonus = (result.energyRecoveryBonus || 0) + effect.energyRecoveryBonus;
            if (effect.expBonus) result.expBonus = (result.expBonus || 0) + effect.expBonus;
            if (effect.goldBonus) result.goldBonus = (result.goldBonus || 0) + effect.goldBonus;

            // 合并元素伤害加成
            if (effect.elementDamageBonus) {
                for (const [element, bonus] of Object.entries(effect.elementDamageBonus)) {
                    result.elementDamageBonus![element] = (result.elementDamageBonus![element] || 0) + bonus;
                }
            }

            // 合并元素抗性加成
            if (effect.elementResistBonus) {
                for (const [element, bonus] of Object.entries(effect.elementResistBonus)) {
                    result.elementResistBonus![element] = (result.elementResistBonus![element] || 0) + bonus;
                }
            }
        }

        return result;
    }

    /**
     * 应用羁绊效果到角色属性
     */
    public applyBondEffectToStats(stats: CharacterStats, effect: BondEffect): CharacterStats {
        const newStats = { ...stats };

        if (effect.hpPercent) {
            newStats.hp = Math.floor(newStats.hp * (1 + effect.hpPercent));
        }
        if (effect.attackPercent) {
            newStats.attack = Math.floor(newStats.attack * (1 + effect.attackPercent));
        }
        if (effect.defensePercent) {
            newStats.defense = Math.floor(newStats.defense * (1 + effect.defensePercent));
        }
        if (effect.speedPercent) {
            newStats.speed = Math.floor(newStats.speed * (1 + effect.speedPercent));
        }
        if (effect.critRateAdd) {
            newStats.critRate = Math.min(1, newStats.critRate + effect.critRateAdd);
        }
        if (effect.critDamageAdd) {
            newStats.critDamage += effect.critDamageAdd;
        }
        if (effect.skillPowerPercent) {
            newStats.skillPower *= (1 + effect.skillPowerPercent);
        }

        return newStats;
    }

    /**
     * 获取当前队伍的羁绊预览
     */
    public getTeamBondPreview(teamId: string): TeamBondStatus | null {
        const manager = CharacterManager.instance;
        if (!manager) return null;

        const team = manager.getTeam(teamId);
        if (!team) return null;

        // 获取队伍中的角色配置ID
        const characterConfigIds: string[] = [];
        for (const uniqueId of team.slots) {
            if (uniqueId) {
                const instance = manager.getCharacterInstance(uniqueId);
                if (instance) {
                    characterConfigIds.push(instance.configId);
                }
            }
        }

        const status = this.calculateTeamBonds(characterConfigIds);
        status.teamId = teamId;

        return status;
    }

    /**
     * 获取可能激活的羁绊（用于队伍编辑预览）
     */
    public getPotentialBonds(currentCharacterIds: string[], newCharacterId: string): {
        willActivate: BondConfig[];
        willDeactivate: BondConfig[];
        levelChange: { bond: BondConfig; oldLevel: number; newLevel: number }[];
    } {
        const currentStatus = this.calculateTeamBonds(currentCharacterIds);
        const newIds = [...currentCharacterIds, newCharacterId];
        const newStatus = this.calculateTeamBonds(newIds);

        const currentBondIds = new Set(currentStatus.activeBonds.map(b => b.bondId));
        const newBondIds = new Set(newStatus.activeBonds.map(b => b.bondId));

        const willActivate: BondConfig[] = [];
        const willDeactivate: BondConfig[] = [];
        const levelChange: { bond: BondConfig; oldLevel: number; newLevel: number }[] = [];

        // 新激活的羁绊
        for (const bond of newStatus.activeBonds) {
            if (!currentBondIds.has(bond.bondId)) {
                const config = this._bondDatabase.get(bond.bondId);
                if (config) willActivate.push(config);
            }
        }

        // 会失去的羁绊
        for (const bond of currentStatus.activeBonds) {
            if (!newBondIds.has(bond.bondId)) {
                const config = this._bondDatabase.get(bond.bondId);
                if (config) willDeactivate.push(config);
            }
        }

        // 等级变化的羁绊
        for (const newBond of newStatus.activeBonds) {
            if (currentBondIds.has(newBond.bondId)) {
                const currentBond = currentStatus.activeBonds.find(b => b.bondId === newBond.bondId);
                if (currentBond && currentBond.level !== newBond.level) {
                    const config = this._bondDatabase.get(newBond.bondId);
                    if (config) {
                        levelChange.push({
                            bond: config,
                            oldLevel: currentBond.level,
                            newLevel: newBond.level
                        });
                    }
                }
            }
        }

        return { willActivate, willDeactivate, levelChange };
    }

    /**
     * 获取角色参与的羁绊列表
     */
    public getCharacterBonds(characterId: string): BondConfig[] {
        const result: BondConfig[] = [];
        const config = CharacterDatabase.instance.getCharacter(characterId);
        if (!config) return result;

        for (const bond of this._bondDatabase.values()) {
            for (const condition of bond.conditions) {
                let matches = false;
                
                switch (condition.type) {
                    case 'character':
                        matches = condition.ids?.includes(characterId) || false;
                        break;
                    case 'element':
                        matches = condition.elements?.includes(config.element) || false;
                        break;
                    case 'class':
                        matches = condition.classes?.includes(config.characterClass) || false;
                        break;
                    case 'rarity':
                        matches = condition.rarities?.includes(config.rarity) || false;
                        break;
                }

                if (matches) {
                    result.push(bond);
                    break;
                }
            }
        }

        return result;
    }

    onDestroy() {
        if (CharacterBondSystem._instance === this) {
            CharacterBondSystem._instance = null;
        }
    }
}
