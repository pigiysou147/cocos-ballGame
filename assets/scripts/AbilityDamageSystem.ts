import { _decorator, Component, Node, Vec3, EventTarget, Color } from 'cc';
import { ElementType } from './CharacterData';
import { BattleCoreSystem, DamageSystemType } from './BattleCoreSystem';
import { DamageSystem } from './DamageSystem';
import { TraitSystem, TraitType, TraitTrigger } from './TraitSystem';
import { SkillEffectRenderer } from './SkillEffectRenderer';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 能力触发类型
 */
export enum AbilityTriggerType {
    ON_HIT = 'on_hit',                  // 命中时
    ON_BOUNCE = 'on_bounce',            // 反弹时
    ON_COMBO = 'on_combo',              // 连击触发
    ON_PF = 'on_pf',                    // PF触发
    ON_SKILL = 'on_skill',              // 技能释放
    ON_FEVER = 'on_fever',              // Fever期间
    ON_CRIT = 'on_crit',                // 暴击时
    ON_KILL = 'on_kill',                // 击杀时
    ON_STATUS = 'on_status',            // 状态触发（如异常）
    ON_CHAIN = 'on_chain',              // CHAIN触发
    PERIODIC = 'periodic',              // 周期触发
    ON_DASH = 'on_dash'                 // 冲刺时
}

/**
 * 能力伤害类型
 */
export enum AbilityDamageType {
    FIXED = 'fixed',                    // 固定伤害
    PERCENT_ATK = 'percent_atk',        // 攻击力百分比
    PERCENT_HP = 'percent_hp',          // 生命值百分比
    PERCENT_DEF = 'percent_def',        // 防御力百分比
    TRUE_DAMAGE = 'true_damage',        // 真实伤害
    DOT = 'dot',                        // 持续伤害
    AOE = 'aoe',                        // 范围伤害
    CHAIN = 'chain'                     // 连锁伤害
}

/**
 * 能力配置
 */
export interface AbilityConfig {
    id: string;
    name: string;
    description: string;
    
    // 触发
    triggerType: AbilityTriggerType;
    triggerCondition?: {
        minCombo?: number;              // 最小连击数
        minPFLevel?: number;            // 最小PF等级
        statusType?: string;            // 要求的异常状态
        chance?: number;                // 触发概率
        cooldown?: number;              // 冷却时间
        interval?: number;              // 周期间隔（PERIODIC用）
    };
    
    // 伤害
    damageType: AbilityDamageType;
    baseDamage: number;                 // 基础伤害/百分比
    element?: ElementType;              // 属性（可选）
    
    // 范围
    isAoe?: boolean;
    aoeRadius?: number;
    maxTargets?: number;
    chainTargets?: number;              // 连锁目标数
    
    // 额外效果
    bonusEffects?: {
        type: string;
        value: number;
        duration?: number;
    }[];
    
    // 视觉
    effectColor?: Color;
    effectScale?: number;
}

/**
 * 能力实例
 */
export interface AbilityInstance {
    configId: string;
    ownerId: string;                    // 拥有者ID
    cooldownTimer: number;
    intervalTimer: number;
    hitCount: number;                   // 命中次数
    totalDamage: number;                // 累计伤害
    isActive: boolean;
}

/**
 * 能力伤害结果
 */
export interface AbilityDamageResult {
    abilityId: string;
    damage: number;
    targets: string[];
    isCritical: boolean;
    element?: ElementType;
    bonusEffects: any[];
}

/**
 * 能力伤害系统 - 管理被动触发的能力伤害
 * Ability Damage System - Passive triggered ability damage
 */
@ccclass('AbilityDamageSystem')
export class AbilityDamageSystem extends Component {
    private static _instance: AbilityDamageSystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_ABILITY_TRIGGERED = 'ability-triggered';
    public static readonly EVENT_ABILITY_DAMAGE = 'ability-damage';
    public static readonly EVENT_ABILITY_CHAIN = 'ability-chain';

    // 能力配置数据库
    private _abilityConfigs: Map<string, AbilityConfig> = new Map();

    // 角色的能力实例
    private _characterAbilities: Map<string, AbilityInstance[]> = new Map();

    // 全局冷却追踪
    private _globalCooldowns: Map<string, number> = new Map();

    // 统计
    private _stats = {
        totalTriggers: 0,
        totalDamage: 0,
        totalChainHits: 0
    };

    public static get instance(): AbilityDamageSystem | null {
        return AbilityDamageSystem._instance;
    }

    public get stats() {
        return { ...this._stats };
    }

    onLoad() {
        if (AbilityDamageSystem._instance) {
            this.node.destroy();
            return;
        }
        AbilityDamageSystem._instance = this;

        this.initAbilityConfigs();
        this.registerBattleEvents();
    }

    /**
     * 初始化能力配置
     */
    private initAbilityConfigs(): void {
        // ========== 命中触发 ==========
        this.addAbilityConfig({
            id: 'ability_thunder_strike',
            name: '雷击',
            description: '命中时有20%概率造成额外雷属性伤害',
            triggerType: AbilityTriggerType.ON_HIT,
            triggerCondition: { chance: 0.2, cooldown: 0.5 },
            damageType: AbilityDamageType.PERCENT_ATK,
            baseDamage: 0.5,
            element: ElementType.THUNDER,
            effectColor: new Color(255, 220, 50)
        });

        this.addAbilityConfig({
            id: 'ability_burn',
            name: '灼烧',
            description: '命中时附加灼烧效果',
            triggerType: AbilityTriggerType.ON_HIT,
            triggerCondition: { chance: 0.15 },
            damageType: AbilityDamageType.DOT,
            baseDamage: 30,
            element: ElementType.FIRE,
            bonusEffects: [
                { type: 'burn', value: 30, duration: 5 }
            ],
            effectColor: new Color(255, 100, 50)
        });

        this.addAbilityConfig({
            id: 'ability_freeze_touch',
            name: '冰冻之触',
            description: '命中时有10%概率冻结敌人',
            triggerType: AbilityTriggerType.ON_HIT,
            triggerCondition: { chance: 0.1, cooldown: 3 },
            damageType: AbilityDamageType.FIXED,
            baseDamage: 50,
            element: ElementType.WATER,
            bonusEffects: [
                { type: 'freeze', value: 1, duration: 2 }
            ],
            effectColor: new Color(100, 200, 255)
        });

        // ========== 连击触发 ==========
        this.addAbilityConfig({
            id: 'ability_combo_blast',
            name: '连击爆发',
            description: '10连击后，下次攻击造成额外范围伤害',
            triggerType: AbilityTriggerType.ON_COMBO,
            triggerCondition: { minCombo: 10, cooldown: 5 },
            damageType: AbilityDamageType.AOE,
            baseDamage: 100,
            isAoe: true,
            aoeRadius: 100,
            maxTargets: 5,
            effectColor: new Color(255, 200, 100)
        });

        this.addAbilityConfig({
            id: 'ability_combo_surge',
            name: '连击涌动',
            description: '25连击时释放能量波',
            triggerType: AbilityTriggerType.ON_COMBO,
            triggerCondition: { minCombo: 25, cooldown: 8 },
            damageType: AbilityDamageType.PERCENT_ATK,
            baseDamage: 1.5,
            isAoe: true,
            aoeRadius: 150,
            maxTargets: 10,
            effectColor: new Color(150, 100, 255)
        });

        // ========== PF触发 ==========
        this.addAbilityConfig({
            id: 'ability_pf_shockwave',
            name: 'PF冲击波',
            description: 'Power Flip触发时释放冲击波',
            triggerType: AbilityTriggerType.ON_PF,
            triggerCondition: { minPFLevel: 1 },
            damageType: AbilityDamageType.AOE,
            baseDamage: 200,
            isAoe: true,
            aoeRadius: 120,
            effectColor: new Color(100, 255, 100)
        });

        this.addAbilityConfig({
            id: 'ability_pf_chain',
            name: 'PF连锁',
            description: 'PF Lv2以上触发时造成连锁闪电',
            triggerType: AbilityTriggerType.ON_PF,
            triggerCondition: { minPFLevel: 2 },
            damageType: AbilityDamageType.CHAIN,
            baseDamage: 80,
            chainTargets: 5,
            element: ElementType.THUNDER,
            effectColor: new Color(255, 255, 100)
        });

        // ========== 暴击触发 ==========
        this.addAbilityConfig({
            id: 'ability_crit_burst',
            name: '暴击爆发',
            description: '暴击时造成额外真实伤害',
            triggerType: AbilityTriggerType.ON_CRIT,
            triggerCondition: { cooldown: 1 },
            damageType: AbilityDamageType.TRUE_DAMAGE,
            baseDamage: 50,
            effectColor: new Color(255, 50, 50)
        });

        // ========== 击杀触发 ==========
        this.addAbilityConfig({
            id: 'ability_soul_harvest',
            name: '灵魂收割',
            description: '击杀敌人时对周围造成暗属性伤害',
            triggerType: AbilityTriggerType.ON_KILL,
            triggerCondition: {},
            damageType: AbilityDamageType.AOE,
            baseDamage: 150,
            element: ElementType.DARK,
            isAoe: true,
            aoeRadius: 80,
            maxTargets: 3,
            effectColor: new Color(100, 50, 150)
        });

        // ========== 状态触发 ==========
        this.addAbilityConfig({
            id: 'ability_paralysis_burst',
            name: '麻痹追击',
            description: '攻击麻痹状态敌人时造成额外伤害',
            triggerType: AbilityTriggerType.ON_STATUS,
            triggerCondition: { statusType: 'paralysis' },
            damageType: AbilityDamageType.PERCENT_ATK,
            baseDamage: 0.8,
            element: ElementType.THUNDER,
            effectColor: new Color(255, 255, 100)
        });

        this.addAbilityConfig({
            id: 'ability_burn_explosion',
            name: '燃烧爆炸',
            description: '攻击燃烧状态敌人时触发爆炸',
            triggerType: AbilityTriggerType.ON_STATUS,
            triggerCondition: { statusType: 'burn', chance: 0.3 },
            damageType: AbilityDamageType.AOE,
            baseDamage: 100,
            element: ElementType.FIRE,
            isAoe: true,
            aoeRadius: 60,
            effectColor: new Color(255, 150, 50)
        });

        // ========== Fever触发 ==========
        this.addAbilityConfig({
            id: 'ability_fever_aura',
            name: 'Fever光环',
            description: 'Fever期间每秒对周围造成伤害',
            triggerType: AbilityTriggerType.ON_FEVER,
            triggerCondition: { interval: 1 },
            damageType: AbilityDamageType.AOE,
            baseDamage: 50,
            element: ElementType.LIGHT,
            isAoe: true,
            aoeRadius: 100,
            maxTargets: 8,
            effectColor: new Color(255, 240, 200)
        });

        // ========== 周期触发 ==========
        this.addAbilityConfig({
            id: 'ability_poison_aura',
            name: '毒雾',
            description: '每2秒对周围敌人造成毒素伤害',
            triggerType: AbilityTriggerType.PERIODIC,
            triggerCondition: { interval: 2 },
            damageType: AbilityDamageType.DOT,
            baseDamage: 25,
            element: ElementType.WIND,
            isAoe: true,
            aoeRadius: 80,
            bonusEffects: [
                { type: 'poison', value: 20, duration: 3 }
            ],
            effectColor: new Color(100, 200, 50)
        });

        // ========== 冲刺触发 ==========
        this.addAbilityConfig({
            id: 'ability_dash_strike',
            name: '冲刺打击',
            description: '冲刺时对路径上的敌人造成伤害',
            triggerType: AbilityTriggerType.ON_DASH,
            triggerCondition: {},
            damageType: AbilityDamageType.PERCENT_ATK,
            baseDamage: 0.3,
            effectColor: new Color(200, 200, 255)
        });

        // ========== CHAIN触发 ==========
        this.addAbilityConfig({
            id: 'ability_chain_amplify',
            name: 'CHAIN增幅',
            description: 'CHAIN触发时对所有敌人造成额外伤害',
            triggerType: AbilityTriggerType.ON_CHAIN,
            triggerCondition: {},
            damageType: AbilityDamageType.AOE,
            baseDamage: 80,
            isAoe: true,
            aoeRadius: 200,
            maxTargets: 15,
            effectColor: new Color(255, 200, 255)
        });

        console.log(`能力配置初始化完成，共 ${this._abilityConfigs.size} 种能力`);
    }

    /**
     * 添加能力配置
     */
    private addAbilityConfig(config: AbilityConfig): void {
        this._abilityConfigs.set(config.id, config);
    }

    /**
     * 注册战斗事件
     */
    private registerBattleEvents(): void {
        const battleCore = BattleCoreSystem.instance;
        if (battleCore) {
            battleCore.events.on(BattleCoreSystem.EVENT_COMBO_CHANGED, this.onComboChanged, this);
            battleCore.events.on(BattleCoreSystem.EVENT_POWER_FLIP, this.onPowerFlip, this);
            battleCore.events.on(BattleCoreSystem.EVENT_FEVER_START, this.onFeverStart, this);
            battleCore.events.on(BattleCoreSystem.EVENT_FEVER_END, this.onFeverEnd, this);
            battleCore.events.on(BattleCoreSystem.EVENT_DASH, this.onDash, this);
        }
    }

    // ==================== 事件回调 ====================

    private onComboChanged(data: { count: number }): void {
        this.checkTrigger(AbilityTriggerType.ON_COMBO, { comboCount: data.count });
    }

    private onPowerFlip(data: { level: number }): void {
        this.checkTrigger(AbilityTriggerType.ON_PF, { pfLevel: data.level });
    }

    private _feverActive: boolean = false;

    private onFeverStart(): void {
        this._feverActive = true;
        this.checkTrigger(AbilityTriggerType.ON_FEVER, {});
    }

    private onFeverEnd(): void {
        this._feverActive = false;
    }

    private onDash(): void {
        this.checkTrigger(AbilityTriggerType.ON_DASH, {});
    }

    // ==================== 能力管理 ====================

    /**
     * 为角色添加能力
     */
    public addAbility(characterId: string, abilityId: string): boolean {
        const config = this._abilityConfigs.get(abilityId);
        if (!config) return false;

        if (!this._characterAbilities.has(characterId)) {
            this._characterAbilities.set(characterId, []);
        }

        const abilities = this._characterAbilities.get(characterId)!;
        
        // 检查是否已存在
        if (abilities.some(a => a.configId === abilityId)) {
            return false;
        }

        abilities.push({
            configId: abilityId,
            ownerId: characterId,
            cooldownTimer: 0,
            intervalTimer: 0,
            hitCount: 0,
            totalDamage: 0,
            isActive: true
        });

        console.log(`角色 ${characterId} 获得能力: ${config.name}`);
        return true;
    }

    /**
     * 移除角色能力
     */
    public removeAbility(characterId: string, abilityId: string): boolean {
        const abilities = this._characterAbilities.get(characterId);
        if (!abilities) return false;

        const index = abilities.findIndex(a => a.configId === abilityId);
        if (index === -1) return false;

        abilities.splice(index, 1);
        return true;
    }

    /**
     * 检查并触发能力
     */
    public checkTrigger(
        triggerType: AbilityTriggerType,
        context: {
            comboCount?: number;
            pfLevel?: number;
            targetStatus?: string;
            isCritical?: boolean;
            isKill?: boolean;
            targetPosition?: Vec3;
        }
    ): AbilityDamageResult[] {
        const results: AbilityDamageResult[] = [];

        for (const [characterId, abilities] of this._characterAbilities) {
            for (const instance of abilities) {
                if (!instance.isActive) continue;
                if (instance.cooldownTimer > 0) continue;

                const config = this._abilityConfigs.get(instance.configId);
                if (!config || config.triggerType !== triggerType) continue;

                // 检查触发条件
                if (!this.checkTriggerCondition(config, context)) continue;

                // 触发能力
                const result = this.executeAbility(characterId, instance, config, context);
                if (result) {
                    results.push(result);
                }
            }
        }

        return results;
    }

    /**
     * 检查触发条件
     */
    private checkTriggerCondition(
        config: AbilityConfig,
        context: any
    ): boolean {
        const condition = config.triggerCondition;
        if (!condition) return true;

        // 概率检查
        if (condition.chance !== undefined && Math.random() > condition.chance) {
            return false;
        }

        // 连击数检查
        if (condition.minCombo !== undefined && 
            (context.comboCount === undefined || context.comboCount < condition.minCombo)) {
            return false;
        }

        // PF等级检查
        if (condition.minPFLevel !== undefined &&
            (context.pfLevel === undefined || context.pfLevel < condition.minPFLevel)) {
            return false;
        }

        // 状态检查
        if (condition.statusType !== undefined &&
            context.targetStatus !== condition.statusType) {
            return false;
        }

        return true;
    }

    /**
     * 执行能力
     */
    private executeAbility(
        characterId: string,
        instance: AbilityInstance,
        config: AbilityConfig,
        context: any
    ): AbilityDamageResult | null {
        // 计算伤害
        let damage = this.calculateAbilityDamage(config, characterId);

        // 应用战斗核心加成
        damage = BattleCoreSystem.instance?.calculateFinalDamage(
            damage,
            DamageSystemType.DIRECT_HIT,
            false
        ) || damage;

        // 设置冷却
        if (config.triggerCondition?.cooldown) {
            instance.cooldownTimer = config.triggerCondition.cooldown;
        }

        // 更新统计
        instance.hitCount++;
        instance.totalDamage += damage;
        this._stats.totalTriggers++;
        this._stats.totalDamage += damage;

        // 创建结果
        const result: AbilityDamageResult = {
            abilityId: config.id,
            damage,
            targets: [],
            isCritical: false,
            element: config.element,
            bonusEffects: config.bonusEffects || []
        };

        // 播放视觉效果
        this.playAbilityEffect(config, context.targetPosition);

        // 发送事件
        this.events.emit(AbilityDamageSystem.EVENT_ABILITY_TRIGGERED, {
            characterId,
            config,
            result
        });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.ABILITY_TRIGGER);

        console.log(`能力触发: ${config.name}, 伤害: ${damage.toFixed(0)}`);

        // 处理连锁伤害
        if (config.damageType === AbilityDamageType.CHAIN && config.chainTargets) {
            this.executeChainDamage(config, damage, config.chainTargets);
            this._stats.totalChainHits += config.chainTargets;
        }

        return result;
    }

    /**
     * 计算能力伤害
     */
    private calculateAbilityDamage(config: AbilityConfig, characterId: string): number {
        let damage = config.baseDamage;

        // TODO: 从角色系统获取实际属性
        const baseAttack = 500;
        const baseHp = 5000;
        const baseDef = 200;

        switch (config.damageType) {
            case AbilityDamageType.FIXED:
                // 固定伤害
                break;
            case AbilityDamageType.PERCENT_ATK:
                damage = baseAttack * config.baseDamage;
                break;
            case AbilityDamageType.PERCENT_HP:
                damage = baseHp * config.baseDamage;
                break;
            case AbilityDamageType.PERCENT_DEF:
                damage = baseDef * config.baseDamage;
                break;
            case AbilityDamageType.TRUE_DAMAGE:
                // 真实伤害不受减免
                break;
            case AbilityDamageType.DOT:
            case AbilityDamageType.AOE:
            case AbilityDamageType.CHAIN:
                // 使用基础伤害
                break;
        }

        // 应用特性加成
        const traitSystem = TraitSystem.instance;
        if (traitSystem) {
            const modifiers = traitSystem.calculateDamageModifiers(
                characterId,
                TraitTrigger.ON_HIT
            );
            damage *= modifiers.damageMultiplier;
        }

        return damage;
    }

    /**
     * 执行连锁伤害
     */
    private executeChainDamage(config: AbilityConfig, baseDamage: number, targets: number): void {
        let currentDamage = baseDamage;
        const damageDecay = 0.85; // 每次连锁伤害衰减15%

        for (let i = 0; i < targets; i++) {
            // 连锁伤害逐渐衰减
            currentDamage *= damageDecay;

            this.events.emit(AbilityDamageSystem.EVENT_ABILITY_CHAIN, {
                chainIndex: i + 1,
                damage: currentDamage,
                element: config.element
            });
        }

        console.log(`连锁伤害: ${targets}次, 总伤害: ${(baseDamage * (1 - Math.pow(damageDecay, targets)) / (1 - damageDecay)).toFixed(0)}`);
    }

    /**
     * 播放能力视觉效果
     */
    private playAbilityEffect(config: AbilityConfig, position?: Vec3): void {
        const renderer = SkillEffectRenderer.instance;
        if (!renderer) return;

        const color = config.effectColor || new Color(255, 255, 255);
        const scale = config.effectScale || 1.0;

        // 根据能力类型播放不同效果
        switch (config.damageType) {
            case AbilityDamageType.AOE:
                renderer.playScreenFlash(color, 0.2);
                if (config.aoeRadius) {
                    // TODO: 在指定位置播放范围效果
                }
                break;
            case AbilityDamageType.CHAIN:
                renderer.playScreenFlash(color, 0.15);
                break;
            case AbilityDamageType.TRUE_DAMAGE:
                renderer.playScreenShake(5, 0.2);
                break;
            case AbilityDamageType.DOT:
                // DOT效果较轻微
                break;
            default:
                renderer.playScreenFlash(color, 0.1);
                break;
        }
    }

    // ==================== 外部触发接口 ====================

    /**
     * 命中触发
     */
    public onHit(
        characterId: string,
        targetId: string,
        targetPosition: Vec3,
        isCritical: boolean = false,
        targetStatus?: string
    ): AbilityDamageResult[] {
        const results = this.checkTrigger(AbilityTriggerType.ON_HIT, {
            targetPosition,
            isCritical,
            targetStatus
        });

        // 暴击触发
        if (isCritical) {
            const critResults = this.checkTrigger(AbilityTriggerType.ON_CRIT, {
                targetPosition
            });
            results.push(...critResults);
        }

        // 状态触发
        if (targetStatus) {
            const statusResults = this.checkTrigger(AbilityTriggerType.ON_STATUS, {
                targetStatus,
                targetPosition
            });
            results.push(...statusResults);
        }

        return results;
    }

    /**
     * 击杀触发
     */
    public onKill(characterId: string, targetPosition: Vec3): AbilityDamageResult[] {
        return this.checkTrigger(AbilityTriggerType.ON_KILL, {
            targetPosition,
            isKill: true
        });
    }

    /**
     * CHAIN触发
     */
    public onChainTriggered(): AbilityDamageResult[] {
        return this.checkTrigger(AbilityTriggerType.ON_CHAIN, {});
    }

    // ==================== 更新循环 ====================

    update(dt: number) {
        // 更新冷却
        for (const abilities of this._characterAbilities.values()) {
            for (const instance of abilities) {
                if (instance.cooldownTimer > 0) {
                    instance.cooldownTimer -= dt;
                }

                // 周期触发
                const config = this._abilityConfigs.get(instance.configId);
                if (config?.triggerType === AbilityTriggerType.PERIODIC &&
                    config.triggerCondition?.interval) {
                    instance.intervalTimer += dt;
                    if (instance.intervalTimer >= config.triggerCondition.interval) {
                        instance.intervalTimer = 0;
                        this.executeAbility(instance.ownerId, instance, config, {});
                    }
                }

                // Fever期间周期触发
                if (this._feverActive &&
                    config?.triggerType === AbilityTriggerType.ON_FEVER &&
                    config.triggerCondition?.interval) {
                    instance.intervalTimer += dt;
                    if (instance.intervalTimer >= config.triggerCondition.interval) {
                        instance.intervalTimer = 0;
                        this.executeAbility(instance.ownerId, instance, config, {});
                    }
                }
            }
        }
    }

    // ==================== 查询方法 ====================

    /**
     * 获取能力配置
     */
    public getAbilityConfig(abilityId: string): AbilityConfig | undefined {
        return this._abilityConfigs.get(abilityId);
    }

    /**
     * 获取角色所有能力
     */
    public getCharacterAbilities(characterId: string): AbilityInstance[] {
        return this._characterAbilities.get(characterId) || [];
    }

    /**
     * 获取所有能力配置
     */
    public getAllAbilityConfigs(): AbilityConfig[] {
        return Array.from(this._abilityConfigs.values());
    }

    /**
     * 重置统计
     */
    public resetStats(): void {
        this._stats = {
            totalTriggers: 0,
            totalDamage: 0,
            totalChainHits: 0
        };
    }

    /**
     * 重置系统
     */
    public reset(): void {
        this._characterAbilities.clear();
        this._globalCooldowns.clear();
        this.resetStats();
    }

    onDestroy() {
        // 取消事件监听
        const battleCore = BattleCoreSystem.instance;
        if (battleCore) {
            battleCore.events.off(BattleCoreSystem.EVENT_COMBO_CHANGED, this.onComboChanged, this);
            battleCore.events.off(BattleCoreSystem.EVENT_POWER_FLIP, this.onPowerFlip, this);
            battleCore.events.off(BattleCoreSystem.EVENT_FEVER_START, this.onFeverStart, this);
            battleCore.events.off(BattleCoreSystem.EVENT_FEVER_END, this.onFeverEnd, this);
            battleCore.events.off(BattleCoreSystem.EVENT_DASH, this.onDash, this);
        }

        this.reset();

        if (AbilityDamageSystem._instance === this) {
            AbilityDamageSystem._instance = null;
        }
    }
}
