import { _decorator, Component, Node, Vec2, Vec3, RigidBody2D, CircleCollider2D, Collider2D, Contact2DType, IPhysics2DContact, ERigidBody2DType, Graphics, Color, UITransform, Label, tween, Sprite } from 'cc';
import { CharacterManager } from './CharacterManager';
import { CharacterDatabase, CharacterConfig, CharacterInstance, CharacterStats, ElementType } from './CharacterData';
import { GameManager } from './GameManager';
import { Enemy } from './Enemy';
const { ccclass, property } = _decorator;

/**
 * 队伍战斗系统 - 管理队伍中角色在游戏中的表现
 * Team Battle System - Manages team characters' behavior in game
 */
@ccclass('TeamBattle')
export class TeamBattle extends Component {
    private static _instance: TeamBattle | null = null;

    @property({ tooltip: '角色间距' })
    public characterSpacing: number = 50;

    @property({ tooltip: '队伍跟随延迟' })
    public followDelay: number = 0.15;

    @property({ tooltip: '角色碰撞半径' })
    public colliderRadius: number = 30;

    @property({ tooltip: '最大弹射速度' })
    public maxSpeed: number = 1500;

    @property({ tooltip: '最小弹射速度' })
    public minSpeed: number = 200;

    // 当前活跃的角色节点列表
    private _characterNodes: Node[] = [];
    
    // 角色对应的实例和配置
    private _characterData: Array<{
        instance: CharacterInstance;
        config: CharacterConfig;
        stats: CharacterStats;
        currentHP: number;
        skillEnergy: number;
    }> = [];

    // 当前队长索引
    private _leaderIndex: number = 0;

    // 位置历史记录（用于跟随效果）
    private _positionHistory: Vec3[][] = [];

    // 是否正在使用技能
    private _isUsingSkill: boolean = false;

    // 当前激活的角色索引
    private _activeCharacterIndex: number = 0;

    // 技能冷却
    private _skillCooldowns: number[] = [];

    public static get instance(): TeamBattle | null {
        return TeamBattle._instance;
    }

    public get activeCharacter(): Node | null {
        return this._characterNodes[this._activeCharacterIndex] || null;
    }

    public get leaderIndex(): number {
        return this._leaderIndex;
    }

    onLoad() {
        if (TeamBattle._instance) {
            this.node.destroy();
            return;
        }
        TeamBattle._instance = this;
    }

    start() {
        this.initializeTeam();
    }

    update(deltaTime: number) {
        this.updateCharacterFollow(deltaTime);
        this.updateSkillCooldowns(deltaTime);
        this.ensureMinimumSpeed();
    }

    /**
     * 初始化队伍
     */
    public initializeTeam(): void {
        const manager = CharacterManager.instance;
        if (!manager) {
            console.error('CharacterManager not found');
            return;
        }

        const team = manager.getCurrentTeam();
        if (!team) {
            console.error('No current team');
            return;
        }

        // 清除现有角色
        this.clearTeam();

        // 创建队伍角色
        let leaderFound = false;
        let slotIndex = 0;

        for (const uniqueId of team.slots) {
            if (!uniqueId) continue;

            const instance = manager.getCharacterInstance(uniqueId);
            const config = manager.getCharacterConfig(uniqueId);
            const stats = manager.getCharacterStats(uniqueId);

            if (!instance || !config || !stats) continue;

            // 创建角色节点
            const charNode = this.createCharacterNode(config, stats, slotIndex);
            this._characterNodes.push(charNode);

            // 存储角色数据
            this._characterData.push({
                instance,
                config,
                stats,
                currentHP: stats.hp,
                skillEnergy: 0
            });

            // 初始化技能冷却
            this._skillCooldowns.push(0);

            // 初始化位置历史
            this._positionHistory.push([]);

            // 检查是否是队长
            if (uniqueId === team.leaderId) {
                this._leaderIndex = slotIndex;
                leaderFound = true;
            }

            slotIndex++;
        }

        if (!leaderFound && this._characterNodes.length > 0) {
            this._leaderIndex = 0;
        }

        // 设置初始位置
        this.setInitialPositions();

        // 发射队长角色
        this.launchLeader();

        console.log(`队伍初始化完成，共 ${this._characterNodes.length} 个角色`);
    }

    /**
     * 创建角色节点
     */
    private createCharacterNode(config: CharacterConfig, stats: CharacterStats, index: number): Node {
        const charNode = new Node(`TeamChar_${index}_${config.name}`);
        this.node.addChild(charNode);

        // 添加UITransform
        const uiTransform = charNode.addComponent(UITransform);
        const size = config.colliderRadius * 2;
        uiTransform.setContentSize(size, size);

        // 添加Graphics绘制角色
        const graphics = charNode.addComponent(Graphics);
        const elementColor = new Color().fromHEX(CharacterDatabase.instance.getElementColor(config.element));
        const rarityColor = new Color().fromHEX(CharacterDatabase.instance.getRarityColor(config.rarity));

        // 绘制外圈（稀有度颜色）
        graphics.fillColor = rarityColor;
        graphics.circle(0, 0, config.colliderRadius);
        graphics.fill();

        // 绘制内圈（元素颜色）
        graphics.fillColor = elementColor;
        graphics.circle(0, 0, config.colliderRadius - 5);
        graphics.fill();

        // 绘制角色图标
        graphics.fillColor = new Color(255, 255, 255, 200);
        graphics.circle(0, 0, config.colliderRadius - 12);
        graphics.fill();

        // 绘制简易表情
        graphics.fillColor = new Color(50, 50, 50);
        graphics.circle(-8, 3, 4);
        graphics.circle(8, 3, 4);
        graphics.fill();

        // 添加名称标签
        const nameNode = new Node('Name');
        nameNode.setPosition(0, config.colliderRadius + 15);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = config.name;
        nameLabel.fontSize = 12;
        nameLabel.color = Color.WHITE;
        nameLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        charNode.addChild(nameNode);

        // 添加刚体（只给队长添加物理）
        if (index === 0) {
            const rigidBody = charNode.addComponent(RigidBody2D);
            rigidBody.type = ERigidBody2DType.Dynamic;
            rigidBody.gravityScale = 1;
            rigidBody.linearDamping = 0.1;
            rigidBody.angularDamping = 0.5;

            // 添加碰撞器
            const collider = charNode.addComponent(CircleCollider2D);
            collider.radius = config.colliderRadius;
            collider.restitution = 0.8;
            collider.friction = 0.2;
            collider.density = 1;
            collider.apply();

            // 注册碰撞回调
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        return charNode;
    }

    /**
     * 设置初始位置
     */
    private setInitialPositions(): void {
        const startPos = new Vec3(0, 200, 0);

        for (let i = 0; i < this._characterNodes.length; i++) {
            const node = this._characterNodes[i];
            const offset = i * this.characterSpacing;
            node.setPosition(startPos.x, startPos.y - offset, 0);
        }
    }

    /**
     * 发射队长角色
     */
    private launchLeader(): void {
        const leaderNode = this._characterNodes[this._leaderIndex];
        if (!leaderNode) return;

        const rigidBody = leaderNode.getComponent(RigidBody2D);
        if (!rigidBody) return;

        const config = this._characterData[this._leaderIndex]?.config;
        const force = config?.bounceForce || 800;

        // 向上发射
        rigidBody.linearVelocity = new Vec2(0, force);
    }

    /**
     * 更新角色跟随
     */
    private updateCharacterFollow(deltaTime: number): void {
        if (this._characterNodes.length <= 1) return;

        const leaderNode = this._characterNodes[this._leaderIndex];
        if (!leaderNode) return;

        // 记录队长位置历史
        const leaderHistory = this._positionHistory[this._leaderIndex];
        leaderHistory.unshift(leaderNode.position.clone());
        
        // 限制历史长度
        const maxHistory = Math.ceil((this._characterNodes.length - 1) * 10);
        while (leaderHistory.length > maxHistory) {
            leaderHistory.pop();
        }

        // 其他角色跟随
        for (let i = 0; i < this._characterNodes.length; i++) {
            if (i === this._leaderIndex) continue;

            const charNode = this._characterNodes[i];
            const historyIndex = Math.min(
                Math.floor((Math.abs(i - this._leaderIndex)) * 10),
                leaderHistory.length - 1
            );

            if (historyIndex >= 0 && leaderHistory[historyIndex]) {
                const targetPos = leaderHistory[historyIndex];
                
                // 平滑跟随
                const currentPos = charNode.position;
                const newPos = new Vec3(
                    currentPos.x + (targetPos.x - currentPos.x) * 0.3,
                    currentPos.y + (targetPos.y - currentPos.y) * 0.3,
                    0
                );
                charNode.setPosition(newPos);
            }
        }
    }

    /**
     * 更新技能冷却
     */
    private updateSkillCooldowns(deltaTime: number): void {
        for (let i = 0; i < this._skillCooldowns.length; i++) {
            if (this._skillCooldowns[i] > 0) {
                this._skillCooldowns[i] -= deltaTime;
            }
        }
    }

    /**
     * 确保最小速度
     */
    private ensureMinimumSpeed(): void {
        const leaderNode = this._characterNodes[this._leaderIndex];
        if (!leaderNode) return;

        const rigidBody = leaderNode.getComponent(RigidBody2D);
        if (!rigidBody) return;

        const vel = rigidBody.linearVelocity;
        const speed = vel.length();

        if (speed < this.minSpeed && speed > 0) {
            const normalized = vel.normalize();
            rigidBody.linearVelocity = new Vec2(
                normalized.x * this.minSpeed,
                normalized.y * this.minSpeed
            );
        } else if (speed > this.maxSpeed) {
            const normalized = vel.normalize();
            rigidBody.linearVelocity = new Vec2(
                normalized.x * this.maxSpeed,
                normalized.y * this.maxSpeed
            );
        }
    }

    /**
     * 碰撞回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        const enemy = otherCollider.node.getComponent(Enemy);
        if (enemy) {
            this.onHitEnemy(enemy);
        }

        // 增加技能能量
        this.addTeamEnergy(5);

        // 增加连击
        GameManager.instance?.addCombo();
    }

    /**
     * 击中敌人
     */
    private onHitEnemy(enemy: Enemy): void {
        // 计算所有角色的总伤害
        let totalDamage = 0;

        for (let i = 0; i < this._characterData.length; i++) {
            const data = this._characterData[i];
            if (data.currentHP <= 0) continue;

            // 基础伤害
            let damage = data.stats.attack;

            // 暴击计算
            if (Math.random() < data.stats.critRate) {
                damage *= data.stats.critDamage;
                console.log(`${data.config.name} 暴击!`);
            }

            // 元素克制
            const elementBonus = this.calculateElementBonus(data.config.element, enemy);
            damage *= elementBonus;

            // 队长技能加成
            damage *= this.getLeaderSkillBonus(i);

            totalDamage += damage;
        }

        enemy.takeDamage(totalDamage);
        console.log(`队伍造成 ${totalDamage.toFixed(1)} 总伤害`);
    }

    /**
     * 计算元素克制
     */
    private calculateElementBonus(attackerElement: ElementType, enemy: Enemy): number {
        // 简单的元素克制系统
        // 火克风, 风克雷, 雷克水, 水克火
        // 光暗互克
        const elementAdvantage: { [key: string]: string } = {
            [ElementType.FIRE]: ElementType.WIND,
            [ElementType.WIND]: ElementType.THUNDER,
            [ElementType.THUNDER]: ElementType.WATER,
            [ElementType.WATER]: ElementType.FIRE,
            [ElementType.LIGHT]: ElementType.DARK,
            [ElementType.DARK]: ElementType.LIGHT
        };

        // 这里假设敌人有一个element属性，实际需要在Enemy类中添加
        // 暂时返回1.0（无加成）
        return 1.0;
    }

    /**
     * 获取队长技能加成
     */
    private getLeaderSkillBonus(characterIndex: number): number {
        const leaderData = this._characterData[this._leaderIndex];
        if (!leaderData?.config.leaderSkill) return 1.0;

        const leaderSkill = leaderData.config.leaderSkill;
        const targetData = this._characterData[characterIndex];

        // 检查队长技能效果
        switch (leaderSkill.effectType) {
            case 'atk_boost_fire':
                if (targetData.config.element === ElementType.FIRE) {
                    return 1 + leaderSkill.effectValue;
                }
                break;
            case 'hp_boost_water':
                // HP加成在初始化时处理
                break;
            case 'speed_boost_wind':
                if (targetData.config.element === ElementType.WIND) {
                    return 1 + leaderSkill.effectValue * 0.5; // 速度转换为伤害加成
                }
                break;
            case 'crit_damage_boost':
                // 已在暴击计算中处理
                break;
            case 'def_boost':
                // 防御加成
                break;
            case 'skill_boost':
                // 技能伤害加成
                break;
        }

        return 1.0;
    }

    /**
     * 使用队伍技能
     */
    public useTeamSkill(): boolean {
        if (this._isUsingSkill) return false;

        // 检查所有角色是否有技能可用
        let skillUsed = false;

        for (let i = 0; i < this._characterData.length; i++) {
            const data = this._characterData[i];
            if (data.currentHP <= 0) continue;
            if (this._skillCooldowns[i] > 0) continue;
            if (data.skillEnergy < data.config.skill.energyCost) continue;

            // 使用技能
            this.executeSkill(i);
            skillUsed = true;
        }

        return skillUsed;
    }

    /**
     * 执行角色技能
     */
    private executeSkill(characterIndex: number): void {
        const data = this._characterData[characterIndex];
        const skill = data.config.skill;

        console.log(`${data.config.name} 使用技能: ${skill.name}`);

        this._isUsingSkill = true;
        data.skillEnergy = 0;
        this._skillCooldowns[characterIndex] = skill.cooldown;

        // 技能特效
        this.playSkillEffect(characterIndex);

        // 计算技能伤害
        const baseDamage = data.stats.attack * skill.damageMultiplier * data.stats.skillPower;

        // 对所有敌人造成伤害
        const enemies = GameManager.instance?.getEnemies() || [];
        for (const enemyNode of enemies) {
            const enemy = enemyNode.getComponent(Enemy);
            if (enemy) {
                enemy.takeDamage(baseDamage);
            }
        }

        // 技能结束
        this.scheduleOnce(() => {
            this._isUsingSkill = false;
        }, 0.5);
    }

    /**
     * 播放技能特效
     */
    private playSkillEffect(characterIndex: number): void {
        const charNode = this._characterNodes[characterIndex];
        if (!charNode) return;

        const data = this._characterData[characterIndex];
        const elementColor = new Color().fromHEX(
            CharacterDatabase.instance.getElementColor(data.config.element)
        );

        // 创建特效节点
        const effectNode = new Node('SkillEffect');
        const graphics = effectNode.addComponent(Graphics);
        
        graphics.strokeColor = elementColor;
        graphics.lineWidth = 4;
        
        // 绘制扩散圆圈
        for (let i = 0; i < 3; i++) {
            graphics.circle(0, 0, 50 + i * 30);
        }
        graphics.stroke();

        charNode.addChild(effectNode);

        // 动画
        effectNode.setScale(0.1, 0.1, 1);
        tween(effectNode)
            .to(0.3, { scale: new Vec3(2, 2, 1) }, { easing: 'quadOut' })
            .call(() => {
                effectNode.destroy();
            })
            .start();
    }

    /**
     * 给队伍增加能量
     */
    public addTeamEnergy(amount: number): void {
        for (const data of this._characterData) {
            if (data.currentHP > 0) {
                data.skillEnergy = Math.min(
                    data.skillEnergy + amount,
                    data.config.skill.energyCost
                );
            }
        }
    }

    /**
     * 队伍受到伤害
     */
    public takeDamage(damage: number): void {
        // 伤害分摊给所有存活角色
        const aliveCharacters = this._characterData.filter(d => d.currentHP > 0);
        if (aliveCharacters.length === 0) {
            GameManager.instance?.gameOver();
            return;
        }

        const damagePerCharacter = damage / aliveCharacters.length;

        for (const data of aliveCharacters) {
            // 计算实际伤害（考虑防御）
            const actualDamage = Math.max(1, damagePerCharacter - data.stats.defense * 0.5);
            data.currentHP -= actualDamage;

            if (data.currentHP <= 0) {
                data.currentHP = 0;
                this.onCharacterDeath(data);
            }
        }

        // 检查是否全灭
        if (this._characterData.every(d => d.currentHP <= 0)) {
            GameManager.instance?.gameOver();
        }
    }

    /**
     * 角色死亡
     */
    private onCharacterDeath(data: { config: CharacterConfig; instance: CharacterInstance }): void {
        console.log(`${data.config.name} 阵亡！`);

        // 找到对应的节点并灰化
        const index = this._characterData.findIndex(d => d.instance.uniqueId === data.instance.uniqueId);
        if (index >= 0 && this._characterNodes[index]) {
            const node = this._characterNodes[index];
            // 可以添加灰化效果
            node.active = false;

            // 如果是队长死亡，切换到下一个存活角色
            if (index === this._leaderIndex) {
                this.switchToNextAliveCharacter();
            }
        }
    }

    /**
     * 切换到下一个存活角色
     */
    private switchToNextAliveCharacter(): void {
        for (let i = 0; i < this._characterData.length; i++) {
            if (this._characterData[i].currentHP > 0 && i !== this._leaderIndex) {
                // 转移物理组件
                this.transferPhysics(this._leaderIndex, i);
                this._leaderIndex = i;
                console.log(`切换队长到: ${this._characterData[i].config.name}`);
                return;
            }
        }
    }

    /**
     * 转移物理组件
     */
    private transferPhysics(fromIndex: number, toIndex: number): void {
        const fromNode = this._characterNodes[fromIndex];
        const toNode = this._characterNodes[toIndex];

        if (!fromNode || !toNode) return;

        // 获取当前速度
        const fromRB = fromNode.getComponent(RigidBody2D);
        const velocity = fromRB?.linearVelocity || new Vec2(0, 0);

        // 移除旧的物理组件
        const oldCollider = fromNode.getComponent(CircleCollider2D);
        if (oldCollider) {
            oldCollider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            oldCollider.destroy();
        }
        fromRB?.destroy();

        // 为新节点添加物理组件
        const newRB = toNode.addComponent(RigidBody2D);
        newRB.type = ERigidBody2DType.Dynamic;
        newRB.gravityScale = 1;
        newRB.linearDamping = 0.1;
        newRB.angularDamping = 0.5;
        newRB.linearVelocity = velocity;

        const config = this._characterData[toIndex].config;
        const newCollider = toNode.addComponent(CircleCollider2D);
        newCollider.radius = config.colliderRadius;
        newCollider.restitution = 0.8;
        newCollider.friction = 0.2;
        newCollider.density = 1;
        newCollider.apply();
        newCollider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }

    /**
     * 施加弹射力
     */
    public applyFlipForce(force: Vec2): void {
        const leaderNode = this._characterNodes[this._leaderIndex];
        if (!leaderNode) return;

        const rigidBody = leaderNode.getComponent(RigidBody2D);
        if (!rigidBody) return;

        const currentVel = rigidBody.linearVelocity;
        rigidBody.linearVelocity = new Vec2(
            currentVel.x + force.x,
            force.y
        );
    }

    /**
     * 获取队伍当前HP百分比
     */
    public getTeamHPPercent(): number {
        let totalHP = 0;
        let totalMaxHP = 0;

        for (const data of this._characterData) {
            totalHP += data.currentHP;
            totalMaxHP += data.stats.hp;
        }

        return totalMaxHP > 0 ? totalHP / totalMaxHP : 0;
    }

    /**
     * 获取队伍技能能量百分比
     */
    public getTeamEnergyPercent(): number {
        let totalEnergy = 0;
        let totalMaxEnergy = 0;

        for (const data of this._characterData) {
            totalEnergy += data.skillEnergy;
            totalMaxEnergy += data.config.skill.energyCost;
        }

        return totalMaxEnergy > 0 ? totalEnergy / totalMaxEnergy : 0;
    }

    /**
     * 清除队伍
     */
    public clearTeam(): void {
        for (const node of this._characterNodes) {
            const collider = node.getComponent(CircleCollider2D);
            if (collider) {
                collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            }
            node.destroy();
        }

        this._characterNodes = [];
        this._characterData = [];
        this._positionHistory = [];
        this._skillCooldowns = [];
        this._leaderIndex = 0;
    }

    onDestroy() {
        this.clearTeam();
        if (TeamBattle._instance === this) {
            TeamBattle._instance = null;
        }
    }
}
