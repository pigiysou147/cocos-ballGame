import { _decorator } from 'cc';
import { ElementType } from './CharacterData';
import { RewardType, RewardData } from './LevelData';

/**
 * 怪物类型枚举
 */
export enum MonsterType {
    NORMAL = 'normal',          // 普通怪物
    ELITE = 'elite',            // 精英怪物
    MINI_BOSS = 'mini_boss',    // 小Boss
    BOSS = 'boss',              // Boss
    WORLD_BOSS = 'world_boss'   // 世界Boss
}

/**
 * 怪物种族枚举
 */
export enum MonsterRace {
    SLIME = 'slime',            // 史莱姆
    BEAST = 'beast',            // 野兽
    UNDEAD = 'undead',          // 亡灵
    DEMON = 'demon',            // 恶魔
    DRAGON = 'dragon',          // 龙族
    ELEMENTAL = 'elemental',    // 元素生物
    HUMANOID = 'humanoid',      // 人形
    MECHANICAL = 'mechanical',  // 机械
    PLANT = 'plant',            // 植物
    INSECT = 'insect'           // 虫类
}

/**
 * 怪物体型枚举
 */
export enum MonsterSize {
    TINY = 'tiny',              // 微小
    SMALL = 'small',            // 小型
    MEDIUM = 'medium',          // 中型
    LARGE = 'large',            // 大型
    HUGE = 'huge',              // 巨大
    COLOSSAL = 'colossal'       // 超巨型
}

/**
 * AI行为类型
 */
export enum AIBehaviorType {
    PASSIVE = 'passive',        // 被动（不主动攻击）
    AGGRESSIVE = 'aggressive',  // 主动攻击
    DEFENSIVE = 'defensive',    // 防御型
    SUPPORT = 'support',        // 辅助型
    BERSERKER = 'berserker',    // 狂暴型
    TACTICAL = 'tactical'       // 战术型
}

/**
 * 移动模式
 */
export enum MovementPattern {
    STATIC = 'static',          // 静止
    PATROL = 'patrol',          // 巡逻
    CHASE = 'chase',            // 追击
    FLEE = 'flee',              // 逃跑
    CIRCLE = 'circle',          // 绕圈
    RANDOM = 'random',          // 随机移动
    TELEPORT = 'teleport'       // 瞬移
}

/**
 * 攻击模式
 */
export enum AttackPattern {
    MELEE = 'melee',            // 近战
    RANGED = 'ranged',          // 远程
    AOE = 'aoe',                // 范围攻击
    CHARGE = 'charge',          // 冲锋
    SUMMON = 'summon',          // 召唤
    BUFF = 'buff',              // 增益
    DEBUFF = 'debuff'           // 减益
}

/**
 * 怪物技能配置
 */
export interface MonsterSkillConfig {
    id: string;
    name: string;
    description: string;
    
    // 技能属性
    type: AttackPattern;
    element?: ElementType;
    
    // 数值
    damage?: number;            // 伤害值
    damagePercent?: number;     // 百分比伤害
    healPercent?: number;       // 治疗百分比
    
    // 效果
    effects?: MonsterSkillEffect[];
    
    // 时间
    cooldown: number;           // 冷却时间
    castTime: number;           // 施法时间
    duration?: number;          // 持续时间
    
    // 范围
    range: number;              // 攻击范围
    aoeRadius?: number;         // AOE半径
    
    // 触发条件
    triggerCondition?: {
        type: 'hp_below' | 'hp_above' | 'time' | 'player_count' | 'random';
        value: number;
    };
    
    // 优先级
    priority: number;
}

/**
 * 怪物技能效果
 */
export interface MonsterSkillEffect {
    type: 'damage' | 'dot' | 'slow' | 'stun' | 'knockback' | 'pull' | 'heal' | 'shield' | 'buff' | 'debuff' | 'summon';
    value: number;
    duration?: number;
    chance?: number;            // 触发概率
    target?: 'self' | 'player' | 'all_players' | 'ally' | 'all_allies';
}

/**
 * 怪物弱点配置
 */
export interface WeaknessConfig {
    element?: ElementType;      // 元素弱点
    bodyPart?: string;          // 部位弱点
    damageMultiplier: number;   // 伤害倍率
    stunChance?: number;        // 眩晕概率
}

/**
 * 怪物抗性配置
 */
export interface ResistanceConfig {
    element?: ElementType;
    type?: 'physical' | 'magical';
    reduction: number;          // 伤害减免百分比 (0-100)
}

/**
 * 掉落物配置
 */
export interface DropConfig {
    type: RewardType;
    itemId?: string;
    minAmount: number;
    maxAmount: number;
    chance: number;             // 掉落概率 (0-1)
    condition?: {
        type: 'first_kill' | 'combo' | 'no_damage' | 'time_limit';
        value?: number;
    };
}

/**
 * 怪物基础属性
 */
export interface MonsterStats {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    critRate: number;
    critDamage: number;
}

/**
 * 怪物配置
 */
export interface MonsterConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    
    // 分类
    type: MonsterType;
    race: MonsterRace;
    size: MonsterSize;
    element: ElementType;
    
    // 基础属性
    baseStats: MonsterStats;
    level: number;
    
    // 等级成长系数
    levelGrowth: {
        hp: number;
        attack: number;
        defense: number;
    };
    
    // AI配置
    aiBehavior: AIBehaviorType;
    movementPattern: MovementPattern;
    attackPattern: AttackPattern;
    
    // 技能
    skills: MonsterSkillConfig[];
    
    // 弱点和抗性
    weaknesses: WeaknessConfig[];
    resistances: ResistanceConfig[];
    
    // 碰撞配置
    collider: {
        type: 'circle' | 'box';
        radius?: number;
        width?: number;
        height?: number;
    };
    bounceForce: number;
    
    // 奖励配置
    expReward: number;
    scoreReward: number;
    energyReward: number;
    drops: DropConfig[];
    
    // 视觉效果
    scale: number;
    tint?: string;              // 颜色叠加
    
    // 特殊标签
    tags: string[];
}

/**
 * 怪物实例数据（运行时）
 */
export interface MonsterInstance {
    uniqueId: string;
    configId: string;
    
    // 当前状态
    currentHP: number;
    maxHP: number;
    currentShield: number;
    
    // 属性（含等级加成）
    stats: MonsterStats;
    level: number;
    
    // 状态效果
    buffs: ActiveEffect[];
    debuffs: ActiveEffect[];
    
    // 技能冷却
    skillCooldowns: Map<string, number>;
    
    // 战斗状态
    isEnraged: boolean;
    isStunned: boolean;
    stunDuration: number;
    
    // 仇恨目标
    targetId: string | null;
    aggroList: Map<string, number>;
}

/**
 * 活跃效果
 */
export interface ActiveEffect {
    id: string;
    name: string;
    type: string;
    value: number;
    duration: number;
    remainingTime: number;
    stackCount: number;
}

/**
 * 怪物数据库
 */
export class MonsterDatabase {
    private static _instance: MonsterDatabase | null = null;
    private _monsters: Map<string, MonsterConfig> = new Map();
    private _monstersByType: Map<MonsterType, string[]> = new Map();
    private _monstersByRace: Map<MonsterRace, string[]> = new Map();
    private _monstersByElement: Map<ElementType, string[]> = new Map();

    public static get instance(): MonsterDatabase {
        if (!MonsterDatabase._instance) {
            MonsterDatabase._instance = new MonsterDatabase();
            MonsterDatabase._instance.initDatabase();
        }
        return MonsterDatabase._instance;
    }

    private initDatabase(): void {
        this.initMonsters();
        this.buildIndexes();
        console.log(`怪物数据库初始化完成，共 ${this._monsters.size} 种怪物`);
    }

    private buildIndexes(): void {
        // 构建类型索引
        for (const type of Object.values(MonsterType)) {
            this._monstersByType.set(type, []);
        }
        // 构建种族索引
        for (const race of Object.values(MonsterRace)) {
            this._monstersByRace.set(race, []);
        }
        // 构建元素索引
        for (const element of Object.values(ElementType)) {
            this._monstersByElement.set(element, []);
        }

        // 填充索引
        this._monsters.forEach((monster, id) => {
            this._monstersByType.get(monster.type)?.push(id);
            this._monstersByRace.get(monster.race)?.push(id);
            this._monstersByElement.get(monster.element)?.push(id);
        });
    }

    private initMonsters(): void {
        // ========== 史莱姆系列 ==========
        this.addMonster({
            id: 'slime_green',
            name: '绿色史莱姆',
            description: '最常见的史莱姆，软软的很可爱',
            icon: 'textures/monsters/slime_green',
            type: MonsterType.NORMAL,
            race: MonsterRace.SLIME,
            size: MonsterSize.SMALL,
            element: ElementType.WIND,
            baseStats: { hp: 100, attack: 10, defense: 5, speed: 2, critRate: 0.05, critDamage: 1.5 },
            level: 1,
            levelGrowth: { hp: 20, attack: 2, defense: 1 },
            aiBehavior: AIBehaviorType.PASSIVE,
            movementPattern: MovementPattern.RANDOM,
            attackPattern: AttackPattern.MELEE,
            skills: [
                {
                    id: 'slime_bounce',
                    name: '弹跳',
                    description: '向玩家弹跳攻击',
                    type: AttackPattern.MELEE,
                    damage: 15,
                    cooldown: 3,
                    castTime: 0.5,
                    range: 50,
                    priority: 1
                }
            ],
            weaknesses: [{ element: ElementType.FIRE, damageMultiplier: 1.5 }],
            resistances: [{ element: ElementType.WATER, reduction: 30 }],
            collider: { type: 'circle', radius: 25 },
            bounceForce: 300,
            expReward: 10,
            scoreReward: 50,
            energyReward: 5,
            drops: [
                { type: RewardType.GOLD, minAmount: 10, maxAmount: 30, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_slime_jelly', minAmount: 1, maxAmount: 1, chance: 0.3 }
            ],
            scale: 1.0,
            tags: ['slime', 'weak']
        });

        this.addMonster({
            id: 'slime_fire',
            name: '火焰史莱姆',
            description: '燃烧着火焰的史莱姆，小心被烫伤',
            icon: 'textures/monsters/slime_fire',
            type: MonsterType.NORMAL,
            race: MonsterRace.SLIME,
            size: MonsterSize.SMALL,
            element: ElementType.FIRE,
            baseStats: { hp: 80, attack: 15, defense: 3, speed: 3, critRate: 0.08, critDamage: 1.5 },
            level: 5,
            levelGrowth: { hp: 18, attack: 3, defense: 0.5 },
            aiBehavior: AIBehaviorType.AGGRESSIVE,
            movementPattern: MovementPattern.CHASE,
            attackPattern: AttackPattern.MELEE,
            skills: [
                {
                    id: 'fire_slime_burn',
                    name: '灼烧',
                    description: '攻击附带燃烧效果',
                    type: AttackPattern.MELEE,
                    damage: 20,
                    cooldown: 4,
                    castTime: 0.3,
                    range: 50,
                    priority: 1,
                    effects: [{ type: 'dot', value: 5, duration: 3, chance: 0.5, target: 'player' }]
                }
            ],
            weaknesses: [{ element: ElementType.WATER, damageMultiplier: 2.0 }],
            resistances: [{ element: ElementType.FIRE, reduction: 50 }],
            collider: { type: 'circle', radius: 25 },
            bounceForce: 350,
            expReward: 15,
            scoreReward: 80,
            energyReward: 8,
            drops: [
                { type: RewardType.GOLD, minAmount: 20, maxAmount: 50, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_fire_essence', minAmount: 1, maxAmount: 1, chance: 0.2 }
            ],
            scale: 1.0,
            tint: '#FF6600',
            tags: ['slime', 'fire', 'dot']
        });

        this.addMonster({
            id: 'slime_king',
            name: '史莱姆王',
            description: '史莱姆中的王者，巨大而强力',
            icon: 'textures/monsters/slime_king',
            type: MonsterType.ELITE,
            race: MonsterRace.SLIME,
            size: MonsterSize.LARGE,
            element: ElementType.WIND,
            baseStats: { hp: 500, attack: 30, defense: 15, speed: 1.5, critRate: 0.1, critDamage: 1.8 },
            level: 10,
            levelGrowth: { hp: 50, attack: 5, defense: 2 },
            aiBehavior: AIBehaviorType.AGGRESSIVE,
            movementPattern: MovementPattern.CHASE,
            attackPattern: AttackPattern.AOE,
            skills: [
                {
                    id: 'slime_king_slam',
                    name: '重压',
                    description: '跳起后重重砸下',
                    type: AttackPattern.AOE,
                    damage: 50,
                    cooldown: 8,
                    castTime: 1.5,
                    range: 100,
                    aoeRadius: 80,
                    priority: 2,
                    effects: [{ type: 'stun', value: 1, duration: 1.5, chance: 0.3, target: 'all_players' }]
                },
                {
                    id: 'slime_king_split',
                    name: '分裂',
                    description: '分裂出小史莱姆',
                    type: AttackPattern.SUMMON,
                    cooldown: 15,
                    castTime: 1,
                    range: 0,
                    priority: 1,
                    triggerCondition: { type: 'hp_below', value: 50 }
                }
            ],
            weaknesses: [{ element: ElementType.FIRE, damageMultiplier: 1.5 }],
            resistances: [{ element: ElementType.WATER, reduction: 40 }, { type: 'physical', reduction: 20 }],
            collider: { type: 'circle', radius: 50 },
            bounceForce: 500,
            expReward: 100,
            scoreReward: 500,
            energyReward: 30,
            drops: [
                { type: RewardType.GOLD, minAmount: 100, maxAmount: 300, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_slime_crown', minAmount: 1, maxAmount: 1, chance: 0.5 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_slime_ring', minAmount: 1, maxAmount: 1, chance: 0.1 }
            ],
            scale: 2.0,
            tags: ['slime', 'elite', 'summon']
        });

        // ========== 野兽系列 ==========
        this.addMonster({
            id: 'wolf_grey',
            name: '灰狼',
            description: '敏捷的草原猎手',
            icon: 'textures/monsters/wolf_grey',
            type: MonsterType.NORMAL,
            race: MonsterRace.BEAST,
            size: MonsterSize.MEDIUM,
            element: ElementType.WIND,
            baseStats: { hp: 120, attack: 20, defense: 8, speed: 5, critRate: 0.15, critDamage: 1.8 },
            level: 5,
            levelGrowth: { hp: 25, attack: 4, defense: 1.5 },
            aiBehavior: AIBehaviorType.AGGRESSIVE,
            movementPattern: MovementPattern.CHASE,
            attackPattern: AttackPattern.MELEE,
            skills: [
                {
                    id: 'wolf_bite',
                    name: '撕咬',
                    description: '凶猛的撕咬攻击',
                    type: AttackPattern.MELEE,
                    damage: 25,
                    cooldown: 2,
                    castTime: 0.3,
                    range: 60,
                    priority: 1
                },
                {
                    id: 'wolf_howl',
                    name: '狼嚎',
                    description: '提升自身攻击力',
                    type: AttackPattern.BUFF,
                    cooldown: 15,
                    castTime: 1,
                    range: 0,
                    duration: 10,
                    priority: 2,
                    effects: [{ type: 'buff', value: 30, duration: 10, target: 'self' }]
                }
            ],
            weaknesses: [{ element: ElementType.FIRE, damageMultiplier: 1.3 }],
            resistances: [],
            collider: { type: 'box', width: 60, height: 40 },
            bounceForce: 400,
            expReward: 20,
            scoreReward: 100,
            energyReward: 10,
            drops: [
                { type: RewardType.GOLD, minAmount: 30, maxAmount: 60, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_wolf_fang', minAmount: 1, maxAmount: 2, chance: 0.4 }
            ],
            scale: 1.2,
            tags: ['beast', 'fast']
        });

        this.addMonster({
            id: 'wolf_alpha',
            name: '狼王',
            description: '狼群的首领，极其凶猛',
            icon: 'textures/monsters/wolf_alpha',
            type: MonsterType.ELITE,
            race: MonsterRace.BEAST,
            size: MonsterSize.LARGE,
            element: ElementType.DARK,
            baseStats: { hp: 400, attack: 45, defense: 20, speed: 6, critRate: 0.2, critDamage: 2.0 },
            level: 15,
            levelGrowth: { hp: 40, attack: 8, defense: 3 },
            aiBehavior: AIBehaviorType.BERSERKER,
            movementPattern: MovementPattern.CHASE,
            attackPattern: AttackPattern.CHARGE,
            skills: [
                {
                    id: 'alpha_charge',
                    name: '猛冲',
                    description: '高速冲向目标',
                    type: AttackPattern.CHARGE,
                    damage: 60,
                    cooldown: 6,
                    castTime: 0.8,
                    range: 200,
                    priority: 2,
                    effects: [{ type: 'knockback', value: 100, target: 'player' }]
                },
                {
                    id: 'alpha_summon',
                    name: '召唤狼群',
                    description: '召唤灰狼协助战斗',
                    type: AttackPattern.SUMMON,
                    cooldown: 20,
                    castTime: 2,
                    range: 0,
                    priority: 1,
                    triggerCondition: { type: 'hp_below', value: 60 }
                },
                {
                    id: 'alpha_rage',
                    name: '狂暴',
                    description: '进入狂暴状态',
                    type: AttackPattern.BUFF,
                    cooldown: 30,
                    castTime: 1,
                    range: 0,
                    duration: 15,
                    priority: 3,
                    effects: [{ type: 'buff', value: 50, duration: 15, target: 'self' }],
                    triggerCondition: { type: 'hp_below', value: 30 }
                }
            ],
            weaknesses: [{ element: ElementType.LIGHT, damageMultiplier: 1.5 }],
            resistances: [{ element: ElementType.DARK, reduction: 50 }],
            collider: { type: 'box', width: 80, height: 50 },
            bounceForce: 600,
            expReward: 150,
            scoreReward: 800,
            energyReward: 40,
            drops: [
                { type: RewardType.GOLD, minAmount: 200, maxAmount: 500, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_alpha_pelt', minAmount: 1, maxAmount: 1, chance: 0.6 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_wolf_claw', minAmount: 1, maxAmount: 1, chance: 0.15 }
            ],
            scale: 1.8,
            tags: ['beast', 'elite', 'summon', 'berserker']
        });

        this.addMonster({
            id: 'boar_wild',
            name: '野猪',
            description: '脾气暴躁的野猪',
            icon: 'textures/monsters/boar_wild',
            type: MonsterType.NORMAL,
            race: MonsterRace.BEAST,
            size: MonsterSize.MEDIUM,
            element: ElementType.WIND,
            baseStats: { hp: 180, attack: 25, defense: 15, speed: 3, critRate: 0.1, critDamage: 1.6 },
            level: 8,
            levelGrowth: { hp: 30, attack: 4, defense: 2.5 },
            aiBehavior: AIBehaviorType.AGGRESSIVE,
            movementPattern: MovementPattern.CHARGE,
            attackPattern: AttackPattern.CHARGE,
            skills: [
                {
                    id: 'boar_charge',
                    name: '野猪冲撞',
                    description: '猛烈的冲撞攻击',
                    type: AttackPattern.CHARGE,
                    damage: 40,
                    cooldown: 5,
                    castTime: 1,
                    range: 150,
                    priority: 1,
                    effects: [{ type: 'knockback', value: 80, target: 'player' }]
                }
            ],
            weaknesses: [{ element: ElementType.THUNDER, damageMultiplier: 1.3 }],
            resistances: [{ type: 'physical', reduction: 15 }],
            collider: { type: 'box', width: 70, height: 45 },
            bounceForce: 500,
            expReward: 25,
            scoreReward: 120,
            energyReward: 12,
            drops: [
                { type: RewardType.GOLD, minAmount: 40, maxAmount: 80, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_boar_tusk', minAmount: 1, maxAmount: 2, chance: 0.35 }
            ],
            scale: 1.3,
            tags: ['beast', 'charge']
        });

        // ========== 亡灵系列 ==========
        this.addMonster({
            id: 'skeleton_warrior',
            name: '骷髅战士',
            description: '被黑暗力量复活的战士',
            icon: 'textures/monsters/skeleton_warrior',
            type: MonsterType.NORMAL,
            race: MonsterRace.UNDEAD,
            size: MonsterSize.MEDIUM,
            element: ElementType.DARK,
            baseStats: { hp: 100, attack: 22, defense: 12, speed: 2.5, critRate: 0.12, critDamage: 1.7 },
            level: 10,
            levelGrowth: { hp: 22, attack: 4, defense: 2 },
            aiBehavior: AIBehaviorType.AGGRESSIVE,
            movementPattern: MovementPattern.PATROL,
            attackPattern: AttackPattern.MELEE,
            skills: [
                {
                    id: 'skeleton_slash',
                    name: '骨刃斩',
                    description: '用骨剑进行斩击',
                    type: AttackPattern.MELEE,
                    damage: 30,
                    cooldown: 3,
                    castTime: 0.5,
                    range: 70,
                    priority: 1
                }
            ],
            weaknesses: [
                { element: ElementType.LIGHT, damageMultiplier: 2.0 },
                { element: ElementType.FIRE, damageMultiplier: 1.5 }
            ],
            resistances: [
                { element: ElementType.DARK, reduction: 50 },
                { type: 'physical', reduction: 20 }
            ],
            collider: { type: 'box', width: 40, height: 60 },
            bounceForce: 350,
            expReward: 30,
            scoreReward: 150,
            energyReward: 15,
            drops: [
                { type: RewardType.GOLD, minAmount: 50, maxAmount: 100, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_bone_fragment', minAmount: 1, maxAmount: 3, chance: 0.5 }
            ],
            scale: 1.1,
            tags: ['undead', 'melee']
        });

        this.addMonster({
            id: 'skeleton_mage',
            name: '骷髅法师',
            description: '掌握黑魔法的亡灵法师',
            icon: 'textures/monsters/skeleton_mage',
            type: MonsterType.NORMAL,
            race: MonsterRace.UNDEAD,
            size: MonsterSize.MEDIUM,
            element: ElementType.DARK,
            baseStats: { hp: 70, attack: 35, defense: 5, speed: 2, critRate: 0.15, critDamage: 2.0 },
            level: 12,
            levelGrowth: { hp: 15, attack: 6, defense: 1 },
            aiBehavior: AIBehaviorType.TACTICAL,
            movementPattern: MovementPattern.FLEE,
            attackPattern: AttackPattern.RANGED,
            skills: [
                {
                    id: 'dark_bolt',
                    name: '暗影箭',
                    description: '发射黑暗能量弹',
                    type: AttackPattern.RANGED,
                    damage: 40,
                    element: ElementType.DARK,
                    cooldown: 2,
                    castTime: 0.8,
                    range: 200,
                    priority: 1
                },
                {
                    id: 'curse',
                    name: '诅咒',
                    description: '降低目标防御',
                    type: AttackPattern.DEBUFF,
                    cooldown: 10,
                    castTime: 1.5,
                    range: 150,
                    duration: 8,
                    priority: 2,
                    effects: [{ type: 'debuff', value: 30, duration: 8, target: 'player' }]
                }
            ],
            weaknesses: [{ element: ElementType.LIGHT, damageMultiplier: 2.5 }],
            resistances: [{ element: ElementType.DARK, reduction: 70 }, { type: 'magical', reduction: 30 }],
            collider: { type: 'box', width: 35, height: 55 },
            bounceForce: 250,
            expReward: 40,
            scoreReward: 200,
            energyReward: 20,
            drops: [
                { type: RewardType.GOLD, minAmount: 60, maxAmount: 120, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_dark_essence', minAmount: 1, maxAmount: 1, chance: 0.3 }
            ],
            scale: 1.0,
            tags: ['undead', 'ranged', 'magic']
        });

        this.addMonster({
            id: 'lich',
            name: '巫妖',
            description: '强大的亡灵法师，统领亡灵大军',
            icon: 'textures/monsters/lich',
            type: MonsterType.MINI_BOSS,
            race: MonsterRace.UNDEAD,
            size: MonsterSize.LARGE,
            element: ElementType.DARK,
            baseStats: { hp: 800, attack: 60, defense: 25, speed: 3, critRate: 0.2, critDamage: 2.2 },
            level: 25,
            levelGrowth: { hp: 80, attack: 10, defense: 4 },
            aiBehavior: AIBehaviorType.TACTICAL,
            movementPattern: MovementPattern.TELEPORT,
            attackPattern: AttackPattern.RANGED,
            skills: [
                {
                    id: 'lich_soul_drain',
                    name: '灵魂汲取',
                    description: '吸取生命力',
                    type: AttackPattern.RANGED,
                    damage: 80,
                    element: ElementType.DARK,
                    cooldown: 5,
                    castTime: 1,
                    range: 180,
                    priority: 2,
                    effects: [{ type: 'heal', value: 40, target: 'self' }]
                },
                {
                    id: 'lich_summon',
                    name: '亡灵召唤',
                    description: '召唤骷髅战士',
                    type: AttackPattern.SUMMON,
                    cooldown: 20,
                    castTime: 2,
                    range: 0,
                    priority: 1
                },
                {
                    id: 'lich_death_wave',
                    name: '死亡波动',
                    description: '释放死亡能量波',
                    type: AttackPattern.AOE,
                    damage: 120,
                    element: ElementType.DARK,
                    cooldown: 15,
                    castTime: 2.5,
                    range: 0,
                    aoeRadius: 150,
                    priority: 3,
                    effects: [{ type: 'slow', value: 40, duration: 5, target: 'all_players' }]
                }
            ],
            weaknesses: [{ element: ElementType.LIGHT, damageMultiplier: 2.0 }],
            resistances: [
                { element: ElementType.DARK, reduction: 80 },
                { type: 'magical', reduction: 40 }
            ],
            collider: { type: 'box', width: 60, height: 80 },
            bounceForce: 400,
            expReward: 300,
            scoreReward: 1500,
            energyReward: 80,
            drops: [
                { type: RewardType.GOLD, minAmount: 500, maxAmount: 1000, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_lich_phylactery', minAmount: 1, maxAmount: 1, chance: 0.4 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_lich_staff', minAmount: 1, maxAmount: 1, chance: 0.1 }
            ],
            scale: 1.5,
            tags: ['undead', 'mini_boss', 'summon', 'magic']
        });

        // ========== 元素生物系列 ==========
        this.addMonster({
            id: 'fire_elemental',
            name: '火焰元素',
            description: '由纯粹火焰构成的生命体',
            icon: 'textures/monsters/fire_elemental',
            type: MonsterType.NORMAL,
            race: MonsterRace.ELEMENTAL,
            size: MonsterSize.MEDIUM,
            element: ElementType.FIRE,
            baseStats: { hp: 150, attack: 40, defense: 10, speed: 4, critRate: 0.15, critDamage: 1.8 },
            level: 15,
            levelGrowth: { hp: 25, attack: 7, defense: 1.5 },
            aiBehavior: AIBehaviorType.AGGRESSIVE,
            movementPattern: MovementPattern.CHASE,
            attackPattern: AttackPattern.RANGED,
            skills: [
                {
                    id: 'fireball',
                    name: '火球术',
                    description: '投掷火球',
                    type: AttackPattern.RANGED,
                    damage: 50,
                    element: ElementType.FIRE,
                    cooldown: 3,
                    castTime: 0.6,
                    range: 180,
                    priority: 1,
                    effects: [{ type: 'dot', value: 10, duration: 3, chance: 0.4, target: 'player' }]
                },
                {
                    id: 'flame_burst',
                    name: '烈焰爆发',
                    description: '周身爆发火焰',
                    type: AttackPattern.AOE,
                    damage: 60,
                    element: ElementType.FIRE,
                    cooldown: 10,
                    castTime: 1.5,
                    range: 0,
                    aoeRadius: 100,
                    priority: 2
                }
            ],
            weaknesses: [{ element: ElementType.WATER, damageMultiplier: 2.0 }],
            resistances: [{ element: ElementType.FIRE, reduction: 100 }],
            collider: { type: 'circle', radius: 35 },
            bounceForce: 400,
            expReward: 50,
            scoreReward: 250,
            energyReward: 25,
            drops: [
                { type: RewardType.GOLD, minAmount: 80, maxAmount: 150, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_fire_core', minAmount: 1, maxAmount: 1, chance: 0.35 }
            ],
            scale: 1.2,
            tint: '#FF4400',
            tags: ['elemental', 'fire', 'ranged']
        });

        this.addMonster({
            id: 'ice_elemental',
            name: '冰霜元素',
            description: '由永恒寒冰构成的生命体',
            icon: 'textures/monsters/ice_elemental',
            type: MonsterType.NORMAL,
            race: MonsterRace.ELEMENTAL,
            size: MonsterSize.MEDIUM,
            element: ElementType.WATER,
            baseStats: { hp: 180, attack: 35, defense: 15, speed: 3, critRate: 0.12, critDamage: 1.7 },
            level: 15,
            levelGrowth: { hp: 30, attack: 6, defense: 2.5 },
            aiBehavior: AIBehaviorType.DEFENSIVE,
            movementPattern: MovementPattern.PATROL,
            attackPattern: AttackPattern.RANGED,
            skills: [
                {
                    id: 'ice_shard',
                    name: '冰锥',
                    description: '发射尖锐冰锥',
                    type: AttackPattern.RANGED,
                    damage: 45,
                    element: ElementType.WATER,
                    cooldown: 3,
                    castTime: 0.7,
                    range: 170,
                    priority: 1,
                    effects: [{ type: 'slow', value: 20, duration: 2, chance: 0.5, target: 'player' }]
                },
                {
                    id: 'frost_nova',
                    name: '冰霜新星',
                    description: '释放环形冰霜冲击',
                    type: AttackPattern.AOE,
                    damage: 40,
                    element: ElementType.WATER,
                    cooldown: 12,
                    castTime: 1.8,
                    range: 0,
                    aoeRadius: 120,
                    priority: 2,
                    effects: [{ type: 'stun', value: 1, duration: 1.5, chance: 0.3, target: 'all_players' }]
                }
            ],
            weaknesses: [{ element: ElementType.FIRE, damageMultiplier: 2.0 }],
            resistances: [{ element: ElementType.WATER, reduction: 100 }],
            collider: { type: 'circle', radius: 35 },
            bounceForce: 350,
            expReward: 50,
            scoreReward: 250,
            energyReward: 25,
            drops: [
                { type: RewardType.GOLD, minAmount: 80, maxAmount: 150, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_ice_core', minAmount: 1, maxAmount: 1, chance: 0.35 }
            ],
            scale: 1.2,
            tint: '#66CCFF',
            tags: ['elemental', 'ice', 'ranged', 'cc']
        });

        // ========== 恶魔系列 ==========
        this.addMonster({
            id: 'imp',
            name: '小恶魔',
            description: '来自地狱的低级恶魔',
            icon: 'textures/monsters/imp',
            type: MonsterType.NORMAL,
            race: MonsterRace.DEMON,
            size: MonsterSize.SMALL,
            element: ElementType.FIRE,
            baseStats: { hp: 90, attack: 28, defense: 8, speed: 5, critRate: 0.18, critDamage: 1.9 },
            level: 12,
            levelGrowth: { hp: 18, attack: 5, defense: 1 },
            aiBehavior: AIBehaviorType.AGGRESSIVE,
            movementPattern: MovementPattern.CIRCLE,
            attackPattern: AttackPattern.RANGED,
            skills: [
                {
                    id: 'imp_fireball',
                    name: '恶魔火球',
                    description: '投掷地狱火球',
                    type: AttackPattern.RANGED,
                    damage: 35,
                    element: ElementType.FIRE,
                    cooldown: 2.5,
                    castTime: 0.4,
                    range: 150,
                    priority: 1
                }
            ],
            weaknesses: [{ element: ElementType.LIGHT, damageMultiplier: 1.8 }],
            resistances: [{ element: ElementType.FIRE, reduction: 40 }, { element: ElementType.DARK, reduction: 30 }],
            collider: { type: 'circle', radius: 20 },
            bounceForce: 300,
            expReward: 35,
            scoreReward: 180,
            energyReward: 18,
            drops: [
                { type: RewardType.GOLD, minAmount: 60, maxAmount: 100, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_demon_horn', minAmount: 1, maxAmount: 1, chance: 0.25 }
            ],
            scale: 0.8,
            tint: '#990000',
            tags: ['demon', 'ranged', 'fast']
        });

        this.addMonster({
            id: 'demon_knight',
            name: '恶魔骑士',
            description: '身披重甲的恶魔战士',
            icon: 'textures/monsters/demon_knight',
            type: MonsterType.ELITE,
            race: MonsterRace.DEMON,
            size: MonsterSize.LARGE,
            element: ElementType.DARK,
            baseStats: { hp: 600, attack: 55, defense: 35, speed: 2.5, critRate: 0.15, critDamage: 2.0 },
            level: 20,
            levelGrowth: { hp: 60, attack: 10, defense: 5 },
            aiBehavior: AIBehaviorType.BERSERKER,
            movementPattern: MovementPattern.CHASE,
            attackPattern: AttackPattern.MELEE,
            skills: [
                {
                    id: 'demon_slash',
                    name: '恶魔斩',
                    description: '强力的魔剑斩击',
                    type: AttackPattern.MELEE,
                    damage: 80,
                    cooldown: 4,
                    castTime: 0.8,
                    range: 100,
                    priority: 1
                },
                {
                    id: 'demon_roar',
                    name: '恶魔咆哮',
                    description: '威吓周围敌人',
                    type: AttackPattern.DEBUFF,
                    cooldown: 15,
                    castTime: 1.5,
                    range: 0,
                    aoeRadius: 150,
                    duration: 8,
                    priority: 2,
                    effects: [{ type: 'debuff', value: 25, duration: 8, target: 'all_players' }]
                },
                {
                    id: 'demon_barrier',
                    name: '恶魔屏障',
                    description: '召唤防护屏障',
                    type: AttackPattern.BUFF,
                    cooldown: 25,
                    castTime: 1,
                    range: 0,
                    duration: 10,
                    priority: 3,
                    effects: [{ type: 'shield', value: 200, duration: 10, target: 'self' }],
                    triggerCondition: { type: 'hp_below', value: 50 }
                }
            ],
            weaknesses: [{ element: ElementType.LIGHT, damageMultiplier: 1.8 }],
            resistances: [
                { element: ElementType.DARK, reduction: 60 },
                { type: 'physical', reduction: 30 }
            ],
            collider: { type: 'box', width: 70, height: 90 },
            bounceForce: 600,
            expReward: 200,
            scoreReward: 1000,
            energyReward: 50,
            drops: [
                { type: RewardType.GOLD, minAmount: 300, maxAmount: 600, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_demon_core', minAmount: 1, maxAmount: 1, chance: 0.5 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_demon_blade', minAmount: 1, maxAmount: 1, chance: 0.12 }
            ],
            scale: 1.6,
            tags: ['demon', 'elite', 'melee', 'tank']
        });

        // ========== 龙族系列 ==========
        this.addMonster({
            id: 'dragon_whelp',
            name: '幼龙',
            description: '刚孵化不久的小龙',
            icon: 'textures/monsters/dragon_whelp',
            type: MonsterType.NORMAL,
            race: MonsterRace.DRAGON,
            size: MonsterSize.MEDIUM,
            element: ElementType.FIRE,
            baseStats: { hp: 200, attack: 35, defense: 18, speed: 4, critRate: 0.12, critDamage: 1.8 },
            level: 18,
            levelGrowth: { hp: 35, attack: 6, defense: 3 },
            aiBehavior: AIBehaviorType.AGGRESSIVE,
            movementPattern: MovementPattern.CIRCLE,
            attackPattern: AttackPattern.RANGED,
            skills: [
                {
                    id: 'whelp_breath',
                    name: '幼龙吐息',
                    description: '喷射小型火焰',
                    type: AttackPattern.RANGED,
                    damage: 45,
                    element: ElementType.FIRE,
                    cooldown: 4,
                    castTime: 0.8,
                    range: 120,
                    priority: 1,
                    effects: [{ type: 'dot', value: 8, duration: 3, chance: 0.3, target: 'player' }]
                }
            ],
            weaknesses: [{ element: ElementType.WATER, damageMultiplier: 1.5 }],
            resistances: [{ element: ElementType.FIRE, reduction: 50 }],
            collider: { type: 'box', width: 50, height: 40 },
            bounceForce: 450,
            expReward: 60,
            scoreReward: 300,
            energyReward: 30,
            drops: [
                { type: RewardType.GOLD, minAmount: 100, maxAmount: 200, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_dragon_scale', minAmount: 1, maxAmount: 2, chance: 0.4 }
            ],
            scale: 1.3,
            tags: ['dragon', 'ranged', 'fire']
        });

        this.addMonster({
            id: 'dragon_elder',
            name: '远古巨龙',
            description: '活了千年的强大巨龙',
            icon: 'textures/monsters/dragon_elder',
            type: MonsterType.BOSS,
            race: MonsterRace.DRAGON,
            size: MonsterSize.COLOSSAL,
            element: ElementType.FIRE,
            baseStats: { hp: 5000, attack: 150, defense: 80, speed: 2, critRate: 0.2, critDamage: 2.5 },
            level: 40,
            levelGrowth: { hp: 200, attack: 25, defense: 12 },
            aiBehavior: AIBehaviorType.TACTICAL,
            movementPattern: MovementPattern.STATIC,
            attackPattern: AttackPattern.AOE,
            skills: [
                {
                    id: 'elder_breath',
                    name: '龙息',
                    description: '喷射毁灭性的火焰',
                    type: AttackPattern.AOE,
                    damage: 200,
                    element: ElementType.FIRE,
                    cooldown: 8,
                    castTime: 2,
                    range: 250,
                    aoeRadius: 100,
                    priority: 2,
                    effects: [{ type: 'dot', value: 30, duration: 5, target: 'all_players' }]
                },
                {
                    id: 'elder_claw',
                    name: '龙爪',
                    description: '巨大的利爪攻击',
                    type: AttackPattern.MELEE,
                    damage: 180,
                    cooldown: 5,
                    castTime: 1,
                    range: 150,
                    priority: 1,
                    effects: [{ type: 'knockback', value: 150, target: 'player' }]
                },
                {
                    id: 'elder_roar',
                    name: '龙吟',
                    description: '震慑所有敌人',
                    type: AttackPattern.DEBUFF,
                    cooldown: 20,
                    castTime: 2,
                    range: 0,
                    aoeRadius: 300,
                    duration: 5,
                    priority: 3,
                    effects: [
                        { type: 'debuff', value: 30, duration: 5, target: 'all_players' },
                        { type: 'stun', value: 1, duration: 2, chance: 0.5, target: 'all_players' }
                    ]
                },
                {
                    id: 'elder_meteor',
                    name: '陨石召唤',
                    description: '从天空召唤陨石',
                    type: AttackPattern.AOE,
                    damage: 300,
                    element: ElementType.FIRE,
                    cooldown: 30,
                    castTime: 4,
                    range: 0,
                    aoeRadius: 200,
                    priority: 4,
                    triggerCondition: { type: 'hp_below', value: 30 }
                }
            ],
            weaknesses: [{ element: ElementType.WATER, damageMultiplier: 1.5 }, { bodyPart: 'heart', damageMultiplier: 2.0, stunChance: 0.2 }],
            resistances: [
                { element: ElementType.FIRE, reduction: 80 },
                { type: 'physical', reduction: 40 },
                { type: 'magical', reduction: 30 }
            ],
            collider: { type: 'box', width: 200, height: 150 },
            bounceForce: 800,
            expReward: 2000,
            scoreReward: 10000,
            energyReward: 200,
            drops: [
                { type: RewardType.GOLD, minAmount: 5000, maxAmount: 10000, chance: 1 },
                { type: RewardType.DIAMOND, minAmount: 50, maxAmount: 100, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_dragon_heart', minAmount: 1, maxAmount: 1, chance: 0.5 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_dragon_set_weapon', minAmount: 1, maxAmount: 1, chance: 0.2 },
                { type: RewardType.CHARACTER, itemId: 'char_dragon_tamer', minAmount: 1, maxAmount: 1, chance: 0.05 }
            ],
            scale: 3.0,
            tags: ['dragon', 'boss', 'fire', 'aoe']
        });
    }

    /**
     * 添加怪物
     */
    private addMonster(config: MonsterConfig): void {
        this._monsters.set(config.id, config);
    }

    // ==================== 公共方法 ====================

    public getMonster(id: string): MonsterConfig | undefined {
        return this._monsters.get(id);
    }

    public getAllMonsters(): MonsterConfig[] {
        return Array.from(this._monsters.values());
    }

    public getMonstersByType(type: MonsterType): MonsterConfig[] {
        const ids = this._monstersByType.get(type) ?? [];
        return ids.map(id => this._monsters.get(id)!).filter(m => m);
    }

    public getMonstersByRace(race: MonsterRace): MonsterConfig[] {
        const ids = this._monstersByRace.get(race) ?? [];
        return ids.map(id => this._monsters.get(id)!).filter(m => m);
    }

    public getMonstersByElement(element: ElementType): MonsterConfig[] {
        const ids = this._monstersByElement.get(element) ?? [];
        return ids.map(id => this._monsters.get(id)!).filter(m => m);
    }

    public getMonstersByTags(tags: string[]): MonsterConfig[] {
        return Array.from(this._monsters.values()).filter(m => 
            tags.some(tag => m.tags.includes(tag))
        );
    }

    /**
     * 计算怪物等级加成后的属性
     */
    public calculateStats(configId: string, level: number): MonsterStats | null {
        const config = this._monsters.get(configId);
        if (!config) return null;

        const levelDiff = level - config.level;
        return {
            hp: Math.floor(config.baseStats.hp + config.levelGrowth.hp * levelDiff),
            attack: Math.floor(config.baseStats.attack + config.levelGrowth.attack * levelDiff),
            defense: Math.floor(config.baseStats.defense + config.levelGrowth.defense * levelDiff),
            speed: config.baseStats.speed,
            critRate: config.baseStats.critRate,
            critDamage: config.baseStats.critDamage
        };
    }

    /**
     * 创建怪物实例
     */
    public createInstance(configId: string, level?: number): MonsterInstance | null {
        const config = this._monsters.get(configId);
        if (!config) return null;

        const actualLevel = level ?? config.level;
        const stats = this.calculateStats(configId, actualLevel);
        if (!stats) return null;

        return {
            uniqueId: `monster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            configId,
            currentHP: stats.hp,
            maxHP: stats.hp,
            currentShield: 0,
            stats,
            level: actualLevel,
            buffs: [],
            debuffs: [],
            skillCooldowns: new Map(),
            isEnraged: false,
            isStunned: false,
            stunDuration: 0,
            targetId: null,
            aggroList: new Map()
        };
    }

    /**
     * 计算元素伤害倍率
     */
    public calculateElementDamage(attackElement: ElementType, monsterConfig: MonsterConfig): number {
        // 检查弱点
        for (const weakness of monsterConfig.weaknesses) {
            if (weakness.element === attackElement) {
                return weakness.damageMultiplier;
            }
        }

        // 检查抗性
        for (const resistance of monsterConfig.resistances) {
            if (resistance.element === attackElement) {
                return 1 - resistance.reduction / 100;
            }
        }

        return 1.0;
    }

    /**
     * 获取怪物类型名称
     */
    public getTypeName(type: MonsterType): string {
        switch (type) {
            case MonsterType.NORMAL: return '普通';
            case MonsterType.ELITE: return '精英';
            case MonsterType.MINI_BOSS: return '小Boss';
            case MonsterType.BOSS: return 'Boss';
            case MonsterType.WORLD_BOSS: return '世界Boss';
            default: return '未知';
        }
    }

    /**
     * 获取种族名称
     */
    public getRaceName(race: MonsterRace): string {
        switch (race) {
            case MonsterRace.SLIME: return '史莱姆';
            case MonsterRace.BEAST: return '野兽';
            case MonsterRace.UNDEAD: return '亡灵';
            case MonsterRace.DEMON: return '恶魔';
            case MonsterRace.DRAGON: return '龙族';
            case MonsterRace.ELEMENTAL: return '元素';
            case MonsterRace.HUMANOID: return '人形';
            case MonsterRace.MECHANICAL: return '机械';
            case MonsterRace.PLANT: return '植物';
            case MonsterRace.INSECT: return '虫类';
            default: return '未知';
        }
    }
}
