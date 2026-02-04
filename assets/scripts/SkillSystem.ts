import { _decorator, Component, Node, Vec2, Vec3, Prefab, instantiate, tween, Color, Sprite } from 'cc';
import { Character } from './Character';
import { Enemy } from './Enemy';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * 技能类型枚举
 */
export enum SkillType {
    DAMAGE = 0,         // 伤害技能
    HEAL = 1,           // 治疗技能
    BUFF = 2,           // 增益技能
    DEBUFF = 3,         // 减益技能
    SPECIAL = 4         // 特殊技能
}

/**
 * 技能目标枚举
 */
export enum SkillTarget {
    SINGLE_ENEMY = 0,   // 单体敌人
    ALL_ENEMIES = 1,    // 全体敌人
    SELF = 2,           // 自身
    ALL_ALLIES = 3,     // 全体友方
    AREA = 4            // 范围
}

/**
 * 技能数据接口
 */
export interface SkillData {
    id: string;
    name: string;
    description: string;
    type: SkillType;
    target: SkillTarget;
    baseDamage: number;
    cooldown: number;
    energyCost: number;
    effectDuration: number;
}

/**
 * 技能系统类 - 管理技能的释放和效果
 * Skill System - Manages skill casting and effects
 */
@ccclass('SkillSystem')
export class SkillSystem extends Component {
    @property({ type: Node, tooltip: '技能特效容器' })
    public effectContainer: Node | null = null;

    @property({ type: Prefab, tooltip: '伤害特效预制体' })
    public damageEffectPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: '治疗特效预制体' })
    public healEffectPrefab: Prefab | null = null;

    private static _instance: SkillSystem | null = null;
    private _skillDatabase: Map<string, SkillData> = new Map();

    public static get instance(): SkillSystem | null {
        return SkillSystem._instance;
    }

    onLoad() {
        if (SkillSystem._instance) {
            this.node.destroy();
            return;
        }
        SkillSystem._instance = this;
        
        // 初始化技能数据库
        this.initSkillDatabase();
    }

    /**
     * 初始化技能数据库
     */
    private initSkillDatabase(): void {
        // 基础伤害技能
        this._skillDatabase.set('fireball', {
            id: 'fireball',
            name: '火球术',
            description: '向敌人发射火球，造成伤害',
            type: SkillType.DAMAGE,
            target: SkillTarget.ALL_ENEMIES,
            baseDamage: 50,
            cooldown: 5,
            energyCost: 100,
            effectDuration: 0.5
        });

        // 治疗技能
        this._skillDatabase.set('heal', {
            id: 'heal',
            name: '治疗术',
            description: '恢复自身生命值',
            type: SkillType.HEAL,
            target: SkillTarget.SELF,
            baseDamage: 30, // 这里表示治疗量
            cooldown: 8,
            energyCost: 80,
            effectDuration: 1
        });

        // 增益技能
        this._skillDatabase.set('powerup', {
            id: 'powerup',
            name: '力量强化',
            description: '短时间内提升攻击力',
            type: SkillType.BUFF,
            target: SkillTarget.SELF,
            baseDamage: 0,
            cooldown: 10,
            energyCost: 60,
            effectDuration: 5
        });

        // 范围伤害技能
        this._skillDatabase.set('meteor', {
            id: 'meteor',
            name: '陨石坠落',
            description: '召唤陨石对所有敌人造成大量伤害',
            type: SkillType.DAMAGE,
            target: SkillTarget.ALL_ENEMIES,
            baseDamage: 100,
            cooldown: 15,
            energyCost: 100,
            effectDuration: 1
        });

        // 特殊技能 - 时间停止（参考游戏名）
        this._skillDatabase.set('timestop', {
            id: 'timestop',
            name: '时间停止',
            description: '短暂停止敌人的行动',
            type: SkillType.SPECIAL,
            target: SkillTarget.ALL_ENEMIES,
            baseDamage: 0,
            cooldown: 20,
            energyCost: 100,
            effectDuration: 3
        });

        console.log(`技能数据库初始化完成，共 ${this._skillDatabase.size} 个技能`);
    }

    /**
     * 获取技能数据
     */
    public getSkillData(skillId: string): SkillData | undefined {
        return this._skillDatabase.get(skillId);
    }

    /**
     * 释放技能
     */
    public castSkill(skillId: string, caster: Character, targetPosition?: Vec2): boolean {
        const skillData = this._skillDatabase.get(skillId);
        if (!skillData) {
            console.error(`技能不存在: ${skillId}`);
            return false;
        }

        // 检查能量
        if (caster.skillEnergy < skillData.energyCost) {
            console.log(`能量不足，需要 ${skillData.energyCost}，当前 ${caster.skillEnergy}`);
            return false;
        }

        console.log(`释放技能: ${skillData.name}`);

        // 执行技能效果
        switch (skillData.type) {
            case SkillType.DAMAGE:
                this.executeDamageSkill(skillData, caster);
                break;
            case SkillType.HEAL:
                this.executeHealSkill(skillData, caster);
                break;
            case SkillType.BUFF:
                this.executeBuffSkill(skillData, caster);
                break;
            case SkillType.DEBUFF:
                this.executeDebuffSkill(skillData, caster);
                break;
            case SkillType.SPECIAL:
                this.executeSpecialSkill(skillData, caster);
                break;
        }

        // 播放技能特效
        this.playSkillEffect(skillData, caster.node.position);

        return true;
    }

    /**
     * 执行伤害技能
     */
    private executeDamageSkill(skillData: SkillData, caster: Character): void {
        if (!GameManager.instance) return;

        const enemies = GameManager.instance.getEnemies();
        const damage = skillData.baseDamage + caster.attack;

        switch (skillData.target) {
            case SkillTarget.ALL_ENEMIES:
                for (const enemyNode of enemies) {
                    const enemy = enemyNode.getComponent(Enemy);
                    if (enemy) {
                        enemy.takeDamage(damage);
                    }
                }
                break;
            case SkillTarget.SINGLE_ENEMY:
                // 选择最近的敌人
                if (enemies.length > 0) {
                    const closestEnemy = this.findClosestEnemy(caster.node.position, enemies);
                    if (closestEnemy) {
                        const enemy = closestEnemy.getComponent(Enemy);
                        if (enemy) {
                            enemy.takeDamage(damage * 2); // 单体技能伤害更高
                        }
                    }
                }
                break;
        }
    }

    /**
     * 执行治疗技能
     */
    private executeHealSkill(skillData: SkillData, caster: Character): void {
        // 直接修改角色HP（需要在Character类中添加heal方法）
        const healAmount = skillData.baseDamage;
        console.log(`${caster.characterName} 恢复了 ${healAmount} 生命值`);
        // 注意：需要在Character类中实现heal方法
    }

    /**
     * 执行增益技能
     */
    private executeBuffSkill(skillData: SkillData, caster: Character): void {
        // 临时提升攻击力
        const originalAttack = caster.attack;
        caster.attack *= 2;
        
        console.log(`${caster.characterName} 攻击力提升！(${originalAttack} -> ${caster.attack})`);

        // 持续时间结束后恢复
        this.scheduleOnce(() => {
            caster.attack = originalAttack;
            console.log(`${caster.characterName} 攻击力恢复正常`);
        }, skillData.effectDuration);
    }

    /**
     * 执行减益技能
     */
    private executeDebuffSkill(skillData: SkillData, caster: Character): void {
        if (!GameManager.instance) return;

        const enemies = GameManager.instance.getEnemies();
        
        for (const enemyNode of enemies) {
            const enemy = enemyNode.getComponent(Enemy);
            if (enemy) {
                // 降低敌人攻击力
                const originalAttack = enemy.attack;
                enemy.attack *= 0.5;

                this.scheduleOnce(() => {
                    if (enemy && enemy.isValid) {
                        enemy.attack = originalAttack;
                    }
                }, skillData.effectDuration);
            }
        }
    }

    /**
     * 执行特殊技能
     */
    private executeSpecialSkill(skillData: SkillData, caster: Character): void {
        if (skillData.id === 'timestop') {
            console.log('时间停止！');
            // 暂停物理系统或减慢游戏速度
            // 这里可以通过调整timeScale来实现
        }
    }

    /**
     * 播放技能特效
     */
    private playSkillEffect(skillData: SkillData, position: Vec3): void {
        if (!this.effectContainer) return;

        // 根据技能类型选择特效
        let effectPrefab: Prefab | null = null;
        
        if (skillData.type === SkillType.DAMAGE && this.damageEffectPrefab) {
            effectPrefab = this.damageEffectPrefab;
        } else if (skillData.type === SkillType.HEAL && this.healEffectPrefab) {
            effectPrefab = this.healEffectPrefab;
        }

        if (effectPrefab) {
            const effect = instantiate(effectPrefab);
            effect.setPosition(position);
            this.effectContainer.addChild(effect);

            // 自动销毁特效
            this.scheduleOnce(() => {
                effect.destroy();
            }, skillData.effectDuration);
        }

        // 简单的屏幕闪烁效果
        this.playScreenFlash(skillData.type);
    }

    /**
     * 播放屏幕闪烁效果
     */
    private playScreenFlash(skillType: SkillType): void {
        // 可以通过全屏遮罩实现
        console.log(`播放技能特效: ${SkillType[skillType]}`);
    }

    /**
     * 找到最近的敌人
     */
    private findClosestEnemy(position: Vec3, enemies: Node[]): Node | null {
        let closest: Node | null = null;
        let minDistance = Infinity;

        for (const enemy of enemies) {
            const distance = Vec3.distance(position, enemy.position);
            if (distance < minDistance) {
                minDistance = distance;
                closest = enemy;
            }
        }

        return closest;
    }

    onDestroy() {
        if (SkillSystem._instance === this) {
            SkillSystem._instance = null;
        }
    }
}
