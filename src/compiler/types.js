/**
 * Scratch++ Type System & Coercion Rules
 * Based on scratchpp-spec.md Section 2
 */

export const Type = {
    I32: 'i32',
    I64: 'i64',
    F32: 'f32',
    F64: 'f64',
    BOOL: 'bool',
    TEXTO: 'texto',
    BUFFER: 'buffer',
    FUNCAO: 'função',
    VOID: 'void'
};

export const TYPE_METADATA = {
    [Type.I32]: {
        wasmType: 'i32',
        color: '#3b82f6', // Light Blue
        label: 'i32 (inteiro 32)',
        isNumeric: true,
        isInteger: true
    },
    [Type.I64]: {
        wasmType: 'i64',
        color: '#1d4ed8', // Dark Blue
        label: 'i64 (inteiro 64)',
        isNumeric: true,
        isInteger: true
    },
    [Type.F32]: {
        wasmType: 'f32',
        color: '#10b981', // Light Green
        label: 'f32 (real 32)',
        isNumeric: true,
        isFloat: true
    },
    [Type.F64]: {
        wasmType: 'f64',
        color: '#047857', // Dark Green
        label: 'f64 (real 64)',
        isNumeric: true,
        isFloat: true
    },
    [Type.BOOL]: {
        wasmType: 'i32',
        color: '#f97316', // Orange
        label: 'bool (lógico)',
        isBoolean: true
    },
    [Type.TEXTO]: {
        wasmType: 'i32', // Pointer to heap
        color: '#8b5cf6', // Purple
        label: 'texto (string)',
        isPointer: true
    },
    [Type.BUFFER]: {
        wasmType: 'i32', // Pointer to memory
        color: '#6b7280', // Gray
        label: 'buffer (memória)',
        isPointer: true
    },
    [Type.FUNCAO]: {
        wasmType: 'i32', // Table function index
        color: '#eab308', // Yellow
        label: 'função (referência)',
        isFunction: true
    },
    [Type.VOID]: {
        wasmType: null,
        color: '#475569',
        label: 'vazio'
    }
};

/**
 * Checks if type `from` can be safely widened to `to` automatically.
 * Hierarchy:
 * i32 -> i64 -> f64
 * i32 -> f32 -> f64
 * i64 -> f64
 * bool -> i32 -> i64 / f32 / f64
 */
export function canAutoWiden(from, to) {
    if (from === to) return true;
    if (from === Type.BUFFER && to === Type.I32) return true;
    if (from === Type.I32 && to === Type.BUFFER) return true;
    if (from === Type.BOOL && to === Type.I32) return true;
    if (from === Type.I32 && to === Type.BOOL) return true;
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
