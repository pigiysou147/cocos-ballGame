import { _decorator, Component, sys, EventTarget } from 'cc';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
const { ccclass, property } = _decorator;

/**
 * 邮件类型
 */
export enum MailType {
    SYSTEM = 'system',           // 系统邮件
    REWARD = 'reward',           // 奖励邮件
    NOTICE = 'notice',           // 公告通知
    MAINTENANCE = 'maintenance', // 维护补偿
    EVENT = 'event',             // 活动邮件
    GIFT = 'gift',               // 赠礼
    FRIEND = 'friend'            // 好友邮件
}

/**
 * 邮件附件
 */
export interface MailAttachment {
    type: CurrencyType;
    amount: number;
}

/**
 * 邮件配置
 */
export interface MailConfig {
    id: string;
    type: MailType;
    title: string;
    content: string;
    sender: string;
    attachments?: MailAttachment[];
    createTime: number;
    expireTime: number;           // 过期时间 (0=永不过期)
    isRead: boolean;
    isClaimed: boolean;
}

/**
 * 邮箱数据
 */
export interface MailboxData {
    mails: MailConfig[];
    lastCheckTime: number;
}

/**
 * 邮箱系统
 * Mail System - In-game mail and rewards
 */
@ccclass('MailSystem')
export class MailSystem extends Component {
    private static _instance: MailSystem | null = null;

    // 邮箱数据
    private _data: MailboxData = {
        mails: [],
        lastCheckTime: 0
    };

    // 配置
    private readonly MAX_MAILS = 100;              // 最大邮件数
    private readonly DEFAULT_EXPIRE_DAYS = 30;    // 默认过期天数

    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_NEW_MAIL = 'new_mail';
    public static readonly EVENT_MAIL_READ = 'mail_read';
    public static readonly EVENT_ATTACHMENT_CLAIMED = 'attachment_claimed';
    public static readonly EVENT_MAIL_DELETED = 'mail_deleted';

    // 存档key
    private readonly SAVE_KEY = 'world_flipper_mailbox';

    public static get instance(): MailSystem | null {
        return MailSystem._instance;
    }

    public get mails(): MailConfig[] {
        return [...this._data.mails];
    }

    public get unreadCount(): number {
        return this._data.mails.filter(m => !m.isRead && !this.isExpired(m)).length;
    }

    public get unclaimedCount(): number {
        return this._data.mails.filter(m => 
            !m.isClaimed && 
            m.attachments && 
            m.attachments.length > 0 && 
            !this.isExpired(m)
        ).length;
    }

    onLoad() {
        if (MailSystem._instance) {
            this.node.destroy();
            return;
        }
        MailSystem._instance = this;

        this.loadData();
        this.cleanExpiredMails();
        
        // 模拟系统邮件
        this.sendWelcomeMail();
        
        // 定时检查过期邮件
        this.schedule(this.cleanExpiredMails.bind(this), 60);
    }

    /**
     * 发送欢迎邮件
     */
    private sendWelcomeMail(): void {
        // 只在首次登录时发送
        if (this._data.mails.some(m => m.id === 'welcome_mail')) return;

        this.sendMail({
            id: 'welcome_mail',
            type: MailType.SYSTEM,
            title: '欢迎来到世界弹射物语！',
            content: '亲爱的弹射者：\n\n欢迎加入世界弹射物语！这是一份新手礼包，祝您游戏愉快！\n\n游戏运营团队',
            sender: '系统',
            attachments: [
                { type: CurrencyType.DIAMOND, amount: 500 },
                { type: CurrencyType.GOLD, amount: 100000 },
                { type: CurrencyType.STAMINA, amount: 200 },
                { type: CurrencyType.SUMMON_TICKET, amount: 5 }
            ]
        });
    }

    /**
     * 发送邮件
     */
    public sendMail(config: Partial<MailConfig>): string {
        const now = Date.now();
        const id = config.id || `mail_${now}_${Math.random().toString(36).substr(2, 9)}`;
        
        const mail: MailConfig = {
            id,
            type: config.type || MailType.SYSTEM,
            title: config.title || '系统邮件',
            content: config.content || '',
            sender: config.sender || '系统',
            attachments: config.attachments || [],
            createTime: config.createTime || now,
            expireTime: config.expireTime || (now + this.DEFAULT_EXPIRE_DAYS * 24 * 60 * 60 * 1000),
            isRead: false,
            isClaimed: false
        };

        // 检查邮箱是否满
        if (this._data.mails.length >= this.MAX_MAILS) {
            // 删除最旧的已读已领取邮件
            this.deleteOldestMail();
        }

        this._data.mails.unshift(mail);
        this.saveData();

        this.events.emit(MailSystem.EVENT_NEW_MAIL, { mail });
        
        return id;
    }

    /**
     * 批量发送邮件（用于系统推送）
     */
    public sendSystemMails(mails: Partial<MailConfig>[]): void {
        for (const mail of mails) {
            this.sendMail(mail);
        }
    }

    /**
     * 读取邮件
     */
    public readMail(mailId: string): MailConfig | null {
        const mail = this._data.mails.find(m => m.id === mailId);
        if (!mail) return null;

        if (!mail.isRead) {
            mail.isRead = true;
            this.saveData();
            this.events.emit(MailSystem.EVENT_MAIL_READ, { mailId });
        }

        return mail;
    }

    /**
     * 领取附件
     */
    public claimAttachment(mailId: string): boolean {
        const mail = this._data.mails.find(m => m.id === mailId);
        if (!mail) {
            console.log('邮件不存在');
            return false;
        }

        if (this.isExpired(mail)) {
            console.log('邮件已过期');
            return false;
        }

        if (mail.isClaimed) {
            console.log('附件已领取');
            return false;
        }

        if (!mail.attachments || mail.attachments.length === 0) {
            console.log('没有附件');
            return false;
        }

        // 发放奖励
        const currencyManager = CurrencyManager.instance;
        if (currencyManager) {
            for (const attachment of mail.attachments) {
                currencyManager.addCurrency(attachment.type, attachment.amount, `邮件-${mail.title}`);
            }
        }

        mail.isRead = true;
        mail.isClaimed = true;
        this.saveData();

        this.events.emit(MailSystem.EVENT_ATTACHMENT_CLAIMED, {
            mailId,
            attachments: mail.attachments
        });

        return true;
    }

    /**
     * 一键领取所有附件
     */
    public claimAllAttachments(): number {
        let claimedCount = 0;
        
        for (const mail of this._data.mails) {
            if (!mail.isClaimed && 
                mail.attachments && 
                mail.attachments.length > 0 && 
                !this.isExpired(mail)) {
                
                if (this.claimAttachment(mail.id)) {
                    claimedCount++;
                }
            }
        }

        return claimedCount;
    }

    /**
     * 删除邮件
     */
    public deleteMail(mailId: string): boolean {
        const index = this._data.mails.findIndex(m => m.id === mailId);
        if (index === -1) return false;

        const mail = this._data.mails[index];
        
        // 有未领取附件不能删除
        if (!mail.isClaimed && mail.attachments && mail.attachments.length > 0) {
            console.log('有未领取的附件，无法删除');
            return false;
        }

        this._data.mails.splice(index, 1);
        this.saveData();

        this.events.emit(MailSystem.EVENT_MAIL_DELETED, { mailId });
        
        return true;
    }

    /**
     * 删除所有已读已领取的邮件
     */
    public deleteAllRead(): number {
        const before = this._data.mails.length;
        
        this._data.mails = this._data.mails.filter(m => {
            // 保留未读的
            if (!m.isRead) return true;
            // 保留有未领取附件的
            if (!m.isClaimed && m.attachments && m.attachments.length > 0) return true;
            return false;
        });

        this.saveData();
        
        return before - this._data.mails.length;
    }

    /**
     * 检查邮件是否过期
     */
    public isExpired(mail: MailConfig): boolean {
        if (mail.expireTime === 0) return false;
        return Date.now() > mail.expireTime;
    }

    /**
     * 清理过期邮件
     */
    private cleanExpiredMails(): void {
        const now = Date.now();
        const before = this._data.mails.length;
        
        this._data.mails = this._data.mails.filter(m => {
            if (m.expireTime === 0) return true;
            return now <= m.expireTime;
        });

        if (this._data.mails.length !== before) {
            this.saveData();
            console.log(`清理了 ${before - this._data.mails.length} 封过期邮件`);
        }
    }

    /**
     * 删除最旧的邮件
     */
    private deleteOldestMail(): void {
        // 优先删除已读已领取的
        for (let i = this._data.mails.length - 1; i >= 0; i--) {
            const mail = this._data.mails[i];
            if (mail.isRead && (mail.isClaimed || !mail.attachments || mail.attachments.length === 0)) {
                this._data.mails.splice(i, 1);
                return;
            }
        }

        // 如果没有可删除的，删除最旧的
        if (this._data.mails.length > 0) {
            this._data.mails.pop();
        }
    }

    /**
     * 获取邮件列表（按类型）
     */
    public getMailsByType(type: MailType): MailConfig[] {
        return this._data.mails.filter(m => m.type === type && !this.isExpired(m));
    }

    /**
     * 获取有效邮件列表
     */
    public getValidMails(): MailConfig[] {
        return this._data.mails.filter(m => !this.isExpired(m));
    }

    /**
     * 格式化时间
     */
    public formatExpireTime(mail: MailConfig): string {
        if (mail.expireTime === 0) return '永久有效';
        
        const diff = mail.expireTime - Date.now();
        if (diff <= 0) return '已过期';
        
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        
        if (days > 0) return `${days}天后过期`;
        if (hours > 0) return `${hours}小时后过期`;
        return '即将过期';
    }

    // 系统邮件模板
    
    /**
     * 发送维护补偿邮件
     */
    public sendMaintenanceCompensation(title: string, content: string, attachments: MailAttachment[]): void {
        this.sendMail({
            type: MailType.MAINTENANCE,
            title,
            content,
            sender: '运营团队',
            attachments,
            expireTime: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天有效
        });
    }

    /**
     * 发送活动奖励邮件
     */
    public sendEventReward(eventName: string, attachments: MailAttachment[]): void {
        this.sendMail({
            type: MailType.EVENT,
            title: `【${eventName}】活动奖励`,
            content: `恭喜您在【${eventName}】活动中获得奖励！\n\n感谢您的参与！`,
            sender: '活动系统',
            attachments,
            expireTime: Date.now() + 14 * 24 * 60 * 60 * 1000 // 14天有效
        });
    }

    /**
     * 发送排行榜奖励邮件
     */
    public sendRankingReward(rankingName: string, rank: number, attachments: MailAttachment[]): void {
        this.sendMail({
            type: MailType.REWARD,
            title: `【${rankingName}】排行榜奖励`,
            content: `恭喜您在【${rankingName}】中获得第${rank}名！\n\n以下是您的排名奖励：`,
            sender: '排行榜系统',
            attachments,
            expireTime: Date.now() + 7 * 24 * 60 * 60 * 1000
        });
    }

    /**
     * 发送好友赠礼
     */
    public sendFriendGift(friendName: string, attachments: MailAttachment[]): void {
        this.sendMail({
            type: MailType.FRIEND,
            title: `来自${friendName}的礼物`,
            content: `您的好友${friendName}送了您一份礼物！`,
            sender: friendName,
            attachments,
            expireTime: Date.now() + 7 * 24 * 60 * 60 * 1000
        });
    }

    // 存档
    public saveData(): void {
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(this._data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                this._data = JSON.parse(saved);
            } catch (e) {
                console.error('加载邮箱数据失败:', e);
            }
        }
    }

    public resetData(): void {
        this._data = {
            mails: [],
            lastCheckTime: 0
        };
        this.saveData();
    }

    onDestroy() {
        this.saveData();
        this.unscheduleAllCallbacks();
        if (MailSystem._instance === this) {
            MailSystem._instance = null;
        }
    }
}
