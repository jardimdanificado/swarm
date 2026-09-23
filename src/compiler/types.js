/**
 * Scratch++ Type System & Coercion Rules
 * 100% WebAssembly 2.0 (W3C Recommendation)
 */

export const Type = {
    I32: 'i32',
    I64: 'i64',
    F32: 'f32',
    F64: 'f64',
    V128: 'v128',
    FUNCREF: 'funcref',
    EXTERNREF: 'externref',
    BOOL: 'bool',
    TEXTO: 'texto',
    BUFFER: 'buffer',
    FUNCAO: 'função', // alias for funcref
    VOID: 'void'
};

export const TYPE_METADATA = {
    [Type.I32]: {
        wasmType: 'i32',
        wasmByte: 0x7F,
        color: '#3b82f6', // Light Blue
        label: 'i32 (inteiro 32)',
        isNumeric: true,
        isInteger: true
    },
    [Type.I64]: {
        wasmType: 'i64',
        wasmByte: 0x7E,
        color: '#1d4ed8', // Dark Blue
        label: 'i64 (inteiro 64)',
        isNumeric: true,
        isInteger: true
    },
    [Type.F32]: {
        wasmType: 'f32',
        wasmByte: 0x7D,
        color: '#10b981', // Light Green
        label: 'f32 (real 32)',
        isNumeric: true,
        isFloat: true
    },
    [Type.F64]: {
        wasmType: 'f64',
        wasmByte: 0x7C,
        color: '#047857', // Dark Green
        label: 'f64 (real 64)',
        isNumeric: true,
        isFloat: true
    },
    [Type.V128]: {
        wasmType: 'v128',
        wasmByte: 0x7B,
        color: '#ec4899', // Pink / Vector
        label: 'v128 (vetor SIMD 128-bit)',
        isVector: true
    },
    [Type.FUNCREF]: {
        wasmType: 'funcref',
        wasmByte: 0x70,
        color: '#eab308', // Yellow
        label: 'funcref (referência de função)',
        isReference: true,
        isFunction: true
    },
    [Type.EXTERNREF]: {
        wasmType: 'externref',
        wasmByte: 0x6F,
        color: '#a855f7', // Violet
        label: 'externref (referência externa host/JS)',
        isReference: true
    },
    [Type.BOOL]: {
        wasmType: 'i32',
        wasmByte: 0x7F,
        color: '#f97316', // Orange
        label: 'bool (lógico)',
        isBoolean: true
    },
    [Type.TEXTO]: {
        wasmType: 'i32', // Pointer to heap
        wasmByte: 0x7F,
        color: '#8b5cf6', // Purple
        label: 'texto (string)',
        isPointer: true
    },
    [Type.BUFFER]: {
        wasmType: 'i32', // Pointer to memory
        wasmByte: 0x7F,
        color: '#6b7280', // Gray
        label: 'buffer (memória)',
        isPointer: true
    },
    [Type.FUNCAO]: {
        wasmType: 'funcref',
        wasmByte: 0x70,
        color: '#eab308', // Yellow
        label: 'função (referência)',
        isFunction: true
    },
    [Type.VOID]: {
        wasmType: null,
        wasmByte: 0x40, // Block empty result
        color: '#475569',
        label: 'vazio'
    }
};

/**
 * Checks if type `from` can be safely widened to `to` automatically.
 */
export function canAutoWiden(from, to) {
    if (from === to) return true;
    if (from === Type.BUFFER && to === Type.I32) return true;
    if (from === Type.I32 && to === Type.BUFFER) return true;
    if (from === Type.BOOL && to === Type.I32) return true;
    if (from === Type.I32 && to === Type.BOOL) return true;
    if (from === Type.FUNCAO && to === Type.FUNCREF) return true;
    if (from === Type.FUNCREF && to === Type.FUNCAO) return true;
    if (from === Type.BOOL) {
        if (to === Type.I32 || to === Type.I64 || to === Type.F32 || to === Type.F64) return true;
    }
    if (from === Type.I32) {
        if (to === Type.I64 || to === Type.F32 || to === Type.F64) return true;
    }
    if (from === Type.I64) {
        if (to === Type.F64) return true;
    }
    if (from === Type.F32) {
        if (to === Type.F64) return true;
    }
    return false;
}

/**
 * Find common widened type for two types in a binary operation (e.g., i32 + f64 -> f64).
 */
export function findCommonType(typeA, typeB) {
    if (typeA === typeB) return typeA;
    if (canAutoWiden(typeA, typeB)) return typeB;
    if (canAutoWiden(typeB, typeA)) return typeA;
    return null;
}
