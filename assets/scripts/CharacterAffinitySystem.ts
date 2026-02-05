import { _decorator, Component, sys, EventTarget } from 'cc';
import { CharacterDatabase, CharacterConfig, ElementType, CharacterRarity } from './CharacterData';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 好感度等级枚举
 */
export enum AffinityLevel {
    STRANGER = 0,       // 陌生人
    ACQUAINTANCE = 1,   // 认识
    FRIEND = 2,         // 朋友
    CLOSE_FRIEND = 3,   // 挚友
    SOULMATE = 4,       // 心灵伴侣
    BOND = 5            // 羁绊
}

/**
 * 好感度礼物类型
 */
export enum GiftType {
    COMMON = 'common',              // 普通礼物
    FOOD = 'food',                  // 食物
    ACCESSORY = 'accessory',        // 饰品
    BOOK = 'book',                  // 书籍
    TREASURE = 'treasure',          // 珍宝
    ELEMENT_CRYSTAL = 'crystal'     // 元素结晶
}

/**
 * 礼物配置
 */
export interface GiftConfig {
    id: string;
    name: string;
    description: string;
    type: GiftType;
    baseAffinity: number;           // 基础好感度增加
    rarity: number;                 // 礼物稀有度 1-5
    preferredElements?: ElementType[];  // 喜欢此礼物的元素类型角色
    dislikedElements?: ElementType[];   // 不喜欢此礼物的元素类型角色
    iconPath?: string;
}

/**
 * 好感度等级配置
 */
export interface AffinityLevelConfig {
    level: AffinityLevel;
    name: string;
    requiredAffinity: number;       // 达到此等级所需好感度
    unlockRewards: AffinityReward[];  // 解锁奖励
    statBonus: AffinityStatBonus;   // 属性加成
}

/**
 * 好感度奖励
 */
export interface AffinityReward {
    type: 'currency' | 'item' | 'skill' | 'story' | 'costume';
    id: string;
    amount?: number;
    description: string;
}

/**
 * 好感度属性加成
 */
export interface AffinityStatBonus {
    hpPercent?: number;         // HP加成百分比
    attackPercent?: number;     // 攻击加成百分比
    defensePercent?: number;    // 防御加成百分比
    critRateAdd?: number;       // 暴击率增加
    skillPowerPercent?: number; // 技能威力加成百分比
}

/**
 * 角色好感度数据
 */
export interface CharacterAffinityData {
    characterId: string;
    affinity: number;
    level: AffinityLevel;
    interactionCount: number;       // 互动次数
    lastInteractionTime: number;    // 上次互动时间
    giftsReceived: { [giftId: string]: number };  // 收到的礼物记录
    storiesUnlocked: string[];      // 已解锁的故事
    claimedRewards: string[];       // 已领取的奖励
}

/**
 * 互动类型
 */
export enum InteractionType {
    TOUCH = 'touch',            // 触摸
    TALK = 'talk',              // 对话
    GIFT = 'gift',              // 送礼
    BATTLE_TOGETHER = 'battle', // 一起战斗
    FEED = 'feed'               // 喂食
}

/**
 * 互动结果
 */
export interface InteractionResult {
    success: boolean;
    affinityGain: number;
    newLevel?: AffinityLevel;
    levelUp: boolean;
    rewards?: AffinityReward[];
    dialogue?: string;
}

/**
 * 角色好感度系统
 * Character Affinity System
 */
@ccclass('CharacterAffinitySystem')
export class CharacterAffinitySystem extends Component {
    private static _instance: CharacterAffinitySystem | null = null;

    // 事件目标
    public readonly events: EventTarget = new EventTarget();

    // 事件类型
    public static readonly EVENT_AFFINITY_CHANGED = 'affinity-changed';
    public static readonly EVENT_LEVEL_UP = 'affinity-level-up';
    public static readonly EVENT_STORY_UNLOCKED = 'story-unlocked';
    public static readonly EVENT_REWARD_CLAIMED = 'reward-claimed';

    // 礼物配置
    private _giftDatabase: Map<string, GiftConfig> = new Map();

    // 好感度等级配置
    private _levelConfigs: Map<AffinityLevel, AffinityLevelConfig> = new Map();

    // 角色好感度数据
    private _affinityData: Map<string, CharacterAffinityData> = new Map();

    // 玩家礼物背包
    private _giftInventory: Map<string, number> = new Map();

    // 每日互动限制
    private _dailyInteractionLimit: number = 5;
    private _dailyInteractionCount: Map<string, number> = new Map();
    private _lastDailyReset: number = 0;

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_affinity_data';

    public static get instance(): CharacterAffinitySystem | null {
        return CharacterAffinitySystem._instance;
    }

    onLoad() {
        if (CharacterAffinitySystem._instance) {
            this.node.destroy();
            return;
        }
        CharacterAffinitySystem._instance = this;

        this.initGiftDatabase();
        this.initLevelConfigs();
        this.loadData();
        this.checkDailyReset();
    }

    /**
     * 初始化礼物数据库
     */
    private initGiftDatabase(): void {
        // 普通礼物
        this.addGift({
            id: 'gift_common_001',
            name: '野花',
            description: '路边采摘的野花，虽然普通但充满心意。',
            type: GiftType.COMMON,
            baseAffinity: 10,
            rarity: 1
        });

        this.addGift({
            id: 'gift_common_002',
            name: '精美糖果',
            description: '包装精美的糖果，甜蜜的味道。',
            type: GiftType.FOOD,
            baseAffinity: 15,
            rarity: 1
        });

        // 食物类礼物
        this.addGift({
            id: 'gift_food_001',
            name: '美味蛋糕',
            description: '新鲜出炉的蛋糕，香甜可口。',
            type: GiftType.FOOD,
            baseAffinity: 25,
            rarity: 2
        });

        this.addGift({
            id: 'gift_food_002',
            name: '高级料理',
            description: '名厨精心制作的料理。',
            type: GiftType.FOOD,
            baseAffinity: 50,
            rarity: 3
        });

        this.addGift({
            id: 'gift_food_003',
            name: '龙肉宴',
            description: '传说中的龙肉制成的顶级料理。',
            type: GiftType.FOOD,
            baseAffinity: 100,
            rarity: 5
        });

        // 饰品类礼物
        this.addGift({
            id: 'gift_accessory_001',
            name: '银质发饰',
            description: '精致的银质发饰。',
            type: GiftType.ACCESSORY,
            baseAffinity: 30,
            rarity: 2
        });

        this.addGift({
            id: 'gift_accessory_002',
            name: '宝石项链',
            description: '镶嵌宝石的华丽项链。',
            type: GiftType.ACCESSORY,
            baseAffinity: 60,
            rarity: 3
        });

        this.addGift({
            id: 'gift_accessory_003',
            name: '皇冠',
            description: '象征尊贵的黄金皇冠。',
            type: GiftType.ACCESSORY,
            baseAffinity: 120,
            rarity: 5
        });

        // 书籍类礼物
        this.addGift({
            id: 'gift_book_001',
            name: '冒险故事集',
            description: '收录各种冒险故事的书籍。',
            type: GiftType.BOOK,
            baseAffinity: 20,
            rarity: 2
        });

        this.addGift({
            id: 'gift_book_002',
            name: '魔法典籍',
            description: '记载古老魔法知识的典籍。',
            type: GiftType.BOOK,
            baseAffinity: 45,
            rarity: 3,
            preferredElements: [ElementType.FIRE, ElementType.WATER, ElementType.WIND, ElementType.THUNDER]
        });

        this.addGift({
            id: 'gift_book_003',
            name: '失落的古书',
            description: '记载失落知识的神秘古书。',
            type: GiftType.BOOK,
            baseAffinity: 80,
            rarity: 4
        });

        // 珍宝类礼物
        this.addGift({
            id: 'gift_treasure_001',
            name: '稀有矿石',
            description: '散发微光的稀有矿石。',
            type: GiftType.TREASURE,
            baseAffinity: 35,
            rarity: 3
        });

        this.addGift({
            id: 'gift_treasure_002',
            name: '远古遗物',
            description: '来自远古时代的神秘遗物。',
            type: GiftType.TREASURE,
            baseAffinity: 75,
            rarity: 4
        });

        this.addGift({
            id: 'gift_treasure_003',
            name: '龙之泪',
            description: '传说中龙落下的眼泪结晶。',
            type: GiftType.TREASURE,
            baseAffinity: 150,
            rarity: 5
        });

        // 元素结晶类礼物 - 对应元素角色特别喜欢
        this.addGift({
            id: 'gift_crystal_fire',
            name: '火元素结晶',
            description: '蕴含火焰力量的结晶。',
            type: GiftType.ELEMENT_CRYSTAL,
            baseAffinity: 40,
            rarity: 3,
            preferredElements: [ElementType.FIRE],
            dislikedElements: [ElementType.WATER]
        });

        this.addGift({
            id: 'gift_crystal_water',
            name: '水元素结晶',
            description: '蕴含水之力量的结晶。',
            type: GiftType.ELEMENT_CRYSTAL,
            baseAffinity: 40,
            rarity: 3,
            preferredElements: [ElementType.WATER],
            dislikedElements: [ElementType.FIRE]
        });

        this.addGift({
            id: 'gift_crystal_wind',
            name: '风元素结晶',
            description: '蕴含风之力量的结晶。',
            type: GiftType.ELEMENT_CRYSTAL,
            baseAffinity: 40,
            rarity: 3,
            preferredElements: [ElementType.WIND],
            dislikedElements: [ElementType.THUNDER]
        });

        this.addGift({
            id: 'gift_crystal_thunder',
            name: '雷元素结晶',
            description: '蕴含雷霆力量的结晶。',
            type: GiftType.ELEMENT_CRYSTAL,
            baseAffinity: 40,
            rarity: 3,
            preferredElements: [ElementType.THUNDER],
            dislikedElements: [ElementType.WIND]
        });

        this.addGift({
            id: 'gift_crystal_light',
            name: '光元素结晶',
            description: '蕴含光明力量的结晶。',
            type: GiftType.ELEMENT_CRYSTAL,
            baseAffinity: 40,
            rarity: 3,
            preferredElements: [ElementType.LIGHT],
            dislikedElements: [ElementType.DARK]
        });

        this.addGift({
            id: 'gift_crystal_dark',
            name: '暗元素结晶',
            description: '蕴含黑暗力量的结晶。',
            type: GiftType.ELEMENT_CRYSTAL,
            baseAffinity: 40,
            rarity: 3,
            preferredElements: [ElementType.DARK],
            dislikedElements: [ElementType.LIGHT]
        });

        console.log(`礼物数据库初始化完成，共 ${this._giftDatabase.size} 种礼物`);
    }

    /**
     * 初始化好感度等级配置
     */
    private initLevelConfigs(): void {
        // 陌生人 - 等级0
        this._levelConfigs.set(AffinityLevel.STRANGER, {
            level: AffinityLevel.STRANGER,
            name: '陌生人',
            requiredAffinity: 0,
            unlockRewards: [],
            statBonus: {}
        });

        // 认识 - 等级1
        this._levelConfigs.set(AffinityLevel.ACQUAINTANCE, {
            level: AffinityLevel.ACQUAINTANCE,
            name: '认识',
            requiredAffinity: 100,
            unlockRewards: [
                { type: 'currency', id: 'gold', amount: 1000, description: '金币 x1000' },
                { type: 'story', id: 'story_1', description: '解锁角色故事 第一章' }
            ],
            statBonus: {
                hpPercent: 0.02  // HP +2%
            }
        });

        // 朋友 - 等级2
        this._levelConfigs.set(AffinityLevel.FRIEND, {
            level: AffinityLevel.FRIEND,
            name: '朋友',
            requiredAffinity: 300,
            unlockRewards: [
                { type: 'currency', id: 'gold', amount: 3000, description: '金币 x3000' },
                { type: 'currency', id: 'diamond', amount: 50, description: '钻石 x50' },
                { type: 'story', id: 'story_2', description: '解锁角色故事 第二章' }
            ],
            statBonus: {
                hpPercent: 0.05,        // HP +5%
                attackPercent: 0.02     // 攻击 +2%
            }
        });

        // 挚友 - 等级3
        this._levelConfigs.set(AffinityLevel.CLOSE_FRIEND, {
            level: AffinityLevel.CLOSE_FRIEND,
            name: '挚友',
            requiredAffinity: 600,
            unlockRewards: [
                { type: 'currency', id: 'gold', amount: 5000, description: '金币 x5000' },
                { type: 'currency', id: 'diamond', amount: 100, description: '钻石 x100' },
                { type: 'story', id: 'story_3', description: '解锁角色故事 第三章' },
                { type: 'item', id: 'breakthrough_stone', amount: 5, description: '突破石 x5' }
            ],
            statBonus: {
                hpPercent: 0.08,        // HP +8%
                attackPercent: 0.05,    // 攻击 +5%
                defensePercent: 0.03    // 防御 +3%
            }
        });

        // 心灵伴侣 - 等级4
        this._levelConfigs.set(AffinityLevel.SOULMATE, {
            level: AffinityLevel.SOULMATE,
            name: '心灵伴侣',
            requiredAffinity: 1000,
            unlockRewards: [
                { type: 'currency', id: 'gold', amount: 10000, description: '金币 x10000' },
                { type: 'currency', id: 'diamond', amount: 200, description: '钻石 x200' },
                { type: 'story', id: 'story_4', description: '解锁角色故事 第四章' },
                { type: 'item', id: 'awakening_crystal', amount: 3, description: '觉醒结晶 x3' }
            ],
            statBonus: {
                hpPercent: 0.12,        // HP +12%
                attackPercent: 0.08,    // 攻击 +8%
                defensePercent: 0.05,   // 防御 +5%
                critRateAdd: 0.03       // 暴击率 +3%
            }
        });

        // 羁绊 - 等级5（最高）
        this._levelConfigs.set(AffinityLevel.BOND, {
            level: AffinityLevel.BOND,
            name: '羁绊',
            requiredAffinity: 1500,
            unlockRewards: [
                { type: 'currency', id: 'gold', amount: 20000, description: '金币 x20000' },
                { type: 'currency', id: 'diamond', amount: 500, description: '钻石 x500' },
                { type: 'story', id: 'story_5', description: '解锁角色故事 终章' },
                { type: 'costume', id: 'special_costume', description: '解锁专属时装' },
                { type: 'skill', id: 'bond_skill', description: '解锁羁绊技能' }
            ],
            statBonus: {
                hpPercent: 0.15,        // HP +15%
                attackPercent: 0.12,    // 攻击 +12%
                defensePercent: 0.08,   // 防御 +8%
                critRateAdd: 0.05,      // 暴击率 +5%
                skillPowerPercent: 0.10 // 技能威力 +10%
            }
        });

        console.log('好感度等级配置初始化完成');
    }

    /**
     * 添加礼物配置
     */
    private addGift(config: GiftConfig): void {
        this._giftDatabase.set(config.id, config);
    }

    /**
     * 获取礼物配置
     */
    public getGiftConfig(giftId: string): GiftConfig | undefined {
        return this._giftDatabase.get(giftId);
    }

    /**
     * 获取所有礼物
     */
    public getAllGifts(): GiftConfig[] {
        return Array.from(this._giftDatabase.values());
    }

    /**
     * 获取角色好感度数据
     */
    public getAffinityData(characterId: string): CharacterAffinityData {
        if (!this._affinityData.has(characterId)) {
            // 创建默认数据
            this._affinityData.set(characterId, {
                characterId,
                affinity: 0,
                level: AffinityLevel.STRANGER,
                interactionCount: 0,
                lastInteractionTime: 0,
                giftsReceived: {},
                storiesUnlocked: [],
                claimedRewards: []
            });
        }
        return this._affinityData.get(characterId)!;
    }

    /**
     * 获取好感度等级配置
     */
    public getLevelConfig(level: AffinityLevel): AffinityLevelConfig | undefined {
        return this._levelConfigs.get(level);
    }

    /**
     * 获取所有等级配置
     */
    public getAllLevelConfigs(): AffinityLevelConfig[] {
        return Array.from(this._levelConfigs.values());
    }

    /**
     * 计算礼物好感度增加值
     */
    private calculateGiftAffinity(giftConfig: GiftConfig, characterConfig: CharacterConfig): number {
        let affinity = giftConfig.baseAffinity;

        // 检查元素偏好
        if (giftConfig.preferredElements?.includes(characterConfig.element)) {
            affinity *= 2;  // 喜欢的礼物双倍好感
        } else if (giftConfig.dislikedElements?.includes(characterConfig.element)) {
            affinity *= 0.5; // 不喜欢的礼物减半
        }

        // 稀有度加成（稀有角色对高级礼物反应更好）
        if (characterConfig.rarity >= CharacterRarity.SSR && giftConfig.rarity >= 4) {
            affinity *= 1.2;
        }

        return Math.floor(affinity);
    }

    /**
     * 送礼
     */
    public giveGift(characterId: string, giftId: string): InteractionResult {
        const giftConfig = this._giftDatabase.get(giftId);
        if (!giftConfig) {
            return { success: false, affinityGain: 0, levelUp: false };
        }

        // 检查礼物库存
        const owned = this._giftInventory.get(giftId) || 0;
        if (owned <= 0) {
            console.log('礼物不足');
            return { success: false, affinityGain: 0, levelUp: false };
        }

        const characterConfig = CharacterDatabase.instance.getCharacter(characterId);
        if (!characterConfig) {
            return { success: false, affinityGain: 0, levelUp: false };
        }

        // 扣除礼物
        this._giftInventory.set(giftId, owned - 1);

        // 计算好感度增加
        const affinityGain = this.calculateGiftAffinity(giftConfig, characterConfig);

        // 更新好感度数据
        const data = this.getAffinityData(characterId);
        data.affinity += affinityGain;
        data.interactionCount++;
        data.lastInteractionTime = Date.now();

        // 记录礼物
        data.giftsReceived[giftId] = (data.giftsReceived[giftId] || 0) + 1;

        // 检查升级
        const result = this.checkLevelUp(characterId);

        // 生成对话
        const dialogue = this.generateGiftDialogue(characterConfig, giftConfig, affinityGain);

        // 发送事件
        this.events.emit(CharacterAffinitySystem.EVENT_AFFINITY_CHANGED, {
            characterId,
            affinity: data.affinity,
            gain: affinityGain
        });

        this.saveData();

        return {
            success: true,
            affinityGain,
            newLevel: result.newLevel,
            levelUp: result.levelUp,
            rewards: result.rewards,
            dialogue
        };
    }

    /**
     * 触摸互动
     */
    public touch(characterId: string): InteractionResult {
        this.checkDailyReset();

        // 检查每日互动次数
        const dailyCount = this._dailyInteractionCount.get(characterId) || 0;
        if (dailyCount >= this._dailyInteractionLimit) {
            return {
                success: false,
                affinityGain: 0,
                levelUp: false,
                dialogue: '今天已经互动很多次了，明天再来吧~'
            };
        }

        const characterConfig = CharacterDatabase.instance.getCharacter(characterId);
        if (!characterConfig) {
            return { success: false, affinityGain: 0, levelUp: false };
        }

        // 基础好感度 5 点
        const affinityGain = 5;

        // 更新数据
        const data = this.getAffinityData(characterId);
        data.affinity += affinityGain;
        data.interactionCount++;
        data.lastInteractionTime = Date.now();

        // 更新每日计数
        this._dailyInteractionCount.set(characterId, dailyCount + 1);

        // 检查升级
        const result = this.checkLevelUp(characterId);

        // 生成对话
        const dialogue = this.generateTouchDialogue(characterConfig, data.level);

        this.events.emit(CharacterAffinitySystem.EVENT_AFFINITY_CHANGED, {
            characterId,
            affinity: data.affinity,
            gain: affinityGain
        });

        this.saveData();

        return {
            success: true,
            affinityGain,
            newLevel: result.newLevel,
            levelUp: result.levelUp,
            rewards: result.rewards,
            dialogue
        };
    }

    /**
     * 战斗一起增加好感度
     */
    public battleTogether(characterId: string, won: boolean): InteractionResult {
        const characterConfig = CharacterDatabase.instance.getCharacter(characterId);
        if (!characterConfig) {
            return { success: false, affinityGain: 0, levelUp: false };
        }

        // 战斗胜利 10 点，失败 3 点
        const affinityGain = won ? 10 : 3;

        const data = this.getAffinityData(characterId);
        data.affinity += affinityGain;
        data.interactionCount++;
        data.lastInteractionTime = Date.now();

        const result = this.checkLevelUp(characterId);

        this.events.emit(CharacterAffinitySystem.EVENT_AFFINITY_CHANGED, {
            characterId,
            affinity: data.affinity,
            gain: affinityGain
        });

        this.saveData();

        return {
            success: true,
            affinityGain,
            newLevel: result.newLevel,
            levelUp: result.levelUp,
            rewards: result.rewards
        };
    }

    /**
     * 检查好感度升级
     */
    private checkLevelUp(characterId: string): { levelUp: boolean; newLevel?: AffinityLevel; rewards?: AffinityReward[] } {
        const data = this.getAffinityData(characterId);
        const currentLevel = data.level;

        // 检查是否可以升级
        for (const [level, config] of this._levelConfigs) {
            if (level > currentLevel && data.affinity >= config.requiredAffinity) {
                data.level = level;
                
                // 发送升级事件
                this.events.emit(CharacterAffinitySystem.EVENT_LEVEL_UP, {
                    characterId,
                    oldLevel: currentLevel,
                    newLevel: level
                });

                // 解锁故事
                for (const reward of config.unlockRewards) {
                    if (reward.type === 'story') {
                        data.storiesUnlocked.push(reward.id);
                        this.events.emit(CharacterAffinitySystem.EVENT_STORY_UNLOCKED, {
                            characterId,
                            storyId: reward.id
                        });
                    }
                }

                return {
                    levelUp: true,
                    newLevel: level,
                    rewards: config.unlockRewards
                };
            }
        }

        return { levelUp: false };
    }

    /**
     * 领取好感度奖励
     */
    public claimReward(characterId: string, level: AffinityLevel): boolean {
        const data = this.getAffinityData(characterId);
        
        // 检查等级是否足够
        if (data.level < level) {
            console.log('好感度等级不足');
            return false;
        }

        // 检查是否已领取
        const rewardKey = `${characterId}_${level}`;
        if (data.claimedRewards.includes(rewardKey)) {
            console.log('奖励已领取');
            return false;
        }

        const levelConfig = this._levelConfigs.get(level);
        if (!levelConfig) return false;

        // 发放奖励
        for (const reward of levelConfig.unlockRewards) {
            this.grantReward(reward);
        }

        data.claimedRewards.push(rewardKey);

        this.events.emit(CharacterAffinitySystem.EVENT_REWARD_CLAIMED, {
            characterId,
            level,
            rewards: levelConfig.unlockRewards
        });

        this.saveData();
        return true;
    }

    /**
     * 发放奖励
     */
    private grantReward(reward: AffinityReward): void {
        switch (reward.type) {
            case 'currency':
                if (CurrencyManager.instance && reward.amount) {
                    if (reward.id === 'gold') {
                        CurrencyManager.instance.addGold(reward.amount, '好感度奖励');
                    } else if (reward.id === 'diamond') {
                        CurrencyManager.instance.addDiamond(reward.amount, '好感度奖励');
                    }
                }
                break;
            case 'item':
                // 物品奖励逻辑
                console.log(`获得物品: ${reward.id} x${reward.amount}`);
                break;
            case 'story':
                // 故事已在升级时解锁
                break;
            case 'costume':
                // 时装解锁逻辑
                console.log(`解锁时装: ${reward.id}`);
                break;
            case 'skill':
                // 技能解锁逻辑
                console.log(`解锁技能: ${reward.id}`);
                break;
        }
    }

    /**
     * 获取好感度属性加成
     */
    public getStatBonus(characterId: string): AffinityStatBonus {
        const data = this.getAffinityData(characterId);
        const levelConfig = this._levelConfigs.get(data.level);
        return levelConfig?.statBonus || {};
    }

    /**
     * 获取下一级所需好感度
     */
    public getNextLevelRequirement(characterId: string): number | null {
        const data = this.getAffinityData(characterId);
        const nextLevel = data.level + 1;
        
        if (nextLevel > AffinityLevel.BOND) {
            return null; // 已满级
        }

        const config = this._levelConfigs.get(nextLevel);
        return config ? config.requiredAffinity : null;
    }

    /**
     * 获取升级进度
     */
    public getLevelProgress(characterId: string): { current: number; required: number; percent: number } {
        const data = this.getAffinityData(characterId);
        const currentConfig = this._levelConfigs.get(data.level);
        const nextConfig = this._levelConfigs.get(data.level + 1);

        if (!nextConfig) {
            return { current: data.affinity, required: data.affinity, percent: 1 };
        }

        const currentRequired = currentConfig?.requiredAffinity || 0;
        const nextRequired = nextConfig.requiredAffinity;
        const progress = data.affinity - currentRequired;
        const total = nextRequired - currentRequired;

        return {
            current: progress,
            required: total,
            percent: Math.min(1, progress / total)
        };
    }

    /**
     * 添加礼物到背包
     */
    public addGift(giftId: string, amount: number = 1): boolean {
        const config = this._giftDatabase.get(giftId);
        if (!config) return false;

        const current = this._giftInventory.get(giftId) || 0;
        this._giftInventory.set(giftId, current + amount);

        this.saveData();
        return true;
    }

    /**
     * 获取礼物库存
     */
    public getGiftCount(giftId: string): number {
        return this._giftInventory.get(giftId) || 0;
    }

    /**
     * 获取所有礼物库存
     */
    public getGiftInventory(): Map<string, number> {
        return new Map(this._giftInventory);
    }

    /**
     * 生成送礼对话
     */
    private generateGiftDialogue(character: CharacterConfig, gift: GiftConfig, affinity: number): string {
        const dialogues = {
            high: [
                `哇！${gift.name}！这是我最喜欢的！谢谢你！`,
                `${gift.name}...你怎么知道我喜欢这个的？`,
                `这个${gift.name}太棒了！我会好好珍惜的！`
            ],
            medium: [
                `谢谢你的${gift.name}，我很开心。`,
                `${gift.name}吗？收下了，谢谢。`,
                `嗯，${gift.name}还不错。`
            ],
            low: [
                `这个${gift.name}...算了，谢谢你的心意吧。`,
                `${gift.name}？嗯...也不是不喜欢...`,
                `谢...谢谢？`
            ]
        };

        let pool: string[];
        if (affinity >= gift.baseAffinity * 1.5) {
            pool = dialogues.high;
        } else if (affinity >= gift.baseAffinity * 0.8) {
            pool = dialogues.medium;
        } else {
            pool = dialogues.low;
        }

        return pool[Math.floor(Math.random() * pool.length)];
    }

    /**
     * 生成触摸对话
     */
    private generateTouchDialogue(character: CharacterConfig, level: AffinityLevel): string {
        const dialoguesByLevel: { [key: number]: string[] } = {
            [AffinityLevel.STRANGER]: [
                '你是谁？不要随便碰我。',
                '...你想干什么？',
                '我们很熟吗？'
            ],
            [AffinityLevel.ACQUAINTANCE]: [
                '哦，是你啊。',
                '有什么事吗？',
                '今天天气不错呢。'
            ],
            [AffinityLevel.FRIEND]: [
                '又来找我玩了？',
                '嘿，好久不见！',
                '要一起去冒险吗？'
            ],
            [AffinityLevel.CLOSE_FRIEND]: [
                '见到你真高兴！',
                '有你在真好。',
                '我一直在等你呢。'
            ],
            [AffinityLevel.SOULMATE]: [
                '你来了！我好想你！',
                '和你在一起的时光总是那么美好。',
                '不管发生什么，我都会站在你这边。'
            ],
            [AffinityLevel.BOND]: [
                '能遇见你是我最大的幸运。',
                '我们之间的羁绊是无法打断的。',
                '无论何时何地，我都会守护你。'
            ]
        };

        const dialogues = dialoguesByLevel[level] || dialoguesByLevel[AffinityLevel.STRANGER];
        return dialogues[Math.floor(Math.random() * dialogues.length)];
    }

    /**
     * 检查每日重置
     */
    private checkDailyReset(): void {
        const now = Date.now();
        const today = new Date(now).setHours(0, 0, 0, 0);

        if (this._lastDailyReset < today) {
            this._dailyInteractionCount.clear();
            this._lastDailyReset = today;
            this.saveData();
        }
    }

    /**
     * 保存数据
     */
    public saveData(): void {
        const data = {
            affinityData: Array.from(this._affinityData.entries()),
            giftInventory: Array.from(this._giftInventory.entries()),
            dailyInteractionCount: Array.from(this._dailyInteractionCount.entries()),
            lastDailyReset: this._lastDailyReset
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

            if (data.affinityData) {
                this._affinityData = new Map(data.affinityData);
            }
            if (data.giftInventory) {
                this._giftInventory = new Map(data.giftInventory);
            }
            if (data.dailyInteractionCount) {
                this._dailyInteractionCount = new Map(data.dailyInteractionCount);
            }
            if (data.lastDailyReset) {
                this._lastDailyReset = data.lastDailyReset;
            }

            console.log('好感度数据加载完成');
        } catch (e) {
            console.error('加载好感度数据失败:', e);
        }
    }

    /**
     * 清除数据
     */
    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._affinityData.clear();
        this._giftInventory.clear();
        this._dailyInteractionCount.clear();
        this._lastDailyReset = 0;
    }

    onDestroy() {
        this.saveData();
        if (CharacterAffinitySystem._instance === this) {
            CharacterAffinitySystem._instance = null;
        }
    }
}
