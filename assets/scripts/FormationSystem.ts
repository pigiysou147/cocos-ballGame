import { _decorator, Component, sys, EventTarget } from 'cc';
import { CharacterDatabase, CharacterConfig, CharacterInstance, ElementType, CharacterRarity } from './CharacterData';
import { EquipmentDatabase, EquipmentConfig, EquipmentInstance } from './EquipmentData';
import { SkillDatabase, SkillConfig, SkillType } from './SkillData';
const { ccclass, property } = _decorator;

/**
 * 位置类型
 */
export enum SlotType {
    MAIN = 'main',      // 主位
    SUB = 'sub'         // 副位
}

/**
 * 魂珠类型
 */
export enum SoulOrbType {
    ATTACK = 'attack',          // 攻击型
    SKILL = 'skill',            // 技能型
    SUPPORT = 'support',        // 辅助型
    DEFENSE = 'defense'         // 防御型
}

/**
 * 魂珠效果类型
 */
export enum SoulOrbEffectType {
    SKILL_DAMAGE = 'skill_damage',          // 技伤加成
    FINAL_DAMAGE = 'final_damage',          // 终伤加成
    ELEMENT_DAMAGE = 'element_damage',      // 属性伤害
    CHARGE_SPEED = 'charge_speed',          // 充能速度
    CRIT_RATE = 'crit_rate',                // 暴击率
    CRIT_DAMAGE = 'crit_damage',            // 暴击伤害
    ATTACK_PERCENT = 'attack_percent',      // 攻击百分比
    HP_PERCENT = 'hp_percent',              // 生命百分比
    HEAL_BONUS = 'heal_bonus',              // 治疗加成
    FEVER_DAMAGE = 'fever_damage',          // Fever伤害
    PF_DAMAGE = 'pf_damage',                // PF伤害
    DIRECT_DAMAGE = 'direct_damage'         // 直击伤害
}

/**
 * 魂珠配置
 */
export interface SoulOrbConfig {
    id: string;
    name: string;
    description: string;
    type: SoulOrbType;
    rarity: CharacterRarity;
    
    // 基础效果
    effects: SoulOrbEffect[];
    
    // 适用元素（可选，空为通用）
    elements?: ElementType[];
    
    iconPath?: string;
}

/**
 * 魂珠效果
 */
export interface SoulOrbEffect {
    type: SoulOrbEffectType;
    value: number;              // 效果数值
    condition?: string;         // 触发条件（可选）
}

/**
 * 魂珠实例
 */
export interface SoulOrbInstance {
    uniqueId: string;
    configId: string;
    level: number;              // 强化等级
    exp: number;
}

/**
 * 主位槽位数据
 */
export interface MainSlotData {
    characterId: string | null;     // 角色实例ID
    weaponId: string | null;        // 武器实例ID
    soulOrbId: string | null;       // 魂珠实例ID
    subSlot: SubSlotData;           // 对应的副位
}

/**
 * 副位槽位数据
 */
export interface SubSlotData {
    characterId: string | null;     // 角色实例ID（副位没有武器和魂珠）
}

/**
 * 编队数据（盘）
 */
export interface FormationData {
    id: string;
    name: string;
    
    // 3个主位槽（每个主位绑定1个副位）
    mainSlots: [MainSlotData, MainSlotData, MainSlotData];
    
    // 队长位置（0/1/2，对应三个主位）
    leaderIndex: number;
    
    // 编队属性（推荐纯色）
    primaryElement?: ElementType;
    
    // 编队战力
    totalPower: number;
    
    // 创建时间
    createdAt: number;
    updatedAt: number;
}

/**
 * 角色在编队中的状态
 */
export interface FormationCharacterState {
    characterId: string;
    slotType: SlotType;
    slotIndex: number;              // 0/1/2
    
    // 属性贡献（主位100%，副位25%）
    statContribution: number;
    
    // 技能状态
    skillEnabled: boolean;          // 大招是否可用
    passivesEnabled: string[];      // 生效的被动（副位M标识被动不生效）
    
    // 绑定的武器和魂珠（仅主位）
    weaponId?: string;
    soulOrbId?: string;
}

/**
 * 编队加成汇总
 */
export interface FormationBonuses {
    // 队长技加成
    leaderSkillBonus: {
        skillId: string;
        effects: { type: string; value: number }[];
    } | null;
    
    // 属性统一加成
    elementUnityBonus: number;      // 纯色队伍额外加成
    
    // 武器加成汇总
    weaponBonuses: { type: string; value: number }[];
    
    // 魂珠加成汇总
    soulOrbBonuses: { type: string; value: number }[];
    
    // 被动技能加成
    passiveBonuses: { skillId: string; effects: any[] }[];
    
    // 总属性加成
    totalStats: {
        attackPercent: number;
        hpPercent: number;
        defensePercent: number;
        skillDamage: number;
        finalDamage: number;
        chargeSpeed: number;
        critRate: number;
        critDamage: number;
    };
}

/**
 * 编队系统 - 3主3副 + 武器魂珠
 * Formation System - 3 Main + 3 Sub + Weapons + Soul Orbs
 */
@ccclass('FormationSystem')
export class FormationSystem extends Component {
    private static _instance: FormationSystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_FORMATION_CHANGED = 'formation-changed';
    public static readonly EVENT_SLOT_CHANGED = 'slot-changed';

    // 编队列表
    private _formations: Map<string, FormationData> = new Map();
    
    // 当前使用的编队ID
    private _currentFormationId: string = 'formation_1';
    
    // 魂珠配置数据库
    private _soulOrbDatabase: Map<string, SoulOrbConfig> = new Map();
    
    // 玩家拥有的魂珠
    private _ownedSoulOrbs: Map<string, SoulOrbInstance> = new Map();

    // 最大编队数量
    private readonly MAX_FORMATIONS = 10;

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_formation_data';

    public static get instance(): FormationSystem | null {
        return FormationSystem._instance;
    }

    onLoad() {
        if (FormationSystem._instance) {
            this.node.destroy();
            return;
        }
        FormationSystem._instance = this;

        this.initSoulOrbDatabase();
        this.loadData();
        
        // 如果没有编队，创建默认编队
        if (this._formations.size === 0) {
            this.createDefaultFormations();
        }
    }

    /**
     * 初始化魂珠数据库
     */
    private initSoulOrbDatabase(): void {
        // ========== 攻击型魂珠 ==========
        this.addSoulOrb({
            id: 'orb_atk_001',
            name: '破坏之魂',
            description: '提升攻击力',
            type: SoulOrbType.ATTACK,
            rarity: CharacterRarity.SR,
            effects: [
                { type: SoulOrbEffectType.ATTACK_PERCENT, value: 0.08 }
            ]
        });

        this.addSoulOrb({
            id: 'orb_atk_002',
            name: '毁灭之魂',
            description: '大幅提升攻击力',
            type: SoulOrbType.ATTACK,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.ATTACK_PERCENT, value: 0.15 }
            ]
        });

        this.addSoulOrb({
            id: 'orb_crit_001',
            name: '致命之魂',
            description: '提升暴击率和暴击伤害',
            type: SoulOrbType.ATTACK,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.CRIT_RATE, value: 0.05 },
                { type: SoulOrbEffectType.CRIT_DAMAGE, value: 0.15 }
            ]
        });

        // ========== 技能型魂珠 ==========
        this.addSoulOrb({
            id: 'orb_skill_001',
            name: '技巧之魂',
            description: '提升技能伤害',
            type: SoulOrbType.SKILL,
            rarity: CharacterRarity.SR,
            effects: [
                { type: SoulOrbEffectType.SKILL_DAMAGE, value: 0.10 }
            ]
        });

        this.addSoulOrb({
            id: 'orb_skill_002',
            name: '奥义之魂',
            description: '大幅提升技能伤害',
            type: SoulOrbType.SKILL,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.SKILL_DAMAGE, value: 0.18 }
            ]
        });

        this.addSoulOrb({
            id: 'orb_final_001',
            name: '终结之魂',
            description: '提升终伤（乘算）',
            type: SoulOrbType.SKILL,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.FINAL_DAMAGE, value: 0.08 }
            ]
        });

        this.addSoulOrb({
            id: 'orb_charge_001',
            name: '充能之魂',
            description: '提升充能速度',
            type: SoulOrbType.SKILL,
            rarity: CharacterRarity.SR,
            effects: [
                { type: SoulOrbEffectType.CHARGE_SPEED, value: 0.15 }
            ]
        });

        // ========== 辅助型魂珠 ==========
        this.addSoulOrb({
            id: 'orb_heal_001',
            name: '治愈之魂',
            description: '提升治疗效果',
            type: SoulOrbType.SUPPORT,
            rarity: CharacterRarity.SR,
            effects: [
                { type: SoulOrbEffectType.HEAL_BONUS, value: 0.20 }
            ]
        });

        this.addSoulOrb({
            id: 'orb_fever_001',
            name: '狂热之魂',
            description: '提升Fever模式伤害',
            type: SoulOrbType.SUPPORT,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.FEVER_DAMAGE, value: 0.15 }
            ]
        });

        // ========== 防御型魂珠 ==========
        this.addSoulOrb({
            id: 'orb_hp_001',
            name: '生命之魂',
            description: '提升生命值',
            type: SoulOrbType.DEFENSE,
            rarity: CharacterRarity.SR,
            effects: [
                { type: SoulOrbEffectType.HP_PERCENT, value: 0.10 }
            ]
        });

        // ========== 元素专属魂珠 ==========
        this.addSoulOrb({
            id: 'orb_fire_001',
            name: '烈焰之魂',
            description: '火属性角色技伤+12%',
            type: SoulOrbType.SKILL,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.SKILL_DAMAGE, value: 0.12 }
            ],
            elements: [ElementType.FIRE]
        });

        this.addSoulOrb({
            id: 'orb_water_001',
            name: '流水之魂',
            description: '水属性角色技伤+12%',
            type: SoulOrbType.SKILL,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.SKILL_DAMAGE, value: 0.12 }
            ],
            elements: [ElementType.WATER]
        });

        this.addSoulOrb({
            id: 'orb_pf_001',
            name: 'PF之魂',
            description: '提升Power Flip伤害',
            type: SoulOrbType.ATTACK,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.PF_DAMAGE, value: 0.20 }
            ]
        });

        this.addSoulOrb({
            id: 'orb_direct_001',
            name: '直击之魂',
            description: '提升直接伤害',
            type: SoulOrbType.ATTACK,
            rarity: CharacterRarity.SSR,
            effects: [
                { type: SoulOrbEffectType.DIRECT_DAMAGE, value: 0.15 }
            ]
        });

        console.log(`魂珠数据库初始化完成，共 ${this._soulOrbDatabase.size} 种魂珠`);
    }

    /**
     * 添加魂珠配置
     */
    private addSoulOrb(config: SoulOrbConfig): void {
        this._soulOrbDatabase.set(config.id, config);
    }

    /**
     * 创建默认编队
     */
    private createDefaultFormations(): void {
        for (let i = 1; i <= 5; i++) {
            const formation = this.createEmptyFormation(`formation_${i}`, `编队 ${i}`);
            this._formations.set(formation.id, formation);
        }
        console.log('已创建默认编队');
    }

    /**
     * 创建空编队
     */
    private createEmptyFormation(id: string, name: string): FormationData {
        return {
            id,
            name,
            mainSlots: [
                { characterId: null, weaponId: null, soulOrbId: null, subSlot: { characterId: null } },
                { characterId: null, weaponId: null, soulOrbId: null, subSlot: { characterId: null } },
                { characterId: null, weaponId: null, soulOrbId: null, subSlot: { characterId: null } }
            ],
            leaderIndex: 0,
            totalPower: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    /**
     * 获取编队
     */
    public getFormation(formationId: string): FormationData | undefined {
        return this._formations.get(formationId);
    }

    /**
     * 获取当前编队
     */
    public getCurrentFormation(): FormationData | undefined {
        return this._formations.get(this._currentFormationId);
    }

    /**
     * 设置当前编队
     */
    public setCurrentFormation(formationId: string): boolean {
        if (!this._formations.has(formationId)) {
            return false;
        }
        this._currentFormationId = formationId;
        this.saveData();
        return true;
    }

    /**
     * 获取所有编队
     */
    public getAllFormations(): FormationData[] {
        return Array.from(this._formations.values());
    }

    /**
     * 设置主位角色
     */
    public setMainCharacter(formationId: string, slotIndex: number, characterId: string | null): boolean {
        const formation = this._formations.get(formationId);
        if (!formation || slotIndex < 0 || slotIndex > 2) {
            return false;
        }

        // 检查角色是否已在编队中
        if (characterId && this.isCharacterInFormation(formationId, characterId)) {
            console.log('角色已在编队中');
            return false;
        }

        formation.mainSlots[slotIndex].characterId = characterId;
        formation.updatedAt = Date.now();
        
        this.updateFormationStats(formation);
        this.events.emit(FormationSystem.EVENT_SLOT_CHANGED, { formationId, slotIndex, slotType: SlotType.MAIN });
        this.saveData();
        
        return true;
    }

    /**
     * 设置副位角色
     */
    public setSubCharacter(formationId: string, slotIndex: number, characterId: string | null): boolean {
        const formation = this._formations.get(formationId);
        if (!formation || slotIndex < 0 || slotIndex > 2) {
            return false;
        }

        // 检查角色是否已在编队中
        if (characterId && this.isCharacterInFormation(formationId, characterId)) {
            console.log('角色已在编队中');
            return false;
        }

        formation.mainSlots[slotIndex].subSlot.characterId = characterId;
        formation.updatedAt = Date.now();
        
        this.updateFormationStats(formation);
        this.events.emit(FormationSystem.EVENT_SLOT_CHANGED, { formationId, slotIndex, slotType: SlotType.SUB });
        this.saveData();
        
        return true;
    }

    /**
     * 设置武器（仅主位）
     */
    public setWeapon(formationId: string, slotIndex: number, weaponId: string | null): boolean {
        const formation = this._formations.get(formationId);
        if (!formation || slotIndex < 0 || slotIndex > 2) {
            return false;
        }

        formation.mainSlots[slotIndex].weaponId = weaponId;
        formation.updatedAt = Date.now();
        
        this.updateFormationStats(formation);
        this.saveData();
        
        return true;
    }

    /**
     * 设置魂珠（仅主位）
     */
    public setSoulOrb(formationId: string, slotIndex: number, soulOrbId: string | null): boolean {
        const formation = this._formations.get(formationId);
        if (!formation || slotIndex < 0 || slotIndex > 2) {
            return false;
        }

        formation.mainSlots[slotIndex].soulOrbId = soulOrbId;
        formation.updatedAt = Date.now();
        
        this.updateFormationStats(formation);
        this.saveData();
        
        return true;
    }

    /**
     * 设置队长
     */
    public setLeader(formationId: string, slotIndex: number): boolean {
        const formation = this._formations.get(formationId);
        if (!formation || slotIndex < 0 || slotIndex > 2) {
            return false;
        }

        // 队长必须是主位
        if (!formation.mainSlots[slotIndex].characterId) {
            console.log('该位置没有角色');
            return false;
        }

        formation.leaderIndex = slotIndex;
        formation.updatedAt = Date.now();
        
        this.events.emit(FormationSystem.EVENT_FORMATION_CHANGED, { formationId });
        this.saveData();
        
        return true;
    }

    /**
     * 检查角色是否在编队中
     */
    public isCharacterInFormation(formationId: string, characterId: string): boolean {
        const formation = this._formations.get(formationId);
        if (!formation) return false;

        for (const slot of formation.mainSlots) {
            if (slot.characterId === characterId) return true;
            if (slot.subSlot.characterId === characterId) return true;
        }

        return false;
    }

    /**
     * 更新编队属性
     */
    private updateFormationStats(formation: FormationData): void {
        // 检测主属性（纯色检测）
        const elements: ElementType[] = [];
        
        for (const slot of formation.mainSlots) {
            if (slot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(slot.characterId);
                if (config) {
                    elements.push(config.element);
                }
            }
            if (slot.subSlot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(slot.subSlot.characterId);
                if (config) {
                    elements.push(config.element);
                }
            }
        }

        // 判断是否纯色
        if (elements.length > 0 && elements.every(e => e === elements[0])) {
            formation.primaryElement = elements[0];
        } else {
            formation.primaryElement = undefined;
        }

        // 计算总战力
        formation.totalPower = this.calculateFormationPower(formation);
    }

    /**
     * 计算编队战力
     */
    public calculateFormationPower(formation: FormationData): number {
        let totalPower = 0;

        for (let i = 0; i < 3; i++) {
            const mainSlot = formation.mainSlots[i];

            // 主位角色（100%属性）
            if (mainSlot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(mainSlot.characterId);
                if (config) {
                    const power = this.calculateCharacterPower(config.baseStats);
                    totalPower += power * 1.0;
                }
            }

            // 副位角色（25%属性）
            if (mainSlot.subSlot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(mainSlot.subSlot.characterId);
                if (config) {
                    const power = this.calculateCharacterPower(config.baseStats);
                    totalPower += power * 0.25;
                }
            }

            // 武器加成
            // TODO: 从装备系统获取武器数据

            // 魂珠加成
            // TODO: 从魂珠实例获取加成
        }

        // 纯色加成（+10%）
        if (formation.primaryElement) {
            totalPower *= 1.1;
        }

        return Math.floor(totalPower);
    }

    /**
     * 计算角色基础战力
     */
    private calculateCharacterPower(stats: any): number {
        return stats.hp * 0.5 + 
               stats.attack * 3 + 
               stats.defense * 2 + 
               stats.speed * 1 +
               stats.critRate * 500 +
               stats.critDamage * 200 +
               stats.skillPower * 300;
    }

    /**
     * 获取编队加成汇总
     */
    public getFormationBonuses(formationId: string): FormationBonuses {
        const formation = this._formations.get(formationId);
        const bonuses: FormationBonuses = {
            leaderSkillBonus: null,
            elementUnityBonus: 0,
            weaponBonuses: [],
            soulOrbBonuses: [],
            passiveBonuses: [],
            totalStats: {
                attackPercent: 0,
                hpPercent: 0,
                defensePercent: 0,
                skillDamage: 0,
                finalDamage: 0,
                chargeSpeed: 0,
                critRate: 0,
                critDamage: 0
            }
        };

        if (!formation) return bonuses;

        // 队长技（仅首位主位）
        const leaderSlot = formation.mainSlots[formation.leaderIndex];
        if (leaderSlot.characterId) {
            const config = CharacterDatabase.instance.getCharacter(leaderSlot.characterId);
            if (config?.skillSlots.leaderSkillId) {
                const leaderSkill = SkillDatabase.instance.getSkill(config.skillSlots.leaderSkillId);
                if (leaderSkill) {
                    bonuses.leaderSkillBonus = {
                        skillId: leaderSkill.id,
                        effects: leaderSkill.effects.map(e => ({ type: e.type, value: e.value }))
                    };
                }
            }
        }

        // 纯色加成
        if (formation.primaryElement) {
            bonuses.elementUnityBonus = 0.10; // +10%
        }

        // 魂珠加成（仅主位）
        for (const slot of formation.mainSlots) {
            if (slot.soulOrbId) {
                const orbInstance = this._ownedSoulOrbs.get(slot.soulOrbId);
                if (orbInstance) {
                    const orbConfig = this._soulOrbDatabase.get(orbInstance.configId);
                    if (orbConfig) {
                        for (const effect of orbConfig.effects) {
                            bonuses.soulOrbBonuses.push({ type: effect.type, value: effect.value });
                            this.applyEffectToTotalStats(bonuses.totalStats, effect);
                        }
                    }
                }
            }
        }

        // 被动技能（主位和副位的非M标识被动）
        for (const slot of formation.mainSlots) {
            // 主位被动
            if (slot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(slot.characterId);
                if (config?.skillSlots.passiveSkillIds) {
                    for (const passiveId of config.skillSlots.passiveSkillIds) {
                        const passive = SkillDatabase.instance.getSkill(passiveId);
                        if (passive) {
                            bonuses.passiveBonuses.push({
                                skillId: passive.id,
                                effects: passive.effects
                            });
                        }
                    }
                }
            }

            // 副位被动（排除M标识被动）
            if (slot.subSlot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(slot.subSlot.characterId);
                if (config?.skillSlots.passiveSkillIds) {
                    for (const passiveId of config.skillSlots.passiveSkillIds) {
                        const passive = SkillDatabase.instance.getSkill(passiveId);
                        // 检查是否是M标识被动（需要在技能配置中标记）
                        if (passive && !passive.tags?.includes('main_only')) {
                            bonuses.passiveBonuses.push({
                                skillId: passive.id,
                                effects: passive.effects
                            });
                        }
                    }
                }
            }
        }

        return bonuses;
    }

    /**
     * 应用效果到总属性
     */
    private applyEffectToTotalStats(stats: FormationBonuses['totalStats'], effect: SoulOrbEffect): void {
        switch (effect.type) {
            case SoulOrbEffectType.ATTACK_PERCENT:
                stats.attackPercent += effect.value;
                break;
            case SoulOrbEffectType.HP_PERCENT:
                stats.hpPercent += effect.value;
                break;
            case SoulOrbEffectType.SKILL_DAMAGE:
                stats.skillDamage += effect.value;
                break;
            case SoulOrbEffectType.FINAL_DAMAGE:
                stats.finalDamage += effect.value;
                break;
            case SoulOrbEffectType.CHARGE_SPEED:
                stats.chargeSpeed += effect.value;
                break;
            case SoulOrbEffectType.CRIT_RATE:
                stats.critRate += effect.value;
                break;
            case SoulOrbEffectType.CRIT_DAMAGE:
                stats.critDamage += effect.value;
                break;
        }
    }

    /**
     * 获取编队中所有角色状态
     */
    public getFormationCharacterStates(formationId: string): FormationCharacterState[] {
        const formation = this._formations.get(formationId);
        if (!formation) return [];

        const states: FormationCharacterState[] = [];

        for (let i = 0; i < 3; i++) {
            const mainSlot = formation.mainSlots[i];

            // 主位角色
            if (mainSlot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(mainSlot.characterId);
                states.push({
                    characterId: mainSlot.characterId,
                    slotType: SlotType.MAIN,
                    slotIndex: i,
                    statContribution: 1.0,
                    skillEnabled: true,
                    passivesEnabled: config?.skillSlots.passiveSkillIds || [],
                    weaponId: mainSlot.weaponId || undefined,
                    soulOrbId: mainSlot.soulOrbId || undefined
                });
            }

            // 副位角色
            if (mainSlot.subSlot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(mainSlot.subSlot.characterId);
                // 副位被动排除M标识
                const passives = (config?.skillSlots.passiveSkillIds || []).filter(id => {
                    const skill = SkillDatabase.instance.getSkill(id);
                    return skill && !skill.tags?.includes('main_only');
                });

                states.push({
                    characterId: mainSlot.subSlot.characterId,
                    slotType: SlotType.SUB,
                    slotIndex: i,
                    statContribution: 0.25,
                    skillEnabled: true, // 副位大招与主位同步触发
                    passivesEnabled: passives
                });
            }
        }

        return states;
    }

    /**
     * 获取编队的大招列表（主副位同步释放）
     */
    public getFormationSkills(formationId: string): { main: SkillConfig | null; sub: SkillConfig | null }[] {
        const formation = this._formations.get(formationId);
        if (!formation) return [];

        const skills: { main: SkillConfig | null; sub: SkillConfig | null }[] = [];

        for (const slot of formation.mainSlots) {
            let mainSkill: SkillConfig | null = null;
            let subSkill: SkillConfig | null = null;

            // 主位大招
            if (slot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(slot.characterId);
                if (config) {
                    mainSkill = SkillDatabase.instance.getSkill(config.skillSlots.defaultSkillId) || null;
                }
            }

            // 副位大招（与主位同步触发）
            if (slot.subSlot.characterId) {
                const config = CharacterDatabase.instance.getCharacter(slot.subSlot.characterId);
                if (config) {
                    subSkill = SkillDatabase.instance.getSkill(config.skillSlots.defaultSkillId) || null;
                }
            }

            skills.push({ main: mainSkill, sub: subSkill });
        }

        return skills;
    }

    // ========== 魂珠管理 ==========

    /**
     * 获取魂珠配置
     */
    public getSoulOrbConfig(configId: string): SoulOrbConfig | undefined {
        return this._soulOrbDatabase.get(configId);
    }

    /**
     * 获取所有魂珠配置
     */
    public getAllSoulOrbConfigs(): SoulOrbConfig[] {
        return Array.from(this._soulOrbDatabase.values());
    }

    /**
     * 添加魂珠到背包
     */
    public addSoulOrb(configId: string): SoulOrbInstance | null {
        const config = this._soulOrbDatabase.get(configId);
        if (!config) return null;

        const instance: SoulOrbInstance = {
            uniqueId: `orb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            configId,
            level: 1,
            exp: 0
        };

        this._ownedSoulOrbs.set(instance.uniqueId, instance);
        this.saveData();

        return instance;
    }

    /**
     * 获取拥有的魂珠
     */
    public getOwnedSoulOrbs(): SoulOrbInstance[] {
        return Array.from(this._ownedSoulOrbs.values());
    }

    // ========== 存档 ==========

    /**
     * 保存数据
     */
    public saveData(): void {
        const data = {
            formations: Array.from(this._formations.entries()),
            currentFormationId: this._currentFormationId,
            ownedSoulOrbs: Array.from(this._ownedSoulOrbs.entries())
        };

        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    /**
     * 加载数据
     */
    public loadData(): void {
        const savedData = sys.localStorage.getItem(this.SAVE_KEY);
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);

            if (data.formations) {
                this._formations = new Map(data.formations);
            }
            if (data.currentFormationId) {
                this._currentFormationId = data.currentFormationId;
            }
            if (data.ownedSoulOrbs) {
                this._ownedSoulOrbs = new Map(data.ownedSoulOrbs);
            }

            console.log('编队数据加载完成');
        } catch (e) {
            console.error('加载编队数据失败:', e);
        }
    }

    /**
     * 清除数据
     */
    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._formations.clear();
        this._ownedSoulOrbs.clear();
        this.createDefaultFormations();
    }

    onDestroy() {
        this.saveData();
        if (FormationSystem._instance === this) {
            FormationSystem._instance = null;
        }
    }
}
