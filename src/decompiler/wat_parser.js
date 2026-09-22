/**
 * WebAssembly Text Format (WAT) Parser / Decompiler
 * Parses S-expressions and WAT text into Scratch++ AST ProgramNode
 */

import { Type } from '../compiler/types.js';
import {
    ProgramNode,
    ImportFuncNode,
    ImportGlobalNode,
    ExportNode,
    FunctionNode,
    GlobalDeclareNode,
    DeclareVarNode,
    SetVarNode,
    GetVarNode,
    ConstNode,
    BinaryOpNode,
    UnaryOpNode,
    ReturnNode,
    CallNode,
    NopNode,
    UnreachableNode
} from '../compiler/ast.js';

export function tokenizeWat(watText) {
    const tokens = [];
    const regex = /\s*(\(|\)|"[^"]*"|[^\s()]+)\s*/g;
    let match;
    while ((match = regex.exec(watText)) !== null) {
        if (match[1]) tokens.push(match[1]);
    }
    return tokens;
}

export function parseSExpressions(tokens) {
    let pos = 0;

    function parseExpr() {
        if (pos >= tokens.length) return null;
        const tok = tokens[pos++];
        if (tok === '(') {
            const list = [];
            while (pos < tokens.length && tokens[pos] !== ')') {
                list.push(parseExpr());
            }
            pos++; // consume ')'
            return list;
        }
        return tok;
    }

    const forms = [];
    while (pos < tokens.length) {
        const f = parseExpr();
        if (f) forms.push(f);
    }
    return forms;
}

export class WatParser {
    parse(watText) {
        const tokens = tokenizeWat(watText);
        const sexprs = parseSExpressions(tokens);

        let moduleSexpr = sexprs[0];
        if (Array.isArray(moduleSexpr) && moduleSexpr[0] !== 'module') {
            moduleSexpr = ['module', ...sexprs];
        } else if (!Array.isArray(moduleSexpr)) {
            moduleSexpr = ['module'];
        }

        const functions = [];
        const globals = [];
        const imports = [];
        const exports = [];
        let startFunc = null;

        for (let i = 1; i < moduleSexpr.length; i++) {
            const item = moduleSexpr[i];
            if (!Array.isArray(item)) continue;
            const kind = item[0];

            if (kind === 'import') {
                const modName = (item[1] || '').replace(/"/g, '');
                const impName = (item[2] || '').replace(/"/g, '');
                const descriptor = item[3];
                if (Array.isArray(descriptor) && descriptor[0] === 'func') {
                    let alias = impName;
                    if (typeof descriptor[1] === 'string' && descriptor[1].startsWith('$')) {
                        alias = descriptor[1].substring(1);
                    }
                    const params = [];
                    let returnType = Type.VOID;
                    for (let d = 1; d < descriptor.length; d++) {
                        const elem = descriptor[d];
                        if (Array.isArray(elem) && elem[0] === 'param') {
                            for (let p = 1; p < elem.length; p++) {
                                params.push({ name: `p${params.length}`, type: elem[p] });
                            }
                        } else if (Array.isArray(elem) && elem[0] === 'result') {
                            returnType = elem[1] || Type.VOID;
                        }
                    }
                    imports.push(new ImportFuncNode(modName, impName, alias, params, returnType));
                }
            } else if (kind === 'global') {
                let gName = `g${globals.length}`;
                let gType = Type.I32;
                let mutable = true;
                let initExpr = new ConstNode(0, Type.I32);

                for (let g = 1; g < item.length; g++) {
                    const elem = item[g];
                    if (typeof elem === 'string' && elem.startsWith('$')) {
                        gName = elem.substring(1);
                    } else if (Array.isArray(elem) && elem[0] === 'mut') {
                        gType = elem[1] || Type.I32;
                        mutable = true;
                    } else if (typeof elem === 'string') {
                        gType = elem;
                    } else if (Array.isArray(elem) && elem[0]?.includes('.const')) {
                        initExpr = new ConstNode(Number(elem[1] || 0), gType);
                    }
                }
                globals.push(new GlobalDeclareNode(gName, gType, mutable, initExpr));
            } else if (kind === 'export') {
                const exportName = (item[1] || '').replace(/"/g, '');
                const descriptor = item[2];
                if (Array.isArray(descriptor)) {
                    const expKind = descriptor[0];
                    const internal = (descriptor[1] || '').replace(/^\$/, '');
                    exports.push(new ExportNode(expKind, internal, exportName));
                }
            } else if (kind === 'start') {
                startFunc = (item[1] || '').replace(/^\$/, '');
            } else if (kind === 'func') {
                const funcNode = this.parseFunction(item, functions.length);
                functions.push(funcNode);
            }
        }

        return new ProgramNode(functions, globals, [], imports, exports, startFunc);
    }

    parseFunction(item, funcIndex) {
        let funcName = `func_${funcIndex}`;
        const params = [];
        let returnType = Type.VOID;
        const locals = [];
        const body = [];

        for (let i = 1; i < item.length; i++) {
            const elem = item[i];
            if (typeof elem === 'string' && elem.startsWith('$') && i === 1) {
                funcName = elem.substring(1);
            } else if (Array.isArray(elem) && elem[0] === 'export') {
                // Inline export
            } else if (Array.isArray(elem) && elem[0] === 'param') {
                let pName = `p${params.length}`;
                let pType = Type.I32;
                if (typeof elem[1] === 'string' && elem[1].startsWith('$')) {
                    pName = elem[1].substring(1);
                    pType = elem[2] || Type.I32;
                } else {
                    pType = elem[1] || Type.I32;
                }
                params.push({ name: pName, type: pType });
            } else if (Array.isArray(elem) && elem[0] === 'result') {
                returnType = elem[1] || Type.VOID;
            } else if (Array.isArray(elem) && elem[0] === 'local') {
                let lName = `l${locals.length}`;
                let lType = Type.I32;
                if (typeof elem[1] === 'string' && elem[1].startsWith('$')) {
                    lName = elem[1].substring(1);
                    lType = elem[2] || Type.I32;
                } else {
                    lType = elem[1] || Type.I32;
                }
                locals.push(new DeclareVarNode(lName, lType, new ConstNode(0, lType)));
            } else {
                const stmt = this.parseInstruction(elem);
                if (stmt) body.push(stmt);
            }
        }

        return new FunctionNode(funcName, params, returnType, [...locals, ...body], true);
    }

    parseInstruction(elem) {
        if (typeof elem === 'string') {
            if (elem === 'nop') return new NopNode();
            if (elem === 'unreachable') return new UnreachableNode();
            if (elem === 'return') return new ReturnNode();
            return null;
        }

        if (!Array.isArray(elem)) return null;
        const op = elem[0];

        if (op === 'local.get') return new GetVarNode(String(elem[1]).replace(/^\$/, ''));
        if (op === 'global.get') return new GetVarNode(String(elem[1]).replace(/^\$/, ''));
        if (op === 'local.set') return new SetVarNode(String(elem[1]).replace(/^\$/, ''), this.parseInstruction(elem[2]) || new ConstNode(0, Type.I32));
        if (op === 'global.set') return new SetVarNode(String(elem[1]).replace(/^\$/, ''), this.parseInstruction(elem[2]) || new ConstNode(0, Type.I32));
        if (op === 'call') return new CallNode(String(elem[1]).replace(/^\$/, ''), elem.slice(2).map(e => this.parseInstruction(e)).filter(Boolean));
        if (op?.includes('.const')) return new ConstNode(Number(elem[1] || 0), op.split('.')[0]);
        if (op?.includes('.add')) return new BinaryOpNode('+', this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));
        if (op?.includes('.sub')) return new BinaryOpNode('-', this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));
        if (op?.includes('.mul')) return new BinaryOpNode('*', this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));
        if (op?.includes('.div')) return new BinaryOpNode('/', this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));
        if (op === 'return') return new ReturnNode(this.parseInstruction(elem[1]));

        return null;
    }
}
