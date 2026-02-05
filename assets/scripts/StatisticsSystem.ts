import { _decorator, Component, sys } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 战斗统计
 */
export interface BattleStatistics {
    totalBattles: number;              // 总战斗次数
    victories: number;                 // 胜利次数
    defeats: number;                   // 失败次数
    totalDamageDealt: number;          // 总造成伤害
    totalDamageTaken: number;          // 总承受伤害
    totalKills: number;                // 总击杀数
    bossKills: number;                 // Boss击杀数
    maxCombo: number;                  // 最高连击
    maxSingleDamage: number;           // 单次最高伤害
    perfectClears: number;             // 完美通关次数
    fastestClearTime: number;          // 最快通关时间(ms)
    totalPlayTime: number;             // 总游戏时间(ms)
}

/**
 * 抽卡统计
 */
export interface GachaStatistics {
    totalPulls: number;                // 总抽卡次数
    urCount: number;                   // UR数量
    ssrCount: number;                  // SSR数量
    srCount: number;                   // SR数量
    rCount: number;                    // R数量
    nCount: number;                    // N数量
    freePoolPulls: number;             // 免费池抽数
    limitedPoolPulls: number;          // 限定池抽数
    diamondsSpent: number;             // 消耗钻石
    ticketsUsed: number;               // 使用抽卡券
}

/**
 * 货币统计
 */
export interface CurrencyStatistics {
    goldEarned: number;                // 获得金币
    goldSpent: number;                 // 花费金币
    diamondEarned: number;             // 获得钻石
    diamondSpent: number;              // 花费钻石
    staminaUsed: number;               // 使用体力
}

/**
 * 角色统计
 */
export interface CharacterStatistics {
    totalCharacters: number;           // 角色总数
    maxLevelCharacters: number;        // 满级角色数
    awakenedCharacters: number;        // 觉醒角色数
    favoriteCharacterId: string;       // 最常用角色
    favoriteCharacterUsage: number;    // 最常用角色使用次数
    characterUsage: { [id: string]: number }; // 角色使用统计
}

/**
 * 成就统计
 */
export interface AchievementStatistics {
    totalAchievements: number;         // 成就总数
    completedAchievements: number;     // 完成成就数
    claimedRewards: number;            // 已领取奖励数
}

/**
 * 登录统计
 */
export interface LoginStatistics {
    totalLoginDays: number;            // 累计登录天数
    maxConsecutiveLogin: number;       // 最长连续登录
    currentConsecutiveLogin: number;   // 当前连续登录
    firstLoginTime: number;            // 首次登录时间
    lastLoginTime: number;             // 最后登录时间
}

/**
 * 全部统计数据
 */
export interface AllStatistics {
    battle: BattleStatistics;
    gacha: GachaStatistics;
    currency: CurrencyStatistics;
    character: CharacterStatistics;
    achievement: AchievementStatistics;
    login: LoginStatistics;
    lastUpdateTime: number;
}

/**
 * 数据统计系统
 * Statistics System - Game data tracking and analytics
 */
@ccclass('StatisticsSystem')
export class StatisticsSystem extends Component {
    private static _instance: StatisticsSystem | null = null;

    // 统计数据
    private _stats: AllStatistics;

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_statistics';

    public static get instance(): StatisticsSystem | null {
        return StatisticsSystem._instance;
    }

    public get stats(): AllStatistics {
        return this._stats;
    }

    constructor() {
        super();
        this._stats = this.createDefaultStats();
    }

    onLoad() {
        if (StatisticsSystem._instance) {
            this.node.destroy();
            return;
        }
        StatisticsSystem._instance = this;

        this.loadData();
        
        // 定期保存
        this.schedule(this.saveData.bind(this), 60);
    }

    /**
     * 创建默认统计数据
     */
    private createDefaultStats(): AllStatistics {
        return {
            battle: {
                totalBattles: 0,
                victories: 0,
                defeats: 0,
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                totalKills: 0,
                bossKills: 0,
                maxCombo: 0,
                maxSingleDamage: 0,
                perfectClears: 0,
                fastestClearTime: 0,
                totalPlayTime: 0
            },
            gacha: {
                totalPulls: 0,
                urCount: 0,
                ssrCount: 0,
                srCount: 0,
                rCount: 0,
                nCount: 0,
                freePoolPulls: 0,
                limitedPoolPulls: 0,
                diamondsSpent: 0,
                ticketsUsed: 0
            },
            currency: {
                goldEarned: 0,
                goldSpent: 0,
                diamondEarned: 0,
                diamondSpent: 0,
                staminaUsed: 0
            },
            character: {
                totalCharacters: 0,
                maxLevelCharacters: 0,
                awakenedCharacters: 0,
                favoriteCharacterId: '',
                favoriteCharacterUsage: 0,
                characterUsage: {}
            },
            achievement: {
                totalAchievements: 0,
                completedAchievements: 0,
                claimedRewards: 0
            },
            login: {
                totalLoginDays: 0,
                maxConsecutiveLogin: 0,
                currentConsecutiveLogin: 0,
                firstLoginTime: 0,
                lastLoginTime: 0
            },
            lastUpdateTime: Date.now()
        };
    }

    // ==================== 战斗统计 ====================

    /**
     * 记录战斗开始
     */
    public recordBattleStart(): void {
        this._stats.battle.totalBattles++;
        this.saveData();
    }

    /**
     * 记录战斗胜利
     */
    public recordVictory(clearTime: number, isPerfect: boolean = false): void {
        this._stats.battle.victories++;
        
        if (isPerfect) {
            this._stats.battle.perfectClears++;
        }
        
        if (this._stats.battle.fastestClearTime === 0 || clearTime < this._stats.battle.fastestClearTime) {
            this._stats.battle.fastestClearTime = clearTime;
        }
        
        this.saveData();
    }

    /**
     * 记录战斗失败
     */
    public recordDefeat(): void {
        this._stats.battle.defeats++;
        this.saveData();
    }

    /**
     * 记录造成伤害
     */
    public recordDamageDealt(damage: number): void {
        this._stats.battle.totalDamageDealt += damage;
        
        if (damage > this._stats.battle.maxSingleDamage) {
            this._stats.battle.maxSingleDamage = damage;
        }
    }

    /**
     * 记录承受伤害
     */
    public recordDamageTaken(damage: number): void {
        this._stats.battle.totalDamageTaken += damage;
    }

    /**
     * 记录击杀
     */
    public recordKill(isBoss: boolean = false): void {
        this._stats.battle.totalKills++;
        if (isBoss) {
            this._stats.battle.bossKills++;
        }
    }

    /**
     * 记录连击
     */
    public recordCombo(combo: number): void {
        if (combo > this._stats.battle.maxCombo) {
            this._stats.battle.maxCombo = combo;
        }
    }

    /**
     * 记录游戏时间
     */
    public recordPlayTime(time: number): void {
        this._stats.battle.totalPlayTime += time;
    }

    // ==================== 抽卡统计 ====================

    /**
     * 记录抽卡
     */
    public recordGachaPull(rarity: string, isLimitedPool: boolean, costDiamond: number, usedTicket: boolean): void {
        this._stats.gacha.totalPulls++;
        
        switch (rarity.toUpperCase()) {
            case 'UR': this._stats.gacha.urCount++; break;
            case 'SSR': this._stats.gacha.ssrCount++; break;
            case 'SR': this._stats.gacha.srCount++; break;
            case 'R': this._stats.gacha.rCount++; break;
            case 'N': this._stats.gacha.nCount++; break;
        }
        
        if (isLimitedPool) {
            this._stats.gacha.limitedPoolPulls++;
        } else {
            this._stats.gacha.freePoolPulls++;
        }
        
        this._stats.gacha.diamondsSpent += costDiamond;
        if (usedTicket) {
            this._stats.gacha.ticketsUsed++;
        }
        
        this.saveData();
    }

    // ==================== 货币统计 ====================

    /**
     * 记录获得金币
     */
    public recordGoldEarned(amount: number): void {
        this._stats.currency.goldEarned += amount;
    }

    /**
     * 记录花费金币
     */
    public recordGoldSpent(amount: number): void {
        this._stats.currency.goldSpent += amount;
    }

    /**
     * 记录获得钻石
     */
    public recordDiamondEarned(amount: number): void {
        this._stats.currency.diamondEarned += amount;
    }

    /**
     * 记录花费钻石
     */
    public recordDiamondSpent(amount: number): void {
        this._stats.currency.diamondSpent += amount;
    }

    /**
     * 记录使用体力
     */
    public recordStaminaUsed(amount: number): void {
        this._stats.currency.staminaUsed += amount;
    }

    // ==================== 角色统计 ====================

    /**
     * 记录角色使用
     */
    public recordCharacterUsage(characterId: string): void {
        if (!this._stats.character.characterUsage[characterId]) {
            this._stats.character.characterUsage[characterId] = 0;
        }
        this._stats.character.characterUsage[characterId]++;
        
        // 更新最常用角色
        const usage = this._stats.character.characterUsage[characterId];
        if (usage > this._stats.character.favoriteCharacterUsage) {
            this._stats.character.favoriteCharacterId = characterId;
            this._stats.character.favoriteCharacterUsage = usage;
        }
    }

    /**
     * 更新角色总数
     */
    public updateCharacterCount(total: number, maxLevel: number, awakened: number): void {
        this._stats.character.totalCharacters = total;
        this._stats.character.maxLevelCharacters = maxLevel;
        this._stats.character.awakenedCharacters = awakened;
        this.saveData();
    }

    // ==================== 成就统计 ====================

    /**
     * 更新成就统计
     */
    public updateAchievementStats(total: number, completed: number, claimed: number): void {
        this._stats.achievement.totalAchievements = total;
        this._stats.achievement.completedAchievements = completed;
        this._stats.achievement.claimedRewards = claimed;
        this.saveData();
    }

    // ==================== 登录统计 ====================

    /**
     * 记录登录
     */
    public recordLogin(consecutiveDays: number): void {
        const now = Date.now();
        
        if (this._stats.login.firstLoginTime === 0) {
            this._stats.login.firstLoginTime = now;
        }
        
        this._stats.login.lastLoginTime = now;
        this._stats.login.totalLoginDays++;
        this._stats.login.currentConsecutiveLogin = consecutiveDays;
        
        if (consecutiveDays > this._stats.login.maxConsecutiveLogin) {
            this._stats.login.maxConsecutiveLogin = consecutiveDays;
        }
        
        this.saveData();
    }

    // ==================== 查询方法 ====================

    /**
     * 获取胜率
     */
    public getWinRate(): number {
        if (this._stats.battle.totalBattles === 0) return 0;
        return this._stats.battle.victories / this._stats.battle.totalBattles;
    }

    /**
     * 获取SSR率
     */
    public getSSRRate(): number {
        if (this._stats.gacha.totalPulls === 0) return 0;
        return (this._stats.gacha.ssrCount + this._stats.gacha.urCount) / this._stats.gacha.totalPulls;
    }

    /**
     * 获取成就完成率
     */
    public getAchievementRate(): number {
        if (this._stats.achievement.totalAchievements === 0) return 0;
        return this._stats.achievement.completedAchievements / this._stats.achievement.totalAchievements;
    }

    /**
     * 获取平均每战伤害
     */
    public getAverageDamagePerBattle(): number {
        if (this._stats.battle.totalBattles === 0) return 0;
        return this._stats.battle.totalDamageDealt / this._stats.battle.totalBattles;
    }

    /**
     * 获取游戏时长（格式化）
     */
    public getPlayTimeFormatted(): string {
        const totalSeconds = Math.floor(this._stats.battle.totalPlayTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        }
        return `${minutes}分钟`;
    }

    /**
     * 获取完整统计摘要
     */
    public getSummary(): object {
        return {
            // 战斗
            totalBattles: this._stats.battle.totalBattles,
            winRate: `${(this.getWinRate() * 100).toFixed(1)}%`,
            totalKills: this._stats.battle.totalKills,
            bossKills: this._stats.battle.bossKills,
            maxCombo: this._stats.battle.maxCombo,
            maxSingleDamage: this._stats.battle.maxSingleDamage,
            playTime: this.getPlayTimeFormatted(),
            
            // 抽卡
            totalPulls: this._stats.gacha.totalPulls,
            ssrRate: `${(this.getSSRRate() * 100).toFixed(2)}%`,
            urCount: this._stats.gacha.urCount,
            ssrCount: this._stats.gacha.ssrCount,
            
            // 角色
            totalCharacters: this._stats.character.totalCharacters,
            favoriteCharacter: this._stats.character.favoriteCharacterId,
            
            // 成就
            achievementRate: `${(this.getAchievementRate() * 100).toFixed(1)}%`,
            
            // 登录
            totalLoginDays: this._stats.login.totalLoginDays,
            maxConsecutiveLogin: this._stats.login.maxConsecutiveLogin
        };
    }

    // ==================== 存档 ====================

    public saveData(): void {
        this._stats.lastUpdateTime = Date.now();
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(this._stats));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this._stats = { ...this.createDefaultStats(), ...data };
            } catch (e) {
                console.error('加载统计数据失败:', e);
            }
        }
    }

    public resetData(): void {
        this._stats = this.createDefaultStats();
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        this.unscheduleAllCallbacks();
        if (StatisticsSystem._instance === this) {
            StatisticsSystem._instance = null;
        }
    }
}
