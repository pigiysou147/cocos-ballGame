import { _decorator, Component, sys, EventTarget } from 'cc';
import { SkillDatabase, SkillConfig, SkillInstance, SkillType } from './SkillData';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 技能升级材料
 */
export interface SkillUpgradeMaterial {
    type: CurrencyType | 'skill_book';
    amount: number;
    skillBookRarity?: string;    // 技能书稀有度
}

/**
 * 技能升级配置
 */
export interface SkillUpgradeConfig {
    level: number;
    expRequired: number;
    materials: SkillUpgradeMaterial[];
    goldCost: number;
}

/**
 * 角色技能数据
 */
export interface CharacterSkillData {
    characterId: string;
    skills: SkillInstance[];
    equippedSkillIds: string[];   // 当前装备的技能
    maxEquipSlots: number;        // 最大装备槽位
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
 * 技能升级系统
 * Skill Upgrade System - Skill leveling and enhancement
 */
@ccclass('SkillUpgradeSystem')
export class SkillUpgradeSystem extends Component {
    private static _instance: SkillUpgradeSystem | null = null;

    // 角色技能数据 (characterId -> data)
    private _characterSkills: Map<string, CharacterSkillData> = new Map();
    
    // 技能书库存
    private _skillBooks: Map<string, SkillBookData> = new Map();
    
    // 升级配置
    private _upgradeConfigs: SkillUpgradeConfig[] = [];
    
    // 最大技能等级
    private readonly MAX_SKILL_LEVEL = 10;
    
    // 默认装备槽位
    private readonly DEFAULT_EQUIP_SLOTS = 3;

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_SKILL_UPGRADED = 'skill_upgraded';
    public static readonly EVENT_SKILL_UNLOCKED = 'skill_unlocked';
    public static readonly EVENT_SKILL_EQUIPPED = 'skill_equipped';
    public static readonly EVENT_SKILL_UNEQUIPPED = 'skill_unequipped';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_skill_upgrades';

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
        this.initSkillBooks();
        this.loadData();
    }

    /**
     * 初始化升级配置
     */
    private initUpgradeConfigs(): void {
        for (let level = 1; level <= this.MAX_SKILL_LEVEL; level++) {
            this._upgradeConfigs.push({
                level,
                expRequired: this.calculateExpRequired(level),
                materials: this.calculateMaterials(level),
                goldCost: this.calculateGoldCost(level)
            });
        }
    }

    /**
     * 计算升级所需经验
     */
    private calculateExpRequired(level: number): number {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    /**
     * 计算升级所需材料
     */
    private calculateMaterials(level: number): SkillUpgradeMaterial[] {
        const materials: SkillUpgradeMaterial[] = [];
        
        if (level <= 3) {
            materials.push({ type: 'skill_book', amount: level, skillBookRarity: 'N' });
        } else if (level <= 5) {
            materials.push({ type: 'skill_book', amount: level - 2, skillBookRarity: 'R' });
        } else if (level <= 7) {
            materials.push({ type: 'skill_book', amount: level - 4, skillBookRarity: 'SR' });
        } else {
            materials.push({ type: 'skill_book', amount: level - 6, skillBookRarity: 'SSR' });
        }
        
        return materials;
    }

    /**
     * 计算升级金币消耗
     */
    private calculateGoldCost(level: number): number {
        return Math.floor(1000 * Math.pow(1.8, level - 1));
    }

    /**
     * 初始化技能书
     */
    private initSkillBooks(): void {
        const books: SkillBookData[] = [
            { id: 'skill_book_n', name: '初级技能书', rarity: 'N', expValue: 50, count: 0 },
            { id: 'skill_book_r', name: '中级技能书', rarity: 'R', expValue: 150, count: 0 },
            { id: 'skill_book_sr', name: '高级技能书', rarity: 'SR', expValue: 500, count: 0 },
            { id: 'skill_book_ssr', name: '特级技能书', rarity: 'SSR', expValue: 1500, count: 0 }
        ];

        for (const book of books) {
            this._skillBooks.set(book.id, book);
        }
    }

    /**
     * 获取或创建角色技能数据
     */
    public getCharacterSkillData(characterId: string): CharacterSkillData {
        if (!this._characterSkills.has(characterId)) {
            this._characterSkills.set(characterId, {
                characterId,
                skills: [],
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

        this.saveData();

        this.events.emit(SkillUpgradeSystem.EVENT_SKILL_UNLOCKED, {
            characterId,
            skillId,
            skill: skillConfig
        });

        return true;
    }

    /**
     * 升级技能
     */
    public upgradeSkill(characterId: string, skillId: string): boolean {
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

        const config = this._upgradeConfigs[skillInstance.level - 1];
        if (!config) return false;

        // 检查并消耗材料
        if (!this.consumeUpgradeMaterials(config)) {
            console.log('材料不足');
            return false;
        }

        // 升级
        skillInstance.level++;
        skillInstance.exp = 0;

        this.saveData();

        this.events.emit(SkillUpgradeSystem.EVENT_SKILL_UPGRADED, {
            characterId,
            skillId,
            newLevel: skillInstance.level
        });

        return true;
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

    // 存档
    public saveData(): void {
        const saveObj = {
            characterSkills: Object.fromEntries(this._characterSkills),
            skillBooks: Object.fromEntries(this._skillBooks)
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
                        this._characterSkills.set(id, skillData as CharacterSkillData);
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
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        if (SkillUpgradeSystem._instance === this) {
            SkillUpgradeSystem._instance = null;
        }
    }
}
