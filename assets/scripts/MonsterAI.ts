import { _decorator, Component, Node, Vec2, Vec3, RigidBody2D } from 'cc';
import { 
    MonsterDatabase, 
    MonsterConfig, 
    MonsterInstance, 
    MonsterSkillConfig,
    AIBehaviorType,
    MovementPattern,
    AttackPattern,
    ActiveEffect
} from './MonsterData';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * AI状态机状态
 */
export enum AIState {
    IDLE = 'idle',              // 空闲
    PATROL = 'patrol',          // 巡逻
    ALERT = 'alert',            // 警戒
    CHASE = 'chase',            // 追击
    ATTACK = 'attack',          // 攻击
    SKILL = 'skill',            // 释放技能
    FLEE = 'flee',              // 逃跑
    STUNNED = 'stunned',        // 眩晕
    DEAD = 'dead'               // 死亡
}

/**
 * AI决策结果
 */
interface AIDecision {
    action: AIState;
    targetPosition?: Vec3;
    skillId?: string;
    priority: number;
}

/**
 * 怪物AI控制器
 * Monster AI Controller - Controls monster behavior and decision making
 */
@ccclass('MonsterAI')
export class MonsterAI extends Component {
    @property({ tooltip: '怪物配置ID' })
    public configId: string = '';

    @property({ tooltip: '检测范围' })
    public detectionRange: number = 300;

    @property({ tooltip: '攻击范围' })
    public attackRange: number = 100;

    @property({ tooltip: '警戒范围' })
    public alertRange: number = 200;

    @property({ tooltip: '移动速度' })
    public moveSpeed: number = 100;

    @property({ tooltip: '巡逻点列表' })
    public patrolPoints: Vec3[] = [];

    // 运行时数据
    private _config: MonsterConfig | null = null;
    private _instance: MonsterInstance | null = null;
    private _currentState: AIState = AIState.IDLE;
    private _previousState: AIState = AIState.IDLE;
    private _target: Node | null = null;
    private _rigidBody: RigidBody2D | null = null;

    // 计时器
    private _stateTimer: number = 0;
    private _attackCooldown: number = 0;
    private _skillCooldowns: Map<string, number> = new Map();
    private _decisionInterval: number = 0.2;
    private _decisionTimer: number = 0;

    // 巡逻
    private _currentPatrolIndex: number = 0;
    private _patrolWaitTimer: number = 0;
    private _patrolWaitDuration: number = 2;

    // 追击
    private _chaseTimer: number = 0;
    private _maxChaseTime: number = 10;
    private _lastKnownPosition: Vec3 = new Vec3();

    // 逃跑
    private _fleeDirection: Vec2 = new Vec2();

    // 技能施法
    private _castingSkill: MonsterSkillConfig | null = null;
    private _castTimer: number = 0;

    // 仇恨管理
    private _aggroList: Map<string, number> = new Map();
    private _aggroDecayRate: number = 5;

    public get currentState(): AIState {
        return this._currentState;
    }

    public get instance(): MonsterInstance | null {
        return this._instance;
    }

    onLoad() {
        this._rigidBody = this.getComponent(RigidBody2D);
        
        // 初始化怪物配置
        if (this.configId) {
            this.initializeFromConfig(this.configId);
        }
    }

    start() {
        // 初始化巡逻点
        if (this.patrolPoints.length === 0) {
            this.generateDefaultPatrolPoints();
        }
    }

    update(deltaTime: number) {
        if (!this._instance || this._currentState === AIState.DEAD) return;

        // 更新效果
        this.updateEffects(deltaTime);

        // 更新眩晕
        if (this._instance.isStunned) {
            this._instance.stunDuration -= deltaTime;
            if (this._instance.stunDuration <= 0) {
                this._instance.isStunned = false;
                this.changeState(this._previousState);
            }
            return;
        }

        // 更新冷却
        this.updateCooldowns(deltaTime);

        // 决策间隔
        this._decisionTimer += deltaTime;
        if (this._decisionTimer >= this._decisionInterval) {
            this._decisionTimer = 0;
            this.makeDecision();
        }

        // 执行当前状态行为
        this.executeState(deltaTime);
    }

    /**
     * 从配置初始化
     */
    public initializeFromConfig(configId: string, level?: number): void {
        this._config = MonsterDatabase.instance.getMonster(configId);
        if (!this._config) {
            console.error(`怪物配置不存在: ${configId}`);
            return;
        }

        this._instance = MonsterDatabase.instance.createInstance(configId, level);
        if (!this._instance) return;

        // 应用配置
        this.detectionRange = this.getDetectionRangeByBehavior();
        this.attackRange = this.getMaxSkillRange();
        this.moveSpeed = this._instance.stats.speed * 50;

        // 初始化技能冷却
        for (const skill of this._config.skills) {
            this._skillCooldowns.set(skill.id, 0);
        }

        console.log(`怪物AI初始化: ${this._config.name} (Lv.${this._instance.level})`);
    }

    /**
     * 根据行为类型获取检测范围
     */
    private getDetectionRangeByBehavior(): number {
        if (!this._config) return 300;

        switch (this._config.aiBehavior) {
            case AIBehaviorType.PASSIVE: return 150;
            case AIBehaviorType.AGGRESSIVE: return 400;
            case AIBehaviorType.DEFENSIVE: return 250;
            case AIBehaviorType.SUPPORT: return 350;
            case AIBehaviorType.BERSERKER: return 500;
            case AIBehaviorType.TACTICAL: return 350;
            default: return 300;
        }
    }

    /**
     * 获取最大技能范围
     */
    private getMaxSkillRange(): number {
        if (!this._config) return 100;
        
        let maxRange = 100;
        for (const skill of this._config.skills) {
            if (skill.range > maxRange) {
                maxRange = skill.range;
            }
        }
        return maxRange;
    }

    /**
     * 生成默认巡逻点
     */
    private generateDefaultPatrolPoints(): void {
        const pos = this.node.position;
        const range = 150;

        this.patrolPoints = [
            new Vec3(pos.x - range, pos.y, 0),
            new Vec3(pos.x + range, pos.y, 0),
            new Vec3(pos.x, pos.y + range, 0),
            new Vec3(pos.x, pos.y - range, 0)
        ];
    }

    // ==================== 决策系统 ====================

    /**
     * 做出决策
     */
    private makeDecision(): void {
        if (!this._config || !this._instance) return;

        const decisions: AIDecision[] = [];

        // 查找目标
        this._target = this.findBestTarget();

        // 根据当前情况生成决策选项
        if (this._target) {
            const distance = this.getDistanceToTarget();

            // 攻击决策
            if (distance <= this.attackRange && this._attackCooldown <= 0) {
                decisions.push({
                    action: AIState.ATTACK,
                    priority: 80
                });
            }

            // 技能决策
            const availableSkill = this.selectBestSkill(distance);
            if (availableSkill) {
                decisions.push({
                    action: AIState.SKILL,
                    skillId: availableSkill.id,
                    priority: availableSkill.priority * 10 + 50
                });
            }

            // 追击决策
            if (distance > this.attackRange && distance <= this.detectionRange) {
                decisions.push({
                    action: AIState.CHASE,
                    targetPosition: this._target.position.clone(),
                    priority: 60
                });
            }

            // 逃跑决策（低HP或战术型）
            if (this.shouldFlee()) {
                decisions.push({
                    action: AIState.FLEE,
                    priority: 90
                });
            }
        } else {
            // 无目标时的决策
            if (this._config.movementPattern === MovementPattern.PATROL) {
                decisions.push({
                    action: AIState.PATROL,
                    priority: 30
                });
            } else {
                decisions.push({
                    action: AIState.IDLE,
                    priority: 10
                });
            }
        }

        // 选择最高优先级的决策
        if (decisions.length > 0) {
            decisions.sort((a, b) => b.priority - a.priority);
            const bestDecision = decisions[0];

            if (bestDecision.action !== this._currentState) {
                this.changeState(bestDecision.action);
            }

            if (bestDecision.skillId) {
                this.startSkillCast(bestDecision.skillId);
            }
        }
    }

    /**
     * 查找最佳目标
     */
    private findBestTarget(): Node | null {
        const characters = GameManager.instance?.getCharacters() ?? [];
        let bestTarget: Node | null = null;
        let highestAggro = 0;

        for (const char of characters) {
            if (!char || !char.isValid) continue;

            const distance = Vec3.distance(this.node.position, char.position);
            if (distance > this.detectionRange) continue;

            // 计算仇恨值
            let aggro = this._aggroList.get(char.uuid) ?? 0;
            
            // 距离越近仇恨越高
            aggro += (this.detectionRange - distance) / this.detectionRange * 50;

            if (aggro > highestAggro) {
                highestAggro = aggro;
                bestTarget = char;
            }
        }

        return bestTarget;
    }

    /**
     * 选择最佳技能
     */
    private selectBestSkill(distance: number): MonsterSkillConfig | null {
        if (!this._config || !this._instance) return null;

        let bestSkill: MonsterSkillConfig | null = null;
        let highestPriority = -1;

        for (const skill of this._config.skills) {
            // 检查冷却
            if ((this._skillCooldowns.get(skill.id) ?? 0) > 0) continue;

            // 检查范围
            if (skill.range > 0 && distance > skill.range) continue;

            // 检查触发条件
            if (!this.checkSkillTrigger(skill)) continue;

            // 选择优先级最高的技能
            if (skill.priority > highestPriority) {
                highestPriority = skill.priority;
                bestSkill = skill;
            }
        }

        return bestSkill;
    }

    /**
     * 检查技能触发条件
     */
    private checkSkillTrigger(skill: MonsterSkillConfig): boolean {
        if (!skill.triggerCondition || !this._instance) return true;

        const condition = skill.triggerCondition;
        const hpPercent = (this._instance.currentHP / this._instance.maxHP) * 100;

        switch (condition.type) {
            case 'hp_below':
                return hpPercent <= condition.value;
            case 'hp_above':
                return hpPercent >= condition.value;
            case 'random':
                return Math.random() * 100 < condition.value;
            case 'time':
                return this._stateTimer >= condition.value;
            default:
                return true;
        }
    }

    /**
     * 是否应该逃跑
     */
    private shouldFlee(): boolean {
        if (!this._config || !this._instance) return false;

        // 战术型和辅助型在低HP时逃跑
        if (this._config.aiBehavior === AIBehaviorType.TACTICAL ||
            this._config.aiBehavior === AIBehaviorType.SUPPORT) {
            const hpPercent = this._instance.currentHP / this._instance.maxHP;
            return hpPercent < 0.3;
        }

        return false;
    }

    // ==================== 状态执行 ====================

    /**
     * 改变状态
     */
    private changeState(newState: AIState): void {
        if (newState === this._currentState) return;

        // 退出当前状态
        this.exitState(this._currentState);

        this._previousState = this._currentState;
        this._currentState = newState;
        this._stateTimer = 0;

        // 进入新状态
        this.enterState(newState);

        console.log(`[${this._config?.name}] 状态变更: ${this._previousState} -> ${newState}`);
    }

    /**
     * 进入状态
     */
    private enterState(state: AIState): void {
        switch (state) {
            case AIState.CHASE:
                this._chaseTimer = 0;
                break;
            case AIState.FLEE:
                this.calculateFleeDirection();
                break;
            case AIState.PATROL:
                this._patrolWaitTimer = 0;
                break;
        }
    }

    /**
     * 退出状态
     */
    private exitState(state: AIState): void {
        switch (state) {
            case AIState.SKILL:
                this._castingSkill = null;
                this._castTimer = 0;
                break;
        }
    }

    /**
     * 执行当前状态
     */
    private executeState(deltaTime: number): void {
        this._stateTimer += deltaTime;

        switch (this._currentState) {
            case AIState.IDLE:
                this.executeIdle(deltaTime);
                break;
            case AIState.PATROL:
                this.executePatrol(deltaTime);
                break;
            case AIState.CHASE:
                this.executeChase(deltaTime);
                break;
            case AIState.ATTACK:
                this.executeAttack(deltaTime);
                break;
            case AIState.SKILL:
                this.executeSkill(deltaTime);
                break;
            case AIState.FLEE:
                this.executeFlee(deltaTime);
                break;
            case AIState.ALERT:
                this.executeAlert(deltaTime);
                break;
        }
    }

    /**
     * 空闲状态
     */
    private executeIdle(deltaTime: number): void {
        // 停止移动
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }

        // 随机转向巡逻
        if (this._stateTimer > 3 && Math.random() < 0.3) {
            this.changeState(AIState.PATROL);
        }
    }

    /**
     * 巡逻状态
     */
    private executePatrol(deltaTime: number): void {
        if (this.patrolPoints.length === 0) return;

        const targetPoint = this.patrolPoints[this._currentPatrolIndex];
        const distance = Vec3.distance(this.node.position, targetPoint);

        if (distance < 20) {
            // 到达巡逻点，等待
            this._patrolWaitTimer += deltaTime;
            if (this._patrolWaitTimer >= this._patrolWaitDuration) {
                this._patrolWaitTimer = 0;
                this._currentPatrolIndex = (this._currentPatrolIndex + 1) % this.patrolPoints.length;
            }
            
            if (this._rigidBody) {
                this._rigidBody.linearVelocity = Vec2.ZERO;
            }
        } else {
            // 移动向巡逻点
            this.moveToward(targetPoint, this.moveSpeed * 0.5);
        }
    }

    /**
     * 追击状态
     */
    private executeChase(deltaTime: number): void {
        if (!this._target) {
            this.changeState(AIState.PATROL);
            return;
        }

        this._chaseTimer += deltaTime;
        if (this._chaseTimer > this._maxChaseTime) {
            // 追击超时，放弃
            this.changeState(AIState.PATROL);
            return;
        }

        const distance = this.getDistanceToTarget();

        // 进入攻击范围
        if (distance <= this.attackRange) {
            this.changeState(AIState.ATTACK);
            return;
        }

        // 目标超出检测范围
        if (distance > this.detectionRange * 1.5) {
            this.changeState(AIState.PATROL);
            return;
        }

        // 追击目标
        this._lastKnownPosition = this._target.position.clone();
        this.moveToward(this._target.position, this.moveSpeed);
    }

    /**
     * 攻击状态
     */
    private executeAttack(deltaTime: number): void {
        if (!this._target || !this._instance) {
            this.changeState(AIState.IDLE);
            return;
        }

        // 停止移动
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }

        // 攻击冷却
        if (this._attackCooldown > 0) return;

        // 执行攻击
        const damage = this._instance.stats.attack;
        console.log(`[${this._config?.name}] 攻击! 伤害: ${damage}`);

        // TODO: 实际造成伤害给目标
        // this._target.getComponent(Character)?.takeDamage(damage);

        // 设置攻击冷却
        this._attackCooldown = 1.5;

        // 增加仇恨
        this.addAggro(this._target.uuid, 10);
    }

    /**
     * 技能状态
     */
    private executeSkill(deltaTime: number): void {
        if (!this._castingSkill) {
            this.changeState(AIState.IDLE);
            return;
        }

        // 停止移动
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }

        this._castTimer += deltaTime;

        // 施法完成
        if (this._castTimer >= this._castingSkill.castTime) {
            this.executeSkillEffect(this._castingSkill);
            this._skillCooldowns.set(this._castingSkill.id, this._castingSkill.cooldown);
            this._castingSkill = null;
            this._castTimer = 0;
            this.changeState(AIState.IDLE);
        }
    }

    /**
     * 逃跑状态
     */
    private executeFlee(deltaTime: number): void {
        if (!this._target) {
            this.changeState(AIState.PATROL);
            return;
        }

        // 远离目标
        const fleePosition = new Vec3(
            this.node.position.x + this._fleeDirection.x * 200,
            this.node.position.y + this._fleeDirection.y * 200,
            0
        );

        this.moveToward(fleePosition, this.moveSpeed * 1.2);

        // 逃跑一段时间后停止
        if (this._stateTimer > 3) {
            const distance = this.getDistanceToTarget();
            if (distance > this.detectionRange) {
                this.changeState(AIState.PATROL);
            }
        }
    }

    /**
     * 警戒状态
     */
    private executeAlert(deltaTime: number): void {
        // 停止移动，观察周围
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }

        // 警戒一段时间后恢复巡逻
        if (this._stateTimer > 3) {
            this.changeState(AIState.PATROL);
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 开始施放技能
     */
    private startSkillCast(skillId: string): void {
        if (!this._config) return;

        const skill = this._config.skills.find(s => s.id === skillId);
        if (!skill) return;

        this._castingSkill = skill;
        this._castTimer = 0;

        console.log(`[${this._config.name}] 开始施放: ${skill.name}`);
    }

    /**
     * 执行技能效果
     */
    private executeSkillEffect(skill: MonsterSkillConfig): void {
        if (!this._instance) return;

        console.log(`[${this._config?.name}] 释放技能: ${skill.name}`);

        // 造成伤害
        if (skill.damage) {
            const damage = skill.damage * (this._instance.stats.attack / 100);
            console.log(`  伤害: ${damage}`);
            // TODO: 对目标造成伤害
        }

        // 应用效果
        if (skill.effects) {
            for (const effect of skill.effects) {
                console.log(`  效果: ${effect.type} ${effect.value}`);
                // TODO: 应用效果
            }
        }
    }

    /**
     * 移动向目标点
     */
    private moveToward(target: Vec3, speed: number): void {
        if (!this._rigidBody) return;

        const direction = new Vec3();
        Vec3.subtract(direction, target, this.node.position);
        direction.normalize();

        this._rigidBody.linearVelocity = new Vec2(
            direction.x * speed,
            direction.y * speed
        );
    }

    /**
     * 计算逃跑方向
     */
    private calculateFleeDirection(): void {
        if (!this._target) return;

        const direction = new Vec3();
        Vec3.subtract(direction, this.node.position, this._target.position);
        direction.normalize();

        this._fleeDirection = new Vec2(direction.x, direction.y);
    }

    /**
     * 获取到目标的距离
     */
    private getDistanceToTarget(): number {
        if (!this._target) return Infinity;
        return Vec3.distance(this.node.position, this._target.position);
    }

    /**
     * 增加仇恨
     */
    public addAggro(targetId: string, amount: number): void {
        const current = this._aggroList.get(targetId) ?? 0;
        this._aggroList.set(targetId, current + amount);
    }

    /**
     * 更新冷却
     */
    private updateCooldowns(deltaTime: number): void {
        // 攻击冷却
        if (this._attackCooldown > 0) {
            this._attackCooldown -= deltaTime;
        }

        // 技能冷却
        this._skillCooldowns.forEach((cooldown, skillId) => {
            if (cooldown > 0) {
                this._skillCooldowns.set(skillId, cooldown - deltaTime);
            }
        });

        // 仇恨衰减
        this._aggroList.forEach((aggro, targetId) => {
            const newAggro = aggro - this._aggroDecayRate * deltaTime;
            if (newAggro <= 0) {
                this._aggroList.delete(targetId);
            } else {
                this._aggroList.set(targetId, newAggro);
            }
        });
    }

    /**
     * 更新效果
     */
    private updateEffects(deltaTime: number): void {
        if (!this._instance) return;

        // 更新Buff
        this._instance.buffs = this._instance.buffs.filter(buff => {
            buff.remainingTime -= deltaTime;
            return buff.remainingTime > 0;
        });

        // 更新Debuff
        this._instance.debuffs = this._instance.debuffs.filter(debuff => {
            debuff.remainingTime -= deltaTime;
            
            // DOT效果
            if (debuff.type === 'dot') {
                this._instance!.currentHP -= debuff.value * deltaTime;
            }

            return debuff.remainingTime > 0;
        });
    }

    // ==================== 外部接口 ====================

    /**
     * 受到伤害
     */
    public takeDamage(damage: number, attackerId?: string): number {
        if (!this._instance || this._currentState === AIState.DEAD) return 0;

        // 计算实际伤害
        const defense = this._instance.stats.defense;
        const reduction = defense / (defense + 100);
        const actualDamage = damage * (1 - reduction);

        // 扣除护盾
        if (this._instance.currentShield > 0) {
            if (actualDamage <= this._instance.currentShield) {
                this._instance.currentShield -= actualDamage;
                return 0;
            } else {
                const remaining = actualDamage - this._instance.currentShield;
                this._instance.currentShield = 0;
                this._instance.currentHP -= remaining;
            }
        } else {
            this._instance.currentHP -= actualDamage;
        }

        // 增加仇恨
        if (attackerId) {
            this.addAggro(attackerId, damage * 0.5);
        }

        // 检查死亡
        if (this._instance.currentHP <= 0) {
            this._instance.currentHP = 0;
            this.onDeath();
        }

        return actualDamage;
    }

    /**
     * 应用效果
     */
    public applyEffect(effect: ActiveEffect): void {
        if (!this._instance) return;

        if (effect.type === 'stun') {
            this._instance.isStunned = true;
            this._instance.stunDuration = effect.duration;
            this.changeState(AIState.STUNNED);
        } else if (effect.value > 0) {
            this._instance.buffs.push({ ...effect });
        } else {
            this._instance.debuffs.push({ ...effect });
        }
    }

    /**
     * 死亡处理
     */
    private onDeath(): void {
        this.changeState(AIState.DEAD);
        console.log(`[${this._config?.name}] 死亡`);

        // 停止移动
        if (this._rigidBody) {
            this._rigidBody.linearVelocity = Vec2.ZERO;
        }

        // TODO: 播放死亡动画，掉落物品
        this.scheduleOnce(() => {
            this.node.destroy();
        }, 0.5);
    }

    /**
     * 重置AI
     */
    public reset(): void {
        if (!this._instance || !this._config) return;

        this._instance.currentHP = this._instance.maxHP;
        this._instance.currentShield = 0;
        this._instance.buffs = [];
        this._instance.debuffs = [];
        this._instance.isStunned = false;
        this._aggroList.clear();
        this._skillCooldowns.forEach((_, key) => this._skillCooldowns.set(key, 0));
        this._attackCooldown = 0;

        this.changeState(AIState.IDLE);
    }
}
