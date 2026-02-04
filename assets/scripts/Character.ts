import { _decorator, Component, Node, Vec2, Vec3, RigidBody2D, CircleCollider2D, Collider2D, Contact2DType, IPhysics2DContact, ERigidBody2DType, PhysicsSystem2D } from 'cc';
import { GameManager } from './GameManager';
import { Enemy } from './Enemy';
const { ccclass, property } = _decorator;

/**
 * 角色类 - 弹珠角色，会在场景中弹射
 * Character class - Pinball character that bounces around the scene
 */
@ccclass('Character')
export class Character extends Component {
    @property({ tooltip: '角色名称' })
    public characterName: string = '主角';

    @property({ tooltip: '最大生命值' })
    public maxHP: number = 100;

    @property({ tooltip: '攻击力' })
    public attack: number = 10;

    @property({ tooltip: '弹射力度' })
    public bounceForce: number = 800;

    @property({ tooltip: '最大速度' })
    public maxSpeed: number = 1500;

    @property({ tooltip: '最小速度（防止停止）' })
    public minSpeed: number = 200;

    @property({ tooltip: '技能冷却时间（秒）' })
    public skillCooldown: number = 5.0;

    @property({ tooltip: '技能能量' })
    public skillEnergy: number = 0;

    @property({ tooltip: '技能最大能量' })
    public maxSkillEnergy: number = 100;

    private _currentHP: number = 100;
    private _rigidBody: RigidBody2D | null = null;
    private _collider: CircleCollider2D | null = null;
    private _skillTimer: number = 0;
    private _isSkillReady: boolean = true;
    private _invincibleTime: number = 0;
    private _isInvincible: boolean = false;

    public get currentHP(): number {
        return this._currentHP;
    }

    public get isSkillReady(): boolean {
        return this._isSkillReady && this.skillEnergy >= this.maxSkillEnergy;
    }

    onLoad() {
        // 获取或添加刚体组件
        this._rigidBody = this.getComponent(RigidBody2D);
        if (!this._rigidBody) {
            this._rigidBody = this.addComponent(RigidBody2D);
        }
        this._rigidBody.type = ERigidBody2DType.Dynamic;
        this._rigidBody.gravityScale = 1;
        this._rigidBody.linearDamping = 0.1;
        this._rigidBody.angularDamping = 0.5;

        // 获取或添加碰撞器
        this._collider = this.getComponent(CircleCollider2D);
        if (!this._collider) {
            this._collider = this.addComponent(CircleCollider2D);
        }
        this._collider.radius = 30;
        this._collider.restitution = 0.8; // 弹性
        this._collider.friction = 0.2;
        this._collider.density = 1;
        this._collider.apply();

        // 注册碰撞回调
        this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }

    start() {
        this._currentHP = this.maxHP;
        
        // 注册到游戏管理器
        if (GameManager.instance) {
            GameManager.instance.registerCharacter(this.node);
        }

        // 初始发射
        this.launch(new Vec2(0, 1));
    }

    update(deltaTime: number) {
        if (!this._rigidBody) return;

        // 更新技能冷却
        if (!this._isSkillReady) {
            this._skillTimer += deltaTime;
            if (this._skillTimer >= this.skillCooldown) {
                this._isSkillReady = true;
                this._skillTimer = 0;
            }
        }

        // 更新无敌时间
        if (this._isInvincible) {
            this._invincibleTime -= deltaTime;
            if (this._invincibleTime <= 0) {
                this._isInvincible = false;
            }
        }

        // 限制速度
        this.clampVelocity();

        // 保持最小速度（防止角色停止）
        this.ensureMinimumSpeed();
    }

    /**
     * 发射角色
     */
    public launch(direction: Vec2): void {
        if (!this._rigidBody) return;

        const normalizedDir = direction.normalize();
        const impulse = new Vec2(
            normalizedDir.x * this.bounceForce,
            normalizedDir.y * this.bounceForce
        );
        
        this._rigidBody.linearVelocity = impulse;
        console.log(`角色发射！方向: (${normalizedDir.x.toFixed(2)}, ${normalizedDir.y.toFixed(2)})`);
    }

    /**
     * 施加弹射力（被挡板击打时调用）
     */
    public applyFlipForce(force: Vec2): void {
        if (!this._rigidBody) return;

        // 获取当前速度
        const currentVel = this._rigidBody.linearVelocity;
        
        // 添加弹射力
        const newVel = new Vec2(
            currentVel.x + force.x,
            force.y // Y方向使用新的力
        );
        
        this._rigidBody.linearVelocity = newVel;
    }

    /**
     * 使用技能
     */
    public useSkill(): boolean {
        if (!this.isSkillReady) {
            console.log('技能未就绪');
            return false;
        }

        console.log(`${this.characterName} 使用技能！`);
        this._isSkillReady = false;
        this._skillTimer = 0;
        this.skillEnergy = 0;

        // 技能效果：短暂无敌 + 攻击力提升
        this._isInvincible = true;
        this._invincibleTime = 2.0;

        // 对所有敌人造成范围伤害
        if (GameManager.instance) {
            const enemies = GameManager.instance.getEnemies();
            for (const enemyNode of enemies) {
                const enemy = enemyNode.getComponent(Enemy);
                if (enemy) {
                    enemy.takeDamage(this.attack * 3);
                }
            }
        }

        return true;
    }

    /**
     * 增加技能能量
     */
    public addSkillEnergy(amount: number): void {
        this.skillEnergy = Math.min(this.skillEnergy + amount, this.maxSkillEnergy);
        if (this.skillEnergy >= this.maxSkillEnergy) {
            console.log('技能已充能！');
        }
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number): void {
        if (this._isInvincible) {
            console.log('无敌状态，免疫伤害');
            return;
        }

        this._currentHP = Math.max(0, this._currentHP - damage);
        console.log(`${this.characterName} 受到 ${damage} 伤害，剩余HP: ${this._currentHP}`);

        if (this._currentHP <= 0) {
            this.onDeath();
        }
    }

    /**
     * 碰撞开始回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        const otherNode = otherCollider.node;

        // 检查是否碰到敌人
        const enemy = otherNode.getComponent(Enemy);
        if (enemy) {
            this.onHitEnemy(enemy);
        }

        // 增加连击
        if (GameManager.instance) {
            GameManager.instance.addCombo();
        }

        // 增加技能能量
        this.addSkillEnergy(5);
    }

    /**
     * 击中敌人
     */
    private onHitEnemy(enemy: Enemy): void {
        // 计算伤害（基于速度）
        const velocity = this._rigidBody?.linearVelocity || new Vec2(0, 0);
        const speed = velocity.length();
        const speedBonus = speed / this.maxSpeed;
        const damage = this.attack * (1 + speedBonus);

        enemy.takeDamage(damage);
        console.log(`击中 ${enemy.enemyName}！造成 ${damage.toFixed(1)} 伤害`);
    }

    /**
     * 限制速度
     */
    private clampVelocity(): void {
        if (!this._rigidBody) return;

        const vel = this._rigidBody.linearVelocity;
        const speed = vel.length();

        if (speed > this.maxSpeed) {
            const normalized = vel.normalize();
            this._rigidBody.linearVelocity = new Vec2(
                normalized.x * this.maxSpeed,
                normalized.y * this.maxSpeed
            );
        }
    }

    /**
     * 确保最小速度
     */
    private ensureMinimumSpeed(): void {
        if (!this._rigidBody) return;

        const vel = this._rigidBody.linearVelocity;
        const speed = vel.length();

        if (speed < this.minSpeed && speed > 0) {
            const normalized = vel.normalize();
            this._rigidBody.linearVelocity = new Vec2(
                normalized.x * this.minSpeed,
                normalized.y * this.minSpeed
            );
        } else if (speed === 0) {
            // 如果完全停止，给一个随机方向的力
            const randomAngle = Math.random() * Math.PI * 2;
            this._rigidBody.linearVelocity = new Vec2(
                Math.cos(randomAngle) * this.minSpeed,
                Math.sin(randomAngle) * this.minSpeed
            );
        }
    }

    /**
     * 角色死亡
     */
    private onDeath(): void {
        console.log(`${this.characterName} 死亡！`);
        if (GameManager.instance) {
            GameManager.instance.gameOver();
        }
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}
