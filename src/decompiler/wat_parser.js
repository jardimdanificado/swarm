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
    TableDeclareNode,
    DeclareVarNode,
    SetVarNode,
    GetVarNode,
    ConstNode,
    BinaryOpNode,
    UnaryOpNode,
    SignExtendNode,
    TruncSatNode,
    SelectNode,
    ReturnNode,
    CallNode,
    CallIndirectNode,
    ReturnCallNode,
    ReturnCallIndirectNode,
    NopNode,
    UnreachableNode,
    DropNode,
    MemCopyNode,
    MemFillNode,
    MemInitNode,
    DataDropNode,
    RefNullNode,
    RefIsNullNode,
    RefFuncNode,
    TableGetNode,
    TableSetNode,
    TableSizeNode,
    TableGrowNode,
    TableFillNode,
    TableCopyNode,
    TableInitNode,
    ElemDropNode,
    V128ConstNode,
    V128SplatNode,
    V128ExtractLaneNode,
    V128ReplaceLaneNode,
    V128OpNode,
    V128BitSelectNode,
    V128LoadNode,
    V128StoreNode
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
        const tables = [];
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
            } else if (kind === 'table') {
                let tName = `table_${tables.length}`;
                let min = 0;
                let max = null;
                let elemType = Type.FUNCREF;
                for (let t = 1; t < item.length; t++) {
                    const elem = item[t];
                    if (typeof elem === 'string' && elem.startsWith('$')) {
                        tName = elem.substring(1);
                    } else if (typeof elem === 'string' && !isNaN(Number(elem))) {
                        if (min === 0) min = Number(elem);
                        else max = Number(elem);
                    } else if (typeof elem === 'string' && (elem === 'funcref' || elem === 'externref')) {
                        elemType = elem;
                    }
                }
                tables.push(new TableDeclareNode(tName, elemType, min, max));
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

        return new ProgramNode(functions, globals, [], imports, exports, startFunc, tables);
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
        if (op === 'return_call') return new ReturnCallNode(String(elem[1]).replace(/^\$/, ''), elem.slice(2).map(e => this.parseInstruction(e)).filter(Boolean));
        if (op === 'call_indirect') return new CallIndirectNode(Type.I32, [], this.parseInstruction(elem[elem.length - 1]), elem.slice(1, -1).map(e => this.parseInstruction(e)).filter(Boolean), 0);
        if (op === 'return_call_indirect') return new ReturnCallIndirectNode(Type.I32, [], this.parseInstruction(elem[elem.length - 1]), elem.slice(1, -1).map(e => this.parseInstruction(e)).filter(Boolean), 0);
        if (op === 'drop') return new DropNode(this.parseInstruction(elem[1]));
        if (op === 'select') return new SelectNode(this.parseInstruction(elem[3]), this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));

        // Sign extension
        if (op === 'i32.extend8_s') return new SignExtendNode(this.parseInstruction(elem[1]), 8, Type.I32);
        if (op === 'i32.extend16_s') return new SignExtendNode(this.parseInstruction(elem[1]), 16, Type.I32);
        if (op === 'i64.extend8_s') return new SignExtendNode(this.parseInstruction(elem[1]), 8, Type.I64);
        if (op === 'i64.extend16_s') return new SignExtendNode(this.parseInstruction(elem[1]), 16, Type.I64);
        if (op === 'i64.extend32_s') return new SignExtendNode(this.parseInstruction(elem[1]), 32, Type.I64);

        // Trunc sat
        if (op.includes('.trunc_sat_')) {
            const parts = op.split('.trunc_sat_');
            const destType = parts[0];
            const isSigned = parts[1].endsWith('_s');
            const srcType = parts[1].replace(/_[su]$/, '');
            return new TruncSatNode(this.parseInstruction(elem[1]), srcType, destType, isSigned);
        }

        // Bulk memory
        if (op === 'memory.copy') return new MemCopyNode(this.parseInstruction(elem[1]), this.parseInstruction(elem[2]), this.parseInstruction(elem[3]));
        if (op === 'memory.fill') return new MemFillNode(this.parseInstruction(elem[1]), this.parseInstruction(elem[2]), this.parseInstruction(elem[3]));
        if (op === 'memory.init') return new MemInitNode(Number(elem[1] || 0), this.parseInstruction(elem[2]), this.parseInstruction(elem[3]), this.parseInstruction(elem[4]));
        if (op === 'data.drop') return new DataDropNode(Number(elem[1] || 0));

        // Reference types & Table
        if (op === 'ref.null') return new RefNullNode(elem[1] || Type.FUNCREF);
        if (op === 'ref.is_null') return new RefIsNullNode(this.parseInstruction(elem[1]));
        if (op === 'ref.func') return new RefFuncNode(String(elem[1]).replace(/^\$/, ''));
        if (op === 'table.get') {
            const tableIdx = isNaN(Number(elem[1])) ? 0 : Number(elem[1]);
            const offset = this.parseInstruction(elem[elem.length - 1]);
            return new TableGetNode(tableIdx, offset);
        }
        if (op === 'table.set') {
            const tableIdx = isNaN(Number(elem[1])) ? 0 : Number(elem[1]);
            const offset = this.parseInstruction(elem[elem.length - 2]);
            const val = this.parseInstruction(elem[elem.length - 1]);
            return new TableSetNode(tableIdx, offset, val);
        }
        if (op === 'table.size') return new TableSizeNode(Number(elem[1] || 0));
        if (op === 'table.grow') return new TableGrowNode(Number(elem[1] || 0), this.parseInstruction(elem[2]), this.parseInstruction(elem[3]));
        if (op === 'table.fill') return new TableFillNode(Number(elem[1] || 0), this.parseInstruction(elem[2]), this.parseInstruction(elem[3]), this.parseInstruction(elem[4]));
        if (op === 'table.copy') return new TableCopyNode(Number(elem[1] || 0), Number(elem[2] || 0), this.parseInstruction(elem[3]), this.parseInstruction(elem[4]), this.parseInstruction(elem[5]));
        if (op === 'table.init') return new TableInitNode(Number(elem[1] || 0), Number(elem[2] || 0), this.parseInstruction(elem[3]), this.parseInstruction(elem[4]), this.parseInstruction(elem[5]));
        if (op === 'elem.drop') return new ElemDropNode(Number(elem[1] || 0));

        // SIMD v128
        if (op === 'v128.const') {
            const bytes = new Uint8Array(16);
            for (let b = 1; b <= 16 && b < elem.length; b++) {
                bytes[b - 1] = Number(elem[b]) & 0xFF;
            }
            return new V128ConstNode(bytes);
        }
        if (op.endsWith('.splat')) {
            const laneType = op.split('.')[0];
            return new V128SplatNode(laneType, this.parseInstruction(elem[1]));
        }
        if (op.includes('.extract_lane')) {
            const laneType = op.split('.')[0];
            return new V128ExtractLaneNode(laneType, Number(elem[1] || 0), this.parseInstruction(elem[2]));
        }
        if (op.includes('.replace_lane')) {
            const laneType = op.split('.')[0];
            return new V128ReplaceLaneNode(laneType, Number(elem[1] || 0), this.parseInstruction(elem[2]), this.parseInstruction(elem[3]));
        }
        if (op === 'v128.bitselect') return new V128BitSelectNode(this.parseInstruction(elem[1]), this.parseInstruction(elem[2]), this.parseInstruction(elem[3]));
        if (op === 'v128.load') return new V128LoadNode(this.parseInstruction(elem[1]), 0);
        if (op === 'v128.store') return new V128StoreNode(this.parseInstruction(elem[1]), this.parseInstruction(elem[2]), 0);

        // SIMD binary ops
        if (op.startsWith('i8x16.') || op.startsWith('i16x8.') || op.startsWith('i32x4.') || op.startsWith('i64x2.') || op.startsWith('f32x4.') || op.startsWith('f64x2.')) {
            const [laneType, simdOp] = op.split('.');
            return new V128OpNode(op, [this.parseInstruction(elem[1]), this.parseInstruction(elem[2])].filter(Boolean));
        }

        // Standard const & ops
        if (op?.includes('.const')) return new ConstNode(Number(elem[1] || 0), op.split('.')[0]);
        if (op?.includes('.add')) return new BinaryOpNode('+', this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));
        if (op?.includes('.sub')) return new BinaryOpNode('-', this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));
        if (op?.includes('.mul')) return new BinaryOpNode('*', this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));
        if (op?.includes('.div')) return new BinaryOpNode('/', this.parseInstruction(elem[1]), this.parseInstruction(elem[2]));
        if (op === 'return') return new ReturnNode(this.parseInstruction(elem[1]));

        return null;
    }
}
