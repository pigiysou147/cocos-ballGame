import { _decorator } from 'cc';
import { ElementType } from './CharacterData';
import { RewardData, RewardType } from './LevelData';

/**
 * 领主战难度
 */
export enum BossRaidDifficulty {
    NORMAL = 'normal',          // 普通
    HARD = 'hard',              // 困难
    EXTREME = 'extreme',        // 极难
    NIGHTMARE = 'nightmare',    // 噩梦
    HELL = 'hell'               // 地狱
}

/**
 * 领主战状态
 */
export enum BossRaidStatus {
    AVAILABLE = 'available',    // 可挑战
    IN_PROGRESS = 'in_progress',// 战斗中
    DEFEATED = 'defeated',      // 已击败
    EXPIRED = 'expired'         // 已过期
}

/**
 * Boss技能类型
 */
export enum BossSkillType {
    NORMAL_ATTACK = 'normal_attack',    // 普通攻击
    HEAVY_ATTACK = 'heavy_attack',      // 重击
    AOE_ATTACK = 'aoe_attack',          // 范围攻击
    BUFF = 'buff',                      // 自身增益
    DEBUFF = 'debuff',                  // 玩家减益
    SUMMON = 'summon',                  // 召唤小怪
    ENRAGE = 'enrage',                  // 狂暴
    ULTIMATE = 'ultimate'               // 必杀技
}

/**
 * Boss技能配置
 */
export interface BossSkillConfig {
    id: string;
    name: string;
    description: string;
    type: BossSkillType;
    damage?: number;            // 伤害值
    damagePercent?: number;     // 百分比伤害
    cooldown: number;           // 冷却时间（秒）
    castTime: number;           // 施法时间（秒）
    warningTime: number;        // 预警时间（秒）
    effect?: {
        type: string;           // 效果类型
        value: number;
        duration: number;
    };
    triggerCondition?: {
        type: 'hp_percent' | 'time' | 'random';
        value: number;
    };
}

/**
 * Boss阶段配置
 */
export interface BossPhase {
    phaseNumber: number;
    hpThreshold: number;        // HP百分比阈值进入此阶段
    name: string;
    description: string;
    attackMultiplier: number;   // 攻击倍率
    defenseMultiplier: number;  // 防御倍率
    speedMultiplier: number;    // 速度倍率
    skills: string[];           // 此阶段可用技能ID
    specialMechanic?: {
        type: 'shield' | 'regen' | 'reflect' | 'immune';
        value: number;
        duration?: number;
    };
}

/**
 * 领主配置
 */
export interface BossRaidConfig {
    id: string;
    name: string;
    title: string;              // 称号，如"炎狱之主"
    description: string;
    icon: string;
    
    // Boss属性
    element: ElementType;
    baseHP: number;
    baseAttack: number;
    baseDefense: number;
    
    // 难度配置
    difficulties: BossDifficultyConfig[];
    
    // 阶段配置
    phases: BossPhase[];
    
    // 技能配置
    skills: BossSkillConfig[];
    
    // 时间限制（秒）
    timeLimit: number;
    
    // 推荐战力
    recommendedPower: number;
    
    // 解锁条件
    unlockRequirement: {
        playerLevel?: number;
        chapterCleared?: string;
        previousBossDefeated?: string;
    };
    
    // 背景和音乐
    backgroundId: string;
    bgmId: string;
}

/**
 * 难度配置
 */
export interface BossDifficultyConfig {
    difficulty: BossRaidDifficulty;
    hpMultiplier: number;
    attackMultiplier: number;
    defenseMultiplier: number;
    rewardMultiplier: number;
    
    // 奖励配置
    firstKillRewards: RewardData[];
    normalRewards: RewardData[];
    rankRewards: RankRewardConfig[];
    
    // 挑战限制
    dailyAttempts: number;
    staminaCost: number;
}

/**
 * 排名奖励配置
 */
export interface RankRewardConfig {
    rankRange: { min: number; max: number };
    rewards: RewardData[];
}

/**
 * 玩家领主战记录
 */
export interface BossRaidRecord {
    bossId: string;
    difficulty: BossRaidDifficulty;
    
    // 最佳记录
    bestDamage: number;
    bestTime: number;           // 最快击杀时间
    bestRank: number;
    
    // 击杀统计
    totalKills: number;
    totalDamage: number;
    totalAttempts: number;
    
    // 奖励领取
    firstKillClaimed: boolean;
    lastAttemptTime: number;
    todayAttempts: number;
}

/**
 * 伤害记录（用于排行榜）
 */
export interface DamageRecord {
    odId: string;
    odName: string;
    odAvatar: string;
    damage: number;
    time: number;
    teamPower: number;
    timestamp: number;
}

/**
 * 领主战结算数据
 */
export interface BossRaidResult {
    bossId: string;
    difficulty: BossRaidDifficulty;
    
    // 战斗结果
    victory: boolean;
    totalDamage: number;
    battleTime: number;
    
    // 伤害统计
    damageBreakdown: {
        characterId: string;
        damage: number;
        hits: number;
        maxHit: number;
        skillDamage: number;
    }[];
    
    // 获得奖励
    rewards: RewardData[];
    
    // 排名变化
    previousRank: number;
    newRank: number;
    
    // 是否首杀
    isFirstKill: boolean;
}

/**
 * 领主战数据库
 */
export class BossRaidDatabase {
    private static _instance: BossRaidDatabase | null = null;
    private _bosses: Map<string, BossRaidConfig> = new Map();

    public static get instance(): BossRaidDatabase {
        if (!BossRaidDatabase._instance) {
            BossRaidDatabase._instance = new BossRaidDatabase();
            BossRaidDatabase._instance.initDatabase();
        }
        return BossRaidDatabase._instance;
    }

    private initDatabase(): void {
        this.initBosses();
        console.log(`领主战数据库初始化完成，共 ${this._bosses.size} 个领主`);
    }

    private initBosses(): void {
        // ========== 火焰领主 - 炎魔伊弗利特 ==========
        this._bosses.set('boss_ifrit', {
            id: 'boss_ifrit',
            name: '伊弗利特',
            title: '炎狱之主',
            description: '从地狱深处苏醒的远古火焰巨魔，其灼热的身躯能融化一切',
            icon: 'textures/boss/ifrit',
            element: ElementType.FIRE,
            baseHP: 10000000,
            baseAttack: 5000,
            baseDefense: 2000,
            difficulties: this.createDifficultyConfigs('boss_ifrit'),
            phases: [
                {
                    phaseNumber: 1,
                    hpThreshold: 100,
                    name: '觉醒',
                    description: '伊弗利特缓缓苏醒',
                    attackMultiplier: 1.0,
                    defenseMultiplier: 1.0,
                    speedMultiplier: 1.0,
                    skills: ['ifrit_fire_breath', 'ifrit_flame_wave']
                },
                {
                    phaseNumber: 2,
                    hpThreshold: 70,
                    name: '燃烧',
                    description: '伊弗利特的火焰开始暴涨',
                    attackMultiplier: 1.3,
                    defenseMultiplier: 0.9,
                    speedMultiplier: 1.2,
                    skills: ['ifrit_fire_breath', 'ifrit_flame_wave', 'ifrit_meteor'],
                    specialMechanic: {
                        type: 'regen',
                        value: 0.5,     // 每秒回复0.5%血量
                        duration: 30
                    }
                },
                {
                    phaseNumber: 3,
                    hpThreshold: 30,
                    name: '狂暴',
                    description: '伊弗利特进入狂暴状态！',
                    attackMultiplier: 1.8,
                    defenseMultiplier: 0.7,
                    speedMultiplier: 1.5,
                    skills: ['ifrit_fire_breath', 'ifrit_flame_wave', 'ifrit_meteor', 'ifrit_inferno'],
                    specialMechanic: {
                        type: 'reflect',
                        value: 10,      // 反弹10%伤害
                    }
                }
            ],
            skills: [
                {
                    id: 'ifrit_fire_breath',
                    name: '烈焰吐息',
                    description: '向前方喷射灼热火焰',
                    type: BossSkillType.NORMAL_ATTACK,
                    damage: 3000,
                    cooldown: 5,
                    castTime: 1,
                    warningTime: 0.5
                },
                {
                    id: 'ifrit_flame_wave',
                    name: '炎浪',
                    description: '释放环形火焰冲击波',
                    type: BossSkillType.AOE_ATTACK,
                    damage: 4500,
                    cooldown: 12,
                    castTime: 2,
                    warningTime: 1.5
                },
                {
                    id: 'ifrit_meteor',
                    name: '陨石召唤',
                    description: '从天空召唤燃烧的陨石',
                    type: BossSkillType.HEAVY_ATTACK,
                    damage: 8000,
                    cooldown: 20,
                    castTime: 3,
                    warningTime: 2,
                    triggerCondition: {
                        type: 'hp_percent',
                        value: 70
                    }
                },
                {
                    id: 'ifrit_inferno',
                    name: '地狱烈焰',
                    description: '释放毁灭性的终极火焰',
                    type: BossSkillType.ULTIMATE,
                    damagePercent: 50,  // 当前HP 50%
                    cooldown: 60,
                    castTime: 4,
                    warningTime: 3,
                    triggerCondition: {
                        type: 'hp_percent',
                        value: 30
                    }
                }
            ],
            timeLimit: 300,
            recommendedPower: 50000,
            unlockRequirement: {
                playerLevel: 20,
                chapterCleared: 'chapter_3'
            },
            backgroundId: 'bg_volcano',
            bgmId: 'bgm_boss_fire'
        });

        // ========== 冰霜领主 - 冰龙尼德霍格 ==========
        this._bosses.set('boss_nidhogg', {
            id: 'boss_nidhogg',
            name: '尼德霍格',
            title: '永冻之龙',
            description: '栖息在世界尽头的远古冰龙，其吐息能冻结时间本身',
            icon: 'textures/boss/nidhogg',
            element: ElementType.WATER,
            baseHP: 15000000,
            baseAttack: 4500,
            baseDefense: 3000,
            difficulties: this.createDifficultyConfigs('boss_nidhogg'),
            phases: [
                {
                    phaseNumber: 1,
                    hpThreshold: 100,
                    name: '冰封',
                    description: '尼德霍格从沉睡中醒来',
                    attackMultiplier: 1.0,
                    defenseMultiplier: 1.2,
                    speedMultiplier: 0.8,
                    skills: ['nidhogg_ice_breath', 'nidhogg_frost_spike']
                },
                {
                    phaseNumber: 2,
                    hpThreshold: 60,
                    name: '暴雪',
                    description: '尼德霍格召唤永恒暴风雪',
                    attackMultiplier: 1.2,
                    defenseMultiplier: 1.4,
                    speedMultiplier: 1.0,
                    skills: ['nidhogg_ice_breath', 'nidhogg_frost_spike', 'nidhogg_blizzard'],
                    specialMechanic: {
                        type: 'shield',
                        value: 500000,
                        duration: 15
                    }
                },
                {
                    phaseNumber: 3,
                    hpThreshold: 25,
                    name: '绝对零度',
                    description: '尼德霍格释放终极冰寒之力！',
                    attackMultiplier: 1.6,
                    defenseMultiplier: 1.0,
                    speedMultiplier: 1.3,
                    skills: ['nidhogg_ice_breath', 'nidhogg_frost_spike', 'nidhogg_blizzard', 'nidhogg_absolute_zero'],
                    specialMechanic: {
                        type: 'immune',
                        value: 5,       // 5秒无敌
                    }
                }
            ],
            skills: [
                {
                    id: 'nidhogg_ice_breath',
                    name: '冰霜吐息',
                    description: '喷射刺骨寒气，可能冻结目标',
                    type: BossSkillType.NORMAL_ATTACK,
                    damage: 2500,
                    cooldown: 4,
                    castTime: 0.8,
                    warningTime: 0.5,
                    effect: {
                        type: 'freeze',
                        value: 30,      // 30%概率冻结
                        duration: 2
                    }
                },
                {
                    id: 'nidhogg_frost_spike',
                    name: '冰刺突袭',
                    description: '从地面升起尖锐冰刺',
                    type: BossSkillType.AOE_ATTACK,
                    damage: 4000,
                    cooldown: 10,
                    castTime: 1.5,
                    warningTime: 1
                },
                {
                    id: 'nidhogg_blizzard',
                    name: '暴风雪',
                    description: '召唤席卷全场的暴风雪',
                    type: BossSkillType.DEBUFF,
                    damage: 2000,
                    cooldown: 25,
                    castTime: 2,
                    warningTime: 1.5,
                    effect: {
                        type: 'slow',
                        value: 50,      // 减速50%
                        duration: 10
                    }
                },
                {
                    id: 'nidhogg_absolute_zero',
                    name: '绝对零度',
                    description: '冻结一切的终极冰寒',
                    type: BossSkillType.ULTIMATE,
                    damagePercent: 40,
                    cooldown: 90,
                    castTime: 5,
                    warningTime: 4,
                    effect: {
                        type: 'freeze',
                        value: 100,
                        duration: 3
                    }
                }
            ],
            timeLimit: 360,
            recommendedPower: 80000,
            unlockRequirement: {
                playerLevel: 30,
                chapterCleared: 'chapter_4',
                previousBossDefeated: 'boss_ifrit'
            },
            backgroundId: 'bg_frozen',
            bgmId: 'bgm_boss_ice'
        });

        // ========== 雷霆领主 - 雷神托尔 ==========
        this._bosses.set('boss_thor', {
            id: 'boss_thor',
            name: '托尔',
            title: '雷霆战神',
            description: '手持神锤的雷霆之神，其怒吼能劈裂苍穹',
            icon: 'textures/boss/thor',
            element: ElementType.THUNDER,
            baseHP: 20000000,
            baseAttack: 6000,
            baseDefense: 2500,
            difficulties: this.createDifficultyConfigs('boss_thor'),
            phases: [
                {
                    phaseNumber: 1,
                    hpThreshold: 100,
                    name: '神威',
                    description: '托尔展现神之威严',
                    attackMultiplier: 1.0,
                    defenseMultiplier: 1.0,
                    speedMultiplier: 1.2,
                    skills: ['thor_hammer_strike', 'thor_lightning_bolt']
                },
                {
                    phaseNumber: 2,
                    hpThreshold: 50,
                    name: '雷怒',
                    description: '托尔的怒火引发雷暴',
                    attackMultiplier: 1.5,
                    defenseMultiplier: 0.8,
                    speedMultiplier: 1.5,
                    skills: ['thor_hammer_strike', 'thor_lightning_bolt', 'thor_thunder_storm']
                },
                {
                    phaseNumber: 3,
                    hpThreshold: 20,
                    name: '诸神黄昏',
                    description: '托尔释放毁灭世界的力量！',
                    attackMultiplier: 2.0,
                    defenseMultiplier: 0.6,
                    speedMultiplier: 2.0,
                    skills: ['thor_hammer_strike', 'thor_lightning_bolt', 'thor_thunder_storm', 'thor_ragnarok'],
                    specialMechanic: {
                        type: 'reflect',
                        value: 20
                    }
                }
            ],
            skills: [
                {
                    id: 'thor_hammer_strike',
                    name: '雷神之锤',
                    description: '用神锤进行毁灭性打击',
                    type: BossSkillType.HEAVY_ATTACK,
                    damage: 5000,
                    cooldown: 6,
                    castTime: 1.2,
                    warningTime: 0.8
                },
                {
                    id: 'thor_lightning_bolt',
                    name: '闪电箭',
                    description: '召唤闪电劈向敌人',
                    type: BossSkillType.NORMAL_ATTACK,
                    damage: 3500,
                    cooldown: 3,
                    castTime: 0.5,
                    warningTime: 0.3,
                    effect: {
                        type: 'stun',
                        value: 20,
                        duration: 1
                    }
                },
                {
                    id: 'thor_thunder_storm',
                    name: '雷暴',
                    description: '在战场上召唤持续的雷暴',
                    type: BossSkillType.AOE_ATTACK,
                    damage: 2000,
                    cooldown: 15,
                    castTime: 2,
                    warningTime: 1.5,
                    effect: {
                        type: 'dot',
                        value: 500,
                        duration: 8
                    }
                },
                {
                    id: 'thor_ragnarok',
                    name: '诸神黄昏',
                    description: '终结一切的神之审判',
                    type: BossSkillType.ULTIMATE,
                    damagePercent: 70,
                    cooldown: 120,
                    castTime: 5,
                    warningTime: 4
                }
            ],
            timeLimit: 420,
            recommendedPower: 120000,
            unlockRequirement: {
                playerLevel: 40,
                chapterCleared: 'chapter_5',
                previousBossDefeated: 'boss_nidhogg'
            },
            backgroundId: 'bg_thunder',
            bgmId: 'bgm_boss_thunder'
        });

        // ========== 暗影领主 - 死神哈迪斯 ==========
        this._bosses.set('boss_hades', {
            id: 'boss_hades',
            name: '哈迪斯',
            title: '冥界之王',
            description: '统治死亡国度的冥王，能操控亡灵与黑暗',
            icon: 'textures/boss/hades',
            element: ElementType.DARK,
            baseHP: 30000000,
            baseAttack: 5500,
            baseDefense: 3500,
            difficulties: this.createDifficultyConfigs('boss_hades'),
            phases: [
                {
                    phaseNumber: 1,
                    hpThreshold: 100,
                    name: '冥府',
                    description: '哈迪斯从冥界降临',
                    attackMultiplier: 1.0,
                    defenseMultiplier: 1.3,
                    speedMultiplier: 0.9,
                    skills: ['hades_death_scythe', 'hades_soul_drain']
                },
                {
                    phaseNumber: 2,
                    hpThreshold: 65,
                    name: '亡灵军团',
                    description: '哈迪斯召唤亡灵大军',
                    attackMultiplier: 1.3,
                    defenseMultiplier: 1.2,
                    speedMultiplier: 1.0,
                    skills: ['hades_death_scythe', 'hades_soul_drain', 'hades_summon_undead']
                },
                {
                    phaseNumber: 3,
                    hpThreshold: 35,
                    name: '死亡领域',
                    description: '哈迪斯展开死亡结界',
                    attackMultiplier: 1.6,
                    defenseMultiplier: 1.5,
                    speedMultiplier: 1.1,
                    skills: ['hades_death_scythe', 'hades_soul_drain', 'hades_summon_undead', 'hades_death_realm'],
                    specialMechanic: {
                        type: 'regen',
                        value: 1,
                        duration: 60
                    }
                },
                {
                    phaseNumber: 4,
                    hpThreshold: 10,
                    name: '终焉',
                    description: '哈迪斯释放终极黑暗！',
                    attackMultiplier: 2.5,
                    defenseMultiplier: 0.5,
                    speedMultiplier: 1.5,
                    skills: ['hades_death_scythe', 'hades_soul_drain', 'hades_summon_undead', 'hades_death_realm', 'hades_eternal_darkness']
                }
            ],
            skills: [
                {
                    id: 'hades_death_scythe',
                    name: '死神镰刀',
                    description: '挥舞收割灵魂的镰刀',
                    type: BossSkillType.NORMAL_ATTACK,
                    damage: 4000,
                    cooldown: 4,
                    castTime: 1,
                    warningTime: 0.6
                },
                {
                    id: 'hades_soul_drain',
                    name: '灵魂汲取',
                    description: '吸取敌人的生命力',
                    type: BossSkillType.DEBUFF,
                    damage: 3000,
                    cooldown: 12,
                    castTime: 2,
                    warningTime: 1,
                    effect: {
                        type: 'lifesteal',
                        value: 50,      // 回复造成伤害的50%
                        duration: 0
                    }
                },
                {
                    id: 'hades_summon_undead',
                    name: '亡灵召唤',
                    description: '召唤亡灵士兵',
                    type: BossSkillType.SUMMON,
                    cooldown: 30,
                    castTime: 3,
                    warningTime: 2
                },
                {
                    id: 'hades_death_realm',
                    name: '死亡领域',
                    description: '展开死亡结界，持续造成伤害',
                    type: BossSkillType.AOE_ATTACK,
                    damage: 1500,
                    cooldown: 25,
                    castTime: 2,
                    warningTime: 1.5,
                    effect: {
                        type: 'dot',
                        value: 800,
                        duration: 15
                    }
                },
                {
                    id: 'hades_eternal_darkness',
                    name: '永恒黑暗',
                    description: '吞噬一切的终极黑暗',
                    type: BossSkillType.ULTIMATE,
                    damagePercent: 80,
                    cooldown: 150,
                    castTime: 6,
                    warningTime: 5
                }
            ],
            timeLimit: 480,
            recommendedPower: 200000,
            unlockRequirement: {
                playerLevel: 50,
                previousBossDefeated: 'boss_thor'
            },
            backgroundId: 'bg_underworld',
            bgmId: 'bgm_boss_dark'
        });

        // ========== 世界Boss - 创世巨龙 ==========
        this._bosses.set('boss_world_dragon', {
            id: 'boss_world_dragon',
            name: '尤格德拉希尔',
            title: '创世之龙',
            description: '传说中诞生于世界之初的神龙，拥有操控所有元素的力量',
            icon: 'textures/boss/world_dragon',
            element: ElementType.LIGHT,
            baseHP: 100000000,
            baseAttack: 8000,
            baseDefense: 4000,
            difficulties: this.createDifficultyConfigs('boss_world_dragon', true),
            phases: [
                {
                    phaseNumber: 1,
                    hpThreshold: 100,
                    name: '火之试炼',
                    description: '以烈焰试炼挑战者',
                    attackMultiplier: 1.0,
                    defenseMultiplier: 1.0,
                    speedMultiplier: 1.0,
                    skills: ['dragon_fire_breath', 'dragon_elemental_shift']
                },
                {
                    phaseNumber: 2,
                    hpThreshold: 80,
                    name: '水之试炼',
                    description: '以寒冰洗礼挑战者',
                    attackMultiplier: 1.2,
                    defenseMultiplier: 1.2,
                    speedMultiplier: 1.0,
                    skills: ['dragon_ice_storm', 'dragon_elemental_shift']
                },
                {
                    phaseNumber: 3,
                    hpThreshold: 60,
                    name: '雷之试炼',
                    description: '以雷霆考验挑战者',
                    attackMultiplier: 1.4,
                    defenseMultiplier: 1.0,
                    speedMultiplier: 1.3,
                    skills: ['dragon_thunder_wrath', 'dragon_elemental_shift']
                },
                {
                    phaseNumber: 4,
                    hpThreshold: 40,
                    name: '暗之试炼',
                    description: '以黑暗侵蚀挑战者',
                    attackMultiplier: 1.6,
                    defenseMultiplier: 1.3,
                    speedMultiplier: 1.1,
                    skills: ['dragon_dark_void', 'dragon_elemental_shift'],
                    specialMechanic: {
                        type: 'shield',
                        value: 2000000
                    }
                },
                {
                    phaseNumber: 5,
                    hpThreshold: 20,
                    name: '创世之力',
                    description: '创世巨龙觉醒真正的力量！',
                    attackMultiplier: 2.0,
                    defenseMultiplier: 0.8,
                    speedMultiplier: 1.5,
                    skills: ['dragon_fire_breath', 'dragon_ice_storm', 'dragon_thunder_wrath', 'dragon_dark_void', 'dragon_genesis']
                }
            ],
            skills: [
                {
                    id: 'dragon_fire_breath',
                    name: '创世烈焰',
                    description: '喷射诞生于世界之初的原始火焰',
                    type: BossSkillType.AOE_ATTACK,
                    damage: 6000,
                    cooldown: 8,
                    castTime: 2,
                    warningTime: 1.5
                },
                {
                    id: 'dragon_ice_storm',
                    name: '绝对冻结',
                    description: '释放能冻结时间的极寒',
                    type: BossSkillType.AOE_ATTACK,
                    damage: 5000,
                    cooldown: 10,
                    castTime: 2,
                    warningTime: 1.5,
                    effect: {
                        type: 'freeze',
                        value: 50,
                        duration: 3
                    }
                },
                {
                    id: 'dragon_thunder_wrath',
                    name: '天罚雷霆',
                    description: '召唤毁灭性的雷霆',
                    type: BossSkillType.HEAVY_ATTACK,
                    damage: 10000,
                    cooldown: 12,
                    castTime: 1.5,
                    warningTime: 1
                },
                {
                    id: 'dragon_dark_void',
                    name: '虚空吞噬',
                    description: '打开吞噬一切的黑暗虚空',
                    type: BossSkillType.AOE_ATTACK,
                    damagePercent: 30,
                    cooldown: 20,
                    castTime: 3,
                    warningTime: 2
                },
                {
                    id: 'dragon_elemental_shift',
                    name: '元素转换',
                    description: '切换自身属性',
                    type: BossSkillType.BUFF,
                    cooldown: 30,
                    castTime: 1,
                    warningTime: 0.5
                },
                {
                    id: 'dragon_genesis',
                    name: '创世',
                    description: '释放创造世界的终极之力',
                    type: BossSkillType.ULTIMATE,
                    damagePercent: 90,
                    cooldown: 180,
                    castTime: 8,
                    warningTime: 6
                }
            ],
            timeLimit: 600,
            recommendedPower: 500000,
            unlockRequirement: {
                playerLevel: 60,
                previousBossDefeated: 'boss_hades'
            },
            backgroundId: 'bg_genesis',
            bgmId: 'bgm_boss_final'
        });
    }

    /**
     * 创建难度配置
     */
    private createDifficultyConfigs(bossId: string, isWorldBoss: boolean = false): BossDifficultyConfig[] {
        const configs: BossDifficultyConfig[] = [
            {
                difficulty: BossRaidDifficulty.NORMAL,
                hpMultiplier: 1.0,
                attackMultiplier: 1.0,
                defenseMultiplier: 1.0,
                rewardMultiplier: 1.0,
                firstKillRewards: [
                    { type: RewardType.DIAMOND, amount: 100, chance: 1 },
                    { type: RewardType.GOLD, amount: 10000, chance: 1 }
                ],
                normalRewards: [
                    { type: RewardType.GOLD, amount: 2000, chance: 1 },
                    { type: RewardType.MATERIAL, itemId: 'mat_boss_normal', amount: 1, chance: 0.5 }
                ],
                rankRewards: [
                    { rankRange: { min: 1, max: 10 }, rewards: [{ type: RewardType.DIAMOND, amount: 500, chance: 1 }] },
                    { rankRange: { min: 11, max: 100 }, rewards: [{ type: RewardType.DIAMOND, amount: 200, chance: 1 }] }
                ],
                dailyAttempts: 3,
                staminaCost: 20
            },
            {
                difficulty: BossRaidDifficulty.HARD,
                hpMultiplier: 2.0,
                attackMultiplier: 1.5,
                defenseMultiplier: 1.3,
                rewardMultiplier: 1.5,
                firstKillRewards: [
                    { type: RewardType.DIAMOND, amount: 200, chance: 1 },
                    { type: RewardType.GOLD, amount: 20000, chance: 1 },
                    { type: RewardType.EQUIPMENT, itemId: `equip_${bossId}_weapon`, amount: 1, chance: 0.3 }
                ],
                normalRewards: [
                    { type: RewardType.GOLD, amount: 4000, chance: 1 },
                    { type: RewardType.MATERIAL, itemId: 'mat_boss_hard', amount: 1, chance: 0.6 }
                ],
                rankRewards: [
                    { rankRange: { min: 1, max: 10 }, rewards: [{ type: RewardType.DIAMOND, amount: 800, chance: 1 }] },
                    { rankRange: { min: 11, max: 100 }, rewards: [{ type: RewardType.DIAMOND, amount: 300, chance: 1 }] }
                ],
                dailyAttempts: 2,
                staminaCost: 30
            },
            {
                difficulty: BossRaidDifficulty.EXTREME,
                hpMultiplier: 5.0,
                attackMultiplier: 2.0,
                defenseMultiplier: 1.5,
                rewardMultiplier: 2.5,
                firstKillRewards: [
                    { type: RewardType.DIAMOND, amount: 500, chance: 1 },
                    { type: RewardType.GOLD, amount: 50000, chance: 1 },
                    { type: RewardType.EQUIPMENT, itemId: `equip_${bossId}_weapon`, amount: 1, chance: 0.5 }
                ],
                normalRewards: [
                    { type: RewardType.GOLD, amount: 8000, chance: 1 },
                    { type: RewardType.MATERIAL, itemId: 'mat_boss_extreme', amount: 1, chance: 0.7 }
                ],
                rankRewards: [
                    { rankRange: { min: 1, max: 10 }, rewards: [{ type: RewardType.DIAMOND, amount: 1200, chance: 1 }] },
                    { rankRange: { min: 11, max: 100 }, rewards: [{ type: RewardType.DIAMOND, amount: 500, chance: 1 }] }
                ],
                dailyAttempts: 1,
                staminaCost: 50
            }
        ];

        // 噩梦和地狱难度
        if (isWorldBoss) {
            configs.push({
                difficulty: BossRaidDifficulty.NIGHTMARE,
                hpMultiplier: 10.0,
                attackMultiplier: 3.0,
                defenseMultiplier: 2.0,
                rewardMultiplier: 5.0,
                firstKillRewards: [
                    { type: RewardType.DIAMOND, amount: 1000, chance: 1 },
                    { type: RewardType.GOLD, amount: 100000, chance: 1 },
                    { type: RewardType.CHARACTER, itemId: 'char_boss_reward', amount: 1, chance: 0.1 }
                ],
                normalRewards: [
                    { type: RewardType.GOLD, amount: 15000, chance: 1 },
                    { type: RewardType.MATERIAL, itemId: 'mat_boss_nightmare', amount: 1, chance: 0.8 }
                ],
                rankRewards: [
                    { rankRange: { min: 1, max: 3 }, rewards: [{ type: RewardType.DIAMOND, amount: 3000, chance: 1 }] },
                    { rankRange: { min: 4, max: 10 }, rewards: [{ type: RewardType.DIAMOND, amount: 1500, chance: 1 }] }
                ],
                dailyAttempts: 1,
                staminaCost: 80
            });

            configs.push({
                difficulty: BossRaidDifficulty.HELL,
                hpMultiplier: 20.0,
                attackMultiplier: 5.0,
                defenseMultiplier: 3.0,
                rewardMultiplier: 10.0,
                firstKillRewards: [
                    { type: RewardType.DIAMOND, amount: 3000, chance: 1 },
                    { type: RewardType.GOLD, amount: 500000, chance: 1 },
                    { type: RewardType.CHARACTER, itemId: 'char_boss_reward_ssr', amount: 1, chance: 0.2 }
                ],
                normalRewards: [
                    { type: RewardType.GOLD, amount: 30000, chance: 1 },
                    { type: RewardType.MATERIAL, itemId: 'mat_boss_hell', amount: 2, chance: 1 }
                ],
                rankRewards: [
                    { rankRange: { min: 1, max: 1 }, rewards: [{ type: RewardType.DIAMOND, amount: 10000, chance: 1 }] },
                    { rankRange: { min: 2, max: 3 }, rewards: [{ type: RewardType.DIAMOND, amount: 5000, chance: 1 }] }
                ],
                dailyAttempts: 1,
                staminaCost: 100
            });
        }

        return configs;
    }

    // ==================== 公共方法 ====================

    public getBoss(id: string): BossRaidConfig | undefined {
        return this._bosses.get(id);
    }

    public getAllBosses(): BossRaidConfig[] {
        return Array.from(this._bosses.values());
    }

    public getBossesByElement(element: ElementType): BossRaidConfig[] {
        return Array.from(this._bosses.values()).filter(b => b.element === element);
    }

    public getDifficultyConfig(bossId: string, difficulty: BossRaidDifficulty): BossDifficultyConfig | undefined {
        const boss = this._bosses.get(bossId);
        return boss?.difficulties.find(d => d.difficulty === difficulty);
    }

    public getBossSkill(bossId: string, skillId: string): BossSkillConfig | undefined {
        const boss = this._bosses.get(bossId);
        return boss?.skills.find(s => s.id === skillId);
    }

    /**
     * 计算Boss属性（根据难度）
     */
    public calculateBossStats(bossId: string, difficulty: BossRaidDifficulty): {
        hp: number;
        attack: number;
        defense: number;
    } | null {
        const boss = this._bosses.get(bossId);
        const diffConfig = this.getDifficultyConfig(bossId, difficulty);
        
        if (!boss || !diffConfig) return null;

        return {
            hp: Math.floor(boss.baseHP * diffConfig.hpMultiplier),
            attack: Math.floor(boss.baseAttack * diffConfig.attackMultiplier),
            defense: Math.floor(boss.baseDefense * diffConfig.defenseMultiplier)
        };
    }

    /**
     * 获取难度名称
     */
    public getDifficultyName(difficulty: BossRaidDifficulty): string {
        switch (difficulty) {
            case BossRaidDifficulty.NORMAL: return '普通';
            case BossRaidDifficulty.HARD: return '困难';
            case BossRaidDifficulty.EXTREME: return '极难';
            case BossRaidDifficulty.NIGHTMARE: return '噩梦';
            case BossRaidDifficulty.HELL: return '地狱';
            default: return '未知';
        }
    }

    /**
     * 获取难度颜色
     */
    public getDifficultyColor(difficulty: BossRaidDifficulty): string {
        switch (difficulty) {
            case BossRaidDifficulty.NORMAL: return '#55AA55';
            case BossRaidDifficulty.HARD: return '#5555FF';
            case BossRaidDifficulty.EXTREME: return '#AA55AA';
            case BossRaidDifficulty.NIGHTMARE: return '#FF5555';
            case BossRaidDifficulty.HELL: return '#FF0000';
            default: return '#FFFFFF';
        }
    }
}
