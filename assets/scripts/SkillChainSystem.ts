import { _decorator, Component, Node, Vec3, EventTarget, Color } from 'cc';
import { ElementType } from './CharacterData';
import { SkillConfig, SkillType } from './SkillData';
import { BattleCoreSystem } from './BattleCoreSystem';
import { SkillEffectRenderer } from './SkillEffectRenderer';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 属性组合效果类型
 */
export enum ChainEffectType {
    // 双属性组合
    FIRE_TORNADO = 'fire_tornado',          // 火+风 = 火龙卷
    ELECTRO_SHOCK = 'electro_shock',        // 水+雷 = 感电
    STEAM_EXPLOSION = 'steam_explosion',     // 火+水 = 蒸汽爆炸
    SANDSTORM = 'sandstorm',                // 风+光 = 沙尘暴
    THUNDER_STORM = 'thunder_storm',        // 水+风 = 雷暴
    PLASMA = 'plasma',                      // 火+雷 = 等离子
    ECLIPSE = 'eclipse',                    // 光+暗 = 日食
    HOLY_FIRE = 'holy_fire',                // 火+光 = 圣火
    SHADOW_WIND = 'shadow_wind',            // 风+暗 = 暗影疾风
    PURIFY = 'purify',                      // 水+光 = 净化
    CORRUPTION = 'corruption',              // 水+暗 = 侵蚀
    VOID_THUNDER = 'void_thunder',          // 雷+暗 = 虚空雷
    
    // 单属性强化
    FIRE_BURST = 'fire_burst',              // 火+火 = 火焰爆发
    WATER_VORTEX = 'water_vortex',          // 水+水 = 水漩涡
    WIND_BLADE = 'wind_blade',              // 风+风 = 风刃
    THUNDER_CHAIN = 'thunder_chain',        // 雷+雷 = 连锁闪电
    LIGHT_NOVA = 'light_nova',              // 光+光 = 光芒新星
    DARK_HOLE = 'dark_hole',                // 暗+暗 = 黑洞
    
    // 三属性组合
    ELEMENTAL_BURST = 'elemental_burst',    // 三色组合 = 元素爆发
    
    // 通用
    CHAIN_BONUS = 'chain_bonus'             // 基础CHAIN加成
}

/**
 * CHAIN效果配置
 */
export interface ChainEffectConfig {
    type: ChainEffectType;
    name: string;
    description: string;
    elements: ElementType[];        // 触发所需属性
    minSkills: number;              // 最小技能数
    damageMultiplier: number;       // 伤害倍率
    bonusEffects: {
        type: string;               // 效果类型
        value: number;              // 效果数值
        duration?: number;          // 持续时间
    }[];
    visualEffect: string;           // 视觉效果
    soundEffect: string;            // 音效
}

/**
 * CHAIN状态
 */
export interface ChainState {
    active: boolean;
    skillCount: number;             // 当前技能计数
    elements: ElementType[];        // 已使用的属性
    skillIds: string[];             // 已使用的技能ID
    timer: number;                  // 剩余时间
    maxTimer: number;               // 最大时间窗口
    chainLevel: number;             // CHAIN等级
    triggeredEffects: ChainEffectType[];  // 已触发的效果
}

/**
 * CHAIN触发记录
 */
export interface ChainTriggerRecord {
    timestamp: number;
    effectType: ChainEffectType;
    elements: ElementType[];
    damage: number;
    bonuses: any[];
}

/**
 * 技能链系统 - 管理技能连锁释放与属性组合效果
 * Skill Chain System - Skill chain release and elemental combo effects
 */
@ccclass('SkillChainSystem')
export class SkillChainSystem extends Component {
    private static _instance: SkillChainSystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_CHAIN_STARTED = 'chain-started';
    public static readonly EVENT_CHAIN_SKILL_ADDED = 'chain-skill-added';
    public static readonly EVENT_CHAIN_EFFECT_TRIGGERED = 'chain-effect-triggered';
    public static readonly EVENT_CHAIN_ENDED = 'chain-ended';
    public static readonly EVENT_CHAIN_LEVEL_UP = 'chain-level-up';

    // CHAIN状态
    private _chainState: ChainState = {
        active: false,
        skillCount: 0,
        elements: [],
        skillIds: [],
        timer: 0,
        maxTimer: 3.0,              // 3秒时间窗口
        chainLevel: 0,
        triggeredEffects: []
    };

    // 效果配置数据库
    private _effectConfigs: Map<ChainEffectType, ChainEffectConfig> = new Map();

    // 属性组合映射
    private _elementCombos: Map<string, ChainEffectType> = new Map();

    // 触发记录
    private _triggerHistory: ChainTriggerRecord[] = [];

    // CHAIN等级阈值
    private readonly CHAIN_THRESHOLDS = {
        1: 4,   // 4个技能触发Lv1 CHAIN
        2: 6,   // 6个技能触发Lv2 CHAIN
        3: 8    // 8个技能触发Lv3 CHAIN
    };

    // CHAIN伤害加成
    private readonly CHAIN_DAMAGE_BONUS = {
        1: 0.20,    // +20%
        2: 0.35,    // +35%
        3: 0.50     // +50%
    };

    public static get instance(): SkillChainSystem | null {
        return SkillChainSystem._instance;
    }

    public get chainState(): ChainState {
        return { ...this._chainState };
    }

    public get isChainActive(): boolean {
        return this._chainState.active;
    }

    onLoad() {
        if (SkillChainSystem._instance) {
            this.node.destroy();
            return;
        }
        SkillChainSystem._instance = this;

        this.initEffectConfigs();
        this.buildElementComboMap();
    }

    /**
     * 初始化效果配置
     */
    private initEffectConfigs(): void {
        // ========== 双属性组合 ==========
        this.addEffectConfig({
            type: ChainEffectType.FIRE_TORNADO,
            name: '火龙卷',
            description: '火与风的融合，产生毁灭性的火焰旋风',
            elements: [ElementType.FIRE, ElementType.WIND],
            minSkills: 2,
            damageMultiplier: 1.8,
            bonusEffects: [
                { type: 'burn', value: 100, duration: 5 },
                { type: 'knockback', value: 50 }
            ],
            visualEffect: 'fire_tornado',
            soundEffect: 'chain_fire_wind'
        });

        this.addEffectConfig({
            type: ChainEffectType.ELECTRO_SHOCK,
            name: '感电',
            description: '水与雷的结合，触发连锁电击',
            elements: [ElementType.WATER, ElementType.THUNDER],
            minSkills: 2,
            damageMultiplier: 1.6,
            bonusEffects: [
                { type: 'paralysis', value: 1, duration: 2 },
                { type: 'chain_damage', value: 50 }
            ],
            visualEffect: 'electro_shock',
            soundEffect: 'chain_water_thunder'
        });

        this.addEffectConfig({
            type: ChainEffectType.STEAM_EXPLOSION,
            name: '蒸汽爆炸',
            description: '火与水的碰撞，产生高压蒸汽',
            elements: [ElementType.FIRE, ElementType.WATER],
            minSkills: 2,
            damageMultiplier: 2.0,
            bonusEffects: [
                { type: 'aoe_damage', value: 150 },
                { type: 'blind', value: 1, duration: 3 }
            ],
            visualEffect: 'steam_explosion',
            soundEffect: 'chain_fire_water'
        });

        this.addEffectConfig({
            type: ChainEffectType.THUNDER_STORM,
            name: '雷暴',
            description: '水与风召唤雷云',
            elements: [ElementType.WATER, ElementType.WIND],
            minSkills: 2,
            damageMultiplier: 1.7,
            bonusEffects: [
                { type: 'random_strike', value: 3 },
                { type: 'slow', value: 0.3, duration: 4 }
            ],
            visualEffect: 'thunder_storm',
            soundEffect: 'chain_water_wind'
        });

        this.addEffectConfig({
            type: ChainEffectType.PLASMA,
            name: '等离子',
            description: '火与雷产生的高能等离子体',
            elements: [ElementType.FIRE, ElementType.THUNDER],
            minSkills: 2,
            damageMultiplier: 1.9,
            bonusEffects: [
                { type: 'armor_break', value: 0.3, duration: 5 },
                { type: 'dot', value: 80, duration: 4 }
            ],
            visualEffect: 'plasma',
            soundEffect: 'chain_fire_thunder'
        });

        this.addEffectConfig({
            type: ChainEffectType.ECLIPSE,
            name: '日食',
            description: '光与暗的终极对立',
            elements: [ElementType.LIGHT, ElementType.DARK],
            minSkills: 2,
            damageMultiplier: 2.5,
            bonusEffects: [
                { type: 'true_damage', value: 200 },
                { type: 'dispel', value: 1 }
            ],
            visualEffect: 'eclipse',
            soundEffect: 'chain_light_dark'
        });

        this.addEffectConfig({
            type: ChainEffectType.HOLY_FIRE,
            name: '圣火',
            description: '神圣的净化之火',
            elements: [ElementType.FIRE, ElementType.LIGHT],
            minSkills: 2,
            damageMultiplier: 1.6,
            bonusEffects: [
                { type: 'heal', value: 100 },
                { type: 'burn', value: 80, duration: 4 }
            ],
            visualEffect: 'holy_fire',
            soundEffect: 'chain_fire_light'
        });

        this.addEffectConfig({
            type: ChainEffectType.PURIFY,
            name: '净化',
            description: '水与光的治愈之力',
            elements: [ElementType.WATER, ElementType.LIGHT],
            minSkills: 2,
            damageMultiplier: 1.3,
            bonusEffects: [
                { type: 'cleanse', value: 1 },
                { type: 'heal', value: 150 },
                { type: 'buff_attack', value: 0.1, duration: 5 }
            ],
            visualEffect: 'purify',
            soundEffect: 'chain_water_light'
        });

        this.addEffectConfig({
            type: ChainEffectType.CORRUPTION,
            name: '侵蚀',
            description: '暗与水的腐蚀之力',
            elements: [ElementType.WATER, ElementType.DARK],
            minSkills: 2,
            damageMultiplier: 1.5,
            bonusEffects: [
                { type: 'poison', value: 60, duration: 6 },
                { type: 'debuff_defense', value: 0.2, duration: 5 }
            ],
            visualEffect: 'corruption',
            soundEffect: 'chain_water_dark'
        });

        // ========== 单属性强化 ==========
        this.addEffectConfig({
            type: ChainEffectType.FIRE_BURST,
            name: '火焰爆发',
            description: '纯粹的火焰力量爆发',
            elements: [ElementType.FIRE, ElementType.FIRE],
            minSkills: 2,
            damageMultiplier: 2.2,
            bonusEffects: [
                { type: 'burn', value: 120, duration: 6 },
                { type: 'explosion', value: 200 }
            ],
            visualEffect: 'fire_burst',
            soundEffect: 'chain_fire_fire'
        });

        this.addEffectConfig({
            type: ChainEffectType.THUNDER_CHAIN,
            name: '连锁闪电',
            description: '电弧在敌人间跳跃',
            elements: [ElementType.THUNDER, ElementType.THUNDER],
            minSkills: 2,
            damageMultiplier: 1.8,
            bonusEffects: [
                { type: 'chain_lightning', value: 5 },
                { type: 'paralysis', value: 1, duration: 1.5 }
            ],
            visualEffect: 'thunder_chain',
            soundEffect: 'chain_thunder_thunder'
        });

        this.addEffectConfig({
            type: ChainEffectType.LIGHT_NOVA,
            name: '光芒新星',
            description: '圣光的爆发',
            elements: [ElementType.LIGHT, ElementType.LIGHT],
            minSkills: 2,
            damageMultiplier: 1.6,
            bonusEffects: [
                { type: 'heal_team', value: 100 },
                { type: 'buff_team_attack', value: 0.15, duration: 8 }
            ],
            visualEffect: 'light_nova',
            soundEffect: 'chain_light_light'
        });

        this.addEffectConfig({
            type: ChainEffectType.DARK_HOLE,
            name: '黑洞',
            description: '吞噬一切的暗黑力量',
            elements: [ElementType.DARK, ElementType.DARK],
            minSkills: 2,
            damageMultiplier: 2.3,
            bonusEffects: [
                { type: 'pull', value: 100 },
                { type: 'true_damage', value: 150 }
            ],
            visualEffect: 'dark_hole',
            soundEffect: 'chain_dark_dark'
        });

        // ========== 三属性组合 ==========
        this.addEffectConfig({
            type: ChainEffectType.ELEMENTAL_BURST,
            name: '元素爆发',
            description: '三种元素的究极融合',
            elements: [], // 任意三种不同属性
            minSkills: 3,
            damageMultiplier: 3.0,
            bonusEffects: [
                { type: 'all_stats_up', value: 0.2, duration: 10 },
                { type: 'ultimate_damage', value: 500 }
            ],
            visualEffect: 'elemental_burst',
            soundEffect: 'chain_elemental'
        });

        // ========== 基础CHAIN ==========
        this.addEffectConfig({
            type: ChainEffectType.CHAIN_BONUS,
            name: 'CHAIN',
            description: '基础技能连锁',
            elements: [],
            minSkills: 4,
            damageMultiplier: 1.2,
            bonusEffects: [
                { type: 'team_damage_up', value: 0.1, duration: 5 }
            ],
            visualEffect: 'chain_basic',
            soundEffect: 'chain_basic'
        });

        console.log(`CHAIN效果配置初始化完成，共 ${this._effectConfigs.size} 种效果`);
    }

    /**
     * 添加效果配置
     */
    private addEffectConfig(config: ChainEffectConfig): void {
        this._effectConfigs.set(config.type, config);
    }

    /**
     * 构建属性组合映射
     */
    private buildElementComboMap(): void {
        // 遍历所有效果配置
        for (const [type, config] of this._effectConfigs) {
            if (config.elements.length === 2) {
                const key = this.getElementComboKey(config.elements);
                this._elementCombos.set(key, type);
            }
        }
    }

    /**
     * 获取属性组合键
     */
    private getElementComboKey(elements: ElementType[]): string {
        return [...elements].sort().join('_');
    }

    // ==================== CHAIN管理 ====================

    /**
     * 技能释放时调用
     */
    public onSkillCast(skill: SkillConfig, element: ElementType): void {
        // 开始或继续CHAIN
        if (!this._chainState.active) {
            this.startChain();
        }

        // 添加技能到CHAIN
        this._chainState.skillCount++;
        this._chainState.skillIds.push(skill.id);
        
        // 记录属性
        if (!this._chainState.elements.includes(element)) {
            this._chainState.elements.push(element);
        }

        // 重置计时器
        this._chainState.timer = this._chainState.maxTimer;

        // 发送事件
        this.events.emit(SkillChainSystem.EVENT_CHAIN_SKILL_ADDED, {
            skillCount: this._chainState.skillCount,
            element,
            skillId: skill.id
        });

        // 检查CHAIN等级提升
        this.checkChainLevelUp();

        // 检查属性组合效果
        this.checkElementComboEffects();

        console.log(`技能加入CHAIN: ${skill.name}, 当前计数: ${this._chainState.skillCount}, 属性: ${this._chainState.elements.join(',')}`);
    }

    /**
     * 开始CHAIN
     */
    private startChain(): void {
        this._chainState.active = true;
        this._chainState.skillCount = 0;
        this._chainState.elements = [];
        this._chainState.skillIds = [];
        this._chainState.timer = this._chainState.maxTimer;
        this._chainState.chainLevel = 0;
        this._chainState.triggeredEffects = [];

        this.events.emit(SkillChainSystem.EVENT_CHAIN_STARTED);
        console.log('CHAIN开始');
    }

    /**
     * 结束CHAIN
     */
    private endChain(): void {
        if (!this._chainState.active) return;

        const finalState = { ...this._chainState };
        
        this._chainState.active = false;
        this._chainState.skillCount = 0;
        this._chainState.elements = [];
        this._chainState.skillIds = [];
        this._chainState.timer = 0;
        this._chainState.chainLevel = 0;
        this._chainState.triggeredEffects = [];

        this.events.emit(SkillChainSystem.EVENT_CHAIN_ENDED, {
            finalSkillCount: finalState.skillCount,
            finalLevel: finalState.chainLevel,
            triggeredEffects: finalState.triggeredEffects
        });

        console.log(`CHAIN结束: 总技能数 ${finalState.skillCount}, 最终等级 ${finalState.chainLevel}`);
    }

    /**
     * 检查CHAIN等级提升
     */
    private checkChainLevelUp(): void {
        let newLevel = 0;
        
        if (this._chainState.skillCount >= this.CHAIN_THRESHOLDS[3]) {
            newLevel = 3;
        } else if (this._chainState.skillCount >= this.CHAIN_THRESHOLDS[2]) {
            newLevel = 2;
        } else if (this._chainState.skillCount >= this.CHAIN_THRESHOLDS[1]) {
            newLevel = 1;
        }

        if (newLevel > this._chainState.chainLevel) {
            this._chainState.chainLevel = newLevel;
            
            const bonus = this.CHAIN_DAMAGE_BONUS[newLevel as 1 | 2 | 3];
            
            this.events.emit(SkillChainSystem.EVENT_CHAIN_LEVEL_UP, {
                level: newLevel,
                damageBonus: bonus
            });

            // 播放CHAIN升级特效
            this.playChainLevelUpEffect(newLevel);

            // 播放音效
            AudioManager.instance?.playSFX(SFXType.CHAIN_LEVEL_UP);

            console.log(`CHAIN等级提升: Lv.${newLevel}, 伤害加成: +${(bonus * 100).toFixed(0)}%`);
        }
    }

    /**
     * 检查属性组合效果
     */
    private checkElementComboEffects(): void {
        const elements = this._chainState.elements;
        
        // 检查双属性组合
        if (elements.length >= 2) {
            for (let i = 0; i < elements.length - 1; i++) {
                for (let j = i + 1; j < elements.length; j++) {
                    const combo = [elements[i], elements[j]];
                    const key = this.getElementComboKey(combo);
                    const effectType = this._elementCombos.get(key);
                    
                    if (effectType && !this._chainState.triggeredEffects.includes(effectType)) {
                        this.triggerChainEffect(effectType, combo);
                    }
                }
            }
        }

        // 检查三属性元素爆发
        const uniqueElements = new Set(elements);
        if (uniqueElements.size >= 3 && 
            !this._chainState.triggeredEffects.includes(ChainEffectType.ELEMENTAL_BURST)) {
            this.triggerChainEffect(ChainEffectType.ELEMENTAL_BURST, elements);
        }
    }

    /**
     * 触发CHAIN效果
     */
    private triggerChainEffect(effectType: ChainEffectType, elements: ElementType[]): void {
        const config = this._effectConfigs.get(effectType);
        if (!config) return;

        // 检查最小技能数
        if (this._chainState.skillCount < config.minSkills) return;

        // 标记为已触发
        this._chainState.triggeredEffects.push(effectType);

        // 计算伤害
        const baseDamage = 100;
        const damage = baseDamage * config.damageMultiplier;

        // 记录
        this._triggerHistory.push({
            timestamp: Date.now(),
            effectType,
            elements: [...elements],
            damage,
            bonuses: config.bonusEffects
        });

        // 发送事件
        this.events.emit(SkillChainSystem.EVENT_CHAIN_EFFECT_TRIGGERED, {
            effectType,
            config,
            elements,
            damage
        });

        // 播放视觉效果
        this.playChainEffectVisual(config);

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.CHAIN_EFFECT);

        console.log(`CHAIN效果触发: ${config.name}, 伤害倍率: ${config.damageMultiplier}x`);
    }

    /**
     * 播放CHAIN等级提升效果
     */
    private playChainLevelUpEffect(level: number): void {
        const colors = [
            new Color(100, 200, 100),  // Lv1 绿色
            new Color(100, 100, 255),  // Lv2 蓝色
            new Color(255, 200, 50)    // Lv3 金色
        ];

        // 使用SkillEffectRenderer播放屏幕闪烁
        SkillEffectRenderer.instance?.playScreenFlash(colors[level - 1], 0.3);
    }

    /**
     * 播放CHAIN效果视觉
     */
    private playChainEffectVisual(config: ChainEffectConfig): void {
        // 根据效果类型播放不同视觉效果
        switch (config.type) {
            case ChainEffectType.FIRE_TORNADO:
                this.playFireTornadoEffect();
                break;
            case ChainEffectType.ELECTRO_SHOCK:
                this.playElectroShockEffect();
                break;
            case ChainEffectType.ECLIPSE:
                this.playEclipseEffect();
                break;
            case ChainEffectType.ELEMENTAL_BURST:
                this.playElementalBurstEffect();
                break;
            default:
                this.playGenericChainEffect(config);
                break;
        }
    }

    /**
     * 火龙卷效果
     */
    private playFireTornadoEffect(): void {
        SkillEffectRenderer.instance?.playScreenFlash(new Color(255, 100, 50), 0.5);
        SkillEffectRenderer.instance?.playScreenShake(8, 0.5);
    }

    /**
     * 感电效果
     */
    private playElectroShockEffect(): void {
        SkillEffectRenderer.instance?.playScreenFlash(new Color(100, 200, 255), 0.3);
        SkillEffectRenderer.instance?.playScreenShake(5, 0.3);
    }

    /**
     * 日食效果
     */
    private playEclipseEffect(): void {
        // 先暗后亮
        SkillEffectRenderer.instance?.playScreenFlash(new Color(50, 0, 80), 0.5);
        this.scheduleOnce(() => {
            SkillEffectRenderer.instance?.playScreenFlash(new Color(255, 255, 200), 0.3);
        }, 0.5);
        SkillEffectRenderer.instance?.playScreenShake(10, 0.8);
    }

    /**
     * 元素爆发效果
     */
    private playElementalBurstEffect(): void {
        // 多色闪烁
        const colors = [
            new Color(255, 50, 50),   // 红
            new Color(50, 150, 255),  // 蓝
            new Color(50, 255, 50),   // 绿
            new Color(255, 255, 100)  // 黄
        ];

        let index = 0;
        const flashInterval = 0.15;
        
        const flash = () => {
            if (index < colors.length) {
                SkillEffectRenderer.instance?.playScreenFlash(colors[index], flashInterval);
                index++;
                this.scheduleOnce(flash, flashInterval);
            }
        };
        
        flash();
        SkillEffectRenderer.instance?.playScreenShake(12, 1.0);
    }

    /**
     * 通用CHAIN效果
     */
    private playGenericChainEffect(config: ChainEffectConfig): void {
        const color = this.getEffectColor(config.elements[0]);
        SkillEffectRenderer.instance?.playScreenFlash(color, 0.3);
    }

    /**
     * 获取属性对应颜色
     */
    private getEffectColor(element?: ElementType): Color {
        if (!element) return new Color(255, 255, 255);
        
        switch (element) {
            case ElementType.FIRE: return new Color(255, 80, 50);
            case ElementType.WATER: return new Color(50, 150, 255);
            case ElementType.WIND: return new Color(80, 220, 80);
            case ElementType.THUNDER: return new Color(255, 220, 50);
            case ElementType.LIGHT: return new Color(255, 240, 200);
            case ElementType.DARK: return new Color(120, 50, 150);
            default: return new Color(200, 200, 200);
        }
    }

    update(dt: number) {
        if (!this._chainState.active) return;

        // 更新计时器
        this._chainState.timer -= dt;

        // 超时结束CHAIN
        if (this._chainState.timer <= 0) {
            this.endChain();
        }
    }

    // ==================== 查询方法 ====================

    /**
     * 获取当前CHAIN等级
     */
    public getChainLevel(): number {
        return this._chainState.chainLevel;
    }

    /**
     * 获取当前CHAIN伤害加成
     */
    public getChainDamageBonus(): number {
        if (this._chainState.chainLevel === 0) return 0;
        return this.CHAIN_DAMAGE_BONUS[this._chainState.chainLevel as 1 | 2 | 3] || 0;
    }

    /**
     * 获取CHAIN剩余时间
     */
    public getChainRemainingTime(): number {
        return this._chainState.timer;
    }

    /**
     * 获取已触发的效果
     */
    public getTriggeredEffects(): ChainEffectConfig[] {
        return this._chainState.triggeredEffects.map(type => 
            this._effectConfigs.get(type)!
        ).filter(Boolean);
    }

    /**
     * 获取效果配置
     */
    public getEffectConfig(type: ChainEffectType): ChainEffectConfig | undefined {
        return this._effectConfigs.get(type);
    }

    /**
     * 获取所有效果配置
     */
    public getAllEffectConfigs(): ChainEffectConfig[] {
        return Array.from(this._effectConfigs.values());
    }

    /**
     * 获取可能的属性组合
     */
    public getPossibleCombos(elements: ElementType[]): ChainEffectConfig[] {
        const combos: ChainEffectConfig[] = [];

        for (let i = 0; i < elements.length - 1; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const key = this.getElementComboKey([elements[i], elements[j]]);
                const effectType = this._elementCombos.get(key);
                if (effectType) {
                    const config = this._effectConfigs.get(effectType);
                    if (config) combos.push(config);
                }
            }
        }

        return combos;
    }

    /**
     * 获取触发历史
     */
    public getTriggerHistory(): ChainTriggerRecord[] {
        return [...this._triggerHistory];
    }

    /**
     * 清除触发历史
     */
    public clearTriggerHistory(): void {
        this._triggerHistory = [];
    }

    /**
     * 强制结束CHAIN
     */
    public forceEndChain(): void {
        if (this._chainState.active) {
            this.endChain();
        }
    }

    /**
     * 重置系统
     */
    public reset(): void {
        this.forceEndChain();
        this._triggerHistory = [];
    }

    onDestroy() {
        this.reset();
        
        if (SkillChainSystem._instance === this) {
            SkillChainSystem._instance = null;
        }
    }
}
