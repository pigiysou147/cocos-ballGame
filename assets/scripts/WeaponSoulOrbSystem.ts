import { _decorator, sys, EventTarget } from 'cc';
import { ElementType } from './CharacterData';

/**
 * 武器获取类型
 */
export enum WeaponSourceType {
    BOND = 'bond',              // 羁绊武：高额乘区，技伤队毕业
    BOSS = 'boss',              // 领主武：活动产出，特化被动
    PERMANENT = 'permanent',    // 常驻武（老王武）：高面板，浑身/贯通
    LIMITED = 'limited',        // 限定武：活动/扭蛋，强机制
    COMMON = 'common'           // 普通武：基础武器
}

/**
 * 武器稀有度
 */
export enum WeaponRarity {
    N = 1,      // 1星
    R = 2,      // 2星
    SR = 3,     // 3星
    SSR = 4,    // 4星
    UR = 5      // 5星
}

/**
 * 武器被动效果类型
 */
export enum WeaponPassiveType {
    // 伤害类
    SKILL_DAMAGE = 'skill_damage',      // 技伤加成
    PF_DAMAGE = 'pf_damage',            // PF伤害加成
    DIRECT_DAMAGE = 'direct_damage',    // 直击伤害加成
    FEVER_DAMAGE = 'fever_damage',      // Fever伤害加成
    FINAL_DAMAGE = 'final_damage',      // 终伤加成
    ELEMENT_DAMAGE = 'element_damage',  // 属性伤害加成
    CRIT_DAMAGE = 'crit_damage',        // 暴击伤害
    
    // 能量类
    ENERGY_START = 'energy_start',      // 开局充能
    ENERGY_RATE = 'energy_rate',        // 充能速度
    ENERGY_COST = 'energy_cost',        // 能量消耗减少
    
    // 特殊机制
    PENETRATION = 'penetration',        // 贯通
    FLOAT = 'float',                    // 浮游
    COMBO_BONUS = 'combo_bonus',        // 连击加成
    MULTI_HIT = 'multi_hit',            // 多段命中
    
    // 防御/生存
    HP_BOOST = 'hp_boost',              // 生命加成
    DEF_BOOST = 'def_boost',            // 防御加成
    DAMAGE_REDUCE = 'damage_reduce',    // 减伤
    LIFESTEAL = 'lifesteal',            // 吸血
    
    // 辅助
    HEAL_BOOST = 'heal_boost',          // 治疗加成
    BUFF_DURATION = 'buff_duration',    // Buff持续
    CONTROL_DURATION = 'control_duration' // 控制持续
}

/**
 * 武器被动配置
 */
export interface WeaponPassiveConfig {
    id: string;
    name: string;
    description: string;
    type: WeaponPassiveType;
    
    // 基础效果值
    baseValue: number;
    
    // 每觉醒阶段增加的值
    awakeningGrowth: number;
    
    // 是否百分比
    isPercent: boolean;
    
    // 触发条件（可选）
    triggerCondition?: string;
    
    // 冷却时间（可选）
    cooldown?: number;
    
    // 仅主位生效
    mainSlotOnly?: boolean;
}

/**
 * 武器配置
 */
export interface WeaponConfig {
    id: string;
    name: string;
    title: string;              // 称号/别名
    description: string;
    
    // 基础属性
    rarity: WeaponRarity;
    sourceType: WeaponSourceType;
    element: ElementType;       // 武器属性
    
    // 面板属性（1级基础）
    baseAttack: number;
    baseHP: number;
    
    // 成长属性（每级增加）
    attackGrowth: number;
    hpGrowth: number;
    
    // 被动技能（按觉醒阶段解锁）
    passives: {
        awakening: number;      // 解锁所需觉醒阶段（0=初始）
        passive: WeaponPassiveConfig;
    }[];
    
    // 技能属性（影响角色技能伤害）
    skillAttribute?: {
        skillDamageBonus: number;   // 技伤加成
        energyCostReduction: number; // 能量消耗减少
    };
    
    // 适用角色ID（可选，空=通用）
    suitableCharacters?: string[];
    
    // 资源路径
    iconPath: string;
    
    // 流派适配
    suitableArchetypes: string[];
    
    // 毕业推荐（是否为某流派毕业武器）
    graduationFor?: string[];
}

/**
 * 魂珠配置
 */
export interface SoulOrbConfig {
    id: string;
    name: string;
    description: string;
    
    // 来源武器ID
    sourceWeaponId: string;
    
    // 稀有度（继承自武器）
    rarity: WeaponRarity;
    element: ElementType;
    
    // 词条效果
    stats: {
        type: WeaponPassiveType;
        value: number;
        isPercent: boolean;
    }[];
    
    // 被动效果（从武器继承，效果减半）
    passiveId?: string;
    passiveEffectRatio: number;     // 被动效果比例（通常0.5）
    
    // 仅主位生效
    mainSlotOnly: boolean;
    
    // 可叠加（同名魂珠）
    stackable: boolean;
    maxStacks: number;
}

/**
 * 武器实例
 */
export interface WeaponInstance {
    uniqueId: string;
    configId: string;
    
    // 等级（1-99）
    level: number;
    exp: number;
    
    // 觉醒阶段（0-5）
    awakening: number;
    
    // 装备者角色ID
    equippedBy: string | null;
    
    // 是否锁定
    isLocked: boolean;
    
    // 获取时间
    obtainedAt: number;
}

/**
 * 魂珠实例
 */
export interface SoulOrbInstance {
    uniqueId: string;
    configId: string;
    
    // 装备者角色ID
    equippedBy: string | null;
    
    // 叠加数量（同名魂珠）
    stacks: number;
    
    // 是否锁定
    isLocked: boolean;
    
    // 来源武器实例ID
    sourceWeaponInstanceId: string;
    
    // 获取时间
    obtainedAt: number;
}

/**
 * 角色武器槽位数据
 */
export interface CharacterWeaponSlots {
    weaponId: string | null;    // 主武器实例ID
    soulOrbId: string | null;   // 魂珠实例ID
}

/**
 * 武器强化材料类型
 */
export enum WeaponMaterialType {
    // 强化材料
    MEMORY_STONE = 'memory_stone',              // 记忆石（1-69级）
    STARLIGHT_CRYSTAL = 'starlight_crystal',    // 星空记忆晶（70+级）
    ABYSS_MATTER = 'abyss_matter',              // 深渊物质（高级强化）
    ELEMENT_CRYSTAL = 'element_crystal',        // 属性记忆晶（满级）
    
    // 觉醒材料
    IRON_PARTICLE = 'iron_particle',            // 铁粒
    IRON_INGOT_N = 'iron_ingot_n',             // N级铁钢
    IRON_INGOT_R = 'iron_ingot_r',             // R级铁钢
    IRON_INGOT_SR = 'iron_ingot_sr',           // SR级铁钢
    IRON_INGOT_SSR = 'iron_ingot_ssr',         // SSR级铁钢
    IRON_INGOT_UR = 'iron_ingot_ur',           // UR级铁钢
    FORGING_STONE = 'forging_stone'            // 锻造石
}

/**
 * 材料数量映射
 */
export interface MaterialInventory {
    [key: string]: number;
}

/**
 * 强化结果
 */
export interface WeaponEnhanceResult {
    success: boolean;
    previousLevel: number;
    newLevel: number;
    materialsConsumed: { type: WeaponMaterialType; amount: number }[];
    goldConsumed: number;
}

/**
 * 觉醒结果
 */
export interface WeaponAwakeningResult {
    success: boolean;
    previousAwakening: number;
    newAwakening: number;
    soulOrbGenerated?: SoulOrbInstance;
    passiveUnlocked?: WeaponPassiveConfig;
    materialsConsumed: { type: WeaponMaterialType; amount: number }[];
}

/**
 * 武器属性计算结果
 */
export interface WeaponStatsResult {
    attack: number;
    hp: number;
    
    // 被动效果汇总
    passiveEffects: {
        type: WeaponPassiveType;
        value: number;
        source: 'weapon' | 'soulOrb';
    }[];
    
    // 同属性加成
    elementBonus: number;
}

/**
 * 武器魂珠系统 - 核心管理器
 */
export class WeaponSoulOrbSystem {
    private static _instance: WeaponSoulOrbSystem | null = null;
    
    // 配置库
    private _weaponConfigs: Map<string, WeaponConfig> = new Map();
    private _soulOrbConfigs: Map<string, SoulOrbConfig> = new Map();
    private _passiveConfigs: Map<string, WeaponPassiveConfig> = new Map();
    
    // 玩家数据
    private _weapons: Map<string, WeaponInstance> = new Map();
    private _soulOrbs: Map<string, SoulOrbInstance> = new Map();
    private _materials: MaterialInventory = {};
    private _gold: number = 0;
    
    // 角色装备数据
    private _characterSlots: Map<string, CharacterWeaponSlots> = new Map();
    
    // 事件
    private _eventTarget: EventTarget = new EventTarget();
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_weapon_data';
    
    public static get instance(): WeaponSoulOrbSystem {
        if (!WeaponSoulOrbSystem._instance) {
            WeaponSoulOrbSystem._instance = new WeaponSoulOrbSystem();
            WeaponSoulOrbSystem._instance.initConfigs();
            WeaponSoulOrbSystem._instance.loadData();
        }
        return WeaponSoulOrbSystem._instance;
    }
    
    /**
     * 初始化配置
     */
    private initConfigs(): void {
        this.initPassiveConfigs();
        this.initWeaponConfigs();
        this.initSoulOrbConfigs();
        console.log(`武器系统初始化完成，共 ${this._weaponConfigs.size} 把武器配置`);
    }
    
    /**
     * 初始化被动配置
     */
    private initPassiveConfigs(): void {
        // ===== 技伤类被动 =====
        this.addPassive({
            id: 'passive_skill_280',
            name: '技伤强化·极',
            description: '技能伤害+280%',
            type: WeaponPassiveType.SKILL_DAMAGE,
            baseValue: 2.0,
            awakeningGrowth: 0.16,
            isPercent: true
        });
        
        this.addPassive({
            id: 'passive_skill_120',
            name: '技伤强化',
            description: '技能伤害+120%',
            type: WeaponPassiveType.SKILL_DAMAGE,
            baseValue: 0.8,
            awakeningGrowth: 0.08,
            isPercent: true
        });
        
        this.addPassive({
            id: 'passive_final_50',
            name: '终伤强化',
            description: '最终伤害+50%',
            type: WeaponPassiveType.FINAL_DAMAGE,
            baseValue: 0.3,
            awakeningGrowth: 0.04,
            isPercent: true
        });
        
        // ===== PF类被动 =====
        this.addPassive({
            id: 'passive_pf_100',
            name: 'PF强化·极',
            description: 'Power Flip伤害+100%',
            type: WeaponPassiveType.PF_DAMAGE,
            baseValue: 0.6,
            awakeningGrowth: 0.08,
            isPercent: true
        });
        
        this.addPassive({
            id: 'passive_combo_50',
            name: '连击强化',
            description: '连击伤害加成+50%',
            type: WeaponPassiveType.COMBO_BONUS,
            baseValue: 0.3,
            awakeningGrowth: 0.04,
            isPercent: true
        });
        
        // ===== 能量类被动 =====
        this.addPassive({
            id: 'passive_energy_start_100',
            name: '开局满能',
            description: '战斗开始时能量100%',
            type: WeaponPassiveType.ENERGY_START,
            baseValue: 0.6,
            awakeningGrowth: 0.08,
            isPercent: true,
            mainSlotOnly: true
        });
        
        this.addPassive({
            id: 'passive_energy_rate_30',
            name: '充能加速',
            description: '能量获取速度+30%',
            type: WeaponPassiveType.ENERGY_RATE,
            baseValue: 0.18,
            awakeningGrowth: 0.024,
            isPercent: true
        });
        
        this.addPassive({
            id: 'passive_energy_cost_20',
            name: '能量节省',
            description: '技能能量消耗-20%',
            type: WeaponPassiveType.ENERGY_COST,
            baseValue: 0.12,
            awakeningGrowth: 0.016,
            isPercent: true
        });
        
        // ===== 特殊机制被动 =====
        this.addPassive({
            id: 'passive_penetration',
            name: '贯通',
            description: '攻击穿透敌人',
            type: WeaponPassiveType.PENETRATION,
            baseValue: 1,
            awakeningGrowth: 0,
            isPercent: false
        });
        
        this.addPassive({
            id: 'passive_float',
            name: '浮游',
            description: '角色浮游，持续攻击',
            type: WeaponPassiveType.FLOAT,
            baseValue: 1,
            awakeningGrowth: 0,
            isPercent: false,
            mainSlotOnly: true
        });
        
        this.addPassive({
            id: 'passive_multi_hit',
            name: '多段命中',
            description: '单次接触造成多次伤害',
            type: WeaponPassiveType.MULTI_HIT,
            baseValue: 3,
            awakeningGrowth: 0.4,
            isPercent: false
        });
        
        // ===== Fever类被动 =====
        this.addPassive({
            id: 'passive_fever_80',
            name: 'Fever强化',
            description: 'Fever状态伤害+80%',
            type: WeaponPassiveType.FEVER_DAMAGE,
            baseValue: 0.5,
            awakeningGrowth: 0.06,
            isPercent: true
        });
        
        // ===== 属性加成被动 =====
        this.addPassive({
            id: 'passive_element_50',
            name: '属性强化',
            description: '同属性伤害+50%',
            type: WeaponPassiveType.ELEMENT_DAMAGE,
            baseValue: 0.3,
            awakeningGrowth: 0.04,
            isPercent: true
        });
        
        // ===== 生存类被动 =====
        this.addPassive({
            id: 'passive_hp_30',
            name: '生命强化',
            description: '生命值+30%',
            type: WeaponPassiveType.HP_BOOST,
            baseValue: 0.18,
            awakeningGrowth: 0.024,
            isPercent: true
        });
        
        this.addPassive({
            id: 'passive_lifesteal_10',
            name: '吸血',
            description: '攻击回复伤害10%生命',
            type: WeaponPassiveType.LIFESTEAL,
            baseValue: 0.06,
            awakeningGrowth: 0.008,
            isPercent: true
        });
    }
    
    /**
     * 初始化武器配置
     */
    private initWeaponConfigs(): void {
        // ========== 羁绊武 ==========
        
        // 羁绊斧 - 技伤队毕业
        this.addWeapon({
            id: 'weapon_bond_axe',
            name: '羁绊之斧',
            title: '羁绊斧',
            description: '蕴含羁绊之力的传说巨斧，技伤队毕业武器。觉醒5阶可达280%技伤加成。',
            rarity: WeaponRarity.UR,
            sourceType: WeaponSourceType.BOND,
            element: ElementType.FIRE,
            baseAttack: 450,
            baseHP: 1200,
            attackGrowth: 8,
            hpGrowth: 20,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_skill_280')! },
                { awakening: 3, passive: this._passiveConfigs.get('passive_final_50')! }
            ],
            skillAttribute: {
                skillDamageBonus: 0.5,
                energyCostReduction: 0.1
            },
            iconPath: 'textures/weapons/bond_axe',
            suitableArchetypes: ['skill_damage'],
            graduationFor: ['skill_damage']
        });
        
        // 羁绊枪 - PF队核心
        this.addWeapon({
            id: 'weapon_bond_spear',
            name: '羁绊之枪',
            title: '羁绊枪',
            description: '蕴含羁绊之力的贯通长枪，PF队核心武器。',
            rarity: WeaponRarity.UR,
            sourceType: WeaponSourceType.BOND,
            element: ElementType.WATER,
            baseAttack: 400,
            baseHP: 1000,
            attackGrowth: 7,
            hpGrowth: 18,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_pf_100')! },
                { awakening: 2, passive: this._passiveConfigs.get('passive_penetration')! },
                { awakening: 4, passive: this._passiveConfigs.get('passive_combo_50')! }
            ],
            iconPath: 'textures/weapons/bond_spear',
            suitableArchetypes: ['power_flip'],
            graduationFor: ['power_flip']
        });
        
        // 羁绊弓 - 远程技伤
        this.addWeapon({
            id: 'weapon_bond_bow',
            name: '羁绊之弓',
            title: '羁绊弓',
            description: '蕴含羁绊之力的神圣长弓，远程技伤核心。',
            rarity: WeaponRarity.UR,
            sourceType: WeaponSourceType.BOND,
            element: ElementType.LIGHT,
            baseAttack: 380,
            baseHP: 900,
            attackGrowth: 6.5,
            hpGrowth: 16,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_skill_120')! },
                { awakening: 3, passive: this._passiveConfigs.get('passive_energy_rate_30')! }
            ],
            skillAttribute: {
                skillDamageBonus: 0.3,
                energyCostReduction: 0.15
            },
            iconPath: 'textures/weapons/bond_bow',
            suitableArchetypes: ['skill_damage', 'fever']
        });
        
        // ========== 领主武 ==========
        
        // 不死王剑 - 浮游被动
        this.addWeapon({
            id: 'weapon_boss_undead_sword',
            name: '不死王之剑',
            title: '不死王剑',
            description: '击败不死王获得的黑暗长剑，拥有浮游特性。',
            rarity: WeaponRarity.SSR,
            sourceType: WeaponSourceType.BOSS,
            element: ElementType.DARK,
            baseAttack: 350,
            baseHP: 1100,
            attackGrowth: 6,
            hpGrowth: 18,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_float')! },
                { awakening: 3, passive: this._passiveConfigs.get('passive_lifesteal_10')! }
            ],
            iconPath: 'textures/weapons/boss_undead_sword',
            suitableArchetypes: ['direct_hit', 'sustain']
        });
        
        // 水龙枪 - 充能特化
        this.addWeapon({
            id: 'weapon_boss_water_dragon',
            name: '水龙之枪',
            title: '水龙枪',
            description: '击败水龙获得的神圣长枪，充能速度极快。',
            rarity: WeaponRarity.SSR,
            sourceType: WeaponSourceType.BOSS,
            element: ElementType.WATER,
            baseAttack: 320,
            baseHP: 1000,
            attackGrowth: 5.5,
            hpGrowth: 17,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_energy_rate_30')! },
                { awakening: 2, passive: this._passiveConfigs.get('passive_energy_cost_20')! },
                { awakening: 4, passive: this._passiveConfigs.get('passive_skill_120')! }
            ],
            iconPath: 'textures/weapons/boss_water_dragon',
            suitableArchetypes: ['skill_damage', 'fever']
        });
        
        // 火龙斧 - Fever特化
        this.addWeapon({
            id: 'weapon_boss_fire_dragon',
            name: '火龙之斧',
            title: '火龙斧',
            description: '击败火龙获得的炎之巨斧，Fever时威力大增。',
            rarity: WeaponRarity.SSR,
            sourceType: WeaponSourceType.BOSS,
            element: ElementType.FIRE,
            baseAttack: 380,
            baseHP: 950,
            attackGrowth: 6.5,
            hpGrowth: 16,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_fever_80')! },
                { awakening: 3, passive: this._passiveConfigs.get('passive_final_50')! }
            ],
            iconPath: 'textures/weapons/boss_fire_dragon',
            suitableArchetypes: ['fever']
        });
        
        // ========== 老王武（常驻） ==========
        
        // 湛蓝魔杖（水老王）- 纯色队魂珠毕业
        this.addWeapon({
            id: 'weapon_perm_water_staff',
            name: '湛蓝魔杖',
            title: '水老王杖',
            description: '常驻高面板法杖，拥有浑身与属性加成，纯色队魂珠毕业。',
            rarity: WeaponRarity.SSR,
            sourceType: WeaponSourceType.PERMANENT,
            element: ElementType.WATER,
            baseAttack: 340,
            baseHP: 1050,
            attackGrowth: 5.8,
            hpGrowth: 17.5,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_element_50')! },
                { awakening: 2, passive: this._passiveConfigs.get('passive_hp_30')! },
                { awakening: 4, passive: this._passiveConfigs.get('passive_penetration')! }
            ],
            iconPath: 'textures/weapons/perm_water_staff',
            suitableArchetypes: ['skill_damage', 'power_flip', 'direct_hit']
        });
        
        // 炎狱大剑（火老王）
        this.addWeapon({
            id: 'weapon_perm_fire_sword',
            name: '炎狱大剑',
            title: '火老王剑',
            description: '常驻高面板大剑，攻击力极高。',
            rarity: WeaponRarity.SSR,
            sourceType: WeaponSourceType.PERMANENT,
            element: ElementType.FIRE,
            baseAttack: 400,
            baseHP: 900,
            attackGrowth: 7,
            hpGrowth: 15,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_element_50')! },
                { awakening: 3, passive: this._passiveConfigs.get('passive_multi_hit')! }
            ],
            iconPath: 'textures/weapons/perm_fire_sword',
            suitableArchetypes: ['direct_hit', 'power_flip']
        });
        
        // ========== 限定武 ==========
        
        // 礼黑专属 - 开局满能
        this.addWeapon({
            id: 'weapon_limited_dark_gift',
            name: '黑暗礼赞',
            title: '礼黑专属',
            description: '礼服黑猫专属武器，开局满能，技伤队爆发核心。',
            rarity: WeaponRarity.UR,
            sourceType: WeaponSourceType.LIMITED,
            element: ElementType.DARK,
            baseAttack: 420,
            baseHP: 1100,
            attackGrowth: 7.5,
            hpGrowth: 19,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_energy_start_100')! },
                { awakening: 2, passive: this._passiveConfigs.get('passive_skill_120')! },
                { awakening: 5, passive: this._passiveConfigs.get('passive_final_50')! }
            ],
            suitableCharacters: ['char_dark_001'],
            iconPath: 'textures/weapons/limited_dark_gift',
            suitableArchetypes: ['skill_damage'],
            graduationFor: ['skill_damage']
        });
        
        // 里脊专属 - Fever极限
        this.addWeapon({
            id: 'weapon_limited_fever_blade',
            name: 'Fever之刃',
            title: '里脊专属',
            description: 'Fever流极限武器，Fever状态伤害极高。',
            rarity: WeaponRarity.UR,
            sourceType: WeaponSourceType.LIMITED,
            element: ElementType.THUNDER,
            baseAttack: 400,
            baseHP: 1000,
            attackGrowth: 7,
            hpGrowth: 17,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_fever_80')! },
                { awakening: 2, passive: this._passiveConfigs.get('passive_energy_rate_30')! },
                { awakening: 4, passive: this._passiveConfigs.get('passive_final_50')! }
            ],
            iconPath: 'textures/weapons/limited_fever_blade',
            suitableArchetypes: ['fever'],
            graduationFor: ['fever']
        });
        
        // ========== 普通武器 ==========
        
        // 初心者之剑
        this.addWeapon({
            id: 'weapon_common_starter',
            name: '初心者之剑',
            title: '新手剑',
            description: '冒险者的第一把武器。',
            rarity: WeaponRarity.N,
            sourceType: WeaponSourceType.COMMON,
            element: ElementType.FIRE,
            baseAttack: 100,
            baseHP: 300,
            attackGrowth: 2,
            hpGrowth: 6,
            passives: [],
            iconPath: 'textures/weapons/common_starter',
            suitableArchetypes: []
        });
        
        // 铁剑
        this.addWeapon({
            id: 'weapon_common_iron',
            name: '铁剑',
            title: '铁剑',
            description: '普通的铁制长剑。',
            rarity: WeaponRarity.R,
            sourceType: WeaponSourceType.COMMON,
            element: ElementType.FIRE,
            baseAttack: 150,
            baseHP: 400,
            attackGrowth: 3,
            hpGrowth: 8,
            passives: [
                { awakening: 3, passive: this._passiveConfigs.get('passive_element_50')! }
            ],
            iconPath: 'textures/weapons/common_iron',
            suitableArchetypes: []
        });
        
        // 精钢剑
        this.addWeapon({
            id: 'weapon_common_steel',
            name: '精钢剑',
            title: '精钢剑',
            description: '由精钢打造的优秀武器。',
            rarity: WeaponRarity.SR,
            sourceType: WeaponSourceType.COMMON,
            element: ElementType.FIRE,
            baseAttack: 250,
            baseHP: 700,
            attackGrowth: 4.5,
            hpGrowth: 12,
            passives: [
                { awakening: 0, passive: this._passiveConfigs.get('passive_element_50')! },
                { awakening: 4, passive: this._passiveConfigs.get('passive_skill_120')! }
            ],
            iconPath: 'textures/weapons/common_steel',
            suitableArchetypes: ['skill_damage']
        });
    }
    
    /**
     * 初始化魂珠配置（从武器自动生成）
     */
    private initSoulOrbConfigs(): void {
        // 为每个武器生成对应魂珠配置
        this._weaponConfigs.forEach((weapon, weaponId) => {
            const orbConfig: SoulOrbConfig = {
                id: `orb_${weaponId}`,
                name: `${weapon.name}之魂`,
                description: `${weapon.name}的魂珠，继承部分被动效果。`,
                sourceWeaponId: weaponId,
                rarity: weapon.rarity,
                element: weapon.element,
                stats: this.generateOrbStats(weapon),
                passiveId: weapon.passives.length > 0 ? weapon.passives[0].passive.id : undefined,
                passiveEffectRatio: 0.5,
                mainSlotOnly: true,
                stackable: true,
                maxStacks: 2
            };
            
            this._soulOrbConfigs.set(orbConfig.id, orbConfig);
        });
    }
    
    /**
     * 生成魂珠词条
     */
    private generateOrbStats(weapon: WeaponConfig): SoulOrbConfig['stats'] {
        const stats: SoulOrbConfig['stats'] = [];
        
        // 根据武器类型添加词条
        if (weapon.sourceType === WeaponSourceType.BOND) {
            // 羁绊武魂珠：技伤/终伤词条
            stats.push({
                type: WeaponPassiveType.SKILL_DAMAGE,
                value: 0.15 + weapon.rarity * 0.05,
                isPercent: true
            });
        } else if (weapon.sourceType === WeaponSourceType.BOSS) {
            // 领主武魂珠：充能词条
            stats.push({
                type: WeaponPassiveType.ENERGY_RATE,
                value: 0.1 + weapon.rarity * 0.02,
                isPercent: true
            });
        } else if (weapon.sourceType === WeaponSourceType.PERMANENT) {
            // 老王武魂珠：属性词条
            stats.push({
                type: WeaponPassiveType.ELEMENT_DAMAGE,
                value: 0.1 + weapon.rarity * 0.03,
                isPercent: true
            });
        }
        
        return stats;
    }
    
    // ========== 辅助方法 ==========
    
    private addPassive(config: WeaponPassiveConfig): void {
        this._passiveConfigs.set(config.id, config);
    }
    
    private addWeapon(config: WeaponConfig): void {
        this._weaponConfigs.set(config.id, config);
    }
    
    // ========== 获取配置 ==========
    
    public getWeaponConfig(id: string): WeaponConfig | undefined {
        return this._weaponConfigs.get(id);
    }
    
    public getSoulOrbConfig(id: string): SoulOrbConfig | undefined {
        return this._soulOrbConfigs.get(id);
    }
    
    public getPassiveConfig(id: string): WeaponPassiveConfig | undefined {
        return this._passiveConfigs.get(id);
    }
    
    public getAllWeaponConfigs(): WeaponConfig[] {
        return Array.from(this._weaponConfigs.values());
    }
    
    public getWeaponsBySource(source: WeaponSourceType): WeaponConfig[] {
        return this.getAllWeaponConfigs().filter(w => w.sourceType === source);
    }
    
    public getWeaponsByElement(element: ElementType): WeaponConfig[] {
        return this.getAllWeaponConfigs().filter(w => w.element === element);
    }
    
    public getWeaponsByArchetype(archetype: string): WeaponConfig[] {
        return this.getAllWeaponConfigs().filter(w => 
            w.suitableArchetypes.includes(archetype) || 
            w.graduationFor?.includes(archetype)
        );
    }
    
    // ========== 武器实例管理 ==========
    
    /**
     * 添加武器到背包
     */
    public addWeapon(configId: string): WeaponInstance | null {
        const config = this._weaponConfigs.get(configId);
        if (!config) {
            console.error(`武器配置不存在: ${configId}`);
            return null;
        }
        
        const instance: WeaponInstance = {
            uniqueId: this.generateUniqueId('weapon'),
            configId: configId,
            level: 1,
            exp: 0,
            awakening: 0,
            equippedBy: null,
            isLocked: false,
            obtainedAt: Date.now()
        };
        
        this._weapons.set(instance.uniqueId, instance);
        console.log(`获得武器: ${config.name}`);
        
        this.saveData();
        return instance;
    }
    
    /**
     * 获取武器实例
     */
    public getWeaponInstance(uniqueId: string): WeaponInstance | undefined {
        return this._weapons.get(uniqueId);
    }
    
    /**
     * 获取所有武器
     */
    public getAllWeapons(): WeaponInstance[] {
        return Array.from(this._weapons.values());
    }
    
    /**
     * 获取未装备的武器
     */
    public getUnequippedWeapons(): WeaponInstance[] {
        return this.getAllWeapons().filter(w => !w.equippedBy);
    }
    
    // ========== 魂珠实例管理 ==========
    
    /**
     * 生成魂珠（觉醒时自动调用）
     */
    public generateSoulOrb(weaponInstance: WeaponInstance): SoulOrbInstance | null {
        const weaponConfig = this._weaponConfigs.get(weaponInstance.configId);
        if (!weaponConfig) return null;
        
        const orbConfigId = `orb_${weaponInstance.configId}`;
        const orbConfig = this._soulOrbConfigs.get(orbConfigId);
        if (!orbConfig) return null;
        
        const instance: SoulOrbInstance = {
            uniqueId: this.generateUniqueId('orb'),
            configId: orbConfigId,
            equippedBy: null,
            stacks: 1,
            isLocked: false,
            sourceWeaponInstanceId: weaponInstance.uniqueId,
            obtainedAt: Date.now()
        };
        
        this._soulOrbs.set(instance.uniqueId, instance);
        console.log(`获得魂珠: ${orbConfig.name}`);
        
        this.saveData();
        return instance;
    }
    
    /**
     * 获取魂珠实例
     */
    public getSoulOrbInstance(uniqueId: string): SoulOrbInstance | undefined {
        return this._soulOrbs.get(uniqueId);
    }
    
    /**
     * 获取所有魂珠
     */
    public getAllSoulOrbs(): SoulOrbInstance[] {
        return Array.from(this._soulOrbs.values());
    }
    
    // ========== 装备/卸下 ==========
    
    /**
     * 为角色装备武器
     */
    public equipWeapon(weaponUniqueId: string, characterId: string): boolean {
        const weapon = this._weapons.get(weaponUniqueId);
        if (!weapon) {
            console.log('武器不存在');
            return false;
        }
        
        // 如果武器已被其他角色装备，先卸下
        if (weapon.equippedBy && weapon.equippedBy !== characterId) {
            this.unequipWeapon(weaponUniqueId);
        }
        
        // 如果角色已有武器，先卸下
        const slots = this.getOrCreateSlots(characterId);
        if (slots.weaponId && slots.weaponId !== weaponUniqueId) {
            this.unequipWeapon(slots.weaponId);
        }
        
        weapon.equippedBy = characterId;
        slots.weaponId = weaponUniqueId;
        
        const config = this._weaponConfigs.get(weapon.configId);
        console.log(`装备武器: ${config?.name}`);
        
        this.saveData();
        return true;
    }
    
    /**
     * 卸下武器
     */
    public unequipWeapon(weaponUniqueId: string): boolean {
        const weapon = this._weapons.get(weaponUniqueId);
        if (!weapon || !weapon.equippedBy) return false;
        
        const slots = this._characterSlots.get(weapon.equippedBy);
        if (slots) {
            slots.weaponId = null;
        }
        
        weapon.equippedBy = null;
        this.saveData();
        return true;
    }
    
    /**
     * 为角色装备魂珠
     */
    public equipSoulOrb(orbUniqueId: string, characterId: string): boolean {
        const orb = this._soulOrbs.get(orbUniqueId);
        if (!orb) {
            console.log('魂珠不存在');
            return false;
        }
        
        // 如果魂珠已被其他角色装备，先卸下
        if (orb.equippedBy && orb.equippedBy !== characterId) {
            this.unequipSoulOrb(orbUniqueId);
        }
        
        // 如果角色已有魂珠，检查是否可叠加
        const slots = this.getOrCreateSlots(characterId);
        if (slots.soulOrbId) {
            const existingOrb = this._soulOrbs.get(slots.soulOrbId);
            if (existingOrb && existingOrb.configId === orb.configId) {
                // 同名魂珠，尝试叠加
                const config = this._soulOrbConfigs.get(orb.configId);
                if (config?.stackable && existingOrb.stacks < (config.maxStacks || 1)) {
                    existingOrb.stacks++;
                    // 移除被叠加的魂珠
                    this._soulOrbs.delete(orbUniqueId);
                    console.log(`魂珠叠加成功，当前层数: ${existingOrb.stacks}`);
                    this.saveData();
                    return true;
                }
            }
            // 不能叠加，先卸下
            this.unequipSoulOrb(slots.soulOrbId);
        }
        
        orb.equippedBy = characterId;
        slots.soulOrbId = orbUniqueId;
        
        const config = this._soulOrbConfigs.get(orb.configId);
        console.log(`装备魂珠: ${config?.name}`);
        
        this.saveData();
        return true;
    }
    
    /**
     * 卸下魂珠
     */
    public unequipSoulOrb(orbUniqueId: string): boolean {
        const orb = this._soulOrbs.get(orbUniqueId);
        if (!orb || !orb.equippedBy) return false;
        
        const slots = this._characterSlots.get(orb.equippedBy);
        if (slots) {
            slots.soulOrbId = null;
        }
        
        orb.equippedBy = null;
        this.saveData();
        return true;
    }
    
    /**
     * 获取或创建角色槽位
     */
    private getOrCreateSlots(characterId: string): CharacterWeaponSlots {
        let slots = this._characterSlots.get(characterId);
        if (!slots) {
            slots = { weaponId: null, soulOrbId: null };
            this._characterSlots.set(characterId, slots);
        }
        return slots;
    }
    
    /**
     * 获取角色的武器槽位
     */
    public getCharacterSlots(characterId: string): CharacterWeaponSlots | undefined {
        return this._characterSlots.get(characterId);
    }
    
    // ========== 属性计算 ==========
    
    /**
     * 计算武器提供的属性
     */
    public calculateWeaponStats(
        characterId: string, 
        characterElement: ElementType,
        isMainSlot: boolean = true
    ): WeaponStatsResult {
        const result: WeaponStatsResult = {
            attack: 0,
            hp: 0,
            passiveEffects: [],
            elementBonus: 0
        };
        
        const slots = this._characterSlots.get(characterId);
        if (!slots) return result;
        
        // 武器属性
        if (slots.weaponId) {
            const weapon = this._weapons.get(slots.weaponId);
            if (weapon) {
                const config = this._weaponConfigs.get(weapon.configId);
                if (config) {
                    // 基础面板
                    result.attack = config.baseAttack + config.attackGrowth * (weapon.level - 1);
                    result.hp = config.baseHP + config.hpGrowth * (weapon.level - 1);
                    
                    // 同属性加成
                    if (config.element === characterElement) {
                        result.elementBonus = 0.1;
                    }
                    
                    // 被动效果
                    for (const passiveEntry of config.passives) {
                        if (weapon.awakening >= passiveEntry.awakening) {
                            const passive = passiveEntry.passive;
                            
                            // 检查主位限制
                            if (passive.mainSlotOnly && !isMainSlot) continue;
                            
                            const value = passive.baseValue + passive.awakeningGrowth * weapon.awakening;
                            result.passiveEffects.push({
                                type: passive.type,
                                value: value,
                                source: 'weapon'
                            });
                        }
                    }
                }
            }
        }
        
        // 魂珠属性（仅主位）
        if (isMainSlot && slots.soulOrbId) {
            const orb = this._soulOrbs.get(slots.soulOrbId);
            if (orb) {
                const orbConfig = this._soulOrbConfigs.get(orb.configId);
                if (orbConfig) {
                    // 词条效果
                    for (const stat of orbConfig.stats) {
                        result.passiveEffects.push({
                            type: stat.type,
                            value: stat.value * orb.stacks,
                            source: 'soulOrb'
                        });
                    }
                    
                    // 被动效果（减半）
                    if (orbConfig.passiveId) {
                        const passive = this._passiveConfigs.get(orbConfig.passiveId);
                        if (passive) {
                            result.passiveEffects.push({
                                type: passive.type,
                                value: passive.baseValue * orbConfig.passiveEffectRatio * orb.stacks,
                                source: 'soulOrb'
                            });
                        }
                    }
                }
            }
        }
        
        return result;
    }
    
    // ========== 材料管理 ==========
    
    /**
     * 获取材料数量
     */
    public getMaterialCount(type: WeaponMaterialType): number {
        return this._materials[type] || 0;
    }
    
    /**
     * 添加材料
     */
    public addMaterial(type: WeaponMaterialType, amount: number): void {
        this._materials[type] = (this._materials[type] || 0) + amount;
        this.saveData();
    }
    
    /**
     * 消耗材料
     */
    public consumeMaterial(type: WeaponMaterialType, amount: number): boolean {
        if (this.getMaterialCount(type) < amount) return false;
        this._materials[type] -= amount;
        this.saveData();
        return true;
    }
    
    /**
     * 获取金币
     */
    public get gold(): number {
        return this._gold;
    }
    
    /**
     * 添加金币
     */
    public addGold(amount: number): void {
        this._gold += amount;
        this.saveData();
    }
    
    /**
     * 消耗金币
     */
    public consumeGold(amount: number): boolean {
        if (this._gold < amount) return false;
        this._gold -= amount;
        this.saveData();
        return true;
    }
    
    // ========== 辅助方法 ==========
    
    private generateUniqueId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 获取稀有度名称
     */
    public getRarityName(rarity: WeaponRarity): string {
        switch (rarity) {
            case WeaponRarity.N: return 'N';
            case WeaponRarity.R: return 'R';
            case WeaponRarity.SR: return 'SR';
            case WeaponRarity.SSR: return 'SSR';
            case WeaponRarity.UR: return 'UR';
            default: return '?';
        }
    }
    
    /**
     * 获取来源类型名称
     */
    public getSourceTypeName(source: WeaponSourceType): string {
        switch (source) {
            case WeaponSourceType.BOND: return '羁绊武';
            case WeaponSourceType.BOSS: return '领主武';
            case WeaponSourceType.PERMANENT: return '常驻武';
            case WeaponSourceType.LIMITED: return '限定武';
            case WeaponSourceType.COMMON: return '普通武';
            default: return '未知';
        }
    }
    
    // ========== 存档系统 ==========
    
    public saveData(): void {
        const data = {
            weapons: Array.from(this._weapons.entries()),
            soulOrbs: Array.from(this._soulOrbs.entries()),
            characterSlots: Array.from(this._characterSlots.entries()),
            materials: this._materials,
            gold: this._gold
        };
        
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }
    
    public loadData(): void {
        const savedData = sys.localStorage.getItem(this.SAVE_KEY);
        if (!savedData) {
            this.giveStarterWeapon();
            return;
        }
        
        try {
            const data = JSON.parse(savedData);
            this._weapons = new Map(data.weapons || []);
            this._soulOrbs = new Map(data.soulOrbs || []);
            this._characterSlots = new Map(data.characterSlots || []);
            this._materials = data.materials || {};
            this._gold = data.gold || 0;
            
            console.log(`加载武器数据成功，拥有 ${this._weapons.size} 把武器，${this._soulOrbs.size} 个魂珠`);
        } catch (e) {
            console.error('加载武器数据失败:', e);
            this.giveStarterWeapon();
        }
    }
    
    private giveStarterWeapon(): void {
        this.addWeapon('weapon_common_starter');
        this._gold = 10000;
        this._materials[WeaponMaterialType.MEMORY_STONE] = 50;
        this._materials[WeaponMaterialType.IRON_PARTICLE] = 100;
        this._materials[WeaponMaterialType.FORGING_STONE] = 20;
    }
    
    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._weapons.clear();
        this._soulOrbs.clear();
        this._characterSlots.clear();
        this._materials = {};
        this._gold = 0;
        this.giveStarterWeapon();
    }
}
