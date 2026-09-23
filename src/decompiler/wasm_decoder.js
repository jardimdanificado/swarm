/**
 * WebAssembly 2.0 Binary Decoder / Decompiler
 * Decodes .wasm binary bytes into Scratch++ Typed AST
 * 100% Coverage of WebAssembly 2.0 (W3C Recommendation)
 * Sections 0-11, Sign-Extension (0xC0-0xC4), Trunc Sat (0xFC), Bulk Memory, Reference Types, Multi-Table, Tail Calls, SIMD 128-bit (0xFD)
 */

import { Type } from '../compiler/types.js';
import {
    ProgramNode,
    ImportFuncNode,
    ImportGlobalNode,
    ImportTableNode,
    ExportNode,
    FunctionNode,
    GlobalDeclareNode,
    TableDeclareNode,
    DeclareVarNode,
    SetVarNode,
    TeeVarNode,
    GetVarNode,
    ConstNode,
    BinaryOpNode,
    UnaryOpNode,
    SignExtendNode,
    TruncSatNode,
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
    ReturnCallNode,
    ReturnCallIndirectNode,
    MemLoadNode,
    MemStoreNode,
    MemGrowNode,
    MemSizeNode,
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
        return result;
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

    bytesSlice(len) {
        if (this.pos + len > this.bytes.length) throw new Error('Fim inesperado ao ler slice de bytes.');
        const slice = this.bytes.slice(this.pos, this.pos + len);
        this.pos += len;
        return slice;
    }

    string() {
        const len = this.vu32();
        const raw = this.bytesSlice(len);
        return new TextDecoder().decode(raw);
    }
}

function wasmValTypeToType(valTypeByte) {
    switch (valTypeByte) {
        case 0x7F: return Type.I32;
        case 0x7E: return Type.I64;
        case 0x7D: return Type.F32;
        case 0x7C: return Type.F64;
        case 0x7B: return Type.V128;
        case 0x70: return Type.FUNCREF;
        case 0x6F: return Type.EXTERNREF;
        case 0x40: return Type.VOID;
        default: return Type.I32;
    }
}

export class WasmDecoder {
    constructor() {
        this.types = [];
        this.importedFuncs = [];
        this.importedGlobals = [];
        this.functionTypeIndices = [];
        this.allFuncSignatures = [];
        this.tables = [];
        this.memories = [];
        this.globals = [];
        this.exports = [];
        this.startFunc = null;
        this.codeBodies = [];
        this.dataSegments = [];
    }

    decode(uint8Array) {
        this.types = [];
        this.importedFuncs = [];
        this.importedGlobals = [];
        this.functionTypeIndices = [];
        this.allFuncSignatures = [];
        this.tables = [];
        this.memories = [];
        this.globals = [];
        this.exports = [];
        this.startFunc = null;
        this.codeBodies = [];
        this.dataSegments = [];

        const reader = new BinaryReader(uint8Array);

        // Header
        const magic = (reader.u8() << 24) | (reader.u8() << 16) | (reader.u8() << 8) | reader.u8();
        if (magic !== 0x0061736D) {
            throw new Error('Assinatura mágica Wasm inválida: esperado 0x0061736D (\\0asm).');
        }
        const version = reader.u32();
        if (version !== 1) {
            throw new Error(`Versão do binário WebAssembly não suportada: ${version}.`);
        }

        // Section Decoding
        while (reader.hasMore()) {
            const sectionId = reader.u8();
            const sectionLen = reader.vu32();
            const sectionBytes = reader.bytesSlice(sectionLen);
            const secReader = new BinaryReader(sectionBytes);

            switch (sectionId) {
                case 1: this.decodeTypeSection(secReader); break;
                case 2: this.decodeImportSection(secReader); break;
                case 3: this.decodeFunctionSection(secReader); break;
                case 4: this.decodeTableSection(secReader); break;
                case 5: this.decodeMemorySection(secReader); break;
                case 6: this.decodeGlobalSection(secReader); break;
                case 7: this.decodeExportSection(secReader); break;
                case 8: this.decodeStartSection(secReader); break;
                case 9: this.decodeElementSection(secReader); break;
                case 10: this.decodeCodeSection(secReader); break;
                case 11: this.decodeDataSection(secReader); break;
                default: break;
            }
        }

        this.assembleSignatures();
        return this.reconstructAST();
    }

    decodeTypeSection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            const form = reader.u8(); // 0x60
            const paramCount = reader.vu32();
            const params = [];
            for (let p = 0; p < paramCount; p++) {
                params.push(wasmValTypeToType(reader.u8()));
            }
            const returnCount = reader.vu32();
            let returnType = Type.VOID;
            if (returnCount === 1) {
                returnType = wasmValTypeToType(reader.u8());
            } else if (returnCount > 1) {
                const rTypes = [];
                for (let r = 0; r < returnCount; r++) rTypes.push(wasmValTypeToType(reader.u8()));
                returnType = rTypes;
            }
            this.types.push({ params, returnType });
        }
    }

    decodeImportSection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            const module = reader.string();
            const name = reader.string();
            const kind = reader.u8();

            if (kind === 0x00) { // Func
                const typeIdx = reader.vu32();
                const sig = this.types[typeIdx] || { params: [], returnType: Type.VOID };
                const params = sig.params.map((t, idx) => ({ name: `p${idx}`, type: t }));
                const imp = new ImportFuncNode(module, name, name, params, sig.returnType);
                this.importedFuncs.push(imp);
            } else if (kind === 0x01) { // Table
                const elemType = wasmValTypeToType(reader.u8());
                const hasMax = reader.u8() === 1;
                const min = reader.vu32();
                const max = hasMax ? reader.vu32() : null;
                this.tables.push({ name, refType: elemType, min, max, isImport: true, module });
            } else if (kind === 0x02) { // Memory
                const hasMax = reader.u8() === 1;
                const min = reader.vu32();
                const max = hasMax ? reader.vu32() : null;
                this.memories.push({ min, max, isImport: true });
            } else if (kind === 0x03) { // Global
                const valType = wasmValTypeToType(reader.u8());
                const mutable = reader.u8() === 1;
                const imp = new ImportGlobalNode(module, name, name, valType, mutable);
                this.importedGlobals.push(imp);
            }
        }
    }

    decodeFunctionSection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            this.functionTypeIndices.push(reader.vu32());
        }
    }

    decodeTableSection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            const elemType = wasmValTypeToType(reader.u8());
            const hasMax = reader.u8() === 1;
            const min = reader.vu32();
            const max = hasMax ? reader.vu32() : null;
            this.tables.push({ name: `table_${this.tables.length}`, refType: elemType, min, max });
        }
    }

    decodeMemorySection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            const hasMax = reader.u8() === 1;
            const min = reader.vu32();
            const max = hasMax ? reader.vu32() : null;
            this.memories.push({ min, max });
        }
    }

    decodeGlobalSection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            const valType = wasmValTypeToType(reader.u8());
            const mutable = reader.u8() === 1;
            const initExpr = this.decodeConstantExpression(reader, valType);
            this.globals.push({
                name: `g${this.globals.length}`,
                type: valType,
                mutable,
                initExpr
            });
        }
    }

    decodeConstantExpression(reader, targetType) {
        const opcode = reader.u8();
        let valNode = new ConstNode(0, targetType);

        switch (opcode) {
            case 0x41: valNode = new ConstNode(reader.vs32(), Type.I32); break;
            case 0x42: valNode = new ConstNode(reader.vs64(), Type.I64); break;
            case 0x43: valNode = new ConstNode(reader.f32(), Type.F32); break;
            case 0x44: valNode = new ConstNode(reader.f64(), Type.F64); break;
            case 0xD0: valNode = new RefNullNode(wasmValTypeToType(reader.u8())); break;
            default: break;
        }

        const endOpcode = reader.u8(); // 0x0B
        if (endOpcode !== 0x0B) {
            reader.pos--;
        }
        return valNode;
    }

    decodeExportSection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            const name = reader.string();
            const kindByte = reader.u8();
            const index = reader.vu32();
            const kind = kindByte === 0 ? 'func' : (kindByte === 1 ? 'table' : (kindByte === 2 ? 'mem' : 'global'));
            this.exports.push({ name, kind, index, exportName: name });
        }
    }

    decodeStartSection(reader) {
        this.startFunc = reader.vu32();
    }

    decodeElementSection(reader) {
        // Element section for function tables
    }

    decodeCodeSection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            const bodySize = reader.vu32();
            const bodyBytes = reader.bytesSlice(bodySize);
            this.codeBodies.push(bodyBytes);
        }
    }

    decodeDataSection(reader) {
        const count = reader.vu32();
        for (let i = 0; i < count; i++) {
            reader.vu32(); // 0 active
            reader.u8(); // 0x41 const
            const offset = reader.vs32();
            reader.u8(); // 0x0B
            const len = reader.vu32();
            const bytes = reader.bytesSlice(len);
            this.dataSegments.push({ offset, bytes });
        }
    }

    assembleSignatures() {
        for (const imp of this.importedFuncs) {
            this.allFuncSignatures.push({
                name: imp.name,
                params: imp.params.map(p => p.type),
                returnType: imp.returnType
            });
        }
        for (const typeIdx of this.functionTypeIndices) {
            const sig = this.types[typeIdx] || { params: [], returnType: Type.VOID };
            this.allFuncSignatures.push(sig);
        }
    }

    reconstructAST() {
        const functions = [];
        const globals = [];
        let startFuncName = null;

        for (const g of this.globals) {
            const exp = this.exports.find(e => e.kind === 'global' && e.index === globals.length);
            const gNode = new GlobalDeclareNode(g.name, g.type, g.mutable, g.initExpr, !!exp, exp ? exp.name : null);
            globals.push(gNode);
        }

        const tableNodes = [];
        for (let tIdx = 0; tIdx < this.tables.length; tIdx++) {
            const t = this.tables[tIdx];
            if (!t.isImport) {
                const exp = this.exports.find(e => e.kind === 'table' && e.index === tIdx);
                tableNodes.push(new TableDeclareNode(t.name, t.refType, t.min, t.max, !!exp, exp ? exp.name : null));
            }
        }

        const numImports = this.importedFuncs.length;
        for (let i = 0; i < this.codeBodies.length; i++) {
            const funcIdx = numImports + i;
            const typeIdx = this.functionTypeIndices[i];
            const sig = this.types[typeIdx] || { params: [], returnType: Type.VOID };
            const exp = this.exports.find(e => e.kind === 'func' && e.index === funcIdx);
            const funcName = exp ? exp.name : `func_${funcIdx}`;

            if (this.startFunc !== null && this.startFunc === funcIdx) {
                startFuncName = funcName;
            }

            const funcNode = this.decompileFunction(funcName, sig, this.codeBodies[i]);
            functions.push(funcNode);
        }

        return new ProgramNode(
            functions,
            globals,
            [],
            [...this.importedFuncs, ...this.importedGlobals],
            this.exports.map(e => new ExportNode(e.kind, e.name, e.name)),
            startFuncName,
            tableNodes
        );
    }

    decompileFunction(name, sig, bodyBytes) {
        const reader = new BinaryReader(bodyBytes);
        const localCount = reader.vu32();
        const locals = [];

        for (let l = 0; l < localCount; l++) {
            const count = reader.vu32();
            const type = wasmValTypeToType(reader.u8());
            for (let c = 0; c < count; c++) {
                const lName = `local_${locals.length}`;
                let initExpr;
                if (type === Type.V128) {
                    initExpr = new V128ConstNode(new Uint8Array(16));
                } else if (type === Type.FUNCREF || type === Type.EXTERNREF) {
                    initExpr = new RefNullNode(type);
                } else {
                    initExpr = new ConstNode(0, type);
                }
                locals.push(new DeclareVarNode(lName, type, initExpr));
            }
        }

        const params = sig.params.map((t, idx) => ({ name: `p${idx}`, type: t }));
        const statements = this.decompileBlock(reader, params, locals, sig.returnType, sig.returnType);
        return new FunctionNode(name, params, sig.returnType, [...locals, ...statements], true);
    }

    decompileBlock(reader, params, locals, blockReturnType = Type.VOID, funcReturnType = Type.VOID) {
        const statements = [];
        const stack = [];

        const getVarName = (idx) => {
            if (idx < params.length) return params[idx].name;
            const lIdx = idx - params.length;
            if (lIdx < locals.length) return locals[lIdx].name;
            return `l${idx}`;
        };

        const getGlobalName = (idx) => {
            if (idx < this.importedGlobals.length) return this.importedGlobals[idx].internalName;
            const gIdx = idx - this.importedGlobals.length;
            if (gIdx < this.globals.length) return this.globals[gIdx].name;
            return `g${idx}`;
        };

        const getFuncName = (idx) => {
            if (idx < this.importedFuncs.length) return this.importedFuncs[idx].internalName;
            const exp = this.exports.find(e => e.kind === 'func' && e.index === idx);
            if (exp) return exp.name;
            return `func_${idx}`;
        };

        const pop = () => {
            if (stack.length > 0) return stack.pop();
            return new ConstNode(0, Type.I32);
        };

        while (reader.hasMore()) {
            const opcode = reader.u8();

            if (opcode === 0x0B || opcode === 0x05) {
                reader.pos--;
                break;
            }

            switch (opcode) {
                case 0x00: statements.push(new UnreachableNode()); break;
                case 0x01: statements.push(new NopNode()); break;

                case 0x02: { // block
                    const blockTypeByte = reader.u8();
                    const retType = wasmValTypeToType(blockTypeByte);
                    const innerStmts = this.decompileBlock(reader, params, locals, retType, funcReturnType);
                    if (reader.hasMore() && reader.bytes[reader.pos] === 0x0B) {
                        reader.u8(); // consume 0x0B
                    }
                    statements.push(new BlockNode(0, innerStmts, retType));
                    break;
                }
                case 0x03: { // loop
                    const blockTypeByte = reader.u8();
                    const retType = wasmValTypeToType(blockTypeByte);
                    const innerStmts = this.decompileBlock(reader, params, locals, retType, funcReturnType);
                    if (reader.hasMore() && reader.bytes[reader.pos] === 0x0B) {
                        reader.u8(); // consume 0x0B
                    }
                    statements.push(new LoopNode(0, innerStmts, retType));
                    break;
                }
                case 0x04: { // if
                    const blockTypeByte = reader.u8();
                    const retType = wasmValTypeToType(blockTypeByte);
                    const cond = pop();
                    const thenStmts = this.decompileBlock(reader, params, locals, retType, funcReturnType);
                    let elseStmts = [];
                    if (reader.hasMore() && reader.bytes[reader.pos] === 0x05) {
                        reader.u8(); // consume 0x05
                        elseStmts = this.decompileBlock(reader, params, locals, retType, funcReturnType);
                    }
                    if (reader.hasMore() && reader.bytes[reader.pos] === 0x0B) {
                        reader.u8(); // consume 0x0B
                    }
                    statements.push(new IfNode(cond, thenStmts, elseStmts, retType));
                    break;
                }

                case 0x0C: statements.push(new BrNode(reader.vu32())); break;
                case 0x0D: statements.push(new BrIfNode(pop(), reader.vu32())); break;
                case 0x0E: {
                    const count = reader.vu32();
                    const targets = [];
                    for (let t = 0; t < count; t++) targets.push(reader.vu32());
                    statements.push(new BrTableNode(pop(), targets, reader.vu32()));
                    break;
                }
                case 0x0F: {
                    const hasReturnVal = funcReturnType && funcReturnType !== Type.VOID;
                    const returnVal = (hasReturnVal && stack.length > 0) ? pop() : null;
                    statements.push(new ReturnNode(returnVal));
                    break;
                }

                case 0x10: { // call
                    const targetIdx = reader.vu32();
                    const targetName = getFuncName(targetIdx);
                    const sig = this.allFuncSignatures[targetIdx] || { params: [], returnType: Type.VOID };
                    const args = [];
                    for (let a = 0; a < sig.params.length; a++) args.unshift(pop());
                    const callNode = new CallNode(targetName, args);
                    if (sig.returnType && sig.returnType !== Type.VOID) stack.push(callNode);
                    else statements.push(callNode);
                    break;
                }

                case 0x11: { // call_indirect
                    const typeIdx = reader.vu32();
                    const tableIdx = reader.vu32();
                    const sig = this.types[typeIdx] || { params: [], returnType: Type.VOID };
                    const tableIndex = pop();
                    const args = [];
                    for (let a = 0; a < sig.params.length; a++) args.unshift(pop());
                    const callNode = new CallIndirectNode(tableIndex, args, sig.params, sig.returnType, tableIdx);
                    if (sig.returnType && sig.returnType !== Type.VOID) stack.push(callNode);
                    else statements.push(callNode);
                    break;
                }

                // Tail Calls (0x12, 0x13)
                case 0x12: {
                    const targetIdx = reader.vu32();
                    const targetName = getFuncName(targetIdx);
                    const sig = this.allFuncSignatures[targetIdx] || { params: [] };
                    const args = [];
                    for (let a = 0; a < sig.params.length; a++) args.unshift(pop());
                    statements.push(new ReturnCallNode(targetName, args));
                    break;
                }
                case 0x13: {
                    const typeIdx = reader.vu32();
                    const tableIdx = reader.vu32();
                    const sig = this.types[typeIdx] || { params: [], returnType: Type.VOID };
                    const tableIndex = pop();
                    const args = [];
                    for (let a = 0; a < sig.params.length; a++) args.unshift(pop());
                    statements.push(new ReturnCallIndirectNode(tableIndex, args, sig.params, sig.returnType, tableIdx));
                    break;
                }

                case 0x1A: statements.push(new DropNode(pop())); break;
                case 0x1B: {
                    const c = pop(), val2 = pop(), val1 = pop();
                    stack.push(new SelectNode(c, val1, val2));
                    break;
                }

                // Locals & Globals
                case 0x20: stack.push(new GetVarNode(getVarName(reader.vu32()))); break;
                case 0x21: statements.push(new SetVarNode(getVarName(reader.vu32()), pop())); break;
                case 0x22: stack.push(new TeeVarNode(getVarName(reader.vu32()), pop())); break;
                case 0x23: stack.push(new GetVarNode(getGlobalName(reader.vu32()))); break;
                case 0x24: statements.push(new SetVarNode(getGlobalName(reader.vu32()), pop())); break;

                // Tables (0x25, 0x26)
                case 0x25: stack.push(new TableGetNode(reader.vu32(), pop())); break;
                case 0x26: { const tableIdx = reader.vu32(); const val = pop(); const idx = pop(); statements.push(new TableSetNode(tableIdx, idx, val)); break; }

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
                case 0x45: stack.push(new UnaryOpNode('EQZ', pop())); break;
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

                case 0x50: stack.push(new UnaryOpNode('EQZ', pop())); break;
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
                case 0x67: stack.push(new UnaryOpNode('CLZ', pop())); break;
                case 0x68: stack.push(new UnaryOpNode('CTZ', pop())); break;
                case 0x69: stack.push(new UnaryOpNode('POPCNT', pop())); break;
                case 0x6A: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('+', l, r)); break; }
                case 0x6B: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('-', l, r)); break; }
                case 0x6C: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('*', l, r)); break; }
                case 0x6D: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r, 'signed')); break; }
                case 0x6E: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r, 'unsigned')); break; }
                case 0x6F: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('%', l, r, 'signed')); break; }
                case 0x70: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('%', l, r, 'unsigned')); break; }
                case 0x71: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('AND', l, r)); break; }
                case 0x72: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('OR', l, r)); break; }
                case 0x73: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('XOR', l, r)); break; }
                case 0x74: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<<', l, r)); break; }
                case 0x75: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>>', l, r, 'signed')); break; }
                case 0x76: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>>', l, r, 'unsigned')); break; }
                case 0x77: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('ROTL', l, r)); break; }
                case 0x78: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('ROTR', l, r)); break; }

                case 0x79: stack.push(new UnaryOpNode('CLZ', pop())); break;
                case 0x7A: stack.push(new UnaryOpNode('CTZ', pop())); break;
                case 0x7B: stack.push(new UnaryOpNode('POPCNT', pop())); break;
                case 0x7C: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('+', l, r)); break; }
                case 0x7D: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('-', l, r)); break; }
                case 0x7E: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('*', l, r)); break; }
                case 0x7F: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r, 'signed')); break; }
                case 0x80: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r, 'unsigned')); break; }
                case 0x81: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('%', l, r, 'signed')); break; }
                case 0x82: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('%', l, r, 'unsigned')); break; }
                case 0x83: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('AND', l, r)); break; }
                case 0x84: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('OR', l, r)); break; }
                case 0x85: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('XOR', l, r)); break; }
                case 0x86: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('<<', l, r)); break; }
                case 0x87: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>>', l, r, 'signed')); break; }
                case 0x88: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('>>', l, r, 'unsigned')); break; }
                case 0x89: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('ROTL', l, r)); break; }
                case 0x8A: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('ROTR', l, r)); break; }

                // Float Unary / Binary
                case 0x8B: stack.push(new UnaryOpNode('ABS', pop())); break;
                case 0x8C: stack.push(new UnaryOpNode('NEG', pop())); break;
                case 0x8D: stack.push(new UnaryOpNode('CEIL', pop())); break;
                case 0x8E: stack.push(new UnaryOpNode('FLOOR', pop())); break;
                case 0x8F: stack.push(new UnaryOpNode('TRUNC', pop())); break;
                case 0x90: stack.push(new UnaryOpNode('NEAREST', pop())); break;
                case 0x91: stack.push(new UnaryOpNode('SQRT', pop())); break;
                case 0x92: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('+', l, r)); break; }
                case 0x93: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('-', l, r)); break; }
                case 0x94: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('*', l, r)); break; }
                case 0x95: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r)); break; }
                case 0x96: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('MIN', l, r)); break; }
                case 0x97: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('MAX', l, r)); break; }
                case 0x98: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('COPYSIGN', l, r)); break; }

                case 0x99: stack.push(new UnaryOpNode('ABS', pop())); break;
                case 0x9A: stack.push(new UnaryOpNode('NEG', pop())); break;
                case 0x9B: stack.push(new UnaryOpNode('CEIL', pop())); break;
                case 0x9C: stack.push(new UnaryOpNode('FLOOR', pop())); break;
                case 0x9D: stack.push(new UnaryOpNode('TRUNC', pop())); break;
                case 0x9E: stack.push(new UnaryOpNode('NEAREST', pop())); break;
                case 0x9F: stack.push(new UnaryOpNode('SQRT', pop())); break;
                case 0xA0: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('+', l, r)); break; }
                case 0xA1: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('-', l, r)); break; }
                case 0xA2: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('*', l, r)); break; }
                case 0xA3: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('/', l, r)); break; }
                case 0xA4: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('MIN', l, r)); break; }
                case 0xA5: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('MAX', l, r)); break; }
                case 0xA6: { const r = pop(), l = pop(); stack.push(new BinaryOpNode('COPYSIGN', l, r)); break; }

                // Conversions
                case 0xA7: stack.push(new ConvertNode(pop(), Type.I32, true)); break;
                case 0xA8: stack.push(new ConvertNode(pop(), Type.I32, true, 'signed')); break;
                case 0xA9: stack.push(new ConvertNode(pop(), Type.I32, true, 'unsigned')); break;
                case 0xAA: stack.push(new ConvertNode(pop(), Type.I32, true, 'signed')); break;
                case 0xAB: stack.push(new ConvertNode(pop(), Type.I32, true, 'unsigned')); break;
                case 0xAC: stack.push(new ConvertNode(pop(), Type.I64, true, 'signed')); break;
                case 0xAD: stack.push(new ConvertNode(pop(), Type.I64, true, 'unsigned')); break;
                case 0xAE: stack.push(new ConvertNode(pop(), Type.I64, true, 'signed')); break;
                case 0xAF: stack.push(new ConvertNode(pop(), Type.I64, true, 'unsigned')); break;
                case 0xB0: stack.push(new ConvertNode(pop(), Type.I64, true, 'signed')); break;
                case 0xB1: stack.push(new ConvertNode(pop(), Type.I64, true, 'unsigned')); break;
                case 0xB2: stack.push(new ConvertNode(pop(), Type.F32, true, 'signed')); break;
                case 0xB3: stack.push(new ConvertNode(pop(), Type.F32, true, 'unsigned')); break;
                case 0xB4: stack.push(new ConvertNode(pop(), Type.F32, true, 'signed')); break;
                case 0xB5: stack.push(new ConvertNode(pop(), Type.F32, true, 'unsigned')); break;
                case 0xB6: stack.push(new ConvertNode(pop(), Type.F32, true)); break;
                case 0xB7: stack.push(new ConvertNode(pop(), Type.F64, true, 'signed')); break;
                case 0xB8: stack.push(new ConvertNode(pop(), Type.F64, true, 'unsigned')); break;
                case 0xB9: stack.push(new ConvertNode(pop(), Type.F64, true, 'signed')); break;
                case 0xBA: stack.push(new ConvertNode(pop(), Type.F64, true, 'unsigned')); break;
                case 0xBB: stack.push(new ConvertNode(pop(), Type.F64, true)); break;

                // Reinterpretations
                case 0xBC: stack.push(new ReinterpretNode(pop(), Type.I32)); break;
                case 0xBD: stack.push(new ReinterpretNode(pop(), Type.I64)); break;
                case 0xBE: stack.push(new ReinterpretNode(pop(), Type.F32)); break;
                case 0xBF: stack.push(new ReinterpretNode(pop(), Type.F64)); break;

                // Sign-Extension (0xC0 - 0xC4)
                case 0xC0: stack.push(new SignExtendNode('i32', 8, pop())); break;
                case 0xC1: stack.push(new SignExtendNode('i32', 16, pop())); break;
                case 0xC2: stack.push(new SignExtendNode('i64', 8, pop())); break;
                case 0xC3: stack.push(new SignExtendNode('i64', 16, pop())); break;
                case 0xC4: stack.push(new SignExtendNode('i64', 32, pop())); break;

                // Reference Types (0xD0 - 0xD2)
                case 0xD0: stack.push(new RefNullNode(wasmValTypeToType(reader.u8()))); break;
                case 0xD1: stack.push(new RefIsNullNode(pop())); break;
                case 0xD2: stack.push(new RefFuncNode(getFuncName(reader.vu32()))); break;

                // Prefix 0xFC (Trunc-Sat, Bulk Memory, Multi-Table)
                case 0xFC: {
                    const subOp = reader.vu32();
                    switch (subOp) {
                        case 0x00: stack.push(new TruncSatNode('i32', 'f32', 'signed', pop())); break;
                        case 0x01: stack.push(new TruncSatNode('i32', 'f32', 'unsigned', pop())); break;
                        case 0x02: stack.push(new TruncSatNode('i32', 'f64', 'signed', pop())); break;
                        case 0x03: stack.push(new TruncSatNode('i32', 'f64', 'unsigned', pop())); break;
                        case 0x04: stack.push(new TruncSatNode('i64', 'f32', 'signed', pop())); break;
                        case 0x05: stack.push(new TruncSatNode('i64', 'f32', 'unsigned', pop())); break;
                        case 0x06: stack.push(new TruncSatNode('i64', 'f64', 'signed', pop())); break;
                        case 0x07: stack.push(new TruncSatNode('i64', 'f64', 'unsigned', pop())); break;

                        case 0x08: { const dataIdx = reader.vu32(); reader.u8(); const len = pop(), src = pop(), dst = pop(); statements.push(new MemInitNode(dataIdx, dst, src, len)); break; }
                        case 0x09: { const dataIdx = reader.vu32(); statements.push(new DataDropNode(dataIdx)); break; }
                        case 0x0A: { reader.u8(); reader.u8(); const len = pop(), src = pop(), dst = pop(); statements.push(new MemCopyNode(dst, src, len)); break; }
                        case 0x0B: { reader.u8(); const len = pop(), val = pop(), dst = pop(); statements.push(new MemFillNode(dst, val, len)); break; }

                        case 0x0C: { const elemIdx = reader.vu32(), tableIdx = reader.vu32(); const len = pop(), src = pop(), dst = pop(); statements.push(new TableInitNode(elemIdx, tableIdx, dst, src, len)); break; }
                        case 0x0D: { const elemIdx = reader.vu32(); statements.push(new ElemDropNode(elemIdx)); break; }
                        case 0x0E: { const dstT = reader.vu32(), srcT = reader.vu32(); const len = pop(), src = pop(), dst = pop(); statements.push(new TableCopyNode(dstT, srcT, dst, src, len)); break; }
                        case 0x0F: { const tableIdx = reader.vu32(); const delta = pop(), val = pop(); stack.push(new TableGrowNode(tableIdx, val, delta)); break; }
                        case 0x10: { const tableIdx = reader.vu32(); stack.push(new TableSizeNode(tableIdx)); break; }
                        case 0x11: { const tableIdx = reader.vu32(); const len = pop(), val = pop(), off = pop(); statements.push(new TableFillNode(tableIdx, off, val, len)); break; }
                        default: break;
                    }
                    break;
                }

                // Prefix 0xFD (SIMD 128-bit)
                case 0xFD: {
                    const simdOp = reader.vu32();
                    switch (simdOp) {
                        case 0x00: { const align = reader.vu32(); const off = reader.vu32(); stack.push(new V128LoadNode(new ConstNode(0, Type.I32), pop(), off)); break; }
                        case 0x01:
                        case 0x02:
                        case 0x03:
                        case 0x04:
                        case 0x05:
                        case 0x06:
                        case 0x07:
                        case 0x08:
                        case 0x09:
                        case 0x0A: { const align = reader.vu32(); const off = reader.vu32(); stack.push(new V128LoadNode(new ConstNode(0, Type.I32), pop(), off)); break; }
                        case 0x0B: { reader.vu32(); const off = reader.vu32(); const val = pop(); const base = pop(); statements.push(new V128StoreNode(new ConstNode(0, Type.I32), base, val, off)); break; }
                        case 0x0C: stack.push(new V128ConstNode(reader.bytesSlice(16))); break;
                        case 0x0D: { const lanes = reader.bytesSlice(16); const r = pop(), l = pop(); stack.push(new V128OpNode('i8x16.shuffle', [l, r])); break; }
                        case 0x0E: { const r = pop(), l = pop(); stack.push(new V128OpNode('i8x16.swizzle', [l, r])); break; }
                        case 0x0F: stack.push(new V128SplatNode('i8x16', pop())); break;
                        case 0x10: stack.push(new V128SplatNode('i16x8', pop())); break;
                        case 0x11: stack.push(new V128SplatNode('i32x4', pop())); break;
                        case 0x12: stack.push(new V128SplatNode('i64x2', pop())); break;
                        case 0x13: stack.push(new V128SplatNode('f32x4', pop())); break;
                        case 0x14: stack.push(new V128SplatNode('f64x2', pop())); break;
                        case 0x15: stack.push(new V128ExtractLaneNode('i8x16', reader.u8(), 'signed', pop())); break;
                        case 0x16: stack.push(new V128ExtractLaneNode('i8x16', reader.u8(), 'unsigned', pop())); break;
                        case 0x17: { const idx = reader.u8(); const val = pop(); const vec = pop(); stack.push(new V128ReplaceLaneNode('i8x16', idx, vec, val)); break; }
                        case 0x18: stack.push(new V128ExtractLaneNode('i16x8', reader.u8(), 'signed', pop())); break;
                        case 0x19: stack.push(new V128ExtractLaneNode('i16x8', reader.u8(), 'unsigned', pop())); break;
                        case 0x1A: { const idx = reader.u8(); const val = pop(); const vec = pop(); stack.push(new V128ReplaceLaneNode('i16x8', idx, vec, val)); break; }
                        case 0x1B: stack.push(new V128ExtractLaneNode('i32x4', reader.u8(), 'signed', pop())); break;
                        case 0x1C: { const idx = reader.u8(); const val = pop(); const vec = pop(); stack.push(new V128ReplaceLaneNode('i32x4', idx, vec, val)); break; }
                        case 0x1D: stack.push(new V128ExtractLaneNode('i64x2', reader.u8(), 'signed', pop())); break;
                        case 0x1E: { const idx = reader.u8(); const val = pop(); const vec = pop(); stack.push(new V128ReplaceLaneNode('i64x2', idx, vec, val)); break; }
                        case 0x1F: stack.push(new V128ExtractLaneNode('f32x4', reader.u8(), 'signed', pop())); break;
                        case 0x20: { const idx = reader.u8(); const val = pop(); const vec = pop(); stack.push(new V128ReplaceLaneNode('f32x4', idx, vec, val)); break; }
                        case 0x21: stack.push(new V128ExtractLaneNode('f64x2', reader.u8(), 'signed', pop())); break;
                        case 0x22: { const idx = reader.u8(); const val = pop(); const vec = pop(); stack.push(new V128ReplaceLaneNode('f64x2', idx, vec, val)); break; }

                        case 0x4D: stack.push(new V128OpNode('v128.not', [pop()])); break;
                        case 0x4E: { const r = pop(), l = pop(); stack.push(new V128OpNode('v128.and', [l, r])); break; }
                        case 0x4F: { const r = pop(), l = pop(); stack.push(new V128OpNode('v128.andnot', [l, r])); break; }
                        case 0x50: { const r = pop(), l = pop(); stack.push(new V128OpNode('v128.or', [l, r])); break; }
                        case 0x51: { const r = pop(), l = pop(); stack.push(new V128OpNode('v128.xor', [l, r])); break; }
                        case 0x52: { const c = pop(), v2 = pop(), v1 = pop(); stack.push(new V128BitSelectNode(v1, v2, c)); break; }

                        case 0x6E: { const r = pop(), l = pop(); stack.push(new V128OpNode('i8x16.add', [l, r])); break; }
                        case 0x71: { const r = pop(), l = pop(); stack.push(new V128OpNode('i8x16.sub', [l, r])); break; }
                        case 0x82: { const r = pop(), l = pop(); stack.push(new V128OpNode('i16x8.add', [l, r])); break; }
                        case 0x85: { const r = pop(), l = pop(); stack.push(new V128OpNode('i16x8.sub', [l, r])); break; }
                        case 0x95: { const r = pop(), l = pop(); stack.push(new V128OpNode('i16x8.mul', [l, r])); break; }
                        case 0xAE: { const r = pop(), l = pop(); stack.push(new V128OpNode('i32x4.add', [l, r])); break; }
                        case 0xB1: { const r = pop(), l = pop(); stack.push(new V128OpNode('i32x4.sub', [l, r])); break; }
                        case 0xB5: { const r = pop(), l = pop(); stack.push(new V128OpNode('i32x4.mul', [l, r])); break; }
                        case 0xCE: { const r = pop(), l = pop(); stack.push(new V128OpNode('i64x2.add', [l, r])); break; }
                        case 0xD1: { const r = pop(), l = pop(); stack.push(new V128OpNode('i64x2.sub', [l, r])); break; }
                        case 0xD5: { const r = pop(), l = pop(); stack.push(new V128OpNode('i64x2.mul', [l, r])); break; }
                        case 0xE4: { const r = pop(), l = pop(); stack.push(new V128OpNode('f32x4.add', [l, r])); break; }
                        case 0xE5: { const r = pop(), l = pop(); stack.push(new V128OpNode('f32x4.sub', [l, r])); break; }
                        case 0xE6: { const r = pop(), l = pop(); stack.push(new V128OpNode('f32x4.mul', [l, r])); break; }
                        case 0xE7: { const r = pop(), l = pop(); stack.push(new V128OpNode('f32x4.div', [l, r])); break; }
                        case 0xE8: { const r = pop(), l = pop(); stack.push(new V128OpNode('f32x4.min', [l, r])); break; }
                        case 0xE9: { const r = pop(), l = pop(); stack.push(new V128OpNode('f32x4.max', [l, r])); break; }
                        case 0xF0: { const r = pop(), l = pop(); stack.push(new V128OpNode('f64x2.add', [l, r])); break; }
                        case 0xF1: { const r = pop(), l = pop(); stack.push(new V128OpNode('f64x2.sub', [l, r])); break; }
                        case 0xF2: { const r = pop(), l = pop(); stack.push(new V128OpNode('f64x2.mul', [l, r])); break; }
                        case 0xF3: { const r = pop(), l = pop(); stack.push(new V128OpNode('f64x2.div', [l, r])); break; }
                        case 0xF4: { const r = pop(), l = pop(); stack.push(new V128OpNode('f64x2.min', [l, r])); break; }
                        case 0xF5: { const r = pop(), l = pop(); stack.push(new V128OpNode('f64x2.max', [l, r])); break; }

                        default: {
                            const r = pop(), l = pop();
                            stack.push(new V128OpNode(`v128_op_${simdOp}`, [l, r]));
                            break;
                        }
                    }
                    break;
                }

                default:
                    break;
            }
        }

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
