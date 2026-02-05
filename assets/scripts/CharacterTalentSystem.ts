import { _decorator, Component, sys, EventTarget } from 'cc';
import { CharacterDatabase, CharacterConfig, CharacterRarity, ElementType, CharacterStats } from './CharacterData';
import { CharacterManager } from './CharacterManager';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 天赋节点类型
 */
export enum TalentNodeType {
    STAT = 'stat',              // 属性提升节点
    SKILL = 'skill',            // 技能强化节点
    PASSIVE = 'passive',        // 被动技能节点
    CORE = 'core',              // 核心节点（重要节点）
    SPECIAL = 'special'         // 特殊节点（需要特殊材料）
}

/**
 * 天赋节点状态
 */
export enum TalentNodeStatus {
    LOCKED = 'locked',          // 锁定
    AVAILABLE = 'available',    // 可解锁
    UNLOCKED = 'unlocked'       // 已解锁
}

/**
 * 天赋节点效果
 */
export interface TalentNodeEffect {
    // 属性加成
    hpAdd?: number;
    hpPercent?: number;
    attackAdd?: number;
    attackPercent?: number;
    defenseAdd?: number;
    defensePercent?: number;
    speedAdd?: number;
    critRateAdd?: number;
    critDamageAdd?: number;
    skillPowerPercent?: number;

    // 特殊效果
    elementDamageBonus?: number;        // 元素伤害加成
    skillCooldownReduce?: number;       // 技能冷却减少（秒）
    energyRecoveryBonus?: number;       // 能量恢复加成
    healingBonus?: number;              // 治疗效果加成
    damageReduction?: number;           // 伤害减免

    // 解锁效果
    unlockSkillId?: string;             // 解锁技能ID
    unlockPassiveId?: string;           // 解锁被动ID
}

/**
 * 天赋节点配置
 */
export interface TalentNodeConfig {
    id: string;
    name: string;
    description: string;
    type: TalentNodeType;
    
    // 位置（用于UI显示）
    position: { x: number; y: number };
    
    // 解锁条件
    prerequisiteIds: string[];          // 前置节点ID列表
    requiredLevel: number;              // 需要角色等级
    requiredAwakening: number;          // 需要觉醒等级
    
    // 消耗
    goldCost: number;                   // 金币消耗
    talentPointCost: number;            // 天赋点消耗
    specialMaterialId?: string;         // 特殊材料ID（可选）
    specialMaterialCount?: number;      // 特殊材料数量
    
    // 效果
    effect: TalentNodeEffect;
    
    // 图标
    iconPath?: string;
}

/**
 * 天赋树配置
 */
export interface TalentTreeConfig {
    id: string;
    name: string;
    description: string;
    
    // 适用条件
    forElements?: ElementType[];        // 适用元素
    forRarities?: CharacterRarity[];    // 适用稀有度
    forCharacterIds?: string[];         // 适用特定角色
    
    // 天赋树布局
    nodes: TalentNodeConfig[];
    
    // 总天赋点上限
    maxPoints: number;
}

/**
 * 角色天赋数据
 */
export interface CharacterTalentData {
    characterId: string;
    unlockedNodes: string[];            // 已解锁的节点ID
    talentPoints: number;               // 当前天赋点
    totalPointsSpent: number;           // 已消耗的总天赋点
    lastResetTime?: number;             // 上次重置时间
}

/**
 * 天赋解锁结果
 */
export interface TalentUnlockResult {
    success: boolean;
    error?: string;
    nodeId?: string;
    effect?: TalentNodeEffect;
}

/**
 * 天赋重置结果
 */
export interface TalentResetResult {
    success: boolean;
    error?: string;
    refundedPoints?: number;
    refundedGold?: number;
}

/**
 * 角色天赋系统
 * Character Talent System
 */
@ccclass('CharacterTalentSystem')
export class CharacterTalentSystem extends Component {
    private static _instance: CharacterTalentSystem | null = null;

    // 事件目标
    public readonly events: EventTarget = new EventTarget();

    // 事件类型
    public static readonly EVENT_TALENT_UNLOCKED = 'talent-unlocked';
    public static readonly EVENT_TALENT_RESET = 'talent-reset';
    public static readonly EVENT_POINTS_CHANGED = 'talent-points-changed';

    // 天赋树配置
    private _talentTrees: Map<string, TalentTreeConfig> = new Map();

    // 角色天赋数据
    private _characterTalents: Map<string, CharacterTalentData> = new Map();

    // 天赋材料库存
    private _talentMaterials: Map<string, number> = new Map();

    // 重置冷却时间（毫秒）
    private readonly RESET_COOLDOWN = 24 * 60 * 60 * 1000; // 24小时

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_talent_data';

    public static get instance(): CharacterTalentSystem | null {
        return CharacterTalentSystem._instance;
    }

    onLoad() {
        if (CharacterTalentSystem._instance) {
            this.node.destroy();
            return;
        }
        CharacterTalentSystem._instance = this;

        this.initTalentTrees();
        this.loadData();
    }

    /**
     * 初始化天赋树配置
     */
    private initTalentTrees(): void {
        // ========== 通用攻击型天赋树 ==========
        this.addTalentTree({
            id: 'talent_tree_attack',
            name: '攻击天赋',
            description: '提升攻击能力的天赋树',
            forElements: undefined,
            forRarities: undefined,
            maxPoints: 30,
            nodes: [
                // 第一层 - 基础节点
                {
                    id: 'atk_node_1_1',
                    name: '基础攻击I',
                    description: '攻击力+20',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 0 },
                    prerequisiteIds: [],
                    requiredLevel: 1,
                    requiredAwakening: 0,
                    goldCost: 500,
                    talentPointCost: 1,
                    effect: { attackAdd: 20 }
                },
                {
                    id: 'atk_node_1_2',
                    name: '基础攻击II',
                    description: '攻击力+30',
                    type: TalentNodeType.STAT,
                    position: { x: 1, y: 0 },
                    prerequisiteIds: ['atk_node_1_1'],
                    requiredLevel: 5,
                    requiredAwakening: 0,
                    goldCost: 1000,
                    talentPointCost: 1,
                    effect: { attackAdd: 30 }
                },
                {
                    id: 'atk_node_1_3',
                    name: '基础攻击III',
                    description: '攻击力+50',
                    type: TalentNodeType.STAT,
                    position: { x: 2, y: 0 },
                    prerequisiteIds: ['atk_node_1_2'],
                    requiredLevel: 10,
                    requiredAwakening: 0,
                    goldCost: 2000,
                    talentPointCost: 2,
                    effect: { attackAdd: 50 }
                },

                // 第二层 - 暴击分支
                {
                    id: 'atk_node_2_1',
                    name: '精准打击',
                    description: '暴击率+3%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 1 },
                    prerequisiteIds: ['atk_node_1_3'],
                    requiredLevel: 15,
                    requiredAwakening: 0,
                    goldCost: 3000,
                    talentPointCost: 2,
                    effect: { critRateAdd: 0.03 }
                },
                {
                    id: 'atk_node_2_2',
                    name: '致命一击',
                    description: '暴击伤害+15%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 2 },
                    prerequisiteIds: ['atk_node_2_1'],
                    requiredLevel: 20,
                    requiredAwakening: 0,
                    goldCost: 4000,
                    talentPointCost: 2,
                    effect: { critDamageAdd: 0.15 }
                },
                {
                    id: 'atk_node_2_3',
                    name: '暴击大师',
                    description: '暴击率+5%, 暴击伤害+20%',
                    type: TalentNodeType.CORE,
                    position: { x: 0, y: 3 },
                    prerequisiteIds: ['atk_node_2_2'],
                    requiredLevel: 30,
                    requiredAwakening: 1,
                    goldCost: 8000,
                    talentPointCost: 4,
                    effect: { critRateAdd: 0.05, critDamageAdd: 0.20 }
                },

                // 第二层 - 攻击力分支
                {
                    id: 'atk_node_3_1',
                    name: '力量强化',
                    description: '攻击力+5%',
                    type: TalentNodeType.STAT,
                    position: { x: 2, y: 1 },
                    prerequisiteIds: ['atk_node_1_3'],
                    requiredLevel: 15,
                    requiredAwakening: 0,
                    goldCost: 3000,
                    talentPointCost: 2,
                    effect: { attackPercent: 0.05 }
                },
                {
                    id: 'atk_node_3_2',
                    name: '战斗本能',
                    description: '攻击力+8%',
                    type: TalentNodeType.STAT,
                    position: { x: 2, y: 2 },
                    prerequisiteIds: ['atk_node_3_1'],
                    requiredLevel: 25,
                    requiredAwakening: 0,
                    goldCost: 5000,
                    talentPointCost: 3,
                    effect: { attackPercent: 0.08 }
                },
                {
                    id: 'atk_node_3_3',
                    name: '狂暴之力',
                    description: '攻击力+12%, 速度+10%',
                    type: TalentNodeType.CORE,
                    position: { x: 2, y: 3 },
                    prerequisiteIds: ['atk_node_3_2'],
                    requiredLevel: 35,
                    requiredAwakening: 1,
                    goldCost: 10000,
                    talentPointCost: 4,
                    effect: { attackPercent: 0.12, speedAdd: 10 }
                },

                // 核心节点
                {
                    id: 'atk_node_core',
                    name: '战神之力',
                    description: '攻击力+15%, 暴击率+5%, 技能威力+10%',
                    type: TalentNodeType.SPECIAL,
                    position: { x: 1, y: 4 },
                    prerequisiteIds: ['atk_node_2_3', 'atk_node_3_3'],
                    requiredLevel: 40,
                    requiredAwakening: 2,
                    goldCost: 20000,
                    talentPointCost: 5,
                    specialMaterialId: 'talent_attack_crystal',
                    specialMaterialCount: 5,
                    effect: { attackPercent: 0.15, critRateAdd: 0.05, skillPowerPercent: 0.10 }
                }
            ]
        });

        // ========== 通用防御型天赋树 ==========
        this.addTalentTree({
            id: 'talent_tree_defense',
            name: '防御天赋',
            description: '提升生存能力的天赋树',
            forElements: undefined,
            forRarities: undefined,
            maxPoints: 30,
            nodes: [
                // 第一层 - 基础节点
                {
                    id: 'def_node_1_1',
                    name: '基础生命I',
                    description: 'HP+100',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 0 },
                    prerequisiteIds: [],
                    requiredLevel: 1,
                    requiredAwakening: 0,
                    goldCost: 500,
                    talentPointCost: 1,
                    effect: { hpAdd: 100 }
                },
                {
                    id: 'def_node_1_2',
                    name: '基础生命II',
                    description: 'HP+200',
                    type: TalentNodeType.STAT,
                    position: { x: 1, y: 0 },
                    prerequisiteIds: ['def_node_1_1'],
                    requiredLevel: 5,
                    requiredAwakening: 0,
                    goldCost: 1000,
                    talentPointCost: 1,
                    effect: { hpAdd: 200 }
                },
                {
                    id: 'def_node_1_3',
                    name: '基础防御',
                    description: '防御力+30',
                    type: TalentNodeType.STAT,
                    position: { x: 2, y: 0 },
                    prerequisiteIds: ['def_node_1_2'],
                    requiredLevel: 10,
                    requiredAwakening: 0,
                    goldCost: 2000,
                    talentPointCost: 2,
                    effect: { defenseAdd: 30 }
                },

                // 第二层 - HP分支
                {
                    id: 'def_node_2_1',
                    name: '生命强化',
                    description: 'HP+5%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 1 },
                    prerequisiteIds: ['def_node_1_3'],
                    requiredLevel: 15,
                    requiredAwakening: 0,
                    goldCost: 3000,
                    talentPointCost: 2,
                    effect: { hpPercent: 0.05 }
                },
                {
                    id: 'def_node_2_2',
                    name: '生命之泉',
                    description: 'HP+10%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 2 },
                    prerequisiteIds: ['def_node_2_1'],
                    requiredLevel: 20,
                    requiredAwakening: 0,
                    goldCost: 4000,
                    talentPointCost: 3,
                    effect: { hpPercent: 0.10 }
                },
                {
                    id: 'def_node_2_3',
                    name: '不死之身',
                    description: 'HP+15%, 伤害减免+5%',
                    type: TalentNodeType.CORE,
                    position: { x: 0, y: 3 },
                    prerequisiteIds: ['def_node_2_2'],
                    requiredLevel: 30,
                    requiredAwakening: 1,
                    goldCost: 8000,
                    talentPointCost: 4,
                    effect: { hpPercent: 0.15, damageReduction: 0.05 }
                },

                // 第二层 - 防御分支
                {
                    id: 'def_node_3_1',
                    name: '铁壁',
                    description: '防御力+5%',
                    type: TalentNodeType.STAT,
                    position: { x: 2, y: 1 },
                    prerequisiteIds: ['def_node_1_3'],
                    requiredLevel: 15,
                    requiredAwakening: 0,
                    goldCost: 3000,
                    talentPointCost: 2,
                    effect: { defensePercent: 0.05 }
                },
                {
                    id: 'def_node_3_2',
                    name: '钢铁意志',
                    description: '防御力+10%',
                    type: TalentNodeType.STAT,
                    position: { x: 2, y: 2 },
                    prerequisiteIds: ['def_node_3_1'],
                    requiredLevel: 25,
                    requiredAwakening: 0,
                    goldCost: 5000,
                    talentPointCost: 3,
                    effect: { defensePercent: 0.10 }
                },
                {
                    id: 'def_node_3_3',
                    name: '坚不可摧',
                    description: '防御力+15%, 伤害减免+3%',
                    type: TalentNodeType.CORE,
                    position: { x: 2, y: 3 },
                    prerequisiteIds: ['def_node_3_2'],
                    requiredLevel: 35,
                    requiredAwakening: 1,
                    goldCost: 10000,
                    talentPointCost: 4,
                    effect: { defensePercent: 0.15, damageReduction: 0.03 }
                },

                // 核心节点
                {
                    id: 'def_node_core',
                    name: '守护神',
                    description: 'HP+20%, 防御力+15%, 伤害减免+10%',
                    type: TalentNodeType.SPECIAL,
                    position: { x: 1, y: 4 },
                    prerequisiteIds: ['def_node_2_3', 'def_node_3_3'],
                    requiredLevel: 40,
                    requiredAwakening: 2,
                    goldCost: 20000,
                    talentPointCost: 5,
                    specialMaterialId: 'talent_defense_crystal',
                    specialMaterialCount: 5,
                    effect: { hpPercent: 0.20, defensePercent: 0.15, damageReduction: 0.10 }
                }
            ]
        });

        // ========== 技能型天赋树 ==========
        this.addTalentTree({
            id: 'talent_tree_skill',
            name: '技能天赋',
            description: '强化技能效果的天赋树',
            forElements: undefined,
            forRarities: undefined,
            maxPoints: 30,
            nodes: [
                {
                    id: 'skill_node_1_1',
                    name: '技能入门',
                    description: '技能威力+3%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 0 },
                    prerequisiteIds: [],
                    requiredLevel: 1,
                    requiredAwakening: 0,
                    goldCost: 500,
                    talentPointCost: 1,
                    effect: { skillPowerPercent: 0.03 }
                },
                {
                    id: 'skill_node_1_2',
                    name: '技能精通',
                    description: '技能威力+5%',
                    type: TalentNodeType.STAT,
                    position: { x: 1, y: 0 },
                    prerequisiteIds: ['skill_node_1_1'],
                    requiredLevel: 10,
                    requiredAwakening: 0,
                    goldCost: 1500,
                    talentPointCost: 2,
                    effect: { skillPowerPercent: 0.05 }
                },
                {
                    id: 'skill_node_2_1',
                    name: '能量亲和',
                    description: '能量恢复+10%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 1 },
                    prerequisiteIds: ['skill_node_1_2'],
                    requiredLevel: 15,
                    requiredAwakening: 0,
                    goldCost: 3000,
                    talentPointCost: 2,
                    effect: { energyRecoveryBonus: 0.10 }
                },
                {
                    id: 'skill_node_2_2',
                    name: '冷却缩减',
                    description: '技能冷却-1秒',
                    type: TalentNodeType.SKILL,
                    position: { x: 2, y: 1 },
                    prerequisiteIds: ['skill_node_1_2'],
                    requiredLevel: 15,
                    requiredAwakening: 0,
                    goldCost: 3000,
                    talentPointCost: 2,
                    effect: { skillCooldownReduce: 1 }
                },
                {
                    id: 'skill_node_3_1',
                    name: '能量大师',
                    description: '能量恢复+20%, 技能威力+8%',
                    type: TalentNodeType.CORE,
                    position: { x: 0, y: 2 },
                    prerequisiteIds: ['skill_node_2_1'],
                    requiredLevel: 25,
                    requiredAwakening: 1,
                    goldCost: 6000,
                    talentPointCost: 3,
                    effect: { energyRecoveryBonus: 0.20, skillPowerPercent: 0.08 }
                },
                {
                    id: 'skill_node_3_2',
                    name: '快速施法',
                    description: '技能冷却-2秒',
                    type: TalentNodeType.CORE,
                    position: { x: 2, y: 2 },
                    prerequisiteIds: ['skill_node_2_2'],
                    requiredLevel: 25,
                    requiredAwakening: 1,
                    goldCost: 6000,
                    talentPointCost: 3,
                    effect: { skillCooldownReduce: 2 }
                },
                {
                    id: 'skill_node_core',
                    name: '技能宗师',
                    description: '技能威力+20%, 能量恢复+30%, 冷却-2秒',
                    type: TalentNodeType.SPECIAL,
                    position: { x: 1, y: 3 },
                    prerequisiteIds: ['skill_node_3_1', 'skill_node_3_2'],
                    requiredLevel: 40,
                    requiredAwakening: 2,
                    goldCost: 20000,
                    talentPointCost: 5,
                    specialMaterialId: 'talent_skill_crystal',
                    specialMaterialCount: 5,
                    effect: { skillPowerPercent: 0.20, energyRecoveryBonus: 0.30, skillCooldownReduce: 2 }
                }
            ]
        });

        // ========== 火元素专属天赋树 ==========
        this.addTalentTree({
            id: 'talent_tree_fire',
            name: '火焰精通',
            description: '火属性角色专属天赋树',
            forElements: [ElementType.FIRE],
            forRarities: undefined,
            maxPoints: 20,
            nodes: [
                {
                    id: 'fire_node_1',
                    name: '火焰亲和',
                    description: '火属性伤害+5%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 0 },
                    prerequisiteIds: [],
                    requiredLevel: 10,
                    requiredAwakening: 0,
                    goldCost: 2000,
                    talentPointCost: 2,
                    effect: { elementDamageBonus: 0.05 }
                },
                {
                    id: 'fire_node_2',
                    name: '燃烧之心',
                    description: '火属性伤害+10%, 攻击+5%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 1 },
                    prerequisiteIds: ['fire_node_1'],
                    requiredLevel: 20,
                    requiredAwakening: 0,
                    goldCost: 5000,
                    talentPointCost: 3,
                    effect: { elementDamageBonus: 0.10, attackPercent: 0.05 }
                },
                {
                    id: 'fire_node_3',
                    name: '烈焰核心',
                    description: '火属性伤害+15%, 技能威力+10%',
                    type: TalentNodeType.CORE,
                    position: { x: 0, y: 2 },
                    prerequisiteIds: ['fire_node_2'],
                    requiredLevel: 30,
                    requiredAwakening: 1,
                    goldCost: 10000,
                    talentPointCost: 4,
                    effect: { elementDamageBonus: 0.15, skillPowerPercent: 0.10 }
                },
                {
                    id: 'fire_node_core',
                    name: '火神祝福',
                    description: '火属性伤害+25%, 攻击+15%, 暴击伤害+20%',
                    type: TalentNodeType.SPECIAL,
                    position: { x: 0, y: 3 },
                    prerequisiteIds: ['fire_node_3'],
                    requiredLevel: 40,
                    requiredAwakening: 2,
                    goldCost: 20000,
                    talentPointCost: 5,
                    specialMaterialId: 'talent_fire_crystal',
                    specialMaterialCount: 3,
                    effect: { elementDamageBonus: 0.25, attackPercent: 0.15, critDamageAdd: 0.20 }
                }
            ]
        });

        // ========== 水元素专属天赋树 ==========
        this.addTalentTree({
            id: 'talent_tree_water',
            name: '流水精通',
            description: '水属性角色专属天赋树',
            forElements: [ElementType.WATER],
            forRarities: undefined,
            maxPoints: 20,
            nodes: [
                {
                    id: 'water_node_1',
                    name: '水之亲和',
                    description: '水属性伤害+5%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 0 },
                    prerequisiteIds: [],
                    requiredLevel: 10,
                    requiredAwakening: 0,
                    goldCost: 2000,
                    talentPointCost: 2,
                    effect: { elementDamageBonus: 0.05 }
                },
                {
                    id: 'water_node_2',
                    name: '治愈之水',
                    description: '治疗效果+15%, HP+5%',
                    type: TalentNodeType.STAT,
                    position: { x: 0, y: 1 },
                    prerequisiteIds: ['water_node_1'],
                    requiredLevel: 20,
                    requiredAwakening: 0,
                    goldCost: 5000,
                    talentPointCost: 3,
                    effect: { healingBonus: 0.15, hpPercent: 0.05 }
                },
                {
                    id: 'water_node_3',
                    name: '海洋之心',
                    description: '水属性伤害+15%, 防御+10%',
                    type: TalentNodeType.CORE,
                    position: { x: 0, y: 2 },
                    prerequisiteIds: ['water_node_2'],
                    requiredLevel: 30,
                    requiredAwakening: 1,
                    goldCost: 10000,
                    talentPointCost: 4,
                    effect: { elementDamageBonus: 0.15, defensePercent: 0.10 }
                },
                {
                    id: 'water_node_core',
                    name: '海神祝福',
                    description: '水属性伤害+20%, 治疗+25%, HP+15%',
                    type: TalentNodeType.SPECIAL,
                    position: { x: 0, y: 3 },
                    prerequisiteIds: ['water_node_3'],
                    requiredLevel: 40,
                    requiredAwakening: 2,
                    goldCost: 20000,
                    talentPointCost: 5,
                    specialMaterialId: 'talent_water_crystal',
                    specialMaterialCount: 3,
                    effect: { elementDamageBonus: 0.20, healingBonus: 0.25, hpPercent: 0.15 }
                }
            ]
        });

        console.log(`天赋树数据库初始化完成，共 ${this._talentTrees.size} 棵天赋树`);
    }

    /**
     * 添加天赋树配置
     */
    private addTalentTree(config: TalentTreeConfig): void {
        this._talentTrees.set(config.id, config);
    }

    /**
     * 获取天赋树配置
     */
    public getTalentTree(treeId: string): TalentTreeConfig | undefined {
        return this._talentTrees.get(treeId);
    }

    /**
     * 获取所有天赋树
     */
    public getAllTalentTrees(): TalentTreeConfig[] {
        return Array.from(this._talentTrees.values());
    }

    /**
     * 获取角色可用的天赋树
     */
    public getAvailableTalentTrees(characterId: string): TalentTreeConfig[] {
        const config = CharacterDatabase.instance.getCharacter(characterId);
        if (!config) return [];

        return this.getAllTalentTrees().filter(tree => {
            // 检查元素限制
            if (tree.forElements && !tree.forElements.includes(config.element)) {
                return false;
            }

            // 检查稀有度限制
            if (tree.forRarities && !tree.forRarities.includes(config.rarity)) {
                return false;
            }

            // 检查角色限制
            if (tree.forCharacterIds && !tree.forCharacterIds.includes(characterId)) {
                return false;
            }

            return true;
        });
    }

    /**
     * 获取角色天赋数据
     */
    public getCharacterTalentData(characterId: string): CharacterTalentData {
        if (!this._characterTalents.has(characterId)) {
            this._characterTalents.set(characterId, {
                characterId,
                unlockedNodes: [],
                talentPoints: 0,
                totalPointsSpent: 0
            });
        }
        return this._characterTalents.get(characterId)!;
    }

    /**
     * 获取节点状态
     */
    public getNodeStatus(characterId: string, treeId: string, nodeId: string): TalentNodeStatus {
        const data = this.getCharacterTalentData(characterId);
        
        if (data.unlockedNodes.includes(nodeId)) {
            return TalentNodeStatus.UNLOCKED;
        }

        const tree = this._talentTrees.get(treeId);
        if (!tree) return TalentNodeStatus.LOCKED;

        const node = tree.nodes.find(n => n.id === nodeId);
        if (!node) return TalentNodeStatus.LOCKED;

        // 检查前置节点
        if (node.prerequisiteIds.length > 0) {
            for (const prereqId of node.prerequisiteIds) {
                if (!data.unlockedNodes.includes(prereqId)) {
                    return TalentNodeStatus.LOCKED;
                }
            }
        }

        return TalentNodeStatus.AVAILABLE;
    }

    /**
     * 解锁天赋节点
     */
    public unlockNode(characterId: string, treeId: string, nodeId: string): TalentUnlockResult {
        const tree = this._talentTrees.get(treeId);
        if (!tree) {
            return { success: false, error: '天赋树不存在' };
        }

        const node = tree.nodes.find(n => n.id === nodeId);
        if (!node) {
            return { success: false, error: '节点不存在' };
        }

        // 检查节点状态
        const status = this.getNodeStatus(characterId, treeId, nodeId);
        if (status === TalentNodeStatus.UNLOCKED) {
            return { success: false, error: '节点已解锁' };
        }
        if (status === TalentNodeStatus.LOCKED) {
            return { success: false, error: '需要先解锁前置节点' };
        }

        // 获取角色实例检查等级和觉醒
        const manager = CharacterManager.instance;
        if (manager) {
            // 这里需要根据实际情况获取角色实例
            // 暂时跳过等级检查
        }

        const data = this.getCharacterTalentData(characterId);

        // 检查天赋点
        if (data.talentPoints < node.talentPointCost) {
            return { success: false, error: `天赋点不足，需要 ${node.talentPointCost} 点` };
        }

        // 检查金币
        if (CurrencyManager.instance) {
            if (!CurrencyManager.instance.hasCurrency(CurrencyType.GOLD, node.goldCost)) {
                return { success: false, error: `金币不足，需要 ${node.goldCost} 金币` };
            }
        }

        // 检查特殊材料
        if (node.specialMaterialId && node.specialMaterialCount) {
            const owned = this._talentMaterials.get(node.specialMaterialId) || 0;
            if (owned < node.specialMaterialCount) {
                return { success: false, error: `材料不足，需要 ${node.specialMaterialCount} 个特殊材料` };
            }
        }

        // 扣除消耗
        data.talentPoints -= node.talentPointCost;
        data.totalPointsSpent += node.talentPointCost;

        if (CurrencyManager.instance) {
            CurrencyManager.instance.spendGold(node.goldCost, '解锁天赋节点');
        }

        if (node.specialMaterialId && node.specialMaterialCount) {
            const owned = this._talentMaterials.get(node.specialMaterialId) || 0;
            this._talentMaterials.set(node.specialMaterialId, owned - node.specialMaterialCount);
        }

        // 解锁节点
        data.unlockedNodes.push(nodeId);

        // 发送事件
        this.events.emit(CharacterTalentSystem.EVENT_TALENT_UNLOCKED, {
            characterId,
            treeId,
            nodeId,
            effect: node.effect
        });

        this.saveData();

        return {
            success: true,
            nodeId,
            effect: node.effect
        };
    }

    /**
     * 重置天赋树
     */
    public resetTalentTree(characterId: string, treeId: string): TalentResetResult {
        const tree = this._talentTrees.get(treeId);
        if (!tree) {
            return { success: false, error: '天赋树不存在' };
        }

        const data = this.getCharacterTalentData(characterId);

        // 检查冷却
        if (data.lastResetTime && Date.now() - data.lastResetTime < this.RESET_COOLDOWN) {
            const remainingTime = Math.ceil((this.RESET_COOLDOWN - (Date.now() - data.lastResetTime)) / (60 * 60 * 1000));
            return { success: false, error: `重置冷却中，剩余 ${remainingTime} 小时` };
        }

        // 计算返还
        let refundedPoints = 0;
        let refundedGold = 0;

        for (const node of tree.nodes) {
            if (data.unlockedNodes.includes(node.id)) {
                refundedPoints += node.talentPointCost;
                refundedGold += Math.floor(node.goldCost * 0.8); // 返还80%金币
            }
        }

        // 移除该天赋树的所有节点
        data.unlockedNodes = data.unlockedNodes.filter(nodeId => 
            !tree.nodes.some(n => n.id === nodeId)
        );

        // 返还天赋点
        data.talentPoints += refundedPoints;
        data.totalPointsSpent -= refundedPoints;

        // 返还金币
        if (CurrencyManager.instance && refundedGold > 0) {
            CurrencyManager.instance.addGold(refundedGold, '天赋重置返还');
        }

        // 记录重置时间
        data.lastResetTime = Date.now();

        // 发送事件
        this.events.emit(CharacterTalentSystem.EVENT_TALENT_RESET, {
            characterId,
            treeId,
            refundedPoints,
            refundedGold
        });

        this.saveData();

        return {
            success: true,
            refundedPoints,
            refundedGold
        };
    }

    /**
     * 添加天赋点
     */
    public addTalentPoints(characterId: string, points: number): void {
        const data = this.getCharacterTalentData(characterId);
        data.talentPoints += points;

        this.events.emit(CharacterTalentSystem.EVENT_POINTS_CHANGED, {
            characterId,
            points: data.talentPoints,
            change: points
        });

        this.saveData();
    }

    /**
     * 获取天赋点
     */
    public getTalentPoints(characterId: string): number {
        return this.getCharacterTalentData(characterId).talentPoints;
    }

    /**
     * 计算天赋效果总和
     */
    public getTotalTalentEffect(characterId: string): TalentNodeEffect {
        const data = this.getCharacterTalentData(characterId);
        const totalEffect: TalentNodeEffect = {};

        for (const tree of this._talentTrees.values()) {
            for (const node of tree.nodes) {
                if (data.unlockedNodes.includes(node.id)) {
                    this.mergeEffect(totalEffect, node.effect);
                }
            }
        }

        return totalEffect;
    }

    /**
     * 合并效果
     */
    private mergeEffect(target: TalentNodeEffect, source: TalentNodeEffect): void {
        if (source.hpAdd) target.hpAdd = (target.hpAdd || 0) + source.hpAdd;
        if (source.hpPercent) target.hpPercent = (target.hpPercent || 0) + source.hpPercent;
        if (source.attackAdd) target.attackAdd = (target.attackAdd || 0) + source.attackAdd;
        if (source.attackPercent) target.attackPercent = (target.attackPercent || 0) + source.attackPercent;
        if (source.defenseAdd) target.defenseAdd = (target.defenseAdd || 0) + source.defenseAdd;
        if (source.defensePercent) target.defensePercent = (target.defensePercent || 0) + source.defensePercent;
        if (source.speedAdd) target.speedAdd = (target.speedAdd || 0) + source.speedAdd;
        if (source.critRateAdd) target.critRateAdd = (target.critRateAdd || 0) + source.critRateAdd;
        if (source.critDamageAdd) target.critDamageAdd = (target.critDamageAdd || 0) + source.critDamageAdd;
        if (source.skillPowerPercent) target.skillPowerPercent = (target.skillPowerPercent || 0) + source.skillPowerPercent;
        if (source.elementDamageBonus) target.elementDamageBonus = (target.elementDamageBonus || 0) + source.elementDamageBonus;
        if (source.skillCooldownReduce) target.skillCooldownReduce = (target.skillCooldownReduce || 0) + source.skillCooldownReduce;
        if (source.energyRecoveryBonus) target.energyRecoveryBonus = (target.energyRecoveryBonus || 0) + source.energyRecoveryBonus;
        if (source.healingBonus) target.healingBonus = (target.healingBonus || 0) + source.healingBonus;
        if (source.damageReduction) target.damageReduction = (target.damageReduction || 0) + source.damageReduction;
    }

    /**
     * 应用天赋效果到属性
     */
    public applyTalentEffectToStats(stats: CharacterStats, effect: TalentNodeEffect): CharacterStats {
        const newStats = { ...stats };

        // 固定值加成
        if (effect.hpAdd) newStats.hp += effect.hpAdd;
        if (effect.attackAdd) newStats.attack += effect.attackAdd;
        if (effect.defenseAdd) newStats.defense += effect.defenseAdd;
        if (effect.speedAdd) newStats.speed += effect.speedAdd;

        // 百分比加成
        if (effect.hpPercent) newStats.hp = Math.floor(newStats.hp * (1 + effect.hpPercent));
        if (effect.attackPercent) newStats.attack = Math.floor(newStats.attack * (1 + effect.attackPercent));
        if (effect.defensePercent) newStats.defense = Math.floor(newStats.defense * (1 + effect.defensePercent));

        // 暴击
        if (effect.critRateAdd) newStats.critRate = Math.min(1, newStats.critRate + effect.critRateAdd);
        if (effect.critDamageAdd) newStats.critDamage += effect.critDamageAdd;

        // 技能威力
        if (effect.skillPowerPercent) newStats.skillPower *= (1 + effect.skillPowerPercent);

        return newStats;
    }

    /**
     * 添加天赋材料
     */
    public addTalentMaterial(materialId: string, amount: number): void {
        const current = this._talentMaterials.get(materialId) || 0;
        this._talentMaterials.set(materialId, current + amount);
        this.saveData();
    }

    /**
     * 获取天赋材料数量
     */
    public getTalentMaterial(materialId: string): number {
        return this._talentMaterials.get(materialId) || 0;
    }

    /**
     * 保存数据
     */
    public saveData(): void {
        const data = {
            characterTalents: Array.from(this._characterTalents.entries()),
            talentMaterials: Array.from(this._talentMaterials.entries())
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

            if (data.characterTalents) {
                this._characterTalents = new Map(data.characterTalents);
            }
            if (data.talentMaterials) {
                this._talentMaterials = new Map(data.talentMaterials);
            }

            console.log('天赋数据加载完成');
        } catch (e) {
            console.error('加载天赋数据失败:', e);
        }
    }

    /**
     * 清除数据
     */
    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._characterTalents.clear();
        this._talentMaterials.clear();
    }

    onDestroy() {
        this.saveData();
        if (CharacterTalentSystem._instance === this) {
            CharacterTalentSystem._instance = null;
        }
    }
}
