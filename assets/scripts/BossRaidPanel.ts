import { _decorator, Component, Node, Color, Vec3, UITransform, Graphics, Label, ScrollView, tween } from 'cc';
import { DoodleGraphics } from './DoodleGraphics';
import { 
    BossRaidDatabase, 
    BossRaidConfig, 
    BossRaidDifficulty, 
    BossRaidStatus,
    BossPhase
} from './BossRaidData';
import { BossRaidManager } from './BossRaidManager';
import { ElementType } from './CharacterData';
const { ccclass, property } = _decorator;

/**
 * 领主战面板
 * Boss Raid Panel - UI for boss raid selection and battle
 */
@ccclass('BossRaidPanel')
export class BossRaidPanel extends Component {
    // UI节点
    private _topBar: Node | null = null;
    private _bossList: Node | null = null;
    private _bossDetail: Node | null = null;
    private _difficultySelect: Node | null = null;
    private _leaderboard: Node | null = null;

    // 状态
    private _selectedBossId: string = '';
    private _selectedDifficulty: BossRaidDifficulty = BossRaidDifficulty.NORMAL;
    private _bossNodes: Map<string, Node> = new Map();

    onLoad() {
        this.setupUI();
    }

    start() {
        this.refreshPanel();
    }

    private setupUI(): void {
        const uiTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        uiTransform.setContentSize(720, 1280);

        // 背景
        this.createBackground();

        // 顶部栏
        this.createTopBar();

        // Boss列表
        this.createBossList();

        // Boss详情
        this.createBossDetail();

        // 难度选择
        this.createDifficultySelect();

        // 排行榜
        this.createLeaderboard();
    }

    private createBackground(): void {
        const bg = new Node('Background');
        bg.parent = this.node;
        bg.setPosition(0, 0);

        const graphics = bg.addComponent(Graphics);
        const uiTransform = bg.addComponent(UITransform);
        uiTransform.setContentSize(720, 1280);

        // 深色背景
        graphics.fillColor = new Color(25, 20, 35, 255);
        graphics.fillRect(-360, -640, 720, 1280);

        // 装饰 - 暗纹
        graphics.strokeColor = new Color(50, 40, 60, 100);
        graphics.lineWidth = 2;

        // 绘制Boss战氛围装饰
        for (let i = 0; i < 8; i++) {
            const y = -500 + i * 150;
            graphics.moveTo(-350, y);
            graphics.bezierCurveTo(-200, y + 30, 200, y - 30, 350, y);
        }
        graphics.stroke();

        // 角落装饰
        graphics.fillColor = new Color(80, 30, 30, 50);
        for (let i = 0; i < 4; i++) {
            const x = i % 2 === 0 ? -300 : 300;
            const y = i < 2 ? 500 : -500;
            DoodleGraphics.drawStar(graphics, x, y, 30 + Math.random() * 20, 4);
        }
    }

    private createTopBar(): void {
        this._topBar = new Node('TopBar');
        this._topBar.parent = this.node;
        this._topBar.setPosition(0, 580);

        const graphics = this._topBar.addComponent(Graphics);
        const uiTransform = this._topBar.addComponent(UITransform);
        uiTransform.setContentSize(720, 100);

        // 背景
        graphics.fillColor = new Color(40, 25, 45, 240);
        DoodleGraphics.drawRoundedRect(graphics, -360, -50, 720, 100, 0);

        // 装饰边框
        graphics.strokeColor = new Color(150, 80, 80, 200);
        graphics.lineWidth = 3;
        graphics.moveTo(-360, -50);
        graphics.lineTo(360, -50);
        graphics.stroke();

        // 返回按钮
        const backBtn = this.createIconButton('Back', -320, 0, 'back');
        backBtn.parent = this._topBar;

        // 标题
        const title = this.createLabel('领主战', 0, 5, 32, new Color(255, 200, 100, 255));
        title.parent = this._topBar;

        // 副标题
        const subtitle = this.createLabel('BOSS RAID', 0, -20, 14, new Color(200, 150, 100, 200));
        subtitle.parent = this._topBar;

        // 挑战券
        const ticketNode = new Node('Tickets');
        ticketNode.parent = this._topBar;
        ticketNode.setPosition(280, 0);

        const ticketGraphics = ticketNode.addComponent(Graphics);
        ticketGraphics.fillColor = new Color(200, 150, 50, 255);
        DoodleGraphics.drawRoundedRect(ticketGraphics, -40, -15, 80, 30, 8);

        const ticketLabel = this.createLabel('🎫 0', 0, 0, 16, Color.WHITE);
        ticketLabel.parent = ticketNode;
        ticketLabel.name = 'TicketCount';
    }

    private createBossList(): void {
        this._bossList = new Node('BossList');
        this._bossList.parent = this.node;
        this._bossList.setPosition(0, 380);

        const uiTransform = this._bossList.addComponent(UITransform);
        uiTransform.setContentSize(700, 280);

        // 标题
        const titleBg = new Node('TitleBg');
        titleBg.parent = this._bossList;
        titleBg.setPosition(0, 120);

        const titleGraphics = titleBg.addComponent(Graphics);
        titleGraphics.fillColor = new Color(60, 40, 70, 200);
        DoodleGraphics.drawRoundedRect(titleGraphics, -100, -15, 200, 30, 8);

        const title = this.createLabel('选择领主', 0, 0, 18, new Color(255, 220, 150, 255));
        title.parent = titleBg;

        // Boss卡片容器
        const content = new Node('Content');
        content.parent = this._bossList;
        content.setPosition(-280, 0);

        const bosses = BossRaidDatabase.instance.getAllBosses();
        bosses.forEach((boss, index) => {
            const bossNode = this.createBossCard(boss, index * 145, 0);
            bossNode.parent = content;
            this._bossNodes.set(boss.id, bossNode);
        });
    }

    private createBossCard(boss: BossRaidConfig, x: number, y: number): Node {
        const node = new Node(`Boss_${boss.id}`);
        node.setPosition(x, y);

        const graphics = node.addComponent(Graphics);
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(135, 180);

        const status = BossRaidManager.instance?.getBossStatus(boss.id) ?? BossRaidStatus.EXPIRED;
        const isUnlocked = status !== BossRaidStatus.EXPIRED;
        const isDefeated = status === BossRaidStatus.DEFEATED;
        const isSelected = boss.id === this._selectedBossId;

        // 卡片背景
        let bgColor: Color;
        if (isSelected) {
            bgColor = new Color(100, 60, 80, 255);
        } else if (isDefeated) {
            bgColor = new Color(50, 60, 50, 255);
        } else if (isUnlocked) {
            bgColor = new Color(60, 40, 60, 255);
        } else {
            bgColor = new Color(35, 30, 40, 255);
        }
        graphics.fillColor = bgColor;
        DoodleGraphics.drawRoundedRect(graphics, -62, -85, 124, 170, 12);

        // 边框
        const borderColor = isSelected ? new Color(255, 180, 100, 255) : 
            (isUnlocked ? new Color(120, 80, 100, 255) : new Color(60, 50, 70, 255));
        graphics.strokeColor = borderColor;
        graphics.lineWidth = isSelected ? 3 : 2;
        DoodleGraphics.drawRoundedRect(graphics, -62, -85, 124, 170, 12);
        graphics.stroke();

        // Boss头像区域
        graphics.fillColor = new Color(30, 25, 35, 255);
        DoodleGraphics.drawRoundedRect(graphics, -50, 5, 100, 70, 8);

        if (isUnlocked) {
            // 绘制Boss图标
            this.drawBossIcon(graphics, 0, 40, boss);
        } else {
            // 锁定图标
            graphics.fillColor = new Color(80, 70, 90, 255);
            DoodleGraphics.drawRoundedRect(graphics, -20, 25, 40, 35, 6);
            graphics.fillColor = new Color(60, 55, 70, 255);
            DoodleGraphics.drawCircle(graphics, 0, 55, 12);
        }

        // 元素标识
        if (isUnlocked) {
            this.drawElementIcon(graphics, 45, 70, boss.element, 12);
        }

        // Boss名称
        const nameLabel = this.createLabel(boss.name, 0, -20, 16, 
            isUnlocked ? Color.WHITE : new Color(100, 90, 110, 255));
        nameLabel.parent = node;

        // Boss称号
        if (isUnlocked) {
            const titleLabel = this.createLabel(boss.title, 0, -40, 12, new Color(255, 200, 100, 200));
            titleLabel.parent = node;
        }

        // 推荐战力
        if (isUnlocked) {
            const powerLabel = this.createLabel(`推荐:${this.formatNumber(boss.recommendedPower)}`, 0, -60, 10, 
                new Color(180, 150, 200, 255));
            powerLabel.parent = node;
        }

        // 击败标记
        if (isDefeated) {
            graphics.fillColor = new Color(100, 200, 100, 200);
            graphics.strokeColor = new Color(150, 255, 150, 255);
            graphics.lineWidth = 2;
            graphics.moveTo(-30, -70);
            graphics.lineTo(-15, -80);
            graphics.lineTo(30, -55);
            graphics.stroke();
        }

        // 点击事件
        if (isUnlocked) {
            node.on(Node.EventType.TOUCH_END, () => {
                this.selectBoss(boss.id);
            });
        }

        return node;
    }

    private drawBossIcon(graphics: Graphics, x: number, y: number, boss: BossRaidConfig): void {
        // 根据Boss元素绘制不同图标
        switch (boss.element) {
            case ElementType.FIRE:
                graphics.fillColor = new Color(255, 100, 50, 255);
                DoodleGraphics.drawFlame(graphics, x, y, 25);
                break;
            case ElementType.WATER:
                graphics.fillColor = new Color(100, 180, 255, 255);
                DoodleGraphics.drawWater(graphics, x, y, 25);
                break;
            case ElementType.THUNDER:
                graphics.fillColor = new Color(255, 255, 100, 255);
                DoodleGraphics.drawLightning(graphics, x, y, 25);
                break;
            case ElementType.DARK:
                graphics.fillColor = new Color(150, 80, 200, 255);
                DoodleGraphics.drawStar(graphics, x, y, 20, 6);
                break;
            case ElementType.LIGHT:
                graphics.fillColor = new Color(255, 255, 200, 255);
                DoodleGraphics.drawStar(graphics, x, y, 22, 8);
                break;
            default:
                graphics.fillColor = new Color(150, 150, 150, 255);
                DoodleGraphics.drawCircle(graphics, x, y, 20);
        }
    }

    private drawElementIcon(graphics: Graphics, x: number, y: number, element: ElementType, size: number): void {
        switch (element) {
            case ElementType.FIRE:
                graphics.fillColor = new Color(255, 100, 50, 255);
                DoodleGraphics.drawFlame(graphics, x, y, size);
                break;
            case ElementType.WATER:
                graphics.fillColor = new Color(100, 180, 255, 255);
                DoodleGraphics.drawWater(graphics, x, y, size);
                break;
            case ElementType.THUNDER:
                graphics.fillColor = new Color(255, 255, 100, 255);
                DoodleGraphics.drawLightning(graphics, x, y, size);
                break;
            case ElementType.WIND:
                graphics.fillColor = new Color(100, 255, 150, 255);
                DoodleGraphics.drawCircle(graphics, x, y, size);
                break;
            case ElementType.LIGHT:
                graphics.fillColor = new Color(255, 255, 200, 255);
                DoodleGraphics.drawStar(graphics, x, y, size, 6);
                break;
            case ElementType.DARK:
                graphics.fillColor = new Color(150, 80, 200, 255);
                DoodleGraphics.drawStar(graphics, x, y, size, 4);
                break;
        }
    }

    private createBossDetail(): void {
        this._bossDetail = new Node('BossDetail');
        this._bossDetail.parent = this.node;
        this._bossDetail.setPosition(0, 80);

        const uiTransform = this._bossDetail.addComponent(UITransform);
        uiTransform.setContentSize(680, 280);

        const graphics = this._bossDetail.addComponent(Graphics);

        // 背景面板
        graphics.fillColor = new Color(35, 30, 45, 240);
        DoodleGraphics.drawRoundedRect(graphics, -340, -140, 680, 280, 16);

        // 边框
        graphics.strokeColor = new Color(100, 70, 90, 255);
        graphics.lineWidth = 2;
        DoodleGraphics.drawRoundedRect(graphics, -340, -140, 680, 280, 16);
        graphics.stroke();

        // 初始提示
        const hintLabel = this.createLabel('选择一个领主查看详情', 0, 0, 20, new Color(150, 130, 160, 255));
        hintLabel.parent = this._bossDetail;
        hintLabel.name = 'HintLabel';
    }

    private refreshBossDetail(): void {
        if (!this._bossDetail || !this._selectedBossId) return;

        this._bossDetail.removeAllChildren();

        const boss = BossRaidDatabase.instance.getBoss(this._selectedBossId);
        if (!boss) return;

        const record = BossRaidManager.instance?.getRecord(this._selectedBossId, this._selectedDifficulty);
        const diffConfig = BossRaidDatabase.instance.getDifficultyConfig(this._selectedBossId, this._selectedDifficulty);
        const bossStats = BossRaidDatabase.instance.calculateBossStats(this._selectedBossId, this._selectedDifficulty);

        // 重绘背景
        const graphics = this._bossDetail.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            graphics.fillColor = new Color(35, 30, 45, 240);
            DoodleGraphics.drawRoundedRect(graphics, -340, -140, 680, 280, 16);
            graphics.strokeColor = new Color(100, 70, 90, 255);
            graphics.lineWidth = 2;
            DoodleGraphics.drawRoundedRect(graphics, -340, -140, 680, 280, 16);
            graphics.stroke();
        }

        // 左侧：Boss信息
        const leftX = -220;

        // 名称和称号
        const nameLabel = this.createLabel(boss.name, leftX, 110, 26, new Color(255, 220, 150, 255));
        nameLabel.parent = this._bossDetail;

        const titleLabel = this.createLabel(boss.title, leftX, 80, 16, new Color(200, 150, 100, 255));
        titleLabel.parent = this._bossDetail;

        // 描述
        const descLabel = this.createLabel(boss.description.substring(0, 20) + '...', leftX, 50, 12, 
            new Color(180, 170, 190, 255));
        descLabel.parent = this._bossDetail;

        // 属性信息
        if (bossStats) {
            const hpLabel = this.createLabel(`HP: ${this.formatNumber(bossStats.hp)}`, leftX - 50, 15, 14, 
                new Color(255, 150, 150, 255));
            hpLabel.parent = this._bossDetail;

            const atkLabel = this.createLabel(`攻击: ${this.formatNumber(bossStats.attack)}`, leftX + 50, 15, 14, 
                new Color(255, 200, 100, 255));
            atkLabel.parent = this._bossDetail;

            const defLabel = this.createLabel(`防御: ${this.formatNumber(bossStats.defense)}`, leftX, -10, 14, 
                new Color(150, 200, 255, 255));
            defLabel.parent = this._bossDetail;
        }

        // 时间限制
        const timeLabel = this.createLabel(`时间限制: ${boss.timeLimit}秒`, leftX, -35, 14, 
            new Color(200, 200, 200, 255));
        timeLabel.parent = this._bossDetail;

        // 推荐战力
        const powerLabel = this.createLabel(`推荐战力: ${this.formatNumber(boss.recommendedPower)}`, leftX, -60, 14, 
            new Color(255, 180, 100, 255));
        powerLabel.parent = this._bossDetail;

        // 阶段信息
        const phaseTitle = this.createLabel('Boss阶段', leftX, -90, 14, new Color(200, 150, 255, 255));
        phaseTitle.parent = this._bossDetail;

        boss.phases.slice(0, 3).forEach((phase, index) => {
            const phaseLabel = this.createLabel(
                `P${phase.phaseNumber}: ${phase.name} (${phase.hpThreshold}%)`, 
                leftX, -110 - index * 18, 11, new Color(180, 170, 190, 255)
            );
            phaseLabel.parent = this._bossDetail;
        });

        // 右侧：战斗信息
        const rightX = 120;

        // 难度信息
        if (diffConfig) {
            const diffName = BossRaidDatabase.instance.getDifficultyName(this._selectedDifficulty);
            const diffColor = new Color().fromHEX(BossRaidDatabase.instance.getDifficultyColor(this._selectedDifficulty));

            const diffLabel = this.createLabel(`难度: ${diffName}`, rightX, 110, 18, diffColor);
            diffLabel.parent = this._bossDetail;

            // 每日次数
            const remaining = BossRaidManager.instance?.getRemainingAttempts(this._selectedBossId, this._selectedDifficulty) ?? 0;
            const attemptLabel = this.createLabel(`今日剩余: ${remaining}/${diffConfig.dailyAttempts}次`, rightX, 80, 14, 
                remaining > 0 ? new Color(150, 255, 150, 255) : new Color(255, 100, 100, 255));
            attemptLabel.parent = this._bossDetail;

            // 体力消耗
            const staminaLabel = this.createLabel(`体力消耗: ${diffConfig.staminaCost}`, rightX, 55, 14, 
                new Color(100, 200, 100, 255));
            staminaLabel.parent = this._bossDetail;
        }

        // 个人记录
        const recordTitle = this.createLabel('个人记录', rightX, 20, 16, new Color(255, 220, 150, 255));
        recordTitle.parent = this._bossDetail;

        if (record && record.totalAttempts > 0) {
            const bestDamage = this.createLabel(`最高伤害: ${this.formatNumber(record.bestDamage)}`, rightX, -5, 13, 
                new Color(255, 180, 100, 255));
            bestDamage.parent = this._bossDetail;

            if (record.bestTime > 0) {
                const bestTime = this.createLabel(`最快击杀: ${record.bestTime.toFixed(1)}秒`, rightX, -25, 13, 
                    new Color(150, 200, 255, 255));
                bestTime.parent = this._bossDetail;
            }

            const kills = this.createLabel(`击杀次数: ${record.totalKills}`, rightX, -45, 13, 
                new Color(200, 200, 200, 255));
            kills.parent = this._bossDetail;

            // 排名
            const rank = BossRaidManager.instance?.getPlayerRank(this._selectedBossId, this._selectedDifficulty) ?? 0;
            if (rank > 0) {
                const rankLabel = this.createLabel(`当前排名: #${rank}`, rightX, -65, 13, 
                    new Color(255, 200, 100, 255));
                rankLabel.parent = this._bossDetail;
            }
        } else {
            const noRecord = this.createLabel('暂无记录', rightX, -10, 13, new Color(150, 140, 160, 255));
            noRecord.parent = this._bossDetail;
        }

        // 奖励预览
        const rewardTitle = this.createLabel('首杀奖励', rightX, -90, 14, new Color(200, 150, 255, 255));
        rewardTitle.parent = this._bossDetail;

        if (diffConfig) {
            const rewardsNode = new Node('Rewards');
            rewardsNode.parent = this._bossDetail;
            rewardsNode.setPosition(rightX, -120);

            const rewardsGraphics = rewardsNode.addComponent(Graphics);

            diffConfig.firstKillRewards.slice(0, 4).forEach((reward, index) => {
                const rx = (index - 1.5) * 40;
                
                rewardsGraphics.fillColor = new Color(50, 45, 60, 255);
                DoodleGraphics.drawRoundedRect(rewardsGraphics, rx - 15, -15, 30, 30, 5);

                this.drawRewardIcon(rewardsGraphics, rx, 0, reward.type);
            });

            // 已领取标记
            if (record?.firstKillClaimed) {
                const claimed = this.createLabel('(已领取)', 0, 0, 10, new Color(150, 150, 150, 255));
                claimed.parent = rewardsNode;
            }
        }
    }

    private createDifficultySelect(): void {
        this._difficultySelect = new Node('DifficultySelect');
        this._difficultySelect.parent = this.node;
        this._difficultySelect.setPosition(0, -120);

        const uiTransform = this._difficultySelect.addComponent(UITransform);
        uiTransform.setContentSize(680, 80);

        const graphics = this._difficultySelect.addComponent(Graphics);
        
        // 背景
        graphics.fillColor = new Color(30, 25, 40, 200);
        DoodleGraphics.drawRoundedRect(graphics, -340, -40, 680, 80, 12);
    }

    private refreshDifficultySelect(): void {
        if (!this._difficultySelect || !this._selectedBossId) return;

        this._difficultySelect.removeAllChildren();

        const boss = BossRaidDatabase.instance.getBoss(this._selectedBossId);
        if (!boss) return;

        const graphics = this._difficultySelect.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            graphics.fillColor = new Color(30, 25, 40, 200);
            DoodleGraphics.drawRoundedRect(graphics, -340, -40, 680, 80, 12);
        }

        // 难度按钮
        boss.difficulties.forEach((diff, index) => {
            const x = -250 + index * 130;
            const isSelected = diff.difficulty === this._selectedDifficulty;
            
            const btn = this.createDifficultyButton(diff.difficulty, x, 0, isSelected);
            btn.parent = this._difficultySelect;
            
            btn.on(Node.EventType.TOUCH_END, () => {
                this.selectDifficulty(diff.difficulty);
            });
        });
    }

    private createDifficultyButton(difficulty: BossRaidDifficulty, x: number, y: number, isSelected: boolean): Node {
        const node = new Node(`Diff_${difficulty}`);
        node.setPosition(x, y);

        const graphics = node.addComponent(Graphics);
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(120, 50);

        const diffColor = new Color().fromHEX(BossRaidDatabase.instance.getDifficultyColor(difficulty));
        const diffName = BossRaidDatabase.instance.getDifficultyName(difficulty);

        // 背景
        if (isSelected) {
            graphics.fillColor = diffColor;
        } else {
            graphics.fillColor = new Color(diffColor.r * 0.3, diffColor.g * 0.3, diffColor.b * 0.3, 200);
        }
        DoodleGraphics.drawRoundedRect(graphics, -55, -22, 110, 44, 8);

        // 边框
        graphics.strokeColor = isSelected ? Color.WHITE : diffColor;
        graphics.lineWidth = isSelected ? 3 : 1;
        DoodleGraphics.drawRoundedRect(graphics, -55, -22, 110, 44, 8);
        graphics.stroke();

        // 文字
        const label = this.createLabel(diffName, 0, 0, 16, isSelected ? Color.WHITE : diffColor);
        label.parent = node;

        return node;
    }

    private createLeaderboard(): void {
        this._leaderboard = new Node('Leaderboard');
        this._leaderboard.parent = this.node;
        this._leaderboard.setPosition(0, -350);

        const uiTransform = this._leaderboard.addComponent(UITransform);
        uiTransform.setContentSize(680, 300);

        const graphics = this._leaderboard.addComponent(Graphics);

        // 背景
        graphics.fillColor = new Color(30, 25, 40, 230);
        DoodleGraphics.drawRoundedRect(graphics, -340, -150, 680, 300, 16);

        // 边框
        graphics.strokeColor = new Color(80, 60, 90, 255);
        graphics.lineWidth = 2;
        DoodleGraphics.drawRoundedRect(graphics, -340, -150, 680, 300, 16);
        graphics.stroke();

        // 标题
        const title = this.createLabel('伤害排行榜', 0, 130, 18, new Color(255, 220, 150, 255));
        title.parent = this._leaderboard;
    }

    private refreshLeaderboard(): void {
        if (!this._leaderboard || !this._selectedBossId) return;

        // 移除旧内容（保留标题）
        const children = [...this._leaderboard.children];
        children.forEach(child => {
            if (child.name !== 'Label') {
                child.destroy();
            }
        });

        const leaderboard = BossRaidManager.instance?.getLeaderboard(this._selectedBossId, this._selectedDifficulty) ?? [];
        const playerRank = BossRaidManager.instance?.getPlayerRank(this._selectedBossId, this._selectedDifficulty) ?? 0;

        // 列表容器
        const listNode = new Node('List');
        listNode.parent = this._leaderboard;
        listNode.setPosition(0, 0);

        // 显示前10名
        leaderboard.slice(0, 10).forEach((record, index) => {
            const y = 90 - index * 25;
            const isPlayer = record.odId === 'player';
            
            const rowNode = new Node(`Row_${index}`);
            rowNode.parent = listNode;
            rowNode.setPosition(0, y);

            const rowGraphics = rowNode.addComponent(Graphics);

            // 行背景
            if (isPlayer) {
                rowGraphics.fillColor = new Color(80, 60, 100, 150);
                DoodleGraphics.drawRoundedRect(rowGraphics, -320, -10, 640, 22, 4);
            }

            // 排名
            let rankColor = new Color(200, 200, 200, 255);
            if (index === 0) rankColor = new Color(255, 215, 0, 255);
            else if (index === 1) rankColor = new Color(192, 192, 192, 255);
            else if (index === 2) rankColor = new Color(205, 127, 50, 255);

            const rankLabel = this.createLabel(`#${index + 1}`, -280, 0, 14, rankColor);
            rankLabel.parent = rowNode;

            // 名称
            const nameLabel = this.createLabel(record.odName, -150, 0, 14, 
                isPlayer ? new Color(255, 220, 150, 255) : Color.WHITE);
            nameLabel.parent = rowNode;

            // 伤害
            const damageLabel = this.createLabel(this.formatNumber(record.damage), 100, 0, 14, 
                new Color(255, 150, 100, 255));
            damageLabel.parent = rowNode;

            // 战力
            const powerLabel = this.createLabel(`${this.formatNumber(record.teamPower)}`, 250, 0, 12, 
                new Color(150, 150, 200, 255));
            powerLabel.parent = rowNode;
        });

        // 如果玩家不在前10，显示玩家排名
        if (playerRank > 10) {
            const playerRecord = leaderboard.find(r => r.odId === 'player');
            if (playerRecord) {
                const divider = this.createLabel('...', 0, -120, 14, new Color(150, 140, 160, 255));
                divider.parent = listNode;

                const myRankNode = new Node('MyRank');
                myRankNode.parent = listNode;
                myRankNode.setPosition(0, -140);

                const myGraphics = myRankNode.addComponent(Graphics);
                myGraphics.fillColor = new Color(80, 60, 100, 150);
                DoodleGraphics.drawRoundedRect(myGraphics, -320, -10, 640, 22, 4);

                const myRank = this.createLabel(`#${playerRank}`, -280, 0, 14, new Color(255, 220, 150, 255));
                myRank.parent = myRankNode;

                const myName = this.createLabel(playerRecord.odName, -150, 0, 14, new Color(255, 220, 150, 255));
                myName.parent = myRankNode;

                const myDamage = this.createLabel(this.formatNumber(playerRecord.damage), 100, 0, 14, 
                    new Color(255, 150, 100, 255));
                myDamage.parent = myRankNode;
            }
        }
    }

    // ==================== 底部按钮 ====================

    private createStartButton(): void {
        const btnNode = new Node('StartButton');
        btnNode.parent = this.node;
        btnNode.setPosition(0, -550);

        const graphics = btnNode.addComponent(Graphics);
        const uiTransform = btnNode.addComponent(UITransform);
        uiTransform.setContentSize(280, 60);

        // 按钮背景
        graphics.fillColor = new Color(200, 80, 80, 255);
        DoodleGraphics.drawRoundedRect(graphics, -140, -30, 280, 60, 12);

        // 边框
        graphics.strokeColor = new Color(255, 150, 150, 255);
        graphics.lineWidth = 3;
        DoodleGraphics.drawRoundedRect(graphics, -140, -30, 280, 60, 12);
        graphics.stroke();

        // 文字
        const label = this.createLabel('开始挑战', 0, 0, 24, Color.WHITE);
        label.parent = btnNode;

        btnNode.on(Node.EventType.TOUCH_END, () => {
            this.startRaid();
        });
    }

    // ==================== 交互方法 ====================

    public selectBoss(bossId: string): void {
        if (this._selectedBossId === bossId) return;

        this._selectedBossId = bossId;
        this._selectedDifficulty = BossRaidDifficulty.NORMAL;

        this.refreshBossCards();
        this.refreshBossDetail();
        this.refreshDifficultySelect();
        this.refreshLeaderboard();
    }

    public selectDifficulty(difficulty: BossRaidDifficulty): void {
        if (this._selectedDifficulty === difficulty) return;

        this._selectedDifficulty = difficulty;

        this.refreshBossDetail();
        this.refreshDifficultySelect();
        this.refreshLeaderboard();
    }

    public startRaid(): void {
        if (!this._selectedBossId) {
            console.log('请先选择领主');
            return;
        }

        const result = BossRaidManager.instance?.startBattle(this._selectedBossId, this._selectedDifficulty);
        if (result) {
            console.log('开始领主战');
            // 跳转到战斗场景
            // director.loadScene('BossRaidBattle');
        }
    }

    public refreshPanel(): void {
        this.refreshBossCards();
        if (this._selectedBossId) {
            this.refreshBossDetail();
            this.refreshDifficultySelect();
            this.refreshLeaderboard();
        }
        this.createStartButton();
    }

    private refreshBossCards(): void {
        this._bossNodes.forEach((node, bossId) => {
            const boss = BossRaidDatabase.instance.getBoss(bossId);
            if (!boss) return;

            const parent = node.parent;
            const pos = node.position.clone();
            node.destroy();

            const newNode = this.createBossCard(boss, pos.x, pos.y);
            if (parent) newNode.parent = parent;
            this._bossNodes.set(bossId, newNode);
        });
    }

    // ==================== UI工具方法 ====================

    private createLabel(text: string, x: number, y: number, size: number, color: Color): Node {
        const node = new Node('Label');
        node.setPosition(x, y);

        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;

        node.addComponent(UITransform).setContentSize(250, size + 10);

        return node;
    }

    private createIconButton(name: string, x: number, y: number, icon: string): Node {
        const node = new Node(name);
        node.setPosition(x, y);

        const graphics = node.addComponent(Graphics);
        node.addComponent(UITransform).setContentSize(50, 50);

        graphics.fillColor = new Color(60, 45, 70, 255);
        DoodleGraphics.drawCircle(graphics, 0, 0, 22);

        graphics.strokeColor = Color.WHITE;
        graphics.lineWidth = 2;

        if (icon === 'back') {
            graphics.moveTo(5, 0);
            graphics.lineTo(-8, 0);
            graphics.moveTo(-8, 0);
            graphics.lineTo(-2, -6);
            graphics.moveTo(-8, 0);
            graphics.lineTo(-2, 6);
            graphics.stroke();
        }

        node.on(Node.EventType.TOUCH_END, () => {
            this.onBackClicked();
        });

        return node;
    }

    private drawRewardIcon(graphics: Graphics, x: number, y: number, type: string): void {
        switch (type) {
            case 'gold':
                graphics.fillColor = new Color(255, 215, 0, 255);
                DoodleGraphics.drawCircle(graphics, x, y, 10);
                break;
            case 'diamond':
                graphics.fillColor = new Color(100, 200, 255, 255);
                DoodleGraphics.drawStar(graphics, x, y, 10, 4);
                break;
            case 'equipment':
                graphics.fillColor = new Color(200, 150, 100, 255);
                DoodleGraphics.drawSword(graphics, x, y, 15);
                break;
            case 'character':
                graphics.fillColor = new Color(255, 150, 200, 255);
                DoodleGraphics.drawCircle(graphics, x, y, 10);
                break;
            default:
                graphics.fillColor = new Color(150, 150, 150, 255);
                DoodleGraphics.drawCircle(graphics, x, y, 8);
        }
    }

    private formatNumber(num: number): string {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    private onBackClicked(): void {
        console.log('返回主界面');
        this.node.active = false;
    }
}
