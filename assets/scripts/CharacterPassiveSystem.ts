import { _decorator, EventTarget } from 'cc';
import { CharacterPassiveConfig, ElementType } from './CharacterData';
import { 
    CharacterFeatureSystem, 
    PassiveSkillConfig, 
    PassiveMarkType, 
    PassiveTriggerCondition,
    PassiveEffectType 
} from './CharacterFeatureSystem';

/**
 * 被动效果实例
 */
export interface PassiveEffectInstance {
    passiveId: string;
    config: PassiveSkillConfig;
    characterId: string;        // 来源角色ID
    slotType: 'main' | 'sub';   // 角色所在位置
    slotIndex: number;          // 槽位索引
    
    // 运行时状态
    isActive: boolean;          // 是否激活
    currentStacks: number;      // 当前叠加层数
    lastTriggerTime: number;    // 上次触发时间
    remainingDuration: number;  // 剩余持续时间
    
    // 效果值（可能被增幅/削弱）
    effectValue: number;
    effectDuration: number;
}

/**
 * 被动触发上下文
 */
export interface PassiveTriggerContext {
    trigger: PassiveTriggerCondition;
    
    // 战斗状态
    currentCombo: number;
    isFeverActive: boolean;
    currentHpPercent: number;
    
    // 触发相关
    targetId?: string;
    damageDealt?: number;
    isCritical?: boolean;
    isKill?: boolean;
    
    // 时间
    deltaTime: number;
    battleTime: number;
}

/**
 * 被动效果计算结果
 */
export interface PassiveCalculationResult {
    // 属性加成
    atkBonus: number;
    defBonus: number;
    hpBonus: number;
    speedBonus: number;
    critRateBonus: number;
    critDamageBonus: number;
    
    // 伤害加成
    skillDamageBonus: number;
    pfDamageBonus: number;
    directDamageBonus: number;
    finalDamageBonus: number;
    elementDamageBonus: number;
    
    // 防御相关
    damageReduction: number;
    
    // 能量相关
    energyGainBonus: number;
    startEnergy: number;
    killEnergy: number;
    
    // 治疗相关
    healingBonus: number;
    regenAmount: number;
    
    // 特殊效果
    hasPenetration: boolean;
    hasMultiHit: boolean;
    hasFloat: boolean;
    reviveSpeedBonus: number;
    
    // 控制效果
    stunChance: number;
    freezeChance: number;
    paralyzeChance: number;
    burnChance: number;
    poisonChance: number;
    resistReduction: number;
    
    // 召唤效果
    summonConfigs: SummonConfig[];
}

/**
 * 召唤配置
 */
export interface SummonConfig {
    type: string;
    count: number;
    duration: number;
    damage: number;
}

/**
 * 角色被动系统 - 管理被动技能的激活、触发与效果计算
 */
export class CharacterPassiveSystem {
    private static _instance: CharacterPassiveSystem | null = null;
    
    // 当前激活的被动效果
    private _activePassives: Map<string, PassiveEffectInstance[]> = new Map();
    
    // 全队被动效果缓存
    private _teamPassiveCache: PassiveCalculationResult | null = null;
    
    // 事件系统
    private _eventTarget: EventTarget = new EventTarget();
    
    // 周期触发计时器
    private _periodicTimers: Map<string, number> = new Map();
    
    public static get instance(): CharacterPassiveSystem {
        if (!CharacterPassiveSystem._instance) {
            CharacterPassiveSystem._instance = new CharacterPassiveSystem();
        }
        return CharacterPassiveSystem._instance;
    }
    
    /**
     * 初始化角色被动（队伍配置变化时调用）
     */
    public initCharacterPassives(
        characterId: string,
        passiveConfigs: CharacterPassiveConfig[],
        slotType: 'main' | 'sub',
        slotIndex: number,
        characterLevel: number,
        characterStar: number
    ): void {
        // 清除该角色之前的被动
        this._activePassives.delete(characterId);
        
        const instances: PassiveEffectInstance[] = [];
        const featureSystem = CharacterFeatureSystem.instance;
        
        for (const passiveConfig of passiveConfigs) {
            // 检查解锁条件
            if (characterLevel < passiveConfig.unlockLevel || 
                characterStar < passiveConfig.unlockStar) {
                continue;
            }
            
            const config = featureSystem.getPassiveConfig(passiveConfig.passiveId);
            if (!config) continue;
            
            // 检查M标识限制
            const isMainSlot = slotType === 'main';
            if (!featureSystem.isPassiveActiveInSlot(config, isMainSlot)) {
                continue;
            }
            
            // 创建实例
            const instance: PassiveEffectInstance = {
                passiveId: passiveConfig.passiveId,
                config: config,
                characterId: characterId,
                slotType: slotType,
                slotIndex: slotIndex,
                isActive: config.triggerCondition === PassiveTriggerCondition.ALWAYS,
                currentStacks: config.triggerCondition === PassiveTriggerCondition.ALWAYS ? 1 : 0,
                lastTriggerTime: 0,
                remainingDuration: config.effectDuration === -1 ? Infinity : 0,
                effectValue: config.effectValue,
                effectDuration: config.effectDuration
            };
            
            instances.push(instance);
        }
        
        if (instances.length > 0) {
            this._activePassives.set(characterId, instances);
        }
        
        // 清除缓存
        this._teamPassiveCache = null;
        
        console.log(`角色 ${characterId} 初始化了 ${instances.length} 个被动效果`);
    }
    
    /**
     * 清除角色被动
     */
    public clearCharacterPassives(characterId: string): void {
        this._activePassives.delete(characterId);
        this._teamPassiveCache = null;
    }
    
    /**
     * 清除所有被动
     */
    public clearAllPassives(): void {
        this._activePassives.clear();
        this._periodicTimers.clear();
        this._teamPassiveCache = null;
    }
    
    /**
     * 触发被动效果
     */
    public triggerPassives(context: PassiveTriggerContext): PassiveCalculationResult {
        const result = this.createEmptyResult();
        
        // 遍历所有角色的被动
        this._activePassives.forEach((instances, characterId) => {
            for (const instance of instances) {
                if (this.shouldTrigger(instance, context)) {
                    this.activatePassive(instance, context);
                }
                
                // 如果被动处于激活状态，累加效果
                if (instance.isActive && instance.currentStacks > 0) {
                    this.applyPassiveEffect(result, instance);
                }
            }
        });
        
        return result;
    }
    
    /**
     * 检查被动是否应该触发
     */
    private shouldTrigger(instance: PassiveEffectInstance, context: PassiveTriggerContext): boolean {
        const config = instance.config;
        
        // 检查触发条件
        switch (config.triggerCondition) {
            case PassiveTriggerCondition.ALWAYS:
                return true;
                
            case PassiveTriggerCondition.ON_HIT:
                return context.trigger === PassiveTriggerCondition.ON_HIT;
                
            case PassiveTriggerCondition.ON_CRIT:
                return context.trigger === PassiveTriggerCondition.ON_CRIT || 
                       (context.trigger === PassiveTriggerCondition.ON_HIT && context.isCritical);
                
            case PassiveTriggerCondition.ON_KILL:
                return context.trigger === PassiveTriggerCondition.ON_KILL || context.isKill;
                
            case PassiveTriggerCondition.ON_COMBO:
                // 每10连击触发一次
                return context.currentCombo > 0 && context.currentCombo % 10 === 0;
                
            case PassiveTriggerCondition.ON_PF:
                return context.trigger === PassiveTriggerCondition.ON_PF;
                
            case PassiveTriggerCondition.ON_SKILL:
                return context.trigger === PassiveTriggerCondition.ON_SKILL;
                
            case PassiveTriggerCondition.ON_FEVER:
                return context.isFeverActive;
                
            case PassiveTriggerCondition.ON_DAMAGE:
                return context.trigger === PassiveTriggerCondition.ON_DAMAGE;
                
            case PassiveTriggerCondition.ON_LOW_HP:
                return context.currentHpPercent <= 0.3;
                
            case PassiveTriggerCondition.ON_BATTLE_START:
                return context.battleTime < 0.1;
                
            case PassiveTriggerCondition.PERIODIC:
                // 检查周期触发
                const timerId = `${instance.characterId}_${instance.passiveId}`;
                const lastTime = this._periodicTimers.get(timerId) || 0;
                if (context.battleTime - lastTime >= config.cooldown) {
                    this._periodicTimers.set(timerId, context.battleTime);
                    return true;
                }
                return false;
                
            default:
                return false;
        }
    }
    
    /**
     * 激活被动效果
     */
    private activatePassive(instance: PassiveEffectInstance, context: PassiveTriggerContext): void {
        const config = instance.config;
        
        // 检查冷却
        if (config.cooldown > 0) {
            const timeSinceLastTrigger = context.battleTime - instance.lastTriggerTime;
            if (timeSinceLastTrigger < config.cooldown) {
                return;
            }
        }
        
        // 检查触发概率
        if (config.triggerChance < 1.0 && Math.random() > config.triggerChance) {
            return;
        }
        
        // 更新触发时间
        instance.lastTriggerTime = context.battleTime;
        
        // 处理叠加
        if (config.stackable) {
            instance.currentStacks = Math.min(instance.currentStacks + 1, config.maxStacks);
        } else {
            instance.currentStacks = 1;
        }
        
        // 设置持续时间
        if (config.effectDuration > 0) {
            instance.remainingDuration = config.effectDuration;
        }
        
        instance.isActive = true;
        
        // 发送触发事件
        this._eventTarget.emit('passive-triggered', {
            passiveId: instance.passiveId,
            characterId: instance.characterId,
            stacks: instance.currentStacks
        });
    }
    
    /**
     * 应用被动效果到结果
     */
    private applyPassiveEffect(result: PassiveCalculationResult, instance: PassiveEffectInstance): void {
        const config = instance.config;
        const effectValue = instance.effectValue * instance.currentStacks;
        
        switch (config.effectType) {
            case PassiveEffectType.ATK_BOOST:
                result.atkBonus += effectValue;
                break;
            case PassiveEffectType.DEF_BOOST:
                result.defBonus += effectValue;
                break;
            case PassiveEffectType.HP_BOOST:
                result.hpBonus += effectValue;
                break;
            case PassiveEffectType.CRIT_RATE_BOOST:
                result.critRateBonus += effectValue;
                break;
            case PassiveEffectType.CRIT_DAMAGE_BOOST:
                result.critDamageBonus += effectValue;
                break;
            case PassiveEffectType.SKILL_DAMAGE_BOOST:
                result.skillDamageBonus += effectValue;
                break;
            case PassiveEffectType.PF_DAMAGE_BOOST:
                result.pfDamageBonus += effectValue;
                break;
            case PassiveEffectType.DIRECT_DAMAGE_BOOST:
                result.directDamageBonus += effectValue;
                break;
            case PassiveEffectType.FINAL_DAMAGE_BOOST:
                result.finalDamageBonus += effectValue;
                break;
            case PassiveEffectType.ELEMENT_DAMAGE_BOOST:
                result.elementDamageBonus += effectValue;
                break;
            case PassiveEffectType.DAMAGE_REDUCTION:
                result.damageReduction += effectValue;
                break;
            case PassiveEffectType.ENERGY_GAIN:
                result.energyGainBonus += effectValue;
                break;
            case PassiveEffectType.ENERGY_START:
                result.startEnergy = Math.max(result.startEnergy, effectValue);
                break;
            case PassiveEffectType.ENERGY_KILL:
                result.killEnergy += effectValue;
                break;
            case PassiveEffectType.HEAL:
            case PassiveEffectType.REGEN:
                result.regenAmount += effectValue;
                break;
            case PassiveEffectType.REVIVE_SPEED:
                result.reviveSpeedBonus += effectValue;
                break;
            case PassiveEffectType.STUN:
                result.stunChance = Math.max(result.stunChance, config.triggerChance);
                break;
            case PassiveEffectType.FREEZE:
                result.freezeChance = Math.max(result.freezeChance, config.triggerChance);
                break;
            case PassiveEffectType.PARALYZE:
                result.paralyzeChance = Math.max(result.paralyzeChance, config.triggerChance);
                break;
            case PassiveEffectType.BURN:
                result.burnChance = Math.max(result.burnChance, config.triggerChance);
                break;
            case PassiveEffectType.POISON:
                result.poisonChance = Math.max(result.poisonChance, config.triggerChance);
                break;
            case PassiveEffectType.RESIST_REDUCTION:
                result.resistReduction += effectValue;
                break;
            case PassiveEffectType.PENETRATION:
                result.hasPenetration = true;
                break;
            case PassiveEffectType.MULTI_HIT:
                result.hasMultiHit = true;
                break;
            case PassiveEffectType.FLOAT:
                result.hasFloat = true;
                break;
            case PassiveEffectType.SUMMON:
                result.summonConfigs.push({
                    type: 'coop_ball',
                    count: Math.floor(effectValue),
                    duration: instance.effectDuration,
                    damage: 50
                });
                break;
        }
    }
    
    /**
     * 更新被动状态（每帧调用）
     */
    public update(deltaTime: number): void {
        this._activePassives.forEach((instances, characterId) => {
            for (const instance of instances) {
                if (instance.isActive && instance.remainingDuration > 0 && instance.remainingDuration !== Infinity) {
                    instance.remainingDuration -= deltaTime;
                    
                    if (instance.remainingDuration <= 0) {
                        // 效果到期
                        instance.isActive = instance.config.triggerCondition === PassiveTriggerCondition.ALWAYS;
                        instance.currentStacks = instance.isActive ? 1 : 0;
                        instance.remainingDuration = 0;
                        
                        this._eventTarget.emit('passive-expired', {
                            passiveId: instance.passiveId,
                            characterId: characterId
                        });
                    }
                }
            }
        });
        
        // 清除缓存（因为状态可能变化）
        this._teamPassiveCache = null;
    }
    
    /**
     * 获取全队被动效果（缓存优化）
     */
    public getTeamPassiveEffects(context: PassiveTriggerContext): PassiveCalculationResult {
        // 使用缓存（如果触发条件没有变化）
        if (this._teamPassiveCache) {
            return this._teamPassiveCache;
        }
        
        const result = this.triggerPassives(context);
        this._teamPassiveCache = result;
        return result;
    }
    
    /**
     * 获取角色的被动效果列表
     */
    public getCharacterPassives(characterId: string): PassiveEffectInstance[] {
        return this._activePassives.get(characterId) || [];
    }
    
    /**
     * 获取所有激活的被动效果
     */
    public getAllActivePassives(): PassiveEffectInstance[] {
        const all: PassiveEffectInstance[] = [];
        this._activePassives.forEach(instances => {
            for (const instance of instances) {
                if (instance.isActive) {
                    all.push(instance);
                }
            }
        });
        return all;
    }
    
    /**
     * 检查是否有特定效果类型的被动
     */
    public hasPassiveEffectType(effectType: PassiveEffectType): boolean {
        for (const instances of this._activePassives.values()) {
            for (const instance of instances) {
                if (instance.isActive && instance.config.effectType === effectType) {
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * 获取特定效果类型的总值
     */
    public getPassiveEffectValue(effectType: PassiveEffectType): number {
        let total = 0;
        this._activePassives.forEach(instances => {
            for (const instance of instances) {
                if (instance.isActive && instance.config.effectType === effectType) {
                    total += instance.effectValue * instance.currentStacks;
                }
            }
        });
        return total;
    }
    
    /**
     * 按优先级获取被动（用于UI显示等）
     */
    public getSortedPassives(characterId: string): PassiveEffectInstance[] {
        const passives = this.getCharacterPassives(characterId);
        return [...passives].sort((a, b) => b.config.priority - a.config.priority);
    }
    
    /**
     * 获取M标识被动列表
     */
    public getMMarkedPassives(): PassiveEffectInstance[] {
        const result: PassiveEffectInstance[] = [];
        this._activePassives.forEach(instances => {
            for (const instance of instances) {
                if (instance.config.markType === PassiveMarkType.M_MARK) {
                    result.push(instance);
                }
            }
        });
        return result;
    }
    
    /**
     * 获取无条件被动列表（任何位置生效）
     */
    public getUnconditionalPassives(): PassiveEffectInstance[] {
        const result: PassiveEffectInstance[] = [];
        this._activePassives.forEach(instances => {
            for (const instance of instances) {
                if (instance.config.markType === PassiveMarkType.NONE) {
                    result.push(instance);
                }
            }
        });
        return result;
    }
    
    /**
     * 创建空的计算结果
     */
    private createEmptyResult(): PassiveCalculationResult {
        return {
            atkBonus: 0,
            defBonus: 0,
            hpBonus: 0,
            speedBonus: 0,
            critRateBonus: 0,
            critDamageBonus: 0,
            skillDamageBonus: 0,
            pfDamageBonus: 0,
            directDamageBonus: 0,
            finalDamageBonus: 0,
            elementDamageBonus: 0,
            damageReduction: 0,
            energyGainBonus: 0,
            startEnergy: 0,
            killEnergy: 0,
            healingBonus: 0,
            regenAmount: 0,
            hasPenetration: false,
            hasMultiHit: false,
            hasFloat: false,
            reviveSpeedBonus: 0,
            stunChance: 0,
            freezeChance: 0,
            paralyzeChance: 0,
            burnChance: 0,
            poisonChance: 0,
            resistReduction: 0,
            summonConfigs: []
        };
    }
    
    /**
     * 订阅被动触发事件
     */
    public onPassiveTriggered(callback: (data: { passiveId: string; characterId: string; stacks: number }) => void): void {
        this._eventTarget.on('passive-triggered', callback);
    }
    
    /**
     * 订阅被动过期事件
     */
    public onPassiveExpired(callback: (data: { passiveId: string; characterId: string }) => void): void {
        this._eventTarget.on('passive-expired', callback);
    }
    
    /**
     * 取消订阅
     */
    public offPassiveTriggered(callback: Function): void {
        this._eventTarget.off('passive-triggered', callback);
    }
    
    public offPassiveExpired(callback: Function): void {
        this._eventTarget.off('passive-expired', callback);
    }
}
