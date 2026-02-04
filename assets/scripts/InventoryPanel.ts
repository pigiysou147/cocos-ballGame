import { _decorator, Component, Node, Label, Button, Graphics, Color, UITransform, ScrollView, Layout, Vec3, tween } from 'cc';
import { DoodleGraphics } from './DoodleGraphics';
import { EquipmentManager } from './EquipmentManager';
import { EquipmentDatabase, EquipmentConfig, EquipmentInstance, EquipmentType, EquipmentRarity, EquipmentStatType } from './EquipmentData';
import { CharacterManager } from './CharacterManager';
const { ccclass, property } = _decorator;

/**
 * 背包/装备面板
 * Inventory Panel - Equipment management UI
 */
@ccclass('InventoryPanel')
export class InventoryPanel extends Component {
    @property({ type: Node, tooltip: '装备列表容器' })
    public equipmentListContainer: Node | null = null;

    @property({ type: Node, tooltip: '装备详情面板' })
    public detailPanel: Node | null = null;

    @property({ type: Node, tooltip: '筛选按钮容器' })
    public filterContainer: Node | null = null;

    @property({ type: Label, tooltip: '背包容量标签' })
    public capacityLabel: Label | null = null;

    @property({ type: Label, tooltip: '金币标签' })
    public goldLabel: Label | null = null;

    @property({ tooltip: '装备格子大小' })
    public slotSize: number = 90;

    // 当前筛选类型
    private _currentFilter: EquipmentType | 'all' = 'all';
    
    // 当前选中的装备
    private _selectedEquipmentId: string | null = null;
    
    // 装备格子节点
    private _equipmentSlots: Map<string, Node> = new Map();

    onLoad() {
        this.createPanel();
    }

    onEnable() {
        this.refreshInventory();
        this.updateCapacityDisplay();
    }

    /**
     * 创建面板
     */
    private createPanel(): void {
        // 面板背景
        this.createPanelBackground();
        
        // 顶部栏
        this.createTopBar();
        
        // 筛选栏
        this.createFilterBar();
        
        // 装备列表区域
        this.createEquipmentList();
        
        // 详情面板
        this.createDetailPanel();
    }

    /**
     * 创建面板背景
     */
    private createPanelBackground(): void {
        const bg = new Node('PanelBg');
        const transform = bg.addComponent(UITransform);
        transform.setContentSize(700, 1100);

        const graphics = bg.addComponent(Graphics);
        
        // 主背景
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
        titleLabel.string = '📦 背包';
        titleLabel.fontSize = 24;
        titleLabel.color = Color.WHITE;
        titleLabel.enableBold = true;
        topBar.addChild(titleNode);

        // 容量显示
        const capacityNode = new Node('Capacity');
        capacityNode.setPosition(100, 0);
        this.capacityLabel = capacityNode.addComponent(Label);
        this.capacityLabel.string = '0/200';
        this.capacityLabel.fontSize = 16;
        this.capacityLabel.color = new Color(180, 180, 180);
        topBar.addChild(capacityNode);

        // 金币显示
        const goldNode = new Node('Gold');
        goldNode.setPosition(250, 0);
        const goldGraphics = goldNode.addComponent(Graphics);
        DoodleGraphics.drawDoodleCircle(
            goldGraphics, -30, 0, 10,
            new Color(255, 215, 0),
            new Color(200, 160, 0),
            2
        );
        this.goldLabel = goldNode.addComponent(Label);
        this.goldLabel.string = '0';
        this.goldLabel.fontSize = 16;
        this.goldLabel.color = new Color(255, 230, 150);
        topBar.addChild(goldNode);

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
        // X图标
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
     * 创建筛选栏
     */
    private createFilterBar(): void {
        const filterBar = new Node('FilterBar');
        filterBar.setPosition(0, 430);
        this.filterContainer = filterBar;

        const transform = filterBar.addComponent(UITransform);
        transform.setContentSize(680, 50);

        const filters = [
            { name: '全部', type: 'all' as const },
            { name: '武器', type: EquipmentType.WEAPON },
            { name: '护甲', type: EquipmentType.ARMOR },
            { name: '饰品', type: EquipmentType.ACCESSORY }
        ];

        const buttonWidth = 150;
        const startX = -225;

        for (let i = 0; i < filters.length; i++) {
            const filter = filters[i];
            const btn = this.createFilterButton(filter.name, filter.type, startX + i * (buttonWidth + 10));
            filterBar.addChild(btn);
        }

        this.node.addChild(filterBar);
    }

    /**
     * 创建筛选按钮
     */
    private createFilterButton(name: string, type: EquipmentType | 'all', x: number): Node {
        const btn = new Node(`Filter_${name}`);
        btn.setPosition(x, 0);

        const transform = btn.addComponent(UITransform);
        transform.setContentSize(140, 40);

        const graphics = btn.addComponent(Graphics);
        const isSelected = this._currentFilter === type;
        
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 140, 40,
            isSelected ? new Color(80, 130, 200) : new Color(50, 50, 60),
            isSelected ? new Color(100, 160, 255) : new Color(80, 80, 100),
            2, 6
        );

        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = name;
        label.fontSize = 16;
        label.color = Color.WHITE;
        btn.addChild(labelNode);

        const button = btn.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        btn.on(Button.EventType.CLICK, () => this.onFilterClick(type), this);

        return btn;
    }

    /**
     * 创建装备列表
     */
    private createEquipmentList(): void {
        const listArea = new Node('ListArea');
        listArea.setPosition(0, 50);

        const transform = listArea.addComponent(UITransform);
        transform.setContentSize(680, 600);

        const graphics = listArea.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 680, 600,
            new Color(30, 30, 40),
            new Color(60, 60, 80),
            2, 8
        );

        // 装备容器
        const container = new Node('Container');
        container.setPosition(0, 280);
        this.equipmentListContainer = container;
        
        const containerTransform = container.addComponent(UITransform);
        containerTransform.setContentSize(660, 580);

        // 布局组件
        const layout = container.addComponent(Layout);
        layout.type = Layout.Type.GRID;
        layout.cellSize.width = this.slotSize + 10;
        layout.cellSize.height = this.slotSize + 10;
        layout.startAxis = Layout.AxisDirection.HORIZONTAL;
        layout.paddingLeft = 10;
        layout.paddingTop = 10;
        layout.spacingX = 10;
        layout.spacingY = 10;

        listArea.addChild(container);
        this.node.addChild(listArea);
    }

    /**
     * 创建装备详情面板
     */
    private createDetailPanel(): void {
        const detail = new Node('DetailPanel');
        detail.setPosition(0, -350);
        this.detailPanel = detail;

        const transform = detail.addComponent(UITransform);
        transform.setContentSize(680, 250);

        const graphics = detail.addComponent(Graphics);
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, 680, 250,
            new Color(40, 40, 50),
            new Color(80, 80, 100),
            2, 10
        );

        // 提示文字
        const tipNode = new Node('Tip');
        const tipLabel = tipNode.addComponent(Label);
        tipLabel.string = '选择装备查看详情';
        tipLabel.fontSize = 18;
        tipLabel.color = new Color(120, 120, 140);
        detail.addChild(tipNode);

        this.node.addChild(detail);
    }

    /**
     * 刷新背包显示
     */
    public refreshInventory(): void {
        if (!this.equipmentListContainer) return;

        // 清除现有格子
        this.equipmentListContainer.removeAllChildren();
        this._equipmentSlots.clear();

        const manager = EquipmentManager.instance;
        if (!manager) return;

        // 获取装备列表
        let equipments = manager.getAllEquipments();

        // 筛选
        if (this._currentFilter !== 'all') {
            equipments = equipments.filter(e => {
                const config = EquipmentDatabase.instance.getEquipment(e.configId);
                return config?.type === this._currentFilter;
            });
        }

        // 排序：按稀有度降序
        equipments.sort((a, b) => {
            const configA = EquipmentDatabase.instance.getEquipment(a.configId);
            const configB = EquipmentDatabase.instance.getEquipment(b.configId);
            return (configB?.rarity || 0) - (configA?.rarity || 0);
        });

        // 创建装备格子
        for (const equipment of equipments) {
            const slot = this.createEquipmentSlot(equipment);
            this.equipmentListContainer.addChild(slot);
            this._equipmentSlots.set(equipment.uniqueId, slot);
        }

        this.updateCapacityDisplay();
    }

    /**
     * 创建装备格子
     */
    private createEquipmentSlot(equipment: EquipmentInstance): Node {
        const config = EquipmentDatabase.instance.getEquipment(equipment.configId);
        if (!config) return new Node();

        const slot = new Node(`Slot_${equipment.uniqueId}`);
        const transform = slot.addComponent(UITransform);
        transform.setContentSize(this.slotSize, this.slotSize);

        const graphics = slot.addComponent(Graphics);
        const rarityColor = new Color().fromHEX(EquipmentDatabase.instance.getRarityColor(config.rarity));

        // 背景
        DoodleGraphics.drawDoodleRect(
            graphics, 0, 0, this.slotSize, this.slotSize,
            new Color(45, 45, 55),
            rarityColor,
            2, 6
        );

        // 装备图标
        const iconSize = this.slotSize * 0.5;
        switch (config.type) {
            case EquipmentType.WEAPON:
                DoodleGraphics.drawDoodleSword(graphics, 0, 5, iconSize, new Color(200, 200, 220));
                break;
            case EquipmentType.ARMOR:
                DoodleGraphics.drawDoodleShield(graphics, 0, 5, iconSize, new Color(150, 150, 180));
                break;
            case EquipmentType.ACCESSORY:
                DoodleGraphics.drawDoodleRing(graphics, 0, 5, iconSize, new Color(255, 215, 0));
                break;
        }

        // 强化等级
        if (equipment.level > 1) {
            const levelNode = new Node('Level');
            levelNode.setPosition(this.slotSize / 2 - 15, this.slotSize / 2 - 12);
            const levelLabel = levelNode.addComponent(Label);
            levelLabel.string = `+${equipment.level}`;
            levelLabel.fontSize = 12;
            levelLabel.color = new Color(100, 255, 100);
            levelLabel.enableBold = true;
            slot.addChild(levelNode);
        }

        // 已装备标识
        if (equipment.equippedBy) {
            const equippedNode = new Node('Equipped');
            equippedNode.setPosition(-this.slotSize / 2 + 12, this.slotSize / 2 - 12);
            const equippedLabel = equippedNode.addComponent(Label);
            equippedLabel.string = 'E';
            equippedLabel.fontSize = 14;
            equippedLabel.color = new Color(100, 200, 255);
            equippedLabel.enableBold = true;
            slot.addChild(equippedNode);
        }

        // 锁定标识
        if (equipment.isLocked) {
            const lockNode = new Node('Lock');
            lockNode.setPosition(this.slotSize / 2 - 12, -this.slotSize / 2 + 12);
            const lockLabel = lockNode.addComponent(Label);
            lockLabel.string = '🔒';
            lockLabel.fontSize = 12;
            slot.addChild(lockNode);
        }

        // 稀有度名称
        const rarityNode = new Node('Rarity');
        rarityNode.setPosition(0, -this.slotSize / 2 + 12);
        const rarityLabel = rarityNode.addComponent(Label);
        rarityLabel.string = EquipmentDatabase.instance.getRarityName(config.rarity);
        rarityLabel.fontSize = 10;
        rarityLabel.color = rarityColor;
        slot.addChild(rarityNode);

        // 点击事件
        const button = slot.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        slot.on(Button.EventType.CLICK, () => this.onEquipmentClick(equipment.uniqueId), this);

        return slot;
    }

    /**
     * 显示装备详情
     */
    private showEquipmentDetail(equipmentId: string): void {
        if (!this.detailPanel) return;

        const manager = EquipmentManager.instance;
        if (!manager) return;

        const equipment = manager.getEquipmentInstance(equipmentId);
        const config = manager.getEquipmentConfig(equipmentId);
        if (!equipment || !config) return;

        // 清除旧内容
        this.detailPanel.removeAllChildren();

        const graphics = this.detailPanel.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            const rarityColor = new Color().fromHEX(EquipmentDatabase.instance.getRarityColor(config.rarity));
            DoodleGraphics.drawDoodleRect(
                graphics, 0, 0, 680, 250,
                new Color(40, 40, 50),
                rarityColor,
                3, 10
            );
        }

        // 装备名称
        const nameNode = new Node('Name');
        nameNode.setPosition(-200, 90);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = `${config.name} +${equipment.level}`;
        nameLabel.fontSize = 20;
        nameLabel.color = new Color().fromHEX(EquipmentDatabase.instance.getRarityColor(config.rarity));
        nameLabel.enableBold = true;
        this.detailPanel.addChild(nameNode);

        // 类型和稀有度
        const typeNode = new Node('Type');
        typeNode.setPosition(-200, 60);
        const typeLabel = typeNode.addComponent(Label);
        typeLabel.string = `${EquipmentDatabase.instance.getTypeName(config.type)} · ${EquipmentDatabase.instance.getRarityName(config.rarity)}`;
        typeLabel.fontSize = 14;
        typeLabel.color = new Color(180, 180, 180);
        this.detailPanel.addChild(typeNode);

        // 属性
        const stats = EquipmentDatabase.instance.calculateStats(config, equipment.level);
        let yPos = 30;
        for (const stat of stats) {
            const statNode = new Node(`Stat_${stat.type}`);
            statNode.setPosition(-200, yPos);
            const statLabel = statNode.addComponent(Label);
            const valueStr = stat.isPercent ? `${(stat.value * 100).toFixed(1)}%` : Math.floor(stat.value).toString();
            statLabel.string = `${EquipmentDatabase.instance.getStatName(stat.type)}: +${valueStr}`;
            statLabel.fontSize = 14;
            statLabel.color = new Color(150, 255, 150);
            this.detailPanel.addChild(statNode);
            yPos -= 22;
        }

        // 随机属性
        if (equipment.randomStats.length > 0) {
            for (const stat of equipment.randomStats) {
                const statNode = new Node(`RandomStat_${stat.type}`);
                statNode.setPosition(-200, yPos);
                const statLabel = statNode.addComponent(Label);
                const valueStr = stat.isPercent ? `${(stat.value * 100).toFixed(1)}%` : Math.floor(stat.value).toString();
                statLabel.string = `${EquipmentDatabase.instance.getStatName(stat.type)}: +${valueStr}`;
                statLabel.fontSize = 14;
                statLabel.color = new Color(200, 200, 100);
                this.detailPanel.addChild(statNode);
                yPos -= 22;
            }
        }

        // 操作按钮
        this.createDetailButtons(equipment);
    }

    /**
     * 创建详情面板按钮
     */
    private createDetailButtons(equipment: EquipmentInstance): void {
        if (!this.detailPanel) return;

        const config = EquipmentDatabase.instance.getEquipment(equipment.configId);
        if (!config) return;

        // 强化按钮
        const enhanceBtn = this.createActionButton('强化', 150, 60, new Color(80, 180, 80), () => {
            this.onEnhance(equipment.uniqueId);
        });
        enhanceBtn.setPosition(150, 40);
        this.detailPanel.addChild(enhanceBtn);

        // 装备/卸下按钮
        const equipText = equipment.equippedBy ? '卸下' : '装备';
        const equipBtn = this.createActionButton(equipText, 150, 60, new Color(80, 130, 200), () => {
            if (equipment.equippedBy) {
                this.onUnequip(equipment.uniqueId);
            } else {
                this.onEquip(equipment.uniqueId);
            }
        });
        equipBtn.setPosition(150, -30);
        this.detailPanel.addChild(equipBtn);

        // 锁定按钮
        const lockText = equipment.isLocked ? '解锁' : '锁定';
        const lockBtn = this.createActionButton(lockText, 80, 40, new Color(120, 120, 140), () => {
            this.onToggleLock(equipment.uniqueId);
        });
        lockBtn.setPosition(250, -90);
        this.detailPanel.addChild(lockBtn);
    }

    /**
     * 创建操作按钮
     */
    private createActionButton(text: string, width: number, height: number, color: Color, callback: () => void): Node {
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
     * 更新容量显示
     */
    private updateCapacityDisplay(): void {
        const manager = EquipmentManager.instance;
        if (!manager) return;

        if (this.capacityLabel) {
            const count = manager.getAllEquipments().length;
            this.capacityLabel.string = `${count}/${manager.maxInventorySize}`;
        }

        if (this.goldLabel) {
            this.goldLabel.string = manager.gold.toString();
        }
    }

    // ==================== 事件回调 ====================

    private onFilterClick(type: EquipmentType | 'all'): void {
        this._currentFilter = type;
        this.refreshInventory();
        
        // 刷新筛选栏
        if (this.filterContainer) {
            this.filterContainer.removeAllChildren();
            const filters = [
                { name: '全部', type: 'all' as const },
                { name: '武器', type: EquipmentType.WEAPON },
                { name: '护甲', type: EquipmentType.ARMOR },
                { name: '饰品', type: EquipmentType.ACCESSORY }
            ];
            const startX = -225;
            for (let i = 0; i < filters.length; i++) {
                const filter = filters[i];
                const btn = this.createFilterButton(filter.name, filter.type, startX + i * 160);
                this.filterContainer.addChild(btn);
            }
        }
    }

    private onEquipmentClick(equipmentId: string): void {
        this._selectedEquipmentId = equipmentId;
        this.showEquipmentDetail(equipmentId);
        
        // 高亮选中
        this._equipmentSlots.forEach((slot, id) => {
            const scale = id === equipmentId ? 1.1 : 1.0;
            slot.setScale(scale, scale, 1);
        });
    }

    private onEnhance(equipmentId: string): void {
        const manager = EquipmentManager.instance;
        if (!manager) return;

        const result = manager.enhanceEquipment(equipmentId);
        if (result.success) {
            console.log('强化成功！');
        } else {
            console.log('强化失败');
        }

        this.refreshInventory();
        this.showEquipmentDetail(equipmentId);
    }

    private onEquip(equipmentId: string): void {
        // 这里需要选择角色，简化处理：装备给第一个角色
        const charManager = CharacterManager.instance;
        if (!charManager) return;

        const characters = charManager.getOwnedCharacters();
        if (characters.length > 0) {
            EquipmentManager.instance?.equipToCharacter(equipmentId, characters[0].uniqueId);
            this.refreshInventory();
            this.showEquipmentDetail(equipmentId);
        }
    }

    private onUnequip(equipmentId: string): void {
        EquipmentManager.instance?.unequipFromCharacter(equipmentId);
        this.refreshInventory();
        this.showEquipmentDetail(equipmentId);
    }

    private onToggleLock(equipmentId: string): void {
        EquipmentManager.instance?.toggleLock(equipmentId);
        this.refreshInventory();
        this.showEquipmentDetail(equipmentId);
    }

    private onClose(): void {
        this.node.active = false;
    }
}
