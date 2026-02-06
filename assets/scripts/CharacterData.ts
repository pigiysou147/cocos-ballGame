import { _decorator } from 'cc';
import { SkillDatabase, SkillConfig, SkillType } from './SkillData';
import { CharacterType, CharacterRole, PassiveMarkType, BounceType } from './CharacterFeatureSystem';

/**
 * 角色稀有度枚举
 */
export enum CharacterRarity {
    N = 1,      // 普通
    R = 2,      // 稀有
    SR = 3,     // 超稀有
    SSR = 4,    // 超超稀有
    UR = 5      // 究极稀有
}

/**
 * 角色元素属性枚举
 */
export enum ElementType {
    FIRE = 'fire',          // 火
    WATER = 'water',        // 水
    WIND = 'wind',          // 风
    THUNDER = 'thunder',    // 雷
    LIGHT = 'light',        // 光
    DARK = 'dark'           // 暗
}

/**
 * 角色职业枚举 (保留兼容，新系统使用CharacterType)
 */
export enum CharacterClass {
    WARRIOR = 'warrior',        // 战士
    MAGE = 'mage',              // 法师
    ARCHER = 'archer',          // 弓手
    HEALER = 'healer',          // 治疗
    TANK = 'tank',              // 坦克
    ASSASSIN = 'assassin',      // 刺客
    SUPPORT = 'support'         // 辅助
}

// 导出CharacterFeatureSystem的类型供外部使用
export { CharacterType, CharacterRole, PassiveMarkType, BounceType };

/**
 * 角色基础属性接口
 */
export interface CharacterStats {
    hp: number;             // 生命值
    attack: number;         // 攻击力
    defense: number;        // 防御力
    speed: number;          // 速度
    critRate: number;       // 暴击率 (0-1)
    critDamage: number;     // 暴击伤害 (1.5 = 150%)
    skillPower: number;     // 技能威力加成
}

/**
 * 角色技能槽位配置
 * 角色通过技能ID引用技能池中的技能
 */
export interface CharacterSkillSlots {
    // 默认技能ID（角色自带，不可更换）
    defaultSkillId: string;
    
    // 队长技能ID（可选）
    leaderSkillId?: string;
    
    // 被动技能ID列表（可选，最多3个）
    passiveSkillIds?: string[];
    
    // 可装备的技能槽位数量
    extraSkillSlots: number;
    
    // 可学习的技能ID列表（该角色可以学习的技能池）
    learnableSkillIds: string[];
}

/**
 * 角色被动技能配置
 */
export interface CharacterPassiveConfig {
    passiveId: string;          // 被动技能ID（引用CharacterFeatureSystem）
    markType: PassiveMarkType;  // 生效位置标识
    unlockLevel: number;        // 解锁等级
    unlockStar: number;         // 解锁星级
}

/**
 * 角色弹射特性配置
 */
export interface CharacterBounceConfig {
    bounceType: BounceType;     // 弹射行为类型
    bounceForce: number;        // 弹射力度
    colliderRadius: number;     // 碰撞半径
    
    // 特殊弹射属性
    penetration: boolean;       // 是否贯通
    multiHit: boolean;          // 是否多段命中
    projectileCount?: number;   // 投射物数量（射击类型）
    projectileSpread?: number;  // 投射物散布角度
    summonType?: string;        // 召唤物类型（特殊类型）
}

/**
 * 角色数据接口 - 静态配置数据（角色池）
 */
export interface CharacterConfig {
    id: string;
    name: string;
    title: string;              // 称号
    description: string;
    rarity: CharacterRarity;
    element: ElementType;
    characterClass: CharacterClass;  // 保留兼容
    
    // 新增：角色类型与定位
    characterType: CharacterType;    // 角色类型（格斗/剑士/射击/辅助/特殊）
    characterRole: CharacterRole;    // 角色定位（技伤/PF/直击/Fever/辅助等）
    secondaryRoles?: CharacterRole[]; // 次要定位（可选）
    
    // 基础属性（1级时）
    baseStats: CharacterStats;
    
    // 属性成长（每级增加）
    growthStats: CharacterStats;
    
    // 技能槽位配置（引用技能池）
    skillSlots: CharacterSkillSlots;
    
    // 被动技能配置
    passives: CharacterPassiveConfig[];
    
    // 弹射配置
    bounceConfig: CharacterBounceConfig;
    
    // 资源路径
    iconPath: string;
    spritePath: string;
    
    // 旧版兼容字段
    bounceForce: number;        // 弹射力度
    colliderRadius: number;     // 碰撞半径
    
    // 特殊机制标记
    specialMechanics?: {
        startFullEnergy?: boolean;      // 开局满能（如礼黑）
        coopBallSummon?: boolean;       // 协力球召唤（如面包人）
        floatMode?: boolean;            // 浮游模式（如猫爷）
        reviveBoost?: boolean;          // 复活加速（如不死王）
        manaGenerator?: boolean;        // Mana生成（如虎娘）
    };
    
    // 养成优先级建议
    upgradeAdvice?: {
        skillPriority: string[];        // 技能升级优先级
        weaponStats: string[];          // 武器推荐词条
        roleInTeam: string;             // 队伍中的定位说明
    };
}

/**
 * 角色实例数据接口 - 玩家拥有的角色数据
 */
export interface CharacterInstance {
    uniqueId: string;           // 唯一实例ID
    configId: string;           // 配置ID（引用角色池）
    level: number;              // 等级
    exp: number;                // 经验值
    star: number;               // 星级（突破次数）
    awakening: number;          // 觉醒等级
    
    // 技能配置（引用技能池）
    equippedSkills: {
        activeSkillId: string;      // 当前装备的主动技能ID
        passiveSkillIds: string[];  // 当前装备的被动技能ID列表
    };
    
    // 技能等级（技能ID -> 等级）
    skillLevels: { [skillId: string]: number };
    
    // 已学习的技能ID列表
    learnedSkillIds: string[];
    
    // 装备槽位
    equipmentSlots: {
        weapon?: string;
        armor?: string;
        accessory?: string;
    };
    
    // 好感度
    affinity: number;
    
    // 获取时间
    obtainedAt: number;
    
    // 是否锁定（防止误操作）
    isLocked: boolean;
}

/**
 * 角色数据库 - 独立的角色池
 */
export class CharacterDatabase {
    private static _instance: CharacterDatabase | null = null;
    private _characters: Map<string, CharacterConfig> = new Map();

    public static get instance(): CharacterDatabase {
        if (!CharacterDatabase._instance) {
            CharacterDatabase._instance = new CharacterDatabase();
            CharacterDatabase._instance.initDatabase();
        }
        return CharacterDatabase._instance;
    }

    /**
     * 初始化角色数据库
     */
    private initDatabase(): void {
        // ========== 火属性角色 ==========
        this.addCharacter({
            id: 'char_fire_001',
            name: '烈焰剑士',
            title: '燃烧之刃',
            description: '掌控火焰的剑士，攻击时有概率点燃敌人。',
            rarity: CharacterRarity.SSR,
            element: ElementType.FIRE,
            characterClass: CharacterClass.WARRIOR,
            characterType: CharacterType.SWORDSMAN,
            characterRole: CharacterRole.SKILL_DPS,
            baseStats: {
                hp: 1200,
                attack: 150,
                defense: 80,
                speed: 100,
                critRate: 0.15,
                critDamage: 1.5,
                skillPower: 1.0
            },
            growthStats: {
                hp: 120,
                attack: 15,
                defense: 8,
                speed: 2,
                critRate: 0.005,
                critDamage: 0.02,
                skillPower: 0.02
            },
            skillSlots: {
                defaultSkillId: 'skill_fire_blade',
                leaderSkillId: 'leader_fire_atk',
                passiveSkillIds: ['passive_crit_up'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_fire_blade', 'skill_inferno', 'skill_power_strike']
            },
            passives: [
                { passiveId: 'passive_skill_damage_10', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.SLASH,
                bounceForce: 850,
                colliderRadius: 32,
                penetration: true,
                multiHit: false
            },
            iconPath: 'textures/characters/fire_001_icon',
            spritePath: 'textures/characters/fire_001_sprite',
            bounceForce: 850,
            colliderRadius: 32
        });

        this.addCharacter({
            id: 'char_fire_002',
            name: '火焰法师',
            title: '炎之贤者',
            description: '精通火焰魔法的法师，技能伤害极高。',
            rarity: CharacterRarity.SR,
            element: ElementType.FIRE,
            characterClass: CharacterClass.MAGE,
            characterType: CharacterType.SHOOTER,
            characterRole: CharacterRole.SKILL_DPS,
            baseStats: {
                hp: 800,
                attack: 180,
                defense: 50,
                speed: 90,
                critRate: 0.1,
                critDamage: 1.8,
                skillPower: 1.3
            },
            growthStats: {
                hp: 80,
                attack: 18,
                defense: 5,
                speed: 2,
                critRate: 0.004,
                critDamage: 0.025,
                skillPower: 0.03
            },
            skillSlots: {
                defaultSkillId: 'skill_meteor',
                leaderSkillId: undefined,
                passiveSkillIds: [],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_meteor', 'skill_inferno', 'skill_fire_blade']
            },
            passives: [
                { passiveId: 'passive_skill_damage_10', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.PROJECTILE,
                bounceForce: 750,
                colliderRadius: 28,
                penetration: false,
                multiHit: false,
                projectileCount: 3,
                projectileSpread: 15
            },
            iconPath: 'textures/characters/fire_002_icon',
            spritePath: 'textures/characters/fire_002_sprite',
            bounceForce: 750,
            colliderRadius: 28
        });

        // ========== 水属性角色 ==========
        this.addCharacter({
            id: 'char_water_001',
            name: '海洋祭司',
            title: '治愈之波',
            description: '掌握海洋之力的祭司，擅长治疗队友。',
            rarity: CharacterRarity.SSR,
            element: ElementType.WATER,
            characterClass: CharacterClass.HEALER,
            characterType: CharacterType.SUPPORT,
            characterRole: CharacterRole.HEAL_SUPPORT,
            secondaryRoles: [CharacterRole.BUFF_SUPPORT],
            baseStats: {
                hp: 1000,
                attack: 100,
                defense: 70,
                speed: 95,
                critRate: 0.08,
                critDamage: 1.3,
                skillPower: 1.5
            },
            growthStats: {
                hp: 100,
                attack: 10,
                defense: 7,
                speed: 2,
                critRate: 0.003,
                critDamage: 0.015,
                skillPower: 0.035
            },
            skillSlots: {
                defaultSkillId: 'skill_heal_wave',
                leaderSkillId: 'leader_water_hp',
                passiveSkillIds: [],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_heal_wave', 'skill_tidal_wave', 'skill_divine_blessing']
            },
            passives: [
                { passiveId: 'passive_regen', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.FLOAT,
                bounceForce: 800,
                colliderRadius: 30,
                penetration: false,
                multiHit: false
            },
            iconPath: 'textures/characters/water_001_icon',
            spritePath: 'textures/characters/water_001_sprite',
            bounceForce: 800,
            colliderRadius: 30
        });

        this.addCharacter({
            id: 'char_water_002',
            name: '冰霜骑士',
            title: '寒冰守护',
            description: '身披寒冰铠甲的骑士，防御力极高，攻击附带冰冻。',
            rarity: CharacterRarity.SR,
            element: ElementType.WATER,
            characterClass: CharacterClass.TANK,
            characterType: CharacterType.SWORDSMAN,
            characterRole: CharacterRole.CONTROL_UTIL,
            secondaryRoles: [CharacterRole.DIRECT_DPS],
            baseStats: {
                hp: 1500,
                attack: 100,
                defense: 120,
                speed: 80,
                critRate: 0.05,
                critDamage: 1.3,
                skillPower: 0.8
            },
            growthStats: {
                hp: 150,
                attack: 10,
                defense: 12,
                speed: 1,
                critRate: 0.002,
                critDamage: 0.01,
                skillPower: 0.015
            },
            skillSlots: {
                defaultSkillId: 'skill_ice_shield',
                leaderSkillId: undefined,
                passiveSkillIds: ['passive_shield'],
                extraSkillSlots: 1,
                learnableSkillIds: ['skill_ice_shield', 'skill_tidal_wave']
            },
            passives: [
                { passiveId: 'passive_freeze', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.SLASH,
                bounceForce: 900,
                colliderRadius: 35,
                penetration: true,
                multiHit: false
            },
            iconPath: 'textures/characters/water_002_icon',
            spritePath: 'textures/characters/water_002_sprite',
            bounceForce: 900,
            colliderRadius: 35
        });

        // ========== 风属性角色 ==========
        this.addCharacter({
            id: 'char_wind_001',
            name: '疾风刺客',
            title: '影之疾风',
            description: '来去如风的刺客，攻击速度极快，高连击易触发PF。',
            rarity: CharacterRarity.SSR,
            element: ElementType.WIND,
            characterClass: CharacterClass.ASSASSIN,
            characterType: CharacterType.FIGHTER,
            characterRole: CharacterRole.PF_DPS,
            secondaryRoles: [CharacterRole.DIRECT_DPS],
            baseStats: {
                hp: 900,
                attack: 170,
                defense: 60,
                speed: 130,
                critRate: 0.25,
                critDamage: 2.0,
                skillPower: 1.1
            },
            growthStats: {
                hp: 90,
                attack: 17,
                defense: 6,
                speed: 3,
                critRate: 0.008,
                critDamage: 0.03,
                skillPower: 0.025
            },
            skillSlots: {
                defaultSkillId: 'skill_wind_slash',
                leaderSkillId: 'leader_wind_speed',
                passiveSkillIds: ['passive_crit_up'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_wind_slash', 'skill_speed_boost', 'skill_life_drain']
            },
            passives: [
                { passiveId: 'passive_pf_damage_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_combo_energy', markType: PassiveMarkType.NONE, unlockLevel: 20, unlockStar: 1 }
            ],
            bounceConfig: {
                bounceType: BounceType.RUSH,
                bounceForce: 950,
                colliderRadius: 28,
                penetration: false,
                multiHit: true
            },
            iconPath: 'textures/characters/wind_001_icon',
            spritePath: 'textures/characters/wind_001_sprite',
            bounceForce: 950,
            colliderRadius: 28
        });

        this.addCharacter({
            id: 'char_wind_002',
            name: '风之射手',
            title: '穿云之箭',
            description: '精通风系弓术的射手，攻击必中，提供充能辅助。',
            rarity: CharacterRarity.R,
            element: ElementType.WIND,
            characterClass: CharacterClass.ARCHER,
            characterType: CharacterType.SHOOTER,
            characterRole: CharacterRole.ENERGY_SUPPORT,
            secondaryRoles: [CharacterRole.BUFF_SUPPORT],
            baseStats: {
                hp: 850,
                attack: 140,
                defense: 55,
                speed: 110,
                critRate: 0.2,
                critDamage: 1.7,
                skillPower: 1.0
            },
            growthStats: {
                hp: 85,
                attack: 14,
                defense: 5,
                speed: 2,
                critRate: 0.006,
                critDamage: 0.02,
                skillPower: 0.02
            },
            skillSlots: {
                defaultSkillId: 'skill_piercing_arrow',
                leaderSkillId: undefined,
                passiveSkillIds: [],
                extraSkillSlots: 1,
                learnableSkillIds: ['skill_piercing_arrow', 'skill_wind_slash']
            },
            passives: [
                { passiveId: 'passive_kill_energy', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.PROJECTILE,
                bounceForce: 820,
                colliderRadius: 28,
                penetration: false,
                multiHit: false,
                projectileCount: 1
            },
            iconPath: 'textures/characters/wind_002_icon',
            spritePath: 'textures/characters/wind_002_sprite',
            bounceForce: 820,
            colliderRadius: 28
        });

        // ========== 雷属性角色 ==========
        this.addCharacter({
            id: 'char_thunder_001',
            name: '雷霆战神',
            title: '天罚之雷',
            description: '掌控雷霆的战神，攻击附带麻痹效果，暖机后高额攻刃。',
            rarity: CharacterRarity.UR,
            element: ElementType.THUNDER,
            characterClass: CharacterClass.WARRIOR,
            characterType: CharacterType.FIGHTER,
            characterRole: CharacterRole.PF_DPS,
            secondaryRoles: [CharacterRole.CONTROL_UTIL],
            baseStats: {
                hp: 1300,
                attack: 200,
                defense: 90,
                speed: 105,
                critRate: 0.2,
                critDamage: 1.8,
                skillPower: 1.2
            },
            growthStats: {
                hp: 130,
                attack: 20,
                defense: 9,
                speed: 2,
                critRate: 0.006,
                critDamage: 0.025,
                skillPower: 0.03
            },
            skillSlots: {
                defaultSkillId: 'skill_thunder_god',
                leaderSkillId: 'leader_thunder_crit',
                passiveSkillIds: ['passive_crit_up'],
                extraSkillSlots: 3,
                learnableSkillIds: ['skill_thunder_god', 'skill_chain_lightning', 'skill_power_strike']
            },
            passives: [
                { passiveId: 'passive_atk_blade_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_paralyze', markType: PassiveMarkType.NONE, unlockLevel: 15, unlockStar: 0 },
                { passiveId: 'passive_pf_damage_m', markType: PassiveMarkType.M_MARK, unlockLevel: 40, unlockStar: 2 }
            ],
            bounceConfig: {
                bounceType: BounceType.RUSH,
                bounceForce: 880,
                colliderRadius: 34,
                penetration: false,
                multiHit: true
            },
            iconPath: 'textures/characters/thunder_001_icon',
            spritePath: 'textures/characters/thunder_001_sprite',
            bounceForce: 880,
            colliderRadius: 34
        });

        // ========== 光属性角色 ==========
        this.addCharacter({
            id: 'char_light_001',
            name: '圣光天使',
            title: '神圣裁决',
            description: '降临凡间的天使，技伤队队长，大招增伤，兼顾治疗续航。',
            rarity: CharacterRarity.SSR,
            element: ElementType.LIGHT,
            characterClass: CharacterClass.SUPPORT,
            characterType: CharacterType.SUPPORT,
            characterRole: CharacterRole.SKILL_DPS,
            secondaryRoles: [CharacterRole.BUFF_SUPPORT, CharacterRole.HEAL_SUPPORT],
            baseStats: {
                hp: 1100,
                attack: 140,
                defense: 75,
                speed: 100,
                critRate: 0.12,
                critDamage: 1.5,
                skillPower: 1.4
            },
            growthStats: {
                hp: 110,
                attack: 14,
                defense: 7,
                speed: 2,
                critRate: 0.004,
                critDamage: 0.02,
                skillPower: 0.032
            },
            skillSlots: {
                defaultSkillId: 'skill_holy_light',
                leaderSkillId: 'leader_light_def',
                passiveSkillIds: [],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_holy_light', 'skill_divine_blessing', 'skill_heal_wave']
            },
            passives: [
                { passiveId: 'passive_skill_damage_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_final_damage_8', markType: PassiveMarkType.NONE, unlockLevel: 20, unlockStar: 1 },
                { passiveId: 'passive_regen', markType: PassiveMarkType.NONE, unlockLevel: 35, unlockStar: 2 }
            ],
            bounceConfig: {
                bounceType: BounceType.FLOAT,
                bounceForce: 830,
                colliderRadius: 30,
                penetration: false,
                multiHit: false
            },
            iconPath: 'textures/characters/light_001_icon',
            spritePath: 'textures/characters/light_001_sprite',
            bounceForce: 830,
            colliderRadius: 30,
            upgradeAdvice: {
                skillPriority: ['skill_holy_light', 'skill_divine_blessing'],
                weaponStats: ['技伤', '终伤', '暴击'],
                roleInTeam: '技伤队队长，30秒内2-3轮大招爆发'
            }
        });

        // ========== 暗属性角色 ==========
        this.addCharacter({
            id: 'char_dark_001',
            name: '暗影领主',
            title: '深渊支配',
            description: '来自深渊的领主，开局满能，技伤队核心，确保开局爆发。',
            rarity: CharacterRarity.UR,
            element: ElementType.DARK,
            characterClass: CharacterClass.MAGE,
            characterType: CharacterType.SPECIAL,
            characterRole: CharacterRole.ENERGY_SUPPORT,
            secondaryRoles: [CharacterRole.SKILL_DPS],
            baseStats: {
                hp: 1000,
                attack: 220,
                defense: 65,
                speed: 95,
                critRate: 0.18,
                critDamage: 2.0,
                skillPower: 1.5
            },
            growthStats: {
                hp: 100,
                attack: 22,
                defense: 6,
                speed: 2,
                critRate: 0.005,
                critDamage: 0.03,
                skillPower: 0.035
            },
            skillSlots: {
                defaultSkillId: 'skill_dark_void',
                leaderSkillId: 'leader_dark_power',
                passiveSkillIds: ['passive_lifesteal'],
                extraSkillSlots: 3,
                learnableSkillIds: ['skill_dark_void', 'skill_life_drain', 'skill_curse']
            },
            passives: [
                { passiveId: 'passive_start_full_energy_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_skill_damage_10', markType: PassiveMarkType.NONE, unlockLevel: 25, unlockStar: 1 }
            ],
            bounceConfig: {
                bounceType: BounceType.SUMMON,
                bounceForce: 800,
                colliderRadius: 32,
                penetration: false,
                multiHit: false,
                summonType: 'shadow_orb'
            },
            iconPath: 'textures/characters/dark_001_icon',
            spritePath: 'textures/characters/dark_001_sprite',
            bounceForce: 800,
            colliderRadius: 32,
            specialMechanics: {
                startFullEnergy: true
            },
            upgradeAdvice: {
                skillPriority: ['skill_dark_void', 'skill_life_drain'],
                weaponStats: ['技伤', '充能加速'],
                roleInTeam: '技伤队核心辅助，开局满能确保首轮爆发'
            }
        });

        // ========== 初始角色（N稀有度）==========
        this.addCharacter({
            id: 'char_starter_001',
            name: '见习剑士',
            title: '新手冒险者',
            description: '刚刚踏上冒险旅程的新手剑士。',
            rarity: CharacterRarity.N,
            element: ElementType.FIRE,
            characterClass: CharacterClass.WARRIOR,
            characterType: CharacterType.SWORDSMAN,
            characterRole: CharacterRole.DIRECT_DPS,
            baseStats: {
                hp: 800,
                attack: 100,
                defense: 60,
                speed: 90,
                critRate: 0.1,
                critDamage: 1.5,
                skillPower: 1.0
            },
            growthStats: {
                hp: 80,
                attack: 10,
                defense: 6,
                speed: 2,
                critRate: 0.003,
                critDamage: 0.015,
                skillPower: 0.02
            },
            skillSlots: {
                defaultSkillId: 'skill_basic_slash',
                leaderSkillId: 'leader_all_atk',
                passiveSkillIds: [],
                extraSkillSlots: 1,
                learnableSkillIds: ['skill_basic_slash', 'skill_power_strike']
            },
            passives: [],
            bounceConfig: {
                bounceType: BounceType.SLASH,
                bounceForce: 800,
                colliderRadius: 30,
                penetration: false,
                multiHit: false
            },
            iconPath: 'textures/characters/starter_001_icon',
            spritePath: 'textures/characters/starter_001_sprite',
            bounceForce: 800,
            colliderRadius: 30
        });

        // ========== 代表性角色 ==========
        this.initRepresentativeCharacters();

        console.log(`角色数据库初始化完成，共 ${this._characters.size} 个角色`);
    }

    /**
     * 初始化代表性角色（参考世界弹射物语）
     */
    private initRepresentativeCharacters(): void {
        // ===== 火属性代表 =====
        
        // 火狼（罗尔夫）- PF队核心
        this.addCharacter({
            id: 'char_fire_wolf',
            name: '烈火狼王',
            title: '罗尔夫',
            description: '常驻五人权，PF3独立乘区，贯通+锁头，PF队核心主C。',
            rarity: CharacterRarity.UR,
            element: ElementType.FIRE,
            characterClass: CharacterClass.WARRIOR,
            characterType: CharacterType.SWORDSMAN,
            characterRole: CharacterRole.PF_DPS,
            secondaryRoles: [CharacterRole.SHIELD_BREAK_UTIL],
            baseStats: {
                hp: 1400,
                attack: 210,
                defense: 85,
                speed: 110,
                critRate: 0.2,
                critDamage: 1.9,
                skillPower: 1.3
            },
            growthStats: {
                hp: 140,
                attack: 21,
                defense: 8,
                speed: 2,
                critRate: 0.006,
                critDamage: 0.028,
                skillPower: 0.03
            },
            skillSlots: {
                defaultSkillId: 'skill_flame_claw',
                leaderSkillId: 'leader_pf_damage',
                passiveSkillIds: ['passive_penetration'],
                extraSkillSlots: 3,
                learnableSkillIds: ['skill_flame_claw', 'skill_fire_blade', 'skill_pf_enhance']
            },
            passives: [
                { passiveId: 'passive_pf_damage_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_penetration', markType: PassiveMarkType.NONE, unlockLevel: 20, unlockStar: 1 },
                { passiveId: 'passive_combo_energy', markType: PassiveMarkType.NONE, unlockLevel: 40, unlockStar: 2 }
            ],
            bounceConfig: {
                bounceType: BounceType.SLASH,
                bounceForce: 920,
                colliderRadius: 35,
                penetration: true,
                multiHit: false
            },
            iconPath: 'textures/characters/fire_wolf_icon',
            spritePath: 'textures/characters/fire_wolf_sprite',
            bounceForce: 920,
            colliderRadius: 35,
            upgradeAdvice: {
                skillPriority: ['skill_flame_claw', 'passive_pf_damage_m'],
                weaponStats: ['PF伤害', '贯通', '攻击'],
                roleInTeam: 'PF队核心主C，触发39级PF'
            }
        });

        // 克拉莉丝 - 技伤队增伤
        this.addCharacter({
            id: 'char_fire_clarisse',
            name: '炼金术士',
            title: '克拉莉丝',
            description: '大爆炸减抗+消除强化，技伤队增伤关键角色。',
            rarity: CharacterRarity.SSR,
            element: ElementType.FIRE,
            characterClass: CharacterClass.MAGE,
            characterType: CharacterType.SHOOTER,
            characterRole: CharacterRole.DEBUFF_UTIL,
            secondaryRoles: [CharacterRole.ENERGY_SUPPORT],
            baseStats: {
                hp: 950,
                attack: 175,
                defense: 60,
                speed: 100,
                critRate: 0.15,
                critDamage: 1.7,
                skillPower: 1.4
            },
            growthStats: {
                hp: 95,
                attack: 17,
                defense: 6,
                speed: 2,
                critRate: 0.005,
                critDamage: 0.025,
                skillPower: 0.032
            },
            skillSlots: {
                defaultSkillId: 'skill_big_bang',
                leaderSkillId: 'leader_skill_damage',
                passiveSkillIds: ['passive_resist_reduction'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_big_bang', 'skill_dispel', 'skill_explosion']
            },
            passives: [
                { passiveId: 'passive_resist_reduction', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_kill_energy', markType: PassiveMarkType.NONE, unlockLevel: 25, unlockStar: 1 }
            ],
            bounceConfig: {
                bounceType: BounceType.PROJECTILE,
                bounceForce: 780,
                colliderRadius: 28,
                penetration: false,
                multiHit: false,
                projectileCount: 5,
                projectileSpread: 30
            },
            iconPath: 'textures/characters/fire_clarisse_icon',
            spritePath: 'textures/characters/fire_clarisse_sprite',
            bounceForce: 780,
            colliderRadius: 28
        });

        // ===== 水属性代表 =====
        
        // 舞娘 - 水队PF核心
        this.addCharacter({
            id: 'char_water_dancer',
            name: '水之舞姬',
            title: '舞娘',
            description: '水队剑PF核心，高连击触发PF，长局稳定输出。',
            rarity: CharacterRarity.SSR,
            element: ElementType.WATER,
            characterClass: CharacterClass.ASSASSIN,
            characterType: CharacterType.SWORDSMAN,
            characterRole: CharacterRole.PF_DPS,
            baseStats: {
                hp: 1050,
                attack: 165,
                defense: 70,
                speed: 120,
                critRate: 0.22,
                critDamage: 1.8,
                skillPower: 1.2
            },
            growthStats: {
                hp: 105,
                attack: 16,
                defense: 7,
                speed: 3,
                critRate: 0.007,
                critDamage: 0.027,
                skillPower: 0.028
            },
            skillSlots: {
                defaultSkillId: 'skill_aqua_dance',
                leaderSkillId: 'leader_water_pf',
                passiveSkillIds: ['passive_combo_boost'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_aqua_dance', 'skill_tidal_slash', 'skill_combo_finisher']
            },
            passives: [
                { passiveId: 'passive_pf_damage_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_combo_energy', markType: PassiveMarkType.NONE, unlockLevel: 20, unlockStar: 1 }
            ],
            bounceConfig: {
                bounceType: BounceType.SLASH,
                bounceForce: 880,
                colliderRadius: 30,
                penetration: true,
                multiHit: false
            },
            iconPath: 'textures/characters/water_dancer_icon',
            spritePath: 'textures/characters/water_dancer_sprite',
            bounceForce: 880,
            colliderRadius: 30
        });

        // 稻穗 - 冰冻控场
        this.addCharacter({
            id: 'char_water_inaho',
            name: '冰雪巫女',
            title: '稻穗',
            description: '冰冻控场，配合主C爆发，适合高难本。',
            rarity: CharacterRarity.SSR,
            element: ElementType.WATER,
            characterClass: CharacterClass.MAGE,
            characterType: CharacterType.SUPPORT,
            characterRole: CharacterRole.CONTROL_UTIL,
            baseStats: {
                hp: 900,
                attack: 145,
                defense: 65,
                speed: 95,
                critRate: 0.12,
                critDamage: 1.6,
                skillPower: 1.3
            },
            growthStats: {
                hp: 90,
                attack: 14,
                defense: 6,
                speed: 2,
                critRate: 0.004,
                critDamage: 0.022,
                skillPower: 0.03
            },
            skillSlots: {
                defaultSkillId: 'skill_ice_prison',
                leaderSkillId: 'leader_water_control',
                passiveSkillIds: ['passive_freeze'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_ice_prison', 'skill_blizzard', 'skill_freeze_field']
            },
            passives: [
                { passiveId: 'passive_freeze', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.FLOAT,
                bounceForce: 750,
                colliderRadius: 28,
                penetration: false,
                multiHit: false
            },
            iconPath: 'textures/characters/water_inaho_icon',
            spritePath: 'textures/characters/water_inaho_sprite',
            bounceForce: 750,
            colliderRadius: 28
        });

        // ===== 雷属性代表 =====
        
        // 雷狐 - 全屏麻痹
        this.addCharacter({
            id: 'char_thunder_fox',
            name: '雷霆狐仙',
            title: '雷狐',
            description: '全屏麻痹10秒，踢罐/高难控场必备。',
            rarity: CharacterRarity.SSR,
            element: ElementType.THUNDER,
            characterClass: CharacterClass.SUPPORT,
            characterType: CharacterType.SPECIAL,
            characterRole: CharacterRole.CONTROL_UTIL,
            baseStats: {
                hp: 950,
                attack: 140,
                defense: 70,
                speed: 105,
                critRate: 0.14,
                critDamage: 1.5,
                skillPower: 1.2
            },
            growthStats: {
                hp: 95,
                attack: 14,
                defense: 7,
                speed: 2,
                critRate: 0.004,
                critDamage: 0.02,
                skillPower: 0.028
            },
            skillSlots: {
                defaultSkillId: 'skill_thunder_field',
                leaderSkillId: 'leader_thunder_control',
                passiveSkillIds: ['passive_paralyze'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_thunder_field', 'skill_chain_lightning', 'skill_shock_wave']
            },
            passives: [
                { passiveId: 'passive_paralyze', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.SUMMON,
                bounceForce: 800,
                colliderRadius: 30,
                penetration: false,
                multiHit: false,
                summonType: 'thunder_orb'
            },
            iconPath: 'textures/characters/thunder_fox_icon',
            spritePath: 'textures/characters/thunder_fox_sprite',
            bounceForce: 800,
            colliderRadius: 30
        });

        // 雷弓 - Fever自充
        this.addCharacter({
            id: 'char_thunder_bow',
            name: '雷霆射手',
            title: '雷弓',
            description: 'Fever自充+攻刃，雷Fever队主C。',
            rarity: CharacterRarity.SSR,
            element: ElementType.THUNDER,
            characterClass: CharacterClass.ARCHER,
            characterType: CharacterType.SHOOTER,
            characterRole: CharacterRole.FEVER_DPS,
            secondaryRoles: [CharacterRole.ENERGY_SUPPORT],
            baseStats: {
                hp: 900,
                attack: 185,
                defense: 55,
                speed: 115,
                critRate: 0.2,
                critDamage: 1.85,
                skillPower: 1.25
            },
            growthStats: {
                hp: 90,
                attack: 18,
                defense: 5,
                speed: 3,
                critRate: 0.006,
                critDamage: 0.028,
                skillPower: 0.029
            },
            skillSlots: {
                defaultSkillId: 'skill_thunder_arrow',
                leaderSkillId: 'leader_fever_damage',
                passiveSkillIds: ['passive_fever_charge'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_thunder_arrow', 'skill_fever_shot', 'skill_chain_arrow']
            },
            passives: [
                { passiveId: 'passive_fever_damage', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_atk_blade_m', markType: PassiveMarkType.M_MARK, unlockLevel: 30, unlockStar: 2 }
            ],
            bounceConfig: {
                bounceType: BounceType.PROJECTILE,
                bounceForce: 850,
                colliderRadius: 26,
                penetration: false,
                multiHit: false,
                projectileCount: 3
            },
            iconPath: 'textures/characters/thunder_bow_icon',
            spritePath: 'textures/characters/thunder_bow_sprite',
            bounceForce: 850,
            colliderRadius: 26
        });

        // ===== 风属性代表 =====
        
        // 风gay - 开局充能
        this.addCharacter({
            id: 'char_wind_gay',
            name: '风之使者',
            title: '风gay',
            description: '开局风属性充能50%，提升参战者伤害，开罐必备。',
            rarity: CharacterRarity.SSR,
            element: ElementType.WIND,
            characterClass: CharacterClass.SUPPORT,
            characterType: CharacterType.SUPPORT,
            characterRole: CharacterRole.ENERGY_SUPPORT,
            secondaryRoles: [CharacterRole.BUFF_SUPPORT],
            baseStats: {
                hp: 1000,
                attack: 130,
                defense: 75,
                speed: 100,
                critRate: 0.1,
                critDamage: 1.4,
                skillPower: 1.2
            },
            growthStats: {
                hp: 100,
                attack: 13,
                defense: 7,
                speed: 2,
                critRate: 0.003,
                critDamage: 0.018,
                skillPower: 0.028
            },
            skillSlots: {
                defaultSkillId: 'skill_wind_blessing',
                leaderSkillId: 'leader_wind_energy',
                passiveSkillIds: ['passive_energy_start'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_wind_blessing', 'skill_party_buff', 'skill_energy_share']
            },
            passives: [
                { passiveId: 'passive_start_full_energy_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_final_damage_8', markType: PassiveMarkType.NONE, unlockLevel: 20, unlockStar: 1 }
            ],
            bounceConfig: {
                bounceType: BounceType.FLOAT,
                bounceForce: 780,
                colliderRadius: 28,
                penetration: false,
                multiHit: false
            },
            iconPath: 'textures/characters/wind_gay_icon',
            spritePath: 'textures/characters/wind_gay_sprite',
            bounceForce: 780,
            colliderRadius: 28,
            specialMechanics: {
                startFullEnergy: true
            }
        });

        // ===== 光属性代表 =====
        
        // 圣女（奥薇尔）- 技伤队队长
        this.addCharacter({
            id: 'char_light_saint',
            name: '圣光女王',
            title: '奥薇尔',
            description: '技伤队队长，技伤+120%，大招增伤，技伤流派核心。',
            rarity: CharacterRarity.UR,
            element: ElementType.LIGHT,
            characterClass: CharacterClass.MAGE,
            characterType: CharacterType.SUPPORT,
            characterRole: CharacterRole.SKILL_DPS,
            secondaryRoles: [CharacterRole.BUFF_SUPPORT],
            baseStats: {
                hp: 1150,
                attack: 195,
                defense: 70,
                speed: 100,
                critRate: 0.18,
                critDamage: 1.8,
                skillPower: 1.6
            },
            growthStats: {
                hp: 115,
                attack: 19,
                defense: 7,
                speed: 2,
                critRate: 0.005,
                critDamage: 0.026,
                skillPower: 0.038
            },
            skillSlots: {
                defaultSkillId: 'skill_holy_judgment',
                leaderSkillId: 'leader_skill_120',
                passiveSkillIds: ['passive_skill_damage_m'],
                extraSkillSlots: 3,
                learnableSkillIds: ['skill_holy_judgment', 'skill_divine_light', 'skill_blessing_aura']
            },
            passives: [
                { passiveId: 'passive_skill_damage_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_final_damage_8', markType: PassiveMarkType.NONE, unlockLevel: 25, unlockStar: 1 },
                { passiveId: 'passive_skill_damage_10', markType: PassiveMarkType.NONE, unlockLevel: 45, unlockStar: 3 }
            ],
            bounceConfig: {
                bounceType: BounceType.FLOAT,
                bounceForce: 800,
                colliderRadius: 30,
                penetration: false,
                multiHit: false
            },
            iconPath: 'textures/characters/light_saint_icon',
            spritePath: 'textures/characters/light_saint_sprite',
            bounceForce: 800,
            colliderRadius: 30,
            upgradeAdvice: {
                skillPriority: ['skill_holy_judgment', 'passive_skill_damage_m'],
                weaponStats: ['技伤', '终伤', '暴击伤害'],
                roleInTeam: '技伤队队长，核心输出'
            }
        });

        // 星奶 - 治疗+终伤
        this.addCharacter({
            id: 'char_light_star',
            name: '星光祭司',
            title: '星奶',
            description: '治疗+终伤增伤，兼顾续航与爆发。',
            rarity: CharacterRarity.SSR,
            element: ElementType.LIGHT,
            characterClass: CharacterClass.HEALER,
            characterType: CharacterType.SUPPORT,
            characterRole: CharacterRole.HEAL_SUPPORT,
            secondaryRoles: [CharacterRole.BUFF_SUPPORT],
            baseStats: {
                hp: 1100,
                attack: 120,
                defense: 80,
                speed: 95,
                critRate: 0.1,
                critDamage: 1.4,
                skillPower: 1.5
            },
            growthStats: {
                hp: 110,
                attack: 12,
                defense: 8,
                speed: 2,
                critRate: 0.003,
                critDamage: 0.018,
                skillPower: 0.035
            },
            skillSlots: {
                defaultSkillId: 'skill_star_heal',
                leaderSkillId: 'leader_heal_boost',
                passiveSkillIds: ['passive_regen'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_star_heal', 'skill_party_heal', 'skill_damage_boost']
            },
            passives: [
                { passiveId: 'passive_final_damage_8', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_regen', markType: PassiveMarkType.NONE, unlockLevel: 20, unlockStar: 1 }
            ],
            bounceConfig: {
                bounceType: BounceType.FLOAT,
                bounceForce: 760,
                colliderRadius: 28,
                penetration: false,
                multiHit: false
            },
            iconPath: 'textures/characters/light_star_icon',
            spritePath: 'textures/characters/light_star_sprite',
            bounceForce: 760,
            colliderRadius: 28
        });

        // ===== 暗属性代表 =====
        
        // 暗gay - 直击型
        this.addCharacter({
            id: 'char_dark_gay',
            name: '暗影剑客',
            title: '暗gay',
            description: '高频直击，长局稳定输出，适合无充能环境。',
            rarity: CharacterRarity.SSR,
            element: ElementType.DARK,
            characterClass: CharacterClass.ASSASSIN,
            characterType: CharacterType.FIGHTER,
            characterRole: CharacterRole.DIRECT_DPS,
            baseStats: {
                hp: 1000,
                attack: 180,
                defense: 65,
                speed: 125,
                critRate: 0.22,
                critDamage: 1.9,
                skillPower: 1.1
            },
            growthStats: {
                hp: 100,
                attack: 18,
                defense: 6,
                speed: 3,
                critRate: 0.007,
                critDamage: 0.028,
                skillPower: 0.025
            },
            skillSlots: {
                defaultSkillId: 'skill_shadow_strike',
                leaderSkillId: 'leader_direct_damage',
                passiveSkillIds: ['passive_multi_hit'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_shadow_strike', 'skill_rapid_slash', 'skill_dark_rush']
            },
            passives: [
                { passiveId: 'passive_atk_blade_m', markType: PassiveMarkType.M_MARK, unlockLevel: 1, unlockStar: 0 },
                { passiveId: 'passive_combo_energy', markType: PassiveMarkType.NONE, unlockLevel: 25, unlockStar: 1 }
            ],
            bounceConfig: {
                bounceType: BounceType.RUSH,
                bounceForce: 950,
                colliderRadius: 28,
                penetration: false,
                multiHit: true
            },
            iconPath: 'textures/characters/dark_gay_icon',
            spritePath: 'textures/characters/dark_gay_sprite',
            bounceForce: 950,
            colliderRadius: 28
        });

        // 面包人 - 协力球召唤
        this.addCharacter({
            id: 'char_special_bread',
            name: '面包精灵',
            title: '面包人',
            description: '协力球召唤专精，PF队核心辅助，每10连击召唤协力球。',
            rarity: CharacterRarity.SSR,
            element: ElementType.LIGHT,
            characterClass: CharacterClass.SUPPORT,
            characterType: CharacterType.SPECIAL,
            characterRole: CharacterRole.SPECIAL_FUNC,
            secondaryRoles: [CharacterRole.BUFF_SUPPORT],
            baseStats: {
                hp: 950,
                attack: 130,
                defense: 70,
                speed: 100,
                critRate: 0.12,
                critDamage: 1.5,
                skillPower: 1.2
            },
            growthStats: {
                hp: 95,
                attack: 13,
                defense: 7,
                speed: 2,
                critRate: 0.004,
                critDamage: 0.02,
                skillPower: 0.028
            },
            skillSlots: {
                defaultSkillId: 'skill_bread_summon',
                leaderSkillId: 'leader_coop_ball',
                passiveSkillIds: ['passive_summon_ball'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_bread_summon', 'skill_bread_rain', 'skill_combo_assist']
            },
            passives: [
                { passiveId: 'passive_summon_ball', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.SUMMON,
                bounceForce: 800,
                colliderRadius: 30,
                penetration: false,
                multiHit: false,
                summonType: 'bread_ball'
            },
            iconPath: 'textures/characters/bread_icon',
            spritePath: 'textures/characters/bread_sprite',
            bounceForce: 800,
            colliderRadius: 30,
            specialMechanics: {
                coopBallSummon: true
            }
        });

        // 不死王 - 复活加速
        this.addCharacter({
            id: 'char_special_undead',
            name: '不死之王',
            title: '不死王',
            description: '复活加速专精，队友复活所需撞击次数-2。',
            rarity: CharacterRarity.SSR,
            element: ElementType.DARK,
            characterClass: CharacterClass.SUPPORT,
            characterType: CharacterType.SPECIAL,
            characterRole: CharacterRole.SPECIAL_FUNC,
            secondaryRoles: [CharacterRole.HEAL_SUPPORT],
            baseStats: {
                hp: 1200,
                attack: 120,
                defense: 85,
                speed: 90,
                critRate: 0.1,
                critDamage: 1.4,
                skillPower: 1.1
            },
            growthStats: {
                hp: 120,
                attack: 12,
                defense: 8,
                speed: 2,
                critRate: 0.003,
                critDamage: 0.018,
                skillPower: 0.025
            },
            skillSlots: {
                defaultSkillId: 'skill_undead_blessing',
                leaderSkillId: 'leader_revive_boost',
                passiveSkillIds: ['passive_revive_speed'],
                extraSkillSlots: 2,
                learnableSkillIds: ['skill_undead_blessing', 'skill_soul_link', 'skill_death_ward']
            },
            passives: [
                { passiveId: 'passive_revive_speed', markType: PassiveMarkType.NONE, unlockLevel: 1, unlockStar: 0 }
            ],
            bounceConfig: {
                bounceType: BounceType.FLOAT,
                bounceForce: 780,
                colliderRadius: 32,
                penetration: false,
                multiHit: false
            },
            iconPath: 'textures/characters/undead_icon',
            spritePath: 'textures/characters/undead_sprite',
            bounceForce: 780,
            colliderRadius: 32,
            specialMechanics: {
                reviveBoost: true
            }
        });
    }

    /**
     * 添加角色配置
     */
    private addCharacter(config: CharacterConfig): void {
        this._characters.set(config.id, config);
    }

    /**
     * 获取角色配置
     */
    public getCharacter(id: string): CharacterConfig | undefined {
        return this._characters.get(id);
    }

    /**
     * 获取所有角色配置
     */
    public getAllCharacters(): CharacterConfig[] {
        return Array.from(this._characters.values());
    }

    /**
     * 根据稀有度筛选角色
     */
    public getCharactersByRarity(rarity: CharacterRarity): CharacterConfig[] {
        return this.getAllCharacters().filter(c => c.rarity === rarity);
    }

    /**
     * 根据元素筛选角色
     */
    public getCharactersByElement(element: ElementType): CharacterConfig[] {
        return this.getAllCharacters().filter(c => c.element === element);
    }

    /**
     * 根据职业筛选角色
     */
    public getCharactersByClass(charClass: CharacterClass): CharacterConfig[] {
        return this.getAllCharacters().filter(c => c.characterClass === charClass);
    }

    /**
     * 计算角色在指定等级的属性
     */
    public calculateStats(config: CharacterConfig, level: number, star: number = 0): CharacterStats {
        const starMultiplier = 1 + star * 0.1; // 每星+10%属性
        
        return {
            hp: Math.floor((config.baseStats.hp + config.growthStats.hp * (level - 1)) * starMultiplier),
            attack: Math.floor((config.baseStats.attack + config.growthStats.attack * (level - 1)) * starMultiplier),
            defense: Math.floor((config.baseStats.defense + config.growthStats.defense * (level - 1)) * starMultiplier),
            speed: Math.floor((config.baseStats.speed + config.growthStats.speed * (level - 1)) * starMultiplier),
            critRate: Math.min(1, config.baseStats.critRate + config.growthStats.critRate * (level - 1)),
            critDamage: config.baseStats.critDamage + config.growthStats.critDamage * (level - 1),
            skillPower: config.baseStats.skillPower + config.growthStats.skillPower * (level - 1)
        };
    }

    /**
     * 计算升级所需经验
     */
    public getExpRequired(level: number): number {
        return Math.floor(100 * Math.pow(1.15, level - 1));
    }

    /**
     * 获取角色的技能配置
     */
    public getCharacterSkills(configId: string): {
        defaultSkill: SkillConfig | undefined;
        leaderSkill: SkillConfig | undefined;
        passiveSkills: SkillConfig[];
        learnableSkills: SkillConfig[];
    } {
        const config = this._characters.get(configId);
        if (!config) {
            return {
                defaultSkill: undefined,
                leaderSkill: undefined,
                passiveSkills: [],
                learnableSkills: []
            };
        }

        const skillDb = SkillDatabase.instance;
        
        return {
            defaultSkill: skillDb.getSkill(config.skillSlots.defaultSkillId),
            leaderSkill: config.skillSlots.leaderSkillId 
                ? skillDb.getSkill(config.skillSlots.leaderSkillId) 
                : undefined,
            passiveSkills: (config.skillSlots.passiveSkillIds || [])
                .map(id => skillDb.getSkill(id))
                .filter((s): s is SkillConfig => s !== undefined),
            learnableSkills: config.skillSlots.learnableSkillIds
                .map(id => skillDb.getSkill(id))
                .filter((s): s is SkillConfig => s !== undefined)
        };
    }

    /**
     * 获取稀有度颜色
     */
    public getRarityColor(rarity: CharacterRarity): string {
        switch (rarity) {
            case CharacterRarity.N: return '#AAAAAA';
            case CharacterRarity.R: return '#55AA55';
            case CharacterRarity.SR: return '#5555FF';
            case CharacterRarity.SSR: return '#AA55AA';
            case CharacterRarity.UR: return '#FFAA00';
            default: return '#FFFFFF';
        }
    }

    /**
     * 获取稀有度名称
     */
    public getRarityName(rarity: CharacterRarity): string {
        switch (rarity) {
            case CharacterRarity.N: return 'N';
            case CharacterRarity.R: return 'R';
            case CharacterRarity.SR: return 'SR';
            case CharacterRarity.SSR: return 'SSR';
            case CharacterRarity.UR: return 'UR';
            default: return '?';
        }
    }

    /**
     * 获取元素颜色
     */
    public getElementColor(element: ElementType): string {
        switch (element) {
            case ElementType.FIRE: return '#FF5533';
            case ElementType.WATER: return '#3399FF';
            case ElementType.WIND: return '#33FF99';
            case ElementType.THUNDER: return '#FFFF33';
            case ElementType.LIGHT: return '#FFFFAA';
            case ElementType.DARK: return '#9933FF';
            default: return '#FFFFFF';
        }
    }

    /**
     * 获取元素名称
     */
    public getElementName(element: ElementType): string {
        switch (element) {
            case ElementType.FIRE: return '火';
            case ElementType.WATER: return '水';
            case ElementType.WIND: return '风';
            case ElementType.THUNDER: return '雷';
            case ElementType.LIGHT: return '光';
            case ElementType.DARK: return '暗';
            default: return '?';
        }
    }

    /**
     * 创建角色实例的默认数据
     */
    public createDefaultInstance(configId: string, uniqueId: string): CharacterInstance | null {
        const config = this._characters.get(configId);
        if (!config) return null;

        return {
            uniqueId: uniqueId,
            configId: configId,
            level: 1,
            exp: 0,
            star: 0,
            awakening: 0,
            equippedSkills: {
                activeSkillId: config.skillSlots.defaultSkillId,
                passiveSkillIds: [...(config.skillSlots.passiveSkillIds || [])]
            },
            skillLevels: {
                [config.skillSlots.defaultSkillId]: 1
            },
            learnedSkillIds: [config.skillSlots.defaultSkillId],
            equipmentSlots: {},
            affinity: 0,
            obtainedAt: Date.now(),
            isLocked: false
        };
    }
}
