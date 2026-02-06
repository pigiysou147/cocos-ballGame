import { _decorator } from 'cc';
import { ElementType } from './CharacterData';
import { CharacterRole } from './CharacterFeatureSystem';

/**
 * 队长技能类型
 */
export enum LeaderSkillType {
    // 属性增伤
    ELEMENT_DAMAGE = 'element_damage',      // 属性伤害提升
    ELEMENT_HP = 'element_hp',              // 属性生命提升
    ELEMENT_ATK = 'element_atk',            // 属性攻击提升
    ELEMENT_DEF = 'element_def',            // 属性防御提升
    
    // 流派增伤
    SKILL_DAMAGE = 'skill_damage',          // 技能伤害提升
    PF_DAMAGE = 'pf_damage',                // PF伤害提升
    DIRECT_DAMAGE = 'direct_damage',        // 直击伤害提升
    FEVER_DAMAGE = 'fever_damage',          // Fever伤害提升
    FINAL_DAMAGE = 'final_damage',          // 终伤提升
    
    // 能量相关
    ENERGY_START = 'energy_start',          // 开局充能
    ENERGY_RATE = 'energy_rate',            // 充能速度
    ENERGY_COST = 'energy_cost',            // 能量消耗降低
    
    // 特殊效果
    CRIT_RATE = 'crit_rate',                // 暴击率提升
    CRIT_DAMAGE = 'crit_damage',            // 暴击伤害提升
    COMBO_BONUS = 'combo_bonus',            // 连击加成
    WEAK_POINT_DAMAGE = 'weak_point_damage', // 弱体特攻
    CONTROL_DURATION = 'control_duration',  // 控制持续时间
    HEAL_BOOST = 'heal_boost',              // 治疗效果提升
    REVIVE_BOOST = 'revive_boost',          // 复活加速
    COOP_BALL_BOOST = 'coop_ball_boost'     // 协力球加成
}

/**
 * 队长技能条件类型
 */
export enum LeaderConditionType {
    NONE = 'none',                      // 无条件
    ELEMENT_MATCH = 'element_match',    // 同属性
    ROLE_MATCH = 'role_match',          // 同定位
    TYPE_MATCH = 'type_match',          // 同类型
    FULL_ELEMENT = 'full_element',      // 纯色队
    HP_THRESHOLD = 'hp_threshold',      // 血量阈值
    COMBO_THRESHOLD = 'combo_threshold', // 连击阈值
    FEVER_ACTIVE = 'fever_active'       // Fever状态
}

/**
 * 队长技能效果配置
 */
export interface LeaderSkillEffect {
    type: LeaderSkillType;
    value: number;                      // 效果数值（百分比或固定值）
    isPercent: boolean;                 // 是否百分比
    targetElement?: ElementType;        // 目标属性（可选）
    targetRole?: CharacterRole;         // 目标定位（可选）
}

/**
 * 队长技能条件配置
 */
export interface LeaderSkillCondition {
    type: LeaderConditionType;
    requiredElement?: ElementType;      // 要求的属性
    requiredRole?: CharacterRole;       // 要求的定位
    threshold?: number;                 // 阈值（血量百分比/连击数）
    minCount?: number;                  // 最小数量（队伍中符合条件的角色数）
}

/**
 * 队长技能配置
 */
export interface LeaderSkillConfig {
    id: string;
    name: string;
    description: string;
    
    // 效果列表（可多个效果）
    effects: LeaderSkillEffect[];
    
    // 生效条件
    condition: LeaderSkillCondition;
    
    // 优先级（用于多个队长技冲突时）
    priority: number;
    
    // 是否可叠加
    stackable: boolean;
}

/**
 * 队长技能运行时数据
 */
export interface LeaderSkillRuntimeData {
    config: LeaderSkillConfig;
    isActive: boolean;
    appliedEffects: LeaderSkillEffect[];
    lastCheckTime: number;
}

/**
 * 队伍队长技能计算结果
 */
export interface TeamLeaderBonus {
    // 属性加成
    hpBonus: number;
    attackBonus: number;
    defenseBonus: number;
    
    // 伤害加成
    skillDamageBonus: number;
    pfDamageBonus: number;
    directDamageBonus: number;
    feverDamageBonus: number;
    finalDamageBonus: number;
    
    // 暴击加成
    critRateBonus: number;
    critDamageBonus: number;
    
    // 能量加成
    energyStartBonus: number;
    energyRateBonus: number;
    energyCostReduction: number;
    
    // 特殊加成
    weakPointDamageBonus: number;
    healBonus: number;
    comboBonus: number;
    controlDurationBonus: number;
    reviveSpeedBonus: number;
    coopBallBonus: number;
}

/**
 * 队长技能系统
 */
export class LeaderSkillSystem {
    private static _instance: LeaderSkillSystem | null = null;
    
    // 队长技能配置库
    private _leaderSkills: Map<string, LeaderSkillConfig> = new Map();
    
    // 当前激活的队长技能
    private _activeSkills: Map<string, LeaderSkillRuntimeData> = new Map();
    
    public static get instance(): LeaderSkillSystem {
        if (!LeaderSkillSystem._instance) {
            LeaderSkillSystem._instance = new LeaderSkillSystem();
            LeaderSkillSystem._instance.initLeaderSkills();
        }
        return LeaderSkillSystem._instance;
    }
    
    /**
     * 初始化队长技能库
     */
    private initLeaderSkills(): void {
        // ===== 属性增伤类队长技 =====
        
        // 火属性攻击提升
        this.addLeaderSkill({
            id: 'leader_fire_atk',
            name: '烈火之刃',
            description: '火属性角色攻击力+20%',
            effects: [{
                type: LeaderSkillType.ELEMENT_ATK,
                value: 0.20,
                isPercent: true,
                targetElement: ElementType.FIRE
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 50,
            stackable: false
        });
        
        // 水属性生命提升
        this.addLeaderSkill({
            id: 'leader_water_hp',
            name: '海洋之护',
            description: '水属性角色生命+25%',
            effects: [{
                type: LeaderSkillType.ELEMENT_HP,
                value: 0.25,
                isPercent: true,
                targetElement: ElementType.WATER
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 50,
            stackable: false
        });
        
        // 风属性速度提升
        this.addLeaderSkill({
            id: 'leader_wind_speed',
            name: '疾风之翼',
            description: '风属性角色攻击+15%，连击获取+20%',
            effects: [
                {
                    type: LeaderSkillType.ELEMENT_ATK,
                    value: 0.15,
                    isPercent: true,
                    targetElement: ElementType.WIND
                },
                {
                    type: LeaderSkillType.COMBO_BONUS,
                    value: 0.20,
                    isPercent: true
                }
            ],
            condition: { type: LeaderConditionType.NONE },
            priority: 55,
            stackable: false
        });
        
        // 雷属性暴击提升
        this.addLeaderSkill({
            id: 'leader_thunder_crit',
            name: '雷霆之怒',
            description: '雷属性角色暴击率+15%，暴击伤害+30%',
            effects: [
                {
                    type: LeaderSkillType.CRIT_RATE,
                    value: 0.15,
                    isPercent: true,
                    targetElement: ElementType.THUNDER
                },
                {
                    type: LeaderSkillType.CRIT_DAMAGE,
                    value: 0.30,
                    isPercent: true,
                    targetElement: ElementType.THUNDER
                }
            ],
            condition: { type: LeaderConditionType.NONE },
            priority: 55,
            stackable: false
        });
        
        // 光属性防御提升
        this.addLeaderSkill({
            id: 'leader_light_def',
            name: '圣光庇护',
            description: '光属性角色防御+20%，治疗效果+15%',
            effects: [
                {
                    type: LeaderSkillType.ELEMENT_DEF,
                    value: 0.20,
                    isPercent: true,
                    targetElement: ElementType.LIGHT
                },
                {
                    type: LeaderSkillType.HEAL_BOOST,
                    value: 0.15,
                    isPercent: true
                }
            ],
            condition: { type: LeaderConditionType.NONE },
            priority: 55,
            stackable: false
        });
        
        // 暗属性伤害提升
        this.addLeaderSkill({
            id: 'leader_dark_power',
            name: '深渊之力',
            description: '暗属性角色终伤+15%',
            effects: [{
                type: LeaderSkillType.FINAL_DAMAGE,
                value: 0.15,
                isPercent: true,
                targetElement: ElementType.DARK
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 60,
            stackable: false
        });
        
        // ===== 流派增伤类队长技 =====
        
        // 技伤+120%（圣女队长技）
        this.addLeaderSkill({
            id: 'leader_skill_120',
            name: '神圣裁决',
            description: '技能伤害+120%',
            effects: [{
                type: LeaderSkillType.SKILL_DAMAGE,
                value: 1.20,
                isPercent: true
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 100,
            stackable: false
        });
        
        // 技伤队队长技
        this.addLeaderSkill({
            id: 'leader_skill_damage',
            name: '技能大师',
            description: '技能伤害+80%',
            effects: [{
                type: LeaderSkillType.SKILL_DAMAGE,
                value: 0.80,
                isPercent: true
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 80,
            stackable: false
        });
        
        // PF队队长技（火狼）
        this.addLeaderSkill({
            id: 'leader_pf_damage',
            name: 'Power Flip强化',
            description: 'Power Flip伤害+100%，贯通效果',
            effects: [{
                type: LeaderSkillType.PF_DAMAGE,
                value: 1.00,
                isPercent: true
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 95,
            stackable: false
        });
        
        // 水队PF队长技
        this.addLeaderSkill({
            id: 'leader_water_pf',
            name: '水之舞步',
            description: '水属性Power Flip伤害+80%',
            effects: [{
                type: LeaderSkillType.PF_DAMAGE,
                value: 0.80,
                isPercent: true,
                targetElement: ElementType.WATER
            }],
            condition: { 
                type: LeaderConditionType.ELEMENT_MATCH,
                requiredElement: ElementType.WATER
            },
            priority: 85,
            stackable: false
        });
        
        // 直击队队长技
        this.addLeaderSkill({
            id: 'leader_direct_damage',
            name: '疾速斩击',
            description: '直击伤害+60%，连击获取+30%',
            effects: [
                {
                    type: LeaderSkillType.DIRECT_DAMAGE,
                    value: 0.60,
                    isPercent: true
                },
                {
                    type: LeaderSkillType.COMBO_BONUS,
                    value: 0.30,
                    isPercent: true
                }
            ],
            condition: { type: LeaderConditionType.NONE },
            priority: 75,
            stackable: false
        });
        
        // Fever队队长技
        this.addLeaderSkill({
            id: 'leader_fever_damage',
            name: 'Fever狂热',
            description: 'Fever状态伤害+100%，Fever充能速度+50%',
            effects: [
                {
                    type: LeaderSkillType.FEVER_DAMAGE,
                    value: 1.00,
                    isPercent: true
                },
                {
                    type: LeaderSkillType.ENERGY_RATE,
                    value: 0.50,
                    isPercent: true
                }
            ],
            condition: { type: LeaderConditionType.NONE },
            priority: 90,
            stackable: false
        });
        
        // ===== 能量相关队长技 =====
        
        // 开局充能（风gay队长技）
        this.addLeaderSkill({
            id: 'leader_wind_energy',
            name: '风之祝福',
            description: '风属性角色开局充能50%，参战者伤害+10%',
            effects: [
                {
                    type: LeaderSkillType.ENERGY_START,
                    value: 0.50,
                    isPercent: true,
                    targetElement: ElementType.WIND
                },
                {
                    type: LeaderSkillType.FINAL_DAMAGE,
                    value: 0.10,
                    isPercent: true
                }
            ],
            condition: { type: LeaderConditionType.NONE },
            priority: 85,
            stackable: false
        });
        
        // 充能加速
        this.addLeaderSkill({
            id: 'leader_energy_rate',
            name: '能量涌动',
            description: '能量获取速度+40%',
            effects: [{
                type: LeaderSkillType.ENERGY_RATE,
                value: 0.40,
                isPercent: true
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 70,
            stackable: false
        });
        
        // ===== 特殊效果队长技 =====
        
        // 弱体特攻（龙妈队长技）
        this.addLeaderSkill({
            id: 'leader_weak_point',
            name: '弱点狩猎',
            description: '对弱点伤害+80%',
            effects: [{
                type: LeaderSkillType.WEAK_POINT_DAMAGE,
                value: 0.80,
                isPercent: true
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 75,
            stackable: false
        });
        
        // 控制时间延长
        this.addLeaderSkill({
            id: 'leader_thunder_control',
            name: '雷霆束缚',
            description: '控制效果持续时间+50%',
            effects: [{
                type: LeaderSkillType.CONTROL_DURATION,
                value: 0.50,
                isPercent: true
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 65,
            stackable: false
        });
        
        // 水属性控制
        this.addLeaderSkill({
            id: 'leader_water_control',
            name: '冰封领域',
            description: '冰冻持续时间+80%，水属性伤害+20%',
            effects: [
                {
                    type: LeaderSkillType.CONTROL_DURATION,
                    value: 0.80,
                    isPercent: true
                },
                {
                    type: LeaderSkillType.ELEMENT_DAMAGE,
                    value: 0.20,
                    isPercent: true,
                    targetElement: ElementType.WATER
                }
            ],
            condition: { type: LeaderConditionType.NONE },
            priority: 70,
            stackable: false
        });
        
        // 治疗加成
        this.addLeaderSkill({
            id: 'leader_heal_boost',
            name: '星光治愈',
            description: '治疗效果+50%，全队生命+15%',
            effects: [
                {
                    type: LeaderSkillType.HEAL_BOOST,
                    value: 0.50,
                    isPercent: true
                },
                {
                    type: LeaderSkillType.ELEMENT_HP,
                    value: 0.15,
                    isPercent: true
                }
            ],
            condition: { type: LeaderConditionType.NONE },
            priority: 65,
            stackable: false
        });
        
        // 复活加速
        this.addLeaderSkill({
            id: 'leader_revive_boost',
            name: '不死意志',
            description: '复活所需撞击次数-3，复活后无敌时间+2秒',
            effects: [{
                type: LeaderSkillType.REVIVE_BOOST,
                value: 3,
                isPercent: false
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 60,
            stackable: false
        });
        
        // 协力球加成
        this.addLeaderSkill({
            id: 'leader_coop_ball',
            name: '面包召唤',
            description: '协力球伤害+50%，召唤间隔-20%',
            effects: [{
                type: LeaderSkillType.COOP_BALL_BOOST,
                value: 0.50,
                isPercent: true
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 65,
            stackable: false
        });
        
        // 全属性攻击
        this.addLeaderSkill({
            id: 'leader_all_atk',
            name: '战斗号令',
            description: '全队攻击力+10%',
            effects: [{
                type: LeaderSkillType.ELEMENT_ATK,
                value: 0.10,
                isPercent: true
            }],
            condition: { type: LeaderConditionType.NONE },
            priority: 40,
            stackable: false
        });
        
        console.log(`队长技能系统初始化完成，共 ${this._leaderSkills.size} 个队长技能`);
    }
    
    /**
     * 添加队长技能配置
     */
    private addLeaderSkill(config: LeaderSkillConfig): void {
        this._leaderSkills.set(config.id, config);
    }
    
    /**
     * 获取队长技能配置
     */
    public getLeaderSkill(id: string): LeaderSkillConfig | undefined {
        return this._leaderSkills.get(id);
    }
    
    /**
     * 获取所有队长技能
     */
    public getAllLeaderSkills(): LeaderSkillConfig[] {
        return Array.from(this._leaderSkills.values());
    }
    
    /**
     * 检查队长技能条件是否满足
     */
    public checkCondition(
        config: LeaderSkillConfig,
        teamElements: ElementType[],
        teamRoles: CharacterRole[],
        currentHpPercent: number = 1,
        currentCombo: number = 0,
        isFeverActive: boolean = false
    ): boolean {
        const condition = config.condition;
        
        switch (condition.type) {
            case LeaderConditionType.NONE:
                return true;
                
            case LeaderConditionType.ELEMENT_MATCH:
                if (!condition.requiredElement) return true;
                const elementCount = teamElements.filter(e => e === condition.requiredElement).length;
                return elementCount >= (condition.minCount || 1);
                
            case LeaderConditionType.ROLE_MATCH:
                if (!condition.requiredRole) return true;
                const roleCount = teamRoles.filter(r => r === condition.requiredRole).length;
                return roleCount >= (condition.minCount || 1);
                
            case LeaderConditionType.FULL_ELEMENT:
                if (!condition.requiredElement) return true;
                return teamElements.every(e => e === condition.requiredElement);
                
            case LeaderConditionType.HP_THRESHOLD:
                return currentHpPercent >= (condition.threshold || 0);
                
            case LeaderConditionType.COMBO_THRESHOLD:
                return currentCombo >= (condition.threshold || 0);
                
            case LeaderConditionType.FEVER_ACTIVE:
                return isFeverActive;
                
            default:
                return true;
        }
    }
    
    /**
     * 计算队伍队长技能加成
     */
    public calculateTeamBonus(
        leaderSkillId: string | undefined,
        teamElements: ElementType[],
        teamRoles: CharacterRole[],
        currentHpPercent: number = 1,
        currentCombo: number = 0,
        isFeverActive: boolean = false
    ): TeamLeaderBonus {
        // 初始化加成
        const bonus: TeamLeaderBonus = {
            hpBonus: 0,
            attackBonus: 0,
            defenseBonus: 0,
            skillDamageBonus: 0,
            pfDamageBonus: 0,
            directDamageBonus: 0,
            feverDamageBonus: 0,
            finalDamageBonus: 0,
            critRateBonus: 0,
            critDamageBonus: 0,
            energyStartBonus: 0,
            energyRateBonus: 0,
            energyCostReduction: 0,
            weakPointDamageBonus: 0,
            healBonus: 0,
            comboBonus: 0,
            controlDurationBonus: 0,
            reviveSpeedBonus: 0,
            coopBallBonus: 0
        };
        
        if (!leaderSkillId) return bonus;
        
        const config = this._leaderSkills.get(leaderSkillId);
        if (!config) return bonus;
        
        // 检查条件
        if (!this.checkCondition(config, teamElements, teamRoles, currentHpPercent, currentCombo, isFeverActive)) {
            return bonus;
        }
        
        // 应用效果
        for (const effect of config.effects) {
            this.applyEffect(bonus, effect, teamElements);
        }
        
        return bonus;
    }
    
    /**
     * 应用单个效果到加成
     */
    private applyEffect(bonus: TeamLeaderBonus, effect: LeaderSkillEffect, teamElements: ElementType[]): void {
        // 如果有目标属性限制，检查队伍中是否有该属性
        if (effect.targetElement && !teamElements.includes(effect.targetElement)) {
            return;
        }
        
        const value = effect.value;
        
        switch (effect.type) {
            case LeaderSkillType.ELEMENT_HP:
                bonus.hpBonus += value;
                break;
            case LeaderSkillType.ELEMENT_ATK:
                bonus.attackBonus += value;
                break;
            case LeaderSkillType.ELEMENT_DEF:
                bonus.defenseBonus += value;
                break;
            case LeaderSkillType.ELEMENT_DAMAGE:
            case LeaderSkillType.FINAL_DAMAGE:
                bonus.finalDamageBonus += value;
                break;
            case LeaderSkillType.SKILL_DAMAGE:
                bonus.skillDamageBonus += value;
                break;
            case LeaderSkillType.PF_DAMAGE:
                bonus.pfDamageBonus += value;
                break;
            case LeaderSkillType.DIRECT_DAMAGE:
                bonus.directDamageBonus += value;
                break;
            case LeaderSkillType.FEVER_DAMAGE:
                bonus.feverDamageBonus += value;
                break;
            case LeaderSkillType.CRIT_RATE:
                bonus.critRateBonus += value;
                break;
            case LeaderSkillType.CRIT_DAMAGE:
                bonus.critDamageBonus += value;
                break;
            case LeaderSkillType.ENERGY_START:
                bonus.energyStartBonus += value;
                break;
            case LeaderSkillType.ENERGY_RATE:
                bonus.energyRateBonus += value;
                break;
            case LeaderSkillType.ENERGY_COST:
                bonus.energyCostReduction += value;
                break;
            case LeaderSkillType.WEAK_POINT_DAMAGE:
                bonus.weakPointDamageBonus += value;
                break;
            case LeaderSkillType.HEAL_BOOST:
                bonus.healBonus += value;
                break;
            case LeaderSkillType.COMBO_BONUS:
                bonus.comboBonus += value;
                break;
            case LeaderSkillType.CONTROL_DURATION:
                bonus.controlDurationBonus += value;
                break;
            case LeaderSkillType.REVIVE_BOOST:
                bonus.reviveSpeedBonus += value;
                break;
            case LeaderSkillType.COOP_BALL_BOOST:
                bonus.coopBallBonus += value;
                break;
        }
    }
    
    /**
     * 获取队长技能描述
     */
    public getLeaderSkillDescription(id: string): string {
        const config = this._leaderSkills.get(id);
        return config ? config.description : '未知队长技能';
    }
    
    /**
     * 按优先级排序队长技能
     */
    public sortByPriority(skillIds: string[]): string[] {
        return skillIds
            .map(id => ({ id, config: this._leaderSkills.get(id) }))
            .filter(item => item.config !== undefined)
            .sort((a, b) => (b.config!.priority - a.config!.priority))
            .map(item => item.id);
    }
    
    /**
     * 获取适合特定流派的队长技能
     */
    public getLeaderSkillsForArchetype(archetype: 'skill_damage' | 'pf' | 'direct' | 'fever'): LeaderSkillConfig[] {
        const all = this.getAllLeaderSkills();
        
        switch (archetype) {
            case 'skill_damage':
                return all.filter(s => 
                    s.effects.some(e => e.type === LeaderSkillType.SKILL_DAMAGE)
                );
            case 'pf':
                return all.filter(s => 
                    s.effects.some(e => e.type === LeaderSkillType.PF_DAMAGE)
                );
            case 'direct':
                return all.filter(s => 
                    s.effects.some(e => e.type === LeaderSkillType.DIRECT_DAMAGE)
                );
            case 'fever':
                return all.filter(s => 
                    s.effects.some(e => e.type === LeaderSkillType.FEVER_DAMAGE)
                );
            default:
                return [];
        }
    }
    
    /**
     * 获取适合特定属性的队长技能
     */
    public getLeaderSkillsForElement(element: ElementType): LeaderSkillConfig[] {
        return this.getAllLeaderSkills().filter(s => 
            s.effects.some(e => !e.targetElement || e.targetElement === element)
        );
    }
}
