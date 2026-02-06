import { _decorator, Component, Node, Vec3, Color, Graphics, UITransform, tween, Tween, view, Canvas, Camera, director } from 'cc';
import { SkillConfig, SkillType, SkillEffectType } from './SkillData';
import { ElementType } from './CharacterData';
import { AudioManager, SFXType } from './AudioManager';
const { ccclass, property } = _decorator;

/**
 * 特效类型
 */
export enum SkillVFXType {
    // 释放特效
    CAST_CIRCLE = 'cast_circle',        // 释放法阵
    CAST_BURST = 'cast_burst',          // 释放爆发
    CAST_CHARGE = 'cast_charge',        // 蓄力特效
    
    // 飞行特效
    PROJECTILE = 'projectile',          // 投射物
    BEAM = 'beam',                      // 光束
    CHAIN = 'chain',                    // 链式
    
    // 命中特效
    HIT_IMPACT = 'hit_impact',          // 冲击
    HIT_SLASH = 'hit_slash',            // 斩击
    HIT_EXPLOSION = 'hit_explosion',    // 爆炸
    
    // 区域特效
    AREA_CIRCLE = 'area_circle',        // 圆形区域
    AREA_CONE = 'area_cone',            // 扇形区域
    AREA_LINE = 'area_line',            // 线性区域
    
    // 状态特效
    BUFF_AURA = 'buff_aura',            // 增益光环
    DEBUFF_MARK = 'debuff_mark',        // 减益标记
    HEAL_GLOW = 'heal_glow',            // 治疗光芒
    SHIELD_BUBBLE = 'shield_bubble'     // 护盾气泡
}

/**
 * 特效配置
 */
export interface SkillVFXConfig {
    type: SkillVFXType;
    duration: number;
    color: Color;
    secondaryColor?: Color;
    scale?: number;
    particleCount?: number;
    speed?: number;
}

/**
 * 粒子数据
 */
interface Particle {
    node: Node;
    velocity: Vec3;
    life: number;
    maxLife: number;
    size: number;
    color: Color;
}

/**
 * 技能特效渲染器
 * Skill Effect Renderer - Visual effects for skills
 */
@ccclass('SkillEffectRenderer')
export class SkillEffectRenderer extends Component {
    private static _instance: SkillEffectRenderer | null = null;

    @property({ type: Node, tooltip: '特效容器' })
    public effectContainer: Node | null = null;

    @property({ type: Node, tooltip: '屏幕特效层' })
    public screenEffectLayer: Node | null = null;

    // 活跃的特效
    private _activeEffects: Map<string, Node[]> = new Map();

    // 粒子池
    private _particlePool: Node[] = [];

    // 活跃粒子
    private _activeParticles: Particle[] = [];

    // 元素颜色映射
    private _elementColors: Map<ElementType, Color> = new Map([
        [ElementType.FIRE, new Color(255, 100, 50, 255)],
        [ElementType.WATER, new Color(50, 150, 255, 255)],
        [ElementType.WIND, new Color(100, 255, 150, 255)],
        [ElementType.THUNDER, new Color(255, 255, 100, 255)],
        [ElementType.LIGHT, new Color(255, 255, 200, 255)],
        [ElementType.DARK, new Color(150, 50, 200, 255)]
    ]);

    // 震动状态
    private _isShaking: boolean = false;
    private _originalCameraPos: Vec3 = new Vec3();

    public static get instance(): SkillEffectRenderer | null {
        return SkillEffectRenderer._instance;
    }

    onLoad() {
        if (SkillEffectRenderer._instance) {
            this.node.destroy();
            return;
        }
        SkillEffectRenderer._instance = this;

        this.initEffectContainer();
        this.initParticlePool();
    }

    /**
     * 初始化特效容器
     */
    private initEffectContainer(): void {
        if (!this.effectContainer) {
            this.effectContainer = new Node('EffectContainer');
            this.node.addChild(this.effectContainer);
        }

        if (!this.screenEffectLayer) {
            this.screenEffectLayer = new Node('ScreenEffectLayer');
            const transform = this.screenEffectLayer.addComponent(UITransform);
            const visibleSize = view.getVisibleSize();
            transform.setContentSize(visibleSize.width, visibleSize.height);
            this.node.addChild(this.screenEffectLayer);
        }
    }

    /**
     * 初始化粒子池
     */
    private initParticlePool(): void {
        for (let i = 0; i < 100; i++) {
            const particle = this.createParticleNode();
            particle.active = false;
            this._particlePool.push(particle);
        }
    }

    /**
     * 创建粒子节点
     */
    private createParticleNode(): Node {
        const node = new Node('Particle');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(10, 10);
        
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = Color.WHITE;
        graphics.circle(0, 0, 5);
        graphics.fill();

        if (this.effectContainer) {
            this.effectContainer.addChild(node);
        }

        return node;
    }

    /**
     * 播放技能释放特效
     */
    public playSkillCastEffect(
        skill: SkillConfig,
        casterPosition: Vec3,
        element?: ElementType
    ): void {
        const color = element ? this.getElementColor(element) : new Color(255, 255, 255, 255);

        // 根据技能类型选择特效
        switch (skill.type) {
            case SkillType.ACTIVE:
                this.playCastCircle(casterPosition, color, 0.5);
                this.playCastBurst(casterPosition, color, 20);
                break;
            case SkillType.ULTIMATE:
                this.playUltimateEffect(casterPosition, color);
                break;
        }

        // 播放音效
        this.playSkillSound(skill, element);
    }

    /**
     * 播放技能命中特效
     */
    public playSkillHitEffect(
        position: Vec3,
        element?: ElementType,
        isCritical: boolean = false,
        isAOE: boolean = false
    ): void {
        const color = element ? this.getElementColor(element) : new Color(255, 255, 255, 255);

        if (isAOE) {
            this.playExplosionEffect(position, color, isCritical ? 1.5 : 1.0);
        } else {
            this.playImpactEffect(position, color, isCritical ? 1.5 : 1.0);
        }

        // 暴击时震屏
        if (isCritical) {
            this.playScreenShake(0.3, 10);
        }
    }

    /**
     * 播放治疗特效
     */
    public playHealEffect(position: Vec3, amount: number): void {
        const color = new Color(100, 255, 150, 255);
        
        // 上升的治疗粒子
        this.playRisingParticles(position, color, 15);
        
        // 治疗光环
        this.playHealAura(position, color);
    }

    /**
     * 播放护盾特效
     */
    public playShieldEffect(position: Vec3): void {
        const color = new Color(100, 200, 255, 200);
        this.playShieldBubble(position, color);
    }

    /**
     * 播放Buff特效
     */
    public playBuffEffect(position: Vec3, isPositive: boolean): void {
        const color = isPositive 
            ? new Color(100, 255, 150, 255)  // 增益绿色
            : new Color(255, 100, 100, 255); // 减益红色
        
        this.playStatusAura(position, color, isPositive);
    }

    // ==================== 具体特效实现 ====================

    /**
     * 播放释放法阵
     */
    private playCastCircle(position: Vec3, color: Color, duration: number): void {
        const effectId = `cast_circle_${Date.now()}`;
        const nodes: Node[] = [];

        // 创建法阵
        const circle = new Node('CastCircle');
        circle.setPosition(position);
        
        const transform = circle.addComponent(UITransform);
        transform.setContentSize(100, 100);

        const graphics = circle.addComponent(Graphics);
        
        // 绘制多层圆环
        this.drawMagicCircle(graphics, color, 0);

        if (this.effectContainer) {
            this.effectContainer.addChild(circle);
        }
        nodes.push(circle);

        // 动画：旋转 + 扩大 + 消失
        circle.setScale(0.1, 0.1, 1);
        tween(circle)
            .to(duration * 0.3, { scale: new Vec3(1.2, 1.2, 1) })
            .to(duration * 0.4, { scale: new Vec3(1, 1, 1) })
            .parallel(
                tween().to(duration * 0.3, { scale: new Vec3(1.5, 1.5, 1) }),
                tween().call(() => {
                    // 淡出
                    this.fadeOutGraphics(graphics, duration * 0.3);
                })
            )
            .call(() => {
                this.removeEffect(effectId);
            })
            .start();

        // 旋转动画
        tween(circle)
            .by(duration, { eulerAngles: new Vec3(0, 0, 360) })
            .start();

        this._activeEffects.set(effectId, nodes);
    }

    /**
     * 绘制魔法阵
     */
    private drawMagicCircle(graphics: Graphics, color: Color, rotation: number): void {
        graphics.clear();

        // 外圈
        graphics.strokeColor = color;
        graphics.lineWidth = 3;
        graphics.circle(0, 0, 48);
        graphics.stroke();

        // 内圈
        graphics.lineWidth = 2;
        graphics.circle(0, 0, 35);
        graphics.stroke();

        // 中心圈
        graphics.circle(0, 0, 15);
        graphics.stroke();

        // 六芒星
        const innerColor = color.clone();
        innerColor.a = 150;
        graphics.strokeColor = innerColor;
        graphics.lineWidth = 2;

        const points = 6;
        const radius = 40;
        for (let i = 0; i < points; i++) {
            const angle1 = (i * 2 * Math.PI / points) + rotation;
            const angle2 = ((i + 2) * 2 * Math.PI / points) + rotation;
            
            const x1 = Math.cos(angle1) * radius;
            const y1 = Math.sin(angle1) * radius;
            const x2 = Math.cos(angle2) * radius;
            const y2 = Math.sin(angle2) * radius;

            graphics.moveTo(x1, y1);
            graphics.lineTo(x2, y2);
        }
        graphics.stroke();

        // 符文点
        graphics.fillColor = color;
        for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI / 6) + rotation;
            const x = Math.cos(angle) * 42;
            const y = Math.sin(angle) * 42;
            graphics.circle(x, y, 3);
            graphics.fill();
        }
    }

    /**
     * 播放释放爆发
     */
    private playCastBurst(position: Vec3, color: Color, particleCount: number): void {
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            if (!particle) continue;

            particle.node.setPosition(position);
            particle.node.active = true;

            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 200 + Math.random() * 100;
            particle.velocity = new Vec3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0
            );
            particle.life = 0.5;
            particle.maxLife = 0.5;
            particle.size = 5 + Math.random() * 5;
            particle.color = color.clone();

            this.updateParticleGraphics(particle);
        }
    }

    /**
     * 播放必杀技特效
     */
    private playUltimateEffect(position: Vec3, color: Color): void {
        // 全屏闪烁
        this.playScreenFlash(color, 0.3);
        
        // 震屏
        this.playScreenShake(0.5, 15);

        // 巨大法阵
        this.playCastCircle(position, color, 1.0);

        // 大量粒子
        this.playCastBurst(position, color, 50);

        // 冲击波
        this.playShockwave(position, color, 300);
    }

    /**
     * 播放冲击特效
     */
    private playImpactEffect(position: Vec3, color: Color, scale: number): void {
        const effectId = `impact_${Date.now()}`;
        const nodes: Node[] = [];

        // 冲击线条
        const impact = new Node('Impact');
        impact.setPosition(position);
        
        const transform = impact.addComponent(UITransform);
        transform.setContentSize(60 * scale, 60 * scale);

        const graphics = impact.addComponent(Graphics);
        
        // 绘制爆炸线条
        const lineCount = 8;
        graphics.strokeColor = color;
        graphics.lineWidth = 3;

        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI * 2;
            const innerRadius = 5;
            const outerRadius = 25 * scale;

            graphics.moveTo(
                Math.cos(angle) * innerRadius,
                Math.sin(angle) * innerRadius
            );
            graphics.lineTo(
                Math.cos(angle) * outerRadius,
                Math.sin(angle) * outerRadius
            );
        }
        graphics.stroke();

        // 中心圆
        graphics.fillColor = color;
        graphics.circle(0, 0, 8 * scale);
        graphics.fill();

        if (this.effectContainer) {
            this.effectContainer.addChild(impact);
        }
        nodes.push(impact);

        // 动画
        impact.setScale(0.5, 0.5, 1);
        tween(impact)
            .to(0.1, { scale: new Vec3(1.2 * scale, 1.2 * scale, 1) })
            .to(0.2, { scale: new Vec3(0.8 * scale, 0.8 * scale, 1) })
            .call(() => {
                this.fadeOutGraphics(graphics, 0.1);
            })
            .delay(0.1)
            .call(() => {
                this.removeEffect(effectId);
            })
            .start();

        // 散射粒子
        this.playScatterParticles(position, color, 10);

        this._activeEffects.set(effectId, nodes);
    }

    /**
     * 播放爆炸特效
     */
    private playExplosionEffect(position: Vec3, color: Color, scale: number): void {
        const effectId = `explosion_${Date.now()}`;
        const nodes: Node[] = [];

        // 爆炸圆
        const explosion = new Node('Explosion');
        explosion.setPosition(position);
        
        const transform = explosion.addComponent(UITransform);
        const size = 100 * scale;
        transform.setContentSize(size, size);

        const graphics = explosion.addComponent(Graphics);
        
        // 多层圆
        for (let i = 0; i < 3; i++) {
            const layerColor = color.clone();
            layerColor.a = 200 - i * 50;
            graphics.fillColor = layerColor;
            graphics.circle(0, 0, (40 - i * 10) * scale);
            graphics.fill();
        }

        if (this.effectContainer) {
            this.effectContainer.addChild(explosion);
        }
        nodes.push(explosion);

        // 动画
        explosion.setScale(0.1, 0.1, 1);
        tween(explosion)
            .to(0.15, { scale: new Vec3(1.5 * scale, 1.5 * scale, 1) })
            .call(() => {
                this.fadeOutGraphics(graphics, 0.2);
            })
            .delay(0.2)
            .call(() => {
                this.removeEffect(effectId);
            })
            .start();

        // 冲击波
        this.playShockwave(position, color, 150 * scale);

        // 大量散射粒子
        this.playScatterParticles(position, color, 30);

        this._activeEffects.set(effectId, nodes);
    }

    /**
     * 播放冲击波
     */
    private playShockwave(position: Vec3, color: Color, radius: number): void {
        const effectId = `shockwave_${Date.now()}`;
        const nodes: Node[] = [];

        const wave = new Node('Shockwave');
        wave.setPosition(position);
        
        const transform = wave.addComponent(UITransform);
        transform.setContentSize(radius * 2, radius * 2);

        const graphics = wave.addComponent(Graphics);
        graphics.strokeColor = color;
        graphics.lineWidth = 4;
        graphics.circle(0, 0, 10);
        graphics.stroke();

        if (this.effectContainer) {
            this.effectContainer.addChild(wave);
        }
        nodes.push(wave);

        // 扩散动画
        let currentRadius = 10;
        const targetRadius = radius;
        const duration = 0.4;
        
        tween(wave)
            .to(duration, {}, {
                onUpdate: (target: any, ratio: number) => {
                    currentRadius = 10 + (targetRadius - 10) * ratio!;
                    graphics.clear();
                    const alpha = Math.floor(255 * (1 - ratio!));
                    graphics.strokeColor = new Color(color.r, color.g, color.b, alpha);
                    graphics.lineWidth = 4 * (1 - ratio! * 0.5);
                    graphics.circle(0, 0, currentRadius);
                    graphics.stroke();
                }
            })
            .call(() => {
                this.removeEffect(effectId);
            })
            .start();

        this._activeEffects.set(effectId, nodes);
    }

    /**
     * 播放上升粒子
     */
    private playRisingParticles(position: Vec3, color: Color, count: number): void {
        for (let i = 0; i < count; i++) {
            const particle = this.getParticle();
            if (!particle) continue;

            const offsetX = (Math.random() - 0.5) * 40;
            particle.node.setPosition(position.x + offsetX, position.y, 0);
            particle.node.active = true;

            particle.velocity = new Vec3(
                (Math.random() - 0.5) * 30,
                100 + Math.random() * 50,
                0
            );
            particle.life = 0.8 + Math.random() * 0.4;
            particle.maxLife = particle.life;
            particle.size = 4 + Math.random() * 4;
            particle.color = color.clone();

            this.updateParticleGraphics(particle);
        }
    }

    /**
     * 播放散射粒子
     */
    private playScatterParticles(position: Vec3, color: Color, count: number): void {
        for (let i = 0; i < count; i++) {
            const particle = this.getParticle();
            if (!particle) continue;

            particle.node.setPosition(position);
            particle.node.active = true;

            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            particle.velocity = new Vec3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0
            );
            particle.life = 0.3 + Math.random() * 0.3;
            particle.maxLife = particle.life;
            particle.size = 3 + Math.random() * 5;
            particle.color = color.clone();

            this.updateParticleGraphics(particle);
        }
    }

    /**
     * 播放治疗光环
     */
    private playHealAura(position: Vec3, color: Color): void {
        const effectId = `heal_aura_${Date.now()}`;
        const nodes: Node[] = [];

        const aura = new Node('HealAura');
        aura.setPosition(position);
        
        const transform = aura.addComponent(UITransform);
        transform.setContentSize(80, 80);

        const graphics = aura.addComponent(Graphics);

        if (this.effectContainer) {
            this.effectContainer.addChild(aura);
        }
        nodes.push(aura);

        // 脉冲动画
        let phase = 0;
        const duration = 1.0;
        
        tween(aura)
            .to(duration, {}, {
                onUpdate: (target: any, ratio: number) => {
                    phase = ratio! * Math.PI * 4;
                    const pulseScale = 1 + Math.sin(phase) * 0.2;
                    const alpha = Math.floor(200 * (1 - ratio!));
                    
                    graphics.clear();
                    graphics.fillColor = new Color(color.r, color.g, color.b, alpha * 0.3);
                    graphics.circle(0, 0, 30 * pulseScale);
                    graphics.fill();
                    
                    graphics.strokeColor = new Color(color.r, color.g, color.b, alpha);
                    graphics.lineWidth = 2;
                    graphics.circle(0, 0, 35 * pulseScale);
                    graphics.stroke();
                }
            })
            .call(() => {
                this.removeEffect(effectId);
            })
            .start();

        this._activeEffects.set(effectId, nodes);
    }

    /**
     * 播放护盾气泡
     */
    private playShieldBubble(position: Vec3, color: Color): void {
        const effectId = `shield_${Date.now()}`;
        const nodes: Node[] = [];

        const shield = new Node('Shield');
        shield.setPosition(position);
        
        const transform = shield.addComponent(UITransform);
        transform.setContentSize(80, 80);

        const graphics = shield.addComponent(Graphics);

        if (this.effectContainer) {
            this.effectContainer.addChild(shield);
        }
        nodes.push(shield);

        // 出现动画
        shield.setScale(0, 0, 1);
        tween(shield)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();

        // 持续动画
        let phase = 0;
        this.schedule(() => {
            phase += 0.1;
            const shimmer = Math.sin(phase * 3) * 0.1 + 0.9;
            
            graphics.clear();
            
            // 外圈
            graphics.strokeColor = new Color(color.r, color.g, color.b, Math.floor(200 * shimmer));
            graphics.lineWidth = 3;
            graphics.circle(0, 0, 35);
            graphics.stroke();

            // 内圈
            graphics.fillColor = new Color(color.r, color.g, color.b, Math.floor(50 * shimmer));
            graphics.circle(0, 0, 33);
            graphics.fill();

            // 高光
            graphics.fillColor = new Color(255, 255, 255, Math.floor(100 * shimmer));
            graphics.ellipse(-12, 10, 8, 5);
            graphics.fill();
        }, 0.05, 100);

        this._activeEffects.set(effectId, nodes);
    }

    /**
     * 播放状态光环
     */
    private playStatusAura(position: Vec3, color: Color, isPositive: boolean): void {
        const effectId = `status_${Date.now()}`;
        const nodes: Node[] = [];

        const aura = new Node('StatusAura');
        aura.setPosition(position.x, position.y + 50, 0);
        
        const transform = aura.addComponent(UITransform);
        transform.setContentSize(40, 40);

        const graphics = aura.addComponent(Graphics);
        
        // 绘制箭头（上升/下降）
        graphics.fillColor = color;
        if (isPositive) {
            // 上箭头
            graphics.moveTo(0, 15);
            graphics.lineTo(-10, 0);
            graphics.lineTo(-5, 0);
            graphics.lineTo(-5, -15);
            graphics.lineTo(5, -15);
            graphics.lineTo(5, 0);
            graphics.lineTo(10, 0);
            graphics.close();
        } else {
            // 下箭头
            graphics.moveTo(0, -15);
            graphics.lineTo(-10, 0);
            graphics.lineTo(-5, 0);
            graphics.lineTo(-5, 15);
            graphics.lineTo(5, 15);
            graphics.lineTo(5, 0);
            graphics.lineTo(10, 0);
            graphics.close();
        }
        graphics.fill();

        if (this.effectContainer) {
            this.effectContainer.addChild(aura);
        }
        nodes.push(aura);

        // 上浮并消失
        const direction = isPositive ? 30 : -30;
        tween(aura)
            .to(0.5, { 
                position: new Vec3(position.x, position.y + 50 + direction, 0)
            })
            .call(() => {
                this.fadeOutGraphics(graphics, 0.3);
            })
            .delay(0.3)
            .call(() => {
                this.removeEffect(effectId);
            })
            .start();

        this._activeEffects.set(effectId, nodes);
    }

    // ==================== 屏幕特效 ====================

    /**
     * 播放屏幕闪烁
     */
    public playScreenFlash(color: Color, duration: number): void {
        if (!this.screenEffectLayer) return;

        const flash = new Node('ScreenFlash');
        const visibleSize = view.getVisibleSize();
        
        const transform = flash.addComponent(UITransform);
        transform.setContentSize(visibleSize.width, visibleSize.height);

        const graphics = flash.addComponent(Graphics);
        graphics.fillColor = new Color(color.r, color.g, color.b, 150);
        graphics.rect(-visibleSize.width / 2, -visibleSize.height / 2, visibleSize.width, visibleSize.height);
        graphics.fill();

        this.screenEffectLayer.addChild(flash);

        tween(flash)
            .to(duration * 0.3, {}, {
                onUpdate: (target: any, ratio: number) => {
                    graphics.clear();
                    const alpha = Math.floor(150 * (1 - ratio!));
                    graphics.fillColor = new Color(color.r, color.g, color.b, alpha);
                    graphics.rect(-visibleSize.width / 2, -visibleSize.height / 2, visibleSize.width, visibleSize.height);
                    graphics.fill();
                }
            })
            .call(() => {
                flash.destroy();
            })
            .start();
    }

    /**
     * 播放屏幕震动
     */
    public playScreenShake(duration: number, intensity: number): void {
        if (this._isShaking) return;
        this._isShaking = true;

        const canvas = director.getScene()?.getComponentInChildren(Canvas);
        const camera = canvas?.node.getComponentInChildren(Camera);
        
        if (camera) {
            this._originalCameraPos = camera.node.position.clone();
            
            const shakeInterval = 0.02;
            let elapsed = 0;
            
            const shakeCallback = () => {
                elapsed += shakeInterval;
                
                if (elapsed >= duration) {
                    camera.node.setPosition(this._originalCameraPos);
                    this._isShaking = false;
                    this.unschedule(shakeCallback);
                    return;
                }

                const decay = 1 - (elapsed / duration);
                const offsetX = (Math.random() - 0.5) * intensity * 2 * decay;
                const offsetY = (Math.random() - 0.5) * intensity * 2 * decay;
                
                camera.node.setPosition(
                    this._originalCameraPos.x + offsetX,
                    this._originalCameraPos.y + offsetY,
                    this._originalCameraPos.z
                );
            };

            this.schedule(shakeCallback, shakeInterval, Math.ceil(duration / shakeInterval));
        } else {
            // 如果没有摄像机，震动效果容器
            if (this.effectContainer) {
                const originalPos = this.effectContainer.position.clone();
                
                tween(this.effectContainer)
                    .repeat(Math.ceil(duration / 0.05), 
                        tween()
                            .to(0.025, { 
                                position: new Vec3(
                                    originalPos.x + (Math.random() - 0.5) * intensity,
                                    originalPos.y + (Math.random() - 0.5) * intensity,
                                    0
                                )
                            })
                            .to(0.025, { position: originalPos })
                    )
                    .call(() => {
                        this._isShaking = false;
                        this.effectContainer!.setPosition(originalPos);
                    })
                    .start();
            }
        }
    }

    // ==================== 粒子系统 ====================

    /**
     * 获取粒子
     */
    private getParticle(): Particle | null {
        let node = this._particlePool.pop();
        
        if (!node) {
            if (this._activeParticles.length < 200) {
                node = this.createParticleNode();
            } else {
                return null;
            }
        }

        const particle: Particle = {
            node,
            velocity: new Vec3(),
            life: 1,
            maxLife: 1,
            size: 5,
            color: Color.WHITE.clone()
        };

        this._activeParticles.push(particle);
        return particle;
    }

    /**
     * 更新粒子图形
     */
    private updateParticleGraphics(particle: Particle): void {
        const graphics = particle.node.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            graphics.fillColor = particle.color;
            graphics.circle(0, 0, particle.size);
            graphics.fill();
        }
    }

    update(dt: number) {
        // 更新粒子
        for (let i = this._activeParticles.length - 1; i >= 0; i--) {
            const particle = this._activeParticles[i];
            
            particle.life -= dt;
            
            if (particle.life <= 0) {
                // 回收粒子
                particle.node.active = false;
                this._particlePool.push(particle.node);
                this._activeParticles.splice(i, 1);
                continue;
            }

            // 更新位置
            const pos = particle.node.position;
            particle.node.setPosition(
                pos.x + particle.velocity.x * dt,
                pos.y + particle.velocity.y * dt,
                0
            );

            // 应用重力（可选）
            particle.velocity.y -= 200 * dt;

            // 淡出
            const lifeRatio = particle.life / particle.maxLife;
            particle.color.a = Math.floor(255 * lifeRatio);
            particle.size *= 0.98;
            
            this.updateParticleGraphics(particle);
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 获取元素颜色
     */
    public getElementColor(element: ElementType): Color {
        return this._elementColors.get(element) || new Color(255, 255, 255, 255);
    }

    /**
     * 淡出 Graphics
     */
    private fadeOutGraphics(graphics: Graphics, duration: number): void {
        // 由于 Graphics 没有直接的透明度属性，我们销毁节点
        const node = graphics.node;
        tween(node)
            .delay(duration)
            .call(() => {
                node.destroy();
            })
            .start();
    }

    /**
     * 移除特效
     */
    private removeEffect(effectId: string): void {
        const nodes = this._activeEffects.get(effectId);
        if (nodes) {
            for (const node of nodes) {
                if (node.isValid) {
                    node.destroy();
                }
            }
            this._activeEffects.delete(effectId);
        }
    }

    /**
     * 清除所有特效
     */
    public clearAllEffects(): void {
        for (const [effectId, nodes] of this._activeEffects) {
            for (const node of nodes) {
                if (node.isValid) {
                    node.destroy();
                }
            }
        }
        this._activeEffects.clear();

        // 清除粒子
        for (const particle of this._activeParticles) {
            particle.node.active = false;
            this._particlePool.push(particle.node);
        }
        this._activeParticles.length = 0;
    }

    /**
     * 播放技能音效
     */
    private playSkillSound(skill: SkillConfig, element?: ElementType): void {
        const audio = AudioManager.instance;
        if (!audio) return;

        // 根据技能类型播放音效
        audio.playSFX(SFXType.SKILL_CAST);
    }

    onDestroy() {
        this.clearAllEffects();
        
        // 销毁粒子池
        for (const node of this._particlePool) {
            if (node.isValid) {
                node.destroy();
            }
        }
        this._particlePool.length = 0;

        if (SkillEffectRenderer._instance === this) {
            SkillEffectRenderer._instance = null;
        }
    }
}
