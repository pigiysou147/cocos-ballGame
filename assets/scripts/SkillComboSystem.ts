import { _decorator, Component, Node, EventTarget } from 'cc';
import { SkillDatabase, SkillConfig, SkillEffectType } from './SkillData';
import { ElementType } from './ElementSystem';
const { ccclass, property } = _decorator;

/**
 * 连携触发条件
 */
export enum ComboTriggerType {
    SKILL_SEQUENCE = 'skill_sequence',     // 技能序列
    ELEMENT_CHAIN = 'element_chain',       // 元素连锁
    SAME_ELEMENT = 'same_element',         // 同属性连续
    CRITICAL_HIT = 'critical_hit',         // 暴击触发
    LOW_HP = 'low_hp',                     // 低血量触发
    BUFF_STACK = 'buff_stack',             // Buff叠加
    ENEMY_DEBUFF = 'enemy_debuff',         // 敌人Debuff状态
    COMBO_COUNT = 'combo_count'            // 连击数触发
}

/**
 * 连携效果
 */
export interface ComboEffect {
    type: 'damage_bonus' | 'heal_bonus' | 'cooldown_reset' | 'energy_refund' | 
          'extra_hit' | 'element_burst' | 'buff_extend' | 'chain_skill';
    value: number;
    targetSkillId?: string;               // 链接触发的技能ID
}

/**
 * 技能连携配置
 */
export interface SkillComboConfig {
    id: string;
    name: string;
    description: string;
    triggerType: ComboTriggerType;
    
    // 触发条件
    requiredSkills?: string[];             // 需要的技能序列
    requiredElements?: ElementType[];      // 需要的元素序列
    requiredComboCount?: number;           // 需要的连击数
    requiredBuffStacks?: number;           // 需要的Buff层数
    triggerChance?: number;                // 触发概率 (0-1)
    
    // 连携效果
    effects: ComboEffect[];
    
    // 显示
    icon?: string;
    animationId?: string;
    
    // 限制
    cooldown?: number;                     // 连携冷却
    maxTriggerPerBattle?: number;          // 每场战斗最大触发次数
}

/**
 * 连携状态
 */
export interface ComboState {
    skillSequence: string[];               // 技能释放序列
    elementSequence: ElementType[];        // 元素序列
    currentComboCount: number;             // 当前连击数
    lastSkillTime: number;                 // 上次技能时间
    comboCooldowns: Map<string, number>;   // 连携冷却
    comboTriggerCounts: Map<string, number>; // 连携触发次数
}

/**
 * 连携触发结果
 */
export interface ComboTriggerResult {
    comboId: string;
    comboName: string;
    effects: ComboEffect[];
    damageBonus: number;
    healBonus: number;
    chainSkillId?: string;
}

/**
 * 技能连携系统
 * Skill Combo System - Skill chain and combo mechanics
 */
@ccclass('SkillComboSystem')
export class SkillComboSystem extends Component {
    private static _instance: SkillComboSystem | null = null;

    // 连携配置
    private _combos: Map<string, SkillComboConfig> = new Map();
    
    // 各角色的连携状态
    private _states: Map<string, ComboState> = new Map();
    
    // 技能序列超时时间(秒)
    private readonly SEQUENCE_TIMEOUT = 5;
    
    // 最大序列长度
    private readonly MAX_SEQUENCE_LENGTH = 5;

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_COMBO_TRIGGERED = 'combo_triggered';
    public static readonly EVENT_COMBO_READY = 'combo_ready';
    public static readonly EVENT_COMBO_CHAIN = 'combo_chain';

    public static get instance(): SkillComboSystem | null {
        return SkillComboSystem._instance;
    }

    onLoad() {
        if (SkillComboSystem._instance) {
            this.node.destroy();
            return;
        }
        SkillComboSystem._instance = this;

        this.initCombos();
    }

    start() {
        // 定时更新冷却和序列超时
        this.schedule(this.updateStates.bind(this), 0.5);
    }

    /**
     * 初始化连携配置
     */
    private initCombos(): void {
        // ==================== 技能序列连携 ====================
        
        this.addCombo({
            id: 'combo_fire_burst',
            name: '火焰爆发',
            description: '连续释放两个火属性技能，触发火焰爆发造成额外伤害',
            triggerType: ComboTriggerType.SAME_ELEMENT,
            requiredElements: [ElementType.FIRE, ElementType.FIRE],
            effects: [
                { type: 'damage_bonus', value: 0.5 },
                { type: 'element_burst', value: 1.0 }
            ],
            cooldown: 10
        });

        this.addCombo({
            id: 'combo_ice_shatter',
            name: '冰霜碎裂',
            description: '连续释放两个水属性技能，冻结敌人并造成碎裂伤害',
            triggerType: ComboTriggerType.SAME_ELEMENT,
            requiredElements: [ElementType.WATER, ElementType.WATER],
            effects: [
                { type: 'damage_bonus', value: 0.4 },
                { type: 'extra_hit', value: 1 }
            ],
            cooldown: 10
        });

        this.addCombo({
            id: 'combo_storm_call',
            name: '风暴召唤',
            description: '释放风和雷属性技能组合，召唤风暴',
            triggerType: ComboTriggerType.ELEMENT_CHAIN,
            requiredElements: [ElementType.WIND, ElementType.THUNDER],
            effects: [
                { type: 'damage_bonus', value: 0.6 },
                { type: 'chain_skill', value: 1, targetSkillId: 'skill_storm_strike' }
            ],
            cooldown: 15
        });

        this.addCombo({
            id: 'combo_light_dark',
            name: '光暗交织',
            description: '光与暗的力量交织，造成巨大伤害',
            triggerType: ComboTriggerType.ELEMENT_CHAIN,
            requiredElements: [ElementType.LIGHT, ElementType.DARK],
            effects: [
                { type: 'damage_bonus', value: 0.8 },
                { type: 'buff_extend', value: 2 }
            ],
            cooldown: 20
        });

        this.addCombo({
            id: 'combo_melt',
            name: '融化反应',
            description: '火与水元素碰撞产生融化反应',
            triggerType: ComboTriggerType.ELEMENT_CHAIN,
            requiredElements: [ElementType.FIRE, ElementType.WATER],
            effects: [
                { type: 'damage_bonus', value: 0.5 },
                { type: 'energy_refund', value: 20 }
            ],
            cooldown: 8
        });

        this.addCombo({
            id: 'combo_overload',
            name: '超载反应',
            description: '火与雷元素碰撞产生超载爆炸',
            triggerType: ComboTriggerType.ELEMENT_CHAIN,
            requiredElements: [ElementType.FIRE, ElementType.THUNDER],
            effects: [
                { type: 'damage_bonus', value: 0.7 },
                { type: 'extra_hit', value: 2 }
            ],
            cooldown: 10
        });

        // ==================== 连击数连携 ====================

        this.addCombo({
            id: 'combo_10_hits',
            name: '连击达人',
            description: '达成10连击时触发',
            triggerType: ComboTriggerType.COMBO_COUNT,
            requiredComboCount: 10,
            effects: [
                { type: 'damage_bonus', value: 0.2 }
            ],
            cooldown: 5
        });

        this.addCombo({
            id: 'combo_30_hits',
            name: '连击大师',
            description: '达成30连击时触发',
            triggerType: ComboTriggerType.COMBO_COUNT,
            requiredComboCount: 30,
            effects: [
                { type: 'damage_bonus', value: 0.5 },
                { type: 'cooldown_reset', value: 1 }
            ],
            cooldown: 10
        });

        this.addCombo({
            id: 'combo_50_hits',
            name: '连击传说',
            description: '达成50连击时触发',
            triggerType: ComboTriggerType.COMBO_COUNT,
            requiredComboCount: 50,
            effects: [
                { type: 'damage_bonus', value: 1.0 },
                { type: 'energy_refund', value: 50 },
                { type: 'cooldown_reset', value: 1 }
            ],
            cooldown: 20,
            maxTriggerPerBattle: 3
        });

        // ==================== 暴击连携 ====================

        this.addCombo({
            id: 'combo_crit_chain',
            name: '致命连锁',
            description: '暴击时有概率触发额外攻击',
            triggerType: ComboTriggerType.CRITICAL_HIT,
            triggerChance: 0.3,
            effects: [
                { type: 'extra_hit', value: 1 },
                { type: 'damage_bonus', value: 0.3 }
            ],
            cooldown: 3
        });

        // ==================== 低血量连携 ====================

        this.addCombo({
            id: 'combo_last_stand',
            name: '绝地反击',
            description: '血量低于30%时技能伤害大幅提升',
            triggerType: ComboTriggerType.LOW_HP,
            effects: [
                { type: 'damage_bonus', value: 1.0 }
            ]
        });

        // ==================== 特定技能序列 ====================

        this.addCombo({
            id: 'combo_triple_fire',
            name: '三连火焰',
            description: '连续释放三个火属性技能触发终极火焰',
            triggerType: ComboTriggerType.SKILL_SEQUENCE,
            requiredSkills: ['skill_fire_blade', 'skill_inferno', 'skill_meteor'],
            effects: [
                { type: 'damage_bonus', value: 1.5 },
                { type: 'chain_skill', value: 1, targetSkillId: 'skill_ultimate_fire' }
            ],
            cooldown: 30,
            maxTriggerPerBattle: 1
        });

        console.log(`技能连携系统初始化完成，共 ${this._combos.size} 个连携`);
    }

    /**
     * 添加连携配置
     */
    public addCombo(config: SkillComboConfig): void {
        this._combos.set(config.id, config);
    }

    /**
     * 获取或创建角色状态
     */
    private getState(characterId: string): ComboState {
        if (!this._states.has(characterId)) {
            this._states.set(characterId, {
                skillSequence: [],
                elementSequence: [],
                currentComboCount: 0,
                lastSkillTime: 0,
                comboCooldowns: new Map(),
                comboTriggerCounts: new Map()
            });
        }
        return this._states.get(characterId)!;
    }

    /**
     * 记录技能释放
     */
    public recordSkillCast(
        characterId: string, 
        skillId: string, 
        element?: ElementType
    ): ComboTriggerResult[] {
        const state = this.getState(characterId);
        const now = Date.now();

        // 检查序列是否超时
        if (now - state.lastSkillTime > this.SEQUENCE_TIMEOUT * 1000) {
            state.skillSequence = [];
            state.elementSequence = [];
        }

        // 记录技能
        state.skillSequence.push(skillId);
        if (element) {
            state.elementSequence.push(element);
        }
        state.lastSkillTime = now;

        // 限制序列长度
        if (state.skillSequence.length > this.MAX_SEQUENCE_LENGTH) {
            state.skillSequence.shift();
        }
        if (state.elementSequence.length > this.MAX_SEQUENCE_LENGTH) {
            state.elementSequence.shift();
        }

        // 检查触发的连携
        return this.checkCombos(characterId, state);
    }

    /**
     * 记录连击
     */
    public recordComboHit(characterId: string, count: number): ComboTriggerResult[] {
        const state = this.getState(characterId);
        state.currentComboCount = count;

        // 检查连击数连携
        return this.checkComboCountTriggers(characterId, state);
    }

    /**
     * 记录暴击
     */
    public recordCriticalHit(characterId: string): ComboTriggerResult[] {
        return this.checkCriticalHitTriggers(characterId);
    }

    /**
     * 检查低血量触发
     */
    public checkLowHpTriggers(characterId: string, hpRatio: number): ComboTriggerResult[] {
        if (hpRatio > 0.3) return [];

        const results: ComboTriggerResult[] = [];
        const state = this.getState(characterId);

        for (const [id, combo] of this._combos) {
            if (combo.triggerType !== ComboTriggerType.LOW_HP) continue;
            if (this.isOnCooldown(state, id)) continue;

            results.push(this.createTriggerResult(combo));
            this.startCooldown(state, id, combo.cooldown || 0);
        }

        return results;
    }

    /**
     * 检查所有连携
     */
    private checkCombos(characterId: string, state: ComboState): ComboTriggerResult[] {
        const results: ComboTriggerResult[] = [];

        for (const [id, combo] of this._combos) {
            if (this.isOnCooldown(state, id)) continue;
            if (this.exceedsMaxTriggers(state, id, combo)) continue;

            let triggered = false;

            switch (combo.triggerType) {
                case ComboTriggerType.SKILL_SEQUENCE:
                    triggered = this.checkSkillSequence(state, combo);
                    break;
                case ComboTriggerType.ELEMENT_CHAIN:
                    triggered = this.checkElementChain(state, combo);
                    break;
                case ComboTriggerType.SAME_ELEMENT:
                    triggered = this.checkSameElement(state, combo);
                    break;
            }

            if (triggered) {
                results.push(this.createTriggerResult(combo));
                this.startCooldown(state, id, combo.cooldown || 0);
                this.incrementTriggerCount(state, id);

                // 清空序列
                if (combo.triggerType === ComboTriggerType.SKILL_SEQUENCE) {
                    state.skillSequence = [];
                }
            }
        }

        if (results.length > 0) {
            for (const result of results) {
                this.events.emit(SkillComboSystem.EVENT_COMBO_TRIGGERED, {
                    characterId,
                    ...result
                });
            }
        }

        return results;
    }

    /**
     * 检查技能序列
     */
    private checkSkillSequence(state: ComboState, combo: SkillComboConfig): boolean {
        if (!combo.requiredSkills) return false;

        const required = combo.requiredSkills;
        const sequence = state.skillSequence;

        if (sequence.length < required.length) return false;

        // 检查最后N个技能是否匹配
        const startIndex = sequence.length - required.length;
        for (let i = 0; i < required.length; i++) {
            if (sequence[startIndex + i] !== required[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查元素连锁
     */
    private checkElementChain(state: ComboState, combo: SkillComboConfig): boolean {
        if (!combo.requiredElements) return false;

        const required = combo.requiredElements;
        const sequence = state.elementSequence;

        if (sequence.length < required.length) return false;

        // 检查最后N个元素是否匹配
        const startIndex = sequence.length - required.length;
        for (let i = 0; i < required.length; i++) {
            if (sequence[startIndex + i] !== required[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查同属性连续
     */
    private checkSameElement(state: ComboState, combo: SkillComboConfig): boolean {
        if (!combo.requiredElements) return false;

        const required = combo.requiredElements;
        const sequence = state.elementSequence;
        const targetElement = required[0];
        const count = required.length;

        if (sequence.length < count) return false;

        // 检查最后N个元素是否都是目标元素
        for (let i = sequence.length - count; i < sequence.length; i++) {
            if (sequence[i] !== targetElement) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查连击数触发
     */
    private checkComboCountTriggers(characterId: string, state: ComboState): ComboTriggerResult[] {
        const results: ComboTriggerResult[] = [];

        for (const [id, combo] of this._combos) {
            if (combo.triggerType !== ComboTriggerType.COMBO_COUNT) continue;
            if (!combo.requiredComboCount) continue;
            if (this.isOnCooldown(state, id)) continue;
            if (this.exceedsMaxTriggers(state, id, combo)) continue;

            if (state.currentComboCount >= combo.requiredComboCount) {
                results.push(this.createTriggerResult(combo));
                this.startCooldown(state, id, combo.cooldown || 0);
                this.incrementTriggerCount(state, id);
            }
        }

        return results;
    }

    /**
     * 检查暴击触发
     */
    private checkCriticalHitTriggers(characterId: string): ComboTriggerResult[] {
        const results: ComboTriggerResult[] = [];
        const state = this.getState(characterId);

        for (const [id, combo] of this._combos) {
            if (combo.triggerType !== ComboTriggerType.CRITICAL_HIT) continue;
            if (this.isOnCooldown(state, id)) continue;

            // 检查触发概率
            if (combo.triggerChance && Math.random() > combo.triggerChance) {
                continue;
            }

            results.push(this.createTriggerResult(combo));
            this.startCooldown(state, id, combo.cooldown || 0);
        }

        return results;
    }

    /**
     * 创建触发结果
     */
    private createTriggerResult(combo: SkillComboConfig): ComboTriggerResult {
        let damageBonus = 0;
        let healBonus = 0;
        let chainSkillId: string | undefined;

        for (const effect of combo.effects) {
            switch (effect.type) {
                case 'damage_bonus':
                    damageBonus += effect.value;
                    break;
                case 'heal_bonus':
                    healBonus += effect.value;
                    break;
                case 'chain_skill':
                    chainSkillId = effect.targetSkillId;
                    break;
            }
        }

        return {
            comboId: combo.id,
            comboName: combo.name,
            effects: combo.effects,
            damageBonus,
            healBonus,
            chainSkillId
        };
    }

    // 冷却管理
    private isOnCooldown(state: ComboState, comboId: string): boolean {
        return (state.comboCooldowns.get(comboId) || 0) > 0;
    }

    private startCooldown(state: ComboState, comboId: string, duration: number): void {
        if (duration > 0) {
            state.comboCooldowns.set(comboId, duration);
        }
    }

    private exceedsMaxTriggers(state: ComboState, comboId: string, combo: SkillComboConfig): boolean {
        if (!combo.maxTriggerPerBattle) return false;
        return (state.comboTriggerCounts.get(comboId) || 0) >= combo.maxTriggerPerBattle;
    }

    private incrementTriggerCount(state: ComboState, comboId: string): void {
        const current = state.comboTriggerCounts.get(comboId) || 0;
        state.comboTriggerCounts.set(comboId, current + 1);
    }

    /**
     * 更新状态
     */
    private updateStates(): void {
        const deltaTime = 0.5;

        for (const [, state] of this._states) {
            // 更新冷却
            for (const [comboId, cooldown] of state.comboCooldowns) {
                const newCooldown = cooldown - deltaTime;
                if (newCooldown <= 0) {
                    state.comboCooldowns.delete(comboId);
                } else {
                    state.comboCooldowns.set(comboId, newCooldown);
                }
            }
        }
    }

    /**
     * 重置角色状态
     */
    public resetState(characterId: string): void {
        this._states.delete(characterId);
    }

    /**
     * 重置战斗状态（新战斗开始时调用）
     */
    public resetBattleState(characterId: string): void {
        const state = this.getState(characterId);
        state.skillSequence = [];
        state.elementSequence = [];
        state.currentComboCount = 0;
        state.comboCooldowns.clear();
        state.comboTriggerCounts.clear();
    }

    /**
     * 获取所有连携配置
     */
    public getAllCombos(): SkillComboConfig[] {
        return Array.from(this._combos.values());
    }

    /**
     * 获取可用的连携提示
     */
    public getAvailableComboHints(characterId: string): SkillComboConfig[] {
        const state = this.getState(characterId);
        const hints: SkillComboConfig[] = [];

        for (const [id, combo] of this._combos) {
            if (this.isOnCooldown(state, id)) continue;
            if (this.exceedsMaxTriggers(state, id, combo)) continue;

            // 检查是否接近触发条件
            if (this.isCloseToTrigger(state, combo)) {
                hints.push(combo);
            }
        }

        return hints;
    }

    /**
     * 检查是否接近触发条件
     */
    private isCloseToTrigger(state: ComboState, combo: SkillComboConfig): boolean {
        switch (combo.triggerType) {
            case ComboTriggerType.SKILL_SEQUENCE:
                if (!combo.requiredSkills) return false;
                // 如果已经匹配了一半以上
                return state.skillSequence.length >= combo.requiredSkills.length / 2;

            case ComboTriggerType.ELEMENT_CHAIN:
            case ComboTriggerType.SAME_ELEMENT:
                if (!combo.requiredElements) return false;
                return state.elementSequence.length >= combo.requiredElements.length - 1;

            case ComboTriggerType.COMBO_COUNT:
                if (!combo.requiredComboCount) return false;
                return state.currentComboCount >= combo.requiredComboCount * 0.7;

            default:
                return false;
        }
    }

    onDestroy() {
        this.unscheduleAllCallbacks();
        if (SkillComboSystem._instance === this) {
            SkillComboSystem._instance = null;
        }
    }
}
