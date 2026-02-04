import { _decorator, sys } from 'cc';
import { EnemyType } from './Enemy';
import { ElementType } from './CharacterData';

/**
 * 关卡难度枚举
 */
export enum LevelDifficulty {
    EASY = 'easy',
    NORMAL = 'normal',
    HARD = 'hard',
    HELL = 'hell'
}

/**
 * 关卡类型枚举
 */
export enum LevelType {
    NORMAL = 'normal',      // 普通关卡
    ELITE = 'elite',        // 精英关卡
    BOSS = 'boss',          // Boss关卡
    EVENT = 'event',        // 活动关卡
    DAILY = 'daily'         // 每日关卡
}

/**
 * 奖励类型枚举
 */
export enum RewardType {
    GOLD = 'gold',
    DIAMOND = 'diamond',
    EXP = 'exp',
    EQUIPMENT = 'equipment',
    CHARACTER = 'character',
    MATERIAL = 'material',
    SKILL_BOOK = 'skill_book'
}

/**
 * 奖励数据接口
 */
export interface RewardData {
    type: RewardType;
    itemId?: string;        // 物品ID（装备、角色、材料等）
    amount: number;
    chance: number;         // 掉落概率 (0-1)
}

/**
 * 敌人波次数据
 */
export interface EnemyWave {
    waveNumber: number;
    enemies: EnemySpawnInfo[];
    spawnDelay: number;     // 波次开始延迟
    clearBonus?: number;    // 清波奖励分数
}

/**
 * 敌人生成信息
 */
export interface EnemySpawnInfo {
    enemyId: string;        // 敌人配置ID
    type: EnemyType;
    position: { x: number; y: number };
    hp?: number;
    attack?: number;
    element?: ElementType;
    isBoss?: boolean;
}

/**
 * 障碍物数据
 */
export interface ObstacleData {
    type: 'bumper' | 'wall' | 'portal' | 'trap';
    position: { x: number; y: number };
    properties?: {
        bounceForce?: number;
        damage?: number;
        targetPosition?: { x: number; y: number };
    };
}

/**
 * 关卡配置接口
 */
export interface LevelConfig {
    id: string;
    chapterId: string;      // 所属章节
    name: string;
    description: string;
    
    // 关卡属性
    type: LevelType;
    difficulty: LevelDifficulty;
    recommendedPower: number;   // 推荐战力
    staminaCost: number;        // 体力消耗
    
    // 限制条件
    levelRequirement: number;   // 等级要求
    elementBonus?: ElementType; // 元素加成
    
    // 关卡目标
    objectives: LevelObjective[];
    
    // 时间限制（秒，0表示无限制）
    timeLimit: number;
    
    // 敌人波次
    waves: EnemyWave[];
    
    // 障碍物配置
    obstacles: ObstacleData[];
    
    // 奖励配置
    firstClearRewards: RewardData[];    // 首次通关奖励
    normalRewards: RewardData[];         // 普通奖励
    starRewards: StarReward[];           // 星级奖励
    
    // 背景和音乐
    backgroundId: string;
    bgmId: string;
}

/**
 * 关卡目标
 */
export interface LevelObjective {
    type: 'clear_all' | 'survive' | 'score' | 'combo' | 'time' | 'no_damage';
    value?: number;
    description: string;
    starReward: number;     // 完成该目标获得的星星数
}

/**
 * 星级奖励
 */
export interface StarReward {
    starRequired: number;
    rewards: RewardData[];
}

/**
 * 章节配置接口
 */
export interface ChapterConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    
    // 章节属性
    orderIndex: number;         // 排序索引
    element?: ElementType;      // 章节元素主题
    
    // 解锁条件
    unlockRequirement: {
        previousChapterId?: string;
        previousChapterStars?: number;
        playerLevel?: number;
    };
    
    // 包含的关卡ID列表
    levelIds: string[];
    
    // 章节奖励（全部通关）
    completionRewards: RewardData[];
}

/**
 * 玩家关卡进度
 */
export interface LevelProgress {
    levelId: string;
    cleared: boolean;
    stars: number;              // 0-3星
    bestScore: number;
    bestTime: number;           // 最佳通关时间
    clearCount: number;         // 通关次数
    firstClearClaimed: boolean; // 首次通关奖励是否已领取
    starRewardsClaimed: number[];// 已领取的星级奖励
}

/**
 * 章节进度
 */
export interface ChapterProgress {
    chapterId: string;
    unlocked: boolean;
    totalStars: number;
    levelsCleared: number;
    completionRewardClaimed: boolean;
}

/**
 * 关卡数据库
 */
export class LevelDatabase {
    private static _instance: LevelDatabase | null = null;
    private _chapters: Map<string, ChapterConfig> = new Map();
    private _levels: Map<string, LevelConfig> = new Map();

    public static get instance(): LevelDatabase {
        if (!LevelDatabase._instance) {
            LevelDatabase._instance = new LevelDatabase();
            LevelDatabase._instance.initDatabase();
        }
        return LevelDatabase._instance;
    }

    /**
     * 初始化数据库
     */
    private initDatabase(): void {
        this.initChapters();
        this.initLevels();
        console.log(`关卡数据库初始化完成，共 ${this._chapters.size} 个章节，${this._levels.size} 个关卡`);
    }

    /**
     * 初始化章节
     */
    private initChapters(): void {
        // 第一章 - 初始草原
        this._chapters.set('chapter_1', {
            id: 'chapter_1',
            name: '初始草原',
            description: '冒险的起点，一片宁静的草原',
            icon: 'textures/chapters/chapter_1',
            orderIndex: 1,
            element: ElementType.WIND,
            unlockRequirement: {},
            levelIds: ['level_1_1', 'level_1_2', 'level_1_3', 'level_1_4', 'level_1_5'],
            completionRewards: [
                { type: RewardType.DIAMOND, amount: 100, chance: 1 },
                { type: RewardType.GOLD, amount: 5000, chance: 1 }
            ]
        });

        // 第二章 - 幽暗森林
        this._chapters.set('chapter_2', {
            id: 'chapter_2',
            name: '幽暗森林',
            description: '危机四伏的神秘森林',
            icon: 'textures/chapters/chapter_2',
            orderIndex: 2,
            element: ElementType.DARK,
            unlockRequirement: {
                previousChapterId: 'chapter_1',
                previousChapterStars: 6
            },
            levelIds: ['level_2_1', 'level_2_2', 'level_2_3', 'level_2_4', 'level_2_5'],
            completionRewards: [
                { type: RewardType.DIAMOND, amount: 150, chance: 1 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_iron_sword', amount: 1, chance: 1 }
            ]
        });

        // 第三章 - 烈焰火山
        this._chapters.set('chapter_3', {
            id: 'chapter_3',
            name: '烈焰火山',
            description: '炽热的火山地带，强大的火属性敌人出没',
            icon: 'textures/chapters/chapter_3',
            orderIndex: 3,
            element: ElementType.FIRE,
            unlockRequirement: {
                previousChapterId: 'chapter_2',
                previousChapterStars: 9,
                playerLevel: 15
            },
            levelIds: ['level_3_1', 'level_3_2', 'level_3_3', 'level_3_4', 'level_3_5'],
            completionRewards: [
                { type: RewardType.DIAMOND, amount: 200, chance: 1 },
                { type: RewardType.CHARACTER, itemId: 'char_fire_002', amount: 1, chance: 0.5 }
            ]
        });

        // 第四章 - 冰封雪原
        this._chapters.set('chapter_4', {
            id: 'chapter_4',
            name: '冰封雪原',
            description: '永冻的雪原，水属性敌人的领地',
            icon: 'textures/chapters/chapter_4',
            orderIndex: 4,
            element: ElementType.WATER,
            unlockRequirement: {
                previousChapterId: 'chapter_3',
                previousChapterStars: 12,
                playerLevel: 25
            },
            levelIds: ['level_4_1', 'level_4_2', 'level_4_3', 'level_4_4', 'level_4_5'],
            completionRewards: [
                { type: RewardType.DIAMOND, amount: 250, chance: 1 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_frost_shield', amount: 1, chance: 0.3 }
            ]
        });

        // 第五章 - 雷鸣峡谷
        this._chapters.set('chapter_5', {
            id: 'chapter_5',
            name: '雷鸣峡谷',
            description: '雷电交加的峡谷，雷属性敌人的巢穴',
            icon: 'textures/chapters/chapter_5',
            orderIndex: 5,
            element: ElementType.THUNDER,
            unlockRequirement: {
                previousChapterId: 'chapter_4',
                previousChapterStars: 15,
                playerLevel: 35
            },
            levelIds: ['level_5_1', 'level_5_2', 'level_5_3', 'level_5_4', 'level_5_5'],
            completionRewards: [
                { type: RewardType.DIAMOND, amount: 300, chance: 1 },
                { type: RewardType.CHARACTER, itemId: 'char_thunder_001', amount: 1, chance: 0.2 }
            ]
        });
    }

    /**
     * 初始化关卡
     */
    private initLevels(): void {
        // ========== 第一章关卡 ==========
        this.addLevel({
            id: 'level_1_1',
            chapterId: 'chapter_1',
            name: '草原入口',
            description: '冒险的第一步',
            type: LevelType.NORMAL,
            difficulty: LevelDifficulty.EASY,
            recommendedPower: 100,
            staminaCost: 5,
            levelRequirement: 1,
            objectives: [
                { type: 'clear_all', description: '消灭所有敌人', starReward: 1 },
                { type: 'time', value: 60, description: '60秒内通关', starReward: 1 },
                { type: 'combo', value: 10, description: '达成10连击', starReward: 1 }
            ],
            timeLimit: 0,
            waves: [
                {
                    waveNumber: 1,
                    spawnDelay: 0,
                    enemies: [
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: 0, y: 300 } },
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: -100, y: 350 } },
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: 100, y: 350 } }
                    ]
                }
            ],
            obstacles: [
                { type: 'bumper', position: { x: -150, y: 100 } },
                { type: 'bumper', position: { x: 150, y: 100 } }
            ],
            firstClearRewards: [
                { type: RewardType.DIAMOND, amount: 30, chance: 1 },
                { type: RewardType.GOLD, amount: 500, chance: 1 }
            ],
            normalRewards: [
                { type: RewardType.GOLD, amount: 100, chance: 1 },
                { type: RewardType.EXP, amount: 50, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_exp_small', amount: 1, chance: 0.5 }
            ],
            starRewards: [
                { starRequired: 1, rewards: [{ type: RewardType.GOLD, amount: 200, chance: 1 }] },
                { starRequired: 2, rewards: [{ type: RewardType.DIAMOND, amount: 10, chance: 1 }] },
                { starRequired: 3, rewards: [{ type: RewardType.MATERIAL, itemId: 'mat_exp_medium', amount: 1, chance: 1 }] }
            ],
            backgroundId: 'bg_grassland',
            bgmId: 'bgm_grassland'
        });

        this.addLevel({
            id: 'level_1_2',
            chapterId: 'chapter_1',
            name: '草原深处',
            description: '史莱姆开始变多了',
            type: LevelType.NORMAL,
            difficulty: LevelDifficulty.EASY,
            recommendedPower: 200,
            staminaCost: 5,
            levelRequirement: 2,
            objectives: [
                { type: 'clear_all', description: '消灭所有敌人', starReward: 1 },
                { type: 'time', value: 90, description: '90秒内通关', starReward: 1 },
                { type: 'score', value: 1000, description: '获得1000分', starReward: 1 }
            ],
            timeLimit: 0,
            waves: [
                {
                    waveNumber: 1,
                    spawnDelay: 0,
                    enemies: [
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: -100, y: 300 } },
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: 100, y: 300 } }
                    ]
                },
                {
                    waveNumber: 2,
                    spawnDelay: 2,
                    enemies: [
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: 0, y: 400 } },
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: -150, y: 350 } },
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: 150, y: 350 } }
                    ],
                    clearBonus: 200
                }
            ],
            obstacles: [
                { type: 'bumper', position: { x: -150, y: 100 } },
                { type: 'bumper', position: { x: 150, y: 100 } },
                { type: 'bumper', position: { x: 0, y: 200 } }
            ],
            firstClearRewards: [
                { type: RewardType.DIAMOND, amount: 30, chance: 1 },
                { type: RewardType.GOLD, amount: 600, chance: 1 }
            ],
            normalRewards: [
                { type: RewardType.GOLD, amount: 120, chance: 1 },
                { type: RewardType.EXP, amount: 60, chance: 1 }
            ],
            starRewards: [
                { starRequired: 1, rewards: [{ type: RewardType.GOLD, amount: 250, chance: 1 }] },
                { starRequired: 2, rewards: [{ type: RewardType.DIAMOND, amount: 10, chance: 1 }] },
                { starRequired: 3, rewards: [{ type: RewardType.EQUIPMENT, itemId: 'equip_starter_sword', amount: 1, chance: 1 }] }
            ],
            backgroundId: 'bg_grassland',
            bgmId: 'bgm_grassland'
        });

        this.addLevel({
            id: 'level_1_3',
            chapterId: 'chapter_1',
            name: '野猪出没',
            description: '遇到了更强的敌人',
            type: LevelType.NORMAL,
            difficulty: LevelDifficulty.NORMAL,
            recommendedPower: 350,
            staminaCost: 6,
            levelRequirement: 3,
            objectives: [
                { type: 'clear_all', description: '消灭所有敌人', starReward: 1 },
                { type: 'no_damage', description: '不受伤害通关', starReward: 1 },
                { type: 'combo', value: 15, description: '达成15连击', starReward: 1 }
            ],
            timeLimit: 120,
            waves: [
                {
                    waveNumber: 1,
                    spawnDelay: 0,
                    enemies: [
                        { enemyId: 'enemy_boar', type: EnemyType.NORMAL, position: { x: 0, y: 350 }, hp: 80 },
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: -150, y: 300 } },
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: 150, y: 300 } }
                    ]
                },
                {
                    waveNumber: 2,
                    spawnDelay: 3,
                    enemies: [
                        { enemyId: 'enemy_boar', type: EnemyType.NORMAL, position: { x: -100, y: 400 }, hp: 80 },
                        { enemyId: 'enemy_boar', type: EnemyType.NORMAL, position: { x: 100, y: 400 }, hp: 80 }
                    ]
                }
            ],
            obstacles: [
                { type: 'bumper', position: { x: -150, y: 100 }, properties: { bounceForce: 900 } },
                { type: 'bumper', position: { x: 150, y: 100 }, properties: { bounceForce: 900 } }
            ],
            firstClearRewards: [
                { type: RewardType.DIAMOND, amount: 30, chance: 1 },
                { type: RewardType.GOLD, amount: 800, chance: 1 }
            ],
            normalRewards: [
                { type: RewardType.GOLD, amount: 150, chance: 1 },
                { type: RewardType.EXP, amount: 80, chance: 1 }
            ],
            starRewards: [
                { starRequired: 1, rewards: [{ type: RewardType.GOLD, amount: 300, chance: 1 }] },
                { starRequired: 2, rewards: [{ type: RewardType.DIAMOND, amount: 15, chance: 1 }] },
                { starRequired: 3, rewards: [{ type: RewardType.MATERIAL, itemId: 'mat_exp_medium', amount: 2, chance: 1 }] }
            ],
            backgroundId: 'bg_grassland',
            bgmId: 'bgm_battle'
        });

        this.addLevel({
            id: 'level_1_4',
            chapterId: 'chapter_1',
            name: '精英猎手',
            description: '精英敌人首次登场',
            type: LevelType.ELITE,
            difficulty: LevelDifficulty.NORMAL,
            recommendedPower: 500,
            staminaCost: 8,
            levelRequirement: 4,
            objectives: [
                { type: 'clear_all', description: '消灭所有敌人', starReward: 1 },
                { type: 'time', value: 90, description: '90秒内通关', starReward: 1 },
                { type: 'score', value: 2000, description: '获得2000分', starReward: 1 }
            ],
            timeLimit: 180,
            waves: [
                {
                    waveNumber: 1,
                    spawnDelay: 0,
                    enemies: [
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: -150, y: 300 } },
                        { enemyId: 'enemy_slime', type: EnemyType.NORMAL, position: { x: 150, y: 300 } },
                        { enemyId: 'enemy_boar', type: EnemyType.NORMAL, position: { x: 0, y: 350 }, hp: 80 }
                    ]
                },
                {
                    waveNumber: 2,
                    spawnDelay: 3,
                    enemies: [
                        { enemyId: 'enemy_elite_wolf', type: EnemyType.ELITE, position: { x: 0, y: 450 }, hp: 200, attack: 15 }
                    ],
                    clearBonus: 500
                }
            ],
            obstacles: [
                { type: 'bumper', position: { x: -150, y: 100 } },
                { type: 'bumper', position: { x: 150, y: 100 } },
                { type: 'bumper', position: { x: 0, y: 200 } }
            ],
            firstClearRewards: [
                { type: RewardType.DIAMOND, amount: 50, chance: 1 },
                { type: RewardType.GOLD, amount: 1000, chance: 1 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_iron_sword', amount: 1, chance: 0.5 }
            ],
            normalRewards: [
                { type: RewardType.GOLD, amount: 200, chance: 1 },
                { type: RewardType.EXP, amount: 100, chance: 1 },
                { type: RewardType.MATERIAL, itemId: 'mat_exp_small', amount: 2, chance: 0.7 }
            ],
            starRewards: [
                { starRequired: 1, rewards: [{ type: RewardType.GOLD, amount: 400, chance: 1 }] },
                { starRequired: 2, rewards: [{ type: RewardType.DIAMOND, amount: 20, chance: 1 }] },
                { starRequired: 3, rewards: [{ type: RewardType.EQUIPMENT, itemId: 'equip_cloth_armor', amount: 1, chance: 1 }] }
            ],
            backgroundId: 'bg_grassland',
            bgmId: 'bgm_elite'
        });

        this.addLevel({
            id: 'level_1_5',
            chapterId: 'chapter_1',
            name: '草原霸主',
            description: '章节Boss - 巨型野猪王',
            type: LevelType.BOSS,
            difficulty: LevelDifficulty.HARD,
            recommendedPower: 800,
            staminaCost: 10,
            levelRequirement: 5,
            objectives: [
                { type: 'clear_all', description: '击败野猪王', starReward: 1 },
                { type: 'time', value: 120, description: '120秒内通关', starReward: 1 },
                { type: 'survive', description: '存活至少2名角色', starReward: 1 }
            ],
            timeLimit: 300,
            waves: [
                {
                    waveNumber: 1,
                    spawnDelay: 0,
                    enemies: [
                        { enemyId: 'enemy_boar', type: EnemyType.NORMAL, position: { x: -200, y: 300 }, hp: 80 },
                        { enemyId: 'enemy_boar', type: EnemyType.NORMAL, position: { x: 200, y: 300 }, hp: 80 }
                    ]
                },
                {
                    waveNumber: 2,
                    spawnDelay: 5,
                    enemies: [
                        { 
                            enemyId: 'boss_boar_king', 
                            type: EnemyType.BOSS, 
                            position: { x: 0, y: 450 }, 
                            hp: 1000, 
                            attack: 30,
                            isBoss: true 
                        }
                    ],
                    clearBonus: 1000
                }
            ],
            obstacles: [
                { type: 'bumper', position: { x: -180, y: 100 }, properties: { bounceForce: 1000 } },
                { type: 'bumper', position: { x: 180, y: 100 }, properties: { bounceForce: 1000 } },
                { type: 'bumper', position: { x: 0, y: 180 }, properties: { bounceForce: 1200 } }
            ],
            firstClearRewards: [
                { type: RewardType.DIAMOND, amount: 100, chance: 1 },
                { type: RewardType.GOLD, amount: 2000, chance: 1 },
                { type: RewardType.CHARACTER, itemId: 'char_starter_001', amount: 1, chance: 1 }
            ],
            normalRewards: [
                { type: RewardType.GOLD, amount: 300, chance: 1 },
                { type: RewardType.EXP, amount: 150, chance: 1 },
                { type: RewardType.EQUIPMENT, itemId: 'equip_iron_sword', amount: 1, chance: 0.2 }
            ],
            starRewards: [
                { starRequired: 1, rewards: [{ type: RewardType.GOLD, amount: 500, chance: 1 }] },
                { starRequired: 2, rewards: [{ type: RewardType.DIAMOND, amount: 30, chance: 1 }] },
                { starRequired: 3, rewards: [{ type: RewardType.EQUIPMENT, itemId: 'equip_steel_sword', amount: 1, chance: 1 }] }
            ],
            backgroundId: 'bg_grassland_boss',
            bgmId: 'bgm_boss'
        });

        // 生成第2-5章的关卡（程序化生成）
        this.generateChapterLevels('chapter_2', 2);
        this.generateChapterLevels('chapter_3', 3);
        this.generateChapterLevels('chapter_4', 4);
        this.generateChapterLevels('chapter_5', 5);
    }

    /**
     * 程序化生成章节关卡
     */
    private generateChapterLevels(chapterId: string, chapterNum: number): void {
        const chapter = this._chapters.get(chapterId);
        if (!chapter) return;

        const basepower = chapterNum * 500;
        const baseCost = 5 + chapterNum;

        for (let i = 1; i <= 5; i++) {
            const levelId = `level_${chapterNum}_${i}`;
            const isElite = i === 4;
            const isBoss = i === 5;

            this.addLevel({
                id: levelId,
                chapterId: chapterId,
                name: this.generateLevelName(chapterNum, i),
                description: this.generateLevelDescription(chapterNum, i),
                type: isBoss ? LevelType.BOSS : (isElite ? LevelType.ELITE : LevelType.NORMAL),
                difficulty: isBoss ? LevelDifficulty.HARD : (isElite ? LevelDifficulty.NORMAL : LevelDifficulty.EASY),
                recommendedPower: basepower + i * 200,
                staminaCost: baseCost + (isBoss ? 5 : (isElite ? 3 : i)),
                levelRequirement: (chapterNum - 1) * 10 + i * 2,
                elementBonus: chapter.element,
                objectives: [
                    { type: 'clear_all', description: '消灭所有敌人', starReward: 1 },
                    { type: 'time', value: 60 + i * 15, description: `${60 + i * 15}秒内通关`, starReward: 1 },
                    { type: 'combo', value: 10 + i * 5, description: `达成${10 + i * 5}连击`, starReward: 1 }
                ],
                timeLimit: isBoss ? 300 : (isElite ? 180 : 120),
                waves: this.generateWaves(chapterNum, i, isBoss, isElite),
                obstacles: this.generateObstacles(i),
                firstClearRewards: [
                    { type: RewardType.DIAMOND, amount: 30 + chapterNum * 10 + (isBoss ? 50 : 0), chance: 1 },
                    { type: RewardType.GOLD, amount: 500 * chapterNum + i * 200, chance: 1 }
                ],
                normalRewards: [
                    { type: RewardType.GOLD, amount: 100 * chapterNum + i * 50, chance: 1 },
                    { type: RewardType.EXP, amount: 50 * chapterNum + i * 20, chance: 1 }
                ],
                starRewards: [
                    { starRequired: 1, rewards: [{ type: RewardType.GOLD, amount: 200 * chapterNum, chance: 1 }] },
                    { starRequired: 2, rewards: [{ type: RewardType.DIAMOND, amount: 10 + chapterNum * 5, chance: 1 }] },
                    { starRequired: 3, rewards: [{ type: RewardType.MATERIAL, itemId: 'mat_exp_medium', amount: chapterNum, chance: 1 }] }
                ],
                backgroundId: `bg_chapter_${chapterNum}`,
                bgmId: isBoss ? 'bgm_boss' : (isElite ? 'bgm_elite' : 'bgm_battle')
            });
        }
    }

    private generateLevelName(chapter: number, level: number): string {
        const names = [
            ['入口', '深处', '遭遇', '精英', '霸主'],
            ['边缘', '迷雾', '陷阱', '猎手', '暗影王'],
            ['山脚', '熔岩', '火海', '炎魔', '火焰领主'],
            ['雪地', '冰窟', '暴风', '冰巨人', '冰霜女王'],
            ['峡口', '雷原', '电涌', '雷兽', '雷神']
        ];
        return names[chapter - 1]?.[level - 1] || `关卡 ${chapter}-${level}`;
    }

    private generateLevelDescription(chapter: number, level: number): string {
        if (level === 5) return '章节Boss战';
        if (level === 4) return '精英敌人出没';
        return '继续前进';
    }

    private generateWaves(chapter: number, level: number, isBoss: boolean, isElite: boolean): EnemyWave[] {
        const waves: EnemyWave[] = [];
        const baseHP = 50 + chapter * 30;
        const baseAtk = 5 + chapter * 3;

        // 第一波：普通敌人
        waves.push({
            waveNumber: 1,
            spawnDelay: 0,
            enemies: Array(2 + level).fill(null).map((_, i) => ({
                enemyId: `enemy_normal_${chapter}`,
                type: EnemyType.NORMAL,
                position: { x: (i - 1) * 100, y: 300 + Math.random() * 100 },
                hp: baseHP
            }))
        });

        // 第二波
        if (level >= 2) {
            waves.push({
                waveNumber: 2,
                spawnDelay: 3,
                enemies: isElite || isBoss ? [
                    {
                        enemyId: isBoss ? `boss_chapter_${chapter}` : `enemy_elite_${chapter}`,
                        type: isBoss ? EnemyType.BOSS : EnemyType.ELITE,
                        position: { x: 0, y: 450 },
                        hp: isBoss ? baseHP * 15 : baseHP * 4,
                        attack: isBoss ? baseAtk * 3 : baseAtk * 2,
                        isBoss: isBoss
                    }
                ] : Array(level).fill(null).map((_, i) => ({
                    enemyId: `enemy_normal_${chapter}`,
                    type: EnemyType.NORMAL,
                    position: { x: (i - 1) * 120, y: 400 },
                    hp: baseHP
                })),
                clearBonus: isBoss ? 1000 : 300
            });
        }

        return waves;
    }

    private generateObstacles(level: number): ObstacleData[] {
        const obstacles: ObstacleData[] = [
            { type: 'bumper', position: { x: -150, y: 100 } },
            { type: 'bumper', position: { x: 150, y: 100 } }
        ];

        if (level >= 3) {
            obstacles.push({ type: 'bumper', position: { x: 0, y: 200 } });
        }

        return obstacles;
    }

    /**
     * 添加关卡
     */
    private addLevel(config: LevelConfig): void {
        this._levels.set(config.id, config);
    }

    // ==================== 公共方法 ====================

    public getChapter(id: string): ChapterConfig | undefined {
        return this._chapters.get(id);
    }

    public getAllChapters(): ChapterConfig[] {
        return Array.from(this._chapters.values()).sort((a, b) => a.orderIndex - b.orderIndex);
    }

    public getLevel(id: string): LevelConfig | undefined {
        return this._levels.get(id);
    }

    public getChapterLevels(chapterId: string): LevelConfig[] {
        const chapter = this._chapters.get(chapterId);
        if (!chapter) return [];
        
        return chapter.levelIds
            .map(id => this._levels.get(id))
            .filter((l): l is LevelConfig => l !== undefined);
    }

    public getLevelsByType(type: LevelType): LevelConfig[] {
        return Array.from(this._levels.values()).filter(l => l.type === type);
    }

    /**
     * 获取难度颜色
     */
    public getDifficultyColor(difficulty: LevelDifficulty): string {
        switch (difficulty) {
            case LevelDifficulty.EASY: return '#55AA55';
            case LevelDifficulty.NORMAL: return '#5555FF';
            case LevelDifficulty.HARD: return '#AA55AA';
            case LevelDifficulty.HELL: return '#FF5555';
            default: return '#FFFFFF';
        }
    }

    /**
     * 获取难度名称
     */
    public getDifficultyName(difficulty: LevelDifficulty): string {
        switch (difficulty) {
            case LevelDifficulty.EASY: return '简单';
            case LevelDifficulty.NORMAL: return '普通';
            case LevelDifficulty.HARD: return '困难';
            case LevelDifficulty.HELL: return '地狱';
            default: return '未知';
        }
    }

    /**
     * 获取关卡类型名称
     */
    public getLevelTypeName(type: LevelType): string {
        switch (type) {
            case LevelType.NORMAL: return '普通';
            case LevelType.ELITE: return '精英';
            case LevelType.BOSS: return 'Boss';
            case LevelType.EVENT: return '活动';
            case LevelType.DAILY: return '每日';
            default: return '未知';
        }
    }
}
