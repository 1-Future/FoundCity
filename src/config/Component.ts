import ConfigStore from '#/config/ConfigStore.js';

/**
 * Component (Interface) type — UI component definitions.
 * Ref: lostcity-ref cache/config/Component.ts (327 lines)
 */

export const enum ComType {
    LAYER = 0,
    // 1 = unused
    INVENTORY = 2,
    RECT = 3,
    TEXT = 4,
    SPRITE = 5,
    MODEL = 6,
    INVENTORY_TEXT = 7,
}

export const enum ComActionTarget {
    NONE = 0,
    TARGET_OBJ = 1,
    TARGET_NPC = 2,
    TARGET_LOC = 3,
    TARGET_PLAYER = 4,
    TARGET_INV = 5,
    TARGET_COM = 6,
}

export interface ComponentType {
    id: number;
    debugname?: string;
    rootLayer: number;          // parent component ID (-1 = root)
    type: ComType;
    buttonType: number;
    // positioning
    x: number;
    y: number;
    width: number;
    height: number;
    // scroll
    scroll: number;
    // appearance
    colour: number;
    overColour: number;
    fill: boolean;
    transparencyTop: number;
    transparencyBot: number;
    // children
    childId: number[];
    childX: number[];
    childY: number[];
    // text
    text: string;
    overText: string;
    font: number;
    center: boolean;
    shadowed: boolean;
    // model
    model: number;
    overModel: number;
    modelZoom: number;
    modelXan: number;
    modelYan: number;
    anim: number;
    // sprite
    graphic: number;
    overGraphic: number;
    // inventory
    draggable: boolean;
    interactable: boolean;
    usable: boolean;
    marginX: number;
    marginY: number;
    inventorySlotOffsetX: number[];
    inventorySlotOffsetY: number[];
    inventorySlotGraphic: number[];
    inventoryOptions: (string | null)[];
    // action
    actionTarget: ComActionTarget;
    action: string;
    actionVerb: string;
    // option
    option: string;
    // scripts (condition/state change scripts)
    scriptComparator: number[];
    scriptOperand: number[];
    scripts: number[][];
}

export const ComponentStore = new ConfigStore<ComponentType>();
