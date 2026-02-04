import { _decorator, Component, Node, Label, Sprite, Button, Color, ScrollView, Prefab, instantiate, UITransform, Graphics, Layout, Vec3, tween, SpriteFrame } from 'cc';
import { CharacterManager, TeamData } from './CharacterManager';
import { CharacterDatabase, CharacterConfig, CharacterInstance, CharacterRarity, ElementType } from './CharacterData';
const { ccclass, property } = _decorator;

/**
 * 角色选择UI界面
 * Character Selection UI
 */
@ccclass('CharacterSelectUI')
export class CharacterSelectUI extends Component {
    @property({ type: Node, tooltip: '角色列表容器' })
    public characterListContainer: Node | null = null;

    @property({ type: Node, tooltip: '队伍槽位容器' })
    public teamSlotsContainer: Node | null = null;

    @property({ type: Node, tooltip: '角色详情面板' })
    public detailPanel: Node | null = null;

    @property({ type: Label, tooltip: '角色名称标签' })
    public nameLabel: Label | null = null;

    @property({ type: Label, tooltip: '角色称号标签' })
    public titleLabel: Label | null = null;

    @property({ type: Label, tooltip: '角色等级标签' })
    public levelLabel: Label | null = null;

    @property({ type: Label, tooltip: '角色稀有度标签' })
    public rarityLabel: Label | null = null;

    @property({ type: Label, tooltip: '角色属性标签' })
    public elementLabel: Label | null = null;

    @property({ type: Label, tooltip: 'HP标签' })
    public hpLabel: Label | null = null;

    @property({ type: Label, tooltip: '攻击力标签' })
    public attackLabel: Label | null = null;

    @property({ type: Label, tooltip: '防御力标签' })
    public defenseLabel: Label | null = null;

    @property({ type: Label, tooltip: '速度标签' })
    public speedLabel: Label | null = null;

    @property({ type: Label, tooltip: '技能名称标签' })
    public skillNameLabel: Label | null = null;

    @property({ type: Label, tooltip: '技能描述标签' })
    public skillDescLabel: Label | null = null;

    @property({ type: Label, tooltip: '队伍战斗力标签' })
    public teamPowerLabel: Label | null = null;

    @property({ type: Node, tooltip: '队伍选择按钮容器' })
    public teamButtonsContainer: Node | null = null;

    @property({ type: Button, tooltip: '确认按钮' })
    public confirmButton: Button | null = null;

    @property({ type: Button, tooltip: '抽卡按钮' })
    public gachaButton: Button | null = null;

    @property({ tooltip: '角色卡片宽度' })
    public cardWidth: number = 120;

    @property({ tooltip: '角色卡片高度' })
    public cardHeight: number = 150;

    private _selectedCharacterId: string | null = null;
    private _selectedSlotIndex: number = -1;
    private _currentTeamId: string = 'team_1';
    private _characterCards: Map<string, Node> = new Map();
    private _teamSlots: Node[] = [];

    onLoad() {
        this.setupUI();
    }

    start() {
        this.refreshCharacterList();
        this.refreshTeamSlots();
        this.refreshTeamButtons();
        this.updateTeamPower();
    }

    /**
     * 初始化UI
     */
    private setupUI(): void {
        // 设置确认按钮
        if (this.confirmButton) {
            this.confirmButton.node.on(Button.EventType.CLICK, this.onConfirmClick, this);
        }

        // 设置抽卡按钮
        if (this.gachaButton) {
            this.gachaButton.node.on(Button.EventType.CLICK, this.onGachaClick, this);
        }

        // 隐藏详情面板
        if (this.detailPanel) {
            this.detailPanel.active = false;
        }
    }

    /**
     * 刷新角色列表
     */
    public refreshCharacterList(): void {
        if (!this.characterListContainer) return;

        // 清除现有卡片
        this.characterListContainer.removeAllChildren();
        this._characterCards.clear();

        const manager = CharacterManager.instance;
        if (!manager) return;

        const characters = manager.getOwnedCharacters();

        // 按稀有度排序
        characters.sort((a, b) => {
            const configA = CharacterDatabase.instance.getCharacter(a.configId);
            const configB = CharacterDatabase.instance.getCharacter(b.configId);
            if (!configA || !configB) return 0;
            return configB.rarity - configA.rarity;
        });

        // 创建角色卡片
        for (const instance of characters) {
            const config = CharacterDatabase.instance.getCharacter(instance.configId);
            if (!config) continue;

            const card = this.createCharacterCard(instance, config);
            this.characterListContainer.addChild(card);
            this._characterCards.set(instance.uniqueId, card);
        }

        // 添加Layout组件自动排列
        let layout = this.characterListContainer.getComponent(Layout);
        if (!layout) {
            layout = this.characterListContainer.addComponent(Layout);
        }
        layout.type = Layout.Type.GRID;
        layout.cellSize.width = this.cardWidth + 10;
        layout.cellSize.height = this.cardHeight + 10;
        layout.startAxis = Layout.AxisDirection.HORIZONTAL;
        layout.paddingLeft = 10;
        layout.paddingTop = 10;
        layout.spacingX = 10;
        layout.spacingY = 10;
    }

    /**
     * 创建角色卡片
     */
    private createCharacterCard(instance: CharacterInstance, config: CharacterConfig): Node {
        const card = new Node(`Card_${instance.uniqueId}`);
        
        // 添加UITransform
        const uiTransform = card.addComponent(UITransform);
        uiTransform.setContentSize(this.cardWidth, this.cardHeight);

        // 添加Graphics绘制背景
        const graphics = card.addComponent(Graphics);
        const rarityColor = new Color().fromHEX(CharacterDatabase.instance.getRarityColor(config.rarity));
        
        // 绘制边框
        graphics.strokeColor = rarityColor;
        graphics.lineWidth = 3;
        graphics.fillColor = new Color(40, 40, 50, 230);
        graphics.roundRect(-this.cardWidth / 2, -this.cardHeight / 2, this.cardWidth, this.cardHeight, 8);
        graphics.fill();
        graphics.stroke();

        // 绘制角色头像区域
        const elementColor = new Color().fromHEX(CharacterDatabase.instance.getElementColor(config.element));
        graphics.fillColor = elementColor;
        graphics.circle(0, 20, 35);
        graphics.fill();

        // 绘制角色简易图标
        graphics.fillColor = new Color(255, 255, 255, 200);
        graphics.circle(0, 20, 25);
        graphics.fill();

        // 添加名称标签
        const nameNode = new Node('Name');
        nameNode.setPosition(0, -35);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = config.name;
        nameLabel.fontSize = 14;
        nameLabel.color = Color.WHITE;
        nameLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        card.addChild(nameNode);

        // 添加等级标签
        const levelNode = new Node('Level');
        levelNode.setPosition(0, -52);
        const levelLabel = levelNode.addComponent(Label);
        levelLabel.string = `Lv.${instance.level}`;
        levelLabel.fontSize = 12;
        levelLabel.color = new Color(200, 200, 200);
        levelLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        card.addChild(levelNode);

        // 添加稀有度标签
        const rarityNode = new Node('Rarity');
        rarityNode.setPosition(0, -this.cardHeight / 2 + 15);
        const rarityLabel = rarityNode.addComponent(Label);
        rarityLabel.string = CharacterDatabase.instance.getRarityName(config.rarity);
        rarityLabel.fontSize = 16;
        rarityLabel.color = rarityColor;
        rarityLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        rarityLabel.enableBold = true;
        card.addChild(rarityNode);

        // 添加星级显示
        if (instance.star > 0) {
            const starNode = new Node('Stars');
            starNode.setPosition(0, this.cardHeight / 2 - 15);
            const starLabel = starNode.addComponent(Label);
            starLabel.string = '★'.repeat(instance.star);
            starLabel.fontSize = 12;
            starLabel.color = new Color(255, 215, 0);
            starLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            card.addChild(starNode);
        }

        // 添加锁定图标
        if (instance.isLocked) {
            const lockNode = new Node('Lock');
            lockNode.setPosition(this.cardWidth / 2 - 15, this.cardHeight / 2 - 15);
            const lockLabel = lockNode.addComponent(Label);
            lockLabel.string = '🔒';
            lockLabel.fontSize = 14;
            card.addChild(lockNode);
        }

        // 添加点击事件
        const button = card.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        card.on(Button.EventType.CLICK, () => {
            this.onCharacterCardClick(instance.uniqueId);
        }, this);

        return card;
    }

    /**
     * 刷新队伍槽位
     */
    public refreshTeamSlots(): void {
        if (!this.teamSlotsContainer) return;

        this.teamSlotsContainer.removeAllChildren();
        this._teamSlots = [];

        const manager = CharacterManager.instance;
        if (!manager) return;

        const team = manager.getTeam(this._currentTeamId);
        if (!team) return;

        for (let i = 0; i < manager.maxTeamSize; i++) {
            const slot = this.createTeamSlot(i, team);
            this.teamSlotsContainer.addChild(slot);
            this._teamSlots.push(slot);
        }

        // 添加Layout
        let layout = this.teamSlotsContainer.getComponent(Layout);
        if (!layout) {
            layout = this.teamSlotsContainer.addComponent(Layout);
        }
        layout.type = Layout.Type.HORIZONTAL;
        layout.spacingX = 20;
    }

    /**
     * 创建队伍槽位
     */
    private createTeamSlot(index: number, team: TeamData): Node {
        const slot = new Node(`Slot_${index}`);
        const size = 100;

        // 添加UITransform
        const uiTransform = slot.addComponent(UITransform);
        uiTransform.setContentSize(size, size + 30);

        // 添加Graphics
        const graphics = slot.addComponent(Graphics);
        
        const characterId = team.slots[index];
        const isLeader = characterId === team.leaderId;

        if (characterId) {
            // 有角色
            const instance = CharacterManager.instance?.getCharacterInstance(characterId);
            const config = instance ? CharacterDatabase.instance.getCharacter(instance.configId) : null;

            if (config) {
                const rarityColor = new Color().fromHEX(CharacterDatabase.instance.getRarityColor(config.rarity));
                const elementColor = new Color().fromHEX(CharacterDatabase.instance.getElementColor(config.element));

                // 绘制边框
                graphics.strokeColor = isLeader ? new Color(255, 215, 0) : rarityColor;
                graphics.lineWidth = isLeader ? 4 : 2;
                graphics.fillColor = new Color(50, 50, 60, 230);
                graphics.roundRect(-size / 2, -size / 2 + 15, size, size, 8);
                graphics.fill();
                graphics.stroke();

                // 绘制角色
                graphics.fillColor = elementColor;
                graphics.circle(0, 15, 30);
                graphics.fill();
                graphics.fillColor = new Color(255, 255, 255, 200);
                graphics.circle(0, 15, 22);
                graphics.fill();

                // 添加名称
                const nameNode = new Node('Name');
                nameNode.setPosition(0, -35);
                const nameLabel = nameNode.addComponent(Label);
                nameLabel.string = config.name;
                nameLabel.fontSize = 12;
                nameLabel.color = Color.WHITE;
                nameLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
                slot.addChild(nameNode);

                // 队长标识
                if (isLeader) {
                    const leaderNode = new Node('Leader');
                    leaderNode.setPosition(0, size / 2);
                    const leaderLabel = leaderNode.addComponent(Label);
                    leaderLabel.string = '队长';
                    leaderLabel.fontSize = 11;
                    leaderLabel.color = new Color(255, 215, 0);
                    leaderLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
                    slot.addChild(leaderNode);
                }
            }
        } else {
            // 空槽位
            graphics.strokeColor = new Color(100, 100, 100);
            graphics.lineWidth = 2;
            graphics.fillColor = new Color(30, 30, 40, 200);
            graphics.roundRect(-size / 2, -size / 2 + 15, size, size, 8);
            graphics.fill();
            graphics.stroke();

            // 添加加号
            graphics.strokeColor = new Color(80, 80, 80);
            graphics.lineWidth = 3;
            graphics.moveTo(-15, 15);
            graphics.lineTo(15, 15);
            graphics.moveTo(0, 0);
            graphics.lineTo(0, 30);
            graphics.stroke();
        }

        // 添加槽位序号
        const indexNode = new Node('Index');
        indexNode.setPosition(0, -size / 2 - 5);
        const indexLabel = indexNode.addComponent(Label);
        indexLabel.string = `${index + 1}`;
        indexLabel.fontSize = 14;
        indexLabel.color = new Color(150, 150, 150);
        indexLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        slot.addChild(indexNode);

        // 添加点击事件
        const button = slot.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        slot.on(Button.EventType.CLICK, () => {
            this.onTeamSlotClick(index);
        }, this);

        return slot;
    }

    /**
     * 刷新队伍选择按钮
     */
    private refreshTeamButtons(): void {
        if (!this.teamButtonsContainer) return;

        this.teamButtonsContainer.removeAllChildren();

        const manager = CharacterManager.instance;
        if (!manager) return;

        const teams = manager.getAllTeams();

        for (const team of teams) {
            const btn = this.createTeamButton(team);
            this.teamButtonsContainer.addChild(btn);
        }

        // 添加Layout
        let layout = this.teamButtonsContainer.getComponent(Layout);
        if (!layout) {
            layout = this.teamButtonsContainer.addComponent(Layout);
        }
        layout.type = Layout.Type.HORIZONTAL;
        layout.spacingX = 10;
    }

    /**
     * 创建队伍选择按钮
     */
    private createTeamButton(team: TeamData): Node {
        const btn = new Node(`TeamBtn_${team.id}`);
        
        const uiTransform = btn.addComponent(UITransform);
        uiTransform.setContentSize(80, 35);

        const graphics = btn.addComponent(Graphics);
        const isSelected = team.id === this._currentTeamId;
        
        graphics.fillColor = isSelected ? new Color(80, 120, 200) : new Color(60, 60, 70);
        graphics.roundRect(-40, -17.5, 80, 35, 5);
        graphics.fill();

        if (isSelected) {
            graphics.strokeColor = new Color(100, 150, 255);
            graphics.lineWidth = 2;
            graphics.stroke();
        }

        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = team.name;
        label.fontSize = 14;
        label.color = Color.WHITE;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        btn.addChild(labelNode);

        const button = btn.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        btn.on(Button.EventType.CLICK, () => {
            this.onTeamButtonClick(team.id);
        }, this);

        return btn;
    }

    /**
     * 角色卡片点击
     */
    private onCharacterCardClick(uniqueId: string): void {
        this._selectedCharacterId = uniqueId;
        this.showCharacterDetail(uniqueId);

        // 如果有选中的槽位，将角色放入
        if (this._selectedSlotIndex >= 0) {
            CharacterManager.instance?.setTeamMember(
                this._currentTeamId,
                this._selectedSlotIndex,
                uniqueId
            );
            this._selectedSlotIndex = -1;
            this.refreshTeamSlots();
            this.updateTeamPower();
        }

        // 高亮选中的卡片
        this.highlightCard(uniqueId);
    }

    /**
     * 高亮卡片
     */
    private highlightCard(uniqueId: string): void {
        this._characterCards.forEach((card, id) => {
            const scale = id === uniqueId ? 1.1 : 1.0;
            tween(card)
                .to(0.1, { scale: new Vec3(scale, scale, 1) })
                .start();
        });
    }

    /**
     * 队伍槽位点击
     */
    private onTeamSlotClick(index: number): void {
        const manager = CharacterManager.instance;
        if (!manager) return;

        const team = manager.getTeam(this._currentTeamId);
        if (!team) return;

        const currentCharId = team.slots[index];

        if (this._selectedCharacterId && !currentCharId) {
            // 有选中角色且槽位为空，直接放入
            manager.setTeamMember(this._currentTeamId, index, this._selectedCharacterId);
            this._selectedCharacterId = null;
        } else if (currentCharId) {
            // 槽位有角色，显示详情或设为队长
            if (this._selectedSlotIndex === index) {
                // 双击设为队长
                manager.setTeamLeader(this._currentTeamId, currentCharId);
            } else {
                this.showCharacterDetail(currentCharId);
            }
        }

        this._selectedSlotIndex = index;
        this.refreshTeamSlots();
        this.updateTeamPower();
    }

    /**
     * 队伍按钮点击
     */
    private onTeamButtonClick(teamId: string): void {
        this._currentTeamId = teamId;
        CharacterManager.instance?.setCurrentTeam(teamId);
        
        this.refreshTeamSlots();
        this.refreshTeamButtons();
        this.updateTeamPower();
    }

    /**
     * 显示角色详情
     */
    private showCharacterDetail(uniqueId: string): void {
        if (!this.detailPanel) return;

        const manager = CharacterManager.instance;
        if (!manager) return;

        const instance = manager.getCharacterInstance(uniqueId);
        const config = manager.getCharacterConfig(uniqueId);
        const stats = manager.getCharacterStats(uniqueId);

        if (!instance || !config || !stats) return;

        this.detailPanel.active = true;

        // 更新标签
        if (this.nameLabel) {
            this.nameLabel.string = config.name;
        }
        if (this.titleLabel) {
            this.titleLabel.string = config.title;
        }
        if (this.levelLabel) {
            this.levelLabel.string = `Lv.${instance.level} ${'★'.repeat(instance.star)}`;
        }
        if (this.rarityLabel) {
            this.rarityLabel.string = CharacterDatabase.instance.getRarityName(config.rarity);
            this.rarityLabel.color = new Color().fromHEX(CharacterDatabase.instance.getRarityColor(config.rarity));
        }
        if (this.elementLabel) {
            this.elementLabel.string = CharacterDatabase.instance.getElementName(config.element);
            this.elementLabel.color = new Color().fromHEX(CharacterDatabase.instance.getElementColor(config.element));
        }
        if (this.hpLabel) {
            this.hpLabel.string = `HP: ${stats.hp}`;
        }
        if (this.attackLabel) {
            this.attackLabel.string = `攻击: ${stats.attack}`;
        }
        if (this.defenseLabel) {
            this.defenseLabel.string = `防御: ${stats.defense}`;
        }
        if (this.speedLabel) {
            this.speedLabel.string = `速度: ${stats.speed}`;
        }
        if (this.skillNameLabel) {
            this.skillNameLabel.string = config.skill.name;
        }
        if (this.skillDescLabel) {
            this.skillDescLabel.string = config.skill.description;
        }

        // 动画显示
        this.detailPanel.setScale(0.8, 0.8, 1);
        tween(this.detailPanel)
            .to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    /**
     * 更新队伍战斗力
     */
    private updateTeamPower(): void {
        if (!this.teamPowerLabel) return;

        const manager = CharacterManager.instance;
        if (!manager) return;

        const power = manager.calculateTeamPower(this._currentTeamId);
        this.teamPowerLabel.string = `战斗力: ${power}`;
    }

    /**
     * 确认按钮点击
     */
    private onConfirmClick(): void {
        console.log('队伍编辑完成');
        // 关闭界面或返回主界面
        this.node.active = false;
    }

    /**
     * 抽卡按钮点击
     */
    private onGachaClick(): void {
        const manager = CharacterManager.instance;
        if (!manager) return;

        const result = manager.gacha();
        if (result) {
            console.log(`抽到: ${CharacterDatabase.instance.getRarityName(result.rarity)} ${result.name}`);
            this.refreshCharacterList();
            
            // 显示抽卡结果动画
            this.showGachaResult(result);
        }
    }

    /**
     * 显示抽卡结果
     */
    private showGachaResult(config: CharacterConfig): void {
        // 创建简单的结果展示
        const resultNode = new Node('GachaResult');
        
        const uiTransform = resultNode.addComponent(UITransform);
        uiTransform.setContentSize(300, 200);

        const graphics = resultNode.addComponent(Graphics);
        const rarityColor = new Color().fromHEX(CharacterDatabase.instance.getRarityColor(config.rarity));
        
        graphics.fillColor = new Color(0, 0, 0, 200);
        graphics.roundRect(-150, -100, 300, 200, 10);
        graphics.fill();
        
        graphics.strokeColor = rarityColor;
        graphics.lineWidth = 4;
        graphics.stroke();

        // 名称
        const nameNode = new Node('Name');
        nameNode.setPosition(0, 50);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = config.name;
        nameLabel.fontSize = 28;
        nameLabel.color = rarityColor;
        nameLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        nameLabel.enableBold = true;
        resultNode.addChild(nameNode);

        // 稀有度
        const rarityNode = new Node('Rarity');
        rarityNode.setPosition(0, 10);
        const rarityLabel = rarityNode.addComponent(Label);
        rarityLabel.string = CharacterDatabase.instance.getRarityName(config.rarity);
        rarityLabel.fontSize = 36;
        rarityLabel.color = rarityColor;
        rarityLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        rarityLabel.enableBold = true;
        resultNode.addChild(rarityNode);

        // 属性
        const elementNode = new Node('Element');
        elementNode.setPosition(0, -30);
        const elementLabel = elementNode.addComponent(Label);
        elementLabel.string = `${CharacterDatabase.instance.getElementName(config.element)}属性`;
        elementLabel.fontSize = 18;
        elementLabel.color = new Color().fromHEX(CharacterDatabase.instance.getElementColor(config.element));
        elementLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        resultNode.addChild(elementNode);

        // 点击关闭提示
        const tipNode = new Node('Tip');
        tipNode.setPosition(0, -70);
        const tipLabel = tipNode.addComponent(Label);
        tipLabel.string = '点击关闭';
        tipLabel.fontSize = 14;
        tipLabel.color = new Color(150, 150, 150);
        tipLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        resultNode.addChild(tipNode);

        // 添加点击关闭
        const button = resultNode.addComponent(Button);
        resultNode.on(Button.EventType.CLICK, () => {
            resultNode.destroy();
        }, this);

        this.node.addChild(resultNode);

        // 动画
        resultNode.setScale(0, 0, 1);
        tween(resultNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    /**
     * 打开界面
     */
    public show(): void {
        this.node.active = true;
        this.refreshCharacterList();
        this.refreshTeamSlots();
        this.refreshTeamButtons();
        this.updateTeamPower();
    }

    /**
     * 关闭界面
     */
    public hide(): void {
        this.node.active = false;
    }

    onDestroy() {
        if (this.confirmButton) {
            this.confirmButton.node.off(Button.EventType.CLICK, this.onConfirmClick, this);
        }
        if (this.gachaButton) {
            this.gachaButton.node.off(Button.EventType.CLICK, this.onGachaClick, this);
        }
    }
}
