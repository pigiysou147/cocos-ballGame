import { _decorator, Component, Node, Vec2, Vec3, EventTarget, Prefab, instantiate, CircleCollider2D, RigidBody2D, ERigidBody2DType, Contact2DType, Collider2D, IPhysics2DContact, Color } from 'cc';
import { BattleCoreSystem, DamageSystemType } from './BattleCoreSystem';
import { ElementType } from './CharacterData';
import { DamageSystem } from './DamageSystem';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 协力球类型
 */
export enum CoopBallType {
    NORMAL = 'normal',          // 普通协力球
    ELEMENT = 'element',        // 属性协力球
    CHAIN = 'chain',            // 连锁协力球（持续追踪）
    BURST = 'burst',            // 爆发协力球（撞击后爆炸）
    HEAL = 'heal'               // 治疗协力球
}

/**
 * 协力球配置
 */
export interface CoopBallConfig {
    type: CoopBallType;
    element?: ElementType;      // 属性（可选）
    damage: number;             // 基础伤害
    comboBonus: number;         // 每次撞击增加的连击数
    lifetime: number;           // 存在时间（秒）
    speed: number;              // 移动速度
    size: number;               // 大小倍率
    maxBounces: number;         // 最大反弹次数（-1为无限）
    chainCount?: number;        // 连锁次数（CHAIN类型）
    burstRadius?: number;       // 爆炸半径（BURST类型）
    healAmount?: number;        // 治疗量（HEAL类型）
}

/**
 * 协力球实例数据
 */
export interface CoopBallInstance {
    id: string;
    config: CoopBallConfig;
    node: Node | null;
    position: Vec2;
    velocity: Vec2;
    bounceCount: number;
    hitCount: number;
    remainingTime: number;
    isActive: boolean;
    ownerId: string;            // 召唤者角色ID
}

/**
 * 召唤协力球的条件
 */
export interface CoopBallSummonCondition {
    type: 'combo' | 'skill' | 'hit' | 'time' | 'fever';
    threshold: number;          // 触发阈值
    cooldown: number;           // 冷却时间
    config: CoopBallConfig;     // 召唤的协力球配置
}

/**
 * 协力球系统 - 管理协力球的生成、移动和碰撞
 * Cooperative Ball System - Ball generation, movement and collision
 */
@ccclass('CooperativeBallSystem')
export class CooperativeBallSystem extends Component {
    private static _instance: CooperativeBallSystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_BALL_SPAWNED = 'coop-ball-spawned';
    public static readonly EVENT_BALL_HIT = 'coop-ball-hit';
    public static readonly EVENT_BALL_DESTROYED = 'coop-ball-destroyed';
    public static readonly EVENT_BALL_EXPLODED = 'coop-ball-exploded';

    // 活跃的协力球
    private _activeBalls: Map<string, CoopBallInstance> = new Map();

    // 召唤条件列表
    private _summonConditions: CoopBallSummonCondition[] = [];

    // 条件冷却追踪
    private _conditionCooldowns: Map<number, number> = new Map();

    // 默认协力球配置
    private readonly DEFAULT_CONFIGS: Map<CoopBallType, CoopBallConfig> = new Map([
        [CoopBallType.NORMAL, {
            type: CoopBallType.NORMAL,
            damage: 50,
            comboBonus: 1,
            lifetime: 10,
            speed: 300,
            size: 1.0,
            maxBounces: 20
        }],
        [CoopBallType.ELEMENT, {
            type: CoopBallType.ELEMENT,
            damage: 80,
            comboBonus: 2,
            lifetime: 8,
            speed: 350,
            size: 1.2,
            maxBounces: 15
        }],
        [CoopBallType.CHAIN, {
            type: CoopBallType.CHAIN,
            damage: 60,
            comboBonus: 1,
            lifetime: 6,
            speed: 400,
            size: 0.8,
            maxBounces: -1,
            chainCount: 5
        }],
        [CoopBallType.BURST, {
            type: CoopBallType.BURST,
            damage: 150,
            comboBonus: 3,
            lifetime: 5,
            speed: 250,
            size: 1.5,
            maxBounces: 5,
            burstRadius: 150
        }],
        [CoopBallType.HEAL, {
            type: CoopBallType.HEAL,
            damage: 0,
            comboBonus: 1,
            lifetime: 8,
            speed: 200,
            size: 1.0,
            maxBounces: 10,
            healAmount: 100
        }]
    ]);

    // 最大同时存在的协力球数量
    private readonly MAX_BALLS = 10;

    // 统计
    private _stats = {
        totalSpawned: 0,
        totalHits: 0,
        totalDamage: 0,
        totalComboBonus: 0
    };

    public static get instance(): CooperativeBallSystem | null {
        return CooperativeBallSystem._instance;
    }

    public get activeBalls(): CoopBallInstance[] {
        return Array.from(this._activeBalls.values());
    }

    public get stats() {
        return { ...this._stats };
    }

    onLoad() {
        if (CooperativeBallSystem._instance) {
            this.node.destroy();
            return;
        }
        CooperativeBallSystem._instance = this;

        this.initSummonConditions();
        this.registerBattleEvents();
    }

    /**
     * 初始化召唤条件
     */
    private initSummonConditions(): void {
        // 连击触发
        this._summonConditions.push({
            type: 'combo',
            threshold: 10,
            cooldown: 5,
            config: this.DEFAULT_CONFIGS.get(CoopBallType.NORMAL)!
        });

        // 高连击触发属性球
        this._summonConditions.push({
            type: 'combo',
            threshold: 25,
            cooldown: 8,
            config: this.DEFAULT_CONFIGS.get(CoopBallType.ELEMENT)!
        });

        // 击杀触发
        this._summonConditions.push({
            type: 'hit',
            threshold: 5,
            cooldown: 3,
            config: {
                ...this.DEFAULT_CONFIGS.get(CoopBallType.CHAIN)!,
                chainCount: 3
            }
        });

        // Fever模式触发
        this._summonConditions.push({
            type: 'fever',
            threshold: 1,
            cooldown: 0,
            config: this.DEFAULT_CONFIGS.get(CoopBallType.BURST)!
        });
    }

    /**
     * 注册战斗事件
     */
    private registerBattleEvents(): void {
        const battleCore = BattleCoreSystem.instance;
        if (battleCore) {
            // 监听连击变化
            battleCore.events.on(BattleCoreSystem.EVENT_COMBO_CHANGED, this.onComboChanged, this);
            // 监听Fever开始
            battleCore.events.on(BattleCoreSystem.EVENT_FEVER_START, this.onFeverStart, this);
        }
    }

    /**
     * 连击变化回调
     */
    private onComboChanged(data: { count: number }): void {
        this.checkSummonConditions('combo', data.count);
    }

    /**
     * Fever开始回调
     */
    private onFeverStart(): void {
        this.checkSummonConditions('fever', 1);
    }

    /**
     * 检查召唤条件
     */
    private checkSummonConditions(type: string, value: number): void {
        for (let i = 0; i < this._summonConditions.length; i++) {
            const condition = this._summonConditions[i];
            
            if (condition.type !== type) continue;
            if (value < condition.threshold) continue;

            // 检查冷却
            const cooldown = this._conditionCooldowns.get(i) || 0;
            if (cooldown > 0) continue;

            // 满足条件，召唤协力球
            this.spawnBall(condition.config);

            // 设置冷却
            if (condition.cooldown > 0) {
                this._conditionCooldowns.set(i, condition.cooldown);
            }
        }
    }

    update(dt: number) {
        // 更新冷却
        this.updateCooldowns(dt);

        // 更新所有协力球
        this.updateBalls(dt);
    }

    /**
     * 更新冷却时间
     */
    private updateCooldowns(dt: number): void {
        for (const [index, cooldown] of this._conditionCooldowns.entries()) {
            if (cooldown > 0) {
                this._conditionCooldowns.set(index, Math.max(0, cooldown - dt));
            }
        }
    }

    /**
     * 更新所有协力球
     */
    private updateBalls(dt: number): void {
        const toRemove: string[] = [];

        for (const [id, ball] of this._activeBalls) {
            if (!ball.isActive) {
                toRemove.push(id);
                continue;
            }

            // 更新生命周期
            ball.remainingTime -= dt;
            if (ball.remainingTime <= 0) {
                this.destroyBall(id);
                continue;
            }

            // 更新位置
            ball.position.x += ball.velocity.x * dt;
            ball.position.y += ball.velocity.y * dt;

            // 同步节点位置
            if (ball.node) {
                ball.node.setPosition(ball.position.x, ball.position.y, 0);
            }

            // 边界检测（简化处理，实际应与场景边界交互）
            this.checkBoundaryCollision(ball);
        }

        // 移除无效的球
        for (const id of toRemove) {
            this._activeBalls.delete(id);
        }
    }

    /**
     * 边界碰撞检测
     */
    private checkBoundaryCollision(ball: CoopBallInstance): void {
        const bounds = { left: -400, right: 400, top: 600, bottom: -200 };
        const radius = 20 * ball.config.size;

        let bounced = false;

        // 左右边界
        if (ball.position.x - radius < bounds.left) {
            ball.position.x = bounds.left + radius;
            ball.velocity.x = Math.abs(ball.velocity.x);
            bounced = true;
        } else if (ball.position.x + radius > bounds.right) {
            ball.position.x = bounds.right - radius;
            ball.velocity.x = -Math.abs(ball.velocity.x);
            bounced = true;
        }

        // 上下边界
        if (ball.position.y + radius > bounds.top) {
            ball.position.y = bounds.top - radius;
            ball.velocity.y = -Math.abs(ball.velocity.y);
            bounced = true;
        } else if (ball.position.y - radius < bounds.bottom) {
            ball.position.y = bounds.bottom + radius;
            ball.velocity.y = Math.abs(ball.velocity.y);
            bounced = true;
        }

        if (bounced) {
            ball.bounceCount++;

            // 检查最大反弹次数
            if (ball.config.maxBounces >= 0 && ball.bounceCount >= ball.config.maxBounces) {
                this.destroyBall(ball.id);
            }
        }
    }

    // ==================== 协力球管理 ====================

    /**
     * 召唤协力球
     */
    public spawnBall(config: Partial<CoopBallConfig> = {}, position?: Vec2, direction?: Vec2): CoopBallInstance | null {
        // 检查数量限制
        if (this._activeBalls.size >= this.MAX_BALLS) {
            console.log('协力球数量已达上限');
            return null;
        }

        // 合并配置
        const baseConfig = this.DEFAULT_CONFIGS.get(config.type || CoopBallType.NORMAL)!;
        const finalConfig: CoopBallConfig = { ...baseConfig, ...config };

        // 生成ID
        const id = `coop_ball_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 默认位置（屏幕中央偏上）
        const spawnPos = position || new Vec2(0, 300);

        // 默认方向（随机向下）
        const angle = direction ? Math.atan2(direction.y, direction.x) : 
                     -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
        const velocity = new Vec2(
            Math.cos(angle) * finalConfig.speed,
            Math.sin(angle) * finalConfig.speed
        );

        // 创建实例
        const instance: CoopBallInstance = {
            id,
            config: finalConfig,
            node: null,
            position: spawnPos.clone(),
            velocity,
            bounceCount: 0,
            hitCount: 0,
            remainingTime: finalConfig.lifetime,
            isActive: true,
            ownerId: ''
        };

        // 创建视觉节点（简化版）
        instance.node = this.createBallNode(finalConfig);
        if (instance.node) {
            instance.node.setPosition(spawnPos.x, spawnPos.y, 0);
            this.node.addChild(instance.node);
        }

        // 添加到活跃列表
        this._activeBalls.set(id, instance);
        this._stats.totalSpawned++;

        // 发送事件
        this.events.emit(CooperativeBallSystem.EVENT_BALL_SPAWNED, { ball: instance });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.BALL_SPAWN);

        console.log(`召唤协力球: ${finalConfig.type}, 存在时间: ${finalConfig.lifetime}s`);
        return instance;
    }

    /**
     * 创建协力球节点
     */
    private createBallNode(config: CoopBallConfig): Node {
        const node = new Node('CoopBall');
        
        // 添加可视化组件（使用Graphics绘制）
        const { Graphics } = require('cc');
        const graphics = node.addComponent(Graphics);
        
        const radius = 20 * config.size;
        const color = this.getBallColor(config);
        
        // 绘制协力球
        graphics.fillColor = color;
        graphics.circle(0, 0, radius);
        graphics.fill();
        
        // 内圈
        graphics.fillColor = new Color(255, 255, 255, 150);
        graphics.circle(0, 0, radius * 0.6);
        graphics.fill();
        
        // 高光
        graphics.fillColor = new Color(255, 255, 255, 200);
        graphics.circle(-radius * 0.3, radius * 0.3, radius * 0.2);
        graphics.fill();

        return node;
    }

    /**
     * 获取协力球颜色
     */
    private getBallColor(config: CoopBallConfig): Color {
        if (config.element) {
            switch (config.element) {
                case ElementType.FIRE: return new Color(255, 80, 50, 230);
                case ElementType.WATER: return new Color(50, 150, 255, 230);
                case ElementType.WIND: return new Color(80, 220, 80, 230);
                case ElementType.THUNDER: return new Color(255, 220, 50, 230);
                case ElementType.LIGHT: return new Color(255, 240, 200, 230);
                case ElementType.DARK: return new Color(120, 50, 150, 230);
            }
        }

        switch (config.type) {
            case CoopBallType.NORMAL: return new Color(200, 200, 220, 230);
            case CoopBallType.CHAIN: return new Color(150, 100, 255, 230);
            case CoopBallType.BURST: return new Color(255, 100, 50, 230);
            case CoopBallType.HEAL: return new Color(100, 255, 150, 230);
            default: return new Color(200, 200, 200, 230);
        }
    }

    /**
     * 协力球命中目标
     */
    public onBallHitTarget(ballId: string, targetNode: Node, targetId: string): void {
        const ball = this._activeBalls.get(ballId);
        if (!ball || !ball.isActive) return;

        ball.hitCount++;
        this._stats.totalHits++;

        // 增加连击
        BattleCoreSystem.instance?.addCombo(ball.config.comboBonus);
        this._stats.totalComboBonus += ball.config.comboBonus;

        // 计算伤害
        if (ball.config.damage > 0) {
            const damage = this.calculateBallDamage(ball);
            this._stats.totalDamage += damage;

            // 应用伤害
            DamageSystem.instance?.showDamage(
                targetNode.getWorldPosition(),
                Math.floor(damage),
                false,
                ball.config.element || ElementType.NEUTRAL
            );
        }

        // 治疗效果
        if (ball.config.type === CoopBallType.HEAL && ball.config.healAmount) {
            // TODO: 应用治疗到队伍
            console.log(`协力球治疗: ${ball.config.healAmount}`);
        }

        // 发送事件
        this.events.emit(CooperativeBallSystem.EVENT_BALL_HIT, {
            ball,
            targetId,
            hitCount: ball.hitCount
        });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.BALL_HIT);

        // 爆发球检查
        if (ball.config.type === CoopBallType.BURST) {
            this.triggerBurstExplosion(ball);
        }

        // 连锁球检查
        if (ball.config.type === CoopBallType.CHAIN && ball.config.chainCount) {
            if (ball.hitCount >= ball.config.chainCount) {
                this.destroyBall(ballId);
            }
        }
    }

    /**
     * 计算协力球伤害
     */
    private calculateBallDamage(ball: CoopBallInstance): number {
        let damage = ball.config.damage;

        // 命中次数加成（每次命中+5%）
        damage *= (1 + ball.hitCount * 0.05);

        // Fever加成
        if (BattleCoreSystem.instance?.isFeverActive()) {
            damage *= 1.5;
        }

        // 通过战斗核心计算最终伤害
        const finalDamage = BattleCoreSystem.instance?.calculateFinalDamage(
            damage,
            DamageSystemType.DIRECT_HIT,
            false
        ) || damage;

        return finalDamage;
    }

    /**
     * 触发爆发爆炸
     */
    private triggerBurstExplosion(ball: CoopBallInstance): void {
        const radius = ball.config.burstRadius || 150;
        const damage = ball.config.damage * 2;

        console.log(`协力球爆炸！半径: ${radius}, 伤害: ${damage}`);

        // 发送爆炸事件
        this.events.emit(CooperativeBallSystem.EVENT_BALL_EXPLODED, {
            ball,
            position: ball.position.clone(),
            radius,
            damage
        });

        // 销毁协力球
        this.destroyBall(ball.id);

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.EXPLOSION);
    }

    /**
     * 销毁协力球
     */
    public destroyBall(ballId: string): void {
        const ball = this._activeBalls.get(ballId);
        if (!ball) return;

        ball.isActive = false;

        // 移除节点
        if (ball.node) {
            ball.node.destroy();
            ball.node = null;
        }

        // 从列表移除
        this._activeBalls.delete(ballId);

        // 发送事件
        this.events.emit(CooperativeBallSystem.EVENT_BALL_DESTROYED, { ballId, ball });

        console.log(`协力球销毁: ${ballId}, 命中次数: ${ball.hitCount}`);
    }

    /**
     * 销毁所有协力球
     */
    public destroyAllBalls(): void {
        for (const id of this._activeBalls.keys()) {
            this.destroyBall(id);
        }
    }

    // ==================== 特殊召唤 ====================

    /**
     * 技能召唤协力球
     */
    public spawnFromSkill(characterId: string, skillElement: ElementType, count: number = 1): void {
        for (let i = 0; i < count; i++) {
            const offset = new Vec2((i - (count - 1) / 2) * 50, 0);
            this.spawnBall({
                type: CoopBallType.ELEMENT,
                element: skillElement,
                damage: 80,
                comboBonus: 2
            }, new Vec2(offset.x, 300));
        }
    }

    /**
     * 面包人技能 - 召唤多个协力球
     */
    public spawnBreadManBalls(position: Vec2, count: number = 3): void {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI / (count + 1)) * (i + 1) - Math.PI / 2;
            const direction = new Vec2(Math.cos(angle), Math.sin(angle));
            
            this.spawnBall({
                type: CoopBallType.NORMAL,
                damage: 40,
                comboBonus: 1,
                lifetime: 8,
                speed: 250
            }, position.clone(), direction);
        }
    }

    // ==================== 查询 ====================

    /**
     * 获取活跃协力球数量
     */
    public getActiveBallCount(): number {
        return this._activeBalls.size;
    }

    /**
     * 获取指定类型的协力球
     */
    public getBallsByType(type: CoopBallType): CoopBallInstance[] {
        return Array.from(this._activeBalls.values()).filter(b => b.config.type === type);
    }

    /**
     * 重置统计
     */
    public resetStats(): void {
        this._stats = {
            totalSpawned: 0,
            totalHits: 0,
            totalDamage: 0,
            totalComboBonus: 0
        };
    }

    /**
     * 添加召唤条件
     */
    public addSummonCondition(condition: CoopBallSummonCondition): void {
        this._summonConditions.push(condition);
    }

    /**
     * 移除召唤条件
     */
    public removeSummonCondition(index: number): void {
        if (index >= 0 && index < this._summonConditions.length) {
            this._summonConditions.splice(index, 1);
        }
    }

    onDestroy() {
        this.destroyAllBalls();
        
        // 取消事件监听
        const battleCore = BattleCoreSystem.instance;
        if (battleCore) {
            battleCore.events.off(BattleCoreSystem.EVENT_COMBO_CHANGED, this.onComboChanged, this);
            battleCore.events.off(BattleCoreSystem.EVENT_FEVER_START, this.onFeverStart, this);
        }

        if (CooperativeBallSystem._instance === this) {
            CooperativeBallSystem._instance = null;
        }
    }
}
