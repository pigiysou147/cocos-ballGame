import { _decorator, Component, Node, Vec3, director } from 'cc';
import { GameManager } from './GameManager';
import { Enemy, EnemyType } from './Enemy';
import { SceneSetup } from './SceneSetup';
const { ccclass, property } = _decorator;

/**
 * 关卡数据接口
 */
export interface LevelData {
    id: number;
    name: string;
    enemies: EnemySpawnData[];
    bumpers: BumperSpawnData[];
    timeLimit?: number;
    targetScore?: number;
}

/**
 * 敌人生成数据
 */
export interface EnemySpawnData {
    type: EnemyType;
    position: { x: number; y: number };
    hp?: number;
    attack?: number;
}

/**
 * 弹射物生成数据
 */
export interface BumperSpawnData {
    position: { x: number; y: number };
    bounceForce?: number;
}

/**
 * 关卡管理器 - 管理关卡加载和切换
 * Level Manager - Manages level loading and transitions
 */
@ccclass('LevelManager')
export class LevelManager extends Component {
    private static _instance: LevelManager | null = null;

    @property({ tooltip: '当前关卡ID' })
    public currentLevelId: number = 1;

    @property({ tooltip: '总关卡数' })
    public totalLevels: number = 10;

    private _levelDatabase: Map<number, LevelData> = new Map();
    private _isLevelComplete: boolean = false;

    public static get instance(): LevelManager | null {
        return LevelManager._instance;
    }

    onLoad() {
        if (LevelManager._instance) {
            this.node.destroy();
            return;
        }
        LevelManager._instance = this;
        
        // 初始化关卡数据
        this.initLevelDatabase();
    }

    /**
     * 初始化关卡数据库
     */
    private initLevelDatabase(): void {
        // 关卡1 - 入门
        this._levelDatabase.set(1, {
            id: 1,
            name: '初始草原',
            enemies: [
                { type: EnemyType.NORMAL, position: { x: -100, y: 300 } },
                { type: EnemyType.NORMAL, position: { x: 100, y: 300 } },
                { type: EnemyType.NORMAL, position: { x: 0, y: 400 } },
            ],
            bumpers: [
                { position: { x: -150, y: 100 } },
                { position: { x: 150, y: 100 } },
            ],
            targetScore: 500
        });

        // 关卡2 - 增加难度
        this._levelDatabase.set(2, {
            id: 2,
            name: '森林深处',
            enemies: [
                { type: EnemyType.NORMAL, position: { x: -150, y: 250 } },
                { type: EnemyType.NORMAL, position: { x: 150, y: 250 } },
                { type: EnemyType.NORMAL, position: { x: 0, y: 350 } },
                { type: EnemyType.ELITE, position: { x: 0, y: 500 }, hp: 150 },
            ],
            bumpers: [
                { position: { x: -150, y: 100 } },
                { position: { x: 150, y: 100 } },
                { position: { x: 0, y: 200 } },
            ],
            targetScore: 1000
        });

        // 关卡3 - Boss关
        this._levelDatabase.set(3, {
            id: 3,
            name: 'Boss之间',
            enemies: [
                { type: EnemyType.NORMAL, position: { x: -200, y: 200 } },
                { type: EnemyType.NORMAL, position: { x: 200, y: 200 } },
                { type: EnemyType.ELITE, position: { x: -100, y: 350 } },
                { type: EnemyType.ELITE, position: { x: 100, y: 350 } },
                { type: EnemyType.BOSS, position: { x: 0, y: 500 }, hp: 500, attack: 20 },
            ],
            bumpers: [
                { position: { x: -150, y: 100 }, bounceForce: 1200 },
                { position: { x: 150, y: 100 }, bounceForce: 1200 },
            ],
            targetScore: 2000
        });

        // 生成更多关卡
        for (let i = 4; i <= this.totalLevels; i++) {
            this._levelDatabase.set(i, this.generateLevel(i));
        }

        console.log(`关卡数据库初始化完成，共 ${this._levelDatabase.size} 个关卡`);
    }

    /**
     * 程序化生成关卡
     */
    private generateLevel(levelId: number): LevelData {
        const baseEnemyCount = 3 + Math.floor(levelId / 2);
        const eliteCount = Math.floor(levelId / 3);
        const hasBoss = levelId % 5 === 0;

        const enemies: EnemySpawnData[] = [];
        
        // 添加普通敌人
        for (let i = 0; i < baseEnemyCount - eliteCount; i++) {
            enemies.push({
                type: EnemyType.NORMAL,
                position: {
                    x: (Math.random() - 0.5) * 400,
                    y: 200 + Math.random() * 300
                }
            });
        }

        // 添加精英敌人
        for (let i = 0; i < eliteCount; i++) {
            enemies.push({
                type: EnemyType.ELITE,
                position: {
                    x: (Math.random() - 0.5) * 300,
                    y: 350 + Math.random() * 150
                },
                hp: 100 + levelId * 10
            });
        }

        // 添加Boss
        if (hasBoss) {
            enemies.push({
                type: EnemyType.BOSS,
                position: { x: 0, y: 500 },
                hp: 300 + levelId * 50,
                attack: 10 + levelId * 2
            });
        }

        // 添加弹射物
        const bumperCount = 2 + Math.floor(levelId / 4);
        const bumpers: BumperSpawnData[] = [];
        for (let i = 0; i < bumperCount; i++) {
            bumpers.push({
                position: {
                    x: (Math.random() - 0.5) * 300,
                    y: 50 + Math.random() * 200
                },
                bounceForce: 800 + levelId * 20
            });
        }

        return {
            id: levelId,
            name: `关卡 ${levelId}`,
            enemies,
            bumpers,
            targetScore: levelId * 500
        };
    }

    /**
     * 获取关卡数据
     */
    public getLevelData(levelId: number): LevelData | undefined {
        return this._levelDatabase.get(levelId);
    }

    /**
     * 加载关卡
     */
    public loadLevel(levelId: number): boolean {
        const levelData = this._levelDatabase.get(levelId);
        if (!levelData) {
            console.error(`关卡 ${levelId} 不存在`);
            return false;
        }

        this.currentLevelId = levelId;
        this._isLevelComplete = false;
        
        console.log(`加载关卡: ${levelData.name}`);
        
        // 这里应该重新加载场景或重置场景元素
        // 实际实现中需要根据levelData创建敌人和障碍物
        
        return true;
    }

    /**
     * 下一关
     */
    public nextLevel(): boolean {
        if (this.currentLevelId >= this.totalLevels) {
            console.log('恭喜！已通关所有关卡！');
            return false;
        }

        return this.loadLevel(this.currentLevelId + 1);
    }

    /**
     * 重新开始当前关卡
     */
    public restartLevel(): void {
        this.loadLevel(this.currentLevelId);
    }

    /**
     * 标记关卡完成
     */
    public markLevelComplete(): void {
        if (this._isLevelComplete) return;

        this._isLevelComplete = true;
        console.log(`关卡 ${this.currentLevelId} 完成！`);

        // 延迟后进入下一关
        this.scheduleOnce(() => {
            this.nextLevel();
        }, 2);
    }

    /**
     * 检查是否可以进入下一关
     */
    public canProceed(): boolean {
        return this._isLevelComplete && this.currentLevelId < this.totalLevels;
    }

    onDestroy() {
        if (LevelManager._instance === this) {
            LevelManager._instance = null;
        }
    }
}
