import { _decorator, Component, Node, Graphics, Color, Vec2, UITransform } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 涂鸦风格图形绘制工具
 * Doodle Style Graphics Drawing Utility
 * 
 * 用程序化方式生成手绘/涂鸦风格的UI元素
 */
@ccclass('DoodleGraphics')
export class DoodleGraphics extends Component {
    
    /**
     * 绘制涂鸦风格的圆形（角色头像框）
     */
    public static drawDoodleCircle(
        graphics: Graphics, 
        x: number, 
        y: number, 
        radius: number, 
        fillColor: Color,
        strokeColor: Color,
        lineWidth: number = 3
    ): void {
        graphics.fillColor = fillColor;
        graphics.strokeColor = strokeColor;
        graphics.lineWidth = lineWidth;

        // 用不规则的贝塞尔曲线模拟手绘圆
        const segments = 8;
        const angleStep = (Math.PI * 2) / segments;
        
        graphics.moveTo(
            x + radius + this.wobble(3),
            y + this.wobble(3)
        );

        for (let i = 1; i <= segments; i++) {
            const angle = i * angleStep;
            const nextAngle = (i + 1) * angleStep;
            
            const wobbleR = radius + this.wobble(radius * 0.08);
            const cpWobble = radius * 0.15;
            
            const endX = x + Math.cos(angle) * wobbleR;
            const endY = y + Math.sin(angle) * wobbleR;
            
            const cpAngle = angle - angleStep / 2;
            const cpR = radius * 1.1;
            const cpX = x + Math.cos(cpAngle) * cpR + this.wobble(cpWobble);
            const cpY = y + Math.sin(cpAngle) * cpR + this.wobble(cpWobble);

            graphics.quadraticCurveTo(cpX, cpY, endX + this.wobble(2), endY + this.wobble(2));
        }

        graphics.close();
        graphics.fill();
        graphics.stroke();
    }

    /**
     * 绘制涂鸦风格的矩形（按钮、面板）
     */
    public static drawDoodleRect(
        graphics: Graphics,
        x: number,
        y: number,
        width: number,
        height: number,
        fillColor: Color,
        strokeColor: Color,
        lineWidth: number = 3,
        cornerRadius: number = 0
    ): void {
        graphics.fillColor = fillColor;
        graphics.strokeColor = strokeColor;
        graphics.lineWidth = lineWidth;

        const wobbleAmount = 3;
        const hw = width / 2;
        const hh = height / 2;

        if (cornerRadius > 0) {
            // 圆角矩形
            this.drawDoodleRoundRect(graphics, x, y, width, height, cornerRadius, wobbleAmount);
        } else {
            // 直角矩形
            graphics.moveTo(x - hw + this.wobble(wobbleAmount), y - hh + this.wobble(wobbleAmount));
            
            // 顶边（抖动线条）
            this.doodleLine(graphics, x - hw, y - hh, x + hw, y - hh, wobbleAmount);
            // 右边
            this.doodleLine(graphics, x + hw, y - hh, x + hw, y + hh, wobbleAmount);
            // 底边
            this.doodleLine(graphics, x + hw, y + hh, x - hw, y + hh, wobbleAmount);
            // 左边
            this.doodleLine(graphics, x - hw, y + hh, x - hw, y - hh, wobbleAmount);
        }

        graphics.close();
        graphics.fill();
        graphics.stroke();
    }

    /**
     * 绘制涂鸦风格的圆角矩形
     */
    private static drawDoodleRoundRect(
        graphics: Graphics,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number,
        wobble: number
    ): void {
        const hw = width / 2;
        const hh = height / 2;
        const r = Math.min(radius, hw, hh);

        graphics.moveTo(x - hw + r + this.wobble(wobble), y - hh + this.wobble(wobble));

        // 顶边
        this.doodleLine(graphics, x - hw + r, y - hh, x + hw - r, y - hh, wobble);
        // 右上角
        graphics.quadraticCurveTo(
            x + hw + this.wobble(wobble), y - hh + this.wobble(wobble),
            x + hw + this.wobble(wobble), y - hh + r + this.wobble(wobble)
        );
        // 右边
        this.doodleLine(graphics, x + hw, y - hh + r, x + hw, y + hh - r, wobble);
        // 右下角
        graphics.quadraticCurveTo(
            x + hw + this.wobble(wobble), y + hh + this.wobble(wobble),
            x + hw - r + this.wobble(wobble), y + hh + this.wobble(wobble)
        );
        // 底边
        this.doodleLine(graphics, x + hw - r, y + hh, x - hw + r, y + hh, wobble);
        // 左下角
        graphics.quadraticCurveTo(
            x - hw + this.wobble(wobble), y + hh + this.wobble(wobble),
            x - hw + this.wobble(wobble), y + hh - r + this.wobble(wobble)
        );
        // 左边
        this.doodleLine(graphics, x - hw, y + hh - r, x - hw, y - hh + r, wobble);
        // 左上角
        graphics.quadraticCurveTo(
            x - hw + this.wobble(wobble), y - hh + this.wobble(wobble),
            x - hw + r + this.wobble(wobble), y - hh + this.wobble(wobble)
        );
    }

    /**
     * 绘制涂鸦风格的线条
     */
    private static doodleLine(
        graphics: Graphics,
        x1: number, y1: number,
        x2: number, y2: number,
        wobbleAmount: number
    ): void {
        const segments = 3;
        const dx = (x2 - x1) / segments;
        const dy = (y2 - y1) / segments;

        for (let i = 1; i <= segments; i++) {
            const x = x1 + dx * i + (i < segments ? this.wobble(wobbleAmount) : 0);
            const y = y1 + dy * i + (i < segments ? this.wobble(wobbleAmount) : 0);
            graphics.lineTo(x, y);
        }
    }

    /**
     * 绘制涂鸦风格的星星（稀有度标识）
     */
    public static drawDoodleStar(
        graphics: Graphics,
        x: number,
        y: number,
        outerRadius: number,
        innerRadius: number,
        fillColor: Color,
        strokeColor: Color,
        points: number = 5
    ): void {
        graphics.fillColor = fillColor;
        graphics.strokeColor = strokeColor;
        graphics.lineWidth = 2;

        const angleStep = Math.PI / points;
        let angle = -Math.PI / 2;

        graphics.moveTo(
            x + Math.cos(angle) * outerRadius + this.wobble(2),
            y + Math.sin(angle) * outerRadius + this.wobble(2)
        );

        for (let i = 0; i < points * 2; i++) {
            angle += angleStep;
            const radius = i % 2 === 0 ? innerRadius : outerRadius;
            graphics.lineTo(
                x + Math.cos(angle) * radius + this.wobble(2),
                y + Math.sin(angle) * radius + this.wobble(2)
            );
        }

        graphics.close();
        graphics.fill();
        graphics.stroke();
    }

    /**
     * 绘制涂鸦风格的剑（武器图标）
     */
    public static drawDoodleSword(
        graphics: Graphics,
        x: number,
        y: number,
        size: number,
        color: Color
    ): void {
        graphics.strokeColor = color;
        graphics.fillColor = color;
        graphics.lineWidth = 3;

        const w = this.wobble.bind(this);
        const s = size;

        // 剑身
        graphics.moveTo(x + w(2), y - s * 0.4 + w(2));
        graphics.lineTo(x - s * 0.08 + w(1), y + s * 0.3 + w(1));
        graphics.lineTo(x + w(1), y + s * 0.35 + w(1));
        graphics.lineTo(x + s * 0.08 + w(1), y + s * 0.3 + w(1));
        graphics.close();
        graphics.fill();

        // 剑柄护手
        graphics.moveTo(x - s * 0.2 + w(2), y + s * 0.32 + w(1));
        graphics.lineTo(x + s * 0.2 + w(2), y + s * 0.32 + w(1));
        graphics.stroke();

        // 剑柄
        graphics.moveTo(x + w(1), y + s * 0.35 + w(1));
        graphics.lineTo(x + w(1), y + s * 0.5 + w(1));
        graphics.stroke();

        // 剑柄底部
        graphics.fillColor = new Color(100, 80, 60);
        graphics.beginPath();
        graphics.arc(x, y + s * 0.5, s * 0.05, 0, Math.PI * 2);
        graphics.fill();
    }

    /**
     * 绘制涂鸦风格的盾牌（护甲图标）
     */
    public static drawDoodleShield(
        graphics: Graphics,
        x: number,
        y: number,
        size: number,
        color: Color
    ): void {
        graphics.fillColor = color;
        graphics.strokeColor = new Color(
            Math.max(0, color.r - 50),
            Math.max(0, color.g - 50),
            Math.max(0, color.b - 50)
        );
        graphics.lineWidth = 3;

        const s = size;
        const w = this.wobble.bind(this);

        // 盾牌外形
        graphics.moveTo(x + w(2), y - s * 0.4 + w(2));
        graphics.quadraticCurveTo(
            x + s * 0.4 + w(2), y - s * 0.35 + w(2),
            x + s * 0.35 + w(2), y + w(2)
        );
        graphics.quadraticCurveTo(
            x + s * 0.25 + w(2), y + s * 0.4 + w(2),
            x + w(2), y + s * 0.5 + w(2)
        );
        graphics.quadraticCurveTo(
            x - s * 0.25 + w(2), y + s * 0.4 + w(2),
            x - s * 0.35 + w(2), y + w(2)
        );
        graphics.quadraticCurveTo(
            x - s * 0.4 + w(2), y - s * 0.35 + w(2),
            x + w(2), y - s * 0.4 + w(2)
        );

        graphics.fill();
        graphics.stroke();

        // 盾牌装饰线
        graphics.strokeColor = new Color(255, 255, 255, 100);
        graphics.lineWidth = 2;
        graphics.moveTo(x + w(1), y - s * 0.2 + w(1));
        graphics.lineTo(x + w(1), y + s * 0.3 + w(1));
        graphics.stroke();
    }

    /**
     * 绘制涂鸦风格的戒指（饰品图标）
     */
    public static drawDoodleRing(
        graphics: Graphics,
        x: number,
        y: number,
        size: number,
        color: Color
    ): void {
        const s = size;

        // 戒指主体
        graphics.strokeColor = color;
        graphics.lineWidth = s * 0.15;
        
        // 椭圆环
        this.drawDoodleEllipse(graphics, x, y + s * 0.1, s * 0.3, s * 0.2);
        graphics.stroke();

        // 宝石
        graphics.fillColor = new Color(100, 200, 255);
        graphics.strokeColor = new Color(50, 150, 200);
        graphics.lineWidth = 2;
        
        this.drawDoodleCircle(
            graphics, x, y - s * 0.15, s * 0.15,
            new Color(100, 200, 255),
            new Color(50, 150, 200),
            2
        );
    }

    /**
     * 绘制涂鸦风格的椭圆
     */
    private static drawDoodleEllipse(
        graphics: Graphics,
        x: number,
        y: number,
        rx: number,
        ry: number
    ): void {
        const segments = 12;
        const angleStep = (Math.PI * 2) / segments;

        graphics.moveTo(x + rx + this.wobble(2), y + this.wobble(2));

        for (let i = 1; i <= segments; i++) {
            const angle = i * angleStep;
            const wx = x + Math.cos(angle) * rx + this.wobble(2);
            const wy = y + Math.sin(angle) * ry + this.wobble(2);
            graphics.lineTo(wx, wy);
        }
    }

    /**
     * 绘制涂鸦风格的火焰（火元素图标）
     */
    public static drawDoodleFlame(
        graphics: Graphics,
        x: number,
        y: number,
        size: number
    ): void {
        const s = size;
        const w = this.wobble.bind(this);

        // 外焰（橙色）
        graphics.fillColor = new Color(255, 150, 50);
        graphics.beginPath();
        graphics.moveTo(x + w(2), y + s * 0.4 + w(2));
        graphics.quadraticCurveTo(x - s * 0.3 + w(3), y + w(3), x - s * 0.15 + w(2), y - s * 0.2 + w(2));
        graphics.quadraticCurveTo(x - s * 0.1 + w(2), y - s * 0.1 + w(2), x + w(2), y - s * 0.45 + w(2));
        graphics.quadraticCurveTo(x + s * 0.1 + w(2), y - s * 0.1 + w(2), x + s * 0.15 + w(2), y - s * 0.2 + w(2));
        graphics.quadraticCurveTo(x + s * 0.3 + w(3), y + w(3), x + w(2), y + s * 0.4 + w(2));
        graphics.fill();

        // 内焰（黄色）
        graphics.fillColor = new Color(255, 220, 100);
        graphics.beginPath();
        graphics.moveTo(x + w(1), y + s * 0.25 + w(1));
        graphics.quadraticCurveTo(x - s * 0.12 + w(2), y + s * 0.05 + w(2), x + w(1), y - s * 0.25 + w(1));
        graphics.quadraticCurveTo(x + s * 0.12 + w(2), y + s * 0.05 + w(2), x + w(1), y + s * 0.25 + w(1));
        graphics.fill();
    }

    /**
     * 绘制涂鸦风格的水滴（水元素图标）
     */
    public static drawDoodleWater(
        graphics: Graphics,
        x: number,
        y: number,
        size: number
    ): void {
        const s = size;
        const w = this.wobble.bind(this);

        graphics.fillColor = new Color(100, 180, 255);
        graphics.strokeColor = new Color(50, 130, 200);
        graphics.lineWidth = 2;

        graphics.beginPath();
        graphics.moveTo(x + w(2), y - s * 0.4 + w(2));
        graphics.quadraticCurveTo(x + s * 0.35 + w(3), y + s * 0.1 + w(3), x + s * 0.25 + w(2), y + s * 0.3 + w(2));
        graphics.quadraticCurveTo(x + w(2), y + s * 0.45 + w(2), x - s * 0.25 + w(2), y + s * 0.3 + w(2));
        graphics.quadraticCurveTo(x - s * 0.35 + w(3), y + s * 0.1 + w(3), x + w(2), y - s * 0.4 + w(2));
        graphics.fill();
        graphics.stroke();

        // 高光
        graphics.fillColor = new Color(200, 230, 255, 180);
        graphics.beginPath();
        graphics.arc(x - s * 0.1, y, s * 0.08, 0, Math.PI * 2);
        graphics.fill();
    }

    /**
     * 绘制涂鸦风格的闪电（雷元素图标）
     */
    public static drawDoodleLightning(
        graphics: Graphics,
        x: number,
        y: number,
        size: number
    ): void {
        const s = size;
        const w = this.wobble.bind(this);

        graphics.fillColor = new Color(255, 255, 100);
        graphics.strokeColor = new Color(200, 180, 50);
        graphics.lineWidth = 2;

        graphics.beginPath();
        graphics.moveTo(x + s * 0.1 + w(2), y - s * 0.45 + w(2));
        graphics.lineTo(x - s * 0.15 + w(2), y - s * 0.05 + w(2));
        graphics.lineTo(x + s * 0.05 + w(2), y - s * 0.05 + w(2));
        graphics.lineTo(x - s * 0.1 + w(2), y + s * 0.45 + w(2));
        graphics.lineTo(x + s * 0.15 + w(2), y + s * 0.05 + w(2));
        graphics.lineTo(x - s * 0.05 + w(2), y + s * 0.05 + w(2));
        graphics.close();
        graphics.fill();
        graphics.stroke();
    }

    /**
     * 绘制涂鸦风格的心形（生命图标）
     */
    public static drawDoodleHeart(
        graphics: Graphics,
        x: number,
        y: number,
        size: number,
        color: Color
    ): void {
        const s = size;
        const w = this.wobble.bind(this);

        graphics.fillColor = color;
        graphics.strokeColor = new Color(
            Math.max(0, color.r - 50),
            Math.max(0, color.g - 50),
            Math.max(0, color.b - 50)
        );
        graphics.lineWidth = 2;

        graphics.beginPath();
        graphics.moveTo(x + w(2), y + s * 0.35 + w(2));
        graphics.quadraticCurveTo(x - s * 0.4 + w(3), y + s * 0.1 + w(3), x - s * 0.35 + w(2), y - s * 0.15 + w(2));
        graphics.quadraticCurveTo(x - s * 0.3 + w(2), y - s * 0.4 + w(2), x + w(2), y - s * 0.2 + w(2));
        graphics.quadraticCurveTo(x + s * 0.3 + w(2), y - s * 0.4 + w(2), x + s * 0.35 + w(2), y - s * 0.15 + w(2));
        graphics.quadraticCurveTo(x + s * 0.4 + w(3), y + s * 0.1 + w(3), x + w(2), y + s * 0.35 + w(2));
        graphics.fill();
        graphics.stroke();
    }

    /**
     * 绘制涂鸦风格的按钮
     */
    public static drawDoodleButton(
        graphics: Graphics,
        x: number,
        y: number,
        width: number,
        height: number,
        color: Color,
        isPressed: boolean = false
    ): void {
        const shadowOffset = isPressed ? 2 : 4;
        
        // 阴影
        graphics.fillColor = new Color(0, 0, 0, 80);
        this.drawDoodleRect(
            graphics, x + shadowOffset, y - shadowOffset, 
            width, height,
            new Color(0, 0, 0, 80),
            new Color(0, 0, 0, 0),
            0, 8
        );

        // 按钮主体
        const mainColor = isPressed ? 
            new Color(Math.max(0, color.r - 30), Math.max(0, color.g - 30), Math.max(0, color.b - 30)) :
            color;
        const borderColor = new Color(
            Math.max(0, color.r - 60),
            Math.max(0, color.g - 60),
            Math.max(0, color.b - 60)
        );

        this.drawDoodleRect(
            graphics, x, y,
            width, height,
            mainColor,
            borderColor,
            3, 8
        );
    }

    /**
     * 绘制进度条
     */
    public static drawDoodleProgressBar(
        graphics: Graphics,
        x: number,
        y: number,
        width: number,
        height: number,
        progress: number,
        bgColor: Color,
        fillColor: Color
    ): void {
        // 背景
        this.drawDoodleRect(
            graphics, x, y, width, height,
            bgColor,
            new Color(80, 80, 80),
            2, 4
        );

        // 填充
        if (progress > 0) {
            const fillWidth = (width - 6) * Math.min(1, progress);
            this.drawDoodleRect(
                graphics, x - (width - fillWidth) / 2 + 3, y, 
                fillWidth, height - 6,
                fillColor,
                new Color(0, 0, 0, 0),
                0, 2
            );
        }
    }

    /**
     * 生成随机抖动值
     */
    private static wobble(amount: number): number {
        return (Math.random() - 0.5) * amount * 2;
    }

    /**
     * 创建一个预设的角色头像框
     */
    public static createCharacterFrame(
        parent: Node,
        size: number,
        rarityColor: Color,
        elementColor: Color
    ): Node {
        const node = new Node('CharacterFrame');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(size, size);
        
        const graphics = node.addComponent(Graphics);

        // 外框（稀有度颜色）
        this.drawDoodleCircle(
            graphics, 0, 0, size / 2,
            new Color(40, 40, 50, 230),
            rarityColor,
            4
        );

        // 内框（元素颜色）
        this.drawDoodleCircle(
            graphics, 0, 0, size / 2 - 8,
            elementColor,
            new Color(0, 0, 0, 0),
            0
        );

        // 角色占位
        this.drawDoodleCircle(
            graphics, 0, 0, size / 2 - 15,
            new Color(255, 255, 255, 200),
            new Color(0, 0, 0, 0),
            0
        );

        // 简易表情
        graphics.fillColor = new Color(50, 50, 50);
        graphics.circle(-size * 0.12, size * 0.05, size * 0.06);
        graphics.circle(size * 0.12, size * 0.05, size * 0.06);
        graphics.fill();

        parent.addChild(node);
        return node;
    }

    /**
     * 创建装备图标
     */
    public static createEquipmentIcon(
        parent: Node,
        type: 'weapon' | 'armor' | 'accessory',
        size: number,
        rarityColor: Color
    ): Node {
        const node = new Node('EquipmentIcon');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(size, size);
        
        const graphics = node.addComponent(Graphics);

        // 背景
        this.drawDoodleRect(
            graphics, 0, 0, size, size,
            new Color(50, 50, 60, 230),
            rarityColor,
            3, 8
        );

        // 图标
        const iconSize = size * 0.6;
        switch (type) {
            case 'weapon':
                this.drawDoodleSword(graphics, 0, 0, iconSize, new Color(200, 200, 220));
                break;
            case 'armor':
                this.drawDoodleShield(graphics, 0, 0, iconSize, new Color(150, 150, 180));
                break;
            case 'accessory':
                this.drawDoodleRing(graphics, 0, 0, iconSize, new Color(255, 215, 0));
                break;
        }

        parent.addChild(node);
        return node;
    }

    /**
     * 创建元素图标
     */
    public static createElementIcon(
        parent: Node,
        element: 'fire' | 'water' | 'wind' | 'thunder' | 'light' | 'dark',
        size: number
    ): Node {
        const node = new Node('ElementIcon');
        const transform = node.addComponent(UITransform);
        transform.setContentSize(size, size);
        
        const graphics = node.addComponent(Graphics);

        switch (element) {
            case 'fire':
                this.drawDoodleFlame(graphics, 0, 0, size * 0.8);
                break;
            case 'water':
                this.drawDoodleWater(graphics, 0, 0, size * 0.8);
                break;
            case 'thunder':
                this.drawDoodleLightning(graphics, 0, 0, size * 0.8);
                break;
            default:
                // 其他元素使用简单圆形
                const colors: { [key: string]: Color } = {
                    'wind': new Color(150, 255, 150),
                    'light': new Color(255, 255, 200),
                    'dark': new Color(150, 100, 200)
                };
                this.drawDoodleCircle(
                    graphics, 0, 0, size * 0.35,
                    colors[element] || new Color(200, 200, 200),
                    new Color(100, 100, 100),
                    2
                );
        }

        parent.addChild(node);
        return node;
    }

    /**
     * 创建星级显示
     */
    public static createStarRating(
        parent: Node,
        stars: number,
        maxStars: number,
        starSize: number
    ): Node {
        const node = new Node('StarRating');
        const totalWidth = maxStars * (starSize + 5);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(totalWidth, starSize);
        
        const graphics = node.addComponent(Graphics);

        for (let i = 0; i < maxStars; i++) {
            const x = -totalWidth / 2 + starSize / 2 + i * (starSize + 5);
            const filled = i < stars;
            
            this.drawDoodleStar(
                graphics, x, 0, starSize / 2, starSize / 4,
                filled ? new Color(255, 215, 0) : new Color(80, 80, 80),
                filled ? new Color(200, 160, 0) : new Color(60, 60, 60)
            );
        }

        parent.addChild(node);
        return node;
    }
}
