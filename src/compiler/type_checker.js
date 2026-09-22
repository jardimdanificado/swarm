/**
 * Scratch++ Type Checker & Semantic Validator
 * 100% WebAssembly 1.0 Semantic Rules & Coercion
 */

import { Type, canAutoWiden, findCommonType } from './types.js';
import {
    ASTNodeType,
    ConvertNode
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
        this.functions = new Map();
        this.currentFunction = null;
        this.currentScope = this.globalScope;
        this.stringConstants = new Map();
        this.tableFunctions = [];
        this.coercionsApplied = [];
    }

    check(programNode) {
        this.globalScope = new Scope();
        this.functions.clear();
        this.stringConstants.clear();
        this.tableFunctions = [];
        this.coercionsApplied = [];

        // 1. Collect all functions
        let funcIndex = 0;
        for (const func of programNode.functions) {
            if (this.functions.has(func.name)) {
                throw new TypeError(`Função "${func.name}" já declarada.`, func);
            }
            this.functions.set(func.name, {
                name: func.name,
                params: func.params,
                returnType: func.returnType,
                index: funcIndex++,
                node: func
            });
            this.tableFunctions.push(func.name);
        }

        // 2. Check globals
        for (const globalDecl of programNode.globals) {
            this.checkGlobalDeclaration(globalDecl);
        }

        // 3. Check functions bodies
        for (const func of programNode.functions) {
            this.checkFunction(func);
        }

        // 4. Check main body (if any)
        if (programNode.mainBody && programNode.mainBody.length > 0) {
            this.currentScope = new Scope(this.globalScope);
            this.currentFunction = {
                name: '__main__',
                params: [],
                returnType: Type.VOID
            };
            for (let i = 0; i < programNode.mainBody.length; i++) {
                programNode.mainBody[i] = this.checkNode(programNode.mainBody[i]);
            }
        }

        return {
            functions: this.functions,
            stringConstants: this.stringConstants,
            tableFunctions: this.tableFunctions,
            coercions: this.coercionsApplied
        };
    }

    checkGlobalDeclaration(declNode) {
        if (declNode.initExpr) {
            declNode.initExpr = this.checkNode(declNode.initExpr);
            declNode.initExpr = this.coerce(declNode.initExpr, declNode.type, `declaração global "${declNode.name}"`);
        }
        this.globalScope.define(declNode.name, declNode.type, true, false, declNode.mutable !== false);
    }

    checkFunction(funcNode) {
        this.currentFunction = this.functions.get(funcNode.name);
        const funcScope = new Scope(this.globalScope);
        this.currentScope = funcScope;

        for (const param of funcNode.params) {
            funcScope.define(param.name, param.type, false, true, true);
        }

        for (let i = 0; i < funcNode.body.length; i++) {
            funcNode.body[i] = this.checkNode(funcNode.body[i]);
        }

        this.currentScope = this.globalScope;
        this.currentFunction = null;
    }

    checkNode(node) {
        if (!node) return null;

        switch (node.nodeType) {
            case ASTNodeType.CONST:
                node.inferredType = node.type;
                return node;

            case ASTNodeType.STRING_LITERAL:
                node.inferredType = Type.TEXTO;
                if (!this.stringConstants.has(node.value)) {
                    this.stringConstants.set(node.value, this.stringConstants.size);
                }
                return node;

            case ASTNodeType.GLOBAL_DECLARE:
                this.checkGlobalDeclaration(node);
                node.inferredType = Type.VOID;
                return node;

            case ASTNodeType.DECLARE_VAR: {
                if (node.initExpr) {
                    node.initExpr = this.checkNode(node.initExpr);
                    node.initExpr = this.coerce(node.initExpr, node.type, `variável "${node.name}"`);
                }
                this.currentScope.define(node.name, node.type, false, false, true);
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.SET_VAR: {
                const sym = this.currentScope.lookup(node.name);
                if (!sym) {
                    throw new TypeError(`Variável não declarada: "${node.name}".`, node);
                }
                node.valueExpr = this.checkNode(node.valueExpr);
                node.valueExpr = this.coerce(node.valueExpr, sym.type, `atribuição a "${node.name}"`);
                node.inferredType = Type.VOID;
                return node;
            }

            case ASTNodeType.TEE_VAR: {
                const sym = this.currentScope.lookup(node.name);
                if (!sym) {
                    throw new TypeError(`Variável não declarada: "${node.name}".`, node);
                }
                node.valueExpr = this.checkNode(node.valueExpr);
                node.valueExpr = this.coerce(node.valueExpr, sym.type, `tee em "${node.name}"`);
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
                node.inferredType = Type.VOID;
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
                } else if (['CLZ', 'CTZ', 'POPCNT'].includes(node.op)) {
                    node.inferredType = node.expr.inferredType;
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
                node.inferredType = Type.VOID;
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
                            throw new TypeError(`Função "${this.currentFunction.name}" é void mas retornou valor.`, node);
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
                    throw new TypeError(`Função "${node.funcName}" não declarada.`, node);
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
                node.inferredType = Type.VOID;
                return node;
            }

            default:
                return node;
        }
    }

    coerce(exprNode, targetType, context = '') {
        const fromType = exprNode.inferredType;
        if (fromType === targetType) return exprNode;

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
