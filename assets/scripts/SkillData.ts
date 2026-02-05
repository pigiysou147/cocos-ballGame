import { _decorator } from 'cc';

/**
 * 技能类型枚举
 */
export enum SkillType {
    ACTIVE = 'active',          // 主动技能
    PASSIVE = 'passive',        // 被动技能
    LEADER = 'leader',          // 队长技能
    ULTIMATE = 'ultimate'       // 必杀技
}

/**
 * 技能目标类型
 */
export enum SkillTargetType {
    SINGLE_ENEMY = 'single_enemy',      // 单体敌人
    ALL_ENEMIES = 'all_enemies',        // 全体敌人
    RANDOM_ENEMIES = 'random_enemies',  // 随机敌人
    SELF = 'self',                      // 自身
    SINGLE_ALLY = 'single_ally',        // 单体友方
    ALL_ALLIES = 'all_allies',          // 全体友方
    AREA = 'area'                       // 范围
}

/**
 * 技能效果类型
 */
export enum SkillEffectType {
    DAMAGE = 'damage',              // 伤害
    HEAL = 'heal',                  // 治疗
    SHIELD = 'shield',              // 护盾
    BUFF_ATK = 'buff_atk',          // 攻击加成
    BUFF_DEF = 'buff_def',          // 防御加成
    BUFF_SPD = 'buff_spd',          // 速度加成
    BUFF_CRIT = 'buff_crit',        // 暴击加成
    DEBUFF_ATK = 'debuff_atk',      // 攻击降低
    DEBUFF_DEF = 'debuff_def',      // 防御降低
    DEBUFF_SPD = 'debuff_spd',      // 速度降低
    DOT = 'dot',                    // 持续伤害
    HOT = 'hot',                    // 持续治疗
    STUN = 'stun',                  // 眩晕
    FREEZE = 'freeze',              // 冰冻
    BURN = 'burn',                  // 燃烧
    POISON = 'poison',              // 中毒
    PARALYZE = 'paralyze',          // 麻痹
    INVINCIBLE = 'invincible',      // 无敌
    REVIVE = 'revive',              // 复活
    ENERGY = 'energy',              // 能量恢复
    DISPEL = 'dispel',              // 驱散
    MULTI_HIT = 'multi_hit',        // 多段攻击
    PIERCE = 'pierce',              // 穿透攻击
    LIFESTEAL = 'lifesteal',        // 生命偷取
    REFLECT = 'reflect'             // 伤害反弹
}

/**
 * 技能效果数据
 */
export interface SkillEffect {
    type: SkillEffectType;
    value: number;              // 效果数值（百分比或固定值）
    duration?: number;          // 持续时间（秒）
    chance?: number;            // 触发概率（0-1）
    stackable?: boolean;        // 是否可叠加
    maxStacks?: number;         // 最大叠加层数
}

/**
 * 技能配置接口
 */
export interface SkillConfig {
    id: string;
    name: string;
    description: string;
    icon: string;               // 图标路径
    
    // 技能类型
    type: SkillType;
    
    // 目标类型
    targetType: SkillTargetType;
    
    // 基础属性
    baseCooldown: number;       // 基础冷却时间
    baseEnergyCost: number;     // 基础能量消耗
    baseDamageMultiplier: number;  // 基础伤害倍率
    
    // 成长属性（每级提升）
    cooldownReduction: number;  // 每级冷却缩减
    damageGrowth: number;       // 每级伤害增长
    
    // 技能效果列表
    effects: SkillEffect[];
    
    // 额外属性
    hitCount?: number;          // 攻击次数
    range?: number;             // 攻击范围
    projectileSpeed?: number;   // 弹道速度
    
    // 元素属性（可选，用于元素反应）
    element?: string;
    
    // 解锁条件
    unlockLevel?: number;       // 解锁等级
    unlockStar?: number;        // 解锁星级
    
    // 技能标签（用于筛选）
    tags: string[];
}

/**
 * 技能实例（玩家拥有的技能，可升级）
 */
export interface SkillInstance {
    skillId: string;            // 技能配置ID
    level: number;              // 技能等级
    exp: number;                // 技能经验
}

/**
 * 技能数据库 - 独立的技能池
 */
export class SkillDatabase {
    private static _instance: SkillDatabase | null = null;
    private _skills: Map<string, SkillConfig> = new Map();

    public static get instance(): SkillDatabase {
        if (!SkillDatabase._instance) {
            SkillDatabase._instance = new SkillDatabase();
            SkillDatabase._instance.initDatabase();
        }
        return SkillDatabase._instance;
    }

    /**
     * 初始化技能数据库
     */
    private initDatabase(): void {
        // ==================== 主动技能 ====================
        
        // 火系技能
        this.addSkill({
            id: 'skill_fire_blade',
            name: '烈焰斩',
            description: '挥出带有烈焰的斩击，对敌人造成火属性伤害，有概率附加燃烧效果',
            icon: 'textures/skills/fire_blade',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ENEMIES,
            baseCooldown: 8,
            baseEnergyCost: 100,
            baseDamageMultiplier: 3.5,
            cooldownReduction: 0.1,
            damageGrowth: 0.2,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 },
                { type: SkillEffectType.BURN, value: 0.1, duration: 3, chance: 0.5 }
            ],
            element: 'fire',
            tags: ['fire', 'damage', 'aoe', 'dot']
        });

        this.addSkill({
            id: 'skill_meteor',
            name: '陨石冲击',
            description: '召唤巨大陨石从天而降，对所有敌人造成大范围火属性伤害',
            icon: 'textures/skills/meteor',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ENEMIES,
            baseCooldown: 12,
            baseEnergyCost: 100,
            baseDamageMultiplier: 5.0,
            cooldownReduction: 0.15,
            damageGrowth: 0.3,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 },
                { type: SkillEffectType.STUN, value: 0, duration: 1, chance: 0.3 }
            ],
            element: 'fire',
            range: 200,
            tags: ['fire', 'damage', 'aoe', 'cc']
        });

        this.addSkill({
            id: 'skill_inferno',
            name: '地狱火焰',
            description: '在地面召唤火焰，造成持续燃烧伤害',
            icon: 'textures/skills/inferno',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.AREA,
            baseCooldown: 10,
            baseEnergyCost: 80,
            baseDamageMultiplier: 2.0,
            cooldownReduction: 0.1,
            damageGrowth: 0.15,
            effects: [
                { type: SkillEffectType.DOT, value: 0.5, duration: 5 }
            ],
            element: 'fire',
            range: 150,
            tags: ['fire', 'damage', 'dot', 'area']
        });

        // 水系技能
        this.addSkill({
            id: 'skill_heal_wave',
            name: '治愈波涛',
            description: '释放治愈之水，恢复全体队友的生命值',
            icon: 'textures/skills/heal_wave',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 10,
            baseEnergyCost: 100,
            baseDamageMultiplier: 0,
            cooldownReduction: 0.12,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.HEAL, value: 0.3 }
            ],
            element: 'water',
            tags: ['water', 'heal', 'support']
        });

        this.addSkill({
            id: 'skill_ice_shield',
            name: '冰霜护盾',
            description: '生成冰霜护盾保护自己，并冻结周围敌人',
            icon: 'textures/skills/ice_shield',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.SELF,
            baseCooldown: 8,
            baseEnergyCost: 80,
            baseDamageMultiplier: 1.5,
            cooldownReduction: 0.1,
            damageGrowth: 0.1,
            effects: [
                { type: SkillEffectType.SHIELD, value: 0.2, duration: 5 },
                { type: SkillEffectType.FREEZE, value: 0, duration: 2, chance: 0.6 }
            ],
            element: 'water',
            range: 100,
            tags: ['water', 'defense', 'cc', 'shield']
        });

        this.addSkill({
            id: 'skill_tidal_wave',
            name: '潮汐冲击',
            description: '召唤巨浪冲击敌人，造成伤害并降低敌人速度',
            icon: 'textures/skills/tidal_wave',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ENEMIES,
            baseCooldown: 9,
            baseEnergyCost: 90,
            baseDamageMultiplier: 3.0,
            cooldownReduction: 0.1,
            damageGrowth: 0.2,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 },
                { type: SkillEffectType.DEBUFF_SPD, value: 0.3, duration: 4 }
            ],
            element: 'water',
            tags: ['water', 'damage', 'debuff', 'aoe']
        });

        // 风系技能
        this.addSkill({
            id: 'skill_wind_slash',
            name: '暴风乱舞',
            description: '以疾风般的速度进行多次斩击，对单体敌人造成大量伤害',
            icon: 'textures/skills/wind_slash',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.SINGLE_ENEMY,
            baseCooldown: 6,
            baseEnergyCost: 80,
            baseDamageMultiplier: 4.0,
            cooldownReduction: 0.08,
            damageGrowth: 0.25,
            effects: [
                { type: SkillEffectType.MULTI_HIT, value: 5 },
                { type: SkillEffectType.DAMAGE, value: 0.8 }
            ],
            hitCount: 5,
            element: 'wind',
            tags: ['wind', 'damage', 'single', 'multi-hit']
        });

        this.addSkill({
            id: 'skill_piercing_arrow',
            name: '贯穿射击',
            description: '射出穿透敌人的箭矢，可命中多个目标',
            icon: 'textures/skills/piercing_arrow',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ENEMIES,
            baseCooldown: 7,
            baseEnergyCost: 70,
            baseDamageMultiplier: 2.5,
            cooldownReduction: 0.08,
            damageGrowth: 0.18,
            effects: [
                { type: SkillEffectType.PIERCE, value: 3 },
                { type: SkillEffectType.DAMAGE, value: 1.0 }
            ],
            element: 'wind',
            tags: ['wind', 'damage', 'pierce']
        });

        this.addSkill({
            id: 'skill_speed_boost',
            name: '疾风加速',
            description: '借助风之力提升队伍移动和攻击速度',
            icon: 'textures/skills/speed_boost',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 12,
            baseEnergyCost: 60,
            baseDamageMultiplier: 0,
            cooldownReduction: 0.1,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.BUFF_SPD, value: 0.4, duration: 8 }
            ],
            element: 'wind',
            tags: ['wind', 'buff', 'support']
        });

        // 雷系技能
        this.addSkill({
            id: 'skill_thunder_god',
            name: '雷神降临',
            description: '召唤天雷轰击所有敌人，有概率使敌人麻痹',
            icon: 'textures/skills/thunder_god',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ENEMIES,
            baseCooldown: 10,
            baseEnergyCost: 100,
            baseDamageMultiplier: 4.5,
            cooldownReduction: 0.12,
            damageGrowth: 0.28,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 },
                { type: SkillEffectType.PARALYZE, value: 0, duration: 2, chance: 0.4 }
            ],
            element: 'thunder',
            tags: ['thunder', 'damage', 'aoe', 'cc']
        });

        this.addSkill({
            id: 'skill_chain_lightning',
            name: '连锁闪电',
            description: '释放在敌人间跳跃的闪电，每次跳跃造成递减伤害',
            icon: 'textures/skills/chain_lightning',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.RANDOM_ENEMIES,
            baseCooldown: 7,
            baseEnergyCost: 75,
            baseDamageMultiplier: 2.8,
            cooldownReduction: 0.08,
            damageGrowth: 0.2,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 },
                { type: SkillEffectType.MULTI_HIT, value: 4 }
            ],
            hitCount: 4,
            element: 'thunder',
            tags: ['thunder', 'damage', 'chain']
        });

        // 光系技能
        this.addSkill({
            id: 'skill_holy_light',
            name: '圣光审判',
            description: '释放圣光净化敌人，同时为队友提供攻击加成',
            icon: 'textures/skills/holy_light',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ENEMIES,
            baseCooldown: 9,
            baseEnergyCost: 90,
            baseDamageMultiplier: 3.0,
            cooldownReduction: 0.1,
            damageGrowth: 0.2,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 },
                { type: SkillEffectType.BUFF_ATK, value: 0.2, duration: 6 }
            ],
            element: 'light',
            tags: ['light', 'damage', 'buff', 'support']
        });

        this.addSkill({
            id: 'skill_divine_blessing',
            name: '神圣祝福',
            description: '赐予队友神圣祝福，恢复生命并提供短暂无敌',
            icon: 'textures/skills/divine_blessing',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 15,
            baseEnergyCost: 100,
            baseDamageMultiplier: 0,
            cooldownReduction: 0.15,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.HEAL, value: 0.25 },
                { type: SkillEffectType.INVINCIBLE, value: 0, duration: 2 }
            ],
            element: 'light',
            tags: ['light', 'heal', 'support', 'invincible']
        });

        // 暗系技能
        this.addSkill({
            id: 'skill_dark_void',
            name: '虚空吞噬',
            description: '创造黑洞吞噬敌人，造成持续伤害',
            icon: 'textures/skills/dark_void',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ENEMIES,
            baseCooldown: 12,
            baseEnergyCost: 100,
            baseDamageMultiplier: 5.5,
            cooldownReduction: 0.12,
            damageGrowth: 0.32,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 0.7 },
                { type: SkillEffectType.DOT, value: 0.15, duration: 4 }
            ],
            element: 'dark',
            tags: ['dark', 'damage', 'dot', 'aoe']
        });

        this.addSkill({
            id: 'skill_life_drain',
            name: '生命汲取',
            description: '吸取敌人生命力，对敌人造成伤害并恢复自身',
            icon: 'textures/skills/life_drain',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.SINGLE_ENEMY,
            baseCooldown: 8,
            baseEnergyCost: 70,
            baseDamageMultiplier: 3.2,
            cooldownReduction: 0.08,
            damageGrowth: 0.22,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 },
                { type: SkillEffectType.LIFESTEAL, value: 0.5 }
            ],
            element: 'dark',
            tags: ['dark', 'damage', 'lifesteal', 'single']
        });

        this.addSkill({
            id: 'skill_curse',
            name: '黑暗诅咒',
            description: '对敌人施加诅咒，降低攻防并造成持续伤害',
            icon: 'textures/skills/curse',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.ALL_ENEMIES,
            baseCooldown: 10,
            baseEnergyCost: 85,
            baseDamageMultiplier: 1.5,
            cooldownReduction: 0.1,
            damageGrowth: 0.1,
            effects: [
                { type: SkillEffectType.DEBUFF_ATK, value: 0.25, duration: 6 },
                { type: SkillEffectType.DEBUFF_DEF, value: 0.25, duration: 6 },
                { type: SkillEffectType.POISON, value: 0.08, duration: 6 }
            ],
            element: 'dark',
            tags: ['dark', 'debuff', 'dot', 'aoe']
        });

        // 通用技能
        this.addSkill({
            id: 'skill_basic_slash',
            name: '基础斩击',
            description: '对敌人进行一次普通斩击',
            icon: 'textures/skills/basic_slash',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.SINGLE_ENEMY,
            baseCooldown: 5,
            baseEnergyCost: 60,
            baseDamageMultiplier: 2.0,
            cooldownReduction: 0.05,
            damageGrowth: 0.12,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 }
            ],
            tags: ['basic', 'damage', 'single']
        });

        this.addSkill({
            id: 'skill_power_strike',
            name: '蓄力一击',
            description: '蓄力后发动强力攻击，伤害提高但冷却较长',
            icon: 'textures/skills/power_strike',
            type: SkillType.ACTIVE,
            targetType: SkillTargetType.SINGLE_ENEMY,
            baseCooldown: 10,
            baseEnergyCost: 100,
            baseDamageMultiplier: 6.0,
            cooldownReduction: 0.1,
            damageGrowth: 0.35,
            effects: [
                { type: SkillEffectType.DAMAGE, value: 1.0 },
                { type: SkillEffectType.BUFF_CRIT, value: 0.5, duration: 0 }  // 本次攻击暴击率提升
            ],
            tags: ['damage', 'single', 'burst']
        });

        // ==================== 队长技能 ====================
        
        this.addSkill({
            id: 'leader_fire_atk',
            name: '火焰之力',
            description: '队伍中火属性角色攻击力+30%',
            icon: 'textures/skills/leader_fire',
            type: SkillType.LEADER,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.BUFF_ATK, value: 0.3 }
            ],
            element: 'fire',
            tags: ['leader', 'fire', 'buff']
        });

        this.addSkill({
            id: 'leader_water_hp',
            name: '海洋庇护',
            description: '队伍中水属性角色生命值+35%',
            icon: 'textures/skills/leader_water',
            type: SkillType.LEADER,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.SHIELD, value: 0.35 }  // 用SHIELD表示HP加成
            ],
            element: 'water',
            tags: ['leader', 'water', 'hp']
        });

        this.addSkill({
            id: 'leader_wind_speed',
            name: '疾风迅雷',
            description: '队伍中风属性角色速度+40%',
            icon: 'textures/skills/leader_wind',
            type: SkillType.LEADER,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.BUFF_SPD, value: 0.4 }
            ],
            element: 'wind',
            tags: ['leader', 'wind', 'speed']
        });

        this.addSkill({
            id: 'leader_thunder_crit',
            name: '雷霆之怒',
            description: '队伍所有角色暴击伤害+50%',
            icon: 'textures/skills/leader_thunder',
            type: SkillType.LEADER,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.BUFF_CRIT, value: 0.5 }
            ],
            element: 'thunder',
            tags: ['leader', 'thunder', 'crit']
        });

        this.addSkill({
            id: 'leader_light_def',
            name: '圣光护佑',
            description: '队伍所有角色防御力+25%',
            icon: 'textures/skills/leader_light',
            type: SkillType.LEADER,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.BUFF_DEF, value: 0.25 }
            ],
            element: 'light',
            tags: ['leader', 'light', 'defense']
        });

        this.addSkill({
            id: 'leader_dark_power',
            name: '黑暗支配',
            description: '队伍所有角色技能伤害+40%',
            icon: 'textures/skills/leader_dark',
            type: SkillType.LEADER,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.BUFF_ATK, value: 0.4 }  // 技能伤害加成
            ],
            element: 'dark',
            tags: ['leader', 'dark', 'skill']
        });

        this.addSkill({
            id: 'leader_all_atk',
            name: '全员强化',
            description: '队伍所有角色攻击力+20%',
            icon: 'textures/skills/leader_all',
            type: SkillType.LEADER,
            targetType: SkillTargetType.ALL_ALLIES,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.BUFF_ATK, value: 0.2 }
            ],
            tags: ['leader', 'all', 'atk']
        });

        // ==================== 被动技能 ====================

        this.addSkill({
            id: 'passive_crit_up',
            name: '致命打击',
            description: '暴击率提升15%',
            icon: 'textures/skills/passive_crit',
            type: SkillType.PASSIVE,
            targetType: SkillTargetType.SELF,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.BUFF_CRIT, value: 0.15 }
            ],
            tags: ['passive', 'crit']
        });

        this.addSkill({
            id: 'passive_lifesteal',
            name: '生命汲取',
            description: '攻击时恢复造成伤害15%的生命值',
            icon: 'textures/skills/passive_lifesteal',
            type: SkillType.PASSIVE,
            targetType: SkillTargetType.SELF,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.LIFESTEAL, value: 0.15 }
            ],
            tags: ['passive', 'lifesteal']
        });

        this.addSkill({
            id: 'passive_shield',
            name: '坚韧护盾',
            description: '战斗开始时获得最大生命值20%的护盾',
            icon: 'textures/skills/passive_shield',
            type: SkillType.PASSIVE,
            targetType: SkillTargetType.SELF,
            baseCooldown: 0,
            baseEnergyCost: 0,
            baseDamageMultiplier: 0,
            cooldownReduction: 0,
            damageGrowth: 0,
            effects: [
                { type: SkillEffectType.SHIELD, value: 0.2 }
            ],
            tags: ['passive', 'shield', 'defense']
        });

        console.log(`技能数据库初始化完成，共 ${this._skills.size} 个技能`);
    }

    /**
     * 添加技能
     */
    private addSkill(config: SkillConfig): void {
        this._skills.set(config.id, config);
    }

    /**
     * 获取技能配置
     */
    public getSkill(id: string): SkillConfig | undefined {
        return this._skills.get(id);
    }

    /**
     * 获取所有技能
     */
    public getAllSkills(): SkillConfig[] {
        return Array.from(this._skills.values());
    }

    /**
     * 根据类型筛选技能
     */
    public getSkillsByType(type: SkillType): SkillConfig[] {
        return this.getAllSkills().filter(s => s.type === type);
    }

    /**
     * 根据元素筛选技能
     */
    public getSkillsByElement(element: string): SkillConfig[] {
        return this.getAllSkills().filter(s => s.element === element);
    }

    /**
     * 根据标签筛选技能
     */
    public getSkillsByTag(tag: string): SkillConfig[] {
        return this.getAllSkills().filter(s => s.tags.includes(tag));
    }

    /**
     * 计算技能在指定等级的实际数值
     */
    public calculateSkillStats(skillId: string, level: number): {
        cooldown: number;
        damage: number;
        energyCost: number;
    } | null {
        const skill = this._skills.get(skillId);
        if (!skill) return null;

        return {
            cooldown: Math.max(1, skill.baseCooldown - skill.cooldownReduction * (level - 1)),
            damage: skill.baseDamageMultiplier + skill.damageGrowth * (level - 1),
            energyCost: skill.baseEnergyCost
        };
    }

    /**
     * 获取技能升级所需经验
     */
    public getSkillExpRequired(level: number): number {
        return Math.floor(50 * Math.pow(1.2, level - 1));
    }
}
