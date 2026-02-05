import { _decorator, Component, Node, Vec3, EventTarget, Color } from 'cc';
import { SkillConfig, SkillEffect, SkillEffectType, SkillTargetType, SkillType, SkillDatabase } from './SkillData';
import { SkillEffectManager, EffectSourceType } from './SkillEffectManager';
import { ElementSystem, ElementType } from './ElementSystem';
import { DamageSystem } from './DamageSystem';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 技能释放结果
 */
export interface SkillCastResult {
    success: boolean;
    skillId: string;
    casterId: string;
    targets: string[];
    totalDamage: number;
    totalHeal: number;
    effectsApplied: string[];
    isCritical: boolean;
    comboCount: number;
    message?: string;
}

/**
 * 技能目标信息
 */
export interface SkillTargetInfo {
    id: string;
    node: Node;
    position: Vec3;
    hp: number;
    maxHp: number;
    isAlly: boolean;
    element?: ElementType;
}

/**
 * 技能释放上下文
 */
export interface SkillCastContext {
    caster: SkillTargetInfo;
    targets: SkillTargetInfo[];
    skill: SkillConfig;
    skillLevel: number;
    position?: Vec3;
    comboCount?: number;
}

/**
 * 冷却信息
 */
export interface CooldownInfo {
    skillId: string;
    currentCooldown: number;
    maxCooldown: number;
}

/**
 * 技能执行器 - 完善的技能执行系统
 * Skill Executor - Enhanced skill execution system
 */
@ccclass('SkillExecutor')
export class SkillExecutor extends Component {
    private static _instance: SkillExecutor | null = null;

    // 冷却管理 (casterId -> skillId -> cooldown)
    private _cooldowns: Map<string, Map<string, number>> = new Map();
    
    // 能量管理 (casterId -> energy)
    private _energy: Map<string, number> = new Map();
    
    // 最大能量
    private _maxEnergy: number = 100;

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_SKILL_CAST = 'skill_cast';
    public static readonly EVENT_SKILL_HIT = 'skill_hit';
    public static readonly EVENT_SKILL_COMPLETE = 'skill_complete';
    public static readonly EVENT_COOLDOWN_START = 'cooldown_start';
    public static readonly EVENT_COOLDOWN_END = 'cooldown_end';
    public static readonly EVENT_ENERGY_CHANGED = 'energy_changed';

    public static get instance(): SkillExecutor | null {
        return SkillExecutor._instance;
    }

    onLoad() {
        if (SkillExecutor._instance) {
            this.node.destroy();
            return;
        }
        SkillExecutor._instance = this;
    }

    start() {
        // 每帧更新冷却
        this.schedule(this.updateCooldowns.bind(this), 0.1);
    }

    /**
     * 释放技能
     */
    public castSkill(context: SkillCastContext): SkillCastResult {
        const result: SkillCastResult = {
            success: false,
            skillId: context.skill.id,
            casterId: context.caster.id,
            targets: [],
            totalDamage: 0,
            totalHeal: 0,
            effectsApplied: [],
            isCritical: false,
            comboCount: context.comboCount || 0
        };

        // 检查技能是否可以释放
        const canCast = this.canCastSkill(context.caster.id, context.skill);
        if (!canCast.success) {
            result.message = canCast.reason;
            return result;
        }

        // 消耗能量
        this.consumeEnergy(context.caster.id, context.skill.baseEnergyCost);

        // 开始冷却
        this.startCooldown(context.caster.id, context.skill, context.skillLevel);

        // 发送释放事件
        this.events.emit(SkillExecutor.EVENT_SKILL_CAST, {
            skill: context.skill,
            caster: context.caster,
            targets: context.targets
        });

        // 播放技能音效
        this.playSkillSound(context.skill);

        // 根据技能类型执行
        switch (context.skill.type) {
            case SkillType.ACTIVE:
            case SkillType.ULTIMATE:
                this.executeActiveSkill(context, result);
                break;
            case SkillType.PASSIVE:
                // 被动技能不需要主动执行
                break;
            case SkillType.LEADER:
                this.executeLeaderSkill(context, result);
                break;
        }

        result.success = true;

        // 发送完成事件
        this.events.emit(SkillExecutor.EVENT_SKILL_COMPLETE, result);

        return result;
    }

    /**
     * 检查技能是否可以释放
     */
    public canCastSkill(casterId: string, skill: SkillConfig): { success: boolean; reason?: string } {
        // 检查冷却
        if (this.isOnCooldown(casterId, skill.id)) {
            const cd = this.getCooldown(casterId, skill.id);
            return { success: false, reason: `技能冷却中 (${cd.toFixed(1)}s)` };
        }

        // 检查能量
        const energy = this.getEnergy(casterId);
        if (energy < skill.baseEnergyCost) {
            return { success: false, reason: `能量不足 (需要${skill.baseEnergyCost}，当前${energy})` };
        }

        // 检查是否被控制
        const effectManager = SkillEffectManager.instance;
        if (effectManager && effectManager.isControlled(casterId)) {
            return { success: false, reason: '角色被控制中' };
        }

        return { success: true };
    }

    /**
     * 执行主动技能
     */
    private executeActiveSkill(context: SkillCastContext, result: SkillCastResult): void {
        const { skill, caster, targets, skillLevel } = context;
        
        // 计算技能数值
        const stats = SkillDatabase.instance.calculateSkillStats(skill.id, skillLevel);
        if (!stats) return;

        // 获取实际目标
        const actualTargets = this.resolveTargets(context);
        result.targets = actualTargets.map(t => t.id);

        // 对每个目标执行效果
        for (const target of actualTargets) {
            this.applySkillEffects(skill, caster, target, stats.damage, result);
        }
    }

    /**
     * 执行队长技能
     */
    private executeLeaderSkill(context: SkillCastContext, result: SkillCastResult): void {
        const { skill, caster, targets } = context;
        const effectManager = SkillEffectManager.instance;
        if (!effectManager) return;

        // 队长技能应用到所有队友
        const allies = targets.filter(t => t.isAlly);
        result.targets = allies.map(t => t.id);

        for (const effect of skill.effects) {
            for (const ally of allies) {
                // 检查元素限制
                if (skill.element && ally.element !== skill.element) {
                    continue;
                }

                effectManager.applyEffect(
                    effect.type,
                    ally.id,
                    effect.value,
                    -1, // 永久
                    EffectSourceType.LEADER,
                    skill.id,
                    { canDispel: false }
                );

                result.effectsApplied.push(`${ally.id}:${effect.type}`);
            }
        }
    }

    /**
     * 解析技能目标
     */
    private resolveTargets(context: SkillCastContext): SkillTargetInfo[] {
        const { skill, caster, targets } = context;
        
        switch (skill.targetType) {
            case SkillTargetType.SELF:
                return [caster];
                
            case SkillTargetType.SINGLE_ENEMY:
                const enemies = targets.filter(t => !t.isAlly);
                if (enemies.length > 0) {
                    // 选择最近的敌人
                    return [this.findClosestTarget(caster.position, enemies)];
                }
                return [];
                
            case SkillTargetType.ALL_ENEMIES:
                return targets.filter(t => !t.isAlly);
                
            case SkillTargetType.RANDOM_ENEMIES:
                const allEnemies = targets.filter(t => !t.isAlly);
                const count = skill.hitCount || 3;
                return this.getRandomTargets(allEnemies, count);
                
            case SkillTargetType.SINGLE_ALLY:
                const allies = targets.filter(t => t.isAlly && t.id !== caster.id);
                if (allies.length > 0) {
                    // 选择血量最低的队友
                    return [this.findLowestHpTarget(allies)];
                }
                return [caster];
                
            case SkillTargetType.ALL_ALLIES:
                return targets.filter(t => t.isAlly);
                
            case SkillTargetType.AREA:
                const range = skill.range || 100;
                const pos = context.position || caster.position;
                return targets.filter(t => {
                    if (t.isAlly) return false;
                    return Vec3.distance(pos, t.position) <= range;
                });
                
            default:
                return [];
        }
    }

    /**
     * 应用技能效果到目标
     */
    private applySkillEffects(
        skill: SkillConfig,
        caster: SkillTargetInfo,
        target: SkillTargetInfo,
        damageMultiplier: number,
        result: SkillCastResult
    ): void {
        const effectManager = SkillEffectManager.instance;
        const damageSystem = DamageSystem.instance;
        const elementSystem = ElementSystem.instance;

        for (const effect of skill.effects) {
            // 检查触发概率
            if (effect.chance !== undefined && Math.random() > effect.chance) {
                continue;
            }

            switch (effect.type) {
                case SkillEffectType.DAMAGE:
                    let damage = damageMultiplier * effect.value * 100; // 基础伤害计算
                    
                    // 元素克制
                    if (elementSystem && skill.element && target.element) {
                        const multiplier = elementSystem.getAdvantageMultiplier(
                            skill.element as ElementType,
                            target.element
                        );
                        damage *= multiplier;
                    }
                    
                    // 暴击判定
                    const critChance = 0.1; // 基础暴击率
                    const isCrit = Math.random() < critChance;
                    if (isCrit) {
                        damage *= 1.5;
                        result.isCritical = true;
                    }
                    
                    // 应用伤害
                    if (damageSystem) {
                        damageSystem.dealDamage(
                            caster.node,
                            target.node,
                            damage,
                            isCrit,
                            skill.element as ElementType
                        );
                    }
                    
                    result.totalDamage += damage;
                    break;

                case SkillEffectType.HEAL:
                    const healAmount = target.maxHp * effect.value;
                    result.totalHeal += healAmount;
                    // 实际治疗逻辑由角色组件处理
                    break;

                case SkillEffectType.SHIELD:
                    if (effectManager) {
                        effectManager.applyEffect(
                            effect.type,
                            target.id,
                            target.maxHp * effect.value,
                            effect.duration || 10,
                            EffectSourceType.SKILL,
                            skill.id
                        );
                        result.effectsApplied.push(`${target.id}:shield`);
                    }
                    break;

                case SkillEffectType.MULTI_HIT:
                    // 多段攻击在主循环中处理
                    break;

                case SkillEffectType.LIFESTEAL:
                    // 生命偷取在伤害计算后处理
                    const stealAmount = result.totalDamage * effect.value;
                    result.totalHeal += stealAmount;
                    break;

                default:
                    // 其他效果通过效果管理器应用
                    if (effectManager) {
                        effectManager.applyEffect(
                            effect.type,
                            target.id,
                            effect.value,
                            effect.duration || 5,
                            EffectSourceType.SKILL,
                            skill.id,
                            {
                                stackable: effect.stackable,
                                maxStacks: effect.maxStacks
                            }
                        );
                        result.effectsApplied.push(`${target.id}:${effect.type}`);
                    }
                    break;
            }
        }

        // 发送命中事件
        this.events.emit(SkillExecutor.EVENT_SKILL_HIT, {
            skill,
            caster,
            target,
            damage: result.totalDamage,
            heal: result.totalHeal
        });
    }

    /**
     * 播放技能音效
     */
    private playSkillSound(skill: SkillConfig): void {
        const audio = AudioManager.instance;
        if (!audio) return;

        // 根据技能类型/元素播放不同音效
        audio.playSFX(SFXType.SKILL_CAST);
    }

    // ==================== 冷却管理 ====================

    /**
     * 开始冷却
     */
    private startCooldown(casterId: string, skill: SkillConfig, level: number): void {
        if (!this._cooldowns.has(casterId)) {
            this._cooldowns.set(casterId, new Map());
        }

        const stats = SkillDatabase.instance.calculateSkillStats(skill.id, level);
        const cooldown = stats?.cooldown || skill.baseCooldown;

        this._cooldowns.get(casterId)!.set(skill.id, cooldown);

        this.events.emit(SkillExecutor.EVENT_COOLDOWN_START, {
            casterId,
            skillId: skill.id,
            cooldown
        });
    }

    /**
     * 更新冷却
     */
    private updateCooldowns(): void {
        const deltaTime = 0.1;

        for (const [casterId, skills] of this._cooldowns) {
            for (const [skillId, cooldown] of skills) {
                const newCooldown = cooldown - deltaTime;
                
                if (newCooldown <= 0) {
                    skills.delete(skillId);
                    this.events.emit(SkillExecutor.EVENT_COOLDOWN_END, {
                        casterId,
                        skillId
                    });
                } else {
                    skills.set(skillId, newCooldown);
                }
            }
        }
    }

    /**
     * 检查是否在冷却中
     */
    public isOnCooldown(casterId: string, skillId: string): boolean {
        const skills = this._cooldowns.get(casterId);
        if (!skills) return false;
        return skills.has(skillId);
    }

    /**
     * 获取剩余冷却时间
     */
    public getCooldown(casterId: string, skillId: string): number {
        const skills = this._cooldowns.get(casterId);
        if (!skills) return 0;
        return skills.get(skillId) || 0;
    }

    /**
     * 获取所有冷却信息
     */
    public getAllCooldowns(casterId: string): CooldownInfo[] {
        const skills = this._cooldowns.get(casterId);
        if (!skills) return [];

        const result: CooldownInfo[] = [];
        for (const [skillId, cooldown] of skills) {
            const skill = SkillDatabase.instance.getSkill(skillId);
            result.push({
                skillId,
                currentCooldown: cooldown,
                maxCooldown: skill?.baseCooldown || cooldown
            });
        }
        return result;
    }

    /**
     * 重置冷却
     */
    public resetCooldown(casterId: string, skillId?: string): void {
        if (skillId) {
            this._cooldowns.get(casterId)?.delete(skillId);
        } else {
            this._cooldowns.delete(casterId);
        }
    }

    /**
     * 减少冷却
     */
    public reduceCooldown(casterId: string, skillId: string, amount: number): void {
        const skills = this._cooldowns.get(casterId);
        if (!skills) return;

        const current = skills.get(skillId);
        if (current !== undefined) {
            const newCooldown = Math.max(0, current - amount);
            if (newCooldown <= 0) {
                skills.delete(skillId);
                this.events.emit(SkillExecutor.EVENT_COOLDOWN_END, { casterId, skillId });
            } else {
                skills.set(skillId, newCooldown);
            }
        }
    }

    // ==================== 能量管理 ====================

    /**
     * 获取能量
     */
    public getEnergy(casterId: string): number {
        return this._energy.get(casterId) || 0;
    }

    /**
     * 设置能量
     */
    public setEnergy(casterId: string, value: number): void {
        const oldEnergy = this._energy.get(casterId) || 0;
        const newEnergy = Math.max(0, Math.min(this._maxEnergy, value));
        this._energy.set(casterId, newEnergy);

        if (oldEnergy !== newEnergy) {
            this.events.emit(SkillExecutor.EVENT_ENERGY_CHANGED, {
                casterId,
                oldEnergy,
                newEnergy,
                maxEnergy: this._maxEnergy
            });
        }
    }

    /**
     * 增加能量
     */
    public addEnergy(casterId: string, amount: number): void {
        const current = this.getEnergy(casterId);
        this.setEnergy(casterId, current + amount);
    }

    /**
     * 消耗能量
     */
    public consumeEnergy(casterId: string, amount: number): boolean {
        const current = this.getEnergy(casterId);
        if (current < amount) return false;
        this.setEnergy(casterId, current - amount);
        return true;
    }

    /**
     * 能量是否满
     */
    public isEnergyFull(casterId: string): boolean {
        return this.getEnergy(casterId) >= this._maxEnergy;
    }

    // ==================== 辅助方法 ====================

    /**
     * 找最近的目标
     */
    private findClosestTarget(position: Vec3, targets: SkillTargetInfo[]): SkillTargetInfo {
        let closest = targets[0];
        let minDistance = Infinity;

        for (const target of targets) {
            const distance = Vec3.distance(position, target.position);
            if (distance < minDistance) {
                minDistance = distance;
                closest = target;
            }
        }

        return closest;
    }

    /**
     * 找血量最低的目标
     */
    private findLowestHpTarget(targets: SkillTargetInfo[]): SkillTargetInfo {
        let lowest = targets[0];
        let minHpRatio = 1;

        for (const target of targets) {
            const ratio = target.hp / target.maxHp;
            if (ratio < minHpRatio) {
                minHpRatio = ratio;
                lowest = target;
            }
        }

        return lowest;
    }

    /**
     * 获取随机目标
     */
    private getRandomTargets(targets: SkillTargetInfo[], count: number): SkillTargetInfo[] {
        const result: SkillTargetInfo[] = [];
        const available = [...targets];

        for (let i = 0; i < count && available.length > 0; i++) {
            const index = Math.floor(Math.random() * available.length);
            result.push(available[index]);
            // 允许重复选择
        }

        return result;
    }

    /**
     * 重置所有状态
     */
    public reset(): void {
        this._cooldowns.clear();
        this._energy.clear();
    }

    onDestroy() {
        this.unscheduleAllCallbacks();
        if (SkillExecutor._instance === this) {
            SkillExecutor._instance = null;
        }
    }
}
