import { _decorator, Component, Node, Vec2, Vec3, EventTarget } from 'cc';
import { FormationSystem, FormationData, SlotType, FormationBonuses } from './FormationSystem';
import { SkillConfig, SkillDatabase, SkillEffectType } from './SkillData';
import { CharacterDatabase, ElementType } from './CharacterData';
import { DamageSystem } from './DamageSystem';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 输出体系类型
 */
export enum DamageSystemType {
    SKILL_DAMAGE = 'skill_damage',      // 技伤体系（大招为主）
    POWER_FLIP = 'power_flip',          // PF体系（连击触发）
    DIRECT_HIT = 'direct_hit',          // 直击体系（普攻+冲刺）
    FEVER = 'fever'                     // Fever体系（能量爆发）
}

/**
 * Power Flip等级
 */
export enum PowerFlipLevel {
    NONE = 0,
    LEVEL_1 = 1,    // 9连击
    LEVEL_2 = 2,    // 15连击
    LEVEL_3 = 3     // 39连击
}

/**
 * 战斗状态
 */
export enum BattleState {
    IDLE = 'idle',
    ACTIVE = 'active',
    FEVER = 'fever',
    SKILL_CASTING = 'skill_casting',
    PAUSED = 'paused'
}

/**
 * 冲刺状态
 */
export interface DashState {
    available: boolean;
    cooldown: number;
    maxCooldown: number;
}

/**
 * Fever状态
 */
export interface FeverState {
    active: boolean;
    energy: number;
    maxEnergy: number;
    duration: number;
    maxDuration: number;
    damageMultiplier: number;
}

/**
 * 连击状态
 */
export interface ComboState {
    count: number;
    timer: number;
    maxTimer: number;
    powerFlipLevel: PowerFlipLevel;
    powerFlipReady: boolean;
}

/**
 * 能量状态（大招充能）
 */
export interface EnergyState {
    current: number;
    max: number;
    chargeRate: number;     // 充能速度加成
}

/**
 * 战斗数据汇总
 */
export interface BattleStats {
    totalDamage: number;
    skillDamage: number;
    pfDamage: number;
    directDamage: number;
    feverDamage: number;
    maxCombo: number;
    skillCasts: number;
    pfTriggers: number;
    feverCount: number;
}

/**
 * 战斗核心系统 - 管理Fever/冲刺/PF/技能释放
 * Battle Core System - Fever/Dash/PowerFlip/Skill management
 */
@ccclass('BattleCoreSystem')
export class BattleCoreSystem extends Component {
    private static _instance: BattleCoreSystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_STATE_CHANGED = 'battle-state-changed';
    public static readonly EVENT_FEVER_START = 'fever-start';
    public static readonly EVENT_FEVER_END = 'fever-end';
    public static readonly EVENT_SKILL_CAST = 'skill-cast';
    public static readonly EVENT_POWER_FLIP = 'power-flip';
    public static readonly EVENT_COMBO_CHANGED = 'combo-changed';
    public static readonly EVENT_DASH = 'dash';

    // 战斗状态
    private _battleState: BattleState = BattleState.IDLE;

    // 冲刺状态
    private _dashState: DashState = {
        available: true,
        cooldown: 0,
        maxCooldown: 3.0     // 3秒冷却
    };

    // Fever状态
    private _feverState: FeverState = {
        active: false,
        energy: 0,
        maxEnergy: 100,
        duration: 0,
        maxDuration: 10,     // 10秒Fever
        damageMultiplier: 1.5  // +50%伤害
    };

    // 连击状态
    private _comboState: ComboState = {
        count: 0,
        timer: 0,
        maxTimer: 3.0,       // 3秒内无碰撞重置连击
        powerFlipLevel: PowerFlipLevel.NONE,
        powerFlipReady: false
    };

    // 能量状态
    private _energyState: EnergyState = {
        current: 0,
        max: 100,
        chargeRate: 1.0
    };

    // 编队加成缓存
    private _formationBonuses: FormationBonuses | null = null;

    // 战斗统计
    private _battleStats: BattleStats = {
        totalDamage: 0,
        skillDamage: 0,
        pfDamage: 0,
        directDamage: 0,
        feverDamage: 0,
        maxCombo: 0,
        skillCasts: 0,
        pfTriggers: 0,
        feverCount: 0
    };

    // PF连击阈值
    private readonly PF_THRESHOLDS = {
        [PowerFlipLevel.LEVEL_1]: 9,
        [PowerFlipLevel.LEVEL_2]: 15,
        [PowerFlipLevel.LEVEL_3]: 39
    };

    public static get instance(): BattleCoreSystem | null {
        return BattleCoreSystem._instance;
    }

    public get battleState(): BattleState {
        return this._battleState;
    }

    public get dashState(): DashState {
        return { ...this._dashState };
    }

    public get feverState(): FeverState {
        return { ...this._feverState };
    }

    public get comboState(): ComboState {
        return { ...this._comboState };
    }

    public get energyState(): EnergyState {
        return { ...this._energyState };
    }

    public get battleStats(): BattleStats {
        return { ...this._battleStats };
    }

    onLoad() {
        if (BattleCoreSystem._instance) {
            this.node.destroy();
            return;
        }
        BattleCoreSystem._instance = this;
    }

    /**
     * 开始战斗
     */
    public startBattle(formationId?: string): void {
        this._battleState = BattleState.ACTIVE;
        this.resetBattleState();

        // 加载编队加成
        if (formationId) {
            this._formationBonuses = FormationSystem.instance?.getFormationBonuses(formationId) || null;
            this.applyFormationBonuses();
        }

        this.events.emit(BattleCoreSystem.EVENT_STATE_CHANGED, { state: this._battleState });
        console.log('战斗开始');
    }

    /**
     * 重置战斗状态
     */
    private resetBattleState(): void {
        this._dashState = {
            available: true,
            cooldown: 0,
            maxCooldown: 3.0
        };

        this._feverState = {
            active: false,
            energy: 0,
            maxEnergy: 100,
            duration: 0,
            maxDuration: 10,
            damageMultiplier: 1.5
        };

        this._comboState = {
            count: 0,
            timer: 0,
            maxTimer: 3.0,
            powerFlipLevel: PowerFlipLevel.NONE,
            powerFlipReady: false
        };

        this._energyState = {
            current: 0,
            max: 100,
            chargeRate: 1.0
        };

        this._battleStats = {
            totalDamage: 0,
            skillDamage: 0,
            pfDamage: 0,
            directDamage: 0,
            feverDamage: 0,
            maxCombo: 0,
            skillCasts: 0,
            pfTriggers: 0,
            feverCount: 0
        };
    }

    /**
     * 应用编队加成
     */
    private applyFormationBonuses(): void {
        if (!this._formationBonuses) return;

        // 充能速度加成
        this._energyState.chargeRate = 1.0 + this._formationBonuses.totalStats.chargeSpeed;

        // Fever伤害加成
        const feverBonus = this._formationBonuses.soulOrbBonuses
            .filter(b => b.type === 'fever_damage')
            .reduce((sum, b) => sum + b.value, 0);
        this._feverState.damageMultiplier = 1.5 + feverBonus;

        console.log(`充能速度: ${this._energyState.chargeRate.toFixed(2)}x, Fever倍率: ${this._feverState.damageMultiplier.toFixed(2)}x`);
    }

    update(dt: number) {
        if (this._battleState === BattleState.PAUSED || this._battleState === BattleState.IDLE) {
            return;
        }

        this.updateDash(dt);
        this.updateFever(dt);
        this.updateCombo(dt);
    }

    /**
     * 更新冲刺冷却
     */
    private updateDash(dt: number): void {
        if (!this._dashState.available && this._dashState.cooldown > 0) {
            this._dashState.cooldown -= dt;
            if (this._dashState.cooldown <= 0) {
                this._dashState.available = true;
                this._dashState.cooldown = 0;
            }
        }
    }

    /**
     * 更新Fever状态
     */
    private updateFever(dt: number): void {
        if (this._feverState.active) {
            this._feverState.duration -= dt;
            if (this._feverState.duration <= 0) {
                this.endFever();
            }
        }
    }

    /**
     * 更新连击状态
     */
    private updateCombo(dt: number): void {
        if (this._comboState.count > 0) {
            this._comboState.timer -= dt;
            if (this._comboState.timer <= 0) {
                this.resetCombo();
            }
        }
    }

    // ==================== 冲刺系统 ====================

    /**
     * 执行冲刺
     */
    public performDash(direction: Vec2): boolean {
        if (!this._dashState.available) {
            console.log(`冲刺冷却中 (${this._dashState.cooldown.toFixed(1)}s)`);
            return false;
        }

        if (this._battleState !== BattleState.ACTIVE && this._battleState !== BattleState.FEVER) {
            return false;
        }

        // 开始冷却
        this._dashState.available = false;
        this._dashState.cooldown = this._dashState.maxCooldown;

        // 发送冲刺事件
        this.events.emit(BattleCoreSystem.EVENT_DASH, { direction });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.DASH);

        console.log('冲刺！');
        return true;
    }

    /**
     * 获取冲刺冷却百分比
     */
    public getDashCooldownPercent(): number {
        if (this._dashState.available) return 1;
        return 1 - (this._dashState.cooldown / this._dashState.maxCooldown);
    }

    // ==================== Fever系统 ====================

    /**
     * 增加Fever能量
     */
    public addFeverEnergy(amount: number): void {
        if (this._feverState.active) return;

        this._feverState.energy = Math.min(
            this._feverState.maxEnergy,
            this._feverState.energy + amount * this._energyState.chargeRate
        );

        // 检查是否可以进入Fever
        if (this._feverState.energy >= this._feverState.maxEnergy) {
            console.log('Fever已准备就绪！');
        }
    }

    /**
     * 激活Fever模式
     */
    public activateFever(): boolean {
        if (this._feverState.active) {
            console.log('Fever模式已激活');
            return false;
        }

        if (this._feverState.energy < this._feverState.maxEnergy) {
            console.log(`Fever能量不足 (${this._feverState.energy}/${this._feverState.maxEnergy})`);
            return false;
        }

        // 激活Fever
        this._feverState.active = true;
        this._feverState.energy = 0;
        this._feverState.duration = this._feverState.maxDuration;
        this._battleState = BattleState.FEVER;
        this._battleStats.feverCount++;

        this.events.emit(BattleCoreSystem.EVENT_FEVER_START, {
            duration: this._feverState.maxDuration,
            multiplier: this._feverState.damageMultiplier
        });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.FEVER);

        console.log(`Fever模式激活！伤害+${((this._feverState.damageMultiplier - 1) * 100).toFixed(0)}%，持续${this._feverState.maxDuration}秒`);
        return true;
    }

    /**
     * 结束Fever模式
     */
    private endFever(): void {
        this._feverState.active = false;
        this._feverState.duration = 0;
        this._battleState = BattleState.ACTIVE;

        this.events.emit(BattleCoreSystem.EVENT_FEVER_END);

        console.log('Fever模式结束');
    }

    /**
     * 获取Fever能量百分比
     */
    public getFeverEnergyPercent(): number {
        return this._feverState.energy / this._feverState.maxEnergy;
    }

    /**
     * 获取Fever剩余时间百分比
     */
    public getFeverTimePercent(): number {
        if (!this._feverState.active) return 0;
        return this._feverState.duration / this._feverState.maxDuration;
    }

    /**
     * 是否处于Fever模式
     */
    public isFeverActive(): boolean {
        return this._feverState.active;
    }

    // ==================== 连击/PF系统 ====================

    /**
     * 增加连击
     */
    public addCombo(count: number = 1): void {
        this._comboState.count += count;
        this._comboState.timer = this._comboState.maxTimer;

        // 更新最大连击记录
        if (this._comboState.count > this._battleStats.maxCombo) {
            this._battleStats.maxCombo = this._comboState.count;
        }

        // 检查Power Flip等级
        this.checkPowerFlipLevel();

        this.events.emit(BattleCoreSystem.EVENT_COMBO_CHANGED, {
            count: this._comboState.count,
            powerFlipLevel: this._comboState.powerFlipLevel,
            powerFlipReady: this._comboState.powerFlipReady
        });
    }

    /**
     * 检查Power Flip等级
     */
    private checkPowerFlipLevel(): void {
        const combo = this._comboState.count;
        let newLevel = PowerFlipLevel.NONE;
        let ready = false;

        if (combo >= this.PF_THRESHOLDS[PowerFlipLevel.LEVEL_3]) {
            newLevel = PowerFlipLevel.LEVEL_3;
            ready = true;
        } else if (combo >= this.PF_THRESHOLDS[PowerFlipLevel.LEVEL_2]) {
            newLevel = PowerFlipLevel.LEVEL_2;
            ready = true;
        } else if (combo >= this.PF_THRESHOLDS[PowerFlipLevel.LEVEL_1]) {
            newLevel = PowerFlipLevel.LEVEL_1;
            ready = true;
        }

        // 等级提升时触发
        if (newLevel > this._comboState.powerFlipLevel) {
            this._comboState.powerFlipLevel = newLevel;
            this._comboState.powerFlipReady = ready;
            
            if (ready) {
                console.log(`Power Flip Lv.${newLevel} 准备就绪！(${combo}连击)`);
                AudioManager.instance?.playSFX(SFXType.POWER_FLIP_READY);
            }
        }
    }

    /**
     * 触发Power Flip攻击
     */
    public triggerPowerFlip(): boolean {
        if (!this._comboState.powerFlipReady) {
            return false;
        }

        const level = this._comboState.powerFlipLevel;
        
        // 计算PF伤害倍率
        const pfMultiplier = this.getPowerFlipMultiplier(level);

        this._battleStats.pfTriggers++;

        this.events.emit(BattleCoreSystem.EVENT_POWER_FLIP, {
            level,
            multiplier: pfMultiplier,
            comboCount: this._comboState.count
        });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.POWER_FLIP);

        console.log(`触发 Power Flip Lv.${level}！伤害倍率: ${pfMultiplier}x`);

        // 重置PF状态（连击保留）
        this._comboState.powerFlipReady = false;

        return true;
    }

    /**
     * 获取Power Flip伤害倍率
     */
    public getPowerFlipMultiplier(level: PowerFlipLevel): number {
        // 基础倍率
        let multiplier = 1.0;

        switch (level) {
            case PowerFlipLevel.LEVEL_1:
                multiplier = 2.0;
                break;
            case PowerFlipLevel.LEVEL_2:
                multiplier = 3.5;
                break;
            case PowerFlipLevel.LEVEL_3:
                multiplier = 6.0;
                break;
        }

        // 应用PF伤害加成
        if (this._formationBonuses) {
            const pfBonus = this._formationBonuses.soulOrbBonuses
                .filter(b => b.type === 'pf_damage')
                .reduce((sum, b) => sum + b.value, 0);
            multiplier *= (1 + pfBonus);
        }

        return multiplier;
    }

    /**
     * 重置连击
     */
    public resetCombo(): void {
        this._comboState.count = 0;
        this._comboState.timer = 0;
        this._comboState.powerFlipLevel = PowerFlipLevel.NONE;
        this._comboState.powerFlipReady = false;

        this.events.emit(BattleCoreSystem.EVENT_COMBO_CHANGED, {
            count: 0,
            powerFlipLevel: PowerFlipLevel.NONE,
            powerFlipReady: false
        });
    }

    // ==================== 技能/能量系统 ====================

    /**
     * 增加技能能量
     */
    public addEnergy(amount: number): void {
        const chargedAmount = amount * this._energyState.chargeRate;
        this._energyState.current = Math.min(
            this._energyState.max,
            this._energyState.current + chargedAmount
        );
    }

    /**
     * 获取能量百分比
     */
    public getEnergyPercent(): number {
        return this._energyState.current / this._energyState.max;
    }

    /**
     * 检查是否可以释放大招
     */
    public canCastSkill(): boolean {
        return this._energyState.current >= this._energyState.max &&
               this._battleState !== BattleState.SKILL_CASTING;
    }

    /**
     * 释放大招（主副位同步）
     */
    public castTeamSkill(): boolean {
        if (!this.canCastSkill()) {
            return false;
        }

        this._battleState = BattleState.SKILL_CASTING;
        this._energyState.current = 0;
        this._battleStats.skillCasts++;

        // 获取当前编队的技能组合
        const formationSystem = FormationSystem.instance;
        if (formationSystem) {
            const currentFormation = formationSystem.getCurrentFormation();
            if (currentFormation) {
                const skills = formationSystem.getFormationSkills(currentFormation.id);
                
                // 主副位同步释放
                for (let i = 0; i < skills.length; i++) {
                    const { main, sub } = skills[i];
                    
                    if (main) {
                        this.executeSkill(main, SlotType.MAIN, i);
                    }
                    if (sub) {
                        // 副位大招与主位同步触发
                        this.executeSkill(sub, SlotType.SUB, i);
                    }
                }
            }
        }

        this.events.emit(BattleCoreSystem.EVENT_SKILL_CAST, {
            timestamp: Date.now()
        });

        // 技能释放完成后恢复状态
        this.scheduleOnce(() => {
            if (this._battleState === BattleState.SKILL_CASTING) {
                this._battleState = this._feverState.active ? BattleState.FEVER : BattleState.ACTIVE;
            }
        }, 1.0);

        return true;
    }

    /**
     * 执行单个技能
     */
    private executeSkill(skill: SkillConfig, slotType: SlotType, slotIndex: number): void {
        console.log(`[${slotType === SlotType.MAIN ? '主位' : '副位'}${slotIndex + 1}] 释放技能: ${skill.name}`);

        // 技能效果处理
        // TODO: 与SkillExecutor集成

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.SKILL_CAST);
    }

    // ==================== 伤害计算 ====================

    /**
     * 计算最终伤害（应用所有加成）
     */
    public calculateFinalDamage(
        baseDamage: number,
        damageType: DamageSystemType,
        isCritical: boolean = false
    ): number {
        let damage = baseDamage;

        // 1. Fever加成
        if (this._feverState.active) {
            damage *= this._feverState.damageMultiplier;
            this._battleStats.feverDamage += damage - baseDamage;
        }

        // 2. 编队加成
        if (this._formationBonuses) {
            // 技伤加成（仅技能伤害）
            if (damageType === DamageSystemType.SKILL_DAMAGE) {
                const skillDamageBonus = this._formationBonuses.totalStats.skillDamage;
                damage *= (1 + skillDamageBonus);
            }

            // 终伤加成（乘算）
            const finalDamageBonus = this._formationBonuses.totalStats.finalDamage;
            damage *= (1 + finalDamageBonus);

            // 暴击加成
            if (isCritical) {
                damage *= (1 + this._formationBonuses.totalStats.critDamage);
            }
        }

        // 3. 纯色加成
        if (this._formationBonuses?.elementUnityBonus) {
            damage *= (1 + this._formationBonuses.elementUnityBonus);
        }

        // 记录统计
        this._battleStats.totalDamage += damage;
        switch (damageType) {
            case DamageSystemType.SKILL_DAMAGE:
                this._battleStats.skillDamage += damage;
                break;
            case DamageSystemType.POWER_FLIP:
                this._battleStats.pfDamage += damage;
                break;
            case DamageSystemType.DIRECT_HIT:
                this._battleStats.directDamage += damage;
                break;
        }

        return damage;
    }

    // ==================== 战斗控制 ====================

    /**
     * 暂停战斗
     */
    public pauseBattle(): void {
        if (this._battleState !== BattleState.IDLE) {
            this._battleState = BattleState.PAUSED;
            this.events.emit(BattleCoreSystem.EVENT_STATE_CHANGED, { state: this._battleState });
        }
    }

    /**
     * 恢复战斗
     */
    public resumeBattle(): void {
        if (this._battleState === BattleState.PAUSED) {
            this._battleState = this._feverState.active ? BattleState.FEVER : BattleState.ACTIVE;
            this.events.emit(BattleCoreSystem.EVENT_STATE_CHANGED, { state: this._battleState });
        }
    }

    /**
     * 结束战斗
     */
    public endBattle(): void {
        this._battleState = BattleState.IDLE;
        this.events.emit(BattleCoreSystem.EVENT_STATE_CHANGED, { state: this._battleState });

        console.log('=== 战斗结束 ===');
        console.log(`总伤害: ${this._battleStats.totalDamage.toFixed(0)}`);
        console.log(`技能伤害: ${this._battleStats.skillDamage.toFixed(0)}`);
        console.log(`PF伤害: ${this._battleStats.pfDamage.toFixed(0)}`);
        console.log(`直击伤害: ${this._battleStats.directDamage.toFixed(0)}`);
        console.log(`Fever伤害: ${this._battleStats.feverDamage.toFixed(0)}`);
        console.log(`最大连击: ${this._battleStats.maxCombo}`);
        console.log(`技能释放: ${this._battleStats.skillCasts}次`);
        console.log(`PF触发: ${this._battleStats.pfTriggers}次`);
        console.log(`Fever次数: ${this._battleStats.feverCount}次`);
    }

    onDestroy() {
        if (BattleCoreSystem._instance === this) {
            BattleCoreSystem._instance = null;
        }
    }
}
