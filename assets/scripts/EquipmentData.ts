import { _decorator } from 'cc';

/**
 * 装备类型枚举
 */
export enum EquipmentType {
    WEAPON = 'weapon',          // 武器
    ARMOR = 'armor',            // 护甲
    ACCESSORY = 'accessory',    // 饰品
    ARTIFACT = 'artifact'       // 神器（特殊装备）
}

/**
 * 装备稀有度枚举
 */
export enum EquipmentRarity {
    COMMON = 1,     // 普通（白色）
    UNCOMMON = 2,   // 优秀（绿色）
    RARE = 3,       // 稀有（蓝色）
    EPIC = 4,       // 史诗（紫色）
    LEGENDARY = 5,  // 传说（橙色）
    MYTHIC = 6      // 神话（红色）
}

/**
 * 装备属性类型
 */
export enum EquipmentStatType {
    HP = 'hp',                      // 生命值
    HP_PERCENT = 'hp_percent',      // 生命值百分比
    ATTACK = 'attack',              // 攻击力
    ATTACK_PERCENT = 'atk_percent', // 攻击力百分比
    DEFENSE = 'defense',            // 防御力
    DEFENSE_PERCENT = 'def_percent',// 防御力百分比
    SPEED = 'speed',                // 速度
    SPEED_PERCENT = 'spd_percent',  // 速度百分比
    CRIT_RATE = 'crit_rate',        // 暴击率
    CRIT_DAMAGE = 'crit_damage',    // 暴击伤害
    SKILL_POWER = 'skill_power',    // 技能威力
    ENERGY_REGEN = 'energy_regen',  // 能量恢复
    LIFESTEAL = 'lifesteal',        // 生命偷取
    DAMAGE_REDUCE = 'damage_reduce',// 伤害减免
    ELEMENT_DAMAGE = 'elem_damage', // 元素伤害加成
    ELEMENT_RESIST = 'elem_resist'  // 元素抗性
}

/**
 * 装备属性数据
 */
export interface EquipmentStat {
    type: EquipmentStatType;
    value: number;
    isPercent: boolean;     // 是否为百分比数值
}

/**
 * 装备套装效果
 */
export interface SetBonus {
    requiredCount: number;  // 需要的装备数量
    description: string;
    stats: EquipmentStat[];
    specialEffect?: string; // 特殊效果ID
}

/**
 * 装备套装数据
 */
export interface EquipmentSet {
    id: string;
    name: string;
    description: string;
    equipmentIds: string[]; // 套装包含的装备ID
    bonuses: SetBonus[];    // 套装效果列表
}

/**
 * 装备特殊效果
 */
export interface EquipmentSpecialEffect {
    id: string;
    name: string;
    description: string;
    triggerCondition: string;   // 触发条件
    effectType: string;         // 效果类型
    effectValue: number;        // 效果数值
    cooldown?: number;          // 冷却时间
}

/**
 * 装备配置接口（装备池）
 */
export interface EquipmentConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    
    // 基础属性
    type: EquipmentType;
    rarity: EquipmentRarity;
    
    // 等级限制
    requiredLevel: number;
    maxLevel: number;           // 装备最大强化等级
    
    // 属性
    baseStats: EquipmentStat[]; // 基础属性
    bonusStats?: EquipmentStat[];// 附加属性（可随机）
    
    // 成长属性（每级强化增加）
    growthStats: EquipmentStat[];
    
    // 套装ID（可选）
    setId?: string;
    
    // 特殊效果（可选）
    specialEffects?: EquipmentSpecialEffect[];
    
    // 适用职业限制（可选，空表示全职业）
    classRestrictions?: string[];
    
    // 适用元素限制（可选）
    elementRestrictions?: string[];
    
    // 标签
    tags: string[];
}

/**
 * 装备实例（玩家拥有的装备）
 */
export interface EquipmentInstance {
    uniqueId: string;           // 唯一实例ID
    configId: string;           // 配置ID（引用装备池）
    level: number;              // 强化等级
    exp: number;                // 强化经验
    
    // 随机附加属性
    randomStats: EquipmentStat[];
    
    // 装备者角色ID（null表示未装备）
    equippedBy: string | null;
    
    // 是否锁定
    isLocked: boolean;
    
    // 获取时间
    obtainedAt: number;
}

/**
 * 装备数据库 - 独立的装备池
 */
export class EquipmentDatabase {
    private static _instance: EquipmentDatabase | null = null;
    private _equipments: Map<string, EquipmentConfig> = new Map();
    private _sets: Map<string, EquipmentSet> = new Map();
    private _specialEffects: Map<string, EquipmentSpecialEffect> = new Map();

    public static get instance(): EquipmentDatabase {
        if (!EquipmentDatabase._instance) {
            EquipmentDatabase._instance = new EquipmentDatabase();
            EquipmentDatabase._instance.initDatabase();
        }
        return EquipmentDatabase._instance;
    }

    /**
     * 初始化装备数据库
     */
    private initDatabase(): void {
        this.initSpecialEffects();
        this.initEquipmentSets();
        this.initEquipments();
        
        console.log(`装备数据库初始化完成，共 ${this._equipments.size} 件装备，${this._sets.size} 个套装`);
    }

    /**
     * 初始化特殊效果
     */
    private initSpecialEffects(): void {
        this._specialEffects.set('effect_fire_burst', {
            id: 'effect_fire_burst',
            name: '烈焰爆发',
            description: '攻击时有15%概率触发火焰爆炸，造成额外50%伤害',
            triggerCondition: 'on_hit',
            effectType: 'bonus_damage',
            effectValue: 0.5,
            cooldown: 3
        });

        this._specialEffects.set('effect_ice_shield', {
            id: 'effect_ice_shield',
            name: '冰霜屏障',
            description: '受到致命伤害时，有30%概率生成护盾',
            triggerCondition: 'on_lethal_damage',
            effectType: 'shield',
            effectValue: 0.2,
            cooldown: 30
        });

        this._specialEffects.set('effect_energy_surge', {
            id: 'effect_energy_surge',
            name: '能量涌动',
            description: '击败敌人时恢复20%技能能量',
            triggerCondition: 'on_kill',
            effectType: 'energy_restore',
            effectValue: 0.2
        });

        this._specialEffects.set('effect_combo_master', {
            id: 'effect_combo_master',
            name: '连击大师',
            description: '连击数每增加10，攻击力提升5%，最多50%',
            triggerCondition: 'on_combo',
            effectType: 'attack_boost',
            effectValue: 0.05
        });

        this._specialEffects.set('effect_vampire', {
            id: 'effect_vampire',
            name: '吸血鬼之牙',
            description: '每次攻击恢复造成伤害5%的生命值',
            triggerCondition: 'on_hit',
            effectType: 'lifesteal',
            effectValue: 0.05
        });
    }

    /**
     * 初始化套装
     */
    private initEquipmentSets(): void {
        // 烈焰套装
        this._sets.set('set_flame', {
            id: 'set_flame',
            name: '烈焰战魂',
            description: '燃烧着战斗热情的装备套装',
            equipmentIds: ['equip_flame_sword', 'equip_flame_armor', 'equip_flame_ring'],
            bonuses: [
                {
                    requiredCount: 2,
                    description: '攻击力+15%',
                    stats: [{ type: EquipmentStatType.ATTACK_PERCENT, value: 0.15, isPercent: true }]
                },
                {
                    requiredCount: 3,
                    description: '火属性伤害+25%，攻击附带燃烧效果',
                    stats: [{ type: EquipmentStatType.ELEMENT_DAMAGE, value: 0.25, isPercent: true }],
                    specialEffect: 'effect_fire_burst'
                }
            ]
        });

        // 冰霜套装
        this._sets.set('set_frost', {
            id: 'set_frost',
            name: '永冻守护',
            description: '蕴含寒冰之力的防御套装',
            equipmentIds: ['equip_frost_shield', 'equip_frost_armor', 'equip_frost_pendant'],
            bonuses: [
                {
                    requiredCount: 2,
                    description: '防御力+20%',
                    stats: [{ type: EquipmentStatType.DEFENSE_PERCENT, value: 0.2, isPercent: true }]
                },
                {
                    requiredCount: 3,
                    description: '生命值+15%，受到致命伤害时有概率生成护盾',
                    stats: [{ type: EquipmentStatType.HP_PERCENT, value: 0.15, isPercent: true }],
                    specialEffect: 'effect_ice_shield'
                }
            ]
        });

        // 疾风套装
        this._sets.set('set_wind', {
            id: 'set_wind',
            name: '疾风猎手',
            description: '追求极速的暗杀者装备',
            equipmentIds: ['equip_wind_dagger', 'equip_wind_cloak', 'equip_wind_boots'],
            bonuses: [
                {
                    requiredCount: 2,
                    description: '速度+25%',
                    stats: [{ type: EquipmentStatType.SPEED_PERCENT, value: 0.25, isPercent: true }]
                },
                {
                    requiredCount: 3,
                    description: '暴击率+15%，暴击伤害+30%',
                    stats: [
                        { type: EquipmentStatType.CRIT_RATE, value: 0.15, isPercent: true },
                        { type: EquipmentStatType.CRIT_DAMAGE, value: 0.3, isPercent: true }
                    ]
                }
            ]
        });

        // 生命套装
        this._sets.set('set_life', {
            id: 'set_life',
            name: '生命源泉',
            description: '蕴含生命之力的治疗套装',
            equipmentIds: ['equip_life_staff', 'equip_life_robe', 'equip_life_amulet'],
            bonuses: [
                {
                    requiredCount: 2,
                    description: '治疗效果+20%',
                    stats: [{ type: EquipmentStatType.SKILL_POWER, value: 0.2, isPercent: true }]
                },
                {
                    requiredCount: 3,
                    description: '能量恢复+30%，击败敌人恢复能量',
                    stats: [{ type: EquipmentStatType.ENERGY_REGEN, value: 0.3, isPercent: true }],
                    specialEffect: 'effect_energy_surge'
                }
            ]
        });

        // 暗影套装
        this._sets.set('set_shadow', {
            id: 'set_shadow',
            name: '暗影支配',
            description: '吸取生命的黑暗套装',
            equipmentIds: ['equip_shadow_scythe', 'equip_shadow_mantle', 'equip_shadow_orb'],
            bonuses: [
                {
                    requiredCount: 2,
                    description: '技能伤害+20%',
                    stats: [{ type: EquipmentStatType.SKILL_POWER, value: 0.2, isPercent: true }]
                },
                {
                    requiredCount: 3,
                    description: '生命偷取+10%，攻击时吸取生命',
                    stats: [{ type: EquipmentStatType.LIFESTEAL, value: 0.1, isPercent: true }],
                    specialEffect: 'effect_vampire'
                }
            ]
        });
    }

    /**
     * 初始化装备
     */
    private initEquipments(): void {
        // ==================== 武器 ====================
        
        // 烈焰之剑
        this.addEquipment({
            id: 'equip_flame_sword',
            name: '烈焰之剑',
            description: '燃烧着永恒火焰的传说之剑',
            icon: 'textures/equipments/flame_sword',
            type: EquipmentType.WEAPON,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.ATTACK, value: 150, isPercent: false },
                { type: EquipmentStatType.CRIT_RATE, value: 0.1, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK, value: 15, isPercent: false },
                { type: EquipmentStatType.CRIT_RATE, value: 0.005, isPercent: true }
            ],
            setId: 'set_flame',
            specialEffects: [this._specialEffects.get('effect_fire_burst')!],
            elementRestrictions: ['fire'],
            tags: ['weapon', 'sword', 'fire', 'legendary', 'dps']
        });

        // 寒冰巨盾
        this.addEquipment({
            id: 'equip_frost_shield',
            name: '寒冰巨盾',
            description: '由永恒寒冰铸造的防御神器',
            icon: 'textures/equipments/frost_shield',
            type: EquipmentType.WEAPON,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.DEFENSE, value: 120, isPercent: false },
                { type: EquipmentStatType.HP, value: 500, isPercent: false }
            ],
            growthStats: [
                { type: EquipmentStatType.DEFENSE, value: 12, isPercent: false },
                { type: EquipmentStatType.HP, value: 50, isPercent: false }
            ],
            setId: 'set_frost',
            elementRestrictions: ['water'],
            tags: ['weapon', 'shield', 'water', 'legendary', 'tank']
        });

        // 疾风双刃
        this.addEquipment({
            id: 'equip_wind_dagger',
            name: '疾风双刃',
            description: '如风般迅捷的暗杀武器',
            icon: 'textures/equipments/wind_dagger',
            type: EquipmentType.WEAPON,
            rarity: EquipmentRarity.EPIC,
            requiredLevel: 25,
            maxLevel: 12,
            baseStats: [
                { type: EquipmentStatType.ATTACK, value: 100, isPercent: false },
                { type: EquipmentStatType.SPEED, value: 30, isPercent: false },
                { type: EquipmentStatType.CRIT_DAMAGE, value: 0.2, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK, value: 10, isPercent: false },
                { type: EquipmentStatType.SPEED, value: 3, isPercent: false }
            ],
            setId: 'set_wind',
            elementRestrictions: ['wind'],
            tags: ['weapon', 'dagger', 'wind', 'epic', 'assassin']
        });

        // 生命之杖
        this.addEquipment({
            id: 'equip_life_staff',
            name: '生命之杖',
            description: '蕴含强大治愈力量的神圣法杖',
            icon: 'textures/equipments/life_staff',
            type: EquipmentType.WEAPON,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.ATTACK, value: 80, isPercent: false },
                { type: EquipmentStatType.SKILL_POWER, value: 0.25, isPercent: true },
                { type: EquipmentStatType.ENERGY_REGEN, value: 0.15, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK, value: 8, isPercent: false },
                { type: EquipmentStatType.SKILL_POWER, value: 0.02, isPercent: true }
            ],
            setId: 'set_life',
            classRestrictions: ['healer', 'support', 'mage'],
            tags: ['weapon', 'staff', 'light', 'legendary', 'healer']
        });

        // 暗影镰刀
        this.addEquipment({
            id: 'equip_shadow_scythe',
            name: '暗影镰刀',
            description: '收割灵魂的死神武器',
            icon: 'textures/equipments/shadow_scythe',
            type: EquipmentType.WEAPON,
            rarity: EquipmentRarity.MYTHIC,
            requiredLevel: 40,
            maxLevel: 20,
            baseStats: [
                { type: EquipmentStatType.ATTACK, value: 200, isPercent: false },
                { type: EquipmentStatType.LIFESTEAL, value: 0.08, isPercent: true },
                { type: EquipmentStatType.CRIT_DAMAGE, value: 0.25, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK, value: 20, isPercent: false },
                { type: EquipmentStatType.LIFESTEAL, value: 0.005, isPercent: true }
            ],
            setId: 'set_shadow',
            specialEffects: [this._specialEffects.get('effect_vampire')!],
            elementRestrictions: ['dark'],
            tags: ['weapon', 'scythe', 'dark', 'mythic', 'dps']
        });

        // 初学者之剑
        this.addEquipment({
            id: 'equip_starter_sword',
            name: '初学者之剑',
            description: '冒险者的第一把武器',
            icon: 'textures/equipments/starter_sword',
            type: EquipmentType.WEAPON,
            rarity: EquipmentRarity.COMMON,
            requiredLevel: 1,
            maxLevel: 5,
            baseStats: [
                { type: EquipmentStatType.ATTACK, value: 20, isPercent: false }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK, value: 5, isPercent: false }
            ],
            tags: ['weapon', 'sword', 'common', 'starter']
        });

        // 铁剑
        this.addEquipment({
            id: 'equip_iron_sword',
            name: '铁剑',
            description: '普通的铁制长剑',
            icon: 'textures/equipments/iron_sword',
            type: EquipmentType.WEAPON,
            rarity: EquipmentRarity.UNCOMMON,
            requiredLevel: 5,
            maxLevel: 8,
            baseStats: [
                { type: EquipmentStatType.ATTACK, value: 40, isPercent: false },
                { type: EquipmentStatType.CRIT_RATE, value: 0.03, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK, value: 6, isPercent: false }
            ],
            tags: ['weapon', 'sword', 'uncommon']
        });

        // 精钢长剑
        this.addEquipment({
            id: 'equip_steel_sword',
            name: '精钢长剑',
            description: '由精钢打造的优秀武器',
            icon: 'textures/equipments/steel_sword',
            type: EquipmentType.WEAPON,
            rarity: EquipmentRarity.RARE,
            requiredLevel: 15,
            maxLevel: 10,
            baseStats: [
                { type: EquipmentStatType.ATTACK, value: 70, isPercent: false },
                { type: EquipmentStatType.CRIT_RATE, value: 0.05, isPercent: true },
                { type: EquipmentStatType.CRIT_DAMAGE, value: 0.1, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK, value: 8, isPercent: false },
                { type: EquipmentStatType.CRIT_RATE, value: 0.003, isPercent: true }
            ],
            tags: ['weapon', 'sword', 'rare']
        });

        // ==================== 护甲 ====================
        
        // 烈焰战甲
        this.addEquipment({
            id: 'equip_flame_armor',
            name: '烈焰战甲',
            description: '被火焰护佑的战士铠甲',
            icon: 'textures/equipments/flame_armor',
            type: EquipmentType.ARMOR,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.HP, value: 800, isPercent: false },
                { type: EquipmentStatType.DEFENSE, value: 80, isPercent: false },
                { type: EquipmentStatType.ATTACK_PERCENT, value: 0.1, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.HP, value: 80, isPercent: false },
                { type: EquipmentStatType.DEFENSE, value: 8, isPercent: false }
            ],
            setId: 'set_flame',
            elementRestrictions: ['fire'],
            tags: ['armor', 'heavy', 'fire', 'legendary']
        });

        // 寒冰重甲
        this.addEquipment({
            id: 'equip_frost_armor',
            name: '寒冰重甲',
            description: '冻结一切攻击的坚冰铠甲',
            icon: 'textures/equipments/frost_armor',
            type: EquipmentType.ARMOR,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.HP, value: 1000, isPercent: false },
                { type: EquipmentStatType.DEFENSE, value: 120, isPercent: false },
                { type: EquipmentStatType.DAMAGE_REDUCE, value: 0.1, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.HP, value: 100, isPercent: false },
                { type: EquipmentStatType.DEFENSE, value: 12, isPercent: false }
            ],
            setId: 'set_frost',
            elementRestrictions: ['water'],
            tags: ['armor', 'heavy', 'water', 'legendary', 'tank']
        });

        // 疾风斗篷
        this.addEquipment({
            id: 'equip_wind_cloak',
            name: '疾风斗篷',
            description: '轻盈如风的暗杀者披风',
            icon: 'textures/equipments/wind_cloak',
            type: EquipmentType.ARMOR,
            rarity: EquipmentRarity.EPIC,
            requiredLevel: 25,
            maxLevel: 12,
            baseStats: [
                { type: EquipmentStatType.HP, value: 400, isPercent: false },
                { type: EquipmentStatType.SPEED, value: 25, isPercent: false },
                { type: EquipmentStatType.CRIT_RATE, value: 0.08, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.HP, value: 40, isPercent: false },
                { type: EquipmentStatType.SPEED, value: 2, isPercent: false }
            ],
            setId: 'set_wind',
            elementRestrictions: ['wind'],
            tags: ['armor', 'light', 'wind', 'epic', 'assassin']
        });

        // 生命长袍
        this.addEquipment({
            id: 'equip_life_robe',
            name: '生命长袍',
            description: '充满生命力的治愈法袍',
            icon: 'textures/equipments/life_robe',
            type: EquipmentType.ARMOR,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.HP, value: 600, isPercent: false },
                { type: EquipmentStatType.DEFENSE, value: 50, isPercent: false },
                { type: EquipmentStatType.SKILL_POWER, value: 0.15, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.HP, value: 60, isPercent: false },
                { type: EquipmentStatType.SKILL_POWER, value: 0.01, isPercent: true }
            ],
            setId: 'set_life',
            classRestrictions: ['healer', 'support', 'mage'],
            tags: ['armor', 'robe', 'light', 'legendary', 'healer']
        });

        // 暗影斗篷
        this.addEquipment({
            id: 'equip_shadow_mantle',
            name: '暗影斗篷',
            description: '吞噬光明的黑暗披风',
            icon: 'textures/equipments/shadow_mantle',
            type: EquipmentType.ARMOR,
            rarity: EquipmentRarity.MYTHIC,
            requiredLevel: 40,
            maxLevel: 20,
            baseStats: [
                { type: EquipmentStatType.HP, value: 700, isPercent: false },
                { type: EquipmentStatType.ATTACK_PERCENT, value: 0.15, isPercent: true },
                { type: EquipmentStatType.LIFESTEAL, value: 0.05, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.HP, value: 70, isPercent: false },
                { type: EquipmentStatType.ATTACK_PERCENT, value: 0.01, isPercent: true }
            ],
            setId: 'set_shadow',
            elementRestrictions: ['dark'],
            tags: ['armor', 'cloak', 'dark', 'mythic']
        });

        // 布甲
        this.addEquipment({
            id: 'equip_cloth_armor',
            name: '布甲',
            description: '基础的布制护甲',
            icon: 'textures/equipments/cloth_armor',
            type: EquipmentType.ARMOR,
            rarity: EquipmentRarity.COMMON,
            requiredLevel: 1,
            maxLevel: 5,
            baseStats: [
                { type: EquipmentStatType.HP, value: 100, isPercent: false },
                { type: EquipmentStatType.DEFENSE, value: 10, isPercent: false }
            ],
            growthStats: [
                { type: EquipmentStatType.HP, value: 20, isPercent: false },
                { type: EquipmentStatType.DEFENSE, value: 2, isPercent: false }
            ],
            tags: ['armor', 'cloth', 'common', 'starter']
        });

        // ==================== 饰品 ====================
        
        // 烈焰戒指
        this.addEquipment({
            id: 'equip_flame_ring',
            name: '烈焰戒指',
            description: '封印着火焰精灵的魔法戒指',
            icon: 'textures/equipments/flame_ring',
            type: EquipmentType.ACCESSORY,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.ATTACK_PERCENT, value: 0.12, isPercent: true },
                { type: EquipmentStatType.ELEMENT_DAMAGE, value: 0.15, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK_PERCENT, value: 0.008, isPercent: true }
            ],
            setId: 'set_flame',
            elementRestrictions: ['fire'],
            tags: ['accessory', 'ring', 'fire', 'legendary']
        });

        // 寒冰吊坠
        this.addEquipment({
            id: 'equip_frost_pendant',
            name: '寒冰吊坠',
            description: '永不融化的冰晶项链',
            icon: 'textures/equipments/frost_pendant',
            type: EquipmentType.ACCESSORY,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.HP_PERCENT, value: 0.15, isPercent: true },
                { type: EquipmentStatType.DAMAGE_REDUCE, value: 0.08, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.HP_PERCENT, value: 0.01, isPercent: true }
            ],
            setId: 'set_frost',
            elementRestrictions: ['water'],
            tags: ['accessory', 'pendant', 'water', 'legendary', 'tank']
        });

        // 疾风之靴
        this.addEquipment({
            id: 'equip_wind_boots',
            name: '疾风之靴',
            description: '让你快如闪电的魔法靴子',
            icon: 'textures/equipments/wind_boots',
            type: EquipmentType.ACCESSORY,
            rarity: EquipmentRarity.EPIC,
            requiredLevel: 25,
            maxLevel: 12,
            baseStats: [
                { type: EquipmentStatType.SPEED_PERCENT, value: 0.2, isPercent: true },
                { type: EquipmentStatType.CRIT_RATE, value: 0.05, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.SPEED_PERCENT, value: 0.015, isPercent: true }
            ],
            setId: 'set_wind',
            tags: ['accessory', 'boots', 'wind', 'epic']
        });

        // 生命护符
        this.addEquipment({
            id: 'equip_life_amulet',
            name: '生命护符',
            description: '祝福生命的神圣护符',
            icon: 'textures/equipments/life_amulet',
            type: EquipmentType.ACCESSORY,
            rarity: EquipmentRarity.LEGENDARY,
            requiredLevel: 30,
            maxLevel: 15,
            baseStats: [
                { type: EquipmentStatType.SKILL_POWER, value: 0.2, isPercent: true },
                { type: EquipmentStatType.ENERGY_REGEN, value: 0.2, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.SKILL_POWER, value: 0.015, isPercent: true }
            ],
            setId: 'set_life',
            tags: ['accessory', 'amulet', 'light', 'legendary', 'healer']
        });

        // 暗影宝珠
        this.addEquipment({
            id: 'equip_shadow_orb',
            name: '暗影宝珠',
            description: '封印着黑暗力量的神秘宝珠',
            icon: 'textures/equipments/shadow_orb',
            type: EquipmentType.ACCESSORY,
            rarity: EquipmentRarity.MYTHIC,
            requiredLevel: 40,
            maxLevel: 20,
            baseStats: [
                { type: EquipmentStatType.ATTACK_PERCENT, value: 0.18, isPercent: true },
                { type: EquipmentStatType.SKILL_POWER, value: 0.15, isPercent: true },
                { type: EquipmentStatType.LIFESTEAL, value: 0.05, isPercent: true }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK_PERCENT, value: 0.012, isPercent: true },
                { type: EquipmentStatType.SKILL_POWER, value: 0.01, isPercent: true }
            ],
            setId: 'set_shadow',
            elementRestrictions: ['dark'],
            tags: ['accessory', 'orb', 'dark', 'mythic']
        });

        // 铜戒指
        this.addEquipment({
            id: 'equip_copper_ring',
            name: '铜戒指',
            description: '简单的铜制戒指',
            icon: 'textures/equipments/copper_ring',
            type: EquipmentType.ACCESSORY,
            rarity: EquipmentRarity.COMMON,
            requiredLevel: 1,
            maxLevel: 5,
            baseStats: [
                { type: EquipmentStatType.ATTACK, value: 10, isPercent: false }
            ],
            growthStats: [
                { type: EquipmentStatType.ATTACK, value: 2, isPercent: false }
            ],
            tags: ['accessory', 'ring', 'common', 'starter']
        });
    }

    /**
     * 添加装备
     */
    private addEquipment(config: EquipmentConfig): void {
        this._equipments.set(config.id, config);
    }

    /**
     * 获取装备配置
     */
    public getEquipment(id: string): EquipmentConfig | undefined {
        return this._equipments.get(id);
    }

    /**
     * 获取所有装备
     */
    public getAllEquipments(): EquipmentConfig[] {
        return Array.from(this._equipments.values());
    }

    /**
     * 根据类型筛选装备
     */
    public getEquipmentsByType(type: EquipmentType): EquipmentConfig[] {
        return this.getAllEquipments().filter(e => e.type === type);
    }

    /**
     * 根据稀有度筛选装备
     */
    public getEquipmentsByRarity(rarity: EquipmentRarity): EquipmentConfig[] {
        return this.getAllEquipments().filter(e => e.rarity === rarity);
    }

    /**
     * 获取套装信息
     */
    public getSet(setId: string): EquipmentSet | undefined {
        return this._sets.get(setId);
    }

    /**
     * 获取所有套装
     */
    public getAllSets(): EquipmentSet[] {
        return Array.from(this._sets.values());
    }

    /**
     * 获取特殊效果
     */
    public getSpecialEffect(effectId: string): EquipmentSpecialEffect | undefined {
        return this._specialEffects.get(effectId);
    }

    /**
     * 计算装备在指定等级的属性
     */
    public calculateStats(config: EquipmentConfig, level: number): EquipmentStat[] {
        const stats: EquipmentStat[] = [];

        for (const baseStat of config.baseStats) {
            const growthStat = config.growthStats.find(g => g.type === baseStat.type);
            const growthValue = growthStat ? growthStat.value * (level - 1) : 0;

            stats.push({
                type: baseStat.type,
                value: baseStat.value + growthValue,
                isPercent: baseStat.isPercent
            });
        }

        return stats;
    }

    /**
     * 获取稀有度颜色
     */
    public getRarityColor(rarity: EquipmentRarity): string {
        switch (rarity) {
            case EquipmentRarity.COMMON: return '#AAAAAA';
            case EquipmentRarity.UNCOMMON: return '#55AA55';
            case EquipmentRarity.RARE: return '#5555FF';
            case EquipmentRarity.EPIC: return '#AA55AA';
            case EquipmentRarity.LEGENDARY: return '#FFAA00';
            case EquipmentRarity.MYTHIC: return '#FF5555';
            default: return '#FFFFFF';
        }
    }

    /**
     * 获取稀有度名称
     */
    public getRarityName(rarity: EquipmentRarity): string {
        switch (rarity) {
            case EquipmentRarity.COMMON: return '普通';
            case EquipmentRarity.UNCOMMON: return '优秀';
            case EquipmentRarity.RARE: return '稀有';
            case EquipmentRarity.EPIC: return '史诗';
            case EquipmentRarity.LEGENDARY: return '传说';
            case EquipmentRarity.MYTHIC: return '神话';
            default: return '未知';
        }
    }

    /**
     * 获取装备类型名称
     */
    public getTypeName(type: EquipmentType): string {
        switch (type) {
            case EquipmentType.WEAPON: return '武器';
            case EquipmentType.ARMOR: return '护甲';
            case EquipmentType.ACCESSORY: return '饰品';
            case EquipmentType.ARTIFACT: return '神器';
            default: return '未知';
        }
    }

    /**
     * 获取属性名称
     */
    public getStatName(type: EquipmentStatType): string {
        switch (type) {
            case EquipmentStatType.HP: return '生命值';
            case EquipmentStatType.HP_PERCENT: return '生命值%';
            case EquipmentStatType.ATTACK: return '攻击力';
            case EquipmentStatType.ATTACK_PERCENT: return '攻击力%';
            case EquipmentStatType.DEFENSE: return '防御力';
            case EquipmentStatType.DEFENSE_PERCENT: return '防御力%';
            case EquipmentStatType.SPEED: return '速度';
            case EquipmentStatType.SPEED_PERCENT: return '速度%';
            case EquipmentStatType.CRIT_RATE: return '暴击率';
            case EquipmentStatType.CRIT_DAMAGE: return '暴击伤害';
            case EquipmentStatType.SKILL_POWER: return '技能威力';
            case EquipmentStatType.ENERGY_REGEN: return '能量恢复';
            case EquipmentStatType.LIFESTEAL: return '生命偷取';
            case EquipmentStatType.DAMAGE_REDUCE: return '伤害减免';
            case EquipmentStatType.ELEMENT_DAMAGE: return '元素伤害';
            case EquipmentStatType.ELEMENT_RESIST: return '元素抗性';
            default: return '未知属性';
        }
    }
}
