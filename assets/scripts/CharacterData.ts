import { _decorator } from 'cc';

/**
 * 角色稀有度枚举
 */
export enum CharacterRarity {
    N = 1,      // 普通
    R = 2,      // 稀有
    SR = 3,     // 超稀有
    SSR = 4,    // 超超稀有
    UR = 5      // 究极稀有
}

/**
 * 角色元素属性枚举
 */
export enum ElementType {
    FIRE = 'fire',          // 火
    WATER = 'water',        // 水
    WIND = 'wind',          // 风
    THUNDER = 'thunder',    // 雷
    LIGHT = 'light',        // 光
    DARK = 'dark'           // 暗
}

/**
 * 角色职业枚举
 */
export enum CharacterClass {
    WARRIOR = 'warrior',        // 战士
    MAGE = 'mage',              // 法师
    ARCHER = 'archer',          // 弓手
    HEALER = 'healer',          // 治疗
    TANK = 'tank',              // 坦克
    ASSASSIN = 'assassin',      // 刺客
    SUPPORT = 'support'         // 辅助
}

/**
 * 角色基础属性接口
 */
export interface CharacterStats {
    hp: number;             // 生命值
    attack: number;         // 攻击力
    defense: number;        // 防御力
    speed: number;          // 速度
    critRate: number;       // 暴击率 (0-1)
    critDamage: number;     // 暴击伤害 (1.5 = 150%)
    skillPower: number;     // 技能威力加成
}

/**
 * 角色技能数据接口
 */
export interface CharacterSkillData {
    id: string;
    name: string;
    description: string;
    cooldown: number;
    energyCost: number;
    damageMultiplier: number;
    effectType: string;
    effectValue: number;
}

/**
 * 角色数据接口 - 静态配置数据
 */
export interface CharacterConfig {
    id: string;
    name: string;
    title: string;              // 称号
    description: string;
    rarity: CharacterRarity;
    element: ElementType;
    characterClass: CharacterClass;
    
    // 基础属性（1级时）
    baseStats: CharacterStats;
    
    // 属性成长（每级增加）
    growthStats: CharacterStats;
    
    // 技能配置
    skill: CharacterSkillData;
    leaderSkill?: CharacterSkillData;   // 队长技能
    
    // 资源路径
    iconPath: string;
    spritePath: string;
    
    // 弹射相关
    bounceForce: number;        // 弹射力度
    colliderRadius: number;     // 碰撞半径
}

/**
 * 角色实例数据接口 - 玩家拥有的角色数据
 */
export interface CharacterInstance {
    uniqueId: string;           // 唯一实例ID
    configId: string;           // 配置ID
    level: number;              // 等级
    exp: number;                // 经验值
    star: number;               // 星级（突破次数）
    awakening: number;          // 觉醒等级
    
    // 装备槽位
    equipmentSlots: {
        weapon?: string;
        armor?: string;
        accessory?: string;
    };
    
    // 好感度
    affinity: number;
    
    // 获取时间
    obtainedAt: number;
    
    // 是否锁定（防止误操作）
    isLocked: boolean;
}

/**
 * 角色数据库 - 存储所有角色配置
 */
export class CharacterDatabase {
    private static _instance: CharacterDatabase | null = null;
    private _characters: Map<string, CharacterConfig> = new Map();

    public static get instance(): CharacterDatabase {
        if (!CharacterDatabase._instance) {
            CharacterDatabase._instance = new CharacterDatabase();
            CharacterDatabase._instance.initDatabase();
        }
        return CharacterDatabase._instance;
    }

    /**
     * 初始化角色数据库
     */
    private initDatabase(): void {
        // ========== 火属性角色 ==========
        this.addCharacter({
            id: 'char_fire_001',
            name: '烈焰剑士',
            title: '燃烧之刃',
            description: '掌控火焰的剑士，攻击时有概率点燃敌人。',
            rarity: CharacterRarity.SSR,
            element: ElementType.FIRE,
            characterClass: CharacterClass.WARRIOR,
            baseStats: {
                hp: 1200,
                attack: 150,
                defense: 80,
                speed: 100,
                critRate: 0.15,
                critDamage: 1.5,
                skillPower: 1.0
            },
            growthStats: {
                hp: 120,
                attack: 15,
                defense: 8,
                speed: 2,
                critRate: 0.005,
                critDamage: 0.02,
                skillPower: 0.02
            },
            skill: {
                id: 'skill_fire_blade',
                name: '烈焰斩',
                description: '对所有敌人造成火属性伤害，并附加燃烧效果',
                cooldown: 8,
                energyCost: 100,
                damageMultiplier: 3.5,
                effectType: 'burn',
                effectValue: 0.1
            },
            leaderSkill: {
                id: 'leader_fire_atk',
                name: '火焰之力',
                description: '队伍中火属性角色攻击力+30%',
                cooldown: 0,
                energyCost: 0,
                damageMultiplier: 0,
                effectType: 'atk_boost_fire',
                effectValue: 0.3
            },
            iconPath: 'textures/characters/fire_001_icon',
            spritePath: 'textures/characters/fire_001_sprite',
            bounceForce: 850,
            colliderRadius: 32
        });

        this.addCharacter({
            id: 'char_fire_002',
            name: '火焰法师',
            title: '炎之贤者',
            description: '精通火焰魔法的法师，技能伤害极高。',
            rarity: CharacterRarity.SR,
            element: ElementType.FIRE,
            characterClass: CharacterClass.MAGE,
            baseStats: {
                hp: 800,
                attack: 180,
                defense: 50,
                speed: 90,
                critRate: 0.1,
                critDamage: 1.8,
                skillPower: 1.3
            },
            growthStats: {
                hp: 80,
                attack: 18,
                defense: 5,
                speed: 2,
                critRate: 0.004,
                critDamage: 0.025,
                skillPower: 0.03
            },
            skill: {
                id: 'skill_meteor',
                name: '陨石冲击',
                description: '召唤巨大陨石轰击敌人，造成大范围伤害',
                cooldown: 12,
                energyCost: 100,
                damageMultiplier: 5.0,
                effectType: 'aoe',
                effectValue: 1.0
            },
            iconPath: 'textures/characters/fire_002_icon',
            spritePath: 'textures/characters/fire_002_sprite',
            bounceForce: 750,
            colliderRadius: 28
        });

        // ========== 水属性角色 ==========
        this.addCharacter({
            id: 'char_water_001',
            name: '海洋祭司',
            title: '治愈之波',
            description: '掌握海洋之力的祭司，擅长治疗队友。',
            rarity: CharacterRarity.SSR,
            element: ElementType.WATER,
            characterClass: CharacterClass.HEALER,
            baseStats: {
                hp: 1000,
                attack: 100,
                defense: 70,
                speed: 95,
                critRate: 0.08,
                critDamage: 1.3,
                skillPower: 1.5
            },
            growthStats: {
                hp: 100,
                attack: 10,
                defense: 7,
                speed: 2,
                critRate: 0.003,
                critDamage: 0.015,
                skillPower: 0.035
            },
            skill: {
                id: 'skill_heal_wave',
                name: '治愈波涛',
                description: '恢复队伍所有角色的生命值',
                cooldown: 10,
                energyCost: 100,
                damageMultiplier: 0,
                effectType: 'heal',
                effectValue: 0.3
            },
            leaderSkill: {
                id: 'leader_water_hp',
                name: '海洋庇护',
                description: '队伍中水属性角色生命值+35%',
                cooldown: 0,
                energyCost: 0,
                damageMultiplier: 0,
                effectType: 'hp_boost_water',
                effectValue: 0.35
            },
            iconPath: 'textures/characters/water_001_icon',
            spritePath: 'textures/characters/water_001_sprite',
            bounceForce: 800,
            colliderRadius: 30
        });

        this.addCharacter({
            id: 'char_water_002',
            name: '冰霜骑士',
            title: '寒冰守护',
            description: '身披寒冰铠甲的骑士，防御力极高。',
            rarity: CharacterRarity.SR,
            element: ElementType.WATER,
            characterClass: CharacterClass.TANK,
            baseStats: {
                hp: 1500,
                attack: 100,
                defense: 120,
                speed: 80,
                critRate: 0.05,
                critDamage: 1.3,
                skillPower: 0.8
            },
            growthStats: {
                hp: 150,
                attack: 10,
                defense: 12,
                speed: 1,
                critRate: 0.002,
                critDamage: 0.01,
                skillPower: 0.015
            },
            skill: {
                id: 'skill_ice_shield',
                name: '冰霜护盾',
                description: '为自己生成护盾并冻结周围敌人',
                cooldown: 8,
                energyCost: 80,
                damageMultiplier: 1.5,
                effectType: 'shield',
                effectValue: 0.2
            },
            iconPath: 'textures/characters/water_002_icon',
            spritePath: 'textures/characters/water_002_sprite',
            bounceForce: 900,
            colliderRadius: 35
        });

        // ========== 风属性角色 ==========
        this.addCharacter({
            id: 'char_wind_001',
            name: '疾风刺客',
            title: '影之疾风',
            description: '来去如风的刺客，攻击速度极快。',
            rarity: CharacterRarity.SSR,
            element: ElementType.WIND,
            characterClass: CharacterClass.ASSASSIN,
            baseStats: {
                hp: 900,
                attack: 170,
                defense: 60,
                speed: 130,
                critRate: 0.25,
                critDamage: 2.0,
                skillPower: 1.1
            },
            growthStats: {
                hp: 90,
                attack: 17,
                defense: 6,
                speed: 3,
                critRate: 0.008,
                critDamage: 0.03,
                skillPower: 0.025
            },
            skill: {
                id: 'skill_wind_slash',
                name: '暴风乱舞',
                description: '对单体敌人进行多次高速攻击',
                cooldown: 6,
                energyCost: 80,
                damageMultiplier: 4.0,
                effectType: 'multi_hit',
                effectValue: 5
            },
            leaderSkill: {
                id: 'leader_wind_speed',
                name: '疾风迅雷',
                description: '队伍中风属性角色速度+40%',
                cooldown: 0,
                energyCost: 0,
                damageMultiplier: 0,
                effectType: 'speed_boost_wind',
                effectValue: 0.4
            },
            iconPath: 'textures/characters/wind_001_icon',
            spritePath: 'textures/characters/wind_001_sprite',
            bounceForce: 950,
            colliderRadius: 28
        });

        this.addCharacter({
            id: 'char_wind_002',
            name: '风之射手',
            title: '穿云之箭',
            description: '精通风系弓术的射手，攻击必中。',
            rarity: CharacterRarity.R,
            element: ElementType.WIND,
            characterClass: CharacterClass.ARCHER,
            baseStats: {
                hp: 850,
                attack: 140,
                defense: 55,
                speed: 110,
                critRate: 0.2,
                critDamage: 1.7,
                skillPower: 1.0
            },
            growthStats: {
                hp: 85,
                attack: 14,
                defense: 5,
                speed: 2,
                critRate: 0.006,
                critDamage: 0.02,
                skillPower: 0.02
            },
            skill: {
                id: 'skill_piercing_arrow',
                name: '贯穿射击',
                description: '射出穿透敌人的箭矢，可命中多个目标',
                cooldown: 7,
                energyCost: 70,
                damageMultiplier: 2.5,
                effectType: 'pierce',
                effectValue: 3
            },
            iconPath: 'textures/characters/wind_002_icon',
            spritePath: 'textures/characters/wind_002_sprite',
            bounceForce: 820,
            colliderRadius: 28
        });

        // ========== 雷属性角色 ==========
        this.addCharacter({
            id: 'char_thunder_001',
            name: '雷霆战神',
            title: '天罚之雷',
            description: '掌控雷霆的战神，攻击附带麻痹效果。',
            rarity: CharacterRarity.UR,
            element: ElementType.THUNDER,
            characterClass: CharacterClass.WARRIOR,
            baseStats: {
                hp: 1300,
                attack: 200,
                defense: 90,
                speed: 105,
                critRate: 0.2,
                critDamage: 1.8,
                skillPower: 1.2
            },
            growthStats: {
                hp: 130,
                attack: 20,
                defense: 9,
                speed: 2,
                critRate: 0.006,
                critDamage: 0.025,
                skillPower: 0.03
            },
            skill: {
                id: 'skill_thunder_god',
                name: '雷神降临',
                description: '召唤天雷轰击所有敌人，有概率麻痹',
                cooldown: 10,
                energyCost: 100,
                damageMultiplier: 4.5,
                effectType: 'paralyze',
                effectValue: 0.3
            },
            leaderSkill: {
                id: 'leader_thunder_crit',
                name: '雷霆之怒',
                description: '队伍所有角色暴击伤害+50%',
                cooldown: 0,
                energyCost: 0,
                damageMultiplier: 0,
                effectType: 'crit_damage_boost',
                effectValue: 0.5
            },
            iconPath: 'textures/characters/thunder_001_icon',
            spritePath: 'textures/characters/thunder_001_sprite',
            bounceForce: 880,
            colliderRadius: 34
        });

        // ========== 光属性角色 ==========
        this.addCharacter({
            id: 'char_light_001',
            name: '圣光天使',
            title: '神圣裁决',
            description: '降临凡间的天使，对暗属性敌人造成额外伤害。',
            rarity: CharacterRarity.SSR,
            element: ElementType.LIGHT,
            characterClass: CharacterClass.SUPPORT,
            baseStats: {
                hp: 1100,
                attack: 140,
                defense: 75,
                speed: 100,
                critRate: 0.12,
                critDamage: 1.5,
                skillPower: 1.4
            },
            growthStats: {
                hp: 110,
                attack: 14,
                defense: 7,
                speed: 2,
                critRate: 0.004,
                critDamage: 0.02,
                skillPower: 0.032
            },
            skill: {
                id: 'skill_holy_light',
                name: '圣光审判',
                description: '释放圣光净化敌人，并为队友提供增益',
                cooldown: 9,
                energyCost: 90,
                damageMultiplier: 3.0,
                effectType: 'buff_all',
                effectValue: 0.2
            },
            leaderSkill: {
                id: 'leader_light_def',
                name: '圣光护佑',
                description: '队伍所有角色防御力+25%',
                cooldown: 0,
                energyCost: 0,
                damageMultiplier: 0,
                effectType: 'def_boost',
                effectValue: 0.25
            },
            iconPath: 'textures/characters/light_001_icon',
            spritePath: 'textures/characters/light_001_sprite',
            bounceForce: 830,
            colliderRadius: 30
        });

        // ========== 暗属性角色 ==========
        this.addCharacter({
            id: 'char_dark_001',
            name: '暗影领主',
            title: '深渊支配',
            description: '来自深渊的领主，拥有强大的黑暗力量。',
            rarity: CharacterRarity.UR,
            element: ElementType.DARK,
            characterClass: CharacterClass.MAGE,
            baseStats: {
                hp: 1000,
                attack: 220,
                defense: 65,
                speed: 95,
                critRate: 0.18,
                critDamage: 2.0,
                skillPower: 1.5
            },
            growthStats: {
                hp: 100,
                attack: 22,
                defense: 6,
                speed: 2,
                critRate: 0.005,
                critDamage: 0.03,
                skillPower: 0.035
            },
            skill: {
                id: 'skill_dark_void',
                name: '虚空吞噬',
                description: '创造黑洞吞噬敌人，造成持续伤害',
                cooldown: 12,
                energyCost: 100,
                damageMultiplier: 5.5,
                effectType: 'dot',
                effectValue: 0.15
            },
            leaderSkill: {
                id: 'leader_dark_power',
                name: '黑暗支配',
                description: '队伍所有角色技能伤害+40%',
                cooldown: 0,
                energyCost: 0,
                damageMultiplier: 0,
                effectType: 'skill_boost',
                effectValue: 0.4
            },
            iconPath: 'textures/characters/dark_001_icon',
            spritePath: 'textures/characters/dark_001_sprite',
            bounceForce: 800,
            colliderRadius: 32
        });

        // ========== 初始角色（N稀有度）==========
        this.addCharacter({
            id: 'char_starter_001',
            name: '见习剑士',
            title: '新手冒险者',
            description: '刚刚踏上冒险旅程的新手剑士。',
            rarity: CharacterRarity.N,
            element: ElementType.FIRE,
            characterClass: CharacterClass.WARRIOR,
            baseStats: {
                hp: 800,
                attack: 100,
                defense: 60,
                speed: 90,
                critRate: 0.1,
                critDamage: 1.5,
                skillPower: 1.0
            },
            growthStats: {
                hp: 80,
                attack: 10,
                defense: 6,
                speed: 2,
                critRate: 0.003,
                critDamage: 0.015,
                skillPower: 0.02
            },
            skill: {
                id: 'skill_basic_slash',
                name: '基础斩击',
                description: '对敌人进行一次斩击',
                cooldown: 5,
                energyCost: 60,
                damageMultiplier: 2.0,
                effectType: 'damage',
                effectValue: 0
            },
            iconPath: 'textures/characters/starter_001_icon',
            spritePath: 'textures/characters/starter_001_sprite',
            bounceForce: 800,
            colliderRadius: 30
        });

        console.log(`角色数据库初始化完成，共 ${this._characters.size} 个角色`);
    }

    /**
     * 添加角色配置
     */
    private addCharacter(config: CharacterConfig): void {
        this._characters.set(config.id, config);
    }

    /**
     * 获取角色配置
     */
    public getCharacter(id: string): CharacterConfig | undefined {
        return this._characters.get(id);
    }

    /**
     * 获取所有角色配置
     */
    public getAllCharacters(): CharacterConfig[] {
        return Array.from(this._characters.values());
    }

    /**
     * 根据稀有度筛选角色
     */
    public getCharactersByRarity(rarity: CharacterRarity): CharacterConfig[] {
        return this.getAllCharacters().filter(c => c.rarity === rarity);
    }

    /**
     * 根据元素筛选角色
     */
    public getCharactersByElement(element: ElementType): CharacterConfig[] {
        return this.getAllCharacters().filter(c => c.element === element);
    }

    /**
     * 根据职业筛选角色
     */
    public getCharactersByClass(charClass: CharacterClass): CharacterConfig[] {
        return this.getAllCharacters().filter(c => c.characterClass === charClass);
    }

    /**
     * 计算角色在指定等级的属性
     */
    public calculateStats(config: CharacterConfig, level: number, star: number = 0): CharacterStats {
        const starMultiplier = 1 + star * 0.1; // 每星+10%属性
        
        return {
            hp: Math.floor((config.baseStats.hp + config.growthStats.hp * (level - 1)) * starMultiplier),
            attack: Math.floor((config.baseStats.attack + config.growthStats.attack * (level - 1)) * starMultiplier),
            defense: Math.floor((config.baseStats.defense + config.growthStats.defense * (level - 1)) * starMultiplier),
            speed: Math.floor((config.baseStats.speed + config.growthStats.speed * (level - 1)) * starMultiplier),
            critRate: Math.min(1, config.baseStats.critRate + config.growthStats.critRate * (level - 1)),
            critDamage: config.baseStats.critDamage + config.growthStats.critDamage * (level - 1),
            skillPower: config.baseStats.skillPower + config.growthStats.skillPower * (level - 1)
        };
    }

    /**
     * 计算升级所需经验
     */
    public getExpRequired(level: number): number {
        return Math.floor(100 * Math.pow(1.15, level - 1));
    }

    /**
     * 获取稀有度颜色
     */
    public getRarityColor(rarity: CharacterRarity): string {
        switch (rarity) {
            case CharacterRarity.N: return '#AAAAAA';
            case CharacterRarity.R: return '#55AA55';
            case CharacterRarity.SR: return '#5555FF';
            case CharacterRarity.SSR: return '#AA55AA';
            case CharacterRarity.UR: return '#FFAA00';
            default: return '#FFFFFF';
        }
    }

    /**
     * 获取稀有度名称
     */
    public getRarityName(rarity: CharacterRarity): string {
        switch (rarity) {
            case CharacterRarity.N: return 'N';
            case CharacterRarity.R: return 'R';
            case CharacterRarity.SR: return 'SR';
            case CharacterRarity.SSR: return 'SSR';
            case CharacterRarity.UR: return 'UR';
            default: return '?';
        }
    }

    /**
     * 获取元素颜色
     */
    public getElementColor(element: ElementType): string {
        switch (element) {
            case ElementType.FIRE: return '#FF5533';
            case ElementType.WATER: return '#3399FF';
            case ElementType.WIND: return '#33FF99';
            case ElementType.THUNDER: return '#FFFF33';
            case ElementType.LIGHT: return '#FFFFAA';
            case ElementType.DARK: return '#9933FF';
            default: return '#FFFFFF';
        }
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
            default: return '?';
        }
    }
}
