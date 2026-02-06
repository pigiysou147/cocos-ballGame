import { _decorator, EventTarget } from 'cc';
import { ElementType, CharacterConfig, CharacterRole, CharacterType } from './CharacterData';
import { LeaderSkillSystem, TeamLeaderBonus } from './LeaderSkillSystem';
import { CharacterPassiveSystem, PassiveCalculationResult } from './CharacterPassiveSystem';

/**
 * 流派类型
 */
export enum BuildArchetype {
    SKILL_DAMAGE = 'skill_damage',  // 技伤流：高倍率大招，依赖充能循环
    POWER_FLIP = 'power_flip',      // PF流：连击触发强化弹射，高等级PF伤害翻倍
    DIRECT_HIT = 'direct_hit',      // 直击流：高频碰撞，适合长局，无需充能依赖
    FEVER = 'fever',                // Fever流：Fever增伤/持续时间，极限爆发
    HYBRID = 'hybrid'               // 混合流：多种输出方式结合
}

/**
 * 流派配置
 */
export interface BuildArchetypeConfig {
    archetype: BuildArchetype;
    name: string;
    description: string;
    
    // 核心机制
    coreMechanic: string;
    
    // 伤害构成比例（总和为1）
    damageDistribution: {
        skillDamage: number;    // 技能伤害占比
        pfDamage: number;       // PF伤害占比
        directDamage: number;   // 直击伤害占比
        feverDamage: number;    // Fever伤害占比
    };
    
    // 关键属性
    keyStats: string[];
    
    // 推荐队长技类型
    recommendedLeaderTypes: string[];
    
    // 推荐角色定位
    recommendedRoles: {
        main: CharacterRole[];  // 主位推荐
        sub: CharacterRole[];   // 副位推荐
    };
    
    // 推荐角色类型
    recommendedTypes: CharacterType[];
    
    // 适合的战斗场景
    suitableScenarios: string[];
    
    // 优缺点
    strengths: string[];
    weaknesses: string[];
}

/**
 * 队伍配置数据
 */
export interface TeamBuildData {
    // 主位角色（3个）
    mainCharacters: (CharacterConfig | null)[];
    
    // 副位角色（3个）
    subCharacters: (CharacterConfig | null)[];
    
    // 队长技能ID
    leaderSkillId?: string;
    
    // 武器配置
    weaponId?: string;
    
    // 魂珠配置
    soulOrbId?: string;
}

/**
 * 流派评分结果
 */
export interface ArchetypeScoreResult {
    archetype: BuildArchetype;
    score: number;              // 0-100
    matchReasons: string[];     // 匹配原因
    suggestions: string[];      // 改进建议
}

/**
 * 队伍流派分析结果
 */
export interface TeamArchetypeAnalysis {
    // 最佳流派
    bestArchetype: BuildArchetype;
    bestScore: number;
    
    // 所有流派评分
    archetypeScores: ArchetypeScoreResult[];
    
    // 队伍属性分析
    elementComposition: Map<ElementType, number>;
    roleComposition: Map<CharacterRole, number>;
    typeComposition: Map<CharacterType, number>;
    
    // 是否纯色队
    isPureElement: boolean;
    pureElement?: ElementType;
    
    // 整体建议
    overallSuggestions: string[];
}

/**
 * 流派优化建议
 */
export interface BuildOptimizationSuggestion {
    priority: 'high' | 'medium' | 'low';
    category: 'character' | 'weapon' | 'soulOrb' | 'formation' | 'strategy';
    description: string;
    expectedImprovement: string;
}

/**
 * 流派适配系统 - 分析和优化队伍配置
 */
export class BuildArchetypeSystem {
    private static _instance: BuildArchetypeSystem | null = null;
    
    // 流派配置
    private _archetypeConfigs: Map<BuildArchetype, BuildArchetypeConfig> = new Map();
    
    // 事件
    private _eventTarget: EventTarget = new EventTarget();
    
    public static get instance(): BuildArchetypeSystem {
        if (!BuildArchetypeSystem._instance) {
            BuildArchetypeSystem._instance = new BuildArchetypeSystem();
            BuildArchetypeSystem._instance.initArchetypeConfigs();
        }
        return BuildArchetypeSystem._instance;
    }
    
    /**
     * 初始化流派配置
     */
    private initArchetypeConfigs(): void {
        // 技伤流
        this._archetypeConfigs.set(BuildArchetype.SKILL_DAMAGE, {
            archetype: BuildArchetype.SKILL_DAMAGE,
            name: '技伤流',
            description: '高倍率大招，依赖充能循环，30秒内2-3轮大招爆发',
            coreMechanic: '快速充能 → 释放高倍率技能 → 再次充能，循环爆发',
            damageDistribution: {
                skillDamage: 0.70,
                pfDamage: 0.10,
                directDamage: 0.10,
                feverDamage: 0.10
            },
            keyStats: ['技伤', '终伤', '充能速度', '暴击伤害'],
            recommendedLeaderTypes: ['skill_damage', 'final_damage', 'energy_start'],
            recommendedRoles: {
                main: [CharacterRole.SKILL_DPS],
                sub: [CharacterRole.ENERGY_SUPPORT, CharacterRole.BUFF_SUPPORT, CharacterRole.DEBUFF_UTIL]
            },
            recommendedTypes: [CharacterType.SUPPORT, CharacterType.SPECIAL, CharacterType.SHOOTER],
            suitableScenarios: ['Boss战', '短时间爆发', '共斗本'],
            strengths: ['爆发伤害高', '有明确的伤害窗口', '队伍配置灵活'],
            weaknesses: ['依赖充能循环', '被打断影响大', '需要控制配合']
        });
        
        // PF流
        this._archetypeConfigs.set(BuildArchetype.POWER_FLIP, {
            archetype: BuildArchetype.POWER_FLIP,
            name: 'PF流',
            description: '连击触发强化弹射，高等级PF伤害翻倍，依赖高连击数',
            coreMechanic: '积累连击 → 触发Power Flip → 高额伤害，连击越高伤害越高',
            damageDistribution: {
                skillDamage: 0.15,
                pfDamage: 0.60,
                directDamage: 0.15,
                feverDamage: 0.10
            },
            keyStats: ['PF伤害', '连击加成', '攻击力', '贯通'],
            recommendedLeaderTypes: ['pf_damage', 'combo_bonus', 'direct_damage'],
            recommendedRoles: {
                main: [CharacterRole.PF_DPS],
                sub: [CharacterRole.SPECIAL_FUNC, CharacterRole.BUFF_SUPPORT, CharacterRole.DIRECT_DPS]
            },
            recommendedTypes: [CharacterType.SWORDSMAN, CharacterType.FIGHTER, CharacterType.SPECIAL],
            suitableScenarios: ['清小怪', '中等难度本', '需要稳定输出'],
            strengths: ['输出稳定', '不依赖充能', '操作感强', '适合多目标'],
            weaknesses: ['需要积累连击', '容易被打断', '单体伤害较低']
        });
        
        // 直击流
        this._archetypeConfigs.set(BuildArchetype.DIRECT_HIT, {
            archetype: BuildArchetype.DIRECT_HIT,
            name: '直击流',
            description: '高频碰撞，适合长局，稳定输出，无需充能依赖',
            coreMechanic: '高频弹射 → 持续造成碰撞伤害 → 稳定积累，细水长流',
            damageDistribution: {
                skillDamage: 0.10,
                pfDamage: 0.20,
                directDamage: 0.60,
                feverDamage: 0.10
            },
            keyStats: ['直击伤害', '攻击力', '攻速', '暴击率'],
            recommendedLeaderTypes: ['direct_damage', 'combo_bonus', 'element_atk'],
            recommendedRoles: {
                main: [CharacterRole.DIRECT_DPS],
                sub: [CharacterRole.BUFF_SUPPORT, CharacterRole.HEAL_SUPPORT]
            },
            recommendedTypes: [CharacterType.FIGHTER, CharacterType.SWORDSMAN],
            suitableScenarios: ['长时间战斗', '无充能环境', '稳定清怪'],
            strengths: ['输出稳定', '不依赖任何机制', '操作简单', '适合新手'],
            weaknesses: ['爆发能力弱', '伤害上限低', '长局可能疲软']
        });
        
        // Fever流
        this._archetypeConfigs.set(BuildArchetype.FEVER, {
            archetype: BuildArchetype.FEVER,
            name: 'Fever流',
            description: 'Fever增伤/持续时间，极限爆发，快速攒能进入Fever',
            coreMechanic: '快速进入Fever → Fever期间全力输出 → 最大化Fever收益',
            damageDistribution: {
                skillDamage: 0.20,
                pfDamage: 0.20,
                directDamage: 0.10,
                feverDamage: 0.50
            },
            keyStats: ['Fever伤害', 'Fever持续', '充能速度', '终伤'],
            recommendedLeaderTypes: ['fever_damage', 'energy_rate', 'final_damage'],
            recommendedRoles: {
                main: [CharacterRole.FEVER_DPS],
                sub: [CharacterRole.ENERGY_SUPPORT, CharacterRole.BUFF_SUPPORT]
            },
            recommendedTypes: [CharacterType.SHOOTER, CharacterType.SUPPORT, CharacterType.SPECIAL],
            suitableScenarios: ['有Fever机制的关卡', '限时挑战', '极限爆发'],
            strengths: ['Fever期间伤害极高', '有明确的爆发窗口', '配合控制效果好'],
            weaknesses: ['依赖Fever触发', '非Fever期间伤害低', '需要精确时机']
        });
        
        // 混合流
        this._archetypeConfigs.set(BuildArchetype.HYBRID, {
            archetype: BuildArchetype.HYBRID,
            name: '混合流',
            description: '多种输出方式结合，灵活应对各种场景',
            coreMechanic: '根据战斗情况灵活切换输出方式',
            damageDistribution: {
                skillDamage: 0.30,
                pfDamage: 0.25,
                directDamage: 0.25,
                feverDamage: 0.20
            },
            keyStats: ['终伤', '攻击力', '暴击率', '暴击伤害'],
            recommendedLeaderTypes: ['final_damage', 'element_damage', 'crit_damage'],
            recommendedRoles: {
                main: [CharacterRole.SKILL_DPS, CharacterRole.PF_DPS, CharacterRole.DIRECT_DPS],
                sub: [CharacterRole.BUFF_SUPPORT, CharacterRole.ENERGY_SUPPORT]
            },
            recommendedTypes: [CharacterType.SWORDSMAN, CharacterType.FIGHTER, CharacterType.SHOOTER],
            suitableScenarios: ['各种场景通用', '角色池不够深时', '多变战斗环境'],
            strengths: ['适应性强', '配置灵活', '不依赖单一机制'],
            weaknesses: ['专精不够', '各方面伤害不突出', '需要更高的操作技巧']
        });
        
        console.log(`流派系统初始化完成，共 ${this._archetypeConfigs.size} 种流派`);
    }
    
    /**
     * 获取流派配置
     */
    public getArchetypeConfig(archetype: BuildArchetype): BuildArchetypeConfig | undefined {
        return this._archetypeConfigs.get(archetype);
    }
    
    /**
     * 获取所有流派配置
     */
    public getAllArchetypeConfigs(): BuildArchetypeConfig[] {
        return Array.from(this._archetypeConfigs.values());
    }
    
    /**
     * 分析队伍配置，确定最佳流派
     */
    public analyzeTeamBuild(teamData: TeamBuildData): TeamArchetypeAnalysis {
        // 收集队伍数据
        const allCharacters = [...teamData.mainCharacters, ...teamData.subCharacters]
            .filter((c): c is CharacterConfig => c !== null);
        
        // 属性统计
        const elementComposition = new Map<ElementType, number>();
        const roleComposition = new Map<CharacterRole, number>();
        const typeComposition = new Map<CharacterType, number>();
        
        for (const char of allCharacters) {
            // 属性
            const elementCount = elementComposition.get(char.element) || 0;
            elementComposition.set(char.element, elementCount + 1);
            
            // 定位
            const roleCount = roleComposition.get(char.characterRole) || 0;
            roleComposition.set(char.characterRole, roleCount + 1);
            
            // 类型
            const typeCount = typeComposition.get(char.characterType) || 0;
            typeComposition.set(char.characterType, typeCount + 1);
        }
        
        // 检查纯色队
        let isPureElement = false;
        let pureElement: ElementType | undefined;
        for (const [element, count] of elementComposition) {
            if (count >= allCharacters.length * 0.8) {
                isPureElement = true;
                pureElement = element;
                break;
            }
        }
        
        // 计算各流派评分
        const archetypeScores: ArchetypeScoreResult[] = [];
        for (const config of this._archetypeConfigs.values()) {
            const result = this.calculateArchetypeScore(config, teamData, roleComposition, typeComposition);
            archetypeScores.push(result);
        }
        
        // 排序找出最佳流派
        archetypeScores.sort((a, b) => b.score - a.score);
        const bestArchetype = archetypeScores[0].archetype;
        const bestScore = archetypeScores[0].score;
        
        // 生成整体建议
        const overallSuggestions = this.generateOverallSuggestions(
            teamData, bestArchetype, roleComposition, typeComposition, isPureElement
        );
        
        return {
            bestArchetype,
            bestScore,
            archetypeScores,
            elementComposition,
            roleComposition,
            typeComposition,
            isPureElement,
            pureElement,
            overallSuggestions
        };
    }
    
    /**
     * 计算单个流派的匹配分数
     */
    private calculateArchetypeScore(
        config: BuildArchetypeConfig,
        teamData: TeamBuildData,
        roleComposition: Map<CharacterRole, number>,
        typeComposition: Map<CharacterType, number>
    ): ArchetypeScoreResult {
        let score = 0;
        const matchReasons: string[] = [];
        const suggestions: string[] = [];
        
        // 1. 主位角色定位匹配（40分）
        const mainCharacters = teamData.mainCharacters.filter((c): c is CharacterConfig => c !== null);
        let mainRoleMatch = 0;
        for (const char of mainCharacters) {
            if (config.recommendedRoles.main.includes(char.characterRole)) {
                mainRoleMatch++;
            }
        }
        const mainRoleScore = (mainRoleMatch / Math.max(mainCharacters.length, 1)) * 40;
        score += mainRoleScore;
        if (mainRoleMatch > 0) {
            matchReasons.push(`主位角色定位匹配 ${mainRoleMatch}/${mainCharacters.length}`);
        }
        
        // 2. 副位角色定位匹配（25分）
        const subCharacters = teamData.subCharacters.filter((c): c is CharacterConfig => c !== null);
        let subRoleMatch = 0;
        for (const char of subCharacters) {
            if (config.recommendedRoles.sub.includes(char.characterRole)) {
                subRoleMatch++;
            }
        }
        const subRoleScore = (subRoleMatch / Math.max(subCharacters.length, 1)) * 25;
        score += subRoleScore;
        if (subRoleMatch > 0) {
            matchReasons.push(`副位角色定位匹配 ${subRoleMatch}/${subCharacters.length}`);
        }
        
        // 3. 角色类型匹配（15分）
        let typeMatch = 0;
        for (const type of config.recommendedTypes) {
            typeMatch += typeComposition.get(type) || 0;
        }
        const allCharCount = mainCharacters.length + subCharacters.length;
        const typeScore = (typeMatch / Math.max(allCharCount, 1)) * 15;
        score += typeScore;
        if (typeMatch > 0) {
            matchReasons.push(`角色类型匹配 ${typeMatch}/${allCharCount}`);
        }
        
        // 4. 队长技匹配（20分）
        if (teamData.leaderSkillId) {
            const leaderSkill = LeaderSkillSystem.instance.getLeaderSkill(teamData.leaderSkillId);
            if (leaderSkill) {
                // 检查队长技类型是否匹配
                for (const effect of leaderSkill.effects) {
                    if (config.recommendedLeaderTypes.some(t => effect.type.includes(t))) {
                        score += 20;
                        matchReasons.push(`队长技 "${leaderSkill.name}" 与流派匹配`);
                        break;
                    }
                }
            }
        }
        
        // 生成建议
        if (mainRoleScore < 30) {
            suggestions.push(`建议主位使用 ${config.recommendedRoles.main.map(r => this.getRoleName(r)).join('、')} 定位角色`);
        }
        if (subRoleScore < 15) {
            suggestions.push(`建议副位使用 ${config.recommendedRoles.sub.map(r => this.getRoleName(r)).join('、')} 定位角色`);
        }
        if (!teamData.leaderSkillId) {
            suggestions.push('建议设置队长技能以获得流派加成');
        }
        
        return {
            archetype: config.archetype,
            score: Math.min(100, Math.round(score)),
            matchReasons,
            suggestions
        };
    }
    
    /**
     * 生成整体建议
     */
    private generateOverallSuggestions(
        teamData: TeamBuildData,
        bestArchetype: BuildArchetype,
        roleComposition: Map<CharacterRole, number>,
        typeComposition: Map<CharacterType, number>,
        isPureElement: boolean
    ): string[] {
        const suggestions: string[] = [];
        const config = this._archetypeConfigs.get(bestArchetype)!;
        
        // 基于流派的建议
        suggestions.push(`当前队伍最适合 ${config.name}，核心机制：${config.coreMechanic}`);
        
        // 纯色队建议
        if (!isPureElement) {
            suggestions.push('建议组建纯色队以获得属性加成和队长技加成');
        }
        
        // 辅助角色建议
        const supportCount = (roleComposition.get(CharacterRole.ENERGY_SUPPORT) || 0) +
                            (roleComposition.get(CharacterRole.BUFF_SUPPORT) || 0) +
                            (roleComposition.get(CharacterRole.HEAL_SUPPORT) || 0);
        if (supportCount < 2) {
            suggestions.push('建议增加辅助角色（充能/增伤/治疗）以提升队伍续航');
        }
        
        // 控制角色建议
        if (bestArchetype === BuildArchetype.SKILL_DAMAGE) {
            const controlCount = roleComposition.get(CharacterRole.CONTROL_UTIL) || 0;
            if (controlCount < 1) {
                suggestions.push('技伤队建议搭配控制角色，确保大招命中');
            }
        }
        
        // 特殊功能建议
        if (bestArchetype === BuildArchetype.POWER_FLIP) {
            const specialCount = roleComposition.get(CharacterRole.SPECIAL_FUNC) || 0;
            if (specialCount < 1) {
                suggestions.push('PF队建议搭配协力球召唤角色（如面包人）提升连击');
            }
        }
        
        return suggestions;
    }
    
    /**
     * 获取流派优化建议
     */
    public getOptimizationSuggestions(
        teamData: TeamBuildData,
        targetArchetype: BuildArchetype
    ): BuildOptimizationSuggestion[] {
        const suggestions: BuildOptimizationSuggestion[] = [];
        const config = this._archetypeConfigs.get(targetArchetype)!;
        
        // 分析主位角色
        const mainCharacters = teamData.mainCharacters.filter((c): c is CharacterConfig => c !== null);
        let hasMainDPS = false;
        for (const char of mainCharacters) {
            if (config.recommendedRoles.main.includes(char.characterRole)) {
                hasMainDPS = true;
                break;
            }
        }
        
        if (!hasMainDPS) {
            suggestions.push({
                priority: 'high',
                category: 'character',
                description: `主位缺少核心输出角色，建议使用 ${config.recommendedRoles.main.map(r => this.getRoleName(r)).join('/')} 定位角色`,
                expectedImprovement: '预计伤害提升 30-50%'
            });
        }
        
        // 分析副位角色
        const subCharacters = teamData.subCharacters.filter((c): c is CharacterConfig => c !== null);
        let hasSupport = false;
        for (const char of subCharacters) {
            if (config.recommendedRoles.sub.includes(char.characterRole)) {
                hasSupport = true;
                break;
            }
        }
        
        if (!hasSupport) {
            suggestions.push({
                priority: 'medium',
                category: 'character',
                description: `副位缺少辅助角色，建议使用 ${config.recommendedRoles.sub.map(r => this.getRoleName(r)).join('/')} 定位角色`,
                expectedImprovement: '预计循环效率提升 20-30%'
            });
        }
        
        // 队长技建议
        if (!teamData.leaderSkillId) {
            suggestions.push({
                priority: 'high',
                category: 'formation',
                description: '未设置队长技能，建议选择一个具有流派增伤队长技的角色作为队长',
                expectedImprovement: '预计伤害提升 50-120%'
            });
        }
        
        // 武器建议
        if (!teamData.weaponId) {
            suggestions.push({
                priority: 'medium',
                category: 'weapon',
                description: `建议装备 ${config.keyStats.slice(0, 2).join('/')} 词条的武器`,
                expectedImprovement: '预计伤害提升 15-25%'
            });
        }
        
        // 战术建议
        suggestions.push({
            priority: 'low',
            category: 'strategy',
            description: config.coreMechanic,
            expectedImprovement: '掌握核心循环可最大化输出效率'
        });
        
        return suggestions;
    }
    
    /**
     * 获取定位名称
     */
    private getRoleName(role: CharacterRole): string {
        const names: { [key: string]: string } = {
            [CharacterRole.SKILL_DPS]: '技伤型',
            [CharacterRole.PF_DPS]: 'PF型',
            [CharacterRole.DIRECT_DPS]: '直击型',
            [CharacterRole.FEVER_DPS]: 'Fever型',
            [CharacterRole.ENERGY_SUPPORT]: '充能辅助',
            [CharacterRole.BUFF_SUPPORT]: '增伤辅助',
            [CharacterRole.HEAL_SUPPORT]: '治疗辅助',
            [CharacterRole.CONTROL_UTIL]: '控制工具人',
            [CharacterRole.SHIELD_BREAK_UTIL]: '破盾工具人',
            [CharacterRole.DEBUFF_UTIL]: '异常工具人',
            [CharacterRole.SPECIAL_FUNC]: '特殊功能'
        };
        return names[role] || '未知';
    }
    
    /**
     * 获取流派名称
     */
    public getArchetypeName(archetype: BuildArchetype): string {
        const config = this._archetypeConfigs.get(archetype);
        return config ? config.name : '未知流派';
    }
    
    /**
     * 获取流派描述
     */
    public getArchetypeDescription(archetype: BuildArchetype): string {
        const config = this._archetypeConfigs.get(archetype);
        return config ? config.description : '未知流派';
    }
    
    /**
     * 根据角色定位推荐流派
     */
    public recommendArchetypeForRole(role: CharacterRole): BuildArchetype[] {
        const results: BuildArchetype[] = [];
        
        for (const [archetype, config] of this._archetypeConfigs) {
            if (config.recommendedRoles.main.includes(role) || 
                config.recommendedRoles.sub.includes(role)) {
                results.push(archetype);
            }
        }
        
        return results;
    }
    
    /**
     * 根据属性推荐流派
     */
    public recommendArchetypeForElement(element: ElementType): BuildArchetype[] {
        // 基于属性倾向推荐
        switch (element) {
            case ElementType.FIRE:
                return [BuildArchetype.SKILL_DAMAGE, BuildArchetype.POWER_FLIP];
            case ElementType.WATER:
                return [BuildArchetype.POWER_FLIP, BuildArchetype.SKILL_DAMAGE];
            case ElementType.THUNDER:
                return [BuildArchetype.POWER_FLIP, BuildArchetype.FEVER];
            case ElementType.WIND:
                return [BuildArchetype.POWER_FLIP, BuildArchetype.DIRECT_HIT];
            case ElementType.LIGHT:
                return [BuildArchetype.SKILL_DAMAGE, BuildArchetype.HYBRID];
            case ElementType.DARK:
                return [BuildArchetype.DIRECT_HIT, BuildArchetype.SKILL_DAMAGE];
            default:
                return [BuildArchetype.HYBRID];
        }
    }
    
    /**
     * 计算流派对应的伤害加成
     */
    public calculateArchetypeDamageBonus(
        archetype: BuildArchetype,
        leaderBonus: TeamLeaderBonus,
        passiveBonus: PassiveCalculationResult
    ): {
        skillMultiplier: number;
        pfMultiplier: number;
        directMultiplier: number;
        feverMultiplier: number;
        finalMultiplier: number;
    } {
        const config = this._archetypeConfigs.get(archetype);
        if (!config) {
            return {
                skillMultiplier: 1,
                pfMultiplier: 1,
                directMultiplier: 1,
                feverMultiplier: 1,
                finalMultiplier: 1
            };
        }
        
        // 基础倍率 + 队长技加成 + 被动加成
        return {
            skillMultiplier: 1 + leaderBonus.skillDamageBonus + passiveBonus.skillDamageBonus,
            pfMultiplier: 1 + leaderBonus.pfDamageBonus + passiveBonus.pfDamageBonus,
            directMultiplier: 1 + leaderBonus.directDamageBonus + passiveBonus.directDamageBonus,
            feverMultiplier: 1 + leaderBonus.feverDamageBonus,
            finalMultiplier: 1 + leaderBonus.finalDamageBonus + passiveBonus.finalDamageBonus
        };
    }
}
