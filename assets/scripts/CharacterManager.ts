import { _decorator, Component, Node, sys } from 'cc';
import { CharacterConfig, CharacterInstance, CharacterDatabase, CharacterRarity, ElementType, CharacterStats } from './CharacterData';
const { ccclass, property } = _decorator;

/**
 * 队伍数据接口
 */
export interface TeamData {
    id: string;
    name: string;
    slots: (string | null)[];  // 角色实例uniqueId数组，最多3个
    leaderId: string | null;    // 队长角色uniqueId
}

/**
 * 角色管理器 - 管理玩家拥有的角色和队伍
 * Character Manager - Manages player's characters and teams
 */
@ccclass('CharacterManager')
export class CharacterManager extends Component {
    private static _instance: CharacterManager | null = null;

    @property({ tooltip: '最大队伍数量' })
    public maxTeams: number = 5;

    @property({ tooltip: '队伍最大角色数' })
    public maxTeamSize: number = 3;

    @property({ tooltip: '角色最大等级' })
    public maxLevel: number = 100;

    @property({ tooltip: '角色最大星级' })
    public maxStar: number = 6;

    // 玩家拥有的角色实例
    private _ownedCharacters: Map<string, CharacterInstance> = new Map();
    
    // 队伍列表
    private _teams: Map<string, TeamData> = new Map();
    
    // 当前使用的队伍ID
    private _currentTeamId: string = 'team_1';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_character_data';

    public static get instance(): CharacterManager | null {
        return CharacterManager._instance;
    }

    onLoad() {
        if (CharacterManager._instance) {
            this.node.destroy();
            return;
        }
        CharacterManager._instance = this;
        
        // 加载存档
        this.loadData();
        
        // 如果没有角色，给予初始角色
        if (this._ownedCharacters.size === 0) {
            this.giveStarterCharacters();
        }
        
        // 如果没有队伍，创建默认队伍
        if (this._teams.size === 0) {
            this.createDefaultTeams();
        }
    }

    /**
     * 给予初始角色
     */
    private giveStarterCharacters(): void {
        // 给予初始剑士
        this.addCharacter('char_starter_001');
        
        console.log('已获得初始角色！');
    }

    /**
     * 创建默认队伍
     */
    private createDefaultTeams(): void {
        for (let i = 1; i <= this.maxTeams; i++) {
            const teamId = `team_${i}`;
            this._teams.set(teamId, {
                id: teamId,
                name: `队伍 ${i}`,
                slots: [null, null, null],
                leaderId: null
            });
        }

        // 将初始角色放入第一队
        const firstCharacter = Array.from(this._ownedCharacters.values())[0];
        if (firstCharacter) {
            const team = this._teams.get('team_1');
            if (team) {
                team.slots[0] = firstCharacter.uniqueId;
                team.leaderId = firstCharacter.uniqueId;
            }
        }

        console.log('已创建默认队伍');
    }

    /**
     * 添加角色到玩家背包
     */
    public addCharacter(configId: string): CharacterInstance | null {
        const config = CharacterDatabase.instance.getCharacter(configId);
        if (!config) {
            console.error(`角色配置不存在: ${configId}`);
            return null;
        }

        const instance: CharacterInstance = {
            uniqueId: this.generateUniqueId(),
            configId: configId,
            level: 1,
            exp: 0,
            star: 0,
            awakening: 0,
            equipmentSlots: {},
            affinity: 0,
            obtainedAt: Date.now(),
            isLocked: false
        };

        this._ownedCharacters.set(instance.uniqueId, instance);
        console.log(`获得角色: ${config.name}`);
        
        this.saveData();
        return instance;
    }

    /**
     * 移除角色
     */
    public removeCharacter(uniqueId: string): boolean {
        const instance = this._ownedCharacters.get(uniqueId);
        if (!instance) {
            return false;
        }

        if (instance.isLocked) {
            console.log('角色已锁定，无法移除');
            return false;
        }

        // 从所有队伍中移除
        this._teams.forEach(team => {
            const index = team.slots.indexOf(uniqueId);
            if (index !== -1) {
                team.slots[index] = null;
            }
            if (team.leaderId === uniqueId) {
                team.leaderId = team.slots.find(id => id !== null) || null;
            }
        });

        this._ownedCharacters.delete(uniqueId);
        this.saveData();
        return true;
    }

    /**
     * 获取角色实例
     */
    public getCharacterInstance(uniqueId: string): CharacterInstance | undefined {
        return this._ownedCharacters.get(uniqueId);
    }

    /**
     * 获取角色配置
     */
    public getCharacterConfig(uniqueId: string): CharacterConfig | undefined {
        const instance = this._ownedCharacters.get(uniqueId);
        if (!instance) return undefined;
        return CharacterDatabase.instance.getCharacter(instance.configId);
    }

    /**
     * 获取所有拥有的角色
     */
    public getOwnedCharacters(): CharacterInstance[] {
        return Array.from(this._ownedCharacters.values());
    }

    /**
     * 获取角色计算后的属性
     */
    public getCharacterStats(uniqueId: string): CharacterStats | null {
        const instance = this._ownedCharacters.get(uniqueId);
        if (!instance) return null;

        const config = CharacterDatabase.instance.getCharacter(instance.configId);
        if (!config) return null;

        return CharacterDatabase.instance.calculateStats(config, instance.level, instance.star);
    }

    /**
     * 角色获得经验
     */
    public addExp(uniqueId: string, exp: number): { levelUp: boolean; newLevel: number } {
        const instance = this._ownedCharacters.get(uniqueId);
        if (!instance) {
            return { levelUp: false, newLevel: 0 };
        }

        const oldLevel = instance.level;
        instance.exp += exp;

        // 检查升级
        while (instance.level < this.maxLevel) {
            const required = CharacterDatabase.instance.getExpRequired(instance.level);
            if (instance.exp >= required) {
                instance.exp -= required;
                instance.level++;
            } else {
                break;
            }
        }

        // 限制最大等级
        if (instance.level >= this.maxLevel) {
            instance.level = this.maxLevel;
            instance.exp = 0;
        }

        const levelUp = instance.level > oldLevel;
        if (levelUp) {
            const config = CharacterDatabase.instance.getCharacter(instance.configId);
            console.log(`${config?.name} 升级! Lv.${oldLevel} -> Lv.${instance.level}`);
        }

        this.saveData();
        return { levelUp, newLevel: instance.level };
    }

    /**
     * 角色突破（提升星级）
     */
    public breakthrough(uniqueId: string): boolean {
        const instance = this._ownedCharacters.get(uniqueId);
        if (!instance) return false;

        if (instance.star >= this.maxStar) {
            console.log('已达到最大星级');
            return false;
        }

        // 这里可以添加突破材料检查
        instance.star++;
        
        const config = CharacterDatabase.instance.getCharacter(instance.configId);
        console.log(`${config?.name} 突破成功! ${instance.star - 1}★ -> ${instance.star}★`);

        this.saveData();
        return true;
    }

    /**
     * 锁定/解锁角色
     */
    public toggleLock(uniqueId: string): boolean {
        const instance = this._ownedCharacters.get(uniqueId);
        if (!instance) return false;

        instance.isLocked = !instance.isLocked;
        this.saveData();
        return instance.isLocked;
    }

    // ========== 队伍管理 ==========

    /**
     * 获取队伍
     */
    public getTeam(teamId: string): TeamData | undefined {
        return this._teams.get(teamId);
    }

    /**
     * 获取所有队伍
     */
    public getAllTeams(): TeamData[] {
        return Array.from(this._teams.values());
    }

    /**
     * 获取当前队伍
     */
    public getCurrentTeam(): TeamData | undefined {
        return this._teams.get(this._currentTeamId);
    }

    /**
     * 设置当前队伍
     */
    public setCurrentTeam(teamId: string): boolean {
        if (!this._teams.has(teamId)) {
            return false;
        }
        this._currentTeamId = teamId;
        this.saveData();
        return true;
    }

    /**
     * 设置队伍名称
     */
    public setTeamName(teamId: string, name: string): boolean {
        const team = this._teams.get(teamId);
        if (!team) return false;

        team.name = name;
        this.saveData();
        return true;
    }

    /**
     * 设置队伍成员
     */
    public setTeamMember(teamId: string, slotIndex: number, characterUniqueId: string | null): boolean {
        const team = this._teams.get(teamId);
        if (!team || slotIndex < 0 || slotIndex >= this.maxTeamSize) {
            return false;
        }

        // 如果设置新角色，检查角色是否存在
        if (characterUniqueId && !this._ownedCharacters.has(characterUniqueId)) {
            return false;
        }

        // 检查角色是否已在队伍中
        if (characterUniqueId) {
            const existingIndex = team.slots.indexOf(characterUniqueId);
            if (existingIndex !== -1 && existingIndex !== slotIndex) {
                // 交换位置
                team.slots[existingIndex] = team.slots[slotIndex];
            }
        }

        team.slots[slotIndex] = characterUniqueId;

        // 如果队长被移除，重新设置队长
        if (team.leaderId && !team.slots.includes(team.leaderId)) {
            team.leaderId = team.slots.find(id => id !== null) || null;
        }

        // 如果没有队长但有成员，设置第一个成员为队长
        if (!team.leaderId) {
            team.leaderId = team.slots.find(id => id !== null) || null;
        }

        this.saveData();
        return true;
    }

    /**
     * 设置队长
     */
    public setTeamLeader(teamId: string, characterUniqueId: string): boolean {
        const team = this._teams.get(teamId);
        if (!team) return false;

        // 检查角色是否在队伍中
        if (!team.slots.includes(characterUniqueId)) {
            return false;
        }

        team.leaderId = characterUniqueId;
        this.saveData();
        return true;
    }

    /**
     * 获取队伍中的角色配置列表
     */
    public getTeamCharacters(teamId: string): (CharacterConfig | null)[] {
        const team = this._teams.get(teamId);
        if (!team) return [];

        return team.slots.map(uniqueId => {
            if (!uniqueId) return null;
            return this.getCharacterConfig(uniqueId) || null;
        });
    }

    /**
     * 获取队伍中的角色实例列表
     */
    public getTeamInstances(teamId: string): (CharacterInstance | null)[] {
        const team = this._teams.get(teamId);
        if (!team) return [];

        return team.slots.map(uniqueId => {
            if (!uniqueId) return null;
            return this.getCharacterInstance(uniqueId) || null;
        });
    }

    /**
     * 获取队长技能
     */
    public getLeaderSkill(teamId: string): { config: CharacterConfig; instance: CharacterInstance } | null {
        const team = this._teams.get(teamId);
        if (!team || !team.leaderId) return null;

        const instance = this.getCharacterInstance(team.leaderId);
        const config = this.getCharacterConfig(team.leaderId);

        if (!instance || !config) return null;

        return { config, instance };
    }

    /**
     * 计算队伍总战斗力
     */
    public calculateTeamPower(teamId: string): number {
        const team = this._teams.get(teamId);
        if (!team) return 0;

        let totalPower = 0;

        for (const uniqueId of team.slots) {
            if (!uniqueId) continue;

            const stats = this.getCharacterStats(uniqueId);
            if (stats) {
                // 简单的战斗力计算公式
                const power = stats.hp * 0.5 + 
                              stats.attack * 3 + 
                              stats.defense * 2 + 
                              stats.speed * 1 +
                              stats.critRate * 500 +
                              stats.critDamage * 200 +
                              stats.skillPower * 300;
                totalPower += Math.floor(power);
            }
        }

        return totalPower;
    }

    // ========== 存档系统 ==========

    /**
     * 保存数据
     */
    public saveData(): void {
        const data = {
            ownedCharacters: Array.from(this._ownedCharacters.entries()),
            teams: Array.from(this._teams.entries()),
            currentTeamId: this._currentTeamId
        };

        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
        console.log('角色数据已保存');
    }

    /**
     * 加载数据
     */
    public loadData(): void {
        const savedData = sys.localStorage.getItem(this.SAVE_KEY);
        if (!savedData) {
            console.log('没有找到存档数据');
            return;
        }

        try {
            const data = JSON.parse(savedData);
            
            this._ownedCharacters = new Map(data.ownedCharacters);
            this._teams = new Map(data.teams);
            this._currentTeamId = data.currentTeamId || 'team_1';

            console.log(`加载存档成功，拥有 ${this._ownedCharacters.size} 个角色，${this._teams.size} 个队伍`);
        } catch (e) {
            console.error('加载存档失败:', e);
        }
    }

    /**
     * 清除存档
     */
    public clearData(): void {
        sys.localStorage.removeItem(this.SAVE_KEY);
        this._ownedCharacters.clear();
        this._teams.clear();
        this._currentTeamId = 'team_1';
        
        this.giveStarterCharacters();
        this.createDefaultTeams();
        
        console.log('存档已清除');
    }

    /**
     * 生成唯一ID
     */
    private generateUniqueId(): string {
        return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ========== 抽卡系统 ==========

    /**
     * 单抽
     */
    public gacha(): CharacterConfig | null {
        const allCharacters = CharacterDatabase.instance.getAllCharacters();
        if (allCharacters.length === 0) return null;

        // 稀有度概率
        const rarityRates: { [key: number]: number } = {
            [CharacterRarity.N]: 0.50,    // 50%
            [CharacterRarity.R]: 0.30,    // 30%
            [CharacterRarity.SR]: 0.15,   // 15%
            [CharacterRarity.SSR]: 0.04,  // 4%
            [CharacterRarity.UR]: 0.01    // 1%
        };

        // 随机决定稀有度
        const rand = Math.random();
        let cumulativeRate = 0;
        let targetRarity = CharacterRarity.N;

        for (const [rarity, rate] of Object.entries(rarityRates)) {
            cumulativeRate += rate;
            if (rand <= cumulativeRate) {
                targetRarity = parseInt(rarity);
                break;
            }
        }

        // 从对应稀有度中随机选择角色
        const candidates = allCharacters.filter(c => c.rarity === targetRarity);
        if (candidates.length === 0) {
            // 如果没有对应稀有度的角色，降级选择
            const selected = allCharacters[Math.floor(Math.random() * allCharacters.length)];
            this.addCharacter(selected.id);
            return selected;
        }

        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        this.addCharacter(selected.id);
        return selected;
    }

    /**
     * 十连抽
     */
    public gacha10(): CharacterConfig[] {
        const results: CharacterConfig[] = [];
        
        for (let i = 0; i < 10; i++) {
            const result = this.gacha();
            if (result) {
                results.push(result);
            }
        }

        // 保底：十连至少一个SR
        const hasSROrAbove = results.some(c => c.rarity >= CharacterRarity.SR);
        if (!hasSROrAbove) {
            // 将最后一个替换为SR
            const srCharacters = CharacterDatabase.instance.getCharactersByRarity(CharacterRarity.SR);
            if (srCharacters.length > 0) {
                const guaranteed = srCharacters[Math.floor(Math.random() * srCharacters.length)];
                // 移除最后添加的角色
                const lastResult = results[results.length - 1];
                const owned = this.getOwnedCharacters();
                const lastAdded = owned.find(c => c.configId === lastResult.id);
                if (lastAdded) {
                    this.removeCharacter(lastAdded.uniqueId);
                }
                // 添加保底角色
                results[results.length - 1] = guaranteed;
                this.addCharacter(guaranteed.id);
            }
        }

        return results;
    }

    onDestroy() {
        this.saveData();
        if (CharacterManager._instance === this) {
            CharacterManager._instance = null;
        }
    }
}
