import { _decorator, Component, sys } from 'cc';
import { 
    BossRaidDatabase, 
    BossRaidConfig, 
    BossRaidDifficulty, 
    BossRaidStatus,
    BossRaidRecord,
    BossRaidResult,
    DamageRecord,
    BossPhase,
    BossSkillConfig
} from './BossRaidData';
import { RewardData } from './LevelData';
import { LevelProgressManager } from './LevelProgressManager';
import { CharacterManager } from './CharacterManager';
const { ccclass, property } = _decorator;

/**
 * 领主战战斗状态
 */
export interface BossRaidBattleState {
    bossId: string;
    difficulty: BossRaidDifficulty;
    
    // Boss状态
    currentHP: number;
    maxHP: number;
    currentPhase: number;
    
    // 战斗状态
    battleTime: number;
    totalDamage: number;
    isEnraged: boolean;
    
    // 特殊机制
    shieldHP: number;
    isImmune: boolean;
    immuneTimer: number;
    
    // 玩家状态
    teamHP: number;
    teamMaxHP: number;
    skillEnergy: number;
}

/**
 * 领主战管理器
 * Boss Raid Manager - Manages boss raid battles and progress
 */
@ccclass('BossRaidManager')
export class BossRaidManager extends Component {
    private static _instance: BossRaidManager | null = null;

    // 战斗记录
    private _records: Map<string, BossRaidRecord> = new Map();
    
    // 排行榜数据（本地模拟）
    private _leaderboards: Map<string, DamageRecord[]> = new Map();
    
    // 当前战斗状态
    private _currentBattle: BossRaidBattleState | null = null;
    
    // 今日重置时间
    private _lastResetDate: string = '';
    
    // 挑战券数量
    private _raidTickets: number = 0;

    private readonly SAVE_KEY = 'world_flipper_boss_raid';

    public static get instance(): BossRaidManager | null {
        return BossRaidManager._instance;
    }

    public get currentBattle(): BossRaidBattleState | null {
        return this._currentBattle;
    }

    public get raidTickets(): number {
        return this._raidTickets;
    }

    onLoad() {
        if (BossRaidManager._instance) {
            this.node.destroy();
            return;
        }
        BossRaidManager._instance = this;
        
        this.loadData();
        this.checkDailyReset();
        this.initializeLeaderboards();
    }

    /**
     * 检查每日重置
     */
    private checkDailyReset(): void {
        const today = new Date().toDateString();
        if (this._lastResetDate !== today) {
            this.resetDailyAttempts();
            this._lastResetDate = today;
            this.saveData();
        }
    }

    /**
     * 重置每日挑战次数
     */
    private resetDailyAttempts(): void {
        this._records.forEach(record => {
            record.todayAttempts = 0;
        });
        console.log('领主战每日挑战次数已重置');
    }

    /**
     * 初始化排行榜（模拟数据）
     */
    private initializeLeaderboards(): void {
        const bosses = BossRaidDatabase.instance.getAllBosses();
        
        for (const boss of bosses) {
            for (const diff of boss.difficulties) {
                const key = `${boss.id}_${diff.difficulty}`;
                if (!this._leaderboards.has(key)) {
                    // 生成模拟排行榜数据
                    this._leaderboards.set(key, this.generateMockLeaderboard(boss, diff.difficulty));
                }
            }
        }
    }

    /**
     * 生成模拟排行榜
     */
    private generateMockLeaderboard(boss: BossRaidConfig, difficulty: BossRaidDifficulty): DamageRecord[] {
        const records: DamageRecord[] = [];
        const diffConfig = BossRaidDatabase.instance.getDifficultyConfig(boss.id, difficulty);
        if (!diffConfig) return records;

        const bossStats = BossRaidDatabase.instance.calculateBossStats(boss.id, difficulty);
        if (!bossStats) return records;

        const names = ['勇者', '剑圣', '魔导士', '龙骑士', '圣骑士', '暗影猎手', '元素使', '战神'];
        
        for (let i = 0; i < 20; i++) {
            const baseDamage = bossStats.hp * (0.8 - i * 0.03);
            records.push({
                odId: `npc_${i}`,
                odName: `${names[i % names.length]}${Math.floor(Math.random() * 1000)}`,
                odAvatar: '',
                damage: Math.floor(baseDamage + Math.random() * baseDamage * 0.1),
                time: Math.floor(120 + i * 10 + Math.random() * 30),
                teamPower: Math.floor(50000 + Math.random() * 100000),
                timestamp: Date.now() - i * 3600000
            });
        }

        return records.sort((a, b) => b.damage - a.damage);
    }

    // ==================== 挑战检查 ====================

    /**
     * 检查是否可以挑战
     */
    public canChallenge(bossId: string, difficulty: BossRaidDifficulty): { 
        canChallenge: boolean; 
        reason?: string 
    } {
        const boss = BossRaidDatabase.instance.getBoss(bossId);
        if (!boss) {
            return { canChallenge: false, reason: '领主不存在' };
        }

        const diffConfig = BossRaidDatabase.instance.getDifficultyConfig(bossId, difficulty);
        if (!diffConfig) {
            return { canChallenge: false, reason: '难度配置不存在' };
        }

        // 检查解锁条件
        const unlockCheck = this.checkUnlockRequirement(boss);
        if (!unlockCheck.unlocked) {
            return { canChallenge: false, reason: unlockCheck.reason };
        }

        // 检查每日次数
        const record = this.getOrCreateRecord(bossId, difficulty);
        if (record.todayAttempts >= diffConfig.dailyAttempts) {
            return { canChallenge: false, reason: `今日挑战次数已用完 (${diffConfig.dailyAttempts}次)` };
        }

        // 检查体力
        const stamina = LevelProgressManager.instance?.stamina ?? 0;
        if (stamina < diffConfig.staminaCost) {
            return { canChallenge: false, reason: `体力不足 (需要${diffConfig.staminaCost})` };
        }

        return { canChallenge: true };
    }

    /**
     * 检查解锁条件
     */
    private checkUnlockRequirement(boss: BossRaidConfig): { unlocked: boolean; reason?: string } {
        const req = boss.unlockRequirement;

        // 检查玩家等级
        if (req.playerLevel) {
            const playerLevel = LevelProgressManager.instance?.playerLevel ?? 1;
            if (playerLevel < req.playerLevel) {
                return { unlocked: false, reason: `需要等级 ${req.playerLevel}` };
            }
        }

        // 检查章节通关
        if (req.chapterCleared) {
            const chapterProgress = LevelProgressManager.instance?.getChapterProgress(req.chapterCleared);
            if (!chapterProgress || chapterProgress.levelsCleared < 5) {
                return { unlocked: false, reason: `需要通关章节 ${req.chapterCleared}` };
            }
        }

        // 检查前置Boss
        if (req.previousBossDefeated) {
            const prevRecord = this._records.get(`${req.previousBossDefeated}_${BossRaidDifficulty.NORMAL}`);
            if (!prevRecord || prevRecord.totalKills === 0) {
                const prevBoss = BossRaidDatabase.instance.getBoss(req.previousBossDefeated);
                return { unlocked: false, reason: `需要击败 ${prevBoss?.name ?? '前置领主'}` };
            }
        }

        return { unlocked: true };
    }

    // ==================== 战斗管理 ====================

    /**
     * 开始领主战
     */
    public startBattle(bossId: string, difficulty: BossRaidDifficulty): boolean {
        const check = this.canChallenge(bossId, difficulty);
        if (!check.canChallenge) {
            console.log(`无法开始领主战: ${check.reason}`);
            return false;
        }

        const boss = BossRaidDatabase.instance.getBoss(bossId);
        const diffConfig = BossRaidDatabase.instance.getDifficultyConfig(bossId, difficulty);
        const bossStats = BossRaidDatabase.instance.calculateBossStats(bossId, difficulty);

        if (!boss || !diffConfig || !bossStats) return false;

        // 消耗体力
        LevelProgressManager.instance?.consumeStamina(diffConfig.staminaCost);

        // 更新挑战次数
        const record = this.getOrCreateRecord(bossId, difficulty);
        record.todayAttempts++;
        record.totalAttempts++;
        record.lastAttemptTime = Date.now();

        // 初始化战斗状态
        this._currentBattle = {
            bossId,
            difficulty,
            currentHP: bossStats.hp,
            maxHP: bossStats.hp,
            currentPhase: 1,
            battleTime: 0,
            totalDamage: 0,
            isEnraged: false,
            shieldHP: 0,
            isImmune: false,
            immuneTimer: 0,
            teamHP: 10000,  // 应该从队伍计算
            teamMaxHP: 10000,
            skillEnergy: 0
        };

        this.saveData();
        console.log(`开始领主战: ${boss.name} (${BossRaidDatabase.instance.getDifficultyName(difficulty)})`);
        
        return true;
    }

    /**
     * 更新战斗状态
     */
    public updateBattle(deltaTime: number): void {
        if (!this._currentBattle) return;

        const boss = BossRaidDatabase.instance.getBoss(this._currentBattle.bossId);
        if (!boss) return;

        // 更新战斗时间
        this._currentBattle.battleTime += deltaTime;

        // 检查时间限制
        if (this._currentBattle.battleTime >= boss.timeLimit) {
            this.endBattle(false);
            return;
        }

        // 更新免疫计时器
        if (this._currentBattle.isImmune) {
            this._currentBattle.immuneTimer -= deltaTime;
            if (this._currentBattle.immuneTimer <= 0) {
                this._currentBattle.isImmune = false;
            }
        }

        // 检查阶段转换
        this.checkPhaseTransition();
    }

    /**
     * 对Boss造成伤害
     */
    public dealDamageToBoss(damage: number): number {
        if (!this._currentBattle) return 0;

        // 免疫状态
        if (this._currentBattle.isImmune) {
            console.log('Boss处于无敌状态');
            return 0;
        }

        let actualDamage = damage;

        // 护盾吸收
        if (this._currentBattle.shieldHP > 0) {
            if (damage <= this._currentBattle.shieldHP) {
                this._currentBattle.shieldHP -= damage;
                console.log(`护盾吸收 ${damage} 伤害，剩余护盾: ${this._currentBattle.shieldHP}`);
                return 0;
            } else {
                actualDamage = damage - this._currentBattle.shieldHP;
                this._currentBattle.shieldHP = 0;
                console.log('护盾已破');
            }
        }

        // 扣除HP
        this._currentBattle.currentHP -= actualDamage;
        this._currentBattle.totalDamage += actualDamage;

        // 检查击败
        if (this._currentBattle.currentHP <= 0) {
            this._currentBattle.currentHP = 0;
            this.endBattle(true);
        }

        return actualDamage;
    }

    /**
     * 检查阶段转换
     */
    private checkPhaseTransition(): void {
        if (!this._currentBattle) return;

        const boss = BossRaidDatabase.instance.getBoss(this._currentBattle.bossId);
        if (!boss) return;

        const hpPercent = (this._currentBattle.currentHP / this._currentBattle.maxHP) * 100;

        for (const phase of boss.phases) {
            if (phase.phaseNumber > this._currentBattle.currentPhase && 
                hpPercent <= phase.hpThreshold) {
                this.transitionToPhase(phase);
                break;
            }
        }
    }

    /**
     * 转换到新阶段
     */
    private transitionToPhase(phase: BossPhase): void {
        if (!this._currentBattle) return;

        console.log(`Boss进入阶段 ${phase.phaseNumber}: ${phase.name}`);
        this._currentBattle.currentPhase = phase.phaseNumber;

        // 应用特殊机制
        if (phase.specialMechanic) {
            switch (phase.specialMechanic.type) {
                case 'shield':
                    this._currentBattle.shieldHP = phase.specialMechanic.value;
                    console.log(`Boss获得 ${phase.specialMechanic.value} 护盾`);
                    break;
                case 'immune':
                    this._currentBattle.isImmune = true;
                    this._currentBattle.immuneTimer = phase.specialMechanic.value;
                    console.log(`Boss进入 ${phase.specialMechanic.value} 秒无敌`);
                    break;
                case 'regen':
                    // 回复效果需要在update中处理
                    break;
                case 'reflect':
                    // 反伤效果需要在伤害计算中处理
                    break;
            }
        }
    }

    /**
     * 结束战斗
     */
    public endBattle(victory: boolean): BossRaidResult | null {
        if (!this._currentBattle) return null;

        const boss = BossRaidDatabase.instance.getBoss(this._currentBattle.bossId);
        const diffConfig = BossRaidDatabase.instance.getDifficultyConfig(
            this._currentBattle.bossId, 
            this._currentBattle.difficulty
        );
        
        if (!boss || !diffConfig) return null;

        const record = this.getOrCreateRecord(this._currentBattle.bossId, this._currentBattle.difficulty);
        const isFirstKill = victory && record.totalKills === 0;

        // 更新记录
        if (victory) {
            record.totalKills++;
        }
        record.totalDamage += this._currentBattle.totalDamage;

        // 更新最佳记录
        if (this._currentBattle.totalDamage > record.bestDamage) {
            record.bestDamage = this._currentBattle.totalDamage;
        }
        if (victory && (record.bestTime === 0 || this._currentBattle.battleTime < record.bestTime)) {
            record.bestTime = this._currentBattle.battleTime;
        }

        // 计算奖励
        const rewards: RewardData[] = [];
        if (victory) {
            // 普通奖励
            rewards.push(...diffConfig.normalRewards.filter(r => Math.random() < r.chance));
            
            // 首杀奖励
            if (isFirstKill && !record.firstKillClaimed) {
                rewards.push(...diffConfig.firstKillRewards);
                record.firstKillClaimed = true;
            }
        }

        // 更新排行榜
        const previousRank = this.getPlayerRank(this._currentBattle.bossId, this._currentBattle.difficulty);
        this.updateLeaderboard(this._currentBattle.bossId, this._currentBattle.difficulty, this._currentBattle.totalDamage);
        const newRank = this.getPlayerRank(this._currentBattle.bossId, this._currentBattle.difficulty);

        const result: BossRaidResult = {
            bossId: this._currentBattle.bossId,
            difficulty: this._currentBattle.difficulty,
            victory,
            totalDamage: this._currentBattle.totalDamage,
            battleTime: this._currentBattle.battleTime,
            damageBreakdown: [], // 需要从战斗中收集
            rewards,
            previousRank,
            newRank,
            isFirstKill
        };

        this._currentBattle = null;
        this.saveData();

        console.log(`领主战结束: ${victory ? '胜利' : '失败'}, 伤害: ${result.totalDamage}`);
        return result;
    }

    /**
     * 放弃战斗
     */
    public abandonBattle(): void {
        if (!this._currentBattle) return;
        
        console.log('放弃领主战');
        this._currentBattle = null;
    }

    // ==================== 排行榜管理 ====================

    /**
     * 更新排行榜
     */
    private updateLeaderboard(bossId: string, difficulty: BossRaidDifficulty, damage: number): void {
        const key = `${bossId}_${difficulty}`;
        let leaderboard = this._leaderboards.get(key);
        
        if (!leaderboard) {
            leaderboard = [];
            this._leaderboards.set(key, leaderboard);
        }

        // 添加玩家记录（模拟）
        const playerRecord: DamageRecord = {
            odId: 'player',
            odName: '玩家',
            odAvatar: '',
            damage,
            time: this._currentBattle?.battleTime ?? 0,
            teamPower: CharacterManager.instance?.calculateTeamPower() ?? 0,
            timestamp: Date.now()
        };

        // 移除旧的玩家记录
        const existingIndex = leaderboard.findIndex(r => r.odId === 'player');
        if (existingIndex >= 0) {
            if (leaderboard[existingIndex].damage < damage) {
                leaderboard.splice(existingIndex, 1);
                leaderboard.push(playerRecord);
            }
        } else {
            leaderboard.push(playerRecord);
        }

        // 排序
        leaderboard.sort((a, b) => b.damage - a.damage);

        // 限制数量
        if (leaderboard.length > 100) {
            leaderboard.length = 100;
        }
    }

    /**
     * 获取排行榜
     */
    public getLeaderboard(bossId: string, difficulty: BossRaidDifficulty): DamageRecord[] {
        const key = `${bossId}_${difficulty}`;
        return this._leaderboards.get(key) ?? [];
    }

    /**
     * 获取玩家排名
     */
    public getPlayerRank(bossId: string, difficulty: BossRaidDifficulty): number {
        const leaderboard = this.getLeaderboard(bossId, difficulty);
        const index = leaderboard.findIndex(r => r.odId === 'player');
        return index >= 0 ? index + 1 : 0;
    }

    // ==================== 记录管理 ====================

    /**
     * 获取或创建记录
     */
    private getOrCreateRecord(bossId: string, difficulty: BossRaidDifficulty): BossRaidRecord {
        const key = `${bossId}_${difficulty}`;
        let record = this._records.get(key);

        if (!record) {
            record = {
                bossId,
                difficulty,
                bestDamage: 0,
                bestTime: 0,
                bestRank: 0,
                totalKills: 0,
                totalDamage: 0,
                totalAttempts: 0,
                firstKillClaimed: false,
                lastAttemptTime: 0,
                todayAttempts: 0
            };
            this._records.set(key, record);
        }

        return record;
    }

    /**
     * 获取Boss记录
     */
    public getRecord(bossId: string, difficulty: BossRaidDifficulty): BossRaidRecord | undefined {
        return this._records.get(`${bossId}_${difficulty}`);
    }

    /**
     * 获取今日剩余次数
     */
    public getRemainingAttempts(bossId: string, difficulty: BossRaidDifficulty): number {
        const diffConfig = BossRaidDatabase.instance.getDifficultyConfig(bossId, difficulty);
        const record = this._records.get(`${bossId}_${difficulty}`);
        
        if (!diffConfig) return 0;
        return diffConfig.dailyAttempts - (record?.todayAttempts ?? 0);
    }

    /**
     * 检查是否已首杀
     */
    public hasFirstKill(bossId: string, difficulty: BossRaidDifficulty): boolean {
        const record = this._records.get(`${bossId}_${difficulty}`);
        return record?.totalKills ? record.totalKills > 0 : false;
    }

    /**
     * 获取Boss状态
     */
    public getBossStatus(bossId: string): BossRaidStatus {
        const boss = BossRaidDatabase.instance.getBoss(bossId);
        if (!boss) return BossRaidStatus.EXPIRED;

        const unlockCheck = this.checkUnlockRequirement(boss);
        if (!unlockCheck.unlocked) return BossRaidStatus.EXPIRED;

        if (this._currentBattle?.bossId === bossId) {
            return BossRaidStatus.IN_PROGRESS;
        }

        // 检查是否有任何难度被击败
        for (const diff of boss.difficulties) {
            const record = this._records.get(`${bossId}_${diff.difficulty}`);
            if (record?.totalKills && record.totalKills > 0) {
                return BossRaidStatus.DEFEATED;
            }
        }

        return BossRaidStatus.AVAILABLE;
    }

    /**
     * 使用挑战券
     */
    public useRaidTicket(): boolean {
        if (this._raidTickets <= 0) return false;
        this._raidTickets--;
        this.saveData();
        return true;
    }

    /**
     * 添加挑战券
     */
    public addRaidTickets(amount: number): void {
        this._raidTickets += amount;
        this.saveData();
    }

    // ==================== 存档系统 ====================

    public saveData(): void {
        const data = {
            records: Array.from(this._records.entries()),
            lastResetDate: this._lastResetDate,
            raidTickets: this._raidTickets,
            leaderboards: Array.from(this._leaderboards.entries()).map(([key, records]) => ({
                key,
                records: records.filter(r => r.odId === 'player')  // 只保存玩家记录
            }))
        };

        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadData(): void {
        const savedData = sys.localStorage.getItem(this.SAVE_KEY);
        if (!savedData) return;

        try {
            const data = JSON.parse(savedData);
            
            if (data.records) {
                this._records = new Map(data.records);
            }
            this._lastResetDate = data.lastResetDate || '';
            this._raidTickets = data.raidTickets || 0;

            // 恢复玩家排行榜记录
            if (data.leaderboards) {
                for (const lb of data.leaderboards) {
                    const records = this._leaderboards.get(lb.key) ?? [];
                    for (const playerRecord of lb.records) {
                        const existingIndex = records.findIndex(r => r.odId === 'player');
                        if (existingIndex >= 0) {
                            records[existingIndex] = playerRecord;
                        } else {
                            records.push(playerRecord);
                        }
                    }
                    records.sort((a, b) => b.damage - a.damage);
                    this._leaderboards.set(lb.key, records);
                }
            }

            console.log('领主战数据加载成功');
        } catch (e) {
            console.error('加载领主战数据失败:', e);
        }
    }

    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._records.clear();
        this._leaderboards.clear();
        this._currentBattle = null;
        this._lastResetDate = '';
        this._raidTickets = 0;
        this.initializeLeaderboards();
    }

    onDestroy() {
        this.saveData();
        if (BossRaidManager._instance === this) {
            BossRaidManager._instance = null;
        }
    }
}
