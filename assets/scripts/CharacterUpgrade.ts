import { _decorator, Component, Node, Label, Button, ProgressBar, Color, Graphics, UITransform, tween, Vec3 } from 'cc';
import { CharacterManager } from './CharacterManager';
import { CharacterDatabase, CharacterConfig, CharacterInstance, CharacterStats, CharacterRarity } from './CharacterData';
const { ccclass, property } = _decorator;

/**
 * 升级材料类型
 */
export enum MaterialType {
    EXP_SMALL = 'exp_small',        // 小经验书
    EXP_MEDIUM = 'exp_medium',      // 中经验书
    EXP_LARGE = 'exp_large',        // 大经验书
    BREAKTHROUGH = 'breakthrough',   // 突破材料
    AWAKENING = 'awakening'         // 觉醒材料
}

/**
 * 材料数据接口
 */
export interface MaterialData {
    type: MaterialType;
    name: string;
    description: string;
    value: number;      // 经验值或其他数值
    rarity: number;     // 材料稀有度
}

/**
 * 玩家材料库存
 */
export interface MaterialInventory {
    [key: string]: number;  // 材料类型 -> 数量
}

/**
 * 角色升级养成系统
 * Character Upgrade and Development System
 */
@ccclass('CharacterUpgrade')
export class CharacterUpgrade extends Component {
    private static _instance: CharacterUpgrade | null = null;

    @property({ type: Node, tooltip: '升级面板' })
    public upgradePanel: Node | null = null;

    @property({ type: Label, tooltip: '角色名称' })
    public characterNameLabel: Label | null = null;

    @property({ type: Label, tooltip: '当前等级' })
    public currentLevelLabel: Label | null = null;

    @property({ type: Label, tooltip: '经验值' })
    public expLabel: Label | null = null;

    @property({ type: ProgressBar, tooltip: '经验条' })
    public expBar: ProgressBar | null = null;

    @property({ type: Label, tooltip: '属性标签' })
    public statsLabel: Label | null = null;

    @property({ type: Node, tooltip: '材料选择容器' })
    public materialContainer: Node | null = null;

    @property({ type: Button, tooltip: '升级按钮' })
    public levelUpButton: Button | null = null;

    @property({ type: Button, tooltip: '突破按钮' })
    public breakthroughButton: Button | null = null;

    @property({ type: Button, tooltip: '觉醒按钮' })
    public awakeningButton: Button | null = null;

    // 材料数据库
    private _materialDatabase: Map<MaterialType, MaterialData> = new Map();

    // 玩家材料库存
    private _inventory: MaterialInventory = {};

    // 当前选中的角色
    private _selectedCharacterId: string | null = null;

    // 选中的材料数量
    private _selectedMaterials: Map<MaterialType, number> = new Map();

    public static get instance(): CharacterUpgrade | null {
        return CharacterUpgrade._instance;
    }

    onLoad() {
        if (CharacterUpgrade._instance) {
            this.node.destroy();
            return;
        }
        CharacterUpgrade._instance = this;

        this.initMaterialDatabase();
        this.initInventory();
        this.setupUI();
    }

    /**
     * 初始化材料数据库
     */
    private initMaterialDatabase(): void {
        this._materialDatabase.set(MaterialType.EXP_SMALL, {
            type: MaterialType.EXP_SMALL,
            name: '初级经验书',
            description: '提供少量经验值',
            value: 100,
            rarity: 1
        });

        this._materialDatabase.set(MaterialType.EXP_MEDIUM, {
            type: MaterialType.EXP_MEDIUM,
            name: '中级经验书',
            description: '提供中等经验值',
            value: 500,
            rarity: 2
        });

        this._materialDatabase.set(MaterialType.EXP_LARGE, {
            type: MaterialType.EXP_LARGE,
            name: '高级经验书',
            description: '提供大量经验值',
            value: 2000,
            rarity: 3
        });

        this._materialDatabase.set(MaterialType.BREAKTHROUGH, {
            type: MaterialType.BREAKTHROUGH,
            name: '突破石',
            description: '用于角色突破，提升星级',
            value: 1,
            rarity: 3
        });

        this._materialDatabase.set(MaterialType.AWAKENING, {
            type: MaterialType.AWAKENING,
            name: '觉醒结晶',
            description: '用于角色觉醒，解锁隐藏潜力',
            value: 1,
            rarity: 4
        });
    }

    /**
     * 初始化玩家库存（测试数据）
     */
    private initInventory(): void {
        this._inventory = {
            [MaterialType.EXP_SMALL]: 50,
            [MaterialType.EXP_MEDIUM]: 20,
            [MaterialType.EXP_LARGE]: 5,
            [MaterialType.BREAKTHROUGH]: 10,
            [MaterialType.AWAKENING]: 3
        };
    }

    /**
     * 设置UI
     */
    private setupUI(): void {
        if (this.levelUpButton) {
            this.levelUpButton.node.on(Button.EventType.CLICK, this.onLevelUpClick, this);
        }
        if (this.breakthroughButton) {
            this.breakthroughButton.node.on(Button.EventType.CLICK, this.onBreakthroughClick, this);
        }
        if (this.awakeningButton) {
            this.awakeningButton.node.on(Button.EventType.CLICK, this.onAwakeningClick, this);
        }

        if (this.upgradePanel) {
            this.upgradePanel.active = false;
        }
    }

    /**
     * 打开升级面板
     */
    public openUpgradePanel(characterUniqueId: string): void {
        this._selectedCharacterId = characterUniqueId;
        this._selectedMaterials.clear();

        if (this.upgradePanel) {
            this.upgradePanel.active = true;
        }

        this.refreshPanel();
        this.refreshMaterialList();
    }

    /**
     * 关闭升级面板
     */
    public closeUpgradePanel(): void {
        if (this.upgradePanel) {
            this.upgradePanel.active = false;
        }
        this._selectedCharacterId = null;
        this._selectedMaterials.clear();
    }

    /**
     * 刷新面板显示
     */
    private refreshPanel(): void {
        if (!this._selectedCharacterId) return;

        const manager = CharacterManager.instance;
        if (!manager) return;

        const instance = manager.getCharacterInstance(this._selectedCharacterId);
        const config = manager.getCharacterConfig(this._selectedCharacterId);
        const stats = manager.getCharacterStats(this._selectedCharacterId);

        if (!instance || !config || !stats) return;

        // 更新名称
        if (this.characterNameLabel) {
            this.characterNameLabel.string = config.name;
            this.characterNameLabel.color = new Color().fromHEX(
                CharacterDatabase.instance.getRarityColor(config.rarity)
            );
        }

        // 更新等级
        if (this.currentLevelLabel) {
            this.currentLevelLabel.string = `Lv.${instance.level} ${'★'.repeat(instance.star)}`;
        }

        // 更新经验
        const expRequired = CharacterDatabase.instance.getExpRequired(instance.level);
        if (this.expLabel) {
            this.expLabel.string = `${instance.exp} / ${expRequired}`;
        }
        if (this.expBar) {
            this.expBar.progress = instance.exp / expRequired;
        }

        // 更新属性
        if (this.statsLabel) {
            this.statsLabel.string = 
                `HP: ${stats.hp}\n` +
                `攻击: ${stats.attack}\n` +
                `防御: ${stats.defense}\n` +
                `速度: ${stats.speed}\n` +
                `暴击率: ${(stats.critRate * 100).toFixed(1)}%\n` +
                `暴击伤害: ${(stats.critDamage * 100).toFixed(0)}%`;
        }

        // 更新按钮状态
        this.updateButtonStates(instance, config);
    }

    /**
     * 刷新材料列表
     */
    private refreshMaterialList(): void {
        if (!this.materialContainer) return;

        this.materialContainer.removeAllChildren();

        // 显示经验材料
        const expMaterials = [MaterialType.EXP_SMALL, MaterialType.EXP_MEDIUM, MaterialType.EXP_LARGE];

        for (const type of expMaterials) {
            const materialData = this._materialDatabase.get(type);
            if (!materialData) continue;

            const count = this._inventory[type] || 0;
            const selected = this._selectedMaterials.get(type) || 0;

            const materialNode = this.createMaterialItem(materialData, count, selected);
            this.materialContainer.addChild(materialNode);
        }
    }

    /**
     * 创建材料项
     */
    private createMaterialItem(data: MaterialData, count: number, selected: number): Node {
        const item = new Node(`Material_${data.type}`);
        
        const uiTransform = item.addComponent(UITransform);
        uiTransform.setContentSize(200, 60);

        const graphics = item.addComponent(Graphics);
        
        // 背景
        graphics.fillColor = new Color(50, 50, 60, 200);
        graphics.roundRect(-100, -30, 200, 60, 5);
        graphics.fill();

        if (selected > 0) {
            graphics.strokeColor = new Color(100, 200, 100);
            graphics.lineWidth = 2;
            graphics.stroke();
        }

        // 名称
        const nameNode = new Node('Name');
        nameNode.setPosition(-70, 10);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = data.name;
        nameLabel.fontSize = 14;
        nameLabel.color = Color.WHITE;
        item.addChild(nameNode);

        // 数量
        const countNode = new Node('Count');
        countNode.setPosition(-70, -10);
        const countLabel = countNode.addComponent(Label);
        countLabel.string = `拥有: ${count} | 选中: ${selected}`;
        countLabel.fontSize = 12;
        countLabel.color = new Color(180, 180, 180);
        item.addChild(countNode);

        // 经验值显示
        const valueNode = new Node('Value');
        valueNode.setPosition(60, 0);
        const valueLabel = valueNode.addComponent(Label);
        valueLabel.string = `+${data.value} EXP`;
        valueLabel.fontSize = 12;
        valueLabel.color = new Color(100, 255, 100);
        item.addChild(valueNode);

        // 添加/减少按钮
        const addBtn = this.createSmallButton('+', 70, 15, () => {
            this.addMaterial(data.type);
        });
        item.addChild(addBtn);

        const subBtn = this.createSmallButton('-', 70, -15, () => {
            this.removeMaterial(data.type);
        });
        item.addChild(subBtn);

        return item;
    }

    /**
     * 创建小按钮
     */
    private createSmallButton(text: string, x: number, y: number, callback: () => void): Node {
        const btn = new Node(`Btn_${text}`);
        btn.setPosition(x, y);

        const uiTransform = btn.addComponent(UITransform);
        uiTransform.setContentSize(25, 25);

        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = new Color(80, 80, 100);
        graphics.roundRect(-12.5, -12.5, 25, 25, 3);
        graphics.fill();

        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 18;
        label.color = Color.WHITE;
        btn.addChild(labelNode);

        const button = btn.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        btn.on(Button.EventType.CLICK, callback, this);

        return btn;
    }

    /**
     * 添加材料
     */
    private addMaterial(type: MaterialType): void {
        const owned = this._inventory[type] || 0;
        const selected = this._selectedMaterials.get(type) || 0;

        if (selected < owned) {
            this._selectedMaterials.set(type, selected + 1);
            this.refreshMaterialList();
            this.updateExpPreview();
        }
    }

    /**
     * 移除材料
     */
    private removeMaterial(type: MaterialType): void {
        const selected = this._selectedMaterials.get(type) || 0;

        if (selected > 0) {
            this._selectedMaterials.set(type, selected - 1);
            this.refreshMaterialList();
            this.updateExpPreview();
        }
    }

    /**
     * 更新经验预览
     */
    private updateExpPreview(): void {
        let totalExp = 0;

        this._selectedMaterials.forEach((count, type) => {
            const material = this._materialDatabase.get(type);
            if (material) {
                totalExp += material.value * count;
            }
        });

        // 可以在UI上显示预计获得的经验
        console.log(`预计获得经验: ${totalExp}`);
    }

    /**
     * 更新按钮状态
     */
    private updateButtonStates(instance: CharacterInstance, config: CharacterConfig): void {
        const manager = CharacterManager.instance;
        if (!manager) return;

        // 升级按钮
        if (this.levelUpButton) {
            const hasSelectedMaterials = Array.from(this._selectedMaterials.values()).some(v => v > 0);
            const notMaxLevel = instance.level < manager.maxLevel;
            this.levelUpButton.interactable = hasSelectedMaterials && notMaxLevel;
        }

        // 突破按钮
        if (this.breakthroughButton) {
            const breakthroughCount = this._inventory[MaterialType.BREAKTHROUGH] || 0;
            const requiredMaterials = this.getBreakthroughCost(instance.star);
            const canBreakthrough = instance.star < manager.maxStar && breakthroughCount >= requiredMaterials;
            this.breakthroughButton.interactable = canBreakthrough;
        }

        // 觉醒按钮
        if (this.awakeningButton) {
            const awakeningCount = this._inventory[MaterialType.AWAKENING] || 0;
            const requiredMaterials = this.getAwakeningCost(instance.awakening);
            const maxAwakening = 5;
            const canAwaken = instance.awakening < maxAwakening && awakeningCount >= requiredMaterials;
            this.awakeningButton.interactable = canAwaken;
        }
    }

    /**
     * 获取突破所需材料数量
     */
    private getBreakthroughCost(currentStar: number): number {
        // 每星需要的突破石数量递增
        return (currentStar + 1) * 2;
    }

    /**
     * 获取觉醒所需材料数量
     */
    private getAwakeningCost(currentAwakening: number): number {
        return (currentAwakening + 1) * 3;
    }

    /**
     * 升级按钮点击
     */
    private onLevelUpClick(): void {
        if (!this._selectedCharacterId) return;

        const manager = CharacterManager.instance;
        if (!manager) return;

        // 计算总经验
        let totalExp = 0;
        this._selectedMaterials.forEach((count, type) => {
            const material = this._materialDatabase.get(type);
            if (material) {
                totalExp += material.value * count;

                // 扣除材料
                this._inventory[type] = (this._inventory[type] || 0) - count;
            }
        });

        if (totalExp > 0) {
            // 给角色增加经验
            const result = manager.addExp(this._selectedCharacterId, totalExp);

            if (result.levelUp) {
                this.playLevelUpEffect();
            }

            // 清空选中的材料
            this._selectedMaterials.clear();

            // 刷新显示
            this.refreshPanel();
            this.refreshMaterialList();
        }
    }

    /**
     * 突破按钮点击
     */
    private onBreakthroughClick(): void {
        if (!this._selectedCharacterId) return;

        const manager = CharacterManager.instance;
        if (!manager) return;

        const instance = manager.getCharacterInstance(this._selectedCharacterId);
        if (!instance) return;

        const cost = this.getBreakthroughCost(instance.star);

        // 检查材料
        if ((this._inventory[MaterialType.BREAKTHROUGH] || 0) < cost) {
            console.log('突破材料不足');
            return;
        }

        // 扣除材料
        this._inventory[MaterialType.BREAKTHROUGH] -= cost;

        // 执行突破
        if (manager.breakthrough(this._selectedCharacterId)) {
            this.playBreakthroughEffect();
            this.refreshPanel();
        }
    }

    /**
     * 觉醒按钮点击
     */
    private onAwakeningClick(): void {
        if (!this._selectedCharacterId) return;

        const manager = CharacterManager.instance;
        if (!manager) return;

        const instance = manager.getCharacterInstance(this._selectedCharacterId);
        if (!instance) return;

        const cost = this.getAwakeningCost(instance.awakening);

        // 检查材料
        if ((this._inventory[MaterialType.AWAKENING] || 0) < cost) {
            console.log('觉醒材料不足');
            return;
        }

        // 扣除材料
        this._inventory[MaterialType.AWAKENING] -= cost;

        // 执行觉醒
        instance.awakening++;
        console.log(`角色觉醒成功！当前觉醒等级: ${instance.awakening}`);

        this.playAwakeningEffect();
        this.refreshPanel();
    }

    /**
     * 播放升级特效
     */
    private playLevelUpEffect(): void {
        if (!this.upgradePanel) return;

        console.log('🎉 升级成功！');

        // 简单的闪光效果
        const effectNode = new Node('LevelUpEffect');
        const graphics = effectNode.addComponent(Graphics);
        graphics.fillColor = new Color(255, 255, 100, 150);
        graphics.rect(-200, -200, 400, 400);
        graphics.fill();

        this.upgradePanel.addChild(effectNode);

        tween(effectNode)
            .to(0.3, {}, { 
                onUpdate: (target, ratio) => {
                    if (graphics) {
                        graphics.clear();
                        graphics.fillColor = new Color(255, 255, 100, Math.floor(150 * (1 - ratio!)));
                        graphics.rect(-200, -200, 400, 400);
                        graphics.fill();
                    }
                }
            })
            .call(() => effectNode.destroy())
            .start();
    }

    /**
     * 播放突破特效
     */
    private playBreakthroughEffect(): void {
        console.log('⭐ 突破成功！');
    }

    /**
     * 播放觉醒特效
     */
    private playAwakeningEffect(): void {
        console.log('✨ 觉醒成功！');
    }

    /**
     * 添加材料到库存
     */
    public addMaterialToInventory(type: MaterialType, count: number): void {
        this._inventory[type] = (this._inventory[type] || 0) + count;
        console.log(`获得 ${this._materialDatabase.get(type)?.name} x${count}`);
    }

    /**
     * 获取库存数量
     */
    public getInventoryCount(type: MaterialType): number {
        return this._inventory[type] || 0;
    }

    onDestroy() {
        if (this.levelUpButton) {
            this.levelUpButton.node.off(Button.EventType.CLICK, this.onLevelUpClick, this);
        }
        if (this.breakthroughButton) {
            this.breakthroughButton.node.off(Button.EventType.CLICK, this.onBreakthroughClick, this);
        }
        if (this.awakeningButton) {
            this.awakeningButton.node.off(Button.EventType.CLICK, this.onAwakeningClick, this);
        }

        if (CharacterUpgrade._instance === this) {
            CharacterUpgrade._instance = null;
        }
    }
}
