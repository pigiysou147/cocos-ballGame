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
export { InputManager } from './InputManager';
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
