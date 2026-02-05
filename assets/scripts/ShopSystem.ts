import { _decorator, Component, Node, sys, EventTarget } from 'cc';
import { CurrencyManager, CurrencyType } from './CurrencyManager';
import { EquipmentManager } from './EquipmentManager';
import { CharacterManager } from './CharacterManager';
const { ccclass, property } = _decorator;

/**
 * 商店类型
 */
export enum ShopType {
    GENERAL = 'general',         // 杂货商店
    DIAMOND = 'diamond',         // 钻石商店
    GOLD = 'gold',               // 金币商店
    GUILD = 'guild',             // 公会商店
    ARENA = 'arena',             // 竞技场商店
    EVENT = 'event',             // 活动商店
    FRIEND = 'friend',           // 友情商店
    VIP = 'vip'                  // VIP商店
}

/**
 * 商品类型
 */
export enum ItemType {
    CURRENCY = 'currency',       // 货币
    CHARACTER = 'character',     // 角色
    CHARACTER_SHARD = 'character_shard', // 角色碎片
    EQUIPMENT = 'equipment',     // 装备
    MATERIAL = 'material',       // 材料
    CONSUMABLE = 'consumable',   // 消耗品
    STAMINA = 'stamina',         // 体力
    GACHA_TICKET = 'gacha_ticket', // 抽卡券
    GIFT_PACK = 'gift_pack'      // 礼包
}

/**
 * 商品配置
 */
export interface ShopItemConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    
    // 商品内容
    type: ItemType;
    itemId?: string;             // 对应的物品ID
    amount: number;              // 数量
    
    // 价格
    price: {
        type: CurrencyType;
        amount: number;
    };
    originalPrice?: number;      // 原价（用于显示折扣）
    
    // 限购
    limitType: 'none' | 'daily' | 'weekly' | 'monthly' | 'total';
    limitCount: number;
    
    // 条件
    unlockLevel?: number;        // 解锁等级
    unlockVipLevel?: number;     // VIP等级要求
    
    // 状态
    isHot?: boolean;             // 热卖标签
    isNew?: boolean;             // 新品标签
    discount?: number;           // 折扣比例
    
    // 排序
    sortOrder: number;
}

/**
 * 礼包配置
 */
export interface GiftPackConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    
    // 礼包内容
    items: {
        type: ItemType;
        itemId?: string;
        amount: number;
    }[];
    
    // 价格（人民币，单位：分）
    priceCents: number;
    
    // 限购
    limitType: 'none' | 'daily' | 'weekly' | 'monthly' | 'total' | 'once';
    limitCount: number;
    
    // 时间限制
    startTime?: number;
    endTime?: number;
    
    // 标签
    tag?: string;                // 如 "超值" "限时" "首充"
    
    isActive: boolean;
}

/**
 * 购买记录
 */
export interface PurchaseRecord {
    itemId: string;
    shopType: ShopType;
    count: number;               // 购买次数
    lastPurchaseTime: number;
    totalSpent: number;
}

/**
 * 商店系统 - 管理所有商店和购买
 * Shop System - Manages all shops and purchases
 */
@ccclass('ShopSystem')
export class ShopSystem extends Component {
    private static _instance: ShopSystem | null = null;

    // 商店配置
    private _shops: Map<ShopType, ShopItemConfig[]> = new Map();
    
    // 礼包配置
    private _giftPacks: Map<string, GiftPackConfig> = new Map();
    
    // 购买记录
    private _purchaseRecords: Map<string, PurchaseRecord> = new Map();
    
    // 每日/周/月重置时间
    private _lastDailyReset: number = 0;
    private _lastWeeklyReset: number = 0;
    private _lastMonthlyReset: number = 0;
    
    // 事件
    public events: EventTarget = new EventTarget();
    public static readonly EVENT_PURCHASE_SUCCESS = 'purchase_success';
    public static readonly EVENT_PURCHASE_FAILED = 'purchase_failed';
    public static readonly EVENT_SHOP_REFRESH = 'shop_refresh';
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_shop_data';

    public static get instance(): ShopSystem | null {
        return ShopSystem._instance;
    }

    onLoad() {
        if (ShopSystem._instance) {
            this.node.destroy();
            return;
        }
        ShopSystem._instance = this;
        
        // 初始化商店
        this.initShops();
        this.initGiftPacks();
        
        // 加载存档
        this.loadData();
        
        // 检查重置
        this.checkReset();
    }

    start() {
        // 每小时检查一次重置
        this.schedule(this.checkReset, 3600);
    }

    /**
     * 初始化商店配置
     */
    private initShops(): void {
        // 杂货商店（金币）
        this._shops.set(ShopType.GENERAL, [
            {
                id: 'shop_general_stamina',
                name: '体力药水',
                description: '恢复60点体力',
                icon: 'icon_stamina_potion',
                type: ItemType.STAMINA,
                amount: 60,
                price: { type: CurrencyType.GOLD, amount: 5000 },
                limitType: 'daily',
                limitCount: 5,
                sortOrder: 1
            },
            {
                id: 'shop_general_exp_s',
                name: '小经验药水',
                description: '获得100经验药水',
                icon: 'icon_exp_potion_s',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.EXP_POTION,
                amount: 100,
                price: { type: CurrencyType.GOLD, amount: 1000 },
                limitType: 'none',
                limitCount: 0,
                sortOrder: 2
            },
            {
                id: 'shop_general_exp_m',
                name: '中经验药水',
                description: '获得500经验药水',
                icon: 'icon_exp_potion_m',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.EXP_POTION,
                amount: 500,
                price: { type: CurrencyType.GOLD, amount: 4500 },
                limitType: 'none',
                limitCount: 0,
                isHot: true,
                sortOrder: 3
            },
            {
                id: 'shop_general_enhance',
                name: '强化石x10',
                description: '获得10个强化石',
                icon: 'icon_enhance_stone',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.ENHANCE_STONE,
                amount: 10,
                price: { type: CurrencyType.GOLD, amount: 2000 },
                limitType: 'daily',
                limitCount: 10,
                sortOrder: 4
            },
            {
                id: 'shop_general_breakthrough',
                name: '突破石',
                description: '获得1个突破石',
                icon: 'icon_breakthrough_stone',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.BREAKTHROUGH_STONE,
                amount: 1,
                price: { type: CurrencyType.GOLD, amount: 10000 },
                limitType: 'weekly',
                limitCount: 5,
                sortOrder: 5
            }
        ]);

        // 钻石商店
        this._shops.set(ShopType.DIAMOND, [
            {
                id: 'shop_diamond_gold_s',
                name: '金币袋（小）',
                description: '获得10000金币',
                icon: 'icon_gold_bag_s',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.GOLD,
                amount: 10000,
                price: { type: CurrencyType.DIAMOND, amount: 100 },
                limitType: 'none',
                limitCount: 0,
                sortOrder: 1
            },
            {
                id: 'shop_diamond_gold_m',
                name: '金币袋（中）',
                description: '获得60000金币',
                icon: 'icon_gold_bag_m',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.GOLD,
                amount: 60000,
                price: { type: CurrencyType.DIAMOND, amount: 500 },
                originalPrice: 600,
                discount: 0.83,
                isHot: true,
                limitType: 'none',
                limitCount: 0,
                sortOrder: 2
            },
            {
                id: 'shop_diamond_gold_l',
                name: '金币袋（大）',
                description: '获得150000金币',
                icon: 'icon_gold_bag_l',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.GOLD,
                amount: 150000,
                price: { type: CurrencyType.DIAMOND, amount: 1000 },
                originalPrice: 1500,
                discount: 0.67,
                limitType: 'none',
                limitCount: 0,
                sortOrder: 3
            },
            {
                id: 'shop_diamond_stamina',
                name: '体力恢复',
                description: '恢复120点体力',
                icon: 'icon_stamina_full',
                type: ItemType.STAMINA,
                amount: 120,
                price: { type: CurrencyType.DIAMOND, amount: 50 },
                limitType: 'daily',
                limitCount: 10,
                sortOrder: 4
            },
            {
                id: 'shop_diamond_ticket',
                name: '召唤券',
                description: '获得1张召唤券',
                icon: 'icon_summon_ticket',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.SUMMON_TICKET,
                amount: 1,
                price: { type: CurrencyType.DIAMOND, amount: 300 },
                limitType: 'none',
                limitCount: 0,
                sortOrder: 5
            },
            {
                id: 'shop_diamond_ticket_10',
                name: '十连券',
                description: '获得1张十连券',
                icon: 'icon_summon_ticket_10',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.SUMMON_TICKET_10,
                amount: 1,
                price: { type: CurrencyType.DIAMOND, amount: 2700 },
                limitType: 'none',
                limitCount: 0,
                sortOrder: 6
            },
            {
                id: 'shop_diamond_raid_ticket',
                name: '挑战券',
                description: '获得1张领主战挑战券',
                icon: 'icon_raid_ticket',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.RAID_TICKET,
                amount: 1,
                price: { type: CurrencyType.DIAMOND, amount: 100 },
                limitType: 'daily',
                limitCount: 3,
                sortOrder: 7
            }
        ]);

        // 公会商店
        this._shops.set(ShopType.GUILD, [
            {
                id: 'shop_guild_exp',
                name: '大经验药水',
                description: '获得2000经验药水',
                icon: 'icon_exp_potion_l',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.EXP_POTION,
                amount: 2000,
                price: { type: CurrencyType.GUILD_COIN, amount: 500 },
                limitType: 'weekly',
                limitCount: 5,
                sortOrder: 1
            },
            {
                id: 'shop_guild_awaken',
                name: '觉醒结晶',
                description: '获得1个觉醒结晶',
                icon: 'icon_awaken_crystal',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.AWAKEN_CRYSTAL,
                amount: 1,
                price: { type: CurrencyType.GUILD_COIN, amount: 1000 },
                limitType: 'weekly',
                limitCount: 2,
                sortOrder: 2
            },
            {
                id: 'shop_guild_ticket',
                name: '召唤券',
                description: '获得1张召唤券',
                icon: 'icon_summon_ticket',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.SUMMON_TICKET,
                amount: 1,
                price: { type: CurrencyType.GUILD_COIN, amount: 800 },
                limitType: 'monthly',
                limitCount: 5,
                sortOrder: 3
            }
        ]);

        // 竞技场商店
        this._shops.set(ShopType.ARENA, [
            {
                id: 'shop_arena_ticket',
                name: '召唤券',
                description: '获得1张召唤券',
                icon: 'icon_summon_ticket',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.SUMMON_TICKET,
                amount: 1,
                price: { type: CurrencyType.ARENA_COIN, amount: 500 },
                limitType: 'weekly',
                limitCount: 3,
                sortOrder: 1
            },
            {
                id: 'shop_arena_gold',
                name: '金币袋',
                description: '获得50000金币',
                icon: 'icon_gold_bag',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.GOLD,
                amount: 50000,
                price: { type: CurrencyType.ARENA_COIN, amount: 300 },
                limitType: 'weekly',
                limitCount: 10,
                sortOrder: 2
            }
        ]);

        // 友情商店
        this._shops.set(ShopType.FRIEND, [
            {
                id: 'shop_friend_stamina',
                name: '体力药水',
                description: '恢复30点体力',
                icon: 'icon_stamina_potion_s',
                type: ItemType.STAMINA,
                amount: 30,
                price: { type: CurrencyType.FRIEND_POINT, amount: 100 },
                limitType: 'daily',
                limitCount: 5,
                sortOrder: 1
            },
            {
                id: 'shop_friend_exp',
                name: '经验药水',
                description: '获得200经验药水',
                icon: 'icon_exp_potion',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.EXP_POTION,
                amount: 200,
                price: { type: CurrencyType.FRIEND_POINT, amount: 200 },
                limitType: 'none',
                limitCount: 0,
                sortOrder: 2
            },
            {
                id: 'shop_friend_gold',
                name: '金币',
                description: '获得5000金币',
                icon: 'icon_gold',
                type: ItemType.CURRENCY,
                itemId: CurrencyType.GOLD,
                amount: 5000,
                price: { type: CurrencyType.FRIEND_POINT, amount: 150 },
                limitType: 'none',
                limitCount: 0,
                sortOrder: 3
            }
        ]);
    }

    /**
     * 初始化礼包配置
     */
    private initGiftPacks(): void {
        // 首充礼包
        this._giftPacks.set('pack_first_charge', {
            id: 'pack_first_charge',
            name: '首充礼包',
            description: '首次充值即可获得超值奖励！',
            icon: 'icon_pack_first',
            items: [
                { type: ItemType.CURRENCY, itemId: CurrencyType.DIAMOND, amount: 1000 },
                { type: ItemType.CURRENCY, itemId: CurrencyType.SUMMON_TICKET_10, amount: 1 },
                { type: ItemType.CURRENCY, itemId: CurrencyType.GOLD, amount: 100000 }
            ],
            priceCents: 600, // 6元
            limitType: 'once',
            limitCount: 1,
            tag: '首充',
            isActive: true
        });

        // 每日礼包
        this._giftPacks.set('pack_daily', {
            id: 'pack_daily',
            name: '每日礼包',
            description: '每日限购，超值钻石！',
            icon: 'icon_pack_daily',
            items: [
                { type: ItemType.CURRENCY, itemId: CurrencyType.DIAMOND, amount: 100 },
                { type: ItemType.CURRENCY, itemId: CurrencyType.STAMINA, amount: 60 }
            ],
            priceCents: 100, // 1元
            limitType: 'daily',
            limitCount: 1,
            tag: '每日',
            isActive: true
        });

        // 周礼包
        this._giftPacks.set('pack_weekly', {
            id: 'pack_weekly',
            name: '周礼包',
            description: '每周限购，物超所值！',
            icon: 'icon_pack_weekly',
            items: [
                { type: ItemType.CURRENCY, itemId: CurrencyType.DIAMOND, amount: 680 },
                { type: ItemType.CURRENCY, itemId: CurrencyType.SUMMON_TICKET, amount: 5 },
                { type: ItemType.CURRENCY, itemId: CurrencyType.GOLD, amount: 200000 }
            ],
            priceCents: 3000, // 30元
            limitType: 'weekly',
            limitCount: 1,
            tag: '超值',
            isActive: true
        });

        // 月卡
        this._giftPacks.set('pack_monthly_card', {
            id: 'pack_monthly_card',
            name: '月卡',
            description: '购买后每日领取300钻石，共30天',
            icon: 'icon_monthly_card',
            items: [
                { type: ItemType.CURRENCY, itemId: CurrencyType.DIAMOND, amount: 300 },
                { type: ItemType.CURRENCY, itemId: CurrencyType.MONTHLY_CARD_DAYS, amount: 30 }
            ],
            priceCents: 3000, // 30元
            limitType: 'none',
            limitCount: 0,
            tag: '月卡',
            isActive: true
        });

        // 成长基金
        this._giftPacks.set('pack_growth_fund', {
            id: 'pack_growth_fund',
            name: '成长基金',
            description: '达到指定等级返还大量钻石！',
            icon: 'icon_growth_fund',
            items: [
                { type: ItemType.CURRENCY, itemId: CurrencyType.DIAMOND, amount: 5000 }
            ],
            priceCents: 9800, // 98元
            limitType: 'once',
            limitCount: 1,
            tag: '超值',
            isActive: true
        });
    }

    /**
     * 购买商品
     */
    public purchase(shopType: ShopType, itemId: string, count: number = 1): boolean {
        const shop = this._shops.get(shopType);
        if (!shop) {
            console.log('商店不存在');
            return false;
        }

        const item = shop.find(i => i.id === itemId);
        if (!item) {
            console.log('商品不存在');
            return false;
        }

        // 检查限购
        if (!this.checkPurchaseLimit(item, count)) {
            console.log('超出购买限制');
            this.events.emit(ShopSystem.EVENT_PURCHASE_FAILED, { 
                reason: 'limit_exceeded',
                itemId 
            });
            return false;
        }

        // 检查条件
        // TODO: 检查等级和VIP等级

        // 计算总价
        const totalPrice = item.price.amount * count;

        // 扣除货币
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager) {
            return false;
        }

        if (!currencyManager.spendCurrency(item.price.type, totalPrice, `购买${item.name}`)) {
            this.events.emit(ShopSystem.EVENT_PURCHASE_FAILED, { 
                reason: 'insufficient_currency',
                itemId 
            });
            return false;
        }

        // 发放商品
        this.deliverItem(item, count);

        // 更新购买记录
        this.updatePurchaseRecord(itemId, shopType, count, totalPrice);

        // 保存
        this.saveData();

        // 发送成功事件
        this.events.emit(ShopSystem.EVENT_PURCHASE_SUCCESS, {
            shopType,
            itemId,
            item,
            count,
            totalPrice
        });

        console.log(`购买成功: ${item.name} x${count}`);
        return true;
    }

    /**
     * 检查购买限制
     */
    private checkPurchaseLimit(item: ShopItemConfig, count: number): boolean {
        if (item.limitType === 'none' || item.limitCount === 0) {
            return true;
        }

        const record = this._purchaseRecords.get(item.id);
        const currentCount = record?.count || 0;

        return currentCount + count <= item.limitCount;
    }

    /**
     * 发放商品
     */
    private deliverItem(item: ShopItemConfig, count: number): void {
        const currencyManager = CurrencyManager.instance;
        const totalAmount = item.amount * count;

        switch (item.type) {
            case ItemType.CURRENCY:
                if (item.itemId && currencyManager) {
                    currencyManager.addCurrency(
                        item.itemId as CurrencyType, 
                        totalAmount, 
                        `购买${item.name}`
                    );
                }
                break;

            case ItemType.STAMINA:
                if (currencyManager) {
                    currencyManager.addStamina(totalAmount, `购买${item.name}`);
                }
                break;

            case ItemType.CHARACTER:
                if (item.itemId) {
                    const characterManager = CharacterManager.instance;
                    if (characterManager) {
                        for (let i = 0; i < count; i++) {
                            characterManager.addCharacter(item.itemId);
                        }
                    }
                }
                break;

            case ItemType.EQUIPMENT:
                if (item.itemId) {
                    const equipmentManager = EquipmentManager.instance;
                    if (equipmentManager) {
                        for (let i = 0; i < count; i++) {
                            equipmentManager.addEquipment(item.itemId);
                        }
                    }
                }
                break;

            // 其他类型...
        }
    }

    /**
     * 更新购买记录
     */
    private updatePurchaseRecord(
        itemId: string, 
        shopType: ShopType, 
        count: number, 
        totalSpent: number
    ): void {
        let record = this._purchaseRecords.get(itemId);
        
        if (!record) {
            record = {
                itemId,
                shopType,
                count: 0,
                lastPurchaseTime: 0,
                totalSpent: 0
            };
            this._purchaseRecords.set(itemId, record);
        }

        record.count += count;
        record.lastPurchaseTime = Date.now();
        record.totalSpent += totalSpent;
    }

    /**
     * 检查并执行重置
     */
    private checkReset(): void {
        const now = Date.now();
        const today = this.getDateStart(now);
        const thisWeek = this.getWeekStart(now);
        const thisMonth = this.getMonthStart(now);

        // 每日重置
        if (this._lastDailyReset < today) {
            this.resetPurchases('daily');
            this._lastDailyReset = today;
            console.log('每日购买限制已重置');
        }

        // 每周重置
        if (this._lastWeeklyReset < thisWeek) {
            this.resetPurchases('weekly');
            this._lastWeeklyReset = thisWeek;
            console.log('每周购买限制已重置');
        }

        // 每月重置
        if (this._lastMonthlyReset < thisMonth) {
            this.resetPurchases('monthly');
            this._lastMonthlyReset = thisMonth;
            console.log('每月购买限制已重置');
        }

        this.saveData();
        this.events.emit(ShopSystem.EVENT_SHOP_REFRESH);
    }

    /**
     * 重置指定类型的购买记录
     */
    private resetPurchases(limitType: 'daily' | 'weekly' | 'monthly'): void {
        for (const [shopType, items] of this._shops) {
            for (const item of items) {
                if (item.limitType === limitType) {
                    this._purchaseRecords.delete(item.id);
                }
            }
        }
    }

    // ========== 时间计算 ==========

    private getDateStart(timestamp: number): number {
        const date = new Date(timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    private getWeekStart(timestamp: number): number {
        const date = new Date(timestamp);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    private getMonthStart(timestamp: number): number {
        const date = new Date(timestamp);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    // ========== 查询方法 ==========

    /**
     * 获取商店商品列表
     */
    public getShopItems(shopType: ShopType): ShopItemConfig[] {
        return this._shops.get(shopType) || [];
    }

    /**
     * 获取商品剩余购买次数
     */
    public getRemainingPurchases(itemId: string): number {
        // 找到商品配置
        for (const [_, items] of this._shops) {
            const item = items.find(i => i.id === itemId);
            if (item) {
                if (item.limitType === 'none' || item.limitCount === 0) {
                    return -1; // 无限制
                }
                const record = this._purchaseRecords.get(itemId);
                return item.limitCount - (record?.count || 0);
            }
        }
        return 0;
    }

    /**
     * 获取礼包列表
     */
    public getGiftPacks(): GiftPackConfig[] {
        const now = Date.now();
        return Array.from(this._giftPacks.values()).filter(pack => {
            if (!pack.isActive) return false;
            if (pack.startTime && now < pack.startTime) return false;
            if (pack.endTime && now > pack.endTime) return false;
            
            // 检查限购
            if (pack.limitType === 'once') {
                const record = this._purchaseRecords.get(pack.id);
                if (record && record.count >= pack.limitCount) return false;
            }
            
            return true;
        });
    }

    /**
     * 检查是否可购买
     */
    public canPurchase(shopType: ShopType, itemId: string, count: number = 1): boolean {
        const shop = this._shops.get(shopType);
        if (!shop) return false;

        const item = shop.find(i => i.id === itemId);
        if (!item) return false;

        // 检查限购
        if (!this.checkPurchaseLimit(item, count)) return false;

        // 检查货币
        const currencyManager = CurrencyManager.instance;
        if (!currencyManager) return false;

        const totalPrice = item.price.amount * count;
        return currencyManager.hasCurrency(item.price.type, totalPrice);
    }

    // ========== 存档 ==========

    public saveData(): void {
        const data: any = {
            purchaseRecords: {},
            lastDailyReset: this._lastDailyReset,
            lastWeeklyReset: this._lastWeeklyReset,
            lastMonthlyReset: this._lastMonthlyReset
        };

        for (const [id, record] of this._purchaseRecords) {
            data.purchaseRecords[id] = record;
        }

        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadData(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (!saved) return;

        try {
            const data = JSON.parse(saved);

            if (data.purchaseRecords) {
                for (const [id, record] of Object.entries(data.purchaseRecords)) {
                    this._purchaseRecords.set(id, record as PurchaseRecord);
                }
            }

            this._lastDailyReset = data.lastDailyReset || 0;
            this._lastWeeklyReset = data.lastWeeklyReset || 0;
            this._lastMonthlyReset = data.lastMonthlyReset || 0;

            console.log('商店数据已加载');
        } catch (e) {
            console.error('加载商店数据失败:', e);
        }
    }

    onDestroy() {
        this.saveData();
        this.unschedule(this.checkReset);

        if (ShopSystem._instance === this) {
            ShopSystem._instance = null;
        }
    }
}
