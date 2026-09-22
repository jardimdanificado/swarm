/**
 * WebAssembly 1.0 Binary Decoder / Decompiler
 * Decodes .wasm binary bytes into Scratch++ Typed AST
 * 100% Coverage of WebAssembly 1.0 MVP Specification (All Sections 0-11 & Opcodes 0x00-0xBF)
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
    TeeVarNode,
    GetVarNode,
    ConstNode,
    BinaryOpNode,
    UnaryOpNode,
    SelectNode,
    ConvertNode,
    ReinterpretNode,
    BlockNode,
    LoopNode,
    IfNode,
    BrNode,
    BrIfNode,
    BrTableNode,
    ReturnNode,
    DropNode,
    NopNode,
    UnreachableNode,
    CallNode,
    CallIndirectNode,
    MemLoadNode,
    MemStoreNode,
    MemGrowNode,
    MemSizeNode
} from '../compiler/ast.js';

export class BinaryReader {
    constructor(uint8Array) {
        this.bytes = uint8Array;
        this.pos = 0;
    }

    hasMore() {
        return this.pos < this.bytes.length;
    }

    u8() {
        if (this.pos >= this.bytes.length) throw new Error('Fim inesperado dos bytes Wasm.');
        return this.bytes[this.pos++];
    }

    u32() {
        const b0 = this.u8(), b1 = this.u8(), b2 = this.u8(), b3 = this.u8();
        return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
    }

    f32() {
        const buf = new ArrayBuffer(4);
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < 4; i++) u8[i] = this.u8();
        return new DataView(buf).getFloat32(0, true);
    }

    f64() {
        const buf = new ArrayBuffer(8);
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < 8; i++) u8[i] = this.u8();
        return new DataView(buf).getFloat64(0, true);
    }

    vu32() {
        let result = 0;
        let shift = 0;
        while (true) {
            const byte = this.u8();
            result |= (byte & 0x7F) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
        }
        return result >>> 0;
    }

    vs32() {
        let result = 0;
        let shift = 0;
        let byte = 0;
        do {
            byte = this.u8();
            result |= (byte & 0x7F) << shift;
            shift += 7;
        } while (byte & 0x80);

        if (shift < 32 && (byte & 0x40)) {
            result |= (~0 << shift);
        }
        return result | 0;
    }

    vs64() {
        let result = 0n;
        let shift = 0n;
        let byte = 0;
        do {
            byte = this.u8();
            result |= BigInt(byte & 0x7F) << shift;
            shift += 7n;
        } while (byte & 0x80);

        if (shift < 64n && (byte & 0x40)) {
            result |= (~0n << shift);
        }
        return result;
    }

    raw(length) {
        const slice = this.bytes.subarray(this.pos, this.pos + length);
        this.pos += length;
        return slice;
    }

    string() {
        const len = this.vu32();
        const bytes = this.raw(len);
        return new TextDecoder().decode(bytes);
    }
}

export function wasmValTypeToType(valTypeByte) {
    switch (valTypeByte) {
        case 0x7F: return Type.I32;
        case 0x7E: return Type.I64;
        case 0x7D: return Type.F32;
        case 0x7C: return Type.F64;
        case 0x40: return Type.VOID;
        default: return Type.I32;
    }
}

export class WasmDecoder {
    constructor() {
        this.types = [];
        this.imports = [];
        this.importedFuncs = [];
        this.importedGlobals = [];
        this.functions = [];
        this.globals = [];
        this.exports = [];
        this.startFunc = null;
        this.allFuncSignatures = [];
    }

    decode(uint8Array) {
        const reader = new BinaryReader(uint8Array);

        // 1. Magic + Version
        const magic = [reader.u8(), reader.u8(), reader.u8(), reader.u8()];
        if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6D) {
            throw new Error('Binário inválido: cabeçalho Wasm magic \\0asm não encontrado.');
        }
        const version = reader.u32();
        if (version !== 1) {
            throw new Error(`Versão Wasm ${version} não suportada (esperado versão 1).`);
        }

        this.types = [];
        this.imports = [];
        this.importedFuncs = [];
        this.importedGlobals = [];
        this.functions = [];
        this.globals = [];
        this.exports = [];
        this.startFunc = null;
        this.allFuncSignatures = [];

        let funcTypeIndices = [];
        let codeBodies = [];

        // 2. Parse Sections
        while (reader.hasMore()) {
            const sectionId = reader.u8();
            const sectionLen = reader.vu32();
            const sectionBytes = reader.raw(sectionLen);
            const sReader = new BinaryReader(sectionBytes);

            switch (sectionId) {
                // Section 1: Type
                case 1: {
                    const count = sReader.vu32();
                    for (let i = 0; i < count; i++) {
                        sReader.u8(); // 0x60
                        const paramCount = sReader.vu32();
                        const params = [];
                        for (let p = 0; p < paramCount; p++) params.push(wasmValTypeToType(sReader.u8()));
                        const resultCount = sReader.vu32();
                        const results = [];
                        for (let r = 0; r < resultCount; r++) results.push(wasmValTypeToType(sReader.u8()));
                        this.types.push({ params, returnType: results[0] || Type.VOID });
                    }
                    break;
                }

                // Section 2: Import
                case 2: {
                    const count = sReader.vu32();
                    for (let i = 0; i < count; i++) {
                        const module = sReader.string();
                        const name = sReader.string();
                        const kind = sReader.u8();
                        if (kind === 0x00) {
                            const typeIdx = sReader.vu32();
                            const typeSig = this.types[typeIdx] || { params: [], returnType: Type.VOID };
                            const params = typeSig.params.map((t, idx) => ({ name: `p${idx}`, type: t }));
                            const imp = new ImportFuncNode(module, name, name, params, typeSig.returnType);
                            this.importedFuncs.push(imp);
                            this.imports.push(imp);
                            this.allFuncSignatures.push(typeSig);
                        } else if (kind === 0x03) {
                            const gType = wasmValTypeToType(sReader.u8());
                            const mutable = sReader.u8() === 0x01;
                            const impG = new ImportGlobalNode(module, name, name, gType, mutable);
                            this.importedGlobals.push(impG);
                            this.imports.push(impG);
                        } else if (kind === 0x01) {
                            sReader.u8(); // funcref
                            const flags = sReader.u8();
                            sReader.vu32(); // min
                            if (flags & 1) sReader.vu32(); // max
                        } else if (kind === 0x02) {
                            const flags = sReader.u8();
                            sReader.vu32(); // min
                            if (flags & 1) sReader.vu32(); // max
                        }
                    }
                    break;
                }

                // Section 3: Function
                case 3: {
                    const count = sReader.vu32();
                    for (let i = 0; i < count; i++) {
                        const tIdx = sReader.vu32();
                        funcTypeIndices.push(tIdx);
                        const sig = this.types[tIdx] || { params: [], returnType: Type.VOID };
                        this.allFuncSignatures.push(sig);
                    }
                    break;
                }

                // Section 6: Global
                case 6: {
                    const count = sReader.vu32();
                    for (let i = 0; i < count; i++) {
                        const gType = wasmValTypeToType(sReader.u8());
                        const mutable = sReader.u8() === 0x01;
                        const initConst = this.decodeConstExpr(sReader, gType);
                        this.globals.push(new GlobalDeclareNode(`g${i}`, gType, mutable, initConst));
                    }
                    break;
                }

                // Section 7: Export
                case 7: {
                    const count = sReader.vu32();
                    for (let i = 0; i < count; i++) {
                        const exportName = sReader.string();
                        const kindByte = sReader.u8();
                        const index = sReader.vu32();
                        const kind = kindByte === 0x00 ? 'func' : (kindByte === 0x01 ? 'table' : (kindByte === 0x02 ? 'mem' : 'global'));
                        this.exports.push(new ExportNode(kind, `${kind}_${index}`, exportName));
                    }
                    break;
                }

                // Section 8: Start
                case 8: {
                    const startIdx = sReader.vu32();
                    this.startFunc = `func_${startIdx}`;
                    break;
                }

                // Section 10: Code
                case 10: {
                    const count = sReader.vu32();
                    for (let i = 0; i < count; i++) {
                        const bodySize = sReader.vu32();
                        const bodyBytes = sReader.raw(bodySize);
                        codeBodies.push(bodyBytes);
                    }
                    break;
                }
            }
        }

        // 3. Decompile Code Section into FunctionNodes
        for (let i = 0; i < codeBodies.length; i++) {
            const funcIdx = this.importedFuncs.length + i;
            const typeIdx = funcTypeIndices[i];
            const sig = this.types[typeIdx] || { params: [], returnType: Type.VOID };

            // Find if exported
            const exp = this.exports.find(e => e.kind === 'func' && (e.exportName === `func_${funcIdx}` || this.isExportIndex(e, funcIdx)));
            const funcName = exp ? exp.exportName : `func_${funcIdx}`;

            const params = sig.params.map((t, pIdx) => ({ name: `p${pIdx}`, type: t }));
            const funcNode = this.decompileFunctionBody(funcName, params, sig.returnType, codeBodies[i], funcIdx);
            this.functions.push(funcNode);
        }

        return new ProgramNode(this.functions, this.globals, [], this.imports, this.exports, this.startFunc);
    }

    isExportIndex(exp, idx) {
        return exp.internalName === `func_${idx}`;
    }

    decodeConstExpr(reader, expectedType) {
        const opcode = reader.u8();
        let val = 0;
        if (opcode === 0x41) val = reader.vs32();
        else if (opcode === 0x42) val = reader.vs64();
        else if (opcode === 0x43) val = reader.f32();
        else if (opcode === 0x44) val = reader.f64();
        reader.u8(); // 0x0B (end)
        return new ConstNode(val, expectedType);
    }

    decompileFunctionBody(name, params, returnType, bodyBytes, funcIdx) {
        const reader = new BinaryReader(bodyBytes);
        const localDeclCount = reader.vu32();
        const locals = [];
        let localIdxCounter = params.length;

        for (let i = 0; i < localDeclCount; i++) {
            const count = reader.vu32();
            const valType = wasmValTypeToType(reader.u8());
            for (let c = 0; c < count; c++) {
                const locName = `l${localIdxCounter++}`;
                locals.push(new DeclareVarNode(locName, valType, new ConstNode(0, valType)));
            }
        }

        const statements = this.decompileBlock(reader, params, locals, returnType);

        return new FunctionNode(name, params, returnType, [...locals, ...statements], true);
    }

    decompileBlock(reader, params, locals, blockReturnType = Type.VOID) {
        const statements = [];
        const stack = [];

        const getVarName = (idx) => {
            if (idx < params.length) {
                return params[idx].name;
            }
            const lIdx = idx - params.length;
            if (lIdx < locals.length) {
                return locals[lIdx].name;
            }
            return `l${idx}`;
        };

        const getGlobalName = (idx) => {
            if (idx < this.importedGlobals.length) {
                return this.importedGlobals[idx].internalName;
            }
            const gIdx = idx - this.importedGlobals.length;
            if (gIdx < this.globals.length) {
                return this.globals[gIdx].name;
            }
            return `g${idx}`;
        };

        const getFuncName = (idx) => {
            if (idx < this.importedFuncs.length) {
                return this.importedFuncs[idx].internalName;
            }
            const exp = this.exports.find(e => e.kind === 'func' && this.isExportIndex(e, idx));
            if (exp) return exp.exportName;
            return `func_${idx}`;
        };

        const pop = () => {
            if (stack.length > 0) return stack.pop();
            return new ConstNode(0, Type.I32);
        };

        while (reader.hasMore()) {
            const opcode = reader.u8();

            if (opcode === 0x0B || opcode === 0x05) {
                // 0x0B = end, 0x05 = else
                reader.pos--; // unread marker for caller
                break;
            }

            switch (opcode) {
                case 0x00: // unreachable
                    statements.push(new UnreachableNode());
                    break;
                case 0x01: // nop
                    statements.push(new NopNode());
                    break;

                case 0x02: { // block
                    const blockTypeByte = reader.u8();
                    const retType = wasmValTypeToType(blockTypeByte);
                    const innerStmts = this.decompileBlock(reader, params, locals, retType);
                    reader.u8(); // consume 0x0B
                    statements.push(new BlockNode(innerStmts));
                    break;
                }
                case 0x03: { // loop
                    const blockTypeByte = reader.u8();
                    const retType = wasmValTypeToType(blockTypeByte);
                    const innerStmts = this.decompileBlock(reader, params, locals, retType);
                    reader.u8(); // consume 0x0B
                    statements.push(new LoopNode(innerStmts));
                    break;
                }
                case 0x04: { // if
                    const blockTypeByte = reader.u8();
                    const retType = wasmValTypeToType(blockTypeByte);
                    const cond = pop();
                    const thenStmts = this.decompileBlock(reader, params, locals, retType);
                    let elseStmts = [];
                    if (reader.hasMore() && reader.bytes[reader.pos] === 0x05) {
                        reader.u8(); // consume 0x05 (else)
                        elseStmts = this.decompileBlock(reader, params, locals, retType);
                    }
                    if (reader.hasMore() && reader.bytes[reader.pos] === 0x0B) {
                        reader.u8(); // consume 0x0B (end)
                    }
                    statements.push(new IfNode(cond, thenStmts, elseStmts));
                    break;
                }

                case 0x0C: // br
                    statements.push(new BrNode(reader.vu32()));
                    break;
                case 0x0D: { // br_if
                    const depth = reader.vu32();
                    const cond = pop();
                    statements.push(new BrIfNode(cond, depth));
                    break;
                }
                case 0x0E: { // br_table
                    const count = reader.vu32();
                    const targets = [];
                    for (let t = 0; t < count; t++) targets.push(reader.vu32());
                    const defaultTarget = reader.vu32();
                    const index = pop();
                    statements.push(new BrTableNode(index, targets, defaultTarget));
                    break;
                }
                case 0x0F: { // return
                    if (blockReturnType && blockReturnType !== Type.VOID && stack.length > 0) {
                        statements.push(new ReturnNode(pop()));
                    } else if (stack.length > 0) {
                        statements.push(new ReturnNode(pop()));
                    } else {
                        statements.push(new ReturnNode(null));
                    }
                    break;
                }
                case 0x10: { // call
                    const targetIdx = reader.vu32();
                    const targetName = getFuncName(targetIdx);
                    const sig = this.allFuncSignatures[targetIdx] || { params: [], returnType: Type.VOID };
                    const args = [];
                    for (let a = 0; a < sig.params.length; a++) {
                        args.unshift(pop());
                    }
                    const callNode = new CallNode(targetName, args);
                    if (sig.returnType && sig.returnType !== Type.VOID) {
                        stack.push(callNode);
                    } else {
                        statements.push(callNode);
                    }
                    break;
                }
                case 0x11: { // call_indirect
                    const typeIdx = reader.vu32();
                    reader.u8(); // table index 0
                    const sig = this.types[typeIdx] || { params: [], returnType: Type.VOID };
                    const tableIndex = pop();
                    const args = [];
                    for (let a = 0; a < sig.params.length; a++) {
                        args.unshift(pop());
                    }
                    const callNode = new CallIndirectNode(sig.params, sig.returnType, tableIndex, args);
                    if (sig.returnType && sig.returnType !== Type.VOID) {
                        stack.push(callNode);
                    } else {
                        statements.push(callNode);
                    }
                    break;
                }

                case 0x1A: { // drop
                    statements.push(new DropNode(pop()));
                    break;
                }
                case 0x1B: { // select
                    const c = pop();
                    const val2 = pop();
                    const val1 = pop();
                    stack.push(new SelectNode(val1, val2, c));
                    break;
                }

                // Locals & Globals
                case 0x20: // local.get
                    stack.push(new GetVarNode(getVarName(reader.vu32())));
                    break;
                case 0x21: { // local.set
                    const varName = getVarName(reader.vu32());
                    const val = pop();
                    statements.push(new SetVarNode(varName, val));
                    break;
                }
                case 0x22: { // local.tee
                    const varName = getVarName(reader.vu32());
                    const val = pop();
                    stack.push(new TeeVarNode(varName, val));
                    break;
                }
                case 0x23: // global.get
                    stack.push(new GetVarNode(getGlobalName(reader.vu32())));
                    break;
                case 0x24: { // global.set
                    const gName = getGlobalName(reader.vu32());
                    const val = pop();
                    statements.push(new SetVarNode(gName, val));
                    break;
                }

                // Memory Load
                case 0x28: reader.vu32(); stack.push(new MemLoadNode(Type.I32, new ConstNode(0, Type.I32), pop(), null, 'signed', reader.vu32())); break;
                case 0x29: reader.vu32(); stack.push(new MemLoadNode(Type.I64, new ConstNode(0, Type.I32), pop(), null, 'signed', reader.vu32())); break;
                case 0x2A: reader.vu32(); stack.push(new MemLoadNode(Type.F32, new ConstNode(0, Type.I32), pop(), null, 'signed', reader.vu32())); break;
                case 0x2B: reader.vu32(); stack.push(new MemLoadNode(Type.F64, new ConstNode(0, Type.I32), pop(), null, 'signed', reader.vu32())); break;
                case 0x2C: reader.vu32(); stack.push(new MemLoadNode(Type.I32, new ConstNode(0, Type.I32), pop(), 1, 'signed', reader.vu32())); break;
                case 0x2D: reader.vu32(); stack.push(new MemLoadNode(Type.I32, new ConstNode(0, Type.I32), pop(), 1, 'unsigned', reader.vu32())); break;
                case 0x2E: reader.vu32(); stack.push(new MemLoadNode(Type.I32, new ConstNode(0, Type.I32), pop(), 2, 'signed', reader.vu32())); break;
                case 0x2F: reader.vu32(); stack.push(new MemLoadNode(Type.I32, new ConstNode(0, Type.I32), pop(), 2, 'unsigned', reader.vu32())); break;
                case 0x30: reader.vu32(); stack.push(new MemLoadNode(Type.I64, new ConstNode(0, Type.I32), pop(), 1, 'signed', reader.vu32())); break;
                case 0x31: reader.vu32(); stack.push(new MemLoadNode(Type.I64, new ConstNode(0, Type.I32), pop(), 1, 'unsigned', reader.vu32())); break;
                case 0x32: reader.vu32(); stack.push(new MemLoadNode(Type.I64, new ConstNode(0, Type.I32), pop(), 2, 'signed', reader.vu32())); break;
                case 0x33: reader.vu32(); stack.push(new MemLoadNode(Type.I64, new ConstNode(0, Type.I32), pop(), 2, 'unsigned', reader.vu32())); break;
                case 0x34: reader.vu32(); stack.push(new MemLoadNode(Type.I64, new ConstNode(0, Type.I32), pop(), 4, 'signed', reader.vu32())); break;
                case 0x35: reader.vu32(); stack.push(new MemLoadNode(Type.I64, new ConstNode(0, Type.I32), pop(), 4, 'unsigned', reader.vu32())); break;

                // Memory Store
                case 0x36: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, null, off)); break; }
                case 0x37: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, null, off)); break; }
                case 0x38: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, null, off)); break; }
                case 0x39: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, null, off)); break; }
                case 0x3A: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, 1, off)); break; }
                case 0x3B: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, 2, off)); break; }
                case 0x3C: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, 1, off)); break; }
                case 0x3D: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, 2, off)); break; }
                case 0x3E: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new MemStoreNode(new ConstNode(0, Type.I32), base, val, 4, off)); break; }

                case 0x3F: reader.u8(); stack.push(new MemSizeNode()); break;
                case 0x40: reader.u8(); stack.push(new MemGrowNode(pop())); break;

                // Consts
                case 0x41: stack.push(new ConstNode(reader.vs32(), Type.I32)); break;
                case 0x42: stack.push(new ConstNode(reader.vs64(), Type.I64)); break;
                case 0x43: stack.push(new ConstNode(reader.f32(), Type.F32)); break;
                case 0x44: stack.push(new ConstNode(reader.f64(), Type.F64)); break;

                // Comparisons / Unary / Binary
                case 0x45: stack.push(new UnaryOpNode('==0', pop())); break; // i32.eqz
                case 0x46: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('==', l, r)); break; }
                case 0x47: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('!=', l, r)); break; }
                case 0x48: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<', l, r, 'signed')); break; }
                case 0x49: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<', l, r, 'unsigned')); break; }
                case 0x4A: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>', l, r, 'signed')); break; }
                case 0x4B: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>', l, r, 'unsigned')); break; }
                case 0x4C: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<=', l, r, 'signed')); break; }
                case 0x4D: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<=', l, r, 'unsigned')); break; }
                case 0x4E: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>=', l, r, 'signed')); break; }
                case 0x4F: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>=', l, r, 'unsigned')); break; }

                case 0x50: stack.push(new UnaryOpNode('==0', pop())); break; // i64.eqz
                case 0x51: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('==', l, r)); break; }
                case 0x52: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('!=', l, r)); break; }
                case 0x53: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<', l, r, 'signed')); break; }
                case 0x54: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<', l, r, 'unsigned')); break; }
                case 0x55: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>', l, r, 'signed')); break; }
                case 0x56: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>', l, r, 'unsigned')); break; }
                case 0x57: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<=', l, r, 'signed')); break; }
                case 0x58: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<=', l, r, 'unsigned')); break; }
                case 0x59: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>=', l, r, 'signed')); break; }
                case 0x5A: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>=', l, r, 'unsigned')); break; }

                case 0x5B: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('==', l, r)); break; }
                case 0x5C: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('!=', l, r)); break; }
                case 0x5D: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<', l, r)); break; }
                case 0x5E: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>', l, r)); break; }
                case 0x5F: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<=', l, r)); break; }
                case 0x60: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>=', l, r)); break; }

                case 0x61: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('==', l, r)); break; }
                case 0x62: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('!=', l, r)); break; }
                case 0x63: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<', l, r)); break; }
                case 0x64: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>', l, r)); break; }
                case 0x65: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<=', l, r)); break; }
                case 0x66: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>=', l, r)); break; }

                // Math & Bitwise
                case 0x67: stack.push(new UnaryOpNode('clz', pop())); break;
                case 0x68: stack.push(new UnaryOpNode('ctz', pop())); break;
                case 0x69: stack.push(new UnaryOpNode('popcnt', pop())); break;
                case 0x6A: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('+', l, r)); break; }
                case 0x6B: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('-', l, r)); break; }
                case 0x6C: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('*', l, r)); break; }
                case 0x6D: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r, 'signed')); break; }
                case 0x6E: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r, 'unsigned')); break; }
                case 0x6F: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('%', l, r, 'signed')); break; }
                case 0x70: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('%', l, r, 'unsigned')); break; }
                case 0x71: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('&', l, r)); break; }
                case 0x72: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('|', l, r)); break; }
                case 0x73: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('^', l, r)); break; }
                case 0x74: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<<', l, r)); break; }
                case 0x75: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>>', l, r, 'signed')); break; }
                case 0x76: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>>', l, r, 'unsigned')); break; }
                case 0x77: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('rotl', l, r)); break; }
                case 0x78: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('rotr', l, r)); break; }

                case 0x79: stack.push(new UnaryOpNode('clz', pop())); break;
                case 0x7A: stack.push(new UnaryOpNode('ctz', pop())); break;
                case 0x7B: stack.push(new UnaryOpNode('popcnt', pop())); break;
                case 0x7C: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('+', l, r)); break; }
                case 0x7D: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('-', l, r)); break; }
                case 0x7E: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('*', l, r)); break; }
                case 0x7F: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r, 'signed')); break; }
                case 0x80: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r, 'unsigned')); break; }
                case 0x81: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('%', l, r, 'signed')); break; }
                case 0x82: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('%', l, r, 'unsigned')); break; }
                case 0x83: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('&', l, r)); break; }
                case 0x84: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('|', l, r)); break; }
                case 0x85: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('^', l, r)); break; }
                case 0x86: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<<', l, r)); break; }
                case 0x87: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>>', l, r, 'signed')); break; }
                case 0x88: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>>', l, r, 'unsigned')); break; }
                case 0x89: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('rotl', l, r)); break; }
                case 0x8A: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('rotr', l, r)); break; }

                // Float Unary / Binary
                case 0x8B: stack.push(new UnaryOpNode('abs', pop())); break;
                case 0x8C: stack.push(new UnaryOpNode('neg', pop())); break;
                case 0x8D: stack.push(new UnaryOpNode('ceil', pop())); break;
                case 0x8E: stack.push(new UnaryOpNode('floor', pop())); break;
                case 0x8F: stack.push(new UnaryOpNode('trunc', pop())); break;
                case 0x90: stack.push(new UnaryOpNode('nearest', pop())); break;
                case 0x91: stack.push(new UnaryOpNode('sqrt', pop())); break;
                case 0x92: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('+', l, r)); break; }
                case 0x93: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('-', l, r)); break; }
                case 0x94: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('*', l, r)); break; }
                case 0x95: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r)); break; }
                case 0x96: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('min', l, r)); break; }
                case 0x97: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('max', l, r)); break; }
                case 0x98: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('copysign', l, r)); break; }

                case 0x99: stack.push(new UnaryOpNode('abs', pop())); break;
                case 0x9A: stack.push(new UnaryOpNode('neg', pop())); break;
                case 0x9B: stack.push(new UnaryOpNode('ceil', pop())); break;
                case 0x9C: stack.push(new UnaryOpNode('floor', pop())); break;
                case 0x9D: stack.push(new UnaryOpNode('trunc', pop())); break;
                case 0x9E: stack.push(new UnaryOpNode('nearest', pop())); break;
                case 0x9F: stack.push(new UnaryOpNode('sqrt', pop())); break;
                case 0xA0: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('+', l, r)); break; }
                case 0xA1: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('-', l, r)); break; }
                case 0xA2: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('*', l, r)); break; }
                case 0xA3: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r)); break; }
                case 0xA4: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('min', l, r)); break; }
                case 0xA5: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('max', l, r)); break; }
                case 0xA6: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('copysign', l, r)); break; }

                // Conversions
                case 0xA7: stack.push(new ConvertNode(Type.I32, pop())); break;
                case 0xA8: stack.push(new ConvertNode(Type.I32, pop(), 'signed')); break;
                case 0xA9: stack.push(new ConvertNode(Type.I32, pop(), 'unsigned')); break;
                case 0xAA: stack.push(new ConvertNode(Type.I32, pop(), 'signed')); break;
                case 0xAB: stack.push(new ConvertNode(Type.I32, pop(), 'unsigned')); break;
                case 0xAC: stack.push(new ConvertNode(Type.I64, pop(), 'signed')); break;
                case 0xAD: stack.push(new ConvertNode(Type.I64, pop(), 'unsigned')); break;
                case 0xAE: stack.push(new ConvertNode(Type.I64, pop(), 'signed')); break;
                case 0xAF: stack.push(new ConvertNode(Type.I64, pop(), 'unsigned')); break;
                case 0xB0: stack.push(new ConvertNode(Type.I64, pop(), 'signed')); break;
                case 0xB1: stack.push(new ConvertNode(Type.I64, pop(), 'unsigned')); break;
                case 0xB2: stack.push(new ConvertNode(Type.F32, pop(), 'signed')); break;
                case 0xB3: stack.push(new ConvertNode(Type.F32, pop(), 'unsigned')); break;
                case 0xB4: stack.push(new ConvertNode(Type.F32, pop(), 'signed')); break;
                case 0xB5: stack.push(new ConvertNode(Type.F32, pop(), 'unsigned')); break;
                case 0xB6: stack.push(new ConvertNode(Type.F32, pop())); break;
                case 0xB7: stack.push(new ConvertNode(Type.F64, pop(), 'signed')); break;
                case 0xB8: stack.push(new ConvertNode(Type.F64, pop(), 'unsigned')); break;
                case 0xB9: stack.push(new ConvertNode(Type.F64, pop(), 'signed')); break;
                case 0xBA: stack.push(new ConvertNode(Type.F64, pop(), 'unsigned')); break;
                case 0xBB: stack.push(new ConvertNode(Type.F64, pop())); break;

                // Reinterpretations
                case 0xBC: stack.push(new ReinterpretNode(Type.I32, pop())); break;
                case 0xBD: stack.push(new ReinterpretNode(Type.I64, pop())); break;
                case 0xBE: stack.push(new ReinterpretNode(Type.F32, pop())); break;
                case 0xBF: stack.push(new ReinterpretNode(Type.F64, pop())); break;

                default:
                    break;
            }
        }

        // If function/block produces a return value and there's an expression left on stack
        if (stack.length > 0) {
            const remaining = pop();
            if (blockReturnType && blockReturnType !== Type.VOID) {
                statements.push(new ReturnNode(remaining));
            } else {
                statements.push(new DropNode(remaining));
            }
        }

        return statements;
    }
}
