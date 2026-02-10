/**
 * Script variable type constants — defines the type system for config params,
 * enum keys/values, and variable types.
 * Ref: lostcity-ref cache/config/ScriptVarType.ts
 */
export const enum ScriptVarType {
    INT = 0,
    BOOLEAN = 1,
    // config references
    SEQ = 6,
    COLOUR = 7,
    LOC_SHAPE = 8,
    COMPONENT = 9,
    IDK = 10,
    MIDI = 11,
    NPC_MODE = 12,
    SYNTH = 14,
    STAT = 15,
    NPC_STAT = 16,
    MAPAREA = 17,
    NAMEDOBJ = 18,
    STRING = 36,
    SPOTANIM = 37,
    NPC = 38,
    INV = 39,
    OBJ = 40,
    LOC = 41,
    CATEGORY = 42,
    STRUCT = 43,
    PARAM = 44,
    ENUM = 45,
    INTERFACE = 46,
    COORD = 47,
    MODEL = 48,
    FONTMETRICS = 49,
    DBROW = 50,
    DBTABLE = 51,
}

const TYPE_NAMES: Record<number, string> = {
    [ScriptVarType.INT]: 'int',
    [ScriptVarType.BOOLEAN]: 'boolean',
    [ScriptVarType.STRING]: 'string',
    [ScriptVarType.SEQ]: 'seq',
    [ScriptVarType.COLOUR]: 'colour',
    [ScriptVarType.LOC_SHAPE]: 'loc_shape',
    [ScriptVarType.COMPONENT]: 'component',
    [ScriptVarType.IDK]: 'idk',
    [ScriptVarType.MIDI]: 'midi',
    [ScriptVarType.NPC_MODE]: 'npc_mode',
    [ScriptVarType.SYNTH]: 'synth',
    [ScriptVarType.STAT]: 'stat',
    [ScriptVarType.NPC_STAT]: 'npc_stat',
    [ScriptVarType.MAPAREA]: 'maparea',
    [ScriptVarType.NAMEDOBJ]: 'namedobj',
    [ScriptVarType.SPOTANIM]: 'spotanim',
    [ScriptVarType.NPC]: 'npc',
    [ScriptVarType.INV]: 'inv',
    [ScriptVarType.OBJ]: 'obj',
    [ScriptVarType.LOC]: 'loc',
    [ScriptVarType.CATEGORY]: 'category',
    [ScriptVarType.STRUCT]: 'struct',
    [ScriptVarType.PARAM]: 'param',
    [ScriptVarType.ENUM]: 'enum',
    [ScriptVarType.INTERFACE]: 'interface',
    [ScriptVarType.COORD]: 'coord',
    [ScriptVarType.MODEL]: 'model',
    [ScriptVarType.FONTMETRICS]: 'fontmetrics',
    [ScriptVarType.DBROW]: 'dbrow',
    [ScriptVarType.DBTABLE]: 'dbtable',
};

export function getTypeName(type: number): string {
    return TYPE_NAMES[type] ?? `unknown(${type})`;
}

export function isStringType(type: number): boolean {
    return type === ScriptVarType.STRING;
}

export function getDefaultValue(type: number): number | string {
    if (type === ScriptVarType.STRING) return '';
    return 0;
}
