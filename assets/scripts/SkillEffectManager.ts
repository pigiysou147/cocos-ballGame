import { _decorator, Component, Node, sys, EventTarget } from 'cc';
import { SkillEffectType } from './SkillData';
const { ccclass, property } = _decorator;

/**
 * 效果来源类型
 */
export enum EffectSourceType {
    SKILL = 'skill',           // 技能
    EQUIPMENT = 'equipment',   // 装备
    PASSIVE = 'passive',       // 被动
    LEADER = 'leader',         // 队长技
    ITEM = 'item',             // 道具
    ENVIRONMENT = 'environment' // 环境
}

/**
 * 效果实例
 */
export interface EffectInstance {
    id: string;                        // 唯一ID
    effectType: SkillEffectType;       // 效果类型
    sourceType: EffectSourceType;      // 来源类型
    sourceId: string;                  // 来源ID（技能ID、装备ID等）
    targetId: string;                  // 目标ID
    
    value: number;                     // 效果数值
    duration: number;                  // 剩余持续时间(-1表示永久)
    maxDuration: number;               // 最大持续时间
    tickInterval: number;              // 触发间隔(DOT/HOT)
    lastTickTime: number;              // 上次触发时间
    
    stacks: number;                    // 当前层数
    maxStacks: number;                 // 最大层数
    stackable: boolean;                // 是否可叠加
    
    isPermanent: boolean;              // 是否永久
    isPositive: boolean;               // 是否正面效果
    canDispel: boolean;                // 是否可驱散
    canRefresh: boolean;               // 是否可刷新
    
    startTime: number;                 // 开始时间
    data?: any;                        // 额外数据
}

/**
 * 效果统计
 */
export interface EffectStats {
    atkBonus: number;          // 攻击加成
    defBonus: number;          // 防御加成
    spdBonus: number;          // 速度加成
    critBonus: number;         // 暴击加成
    critDmgBonus: number;      // 暴击伤害加成
    hpBonus: number;           // 生命加成
    healBonus: number;         // 治疗加成
    dmgBonus: number;          // 伤害加成
    dmgReduction: number;      // 伤害减免
    lifesteal: number;         // 生命偷取
    
    // 控制状态
    isStunned: boolean;        // 眩晕
    isFrozen: boolean;         // 冰冻
    isParalyzed: boolean;      // 麻痹
    isSilenced: boolean;       // 沉默
    isInvincible: boolean;     // 无敌
    
    // 护盾
    shieldAmount: number;      // 护盾值
    
    // DOT/HOT
    dotDamage: number;         // 持续伤害
    hotHeal: number;           // 持续治疗
}

/**
 * Buff/Debuff效果管理器
 * Skill Effect Manager - Manages buffs, debuffs and status effects
 */
@ccclass('SkillEffectManager')
export class SkillEffectManager extends Component {
    private static _instance: SkillEffectManager | null = null;

    // 所有活动效果 (targetId -> effects)
    private _activeEffects: Map<string, EffectInstance[]> = new Map();
    
    // 效果统计缓存 (targetId -> stats)
    private _statsCache: Map<string, EffectStats> = new Map();
    
    // 效果ID计数器
    private _effectIdCounter: number = 0;

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_EFFECT_APPLIED = 'effect_applied';
    public static readonly EVENT_EFFECT_REMOVED = 'effect_removed';
    public static readonly EVENT_EFFECT_STACKED = 'effect_stacked';
    public static readonly EVENT_EFFECT_TICK = 'effect_tick';
    public static readonly EVENT_CONTROL_STATE_CHANGED = 'control_state_changed';

    public static get instance(): SkillEffectManager | null {
        return SkillEffectManager._instance;
    }

    onLoad() {
        if (SkillEffectManager._instance) {
            this.node.destroy();
            return;
        }
        SkillEffectManager._instance = this;
    }

    start() {
        // 每帧更新效果
        this.schedule(this.updateEffects.bind(this), 0.1);
    }

    /**
     * 应用效果
     */
    public applyEffect(
        effectType: SkillEffectType,
        targetId: string,
        value: number,
        duration: number,
        sourceType: EffectSourceType,
        sourceId: string,
        options?: {
            stackable?: boolean;
            maxStacks?: number;
            canDispel?: boolean;
            canRefresh?: boolean;
            tickInterval?: number;
            data?: any;
        }
    ): EffectInstance {
        const effectId = `effect_${++this._effectIdCounter}`;
        const now = Date.now();
        
        const effect: EffectInstance = {
            id: effectId,
            effectType,
            sourceType,
            sourceId,
            targetId,
            value,
            duration,
            maxDuration: duration,
            tickInterval: options?.tickInterval || 1,
            lastTickTime: now,
            stacks: 1,
            maxStacks: options?.maxStacks || 1,
            stackable: options?.stackable ?? false,
            isPermanent: duration < 0,
            isPositive: this.isPositiveEffect(effectType),
            canDispel: options?.canDispel ?? true,
            canRefresh: options?.canRefresh ?? true,
            startTime: now,
            data: options?.data
        };

        // 获取目标当前效果列表
        if (!this._activeEffects.has(targetId)) {
            this._activeEffects.set(targetId, []);
        }
        const targetEffects = this._activeEffects.get(targetId)!;

        // 检查是否存在相同效果
        const existingEffect = targetEffects.find(e => 
            e.effectType === effectType && 
            e.sourceId === sourceId
        );

        if (existingEffect) {
            if (existingEffect.stackable && existingEffect.stacks < existingEffect.maxStacks) {
                // 叠加
                existingEffect.stacks++;
                existingEffect.value = value * existingEffect.stacks;
                
                if (existingEffect.canRefresh) {
                    existingEffect.duration = effect.maxDuration;
                }
                
                this.events.emit(SkillEffectManager.EVENT_EFFECT_STACKED, {
                    effect: existingEffect,
                    targetId
                });
                
                this.invalidateCache(targetId);
                return existingEffect;
            } else if (existingEffect.canRefresh) {
                // 刷新持续时间
                existingEffect.duration = effect.maxDuration;
                existingEffect.value = Math.max(existingEffect.value, value);
                this.invalidateCache(targetId);
                return existingEffect;
            }
        }

        // 添加新效果
        targetEffects.push(effect);
        
        this.events.emit(SkillEffectManager.EVENT_EFFECT_APPLIED, {
            effect,
            targetId
        });
        
        // 检查控制状态变化
        if (this.isControlEffect(effectType)) {
            this.events.emit(SkillEffectManager.EVENT_CONTROL_STATE_CHANGED, {
                targetId,
                effectType,
                active: true
            });
        }
        
        this.invalidateCache(targetId);
        return effect;
    }

    /**
     * 移除效果
     */
    public removeEffect(effectId: string, targetId: string): boolean {
        const targetEffects = this._activeEffects.get(targetId);
        if (!targetEffects) return false;

        const index = targetEffects.findIndex(e => e.id === effectId);
        if (index === -1) return false;

        const effect = targetEffects[index];
        targetEffects.splice(index, 1);

        this.events.emit(SkillEffectManager.EVENT_EFFECT_REMOVED, {
            effect,
            targetId,
            reason: 'manual'
        });

        // 检查控制状态变化
        if (this.isControlEffect(effect.effectType)) {
            const stillHasControl = targetEffects.some(e => e.effectType === effect.effectType);
            if (!stillHasControl) {
                this.events.emit(SkillEffectManager.EVENT_CONTROL_STATE_CHANGED, {
                    targetId,
                    effectType: effect.effectType,
                    active: false
                });
            }
        }

        this.invalidateCache(targetId);
        return true;
    }

    /**
     * 移除所有来自指定来源的效果
     */
    public removeEffectsBySource(targetId: string, sourceId: string): number {
        const targetEffects = this._activeEffects.get(targetId);
        if (!targetEffects) return 0;

        const toRemove = targetEffects.filter(e => e.sourceId === sourceId);
        toRemove.forEach(e => this.removeEffect(e.id, targetId));
        
        return toRemove.length;
    }

    /**
     * 驱散效果
     */
    public dispelEffects(targetId: string, count: number, dispelPositive: boolean): number {
        const targetEffects = this._activeEffects.get(targetId);
        if (!targetEffects) return 0;

        const dispellable = targetEffects.filter(e => 
            e.canDispel && e.isPositive === dispelPositive
        );

        let dispelled = 0;
        for (const effect of dispellable) {
            if (dispelled >= count) break;
            if (this.removeEffect(effect.id, targetId)) {
                dispelled++;
            }
        }

        return dispelled;
    }

    /**
     * 清除目标所有效果
     */
    public clearAllEffects(targetId: string): void {
        const targetEffects = this._activeEffects.get(targetId);
        if (!targetEffects) return;

        const effects = [...targetEffects];
        for (const effect of effects) {
            this.removeEffect(effect.id, targetId);
        }
    }

    /**
     * 更新效果
     */
    private updateEffects(): void {
        const now = Date.now();
        const deltaTime = 0.1; // 100ms

        for (const [targetId, effects] of this._activeEffects) {
            const toRemove: string[] = [];

            for (const effect of effects) {
                // 检查持续时间
                if (!effect.isPermanent) {
                    effect.duration -= deltaTime;
                    if (effect.duration <= 0) {
                        toRemove.push(effect.id);
                        continue;
                    }
                }

                // 处理DOT/HOT
                if (effect.effectType === SkillEffectType.DOT ||
                    effect.effectType === SkillEffectType.HOT ||
                    effect.effectType === SkillEffectType.BURN ||
                    effect.effectType === SkillEffectType.POISON) {
                    
                    const timeSinceLastTick = (now - effect.lastTickTime) / 1000;
                    if (timeSinceLastTick >= effect.tickInterval) {
                        effect.lastTickTime = now;
                        
                        this.events.emit(SkillEffectManager.EVENT_EFFECT_TICK, {
                            effect,
                            targetId,
                            tickDamage: effect.value
                        });
                    }
                }
            }

            // 移除过期效果
            for (const effectId of toRemove) {
                this.removeEffect(effectId, targetId);
            }
        }
    }

    /**
     * 获取目标的效果统计
     */
    public getEffectStats(targetId: string): EffectStats {
        // 检查缓存
        if (this._statsCache.has(targetId)) {
            return this._statsCache.get(targetId)!;
        }

        const stats: EffectStats = {
            atkBonus: 0,
            defBonus: 0,
            spdBonus: 0,
            critBonus: 0,
            critDmgBonus: 0,
            hpBonus: 0,
            healBonus: 0,
            dmgBonus: 0,
            dmgReduction: 0,
            lifesteal: 0,
            isStunned: false,
            isFrozen: false,
            isParalyzed: false,
            isSilenced: false,
            isInvincible: false,
            shieldAmount: 0,
            dotDamage: 0,
            hotHeal: 0
        };

        const effects = this._activeEffects.get(targetId) || [];
        
        for (const effect of effects) {
            switch (effect.effectType) {
                case SkillEffectType.BUFF_ATK:
                    stats.atkBonus += effect.value;
                    break;
                case SkillEffectType.DEBUFF_ATK:
                    stats.atkBonus -= effect.value;
                    break;
                case SkillEffectType.BUFF_DEF:
                    stats.defBonus += effect.value;
                    break;
                case SkillEffectType.DEBUFF_DEF:
                    stats.defBonus -= effect.value;
                    break;
                case SkillEffectType.BUFF_SPD:
                    stats.spdBonus += effect.value;
                    break;
                case SkillEffectType.DEBUFF_SPD:
                    stats.spdBonus -= effect.value;
                    break;
                case SkillEffectType.BUFF_CRIT:
                    stats.critBonus += effect.value;
                    break;
                case SkillEffectType.SHIELD:
                    stats.shieldAmount += effect.value;
                    break;
                case SkillEffectType.LIFESTEAL:
                    stats.lifesteal += effect.value;
                    break;
                case SkillEffectType.DOT:
                case SkillEffectType.BURN:
                case SkillEffectType.POISON:
                    stats.dotDamage += effect.value;
                    break;
                case SkillEffectType.HOT:
                    stats.hotHeal += effect.value;
                    break;
                case SkillEffectType.STUN:
                    stats.isStunned = true;
                    break;
                case SkillEffectType.FREEZE:
                    stats.isFrozen = true;
                    break;
                case SkillEffectType.PARALYZE:
                    stats.isParalyzed = true;
                    break;
                case SkillEffectType.INVINCIBLE:
                    stats.isInvincible = true;
                    break;
            }
        }

        this._statsCache.set(targetId, stats);
        return stats;
    }

    /**
     * 获取目标所有效果
     */
    public getEffects(targetId: string): EffectInstance[] {
        return this._activeEffects.get(targetId) || [];
    }

    /**
     * 获取目标指定类型的效果
     */
    public getEffectsByType(targetId: string, effectType: SkillEffectType): EffectInstance[] {
        const effects = this._activeEffects.get(targetId) || [];
        return effects.filter(e => e.effectType === effectType);
    }

    /**
     * 检查目标是否有指定效果
     */
    public hasEffect(targetId: string, effectType: SkillEffectType): boolean {
        const effects = this._activeEffects.get(targetId) || [];
        return effects.some(e => e.effectType === effectType);
    }

    /**
     * 检查是否是正面效果
     */
    private isPositiveEffect(effectType: SkillEffectType): boolean {
        const positiveEffects = [
            SkillEffectType.HEAL,
            SkillEffectType.SHIELD,
            SkillEffectType.BUFF_ATK,
            SkillEffectType.BUFF_DEF,
            SkillEffectType.BUFF_SPD,
            SkillEffectType.BUFF_CRIT,
            SkillEffectType.HOT,
            SkillEffectType.INVINCIBLE,
            SkillEffectType.ENERGY,
            SkillEffectType.REVIVE,
            SkillEffectType.LIFESTEAL,
            SkillEffectType.REFLECT
        ];
        return positiveEffects.includes(effectType);
    }

    /**
     * 检查是否是控制效果
     */
    private isControlEffect(effectType: SkillEffectType): boolean {
        const controlEffects = [
            SkillEffectType.STUN,
            SkillEffectType.FREEZE,
            SkillEffectType.PARALYZE
        ];
        return controlEffects.includes(effectType);
    }

    /**
     * 检查目标是否被控制
     */
    public isControlled(targetId: string): boolean {
        const stats = this.getEffectStats(targetId);
        return stats.isStunned || stats.isFrozen || stats.isParalyzed;
    }

    /**
     * 使缓存失效
     */
    private invalidateCache(targetId: string): void {
        this._statsCache.delete(targetId);
    }

    /**
     * 清除所有效果和缓存
     */
    public reset(): void {
        this._activeEffects.clear();
        this._statsCache.clear();
    }

    /**
     * 获取效果图标颜色
     */
    public getEffectColor(effectType: SkillEffectType): string {
        const colorMap: { [key: string]: string } = {
            [SkillEffectType.BUFF_ATK]: '#FF6B6B',
            [SkillEffectType.BUFF_DEF]: '#4ECDC4',
            [SkillEffectType.BUFF_SPD]: '#45B7D1',
            [SkillEffectType.BUFF_CRIT]: '#F7DC6F',
            [SkillEffectType.HEAL]: '#2ECC71',
            [SkillEffectType.HOT]: '#27AE60',
            [SkillEffectType.SHIELD]: '#95A5A6',
            [SkillEffectType.INVINCIBLE]: '#FFD700',
            [SkillEffectType.DEBUFF_ATK]: '#9B59B6',
            [SkillEffectType.DEBUFF_DEF]: '#8E44AD',
            [SkillEffectType.DEBUFF_SPD]: '#7D3C98',
            [SkillEffectType.DOT]: '#E74C3C',
            [SkillEffectType.BURN]: '#FF4500',
            [SkillEffectType.POISON]: '#32CD32',
            [SkillEffectType.STUN]: '#FFA500',
            [SkillEffectType.FREEZE]: '#00CED1',
            [SkillEffectType.PARALYZE]: '#FFFF00'
        };
        return colorMap[effectType] || '#FFFFFF';
    }

    /**
     * 获取效果名称
     */
    public getEffectName(effectType: SkillEffectType): string {
        const nameMap: { [key: string]: string } = {
            [SkillEffectType.DAMAGE]: '伤害',
            [SkillEffectType.HEAL]: '治疗',
            [SkillEffectType.SHIELD]: '护盾',
            [SkillEffectType.BUFF_ATK]: '攻击提升',
            [SkillEffectType.BUFF_DEF]: '防御提升',
            [SkillEffectType.BUFF_SPD]: '速度提升',
            [SkillEffectType.BUFF_CRIT]: '暴击提升',
            [SkillEffectType.DEBUFF_ATK]: '攻击降低',
            [SkillEffectType.DEBUFF_DEF]: '防御降低',
            [SkillEffectType.DEBUFF_SPD]: '速度降低',
            [SkillEffectType.DOT]: '持续伤害',
            [SkillEffectType.HOT]: '持续治疗',
            [SkillEffectType.STUN]: '眩晕',
            [SkillEffectType.FREEZE]: '冰冻',
            [SkillEffectType.BURN]: '燃烧',
            [SkillEffectType.POISON]: '中毒',
            [SkillEffectType.PARALYZE]: '麻痹',
            [SkillEffectType.INVINCIBLE]: '无敌',
            [SkillEffectType.REVIVE]: '复活',
            [SkillEffectType.ENERGY]: '能量恢复',
            [SkillEffectType.DISPEL]: '驱散',
            [SkillEffectType.MULTI_HIT]: '多段攻击',
            [SkillEffectType.PIERCE]: '穿透',
            [SkillEffectType.LIFESTEAL]: '生命偷取',
            [SkillEffectType.REFLECT]: '反弹'
        };
        return nameMap[effectType] || '未知效果';
    }

    onDestroy() {
        this.unscheduleAllCallbacks();
        if (SkillEffectManager._instance === this) {
            SkillEffectManager._instance = null;
        }
    }
}
