import { _decorator, Component, Node, Vec3, EventTarget, Color, tween, Tween } from 'cc';
import { CharacterInstance, ElementType } from './CharacterData';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 复活状态
 */
export enum RevivalState {
    ALIVE = 'alive',            // 存活
    DYING = 'dying',            // 濒死（有无敌时间）
    DEAD = 'dead',              // 死亡（棺材状态）
    REVIVING = 'reviving',      // 复活中
    GHOST = 'ghost'             // 幽灵状态（可被队友复活）
}

/**
 * 角色死亡数据
 */
export interface DeathData {
    characterId: string;
    characterInstanceId: string;
    slotIndex: number;          // 编队槽位
    state: RevivalState;
    hitRequired: number;        // 所需撞击次数
    currentHits: number;        // 当前撞击次数
    reviveTimer: number;        // 复活倒计时
    maxReviveTime: number;      // 最大复活时间
    reviveHealthPercent: number; // 复活后生命百分比
    deathPosition: Vec3;        // 死亡位置
    coffinNode: Node | null;    // 棺材节点
}

/**
 * 复活配置
 */
export interface RevivalConfig {
    baseHitsRequired: number;       // 基础所需撞击次数
    hitsPerStar: number;            // 每星级增加的撞击次数
    reviveHealthPercent: number;    // 复活后生命百分比
    reviveInvincibleTime: number;   // 复活无敌时间
    maxReviveTime: number;          // 最大复活时间限制
    coopReviveBonus: number;        // 多人模式队友协助加成
    autoReviveCharges: number;      // 自动复活次数
    autoReviveHealthPercent: number; // 自动复活生命百分比
}

/**
 * 复活结果
 */
export interface RevivalResult {
    success: boolean;
    characterId: string;
    healthRestored: number;
    invincibleTime: number;
    message: string;
}

/**
 * 复活系统 - 管理角色死亡与复活机制
 * Revival System - Character death and revival mechanics
 */
@ccclass('RevivalSystem')
export class RevivalSystem extends Component {
    private static _instance: RevivalSystem | null = null;

    // 事件
    public readonly events: EventTarget = new EventTarget();
    public static readonly EVENT_CHARACTER_DIED = 'character-died';
    public static readonly EVENT_COFFIN_HIT = 'coffin-hit';
    public static readonly EVENT_CHARACTER_REVIVED = 'character-revived';
    public static readonly EVENT_REVIVAL_FAILED = 'revival-failed';
    public static readonly EVENT_AUTO_REVIVE = 'auto-revive';

    // 死亡角色数据
    private _deathData: Map<string, DeathData> = new Map();

    // 自动复活次数
    private _autoReviveCharges: number = 3;

    // 复活配置
    private _config: RevivalConfig = {
        baseHitsRequired: 3,
        hitsPerStar: 1,
        reviveHealthPercent: 0.3,
        reviveInvincibleTime: 3.0,
        maxReviveTime: 30,
        coopReviveBonus: 0.5,
        autoReviveCharges: 3,
        autoReviveHealthPercent: 0.5
    };

    // 复活特效动画
    private _reviveTweens: Map<string, Tween<Node>> = new Map();

    // 多人模式标志
    private _isCoopMode: boolean = false;

    public static get instance(): RevivalSystem | null {
        return RevivalSystem._instance;
    }

    public get deathData(): DeathData[] {
        return Array.from(this._deathData.values());
    }

    public get autoReviveCharges(): number {
        return this._autoReviveCharges;
    }

    public get config(): RevivalConfig {
        return { ...this._config };
    }

    onLoad() {
        if (RevivalSystem._instance) {
            this.node.destroy();
            return;
        }
        RevivalSystem._instance = this;
    }

    /**
     * 设置复活配置
     */
    public setConfig(config: Partial<RevivalConfig>): void {
        this._config = { ...this._config, ...config };
        this._autoReviveCharges = this._config.autoReviveCharges;
    }

    /**
     * 设置多人模式
     */
    public setCoopMode(enabled: boolean): void {
        this._isCoopMode = enabled;
    }

    // ==================== 死亡处理 ====================

    /**
     * 角色死亡
     */
    public onCharacterDeath(
        characterId: string,
        instanceId: string,
        slotIndex: number,
        starLevel: number,
        position: Vec3
    ): DeathData {
        // 计算所需撞击次数
        const hitsRequired = this._config.baseHitsRequired + 
                            (starLevel * this._config.hitsPerStar);

        // 创建死亡数据
        const deathData: DeathData = {
            characterId,
            characterInstanceId: instanceId,
            slotIndex,
            state: RevivalState.DEAD,
            hitRequired: hitsRequired,
            currentHits: 0,
            reviveTimer: this._config.maxReviveTime,
            maxReviveTime: this._config.maxReviveTime,
            reviveHealthPercent: this._config.reviveHealthPercent,
            deathPosition: position.clone(),
            coffinNode: null
        };

        // 创建棺材节点
        deathData.coffinNode = this.createCoffinNode(deathData);
        if (deathData.coffinNode) {
            this.node.addChild(deathData.coffinNode);
        }

        // 保存数据
        this._deathData.set(instanceId, deathData);

        // 发送事件
        this.events.emit(RevivalSystem.EVENT_CHARACTER_DIED, {
            characterId,
            instanceId,
            slotIndex,
            hitsRequired
        });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.CHARACTER_DEATH);

        console.log(`角色死亡: ${characterId}, 需要 ${hitsRequired} 次撞击复活`);
        return deathData;
    }

    /**
     * 创建棺材节点
     */
    private createCoffinNode(data: DeathData): Node {
        const node = new Node('Coffin');
        node.setPosition(data.deathPosition);

        // 添加可视化组件
        const { Graphics } = require('cc');
        const graphics = node.addComponent(Graphics);

        // 绘制棺材外形
        const width = 40;
        const height = 60;

        graphics.fillColor = new Color(80, 60, 40, 230);
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();

        // 棺材盖
        graphics.fillColor = new Color(100, 80, 60, 230);
        graphics.rect(-width / 2 - 2, height / 2 - 10, width + 4, 12);
        graphics.fill();

        // 十字架
        graphics.strokeColor = new Color(200, 180, 150, 230);
        graphics.lineWidth = 3;
        graphics.moveTo(0, height / 4);
        graphics.lineTo(0, -height / 4);
        graphics.moveTo(-width / 4, height / 8);
        graphics.lineTo(width / 4, height / 8);
        graphics.stroke();

        // 复活进度条背景
        graphics.fillColor = new Color(50, 50, 50, 200);
        graphics.rect(-width / 2, -height / 2 - 15, width, 8);
        graphics.fill();

        // 添加进度条节点
        const progressNode = new Node('Progress');
        node.addChild(progressNode);
        const progressGraphics = progressNode.addComponent(Graphics);
        progressGraphics.fillColor = new Color(100, 200, 100, 230);
        progressNode.setPosition(-width / 2, -height / 2 - 15, 0);

        // 添加撞击次数文本显示（简化，实际应用Label组件）
        const hitsNode = new Node('HitsDisplay');
        node.addChild(hitsNode);
        hitsNode.setPosition(0, height / 2 + 20, 0);

        // 添加浮动动画
        tween(node)
            .repeatForever(
                tween()
                    .to(1, { position: new Vec3(data.deathPosition.x, data.deathPosition.y + 5, 0) }, { easing: 'sineInOut' })
                    .to(1, { position: new Vec3(data.deathPosition.x, data.deathPosition.y - 5, 0) }, { easing: 'sineInOut' })
            )
            .start();

        return node;
    }

    /**
     * 更新棺材进度显示
     */
    private updateCoffinProgress(data: DeathData): void {
        if (!data.coffinNode) return;

        const progressNode = data.coffinNode.getChildByName('Progress');
        if (!progressNode) return;

        const graphics = progressNode.getComponent('cc.Graphics') as any;
        if (!graphics) return;

        const width = 40;
        const progress = data.currentHits / data.hitRequired;

        graphics.clear();
        graphics.fillColor = new Color(100, 200, 100, 230);
        graphics.rect(0, 0, width * progress, 8);
        graphics.fill();
    }

    // ==================== 撞击复活 ====================

    /**
     * 棺材被撞击
     */
    public onCoffinHit(instanceId: string, hitCount: number = 1, isTeammate: boolean = false): boolean {
        const data = this._deathData.get(instanceId);
        if (!data || data.state !== RevivalState.DEAD) {
            return false;
        }

        // 多人模式队友协助加成
        let effectiveHits = hitCount;
        if (this._isCoopMode && isTeammate) {
            effectiveHits = Math.ceil(hitCount * (1 + this._config.coopReviveBonus));
        }

        data.currentHits += effectiveHits;

        // 更新进度显示
        this.updateCoffinProgress(data);

        // 发送撞击事件
        this.events.emit(RevivalSystem.EVENT_COFFIN_HIT, {
            instanceId,
            currentHits: data.currentHits,
            hitsRequired: data.hitRequired,
            progress: data.currentHits / data.hitRequired
        });

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.COFFIN_HIT);

        console.log(`棺材被撞击: ${data.currentHits}/${data.hitRequired}`);

        // 检查是否可以复活
        if (data.currentHits >= data.hitRequired) {
            this.reviveCharacter(instanceId);
            return true;
        }

        // 棺材震动效果
        this.playCoffinShake(data);

        return true;
    }

    /**
     * 棺材震动效果
     */
    private playCoffinShake(data: DeathData): void {
        if (!data.coffinNode) return;

        const originalPos = data.deathPosition.clone();
        
        tween(data.coffinNode)
            .to(0.05, { position: new Vec3(originalPos.x + 3, originalPos.y, 0) })
            .to(0.05, { position: new Vec3(originalPos.x - 3, originalPos.y, 0) })
            .to(0.05, { position: new Vec3(originalPos.x + 2, originalPos.y, 0) })
            .to(0.05, { position: new Vec3(originalPos.x - 2, originalPos.y, 0) })
            .to(0.05, { position: originalPos })
            .start();
    }

    /**
     * 复活角色
     */
    public reviveCharacter(instanceId: string): RevivalResult {
        const data = this._deathData.get(instanceId);
        if (!data) {
            return {
                success: false,
                characterId: '',
                healthRestored: 0,
                invincibleTime: 0,
                message: '找不到死亡数据'
            };
        }

        // 更新状态
        data.state = RevivalState.REVIVING;

        // 播放复活动画
        this.playReviveAnimation(data);

        // 计算复活后生命
        const healthRestored = data.reviveHealthPercent;

        // 创建结果
        const result: RevivalResult = {
            success: true,
            characterId: data.characterId,
            healthRestored,
            invincibleTime: this._config.reviveInvincibleTime,
            message: '复活成功'
        };

        // 延迟完成复活（等待动画）
        this.scheduleOnce(() => {
            this.completeRevival(instanceId, result);
        }, 1.0);

        return result;
    }

    /**
     * 播放复活动画
     */
    private playReviveAnimation(data: DeathData): void {
        if (!data.coffinNode) return;

        // 停止浮动动画
        Tween.stopAllByTarget(data.coffinNode);

        // 光柱效果
        const lightNode = new Node('ReviveLight');
        data.coffinNode.addChild(lightNode);
        
        const { Graphics } = require('cc');
        const graphics = lightNode.addComponent(Graphics);
        
        graphics.fillColor = new Color(255, 255, 200, 0);
        graphics.rect(-30, -100, 60, 200);
        graphics.fill();

        // 光柱动画
        tween(graphics)
            .to(0.3, { fillColor: new Color(255, 255, 200, 150) })
            .to(0.5, { fillColor: new Color(255, 255, 200, 255) })
            .call(() => {
                // 棺材向上飞出
                if (data.coffinNode) {
                    tween(data.coffinNode)
                        .to(0.3, { 
                            position: new Vec3(data.deathPosition.x, data.deathPosition.y + 100, 0),
                            scale: new Vec3(0.5, 0.5, 1)
                        }, { easing: 'quadOut' })
                        .to(0.2, { scale: new Vec3(0, 0, 1) })
                        .start();
                }
            })
            .start();

        // 播放音效
        AudioManager.instance?.playSFX(SFXType.REVIVE);
    }

    /**
     * 完成复活
     */
    private completeRevival(instanceId: string, result: RevivalResult): void {
        const data = this._deathData.get(instanceId);
        if (!data) return;

        // 销毁棺材节点
        if (data.coffinNode) {
            data.coffinNode.destroy();
            data.coffinNode = null;
        }

        // 移除死亡数据
        this._deathData.delete(instanceId);

        // 发送复活事件
        this.events.emit(RevivalSystem.EVENT_CHARACTER_REVIVED, result);

        console.log(`角色复活: ${result.characterId}, 生命恢复: ${(result.healthRestored * 100).toFixed(0)}%, 无敌时间: ${result.invincibleTime}s`);
    }

    // ==================== 自动复活 ====================

    /**
     * 使用自动复活
     */
    public useAutoRevive(instanceId: string): RevivalResult {
        if (this._autoReviveCharges <= 0) {
            return {
                success: false,
                characterId: '',
                healthRestored: 0,
                invincibleTime: 0,
                message: '自动复活次数已用完'
            };
        }

        const data = this._deathData.get(instanceId);
        if (!data || data.state !== RevivalState.DEAD) {
            return {
                success: false,
                characterId: '',
                healthRestored: 0,
                invincibleTime: 0,
                message: '角色未处于死亡状态'
            };
        }

        // 消耗自动复活次数
        this._autoReviveCharges--;

        // 设置更高的复活生命
        data.reviveHealthPercent = this._config.autoReviveHealthPercent;

        // 直接满足复活条件
        data.currentHits = data.hitRequired;

        // 执行复活
        const result = this.reviveCharacter(instanceId);
        result.message = '自动复活成功';

        // 发送事件
        this.events.emit(RevivalSystem.EVENT_AUTO_REVIVE, {
            remainingCharges: this._autoReviveCharges,
            instanceId
        });

        console.log(`自动复活使用，剩余次数: ${this._autoReviveCharges}`);
        return result;
    }

    /**
     * 增加自动复活次数
     */
    public addAutoReviveCharges(count: number): void {
        this._autoReviveCharges += count;
        console.log(`自动复活次数增加: +${count}, 当前: ${this._autoReviveCharges}`);
    }

    // ==================== 更新循环 ====================

    update(dt: number) {
        // 更新所有死亡角色的复活倒计时
        for (const [instanceId, data] of this._deathData) {
            if (data.state !== RevivalState.DEAD) continue;

            data.reviveTimer -= dt;

            // 超时处理
            if (data.reviveTimer <= 0) {
                this.onRevivalTimeout(instanceId);
            }
        }
    }

    /**
     * 复活超时处理
     */
    private onRevivalTimeout(instanceId: string): void {
        const data = this._deathData.get(instanceId);
        if (!data) return;

        // 尝试自动复活
        if (this._autoReviveCharges > 0) {
            this.useAutoRevive(instanceId);
            return;
        }

        // 复活失败
        console.log(`复活超时: ${data.characterId}`);
        
        this.events.emit(RevivalSystem.EVENT_REVIVAL_FAILED, {
            instanceId,
            characterId: data.characterId,
            reason: 'timeout'
        });

        // 清理数据
        if (data.coffinNode) {
            data.coffinNode.destroy();
        }
        this._deathData.delete(instanceId);
    }

    // ==================== 查询方法 ====================

    /**
     * 获取死亡角色数据
     */
    public getDeathData(instanceId: string): DeathData | undefined {
        return this._deathData.get(instanceId);
    }

    /**
     * 检查角色是否死亡
     */
    public isCharacterDead(instanceId: string): boolean {
        const data = this._deathData.get(instanceId);
        return data?.state === RevivalState.DEAD;
    }

    /**
     * 获取复活进度
     */
    public getRevivalProgress(instanceId: string): number {
        const data = this._deathData.get(instanceId);
        if (!data) return 0;
        return Math.min(1, data.currentHits / data.hitRequired);
    }

    /**
     * 获取死亡角色数量
     */
    public getDeadCharacterCount(): number {
        return Array.from(this._deathData.values())
            .filter(d => d.state === RevivalState.DEAD).length;
    }

    /**
     * 检查是否全队阵亡
     */
    public isTeamWiped(teamSize: number): boolean {
        return this.getDeadCharacterCount() >= teamSize;
    }

    /**
     * 重置系统
     */
    public reset(): void {
        // 清理所有棺材节点
        for (const data of this._deathData.values()) {
            if (data.coffinNode) {
                Tween.stopAllByTarget(data.coffinNode);
                data.coffinNode.destroy();
            }
        }

        this._deathData.clear();
        this._autoReviveCharges = this._config.autoReviveCharges;
    }

    onDestroy() {
        this.reset();
        
        if (RevivalSystem._instance === this) {
            RevivalSystem._instance = null;
        }
    }
}
