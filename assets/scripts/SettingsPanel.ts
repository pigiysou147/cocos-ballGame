import { _decorator, Component, Node, Graphics, Color, UITransform, Label, Vec3, tween, UIOpacity, Slider, Toggle, sys } from 'cc';
import { AudioManager } from './AudioManager';
import { DoodleGraphics } from './DoodleGraphics';
const { ccclass, property } = _decorator;

/**
 * 画质等级
 */
export enum QualityLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

/**
 * 语言选项
 */
export enum LanguageType {
    CHINESE_SIMPLIFIED = 'zh-CN',
    CHINESE_TRADITIONAL = 'zh-TW',
    ENGLISH = 'en',
    JAPANESE = 'ja',
    KOREAN = 'ko'
}

/**
 * 设置数据
 */
export interface SettingsData {
    // 音频
    masterVolume: number;
    bgmVolume: number;
    sfxVolume: number;
    voiceVolume: number;
    isMuted: boolean;
    
    // 画面
    quality: QualityLevel;
    showDamageNumber: boolean;
    showComboEffect: boolean;
    screenShake: boolean;
    fps: number;
    
    // 控制
    vibration: boolean;
    autoSkill: boolean;
    flipperSensitivity: number;
    
    // 通知
    pushNotification: boolean;
    eventNotification: boolean;
    staminaNotification: boolean;
    
    // 其他
    language: LanguageType;
    showFPS: boolean;
    autoSave: boolean;
}

/**
 * 设置面板 - 游戏设置界面
 * Settings Panel - Game settings interface
 */
@ccclass('SettingsPanel')
export class SettingsPanel extends Component {
    private static _instance: SettingsPanel | null = null;

    // 设置数据
    private _settings: SettingsData = {
        masterVolume: 1.0,
        bgmVolume: 0.7,
        sfxVolume: 1.0,
        voiceVolume: 1.0,
        isMuted: false,
        quality: QualityLevel.HIGH,
        showDamageNumber: true,
        showComboEffect: true,
        screenShake: true,
        fps: 60,
        vibration: true,
        autoSkill: false,
        flipperSensitivity: 1.0,
        pushNotification: true,
        eventNotification: true,
        staminaNotification: true,
        language: LanguageType.CHINESE_SIMPLIFIED,
        showFPS: false,
        autoSave: true
    };

    // UI节点
    private _panelNode: Node | null = null;
    private _tabNodes: Node[] = [];
    private _contentNodes: Map<string, Node> = new Map();
    private _currentTab: string = 'audio';
    
    // 尺寸
    private _panelWidth: number = 650;
    private _panelHeight: number = 900;
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_settings';

    public static get instance(): SettingsPanel | null {
        return SettingsPanel._instance;
    }

    public get settings(): SettingsData {
        return { ...this._settings };
    }

    onLoad() {
        if (SettingsPanel._instance) {
            this.node.destroy();
            return;
        }
        SettingsPanel._instance = this;
        
        // 加载设置
        this.loadSettings();
        
        // 创建面板
        this.createPanel();
        
        // 默认隐藏
        this.hide();
    }

    /**
     * 创建设置面板
     */
    private createPanel(): void {
        // 主面板
        this._panelNode = new Node('SettingsPanel');
        const transform = this._panelNode.addComponent(UITransform);
        transform.setContentSize(this._panelWidth, this._panelHeight);
        
        // 背景
        const bg = this._panelNode.addComponent(Graphics);
        bg.fillColor = new Color(25, 25, 35, 245);
        bg.roundRect(-this._panelWidth/2, -this._panelHeight/2, this._panelWidth, this._panelHeight, 20);
        bg.fill();
        bg.strokeColor = new Color(80, 120, 180, 255);
        bg.lineWidth = 3;
        bg.roundRect(-this._panelWidth/2, -this._panelHeight/2, this._panelWidth, this._panelHeight, 20);
        bg.stroke();
        
        this._panelNode.addComponent(UIOpacity);
        this.node.addChild(this._panelNode);
        
        // 标题
        this.createTitle();
        
        // 关闭按钮
        this.createCloseButton();
        
        // 标签栏
        this.createTabs();
        
        // 内容区域
        this.createAudioContent();
        this.createDisplayContent();
        this.createControlContent();
        this.createNotificationContent();
        this.createOtherContent();
        
        // 底部按钮
        this.createBottomButtons();
        
        // 默认显示音频设置
        this.switchTab('audio');
    }

    /**
     * 创建标题
     */
    private createTitle(): void {
        const titleNode = new Node('Title');
        titleNode.setPosition(0, this._panelHeight/2 - 40);
        
        const transform = titleNode.addComponent(UITransform);
        transform.setContentSize(200, 40);
        
        const label = titleNode.addComponent(Label);
        label.string = '设置';
        label.fontSize = 32;
        label.color = new Color(255, 255, 255);
        
        this._panelNode?.addChild(titleNode);
    }

    /**
     * 创建关闭按钮
     */
    private createCloseButton(): void {
        const closeBtn = new Node('CloseButton');
        closeBtn.setPosition(this._panelWidth/2 - 40, this._panelHeight/2 - 40);
        
        const transform = closeBtn.addComponent(UITransform);
        transform.setContentSize(50, 50);
        
        const graphics = closeBtn.addComponent(Graphics);
        graphics.strokeColor = new Color(200, 200, 200);
        graphics.lineWidth = 3;
        graphics.moveTo(-12, 12);
        graphics.lineTo(12, -12);
        graphics.moveTo(12, 12);
        graphics.lineTo(-12, -12);
        graphics.stroke();
        
        this._panelNode?.addChild(closeBtn);
    }

    /**
     * 创建标签栏
     */
    private createTabs(): void {
        const tabs = [
            { id: 'audio', name: '音频' },
            { id: 'display', name: '画面' },
            { id: 'control', name: '控制' },
            { id: 'notification', name: '通知' },
            { id: 'other', name: '其他' }
        ];
        
        const tabWidth = this._panelWidth / tabs.length;
        const tabY = this._panelHeight/2 - 100;
        
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabNode = new Node(`Tab_${tab.id}`);
            tabNode.setPosition(-this._panelWidth/2 + tabWidth * (i + 0.5), tabY);
            
            const transform = tabNode.addComponent(UITransform);
            transform.setContentSize(tabWidth - 10, 40);
            
            const graphics = tabNode.addComponent(Graphics);
            graphics.fillColor = new Color(50, 50, 70, 200);
            graphics.roundRect(-tabWidth/2 + 5, -20, tabWidth - 10, 40, 8);
            graphics.fill();
            
            const label = tabNode.addComponent(Label);
            label.string = tab.name;
            label.fontSize = 20;
            label.color = new Color(200, 200, 200);
            
            this._panelNode?.addChild(tabNode);
            this._tabNodes.push(tabNode);
        }
    }

    /**
     * 创建音频设置内容
     */
    private createAudioContent(): void {
        const content = new Node('AudioContent');
        content.setPosition(0, -50);
        
        const transform = content.addComponent(UITransform);
        transform.setContentSize(this._panelWidth - 60, 600);
        
        let yOffset = 200;
        
        // 主音量
        this.createSliderSetting(content, '主音量', this._settings.masterVolume, yOffset, (value) => {
            this._settings.masterVolume = value;
            AudioManager.instance?.setMasterVolume(value);
        });
        yOffset -= 80;
        
        // BGM音量
        this.createSliderSetting(content, 'BGM音量', this._settings.bgmVolume, yOffset, (value) => {
            this._settings.bgmVolume = value;
            AudioManager.instance?.setBGMVolume(value);
        });
        yOffset -= 80;
        
        // 音效音量
        this.createSliderSetting(content, '音效音量', this._settings.sfxVolume, yOffset, (value) => {
            this._settings.sfxVolume = value;
            AudioManager.instance?.setSFXVolume(value);
        });
        yOffset -= 80;
        
        // 语音音量
        this.createSliderSetting(content, '语音音量', this._settings.voiceVolume, yOffset, (value) => {
            this._settings.voiceVolume = value;
        });
        yOffset -= 80;
        
        // 静音
        this.createToggleSetting(content, '静音', this._settings.isMuted, yOffset, (value) => {
            this._settings.isMuted = value;
            AudioManager.instance?.setMuted(value);
        });
        
        this._panelNode?.addChild(content);
        this._contentNodes.set('audio', content);
    }

    /**
     * 创建画面设置内容
     */
    private createDisplayContent(): void {
        const content = new Node('DisplayContent');
        content.setPosition(0, -50);
        
        const transform = content.addComponent(UITransform);
        transform.setContentSize(this._panelWidth - 60, 600);
        
        let yOffset = 200;
        
        // 画质
        this.createOptionSetting(content, '画质', 
            ['低', '中', '高'], 
            this.getQualityIndex(), 
            yOffset, 
            (index) => {
                const qualities = [QualityLevel.LOW, QualityLevel.MEDIUM, QualityLevel.HIGH];
                this._settings.quality = qualities[index];
            }
        );
        yOffset -= 80;
        
        // 帧率
        this.createOptionSetting(content, '帧率', 
            ['30', '60'], 
            this._settings.fps === 60 ? 1 : 0, 
            yOffset, 
            (index) => {
                this._settings.fps = index === 1 ? 60 : 30;
            }
        );
        yOffset -= 80;
        
        // 伤害数字
        this.createToggleSetting(content, '显示伤害数字', this._settings.showDamageNumber, yOffset, (value) => {
            this._settings.showDamageNumber = value;
        });
        yOffset -= 80;
        
        // 连击特效
        this.createToggleSetting(content, '连击特效', this._settings.showComboEffect, yOffset, (value) => {
            this._settings.showComboEffect = value;
        });
        yOffset -= 80;
        
        // 屏幕震动
        this.createToggleSetting(content, '屏幕震动', this._settings.screenShake, yOffset, (value) => {
            this._settings.screenShake = value;
        });
        yOffset -= 80;
        
        // 显示FPS
        this.createToggleSetting(content, '显示FPS', this._settings.showFPS, yOffset, (value) => {
            this._settings.showFPS = value;
        });
        
        this._panelNode?.addChild(content);
        this._contentNodes.set('display', content);
    }

    /**
     * 创建控制设置内容
     */
    private createControlContent(): void {
        const content = new Node('ControlContent');
        content.setPosition(0, -50);
        
        const transform = content.addComponent(UITransform);
        transform.setContentSize(this._panelWidth - 60, 600);
        
        let yOffset = 200;
        
        // 震动反馈
        this.createToggleSetting(content, '震动反馈', this._settings.vibration, yOffset, (value) => {
            this._settings.vibration = value;
        });
        yOffset -= 80;
        
        // 自动技能
        this.createToggleSetting(content, '自动释放技能', this._settings.autoSkill, yOffset, (value) => {
            this._settings.autoSkill = value;
        });
        yOffset -= 80;
        
        // 挡板灵敏度
        this.createSliderSetting(content, '挡板灵敏度', this._settings.flipperSensitivity, yOffset, (value) => {
            this._settings.flipperSensitivity = value;
        });
        
        this._panelNode?.addChild(content);
        this._contentNodes.set('control', content);
    }

    /**
     * 创建通知设置内容
     */
    private createNotificationContent(): void {
        const content = new Node('NotificationContent');
        content.setPosition(0, -50);
        
        const transform = content.addComponent(UITransform);
        transform.setContentSize(this._panelWidth - 60, 600);
        
        let yOffset = 200;
        
        // 推送通知
        this.createToggleSetting(content, '推送通知', this._settings.pushNotification, yOffset, (value) => {
            this._settings.pushNotification = value;
        });
        yOffset -= 80;
        
        // 活动通知
        this.createToggleSetting(content, '活动通知', this._settings.eventNotification, yOffset, (value) => {
            this._settings.eventNotification = value;
        });
        yOffset -= 80;
        
        // 体力恢复通知
        this.createToggleSetting(content, '体力恢复提醒', this._settings.staminaNotification, yOffset, (value) => {
            this._settings.staminaNotification = value;
        });
        
        this._panelNode?.addChild(content);
        this._contentNodes.set('notification', content);
    }

    /**
     * 创建其他设置内容
     */
    private createOtherContent(): void {
        const content = new Node('OtherContent');
        content.setPosition(0, -50);
        
        const transform = content.addComponent(UITransform);
        transform.setContentSize(this._panelWidth - 60, 600);
        
        let yOffset = 200;
        
        // 语言
        this.createOptionSetting(content, '语言', 
            ['简体中文', '繁體中文', 'English', '日本語', '한국어'], 
            this.getLanguageIndex(), 
            yOffset, 
            (index) => {
                const langs = [
                    LanguageType.CHINESE_SIMPLIFIED,
                    LanguageType.CHINESE_TRADITIONAL,
                    LanguageType.ENGLISH,
                    LanguageType.JAPANESE,
                    LanguageType.KOREAN
                ];
                this._settings.language = langs[index];
            }
        );
        yOffset -= 80;
        
        // 自动保存
        this.createToggleSetting(content, '自动保存', this._settings.autoSave, yOffset, (value) => {
            this._settings.autoSave = value;
        });
        yOffset -= 120;
        
        // 数据管理按钮
        this.createButton(content, '清除缓存', 0, yOffset, () => {
            console.log('清除缓存');
        });
        yOffset -= 60;
        
        this.createButton(content, '账号绑定', 0, yOffset, () => {
            console.log('账号绑定');
        });
        yOffset -= 60;
        
        this.createButton(content, '用户协议', 0, yOffset, () => {
            console.log('用户协议');
        });
        yOffset -= 60;
        
        this.createButton(content, '隐私政策', 0, yOffset, () => {
            console.log('隐私政策');
        });
        
        this._panelNode?.addChild(content);
        this._contentNodes.set('other', content);
    }

    /**
     * 创建滑块设置项
     */
    private createSliderSetting(
        parent: Node, 
        name: string, 
        value: number, 
        y: number, 
        onChange: (value: number) => void
    ): void {
        const row = new Node(`Setting_${name}`);
        row.setPosition(0, y);
        
        const transform = row.addComponent(UITransform);
        transform.setContentSize(this._panelWidth - 80, 60);
        
        // 标签
        const labelNode = new Node('Label');
        labelNode.setPosition(-150, 0);
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(150, 30);
        const label = labelNode.addComponent(Label);
        label.string = name;
        label.fontSize = 20;
        label.color = new Color(220, 220, 220);
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(labelNode);
        
        // 滑块背景
        const sliderBg = new Node('SliderBg');
        sliderBg.setPosition(80, 0);
        const bgTransform = sliderBg.addComponent(UITransform);
        bgTransform.setContentSize(200, 10);
        const bgGraphics = sliderBg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(60, 60, 80);
        bgGraphics.roundRect(-100, -5, 200, 10, 5);
        bgGraphics.fill();
        row.addChild(sliderBg);
        
        // 滑块填充
        const sliderFill = new Node('SliderFill');
        sliderFill.setPosition(-100 + value * 100, 0);
        const fillTransform = sliderFill.addComponent(UITransform);
        fillTransform.setContentSize(value * 200, 10);
        const fillGraphics = sliderFill.addComponent(Graphics);
        fillGraphics.fillColor = new Color(100, 180, 255);
        fillGraphics.roundRect(0, -5, value * 200, 10, 5);
        fillGraphics.fill();
        sliderBg.addChild(sliderFill);
        
        // 数值显示
        const valueNode = new Node('Value');
        valueNode.setPosition(220, 0);
        const valueTransform = valueNode.addComponent(UITransform);
        valueTransform.setContentSize(60, 30);
        const valueLabel = valueNode.addComponent(Label);
        valueLabel.string = Math.round(value * 100) + '%';
        valueLabel.fontSize = 18;
        valueLabel.color = new Color(180, 180, 180);
        row.addChild(valueNode);
        
        parent.addChild(row);
    }

    /**
     * 创建开关设置项
     */
    private createToggleSetting(
        parent: Node, 
        name: string, 
        value: boolean, 
        y: number, 
        onChange: (value: boolean) => void
    ): void {
        const row = new Node(`Setting_${name}`);
        row.setPosition(0, y);
        
        const transform = row.addComponent(UITransform);
        transform.setContentSize(this._panelWidth - 80, 60);
        
        // 标签
        const labelNode = new Node('Label');
        labelNode.setPosition(-100, 0);
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(250, 30);
        const label = labelNode.addComponent(Label);
        label.string = name;
        label.fontSize = 20;
        label.color = new Color(220, 220, 220);
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(labelNode);
        
        // 开关
        const toggleNode = new Node('Toggle');
        toggleNode.setPosition(200, 0);
        const toggleTransform = toggleNode.addComponent(UITransform);
        toggleTransform.setContentSize(60, 30);
        
        const toggleGraphics = toggleNode.addComponent(Graphics);
        toggleGraphics.fillColor = value ? new Color(100, 180, 100) : new Color(80, 80, 100);
        toggleGraphics.roundRect(-30, -15, 60, 30, 15);
        toggleGraphics.fill();
        
        // 开关圆点
        toggleGraphics.fillColor = new Color(255, 255, 255);
        toggleGraphics.circle(value ? 15 : -15, 0, 12);
        toggleGraphics.fill();
        
        row.addChild(toggleNode);
        parent.addChild(row);
    }

    /**
     * 创建选项设置项
     */
    private createOptionSetting(
        parent: Node, 
        name: string, 
        options: string[], 
        selectedIndex: number, 
        y: number, 
        onChange: (index: number) => void
    ): void {
        const row = new Node(`Setting_${name}`);
        row.setPosition(0, y);
        
        const transform = row.addComponent(UITransform);
        transform.setContentSize(this._panelWidth - 80, 60);
        
        // 标签
        const labelNode = new Node('Label');
        labelNode.setPosition(-150, 0);
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(150, 30);
        const label = labelNode.addComponent(Label);
        label.string = name;
        label.fontSize = 20;
        label.color = new Color(220, 220, 220);
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        row.addChild(labelNode);
        
        // 选项按钮
        const optionWidth = 80;
        const startX = 50;
        for (let i = 0; i < options.length; i++) {
            const optionNode = new Node(`Option_${i}`);
            optionNode.setPosition(startX + i * (optionWidth + 10), 0);
            
            const optTransform = optionNode.addComponent(UITransform);
            optTransform.setContentSize(optionWidth, 35);
            
            const optGraphics = optionNode.addComponent(Graphics);
            const isSelected = i === selectedIndex;
            optGraphics.fillColor = isSelected ? new Color(80, 140, 200) : new Color(50, 50, 70);
            optGraphics.roundRect(-optionWidth/2, -17, optionWidth, 34, 8);
            optGraphics.fill();
            
            const optLabel = optionNode.addComponent(Label);
            optLabel.string = options[i];
            optLabel.fontSize = 16;
            optLabel.color = isSelected ? new Color(255, 255, 255) : new Color(150, 150, 150);
            
            row.addChild(optionNode);
        }
        
        parent.addChild(row);
    }

    /**
     * 创建按钮
     */
    private createButton(
        parent: Node, 
        text: string, 
        x: number, 
        y: number, 
        onClick: () => void
    ): void {
        const btnNode = new Node(`Button_${text}`);
        btnNode.setPosition(x, y);
        
        const transform = btnNode.addComponent(UITransform);
        transform.setContentSize(200, 45);
        
        const graphics = btnNode.addComponent(Graphics);
        graphics.fillColor = new Color(60, 80, 120);
        graphics.roundRect(-100, -22, 200, 44, 10);
        graphics.fill();
        graphics.strokeColor = new Color(100, 140, 200);
        graphics.lineWidth = 2;
        graphics.roundRect(-100, -22, 200, 44, 10);
        graphics.stroke();
        
        const label = btnNode.addComponent(Label);
        label.string = text;
        label.fontSize = 18;
        label.color = new Color(220, 220, 220);
        
        parent.addChild(btnNode);
    }

    /**
     * 创建底部按钮
     */
    private createBottomButtons(): void {
        // 重置按钮
        const resetBtn = new Node('ResetButton');
        resetBtn.setPosition(-100, -this._panelHeight/2 + 60);
        
        const resetTransform = resetBtn.addComponent(UITransform);
        resetTransform.setContentSize(140, 45);
        
        const resetGraphics = resetBtn.addComponent(Graphics);
        resetGraphics.fillColor = new Color(120, 60, 60);
        resetGraphics.roundRect(-70, -22, 140, 44, 10);
        resetGraphics.fill();
        
        const resetLabel = resetBtn.addComponent(Label);
        resetLabel.string = '重置设置';
        resetLabel.fontSize = 18;
        resetLabel.color = new Color(255, 220, 220);
        
        this._panelNode?.addChild(resetBtn);
        
        // 保存按钮
        const saveBtn = new Node('SaveButton');
        saveBtn.setPosition(100, -this._panelHeight/2 + 60);
        
        const saveTransform = saveBtn.addComponent(UITransform);
        saveTransform.setContentSize(140, 45);
        
        const saveGraphics = saveBtn.addComponent(Graphics);
        saveGraphics.fillColor = new Color(60, 120, 80);
        saveGraphics.roundRect(-70, -22, 140, 44, 10);
        saveGraphics.fill();
        
        const saveLabel = saveBtn.addComponent(Label);
        saveLabel.string = '保存';
        saveLabel.fontSize = 18;
        saveLabel.color = new Color(220, 255, 220);
        
        this._panelNode?.addChild(saveBtn);
    }

    /**
     * 切换标签
     */
    public switchTab(tabId: string): void {
        this._currentTab = tabId;
        
        // 更新标签样式
        const tabs = ['audio', 'display', 'control', 'notification', 'other'];
        for (let i = 0; i < tabs.length && i < this._tabNodes.length; i++) {
            const isActive = tabs[i] === tabId;
            const tabNode = this._tabNodes[i];
            const graphics = tabNode.getComponent(Graphics);
            const label = tabNode.getComponent(Label);
            
            if (graphics) {
                graphics.clear();
                graphics.fillColor = isActive ? new Color(80, 120, 180) : new Color(50, 50, 70, 200);
                const tabWidth = this._panelWidth / tabs.length;
                graphics.roundRect(-tabWidth/2 + 5, -20, tabWidth - 10, 40, 8);
                graphics.fill();
            }
            
            if (label) {
                label.color = isActive ? new Color(255, 255, 255) : new Color(200, 200, 200);
            }
        }
        
        // 显示对应内容
        for (const [id, node] of this._contentNodes) {
            node.active = id === tabId;
        }
    }

    /**
     * 获取画质索引
     */
    private getQualityIndex(): number {
        switch (this._settings.quality) {
            case QualityLevel.LOW: return 0;
            case QualityLevel.MEDIUM: return 1;
            case QualityLevel.HIGH: return 2;
            default: return 2;
        }
    }

    /**
     * 获取语言索引
     */
    private getLanguageIndex(): number {
        switch (this._settings.language) {
            case LanguageType.CHINESE_SIMPLIFIED: return 0;
            case LanguageType.CHINESE_TRADITIONAL: return 1;
            case LanguageType.ENGLISH: return 2;
            case LanguageType.JAPANESE: return 3;
            case LanguageType.KOREAN: return 4;
            default: return 0;
        }
    }

    /**
     * 显示面板
     */
    public show(): void {
        if (!this._panelNode) return;
        
        this._panelNode.active = true;
        
        const opacity = this._panelNode.getComponent(UIOpacity);
        if (opacity) {
            opacity.opacity = 0;
            tween(opacity).to(0.2, { opacity: 255 }).start();
        }
        
        this._panelNode.setScale(0.9, 0.9, 1);
        tween(this._panelNode).to(0.2, { scale: new Vec3(1, 1, 1) }).start();
    }

    /**
     * 隐藏面板
     */
    public hide(): void {
        if (!this._panelNode) return;
        
        const opacity = this._panelNode.getComponent(UIOpacity);
        if (opacity) {
            tween(opacity).to(0.15, { opacity: 0 }).call(() => {
                this._panelNode!.active = false;
            }).start();
        }
    }

    /**
     * 重置设置
     */
    public resetSettings(): void {
        this._settings = {
            masterVolume: 1.0,
            bgmVolume: 0.7,
            sfxVolume: 1.0,
            voiceVolume: 1.0,
            isMuted: false,
            quality: QualityLevel.HIGH,
            showDamageNumber: true,
            showComboEffect: true,
            screenShake: true,
            fps: 60,
            vibration: true,
            autoSkill: false,
            flipperSensitivity: 1.0,
            pushNotification: true,
            eventNotification: true,
            staminaNotification: true,
            language: LanguageType.CHINESE_SIMPLIFIED,
            showFPS: false,
            autoSave: true
        };
        
        // 应用设置
        this.applySettings();
        this.saveSettings();
    }

    /**
     * 应用设置
     */
    public applySettings(): void {
        const audio = AudioManager.instance;
        if (audio) {
            audio.setMasterVolume(this._settings.masterVolume);
            audio.setBGMVolume(this._settings.bgmVolume);
            audio.setSFXVolume(this._settings.sfxVolume);
            audio.setMuted(this._settings.isMuted);
        }
        
        // 其他设置应用...
    }

    /**
     * 保存设置
     */
    public saveSettings(): void {
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(this._settings));
        console.log('设置已保存');
    }

    /**
     * 加载设置
     */
    public loadSettings(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this._settings = { ...this._settings, ...data };
                this.applySettings();
            } catch (e) {
                console.error('加载设置失败:', e);
            }
        }
    }

    onDestroy() {
        this.saveSettings();
        
        if (SettingsPanel._instance === this) {
            SettingsPanel._instance = null;
        }
    }
}
