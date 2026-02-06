import { _decorator, Component, sys, EventTarget } from 'cc';
import { SkillDatabase, SkillConfig, SkillInstance, SkillType } from './SkillData';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 技能板类型（世界弹射物语特色）
 * 一板：普通材料+星星，基础升级
 * 二板：高级材料+星星，高级升级
 */
export enum SkillPanelType {
    PANEL_ONE = 'panel_one',    // 一板
    PANEL_TWO = 'panel_two'     // 二板
}

/**
 * 技能升级材料
 */
export interface SkillUpgradeMaterial {
    type: CurrencyType | 'skill_book' | 'star_material' | 'element_material' | 'boss_material';
    amount: number;
    skillBookRarity?: string;       // 技能书稀有度
    elementType?: string;           // 属性材料类型
    bossType?: string;              // Boss材料类型
}

/**
 * 技能升级配置
 */
export interface SkillUpgradeConfig {
    level: number;
    panel: SkillPanelType;          // 所属面板
    expRequired: number;
    materials: SkillUpgradeMaterial[];
    goldCost: number;
    starCost: number;               // 星星消耗
}

/**
 * 技能板数据
 */
export interface SkillPanelData {
    skillId: string;
    panel: SkillPanelType;
    level: number;                  // 当前等级
    maxLevel: number;               // 最大等级
    exp: number;
    isUnlocked: boolean;            // 是否解锁
    unlockCondition?: string;       // 解锁条件描述
}

/**
 * 角色技能数据
 */
export interface CharacterSkillData {
    characterId: string;
    skills: SkillInstance[];
    skillPanels: Map<string, SkillPanelData[]>;  // 技能ID -> 面板数据
    equippedSkillIds: string[];     // 当前装备的技能
    maxEquipSlots: number;          // 最大装备槽位
}

/**
 * 技能书数据
 */
export interface SkillBookData {
    id: string;
    name: string;
    rarity: 'N' | 'R' | 'SR' | 'SSR';
    expValue: number;
    count: number;
}

/**
 * 星星材料数据
 */
export interface StarMaterialData {
    id: string;
    name: string;
    tier: number;               // 等级 1-5
    count: number;
}

/**
 * 属性材料数据
 */
export interface ElementMaterialData {
    id: string;
    name: string;
    element: string;
    tier: number;
    count: number;
}

/**
 * Boss材料数据
 */
export interface BossMaterialData {
    id: string;
    name: string;
    bossType: string;
    count: number;
}

/**
 * 技能升级系统 - 支持一板/二板差异化升级
 * Skill Upgrade System - Panel One/Two differentiated upgrade
 */
@ccclass('SkillUpgradeSystem')
export class SkillUpgradeSystem extends Component {
    private static _instance: SkillUpgradeSystem | null = null;

    // 角色技能数据 (characterId -> data)
    private _characterSkills: Map<string, CharacterSkillData> = new Map();
    
    // 技能书库存
    private _skillBooks: Map<string, SkillBookData> = new Map();

    // 星星材料库存
    private _starMaterials: Map<string, StarMaterialData> = new Map();

    // 属性材料库存
    private _elementMaterials: Map<string, ElementMaterialData> = new Map();

    // Boss材料库存
    private _bossMaterials: Map<string, BossMaterialData> = new Map();
    
    // 一板升级配置
    private _panelOneConfigs: SkillUpgradeConfig[] = [];

    // 二板升级配置
    private _panelTwoConfigs: SkillUpgradeConfig[] = [];
    
    // 最大技能等级
    private readonly MAX_PANEL_ONE_LEVEL = 5;   // 一板最高5级
    private readonly MAX_PANEL_TWO_LEVEL = 5;   // 二板最高5级
    
    // 默认装备槽位
    private readonly DEFAULT_EQUIP_SLOTS = 3;

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_SKILL_UPGRADED = 'skill_upgraded';
    public static readonly EVENT_SKILL_UNLOCKED = 'skill_unlocked';
    public static readonly EVENT_SKILL_EQUIPPED = 'skill_equipped';
    public static readonly EVENT_SKILL_UNEQUIPPED = 'skill_unequipped';
    public static readonly EVENT_PANEL_UNLOCKED = 'panel_unlocked';
    public static readonly EVENT_PANEL_UPGRADED = 'panel_upgraded';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_skill_upgrades_v2';

    public static get instance(): SkillUpgradeSystem | null {
        return SkillUpgradeSystem._instance;
    }

    onLoad() {
        if (SkillUpgradeSystem._instance) {
            this.node.destroy();
            return;
        }
        SkillUpgradeSystem._instance = this;

        this.initUpgradeConfigs();
        this.initMaterials();
        this.loadData();
    }

    /**
     * 初始化升级配置
     */
    private initUpgradeConfigs(): void {
        // ========== 一板配置（普通材料+星星）==========
        for (let level = 1; level <= this.MAX_PANEL_ONE_LEVEL; level++) {
            this._panelOneConfigs.push({
                level,
                panel: SkillPanelType.PANEL_ONE,
                expRequired: this.calculatePanelOneExp(level),
                materials: this.calculatePanelOneMaterials(level),
                goldCost: this.calculatePanelOneGold(level),
                starCost: this.calculatePanelOneStars(level)
            });
        }

        // ========== 二板配置（高级材料+星星）==========
        for (let level = 1; level <= this.MAX_PANEL_TWO_LEVEL; level++) {
            this._panelTwoConfigs.push({
                level,
                panel: SkillPanelType.PANEL_TWO,
                expRequired: this.calculatePanelTwoExp(level),
                materials: this.calculatePanelTwoMaterials(level),
                goldCost: this.calculatePanelTwoGold(level),
                starCost: this.calculatePanelTwoStars(level)
            });
        }

        console.log(`技能升级配置初始化完成: 一板${this.MAX_PANEL_ONE_LEVEL}级, 二板${this.MAX_PANEL_TWO_LEVEL}级`);
    }

    // ========== 一板计算（普通材料）==========

    private calculatePanelOneExp(level: number): number {
        return Math.floor(100 * Math.pow(1.3, level - 1));
    }

    private calculatePanelOneMaterials(level: number): SkillUpgradeMaterial[] {
        const materials: SkillUpgradeMaterial[] = [];
        
        // 普通技能书
        if (level <= 2) {
            materials.push({ type: 'skill_book', amount: level * 2, skillBookRarity: 'N' });
        } else if (level <= 4) {
            materials.push({ type: 'skill_book', amount: level, skillBookRarity: 'R' });
        } else {
            materials.push({ type: 'skill_book', amount: level - 2, skillBookRarity: 'SR' });
        }

        // 星星材料（低级）
        materials.push({ type: 'star_material', amount: level });

        return materials;
    }

    private calculatePanelOneGold(level: number): number {
        return Math.floor(500 * Math.pow(1.5, level - 1));
    }

    private calculatePanelOneStars(level: number): number {
        return level;  // 1-5星
    }

    // ========== 二板计算（高级材料）==========

    private calculatePanelTwoExp(level: number): number {
        return Math.floor(300 * Math.pow(1.5, level - 1));
    }

    private calculatePanelTwoMaterials(level: number): SkillUpgradeMaterial[] {
        const materials: SkillUpgradeMaterial[] = [];
        
        // 高级技能书
        if (level <= 2) {
            materials.push({ type: 'skill_book', amount: level, skillBookRarity: 'SR' });
        } else {
            materials.push({ type: 'skill_book', amount: level - 1, skillBookRarity: 'SSR' });
        }

        // 星星材料（高级）
        materials.push({ type: 'star_material', amount: level + 2 });

        // 属性材料
        materials.push({ type: 'element_material', amount: level });

        // 高等级需要Boss材料
        if (level >= 4) {
            materials.push({ type: 'boss_material', amount: level - 3 });
        }

        return materials;
    }

    private calculatePanelTwoGold(level: number): number {
        return Math.floor(2000 * Math.pow(2.0, level - 1));
    }

    private calculatePanelTwoStars(level: number): number {
        return level + 2;  // 3-7星
    }

    /**
     * 初始化所有材料
     */
    private initMaterials(): void {
        // 技能书
        const books: SkillBookData[] = [
            { id: 'skill_book_n', name: '初级技能书', rarity: 'N', expValue: 50, count: 0 },
            { id: 'skill_book_r', name: '中级技能书', rarity: 'R', expValue: 150, count: 0 },
            { id: 'skill_book_sr', name: '高级技能书', rarity: 'SR', expValue: 500, count: 0 },
            { id: 'skill_book_ssr', name: '特级技能书', rarity: 'SSR', expValue: 1500, count: 0 }
        ];
        for (const book of books) {
            this._skillBooks.set(book.id, book);
        }

        // 星星材料
        const stars: StarMaterialData[] = [
            { id: 'star_1', name: '一星碎片', tier: 1, count: 0 },
            { id: 'star_2', name: '二星碎片', tier: 2, count: 0 },
            { id: 'star_3', name: '三星碎片', tier: 3, count: 0 },
            { id: 'star_4', name: '四星碎片', tier: 4, count: 0 },
            { id: 'star_5', name: '五星碎片', tier: 5, count: 0 }
        ];
        for (const star of stars) {
            this._starMaterials.set(star.id, star);
        }

        // 属性材料
        const elements = ['fire', 'water', 'wind', 'thunder', 'light', 'dark'];
        for (const elem of elements) {
            this._elementMaterials.set(`elem_${elem}_low`, {
                id: `elem_${elem}_low`,
                name: `${this.getElementName(elem)}精华(低)`,
                element: elem,
                tier: 1,
                count: 0
            });
            this._elementMaterials.set(`elem_${elem}_mid`, {
                id: `elem_${elem}_mid`,
                name: `${this.getElementName(elem)}精华(中)`,
                element: elem,
                tier: 2,
                count: 0
            });
            this._elementMaterials.set(`elem_${elem}_high`, {
                id: `elem_${elem}_high`,
                name: `${this.getElementName(elem)}精华(高)`,
                element: elem,
                tier: 3,
                count: 0
            });
        }

        // Boss材料
        const bosses: BossMaterialData[] = [
            { id: 'boss_golem', name: '巨像核心', bossType: 'golem', count: 0 },
            { id: 'boss_dragon', name: '龙晶', bossType: 'dragon', count: 0 },
            { id: 'boss_demon', name: '魔王之角', bossType: 'demon', count: 0 },
            { id: 'boss_ancient', name: '古代遗物', bossType: 'ancient', count: 0 }
        ];
        for (const boss of bosses) {
            this._bossMaterials.set(boss.id, boss);
        }

        console.log('技能升级材料初始化完成');
    }

    private getElementName(element: string): string {
        const names: Record<string, string> = {
            fire: '火焰', water: '流水', wind: '疾风',
            thunder: '雷电', light: '圣光', dark: '暗影'
        };
        return names[element] || element;
    }

    /**
     * 获取或创建角色技能数据
     */
    public getCharacterSkillData(characterId: string): CharacterSkillData {
        if (!this._characterSkills.has(characterId)) {
            this._characterSkills.set(characterId, {
                characterId,
                skills: [],
                skillPanels: new Map(),
                equippedSkillIds: [],
                maxEquipSlots: this.DEFAULT_EQUIP_SLOTS
            });
        }
        return this._characterSkills.get(characterId)!;
    }

    /**
     * 解锁技能
     */
    public unlockSkill(characterId: string, skillId: string): boolean {
        const skillConfig = SkillDatabase.instance.getSkill(skillId);
        if (!skillConfig) {
            console.log('技能不存在');
            return false;
        }

        const data = this.getCharacterSkillData(characterId);
        
        // 检查是否已解锁
        if (data.skills.some(s => s.skillId === skillId)) {
            console.log('技能已解锁');
            return false;
        }

        // 添加技能
        data.skills.push({
            skillId,
            level: 1,
            exp: 0
        });

        // 初始化技能面板
        this.initSkillPanels(data, skillId);

        this.saveData();

        this.events.emit(SkillUpgradeSystem.EVENT_SKILL_UNLOCKED, {
            characterId,
            skillId,
            skill: skillConfig
        });

        return true;
    }

    /**
     * 初始化技能的面板数据
     */
    private initSkillPanels(data: CharacterSkillData, skillId: string): void {
        const panels: SkillPanelData[] = [
            {
                skillId,
                panel: SkillPanelType.PANEL_ONE,
                level: 1,
                maxLevel: this.MAX_PANEL_ONE_LEVEL,
                exp: 0,
                isUnlocked: true,  // 一板默认解锁
                unlockCondition: undefined
            },
            {
                skillId,
                panel: SkillPanelType.PANEL_TWO,
                level: 0,
                maxLevel: this.MAX_PANEL_TWO_LEVEL,
                exp: 0,
                isUnlocked: false,  // 二板需要解锁
                unlockCondition: '一板达到5级后解锁'
            }
        ];

        data.skillPanels.set(skillId, panels);
    }

    /**
     * 获取技能面板数据
     */
    public getSkillPanelData(characterId: string, skillId: string, panel: SkillPanelType): SkillPanelData | null {
        const data = this._characterSkills.get(characterId);
        if (!data) return null;

        const panels = data.skillPanels.get(skillId);
        if (!panels) return null;

        return panels.find(p => p.panel === panel) || null;
    }

    /**
     * 解锁二板
     */
    public unlockPanelTwo(characterId: string, skillId: string): boolean {
        const data = this._characterSkills.get(characterId);
        if (!data) return false;

        const panels = data.skillPanels.get(skillId);
        if (!panels) return false;

        const panelOne = panels.find(p => p.panel === SkillPanelType.PANEL_ONE);
        const panelTwo = panels.find(p => p.panel === SkillPanelType.PANEL_TWO);

        if (!panelOne || !panelTwo) return false;

        // 检查一板是否满级
        if (panelOne.level < this.MAX_PANEL_ONE_LEVEL) {
            console.log(`一板需要达到${this.MAX_PANEL_ONE_LEVEL}级才能解锁二板`);
            return false;
        }

        if (panelTwo.isUnlocked) {
            console.log('二板已解锁');
            return false;
        }

        // 解锁二板
        panelTwo.isUnlocked = true;
        panelTwo.level = 1;

        this.saveData();

        this.events.emit(SkillUpgradeSystem.EVENT_PANEL_UNLOCKED, {
            characterId,
            skillId,
            panel: SkillPanelType.PANEL_TWO
        });

        console.log(`技能 ${skillId} 二板解锁成功！`);
        return true;
    }

    /**
     * 升级技能面板
     */
    public upgradeSkillPanel(characterId: string, skillId: string, panel: SkillPanelType): boolean {
        const data = this._characterSkills.get(characterId);
        if (!data) return false;

        const panelData = this.getSkillPanelData(characterId, skillId, panel);
        if (!panelData) {
            console.log('面板数据不存在');
            return false;
        }

        if (!panelData.isUnlocked) {
            console.log('面板未解锁');
            return false;
        }

        if (panelData.level >= panelData.maxLevel) {
            console.log('面板已达最高等级');
            return false;
        }

        // 获取升级配置
        const configs = panel === SkillPanelType.PANEL_ONE ? 
            this._panelOneConfigs : this._panelTwoConfigs;
        const config = configs[panelData.level - 1];
        
        if (!config) {
            console.log('找不到升级配置');
            return false;
        }

        // 检查并消耗材料
        if (!this.consumePanelUpgradeMaterials(config, characterId)) {
            console.log('材料不足');
            return false;
        }

        // 升级
        panelData.level++;
        panelData.exp = 0;

        // 同步更新技能实例等级（取两板最高）
        const skillInstance = data.skills.find(s => s.skillId === skillId);
        if (skillInstance) {
            const panels = data.skillPanels.get(skillId);
            if (panels) {
                const totalLevel = panels.reduce((sum, p) => sum + (p.isUnlocked ? p.level : 0), 0);
                skillInstance.level = totalLevel;
            }
        }

        this.saveData();

        this.events.emit(SkillUpgradeSystem.EVENT_PANEL_UPGRADED, {
            characterId,
            skillId,
            panel,
            newLevel: panelData.level
        });

        console.log(`技能 ${skillId} ${panel === SkillPanelType.PANEL_ONE ? '一板' : '二板'} 升级到 ${panelData.level} 级`);

        // 检查是否可以解锁二板
        if (panel === SkillPanelType.PANEL_ONE && panelData.level >= this.MAX_PANEL_ONE_LEVEL) {
            console.log('一板已满级，可以解锁二板！');
        }

        return true;
    }

    /**
     * 消耗面板升级材料
     */
    private consumePanelUpgradeMaterials(config: SkillUpgradeConfig, characterId: string): boolean {
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager) return false;

        // 检查金币
        if (!currencyManager.hasCurrency(CurrencyType.GOLD, config.goldCost)) {
            console.log('金币不足');
            return false;
        }

        // 检查所有材料
        for (const material of config.materials) {
            if (!this.checkMaterial(material)) {
                console.log(`材料不足: ${material.type}`);
                return false;
            }
        }

        // 消耗金币
        currencyManager.spendCurrency(CurrencyType.GOLD, config.goldCost, '技能升级');

        // 消耗材料
        for (const material of config.materials) {
            this.consumeMaterial(material);
        }

        return true;
    }

    /**
     * 检查材料是否足够
     */
    private checkMaterial(material: SkillUpgradeMaterial): boolean {
        switch (material.type) {
            case 'skill_book':
                const bookId = `skill_book_${material.skillBookRarity?.toLowerCase()}`;
                const book = this._skillBooks.get(bookId);
                return book ? book.count >= material.amount : false;

            case 'star_material':
                // 使用最低级星星材料
                const star = this._starMaterials.get('star_1');
                return star ? star.count >= material.amount : false;

            case 'element_material':
                // 检查任意属性材料（简化）
                for (const elem of this._elementMaterials.values()) {
                    if (elem.count >= material.amount) return true;
                }
                return false;

            case 'boss_material':
                // 检查任意Boss材料
                for (const boss of this._bossMaterials.values()) {
                    if (boss.count >= material.amount) return true;
                }
                return false;

            default:
                return true;
        }
    }

    /**
     * 消耗材料
     */
    private consumeMaterial(material: SkillUpgradeMaterial): void {
        switch (material.type) {
            case 'skill_book':
                const bookId = `skill_book_${material.skillBookRarity?.toLowerCase()}`;
                const book = this._skillBooks.get(bookId);
                if (book) book.count -= material.amount;
                break;

            case 'star_material':
                const star = this._starMaterials.get('star_1');
                if (star) star.count -= material.amount;
                break;

            case 'element_material':
                for (const elem of this._elementMaterials.values()) {
                    if (elem.count >= material.amount) {
                        elem.count -= material.amount;
                        break;
                    }
                }
                break;

            case 'boss_material':
                for (const boss of this._bossMaterials.values()) {
                    if (boss.count >= material.amount) {
                        boss.count -= material.amount;
                        break;
                    }
                }
                break;
        }
    }

    /**
     * 升级技能（兼容旧接口）
     */
    public upgradeSkill(characterId: string, skillId: string): boolean {
        // 默认升级一板，如果一板满级则升级二板
        const panelOne = this.getSkillPanelData(characterId, skillId, SkillPanelType.PANEL_ONE);
        const panelTwo = this.getSkillPanelData(characterId, skillId, SkillPanelType.PANEL_TWO);

        if (panelOne && panelOne.level < panelOne.maxLevel) {
            return this.upgradeSkillPanel(characterId, skillId, SkillPanelType.PANEL_ONE);
        }

        if (panelTwo && panelTwo.isUnlocked && panelTwo.level < panelTwo.maxLevel) {
            return this.upgradeSkillPanel(characterId, skillId, SkillPanelType.PANEL_TWO);
        }

        // 如果一板满级但二板未解锁，尝试解锁
        if (panelOne && panelOne.level >= panelOne.maxLevel && panelTwo && !panelTwo.isUnlocked) {
            return this.unlockPanelTwo(characterId, skillId);
        }

        console.log('技能已达最高等级');
        return false;
    }

    /**
     * 使用技能书增加经验
     */
    public addSkillExp(characterId: string, skillId: string, bookId: string, count: number = 1): boolean {
        const data = this.getCharacterSkillData(characterId);
        const skillInstance = data.skills.find(s => s.skillId === skillId);
        
        if (!skillInstance) {
            console.log('技能未解锁');
            return false;
        }

        if (skillInstance.level >= this.MAX_SKILL_LEVEL) {
            console.log('技能已达最高等级');
            return false;
        }

        const book = this._skillBooks.get(bookId);
        if (!book || book.count < count) {
            console.log('技能书不足');
            return false;
        }

        // 消耗技能书
        book.count -= count;

        // 增加经验
        const expGain = book.expValue * count;
        skillInstance.exp += expGain;

        // 检查是否可以升级
        const config = this._upgradeConfigs[skillInstance.level - 1];
        if (config && skillInstance.exp >= config.expRequired) {
            // 自动升级（如果材料足够）
            this.checkAutoUpgrade(characterId, skillId);
        }

        this.saveData();
        return true;
    }

    /**
     * 检查自动升级
     */
    private checkAutoUpgrade(characterId: string, skillId: string): void {
        const data = this.getCharacterSkillData(characterId);
        const skillInstance = data.skills.find(s => s.skillId === skillId);
        if (!skillInstance) return;

        const config = this._upgradeConfigs[skillInstance.level - 1];
        if (!config) return;

        if (skillInstance.exp >= config.expRequired) {
            // 只检查金币，材料检查用于手动升级
            const currencyManager = CurrencyManager.instance;
            if (currencyManager && currencyManager.hasCurrency(CurrencyType.GOLD, config.goldCost)) {
                // 可以提示用户进行升级
            }
        }
    }

    /**
     * 消耗升级材料
     */
    private consumeUpgradeMaterials(config: SkillUpgradeConfig): boolean {
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager) return false;

        // 检查金币
        if (!currencyManager.hasCurrency(CurrencyType.GOLD, config.goldCost)) {
            return false;
        }

        // 检查材料
        for (const material of config.materials) {
            if (material.type === 'skill_book') {
                const bookId = `skill_book_${material.skillBookRarity?.toLowerCase()}`;
                const book = this._skillBooks.get(bookId);
                if (!book || book.count < material.amount) {
                    return false;
                }
            }
        }

        // 消耗金币
        currencyManager.spendCurrency(CurrencyType.GOLD, config.goldCost, '技能升级');

        // 消耗材料
        for (const material of config.materials) {
            if (material.type === 'skill_book') {
                const bookId = `skill_book_${material.skillBookRarity?.toLowerCase()}`;
                const book = this._skillBooks.get(bookId);
                if (book) {
                    book.count -= material.amount;
                }
            }
        }

        return true;
    }

    /**
     * 装备技能
     */
    public equipSkill(characterId: string, skillId: string, slot?: number): boolean {
        const data = this.getCharacterSkillData(characterId);
        
        // 检查技能是否已解锁
        if (!data.skills.some(s => s.skillId === skillId)) {
            console.log('技能未解锁');
            return false;
        }

        // 检查技能是否已装备
        if (data.equippedSkillIds.includes(skillId)) {
            console.log('技能已装备');
            return false;
        }

        // 检查槽位
        if (data.equippedSkillIds.length >= data.maxEquipSlots) {
            console.log('装备槽位已满');
            return false;
        }

        // 装备技能
        if (slot !== undefined && slot < data.maxEquipSlots) {
            // 如果指定槽位已有技能，先卸下
            if (data.equippedSkillIds[slot]) {
                this.unequipSkill(characterId, data.equippedSkillIds[slot]);
            }
            data.equippedSkillIds[slot] = skillId;
        } else {
            data.equippedSkillIds.push(skillId);
        }

        this.saveData();

        this.events.emit(SkillUpgradeSystem.EVENT_SKILL_EQUIPPED, {
            characterId,
            skillId,
            slot
        });

        return true;
    }

    /**
     * 卸下技能
     */
    public unequipSkill(characterId: string, skillId: string): boolean {
        const data = this.getCharacterSkillData(characterId);
        
        const index = data.equippedSkillIds.indexOf(skillId);
        if (index === -1) {
            console.log('技能未装备');
            return false;
        }

        data.equippedSkillIds.splice(index, 1);
        this.saveData();

        this.events.emit(SkillUpgradeSystem.EVENT_SKILL_UNEQUIPPED, {
            characterId,
            skillId
        });

        return true;
    }

    /**
     * 获取技能等级
     */
    public getSkillLevel(characterId: string, skillId: string): number {
        const data = this.getCharacterSkillData(characterId);
        const skill = data.skills.find(s => s.skillId === skillId);
        return skill?.level || 0;
    }

    /**
     * 获取技能实例
     */
    public getSkillInstance(characterId: string, skillId: string): SkillInstance | null {
        const data = this.getCharacterSkillData(characterId);
        return data.skills.find(s => s.skillId === skillId) || null;
    }

    /**
     * 获取已装备的技能
     */
    public getEquippedSkills(characterId: string): SkillConfig[] {
        const data = this.getCharacterSkillData(characterId);
        const skills: SkillConfig[] = [];

        for (const skillId of data.equippedSkillIds) {
            const skill = SkillDatabase.instance.getSkill(skillId);
            if (skill) {
                skills.push(skill);
            }
        }

        return skills;
    }

    /**
     * 获取所有已解锁技能
     */
    public getUnlockedSkills(characterId: string): SkillConfig[] {
        const data = this.getCharacterSkillData(characterId);
        const skills: SkillConfig[] = [];

        for (const instance of data.skills) {
            const skill = SkillDatabase.instance.getSkill(instance.skillId);
            if (skill) {
                skills.push(skill);
            }
        }

        return skills;
    }

    /**
     * 获取升级配置
     */
    public getUpgradeConfig(level: number): SkillUpgradeConfig | null {
        return this._upgradeConfigs[level - 1] || null;
    }

    /**
     * 获取升级进度
     */
    public getUpgradeProgress(characterId: string, skillId: string): {
        currentExp: number;
        requiredExp: number;
        percent: number;
        canUpgrade: boolean;
    } | null {
        const skill = this.getSkillInstance(characterId, skillId);
        if (!skill) return null;

        const config = this.getUpgradeConfig(skill.level);
        if (!config) return null;

        return {
            currentExp: skill.exp,
            requiredExp: config.expRequired,
            percent: Math.min(100, (skill.exp / config.expRequired) * 100),
            canUpgrade: skill.exp >= config.expRequired
        };
    }

    /**
     * 添加技能书
     */
    public addSkillBook(bookId: string, count: number): void {
        const book = this._skillBooks.get(bookId);
        if (book) {
            book.count += count;
            this.saveData();
        }
    }

    /**
     * 获取技能书数量
     */
    public getSkillBookCount(bookId: string): number {
        return this._skillBooks.get(bookId)?.count || 0;
    }

    /**
     * 获取所有技能书
     */
    public getAllSkillBooks(): SkillBookData[] {
        return Array.from(this._skillBooks.values());
    }

    /**
     * 增加装备槽位
     */
    public addEquipSlot(characterId: string): void {
        const data = this.getCharacterSkillData(characterId);
        data.maxEquipSlots++;
        this.saveData();
    }

    // ========== 材料管理 ==========

    /**
     * 添加星星材料
     */
    public addStarMaterial(tier: number, amount: number): void {
        const id = `star_${tier}`;
        const star = this._starMaterials.get(id);
        if (star) {
            star.count += amount;
            this.saveData();
        }
    }

    /**
     * 获取星星材料数量
     */
    public getStarMaterialCount(tier: number): number {
        const id = `star_${tier}`;
        return this._starMaterials.get(id)?.count || 0;
    }

    /**
     * 添加属性材料
     */
    public addElementMaterial(element: string, tier: number, amount: number): void {
        const tierName = tier === 1 ? 'low' : tier === 2 ? 'mid' : 'high';
        const id = `elem_${element}_${tierName}`;
        const mat = this._elementMaterials.get(id);
        if (mat) {
            mat.count += amount;
            this.saveData();
        }
    }

    /**
     * 获取属性材料数量
     */
    public getElementMaterialCount(element: string, tier: number): number {
        const tierName = tier === 1 ? 'low' : tier === 2 ? 'mid' : 'high';
        const id = `elem_${element}_${tierName}`;
        return this._elementMaterials.get(id)?.count || 0;
    }

    /**
     * 添加Boss材料
     */
    public addBossMaterial(bossType: string, amount: number): void {
        const id = `boss_${bossType}`;
        const mat = this._bossMaterials.get(id);
        if (mat) {
            mat.count += amount;
            this.saveData();
        }
    }

    /**
     * 获取Boss材料数量
     */
    public getBossMaterialCount(bossType: string): number {
        const id = `boss_${bossType}`;
        return this._bossMaterials.get(id)?.count || 0;
    }

    /**
     * 获取所有材料状态
     */
    public getAllMaterials(): {
        skillBooks: SkillBookData[];
        starMaterials: StarMaterialData[];
        elementMaterials: ElementMaterialData[];
        bossMaterials: BossMaterialData[];
    } {
        return {
            skillBooks: Array.from(this._skillBooks.values()),
            starMaterials: Array.from(this._starMaterials.values()),
            elementMaterials: Array.from(this._elementMaterials.values()),
            bossMaterials: Array.from(this._bossMaterials.values())
        };
    }

    /**
     * 获取技能总等级（一板+二板）
     */
    public getSkillTotalLevel(characterId: string, skillId: string): number {
        const data = this._characterSkills.get(characterId);
        if (!data) return 0;

        const panels = data.skillPanels.get(skillId);
        if (!panels) return 0;

        return panels.reduce((sum, p) => sum + (p.isUnlocked ? p.level : 0), 0);
    }

    /**
     * 获取面板升级配置
     */
    public getPanelUpgradeConfig(panel: SkillPanelType, level: number): SkillUpgradeConfig | null {
        const configs = panel === SkillPanelType.PANEL_ONE ? 
            this._panelOneConfigs : this._panelTwoConfigs;
        return configs[level - 1] || null;
    }

    /**
     * 获取面板升级进度
     */
    public getPanelUpgradeProgress(characterId: string, skillId: string, panel: SkillPanelType): {
        currentLevel: number;
        maxLevel: number;
        isUnlocked: boolean;
        canUpgrade: boolean;
        nextLevelConfig: SkillUpgradeConfig | null;
    } | null {
        const panelData = this.getSkillPanelData(characterId, skillId, panel);
        if (!panelData) return null;

        const nextConfig = panelData.level < panelData.maxLevel ?
            this.getPanelUpgradeConfig(panel, panelData.level) : null;

        return {
            currentLevel: panelData.level,
            maxLevel: panelData.maxLevel,
            isUnlocked: panelData.isUnlocked,
            canUpgrade: panelData.isUnlocked && panelData.level < panelData.maxLevel,
            nextLevelConfig: nextConfig
        };
    }

    // ========== 存档 ==========

    public saveData(): void {
        // 将Map转换为可序列化对象
        const characterSkillsObj: any = {};
        for (const [id, data] of this._characterSkills) {
            characterSkillsObj[id] = {
                ...data,
                skillPanels: Object.fromEntries(data.skillPanels)
            };
        }

        const saveObj = {
            characterSkills: characterSkillsObj,
            skillBooks: Object.fromEntries(this._skillBooks),
            starMaterials: Object.fromEntries(this._starMaterials),
            elementMaterials: Object.fromEntries(this._elementMaterials),
            bossMaterials: Object.fromEntries(this._bossMaterials)
        };
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveObj));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                if (data.characterSkills) {
                    for (const [id, skillData] of Object.entries(data.characterSkills)) {
                        const charData = skillData as any;
                        // 恢复skillPanels为Map
                        if (charData.skillPanels && typeof charData.skillPanels === 'object') {
                            charData.skillPanels = new Map(Object.entries(charData.skillPanels));
                        } else {
                            charData.skillPanels = new Map();
                        }
                        this._characterSkills.set(id, charData as CharacterSkillData);
                    }
                }
                
                if (data.skillBooks) {
                    for (const [id, bookData] of Object.entries(data.skillBooks)) {
                        const existing = this._skillBooks.get(id);
                        if (existing) {
                            existing.count = (bookData as SkillBookData).count;
                        }
                    }
                }

                if (data.starMaterials) {
                    for (const [id, matData] of Object.entries(data.starMaterials)) {
                        const existing = this._starMaterials.get(id);
                        if (existing) {
                            existing.count = (matData as StarMaterialData).count;
                        }
                    }
                }

                if (data.elementMaterials) {
                    for (const [id, matData] of Object.entries(data.elementMaterials)) {
                        const existing = this._elementMaterials.get(id);
                        if (existing) {
                            existing.count = (matData as ElementMaterialData).count;
                        }
                    }
                }

                if (data.bossMaterials) {
                    for (const [id, matData] of Object.entries(data.bossMaterials)) {
                        const existing = this._bossMaterials.get(id);
                        if (existing) {
                            existing.count = (matData as BossMaterialData).count;
                        }
                    }
                }

                console.log('技能升级数据加载完成');
            } catch (e) {
                console.error('加载技能升级数据失败:', e);
            }
        }
    }

    public resetData(): void {
        this._characterSkills.clear();
        for (const book of this._skillBooks.values()) {
            book.count = 0;
        }
        for (const star of this._starMaterials.values()) {
            star.count = 0;
        }
        for (const elem of this._elementMaterials.values()) {
            elem.count = 0;
        }
        for (const boss of this._bossMaterials.values()) {
            boss.count = 0;
        }
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        if (SkillUpgradeSystem._instance === this) {
            SkillUpgradeSystem._instance = null;
        }
    }
}
