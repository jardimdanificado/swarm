/**
 * Scratch++ Intermediate Representation (IR)
 * Complete 100% WebAssembly 1.0 Instruction Set
 */

import { Type, TYPE_METADATA } from './types.js';
import { ASTNodeType } from './ast.js';

export const IROp = {
    // Constants
    CONST_I32: 'const_i32',
    CONST_I64: 'const_i64',
    CONST_F32: 'const_f32',
    CONST_F64: 'const_f64',

    // Variables & Globals
    LOCAL_GET: 'local_get',
    LOCAL_SET: 'local_set',
    LOCAL_TEE: 'local_tee',
    GLOBAL_GET: 'global_get',
    GLOBAL_SET: 'global_set',

    // Control Flow
    BLOCK: 'block',
    LOOP: 'loop',
    IF: 'if',
    BR: 'br',
    BR_IF: 'br_if',
    BR_TABLE: 'br_table',
    RETURN: 'return',
    NOP: 'nop',
    UNREACHABLE: 'unreachable',
    DROP: 'drop',
    SELECT: 'select',

    // Calls
    CALL: 'call',
    CALL_INDIRECT: 'call_indirect',

    // Integer Unary
    CLZ: 'clz',
    CTZ: 'ctz',
    POPCNT: 'popcnt',
    EQZ: 'eqz',

    // Float Unary
    ABS: 'abs',
    NEG: 'neg',
    CEIL: 'ceil',
    FLOOR: 'floor',
    TRUNC_FLOAT: 'trunc_float',
    NEAREST: 'nearest',
    SQRT: 'sqrt',

    // Binary Math
    ADD: 'add',
    SUB: 'sub',
    MUL: 'mul',
    DIV_S: 'div_s',
    DIV_U: 'div_u',
    DIV: 'div',
    REM_S: 'rem_s',
    REM_U: 'rem_u',
    MIN: 'min',
    MAX: 'max',
    COPYSIGN: 'copysign',

    // Bitwise
    AND: 'and',
    OR: 'or',
    XOR: 'xor',
    SHL: 'shl',
    SHR_S: 'shr_s',
    SHR_U: 'shr_u',
    ROTL: 'rotl',
    ROTR: 'rotr',

    // Comparisons
    EQ: 'eq',
    NE: 'ne',
    LT_S: 'lt_s',
    LT_U: 'lt_u',
    LT: 'lt',
    LE_S: 'le_s',
    LE_U: 'le_u',
    LE: 'le',
    GT_S: 'gt_s',
    GT_U: 'gt_u',
    GT: 'gt',
    GE_S: 'ge_s',
    GE_U: 'ge_u',
    GE: 'ge',

    // Conversions & Bitcasts
    CONVERT: 'convert',
    REINTERPRET: 'reinterpret',

    // Memory (Load / Store)
    LOAD: 'load',
    LOAD8_S: 'load8_s',
    LOAD8_U: 'load8_u',
    LOAD16_S: 'load16_s',
    LOAD16_U: 'load16_u',
    LOAD32_S: 'load32_s',
    LOAD32_U: 'load32_u',
    STORE: 'store',
    STORE8: 'store8',
    STORE16: 'store16',
    STORE32: 'store32',
    MEMORY_GROW: 'memory_grow',
    MEMORY_SIZE: 'memory_size'
};

export class IRNode {
    constructor(op, type = null, args = [], imm = null) {
        this.op = op;
        this.type = type; // wasm type: 'i32', 'i64', 'f32', 'f64', or null
        this.args = args; // Children IRNode[]
        this.imm = imm;   // Immediate values
    }
}

export class IRFunction {
    constructor(name, index, paramTypes = [], returnType = null) {
        this.name = name;
        this.index = index;
        this.paramTypes = paramTypes;
        this.returnType = returnType;
        this.locals = [];
        this.body = [];
    }

    addLocal(name, wasmType) {
        const localIndex = this.paramTypes.length + this.locals.length;
        const entry = { name, wasmType, localIndex };
        this.locals.push(entry);
        return localIndex;
    }
}

export class IRModule {
    constructor() {
        this.imports = [];
        this.functions = [];
        this.globals = [];
        this.table = { min: 0, max: 0, elements: [] };
        this.memory = { min: 2, max: 128 };
        this.dataSegments = [];
        this.exports = [];
        this.startFunctionIndex = null;
    }
}

export class ASTToLowerer {
    constructor() {
        this.module = new IRModule();
        this.funcMap = new Map();
        this.globalMap = new Map();
        this.currentFunc = null;
        this.localMap = new Map();
        this.stringOffsets = new Map();
    }

    lower(programNode, typeCheckResult) {
        this.module = new IRModule();
        this.funcMap.clear();
        this.globalMap.clear();
        this.localMap.clear();
        this.stringOffsets.clear();

        // 1. Setup Standard Host Imports (Print helpers)
        this.setupImports();

        // 2. Setup Data Segments for constant strings
        this.setupDataSegments(typeCheckResult.stringConstants);

        // 3. Setup Functions index map
        let funcIndex = this.module.imports.length;
        for (const func of programNode.functions) {
            this.funcMap.set(func.name, funcIndex++);
        }

        // 4. Setup Globals
        let globalIndex = 0;
        for (const g of programNode.globals) {
            const wasmType = TYPE_METADATA[g.type].wasmType || 'i32';
            this.module.globals.push({
                name: g.name,
                wasmType,
                mutable: g.mutable !== false,
                initValue: g.initExpr ? this.extractConstValue(g.initExpr) : 0
            });
            this.globalMap.set(g.name, globalIndex++);
        }

        // 5. Setup Function Table (funcref)
        const tableFuncIndices = [];
        for (const funcName of typeCheckResult.tableFunctions) {
            const idx = this.funcMap.get(funcName);
            if (idx !== undefined) {
                tableFuncIndices.push(idx);
            }
        }
        this.module.table = {
            min: tableFuncIndices.length,
            max: Math.max(tableFuncIndices.length, 64),
            elements: tableFuncIndices
        };

        // 6. Lower each function
        for (const func of programNode.functions) {
            this.lowerFunction(func);
        }

        // 7. Handle main/init statements as start function or exported __main__
        if (programNode.mainBody && programNode.mainBody.length > 0) {
            const mainFuncIdx = funcIndex++;
            const mainIrFunc = new IRFunction('__main__', mainFuncIdx, [], null);
            this.currentFunc = mainIrFunc;
            this.localMap.clear();
            for (const stmt of programNode.mainBody) {
                const node = this.lowerNode(stmt);
                if (node) mainIrFunc.body.push(node);
            }
            this.module.functions.push(mainIrFunc);
            this.module.exports.push({ name: '__main__', kind: 'func', index: mainFuncIdx });
        }

        // Memory export
        this.module.exports.push({ name: 'memory', kind: 'mem', index: 0 });

        return this.module;
    }

    setupImports() {
        this.module.imports.push({
            module: 'host',
            name: 'print_i32',
            kind: 'func',
            params: ['i32'],
            returnType: null
        });
        this.module.imports.push({
            module: 'host',
            name: 'print_f64',
            kind: 'func',
            params: ['f64'],
            returnType: null
        });
        this.module.imports.push({
            module: 'host',
            name: 'print_str',
            kind: 'func',
            params: ['i32', 'i32'],
            returnType: null
        });
    }

    setupDataSegments(stringConstants) {
        let currentOffset = 1024;
        const encoder = new TextEncoder();

        for (const [str, _] of stringConstants) {
            const strBytes = encoder.encode(str);
            const totalLen = 4 + strBytes.length + 1;
            const buffer = new Uint8Array(totalLen);
            const view = new DataView(buffer.buffer);
            view.setUint32(0, strBytes.length, true);
            buffer.set(strBytes, 4);
            buffer[totalLen - 1] = 0;

            this.module.dataSegments.push({
                offset: currentOffset,
                bytes: buffer
            });

            this.stringOffsets.set(str, currentOffset + 4);
            currentOffset += Math.ceil(totalLen / 8) * 8;
        }
    }

    extractConstValue(node) {
        if (node.nodeType === ASTNodeType.CONST) return node.value;
        return 0;
    }

    lowerFunction(funcNode) {
        const paramTypes = funcNode.params.map(p => TYPE_METADATA[p.type].wasmType || 'i32');
        const returnType = funcNode.returnType && funcNode.returnType !== Type.VOID
            ? (TYPE_METADATA[funcNode.returnType].wasmType || 'i32')
            : null;

        const fIdx = this.funcMap.get(funcNode.name);
        const irFunc = new IRFunction(funcNode.name, fIdx, paramTypes, returnType);
        this.currentFunc = irFunc;
        this.localMap.clear();

        for (let i = 0; i < funcNode.params.length; i++) {
            this.localMap.set(funcNode.params[i].name, {
                index: i,
                wasmType: paramTypes[i]
            });
        }

        for (const stmt of funcNode.body) {
            const irNode = this.lowerNode(stmt);
            if (irNode) irFunc.body.push(irNode);
        }

        this.module.functions.push(irFunc);
        if (funcNode.isExported) {
            this.module.exports.push({ name: funcNode.name, kind: 'func', index: fIdx });
        }
        this.currentFunc = null;
    }

    lowerNode(node) {
        if (!node) return null;

        switch (node.nodeType) {
            case ASTNodeType.CONST: {
                const wasmType = TYPE_METADATA[node.type].wasmType || 'i32';
                switch (wasmType) {
                    case 'i32': return new IRNode(IROp.CONST_I32, 'i32', [], Number(node.value));
                    case 'i64': return new IRNode(IROp.CONST_I64, 'i64', [], BigInt(node.value));
                    case 'f32': return new IRNode(IROp.CONST_F32, 'f32', [], Number(node.value));
                    case 'f64': return new IRNode(IROp.CONST_F64, 'f64', [], Number(node.value));
                }
            }

            case ASTNodeType.STRING_LITERAL: {
                const ptr = this.stringOffsets.get(node.value) || 0;
                return new IRNode(IROp.CONST_I32, 'i32', [], ptr);
            }

            case ASTNodeType.DECLARE_VAR: {
                const wasmType = TYPE_METADATA[node.type].wasmType || 'i32';
                const localIdx = this.currentFunc.addLocal(node.name, wasmType);
                this.localMap.set(node.name, { index: localIdx, wasmType });

                if (node.initExpr) {
                    const initIr = this.lowerNode(node.initExpr);
                    return new IRNode(IROp.LOCAL_SET, null, [initIr], localIdx);
                }
                return null;
            }

            case ASTNodeType.SET_VAR: {
                const local = this.localMap.get(node.name);
                const valIr = this.lowerNode(node.valueExpr);
                if (local) {
                    return new IRNode(IROp.LOCAL_SET, null, [valIr], local.index);
                }
                const globalIdx = this.globalMap.get(node.name);
                if (globalIdx !== undefined) {
                    return new IRNode(IROp.GLOBAL_SET, null, [valIr], globalIdx);
                }
                return null;
            }

            case ASTNodeType.TEE_VAR: {
                const local = this.localMap.get(node.name);
                const valIr = this.lowerNode(node.valueExpr);
                if (local) {
                    return new IRNode(IROp.LOCAL_TEE, local.wasmType, [valIr], local.index);
                }
                return null;
            }

            case ASTNodeType.GET_VAR: {
                const local = this.localMap.get(node.name);
                if (local) {
                    return new IRNode(IROp.LOCAL_GET, local.wasmType, [], local.index);
                }
                const globalIdx = this.globalMap.get(node.name);
                if (globalIdx !== undefined) {
                    const g = this.module.globals[globalIdx];
                    return new IRNode(IROp.GLOBAL_GET, g.wasmType, [], globalIdx);
                }
                return null;
            }

            case ASTNodeType.SELECT: {
                const condIr = this.lowerNode(node.condition);
                const trueIr = this.lowerNode(node.trueExpr);
                const falseIr = this.lowerNode(node.falseExpr);
                const wasmType = TYPE_METADATA[node.trueExpr.inferredType]?.wasmType || 'i32';
                return new IRNode(IROp.SELECT, wasmType, [trueIr, falseIr, condIr]);
            }

            case ASTNodeType.DROP: {
                const exprIr = this.lowerNode(node.expr);
                return new IRNode(IROp.DROP, null, [exprIr]);
            }

            case ASTNodeType.NOP:
                return new IRNode(IROp.NOP, null, []);

            case ASTNodeType.UNREACHABLE:
                return new IRNode(IROp.UNREACHABLE, null, []);

            case ASTNodeType.BLOCK: {
                const body = node.body.map(s => this.lowerNode(s)).filter(Boolean);
                return new IRNode(IROp.BLOCK, null, [], { body, label: node.label });
            }

            case ASTNodeType.LOOP: {
                const body = node.body.map(s => this.lowerNode(s)).filter(Boolean);
                return new IRNode(IROp.LOOP, null, [], { body, label: node.label });
            }

            case ASTNodeType.BR:
                return new IRNode(IROp.BR, null, [], node.depth);

            case ASTNodeType.BR_IF: {
                const condIr = this.lowerNode(node.condition);
                return new IRNode(IROp.BR_IF, null, [condIr], node.depth);
            }

            case ASTNodeType.BR_TABLE: {
                const idxIr = this.lowerNode(node.indexExpr);
                return new IRNode(IROp.BR_TABLE, null, [idxIr], {
                    targets: node.targetDepths,
                    defaultTarget: node.defaultDepth
                });
            }

            case ASTNodeType.BINARY_OP: {
                const leftIr = this.lowerNode(node.left);
                const rightIr = this.lowerNode(node.right);
                const wasmType = TYPE_METADATA[node.left.inferredType]?.wasmType || 'i32';
                const signed = node.signedness !== 'unsigned';

                let op = IROp.ADD;
                switch (node.op) {
                    case '+': op = IROp.ADD; break;
                    case '-': op = IROp.SUB; break;
                    case '*': case '×': op = IROp.MUL; break;
                    case '/': case '÷':
                        if (wasmType === 'f32' || wasmType === 'f64') op = IROp.DIV;
                        else op = signed ? IROp.DIV_S : IROp.DIV_U;
                        break;
                    case '%': op = signed ? IROp.REM_S : IROp.REM_U; break;
                    case 'AND': op = IROp.AND; break;
                    case 'OR': op = IROp.OR; break;
                    case 'XOR': op = IROp.XOR; break;
                    case '<<': op = IROp.SHL; break;
                    case '>>': op = signed ? IROp.SHR_S : IROp.SHR_U; break;
                    case 'ROTL': op = IROp.ROTL; break;
                    case 'ROTR': op = IROp.ROTR; break;
                    case 'MIN': op = IROp.MIN; break;
                    case 'MAX': op = IROp.MAX; break;
                    case 'COPYSIGN': op = IROp.COPYSIGN; break;
                    case '==': case '=': op = IROp.EQ; break;
                    case '!=': case '≠': op = IROp.NE; break;
                    case '<':
                        if (wasmType === 'f32' || wasmType === 'f64') op = IROp.LT;
                        else op = signed ? IROp.LT_S : IROp.LT_U;
                        break;
                    case '<=': case '≤':
                        if (wasmType === 'f32' || wasmType === 'f64') op = IROp.LE;
                        else op = signed ? IROp.LE_S : IROp.LE_U;
                        break;
                    case '>':
                        if (wasmType === 'f32' || wasmType === 'f64') op = IROp.GT;
                        else op = signed ? IROp.GT_S : IROp.GT_U;
                        break;
                    case '>=': case '≥':
                        if (wasmType === 'f32' || wasmType === 'f64') op = IROp.GE;
                        else op = signed ? IROp.GE_S : IROp.GE_U;
                        break;
                }
                return new IRNode(op, wasmType, [leftIr, rightIr], { signed });
            }

            case ASTNodeType.UNARY_OP: {
                const exprIr = this.lowerNode(node.expr);
                const wasmType = TYPE_METADATA[node.expr.inferredType]?.wasmType || 'i32';
                switch (node.op) {
                    case 'EQZ': case 'é zero?': return new IRNode(IROp.EQZ, wasmType, [exprIr]);
                    case 'CLZ': return new IRNode(IROp.CLZ, wasmType, [exprIr]);
                    case 'CTZ': return new IRNode(IROp.CTZ, wasmType, [exprIr]);
                    case 'POPCNT': return new IRNode(IROp.POPCNT, wasmType, [exprIr]);
                    case 'ABS': return new IRNode(IROp.ABS, wasmType, [exprIr]);
                    case 'NEG': return new IRNode(IROp.NEG, wasmType, [exprIr]);
                    case 'CEIL': return new IRNode(IROp.CEIL, wasmType, [exprIr]);
                    case 'FLOOR': return new IRNode(IROp.FLOOR, wasmType, [exprIr]);
                    case 'TRUNC': return new IRNode(IROp.TRUNC_FLOAT, wasmType, [exprIr]);
                    case 'NEAREST': return new IRNode(IROp.NEAREST, wasmType, [exprIr]);
                    case 'SQRT': return new IRNode(IROp.SQRT, wasmType, [exprIr]);
                    case 'NOT': return new IRNode(IROp.EQZ, 'i32', [exprIr]);
                    default: return exprIr;
                }
            }

            case ASTNodeType.CONVERT: {
                const exprIr = this.lowerNode(node.expr);
                const fromType = node.expr.inferredType;
                const toType = node.targetType;
                return new IRNode(IROp.CONVERT, TYPE_METADATA[toType].wasmType, [exprIr], {
                    from: fromType,
                    to: toType,
                    signed: node.signedness !== 'unsigned'
                });
            }

            case ASTNodeType.REINTERPRET: {
                const exprIr = this.lowerNode(node.expr);
                const fromType = node.expr.inferredType;
                const toType = node.targetType;
                return new IRNode(IROp.REINTERPRET, TYPE_METADATA[toType].wasmType, [exprIr], { from: fromType, to: toType });
            }

            case ASTNodeType.IF: {
                const condIr = this.lowerNode(node.condition);
                const thenBody = node.thenBranch.map(s => this.lowerNode(s)).filter(Boolean);
                const elseBody = node.elseBranch.map(s => this.lowerNode(s)).filter(Boolean);
                return new IRNode(IROp.IF, null, [condIr], { thenBody, elseBody });
            }

            case ASTNodeType.REPEAT: {
                const countIr = this.lowerNode(node.countExpr);
                const counterLocal = this.currentFunc.addLocal('__repeat_counter_' + Math.random().toString(36).substr(2, 4), 'i32');
                const setCounter = new IRNode(IROp.LOCAL_SET, null, [countIr], counterLocal);

                const bodyNodes = [];
                const getCounter = new IRNode(IROp.LOCAL_GET, 'i32', [], counterLocal);
                const zeroConst = new IRNode(IROp.CONST_I32, 'i32', [], 0);
                const leCheck = new IRNode(IROp.LE_S, 'i32', [getCounter, zeroConst]);
                bodyNodes.push(new IRNode(IROp.BR_IF, null, [leCheck], 1));

                for (const s of node.body) {
                    const n = this.lowerNode(s);
                    if (n) bodyNodes.push(n);
                }

                const decCounter = new IRNode(IROp.SUB, 'i32', [
                    new IRNode(IROp.LOCAL_GET, 'i32', [], counterLocal),
                    new IRNode(IROp.CONST_I32, 'i32', [], 1)
                ]);
                bodyNodes.push(new IRNode(IROp.LOCAL_SET, null, [decCounter], counterLocal));
                bodyNodes.push(new IRNode(IROp.BR, null, [], 0));

                const loopNode = new IRNode(IROp.LOOP, null, [], { body: bodyNodes });
                const blockWrapper = new IRNode(IROp.BLOCK, null, [], { body: [loopNode] });

                return new IRNode(IROp.BLOCK, null, [], { body: [setCounter, blockWrapper] });
            }

            case ASTNodeType.WHILE: {
                const condIr = this.lowerNode(node.condition);
                const notCond = new IRNode(IROp.EQZ, 'i32', [condIr]);
                const breakIf = new IRNode(IROp.BR_IF, null, [notCond], 1);

                const bodyNodes = [breakIf];
                for (const s of node.body) {
                    const n = this.lowerNode(s);
                    if (n) bodyNodes.push(n);
                }
                bodyNodes.push(new IRNode(IROp.BR, null, [], 0));

                const loopNode = new IRNode(IROp.LOOP, null, [], { body: bodyNodes });
                return new IRNode(IROp.BLOCK, null, [], { body: [loopNode] });
            }

            case ASTNodeType.RETURN: {
                if (node.valueExpr) {
                    const valIr = this.lowerNode(node.valueExpr);
                    return new IRNode(IROp.RETURN, null, [valIr]);
                }
                return new IRNode(IROp.RETURN, null, []);
            }

            case ASTNodeType.CALL: {
                const fIdx = this.funcMap.get(node.funcName);
                const argsIr = node.args.map(a => this.lowerNode(a));
                const returnType = node.inferredType !== Type.VOID ? (TYPE_METADATA[node.inferredType]?.wasmType || 'i32') : null;
                return new IRNode(IROp.CALL, returnType, argsIr, fIdx);
            }

            case ASTNodeType.CALL_INDIRECT: {
                const funcIdxIr = this.lowerNode(node.funcIndexExpr);
                const argsIr = node.args.map(a => this.lowerNode(a));
                const returnType = node.returnType !== Type.VOID ? (TYPE_METADATA[node.returnType]?.wasmType || 'i32') : null;
                const paramTypes = node.paramTypes.map(p => TYPE_METADATA[p]?.wasmType || 'i32');
                return new IRNode(IROp.CALL_INDIRECT, returnType, [...argsIr, funcIdxIr], { paramTypes, returnType });
            }

            case ASTNodeType.MEM_LOAD: {
                const bufIr = this.lowerNode(node.bufferExpr);
                const offIr = this.lowerNode(node.offsetExpr);
                const addr = new IRNode(IROp.ADD, 'i32', [bufIr, offIr]);
                const wasmType = TYPE_METADATA[node.type].wasmType || 'i32';
                const signed = node.signedness !== 'unsigned';

                let op = IROp.LOAD;
                if (node.width === 1) op = signed ? IROp.LOAD8_S : IROp.LOAD8_U;
                else if (node.width === 2) op = signed ? IROp.LOAD16_S : IROp.LOAD16_U;
                else if (node.width === 4 && wasmType === 'i64') op = signed ? IROp.LOAD32_S : IROp.LOAD32_U;

                return new IRNode(op, wasmType, [addr], { offset: node.staticOffset || 0, align: node.align || 0 });
            }

            case ASTNodeType.MEM_STORE: {
                const bufIr = this.lowerNode(node.bufferExpr);
                const offIr = this.lowerNode(node.offsetExpr);
                const valIr = this.lowerNode(node.valueExpr);
                const addr = new IRNode(IROp.ADD, 'i32', [bufIr, offIr]);
                const wasmType = TYPE_METADATA[node.valueExpr.inferredType]?.wasmType || 'i32';

                let op = IROp.STORE;
                if (node.width === 1) op = IROp.STORE8;
                else if (node.width === 2) op = IROp.STORE16;
                else if (node.width === 4 && wasmType === 'i64') op = IROp.STORE32;

                return new IRNode(op, wasmType, [addr, valIr], { offset: node.staticOffset || 0, align: node.align || 0 });
            }

            case ASTNodeType.MEM_GROW: {
                const pagesIr = this.lowerNode(node.pagesExpr);
                return new IRNode(IROp.MEMORY_GROW, 'i32', [pagesIr]);
            }

            case ASTNodeType.MEM_SIZE: {
                return new IRNode(IROp.MEMORY_SIZE, 'i32', []);
            }

            case ASTNodeType.PRINT: {
                const exprIr = this.lowerNode(node.expr);
                const exprType = node.expr.inferredType;
                if (exprType === Type.TEXTO) {
                    const ptrLocal = this.currentFunc.addLocal('__str_ptr', 'i32');
                    const setPtr = new IRNode(IROp.LOCAL_SET, null, [exprIr], ptrLocal);
                    const getPtr = new IRNode(IROp.LOCAL_GET, 'i32', [], ptrLocal);
                    const getLen = new IRNode(IROp.LOAD, 'i32', [
                        new IRNode(IROp.SUB, 'i32', [new IRNode(IROp.LOCAL_GET, 'i32', [], ptrLocal), new IRNode(IROp.CONST_I32, 'i32', [], 4)])
                    ]);
                    const callPrintStr = new IRNode(IROp.CALL, null, [getPtr, getLen], 2);
                    return new IRNode(IROp.BLOCK, null, [], { body: [setPtr, callPrintStr] });
                } else if (exprType === Type.F32 || exprType === Type.F64) {
                    let f64Ir = exprIr;
                    if (exprType === Type.F32) {
                        f64Ir = new IRNode(IROp.CONVERT, 'f64', [exprIr], { from: Type.F32, to: Type.F64 });
                    }
                    return new IRNode(IROp.CALL, null, [f64Ir], 1);
                } else {
                    let i32Ir = exprIr;
                    if (exprType === Type.I64) {
                        i32Ir = new IRNode(IROp.CONVERT, 'i32', [exprIr], { from: Type.I64, to: Type.I32 });
                    }
                    return new IRNode(IROp.CALL, null, [i32Ir], 0);
                }
            }

            default:
                return null;
        }
    }
}
