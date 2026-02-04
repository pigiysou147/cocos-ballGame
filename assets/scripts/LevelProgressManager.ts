import { _decorator, Component, sys } from 'cc';
import { LevelDatabase, LevelConfig, ChapterConfig, LevelProgress, ChapterProgress, RewardData, RewardType } from './LevelData';
const { ccclass, property } = _decorator;

/**
 * 关卡结算数据
 */
export interface LevelResult {
    levelId: string;
    cleared: boolean;
    score: number;
    time: number;           // 通关时间（秒）
    maxCombo: number;
    damageTaken: number;
    enemiesKilled: number;
    starsEarned: number;
    isFirstClear: boolean;
}

/**
 * 关卡进度管理器
 * Level Progress Manager - Manages player's level progress and rewards
 */
@ccclass('LevelProgressManager')
export class LevelProgressManager extends Component {
    private static _instance: LevelProgressManager | null = null;

    // 关卡进度
    private _levelProgress: Map<string, LevelProgress> = new Map();
    
    // 章节进度
    private _chapterProgress: Map<string, ChapterProgress> = new Map();
    
    // 玩家等级
    private _playerLevel: number = 1;
    
    // 玩家体力
    private _stamina: number = 100;
    private _maxStamina: number = 100;
    private _lastStaminaUpdate: number = Date.now();
    private _staminaRecoveryRate: number = 5 * 60 * 1000; // 5分钟恢复1点

    private readonly SAVE_KEY = 'world_flipper_level_progress';

    public static get instance(): LevelProgressManager | null {
        return LevelProgressManager._instance;
    }

    public get playerLevel(): number {
        return this._playerLevel;
    }

    public get stamina(): number {
        return this._stamina;
    }

    public get maxStamina(): number {
        return this._maxStamina;
    }

    onLoad() {
        if (LevelProgressManager._instance) {
            this.node.destroy();
            return;
        }
        LevelProgressManager._instance = this;
        
        this.loadData();
        this.initializeProgress();
        this.updateStamina();
    }

    update(deltaTime: number) {
        // 定期更新体力
        this.updateStamina();
    }

    /**
     * 初始化进度数据
     */
    private initializeProgress(): void {
        const chapters = LevelDatabase.instance.getAllChapters();
        
        for (const chapter of chapters) {
            // 初始化章节进度
            if (!this._chapterProgress.has(chapter.id)) {
                this._chapterProgress.set(chapter.id, {
                    chapterId: chapter.id,
                    unlocked: chapter.orderIndex === 1, // 第一章默认解锁
                    totalStars: 0,
                    levelsCleared: 0,
                    completionRewardClaimed: false
                });
            }

            // 初始化关卡进度
            for (const levelId of chapter.levelIds) {
                if (!this._levelProgress.has(levelId)) {
                    this._levelProgress.set(levelId, {
                        levelId: levelId,
                        cleared: false,
                        stars: 0,
                        bestScore: 0,
                        bestTime: 0,
                        clearCount: 0,
                        firstClearClaimed: false,
                        starRewardsClaimed: []
                    });
                }
            }
        }

        this.checkChapterUnlocks();
    }

    /**
     * 更新体力
     */
    private updateStamina(): void {
        const now = Date.now();
        const elapsed = now - this._lastStaminaUpdate;
        
        if (this._stamina < this._maxStamina) {
            const recovered = Math.floor(elapsed / this._staminaRecoveryRate);
            if (recovered > 0) {
                this._stamina = Math.min(this._maxStamina, this._stamina + recovered);
                this._lastStaminaUpdate = now - (elapsed % this._staminaRecoveryRate);
                this.saveData();
            }
        } else {
            this._lastStaminaUpdate = now;
        }
    }

    /**
     * 消耗体力
     */
    public consumeStamina(amount: number): boolean {
        if (this._stamina < amount) {
            console.log('体力不足');
            return false;
        }
        
        this._stamina -= amount;
        this.saveData();
        return true;
    }

    /**
     * 恢复体力
     */
    public recoverStamina(amount: number): void {
        this._stamina = Math.min(this._maxStamina, this._stamina + amount);
        this.saveData();
    }

    /**
     * 检查是否可以进入关卡
     */
    public canEnterLevel(levelId: string): { canEnter: boolean; reason?: string } {
        const level = LevelDatabase.instance.getLevel(levelId);
        if (!level) {
            return { canEnter: false, reason: '关卡不存在' };
        }

        // 检查章节是否解锁
        const chapterProgress = this._chapterProgress.get(level.chapterId);
        if (!chapterProgress?.unlocked) {
            return { canEnter: false, reason: '章节未解锁' };
        }

        // 检查前置关卡
        const chapter = LevelDatabase.instance.getChapter(level.chapterId);
        if (chapter) {
            const levelIndex = chapter.levelIds.indexOf(levelId);
            if (levelIndex > 0) {
                const prevLevelId = chapter.levelIds[levelIndex - 1];
                const prevProgress = this._levelProgress.get(prevLevelId);
                if (!prevProgress?.cleared) {
                    return { canEnter: false, reason: '请先通关前一关卡' };
                }
            }
        }

        // 检查等级要求
        if (this._playerLevel < level.levelRequirement) {
            return { canEnter: false, reason: `需要等级 ${level.levelRequirement}` };
        }

        // 检查体力
        if (this._stamina < level.staminaCost) {
            return { canEnter: false, reason: '体力不足' };
        }

        return { canEnter: true };
    }

    /**
     * 开始关卡
     */
    public startLevel(levelId: string): boolean {
        const check = this.canEnterLevel(levelId);
        if (!check.canEnter) {
            console.log(`无法进入关卡: ${check.reason}`);
            return false;
        }

        const level = LevelDatabase.instance.getLevel(levelId);
        if (!level) return false;

        // 消耗体力
        this.consumeStamina(level.staminaCost);
        
        console.log(`开始关卡: ${level.name}`);
        return true;
    }

    /**
     * 完成关卡
     */
    public completeLevel(result: LevelResult): {
        rewards: RewardData[];
        newStars: number;
        levelUp: boolean;
    } {
        const level = LevelDatabase.instance.getLevel(result.levelId);
        if (!level) {
            return { rewards: [], newStars: 0, levelUp: false };
        }

        const progress = this._levelProgress.get(result.levelId);
        if (!progress) {
            return { rewards: [], newStars: 0, levelUp: false };
        }

        const rewards: RewardData[] = [];
        let newStars = 0;
        const isFirstClear = !progress.cleared && result.cleared;

        if (result.cleared) {
            // 更新通关状态
            progress.cleared = true;
            progress.clearCount++;

            // 更新最佳记录
            if (result.score > progress.bestScore) {
                progress.bestScore = result.score;
            }
            if (progress.bestTime === 0 || result.time < progress.bestTime) {
                progress.bestTime = result.time;
            }

            // 计算星星
            newStars = result.starsEarned - progress.stars;
            if (result.starsEarned > progress.stars) {
                progress.stars = result.starsEarned;
            }

            // 普通奖励
            rewards.push(...level.normalRewards.filter(r => Math.random() < r.chance));

            // 首次通关奖励
            if (isFirstClear && !progress.firstClearClaimed) {
                rewards.push(...level.firstClearRewards);
                progress.firstClearClaimed = true;
            }

            // 更新章节进度
            this.updateChapterProgress(level.chapterId);
        }

        this.saveData();

        // 检查升级
        const levelUp = this.checkLevelUp(result.score);

        return { rewards, newStars, levelUp };
    }

    /**
     * 领取星级奖励
     */
    public claimStarReward(levelId: string, starRequired: number): RewardData[] {
        const level = LevelDatabase.instance.getLevel(levelId);
        const progress = this._levelProgress.get(levelId);
        
        if (!level || !progress) return [];

        // 检查是否达到星级
        if (progress.stars < starRequired) {
            console.log('星级不足');
            return [];
        }

        // 检查是否已领取
        if (progress.starRewardsClaimed.includes(starRequired)) {
            console.log('奖励已领取');
            return [];
        }

        // 找到对应的星级奖励
        const starReward = level.starRewards.find(r => r.starRequired === starRequired);
        if (!starReward) return [];

        progress.starRewardsClaimed.push(starRequired);
        this.saveData();

        return starReward.rewards;
    }

    /**
     * 更新章节进度
     */
    private updateChapterProgress(chapterId: string): void {
        const chapter = LevelDatabase.instance.getChapter(chapterId);
        const chapterProgress = this._chapterProgress.get(chapterId);
        
        if (!chapter || !chapterProgress) return;

        let totalStars = 0;
        let levelsCleared = 0;

        for (const levelId of chapter.levelIds) {
            const levelProgress = this._levelProgress.get(levelId);
            if (levelProgress) {
                totalStars += levelProgress.stars;
                if (levelProgress.cleared) {
                    levelsCleared++;
                }
            }
        }

        chapterProgress.totalStars = totalStars;
        chapterProgress.levelsCleared = levelsCleared;

        // 检查章节解锁
        this.checkChapterUnlocks();
    }

    /**
     * 检查章节解锁
     */
    private checkChapterUnlocks(): void {
        const chapters = LevelDatabase.instance.getAllChapters();

        for (const chapter of chapters) {
            const progress = this._chapterProgress.get(chapter.id);
            if (!progress || progress.unlocked) continue;

            const requirement = chapter.unlockRequirement;
            let canUnlock = true;

            // 检查前置章节
            if (requirement.previousChapterId) {
                const prevProgress = this._chapterProgress.get(requirement.previousChapterId);
                if (!prevProgress?.unlocked) {
                    canUnlock = false;
                }
                if (requirement.previousChapterStars && 
                    (prevProgress?.totalStars || 0) < requirement.previousChapterStars) {
                    canUnlock = false;
                }
            }

            // 检查玩家等级
            if (requirement.playerLevel && this._playerLevel < requirement.playerLevel) {
                canUnlock = false;
            }

            if (canUnlock) {
                progress.unlocked = true;
                console.log(`章节解锁: ${chapter.name}`);
            }
        }
    }

    /**
     * 领取章节完成奖励
     */
    public claimChapterReward(chapterId: string): RewardData[] {
        const chapter = LevelDatabase.instance.getChapter(chapterId);
        const progress = this._chapterProgress.get(chapterId);

        if (!chapter || !progress) return [];

        // 检查是否全部通关
        if (progress.levelsCleared < chapter.levelIds.length) {
            console.log('章节未全部通关');
            return [];
        }

        // 检查是否已领取
        if (progress.completionRewardClaimed) {
            console.log('奖励已领取');
            return [];
        }

        progress.completionRewardClaimed = true;
        this.saveData();

        return chapter.completionRewards;
    }

    /**
     * 检查升级
     */
    private checkLevelUp(expGained: number): boolean {
        // 简单的升级逻辑
        const expRequired = this._playerLevel * 1000;
        // 实际实现需要累计经验值
        return false;
    }

    /**
     * 获取关卡进度
     */
    public getLevelProgress(levelId: string): LevelProgress | undefined {
        return this._levelProgress.get(levelId);
    }

    /**
     * 获取章节进度
     */
    public getChapterProgress(chapterId: string): ChapterProgress | undefined {
        return this._chapterProgress.get(chapterId);
    }

    /**
     * 获取所有章节进度
     */
    public getAllChapterProgress(): ChapterProgress[] {
        return Array.from(this._chapterProgress.values());
    }

    /**
     * 获取总星星数
     */
    public getTotalStars(): number {
        let total = 0;
        this._levelProgress.forEach(p => total += p.stars);
        return total;
    }

    /**
     * 获取总通关数
     */
    public getTotalCleared(): number {
        let total = 0;
        this._levelProgress.forEach(p => {
            if (p.cleared) total++;
        });
        return total;
    }

    // ==================== 存档系统 ====================

    public saveData(): void {
        const data = {
            levelProgress: Array.from(this._levelProgress.entries()),
            chapterProgress: Array.from(this._chapterProgress.entries()),
            playerLevel: this._playerLevel,
            stamina: this._stamina,
            lastStaminaUpdate: this._lastStaminaUpdate
        };

        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadData(): void {
        const savedData = sys.localStorage.getItem(this.SAVE_KEY);
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);
            
            if (data.levelProgress) {
                this._levelProgress = new Map(data.levelProgress);
            }
            if (data.chapterProgress) {
                this._chapterProgress = new Map(data.chapterProgress);
            }
            this._playerLevel = data.playerLevel || 1;
            this._stamina = data.stamina || 100;
            this._lastStaminaUpdate = data.lastStaminaUpdate || Date.now();

            console.log('关卡进度加载成功');
        } catch (e) {
            console.error('加载关卡进度失败:', e);
        }
    }

    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._levelProgress.clear();
        this._chapterProgress.clear();
        this._playerLevel = 1;
        this._stamina = 100;
        this.initializeProgress();
    }

    onDestroy() {
        this.saveData();
        if (LevelProgressManager._instance === this) {
            LevelProgressManager._instance = null;
        }
    }
}
