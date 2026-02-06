import { _decorator, Vec2, Vec3, Color } from 'cc';
import { ElementType } from './CharacterData';

/**
 * 角色类型枚举 - 决定弹射动作与技能风格
 * Character Type - Determines bounce action and skill style
 */
export enum CharacterType {
    FIGHTER = 'fighter',        // 格斗: 直线冲刺，高连击，易触发PF
    SWORDSMAN = 'swordsman',    // 剑士: 范围挥砍，贯通，破弱点
    SHOOTER = 'shooter',        // 射击: 抛物线/跟踪弹，远程输出
    SUPPORT = 'support',        // 辅助: 光环/治疗，低能量需求
    SPECIAL = 'special'         // 特殊: 召唤/地形，机制特化
}

/**
 * 角色定位枚举 - 决定角色在队伍中的功能
 * Character Role - Determines character's function in team
 */
export enum CharacterRole {
    // 输出核心
    SKILL_DPS = 'skill_dps',        // 技伤型: 高倍率大招，依赖充能循环
    PF_DPS = 'pf_dps',              // PF型: 连击触发强化弹射
    DIRECT_DPS = 'direct_dps',     // 直击型: 高频碰撞，适合长局
    FEVER_DPS = 'fever_dps',       // Fever型: Fever增伤/持续时间，极限爆发
    
    // 辅助核心
    ENERGY_SUPPORT = 'energy_support',      // 充能辅助: 加速回能
    BUFF_SUPPORT = 'buff_support',          // 增伤辅助: 终伤/技伤/减抗
    HEAL_SUPPORT = 'heal_support',          // 治疗辅助: 再生/群奶/复活
    
    // 工具人
    CONTROL_UTIL = 'control_util',          // 控制工具人: 麻痹/冰冻/眩晕
    SHIELD_BREAK_UTIL = 'shield_break_util', // 破盾工具人: 全屏破弱/贯通
    DEBUFF_UTIL = 'debuff_util',            // 异常工具人: 减抗/驱散/易伤
    
    // 特殊功能
    SPECIAL_FUNC = 'special_func'           // 特殊功能: 协力球/浮游/开局满能
}

/**
 * 被动标识类型
 * Passive Mark Type
 */
export enum PassiveMarkType {
    NONE = 'none',              // 无标识，任何位置生效
    M_MARK = 'm_mark',          // M标识，仅主位生效
    SUB_MARK = 'sub_mark'       // 副位标识，仅副位生效（特殊情况）
}

/**
 * 弹射行为类型
 * Bounce Behavior Type
 */
export enum BounceType {
    NORMAL = 'normal',          // 普通弹射
    RUSH = 'rush',              // 冲刺型（格斗）
    SLASH = 'slash',            // 挥砍型（剑士）
    PROJECTILE = 'projectile',  // 投射型（射击）
    FLOAT = 'float',            // 浮游型（辅助/特殊）
    SUMMON = 'summon'           // 召唤型（特殊）
}

/**
 * 角色类型配置 - 定义每种类型的基础特性
 */
export interface CharacterTypeConfig {
    type: CharacterType;
    name: string;
    description: string;
    bounceType: BounceType;
    
    // 弹射特性
    bounceSpeed: number;            // 弹射速度倍率
    comboRate: number;              // 连击获取倍率
    pfTriggerRate: number;          // PF触发概率加成
    energyRate: number;             // 能量获取倍率
    
    // 碰撞特性
    hitboxScale: number;            // 碰撞体缩放
    penetration: boolean;           // 是否贯通
    multiHit: boolean;              // 是否多段伤害
    
    // 核心优势
    coreStrengths: string[];
}

/**
 * 角色定位配置 - 定义每种定位的特性
 */
export interface CharacterRoleConfig {
    role: CharacterRole;
    name: string;
    description: string;
    category: 'dps' | 'support' | 'utility' | 'special';
    
    // 伤害加成
    skillDamageBonus: number;       // 技能伤害加成
    pfDamageBonus: number;          // PF伤害加成
    directDamageBonus: number;      // 直击伤害加成
    feverDamageBonus: number;       // Fever伤害加成
    
    // 辅助能力
    energyBonus: number;            // 能量获取加成
    healingBonus: number;           // 治疗效果加成
    buffDuration: number;           // Buff持续时间加成
    
    // 推荐位置
    preferredSlots: ('main' | 'sub')[];
    
    // 流派适配
    compatibleArchetypes: string[];
}

/**
 * 被动技能配置
 */
export interface PassiveSkillConfig {
    id: string;
    name: string;
    description: string;
    markType: PassiveMarkType;      // 生效位置限制
    
    // 触发条件
    triggerCondition: PassiveTriggerCondition;
    triggerChance: number;          // 触发概率 (0-1)
    cooldown: number;               // 冷却时间(秒)
    
    // 效果类型
    effectType: PassiveEffectType;
    effectValue: number;            // 效果数值
    effectDuration: number;         // 效果持续时间
    
    // 叠加规则
    stackable: boolean;             // 是否可叠加
    maxStacks: number;              // 最大叠加层数
    
    // 优先级
    priority: number;               // 0-100，数值越高优先级越高
}

/**
 * 被动触发条件
 */
export enum PassiveTriggerCondition {
    ALWAYS = 'always',              // 永久生效
    ON_HIT = 'on_hit',              // 命中时
    ON_CRIT = 'on_crit',            // 暴击时
    ON_KILL = 'on_kill',            // 击杀时
    ON_COMBO = 'on_combo',          // 达到连击数时
    ON_PF = 'on_pf',                // PF触发时
    ON_SKILL = 'on_skill',          // 释放技能时
    ON_FEVER = 'on_fever',          // Fever状态时
    ON_DAMAGE = 'on_damage',        // 受伤时
    ON_LOW_HP = 'on_low_hp',        // 低血量时
    ON_BATTLE_START = 'on_battle_start', // 战斗开始时
    PERIODIC = 'periodic'           // 周期性触发
}

/**
 * 被动效果类型
 */
export enum PassiveEffectType {
    // 伤害类
    ATK_BOOST = 'atk_boost',                // 攻击力提升
    SKILL_DAMAGE_BOOST = 'skill_damage_boost', // 技伤提升
    PF_DAMAGE_BOOST = 'pf_damage_boost',    // PF伤害提升
    DIRECT_DAMAGE_BOOST = 'direct_damage_boost', // 直击伤害提升
    FINAL_DAMAGE_BOOST = 'final_damage_boost', // 终伤提升
    CRIT_RATE_BOOST = 'crit_rate_boost',    // 暴击率提升
    CRIT_DAMAGE_BOOST = 'crit_damage_boost', // 暴击伤害提升
    ELEMENT_DAMAGE_BOOST = 'element_damage_boost', // 元素伤害提升
    
    // 防御类
    DEF_BOOST = 'def_boost',                // 防御提升
    HP_BOOST = 'hp_boost',                  // 生命提升
    DAMAGE_REDUCTION = 'damage_reduction',  // 减伤
    
    // 能量类
    ENERGY_GAIN = 'energy_gain',            // 能量获取
    ENERGY_START = 'energy_start',          // 开局能量
    ENERGY_KILL = 'energy_kill',            // 击杀回能
    
    // 治疗类
    HEAL = 'heal',                          // 治疗
    REGEN = 'regen',                        // 再生
    REVIVE_SPEED = 'revive_speed',          // 复活加速
    
    // 控制类
    STUN = 'stun',                          // 眩晕
    FREEZE = 'freeze',                      // 冰冻
    PARALYZE = 'paralyze',                  // 麻痹
    BURN = 'burn',                          // 燃烧
    POISON = 'poison',                      // 中毒
    
    // 辅助类
    DEF_REDUCTION = 'def_reduction',        // 减防
    RESIST_REDUCTION = 'resist_reduction',  // 减抗
    BUFF_DISPEL = 'buff_dispel',            // 驱散
    COMBO_BONUS = 'combo_bonus',            // 连击加成
    
    // 特殊类
    PENETRATION = 'penetration',            // 贯通
    MULTI_HIT = 'multi_hit',                // 多段
    SUMMON = 'summon',                      // 召唤
    FLOAT = 'float'                         // 浮游
}

/**
 * 属性倾向配置 - 每种属性的特色定位
 */
export interface ElementTendencyConfig {
    element: ElementType;
    name: string;
    tendency: string;               // 属性倾向描述
    
    // 主流定位
    primaryRoles: CharacterRole[];
    
    // 典型效果
    typicalEffects: PassiveEffectType[];
    
    // 属性克制加成
    advantageBonus: number;         // 克制时额外伤害 (+50%)
    disadvantageReduction: number;  // 被克制时减伤 (-50%)
    
    // 颜色
    color: Color;
}

/**
 * 角色特色系统 - 管理角色类型、定位、弹射特性
 */
export class CharacterFeatureSystem {
    private static _instance: CharacterFeatureSystem | null = null;
    
    // 配置缓存
    private _typeConfigs: Map<CharacterType, CharacterTypeConfig> = new Map();
    private _roleConfigs: Map<CharacterRole, CharacterRoleConfig> = new Map();
    private _passiveConfigs: Map<string, PassiveSkillConfig> = new Map();
    private _elementConfigs: Map<ElementType, ElementTendencyConfig> = new Map();
    
    public static get instance(): CharacterFeatureSystem {
        if (!CharacterFeatureSystem._instance) {
            CharacterFeatureSystem._instance = new CharacterFeatureSystem();
            CharacterFeatureSystem._instance.initConfigs();
        }
        return CharacterFeatureSystem._instance;
    }
    
    /**
     * 初始化所有配置
     */
    private initConfigs(): void {
        this.initTypeConfigs();
        this.initRoleConfigs();
        this.initPassiveConfigs();
        this.initElementConfigs();
        console.log('角色特色系统初始化完成');
    }
    
    /**
     * 初始化角色类型配置
     */
    private initTypeConfigs(): void {
        // 格斗类型
        this._typeConfigs.set(CharacterType.FIGHTER, {
            type: CharacterType.FIGHTER,
            name: '格斗',
            description: '直线冲刺，高连击，易触发PF，近战爆发与高频连击',
            bounceType: BounceType.RUSH,
            bounceSpeed: 1.3,
            comboRate: 1.5,
            pfTriggerRate: 1.3,
            energyRate: 1.0,
            hitboxScale: 1.2,
            penetration: false,
            multiHit: true,
            coreStrengths: ['近战爆发', '高频连击', 'PF易触发']
        });
        
        // 剑士类型
        this._typeConfigs.set(CharacterType.SWORDSMAN, {
            type: CharacterType.SWORDSMAN,
            name: '剑士',
            description: '范围挥砍，贯通敌人，精准破弱点，群伤与破盾能力强',
            bounceType: BounceType.SLASH,
            bounceSpeed: 1.1,
            comboRate: 1.0,
            pfTriggerRate: 1.0,
            energyRate: 1.1,
            hitboxScale: 1.5,
            penetration: true,
            multiHit: false,
            coreStrengths: ['群伤', '破盾', '锁头', '贯通']
        });
        
        // 射击类型
        this._typeConfigs.set(CharacterType.SHOOTER, {
            type: CharacterType.SHOOTER,
            name: '射击',
            description: '抛物线/跟踪弹，远程输出，减抗控场，安全距离作战',
            bounceType: BounceType.PROJECTILE,
            bounceSpeed: 1.0,
            comboRate: 0.8,
            pfTriggerRate: 0.9,
            energyRate: 1.2,
            hitboxScale: 0.8,
            penetration: false,
            multiHit: false,
            coreStrengths: ['减抗', '控场', '浮游', '安全输出']
        });
        
        // 辅助类型
        this._typeConfigs.set(CharacterType.SUPPORT, {
            type: CharacterType.SUPPORT,
            name: '辅助',
            description: '光环/治疗效果，低能量需求，续航增伤与充能辅助',
            bounceType: BounceType.FLOAT,
            bounceSpeed: 0.9,
            comboRate: 0.7,
            pfTriggerRate: 0.7,
            energyRate: 1.3,
            hitboxScale: 1.0,
            penetration: false,
            multiHit: false,
            coreStrengths: ['续航', '增伤', '充能', '治疗']
        });
        
        // 特殊类型
        this._typeConfigs.set(CharacterType.SPECIAL, {
            type: CharacterType.SPECIAL,
            name: '特殊',
            description: '召唤/地形，机制特化，协力球、异常、复活等独特能力',
            bounceType: BounceType.SUMMON,
            bounceSpeed: 1.0,
            comboRate: 1.2,
            pfTriggerRate: 1.0,
            energyRate: 1.0,
            hitboxScale: 1.0,
            penetration: false,
            multiHit: false,
            coreStrengths: ['协力球召唤', '浮游', '开局满能', '复活加速']
        });
    }
    
    /**
     * 初始化角色定位配置
     */
    private initRoleConfigs(): void {
        // ===== 输出核心 =====
        
        // 技伤型
        this._roleConfigs.set(CharacterRole.SKILL_DPS, {
            role: CharacterRole.SKILL_DPS,
            name: '技伤型',
            description: '高倍率大招，依赖充能循环，30秒内2-3轮大招爆发',
            category: 'dps',
            skillDamageBonus: 0.5,
            pfDamageBonus: 0,
            directDamageBonus: 0,
            feverDamageBonus: 0.2,
            energyBonus: 0,
            healingBonus: 0,
            buffDuration: 0,
            preferredSlots: ['main'],
            compatibleArchetypes: ['skill_damage', 'burst']
        });
        
        // PF型
        this._roleConfigs.set(CharacterRole.PF_DPS, {
            role: CharacterRole.PF_DPS,
            name: 'PF型',
            description: '连击触发强化弹射，高等级PF伤害翻倍，依赖高连击',
            category: 'dps',
            skillDamageBonus: 0,
            pfDamageBonus: 0.8,
            directDamageBonus: 0.2,
            feverDamageBonus: 0.1,
            energyBonus: 0.1,
            healingBonus: 0,
            buffDuration: 0,
            preferredSlots: ['main'],
            compatibleArchetypes: ['power_flip', 'combo']
        });
        
        // 直击型
        this._roleConfigs.set(CharacterRole.DIRECT_DPS, {
            role: CharacterRole.DIRECT_DPS,
            name: '直击型',
            description: '高频碰撞，适合长局，稳定输出，无需充能依赖',
            category: 'dps',
            skillDamageBonus: 0,
            pfDamageBonus: 0.1,
            directDamageBonus: 0.6,
            feverDamageBonus: 0,
            energyBonus: 0.15,
            healingBonus: 0,
            buffDuration: 0,
            preferredSlots: ['main'],
            compatibleArchetypes: ['direct_hit', 'sustain']
        });
        
        // Fever型
        this._roleConfigs.set(CharacterRole.FEVER_DPS, {
            role: CharacterRole.FEVER_DPS,
            name: 'Fever型',
            description: 'Fever增伤/持续时间，极限爆发，快速攒能进入Fever',
            category: 'dps',
            skillDamageBonus: 0.2,
            pfDamageBonus: 0.2,
            directDamageBonus: 0.2,
            feverDamageBonus: 0.8,
            energyBonus: 0.2,
            healingBonus: 0,
            buffDuration: 0,
            preferredSlots: ['main'],
            compatibleArchetypes: ['fever', 'burst']
        });
        
        // ===== 辅助核心 =====
        
        // 充能辅助
        this._roleConfigs.set(CharacterRole.ENERGY_SUPPORT, {
            role: CharacterRole.ENERGY_SUPPORT,
            name: '充能辅助',
            description: '开局满能、击杀回能、Fever加速回能，加速循环',
            category: 'support',
            skillDamageBonus: 0,
            pfDamageBonus: 0,
            directDamageBonus: 0,
            feverDamageBonus: 0,
            energyBonus: 0.5,
            healingBonus: 0,
            buffDuration: 0.2,
            preferredSlots: ['sub'],
            compatibleArchetypes: ['skill_damage', 'fever']
        });
        
        // 增伤辅助
        this._roleConfigs.set(CharacterRole.BUFF_SUPPORT, {
            role: CharacterRole.BUFF_SUPPORT,
            name: '增伤辅助',
            description: '终伤/技伤/PF增伤、减抗、元素反应，最大化输出',
            category: 'support',
            skillDamageBonus: 0.15,
            pfDamageBonus: 0.15,
            directDamageBonus: 0.15,
            feverDamageBonus: 0.15,
            energyBonus: 0,
            healingBonus: 0,
            buffDuration: 0.3,
            preferredSlots: ['main', 'sub'],
            compatibleArchetypes: ['skill_damage', 'power_flip', 'fever', 'direct_hit']
        });
        
        // 治疗辅助
        this._roleConfigs.set(CharacterRole.HEAL_SUPPORT, {
            role: CharacterRole.HEAL_SUPPORT,
            name: '治疗辅助',
            description: '再生/群奶、复活、减伤，兼顾续航与生存',
            category: 'support',
            skillDamageBonus: 0,
            pfDamageBonus: 0,
            directDamageBonus: 0,
            feverDamageBonus: 0,
            energyBonus: 0.1,
            healingBonus: 0.5,
            buffDuration: 0.2,
            preferredSlots: ['sub'],
            compatibleArchetypes: ['sustain', 'high_difficulty']
        });
        
        // ===== 工具人 =====
        
        // 控制工具人
        this._roleConfigs.set(CharacterRole.CONTROL_UTIL, {
            role: CharacterRole.CONTROL_UTIL,
            name: '控制工具人',
            description: '麻痹/冰冻/眩晕，控场后配合主C爆发',
            category: 'utility',
            skillDamageBonus: 0,
            pfDamageBonus: 0,
            directDamageBonus: 0,
            feverDamageBonus: 0,
            energyBonus: 0,
            healingBonus: 0,
            buffDuration: 0.4,
            preferredSlots: ['sub'],
            compatibleArchetypes: ['skill_damage', 'high_difficulty']
        });
        
        // 破盾工具人
        this._roleConfigs.set(CharacterRole.SHIELD_BREAK_UTIL, {
            role: CharacterRole.SHIELD_BREAK_UTIL,
            name: '破盾工具人',
            description: '全屏破弱、贯通，快速击破多弱点',
            category: 'utility',
            skillDamageBonus: 0.1,
            pfDamageBonus: 0,
            directDamageBonus: 0.2,
            feverDamageBonus: 0,
            energyBonus: 0,
            healingBonus: 0,
            buffDuration: 0,
            preferredSlots: ['main', 'sub'],
            compatibleArchetypes: ['burst', 'high_difficulty']
        });
        
        // 异常工具人
        this._roleConfigs.set(CharacterRole.DEBUFF_UTIL, {
            role: CharacterRole.DEBUFF_UTIL,
            name: '异常工具人',
            description: '减抗、驱散、易伤，提升全队伤害效率',
            category: 'utility',
            skillDamageBonus: 0,
            pfDamageBonus: 0,
            directDamageBonus: 0,
            feverDamageBonus: 0,
            energyBonus: 0,
            healingBonus: 0,
            buffDuration: 0.3,
            preferredSlots: ['sub'],
            compatibleArchetypes: ['skill_damage', 'fever', 'power_flip']
        });
        
        // ===== 特殊功能 =====
        
        // 特殊功能
        this._roleConfigs.set(CharacterRole.SPECIAL_FUNC, {
            role: CharacterRole.SPECIAL_FUNC,
            name: '特殊功能',
            description: '协力球召唤、浮游、开局满能、复活加速等不可替代能力',
            category: 'special',
            skillDamageBonus: 0,
            pfDamageBonus: 0,
            directDamageBonus: 0,
            feverDamageBonus: 0,
            energyBonus: 0.2,
            healingBonus: 0,
            buffDuration: 0.2,
            preferredSlots: ['main', 'sub'],
            compatibleArchetypes: ['power_flip', 'sustain', 'special']
        });
    }
    
    /**
     * 初始化常用被动技能配置
     */
    private initPassiveConfigs(): void {
        // ===== M标识被动（仅主位生效）=====
        
        // 攻刃（M标识）
        this.addPassive({
            id: 'passive_atk_blade_m',
            name: '攻刃',
            description: '【M】提升攻击力15%',
            markType: PassiveMarkType.M_MARK,
            triggerCondition: PassiveTriggerCondition.ALWAYS,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.ATK_BOOST,
            effectValue: 0.15,
            effectDuration: -1,
            stackable: true,
            maxStacks: 3,
            priority: 80
        });
        
        // 技伤强化（M标识）
        this.addPassive({
            id: 'passive_skill_damage_m',
            name: '技伤强化',
            description: '【M】提升技能伤害20%',
            markType: PassiveMarkType.M_MARK,
            triggerCondition: PassiveTriggerCondition.ALWAYS,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.SKILL_DAMAGE_BOOST,
            effectValue: 0.20,
            effectDuration: -1,
            stackable: true,
            maxStacks: 3,
            priority: 85
        });
        
        // PF强化（M标识）
        this.addPassive({
            id: 'passive_pf_damage_m',
            name: 'PF强化',
            description: '【M】提升PF伤害25%',
            markType: PassiveMarkType.M_MARK,
            triggerCondition: PassiveTriggerCondition.ON_PF,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.PF_DAMAGE_BOOST,
            effectValue: 0.25,
            effectDuration: 5,
            stackable: true,
            maxStacks: 5,
            priority: 85
        });
        
        // 开局满能（M标识，如礼黑）
        this.addPassive({
            id: 'passive_start_full_energy_m',
            name: '开局满能',
            description: '【M】战斗开始时能量值100%',
            markType: PassiveMarkType.M_MARK,
            triggerCondition: PassiveTriggerCondition.ON_BATTLE_START,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.ENERGY_START,
            effectValue: 1.0,
            effectDuration: 0,
            stackable: false,
            maxStacks: 1,
            priority: 100
        });
        
        // ===== 无条件被动（任何位置生效）=====
        
        // 技伤+10%
        this.addPassive({
            id: 'passive_skill_damage_10',
            name: '技能强化',
            description: '技能伤害+10%',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ALWAYS,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.SKILL_DAMAGE_BOOST,
            effectValue: 0.10,
            effectDuration: -1,
            stackable: true,
            maxStacks: 5,
            priority: 60
        });
        
        // 终伤+8%
        this.addPassive({
            id: 'passive_final_damage_8',
            name: '终伤强化',
            description: '最终伤害+8%',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ALWAYS,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.FINAL_DAMAGE_BOOST,
            effectValue: 0.08,
            effectDuration: -1,
            stackable: true,
            maxStacks: 5,
            priority: 70
        });
        
        // 击杀回能
        this.addPassive({
            id: 'passive_kill_energy',
            name: '击杀回能',
            description: '击杀敌人时恢复5%能量',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ON_KILL,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.ENERGY_KILL,
            effectValue: 0.05,
            effectDuration: 0,
            stackable: false,
            maxStacks: 1,
            priority: 65
        });
        
        // 连击加速回能
        this.addPassive({
            id: 'passive_combo_energy',
            name: '连击充能',
            description: '每10连击额外恢复能量',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ON_COMBO,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.ENERGY_GAIN,
            effectValue: 0.02,
            effectDuration: 0,
            stackable: false,
            maxStacks: 1,
            priority: 55
        });
        
        // 治疗
        this.addPassive({
            id: 'passive_regen',
            name: '再生',
            description: '每3秒恢复2%最大生命',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.PERIODIC,
            triggerChance: 1.0,
            cooldown: 3,
            effectType: PassiveEffectType.REGEN,
            effectValue: 0.02,
            effectDuration: 0,
            stackable: false,
            maxStacks: 1,
            priority: 50
        });
        
        // 减抗
        this.addPassive({
            id: 'passive_resist_reduction',
            name: '削弱抗性',
            description: '攻击降低敌人10%抗性，持续5秒',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ON_HIT,
            triggerChance: 0.3,
            cooldown: 5,
            effectType: PassiveEffectType.RESIST_REDUCTION,
            effectValue: 0.10,
            effectDuration: 5,
            stackable: true,
            maxStacks: 3,
            priority: 75
        });
        
        // 麻痹
        this.addPassive({
            id: 'passive_paralyze',
            name: '雷击麻痹',
            description: '攻击有15%概率麻痹敌人2秒',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ON_HIT,
            triggerChance: 0.15,
            cooldown: 8,
            effectType: PassiveEffectType.PARALYZE,
            effectValue: 1,
            effectDuration: 2,
            stackable: false,
            maxStacks: 1,
            priority: 70
        });
        
        // 冰冻
        this.addPassive({
            id: 'passive_freeze',
            name: '冰霜冻结',
            description: '攻击有10%概率冰冻敌人3秒',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ON_HIT,
            triggerChance: 0.10,
            cooldown: 10,
            effectType: PassiveEffectType.FREEZE,
            effectValue: 1,
            effectDuration: 3,
            stackable: false,
            maxStacks: 1,
            priority: 70
        });
        
        // 贯通
        this.addPassive({
            id: 'passive_penetration',
            name: '贯通',
            description: '攻击穿透敌人，可命中多个目标',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ALWAYS,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.PENETRATION,
            effectValue: 1,
            effectDuration: -1,
            stackable: false,
            maxStacks: 1,
            priority: 80
        });
        
        // Fever增伤
        this.addPassive({
            id: 'passive_fever_damage',
            name: 'Fever狂热',
            description: 'Fever状态下伤害+30%',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ON_FEVER,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.FINAL_DAMAGE_BOOST,
            effectValue: 0.30,
            effectDuration: -1,
            stackable: false,
            maxStacks: 1,
            priority: 75
        });
        
        // 复活加速
        this.addPassive({
            id: 'passive_revive_speed',
            name: '复活加速',
            description: '队友复活所需撞击次数-2',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ALWAYS,
            triggerChance: 1.0,
            cooldown: 0,
            effectType: PassiveEffectType.REVIVE_SPEED,
            effectValue: 2,
            effectDuration: -1,
            stackable: false,
            maxStacks: 1,
            priority: 60
        });
        
        // 协力球召唤
        this.addPassive({
            id: 'passive_summon_ball',
            name: '协力球召唤',
            description: '每10连击召唤一个协力球',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ON_COMBO,
            triggerChance: 1.0,
            cooldown: 2,
            effectType: PassiveEffectType.SUMMON,
            effectValue: 1,
            effectDuration: 10,
            stackable: false,
            maxStacks: 1,
            priority: 65
        });
        
        // 浮游
        this.addPassive({
            id: 'passive_float',
            name: '浮游',
            description: '角色在场地上方浮游，持续攻击敌人',
            markType: PassiveMarkType.NONE,
            triggerCondition: PassiveTriggerCondition.ON_SKILL,
            triggerChance: 1.0,
            cooldown: 15,
            effectType: PassiveEffectType.FLOAT,
            effectValue: 1,
            effectDuration: 8,
            stackable: false,
            maxStacks: 1,
            priority: 70
        });
    }
    
    /**
     * 初始化属性倾向配置
     */
    private initElementConfigs(): void {
        // 火属性 - 爆发与破盾
        this._elementConfigs.set(ElementType.FIRE, {
            element: ElementType.FIRE,
            name: '火',
            tendency: '爆发与破盾，高倍率技能伤害，适合短时间高爆发',
            primaryRoles: [CharacterRole.SKILL_DPS, CharacterRole.SHIELD_BREAK_UTIL],
            typicalEffects: [
                PassiveEffectType.SKILL_DAMAGE_BOOST,
                PassiveEffectType.BURN,
                PassiveEffectType.PENETRATION
            ],
            advantageBonus: 0.5,
            disadvantageReduction: 0.5,
            color: new Color(255, 85, 51, 255)
        });
        
        // 水属性 - 控制与续航
        this._elementConfigs.set(ElementType.WATER, {
            element: ElementType.WATER,
            name: '水',
            tendency: '控制与续航，冰冻控场，PF型输出，长局稳定',
            primaryRoles: [CharacterRole.PF_DPS, CharacterRole.CONTROL_UTIL, CharacterRole.HEAL_SUPPORT],
            typicalEffects: [
                PassiveEffectType.FREEZE,
                PassiveEffectType.PF_DAMAGE_BOOST,
                PassiveEffectType.HEAL
            ],
            advantageBonus: 0.5,
            disadvantageReduction: 0.5,
            color: new Color(51, 153, 255, 255)
        });
        
        // 雷属性 - 麻痹与充能
        this._elementConfigs.set(ElementType.THUNDER, {
            element: ElementType.THUNDER,
            name: '雷',
            tendency: '麻痹与充能，高控制频率，PF与Fever适配',
            primaryRoles: [CharacterRole.PF_DPS, CharacterRole.FEVER_DPS, CharacterRole.CONTROL_UTIL],
            typicalEffects: [
                PassiveEffectType.PARALYZE,
                PassiveEffectType.ENERGY_GAIN,
                PassiveEffectType.ATK_BOOST
            ],
            advantageBonus: 0.5,
            disadvantageReduction: 0.5,
            color: new Color(255, 255, 51, 255)
        });
        
        // 风属性 - 连击与PF
        this._elementConfigs.set(ElementType.WIND, {
            element: ElementType.WIND,
            name: '风',
            tendency: '连击与PF，开局充能，高连击触发，PF队核心辅助',
            primaryRoles: [CharacterRole.PF_DPS, CharacterRole.ENERGY_SUPPORT, CharacterRole.BUFF_SUPPORT],
            typicalEffects: [
                PassiveEffectType.ENERGY_START,
                PassiveEffectType.COMBO_BONUS,
                PassiveEffectType.PF_DAMAGE_BOOST
            ],
            advantageBonus: 0.5,
            disadvantageReduction: 0.5,
            color: new Color(51, 255, 153, 255)
        });
        
        // 光属性 - 续航与治疗
        this._elementConfigs.set(ElementType.LIGHT, {
            element: ElementType.LIGHT,
            name: '光',
            tendency: '续航与治疗，技伤队队长，大招增伤，兼顾治疗',
            primaryRoles: [CharacterRole.SKILL_DPS, CharacterRole.HEAL_SUPPORT, CharacterRole.BUFF_SUPPORT],
            typicalEffects: [
                PassiveEffectType.SKILL_DAMAGE_BOOST,
                PassiveEffectType.HEAL,
                PassiveEffectType.FINAL_DAMAGE_BOOST
            ],
            advantageBonus: 0.5,
            disadvantageReduction: 0.5,
            color: new Color(255, 255, 170, 255)
        });
        
        // 暗属性 - 直击与破盾
        this._elementConfigs.set(ElementType.DARK, {
            element: ElementType.DARK,
            name: '暗',
            tendency: '直击与破盾，高频直击输出，长局稳定，无充能依赖',
            primaryRoles: [CharacterRole.DIRECT_DPS, CharacterRole.SHIELD_BREAK_UTIL, CharacterRole.ENERGY_SUPPORT],
            typicalEffects: [
                PassiveEffectType.DIRECT_DAMAGE_BOOST,
                PassiveEffectType.ENERGY_START,
                PassiveEffectType.PENETRATION
            ],
            advantageBonus: 0.5,
            disadvantageReduction: 0.5,
            color: new Color(153, 51, 255, 255)
        });
    }
    
    // ========== 辅助方法 ==========
    
    /**
     * 添加被动技能配置
     */
    private addPassive(config: PassiveSkillConfig): void {
        this._passiveConfigs.set(config.id, config);
    }
    
    /**
     * 获取角色类型配置
     */
    public getTypeConfig(type: CharacterType): CharacterTypeConfig | undefined {
        return this._typeConfigs.get(type);
    }
    
    /**
     * 获取角色定位配置
     */
    public getRoleConfig(role: CharacterRole): CharacterRoleConfig | undefined {
        return this._roleConfigs.get(role);
    }
    
    /**
     * 获取被动技能配置
     */
    public getPassiveConfig(id: string): PassiveSkillConfig | undefined {
        return this._passiveConfigs.get(id);
    }
    
    /**
     * 获取属性配置
     */
    public getElementConfig(element: ElementType): ElementTendencyConfig | undefined {
        return this._elementConfigs.get(element);
    }
    
    /**
     * 获取所有类型配置
     */
    public getAllTypeConfigs(): CharacterTypeConfig[] {
        return Array.from(this._typeConfigs.values());
    }
    
    /**
     * 获取所有定位配置
     */
    public getAllRoleConfigs(): CharacterRoleConfig[] {
        return Array.from(this._roleConfigs.values());
    }
    
    /**
     * 获取所有被动技能配置
     */
    public getAllPassiveConfigs(): PassiveSkillConfig[] {
        return Array.from(this._passiveConfigs.values());
    }
    
    /**
     * 根据标识类型筛选被动
     */
    public getPassivesByMark(markType: PassiveMarkType): PassiveSkillConfig[] {
        return this.getAllPassiveConfigs().filter(p => p.markType === markType);
    }
    
    /**
     * 根据效果类型筛选被动
     */
    public getPassivesByEffect(effectType: PassiveEffectType): PassiveSkillConfig[] {
        return this.getAllPassiveConfigs().filter(p => p.effectType === effectType);
    }
    
    /**
     * 按优先级排序被动技能
     */
    public sortPassivesByPriority(passives: PassiveSkillConfig[]): PassiveSkillConfig[] {
        return [...passives].sort((a, b) => b.priority - a.priority);
    }
    
    /**
     * 计算弹射参数（基于角色类型）
     */
    public calculateBounceParams(type: CharacterType, baseForce: number): {
        speed: number;
        comboMultiplier: number;
        pfMultiplier: number;
        energyMultiplier: number;
    } {
        const config = this._typeConfigs.get(type);
        if (!config) {
            return {
                speed: baseForce,
                comboMultiplier: 1.0,
                pfMultiplier: 1.0,
                energyMultiplier: 1.0
            };
        }
        
        return {
            speed: baseForce * config.bounceSpeed,
            comboMultiplier: config.comboRate,
            pfMultiplier: config.pfTriggerRate,
            energyMultiplier: config.energyRate
        };
    }
    
    /**
     * 计算伤害加成（基于角色定位）
     */
    public calculateRoleDamageBonus(role: CharacterRole, damageType: 'skill' | 'pf' | 'direct' | 'fever'): number {
        const config = this._roleConfigs.get(role);
        if (!config) return 0;
        
        switch (damageType) {
            case 'skill': return config.skillDamageBonus;
            case 'pf': return config.pfDamageBonus;
            case 'direct': return config.directDamageBonus;
            case 'fever': return config.feverDamageBonus;
            default: return 0;
        }
    }
    
    /**
     * 检查被动是否在当前位置生效
     */
    public isPassiveActiveInSlot(passive: PassiveSkillConfig, isMainSlot: boolean): boolean {
        switch (passive.markType) {
            case PassiveMarkType.NONE:
                return true;
            case PassiveMarkType.M_MARK:
                return isMainSlot;
            case PassiveMarkType.SUB_MARK:
                return !isMainSlot;
            default:
                return true;
        }
    }
    
    /**
     * 获取推荐的角色定位（基于属性）
     */
    public getRecommendedRoles(element: ElementType): CharacterRole[] {
        const config = this._elementConfigs.get(element);
        return config ? config.primaryRoles : [];
    }
    
    /**
     * 检查定位是否与流派兼容
     */
    public isRoleCompatibleWithArchetype(role: CharacterRole, archetype: string): boolean {
        const config = this._roleConfigs.get(role);
        return config ? config.compatibleArchetypes.includes(archetype) : false;
    }
    
    /**
     * 获取类型名称
     */
    public getTypeName(type: CharacterType): string {
        const config = this._typeConfigs.get(type);
        return config ? config.name : '未知';
    }
    
    /**
     * 获取定位名称
     */
    public getRoleName(role: CharacterRole): string {
        const config = this._roleConfigs.get(role);
        return config ? config.name : '未知';
    }
    
    /**
     * 获取被动标识描述
     */
    public getMarkDescription(markType: PassiveMarkType): string {
        switch (markType) {
            case PassiveMarkType.M_MARK:
                return '【M】仅主位生效';
            case PassiveMarkType.SUB_MARK:
                return '【副】仅副位生效';
            default:
                return '';
        }
    }
}
