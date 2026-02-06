import { _decorator, Component, Node, Vec2, EventTarget } from 'cc';
import { CharacterInstance, ElementType, CharacterRarity } from './CharacterData';
const { ccclass, property } = _decorator;

/**
 * 特性类型
 */
export enum TraitType {
    // 移动特性
    PENETRATE = 'penetrate',        // 贯通 - 穿过敌人不回弹
    FLOAT = 'float',                // 浮游 - 不受重力影响
    ACCELERATE = 'accelerate',      // 加速 - 提升移动速度
    HOMING = 'homing',              // 追踪 - 自动追踪敌人
    MULTI_HIT = 'multi_hit',        // 多段 - 单次接触造成多次伤害
    BOUNCE = 'bounce',              // 弹跳 - 增加反弹次数
    
    // 伤害特性
    CRIT_BOOST = 'crit_boost',      // 暴击强化
    ELEMENT_BOOST = 'element_boost', // 属性强化
    COMBO_BOOST = 'combo_boost',    // 连击强化
    PF_BOOST = 'pf_boost',          // PF强化
    DIRECT_BOOST = 'direct_boost',  // 直击强化
    SKILL_BOOST = 'skill_boost',    // 技伤强化
    
    // 防御特性
    SHIELD = 'shield',              // 护盾
    REGEN = 'regen',                // 再生
    RESIST = 'resist',              // 抗性
    INVINCIBLE = 'invincible',      // 无敌（短时间）
    
    // 辅助特性
    CHARGE = 'charge',              // 充能加速
    HEAL_BOOST = 'heal_boost',      // 治疗强化
    BUFF_EXTEND = 'buff_extend',    // Buff延长
    DEBUFF_IMMUNE = 'debuff_immune', // 负面免疫
    
    // 特殊特性
    CHAIN_ATTACK = 'chain_attack',  // 连锁攻击
    PIERCE = 'pierce',              // 穿刺（无视部分防御）
    LIFE_STEAL = 'life_steal',      // 吸血
    EXPLOSION = 'explosion'         // 爆炸（范围伤害）
}

/**
 * 特性触发条件
 */
export enum TraitTrigger {
    ALWAYS = 'always',              // 始终生效
    ON_HIT = 'on_hit',              // 命中时
    ON_BOUNCE = 'on_bounce',        // 反弹时
    ON_COMBO = 'on_combo',          // 达到连击数
    ON_PF = 'on_pf',                // PF触发时
    ON_SKILL = 'on_skill',          // 技能释放时
    ON_FEVER = 'on_fever',          // Fever期间
    ON_LOW_HP = 'on_low_hp',        // 低血量时
    ON_FULL_HP = 'on_full_hp',      // 满血时
    ON_CRIT = 'on_crit',            // 暴击时
    ON_KILL = 'on_kill',            // 击杀时
    TIMED = 'timed'                 // 定时触发
}

/**
 * 特性配置
 */
export interface TraitConfig {
    id: string;
    name: string;
    description: string;
    type: TraitType;
    
    // 触发条件
    trigger: TraitTrigger;
    triggerValue?: number;          // 触发阈值（如连击数）
    
    // 效果数值
    value: number;                  // 主要效果数值
    duration?: number;              // 持续时间（秒）
    cooldown?: number;              // 冷却时间（秒）
    
    // 叠加规则
    stackable: boolean;             // 是否可叠加
    maxStacks?: number;             // 最大叠加层数
    
    // 限制条件
    requiredElement?: ElementType;  // 要求属性
    requiredRarity?: CharacterRarity; // 要求稀有度
    
    // 视觉标识
    iconPath?: string;
    effectColor?: string;
}

/**
 * 特性实例（角色身上激活的特性）
 */
export interface TraitInstance {
    configId: string;
    sourceId: string;               // 来源ID（角色/武器/魂珠）
    sourceType: 'character' | 'weapon' | 'soul_orb' | 'passive';
    currentStacks: number;
    remainingDuration: number;      // 剩余持续时间（-1为永久）
    cooldownTimer: number;          // 当前冷却时间
    isActive: boolean;
}

/**
 * 特性效果计算结果
 */
export interface TraitEffectResult {
    type: TraitType;
    value: number;
    stacks: number;
    sources: string[];
}

/**
 * 角色特性数据
 */
export interface CharacterTraitData {
    characterId: string;
    activeTraits: TraitInstance[];
    permanentTraits: string[];      // 永久特性（来自角色本身）
}

/**
 * 特性系统 - 管理角色特性与效果
 * Trait System - Character traits and effects management
 */
@ccclass('TraitSystem')
export class TraitSystem extends Component {
    private static _instance: TraitSystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_TRAIT_ACTIVATED = 'trait-activated';
    public static readonly EVENT_TRAIT_DEACTIVATED = 'trait-deactivated';
    public static readonly EVENT_TRAIT_TRIGGERED = 'trait-triggered';
    public static readonly EVENT_TRAIT_STACKED = 'trait-stacked';

    // 特性配置数据库
    private _traitConfigs: Map<string, TraitConfig> = new Map();

    // 角色特性数据
    private _characterTraits: Map<string, CharacterTraitData> = new Map();

    // 全局特性效果缓存
    private _effectCache: Map<TraitType, TraitEffectResult> = new Map();
    private _cacheValid: boolean = false;

    public static get instance(): TraitSystem | null {
        return TraitSystem._instance;
    }

    onLoad() {
        if (TraitSystem._instance) {
            this.node.destroy();
            return;
        }
        TraitSystem._instance = this;

        this.initTraitConfigs();
    }

    /**
     * 初始化特性配置
     */
    private initTraitConfigs(): void {
        // ========== 移动特性 ==========
        this.addTraitConfig({
            id: 'trait_penetrate_1',
            name: '贯通I',
            description: '弹射时穿过敌人不会回弹',
            type: TraitType.PENETRATE,
            trigger: TraitTrigger.ALWAYS,
            value: 1,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_penetrate_2',
            name: '贯通II',
            description: '穿过敌人时额外造成10%伤害',
            type: TraitType.PENETRATE,
            trigger: TraitTrigger.ALWAYS,
            value: 1.1,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_float_1',
            name: '浮游I',
            description: '不受重力影响，直线移动',
            type: TraitType.FLOAT,
            trigger: TraitTrigger.ALWAYS,
            value: 1,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_accelerate_1',
            name: '加速I',
            description: '移动速度+15%',
            type: TraitType.ACCELERATE,
            trigger: TraitTrigger.ALWAYS,
            value: 0.15,
            stackable: true,
            maxStacks: 3
        });

        this.addTraitConfig({
            id: 'trait_accelerate_2',
            name: '加速II',
            description: '移动速度+25%',
            type: TraitType.ACCELERATE,
            trigger: TraitTrigger.ALWAYS,
            value: 0.25,
            stackable: true,
            maxStacks: 2
        });

        this.addTraitConfig({
            id: 'trait_homing_1',
            name: '追踪I',
            description: '弹射时自动追踪最近敌人',
            type: TraitType.HOMING,
            trigger: TraitTrigger.ALWAYS,
            value: 0.5,  // 追踪强度
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_multi_hit_1',
            name: '多段攻击I',
            description: '每次撞击造成2次伤害',
            type: TraitType.MULTI_HIT,
            trigger: TraitTrigger.ON_HIT,
            value: 2,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_bounce_1',
            name: '弹跳强化I',
            description: '反弹次数+5',
            type: TraitType.BOUNCE,
            trigger: TraitTrigger.ALWAYS,
            value: 5,
            stackable: true,
            maxStacks: 3
        });

        // ========== 伤害特性 ==========
        this.addTraitConfig({
            id: 'trait_crit_boost_1',
            name: '暴击强化I',
            description: '暴击率+5%，暴击伤害+15%',
            type: TraitType.CRIT_BOOST,
            trigger: TraitTrigger.ALWAYS,
            value: 0.05, // 暴击率
            stackable: true,
            maxStacks: 5
        });

        this.addTraitConfig({
            id: 'trait_combo_boost_1',
            name: '连击强化I',
            description: '连击数达到10时，伤害+10%',
            type: TraitType.COMBO_BOOST,
            trigger: TraitTrigger.ON_COMBO,
            triggerValue: 10,
            value: 0.1,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_combo_boost_2',
            name: '连击强化II',
            description: '连击数达到25时，伤害+20%',
            type: TraitType.COMBO_BOOST,
            trigger: TraitTrigger.ON_COMBO,
            triggerValue: 25,
            value: 0.2,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_pf_boost_1',
            name: 'PF强化I',
            description: 'Power Flip伤害+20%',
            type: TraitType.PF_BOOST,
            trigger: TraitTrigger.ON_PF,
            value: 0.2,
            stackable: true,
            maxStacks: 3
        });

        this.addTraitConfig({
            id: 'trait_direct_boost_1',
            name: '直击强化I',
            description: '直接攻击伤害+15%',
            type: TraitType.DIRECT_BOOST,
            trigger: TraitTrigger.ALWAYS,
            value: 0.15,
            stackable: true,
            maxStacks: 4
        });

        this.addTraitConfig({
            id: 'trait_skill_boost_1',
            name: '技伤强化I',
            description: '技能伤害+12%',
            type: TraitType.SKILL_BOOST,
            trigger: TraitTrigger.ON_SKILL,
            value: 0.12,
            stackable: true,
            maxStacks: 5
        });

        this.addTraitConfig({
            id: 'trait_element_boost_fire',
            name: '火焰亲和',
            description: '火属性伤害+15%',
            type: TraitType.ELEMENT_BOOST,
            trigger: TraitTrigger.ALWAYS,
            value: 0.15,
            requiredElement: ElementType.FIRE,
            stackable: true,
            maxStacks: 3
        });

        // ========== 防御特性 ==========
        this.addTraitConfig({
            id: 'trait_shield_1',
            name: '护盾I',
            description: '战斗开始时获得20%最大生命护盾',
            type: TraitType.SHIELD,
            trigger: TraitTrigger.ALWAYS,
            value: 0.2,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_regen_1',
            name: '再生I',
            description: '每5秒恢复2%最大生命',
            type: TraitType.REGEN,
            trigger: TraitTrigger.TIMED,
            triggerValue: 5,
            value: 0.02,
            stackable: true,
            maxStacks: 3
        });

        this.addTraitConfig({
            id: 'trait_resist_1',
            name: '抗性I',
            description: '受到伤害-10%',
            type: TraitType.RESIST,
            trigger: TraitTrigger.ALWAYS,
            value: 0.1,
            stackable: true,
            maxStacks: 3
        });

        this.addTraitConfig({
            id: 'trait_invincible_1',
            name: '紧急回避',
            description: '受到致命伤害时，获得2秒无敌，每场战斗1次',
            type: TraitType.INVINCIBLE,
            trigger: TraitTrigger.ON_LOW_HP,
            triggerValue: 0.1,
            value: 2,
            duration: 2,
            cooldown: 999,
            stackable: false
        });

        // ========== 辅助特性 ==========
        this.addTraitConfig({
            id: 'trait_charge_1',
            name: '充能加速I',
            description: '技能充能速度+15%',
            type: TraitType.CHARGE,
            trigger: TraitTrigger.ALWAYS,
            value: 0.15,
            stackable: true,
            maxStacks: 4
        });

        this.addTraitConfig({
            id: 'trait_charge_2',
            name: '充能加速II',
            description: '技能充能速度+25%',
            type: TraitType.CHARGE,
            trigger: TraitTrigger.ALWAYS,
            value: 0.25,
            stackable: true,
            maxStacks: 2
        });

        this.addTraitConfig({
            id: 'trait_heal_boost_1',
            name: '治疗强化I',
            description: '受到治疗效果+20%',
            type: TraitType.HEAL_BOOST,
            trigger: TraitTrigger.ALWAYS,
            value: 0.2,
            stackable: true,
            maxStacks: 3
        });

        this.addTraitConfig({
            id: 'trait_buff_extend_1',
            name: 'Buff延长I',
            description: '增益效果持续时间+25%',
            type: TraitType.BUFF_EXTEND,
            trigger: TraitTrigger.ALWAYS,
            value: 0.25,
            stackable: true,
            maxStacks: 2
        });

        this.addTraitConfig({
            id: 'trait_debuff_immune_1',
            name: '负面免疫I',
            description: '30%概率抵抗负面效果',
            type: TraitType.DEBUFF_IMMUNE,
            trigger: TraitTrigger.ALWAYS,
            value: 0.3,
            stackable: true,
            maxStacks: 2
        });

        // ========== 特殊特性 ==========
        this.addTraitConfig({
            id: 'trait_chain_attack_1',
            name: '连锁攻击I',
            description: '攻击时有20%概率对周围敌人造成额外伤害',
            type: TraitType.CHAIN_ATTACK,
            trigger: TraitTrigger.ON_HIT,
            value: 0.2,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_pierce_1',
            name: '穿刺I',
            description: '无视目标15%防御',
            type: TraitType.PIERCE,
            trigger: TraitTrigger.ALWAYS,
            value: 0.15,
            stackable: true,
            maxStacks: 3
        });

        this.addTraitConfig({
            id: 'trait_life_steal_1',
            name: '吸血I',
            description: '造成伤害的5%转化为生命恢复',
            type: TraitType.LIFE_STEAL,
            trigger: TraitTrigger.ON_HIT,
            value: 0.05,
            stackable: true,
            maxStacks: 3
        });

        this.addTraitConfig({
            id: 'trait_explosion_1',
            name: '爆炸I',
            description: '攻击时有10%概率造成范围爆炸',
            type: TraitType.EXPLOSION,
            trigger: TraitTrigger.ON_HIT,
            value: 0.1,
            stackable: false
        });

        this.addTraitConfig({
            id: 'trait_fever_boost_1',
            name: 'Fever强化I',
            description: 'Fever期间伤害额外+20%',
            type: TraitType.SKILL_BOOST,
            trigger: TraitTrigger.ON_FEVER,
            value: 0.2,
            stackable: true,
            maxStacks: 3
        });

        console.log(`特性配置初始化完成，共 ${this._traitConfigs.size} 种特性`);
    }

    /**
     * 添加特性配置
     */
    private addTraitConfig(config: TraitConfig): void {
        this._traitConfigs.set(config.id, config);
    }

    // ==================== 特性管理 ====================

    /**
     * 获取或创建角色特性数据
     */
    private getCharacterTraitData(characterId: string): CharacterTraitData {
        if (!this._characterTraits.has(characterId)) {
            this._characterTraits.set(characterId, {
                characterId,
                activeTraits: [],
                permanentTraits: []
            });
        }
        return this._characterTraits.get(characterId)!;
    }

    /**
     * 激活特性
     */
    public activateTrait(
        characterId: string,
        traitId: string,
        sourceId: string,
        sourceType: TraitInstance['sourceType'],
        duration: number = -1
    ): boolean {
        const config = this._traitConfigs.get(traitId);
        if (!config) {
            console.log(`特性不存在: ${traitId}`);
            return false;
        }

        const data = this.getCharacterTraitData(characterId);
        
        // 检查是否已存在
        const existing = data.activeTraits.find(t => t.configId === traitId && t.sourceId === sourceId);
        
        if (existing) {
            // 如果可叠加，增加层数
            if (config.stackable && (!config.maxStacks || existing.currentStacks < config.maxStacks)) {
                existing.currentStacks++;
                existing.remainingDuration = duration;
                this._cacheValid = false;
                
                this.events.emit(TraitSystem.EVENT_TRAIT_STACKED, {
                    characterId,
                    traitId,
                    stacks: existing.currentStacks
                });
                
                console.log(`特性叠加: ${config.name} x${existing.currentStacks}`);
                return true;
            }
            return false;
        }

        // 创建新实例
        const instance: TraitInstance = {
            configId: traitId,
            sourceId,
            sourceType,
            currentStacks: 1,
            remainingDuration: duration,
            cooldownTimer: 0,
            isActive: true
        };

        data.activeTraits.push(instance);
        this._cacheValid = false;

        this.events.emit(TraitSystem.EVENT_TRAIT_ACTIVATED, {
            characterId,
            traitId,
            config
        });

        console.log(`特性激活: ${config.name} (来源: ${sourceType})`);
        return true;
    }

    /**
     * 停用特性
     */
    public deactivateTrait(characterId: string, traitId: string, sourceId?: string): boolean {
        const data = this._characterTraits.get(characterId);
        if (!data) return false;

        const index = data.activeTraits.findIndex(t => 
            t.configId === traitId && (!sourceId || t.sourceId === sourceId)
        );

        if (index === -1) return false;

        const removed = data.activeTraits.splice(index, 1)[0];
        this._cacheValid = false;

        const config = this._traitConfigs.get(traitId);
        
        this.events.emit(TraitSystem.EVENT_TRAIT_DEACTIVATED, {
            characterId,
            traitId,
            config
        });

        console.log(`特性停用: ${config?.name || traitId}`);
        return true;
    }

    /**
     * 添加永久特性
     */
    public addPermanentTrait(characterId: string, traitId: string): boolean {
        if (!this._traitConfigs.has(traitId)) return false;

        const data = this.getCharacterTraitData(characterId);
        
        if (data.permanentTraits.includes(traitId)) return false;

        data.permanentTraits.push(traitId);
        
        // 同时激活
        return this.activateTrait(characterId, traitId, 'permanent', 'character', -1);
    }

    /**
     * 触发特性效果
     */
    public triggerTrait(
        characterId: string,
        trigger: TraitTrigger,
        triggerValue?: number
    ): TraitEffectResult[] {
        const data = this._characterTraits.get(characterId);
        if (!data) return [];

        const results: TraitEffectResult[] = [];

        for (const instance of data.activeTraits) {
            if (!instance.isActive) continue;
            if (instance.cooldownTimer > 0) continue;

            const config = this._traitConfigs.get(instance.configId);
            if (!config) continue;
            if (config.trigger !== trigger) continue;

            // 检查触发阈值
            if (config.triggerValue !== undefined && triggerValue !== undefined) {
                if (triggerValue < config.triggerValue) continue;
            }

            // 触发效果
            const result: TraitEffectResult = {
                type: config.type,
                value: config.value * instance.currentStacks,
                stacks: instance.currentStacks,
                sources: [instance.sourceId]
            };

            results.push(result);

            // 设置冷却
            if (config.cooldown) {
                instance.cooldownTimer = config.cooldown;
            }

            this.events.emit(TraitSystem.EVENT_TRAIT_TRIGGERED, {
                characterId,
                traitId: config.id,
                config,
                result
            });
        }

        return results;
    }

    // ==================== 效果计算 ====================

    /**
     * 获取指定类型的特性效果总和
     */
    public getTotalTraitEffect(characterId: string, type: TraitType): TraitEffectResult {
        const data = this._characterTraits.get(characterId);
        const result: TraitEffectResult = {
            type,
            value: 0,
            stacks: 0,
            sources: []
        };

        if (!data) return result;

        for (const instance of data.activeTraits) {
            if (!instance.isActive) continue;

            const config = this._traitConfigs.get(instance.configId);
            if (!config || config.type !== type) continue;

            result.value += config.value * instance.currentStacks;
            result.stacks += instance.currentStacks;
            result.sources.push(instance.sourceId);
        }

        return result;
    }

    /**
     * 检查是否拥有特性
     */
    public hasTrait(characterId: string, type: TraitType): boolean {
        const data = this._characterTraits.get(characterId);
        if (!data) return false;

        return data.activeTraits.some(t => {
            const config = this._traitConfigs.get(t.configId);
            return config?.type === type && t.isActive;
        });
    }

    /**
     * 获取角色所有活跃特性
     */
    public getActiveTraits(characterId: string): { config: TraitConfig; instance: TraitInstance }[] {
        const data = this._characterTraits.get(characterId);
        if (!data) return [];

        return data.activeTraits
            .filter(t => t.isActive)
            .map(instance => ({
                config: this._traitConfigs.get(instance.configId)!,
                instance
            }))
            .filter(t => t.config);
    }

    /**
     * 计算移动修正
     */
    public calculateMovementModifiers(characterId: string): {
        speedMultiplier: number;
        penetrate: boolean;
        float: boolean;
        homing: number;
        extraBounces: number;
    } {
        const modifiers = {
            speedMultiplier: 1.0,
            penetrate: false,
            float: false,
            homing: 0,
            extraBounces: 0
        };

        // 加速
        const accelerate = this.getTotalTraitEffect(characterId, TraitType.ACCELERATE);
        modifiers.speedMultiplier += accelerate.value;

        // 贯通
        modifiers.penetrate = this.hasTrait(characterId, TraitType.PENETRATE);

        // 浮游
        modifiers.float = this.hasTrait(characterId, TraitType.FLOAT);

        // 追踪
        const homing = this.getTotalTraitEffect(characterId, TraitType.HOMING);
        modifiers.homing = homing.value;

        // 弹跳
        const bounce = this.getTotalTraitEffect(characterId, TraitType.BOUNCE);
        modifiers.extraBounces = Math.floor(bounce.value);

        return modifiers;
    }

    /**
     * 计算伤害修正
     */
    public calculateDamageModifiers(characterId: string, trigger: TraitTrigger, triggerValue?: number): {
        damageMultiplier: number;
        critBonus: number;
        critDamageBonus: number;
        piercePercent: number;
        lifeStealPercent: number;
    } {
        const modifiers = {
            damageMultiplier: 1.0,
            critBonus: 0,
            critDamageBonus: 0,
            piercePercent: 0,
            lifeStealPercent: 0
        };

        // 触发型特性
        const triggeredEffects = this.triggerTrait(characterId, trigger, triggerValue);
        for (const effect of triggeredEffects) {
            switch (effect.type) {
                case TraitType.SKILL_BOOST:
                case TraitType.DIRECT_BOOST:
                case TraitType.PF_BOOST:
                case TraitType.COMBO_BOOST:
                case TraitType.ELEMENT_BOOST:
                    modifiers.damageMultiplier += effect.value;
                    break;
            }
        }

        // 常驻特性
        const critBoost = this.getTotalTraitEffect(characterId, TraitType.CRIT_BOOST);
        modifiers.critBonus += critBoost.value;
        modifiers.critDamageBonus += critBoost.value * 3; // 暴击伤害是暴击率的3倍

        const pierce = this.getTotalTraitEffect(characterId, TraitType.PIERCE);
        modifiers.piercePercent += pierce.value;

        const lifeSteal = this.getTotalTraitEffect(characterId, TraitType.LIFE_STEAL);
        modifiers.lifeStealPercent += lifeSteal.value;

        return modifiers;
    }

    /**
     * 计算防御修正
     */
    public calculateDefenseModifiers(characterId: string): {
        damageReduction: number;
        shieldPercent: number;
        regenPercent: number;
        debuffResist: number;
    } {
        const modifiers = {
            damageReduction: 0,
            shieldPercent: 0,
            regenPercent: 0,
            debuffResist: 0
        };

        const resist = this.getTotalTraitEffect(characterId, TraitType.RESIST);
        modifiers.damageReduction += resist.value;

        const shield = this.getTotalTraitEffect(characterId, TraitType.SHIELD);
        modifiers.shieldPercent += shield.value;

        const regen = this.getTotalTraitEffect(characterId, TraitType.REGEN);
        modifiers.regenPercent += regen.value;

        const debuffImmune = this.getTotalTraitEffect(characterId, TraitType.DEBUFF_IMMUNE);
        modifiers.debuffResist += debuffImmune.value;

        return modifiers;
    }

    // ==================== 更新循环 ====================

    update(dt: number) {
        // 更新所有角色的特性
        for (const [characterId, data] of this._characterTraits) {
            for (const instance of data.activeTraits) {
                // 更新冷却
                if (instance.cooldownTimer > 0) {
                    instance.cooldownTimer -= dt;
                }

                // 更新持续时间
                if (instance.remainingDuration > 0) {
                    instance.remainingDuration -= dt;
                    if (instance.remainingDuration <= 0) {
                        instance.isActive = false;
                        this._cacheValid = false;
                    }
                }
            }

            // 清理过期特性
            data.activeTraits = data.activeTraits.filter(t => t.isActive || t.remainingDuration === -1);
        }
    }

    // ==================== 查询方法 ====================

    /**
     * 获取特性配置
     */
    public getTraitConfig(traitId: string): TraitConfig | undefined {
        return this._traitConfigs.get(traitId);
    }

    /**
     * 获取所有特性配置
     */
    public getAllTraitConfigs(): TraitConfig[] {
        return Array.from(this._traitConfigs.values());
    }

    /**
     * 按类型获取特性配置
     */
    public getTraitConfigsByType(type: TraitType): TraitConfig[] {
        return Array.from(this._traitConfigs.values()).filter(c => c.type === type);
    }

    /**
     * 清除角色所有特性
     */
    public clearCharacterTraits(characterId: string): void {
        this._characterTraits.delete(characterId);
        this._cacheValid = false;
    }

    /**
     * 重置系统
     */
    public reset(): void {
        this._characterTraits.clear();
        this._effectCache.clear();
        this._cacheValid = false;
    }

    onDestroy() {
        this.reset();
        
        if (TraitSystem._instance === this) {
            TraitSystem._instance = null;
        }
    }
}
