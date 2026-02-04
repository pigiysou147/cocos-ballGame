import { _decorator, Component, Node, BoxCollider2D, Collider2D, Contact2DType, IPhysics2DContact, RigidBody2D, ERigidBody2DType, Vec2, Vec3 } from 'cc';
import { Character } from './Character';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

/**
 * 死区类 - 角色掉出场景的区域
 * Dead Zone - Area where character falls out of the scene
 */
@ccclass('DeadZone')
export class DeadZone extends Component {
    @property({ tooltip: '死区宽度' })
    public zoneWidth: number = 800;

    @property({ tooltip: '死区高度' })
    public zoneHeight: number = 50;

    @property({ tooltip: '每次掉落造成的伤害' })
    public damage: number = 20;

    @property({ tooltip: '重生位置' })
    public respawnPosition: Vec3 = new Vec3(0, 200, 0);

    @property({ tooltip: '是否直接结束游戏' })
    public instantGameOver: boolean = false;

    private _rigidBody: RigidBody2D | null = null;
    private _collider: BoxCollider2D | null = null;

    onLoad() {
        // 添加静态刚体
        this._rigidBody = this.getComponent(RigidBody2D);
        if (!this._rigidBody) {
            this._rigidBody = this.addComponent(RigidBody2D);
        }
        this._rigidBody.type = ERigidBody2DType.Static;

        // 添加碰撞器
        this._collider = this.getComponent(BoxCollider2D);
        if (!this._collider) {
            this._collider = this.addComponent(BoxCollider2D);
        }
        this._collider.size.width = this.zoneWidth;
        this._collider.size.height = this.zoneHeight;
        this._collider.sensor = true; // 设置为触发器，不产生物理碰撞
        this._collider.apply();

        // 注册碰撞回调
        this._collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
    }

    /**
     * 碰撞开始回调
     */
    private onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null): void {
        const character = otherCollider.node.getComponent(Character);
        if (character) {
            this.onCharacterFall(character, otherCollider.node);
        }
    }

    /**
     * 角色掉落处理
     */
    private onCharacterFall(character: Character, characterNode: Node): void {
        console.log(`${character.characterName} 掉入死区！`);

        if (this.instantGameOver) {
            // 直接结束游戏
            if (GameManager.instance) {
                GameManager.instance.gameOver();
            }
        } else {
            // 造成伤害并重生
            character.takeDamage(this.damage);

            // 如果角色还活着，重生
            if (character.currentHP > 0) {
                this.respawnCharacter(characterNode);
            }
        }

        // 重置连击
        if (GameManager.instance) {
            GameManager.instance.resetCombo();
        }
    }

    /**
     * 重生角色
     */
    private respawnCharacter(characterNode: Node): void {
        // 重置位置
        characterNode.setPosition(this.respawnPosition);

        // 重置速度
        const rigidBody = characterNode.getComponent(RigidBody2D);
        if (rigidBody) {
            rigidBody.linearVelocity = new Vec2(0, 0);
        }

        // 重新发射
        const character = characterNode.getComponent(Character);
        if (character) {
            // 给一个向上的初始速度
            this.scheduleOnce(() => {
                character.launch(new Vec2(0, 1));
            }, 0.1);
        }

        console.log(`${characterNode.name} 重生于 (${this.respawnPosition.x}, ${this.respawnPosition.y})`);
    }

    onDestroy() {
        if (this._collider) {
            this._collider.off(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }
    }
}
