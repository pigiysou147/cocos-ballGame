/**
 * 时间弹射物语 - World Flipper Clone
 * 
 * 基于Cocos Creator 3.x开发的弹珠RPG游戏
 * A pinball RPG game built with Cocos Creator 3.x
 * 
 * @author 
 * @version 1.0.0
 */

// 核心系统
export { GameManager } from './GameManager';
export { InputManager, TouchZone } from './InputManager';
export { LevelManager } from './LevelManager';
export { SkillSystem, SkillType, SkillTarget } from './SkillSystem';

// 游戏对象
export { Character } from './Character';
export { Enemy, EnemyType } from './Enemy';
export { Flipper, FlipperSide } from './Flipper';
export { Wall, WallType } from './Wall';
export { Bumper, BumperType } from './Bumper';
export { DeadZone } from './DeadZone';

// 场景和UI
export { SceneSetup } from './SceneSetup';
export { GameUI } from './GameUI';
export { MobileUI } from './MobileUI';

// 技能系统（独立技能池）
export {
    SkillDatabase,
    SkillType,
    SkillTargetType,
    SkillEffectType
} from './SkillData';
export type {
    SkillConfig,
    SkillEffect,
    SkillInstance
} from './SkillData';

// 角色系统（独立角色池，通过ID引用技能池）
export { 
    CharacterDatabase, 
    CharacterRarity, 
    ElementType, 
    CharacterClass 
} from './CharacterData';
export type { 
    CharacterConfig, 
    CharacterInstance, 
    CharacterStats,
    CharacterSkillSlots
} from './CharacterData';

export { CharacterManager, TeamData } from './CharacterManager';
export { CharacterSelectUI } from './CharacterSelectUI';
export { CharacterUpgrade, MaterialType } from './CharacterUpgrade';
export type { MaterialData, MaterialInventory } from './CharacterUpgrade';

// 队伍战斗系统
export { TeamBattle } from './TeamBattle';

// 装备系统（独立装备池）
export {
    EquipmentDatabase,
    EquipmentType,
    EquipmentRarity,
    EquipmentStatType
} from './EquipmentData';
export type {
    EquipmentConfig,
    EquipmentInstance,
    EquipmentStat,
    EquipmentSet,
    SetBonus,
    EquipmentSpecialEffect
} from './EquipmentData';

export { EquipmentManager } from './EquipmentManager';
export type { EnhanceResult, ActiveSetInfo } from './EquipmentManager';

// UI绘制工具
export { DoodleGraphics } from './DoodleGraphics';

// UI面板
export { MainMenuUI } from './MainMenuUI';
export { InventoryPanel } from './InventoryPanel';
export { CharacterPanel } from './CharacterPanel';
export { LevelSelectPanel } from './LevelSelectPanel';

// 关卡系统
export {
    LevelDatabase,
    LevelDifficulty,
    LevelType,
    RewardType
} from './LevelData';
export type {
    LevelConfig,
    ChapterConfig,
    LevelProgress,
    ChapterProgress,
    RewardData,
    LevelObjective,
    StarReward,
    EnemyWave,
    EnemySpawnInfo,
    ObstacleData
} from './LevelData';

export { LevelProgressManager } from './LevelProgressManager';
export type { LevelResult } from './LevelProgressManager';

// 领主战系统
export {
    BossRaidDatabase,
    BossRaidDifficulty,
    BossRaidStatus,
    BossSkillType
} from './BossRaidData';
export type {
    BossRaidConfig,
    BossSkillConfig,
    BossPhase,
    BossDifficultyConfig,
    BossRaidRecord,
    BossRaidResult,
    DamageRecord,
    RankRewardConfig
} from './BossRaidData';

export { BossRaidManager } from './BossRaidManager';
export type { BossRaidBattleState } from './BossRaidManager';

export { BossRaidPanel } from './BossRaidPanel';

// 怪物系统
export {
    MonsterDatabase,
    MonsterType,
    MonsterRace,
    MonsterSize,
    AIBehaviorType,
    MovementPattern,
    AttackPattern
} from './MonsterData';
export type {
    MonsterConfig,
    MonsterInstance,
    MonsterStats,
    MonsterSkillConfig,
    MonsterSkillEffect,
    WeaknessConfig,
    ResistanceConfig,
    DropConfig,
    ActiveEffect
} from './MonsterData';

export { MonsterAI, AIState } from './MonsterAI';

// 元素系统
export { ElementSystem, ElementReactionType } from './ElementSystem';
export type {
    ElementRelation,
    ElementReaction,
    ElementAura
} from './ElementSystem';

// 伤害系统
export { DamageSystem, DamageType } from './DamageSystem';
export type {
    DamageInfo,
    DamageResult,
    DamageTextConfig
} from './DamageSystem';

// 货币系统
export { CurrencyManager, CurrencyType } from './CurrencyManager';
export type {
    CurrencyConfig,
    CurrencyTransaction,
    InsufficientCurrencyError
} from './CurrencyManager';

// 抽卡系统
export { GachaSystem, GachaPoolType, SummonType } from './GachaSystem';
export type {
    GachaPoolConfig,
    GachaRateConfig,
    PityConfig,
    GachaResult,
    GachaHistory,
    GachaStats
} from './GachaSystem';

// 商店系统
export { ShopSystem, ShopType, ItemType } from './ShopSystem';
export type {
    ShopItemConfig,
    GiftPackConfig,
    PurchaseRecord
} from './ShopSystem';

// 成就系统
export { AchievementSystem, AchievementCategory, AchievementTrigger } from './AchievementSystem';
export type {
    AchievementConfig,
    AchievementProgress,
    AchievementReward
} from './AchievementSystem';

// 每日任务系统
export { DailyTaskSystem, TaskType, TaskTrigger } from './DailyTaskSystem';
export type {
    TaskConfig,
    TaskProgress,
    TaskReward,
    ActivityRewardConfig,
    SignInConfig
} from './DailyTaskSystem';

// 音频系统
export { AudioManager, SFXType, BGMType } from './AudioManager';
export type { AudioConfig } from './AudioManager';

// 新手引导系统
export { TutorialSystem, TutorialStepType, TutorialTrigger, DialogPosition } from './TutorialSystem';
export type {
    TutorialStep,
    TutorialChapter,
    TutorialProgress
} from './TutorialSystem';

// 设置面板
export { SettingsPanel, QualityLevel, LanguageType } from './SettingsPanel';
export type { SettingsData } from './SettingsPanel';

// 抽卡动画
export { GachaAnimation, GachaAnimationPhase } from './GachaAnimation';
export type { GachaAnimationConfig } from './GachaAnimation';

// 登录奖励系统
export { LoginRewardSystem } from './LoginRewardSystem';
export type {
    RewardItem,
    DailyLoginReward,
    AccumulativeReward,
    ReturnReward,
    LoginData
} from './LoginRewardSystem';

// 活动系统
export { EventSystem, EventType, EventStatus } from './EventSystem';
export type {
    EventReward,
    EventTask,
    GameEventConfig,
    EventProgress,
    ExchangeItem
} from './EventSystem';

// 邮箱系统
export { MailSystem, MailType } from './MailSystem';
export type {
    MailAttachment,
    MailConfig,
    MailboxData
} from './MailSystem';

// 红点通知系统
export { RedDotSystem, RedDotType } from './RedDotSystem';
export type { RedDotState, RedDotConfig } from './RedDotSystem';

// 数据统计系统
export { StatisticsSystem } from './StatisticsSystem';
export type {
    BattleStatistics,
    GachaStatistics,
    CurrencyStatistics,
    CharacterStatistics,
    AchievementStatistics,
    LoginStatistics,
    AllStatistics
} from './StatisticsSystem';

// VIP系统
export { VIPSystem } from './VIPSystem';
export type {
    VIPLevelConfig,
    VIPPrivileges,
    VIPData
} from './VIPSystem';

// 公告系统
export { AnnouncementSystem, AnnouncementType, AnnouncementPriority } from './AnnouncementSystem';
export type {
    AnnouncementConfig,
    AnnouncementReadRecord,
    AnnouncementData
} from './AnnouncementSystem';

// 技能效果管理器
export { SkillEffectManager, EffectSourceType } from './SkillEffectManager';
export type {
    EffectInstance,
    EffectStats
} from './SkillEffectManager';

// 技能执行器
export { SkillExecutor } from './SkillExecutor';
export type {
    SkillCastResult,
    SkillTargetInfo,
    SkillCastContext,
    CooldownInfo
} from './SkillExecutor';

// 技能升级系统
export { SkillUpgradeSystem } from './SkillUpgradeSystem';
export type {
    SkillUpgradeMaterial,
    SkillUpgradeConfig,
    CharacterSkillData,
    SkillBookData
} from './SkillUpgradeSystem';

// 技能连携系统
export { SkillComboSystem, ComboTriggerType } from './SkillComboSystem';
export type {
    ComboEffect,
    SkillComboConfig,
    ComboState,
    ComboTriggerResult
} from './SkillComboSystem';

// 装备强化系统
export { EquipmentEnhanceSystem } from './EquipmentEnhanceSystem';
export type {
    EnhanceResult,
    DecomposeResult,
    DecomposeMaterial,
    ReforgeResult,
    InheritResult,
    EnhanceProtection
} from './EquipmentEnhanceSystem';

// 装备锻造系统
export { EquipmentForgeSystem } from './EquipmentForgeSystem';
export type {
    ForgeRecipe,
    ForgeMaterial,
    BonusDrop,
    ForgeResult,
    SynthesisRecipe
} from './EquipmentForgeSystem';

// 宝石镶嵌系统
export { EquipmentGemSystem, GemType, GemGrade } from './EquipmentGemSystem';
export type {
    GemConfig,
    GemInstance,
    EquipmentGemSlots,
    SocketResult,
    GemCombineResult
} from './EquipmentGemSystem';

// 角色好感度系统
export { CharacterAffinitySystem, AffinityLevel, GiftType, InteractionType } from './CharacterAffinitySystem';
export type {
    GiftConfig,
    AffinityLevelConfig,
    AffinityReward,
    AffinityStatBonus,
    CharacterAffinityData,
    InteractionResult
} from './CharacterAffinitySystem';

// 角色羁绊系统
export { CharacterBondSystem, BondType } from './CharacterBondSystem';
export type {
    BondCondition,
    BondEffect,
    BondConfig,
    BondLevel,
    ActiveBond,
    TeamBondStatus
} from './CharacterBondSystem';

// 角色天赋系统
export { CharacterTalentSystem, TalentNodeType, TalentNodeStatus } from './CharacterTalentSystem';
export type {
    TalentNodeEffect,
    TalentNodeConfig,
    TalentTreeConfig,
    CharacterTalentData,
    TalentUnlockResult,
    TalentResetResult
} from './CharacterTalentSystem';

// 角色图鉴系统
export { CharacterCollectionSystem, CollectionStatus } from './CharacterCollectionSystem';
export type {
    CollectionEntry,
    CollectionReward,
    CollectionCondition,
    CollectionRewardItem,
    CollectionStatistics,
    CharacterVoice,
    VoiceUnlockCondition,
    CharacterStory,
    StoryUnlockCondition
} from './CharacterCollectionSystem';

// 技能特效渲染器
export { SkillEffectRenderer, SkillVFXType } from './SkillEffectRenderer';
export type {
    SkillVFXConfig
} from './SkillEffectRenderer';

// 编队系统（3主3副 + 武器魂珠）
export { FormationSystem, SlotType, SoulOrbType, SoulOrbEffectType } from './FormationSystem';
export type {
    SoulOrbConfig,
    SoulOrbEffect,
    SoulOrbInstance,
    MainSlotData,
    SubSlotData,
    FormationData,
    FormationCharacterState,
    FormationBonuses
} from './FormationSystem';

// 战斗核心系统（Fever/冲刺/PF/技能）
export { BattleCoreSystem, DamageSystemType, PowerFlipLevel, BattleState } from './BattleCoreSystem';
export type {
    DashState,
    FeverState,
    ComboState,
    EnergyState,
    BattleStats
} from './BattleCoreSystem';

// 协力球系统
export { CooperativeBallSystem, CoopBallType } from './CooperativeBallSystem';
export type {
    CoopBallConfig,
    CoopBallInstance,
    CoopBallSummonCondition
} from './CooperativeBallSystem';

// 复活系统
export { RevivalSystem, RevivalState } from './RevivalSystem';
export type {
    DeathData,
    RevivalConfig,
    RevivalResult
} from './RevivalSystem';

// 技能链系统（CHAIN）
export { SkillChainSystem, ChainEffectType } from './SkillChainSystem';
export type {
    ChainEffectConfig,
    ChainState,
    ChainTriggerRecord
} from './SkillChainSystem';

// 特性系统（贯通/浮游/加速等）
export { TraitSystem, TraitType, TraitTrigger } from './TraitSystem';
export type {
    TraitConfig,
    TraitInstance,
    TraitEffectResult,
    CharacterTraitData
} from './TraitSystem';

// 能力伤害系统（被动触发）
export { AbilityDamageSystem, AbilityTriggerType, AbilityDamageType } from './AbilityDamageSystem';
export type {
    AbilityConfig,
    AbilityInstance,
    AbilityDamageResult
} from './AbilityDamageSystem';

// 弱点与能量系统
export { WeakPointEnergySystem, WeakPointType, WeakPointState, EnergySource } from './WeakPointEnergySystem';
export type {
    WeakPointConfig,
    WeakPointInstance,
    EnergyGainConfig,
    EnergyGainRecord
} from './WeakPointEnergySystem';

// 技能升级系统（扩展：一板/二板）
export { SkillPanelType } from './SkillUpgradeSystem';
export type {
    SkillPanelData,
    StarMaterialData,
    ElementMaterialData,
    BossMaterialData
} from './SkillUpgradeSystem';

// 能量循环系统
export { EnergySystem, EnergySourceType, EnergyEfficiency } from './EnergySystem';
export type {
    EnergySourceConfig,
    CharacterEnergyPassive,
    FormationEnergyData,
    EnergyGainRecord
} from './EnergySystem';

// 角色特色系统（类型/定位/弹射特性）
export { 
    CharacterFeatureSystem, 
    CharacterType, 
    CharacterRole, 
    PassiveMarkType, 
    BounceType,
    PassiveTriggerCondition,
    PassiveEffectType
} from './CharacterFeatureSystem';
export type {
    CharacterTypeConfig,
    CharacterRoleConfig,
    PassiveSkillConfig,
    ElementTendencyConfig
} from './CharacterFeatureSystem';

// 队长技能系统
export { LeaderSkillSystem, LeaderSkillType, LeaderConditionType } from './LeaderSkillSystem';
export type {
    LeaderSkillEffect,
    LeaderSkillCondition,
    LeaderSkillConfig,
    LeaderSkillRuntimeData,
    TeamLeaderBonus
} from './LeaderSkillSystem';

// 角色被动系统（M标识/触发机制）
export { CharacterPassiveSystem } from './CharacterPassiveSystem';
export type {
    PassiveEffectInstance,
    PassiveTriggerContext,
    PassiveCalculationResult,
    SummonConfig
} from './CharacterPassiveSystem';

// 流派适配系统（技伤/PF/直击/Fever）
export { BuildArchetypeSystem, BuildArchetype } from './BuildArchetypeSystem';
export type {
    BuildArchetypeConfig,
    TeamBuildData,
    ArchetypeScoreResult,
    TeamArchetypeAnalysis,
    BuildOptimizationSuggestion
} from './BuildArchetypeSystem';

// 更新角色数据导出（新增类型和接口）
export type {
    CharacterPassiveConfig,
    CharacterBounceConfig
} from './CharacterData';
