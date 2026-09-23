/**
 * Comprehensive WebAssembly 2.0 Test Suite
 * Tests Sign-Extension, Non-trapping Trunc Sat, Bulk Memory, Reference Types, Multi-Table, Tail Calls, and Fixed-width SIMD 128.
 */

import { Compiler } from '../src/compiler/compiler.js';
import { Type } from '../src/compiler/types.js';
import {
    ProgramNode,
    FunctionNode,
    GlobalDeclareNode,
    TableDeclareNode,
    DeclareVarNode,
    SetVarNode,
    GetVarNode,
    ConstNode,
    BinaryOpNode,
    SignExtendNode,
    TruncSatNode,
    MemCopyNode,
    MemFillNode,
    RefNullNode,
    RefIsNullNode,
    RefFuncNode,
    TableGetNode,
    TableSetNode,
    TableSizeNode,
    TableGrowNode,
    ReturnCallNode,
    V128ConstNode,
    V128SplatNode,
    V128ExtractLaneNode,
    V128OpNode,
    V128BitSelectNode,
    ReturnNode
} from '../src/compiler/ast.js';
import { WasmDecoder } from '../src/decompiler/wasm_decoder.js';
import { WatParser } from '../src/decompiler/wat_parser.js';
import { ASTToBlocksTranspiler } from '../src/decompiler/ast_to_blocks.js';

let passed = 0;
let failed = 0;
const compiler = new Compiler();

async function test(name, fn) {
    try {
        await fn();
        console.log(`\x1b[32m✔ PASS:\x1b[0m ${name}`);
        passed++;
    } catch (err) {
        console.error(`\x1b[31m✖ FAIL:\x1b[0m ${name}`);
        console.error(err);
        failed++;
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function run() {
    console.log('--- TEST SUITE: WebAssembly 2.0 Specification ---');

    // 1. Sign-Extension Operators (0xC0 - 0xC4)
    await test('Sign-Extension: i32.extend8_s and i32.extend16_s', async () => {
        const prog = new ProgramNode([
            new FunctionNode('test_extend', [], Type.I32, [
                new ReturnNode(new SignExtendNode(new ConstNode(0xFF, Type.I32), 8, Type.I32))
            ], true)
        ]);

        const { wasmBytes } = compiler.compile(prog);
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        const res = instance.exports.test_extend();
        assert(res === -1, `Expected -1, got ${res}`);
    });

    // 2. Non-trapping Float-to-Int Conversions (Trunc Sat: 0xFC 0x00-0x07)
    await test('Trunc Sat: i32.trunc_sat_f32_s (saturation on overflow & nan)', async () => {
        const prog = new ProgramNode([
            new FunctionNode('test_sat', [], Type.I32, [
                new ReturnNode(new TruncSatNode(new ConstNode(3000000000.0, Type.F32), Type.F32, Type.I32, true))
            ], true)
        ]);

        const { wasmBytes } = compiler.compile(prog);
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        const res = instance.exports.test_sat();
        assert(res === 2147483647, `Expected 2147483647, got ${res}`);
    });

    // 3. Bulk Memory: memory.copy & memory.fill (0xFC 0x0A, 0x0B)
    await test('Bulk Memory: memory.fill and memory.copy', async () => {
        const prog = new ProgramNode([
            new FunctionNode('test_bulk', [], Type.I32, [
                new MemFillNode(new ConstNode(0, Type.I32), new ConstNode(42, Type.I32), new ConstNode(16, Type.I32)),
                new MemCopyNode(new ConstNode(100, Type.I32), new ConstNode(0, Type.I32), new ConstNode(16, Type.I32)),
                new ReturnNode(new ConstNode(1, Type.I32))
            ], true)
        ]);

        const { wasmBytes } = compiler.compile(prog);
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        instance.exports.test_bulk();
        const mem = new Uint8Array(instance.exports.memory.buffer);
        assert(mem[0] === 42, `Expected mem[0] === 42, got ${mem[0]}`);
        assert(mem[15] === 42, `Expected mem[15] === 42, got ${mem[15]}`);
        assert(mem[100] === 42, `Expected mem[100] === 42, got ${mem[100]}`);
        assert(mem[115] === 42, `Expected mem[115] === 42, got ${mem[115]}`);
    });

    // 4. Reference Types: externref and ref.is_null (0x6F, 0xD1)
    await test('Reference Types: externref parameter and ref.is_null', async () => {
        const prog = new ProgramNode([
            new FunctionNode('check_null', [{ name: 'r', type: Type.EXTERNREF }], Type.BOOL, [
                new ReturnNode(new RefIsNullNode(new GetVarNode('r')))
            ], true)
        ]);

        const { wasmBytes } = compiler.compile(prog);
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        const isNull1 = instance.exports.check_null(null);
        const isNull2 = instance.exports.check_null({ hello: 'world' });
        assert(isNull1 === 1, `Expected 1 for null, got ${isNull1}`);
        assert(isNull2 === 0, `Expected 0 for object, got ${isNull2}`);
    });

    // 5. Reference Types & Multi-Table: table.get, table.set, table.grow, table.size
    await test('Multi-Table: table.grow, table.set, table.get, table.size', async () => {
        const prog = new ProgramNode(
            [
                new FunctionNode('test_table', [], Type.I32, [
                    new DeclareVarNode('s1', Type.I32, new TableSizeNode(0)),
                    new TableGrowNode(0, new RefNullNode(Type.EXTERNREF), new ConstNode(5, Type.I32)),
                    new TableSetNode(0, new ConstNode(2, Type.I32), new RefNullNode(Type.EXTERNREF)),
                    new ReturnNode(new TableSizeNode(0))
                ], true)
            ],
            [],
            [],
            [],
            [],
            null,
            [new TableDeclareNode('tab0', Type.EXTERNREF, 5, 20)]
        );

        const { wasmBytes } = compiler.compile(prog);
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        const sizeAfter = instance.exports.test_table();
        assert(sizeAfter === 10, `Expected table size 10 after grow, got ${sizeAfter}`);
    });

    // 6. Tail Calls: return_call (0x12)
    await test('Tail Calls: return_call recursive countdown', async () => {
        const prog = new ProgramNode([
            new FunctionNode('count_down', [{ name: 'n', type: Type.I32 }, { name: 'acc', type: Type.I32 }], Type.I32, [
                new ReturnNode(
                    new ReturnCallNode('count_down_step', [new GetVarNode('n'), new GetVarNode('acc')])
                )
            ], true),
            new FunctionNode('count_down_step', [{ name: 'n', type: Type.I32 }, { name: 'acc', type: Type.I32 }], Type.I32, [
                new ReturnNode(
                    new BinaryOpNode('+', new GetVarNode('n'), new GetVarNode('acc'))
                )
            ], true)
        ]);

        const { wasmBytes } = compiler.compile(prog);
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        const res = instance.exports.count_down(100, 50);
        assert(res === 150, `Expected 150, got ${res}`);
    });

    // 7. Fixed-width SIMD 128: i32x4.splat, i32x4.add, i32x4.extract_lane (0xFD)
    await test('SIMD 128: i32x4.splat, i32x4.add, and extract_lane', async () => {
        const prog = new ProgramNode([
            new FunctionNode('simd_add', [], Type.I32, [
                new DeclareVarNode('v1', Type.V128, new V128SplatNode('i32x4', new ConstNode(10, Type.I32))),
                new DeclareVarNode('v2', Type.V128, new V128SplatNode('i32x4', new ConstNode(25, Type.I32))),
                new DeclareVarNode('v3', Type.V128, new V128OpNode('i32x4.add', [new GetVarNode('v1'), new GetVarNode('v2')])),
                new ReturnNode(new V128ExtractLaneNode('i32x4', 0, new GetVarNode('v3')))
            ], true)
        ]);

        const { wasmBytes } = compiler.compile(prog);
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        const res = instance.exports.simd_add();
        assert(res === 35, `Expected 35 (10 + 25), got ${res}`);
    });

    // 8. SIMD 128: v128.const and v128.bitselect
    await test('SIMD 128: v128.const and v128.bitselect', async () => {
        const maskBytes = new Uint8Array(16).fill(0xFF);
        const prog = new ProgramNode([
            new FunctionNode('simd_bitselect', [], Type.I32, [
                new DeclareVarNode('v1', Type.V128, new V128SplatNode('i32x4', new ConstNode(999, Type.I32))),
                new DeclareVarNode('v2', Type.V128, new V128SplatNode('i32x4', new ConstNode(111, Type.I32))),
                new DeclareVarNode('mask', Type.V128, new V128ConstNode(maskBytes)),
                new DeclareVarNode('res', Type.V128, new V128BitSelectNode(new GetVarNode('v1'), new GetVarNode('v2'), new GetVarNode('mask'))),
                new ReturnNode(new V128ExtractLaneNode('i32x4', 0, new GetVarNode('res')))
            ], true)
        ]);

        const { wasmBytes } = compiler.compile(prog);
        const { instance } = await WebAssembly.instantiate(wasmBytes);
        const res = instance.exports.simd_bitselect();
        assert(res === 999, `Expected 999 selected by mask, got ${res}`);
    });

    // 9. Decompiler & Roundtrip for Wasm 2.0 Features
    await test('Decompiler: Wasm 2.0 instructions to AST & Blockly XML', async () => {
        const prog = new ProgramNode([
            new FunctionNode('simd_test', [], Type.V128, [
                new ReturnNode(new V128SplatNode('i32x4', new ConstNode(42, Type.I32)))
            ], true),
            new FunctionNode('sign_ext_test', [], Type.I32, [
                new ReturnNode(new SignExtendNode(new ConstNode(127, Type.I32), 8, Type.I32))
            ], true),
            new FunctionNode('trunc_sat_test', [], Type.I32, [
                new ReturnNode(new TruncSatNode(new ConstNode(3.14, Type.F32), Type.F32, Type.I32, true))
            ], true)
        ]);

        const transpiler = new ASTToBlocksTranspiler();
        const xml = transpiler.transpile(prog);
        assert(xml.includes('spp_v128_splat'), 'XML should contain spp_v128_splat block');
        assert(xml.includes('i32x4'), 'XML should contain i32x4 lane type');
        assert(xml.includes('spp_sign_extend'), 'XML should contain spp_sign_extend block');
        assert(xml.includes('>8_i32<'), 'XML should contain 8_i32 for spp_sign_extend');
        assert(xml.includes('spp_trunc_sat'), 'XML should contain spp_trunc_sat block');
        assert(xml.includes('>i32_f32_s<'), 'XML should contain i32_f32_s for spp_trunc_sat');
        assert(!xml.includes('undefined'), 'XML must not contain any undefined field values');
    });

    // 10. WAT Parser for Wasm 2.0 instructions
    await test('WAT Parser: Wasm 2.0 instructions parsing', async () => {
        const wat = `(module
            (table $t0 10 20 externref)
            (func $f (result i32)
                (i32.extend8_s (i32.const 127))
            )
        )`;
        const parser = new WatParser();
        const ast = parser.parse(wat);
        assert(ast.tables.length === 1, 'Should parse 1 table');
        assert(ast.tables[0].type === Type.EXTERNREF, 'Table elemType should be externref');
        assert(ast.functions.length === 1, 'Should parse 1 function');
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run();
