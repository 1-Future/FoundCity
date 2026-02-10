import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import { PlayerInfoMask } from '#/engine/entity/Player.js';
import { ClientMessage, IfPlayerDesignMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import { IdkStore } from '#/config/IdkType.js';

class IfPlayerDesignHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as IfPlayerDesignMessage;
        if (!player.allowDesign) return;

        // validate gender
        if (m.gender !== 0 && m.gender !== 1) return;

        // validate body parts (7 idkit slots)
        if (!Array.isArray(m.body) || m.body.length !== 7) return;
        for (let i = 0; i < 7; i++) {
            const idkType = m.gender === 0 ? i : i + 7;
            const idkId = m.body[i];

            // female jaw (type 8) allows -1
            if (idkType === 8 && idkId === -1) continue;

            const idk = IdkStore.get(idkId);
            if (!idk) return;
            if (idk.disable) return;
            if (idk.type !== idkType) return;
        }

        // validate colors (5 color slots)
        if (!Array.isArray(m.colors) || m.colors.length !== 5) return;
        const colorLimits = [24, 16, 16, 5, 24]; // RS225 color limits per slot
        for (let i = 0; i < 5; i++) {
            if (m.colors[i] < 0 || m.colors[i] >= colorLimits[i]) return;
        }

        // apply
        player.gender = m.gender;
        player.body = [...m.body];
        player.colors = [...m.colors];
        player.masks |= PlayerInfoMask.APPEARANCE;
        player.allowDesign = false;
        player.closeModal();
    }
}

registerHandler('if_player_design', new IfPlayerDesignHandler());
