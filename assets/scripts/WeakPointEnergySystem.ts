import { _decorator, Component, Node, Vec2, Vec3, EventTarget, Color, tween } from 'cc';
import { ElementType } from './CharacterData';
import { BattleCoreSystem } from './BattleCoreSystem';
import { SkillEffectRenderer } from './SkillEffectRenderer';
import { DamageSystem } from './DamageSystem';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 弱点类型
 */
export enum WeakPointType {
    NORMAL = 'normal',              // 普通弱点
    ELEMENT = 'element',            // 属性弱点
    CRITICAL = 'critical',          // 致命弱点
    TIMED = 'timed',                // 限时弱点
    PHASE = 'phase'                 // 阶段弱点
}

/**
 * 弱点状态
 */
export enum WeakPointState {
    HIDDEN = 'hidden',              // 隐藏
    EXPOSED = 'exposed',            // 暴露
    DAMAGED = 'damaged',            // 受损
    BROKEN = 'broken'               // 击破
}

/**
 * 弱点配置
 */
export interface WeakPointConfig {
    id: string;
    type: WeakPointType;
    position: Vec2;                 // 相对位置
    size: number;                   // 大小
    
    // 生命值
    hp: number;
    maxHp: number;
    
    // 伤害加成
    damageMultiplier: number;       // 命中弱点的伤害倍率
    
    // 属性弱点
    weakElement?: ElementType;      // 弱点属性（该属性伤害额外增加）
    elementBonus?: number;          // 属性额外倍率
    
    // 击破效果
    breakStunDuration: number;      // 击破眩晕时间
    breakBonusDamage: number;       // 击破额外伤害
    breakEnergyReward: number;      // 击破能量奖励
    
    // 限时弱点
    exposeDuration?: number;        // 暴露持续时间
    exposeInterval?: number;        // 暴露间隔
    
    // 视觉
    glowColor?: Color;
}

/**
 * 弱点实例
 */
export interface WeakPointInstance {
    configId: string;
    ownerId: string;                // 所属敌人ID
    state: WeakPointState;
    currentHp: number;
    exposedTimer: number;           // 暴露计时
    hiddenTimer: number;            // 隐藏计时
    hitCount: number;               // 被命中次数
    node: Node | null;
}

/**
 * 能量获取来源
 */
export enum EnergySource {
    HIT = 'hit',                    // 弹射撞击
    COMBO = 'combo',                // 连击
    KILL = 'kill',                  // 击杀
    WEAK_POINT = 'weak_point',      // 弱点命中
    WEAK_BREAK = 'weak_break',      // 弱点击破
    PASSIVE = 'passive',            // 被动技能
    TIME = 'time',                  // 时间回复
    ITEM = 'item',                  // 道具
    DASH = 'dash',                  // 冲刺
    PF = 'pf'                       // Power Flip
}

/**
 * 能量获取配置
 */
export interface EnergyGainConfig {
    source: EnergySource;
    baseAmount: number;             // 基础获取量
    multiplier: number;             // 倍率
    cooldown?: number;              // 冷却时间
    maxPerSecond?: number;          // 每秒最大获取量
    conditions?: {
        minCombo?: number;          // 最小连击数
        element?: ElementType;      // 属性要求
        targetType?: string;        // 目标类型
    };
}

/**
 * 能量获取记录
 */
export interface EnergyGainRecord {
    source: EnergySource;
    amount: number;
    timestamp: number;
}

/**
 * 弱点与能量系统 - 管理弱点机制和能量获取
 * Weak Point & Energy System - Weak point mechanics and energy gain
 */
@ccclass('WeakPointEnergySystem')
export class WeakPointEnergySystem extends Component {
    private static _instance: WeakPointEnergySystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_WEAK_POINT_HIT = 'weak-point-hit';
    public static readonly EVENT_WEAK_POINT_BROKEN = 'weak-point-broken';
    public static readonly EVENT_WEAK_POINT_EXPOSED = 'weak-point-exposed';
    public static readonly EVENT_WEAK_POINT_HIDDEN = 'weak-point-hidden';
    public static readonly EVENT_ENERGY_GAINED = 'energy-gained';
    public static readonly EVENT_SKILL_READY = 'skill-ready';

    // 弱点实例
    private _weakPoints: Map<string, WeakPointInstance> = new Map();

    // 弱点配置模板
    private _weakPointTemplates: Map<string, WeakPointConfig> = new Map();

    // 能量获取配置
    private _energyGainConfigs: Map<EnergySource, EnergyGainConfig> = new Map();

    // 能量获取记录（用于统计和限制）
    private _energyGainHistory: EnergyGainRecord[] = [];
    private readonly HISTORY_MAX_SIZE = 100;

    // 能量获取冷却
    private _energyCooldowns: Map<EnergySource, number> = new Map();

    // 每秒能量获取追踪
    private _energyPerSecond: Map<EnergySource, number> = new Map();
    private _lastSecondTimestamp: number = 0;

    // 统计
    private _stats = {
        totalWeakPointHits: 0,
        totalWeakPointBreaks: 0,
        totalEnergyGained: 0,
        energyBySource: new Map<EnergySource, number>()
    };

    public static get instance(): WeakPointEnergySystem | null {
        return WeakPointEnergySystem._instance;
    }

    public get stats() {
        return {
            totalWeakPointHits: this._stats.totalWeakPointHits,
            totalWeakPointBreaks: this._stats.totalWeakPointBreaks,
            totalEnergyGained: this._stats.totalEnergyGained,
            energyBySource: Object.fromEntries(this._stats.energyBySource)
        };
    }

    onLoad() {
        if (WeakPointEnergySystem._instance) {
            this.node.destroy();
            return;
        }
        WeakPointEnergySystem._instance = this;

        this.initWeakPointTemplates();
        this.initEnergyGainConfigs();
        this.registerBattleEvents();
    }

    /**
     * 初始化弱点模板
     */
    private initWeakPointTemplates(): void {
        // 普通弱点
        this._weakPointTemplates.set('normal_weak', {
            id: 'normal_weak',
            type: WeakPointType.NORMAL,
            position: new Vec2(0, 50),
            size: 30,
            hp: 100,
            maxHp: 100,
            damageMultiplier: 1.5,
            breakStunDuration: 2,
            breakBonusDamage: 200,
            breakEnergyReward: 20,
            glowColor: new Color(255, 200, 50)
        });

        // 属性弱点 - 火
        this._weakPointTemplates.set('fire_weak', {
            id: 'fire_weak',
            type: WeakPointType.ELEMENT,
            position: new Vec2(0, 50),
            size: 35,
            hp: 150,
            maxHp: 150,
            damageMultiplier: 1.3,
            weakElement: ElementType.WATER,
            elementBonus: 2.0,
            breakStunDuration: 3,
            breakBonusDamage: 300,
            breakEnergyReward: 25,
            glowColor: new Color(255, 100, 50)
        });

        // 致命弱点
        this._weakPointTemplates.set('critical_weak', {
            id: 'critical_weak',
            type: WeakPointType.CRITICAL,
            position: new Vec2(0, 80),
            size: 20,
            hp: 50,
            maxHp: 50,
            damageMultiplier: 3.0,
            breakStunDuration: 5,
            breakBonusDamage: 500,
            breakEnergyReward: 50,
            glowColor: new Color(255, 50, 50)
        });

        // 限时弱点
        this._weakPointTemplates.set('timed_weak', {
            id: 'timed_weak',
            type: WeakPointType.TIMED,
            position: new Vec2(0, 60),
            size: 40,
            hp: 80,
            maxHp: 80,
            damageMultiplier: 2.0,
            breakStunDuration: 2.5,
            breakBonusDamage: 350,
            breakEnergyReward: 30,
            exposeDuration: 5,
            exposeInterval: 10,
            glowColor: new Color(200, 150, 255)
        });

        // 阶段弱点（Boss用）
        this._weakPointTemplates.set('phase_weak', {
            id: 'phase_weak',
            type: WeakPointType.PHASE,
            position: new Vec2(0, 100),
            size: 50,
            hp: 300,
            maxHp: 300,
            damageMultiplier: 1.8,
            breakStunDuration: 4,
            breakBonusDamage: 800,
            breakEnergyReward: 100,
            glowColor: new Color(255, 255, 100)
        });

        console.log(`弱点模板初始化完成，共 ${this._weakPointTemplates.size} 种`);
    }

    /**
     * 初始化能量获取配置
     */
    private initEnergyGainConfigs(): void {
        // 弹射撞击
        this._energyGainConfigs.set(EnergySource.HIT, {
            source: EnergySource.HIT,
            baseAmount: 2,
            multiplier: 1.0,
            maxPerSecond: 20
        });

        // 连击
        this._energyGainConfigs.set(EnergySource.COMBO, {
            source: EnergySource.COMBO,
            baseAmount: 1,
            multiplier: 1.0,
            conditions: { minCombo: 5 }
        });

        // 击杀
        this._energyGainConfigs.set(EnergySource.KILL, {
            source: EnergySource.KILL,
            baseAmount: 10,
            multiplier: 1.0
        });

        // 弱点命中
        this._energyGainConfigs.set(EnergySource.WEAK_POINT, {
            source: EnergySource.WEAK_POINT,
            baseAmount: 5,
            multiplier: 1.5
        });

        // 弱点击破
        this._energyGainConfigs.set(EnergySource.WEAK_BREAK, {
            source: EnergySource.WEAK_BREAK,
            baseAmount: 30,
            multiplier: 1.0
        });

        // 被动技能（如礼黑开局满能）
        this._energyGainConfigs.set(EnergySource.PASSIVE, {
            source: EnergySource.PASSIVE,
            baseAmount: 100,
            multiplier: 1.0
        });

        // 时间回复
        this._energyGainConfigs.set(EnergySource.TIME, {
            source: EnergySource.TIME,
            baseAmount: 1,
            multiplier: 1.0,
            cooldown: 1  // 每秒1点
        });

        // 冲刺
        this._energyGainConfigs.set(EnergySource.DASH, {
            source: EnergySource.DASH,
            baseAmount: 3,
            multiplier: 1.0,
            cooldown: 0.5
        });

        // Power Flip
        this._energyGainConfigs.set(EnergySource.PF, {
            source: EnergySource.PF,
            baseAmount: 15,
            multiplier: 1.0
        });

        console.log(`能量获取配置初始化完成，共 ${this._energyGainConfigs.size} 种来源`);
    }

    /**
     * 注册战斗事件
     */
    private registerBattleEvents(): void {
        const battleCore = BattleCoreSystem.instance;
        if (battleCore) {
            battleCore.events.on(BattleCoreSystem.EVENT_COMBO_CHANGED, this.onComboChanged, this);
            battleCore.events.on(BattleCoreSystem.EVENT_POWER_FLIP, this.onPowerFlip, this);
            battleCore.events.on(BattleCoreSystem.EVENT_DASH, this.onDash, this);
        }
    }

    // ==================== 弱点管理 ====================

    /**
     * 创建弱点
     */
    public createWeakPoint(
        ownerId: string,
        templateId: string,
        customConfig?: Partial<WeakPointConfig>
    ): WeakPointInstance | null {
        const template = this._weakPointTemplates.get(templateId);
        if (!template) {
            console.log(`弱点模板不存在: ${templateId}`);
            return null;
        }

        const config: WeakPointConfig = { ...template, ...customConfig };
        const instanceId = `wp_${ownerId}_${Date.now()}`;

        const instance: WeakPointInstance = {
            configId: config.id,
            ownerId,
            state: config.type === WeakPointType.TIMED ? WeakPointState.HIDDEN : WeakPointState.EXPOSED,
            currentHp: config.hp,
            exposedTimer: config.exposeDuration || 0,
            hiddenTimer: 0,
            hitCount: 0,
            node: null
        };

        // 创建视觉节点
        instance.node = this.createWeakPointNode(config);

        this._weakPoints.set(instanceId, instance);

        console.log(`创建弱点: ${templateId} (所属: ${ownerId})`);
        return instance;
    }

    /**
     * 创建弱点视觉节点
     */
    private createWeakPointNode(config: WeakPointConfig): Node {
        const node = new Node('WeakPoint');
        
        const { Graphics } = require('cc');
        const graphics = node.addComponent(Graphics);
        
        const color = config.glowColor || new Color(255, 200, 50);
        const radius = config.size;

        // 外圈发光
        graphics.fillColor = new Color(color.r, color.g, color.b, 100);
        graphics.circle(0, 0, radius * 1.3);
        graphics.fill();

        // 主体
        graphics.fillColor = color;
        graphics.circle(0, 0, radius);
        graphics.fill();

        // 内圈高光
        graphics.fillColor = new Color(255, 255, 255, 180);
        graphics.circle(-radius * 0.2, radius * 0.2, radius * 0.3);
        graphics.fill();

        // 脉冲动画
        tween(node)
            .repeatForever(
                tween()
                    .to(0.5, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineInOut' })
                    .to(0.5, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'sineInOut' })
            )
            .start();

        return node;
    }

    /**
     * 命中弱点
     */
    public hitWeakPoint(
        instanceId: string,
        damage: number,
        element?: ElementType
    ): {
        success: boolean;
        finalDamage: number;
        isBroken: boolean;
        stunDuration: number;
        energyReward: number;
    } {
        const instance = this._weakPoints.get(instanceId);
        if (!instance || instance.state !== WeakPointState.EXPOSED) {
            return { success: false, finalDamage: 0, isBroken: false, stunDuration: 0, energyReward: 0 };
        }

        const template = this._weakPointTemplates.get(instance.configId);
        if (!template) {
            return { success: false, finalDamage: 0, isBroken: false, stunDuration: 0, energyReward: 0 };
        }

        // 计算最终伤害
        let finalDamage = damage * template.damageMultiplier;

        // 属性加成
        if (template.weakElement && element === template.weakElement && template.elementBonus) {
            finalDamage *= template.elementBonus;
        }

        // 扣除弱点生命
        instance.currentHp -= finalDamage;
        instance.hitCount++;
        this._stats.totalWeakPointHits++;

        // 获取弱点命中能量
        this.gainEnergy(EnergySource.WEAK_POINT, template.damageMultiplier);

        // 发送命中事件
        this.events.emit(WeakPointEnergySystem.EVENT_WEAK_POINT_HIT, {
            instanceId,
            damage: finalDamage,
            remainingHp: Math.max(0, instance.currentHp)
        });

        // 播放命中效果
        this.playWeakPointHitEffect(template);

        // 检查是否击破
        let isBroken = false;
        let stunDuration = 0;
        let energyReward = 0;

        if (instance.currentHp <= 0) {
            isBroken = true;
            stunDuration = template.breakStunDuration;
            energyReward = template.breakEnergyReward;

            this.breakWeakPoint(instanceId);
        }

        return {
            success: true,
            finalDamage,
            isBroken,
            stunDuration,
            energyReward
        };
    }

    /**
     * 击破弱点
     */
    private breakWeakPoint(instanceId: string): void {
        const instance = this._weakPoints.get(instanceId);
        if (!instance) return;

        const template = this._weakPointTemplates.get(instance.configId);
        if (!template) return;

        instance.state = WeakPointState.BROKEN;
        this._stats.totalWeakPointBreaks++;

        // 获取击破能量奖励
        this.gainEnergy(EnergySource.WEAK_BREAK, template.breakEnergyReward / 30);

        // 发送击破事件
        this.events.emit(WeakPointEnergySystem.EVENT_WEAK_POINT_BROKEN, {
            instanceId,
            ownerId: instance.ownerId,
            stunDuration: template.breakStunDuration,
            bonusDamage: template.breakBonusDamage,
            energyReward: template.breakEnergyReward
        });

        // 播放击破效果
        this.playWeakPointBreakEffect(template);

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.WEAK_POINT_BREAK);

        console.log(`弱点击破！眩晕: ${template.breakStunDuration}s, 额外伤害: ${template.breakBonusDamage}, 能量: ${template.breakEnergyReward}`);

        // 延迟销毁视觉节点
        if (instance.node) {
            tween(instance.node)
                .to(0.3, { scale: new Vec3(2, 2, 1), opacity: 0 })
                .call(() => {
                    instance.node?.destroy();
                    instance.node = null;
                })
                .start();
        }
    }

    /**
     * 播放弱点命中效果
     */
    private playWeakPointHitEffect(config: WeakPointConfig): void {
        const color = config.glowColor || new Color(255, 200, 50);
        SkillEffectRenderer.instance?.playScreenFlash(color, 0.15);
        AudioManager.instance?.playSFX(SFXType.WEAK_POINT_HIT);
    }

    /**
     * 播放弱点击破效果
     */
    private playWeakPointBreakEffect(config: WeakPointConfig): void {
        const color = config.glowColor || new Color(255, 200, 50);
        SkillEffectRenderer.instance?.playScreenFlash(color, 0.4);
        SkillEffectRenderer.instance?.playScreenShake(10, 0.5);
    }

    /**
     * 暴露弱点
     */
    public exposeWeakPoint(instanceId: string): void {
        const instance = this._weakPoints.get(instanceId);
        if (!instance || instance.state !== WeakPointState.HIDDEN) return;

        const template = this._weakPointTemplates.get(instance.configId);
        
        instance.state = WeakPointState.EXPOSED;
        instance.exposedTimer = template?.exposeDuration || 5;

        // 显示节点
        if (instance.node) {
            instance.node.active = true;
            tween(instance.node)
                .from({ scale: new Vec3(0, 0, 1), opacity: 0 })
                .to(0.3, { scale: new Vec3(1, 1, 1), opacity: 255 })
                .start();
        }

        this.events.emit(WeakPointEnergySystem.EVENT_WEAK_POINT_EXPOSED, { instanceId });
        console.log('弱点暴露！');
    }

    /**
     * 隐藏弱点
     */
    public hideWeakPoint(instanceId: string): void {
        const instance = this._weakPoints.get(instanceId);
        if (!instance || instance.state !== WeakPointState.EXPOSED) return;

        const template = this._weakPointTemplates.get(instance.configId);

        instance.state = WeakPointState.HIDDEN;
        instance.hiddenTimer = template?.exposeInterval || 10;
        instance.currentHp = template?.maxHp || instance.currentHp;  // 恢复生命

        // 隐藏节点
        if (instance.node) {
            tween(instance.node)
                .to(0.3, { scale: new Vec3(0, 0, 1), opacity: 0 })
                .call(() => {
                    if (instance.node) instance.node.active = false;
                })
                .start();
        }

        this.events.emit(WeakPointEnergySystem.EVENT_WEAK_POINT_HIDDEN, { instanceId });
        console.log('弱点隐藏');
    }

    /**
     * 移除弱点
     */
    public removeWeakPoint(instanceId: string): void {
        const instance = this._weakPoints.get(instanceId);
        if (instance?.node) {
            instance.node.destroy();
        }
        this._weakPoints.delete(instanceId);
    }

    // ==================== 能量获取 ====================

    /**
     * 获取能量
     */
    public gainEnergy(source: EnergySource, multiplier: number = 1.0): number {
        const config = this._energyGainConfigs.get(source);
        if (!config) return 0;

        // 检查冷却
        const cooldown = this._energyCooldowns.get(source) || 0;
        if (cooldown > 0) return 0;

        // 检查每秒限制
        if (config.maxPerSecond) {
            const currentPerSecond = this._energyPerSecond.get(source) || 0;
            if (currentPerSecond >= config.maxPerSecond) return 0;
        }

        // 计算能量获取量
        let amount = config.baseAmount * config.multiplier * multiplier;

        // Fever期间能量获取+30%~50%
        if (BattleCoreSystem.instance?.isFeverActive()) {
            amount *= 1.3;
        }

        // 应用到战斗核心系统
        BattleCoreSystem.instance?.addEnergy(amount);

        // 设置冷却
        if (config.cooldown) {
            this._energyCooldowns.set(source, config.cooldown);
        }

        // 更新每秒获取
        this._energyPerSecond.set(source, (this._energyPerSecond.get(source) || 0) + amount);

        // 记录
        this._energyGainHistory.push({
            source,
            amount,
            timestamp: Date.now()
        });

        // 限制历史记录大小
        if (this._energyGainHistory.length > this.HISTORY_MAX_SIZE) {
            this._energyGainHistory.shift();
        }

        // 更新统计
        this._stats.totalEnergyGained += amount;
        this._stats.energyBySource.set(source, 
            (this._stats.energyBySource.get(source) || 0) + amount
        );

        // 发送事件
        this.events.emit(WeakPointEnergySystem.EVENT_ENERGY_GAINED, {
            source,
            amount,
            total: BattleCoreSystem.instance?.getEnergyPercent() || 0
        });

        // 检查技能是否准备就绪
        if (BattleCoreSystem.instance?.canCastSkill()) {
            this.events.emit(WeakPointEnergySystem.EVENT_SKILL_READY);
        }

        return amount;
    }

    /**
     * 被动技能能量（如开局满能）
     */
    public gainPassiveEnergy(amount: number = 100): void {
        // 直接设置能量（用于开局满能等特殊效果）
        for (let i = 0; i < amount; i += 10) {
            BattleCoreSystem.instance?.addEnergy(10);
        }
        
        this._stats.totalEnergyGained += amount;
        this._stats.energyBySource.set(EnergySource.PASSIVE,
            (this._stats.energyBySource.get(EnergySource.PASSIVE) || 0) + amount
        );

        console.log(`被动能量获取: ${amount}`);
    }

    // ==================== 事件回调 ====================

    private onComboChanged(data: { count: number }): void {
        const config = this._energyGainConfigs.get(EnergySource.COMBO);
        if (config?.conditions?.minCombo && data.count >= config.conditions.minCombo) {
            // 每增加N连击获得能量
            if (data.count % 5 === 0) {
                this.gainEnergy(EnergySource.COMBO);
            }
        }
    }

    private onPowerFlip(data: { level: number }): void {
        this.gainEnergy(EnergySource.PF, data.level);
    }

    private onDash(): void {
        this.gainEnergy(EnergySource.DASH);
    }

    // ==================== 外部接口 ====================

    /**
     * 弹射命中回调
     */
    public onBallHit(targetId: string, damage: number, element?: ElementType): void {
        // 获取命中能量
        this.gainEnergy(EnergySource.HIT);

        // 检查是否命中弱点
        for (const [instanceId, instance] of this._weakPoints) {
            if (instance.ownerId === targetId && instance.state === WeakPointState.EXPOSED) {
                this.hitWeakPoint(instanceId, damage, element);
                break;
            }
        }
    }

    /**
     * 击杀回调
     */
    public onEnemyKilled(enemyId: string): void {
        this.gainEnergy(EnergySource.KILL);

        // 移除该敌人的所有弱点
        for (const [instanceId, instance] of this._weakPoints) {
            if (instance.ownerId === enemyId) {
                this.removeWeakPoint(instanceId);
            }
        }
    }

    // ==================== 更新循环 ====================

    update(dt: number) {
        // 更新能量冷却
        for (const [source, cooldown] of this._energyCooldowns) {
            if (cooldown > 0) {
                this._energyCooldowns.set(source, cooldown - dt);
            }
        }

        // 每秒重置获取量统计
        const now = Date.now();
        if (now - this._lastSecondTimestamp >= 1000) {
            this._energyPerSecond.clear();
            this._lastSecondTimestamp = now;

            // 时间回复能量
            this.gainEnergy(EnergySource.TIME);
        }

        // 更新限时弱点
        for (const [instanceId, instance] of this._weakPoints) {
            const template = this._weakPointTemplates.get(instance.configId);
            if (!template || template.type !== WeakPointType.TIMED) continue;

            if (instance.state === WeakPointState.EXPOSED) {
                instance.exposedTimer -= dt;
                if (instance.exposedTimer <= 0) {
                    this.hideWeakPoint(instanceId);
                }
            } else if (instance.state === WeakPointState.HIDDEN) {
                instance.hiddenTimer -= dt;
                if (instance.hiddenTimer <= 0) {
                    this.exposeWeakPoint(instanceId);
                }
            }
        }
    }

    // ==================== 查询方法 ====================

    /**
     * 获取弱点实例
     */
    public getWeakPoint(instanceId: string): WeakPointInstance | undefined {
        return this._weakPoints.get(instanceId);
    }

    /**
     * 获取敌人的所有弱点
     */
    public getEnemyWeakPoints(ownerId: string): WeakPointInstance[] {
        return Array.from(this._weakPoints.values()).filter(wp => wp.ownerId === ownerId);
    }

    /**
     * 获取所有暴露的弱点
     */
    public getExposedWeakPoints(): WeakPointInstance[] {
        return Array.from(this._weakPoints.values()).filter(wp => wp.state === WeakPointState.EXPOSED);
    }

    /**
     * 获取能量获取历史
     */
    public getEnergyGainHistory(): EnergyGainRecord[] {
        return [...this._energyGainHistory];
    }

    /**
     * 重置统计
     */
    public resetStats(): void {
        this._stats = {
            totalWeakPointHits: 0,
            totalWeakPointBreaks: 0,
            totalEnergyGained: 0,
            energyBySource: new Map()
        };
    }

    /**
     * 重置系统
     */
    public reset(): void {
        // 清理所有弱点
        for (const instance of this._weakPoints.values()) {
            if (instance.node) {
                instance.node.destroy();
            }
        }
        this._weakPoints.clear();

        this._energyGainHistory = [];
        this._energyCooldowns.clear();
        this._energyPerSecond.clear();
        this.resetStats();
    }

    onDestroy() {
        // 取消事件监听
        const battleCore = BattleCoreSystem.instance;
        if (battleCore) {
            battleCore.events.off(BattleCoreSystem.EVENT_COMBO_CHANGED, this.onComboChanged, this);
            battleCore.events.off(BattleCoreSystem.EVENT_POWER_FLIP, this.onPowerFlip, this);
            battleCore.events.off(BattleCoreSystem.EVENT_DASH, this.onDash, this);
        }

        this.reset();

        if (WeakPointEnergySystem._instance === this) {
            WeakPointEnergySystem._instance = null;
        }
    }
}
