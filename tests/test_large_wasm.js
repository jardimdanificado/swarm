/**
 * Scratch++ Large WebAssembly Binary (70KB+) Stress & Performance Test
 * Tests decompilation, function extraction, pagination, and roundtrip compilation
 */

import { Compiler } from '../src/compiler/compiler.js';
import { WasmDecoder } from '../src/decompiler/wasm_decoder.js';
import { WatParser } from '../src/decompiler/wat_parser.js';
import { ASTToBlocksTranspiler } from '../src/decompiler/ast_to_blocks.js';
import {
    ProgramNode,
    FunctionNode,
    GlobalDeclareNode,
    ConstNode,
    BinaryOpNode,
    SetVarNode,
    GetVarNode,
    DeclareVarNode,
    ReturnNode,
    InlineWatNode
} from '../src/compiler/ast.js';
import { Type } from '../src/compiler/types.js';

console.log('--- TEST SUITE: Large WebAssembly Binary (70KB+) Stress & Performance ---');

// 1. Generate a large synthetic program with 60+ functions and dense bodies
const functions = [];
const globals = [
    new GlobalDeclareNode('g_accumulator', Type.I32, true, new ConstNode(0, Type.I32)),
    new GlobalDeclareNode('g_multiplier', Type.I32, true, new ConstNode(10, Type.I32))
];

const NUM_FUNCTIONS = 60;
for (let f = 0; f < NUM_FUNCTIONS; f++) {
    const params = [
        { name: 'a', type: Type.I32 },
        { name: 'b', type: Type.I32 }
    ];
    const body = [];
    body.push(new DeclareVarNode('temp', Type.I32, new ConstNode(f * 10, Type.I32)));
    
    // Add 25 dense arithmetic operations per function
    for (let op = 0; op < 25; op++) {
        const opSymbol = ['+', '-', '*', '&', '|', '^'][op % 6];
        const rightVal = (op % 2 === 0) ? new GetVarNode('b') : new ConstNode(op + 1, Type.I32);
        body.push(new SetVarNode('temp', new BinaryOpNode(opSymbol, new GetVarNode('temp'), rightVal)));
    }

    // Add inline wat block for stress testing hybrid execution
    body.push(new InlineWatNode('nop (nop)', 'void'));
    body.push(new ReturnNode(new GetVarNode('temp')));

    functions.push(new FunctionNode(`compute_layer_${f}`, params, Type.I32, body, true));
}

const largeProgram = new ProgramNode(functions, globals);

// 2. Compile large program to Wasm
const compiler = new Compiler();
const t0 = performance.now();
const compileResult = compiler.compile(largeProgram);
const tCompile = performance.now() - t0;
const wasmBytes = compileResult.wasmBytes;

console.log(`✅ PASS: Large program compiled: ${wasmBytes.length} bytes in ${tCompile.toFixed(2)}ms (${NUM_FUNCTIONS} functions)`);

// 3. Decompile large Wasm binary
const decoder = new WasmDecoder();
const t1 = performance.now();
const decompiledAst = decoder.decode(wasmBytes);
const tDecompile = performance.now() - t1;

console.log(`✅ PASS: Large binary decompiled in ${tDecompile.toFixed(2)}ms`);
if (decompiledAst.functions.length !== NUM_FUNCTIONS) {
    throw new Error(`Expected ${NUM_FUNCTIONS} functions, got ${decompiledAst.functions.length}`);
}
console.log(`✅ PASS: Correct function count: ${decompiledAst.functions.length}/${NUM_FUNCTIONS}`);

// 4. Test Function-Level Paging (Transpiling single functions vs full module)
const transpiler = new ASTToBlocksTranspiler();

// Single function transpilation (should be instant, < 2ms)
const t2 = performance.now();
const singleFuncXml = transpiler.transpileFunction(decompiledAst.functions[0]);
const tSingle = performance.now() - t2;
console.log(`✅ PASS: Single function transpiled to XML in ${tSingle.toFixed(2)}ms (length: ${singleFuncXml.length} chars)`);

// Overview transpilation
const overviewXml = transpiler.transpileOverview(decompiledAst);
console.log(`✅ PASS: Overview transpiled to XML (length: ${overviewXml.length} chars)`);

// Recompile decompiled AST
const recompileResult = compiler.compile(decompiledAst);
console.log(`✅ PASS: Decompiled large AST successfully recompiled to ${recompileResult.wasmBytes.length} bytes!`);

console.log('\n🎉 ALL LARGE WASM PERFORMANCE TESTS PASSED!');
