import { _decorator, Component, Node, Vec3, Color, Label, UITransform, Graphics, tween, Tween } from 'cc';
import { ElementSystem, ElementAura, ElementReaction } from './ElementSystem';
import { ElementType } from './CharacterData';
import { DoodleGraphics } from './DoodleGraphics';
const { ccclass, property } = _decorator;

/**
 * 伤害类型
 */
export enum DamageType {
    PHYSICAL = 'physical',
    MAGICAL = 'magical',
    TRUE = 'true'           // 真实伤害，无视防御
}

/**
 * 伤害信息
 */
export interface DamageInfo {
    baseDamage: number;
    damageType: DamageType;
    attackerElement: ElementType;
    attackerLevel: number;
    isCritical: boolean;
    critMultiplier: number;
    skillMultiplier: number;
    sourceId: string;
}

/**
 * 伤害结果
 */
export interface DamageResult {
    finalDamage: number;
    baseDamage: number;
    elementMultiplier: number;
    criticalMultiplier: number;
    defenseReduction: number;
    isCritical: boolean;
    isAdvantage: boolean;
    isDisadvantage: boolean;
    reaction: ElementReaction | null;
    reactionDamage: number;
}

/**
 * 伤害飘字配置
 */
export interface DamageTextConfig {
    damage: number;
    isCritical: boolean;
    isAdvantage: boolean;
    isDisadvantage: boolean;
    element?: ElementType;
    reaction?: ElementReaction | null;
}

/**
 * 伤害系统
 * Damage System - Handles damage calculation, effects, and floating text
 */
@ccclass('DamageSystem')
export class DamageSystem extends Component {
    private static _instance: DamageSystem | null = null;

    @property({ tooltip: '伤害飘字持续时间' })
    public floatDuration: number = 1.0;

    @property({ tooltip: '伤害飘字上升高度' })
    public floatHeight: number = 80;

    @property({ tooltip: '击中特效持续时间' })
    public hitEffectDuration: number = 0.3;

    // 对象池
    private _damageTextPool: Node[] = [];
    private _hitEffectPool: Node[] = [];

    public static get instance(): DamageSystem | null {
        return DamageSystem._instance;
    }

    onLoad() {
        if (DamageSystem._instance) {
            this.node.destroy();
            return;
        }
        DamageSystem._instance = this;
    }

    // ==================== 伤害计算 ====================

    /**
     * 计算完整伤害
     */
    public calculateDamage(
        damageInfo: DamageInfo,
        defenderElement: ElementType,
        defenderLevel: number,
        defenderDefense: number,
        defenderAura: ElementAura | null = null
    ): DamageResult {
        let damage = damageInfo.baseDamage;

        // 1. 技能倍率
        damage *= damageInfo.skillMultiplier;

        // 2. 暴击计算
        let critMultiplier = 1.0;
        if (damageInfo.isCritical) {
            critMultiplier = damageInfo.critMultiplier;
            damage *= critMultiplier;
        }

        // 3. 元素克制计算
        const elementResult = ElementSystem.instance.calculateElementDamage(
            damage,
            damageInfo.attackerElement,
            defenderElement,
            defenderAura,
            damageInfo.attackerLevel,
            defenderLevel
        );

        damage = elementResult.finalDamage;
        const reactionDamage = elementResult.reactionDamage;

        // 4. 防御减免（真实伤害无视防御）
        let defenseReduction = 0;
        if (damageInfo.damageType !== DamageType.TRUE) {
            // 防御公式：减伤 = 防御 / (防御 + 100 + 等级*5)
            const defenseValue = defenderDefense / (defenderDefense + 100 + defenderLevel * 5);
            defenseReduction = damage * defenseValue;
            damage -= defenseReduction;
        }

        // 确保最小伤害为1
        damage = Math.max(1, Math.floor(damage));

        return {
            finalDamage: damage,
            baseDamage: damageInfo.baseDamage,
            elementMultiplier: elementResult.damageMultiplier,
            criticalMultiplier: critMultiplier,
            defenseReduction: Math.floor(defenseReduction),
            isCritical: damageInfo.isCritical,
            isAdvantage: elementResult.isAdvantage,
            isDisadvantage: elementResult.isDisadvantage,
            reaction: elementResult.reaction,
            reactionDamage: reactionDamage
        };
    }

    /**
     * 计算碰撞伤害（弹射专用）
     */
    public calculateCollisionDamage(
        baseAttack: number,
        speed: number,
        maxSpeed: number,
        attackerElement: ElementType,
        attackerLevel: number,
        critRate: number,
        critDamage: number,
        defenderElement: ElementType,
        defenderLevel: number,
        defenderDefense: number,
        defenderAura: ElementAura | null = null
    ): DamageResult {
        // 速度加成：速度越快伤害越高
        const speedRatio = Math.min(1.5, speed / maxSpeed);
        const speedBonus = 1 + speedRatio * 0.5; // 最高1.75倍

        // 暴击判定
        const isCritical = Math.random() < critRate;

        const damageInfo: DamageInfo = {
            baseDamage: baseAttack * speedBonus,
            damageType: DamageType.PHYSICAL,
            attackerElement,
            attackerLevel,
            isCritical,
            critMultiplier: critDamage,
            skillMultiplier: 1.0,
            sourceId: 'collision'
        };

        return this.calculateDamage(
            damageInfo,
            defenderElement,
            defenderLevel,
            defenderDefense,
            defenderAura
        );
    }

    // ==================== 伤害飘字 ====================

    /**
     * 显示伤害飘字
     */
    public showDamageText(position: Vec3, config: DamageTextConfig): void {
        const textNode = this.getDamageTextNode();
        textNode.setPosition(position.x, position.y + 30, 0);
        textNode.parent = this.node;

        // 配置文字
        const label = textNode.getComponent(Label) || textNode.addComponent(Label);
        
        // 格式化伤害数字
        let damageText = Math.floor(config.damage).toString();
        
        // 根据情况调整样式
        if (config.isCritical) {
            damageText = `${damageText}!`;
            label.fontSize = 36;
            label.color = new Color(255, 50, 50, 255); // 红色暴击
        } else if (config.isAdvantage) {
            label.fontSize = 28;
            label.color = new Color(255, 200, 50, 255); // 金色克制
        } else if (config.isDisadvantage) {
            label.fontSize = 22;
            label.color = new Color(150, 150, 150, 255); // 灰色被克
        } else {
            label.fontSize = 24;
            label.color = Color.WHITE;
        }

        // 元素着色
        if (config.element) {
            const elementColor = ElementSystem.instance.getElementColor(config.element);
            label.color = new Color().fromHEX(elementColor);
            if (config.isCritical) {
                label.fontSize = 36;
            }
        }

        label.string = damageText;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;

        // 确保有 UITransform
        if (!textNode.getComponent(UITransform)) {
            textNode.addComponent(UITransform);
        }

        // 动画
        textNode.setScale(0.5, 0.5, 1);
        textNode.active = true;

        // 随机水平偏移
        const randomX = (Math.random() - 0.5) * 40;

        tween(textNode)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .to(this.floatDuration - 0.2, { 
                position: new Vec3(position.x + randomX, position.y + this.floatHeight, 0)
            }, { easing: 'quadOut' })
            .call(() => {
                this.recycleDamageText(textNode);
            })
            .start();

        // 淡出效果
        const uiOpacity = textNode.getComponent('cc.UIOpacity') as any;
        if (uiOpacity) {
            uiOpacity.opacity = 255;
            tween(uiOpacity)
                .delay(this.floatDuration * 0.6)
                .to(this.floatDuration * 0.4, { opacity: 0 })
                .start();
        }

        // 显示元素反应文字
        if (config.reaction) {
            this.showReactionText(position, config.reaction);
        }
    }

    /**
     * 显示元素反应文字
     */
    private showReactionText(position: Vec3, reaction: ElementReaction): void {
        const textNode = this.getDamageTextNode();
        textNode.setPosition(position.x, position.y + 60, 0);
        textNode.parent = this.node;

        const label = textNode.getComponent(Label) || textNode.addComponent(Label);
        label.string = reaction.name;
        label.fontSize = 20;
        label.color = new Color(255, 220, 100, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;

        textNode.setScale(0.3, 0.3, 1);
        textNode.active = true;

        tween(textNode)
            .to(0.15, { scale: new Vec3(1.3, 1.3, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .to(0.8, { position: new Vec3(position.x, position.y + 100, 0) })
            .call(() => {
                this.recycleDamageText(textNode);
            })
            .start();
    }

    /**
     * 显示治疗飘字
     */
    public showHealText(position: Vec3, amount: number): void {
        const textNode = this.getDamageTextNode();
        textNode.setPosition(position.x, position.y + 30, 0);
        textNode.parent = this.node;

        const label = textNode.getComponent(Label) || textNode.addComponent(Label);
        label.string = `+${Math.floor(amount)}`;
        label.fontSize = 24;
        label.color = new Color(100, 255, 100, 255); // 绿色治疗
        label.horizontalAlign = Label.HorizontalAlign.CENTER;

        textNode.setScale(0.5, 0.5, 1);
        textNode.active = true;

        tween(textNode)
            .to(0.1, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .to(this.floatDuration - 0.2, { 
                position: new Vec3(position.x, position.y + this.floatHeight, 0)
            })
            .call(() => {
                this.recycleDamageText(textNode);
            })
            .start();
    }

    /**
     * 获取伤害飘字节点（对象池）
     */
    private getDamageTextNode(): Node {
        let node = this._damageTextPool.pop();
        if (!node) {
            node = new Node('DamageText');
            node.addComponent(Label);
            node.addComponent(UITransform);
        }
        return node;
    }

    /**
     * 回收伤害飘字节点
     */
    private recycleDamageText(node: Node): void {
        node.active = false;
        node.removeFromParent();
        Tween.stopAllByTarget(node);
        this._damageTextPool.push(node);
    }

    // ==================== 击中特效 ====================

    /**
     * 显示击中特效
     */
    public showHitEffect(position: Vec3, element?: ElementType, isCritical: boolean = false): void {
        const effectNode = this.getHitEffectNode();
        effectNode.setPosition(position);
        effectNode.parent = this.node;

        const graphics = effectNode.getComponent(Graphics) || effectNode.addComponent(Graphics);
        graphics.clear();

        // 获取元素颜色
        let effectColor = new Color(255, 255, 255, 200);
        if (element) {
            effectColor = new Color().fromHEX(ElementSystem.instance.getElementColor(element));
            effectColor.a = 200;
        }

        // 绘制击中效果
        const size = isCritical ? 50 : 35;
        
        // 爆炸线条
        graphics.strokeColor = effectColor;
        graphics.lineWidth = isCritical ? 4 : 2;

        const lineCount = isCritical ? 12 : 8;
        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2;
            const innerRadius = size * 0.3;
            const outerRadius = size;
            
            graphics.moveTo(
                Math.cos(angle) * innerRadius,
                Math.sin(angle) * innerRadius
            );
            graphics.lineTo(
                Math.cos(angle) * outerRadius,
                Math.sin(angle) * outerRadius
            );
        }
        graphics.stroke();

        // 中心圆
        graphics.fillColor = new Color(effectColor.r, effectColor.g, effectColor.b, 150);
        graphics.circle(0, 0, size * 0.25);
        graphics.fill();

        effectNode.setScale(0.3, 0.3, 1);
        effectNode.active = true;

        // 动画
        tween(effectNode)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
            .to(this.hitEffectDuration - 0.1, { scale: new Vec3(1.5, 1.5, 1) })
            .call(() => {
                this.recycleHitEffect(effectNode);
            })
            .start();
    }

    /**
     * 显示元素反应特效
     */
    public showReactionEffect(position: Vec3, reaction: ElementReaction): void {
        const effectNode = this.getHitEffectNode();
        effectNode.setPosition(position);
        effectNode.parent = this.node;

        const graphics = effectNode.getComponent(Graphics) || effectNode.addComponent(Graphics);
        graphics.clear();

        // 根据反应类型绘制不同特效
        const size = 60;

        switch (reaction.type) {
            case 'vaporize':
            case 'melt':
                // 蒸汽/融化效果 - 波浪圈
                graphics.strokeColor = new Color(255, 150, 50, 200);
                graphics.lineWidth = 3;
                for (let i = 0; i < 3; i++) {
                    graphics.circle(0, 0, size * (0.5 + i * 0.25));
                }
                graphics.stroke();
                break;

            case 'overload':
                // 超载效果 - 爆炸
                graphics.fillColor = new Color(255, 100, 50, 180);
                DoodleGraphics.drawStar(graphics, 0, 0, size, 8);
                break;

            case 'electro_charge':
                // 感电效果 - 闪电
                graphics.strokeColor = new Color(150, 150, 255, 220);
                graphics.lineWidth = 3;
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    graphics.moveTo(0, 0);
                    const zigzag = [
                        { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 },
                        { x: Math.cos(angle + 0.3) * 35, y: Math.sin(angle + 0.3) * 35 },
                        { x: Math.cos(angle) * size, y: Math.sin(angle) * size }
                    ];
                    for (const p of zigzag) {
                        graphics.lineTo(p.x, p.y);
                    }
                }
                graphics.stroke();
                break;

            case 'freeze':
                // 冻结效果 - 冰晶
                graphics.fillColor = new Color(150, 220, 255, 180);
                DoodleGraphics.drawStar(graphics, 0, 0, size, 6);
                break;

            case 'light_burst':
            case 'dark_corrupt':
                // 光暗效果 - 大爆发
                graphics.fillColor = reaction.type === 'light_burst' 
                    ? new Color(255, 255, 200, 200) 
                    : new Color(100, 50, 150, 200);
                DoodleGraphics.drawStar(graphics, 0, 0, size * 1.2, 12);
                break;

            default:
                // 默认效果
                graphics.strokeColor = new Color(255, 220, 100, 200);
                graphics.lineWidth = 2;
                graphics.circle(0, 0, size);
                graphics.stroke();
        }

        effectNode.setScale(0.1, 0.1, 1);
        effectNode.active = true;

        tween(effectNode)
            .to(0.15, { scale: new Vec3(1.3, 1.3, 1) })
            .to(0.35, { scale: new Vec3(1.8, 1.8, 1) })
            .call(() => {
                this.recycleHitEffect(effectNode);
            })
            .start();
    }

    /**
     * 获取击中特效节点（对象池）
     */
    private getHitEffectNode(): Node {
        let node = this._hitEffectPool.pop();
        if (!node) {
            node = new Node('HitEffect');
            node.addComponent(Graphics);
            node.addComponent(UITransform);
        }
        return node;
    }

    /**
     * 回收击中特效节点
     */
    private recycleHitEffect(node: Node): void {
        node.active = false;
        node.removeFromParent();
        Tween.stopAllByTarget(node);
        const graphics = node.getComponent(Graphics);
        if (graphics) graphics.clear();
        this._hitEffectPool.push(node);
    }

    // ==================== 便捷方法 ====================

    /**
     * 处理碰撞伤害（一站式方法）
     */
    public processCollisionDamage(
        position: Vec3,
        baseAttack: number,
        speed: number,
        maxSpeed: number,
        attackerElement: ElementType,
        attackerLevel: number,
        critRate: number,
        critDamage: number,
        defenderElement: ElementType,
        defenderLevel: number,
        defenderDefense: number,
        defenderAura: ElementAura | null = null
    ): DamageResult {
        // 计算伤害
        const result = this.calculateCollisionDamage(
            baseAttack, speed, maxSpeed,
            attackerElement, attackerLevel, critRate, critDamage,
            defenderElement, defenderLevel, defenderDefense, defenderAura
        );

        // 显示伤害飘字
        this.showDamageText(position, {
            damage: result.finalDamage,
            isCritical: result.isCritical,
            isAdvantage: result.isAdvantage,
            isDisadvantage: result.isDisadvantage,
            element: attackerElement,
            reaction: result.reaction
        });

        // 显示击中特效
        this.showHitEffect(position, attackerElement, result.isCritical);

        // 显示元素反应特效
        if (result.reaction) {
            this.showReactionEffect(position, result.reaction);
        }

        return result;
    }

    onDestroy() {
        // 清理对象池
        this._damageTextPool.forEach(node => node.destroy());
        this._hitEffectPool.forEach(node => node.destroy());
        this._damageTextPool = [];
        this._hitEffectPool = [];

        if (DamageSystem._instance === this) {
            DamageSystem._instance = null;
        }
    }
}
