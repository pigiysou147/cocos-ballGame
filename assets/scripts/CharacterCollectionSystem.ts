import { _decorator, Component, sys, EventTarget } from 'cc';
import { CharacterDatabase, CharacterConfig, CharacterRarity, ElementType, CharacterClass } from './CharacterData';
import { CharacterManager } from './CharacterManager';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 图鉴条目状态
 */
export enum CollectionStatus {
    UNKNOWN = 'unknown',        // 未发现
    DISCOVERED = 'discovered',  // 已发现（见过但未拥有）
    OWNED = 'owned',            // 拥有
    MASTERED = 'mastered'       // 精通（达到特定条件）
}

/**
 * 图鉴条目数据
 */
export interface CollectionEntry {
    characterId: string;
    status: CollectionStatus;
    
    // 发现信息
    firstDiscoveredTime?: number;   // 首次发现时间
    firstObtainedTime?: number;     // 首次获得时间
    
    // 收集统计
    totalObtained: number;          // 累计获得次数
    currentOwned: number;           // 当前拥有数量
    
    // 最高成就
    maxLevel: number;               // 达到的最高等级
    maxStar: number;                // 达到的最高星级
    maxAwakening: number;           // 达到的最高觉醒
    maxAffinity: number;            // 达到的最高好感度
    
    // 战斗记录
    totalBattles: number;           // 总战斗次数
    totalKills: number;             // 总击杀数
    totalDamageDealt: number;       // 总输出伤害
    
    // 故事/语音解锁
    unlockedStories: string[];      // 已解锁的故事
    unlockedVoices: string[];       // 已解锁的语音
}

/**
 * 图鉴奖励配置
 */
export interface CollectionReward {
    id: string;
    name: string;
    description: string;
    
    // 达成条件
    condition: CollectionCondition;
    
    // 奖励内容
    rewards: CollectionRewardItem[];
    
    // 是否已领取
    claimed?: boolean;
}

/**
 * 图鉴达成条件
 */
export interface CollectionCondition {
    type: 'count' | 'rarity' | 'element' | 'class' | 'mastered' | 'specific';
    
    // count: 收集数量
    count?: number;
    
    // rarity: 特定稀有度的收集数量
    rarity?: CharacterRarity;
    rarityCount?: number;
    
    // element: 特定元素的收集数量
    element?: ElementType;
    elementCount?: number;
    
    // class: 特定职业的收集数量
    charClass?: CharacterClass;
    classCount?: number;
    
    // mastered: 精通角色数量
    masteredCount?: number;
    
    // specific: 特定角色列表
    characterIds?: string[];
}

/**
 * 奖励物品
 */
export interface CollectionRewardItem {
    type: 'currency' | 'item' | 'character' | 'costume';
    id: string;
    amount?: number;
}

/**
 * 图鉴统计数据
 */
export interface CollectionStatistics {
    // 角色收集
    totalCharacters: number;        // 游戏总角色数
    discoveredCount: number;        // 发现数量
    ownedCount: number;             // 拥有数量
    masteredCount: number;          // 精通数量
    
    // 按稀有度统计
    byRarity: { [rarity: number]: { total: number; owned: number } };
    
    // 按元素统计
    byElement: { [element: string]: { total: number; owned: number } };
    
    // 按职业统计
    byClass: { [charClass: string]: { total: number; owned: number } };
    
    // 收集进度
    overallProgress: number;        // 总体进度百分比
    
    // 奖励统计
    claimedRewards: number;
    totalRewards: number;
}

/**
 * 角色语音配置
 */
export interface CharacterVoice {
    id: string;
    name: string;
    description: string;
    audioPath: string;
    unlockCondition: VoiceUnlockCondition;
}

/**
 * 语音解锁条件
 */
export interface VoiceUnlockCondition {
    type: 'default' | 'affinity' | 'level' | 'awakening' | 'story' | 'special';
    value?: number;         // 需要的数值（等级/好感度等）
    storyId?: string;       // 需要完成的故事ID
}

/**
 * 角色故事配置
 */
export interface CharacterStory {
    id: string;
    title: string;
    content: string;
    chapter: number;
    unlockCondition: StoryUnlockCondition;
}

/**
 * 故事解锁条件
 */
export interface StoryUnlockCondition {
    type: 'affinity' | 'level' | 'awakening' | 'quest';
    value?: number;
    questId?: string;
}

/**
 * 角色图鉴系统
 * Character Collection/Encyclopedia System
 */
@ccclass('CharacterCollectionSystem')
export class CharacterCollectionSystem extends Component {
    private static _instance: CharacterCollectionSystem | null = null;

    // 事件目标
    public readonly events: EventTarget = new EventTarget();

    // 事件类型
    public static readonly EVENT_CHARACTER_DISCOVERED = 'character-discovered';
    public static readonly EVENT_CHARACTER_OBTAINED = 'character-obtained';
    public static readonly EVENT_CHARACTER_MASTERED = 'character-mastered';
    public static readonly EVENT_REWARD_CLAIMED = 'collection-reward-claimed';
    public static readonly EVENT_STORY_UNLOCKED = 'collection-story-unlocked';
    public static readonly EVENT_VOICE_UNLOCKED = 'collection-voice-unlocked';

    // 图鉴数据
    private _collectionData: Map<string, CollectionEntry> = new Map();

    // 图鉴奖励配置
    private _rewards: Map<string, CollectionReward> = new Map();

    // 角色语音配置
    private _characterVoices: Map<string, CharacterVoice[]> = new Map();

    // 角色故事配置
    private _characterStories: Map<string, CharacterStory[]> = new Map();

    // 已领取的奖励
    private _claimedRewards: Set<string> = new Set();

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_collection_data';

    public static get instance(): CharacterCollectionSystem | null {
        return CharacterCollectionSystem._instance;
    }

    onLoad() {
        if (CharacterCollectionSystem._instance) {
            this.node.destroy();
            return;
        }
        CharacterCollectionSystem._instance = this;

        this.initRewards();
        this.initCharacterVoices();
        this.initCharacterStories();
        this.loadData();
    }

    /**
     * 初始化图鉴奖励
     */
    private initRewards(): void {
        // 收集数量奖励
        this.addReward({
            id: 'collection_count_5',
            name: '初级收集家',
            description: '收集5名角色',
            condition: { type: 'count', count: 5 },
            rewards: [
                { type: 'currency', id: 'gold', amount: 5000 },
                { type: 'currency', id: 'diamond', amount: 50 }
            ]
        });

        this.addReward({
            id: 'collection_count_10',
            name: '中级收集家',
            description: '收集10名角色',
            condition: { type: 'count', count: 10 },
            rewards: [
                { type: 'currency', id: 'gold', amount: 10000 },
                { type: 'currency', id: 'diamond', amount: 100 }
            ]
        });

        this.addReward({
            id: 'collection_count_20',
            name: '高级收集家',
            description: '收集20名角色',
            condition: { type: 'count', count: 20 },
            rewards: [
                { type: 'currency', id: 'gold', amount: 30000 },
                { type: 'currency', id: 'diamond', amount: 300 },
                { type: 'item', id: 'summon_ticket_10', amount: 1 }
            ]
        });

        this.addReward({
            id: 'collection_count_50',
            name: '大师收集家',
            description: '收集50名角色',
            condition: { type: 'count', count: 50 },
            rewards: [
                { type: 'currency', id: 'gold', amount: 100000 },
                { type: 'currency', id: 'diamond', amount: 1000 },
                { type: 'item', id: 'summon_ticket_10', amount: 3 }
            ]
        });

        // 稀有度收集奖励
        this.addReward({
            id: 'collection_ssr_3',
            name: 'SSR收集者',
            description: '收集3名SSR角色',
            condition: { type: 'rarity', rarity: CharacterRarity.SSR, rarityCount: 3 },
            rewards: [
                { type: 'currency', id: 'diamond', amount: 200 }
            ]
        });

        this.addReward({
            id: 'collection_ur_1',
            name: '传说降临',
            description: '收集1名UR角色',
            condition: { type: 'rarity', rarity: CharacterRarity.UR, rarityCount: 1 },
            rewards: [
                { type: 'currency', id: 'diamond', amount: 500 },
                { type: 'item', id: 'awakening_crystal', amount: 5 }
            ]
        });

        this.addReward({
            id: 'collection_ur_3',
            name: '传说收集者',
            description: '收集3名UR角色',
            condition: { type: 'rarity', rarity: CharacterRarity.UR, rarityCount: 3 },
            rewards: [
                { type: 'currency', id: 'diamond', amount: 1500 },
                { type: 'item', id: 'awakening_crystal', amount: 10 }
            ]
        });

        // 元素收集奖励
        this.addReward({
            id: 'collection_fire_all',
            name: '火焰大师',
            description: '收集所有火属性角色',
            condition: { type: 'element', element: ElementType.FIRE, elementCount: 99 },
            rewards: [
                { type: 'currency', id: 'diamond', amount: 300 },
                { type: 'item', id: 'talent_fire_crystal', amount: 10 }
            ]
        });

        this.addReward({
            id: 'collection_water_all',
            name: '流水大师',
            description: '收集所有水属性角色',
            condition: { type: 'element', element: ElementType.WATER, elementCount: 99 },
            rewards: [
                { type: 'currency', id: 'diamond', amount: 300 },
                { type: 'item', id: 'talent_water_crystal', amount: 10 }
            ]
        });

        // 职业收集奖励
        this.addReward({
            id: 'collection_warrior_5',
            name: '战士之友',
            description: '收集5名战士职业角色',
            condition: { type: 'class', charClass: CharacterClass.WARRIOR, classCount: 5 },
            rewards: [
                { type: 'currency', id: 'gold', amount: 20000 }
            ]
        });

        this.addReward({
            id: 'collection_mage_5',
            name: '法师之友',
            description: '收集5名法师职业角色',
            condition: { type: 'class', charClass: CharacterClass.MAGE, classCount: 5 },
            rewards: [
                { type: 'currency', id: 'gold', amount: 20000 }
            ]
        });

        // 精通奖励
        this.addReward({
            id: 'collection_mastered_1',
            name: '初次精通',
            description: '精通1名角色',
            condition: { type: 'mastered', masteredCount: 1 },
            rewards: [
                { type: 'currency', id: 'diamond', amount: 100 }
            ]
        });

        this.addReward({
            id: 'collection_mastered_5',
            name: '精通之道',
            description: '精通5名角色',
            condition: { type: 'mastered', masteredCount: 5 },
            rewards: [
                { type: 'currency', id: 'diamond', amount: 500 },
                { type: 'item', id: 'summon_ticket_10', amount: 1 }
            ]
        });

        // 特定组合奖励
        this.addReward({
            id: 'collection_fire_duo',
            name: '烈焰双子',
            description: '收集烈焰剑士和火焰法师',
            condition: { type: 'specific', characterIds: ['char_fire_001', 'char_fire_002'] },
            rewards: [
                { type: 'currency', id: 'gold', amount: 10000 },
                { type: 'currency', id: 'diamond', amount: 100 }
            ]
        });

        this.addReward({
            id: 'collection_light_dark',
            name: '光暗双生',
            description: '收集圣光天使和暗影领主',
            condition: { type: 'specific', characterIds: ['char_light_001', 'char_dark_001'] },
            rewards: [
                { type: 'currency', id: 'gold', amount: 20000 },
                { type: 'currency', id: 'diamond', amount: 200 }
            ]
        });

        console.log(`图鉴奖励初始化完成，共 ${this._rewards.size} 个奖励`);
    }

    /**
     * 初始化角色语音
     */
    private initCharacterVoices(): void {
        // 为每个角色创建语音配置
        const characters = CharacterDatabase.instance.getAllCharacters();

        for (const char of characters) {
            const voices: CharacterVoice[] = [
                {
                    id: `${char.id}_voice_intro`,
                    name: '自我介绍',
                    description: '角色的自我介绍',
                    audioPath: `audio/voice/${char.id}/intro`,
                    unlockCondition: { type: 'default' }
                },
                {
                    id: `${char.id}_voice_battle_start`,
                    name: '战斗开始',
                    description: '战斗开始时的台词',
                    audioPath: `audio/voice/${char.id}/battle_start`,
                    unlockCondition: { type: 'default' }
                },
                {
                    id: `${char.id}_voice_skill`,
                    name: '技能释放',
                    description: '释放技能时的台词',
                    audioPath: `audio/voice/${char.id}/skill`,
                    unlockCondition: { type: 'level', value: 10 }
                },
                {
                    id: `${char.id}_voice_victory`,
                    name: '胜利',
                    description: '战斗胜利时的台词',
                    audioPath: `audio/voice/${char.id}/victory`,
                    unlockCondition: { type: 'level', value: 20 }
                },
                {
                    id: `${char.id}_voice_affinity_1`,
                    name: '好感台词1',
                    description: '好感度达到一定程度的台词',
                    audioPath: `audio/voice/${char.id}/affinity_1`,
                    unlockCondition: { type: 'affinity', value: 100 }
                },
                {
                    id: `${char.id}_voice_affinity_2`,
                    name: '好感台词2',
                    description: '好感度达到更高程度的台词',
                    audioPath: `audio/voice/${char.id}/affinity_2`,
                    unlockCondition: { type: 'affinity', value: 300 }
                },
                {
                    id: `${char.id}_voice_affinity_max`,
                    name: '羁绊台词',
                    description: '达到最高好感度的台词',
                    audioPath: `audio/voice/${char.id}/affinity_max`,
                    unlockCondition: { type: 'affinity', value: 1500 }
                },
                {
                    id: `${char.id}_voice_awakening`,
                    name: '觉醒台词',
                    description: '角色觉醒后的台词',
                    audioPath: `audio/voice/${char.id}/awakening`,
                    unlockCondition: { type: 'awakening', value: 1 }
                }
            ];

            this._characterVoices.set(char.id, voices);
        }

        console.log('角色语音配置初始化完成');
    }

    /**
     * 初始化角色故事
     */
    private initCharacterStories(): void {
        const characters = CharacterDatabase.instance.getAllCharacters();

        for (const char of characters) {
            const stories: CharacterStory[] = [
                {
                    id: `${char.id}_story_1`,
                    title: '邂逅',
                    content: `${char.name}与冒险者初次相遇的故事...`,
                    chapter: 1,
                    unlockCondition: { type: 'affinity', value: 100 }
                },
                {
                    id: `${char.id}_story_2`,
                    title: '过去',
                    content: `关于${char.name}过去的故事...`,
                    chapter: 2,
                    unlockCondition: { type: 'affinity', value: 300 }
                },
                {
                    id: `${char.id}_story_3`,
                    title: '信念',
                    content: `${char.name}的信念与追求...`,
                    chapter: 3,
                    unlockCondition: { type: 'affinity', value: 600 }
                },
                {
                    id: `${char.id}_story_4`,
                    title: '羁绊',
                    content: `与${char.name}建立深厚羁绊的故事...`,
                    chapter: 4,
                    unlockCondition: { type: 'affinity', value: 1000 }
                },
                {
                    id: `${char.id}_story_5`,
                    title: '约定',
                    content: `与${char.name}之间永恒的约定...`,
                    chapter: 5,
                    unlockCondition: { type: 'affinity', value: 1500 }
                }
            ];

            this._characterStories.set(char.id, stories);
        }

        console.log('角色故事配置初始化完成');
    }

    /**
     * 添加奖励配置
     */
    private addReward(reward: CollectionReward): void {
        this._rewards.set(reward.id, reward);
    }

    /**
     * 获取或创建图鉴条目
     */
    private getOrCreateEntry(characterId: string): CollectionEntry {
        if (!this._collectionData.has(characterId)) {
            this._collectionData.set(characterId, {
                characterId,
                status: CollectionStatus.UNKNOWN,
                totalObtained: 0,
                currentOwned: 0,
                maxLevel: 0,
                maxStar: 0,
                maxAwakening: 0,
                maxAffinity: 0,
                totalBattles: 0,
                totalKills: 0,
                totalDamageDealt: 0,
                unlockedStories: [],
                unlockedVoices: []
            });
        }
        return this._collectionData.get(characterId)!;
    }

    /**
     * 获取图鉴条目
     */
    public getEntry(characterId: string): CollectionEntry | undefined {
        return this._collectionData.get(characterId);
    }

    /**
     * 获取所有图鉴条目
     */
    public getAllEntries(): CollectionEntry[] {
        return Array.from(this._collectionData.values());
    }

    /**
     * 发现角色
     */
    public discoverCharacter(characterId: string): void {
        const entry = this.getOrCreateEntry(characterId);
        
        if (entry.status === CollectionStatus.UNKNOWN) {
            entry.status = CollectionStatus.DISCOVERED;
            entry.firstDiscoveredTime = Date.now();

            this.events.emit(CharacterCollectionSystem.EVENT_CHARACTER_DISCOVERED, {
                characterId
            });

            this.saveData();
        }
    }

    /**
     * 获得角色
     */
    public obtainCharacter(characterId: string): void {
        const entry = this.getOrCreateEntry(characterId);
        
        const wasNew = entry.status === CollectionStatus.UNKNOWN || 
                       entry.status === CollectionStatus.DISCOVERED;

        if (entry.status !== CollectionStatus.OWNED && entry.status !== CollectionStatus.MASTERED) {
            entry.status = CollectionStatus.OWNED;
        }

        if (!entry.firstObtainedTime) {
            entry.firstObtainedTime = Date.now();
        }

        entry.totalObtained++;
        entry.currentOwned++;

        // 解锁默认语音
        this.unlockDefaultVoices(characterId);

        if (wasNew) {
            this.events.emit(CharacterCollectionSystem.EVENT_CHARACTER_OBTAINED, {
                characterId,
                isNew: true
            });

            // 检查奖励条件
            this.checkRewards();
        }

        this.saveData();
    }

    /**
     * 更新角色记录
     */
    public updateCharacterRecord(
        characterId: string,
        data: {
            level?: number;
            star?: number;
            awakening?: number;
            affinity?: number;
            battles?: number;
            kills?: number;
            damage?: number;
        }
    ): void {
        const entry = this.getOrCreateEntry(characterId);

        if (data.level !== undefined && data.level > entry.maxLevel) {
            entry.maxLevel = data.level;
            this.checkVoiceUnlocks(characterId, 'level', data.level);
        }

        if (data.star !== undefined && data.star > entry.maxStar) {
            entry.maxStar = data.star;
        }

        if (data.awakening !== undefined && data.awakening > entry.maxAwakening) {
            entry.maxAwakening = data.awakening;
            this.checkVoiceUnlocks(characterId, 'awakening', data.awakening);
        }

        if (data.affinity !== undefined && data.affinity > entry.maxAffinity) {
            entry.maxAffinity = data.affinity;
            this.checkVoiceUnlocks(characterId, 'affinity', data.affinity);
            this.checkStoryUnlocks(characterId, data.affinity);
        }

        if (data.battles !== undefined) {
            entry.totalBattles += data.battles;
        }

        if (data.kills !== undefined) {
            entry.totalKills += data.kills;
        }

        if (data.damage !== undefined) {
            entry.totalDamageDealt += data.damage;
        }

        // 检查精通条件
        this.checkMastery(characterId);

        this.saveData();
    }

    /**
     * 检查精通条件
     */
    private checkMastery(characterId: string): void {
        const entry = this._collectionData.get(characterId);
        if (!entry || entry.status === CollectionStatus.MASTERED) return;

        // 精通条件：等级满级、星级满、觉醒满、好感度满
        const isMastered = entry.maxLevel >= 100 &&
                          entry.maxStar >= 6 &&
                          entry.maxAwakening >= 5 &&
                          entry.maxAffinity >= 1500;

        if (isMastered) {
            entry.status = CollectionStatus.MASTERED;

            this.events.emit(CharacterCollectionSystem.EVENT_CHARACTER_MASTERED, {
                characterId
            });

            // 检查奖励
            this.checkRewards();
        }
    }

    /**
     * 解锁默认语音
     */
    private unlockDefaultVoices(characterId: string): void {
        const voices = this._characterVoices.get(characterId);
        if (!voices) return;

        const entry = this.getOrCreateEntry(characterId);

        for (const voice of voices) {
            if (voice.unlockCondition.type === 'default' && 
                !entry.unlockedVoices.includes(voice.id)) {
                entry.unlockedVoices.push(voice.id);
                this.events.emit(CharacterCollectionSystem.EVENT_VOICE_UNLOCKED, {
                    characterId,
                    voiceId: voice.id
                });
            }
        }
    }

    /**
     * 检查语音解锁
     */
    private checkVoiceUnlocks(characterId: string, type: string, value: number): void {
        const voices = this._characterVoices.get(characterId);
        if (!voices) return;

        const entry = this.getOrCreateEntry(characterId);

        for (const voice of voices) {
            if (entry.unlockedVoices.includes(voice.id)) continue;

            if (voice.unlockCondition.type === type && 
                voice.unlockCondition.value !== undefined &&
                value >= voice.unlockCondition.value) {
                entry.unlockedVoices.push(voice.id);
                this.events.emit(CharacterCollectionSystem.EVENT_VOICE_UNLOCKED, {
                    characterId,
                    voiceId: voice.id
                });
            }
        }
    }

    /**
     * 检查故事解锁
     */
    private checkStoryUnlocks(characterId: string, affinity: number): void {
        const stories = this._characterStories.get(characterId);
        if (!stories) return;

        const entry = this.getOrCreateEntry(characterId);

        for (const story of stories) {
            if (entry.unlockedStories.includes(story.id)) continue;

            if (story.unlockCondition.type === 'affinity' &&
                story.unlockCondition.value !== undefined &&
                affinity >= story.unlockCondition.value) {
                entry.unlockedStories.push(story.id);
                this.events.emit(CharacterCollectionSystem.EVENT_STORY_UNLOCKED, {
                    characterId,
                    storyId: story.id
                });
            }
        }
    }

    /**
     * 获取角色语音列表
     */
    public getCharacterVoices(characterId: string): { voice: CharacterVoice; unlocked: boolean }[] {
        const voices = this._characterVoices.get(characterId) || [];
        const entry = this._collectionData.get(characterId);
        const unlockedVoices = entry?.unlockedVoices || [];

        return voices.map(voice => ({
            voice,
            unlocked: unlockedVoices.includes(voice.id)
        }));
    }

    /**
     * 获取角色故事列表
     */
    public getCharacterStories(characterId: string): { story: CharacterStory; unlocked: boolean }[] {
        const stories = this._characterStories.get(characterId) || [];
        const entry = this._collectionData.get(characterId);
        const unlockedStories = entry?.unlockedStories || [];

        return stories.map(story => ({
            story,
            unlocked: unlockedStories.includes(story.id)
        }));
    }

    /**
     * 获取图鉴统计
     */
    public getStatistics(): CollectionStatistics {
        const allCharacters = CharacterDatabase.instance.getAllCharacters();
        
        const stats: CollectionStatistics = {
            totalCharacters: allCharacters.length,
            discoveredCount: 0,
            ownedCount: 0,
            masteredCount: 0,
            byRarity: {},
            byElement: {},
            byClass: {},
            overallProgress: 0,
            claimedRewards: this._claimedRewards.size,
            totalRewards: this._rewards.size
        };

        // 初始化分类统计
        for (const rarity of Object.values(CharacterRarity)) {
            if (typeof rarity === 'number') {
                stats.byRarity[rarity] = { total: 0, owned: 0 };
            }
        }
        for (const element of Object.values(ElementType)) {
            stats.byElement[element] = { total: 0, owned: 0 };
        }
        for (const charClass of Object.values(CharacterClass)) {
            stats.byClass[charClass] = { total: 0, owned: 0 };
        }

        // 统计每个角色
        for (const char of allCharacters) {
            const entry = this._collectionData.get(char.id);

            // 更新总数
            stats.byRarity[char.rarity].total++;
            stats.byElement[char.element].total++;
            stats.byClass[char.characterClass].total++;

            if (entry) {
                if (entry.status !== CollectionStatus.UNKNOWN) {
                    stats.discoveredCount++;
                }
                if (entry.status === CollectionStatus.OWNED || entry.status === CollectionStatus.MASTERED) {
                    stats.ownedCount++;
                    stats.byRarity[char.rarity].owned++;
                    stats.byElement[char.element].owned++;
                    stats.byClass[char.characterClass].owned++;
                }
                if (entry.status === CollectionStatus.MASTERED) {
                    stats.masteredCount++;
                }
            }
        }

        // 计算总体进度
        stats.overallProgress = stats.totalCharacters > 0 
            ? stats.ownedCount / stats.totalCharacters 
            : 0;

        return stats;
    }

    /**
     * 检查奖励条件
     */
    public checkRewards(): void {
        const stats = this.getStatistics();

        for (const [rewardId, reward] of this._rewards) {
            if (this._claimedRewards.has(rewardId)) continue;

            const conditionMet = this.checkCondition(reward.condition, stats);
            reward.claimed = this._claimedRewards.has(rewardId);
        }
    }

    /**
     * 检查单个条件是否满足
     */
    private checkCondition(condition: CollectionCondition, stats: CollectionStatistics): boolean {
        switch (condition.type) {
            case 'count':
                return stats.ownedCount >= (condition.count || 0);

            case 'rarity':
                if (condition.rarity !== undefined && condition.rarityCount !== undefined) {
                    const rarityStats = stats.byRarity[condition.rarity];
                    return rarityStats ? rarityStats.owned >= condition.rarityCount : false;
                }
                return false;

            case 'element':
                if (condition.element && condition.elementCount !== undefined) {
                    const elementStats = stats.byElement[condition.element];
                    return elementStats ? elementStats.owned >= condition.elementCount : false;
                }
                return false;

            case 'class':
                if (condition.charClass && condition.classCount !== undefined) {
                    const classStats = stats.byClass[condition.charClass];
                    return classStats ? classStats.owned >= condition.classCount : false;
                }
                return false;

            case 'mastered':
                return stats.masteredCount >= (condition.masteredCount || 0);

            case 'specific':
                if (condition.characterIds) {
                    return condition.characterIds.every(id => {
                        const entry = this._collectionData.get(id);
                        return entry && (entry.status === CollectionStatus.OWNED || 
                                        entry.status === CollectionStatus.MASTERED);
                    });
                }
                return false;

            default:
                return false;
        }
    }

    /**
     * 获取可领取的奖励列表
     */
    public getClaimableRewards(): CollectionReward[] {
        const stats = this.getStatistics();
        const claimable: CollectionReward[] = [];

        for (const [rewardId, reward] of this._rewards) {
            if (this._claimedRewards.has(rewardId)) continue;

            if (this.checkCondition(reward.condition, stats)) {
                claimable.push(reward);
            }
        }

        return claimable;
    }

    /**
     * 获取所有奖励列表
     */
    public getAllRewards(): { reward: CollectionReward; claimed: boolean; canClaim: boolean }[] {
        const stats = this.getStatistics();
        const result: { reward: CollectionReward; claimed: boolean; canClaim: boolean }[] = [];

        for (const [rewardId, reward] of this._rewards) {
            const claimed = this._claimedRewards.has(rewardId);
            const canClaim = !claimed && this.checkCondition(reward.condition, stats);

            result.push({ reward, claimed, canClaim });
        }

        return result;
    }

    /**
     * 领取奖励
     */
    public claimReward(rewardId: string): boolean {
        if (this._claimedRewards.has(rewardId)) {
            console.log('奖励已领取');
            return false;
        }

        const reward = this._rewards.get(rewardId);
        if (!reward) {
            console.log('奖励不存在');
            return false;
        }

        const stats = this.getStatistics();
        if (!this.checkCondition(reward.condition, stats)) {
            console.log('未达成奖励条件');
            return false;
        }

        // 发放奖励
        for (const item of reward.rewards) {
            this.grantRewardItem(item);
        }

        // 标记已领取
        this._claimedRewards.add(rewardId);

        this.events.emit(CharacterCollectionSystem.EVENT_REWARD_CLAIMED, {
            rewardId,
            rewards: reward.rewards
        });

        this.saveData();
        return true;
    }

    /**
     * 发放奖励物品
     */
    private grantRewardItem(item: CollectionRewardItem): void {
        switch (item.type) {
            case 'currency':
                if (CurrencyManager.instance && item.amount) {
                    if (item.id === 'gold') {
                        CurrencyManager.instance.addGold(item.amount, '图鉴奖励');
                    } else if (item.id === 'diamond') {
                        CurrencyManager.instance.addDiamond(item.amount, '图鉴奖励');
                    }
                }
                break;
            case 'item':
                console.log(`获得物品: ${item.id} x${item.amount}`);
                break;
            case 'character':
                if (CharacterManager.instance) {
                    CharacterManager.instance.addCharacter(item.id);
                }
                break;
            case 'costume':
                console.log(`解锁时装: ${item.id}`);
                break;
        }
    }

    /**
     * 获取角色图鉴详情
     */
    public getCharacterDetail(characterId: string): {
        config: CharacterConfig | undefined;
        entry: CollectionEntry | undefined;
        voices: { voice: CharacterVoice; unlocked: boolean }[];
        stories: { story: CharacterStory; unlocked: boolean }[];
    } {
        return {
            config: CharacterDatabase.instance.getCharacter(characterId),
            entry: this._collectionData.get(characterId),
            voices: this.getCharacterVoices(characterId),
            stories: this.getCharacterStories(characterId)
        };
    }

    /**
     * 按分类获取图鉴列表
     */
    public getCollectionByFilter(filter: {
        rarity?: CharacterRarity;
        element?: ElementType;
        charClass?: CharacterClass;
        status?: CollectionStatus;
    }): { config: CharacterConfig; entry: CollectionEntry | undefined }[] {
        const allCharacters = CharacterDatabase.instance.getAllCharacters();
        const result: { config: CharacterConfig; entry: CollectionEntry | undefined }[] = [];

        for (const config of allCharacters) {
            // 应用筛选
            if (filter.rarity !== undefined && config.rarity !== filter.rarity) continue;
            if (filter.element !== undefined && config.element !== filter.element) continue;
            if (filter.charClass !== undefined && config.characterClass !== filter.charClass) continue;

            const entry = this._collectionData.get(config.id);

            if (filter.status !== undefined) {
                const currentStatus = entry?.status || CollectionStatus.UNKNOWN;
                if (currentStatus !== filter.status) continue;
            }

            result.push({ config, entry });
        }

        return result;
    }

    /**
     * 保存数据
     */
    public saveData(): void {
        const data = {
            collectionData: Array.from(this._collectionData.entries()),
            claimedRewards: Array.from(this._claimedRewards)
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

            if (data.collectionData) {
                this._collectionData = new Map(data.collectionData);
            }
            if (data.claimedRewards) {
                this._claimedRewards = new Set(data.claimedRewards);
            }

            console.log('图鉴数据加载完成');
        } catch (e) {
            console.error('加载图鉴数据失败:', e);
        }
    }

    /**
     * 清除数据
     */
    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._collectionData.clear();
        this._claimedRewards.clear();
    }

    onDestroy() {
        this.saveData();
        if (CharacterCollectionSystem._instance === this) {
            CharacterCollectionSystem._instance = null;
        }
    }
}
