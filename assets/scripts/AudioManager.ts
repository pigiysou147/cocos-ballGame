import { _decorator, Component, Node, AudioSource, AudioClip, sys, resources, assetManager } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 音效类型
 */
export enum SFXType {
    // 战斗音效
    HIT = 'hit',                     // 碰撞/攻击命中
    HIT_CRITICAL = 'hit_critical',   // 暴击
    HIT_WALL = 'hit_wall',           // 撞墙
    HIT_BUMPER = 'hit_bumper',       // 撞弹射物
    FLIPPER = 'flipper',             // 挡板弹射
    ENEMY_HURT = 'enemy_hurt',       // 敌人受伤
    ENEMY_DIE = 'enemy_die',         // 敌人死亡
    BOSS_APPEAR = 'boss_appear',     // Boss出现
    BOSS_DIE = 'boss_die',           // Boss死亡
    
    // 技能音效
    SKILL_READY = 'skill_ready',     // 技能充能完成
    SKILL_USE = 'skill_use',         // 技能释放
    SKILL_FIRE = 'skill_fire',       // 火属性技能
    SKILL_WATER = 'skill_water',     // 水属性技能
    SKILL_WIND = 'skill_wind',       // 风属性技能
    SKILL_THUNDER = 'skill_thunder', // 雷属性技能
    SKILL_LIGHT = 'skill_light',     // 光属性技能
    SKILL_DARK = 'skill_dark',       // 暗属性技能
    HEAL = 'heal',                   // 治疗
    BUFF = 'buff',                   // 增益
    DEBUFF = 'debuff',               // 减益
    
    // 连击音效
    COMBO_1 = 'combo_1',             // 连击1-9
    COMBO_10 = 'combo_10',           // 连击10-29
    COMBO_30 = 'combo_30',           // 连击30-49
    COMBO_50 = 'combo_50',           // 连击50+
    
    // UI音效
    UI_CLICK = 'ui_click',           // 按钮点击
    UI_BACK = 'ui_back',             // 返回
    UI_OPEN = 'ui_open',             // 打开面板
    UI_CLOSE = 'ui_close',           // 关闭面板
    UI_CONFIRM = 'ui_confirm',       // 确认
    UI_CANCEL = 'ui_cancel',         // 取消
    UI_TAB = 'ui_tab',               // 切换标签
    UI_SCROLL = 'ui_scroll',         // 滚动
    
    // 抽卡音效
    GACHA_START = 'gacha_start',     // 开始抽卡
    GACHA_PULL = 'gacha_pull',       // 抽卡过程
    GACHA_RESULT_N = 'gacha_n',      // 抽到N
    GACHA_RESULT_R = 'gacha_r',      // 抽到R
    GACHA_RESULT_SR = 'gacha_sr',    // 抽到SR
    GACHA_RESULT_SSR = 'gacha_ssr',  // 抽到SSR
    GACHA_RESULT_UR = 'gacha_ur',    // 抽到UR
    
    // 奖励音效
    REWARD_GET = 'reward_get',       // 获得奖励
    COIN_GET = 'coin_get',           // 获得金币
    DIAMOND_GET = 'diamond_get',     // 获得钻石
    LEVEL_UP = 'level_up',           // 升级
    ACHIEVEMENT = 'achievement',     // 成就达成
    
    // 游戏流程
    GAME_START = 'game_start',       // 游戏开始
    GAME_WIN = 'game_win',           // 胜利
    GAME_LOSE = 'game_lose',         // 失败
    COUNTDOWN = 'countdown',         // 倒计时
    PAUSE = 'pause',                 // 暂停
}

/**
 * 背景音乐类型
 */
export enum BGMType {
    TITLE = 'bgm_title',             // 标题画面
    MAIN_MENU = 'bgm_main_menu',     // 主界面
    BATTLE_NORMAL = 'bgm_battle',    // 普通战斗
    BATTLE_BOSS = 'bgm_boss',        // Boss战
    BATTLE_RAID = 'bgm_raid',        // 领主战
    VICTORY = 'bgm_victory',         // 胜利
    GACHA = 'bgm_gacha',             // 抽卡
    STORY = 'bgm_story',             // 剧情
}

/**
 * 音频配置
 */
export interface AudioConfig {
    volume: number;
    loop: boolean;
    pitch?: number;
}

/**
 * 音频管理器 - 统一管理游戏音效和音乐
 * Audio Manager - Centralized audio management
 */
@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _instance: AudioManager | null = null;

    @property({ tooltip: '主音量' })
    public masterVolume: number = 1.0;

    @property({ tooltip: 'BGM音量' })
    public bgmVolume: number = 0.7;

    @property({ tooltip: '音效音量' })
    public sfxVolume: number = 1.0;

    @property({ tooltip: '是否静音' })
    public isMuted: boolean = false;

    // BGM播放器
    private _bgmSource: AudioSource | null = null;
    private _currentBGM: BGMType | null = null;
    
    // 音效播放器池
    private _sfxSources: AudioSource[] = [];
    private _maxSFXSources: number = 10;
    
    // 音频缓存
    private _audioCache: Map<string, AudioClip> = new Map();
    
    // 音效配置
    private _sfxConfigs: Map<SFXType, AudioConfig> = new Map();
    
    // 存档key
    private readonly SAVE_KEY = 'world_flipper_audio_settings';

    public static get instance(): AudioManager | null {
        return AudioManager._instance;
    }

    onLoad() {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
        
        // 创建BGM播放器
        this._bgmSource = this.node.addComponent(AudioSource);
        this._bgmSource.loop = true;
        
        // 创建音效播放器池
        for (let i = 0; i < this._maxSFXSources; i++) {
            const source = this.node.addComponent(AudioSource);
            source.loop = false;
            this._sfxSources.push(source);
        }
        
        // 初始化音效配置
        this.initSFXConfigs();
        
        // 加载设置
        this.loadSettings();
    }

    /**
     * 初始化音效配置
     */
    private initSFXConfigs(): void {
        // 战斗音效
        this._sfxConfigs.set(SFXType.HIT, { volume: 0.6, loop: false });
        this._sfxConfigs.set(SFXType.HIT_CRITICAL, { volume: 0.8, loop: false });
        this._sfxConfigs.set(SFXType.HIT_WALL, { volume: 0.4, loop: false });
        this._sfxConfigs.set(SFXType.HIT_BUMPER, { volume: 0.5, loop: false });
        this._sfxConfigs.set(SFXType.FLIPPER, { volume: 0.7, loop: false });
        this._sfxConfigs.set(SFXType.ENEMY_HURT, { volume: 0.5, loop: false });
        this._sfxConfigs.set(SFXType.ENEMY_DIE, { volume: 0.6, loop: false });
        this._sfxConfigs.set(SFXType.BOSS_APPEAR, { volume: 0.9, loop: false });
        this._sfxConfigs.set(SFXType.BOSS_DIE, { volume: 1.0, loop: false });
        
        // 技能音效
        this._sfxConfigs.set(SFXType.SKILL_READY, { volume: 0.7, loop: false });
        this._sfxConfigs.set(SFXType.SKILL_USE, { volume: 0.8, loop: false });
        this._sfxConfigs.set(SFXType.HEAL, { volume: 0.6, loop: false });
        
        // UI音效
        this._sfxConfigs.set(SFXType.UI_CLICK, { volume: 0.5, loop: false });
        this._sfxConfigs.set(SFXType.UI_CONFIRM, { volume: 0.6, loop: false });
        this._sfxConfigs.set(SFXType.UI_CANCEL, { volume: 0.4, loop: false });
        
        // 抽卡音效
        this._sfxConfigs.set(SFXType.GACHA_RESULT_SSR, { volume: 1.0, loop: false });
        this._sfxConfigs.set(SFXType.GACHA_RESULT_UR, { volume: 1.0, loop: false });
        
        // 奖励音效
        this._sfxConfigs.set(SFXType.COIN_GET, { volume: 0.5, loop: false });
        this._sfxConfigs.set(SFXType.LEVEL_UP, { volume: 0.8, loop: false });
        this._sfxConfigs.set(SFXType.ACHIEVEMENT, { volume: 0.9, loop: false });
    }

    /**
     * 播放背景音乐
     */
    public playBGM(type: BGMType, fadeIn: boolean = true): void {
        if (this._currentBGM === type) return;
        
        const path = `audio/bgm/${type}`;
        this.loadAudio(path, (clip) => {
            if (!clip || !this._bgmSource) return;
            
            if (fadeIn && this._bgmSource.playing) {
                // 淡出当前BGM
                this.fadeBGM(0, 0.5, () => {
                    this._bgmSource!.clip = clip;
                    this._bgmSource!.volume = 0;
                    this._bgmSource!.play();
                    this._currentBGM = type;
                    // 淡入新BGM
                    this.fadeBGM(this.getEffectiveBGMVolume(), 0.5);
                });
            } else {
                this._bgmSource.clip = clip;
                this._bgmSource.volume = this.getEffectiveBGMVolume();
                this._bgmSource.play();
                this._currentBGM = type;
            }
        });
    }

    /**
     * 停止背景音乐
     */
    public stopBGM(fadeOut: boolean = true): void {
        if (!this._bgmSource || !this._bgmSource.playing) return;
        
        if (fadeOut) {
            this.fadeBGM(0, 0.5, () => {
                this._bgmSource!.stop();
                this._currentBGM = null;
            });
        } else {
            this._bgmSource.stop();
            this._currentBGM = null;
        }
    }

    /**
     * 暂停背景音乐
     */
    public pauseBGM(): void {
        if (this._bgmSource) {
            this._bgmSource.pause();
        }
    }

    /**
     * 恢复背景音乐
     */
    public resumeBGM(): void {
        if (this._bgmSource) {
            this._bgmSource.play();
        }
    }

    /**
     * BGM淡入淡出
     */
    private fadeBGM(targetVolume: number, duration: number, callback?: () => void): void {
        if (!this._bgmSource) return;
        
        const startVolume = this._bgmSource.volume;
        const startTime = Date.now();
        
        const fade = () => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            if (this._bgmSource) {
                this._bgmSource.volume = startVolume + (targetVolume - startVolume) * progress;
            }
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            } else {
                callback?.();
            }
        };
        
        fade();
    }

    /**
     * 播放音效
     */
    public playSFX(type: SFXType): void {
        if (this.isMuted) return;
        
        const config = this._sfxConfigs.get(type) || { volume: 1, loop: false };
        const path = `audio/sfx/${type}`;
        
        this.loadAudio(path, (clip) => {
            if (!clip) return;
            
            // 找一个空闲的播放器
            const source = this.getAvailableSFXSource();
            if (!source) return;
            
            source.clip = clip;
            source.volume = config.volume * this.sfxVolume * this.masterVolume;
            source.loop = config.loop;
            source.play();
        });
    }

    /**
     * 播放音效（带参数）
     */
    public playSFXWithConfig(type: SFXType, config?: Partial<AudioConfig>): void {
        if (this.isMuted) return;
        
        const baseConfig = this._sfxConfigs.get(type) || { volume: 1, loop: false };
        const finalConfig = { ...baseConfig, ...config };
        const path = `audio/sfx/${type}`;
        
        this.loadAudio(path, (clip) => {
            if (!clip) return;
            
            const source = this.getAvailableSFXSource();
            if (!source) return;
            
            source.clip = clip;
            source.volume = finalConfig.volume * this.sfxVolume * this.masterVolume;
            source.loop = finalConfig.loop;
            if (finalConfig.pitch) {
                // Cocos Creator 3.x 不直接支持pitch，这里留作扩展
            }
            source.play();
        });
    }

    /**
     * 停止所有音效
     */
    public stopAllSFX(): void {
        for (const source of this._sfxSources) {
            source.stop();
        }
    }

    /**
     * 获取可用的音效播放器
     */
    private getAvailableSFXSource(): AudioSource | null {
        for (const source of this._sfxSources) {
            if (!source.playing) {
                return source;
            }
        }
        // 如果都在播放，返回第一个（会被覆盖）
        return this._sfxSources[0];
    }

    /**
     * 加载音频资源
     */
    private loadAudio(path: string, callback: (clip: AudioClip | null) => void): void {
        // 检查缓存
        const cached = this._audioCache.get(path);
        if (cached) {
            callback(cached);
            return;
        }
        
        // 加载资源
        resources.load(path, AudioClip, (err, clip) => {
            if (err) {
                console.warn(`加载音频失败: ${path}`, err);
                callback(null);
                return;
            }
            
            // 缓存
            this._audioCache.set(path, clip);
            callback(clip);
        });
    }

    /**
     * 预加载音频
     */
    public preloadAudio(paths: string[]): Promise<void> {
        return new Promise((resolve) => {
            let loaded = 0;
            const total = paths.length;
            
            if (total === 0) {
                resolve();
                return;
            }
            
            for (const path of paths) {
                this.loadAudio(path, () => {
                    loaded++;
                    if (loaded >= total) {
                        resolve();
                    }
                });
            }
        });
    }

    /**
     * 预加载所有战斗音效
     */
    public preloadBattleSFX(): Promise<void> {
        const sfxTypes = [
            SFXType.HIT, SFXType.HIT_CRITICAL, SFXType.HIT_WALL,
            SFXType.HIT_BUMPER, SFXType.FLIPPER, SFXType.ENEMY_HURT,
            SFXType.ENEMY_DIE, SFXType.SKILL_USE, SFXType.SKILL_READY
        ];
        
        return this.preloadAudio(sfxTypes.map(t => `audio/sfx/${t}`));
    }

    // ========== 音量控制 ==========

    /**
     * 设置主音量
     */
    public setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        this.saveSettings();
    }

    /**
     * 设置BGM音量
     */
    public setBGMVolume(volume: number): void {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this._bgmSource) {
            this._bgmSource.volume = this.getEffectiveBGMVolume();
        }
        this.saveSettings();
    }

    /**
     * 设置音效音量
     */
    public setSFXVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    /**
     * 设置静音
     */
    public setMuted(muted: boolean): void {
        this.isMuted = muted;
        this.updateVolumes();
        this.saveSettings();
    }

    /**
     * 切换静音
     */
    public toggleMute(): boolean {
        this.setMuted(!this.isMuted);
        return this.isMuted;
    }

    /**
     * 获取有效BGM音量
     */
    private getEffectiveBGMVolume(): number {
        if (this.isMuted) return 0;
        return this.bgmVolume * this.masterVolume;
    }

    /**
     * 更新所有音量
     */
    private updateVolumes(): void {
        if (this._bgmSource) {
            this._bgmSource.volume = this.getEffectiveBGMVolume();
        }
    }

    // ========== 便捷方法 ==========

    /** 播放点击音效 */
    public playClick(): void { this.playSFX(SFXType.UI_CLICK); }
    
    /** 播放确认音效 */
    public playConfirm(): void { this.playSFX(SFXType.UI_CONFIRM); }
    
    /** 播放取消音效 */
    public playCancel(): void { this.playSFX(SFXType.UI_CANCEL); }
    
    /** 播放碰撞音效 */
    public playHit(): void { this.playSFX(SFXType.HIT); }
    
    /** 播放暴击音效 */
    public playCritical(): void { this.playSFX(SFXType.HIT_CRITICAL); }
    
    /** 播放挡板音效 */
    public playFlipper(): void { this.playSFX(SFXType.FLIPPER); }
    
    /** 播放敌人死亡音效 */
    public playEnemyDie(): void { this.playSFX(SFXType.ENEMY_DIE); }
    
    /** 播放技能音效 */
    public playSkill(): void { this.playSFX(SFXType.SKILL_USE); }
    
    /** 播放获得金币音效 */
    public playCoinGet(): void { this.playSFX(SFXType.COIN_GET); }
    
    /** 播放升级音效 */
    public playLevelUp(): void { this.playSFX(SFXType.LEVEL_UP); }

    /** 播放连击音效 */
    public playCombo(count: number): void {
        if (count >= 50) {
            this.playSFX(SFXType.COMBO_50);
        } else if (count >= 30) {
            this.playSFX(SFXType.COMBO_30);
        } else if (count >= 10) {
            this.playSFX(SFXType.COMBO_10);
        } else {
            this.playSFX(SFXType.COMBO_1);
        }
    }

    // ========== 存档 ==========

    public saveSettings(): void {
        const data = {
            masterVolume: this.masterVolume,
            bgmVolume: this.bgmVolume,
            sfxVolume: this.sfxVolume,
            isMuted: this.isMuted
        };
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }

    public loadSettings(): void {
        const saved = sys.localStorage.getItem(this.SAVE_KEY);
        if (!saved) return;
        
        try {
            const data = JSON.parse(saved);
            this.masterVolume = data.masterVolume ?? 1.0;
            this.bgmVolume = data.bgmVolume ?? 0.7;
            this.sfxVolume = data.sfxVolume ?? 1.0;
            this.isMuted = data.isMuted ?? false;
            this.updateVolumes();
        } catch (e) {
            console.error('加载音频设置失败:', e);
        }
    }

    onDestroy() {
        this.saveSettings();
        
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
    }
}
