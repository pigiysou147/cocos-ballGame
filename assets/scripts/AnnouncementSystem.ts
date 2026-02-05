import { _decorator, Component, sys, EventTarget } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 公告类型
 */
export enum AnnouncementType {
    NOTICE = 'notice',            // 普通公告
    UPDATE = 'update',            // 更新公告
    MAINTENANCE = 'maintenance',  // 维护公告
    EVENT = 'event',              // 活动公告
    URGENT = 'urgent',            // 紧急公告
    COMPENSATION = 'compensation' // 补偿公告
}

/**
 * 公告优先级
 */
export enum AnnouncementPriority {
    LOW = 1,
    NORMAL = 2,
    HIGH = 3,
    URGENT = 4
}

/**
 * 公告配置
 */
export interface AnnouncementConfig {
    id: string;
    type: AnnouncementType;
    priority: AnnouncementPriority;
    title: string;
    content: string;
    summary?: string;              // 简短摘要
    imageUrl?: string;             // 配图
    startTime: number;             // 开始显示时间
    endTime: number;               // 结束显示时间
    showOnLogin: boolean;          // 登录时弹出
    isSticky: boolean;             // 是否置顶
    linkType?: 'none' | 'url' | 'in_app'; // 链接类型
    linkTarget?: string;           // 链接目标
    version?: string;              // 版本号（用于更新公告）
}

/**
 * 公告阅读记录
 */
export interface AnnouncementReadRecord {
    announcementId: string;
    readTime: number;
    dismissed: boolean;            // 是否已忽略登录弹窗
}

/**
 * 公告系统数据
 */
export interface AnnouncementData {
    readRecords: { [id: string]: AnnouncementReadRecord };
    lastCheckTime: number;
}

/**
 * 公告系统
 * Announcement System - Game notices and updates
 */
@ccclass('AnnouncementSystem')
export class AnnouncementSystem extends Component {
    private static _instance: AnnouncementSystem | null = null;

    // 公告列表
    private _announcements: Map<string, AnnouncementConfig> = new Map();
    
    // 阅读记录
    private _data: AnnouncementData = {
        readRecords: {},
        lastCheckTime: 0
    };

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_NEW_ANNOUNCEMENT = 'new_announcement';
    public static readonly EVENT_ANNOUNCEMENT_READ = 'announcement_read';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_announcements';

    public static get instance(): AnnouncementSystem | null {
        return AnnouncementSystem._instance;
    }

    public get unreadCount(): number {
        const now = Date.now();
        let count = 0;
        for (const [id, announcement] of this._announcements) {
            if (now >= announcement.startTime && now <= announcement.endTime) {
                if (!this._data.readRecords[id]) {
                    count++;
                }
            }
        }
        return count;
    }

    onLoad() {
        if (AnnouncementSystem._instance) {
            this.node.destroy();
            return;
        }
        AnnouncementSystem._instance = this;

        this.loadData();
        this.initDefaultAnnouncements();
    }

    /**
     * 初始化默认公告
     */
    private initDefaultAnnouncements(): void {
        const now = Date.now();
        const day = 24 * 60 * 60 * 1000;

        // 更新公告
        this.addAnnouncement({
            id: 'update_v1.0',
            type: AnnouncementType.UPDATE,
            priority: AnnouncementPriority.HIGH,
            title: '版本更新公告 v1.0',
            summary: '新增多项功能，优化游戏体验',
            content: `亲爱的弹射者：

我们很高兴地宣布《世界弹射物语》v1.0版本正式上线！

【新增内容】
• 全新角色系统：收集培养各种属性的角色
• 装备系统：强化装备提升战力
• 技能系统：灵活搭配技能组合
• 领主战：挑战强大的Boss获取丰厚奖励
• 活动系统：参与限时活动赢取稀有道具

【优化内容】
• 优化了弹射手感和物理效果
• 改进了UI界面设计
• 修复了若干已知问题

感谢您的支持！
游戏运营团队`,
            startTime: now,
            endTime: now + 30 * day,
            showOnLogin: true,
            isSticky: true,
            version: '1.0.0'
        });

        // 活动公告
        this.addAnnouncement({
            id: 'event_spring',
            type: AnnouncementType.EVENT,
            priority: AnnouncementPriority.NORMAL,
            title: '春日祭活动开启！',
            summary: '参与活动赢取限定角色',
            content: `亲爱的弹射者：

春日祭活动现已正式开启！

【活动时间】
即日起 - 14天后

【活动内容】
• 通关关卡收集春日花瓣
• 花瓣可在活动商店兑换丰厚奖励
• 累计收集可获得限定头像框

【活动奖励】
• 限定角色：春之精灵
• 限定装备：花瓣之剑
• 大量钻石和抽卡券

快来参与吧！
游戏运营团队`,
            startTime: now,
            endTime: now + 14 * day,
            showOnLogin: true,
            isSticky: false,
            linkType: 'in_app',
            linkTarget: 'event_spring'
        });

        // 普通公告
        this.addAnnouncement({
            id: 'notice_rules',
            type: AnnouncementType.NOTICE,
            priority: AnnouncementPriority.LOW,
            title: '游戏规则说明',
            summary: '了解游戏基本规则',
            content: `亲爱的弹射者：

欢迎来到《世界弹射物语》！以下是游戏的基本规则说明：

【弹射规则】
• 角色会在场地中自动弹射
• 使用挡板改变角色的弹射方向
• 撞击敌人可以造成伤害

【战斗技巧】
• 连续撞击可以积累连击数
• 连击数越高伤害加成越大
• 合理使用技能可以扭转战局

【角色培养】
• 通过升级提升角色基础属性
• 突破可以提升等级上限
• 觉醒可以解锁新技能

如有疑问，请联系客服。
游戏运营团队`,
            startTime: now,
            endTime: now + 365 * day,
            showOnLogin: false,
            isSticky: false
        });
    }

    /**
     * 添加公告
     */
    public addAnnouncement(config: AnnouncementConfig): void {
        this._announcements.set(config.id, config);
        
        // 检查是否是新公告
        if (!this._data.readRecords[config.id]) {
            this.events.emit(AnnouncementSystem.EVENT_NEW_ANNOUNCEMENT, { announcement: config });
        }
    }

    /**
     * 移除公告
     */
    public removeAnnouncement(id: string): void {
        this._announcements.delete(id);
    }

    /**
     * 获取所有有效公告
     */
    public getValidAnnouncements(): AnnouncementConfig[] {
        const now = Date.now();
        const result: AnnouncementConfig[] = [];
        
        for (const [, announcement] of this._announcements) {
            if (now >= announcement.startTime && now <= announcement.endTime) {
                result.push(announcement);
            }
        }
        
        // 排序：置顶 > 优先级 > 开始时间
        return result.sort((a, b) => {
            if (a.isSticky !== b.isSticky) return a.isSticky ? -1 : 1;
            if (a.priority !== b.priority) return b.priority - a.priority;
            return b.startTime - a.startTime;
        });
    }

    /**
     * 获取登录弹窗公告
     */
    public getLoginAnnouncements(): AnnouncementConfig[] {
        const now = Date.now();
        const result: AnnouncementConfig[] = [];
        
        for (const [id, announcement] of this._announcements) {
            if (now >= announcement.startTime && 
                now <= announcement.endTime &&
                announcement.showOnLogin) {
                
                const record = this._data.readRecords[id];
                if (!record || !record.dismissed) {
                    result.push(announcement);
                }
            }
        }
        
        return result.sort((a, b) => b.priority - a.priority);
    }

    /**
     * 获取指定类型的公告
     */
    public getAnnouncementsByType(type: AnnouncementType): AnnouncementConfig[] {
        return this.getValidAnnouncements().filter(a => a.type === type);
    }

    /**
     * 获取未读公告
     */
    public getUnreadAnnouncements(): AnnouncementConfig[] {
        const valid = this.getValidAnnouncements();
        return valid.filter(a => !this._data.readRecords[a.id]);
    }

    /**
     * 标记为已读
     */
    public markAsRead(id: string): void {
        if (!this._data.readRecords[id]) {
            this._data.readRecords[id] = {
                announcementId: id,
                readTime: Date.now(),
                dismissed: false
            };
        } else {
            this._data.readRecords[id].readTime = Date.now();
        }
        
        this.saveData();
        this.events.emit(AnnouncementSystem.EVENT_ANNOUNCEMENT_READ, { id });
    }

    /**
     * 忽略登录弹窗
     */
    public dismissLoginPopup(id: string): void {
        if (!this._data.readRecords[id]) {
            this._data.readRecords[id] = {
                announcementId: id,
                readTime: Date.now(),
                dismissed: true
            };
        } else {
            this._data.readRecords[id].dismissed = true;
        }
        
        this.saveData();
    }

    /**
     * 全部标记为已读
     */
    public markAllAsRead(): void {
        const valid = this.getValidAnnouncements();
        for (const announcement of valid) {
            this.markAsRead(announcement.id);
        }
    }

    /**
     * 检查是否已读
     */
    public isRead(id: string): boolean {
        return !!this._data.readRecords[id];
    }

    /**
     * 获取公告详情
     */
    public getAnnouncement(id: string): AnnouncementConfig | null {
        return this._announcements.get(id) || null;
    }

    /**
     * 获取最新公告（用于首页展示）
     */
    public getLatestAnnouncement(): AnnouncementConfig | null {
        const valid = this.getValidAnnouncements();
        return valid.length > 0 ? valid[0] : null;
    }

    /**
     * 清理过期记录
     */
    public cleanExpiredRecords(): void {
        const validIds = new Set(this._announcements.keys());
        const now = Date.now();
        
        for (const id in this._data.readRecords) {
            const announcement = this._announcements.get(id);
            if (!announcement || now > announcement.endTime) {
                delete this._data.readRecords[id];
            }
        }
        
        this.saveData();
    }

    // 存档
    public saveData(): void {
        this._data.lastCheckTime = Date.now();
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(this._data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                this._data = JSON.parse(saved);
            } catch (e) {
                console.error('加载公告数据失败:', e);
            }
        }
    }

    onDestroy() {
        this.saveData();
        if (AnnouncementSystem._instance === this) {
            AnnouncementSystem._instance = null;
        }
    }
}
