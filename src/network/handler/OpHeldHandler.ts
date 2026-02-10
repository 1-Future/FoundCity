import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { ClientMessage, OpHeldMessage, OpHeldUMessage, OpHeldTMessage, InvButtonMessage, InvButtonDMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import ScriptProvider from '#/engine/script/ScriptProvider.js';

class OpHeldHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpHeldMessage;
        if (typeof m.objId !== 'number' || typeof m.slot !== 'number' || typeof m.op !== 'number') return;
        if (m.op < 1 || m.op > 5) return;

        player.lastItem = m.objId;
        player.lastSlot = m.slot;
        player.lastCom = m.component;

        const trigger = ServerTriggerType.OPHELD1 + (m.op - 1);
        const handler = ScriptProvider.getByTrigger(trigger, m.objId);
        if (handler) {
            handler({ self: player });
        }
    }
}

class OpHeldUHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpHeldUMessage;
        if (typeof m.objId !== 'number' || typeof m.slot !== 'number') return;

        player.lastItem = m.objId;
        player.lastSlot = m.slot;
        player.lastUseItem = m.targetObjId;
        player.lastUseSlot = m.targetSlot;

        const handler = ScriptProvider.getByTrigger(ServerTriggerType.OPHELDU, m.objId);
        if (handler) {
            handler({ self: player });
        }
    }
}

class OpHeldTHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as OpHeldTMessage;
        if (typeof m.objId !== 'number' || typeof m.slot !== 'number') return;

        player.lastItem = m.objId;
        player.lastSlot = m.slot;
        player.lastCom = m.spellComponent;

        const handler = ScriptProvider.getByTrigger(ServerTriggerType.OPHELDT, m.objId);
        if (handler) {
            handler({ self: player });
        }
    }
}

class InvButtonHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as InvButtonMessage;
        if (typeof m.objId !== 'number' || typeof m.slot !== 'number') return;

        player.lastItem = m.objId;
        player.lastSlot = m.slot;
        player.lastCom = m.component;

        const handler = ScriptProvider.getByTrigger(ServerTriggerType.INV_BUTTON1, m.component);
        if (handler) {
            handler({ self: player });
        }
    }
}

class InvButtonDHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as InvButtonDMessage;
        if (typeof m.fromSlot !== 'number' || typeof m.toSlot !== 'number') return;

        player.lastCom = m.component;
        player.lastSlot = m.fromSlot;
        player.lastTargetSlot = m.toSlot;

        const handler = ScriptProvider.getByTrigger(ServerTriggerType.INV_BUTTOND, m.component);
        if (handler) {
            handler({ self: player });
        }
    }
}

registerHandler('op_held', new OpHeldHandler());
registerHandler('op_held_u', new OpHeldUHandler());
registerHandler('op_held_t', new OpHeldTHandler());
registerHandler('inv_button', new InvButtonHandler());
registerHandler('inv_button_d', new InvButtonDHandler());
