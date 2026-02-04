import { _decorator } from 'cc';
import { ElementType } from './CharacterData';

/**
 * 元素相克关系
 */
export interface ElementRelation {
    attacker: ElementType;
    defender: ElementType;
    damageMultiplier: number;   // 伤害倍率
    effectChanceBonus: number;  // 效果触发加成
    description: string;
}

/**
 * 元素反应类型
 */
export enum ElementReactionType {
    NONE = 'none',                  // 无反应
    MELT = 'melt',                  // 融化（火+水）
    VAPORIZE = 'vaporize',          // 蒸发（水+火）
    OVERLOAD = 'overload',          // 超载（火+雷）
    ELECTRO_CHARGE = 'electro_charge', // 感电（水+雷）
    SWIRL = 'swirl',                // 扩散（风+其他）
    CRYSTALLIZE = 'crystallize',    // 结晶（防御反应）
    BURN = 'burn',                  // 燃烧（火持续）
    FREEZE = 'freeze',              // 冻结（水+风）
    SHOCK = 'shock',                // 麻痹（雷持续）
    LIGHT_BURST = 'light_burst',    // 光爆（光+暗）
    DARK_CORRUPT = 'dark_corrupt'   // 暗蚀（暗+光）
}

/**
 * 元素反应配置
 */
export interface ElementReaction {
    type: ElementReactionType;
    name: string;
    description: string;
    elements: [ElementType, ElementType];   // 触发元素组合
    damageMultiplier: number;               // 反应伤害倍率
    effect?: {
        type: 'dot' | 'stun' | 'slow' | 'defense_down' | 'attack_down' | 'shield' | 'aoe';
        value: number;
        duration?: number;
        radius?: number;
    };
    cooldown: number;   // 反应冷却时间
}

/**
 * 元素附着状态
 */
export interface ElementAura {
    element: ElementType;
    strength: number;       // 附着强度 (0-100)
    duration: number;       // 剩余持续时间
    source: string;         // 来源ID
}

/**
 * 元素系统
 * Element System - Manages element interactions and reactions
 */
export class ElementSystem {
    private static _instance: ElementSystem | null = null;

    // 元素克制关系表
    private _relations: Map<string, ElementRelation> = new Map();

    // 元素反应配置
    private _reactions: Map<ElementReactionType, ElementReaction> = new Map();

    // 元素颜色
    private _elementColors: Map<ElementType, string> = new Map();

    // 元素图标
    private _elementIcons: Map<ElementType, string> = new Map();

    public static get instance(): ElementSystem {
        if (!ElementSystem._instance) {
            ElementSystem._instance = new ElementSystem();
            ElementSystem._instance.initSystem();
        }
        return ElementSystem._instance;
    }

    private initSystem(): void {
        this.initElementRelations();
        this.initElementReactions();
        this.initElementVisuals();
        console.log('元素系统初始化完成');
    }

    /**
     * 初始化元素克制关系
     * 
     * 克制关系（1.5倍伤害）:
     * 火 → 风 → 雷 → 水 → 火 (循环克制)
     * 光 ↔ 暗 (互相克制)
     * 
     * 被克制（0.5倍伤害）:
     * 反向关系
     * 
     * 同元素（0.75倍伤害）:
     * 同属性攻击
     */
    private initElementRelations(): void {
        // ========== 火属性关系 ==========
        this.addRelation(ElementType.FIRE, ElementType.WIND, 1.5, 20, '火克风：燃烧殆尽');
        this.addRelation(ElementType.FIRE, ElementType.WATER, 0.5, -20, '火被水克：水火不容');
        this.addRelation(ElementType.FIRE, ElementType.FIRE, 0.75, 0, '同属性抵抗');
        this.addRelation(ElementType.FIRE, ElementType.THUNDER, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.FIRE, ElementType.LIGHT, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.FIRE, ElementType.DARK, 1.0, 0, '无克制关系');

        // ========== 水属性关系 ==========
        this.addRelation(ElementType.WATER, ElementType.FIRE, 1.5, 20, '水克火：浇灭烈焰');
        this.addRelation(ElementType.WATER, ElementType.THUNDER, 0.5, -20, '水被雷克：导电危险');
        this.addRelation(ElementType.WATER, ElementType.WATER, 0.75, 0, '同属性抵抗');
        this.addRelation(ElementType.WATER, ElementType.WIND, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.WATER, ElementType.LIGHT, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.WATER, ElementType.DARK, 1.0, 0, '无克制关系');

        // ========== 风属性关系 ==========
        this.addRelation(ElementType.WIND, ElementType.THUNDER, 1.5, 20, '风克雷：扰乱电流');
        this.addRelation(ElementType.WIND, ElementType.FIRE, 0.5, -20, '风被火克：助燃烈焰');
        this.addRelation(ElementType.WIND, ElementType.WIND, 0.75, 0, '同属性抵抗');
        this.addRelation(ElementType.WIND, ElementType.WATER, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.WIND, ElementType.LIGHT, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.WIND, ElementType.DARK, 1.0, 0, '无克制关系');

        // ========== 雷属性关系 ==========
        this.addRelation(ElementType.THUNDER, ElementType.WATER, 1.5, 20, '雷克水：感电效应');
        this.addRelation(ElementType.THUNDER, ElementType.WIND, 0.5, -20, '雷被风克：风散雷电');
        this.addRelation(ElementType.THUNDER, ElementType.THUNDER, 0.75, 0, '同属性抵抗');
        this.addRelation(ElementType.THUNDER, ElementType.FIRE, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.THUNDER, ElementType.LIGHT, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.THUNDER, ElementType.DARK, 1.0, 0, '无克制关系');

        // ========== 光属性关系 ==========
        this.addRelation(ElementType.LIGHT, ElementType.DARK, 1.5, 25, '光克暗：驱散黑暗');
        this.addRelation(ElementType.LIGHT, ElementType.LIGHT, 0.75, 0, '同属性抵抗');
        this.addRelation(ElementType.LIGHT, ElementType.FIRE, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.LIGHT, ElementType.WATER, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.LIGHT, ElementType.WIND, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.LIGHT, ElementType.THUNDER, 1.0, 0, '无克制关系');

        // ========== 暗属性关系 ==========
        this.addRelation(ElementType.DARK, ElementType.LIGHT, 1.5, 25, '暗克光：吞噬光明');
        this.addRelation(ElementType.DARK, ElementType.DARK, 0.75, 0, '同属性抵抗');
        this.addRelation(ElementType.DARK, ElementType.FIRE, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.DARK, ElementType.WATER, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.DARK, ElementType.WIND, 1.0, 0, '无克制关系');
        this.addRelation(ElementType.DARK, ElementType.THUNDER, 1.0, 0, '无克制关系');
    }

    /**
     * 添加元素关系
     */
    private addRelation(
        attacker: ElementType, 
        defender: ElementType, 
        damageMultiplier: number, 
        effectChanceBonus: number,
        description: string
    ): void {
        const key = `${attacker}_${defender}`;
        this._relations.set(key, {
            attacker,
            defender,
            damageMultiplier,
            effectChanceBonus,
            description
        });
    }

    /**
     * 初始化元素反应
     */
    private initElementReactions(): void {
        // 蒸发反应（火 + 水 = 蒸发，水攻击火目标）
        this._reactions.set(ElementReactionType.VAPORIZE, {
            type: ElementReactionType.VAPORIZE,
            name: '蒸发',
            description: '水元素遇到火元素，产生剧烈蒸发',
            elements: [ElementType.WATER, ElementType.FIRE],
            damageMultiplier: 2.0,
            cooldown: 1
        });

        // 融化反应（水 + 火 = 融化，火攻击水目标）
        this._reactions.set(ElementReactionType.MELT, {
            type: ElementReactionType.MELT,
            name: '融化',
            description: '火元素遇到水元素，瞬间融化',
            elements: [ElementType.FIRE, ElementType.WATER],
            damageMultiplier: 1.5,
            effect: {
                type: 'dot',
                value: 50,
                duration: 3
            },
            cooldown: 1
        });

        // 超载反应（火 + 雷）
        this._reactions.set(ElementReactionType.OVERLOAD, {
            type: ElementReactionType.OVERLOAD,
            name: '超载',
            description: '火元素与雷元素碰撞，产生爆炸',
            elements: [ElementType.FIRE, ElementType.THUNDER],
            damageMultiplier: 1.8,
            effect: {
                type: 'aoe',
                value: 100,
                radius: 100
            },
            cooldown: 2
        });

        // 感电反应（水 + 雷）
        this._reactions.set(ElementReactionType.ELECTRO_CHARGE, {
            type: ElementReactionType.ELECTRO_CHARGE,
            name: '感电',
            description: '水元素导电，产生持续电击',
            elements: [ElementType.WATER, ElementType.THUNDER],
            damageMultiplier: 1.4,
            effect: {
                type: 'dot',
                value: 30,
                duration: 4
            },
            cooldown: 1.5
        });

        // 扩散反应（风 + 其他元素）
        this._reactions.set(ElementReactionType.SWIRL, {
            type: ElementReactionType.SWIRL,
            name: '扩散',
            description: '风元素扩散其他元素，造成范围伤害',
            elements: [ElementType.WIND, ElementType.FIRE], // 风可与多种元素反应
            damageMultiplier: 1.2,
            effect: {
                type: 'aoe',
                value: 50,
                radius: 150
            },
            cooldown: 1
        });

        // 冻结反应（水 + 风）
        this._reactions.set(ElementReactionType.FREEZE, {
            type: ElementReactionType.FREEZE,
            name: '冻结',
            description: '寒风凝结水元素，冻结目标',
            elements: [ElementType.WIND, ElementType.WATER],
            damageMultiplier: 1.0,
            effect: {
                type: 'stun',
                value: 1,
                duration: 2
            },
            cooldown: 5
        });

        // 燃烧反应（火持续）
        this._reactions.set(ElementReactionType.BURN, {
            type: ElementReactionType.BURN,
            name: '燃烧',
            description: '火元素附着，持续燃烧',
            elements: [ElementType.FIRE, ElementType.WIND],
            damageMultiplier: 1.0,
            effect: {
                type: 'dot',
                value: 40,
                duration: 5
            },
            cooldown: 0
        });

        // 麻痹反应（雷持续）
        this._reactions.set(ElementReactionType.SHOCK, {
            type: ElementReactionType.SHOCK,
            name: '麻痹',
            description: '雷元素麻痹目标，降低攻速',
            elements: [ElementType.THUNDER, ElementType.WATER],
            damageMultiplier: 1.0,
            effect: {
                type: 'slow',
                value: 30,
                duration: 3
            },
            cooldown: 3
        });

        // 光爆反应（光 + 暗）
        this._reactions.set(ElementReactionType.LIGHT_BURST, {
            type: ElementReactionType.LIGHT_BURST,
            name: '光爆',
            description: '光暗碰撞，产生毁灭性爆发',
            elements: [ElementType.LIGHT, ElementType.DARK],
            damageMultiplier: 2.5,
            effect: {
                type: 'aoe',
                value: 200,
                radius: 120
            },
            cooldown: 3
        });

        // 暗蚀反应（暗 + 光）
        this._reactions.set(ElementReactionType.DARK_CORRUPT, {
            type: ElementReactionType.DARK_CORRUPT,
            name: '暗蚀',
            description: '黑暗侵蚀光明，降低目标属性',
            elements: [ElementType.DARK, ElementType.LIGHT],
            damageMultiplier: 2.0,
            effect: {
                type: 'defense_down',
                value: 30,
                duration: 5
            },
            cooldown: 3
        });

        // 结晶反应（防御性反应）
        this._reactions.set(ElementReactionType.CRYSTALLIZE, {
            type: ElementReactionType.CRYSTALLIZE,
            name: '结晶',
            description: '元素结晶形成护盾',
            elements: [ElementType.WIND, ElementType.THUNDER],
            damageMultiplier: 0.5,
            effect: {
                type: 'shield',
                value: 100,
                duration: 10
            },
            cooldown: 5
        });
    }

    /**
     * 初始化元素视觉效果
     */
    private initElementVisuals(): void {
        // 元素颜色
        this._elementColors.set(ElementType.FIRE, '#FF4500');
        this._elementColors.set(ElementType.WATER, '#1E90FF');
        this._elementColors.set(ElementType.WIND, '#32CD32');
        this._elementColors.set(ElementType.THUNDER, '#FFD700');
        this._elementColors.set(ElementType.LIGHT, '#FFFACD');
        this._elementColors.set(ElementType.DARK, '#8B008B');

        // 元素图标（描述用）
        this._elementIcons.set(ElementType.FIRE, '🔥');
        this._elementIcons.set(ElementType.WATER, '💧');
        this._elementIcons.set(ElementType.WIND, '🌪️');
        this._elementIcons.set(ElementType.THUNDER, '⚡');
        this._elementIcons.set(ElementType.LIGHT, '✨');
        this._elementIcons.set(ElementType.DARK, '🌑');
    }

    // ==================== 核心计算方法 ====================

    /**
     * 计算元素伤害倍率
     */
    public getDamageMultiplier(attackerElement: ElementType, defenderElement: ElementType): number {
        const key = `${attackerElement}_${defenderElement}`;
        const relation = this._relations.get(key);
        return relation?.damageMultiplier ?? 1.0;
    }

    /**
     * 获取元素关系
     */
    public getRelation(attackerElement: ElementType, defenderElement: ElementType): ElementRelation | null {
        const key = `${attackerElement}_${defenderElement}`;
        return this._relations.get(key) ?? null;
    }

    /**
     * 检查是否克制
     */
    public isAdvantage(attackerElement: ElementType, defenderElement: ElementType): boolean {
        const multiplier = this.getDamageMultiplier(attackerElement, defenderElement);
        return multiplier > 1.0;
    }

    /**
     * 检查是否被克制
     */
    public isDisadvantage(attackerElement: ElementType, defenderElement: ElementType): boolean {
        const multiplier = this.getDamageMultiplier(attackerElement, defenderElement);
        return multiplier < 1.0;
    }

    /**
     * 计算元素反应
     */
    public calculateReaction(
        attackElement: ElementType, 
        targetAura: ElementAura | null
    ): { reaction: ElementReaction | null; triggered: boolean } {
        if (!targetAura) {
            return { reaction: null, triggered: false };
        }

        // 查找匹配的反应
        for (const [type, reaction] of this._reactions) {
            const [elem1, elem2] = reaction.elements;
            if ((attackElement === elem1 && targetAura.element === elem2) ||
                (attackElement === elem2 && targetAura.element === elem1)) {
                return { reaction, triggered: true };
            }
        }

        return { reaction: null, triggered: false };
    }

    /**
     * 计算完整伤害（含元素克制和反应）
     */
    public calculateElementDamage(
        baseDamage: number,
        attackerElement: ElementType,
        defenderElement: ElementType,
        defenderAura: ElementAura | null = null,
        attackerLevel: number = 1,
        defenderLevel: number = 1
    ): {
        finalDamage: number;
        damageMultiplier: number;
        reaction: ElementReaction | null;
        reactionDamage: number;
        isAdvantage: boolean;
        isDisadvantage: boolean;
    } {
        // 基础元素克制
        const damageMultiplier = this.getDamageMultiplier(attackerElement, defenderElement);
        let finalDamage = baseDamage * damageMultiplier;

        // 等级差异修正
        const levelDiff = attackerLevel - defenderLevel;
        const levelModifier = 1 + (levelDiff * 0.02); // 每级2%
        finalDamage *= Math.max(0.5, Math.min(1.5, levelModifier));

        // 元素反应
        const { reaction, triggered } = this.calculateReaction(attackerElement, defenderAura);
        let reactionDamage = 0;

        if (triggered && reaction) {
            reactionDamage = baseDamage * (reaction.damageMultiplier - 1);
            finalDamage += reactionDamage;
        }

        return {
            finalDamage: Math.floor(finalDamage),
            damageMultiplier,
            reaction: triggered ? reaction : null,
            reactionDamage: Math.floor(reactionDamage),
            isAdvantage: damageMultiplier > 1.0,
            isDisadvantage: damageMultiplier < 1.0
        };
    }

    /**
     * 应用元素附着
     */
    public applyElementAura(
        currentAura: ElementAura | null,
        newElement: ElementType,
        strength: number = 50,
        duration: number = 10,
        sourceId: string = ''
    ): ElementAura {
        // 如果没有附着或附着已消失，直接应用新元素
        if (!currentAura || currentAura.strength <= 0) {
            return {
                element: newElement,
                strength,
                duration,
                source: sourceId
            };
        }

        // 同元素叠加
        if (currentAura.element === newElement) {
            return {
                element: newElement,
                strength: Math.min(100, currentAura.strength + strength * 0.5),
                duration: Math.max(currentAura.duration, duration),
                source: sourceId
            };
        }

        // 不同元素，消耗附着强度
        const newStrength = currentAura.strength - strength;
        if (newStrength <= 0) {
            // 原附着被消耗，应用新元素
            return {
                element: newElement,
                strength: Math.abs(newStrength),
                duration,
                source: sourceId
            };
        } else {
            // 原附着减弱
            return {
                ...currentAura,
                strength: newStrength
            };
        }
    }

    /**
     * 更新元素附着（每帧调用）
     */
    public updateElementAura(aura: ElementAura, deltaTime: number): ElementAura | null {
        if (!aura) return null;

        const newDuration = aura.duration - deltaTime;
        const newStrength = aura.strength - deltaTime * 5; // 每秒衰减5点

        if (newDuration <= 0 || newStrength <= 0) {
            return null;
        }

        return {
            ...aura,
            duration: newDuration,
            strength: newStrength
        };
    }

    // ==================== 查询方法 ====================

    /**
     * 获取克制该元素的元素列表
     */
    public getAdvantageElements(element: ElementType): ElementType[] {
        const advantages: ElementType[] = [];
        
        for (const [key, relation] of this._relations) {
            if (relation.defender === element && relation.damageMultiplier > 1.0) {
                advantages.push(relation.attacker);
            }
        }

        return advantages;
    }

    /**
     * 获取被该元素克制的元素列表
     */
    public getDisadvantageElements(element: ElementType): ElementType[] {
        const disadvantages: ElementType[] = [];
        
        for (const [key, relation] of this._relations) {
            if (relation.attacker === element && relation.damageMultiplier > 1.0) {
                disadvantages.push(relation.defender);
            }
        }

        return disadvantages;
    }

    /**
     * 获取元素颜色
     */
    public getElementColor(element: ElementType): string {
        return this._elementColors.get(element) ?? '#FFFFFF';
    }

    /**
     * 获取元素图标
     */
    public getElementIcon(element: ElementType): string {
        return this._elementIcons.get(element) ?? '⭐';
    }

    /**
     * 获取元素名称
     */
    public getElementName(element: ElementType): string {
        switch (element) {
            case ElementType.FIRE: return '火';
            case ElementType.WATER: return '水';
            case ElementType.WIND: return '风';
            case ElementType.THUNDER: return '雷';
            case ElementType.LIGHT: return '光';
            case ElementType.DARK: return '暗';
            default: return '无';
        }
    }

    /**
     * 获取元素反应
     */
    public getReaction(type: ElementReactionType): ElementReaction | undefined {
        return this._reactions.get(type);
    }

    /**
     * 获取所有元素反应
     */
    public getAllReactions(): ElementReaction[] {
        return Array.from(this._reactions.values());
    }

    /**
     * 获取克制关系描述
     */
    public getRelationDescription(attackerElement: ElementType, defenderElement: ElementType): string {
        const relation = this.getRelation(attackerElement, defenderElement);
        if (!relation) return '无特殊关系';

        if (relation.damageMultiplier > 1.0) {
            return `${this.getElementIcon(attackerElement)} 克制 ${this.getElementIcon(defenderElement)} (${relation.damageMultiplier}x)`;
        } else if (relation.damageMultiplier < 1.0) {
            return `${this.getElementIcon(attackerElement)} 被克制 ${this.getElementIcon(defenderElement)} (${relation.damageMultiplier}x)`;
        } else if (relation.damageMultiplier === 0.75) {
            return `同属性抵抗 (${relation.damageMultiplier}x)`;
        }

        return '无特殊关系';
    }

    /**
     * 生成元素克制表
     */
    public generateRelationTable(): string[][] {
        const elements = [
            ElementType.FIRE, 
            ElementType.WATER, 
            ElementType.WIND, 
            ElementType.THUNDER, 
            ElementType.LIGHT, 
            ElementType.DARK
        ];

        const table: string[][] = [];

        // 表头
        const header = ['攻击\\防御', ...elements.map(e => this.getElementName(e))];
        table.push(header);

        // 数据行
        for (const attacker of elements) {
            const row = [this.getElementName(attacker)];
            for (const defender of elements) {
                const multiplier = this.getDamageMultiplier(attacker, defender);
                row.push(`${multiplier}x`);
            }
            table.push(row);
        }

        return table;
    }

    /**
     * 打印克制关系表
     */
    public printRelationTable(): void {
        console.log('========== 元素克制关系表 ==========');
        console.log('克制关系: 火→风→雷→水→火 (循环)');
        console.log('互克关系: 光↔暗');
        console.log('');
        
        const table = this.generateRelationTable();
        for (const row of table) {
            console.log(row.join('\t'));
        }

        console.log('');
        console.log('========== 元素反应列表 ==========');
        for (const reaction of this._reactions.values()) {
            console.log(`${reaction.name}: ${reaction.description} (${reaction.damageMultiplier}x)`);
        }
    }
}
