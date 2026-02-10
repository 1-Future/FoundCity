import NetworkPlayer from '#/engine/entity/NetworkPlayer.js';
import World from '#/engine/World.js';
import { ClientMessage, IdleTimerMessage, NoTimeoutMessage, ClientCheatMessage, LogoutMessage, CloseModalMessage, IfButtonMessage, ResumePauseButtonMessage, ResumePCountDialogMessage, EventTrackingMessage, ReportAbuseMessage, RebuildGetMapsMessage, TutorialClickSideMessage } from '#/network/ClientMessage.js';
import { MessageHandler, registerHandler } from '#/network/handler/MessageHandler.js';
import ScriptProvider from '#/engine/script/ScriptProvider.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import { processCheatCommand } from '#/network/handler/ClientCheatHandler.js';

class IdleTimerHandler implements MessageHandler {
    handle(player: NetworkPlayer, _msg: ClientMessage): void {
        player.requestIdleLogout = true;
    }
}

class NoTimeoutHandler implements MessageHandler {
    handle(player: NetworkPlayer, _msg: ClientMessage): void {
        player.lastResponse = World.currentTick;
    }
}

class ClientCheatHandlerImpl implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as ClientCheatMessage;
        if (!m.command || typeof m.command !== 'string') return;
        if (player.staffModLevel < 2) return;

        console.log(`[Cheat] ${player.username}: ::${m.command}`);

        // try built-in admin commands first
        if (processCheatCommand(player, m.command)) return;

        // fallback to script handler
        const handler = ScriptProvider.getByTrigger(ServerTriggerType.CLIENT_CHEAT, 0);
        if (handler) {
            handler({ self: player, args: [m.command] });
        }
    }
}

class LogoutHandler implements MessageHandler {
    handle(player: NetworkPlayer, _msg: ClientMessage): void {
        World.shared.logoutRequests.add(player.pid);
    }
}

class CloseModalHandler implements MessageHandler {
    handle(player: NetworkPlayer, _msg: ClientMessage): void {
        player.closeModal();
    }
}

class IfButtonHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as IfButtonMessage;
        if (typeof m.component !== 'number') return;

        player.lastCom = m.component;

        const handler = ScriptProvider.getByTrigger(ServerTriggerType.IF_BUTTON, m.component);
        if (handler) {
            handler({ self: player });
        }
    }
}

class ResumePauseButtonHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as ResumePauseButtonMessage;
        if (typeof m.choice !== 'number') return;

        // resume a paused dialogue — the choice goes into player state
        // for the EventSystem to pick up
        player.lastSlot = m.choice;
    }
}

class ResumePCountDialogHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as ResumePCountDialogMessage;
        if (typeof m.input !== 'number') return;

        player.lastItem = m.input;
    }
}

class EventTrackingHandler implements MessageHandler {
    handle(_player: NetworkPlayer, _msg: ClientMessage): void {
        // event tracking data is accepted but not stored in this implementation
    }
}

class ReportAbuseHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as ReportAbuseMessage;
        if (!m.target || typeof m.target !== 'string') return;
        console.log(`[Report] ${player.username} reported ${m.target} for reason ${m.reason}`);
    }
}

class RebuildGetMapsHandler implements MessageHandler {
    handle(_player: NetworkPlayer, _msg: ClientMessage): void {
        // client requests map data for zones — not applicable for JSON maps
        // maps are loaded client-side from JSON files
    }
}

class TutorialClickSideHandler implements MessageHandler {
    handle(player: NetworkPlayer, msg: ClientMessage): void {
        const m = msg as TutorialClickSideMessage;
        if (typeof m.tab !== 'number') return;

        const handler = ScriptProvider.getByTrigger(ServerTriggerType.TUTORIAL_CLICKSIDE, 0);
        if (handler) {
            handler({ self: player, args: [m.tab] });
        }
    }
}

registerHandler('idle_timer', new IdleTimerHandler());
registerHandler('no_timeout', new NoTimeoutHandler());
registerHandler('client_cheat', new ClientCheatHandlerImpl());
registerHandler('logout', new LogoutHandler());
registerHandler('close_modal', new CloseModalHandler());
registerHandler('if_button', new IfButtonHandler());
registerHandler('resume_pause_button', new ResumePauseButtonHandler());
registerHandler('resume_p_count_dialog', new ResumePCountDialogHandler());
registerHandler('event_tracking', new EventTrackingHandler());
registerHandler('report_abuse', new ReportAbuseHandler());
registerHandler('rebuild_get_maps', new RebuildGetMapsHandler());
registerHandler('tutorial_click_side', new TutorialClickSideHandler());
