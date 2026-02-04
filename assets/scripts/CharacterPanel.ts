import { _decorator, Component, Node, Label, Button, Graphics, Color, UITransform, Layout, Vec3, tween, ProgressBar } from 'cc';
import { DoodleGraphics } from './DoodleGraphics';
import { CharacterManager } from './CharacterManager';
import { CharacterDatabase, CharacterConfig, CharacterInstance, CharacterStats, CharacterRarity, ElementType } from './CharacterData';
import { SkillDatabase, SkillConfig } from './SkillData';
import { EquipmentManager } from './EquipmentManager';
import { EquipmentDatabase, EquipmentType } from './EquipmentData';
const { ccclass, property } = _decorator;

/**
 * 角色详情面板
 * Character Panel - Character details and management UI
 */
@ccclass('CharacterPanel')
export class CharacterPanel extends Component {
    @property({ type: Node, tooltip: '角色列表容器' })
    public characterListContainer: Node | null = null;

    @property({ type: Node, tooltip: '角色详情区域' })
    public detailArea: Node | null = null;

    @property({ type: Node, tooltip: '装备槽位容器' })
    public equipmentSlotsContainer: Node | null = null;

    @property({ type: Node, tooltip: '技能显示区域' })
    public skillArea: Node | null = null;

    // 当前选中的角色
    private _selectedCharacterId: string | null = null;
    
    // 角色卡片节点
    private _characterCards: Map<string, Node> = new Map();

    onLoad() {
        this.createPanel();
    }

    onEnable() {
        this.refreshCharacterList();
        
        // 默认选中第一个角色
        const characters = CharacterManager.instance?.getOwnedCharacters();
        if (characters && characters.length > 0) {
            this.selectCharacter(characters[0].uniqueId);
        }
    }

    /**
     * 创建面板
     */
    private createPanel(): void {
        this.createPanelBackground();
        this.createTopBar();
        this.createCharacterList();
        this.createDetailArea();
    }

    /**
     * 创建面板背景
     */
    private createPanelBackground(): void {
        const bg = new Node('PanelBg');
        const transform = bg.addComponent(UITransform);
        transform.setContentSize(700, 1100);

        const graphics = bg.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 700, 1100,
            new Color(35, 35, 45, 245),
            new Color(80, 80, 100),
            3, 15
        );

        this.node.addChild(bg);
        bg.setSiblingIndex(0);
    }

    /**
     * 创建顶部栏
     */
    private createTopBar(): void {
        const topBar = new Node('TopBar');
        topBar.setPosition(0, 500);

        const transform = topBar.addComponent(UITransform);
        transform.setContentSize(680, 60);

        const graphics = topBar.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 680, 60,
            new Color(45, 45, 55),
            new Color(100, 100, 120),
            2, 8
        );

        // 标题
        const titleNode = new Node('Title');
        titleNode.setPosition(-250, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '👤 角色';
        titleLabel.fontSize = 24;
        titleLabel.color = Color.WHITE;
        titleLabel.enableBold = true;
        topBar.addChild(titleNode);

        // 角色数量
        const countNode = new Node('Count');
        countNode.setPosition(100, 0);
        const countLabel = countNode.addComponent(Label);
        const charCount = CharacterManager.instance?.getOwnedCharacters().length || 0;
        countLabel.string = `拥有: ${charCount}`;
        countLabel.fontSize = 16;
        countLabel.color = new Color(180, 180, 180);
        topBar.addChild(countNode);

        // 关闭按钮
        const closeBtn = new Node('CloseBtn');
        closeBtn.setPosition(310, 0);
        const closeBtnTransform = closeBtn.addComponent(UITransform);
        closeBtnTransform.setContentSize(40, 40);
        const closeBtnGraphics = closeBtn.addComponent(Graphics);
        DoodleGraphics.drawDoodleCircle(
            closeBtnGraphics, 0, 0, 18,
            new Color(200, 80, 80),
            new Color(150, 50, 50),
            2
        );
        closeBtnGraphics.strokeColor = Color.WHITE;
        closeBtnGraphics.lineWidth = 3;
        closeBtnGraphics.moveTo(-8, 8);
        closeBtnGraphics.lineTo(8, -8);
        closeBtnGraphics.moveTo(8, 8);
        closeBtnGraphics.lineTo(-8, -8);
        closeBtnGraphics.stroke();
        
        const closeButton = closeBtn.addComponent(Button);
        closeButton.transition = Button.Transition.SCALE;
        closeBtn.on(Button.EventType.CLICK, this.onClose, this);
        topBar.addChild(closeBtn);

        this.node.addChild(topBar);
    }

    /**
     * 创建角色列表
     */
    private createCharacterList(): void {
        const listArea = new Node('ListArea');
        listArea.setPosition(0, 380);

        const transform = listArea.addComponent(UITransform);
        transform.setContentSize(680, 150);

        const graphics = listArea.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 680, 150,
            new Color(30, 30, 40),
            new Color(60, 60, 80),
            2, 8
        );

        // 角色容器
        const container = new Node('Container');
        this.characterListContainer = container;
        
        const containerTransform = container.addComponent(UITransform);
        containerTransform.setContentSize(660, 130);

        const layout = container.addComponent(Layout);
        layout.type = Layout.Type.HORIZONTAL;
        layout.spacingX = 10;
        layout.paddingLeft = 10;

        listArea.addChild(container);
        this.node.addChild(listArea);
    }

    /**
     * 创建详情区域
     */
    private createDetailArea(): void {
        const detail = new Node('DetailArea');
        detail.setPosition(0, -50);
        this.detailArea = detail;

        const transform = detail.addComponent(UITransform);
        transform.setContentSize(680, 700);

        const graphics = detail.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 680, 700,
            new Color(40, 40, 50),
            new Color(80, 80, 100),
            2, 10
        );

        // 提示文字
        const tipNode = new Node('Tip');
        const tipLabel = tipNode.addComponent(Label);
        tipLabel.string = '选择角色查看详情';
        tipLabel.fontSize = 18;
        tipLabel.color = new Color(120, 120, 140);
        detail.addChild(tipNode);

        this.node.addChild(detail);
    }

    /**
     * 刷新角色列表
     */
    public refreshCharacterList(): void {
        if (!this.characterListContainer) return;

        this.characterListContainer.removeAllChildren();
        this._characterCards.clear();

        const manager = CharacterManager.instance;
        if (!manager) return;

        const characters = manager.getOwnedCharacters();

        // 按稀有度排序
        characters.sort((a, b) => {
            const configA = CharacterDatabase.instance.getCharacter(a.configId);
            const configB = CharacterDatabase.instance.getCharacter(b.configId);
            return (configB?.rarity || 0) - (configA?.rarity || 0);
        });

        for (const character of characters) {
            const card = this.createCharacterCard(character);
            this.characterListContainer.addChild(card);
            this._characterCards.set(character.uniqueId, card);
        }
    }

    /**
     * 创建角色卡片
     */
    private createCharacterCard(instance: CharacterInstance): Node {
        const config = CharacterDatabase.instance.getCharacter(instance.configId);
        if (!config) return new Node();

        const card = new Node(`Card_${instance.uniqueId}`);
        const cardSize = 100;

        const transform = card.addComponent(UITransform);
        transform.setContentSize(cardSize, 120);

        const graphics = card.addComponent(Graphics);
        const rarityColor = new Color().fromHEX(CharacterDatabase.instance.getRarityColor(config.rarity));
        const elementColor = new Color().fromHEX(CharacterDatabase.instance.getElementColor(config.element));

        // 卡片背景
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, cardSize, 120,
            new Color(50, 50, 60),
            rarityColor,
            2, 8
        );

        // 角色头像
        DoodleGraphics.drawDoodleCircle(
            graphics, 0, 25, 35,
            elementColor,
            rarityColor,
            3
        );
        DoodleGraphics.drawDoodleCircle(
            graphics, 0, 25, 28,
            new Color(255, 255, 255, 200),
            new Color(0, 0, 0, 0),
            0
        );

        // 简易表情
        graphics.fillColor = new Color(50, 50, 50);
        graphics.circle(-8, 28, 4);
        graphics.circle(8, 28, 4);
        graphics.fill();

        // 等级
        const levelNode = new Node('Level');
        levelNode.setPosition(0, -20);
        const levelLabel = levelNode.addComponent(Label);
        levelLabel.string = `Lv.${instance.level}`;
        levelLabel.fontSize = 12;
        levelLabel.color = Color.WHITE;
        card.addChild(levelNode);

        // 名称
        const nameNode = new Node('Name');
        nameNode.setPosition(0, -40);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = config.name;
        nameLabel.fontSize = 11;
        nameLabel.color = new Color(200, 200, 200);
        card.addChild(nameNode);

        // 星级
        if (instance.star > 0) {
            const starNode = new Node('Stars');
            starNode.setPosition(0, -55);
            const starLabel = starNode.addComponent(Label);
            starLabel.string = '★'.repeat(instance.star);
            starLabel.fontSize = 10;
            starLabel.color = new Color(255, 215, 0);
            card.addChild(starNode);
        }

        // 点击事件
        const button = card.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        card.on(Button.EventType.CLICK, () => this.selectCharacter(instance.uniqueId), this);

        return card;
    }

    /**
     * 选中角色
     */
    public selectCharacter(characterId: string): void {
        this._selectedCharacterId = characterId;
        this.showCharacterDetail(characterId);

        // 高亮选中
        this._characterCards.forEach((card, id) => {
            const scale = id === characterId ? 1.1 : 1.0;
            tween(card)
                .to(0.1, { scale: new Vec3(scale, scale, 1) })
                .start();
        });
    }

    /**
     * 显示角色详情
     */
    private showCharacterDetail(characterId: string): void {
        if (!this.detailArea) return;

        const manager = CharacterManager.instance;
        if (!manager) return;

        const instance = manager.getCharacterInstance(characterId);
        const config = manager.getCharacterConfig(characterId);
        const stats = manager.getCharacterStats(characterId);
        const baseStats = manager.getCharacterBaseStats(characterId);

        if (!instance || !config || !stats || !baseStats) return;

        // 清除旧内容
        this.detailArea.removeAllChildren();

        // 重绘背景
        const graphics = this.detailArea.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            const rarityColor = new Color().fromHEX(CharacterDatabase.instance.getRarityColor(config.rarity));
            DoodleGraphics.drawDoodleRect(
                graphics, 0, 0, 680, 700,
                new Color(40, 40, 50),
                rarityColor,
                3, 10
            );
        }

        // 角色信息区
        this.createCharacterInfo(instance, config, stats);

        // 属性区
        this.createStatsArea(stats, baseStats);

        // 装备槽位
        this.createEquipmentSlots(instance);

        // 技能区
        this.createSkillArea(instance, config);

        // 操作按钮
        this.createActionButtons(instance);
    }

    /**
     * 创建角色信息区
     */
    private createCharacterInfo(instance: CharacterInstance, config: CharacterConfig, stats: CharacterStats): void {
        if (!this.detailArea) return;

        // 大头像
        const avatarNode = new Node('Avatar');
        avatarNode.setPosition(-220, 250);
        const avatarGraphics = avatarNode.addComponent(Graphics);
        
        const rarityColor = new Color().fromHEX(CharacterDatabase.instance.getRarityColor(config.rarity));
        const elementColor = new Color().fromHEX(CharacterDatabase.instance.getElementColor(config.element));

        DoodleGraphics.drawDoodleCircle(
            avatarGraphics, 0, 0, 70,
            elementColor,
            rarityColor,
            4
        );
        DoodleGraphics.drawDoodleCircle(
            avatarGraphics, 0, 0, 55,
            new Color(255, 255, 255, 200),
            new Color(0, 0, 0, 0),
            0
        );
        // 简易表情
        avatarGraphics.fillColor = new Color(50, 50, 50);
        avatarGraphics.circle(-15, 5, 8);
        avatarGraphics.circle(15, 5, 8);
        avatarGraphics.fill();

        this.detailArea.addChild(avatarNode);

        // 名称
        const nameNode = new Node('Name');
        nameNode.setPosition(50, 290);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = config.name;
        nameLabel.fontSize = 28;
        nameLabel.color = rarityColor;
        nameLabel.enableBold = true;
        this.detailArea.addChild(nameNode);

        // 称号
        const titleNode = new Node('Title');
        titleNode.setPosition(50, 260);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = config.title;
        titleLabel.fontSize = 14;
        titleLabel.color = new Color(180, 180, 180);
        this.detailArea.addChild(titleNode);

        // 等级和星级
        const levelNode = new Node('Level');
        levelNode.setPosition(50, 230);
        const levelLabel = levelNode.addComponent(Label);
        levelLabel.string = `Lv.${instance.level}  ${'★'.repeat(instance.star)}${'☆'.repeat(6 - instance.star)}`;
        levelLabel.fontSize = 16;
        levelLabel.color = new Color(255, 215, 0);
        this.detailArea.addChild(levelNode);

        // 元素和职业
        const elementNode = new Node('Element');
        elementNode.setPosition(50, 200);
        const elementLabel = elementNode.addComponent(Label);
        elementLabel.string = `${CharacterDatabase.instance.getElementName(config.element)}属性 · ${this.getClassName(config.characterClass)}`;
        elementLabel.fontSize = 14;
        elementLabel.color = elementColor;
        this.detailArea.addChild(elementNode);

        // 稀有度
        const rarityNode = new Node('Rarity');
        rarityNode.setPosition(200, 290);
        const rarityLabel = rarityNode.addComponent(Label);
        rarityLabel.string = CharacterDatabase.instance.getRarityName(config.rarity);
        rarityLabel.fontSize = 20;
        rarityLabel.color = rarityColor;
        rarityLabel.enableBold = true;
        this.detailArea.addChild(rarityNode);

        // 战斗力
        const power = this.calculatePower(stats);
        const powerNode = new Node('Power');
        powerNode.setPosition(200, 260);
        const powerLabel = powerNode.addComponent(Label);
        powerLabel.string = `战力: ${power}`;
        powerLabel.fontSize = 14;
        powerLabel.color = new Color(255, 200, 100);
        this.detailArea.addChild(powerNode);
    }

    /**
     * 创建属性区
     */
    private createStatsArea(stats: CharacterStats, baseStats: CharacterStats): void {
        if (!this.detailArea) return;

        const statsArea = new Node('StatsArea');
        statsArea.setPosition(-180, 70);
        
        const statsData = [
            { name: 'HP', value: stats.hp, base: baseStats.hp },
            { name: '攻击', value: stats.attack, base: baseStats.attack },
            { name: '防御', value: stats.defense, base: baseStats.defense },
            { name: '速度', value: stats.speed, base: baseStats.speed },
            { name: '暴击率', value: `${(stats.critRate * 100).toFixed(1)}%`, base: `${(baseStats.critRate * 100).toFixed(1)}%` },
            { name: '暴击伤害', value: `${(stats.critDamage * 100).toFixed(0)}%`, base: `${(baseStats.critDamage * 100).toFixed(0)}%` }
        ];

        let yPos = 0;
        for (const stat of statsData) {
            const statNode = new Node(`Stat_${stat.name}`);
            statNode.setPosition(0, yPos);
            
            const label = statNode.addComponent(Label);
            const bonus = typeof stat.value === 'number' && typeof stat.base === 'number' 
                ? stat.value - stat.base 
                : 0;
            const bonusStr = bonus > 0 ? ` (+${bonus})` : '';
            label.string = `${stat.name}: ${stat.value}${bonusStr}`;
            label.fontSize = 14;
            label.color = bonus > 0 ? new Color(150, 255, 150) : Color.WHITE;
            
            statsArea.addChild(statNode);
            yPos -= 25;
        }

        this.detailArea.addChild(statsArea);
    }

    /**
     * 创建装备槽位
     */
    private createEquipmentSlots(instance: CharacterInstance): void {
        if (!this.detailArea) return;

        const slotsArea = new Node('EquipmentSlots');
        slotsArea.setPosition(150, 70);
        this.equipmentSlotsContainer = slotsArea;

        const slots = [
            { type: EquipmentType.WEAPON, name: '武器', key: 'weapon' },
            { type: EquipmentType.ARMOR, name: '护甲', key: 'armor' },
            { type: EquipmentType.ACCESSORY, name: '饰品', key: 'accessory' }
        ];

        let yPos = 0;
        for (const slot of slots) {
            const slotNode = this.createEquipmentSlot(slot, instance, yPos);
            slotsArea.addChild(slotNode);
            yPos -= 55;
        }

        this.detailArea.addChild(slotsArea);
    }

    /**
     * 创建单个装备槽位
     */
    private createEquipmentSlot(
        slotInfo: { type: EquipmentType; name: string; key: string },
        instance: CharacterInstance,
        y: number
    ): Node {
        const slot = new Node(`Slot_${slotInfo.name}`);
        slot.setPosition(0, y);

        const transform = slot.addComponent(UITransform);
        transform.setContentSize(200, 50);

        const graphics = slot.addComponent(Graphics);
        
        const equipId = (instance.equipmentSlots as any)[slotInfo.key];
        const equipConfig = equipId ? EquipmentManager.instance?.getEquipmentConfig(equipId) : null;

        if (equipConfig) {
            const rarityColor = new Color().fromHEX(EquipmentDatabase.instance.getRarityColor(equipConfig.rarity));
            DoodleGraphics.drawDoodleRect(
                graphics, 0, 0, 200, 50,
                new Color(50, 50, 60),
                rarityColor,
                2, 6
            );

            // 装备名称
            const nameNode = new Node('Name');
            nameNode.setPosition(0, 8);
            const nameLabel = nameNode.addComponent(Label);
            const equipInstance = EquipmentManager.instance?.getEquipmentInstance(equipId);
            nameLabel.string = `${equipConfig.name} +${equipInstance?.level || 1}`;
            nameLabel.fontSize = 13;
            nameLabel.color = rarityColor;
            slot.addChild(nameNode);

            // 稀有度
            const rarityNode = new Node('Rarity');
            rarityNode.setPosition(0, -12);
            const rarityLabel = rarityNode.addComponent(Label);
            rarityLabel.string = EquipmentDatabase.instance.getRarityName(equipConfig.rarity);
            rarityLabel.fontSize = 11;
            rarityLabel.color = new Color(180, 180, 180);
            slot.addChild(rarityNode);
        } else {
            DoodleGraphics.drawDoodleRect(
                graphics, 0, 0, 200, 50,
                new Color(40, 40, 50),
                new Color(80, 80, 100),
                2, 6
            );

            const tipNode = new Node('Tip');
            const tipLabel = tipNode.addComponent(Label);
            tipLabel.string = `${slotInfo.name} (空)`;
            tipLabel.fontSize = 14;
            tipLabel.color = new Color(100, 100, 120);
            slot.addChild(tipNode);
        }

        return slot;
    }

    /**
     * 创建技能区
     */
    private createSkillArea(instance: CharacterInstance, config: CharacterConfig): void {
        if (!this.detailArea) return;

        const skillArea = new Node('SkillArea');
        skillArea.setPosition(0, -120);
        this.skillArea = skillArea;

        // 标题
        const titleNode = new Node('Title');
        titleNode.setPosition(-260, 30);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '技能';
        titleLabel.fontSize = 16;
        titleLabel.color = new Color(200, 200, 200);
        titleLabel.enableBold = true;
        skillArea.addChild(titleNode);

        // 主动技能
        const activeSkillId = instance.equippedSkills.activeSkillId;
        const activeSkill = SkillDatabase.instance.getSkill(activeSkillId);
        if (activeSkill) {
            const skillNode = this.createSkillDisplay(activeSkill, instance.skillLevels[activeSkillId] || 1, -150, -20);
            skillArea.addChild(skillNode);
        }

        // 队长技能
        if (config.skillSlots.leaderSkillId) {
            const leaderSkill = SkillDatabase.instance.getSkill(config.skillSlots.leaderSkillId);
            if (leaderSkill) {
                const skillNode = this.createSkillDisplay(leaderSkill, 1, 150, -20, true);
                skillArea.addChild(skillNode);
            }
        }

        this.detailArea.addChild(skillArea);
    }

    /**
     * 创建技能显示
     */
    private createSkillDisplay(skill: SkillConfig, level: number, x: number, y: number, isLeader: boolean = false): Node {
        const skillNode = new Node(`Skill_${skill.id}`);
        skillNode.setPosition(x, y);

        const transform = skillNode.addComponent(UITransform);
        transform.setContentSize(250, 80);

        const graphics = skillNode.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 250, 80,
            new Color(50, 50, 60),
            isLeader ? new Color(255, 200, 100) : new Color(100, 150, 200),
            2, 8
        );

        // 技能类型
        const typeNode = new Node('Type');
        typeNode.setPosition(-90, 25);
        const typeLabel = typeNode.addComponent(Label);
        typeLabel.string = isLeader ? '队长技能' : '主动技能';
        typeLabel.fontSize = 11;
        typeLabel.color = isLeader ? new Color(255, 200, 100) : new Color(100, 150, 200);
        skillNode.addChild(typeNode);

        // 技能名称
        const nameNode = new Node('Name');
        nameNode.setPosition(0, 5);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = `${skill.name} Lv.${level}`;
        nameLabel.fontSize = 14;
        nameLabel.color = Color.WHITE;
        nameLabel.enableBold = true;
        skillNode.addChild(nameNode);

        // 技能描述
        const descNode = new Node('Desc');
        descNode.setPosition(0, -20);
        const descLabel = descNode.addComponent(Label);
        descLabel.string = skill.description.substring(0, 20) + '...';
        descLabel.fontSize = 11;
        descLabel.color = new Color(150, 150, 150);
        skillNode.addChild(descNode);

        return skillNode;
    }

    /**
     * 创建操作按钮
     */
    private createActionButtons(instance: CharacterInstance): void {
        if (!this.detailArea) return;

        const buttonsArea = new Node('Buttons');
        buttonsArea.setPosition(0, -270);

        // 升级按钮
        const levelUpBtn = this.createButton('升级', 120, 45, new Color(80, 180, 80), () => {
            this.onLevelUp(instance.uniqueId);
        });
        levelUpBtn.setPosition(-180, 0);
        buttonsArea.addChild(levelUpBtn);

        // 突破按钮
        const breakthroughBtn = this.createButton('突破', 120, 45, new Color(200, 150, 80), () => {
            this.onBreakthrough(instance.uniqueId);
        });
        breakthroughBtn.setPosition(-50, 0);
        buttonsArea.addChild(breakthroughBtn);

        // 技能按钮
        const skillBtn = this.createButton('技能', 120, 45, new Color(80, 130, 200), () => {
            this.onOpenSkill(instance.uniqueId);
        });
        skillBtn.setPosition(80, 0);
        buttonsArea.addChild(skillBtn);

        // 装备按钮
        const equipBtn = this.createButton('装备', 120, 45, new Color(180, 80, 180), () => {
            this.onOpenEquipment(instance.uniqueId);
        });
        equipBtn.setPosition(210, 0);
        buttonsArea.addChild(equipBtn);

        this.detailArea.addChild(buttonsArea);
    }

    /**
     * 创建按钮
     */
    private createButton(text: string, width: number, height: number, color: Color, callback: () => void): Node {
        const btn = new Node(`Btn_${text}`);
        const transform = btn.addComponent(UITransform);
        transform.setContentSize(width, height);

        const graphics = btn.addComponent(Graphics);
        DoodleGraphics.drawDoodleButton(graphics, 0, 0, width, height, color);

        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 16;
        label.color = Color.WHITE;
        btn.addChild(labelNode);

        const button = btn.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        btn.on(Button.EventType.CLICK, callback, this);

        return btn;
    }

    /**
     * 获取职业名称
     */
    private getClassName(classType: string): string {
        const classNames: { [key: string]: string } = {
            'warrior': '战士',
            'mage': '法师',
            'archer': '弓手',
            'healer': '治疗',
            'tank': '坦克',
            'assassin': '刺客',
            'support': '辅助'
        };
        return classNames[classType] || classType;
    }

    /**
     * 计算战斗力
     */
    private calculatePower(stats: CharacterStats): number {
        return Math.floor(
            stats.hp * 0.5 +
            stats.attack * 3 +
            stats.defense * 2 +
            stats.speed * 1 +
            stats.critRate * 500 +
            stats.critDamage * 200 +
            stats.skillPower * 300
        );
    }

    // ==================== 事件回调 ====================

    private onLevelUp(characterId: string): void {
        console.log('升级角色:', characterId);
        // 打开升级面板
    }

    private onBreakthrough(characterId: string): void {
        CharacterManager.instance?.breakthrough(characterId);
        this.showCharacterDetail(characterId);
    }

    private onOpenSkill(characterId: string): void {
        console.log('打开技能面板:', characterId);
    }

    private onOpenEquipment(characterId: string): void {
        console.log('打开装备面板:', characterId);
    }

    private onClose(): void {
        this.node.active = false;
    }
}
