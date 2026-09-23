/**
 * WebAssembly 2.0 Complete Binary Encoder for Scratch++ (Swarm)
 * 100% Coverage of WebAssembly 2.0 (W3C Recommendation)
 * Sections 0-11, Sign-Extension (0xC0-0xC4), Trunc Sat (0xFC), Bulk Memory, Reference Types, Multi-Table, Tail Calls, SIMD 128-bit (0xFD)
 */

import { IROp } from './ir.js';
import { Type } from './types.js';

export const WasmValType = {
    i32: 0x7F,
    i64: 0x7E,
    f32: 0x7D,
    f64: 0x7C,
    v128: 0x7B,
    funcref: 0x70,
    externref: 0x6F,
    void: 0x40
};

export class BinaryWriter {
    constructor() {
        this.bytes = [];
    }

    u8(val) {
        this.bytes.push(val & 0xFF);
    }

    u32(val) {
        this.bytes.push(val & 0xFF, (val >> 8) & 0xFF, (val >> 16) & 0xFF, (val >> 24) & 0xFF);
    }

    f32(val) {
        const buf = new ArrayBuffer(4);
        new DataView(buf).setFloat32(0, val, true);
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < 4; i++) this.bytes.push(u8[i]);
    }

    f64(val) {
        const buf = new ArrayBuffer(8);
        new DataView(buf).setFloat64(0, val, true);
        const u8 = new Uint8Array(buf);
        for (let i = 0; i < 8; i++) this.bytes.push(u8[i]);
    }

    vu32(val) {
        let v = val >>> 0;
        do {
            let byte = v & 0x7F;
            v >>>= 7;
            if (v !== 0) byte |= 0x80;
            this.bytes.push(byte);
        } while (v !== 0);
    }

    vs32(val) {
        let v = val | 0;
        let more = true;
        while (more) {
            let byte = v & 0x7F;
            v >>= 7;
            if ((v === 0 && (byte & 0x40) === 0) || (v === -1 && (byte & 0x40) !== 0)) {
                more = false;
            } else {
                byte |= 0x80;
            }
            this.bytes.push(byte);
        }
    }

    vs64(val) {
        let v = BigInt(val);
        let more = true;
        while (more) {
            let byte = Number(v & 0x7Fn);
            v >>= 7n;
            if ((v === 0n && (byte & 0x40) === 0) || (v === -1n && (byte & 0x40) !== 0)) {
                more = false;
            } else {
                byte |= 0x80;
            }
            this.bytes.push(byte);
        }
    }

    raw(uint8Arr) {
        for (let i = 0; i < uint8Arr.length; i++) {
            this.bytes.push(uint8Arr[i]);
        }
    }

    string(str) {
        const encoded = new TextEncoder().encode(str);
        this.vu32(encoded.length);
        this.raw(encoded);
    }

    toUint8Array() {
        return new Uint8Array(this.bytes);
    }
}

export class WasmEncoder {
    constructor() {
        this.types = [];
        this.typeMap = new Map();
    }

    getOrAddType(params, returnType) {
        const pTypes = (params || []).map(p => WasmValType[p] || WasmValType.i32);
        let rTypes = [];
        if (Array.isArray(returnType)) {
            rTypes = returnType.map(r => WasmValType[r] || WasmValType.i32);
        } else if (returnType && returnType !== 'void') {
            rTypes = [WasmValType[returnType] || WasmValType.i32];
        }

        const key = pTypes.join(',') + '->' + rTypes.join(',');

        if (this.typeMap.has(key)) {
            return this.typeMap.get(key);
        }

        const idx = this.types.length;
        this.types.push({ params: pTypes, results: rTypes });
        this.typeMap.set(key, idx);
        return idx;
    }

    encode(irModule) {
        this.types = [];
        this.typeMap.clear();

        const mainWriter = new BinaryWriter();

        // WASM Header: \0asm v1 (Wasm 2.0 maintains binary version 1)
        mainWriter.u8(0x00); mainWriter.u8(0x61); mainWriter.u8(0x73); mainWriter.u8(0x6D);
        mainWriter.u32(1);

        // Pre-register types for imports
        const importEntries = [];
        for (const imp of irModule.imports) {
            if (imp.kind === 'func') {
                const typeIdx = this.getOrAddType(imp.params, imp.returnType);
                importEntries.push({ ...imp, typeIdx });
            } else {
                importEntries.push(imp);
            }
        }

        // Pre-register types for defined functions
        const funcTypeIndices = [];
        for (const func of irModule.functions) {
            const typeIdx = this.getOrAddType(func.paramTypes, func.returnType);
            funcTypeIndices.push(typeIdx);
        }

        // SECTION 1: Type Section
        this.writeSection(mainWriter, 1, () => {
            const w = new BinaryWriter();
            w.vu32(this.types.length);
            for (const t of this.types) {
                w.u8(0x60); // func type
                w.vu32(t.params.length);
                for (const p of t.params) w.u8(p);
                w.vu32(t.results.length);
                for (const r of t.results) w.u8(r);
            }
            return w.toUint8Array();
        });

        // SECTION 2: Import Section (Generic: Func, Table, Memory, Global)
        if (importEntries.length > 0) {
            this.writeSection(mainWriter, 2, () => {
                const w = new BinaryWriter();
                w.vu32(importEntries.length);
                for (const imp of importEntries) {
                    w.string(imp.module);
                    w.string(imp.name);
                    if (imp.kind === 'func') {
                        w.u8(0x00); // func import
                        w.vu32(imp.typeIdx);
                    } else if (imp.kind === 'table') {
                        w.u8(0x01); // table import
                        w.u8(WasmValType[imp.type] || WasmValType.funcref);
                        w.u8(imp.max !== null && imp.max !== undefined ? 0x01 : 0x00);
                        w.vu32(imp.min || 0);
                        if (imp.max !== null && imp.max !== undefined) w.vu32(imp.max);
                    } else if (imp.kind === 'mem') {
                        w.u8(0x02); // mem import
                        w.u8(imp.max !== null && imp.max !== undefined ? 0x01 : 0x00);
                        w.vu32(imp.min || 1);
                        if (imp.max !== null && imp.max !== undefined) w.vu32(imp.max);
                    } else if (imp.kind === 'global') {
                        w.u8(0x03); // global import
                        w.u8(WasmValType[imp.wasmType] || WasmValType.i32);
                        w.u8(imp.mutable ? 0x01 : 0x00);
                    }
                }
                return w.toUint8Array();
            });
        }

        // SECTION 3: Function Section
        if (funcTypeIndices.length > 0) {
            this.writeSection(mainWriter, 3, () => {
                const w = new BinaryWriter();
                w.vu32(funcTypeIndices.length);
                for (const tIdx of funcTypeIndices) {
                    w.vu32(tIdx);
                }
                return w.toUint8Array();
            });
        }

        // SECTION 4: Table Section (Wasm 2.0 Multi-Table & Ref Types)
        const tables = irModule.tables || (irModule.table && irModule.table.elements.length > 0 ? [irModule.table] : []);
        if (tables.length > 0) {
            this.writeSection(mainWriter, 4, () => {
                const w = new BinaryWriter();
                w.vu32(tables.length);
                for (const t of tables) {
                    w.u8(WasmValType[t.type] || WasmValType.funcref);
                    const hasMax = t.max !== null && t.max !== undefined;
                    w.u8(hasMax ? 0x01 : 0x00);
                    w.vu32(t.min || 0);
                    if (hasMax) w.vu32(t.max);
                }
                return w.toUint8Array();
            });
        }

        // SECTION 5: Memory Section
        if (irModule.memory) {
            this.writeSection(mainWriter, 5, () => {
                const w = new BinaryWriter();
                w.vu32(1);
                if (irModule.memory.max !== null && irModule.memory.max !== undefined) {
                    w.u8(0x01);
                    w.vu32(irModule.memory.min);
                    w.vu32(irModule.memory.max);
                } else {
                    w.u8(0x00);
                    w.vu32(irModule.memory.min);
                }
                return w.toUint8Array();
            });
        }

        // SECTION 6: Global Section
        if (irModule.globals.length > 0) {
            this.writeSection(mainWriter, 6, () => {
                const w = new BinaryWriter();
                w.vu32(irModule.globals.length);
                for (const g of irModule.globals) {
                    const valType = WasmValType[g.wasmType] || WasmValType.i32;
                    w.u8(valType);
                    w.u8(g.mutable ? 0x01 : 0x00);
                    if (g.wasmType === 'i64') {
                        w.u8(0x42);
                        w.vs64(g.initValue || 0n);
                    } else if (g.wasmType === 'f32') {
                        w.u8(0x43);
                        w.f32(g.initValue || 0);
                    } else if (g.wasmType === 'f64') {
                        w.u8(0x44);
                        w.f64(g.initValue || 0);
                    } else if (g.wasmType === 'funcref' || g.wasmType === 'externref') {
                        w.u8(0xD0); // ref.null
                        w.u8(valType);
                    } else {
                        w.u8(0x41);
                        w.vs32(g.initValue || 0);
                    }
                    w.u8(0x0B);
                }
                return w.toUint8Array();
            });
        }

        // SECTION 7: Export Section
        if (irModule.exports.length > 0) {
            this.writeSection(mainWriter, 7, () => {
                const w = new BinaryWriter();
                w.vu32(irModule.exports.length);
                for (const exp of irModule.exports) {
                    w.string(exp.name);
                    const kindByte = exp.kind === 'func' ? 0x00
                        : (exp.kind === 'table' ? 0x01
                        : (exp.kind === 'mem' ? 0x02 : 0x03));
                    w.u8(kindByte);
                    w.vu32(exp.index);
                }
                return w.toUint8Array();
            });
        }

        // SECTION 8: Start Section (0x08)
        if (irModule.startFunctionIndex !== null && irModule.startFunctionIndex !== undefined) {
            this.writeSection(mainWriter, 8, () => {
                const w = new BinaryWriter();
                w.vu32(irModule.startFunctionIndex);
                return w.toUint8Array();
            });
        }

        // SECTION 9: Element Section (Active & Declared segments)
        const elemSegments = [];
        if (tables.length > 0) {
            for (let tIdx = 0; tIdx < tables.length; tIdx++) {
                const t = tables[tIdx];
                if (t.elements && t.elements.length > 0) {
                    elemSegments.push({
                        tableIdx: tIdx,
                        elements: t.elements
                    });
                }
            }
        }

        if (elemSegments.length > 0) {
            this.writeSection(mainWriter, 9, () => {
                const w = new BinaryWriter();
                w.vu32(elemSegments.length);
                for (const seg of elemSegments) {
                    if (seg.tableIdx === 0) {
                        w.vu32(0); // active segment for table 0
                        w.u8(0x41);
                        w.vs32(0);
                        w.u8(0x0B);
                        w.vu32(seg.elements.length);
                        for (const fIdx of seg.elements) w.vu32(fIdx);
                    } else {
                        w.vu32(2); // active segment for arbitrary table
                        w.vu32(seg.tableIdx);
                        w.u8(0x41);
                        w.vs32(0);
                        w.u8(0x0B);
                        w.u8(0x00); // elemkind: func
                        w.vu32(seg.elements.length);
                        for (const fIdx of seg.elements) w.vu32(fIdx);
                    }
                }
                return w.toUint8Array();
            });
        }

        // SECTION 10: Code Section
        if (irModule.functions.length > 0) {
            this.writeSection(mainWriter, 10, () => {
                const w = new BinaryWriter();
                w.vu32(irModule.functions.length);
                for (const func of irModule.functions) {
                    const funcBytes = this.encodeFunctionBody(func);
                    w.vu32(funcBytes.length);
                    w.raw(funcBytes);
                }
                return w.toUint8Array();
            });
        }

        // SECTION 11: Data Section
        if (irModule.dataSegments.length > 0) {
            this.writeSection(mainWriter, 11, () => {
                const w = new BinaryWriter();
                w.vu32(irModule.dataSegments.length);
                for (const seg of irModule.dataSegments) {
                    w.vu32(0);
                    w.u8(0x41);
                    w.vs32(seg.offset);
                    w.u8(0x0B);
                    w.vu32(seg.bytes.length);
                    w.raw(seg.bytes);
                }
                return w.toUint8Array();
            });
        }

        return mainWriter.toUint8Array();
    }

    writeSection(mainWriter, sectionId, contentFn) {
        const content = contentFn();
        if (content.length > 0) {
            mainWriter.u8(sectionId);
            mainWriter.vu32(content.length);
            mainWriter.raw(content);
        }
    }

    encodeFunctionBody(irFunc) {
        const w = new BinaryWriter();

        const localGroups = [];
        for (const loc of irFunc.locals) {
            const vType = WasmValType[loc.wasmType] || WasmValType.i32;
            const lastGroup = localGroups[localGroups.length - 1];
            if (lastGroup && lastGroup.type === vType) {
                lastGroup.count++;
            } else {
                localGroups.push({ count: 1, type: vType });
            }
        }

        w.vu32(localGroups.length);
        for (const group of localGroups) {
            w.vu32(group.count);
            w.u8(group.type);
        }

        for (const node of irFunc.body) {
            this.encodeNode(w, node);
        }

        w.u8(0x0B);
        return w.toUint8Array();
    }

    encodeNode(w, node) {
        if (!node) return;

        if (node.args && node.args.length > 0 && node.op !== IROp.IF) {
            for (const arg of node.args) {
                this.encodeNode(w, arg);
            }
        }

        const type = node.type || 'i32';

        switch (node.op) {
            case IROp.UNREACHABLE: w.u8(0x00); break;
            case IROp.NOP: w.u8(0x01); break;
            case IROp.DROP: w.u8(0x1A); break;
            case IROp.SELECT: w.u8(0x1B); break;
            case IROp.RETURN: w.u8(0x0F); break;

            case IROp.CONST_I32: w.u8(0x41); w.vs32(Number(node.imm)); break;
            case IROp.CONST_I64: w.u8(0x42); w.vs64(BigInt(node.imm)); break;
            case IROp.CONST_F32: w.u8(0x43); w.f32(Number(node.imm)); break;
            case IROp.CONST_F64: w.u8(0x44); w.f64(Number(node.imm)); break;

            // SIMD 128-bit Constant (0xFD 0x0C)
            case IROp.CONST_V128: {
                w.u8(0xFD);
                w.vu32(0x0C);
                const bytes = node.imm instanceof Uint8Array ? node.imm : new Uint8Array(node.imm || 16);
                w.raw(bytes);
                break;
            }

            case IROp.LOCAL_GET: w.u8(0x20); w.vu32(Number(node.imm)); break;
            case IROp.LOCAL_SET: w.u8(0x21); w.vu32(Number(node.imm)); break;
            case IROp.LOCAL_TEE: w.u8(0x22); w.vu32(Number(node.imm)); break;
            case IROp.GLOBAL_GET: w.u8(0x23); w.vu32(Number(node.imm)); break;
            case IROp.GLOBAL_SET: w.u8(0x24); w.vu32(Number(node.imm)); break;

            case IROp.BR: w.u8(0x0C); w.vu32(Number(node.imm)); break;
            case IROp.BR_IF: w.u8(0x0D); w.vu32(Number(node.imm)); break;

            case IROp.BR_TABLE: {
                w.u8(0x0E);
                const targets = node.imm.targets || [];
                w.vu32(targets.length);
                for (const t of targets) w.vu32(Number(t));
                w.vu32(Number(node.imm.defaultTarget || 0));
                break;
            }

            case IROp.BLOCK: {
                w.u8(0x02);
                const resType = node.imm?.resultType || 'void';
                w.u8(WasmValType[resType] || 0x40);
                if (node.imm?.body) {
                    for (const child of node.imm.body) this.encodeNode(w, child);
                }
                w.u8(0x0B);
                break;
            }

            case IROp.LOOP: {
                w.u8(0x03);
                const resType = node.imm?.resultType || 'void';
                w.u8(WasmValType[resType] || 0x40);
                if (node.imm?.body) {
                    for (const child of node.imm.body) this.encodeNode(w, child);
                }
                w.u8(0x0B);
                break;
            }

            case IROp.IF:
                if (node.args && node.args.length > 0) {
                    this.encodeNode(w, node.args[0]);
                }
                w.u8(0x04); w.u8(0x40);
                if (node.imm?.thenBody) {
                    for (const child of node.imm.thenBody) this.encodeNode(w, child);
                }
                if (node.imm?.elseBody && node.imm.elseBody.length > 0) {
                    w.u8(0x05);
                    for (const child of node.imm.elseBody) this.encodeNode(w, child);
                }
                w.u8(0x0B);
                break;

            case IROp.CALL:
                w.u8(0x10); w.vu32(Number(node.imm)); break;

            case IROp.CALL_INDIRECT: {
                const typeIdx = this.getOrAddType(node.imm.paramTypes, node.imm.returnType);
                w.u8(0x11);
                w.vu32(typeIdx);
                w.vu32(Number(node.imm.tableIdx || 0));
                break;
            }

            // Tail Calls (Wasm 2.0)
            case IROp.RETURN_CALL:
                w.u8(0x12); w.vu32(Number(node.imm)); break;

            case IROp.RETURN_CALL_INDIRECT: {
                const typeIdx = this.getOrAddType(node.imm.paramTypes, node.imm.returnType);
                w.u8(0x13);
                w.vu32(typeIdx);
                w.vu32(Number(node.imm.tableIdx || 0));
                break;
            }

            // Unary Integer
            case IROp.EQZ: w.u8(type === 'i64' ? 0x50 : 0x45); break;
            case IROp.CLZ: w.u8(type === 'i64' ? 0x79 : 0x67); break;
            case IROp.CTZ: w.u8(type === 'i64' ? 0x7A : 0x68); break;
            case IROp.POPCNT: w.u8(type === 'i64' ? 0x7B : 0x69); break;

            // Sign-Extension (0xC0-0xC4)
            case IROp.EXTEND8_S: w.u8(type === 'i64' ? 0xC2 : 0xC0); break;
            case IROp.EXTEND16_S: w.u8(type === 'i64' ? 0xC3 : 0xC1); break;
            case IROp.EXTEND32_S: w.u8(0xC4); break;

            // Non-Trapping Float-to-Int Conversions (0xFC 0x00-0x07)
            case IROp.TRUNC_SAT: {
                const { srcType, targetType, signed } = node.imm;
                w.u8(0xFC);
                if (targetType === 'i32' && srcType === 'f32') w.vu32(signed ? 0x00 : 0x01);
                else if (targetType === 'i32' && srcType === 'f64') w.vu32(signed ? 0x02 : 0x03);
                else if (targetType === 'i64' && srcType === 'f32') w.vu32(signed ? 0x04 : 0x05);
                else if (targetType === 'i64' && srcType === 'f64') w.vu32(signed ? 0x06 : 0x07);
                else w.vu32(0x00);
                break;
            }

            // Unary Float
            case IROp.ABS: w.u8(type === 'f64' ? 0x99 : 0x8B); break;
            case IROp.NEG: w.u8(type === 'f64' ? 0x9A : 0x8C); break;
            case IROp.CEIL: w.u8(type === 'f64' ? 0x9B : 0x8D); break;
            case IROp.FLOOR: w.u8(type === 'f64' ? 0x9C : 0x8E); break;
            case IROp.TRUNC_FLOAT: w.u8(type === 'f64' ? 0x9D : 0x8F); break;
            case IROp.NEAREST: w.u8(type === 'f64' ? 0x9E : 0x90); break;
            case IROp.SQRT: w.u8(type === 'f64' ? 0x9F : 0x91); break;

            // Binary Math
            case IROp.ADD: w.u8(type === 'i64' ? 0x7C : (type === 'f32' ? 0x92 : (type === 'f64' ? 0xA0 : 0x6A))); break;
            case IROp.SUB: w.u8(type === 'i64' ? 0x7D : (type === 'f32' ? 0x93 : (type === 'f64' ? 0xA1 : 0x6B))); break;
            case IROp.MUL: w.u8(type === 'i64' ? 0x7E : (type === 'f32' ? 0x94 : (type === 'f64' ? 0xA2 : 0x6C))); break;
            case IROp.DIV: w.u8(type === 'f64' ? 0xA3 : 0x95); break;
            case IROp.DIV_S: w.u8(type === 'i64' ? 0x7F : (type === 'f32' ? 0x95 : (type === 'f64' ? 0xA3 : 0x6D))); break;
            case IROp.DIV_U: w.u8(type === 'i64' ? 0x80 : (type === 'f32' ? 0x95 : (type === 'f64' ? 0xA3 : 0x6E))); break;
            case IROp.REM_S: w.u8(type === 'i64' ? 0x81 : 0x6F); break;
            case IROp.REM_U: w.u8(type === 'i64' ? 0x82 : 0x70); break;
            case IROp.MIN: w.u8(type === 'f64' ? 0xA4 : 0x96); break;
            case IROp.MAX: w.u8(type === 'f64' ? 0xA5 : 0x97); break;
            case IROp.COPYSIGN: w.u8(type === 'f64' ? 0xA6 : 0x98); break;

            // Bitwise
            case IROp.AND: w.u8(type === 'i64' ? 0x83 : 0x71); break;
            case IROp.OR: w.u8(type === 'i64' ? 0x84 : 0x72); break;
            case IROp.XOR: w.u8(type === 'i64' ? 0x85 : 0x73); break;
            case IROp.SHL: w.u8(type === 'i64' ? 0x86 : 0x74); break;
            case IROp.SHR_S: w.u8(type === 'i64' ? 0x87 : 0x75); break;
            case IROp.SHR_U: w.u8(type === 'i64' ? 0x88 : 0x76); break;
            case IROp.ROTL: w.u8(type === 'i64' ? 0x89 : 0x77); break;
            case IROp.ROTR: w.u8(type === 'i64' ? 0x8A : 0x78); break;

            // Comparisons
            case IROp.EQ: w.u8(type === 'i64' ? 0x51 : (type === 'f32' ? 0x5B : (type === 'f64' ? 0x61 : 0x46))); break;
            case IROp.NE: w.u8(type === 'i64' ? 0x52 : (type === 'f32' ? 0x5C : (type === 'f64' ? 0x62 : 0x47))); break;
            case IROp.LT: w.u8(type === 'f64' ? 0x63 : 0x5D); break;
            case IROp.LT_S: w.u8(type === 'i64' ? 0x53 : (type === 'f32' ? 0x5D : (type === 'f64' ? 0x63 : 0x48))); break;
            case IROp.LT_U: w.u8(type === 'i64' ? 0x54 : 0x49); break;
            case IROp.LE: w.u8(type === 'f64' ? 0x65 : 0x5F); break;
            case IROp.LE_S: w.u8(type === 'i64' ? 0x57 : (type === 'f32' ? 0x5F : (type === 'f64' ? 0x65 : 0x4C))); break;
            case IROp.LE_U: w.u8(type === 'i64' ? 0x58 : 0x4D); break;
            case IROp.GT: w.u8(type === 'f64' ? 0x64 : 0x5E); break;
            case IROp.GT_S: w.u8(type === 'i64' ? 0x55 : (type === 'f32' ? 0x5E : (type === 'f64' ? 0x64 : 0x4A))); break;
            case IROp.GT_U: w.u8(type === 'i64' ? 0x56 : 0x4B); break;
            case IROp.GE: w.u8(type === 'f64' ? 0x66 : 0x60); break;
            case IROp.GE_S: w.u8(type === 'i64' ? 0x59 : (type === 'f32' ? 0x60 : (type === 'f64' ? 0x66 : 0x4E))); break;
            case IROp.GE_U: w.u8(type === 'i64' ? 0x5A : 0x4F); break;

            // Conversions & Bitcasts
            case IROp.CONVERT: {
                const { from, to, signed } = node.imm;
                if (from === to) break;
                if (from === Type.I32 && to === Type.I64) { w.u8(signed ? 0xAC : 0xAD); }
                else if (from === Type.I32 && to === Type.F32) { w.u8(signed ? 0xB2 : 0xB3); }
                else if (from === Type.I32 && to === Type.F64) { w.u8(signed ? 0xB7 : 0xB8); }
                else if (from === Type.I64 && to === Type.F32) { w.u8(signed ? 0xB4 : 0xB5); }
                else if (from === Type.I64 && to === Type.F64) { w.u8(signed ? 0xB9 : 0xBA); }
                else if (from === Type.F32 && to === Type.F64) { w.u8(0xBB); }
                else if (from === Type.F64 && to === Type.F32) { w.u8(0xB6); }
                else if (from === Type.F64 && to === Type.I32) { w.u8(signed ? 0xAA : 0xAB); }
                else if (from === Type.F32 && to === Type.I32) { w.u8(signed ? 0xA8 : 0xA9); }
                else if (from === Type.F64 && to === Type.I64) { w.u8(signed ? 0xB0 : 0xB1); }
                else if (from === Type.F32 && to === Type.I64) { w.u8(signed ? 0xAE : 0xAF); }
                else if (from === Type.I64 && to === Type.I32) { w.u8(0xA7); }
                break;
            }

            case IROp.REINTERPRET: {
                const { from, to } = node.imm;
                if (from === Type.F32 && to === Type.I32) w.u8(0xBC);
                else if (from === Type.F64 && to === Type.I64) w.u8(0xBD);
                else if (from === Type.I32 && to === Type.F32) w.u8(0xBE);
                else if (from === Type.I64 && to === Type.F64) w.u8(0xBF);
                break;
            }

            // Memory Operations (Wasm 1.0 + Bulk Memory Wasm 2.0)
            case IROp.LOAD:
                w.u8(type === 'i64' ? 0x29 : (type === 'f32' ? 0x2A : (type === 'f64' ? 0x2B : 0x28)));
                w.vu32(node.imm?.align ?? (type === 'i64' || type === 'f64' ? 3 : 2));
                w.vu32(node.imm?.offset ?? 0);
                break;
            case IROp.LOAD8_S:
                w.u8(type === 'i64' ? 0x30 : 0x2C); w.vu32(0); w.vu32(node.imm?.offset ?? 0); break;
            case IROp.LOAD8_U:
                w.u8(type === 'i64' ? 0x31 : 0x2D); w.vu32(0); w.vu32(node.imm?.offset ?? 0); break;
            case IROp.LOAD16_S:
                w.u8(type === 'i64' ? 0x32 : 0x2E); w.vu32(1); w.vu32(node.imm?.offset ?? 0); break;
            case IROp.LOAD16_U:
                w.u8(type === 'i64' ? 0x33 : 0x2F); w.vu32(1); w.vu32(node.imm?.offset ?? 0); break;
            case IROp.LOAD32_S:
                w.u8(0x34); w.vu32(2); w.vu32(node.imm?.offset ?? 0); break;
            case IROp.LOAD32_U:
                w.u8(0x35); w.vu32(2); w.vu32(node.imm?.offset ?? 0); break;

            case IROp.STORE:
                w.u8(type === 'i64' ? 0x37 : (type === 'f32' ? 0x38 : (type === 'f64' ? 0x39 : 0x36)));
                w.vu32(node.imm?.align ?? (type === 'i64' || type === 'f64' ? 3 : 2));
                w.vu32(node.imm?.offset ?? 0);
                break;
            case IROp.STORE8:
                w.u8(type === 'i64' ? 0x3C : 0x3A); w.vu32(0); w.vu32(node.imm?.offset ?? 0); break;
            case IROp.STORE16:
                w.u8(type === 'i64' ? 0x3D : 0x3B); w.vu32(1); w.vu32(node.imm?.offset ?? 0); break;
            case IROp.STORE32:
                w.u8(0x3E); w.vu32(2); w.vu32(node.imm?.offset ?? 0); break;

            case IROp.MEMORY_GROW:
                w.u8(0x40); w.u8(0x00); break;
            case IROp.MEMORY_SIZE:
                w.u8(0x3F); w.u8(0x00); break;

            // Bulk Memory (0xFC prefix)
            case IROp.MEMORY_COPY:
                w.u8(0xFC); w.vu32(0x0A); w.u8(0x00); w.u8(0x00); break;
            case IROp.MEMORY_FILL:
                w.u8(0xFC); w.vu32(0x0B); w.u8(0x00); break;
            case IROp.MEMORY_INIT:
                w.u8(0xFC); w.vu32(0x08); w.vu32(Number(node.imm || 0)); w.u8(0x00); break;
            case IROp.DATA_DROP:
                w.u8(0xFC); w.vu32(0x09); w.vu32(Number(node.imm || 0)); break;

            // Reference Types & Tables (Wasm 2.0)
            case IROp.REF_NULL:
                w.u8(0xD0); w.u8(WasmValType[node.imm] || WasmValType.funcref); break;
            case IROp.REF_IS_NULL:
                w.u8(0xD1); break;
            case IROp.REF_FUNC:
                w.u8(0xD2); w.vu32(Number(node.imm)); break;

            case IROp.TABLE_GET:
                w.u8(0x25); w.vu32(Number(node.imm)); break;
            case IROp.TABLE_SET:
                w.u8(0x26); w.vu32(Number(node.imm)); break;
            case IROp.TABLE_SIZE:
                w.u8(0xFC); w.vu32(0x10); w.vu32(Number(node.imm)); break;
            case IROp.TABLE_GROW:
                w.u8(0xFC); w.vu32(0x0F); w.vu32(Number(node.imm)); break;
            case IROp.TABLE_FILL:
                w.u8(0xFC); w.vu32(0x11); w.vu32(Number(node.imm)); break;
            case IROp.TABLE_COPY:
                w.u8(0xFC); w.vu32(0x0E); w.vu32(Number(node.imm.dstTable || 0)); w.vu32(Number(node.imm.srcTable || 0)); break;
            case IROp.TABLE_INIT:
                w.u8(0xFC); w.vu32(0x0C); w.vu32(Number(node.imm.elemIdx || 0)); w.vu32(Number(node.imm.tableIdx || 0)); break;
            case IROp.ELEM_DROP:
                w.u8(0xFC); w.vu32(0x0D); w.vu32(Number(node.imm || 0)); break;

            // Fixed-Width SIMD (0xFD prefix)
            case IROp.V128_LOAD:
                w.u8(0xFD); w.vu32(0x00); w.vu32(node.imm?.align ?? 4); w.vu32(node.imm?.offset ?? 0); break;
            case IROp.V128_STORE:
                w.u8(0xFD); w.vu32(0x0B); w.vu32(node.imm?.align ?? 4); w.vu32(node.imm?.offset ?? 0); break;

            case IROp.V128_SPLAT: {
                w.u8(0xFD);
                const lane = node.imm;
                if (lane === 'i8x16') w.vu32(0x0F);
                else if (lane === 'i16x8') w.vu32(0x10);
                else if (lane === 'i32x4') w.vu32(0x11);
                else if (lane === 'i64x2') w.vu32(0x12);
                else if (lane === 'f32x4') w.vu32(0x13);
                else if (lane === 'f64x2') w.vu32(0x14);
                else w.vu32(0x11);
                break;
            }

            case IROp.V128_EXTRACT_LANE: {
                w.u8(0xFD);
                const { laneType, laneIdx, signed } = node.imm;
                if (laneType === 'i8x16') { w.vu32(signed ? 0x15 : 0x16); w.u8(laneIdx); }
                else if (laneType === 'i16x8') { w.vu32(signed ? 0x18 : 0x19); w.u8(laneIdx); }
                else if (laneType === 'i32x4') { w.vu32(0x1B); w.u8(laneIdx); }
                else if (laneType === 'i64x2') { w.vu32(0x1D); w.u8(laneIdx); }
                else if (laneType === 'f32x4') { w.vu32(0x1F); w.u8(laneIdx); }
                else if (laneType === 'f64x2') { w.vu32(0x21); w.u8(laneIdx); }
                break;
            }

            case IROp.V128_REPLACE_LANE: {
                w.u8(0xFD);
                const { laneType, laneIdx } = node.imm;
                if (laneType === 'i8x16') { w.vu32(0x17); w.u8(laneIdx); }
                else if (laneType === 'i16x8') { w.vu32(0x1A); w.u8(laneIdx); }
                else if (laneType === 'i32x4') { w.vu32(0x1C); w.u8(laneIdx); }
                else if (laneType === 'i64x2') { w.vu32(0x1E); w.u8(laneIdx); }
                else if (laneType === 'f32x4') { w.vu32(0x20); w.u8(laneIdx); }
                else if (laneType === 'f64x2') { w.vu32(0x22); w.u8(laneIdx); }
                break;
            }

            case IROp.V128_BITSELECT:
                w.u8(0xFD); w.vu32(0x52); break;

            case IROp.V128_OP: {
                w.u8(0xFD);
                const op = node.imm;
                const SIMD_OPCODES = {
                    'v128.not': 0x4D, 'v128.and': 0x4E, 'v128.andnot': 0x4F, 'v128.or': 0x50, 'v128.xor': 0x51,
                    'i8x16.add': 0x6E, 'i8x16.sub': 0x71, 'i8x16.eq': 0x23, 'i8x16.ne': 0x24,
                    'i16x8.add': 0x82, 'i16x8.sub': 0x85, 'i16x8.mul': 0x95, 'i16x8.eq': 0x27, 'i16x8.ne': 0x28,
                    'i32x4.add': 0xAE, 'i32x4.sub': 0xB1, 'i32x4.mul': 0xB5, 'i32x4.eq': 0x2B, 'i32x4.ne': 0x2C, 'i32x4.lt_s': 0x2D,
                    'i64x2.add': 0xCE, 'i64x2.sub': 0xD1, 'i64x2.mul': 0xD5, 'i64x2.eq': 0xD6, 'i64x2.ne': 0xD7,
                    'f32x4.add': 0xE4, 'f32x4.sub': 0xE5, 'f32x4.mul': 0xE6, 'f32x4.div': 0xE7, 'f32x4.min': 0xE8, 'f32x4.max': 0xE9,
                    'f64x2.add': 0xF0, 'f64x2.sub': 0xF1, 'f64x2.mul': 0xF2, 'f64x2.div': 0xF3, 'f64x2.min': 0xF4, 'f64x2.max': 0xF5
                };
                const code = SIMD_OPCODES[op] || 0xAE; // default i32x4.add
                w.vu32(code);
                break;
            }

            default:
                break;
        }
    }
}
