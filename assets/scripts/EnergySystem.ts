import { _decorator, Component, sys, EventTarget } from 'cc';
import { FormationSystem, FormationData, MainSlotData } from './FormationSystem';
import { SkillDatabase, SkillConfig } from './SkillData';
import { CharacterDatabase, ElementType } from './CharacterData';
import { BattleCoreSystem } from './BattleCoreSystem';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 能量获取来源（详细分类）
 */
export enum EnergySourceType {
    // 基础回能
    BOUNCE_HIT = 'bounce_hit',              // 弹射撞击（基础）
    COMBO_BONUS = 'combo_bonus',            // 连击奖励（每10连击）
    
    // 击杀回能
    KILL_NORMAL = 'kill_normal',            // 击杀普通怪
    KILL_ELITE = 'kill_elite',              // 击杀精英怪
    KILL_BOSS = 'kill_boss',                // 击杀Boss
    
    // 特殊回能
    WEAK_POINT_HIT = 'weak_point_hit',      // 弱点命中
    WEAK_POINT_BREAK = 'weak_point_break',  // 弱点击破
    DASH_HIT = 'dash_hit',                  // 冲刺命中
    PF_TRIGGER = 'pf_trigger',              // PF触发
    
    // 被动回能
    PASSIVE_START = 'passive_start',        // 开局被动（如礼黑）
    PASSIVE_KILL = 'passive_kill',          // 击杀被动
    PASSIVE_TIME = 'passive_time',          // 时间被动
    PASSIVE_COMBO = 'passive_combo',        // 连击被动
    
    // 其他
    ITEM = 'item',                          // 道具
    ASSIST = 'assist',                      // 协力/助战
    CHAIN = 'chain'                         // CHAIN触发
}

/**
 * 能量获取效率等级
 */
export enum EnergyEfficiency {
    LOW = 'low',            // 低效（基础回能）
    MEDIUM = 'medium',      // 中效（连击/冲刺）
    HIGH = 'high',          // 高效（击杀/弱点）
    SPECIAL = 'special'     // 特化（被动技能）
}

/**
 * 能量获取配置
 */
export interface EnergySourceConfig {
    type: EnergySourceType;
    efficiency: EnergyEfficiency;
    baseAmount: number;             // 基础获取量
    description: string;
    
    // 动态调整
    comboScaling?: number;          // 连击数影响（每N连击+X%）
    feverBonus?: number;            // Fever期间额外倍率
    
    // 限制
    cooldown?: number;              // 冷却时间（秒）
    maxPerSecond?: number;          // 每秒最大获取
    
    // 条件
    conditions?: {
        minCombo?: number;
        maxCombo?: number;
        requireFever?: boolean;
        requireElement?: ElementType;
    };
}

/**
 * 角色能量被动
 */
export interface CharacterEnergyPassive {
    characterId: string;
    passiveType: 'start_full' | 'kill_bonus' | 'time_regen' | 'combo_bonus' | 'hit_bonus';
    value: number;                  // 效果数值
    description: string;
    conditions?: {
        minStar?: number;           // 最低星级
        minLevel?: number;          // 最低等级
        isLeader?: boolean;         // 是否需要队长位
        isMain?: boolean;           // 是否需要主位
    };
}

/**
 * 编队能量槽数据
 */
export interface FormationEnergyData {
    formationId: string;
    
    // 能量槽计算（3主位+3副位平均）
    baseMaxEnergy: number;          // 基础最大能量（240-650）
    skillLevelReduction: number;    // 技能等级减少量（最多-50）
    finalMaxEnergy: number;         // 最终最大能量
    
    // 当前状态
    currentEnergy: number;
    chargeRate: number;             // 充能速度倍率
    
    // 被动效果
    startFullEnergy: boolean;       // 开局满能
    killBonusPercent: number;       // 击杀额外回能%
    timeRegenAmount: number;        // 时间回能量/秒
    comboBonusPercent: number;      // 连击额外回能%
}

/**
 * 能量获取记录
 */
export interface EnergyGainRecord {
    source: EnergySourceType;
    amount: number;
    timestamp: number;
    comboCount: number;
    isFever: boolean;
}

/**
 * 能量系统 - 完整的能量循环机制
 * Energy System - Complete energy cycle mechanics
 */
@ccclass('EnergySystem')
export class EnergySystem extends Component {
    private static _instance: EnergySystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_ENERGY_CHANGED = 'energy-changed';
    public static readonly EVENT_ENERGY_FULL = 'energy-full';
    public static readonly EVENT_ENERGY_USED = 'energy-used';
    public static readonly EVENT_PASSIVE_TRIGGERED = 'passive-triggered';

    // 能量获取配置
    private _sourceConfigs: Map<EnergySourceType, EnergySourceConfig> = new Map();

    // 角色能量被动
    private _characterPassives: Map<string, CharacterEnergyPassive[]> = new Map();

    // 当前编队能量数据
    private _formationEnergy: FormationEnergyData | null = null;

    // 能量获取冷却
    private _cooldowns: Map<EnergySourceType, number> = new Map();

    // 每秒获取追踪
    private _gainPerSecond: Map<EnergySourceType, number> = new Map();
    private _lastSecondTime: number = 0;

    // 能量获取历史
    private _gainHistory: EnergyGainRecord[] = [];
    private readonly MAX_HISTORY = 100;

    // 统计
    private _stats = {
        totalGained: 0,
        totalUsed: 0,
        gainBySource: new Map<EnergySourceType, number>(),
        skillCasts: 0,
        averageChargeTime: 0
    };

    // 时间追踪
    private _lastChargeStartTime: number = 0;
    private _chargeTimes: number[] = [];

    public static get instance(): EnergySystem | null {
        return EnergySystem._instance;
    }

    public get currentEnergy(): number {
        return this._formationEnergy?.currentEnergy || 0;
    }

    public get maxEnergy(): number {
        return this._formationEnergy?.finalMaxEnergy || 100;
    }

    public get energyPercent(): number {
        if (!this._formationEnergy) return 0;
        return this._formationEnergy.currentEnergy / this._formationEnergy.finalMaxEnergy;
    }

    public get isEnergyFull(): boolean {
        if (!this._formationEnergy) return false;
        return this._formationEnergy.currentEnergy >= this._formationEnergy.finalMaxEnergy;
    }

    onLoad() {
        if (EnergySystem._instance) {
            this.node.destroy();
            return;
        }
        EnergySystem._instance = this;

        this.initSourceConfigs();
        this.initCharacterPassives();
    }

    /**
     * 初始化能量获取配置
     */
    private initSourceConfigs(): void {
        // ========== 基础回能（低效）==========
        this._sourceConfigs.set(EnergySourceType.BOUNCE_HIT, {
            type: EnergySourceType.BOUNCE_HIT,
            efficiency: EnergyEfficiency.LOW,
            baseAmount: 2,
            description: '弹射撞击基础回能',
            comboScaling: 0.1,          // 每10连击+10%
            feverBonus: 0.3,            // Fever期间+30%
            maxPerSecond: 30
        });

        // ========== 连击回能（中效）==========
        this._sourceConfigs.set(EnergySourceType.COMBO_BONUS, {
            type: EnergySourceType.COMBO_BONUS,
            efficiency: EnergyEfficiency.MEDIUM,
            baseAmount: 8,
            description: '每10连击额外回能',
            feverBonus: 0.5,            // Fever期间+50%
            conditions: { minCombo: 10 }
        });

        // ========== 击杀回能（高效）==========
        this._sourceConfigs.set(EnergySourceType.KILL_NORMAL, {
            type: EnergySourceType.KILL_NORMAL,
            efficiency: EnergyEfficiency.HIGH,
            baseAmount: 15,
            description: '击杀普通怪物',
            feverBonus: 0.3
        });

        this._sourceConfigs.set(EnergySourceType.KILL_ELITE, {
            type: EnergySourceType.KILL_ELITE,
            efficiency: EnergyEfficiency.HIGH,
            baseAmount: 30,
            description: '击杀精英怪物（+30%）',
            feverBonus: 0.3
        });

        this._sourceConfigs.set(EnergySourceType.KILL_BOSS, {
            type: EnergySourceType.KILL_BOSS,
            efficiency: EnergyEfficiency.HIGH,
            baseAmount: 50,
            description: '击杀Boss',
            feverBonus: 0.3
        });

        // ========== 特殊回能 ==========
        this._sourceConfigs.set(EnergySourceType.WEAK_POINT_HIT, {
            type: EnergySourceType.WEAK_POINT_HIT,
            efficiency: EnergyEfficiency.MEDIUM,
            baseAmount: 5,
            description: '命中弱点',
            feverBonus: 0.3
        });

        this._sourceConfigs.set(EnergySourceType.WEAK_POINT_BREAK, {
            type: EnergySourceType.WEAK_POINT_BREAK,
            efficiency: EnergyEfficiency.HIGH,
            baseAmount: 25,
            description: '击破弱点',
            feverBonus: 0.3
        });

        this._sourceConfigs.set(EnergySourceType.DASH_HIT, {
            type: EnergySourceType.DASH_HIT,
            efficiency: EnergyEfficiency.MEDIUM,
            baseAmount: 5,
            description: '冲刺命中敌人',
            feverBonus: 0.3,
            cooldown: 0.5
        });

        this._sourceConfigs.set(EnergySourceType.PF_TRIGGER, {
            type: EnergySourceType.PF_TRIGGER,
            efficiency: EnergyEfficiency.HIGH,
            baseAmount: 20,
            description: 'Power Flip触发',
            feverBonus: 0.5
        });

        // ========== 被动回能（特化）==========
        this._sourceConfigs.set(EnergySourceType.PASSIVE_START, {
            type: EnergySourceType.PASSIVE_START,
            efficiency: EnergyEfficiency.SPECIAL,
            baseAmount: 100,            // 开局满能（100%）
            description: '开局满能被动'
        });

        this._sourceConfigs.set(EnergySourceType.PASSIVE_KILL, {
            type: EnergySourceType.PASSIVE_KILL,
            efficiency: EnergyEfficiency.SPECIAL,
            baseAmount: 10,
            description: '击杀额外回能被动'
        });

        this._sourceConfigs.set(EnergySourceType.PASSIVE_TIME, {
            type: EnergySourceType.PASSIVE_TIME,
            efficiency: EnergyEfficiency.SPECIAL,
            baseAmount: 2,
            description: '时间回能被动（每秒）',
            cooldown: 1
        });

        this._sourceConfigs.set(EnergySourceType.PASSIVE_COMBO, {
            type: EnergySourceType.PASSIVE_COMBO,
            efficiency: EnergyEfficiency.SPECIAL,
            baseAmount: 3,
            description: '连击额外回能被动',
            conditions: { minCombo: 5 }
        });

        // ========== 其他回能 ==========
        this._sourceConfigs.set(EnergySourceType.CHAIN, {
            type: EnergySourceType.CHAIN,
            efficiency: EnergyEfficiency.HIGH,
            baseAmount: 15,
            description: 'CHAIN触发回能',
            feverBonus: 0.5
        });

        console.log(`能量获取配置初始化完成，共 ${this._sourceConfigs.size} 种来源`);
    }

    /**
     * 初始化角色能量被动
     */
    private initCharacterPassives(): void {
        // 礼黑（奈芙提姆）- 开局满能
        this.addCharacterPassive({
            characterId: 'char_nefertum',
            passiveType: 'start_full',
            value: 1.0,                 // 100%满能
            description: '战斗开始时，技能槽充满',
            conditions: { isMain: true }
        });

        // 圣龙（碧安卡）- 充能加速
        this.addCharacterPassive({
            characterId: 'char_bianca',
            passiveType: 'time_regen',
            value: 3,                   // 每秒+3能量
            description: '每秒恢复3点能量'
        });

        // 充能辅助角色 - 击杀回能
        this.addCharacterPassive({
            characterId: 'char_charge_support',
            passiveType: 'kill_bonus',
            value: 0.3,                 // +30%击杀回能
            description: '击杀敌人额外恢复30%能量'
        });

        // 连击角色 - 连击回能
        this.addCharacterPassive({
            characterId: 'char_combo_master',
            passiveType: 'combo_bonus',
            value: 0.2,                 // 连击时+20%回能
            description: '连击时额外恢复20%能量'
        });

        // 高命中角色 - 命中回能
        this.addCharacterPassive({
            characterId: 'char_hit_master',
            passiveType: 'hit_bonus',
            value: 0.5,                 // 每次命中+50%基础回能
            description: '命中敌人时额外恢复50%能量'
        });

        console.log(`角色能量被动初始化完成`);
    }

    /**
     * 添加角色能量被动
     */
    public addCharacterPassive(passive: CharacterEnergyPassive): void {
        if (!this._characterPassives.has(passive.characterId)) {
            this._characterPassives.set(passive.characterId, []);
        }
        this._characterPassives.get(passive.characterId)!.push(passive);
    }

    // ==================== 编队能量初始化 ====================

    /**
     * 初始化编队能量数据
     */
    public initFormationEnergy(formationId: string): void {
        const formation = FormationSystem.instance?.getFormation(formationId);
        if (!formation) {
            console.log('找不到编队');
            return;
        }

        // 计算基础最大能量（3主位+3副位的技能能量平均值）
        const baseMaxEnergy = this.calculateBaseMaxEnergy(formation);

        // 计算技能等级减少量
        const skillLevelReduction = this.calculateSkillLevelReduction(formation);

        // 计算被动效果
        const passiveEffects = this.calculatePassiveEffects(formation);

        this._formationEnergy = {
            formationId,
            baseMaxEnergy,
            skillLevelReduction,
            finalMaxEnergy: Math.max(200, baseMaxEnergy - skillLevelReduction),
            currentEnergy: 0,
            chargeRate: 1.0 + passiveEffects.chargeBonus,
            startFullEnergy: passiveEffects.startFull,
            killBonusPercent: passiveEffects.killBonus,
            timeRegenAmount: passiveEffects.timeRegen,
            comboBonusPercent: passiveEffects.comboBonus
        };

        // 应用开局满能被动
        if (this._formationEnergy.startFullEnergy) {
            this._formationEnergy.currentEnergy = this._formationEnergy.finalMaxEnergy;
            console.log('开局满能被动触发！');
            
            this.events.emit(EnergySystem.EVENT_PASSIVE_TRIGGERED, {
                type: 'start_full',
                amount: this._formationEnergy.finalMaxEnergy
            });
        }

        this._lastChargeStartTime = Date.now();

        console.log(`编队能量初始化: 最大${this._formationEnergy.finalMaxEnergy} (基础${baseMaxEnergy}, 等级减少${skillLevelReduction})`);
    }

    /**
     * 计算基础最大能量（根据主副位技能）
     */
    private calculateBaseMaxEnergy(formation: FormationData): number {
        const energyValues: number[] = [];

        for (const slot of formation.mainSlots) {
            // 主位角色技能能量
            if (slot.characterId) {
                const config = CharacterDatabase.instance?.getCharacter(slot.characterId);
                if (config?.skillSlots.defaultSkillId) {
                    const skill = SkillDatabase.instance?.getSkill(config.skillSlots.defaultSkillId);
                    if (skill) {
                        // 技能能量消耗作为该角色的能量值
                        energyValues.push(skill.energyCost || 100);
                    }
                }
            }

            // 副位角色技能能量
            if (slot.subSlot.characterId) {
                const config = CharacterDatabase.instance?.getCharacter(slot.subSlot.characterId);
                if (config?.skillSlots.defaultSkillId) {
                    const skill = SkillDatabase.instance?.getSkill(config.skillSlots.defaultSkillId);
                    if (skill) {
                        energyValues.push(skill.energyCost || 100);
                    }
                }
            }
        }

        if (energyValues.length === 0) {
            return 350;  // 默认值
        }

        // 计算平均值，范围在240-650之间
        const average = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;
        return Math.min(650, Math.max(240, Math.floor(average)));
    }

    /**
     * 计算技能等级减少量（最多减50）
     */
    private calculateSkillLevelReduction(formation: FormationData): number {
        let totalReduction = 0;

        for (const slot of formation.mainSlots) {
            // 主位技能等级
            if (slot.characterId) {
                const config = CharacterDatabase.instance?.getCharacter(slot.characterId);
                if (config?.skillSlots.defaultSkillId) {
                    // TODO: 从SkillUpgradeSystem获取实际技能等级
                    const skillLevel = 5;  // 假设等级5
                    // 每级减少2点，最高Lv5减少10点
                    totalReduction += Math.min(10, skillLevel * 2);
                }
            }
        }

        // 最多减少50
        return Math.min(50, totalReduction);
    }

    /**
     * 计算被动效果
     */
    private calculatePassiveEffects(formation: FormationData): {
        startFull: boolean;
        killBonus: number;
        timeRegen: number;
        comboBonus: number;
        chargeBonus: number;
    } {
        const effects = {
            startFull: false,
            killBonus: 0,
            timeRegen: 0,
            comboBonus: 0,
            chargeBonus: 0
        };

        // 遍历编队中的角色
        for (let i = 0; i < formation.mainSlots.length; i++) {
            const slot = formation.mainSlots[i];
            const isLeader = i === formation.leaderIndex;

            // 主位角色被动
            if (slot.characterId) {
                const passives = this._characterPassives.get(slot.characterId);
                if (passives) {
                    for (const passive of passives) {
                        // 检查条件
                        if (passive.conditions?.isLeader && !isLeader) continue;
                        if (passive.conditions?.isMain === false) continue;

                        this.applyPassiveEffect(passive, effects);
                    }
                }
            }

            // 副位角色被动（部分被动可能不生效）
            if (slot.subSlot.characterId) {
                const passives = this._characterPassives.get(slot.subSlot.characterId);
                if (passives) {
                    for (const passive of passives) {
                        // 副位不触发需要主位的被动
                        if (passive.conditions?.isMain) continue;

                        this.applyPassiveEffect(passive, effects);
                    }
                }
            }
        }

        return effects;
    }

    /**
     * 应用被动效果
     */
    private applyPassiveEffect(
        passive: CharacterEnergyPassive,
        effects: {
            startFull: boolean;
            killBonus: number;
            timeRegen: number;
            comboBonus: number;
            chargeBonus: number;
        }
    ): void {
        switch (passive.passiveType) {
            case 'start_full':
                effects.startFull = true;
                break;
            case 'kill_bonus':
                effects.killBonus += passive.value;
                break;
            case 'time_regen':
                effects.timeRegen += passive.value;
                break;
            case 'combo_bonus':
                effects.comboBonus += passive.value;
                break;
            case 'hit_bonus':
                effects.chargeBonus += passive.value;
                break;
        }
    }

    // ==================== 能量获取 ====================

    /**
     * 获取能量（通用方法）
     */
    public gainEnergy(source: EnergySourceType, context?: {
        comboCount?: number;
        isFever?: boolean;
        targetType?: 'normal' | 'elite' | 'boss';
        multiplier?: number;
    }): number {
        if (!this._formationEnergy) return 0;
        if (this.isEnergyFull) return 0;

        const config = this._sourceConfigs.get(source);
        if (!config) return 0;

        // 检查冷却
        const cooldown = this._cooldowns.get(source) || 0;
        if (cooldown > 0) return 0;

        // 检查每秒限制
        if (config.maxPerSecond) {
            const currentPerSecond = this._gainPerSecond.get(source) || 0;
            if (currentPerSecond >= config.maxPerSecond) return 0;
        }

        // 检查条件
        if (config.conditions) {
            if (config.conditions.minCombo && (context?.comboCount || 0) < config.conditions.minCombo) {
                return 0;
            }
            if (config.conditions.requireFever && !context?.isFever) {
                return 0;
            }
        }

        // 计算基础获取量
        let amount = config.baseAmount;

        // 应用连击缩放
        if (config.comboScaling && context?.comboCount) {
            const comboMultiplier = 1 + Math.floor(context.comboCount / 10) * config.comboScaling;
            amount *= comboMultiplier;
        }

        // 应用Fever加成
        if (context?.isFever && config.feverBonus) {
            amount *= (1 + config.feverBonus);
        }

        // 应用编队充能速度
        amount *= this._formationEnergy.chargeRate;

        // 应用编队被动加成
        if (source === EnergySourceType.KILL_NORMAL || 
            source === EnergySourceType.KILL_ELITE ||
            source === EnergySourceType.KILL_BOSS) {
            amount *= (1 + this._formationEnergy.killBonusPercent);
        }

        if (source === EnergySourceType.COMBO_BONUS) {
            amount *= (1 + this._formationEnergy.comboBonusPercent);
        }

        // 应用外部倍率
        if (context?.multiplier) {
            amount *= context.multiplier;
        }

        // 应用能量
        const previousEnergy = this._formationEnergy.currentEnergy;
        this._formationEnergy.currentEnergy = Math.min(
            this._formationEnergy.finalMaxEnergy,
            this._formationEnergy.currentEnergy + amount
        );

        const actualGain = this._formationEnergy.currentEnergy - previousEnergy;

        // 设置冷却
        if (config.cooldown) {
            this._cooldowns.set(source, config.cooldown);
        }

        // 更新每秒获取
        this._gainPerSecond.set(source, (this._gainPerSecond.get(source) || 0) + actualGain);

        // 记录历史
        this._gainHistory.push({
            source,
            amount: actualGain,
            timestamp: Date.now(),
            comboCount: context?.comboCount || 0,
            isFever: context?.isFever || false
        });
        if (this._gainHistory.length > this.MAX_HISTORY) {
            this._gainHistory.shift();
        }

        // 更新统计
        this._stats.totalGained += actualGain;
        this._stats.gainBySource.set(source, 
            (this._stats.gainBySource.get(source) || 0) + actualGain
        );

        // 发送事件
        this.events.emit(EnergySystem.EVENT_ENERGY_CHANGED, {
            current: this._formationEnergy.currentEnergy,
            max: this._formationEnergy.finalMaxEnergy,
            percent: this.energyPercent,
            source,
            amount: actualGain
        });

        // 检查是否满能
        if (this.isEnergyFull) {
            this.onEnergyFull();
        }

        return actualGain;
    }

    /**
     * 能量满时回调
     */
    private onEnergyFull(): void {
        // 记录充能时间
        const chargeTime = (Date.now() - this._lastChargeStartTime) / 1000;
        this._chargeTimes.push(chargeTime);
        if (this._chargeTimes.length > 10) {
            this._chargeTimes.shift();
        }

        // 计算平均充能时间
        this._stats.averageChargeTime = this._chargeTimes.reduce((a, b) => a + b, 0) / this._chargeTimes.length;

        this.events.emit(EnergySystem.EVENT_ENERGY_FULL, {
            chargeTime,
            averageChargeTime: this._stats.averageChargeTime
        });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.SKILL_READY);

        console.log(`能量已满！充能时间: ${chargeTime.toFixed(1)}秒`);
    }

    // ==================== 快捷方法 ====================

    /**
     * 弹射命中回能
     */
    public onBounceHit(comboCount: number = 0): number {
        const isFever = BattleCoreSystem.instance?.isFeverActive() || false;
        return this.gainEnergy(EnergySourceType.BOUNCE_HIT, { comboCount, isFever });
    }

    /**
     * 连击奖励回能（每10连击调用一次）
     */
    public onComboBonus(comboCount: number): number {
        const isFever = BattleCoreSystem.instance?.isFeverActive() || false;
        return this.gainEnergy(EnergySourceType.COMBO_BONUS, { comboCount, isFever });
    }

    /**
     * 击杀回能
     */
    public onKill(targetType: 'normal' | 'elite' | 'boss'): number {
        const isFever = BattleCoreSystem.instance?.isFeverActive() || false;
        
        let source: EnergySourceType;
        switch (targetType) {
            case 'elite':
                source = EnergySourceType.KILL_ELITE;
                break;
            case 'boss':
                source = EnergySourceType.KILL_BOSS;
                break;
            default:
                source = EnergySourceType.KILL_NORMAL;
        }

        return this.gainEnergy(source, { isFever, targetType });
    }

    /**
     * 弱点命中回能
     */
    public onWeakPointHit(): number {
        const isFever = BattleCoreSystem.instance?.isFeverActive() || false;
        return this.gainEnergy(EnergySourceType.WEAK_POINT_HIT, { isFever });
    }

    /**
     * 弱点击破回能
     */
    public onWeakPointBreak(): number {
        const isFever = BattleCoreSystem.instance?.isFeverActive() || false;
        return this.gainEnergy(EnergySourceType.WEAK_POINT_BREAK, { isFever });
    }

    /**
     * 冲刺命中回能
     */
    public onDashHit(): number {
        const isFever = BattleCoreSystem.instance?.isFeverActive() || false;
        const comboCount = BattleCoreSystem.instance?.comboState.count || 0;
        return this.gainEnergy(EnergySourceType.DASH_HIT, { isFever, comboCount });
    }

    /**
     * PF触发回能
     */
    public onPowerFlipTrigger(level: number): number {
        const isFever = BattleCoreSystem.instance?.isFeverActive() || false;
        return this.gainEnergy(EnergySourceType.PF_TRIGGER, { isFever, multiplier: level });
    }

    /**
     * CHAIN触发回能
     */
    public onChainTrigger(chainLevel: number): number {
        const isFever = BattleCoreSystem.instance?.isFeverActive() || false;
        return this.gainEnergy(EnergySourceType.CHAIN, { isFever, multiplier: chainLevel });
    }

    // ==================== 能量消耗 ====================

    /**
     * 消耗能量（释放技能）
     */
    public useEnergy(): boolean {
        if (!this._formationEnergy || !this.isEnergyFull) {
            return false;
        }

        this._formationEnergy.currentEnergy = 0;
        this._stats.totalUsed += this._formationEnergy.finalMaxEnergy;
        this._stats.skillCasts++;

        // 重置充能计时
        this._lastChargeStartTime = Date.now();

        this.events.emit(EnergySystem.EVENT_ENERGY_USED, {
            amount: this._formationEnergy.finalMaxEnergy,
            skillCasts: this._stats.skillCasts
        });

        console.log(`技能能量消耗: ${this._formationEnergy.finalMaxEnergy}`);
        return true;
    }

    /**
     * 攒能（不释放，保留至破盾/爆发期）
     */
    public reserveEnergy(): void {
        if (this.isEnergyFull) {
            console.log('能量已攒满，等待最佳释放时机...');
        }
    }

    // ==================== 更新循环 ====================

    update(dt: number) {
        // 更新冷却
        for (const [source, cooldown] of this._cooldowns) {
            if (cooldown > 0) {
                this._cooldowns.set(source, cooldown - dt);
            }
        }

        // 每秒重置获取量
        const now = Date.now();
        if (now - this._lastSecondTime >= 1000) {
            this._gainPerSecond.clear();
            this._lastSecondTime = now;

            // 时间被动回能
            if (this._formationEnergy && this._formationEnergy.timeRegenAmount > 0) {
                this.gainEnergy(EnergySourceType.PASSIVE_TIME, {
                    multiplier: this._formationEnergy.timeRegenAmount / 2
                });
            }
        }
    }

    // ==================== 查询方法 ====================

    /**
     * 获取能量状态
     */
    public getEnergyState(): {
        current: number;
        max: number;
        percent: number;
        chargeRate: number;
        isFull: boolean;
    } {
        return {
            current: this.currentEnergy,
            max: this.maxEnergy,
            percent: this.energyPercent,
            chargeRate: this._formationEnergy?.chargeRate || 1,
            isFull: this.isEnergyFull
        };
    }

    /**
     * 获取能量统计
     */
    public getStats(): {
        totalGained: number;
        totalUsed: number;
        skillCasts: number;
        averageChargeTime: number;
        gainBySource: Record<string, number>;
    } {
        return {
            totalGained: this._stats.totalGained,
            totalUsed: this._stats.totalUsed,
            skillCasts: this._stats.skillCasts,
            averageChargeTime: this._stats.averageChargeTime,
            gainBySource: Object.fromEntries(this._stats.gainBySource)
        };
    }

    /**
     * 获取能量获取历史
     */
    public getGainHistory(): EnergyGainRecord[] {
        return [...this._gainHistory];
    }

    /**
     * 获取能量获取配置
     */
    public getSourceConfig(source: EnergySourceType): EnergySourceConfig | undefined {
        return this._sourceConfigs.get(source);
    }

    /**
     * 重置统计
     */
    public resetStats(): void {
        this._stats = {
            totalGained: 0,
            totalUsed: 0,
            gainBySource: new Map(),
            skillCasts: 0,
            averageChargeTime: 0
        };
        this._chargeTimes = [];
    }

    /**
     * 重置系统
     */
    public reset(): void {
        this._formationEnergy = null;
        this._cooldowns.clear();
        this._gainPerSecond.clear();
        this._gainHistory = [];
        this.resetStats();
    }

    onDestroy() {
        this.reset();
        
        if (EnergySystem._instance === this) {
            EnergySystem._instance = null;
        }
    }
}
