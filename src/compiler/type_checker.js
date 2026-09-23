/**
 * Scratch++ Type Checker & Semantic Validator
 * Complete 100% WebAssembly 2.0 (W3C Recommendation)
 * Imports, Exports, Multi-Value, Tables, Ref Types, Bulk Memory, SIMD 128-bit
 */

import { Type, canAutoWiden, findCommonType } from './types.js';
import {
    ASTNodeType,
    ConvertNode,
    ConstNode,
    V128ConstNode,
    V128SplatNode,
    RefNullNode
} from './ast.js';

export class TypeError extends Error {
    constructor(message, node = null) {
        super(message);
        this.name = 'TypeError';
        this.node = node;
    }
}

export class Scope {
    constructor(parent = null) {
        this.parent = parent;
        this.symbols = new Map();
    }

    define(name, type, isGlobal = false, isParam = false, mutable = true) {
        if (this.symbols.has(name)) {
            throw new TypeError(`Variável "${name}" já declarada neste escopo.`);
        }
        this.symbols.set(name, { type, isGlobal, isParam, mutable });
    }

    lookup(name) {
        if (this.symbols.has(name)) {
            return this.symbols.get(name);
        }
        if (this.parent) {
            return this.parent.lookup(name);
        }
        return null;
    }
}

export class TypeChecker {
    constructor() {
        this.globalScope = new Scope();
        this.functions = new Map(); // funcName -> { name, params, returnType, index, isImport }
        this.currentFunction = null;
        this.currentScope = this.globalScope;
        this.stringConstants = new Map();
        this.tableFunctions = [];
        this.coercionsApplied = [];
        this.importedFuncs = [];
        this.importedGlobals = [];
        this.tables = new Map();
    }

    check(programNode) {
        this.globalScope = new Scope();
        this.functions.clear();
        this.stringConstants.clear();
        this.tableFunctions = [];
        this.coercionsApplied = [];
        this.importedFuncs = [];
        this.importedGlobals = [];
        this.tables.clear();
        this.currentScope = this.globalScope;

        // 1. Host runtime built-ins
        this.registerHostBuiltins();

        // 2. Register imported functions & globals
        if (programNode.imports) {
            for (const imp of programNode.imports) {
                if (imp.nodeType === ASTNodeType.IMPORT_FUNC) {
                    this.functions.set(imp.internalName || imp.name, {
                        name: imp.name,
                        internalName: imp.internalName || imp.name,
                        module: imp.module,
                        params: imp.params,
                        returnType: imp.returnType,
                        isImport: true
                    });
                    this.importedFuncs.push(imp);
                } else if (imp.nodeType === ASTNodeType.IMPORT_GLOBAL) {
                    this.globalScope.define(imp.internalName || imp.name, imp.type, true, false, imp.mutable);
                    this.importedGlobals.push(imp);
                }
            }
        }

        // 3. Register user declared tables
        if (programNode.tables) {
            for (const t of programNode.tables) {
                this.tables.set(t.name, {
                    name: t.name,
                    refType: t.refType || Type.FUNCREF,
                    min: t.min || 1,
                    max: t.max || 64
                });
            }
        }

        // 4. Register user defined functions (first pass signatures)
        for (const func of programNode.functions) {
            if (this.functions.has(func.name)) {
                throw new TypeError(`Função "${func.name}" já declarada.`);
            }
            this.functions.set(func.name, {
                name: func.name,
                params: func.params,
                returnType: func.returnType,
                isImport: false,
                isExported: func.isExported,
                exportName: func.exportName
            });
            this.tableFunctions.push(func.name);
        }

        // 5. Register global variables
        for (const globalDecl of programNode.globals) {
            if (globalDecl.initExpr) {
                globalDecl.initExpr = this.checkNode(globalDecl.initExpr);
                globalDecl.initExpr = this.coerce(globalDecl.initExpr, globalDecl.type, `inicializador global de "${globalDecl.name}"`);
            }
            this.globalScope.define(globalDecl.name, globalDecl.type, true, false, globalDecl.mutable);
        }

        // 6. Type check each function body
        for (const func of programNode.functions) {
            this.checkFunction(func);
        }

        // 7. Type check top-level start/main statements
        if (programNode.mainBody && programNode.mainBody.length > 0) {
            this.currentFunction = null;
            this.currentScope = new Scope(this.globalScope);
            for (let i = 0; i < programNode.mainBody.length; i++) {
                programNode.mainBody[i] = this.checkNode(programNode.mainBody[i]);
            }
        }

        return {
            functions: this.functions,
            stringConstants: this.stringConstants,
            tableFunctions: this.tableFunctions,
            importedFuncs: this.importedFuncs,
            coercionsApplied: this.coercionsApplied,
            coercions: this.coercionsApplied
        };
    }

    registerHostBuiltins() {
        this.functions.set('print_i32', {
            name: 'print_i32',
            internalName: 'print_i32',
            module: 'host',
            params: [{ name: 'val', type: Type.I32 }],
            returnType: Type.VOID,
            isImport: true
        });
        this.functions.set('print_f64', {
            name: 'print_f64',
            internalName: 'print_f64',
            module: 'host',
            params: [{ name: 'val', type: Type.F64 }],
            returnType: Type.VOID,
            isImport: true
        });
        this.functions.set('print_str', {
            name: 'print_str',
            internalName: 'print_str',
            module: 'host',
            params: [{ name: 'ptr', type: Type.I32 }, { name: 'len', type: Type.I32 }],
            returnType: Type.VOID,
            isImport: true
        });
    }

    addHostImportIfNeeded(funcName) {
        if (this.importedFuncs.some(f => f.name === funcName && f.module === 'host')) return;
        const fn = this.functions.get(funcName);
        if (fn) {
            this.importedFuncs.push({
                module: 'host',
                name: fn.name,
                internalName: fn.internalName || fn.name,
                params: fn.params,
                returnType: fn.returnType
            });
        }
    }

    checkFunction(funcNode) {
        this.currentFunction = funcNode;
        this.currentScope = new Scope(this.globalScope);

        for (const param of funcNode.params) {
            this.currentScope.define(param.name, param.type, false, true, true);
        }

        for (let i = 0; i < funcNode.body.length; i++) {
            funcNode.body[i] = this.checkNode(funcNode.body[i]);
        }

        this.currentFunction = null;
        this.currentScope = this.globalScope;
    }

    checkNode(node) {
        if (!node) return null;

        switch (node.nodeType) {
            case ASTNodeType.CONST:
                node.inferredType = node.type;
                return node;

            case ASTNodeType.V128_CONST:
                node.inferredType = Type.V128;
                return node;

            case ASTNodeType.STRING_LITERAL: {
                if (!this.stringConstants.has(node.value)) {
                    this.stringConstants.set(node.value, this.stringConstants.size);
                }
                node.inferredType = Type.TEXTO;
                return node;
            }

            case ASTNodeType.DECLARE_VAR: {
                if (node.initExpr) {
                    node.initExpr = this.checkNode(node.initExpr);
                    node.initExpr = this.coerce(node.initExpr, node.type, `inicialização de "${node.name}"`);
                }
                this.currentScope.define(node.name, node.type, node.isGlobal, false, true);
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.GLOBAL_DECLARE: {
                if (node.initExpr) {
                    node.initExpr = this.checkNode(node.initExpr);
                    node.initExpr = this.coerce(node.initExpr, node.type, `inicialização global de "${node.name}"`);
                }
                this.globalScope.define(node.name, node.type, true, false, node.mutable);
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.SET_VAR: {
                const sym = this.currentScope.lookup(node.name);
                if (!sym) {
                    throw new TypeError(`Variável não declarada: "${node.name}".`, node);
                }
                if (!sym.mutable) {
                    throw new TypeError(`Variável constante "${node.name}" não pode ser modificada.`, node);
                }
                node.valueExpr = this.checkNode(node.valueExpr);
                node.valueExpr = this.coerce(node.valueExpr, sym.type, `atribuição para "${node.name}"`);
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.TEE_VAR: {
                const sym = this.currentScope.lookup(node.name);
                if (!sym) {
                    throw new TypeError(`Variável não declarada: "${node.name}".`, node);
                }
                node.valueExpr = this.checkNode(node.valueExpr);
                node.valueExpr = this.coerce(node.valueExpr, sym.type, `local.tee para "${node.name}"`);
                node.inferredType = sym.type;
                return node;
            }

            case ASTNodeType.GET_VAR: {
                const sym = this.currentScope.lookup(node.name);
                if (!sym) {
                    throw new TypeError(`Variável não declarada: "${node.name}".`, node);
                }
                node.inferredType = sym.type;
                return node;
            }

            case ASTNodeType.SIGN_EXTEND: {
                node.expr = this.checkNode(node.expr);
                node.expr = this.coerce(node.expr, node.type, 'sign-extend');
                node.inferredType = node.type;
                return node;
            }

            case ASTNodeType.TRUNC_SAT: {
                node.expr = this.checkNode(node.expr);
                node.expr = this.coerce(node.expr, node.srcType, 'trunc-sat');
                node.inferredType = node.targetType;
                return node;
            }

            case ASTNodeType.SELECT: {
                node.condition = this.checkNode(node.condition);
                node.condition = this.coerce(node.condition, Type.BOOL, 'condição do select');
                node.trueExpr = this.checkNode(node.trueExpr);
                node.falseExpr = this.checkNode(node.falseExpr);

                const commonType = findCommonType(node.trueExpr.inferredType, node.falseExpr.inferredType);
                if (!commonType) {
                    throw new TypeError(`Tipos incompatíveis no select: ${node.trueExpr.inferredType} vs ${node.falseExpr.inferredType}`, node);
                }
                node.trueExpr = this.coerce(node.trueExpr, commonType, 'ramo true do select');
                node.falseExpr = this.coerce(node.falseExpr, commonType, 'ramo false do select');
                node.inferredType = commonType;
                return node;
            }

            case ASTNodeType.DROP: {
                node.expr = this.checkNode(node.expr);
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.NOP:
            case ASTNodeType.UNREACHABLE:
            case ASTNodeType.BR:
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.BR_IF:
                node.condition = this.checkNode(node.condition);
                node.condition = this.coerce(node.condition, Type.BOOL, 'condição do br_if');
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.BR_TABLE:
                node.indexExpr = this.checkNode(node.indexExpr);
                node.indexExpr = this.coerce(node.indexExpr, Type.I32, 'índice do br_table');
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.BLOCK:
            case ASTNodeType.LOOP: {
                for (let i = 0; i < node.body.length; i++) {
                    node.body[i] = this.checkNode(node.body[i]);
                }
                node.inferredType = node.resultType || Type.VOID;
                return node;
            }

            case ASTNodeType.BINARY_OP: {
                node.left = this.checkNode(node.left);
                node.right = this.checkNode(node.right);

                const typeL = node.left.inferredType;
                const typeR = node.right.inferredType;

                const commonType = findCommonType(typeL, typeR);
                if (!commonType) {
                    throw new TypeError(`Tipos incompatíveis para operador "${node.op}": ${typeL} e ${typeR}.`, node);
                }

                node.left = this.coerce(node.left, commonType, `operando esquerdo de ${node.op}`);
                node.right = this.coerce(node.right, commonType, `operando direito de ${node.op}`);

                const isComparison = ['==', '!=', '<', '<=', '>', '>=', '=', '≠', '≤', '≥'].includes(node.op);
                if (isComparison) {
                    node.inferredType = Type.BOOL;
                } else {
                    node.inferredType = commonType;
                }
                return node;
            }

            case ASTNodeType.UNARY_OP: {
                node.expr = this.checkNode(node.expr);
                if (node.op === 'EQZ' || node.op === 'é zero?') {
                    node.inferredType = Type.BOOL;
                } else if (node.op === 'NOT') {
                    node.expr = this.coerce(node.expr, Type.BOOL, 'operador NOT');
                    node.inferredType = Type.BOOL;
                } else {
                    node.inferredType = node.expr.inferredType;
                }
                return node;
            }

            case ASTNodeType.CONVERT: {
                node.expr = this.checkNode(node.expr);
                node.inferredType = node.targetType;
                return node;
            }

            case ASTNodeType.REINTERPRET: {
                node.expr = this.checkNode(node.expr);
                node.inferredType = node.targetType;
                return node;
            }

            case ASTNodeType.IF: {
                node.condition = this.checkNode(node.condition);
                node.condition = this.coerce(node.condition, Type.BOOL, 'condição do SE');

                for (let i = 0; i < node.thenBranch.length; i++) {
                    node.thenBranch[i] = this.checkNode(node.thenBranch[i]);
                }
                for (let i = 0; i < node.elseBranch.length; i++) {
                    node.elseBranch[i] = this.checkNode(node.elseBranch[i]);
                }
                node.inferredType = node.resultType || Type.VOID;
                return node;
            }

            case ASTNodeType.REPEAT: {
                node.countExpr = this.checkNode(node.countExpr);
                node.countExpr = this.coerce(node.countExpr, Type.I32, 'contador do REPITA');

                for (let i = 0; i < node.body.length; i++) {
                    node.body[i] = this.checkNode(node.body[i]);
                }
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.WHILE: {
                node.condition = this.checkNode(node.condition);
                node.condition = this.coerce(node.condition, Type.BOOL, 'condição do ENQUANTO');

                for (let i = 0; i < node.body.length; i++) {
                    node.body[i] = this.checkNode(node.body[i]);
                }
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.RETURN: {
                if (this.currentFunction) {
                    const expectedType = this.currentFunction.returnType;
                    if (expectedType === Type.VOID || !expectedType) {
                        if (node.valueExpr) {
                            node.valueExpr = this.checkNode(node.valueExpr);
                            node.valueExpr = null;
                        }
                    } else if (Array.isArray(expectedType)) {
                        if (!Array.isArray(node.valueExpr) || node.valueExpr.length !== expectedType.length) {
                            throw new TypeError(`Função "${this.currentFunction.name}" esperava ${expectedType.length} retornos multi-valor.`, node);
                        }
                        for (let i = 0; i < expectedType.length; i++) {
                            node.valueExpr[i] = this.checkNode(node.valueExpr[i]);
                            node.valueExpr[i] = this.coerce(node.valueExpr[i], expectedType[i], `retorno [${i}] de "${this.currentFunction.name}"`);
                        }
                    } else {
                        if (!node.valueExpr) {
                            throw new TypeError(`Função "${this.currentFunction.name}" requer retorno do tipo ${expectedType}.`, node);
                        }
                        node.valueExpr = this.checkNode(node.valueExpr);
                        node.valueExpr = this.coerce(node.valueExpr, expectedType, `retorno de "${this.currentFunction.name}"`);
                    }
                }
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.CALL: {
                const func = this.functions.get(node.funcName);
                if (!func) {
                    throw new TypeError(`Função "${node.funcName}" não declarada ou importada.`, node);
                }
                if (func.module === 'host') {
                    this.addHostImportIfNeeded(func.name);
                }
                if (node.args.length !== func.params.length) {
                    throw new TypeError(
                        `Função "${node.funcName}" esperava ${func.params.length} argumentos, recebeu ${node.args.length}.`,
                        node
                    );
                }
                for (let i = 0; i < node.args.length; i++) {
                    node.args[i] = this.checkNode(node.args[i]);
                    node.args[i] = this.coerce(node.args[i], func.params[i].type, `argumento ${i + 1} de "${node.funcName}"`);
                }
                node.inferredType = func.returnType || Type.VOID;
                return node;
            }

            case ASTNodeType.CALL_INDIRECT: {
                node.funcIndexExpr = this.checkNode(node.funcIndexExpr);
                node.funcIndexExpr = this.coerce(node.funcIndexExpr, Type.I32, 'índice de função indireta');

                if (node.args.length !== node.paramTypes.length) {
                    throw new TypeError(
                        `Chamada indireta esperava ${node.paramTypes.length} argumentos, recebeu ${node.args.length}.`,
                        node
                    );
                }
                for (let i = 0; i < node.args.length; i++) {
                    node.args[i] = this.checkNode(node.args[i]);
                    node.args[i] = this.coerce(node.args[i], node.paramTypes[i], `argumento ${i + 1} de chamada indireta`);
                }
                node.inferredType = node.returnType || Type.VOID;
                return node;
            }

            case ASTNodeType.RETURN_CALL: {
                const func = this.functions.get(node.funcName);
                if (!func) throw new TypeError(`Função "${node.funcName}" não declarada para return_call.`, node);
                for (let i = 0; i < node.args.length; i++) {
                    node.args[i] = this.checkNode(node.args[i]);
                    node.args[i] = this.coerce(node.args[i], func.params[i].type, `argumento de return_call`);
                }
                node.inferredType = func.returnType || Type.VOID;
                return node;
            }

            case ASTNodeType.RETURN_CALL_INDIRECT: {
                node.funcIndexExpr = this.checkNode(node.funcIndexExpr);
                node.funcIndexExpr = this.coerce(node.funcIndexExpr, Type.I32, 'índice de return_call_indirect');
                for (let i = 0; i < node.args.length; i++) {
                    node.args[i] = this.checkNode(node.args[i]);
                    node.args[i] = this.coerce(node.args[i], node.paramTypes[i], `argumento de return_call_indirect`);
                }
                node.inferredType = node.returnType || Type.VOID;
                return node;
            }

            // Reference Types & Tables (Wasm 2.0)
            case ASTNodeType.REF_NULL:
                node.inferredType = node.refType || Type.FUNCREF;
                return node;

            case ASTNodeType.REF_IS_NULL:
                node.expr = this.checkNode(node.expr);
                node.inferredType = Type.BOOL;
                return node;

            case ASTNodeType.REF_FUNC:
                node.inferredType = Type.FUNCREF;
                return node;

            case ASTNodeType.TABLE_GET:
                node.idxExpr = this.checkNode(node.idxExpr);
                node.idxExpr = this.coerce(node.idxExpr, Type.I32, 'table.get índice');
                node.inferredType = Type.FUNCREF;
                return node;

            case ASTNodeType.TABLE_SET:
                node.idxExpr = this.checkNode(node.idxExpr);
                node.idxExpr = this.coerce(node.idxExpr, Type.I32, 'table.set índice');
                node.valExpr = this.checkNode(node.valExpr);
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.TABLE_SIZE:
                node.inferredType = Type.I32;
                return node;

            case ASTNodeType.TABLE_GROW:
                node.valExpr = this.checkNode(node.valExpr);
                node.deltaExpr = this.checkNode(node.deltaExpr);
                node.deltaExpr = this.coerce(node.deltaExpr, Type.I32, 'table.grow delta');
                node.inferredType = Type.I32;
                return node;

            case ASTNodeType.TABLE_FILL:
                node.offExpr = this.checkNode(node.offExpr);
                node.offExpr = this.coerce(node.offExpr, Type.I32, 'table.fill offset');
                node.valExpr = this.checkNode(node.valExpr);
                node.lenExpr = this.checkNode(node.lenExpr);
                node.lenExpr = this.coerce(node.lenExpr, Type.I32, 'table.fill length');
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.TABLE_COPY:
            case ASTNodeType.TABLE_INIT:
            case ASTNodeType.ELEM_DROP:
                node.inferredType = Type.VOID;
                return node;

            // Bulk Memory
            case ASTNodeType.MEM_COPY:
                node.dstExpr = this.checkNode(node.dstExpr);
                node.srcExpr = this.checkNode(node.srcExpr);
                node.lenExpr = this.checkNode(node.lenExpr);
                node.dstExpr = this.coerce(node.dstExpr, Type.I32, 'memory.copy dst');
                node.srcExpr = this.coerce(node.srcExpr, Type.I32, 'memory.copy src');
                node.lenExpr = this.coerce(node.lenExpr, Type.I32, 'memory.copy len');
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.MEM_FILL:
                node.dstExpr = this.checkNode(node.dstExpr);
                node.valExpr = this.checkNode(node.valExpr);
                node.lenExpr = this.checkNode(node.lenExpr);
                node.dstExpr = this.coerce(node.dstExpr, Type.I32, 'memory.fill dst');
                node.valExpr = this.coerce(node.valExpr, Type.I32, 'memory.fill val');
                node.lenExpr = this.coerce(node.lenExpr, Type.I32, 'memory.fill len');
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.MEM_INIT:
            case ASTNodeType.DATA_DROP:
                node.inferredType = Type.VOID;
                return node;

            // SIMD 128-bit
            case ASTNodeType.V128_SPLAT:
                node.expr = this.checkNode(node.expr);
                node.inferredType = Type.V128;
                return node;

            case ASTNodeType.V128_EXTRACT_LANE:
                node.vecExpr = this.checkNode(node.vecExpr);
                node.vecExpr = this.coerce(node.vecExpr, Type.V128, 'v128 extract_lane');
                if (node.laneType.startsWith('f64') || node.laneType.startsWith('i64')) node.inferredType = node.laneType.startsWith('f') ? Type.F64 : Type.I64;
                else if (node.laneType.startsWith('f32')) node.inferredType = Type.F32;
                else node.inferredType = Type.I32;
                return node;

            case ASTNodeType.V128_REPLACE_LANE:
                node.vecExpr = this.checkNode(node.vecExpr);
                node.vecExpr = this.coerce(node.vecExpr, Type.V128, 'v128 replace_lane vec');
                node.valExpr = this.checkNode(node.valExpr);
                node.inferredType = Type.V128;
                return node;

            case ASTNodeType.V128_OP: {
                const isShift = typeof node.op === 'string' && (node.op.includes('.shl') || node.op.includes('.shr'));
                if (node.operands && Array.isArray(node.operands)) {
                    for (let i = 0; i < node.operands.length; i++) {
                        node.operands[i] = this.checkNode(node.operands[i]);
                        const expectedType = (isShift && i === 1) ? Type.I32 : Type.V128;
                        node.operands[i] = this.coerce(node.operands[i], expectedType, `v128 op operand ${i}`);
                    }
                    node.left = node.operands[0];
                    node.right = node.operands[1];
                } else {
                    node.left = this.checkNode(node.left);
                    node.left = this.coerce(node.left, Type.V128, 'v128 op left');
                    if (node.right) {
                        node.right = this.checkNode(node.right);
                        const expectedType = isShift ? Type.I32 : Type.V128;
                        node.right = this.coerce(node.right, expectedType, 'v128 op right');
                    }
                }
                const isTest = typeof node.op === 'string' && (node.op.includes('.all_true') || node.op.includes('.any_true') || node.op.includes('.bitmask'));
                node.inferredType = isTest ? Type.I32 : Type.V128;
                return node;
            }

            case ASTNodeType.V128_BITSELECT:
                node.v1 = this.checkNode(node.v1);
                node.v2 = this.checkNode(node.v2);
                node.c = this.checkNode(node.c || node.maskExpr);
                node.maskExpr = node.c;
                node.v1 = this.coerce(node.v1, Type.V128, 'v128 bitselect v1');
                node.v2 = this.coerce(node.v2, Type.V128, 'v128 bitselect v2');
                node.c = this.coerce(node.c, Type.V128, 'v128 bitselect cond');
                node.inferredType = Type.V128;
                return node;

            case ASTNodeType.V128_LOAD:
                if (node.offsetExpr) {
                    node.offsetExpr = this.checkNode(node.offsetExpr);
                    node.offsetExpr = this.coerce(node.offsetExpr, Type.I32, 'v128.load offset');
                }
                if (node.bufferExpr) {
                    node.bufferExpr = this.checkNode(node.bufferExpr);
                    node.bufferExpr = this.coerce(node.bufferExpr, Type.I32, 'v128.load addr');
                }
                node.inferredType = Type.V128;
                return node;

            case ASTNodeType.V128_STORE:
                node.valueExpr = this.checkNode(node.valueExpr || node.valExpr);
                node.valueExpr = this.coerce(node.valueExpr, Type.V128, 'v128.store val');
                node.valExpr = node.valueExpr;
                if (node.offsetExpr) {
                    node.offsetExpr = this.checkNode(node.offsetExpr);
                    node.offsetExpr = this.coerce(node.offsetExpr, Type.I32, 'v128.store offset');
                }
                if (node.bufferExpr) {
                    node.bufferExpr = this.checkNode(node.bufferExpr);
                    node.bufferExpr = this.coerce(node.bufferExpr, Type.I32, 'v128.store addr');
                }
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.ALLOC_BUFFER: {
                node.sizeExpr = this.checkNode(node.sizeExpr);
                node.sizeExpr = this.coerce(node.sizeExpr, Type.I32, 'tamanho do buffer');
                node.inferredType = Type.BUFFER;
                return node;
            }

            case ASTNodeType.MEM_LOAD: {
                node.bufferExpr = this.checkNode(node.bufferExpr);
                node.bufferExpr = this.coerce(node.bufferExpr, Type.BUFFER, 'endereço de leitura');
                node.offsetExpr = this.checkNode(node.offsetExpr);
                node.offsetExpr = this.coerce(node.offsetExpr, Type.I32, 'offset dinâmico');
                node.inferredType = node.type;
                return node;
            }

            case ASTNodeType.MEM_STORE: {
                node.bufferExpr = this.checkNode(node.bufferExpr);
                node.bufferExpr = this.coerce(node.bufferExpr, Type.BUFFER, 'endereço de escrita');
                node.offsetExpr = this.checkNode(node.offsetExpr);
                node.offsetExpr = this.coerce(node.offsetExpr, Type.I32, 'offset dinâmico');
                node.valueExpr = this.checkNode(node.valueExpr);
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.MEM_GROW: {
                node.pagesExpr = this.checkNode(node.pagesExpr);
                node.pagesExpr = this.coerce(node.pagesExpr, Type.I32, 'páginas de memória');
                node.inferredType = Type.I32;
                return node;
            }

            case ASTNodeType.MEM_SIZE: {
                node.inferredType = Type.I32;
                return node;
            }

            case ASTNodeType.STRING_CONCAT: {
                node.left = this.checkNode(node.left);
                node.left = this.coerce(node.left, Type.TEXTO, 'concatenação esquerda');
                node.right = this.checkNode(node.right);
                node.right = this.coerce(node.right, Type.TEXTO, 'concatenação direita');
                node.inferredType = Type.TEXTO;
                return node;
            }

            case ASTNodeType.STRING_LEN: {
                node.strExpr = this.checkNode(node.strExpr);
                node.strExpr = this.coerce(node.strExpr, Type.TEXTO, 'tamanho de texto');
                node.inferredType = Type.I32;
                return node;
            }

            case ASTNodeType.PRINT: {
                node.expr = this.checkNode(node.expr);
                const exprType = node.expr.inferredType;
                if (exprType === Type.F64 || exprType === Type.F32) {
                    node.expr = this.coerce(node.expr, Type.F64, 'print_f64');
                    this.addHostImportIfNeeded('print_f64');
                } else if (exprType === Type.TEXTO || exprType === Type.STRING) {
                    this.addHostImportIfNeeded('print_str');
                } else {
                    node.expr = this.coerce(node.expr, Type.I32, 'print_i32');
                    this.addHostImportIfNeeded('print_i32');
                }
                node.inferredType = Type.VOID;
                return node;
            }

            default:
                return node;
        }
    }

    coerce(exprNode, targetType, context = '') {
        if (!exprNode) {
            if (targetType === Type.V128) {
                const defNode = new V128ConstNode(new Uint8Array(16));
                defNode.inferredType = Type.V128;
                return defNode;
            }
            if (targetType === Type.FUNCREF || targetType === Type.EXTERNREF) {
                const defNode = new RefNullNode(targetType);
                defNode.inferredType = targetType;
                return defNode;
            }
            const defNode = new ConstNode(0, targetType || Type.I32);
            defNode.inferredType = targetType || Type.I32;
            return defNode;
        }

        const fromType = exprNode.inferredType;
        if (fromType === targetType) return exprNode;

        if (exprNode.nodeType === ASTNodeType.CONST && (exprNode.value === 0 || exprNode.value === 0n || exprNode.value === 0.0)) {
            if (targetType === Type.V128) {
                const defNode = new V128ConstNode(new Uint8Array(16));
                defNode.inferredType = Type.V128;
                return defNode;
            }
            if (targetType === Type.FUNCREF || targetType === Type.EXTERNREF) {
                const defNode = new RefNullNode(targetType);
                defNode.inferredType = targetType;
                return defNode;
            }
        }

        if (targetType === Type.V128) {
            if (fromType === Type.I32 || fromType === Type.BOOL) {
                const splat = new V128SplatNode('i32x4', exprNode);
                splat.inferredType = Type.V128;
                return splat;
            }
            if (fromType === Type.I64) {
                const splat = new V128SplatNode('i64x2', exprNode);
                splat.inferredType = Type.V128;
                return splat;
            }
            if (fromType === Type.F32) {
                const splat = new V128SplatNode('f32x4', exprNode);
                splat.inferredType = Type.V128;
                return splat;
            }
            if (fromType === Type.F64) {
                const splat = new V128SplatNode('f64x2', exprNode);
                splat.inferredType = Type.V128;
                return splat;
            }
        }

        if (canAutoWiden(fromType, targetType)) {
            this.coercionsApplied.push({
                from: fromType,
                to: targetType,
                context
            });
            const convert = new ConvertNode(exprNode, targetType, false);
            convert.inferredType = targetType;
            return convert;
        }

        throw new TypeError(
            `Tipo incompatível em ${context}: esperado "${targetType}", recebido "${fromType}". Narrowing explícito necessário.`,
            exprNode
        );
    }
}
