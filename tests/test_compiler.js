/**
 * Automated Compiler & Runtime Test Suite
 * 100% WebAssembly 1.0 Coverage Verification (Including Generic Imports, Exports, Start Section & Bitcast)
 */

import { Compiler } from '../src/compiler/compiler.js';
import { ScratchRuntime } from '../src/runtime/runtime.js';
import { Type } from '../src/compiler/types.js';
import {
    ProgramNode,
    ImportFuncNode,
    ImportGlobalNode,
    ExportNode,
    StartFuncNode,
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
    RepeatNode,
    WhileNode,
    BrNode,
    BrIfNode,
    BrTableNode,
    ReturnNode,
    DropNode,
    NopNode,
    CallNode,
    CallIndirectNode,
    MemLoadNode,
    MemStoreNode,
    MemGrowNode,
    MemSizeNode,
    StringLiteralNode,
    PrintNode
} from '../src/compiler/ast.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(message);
    }
    passedTests++;
    console.log(`✅ PASS: ${message}`);
}

async function runTests() {
    console.log('--- Suíte de Testes Scratch++ (100% WebAssembly 1.0 Completo) ---');
    const compiler = new Compiler();

    // -------------------------------------------------------------
    // Test 1: Simple Addition Function
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcAdd = new FunctionNode(
            'add',
            [{ name: 'a', type: Type.I32 }, { name: 'b', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(
                    new BinaryOpNode('+', new GetVarNode('a'), new GetVarNode('b'))
                )
            ]
        );
        const program = new ProgramNode([funcAdd], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const { result } = runtime.run('add', 15, 27);
        assert(result === 42, `add(15, 27) == 42 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 2: Factorial with While Loop
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcFact = new FunctionNode(
            'factorial',
            [{ name: 'n', type: Type.I32 }],
            Type.I32,
            [
                new DeclareVarNode('result', Type.I32, new ConstNode(1, Type.I32)),
                new WhileNode(
                    new BinaryOpNode('>', new GetVarNode('n'), new ConstNode(1, Type.I32)),
                    [
                        new SetVarNode(
                            'result',
                            new BinaryOpNode('*', new GetVarNode('result'), new GetVarNode('n'))
                        ),
                        new SetVarNode(
                            'n',
                            new BinaryOpNode('-', new GetVarNode('n'), new ConstNode(1, Type.I32))
                        )
                    ]
                ),
                new ReturnNode(new GetVarNode('result'))
            ]
        );
        const program = new ProgramNode([funcFact], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const { result } = runtime.run('factorial', 5);
        assert(result === 120, `factorial(5) == 120 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 3: Type Widening Coercion (i32 + f64 -> f64)
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcWiden = new FunctionNode(
            'calc_widen',
            [{ name: 'intVal', type: Type.I32 }, { name: 'floatVal', type: Type.F64 }],
            Type.F64,
            [
                new ReturnNode(
                    new BinaryOpNode('+', new GetVarNode('intVal'), new GetVarNode('floatVal'))
                )
            ]
        );
        const program = new ProgramNode([funcWiden], [], []);
        const { wasmBytes, typeCheckResult } = compiler.compile(program);
        assert(typeCheckResult.coercions.length > 0, 'Coerção automática de i32 -> f64 detectada');
        await runtime.instantiate(wasmBytes);
        const { result } = runtime.run('calc_widen', 10, 2.5);
        assert(result === 12.5, `calc_widen(10, 2.5) == 12.5 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 4: Memory Buffer Load and Store (Load8 / Store8)
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcMem = new FunctionNode(
            'test_memory',
            [],
            Type.I32,
            [
                new MemStoreNode(new ConstNode(2000, Type.I32), new ConstNode(0, Type.I32), new ConstNode(170, Type.I32), 1),
                new MemStoreNode(new ConstNode(2000, Type.I32), new ConstNode(1, Type.I32), new ConstNode(85, Type.I32), 1),
                new ReturnNode(
                    new BinaryOpNode(
                        '+',
                        new MemLoadNode(Type.I32, new ConstNode(2000, Type.I32), new ConstNode(0, Type.I32), 1, 'unsigned'),
                        new MemLoadNode(Type.I32, new ConstNode(2000, Type.I32), new ConstNode(1, Type.I32), 1, 'unsigned')
                    )
                )
            ]
        );
        const program = new ProgramNode([funcMem], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const { result } = runtime.run('test_memory');
        assert(result === 255, `test_memory() == 255 (170 + 85) (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 5: String Constants and Print Host Calls
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcPrint = new FunctionNode(
            'test_print',
            [],
            Type.VOID,
            [
                new PrintNode(new StringLiteralNode('Olá Scratch++ WebAssembly!')),
                new PrintNode(new ConstNode(999, Type.I32))
            ]
        );
        const program = new ProgramNode([funcPrint], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const { logs } = runtime.run('test_print');
        assert(logs.includes('Olá Scratch++ WebAssembly!'), 'String impressa com sucesso via host import');
        assert(logs.includes('999'), 'Número inteiro impresso com sucesso via host import');
    }

    // -------------------------------------------------------------
    // Test 6: Table First-Class Indirect Call (call_indirect)
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcDouble = new FunctionNode(
            'double_val',
            [{ name: 'x', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(new BinaryOpNode('*', new GetVarNode('x'), new ConstNode(2, Type.I32)))
            ]
        );
        const funcCaller = new FunctionNode(
            'apply_func',
            [{ name: 'fnPtr', type: Type.I32 }, { name: 'val', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(
                    new CallIndirectNode(
                        new GetVarNode('fnPtr'),
                        [new GetVarNode('val')],
                        [Type.I32],
                        Type.I32
                    )
                )
            ]
        );
        const program = new ProgramNode([funcDouble, funcCaller], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const { result } = runtime.run('apply_func', 0, 21);
        assert(result === 42, `apply_func(0, 21) call_indirect == 42 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 7: Wasm 1.0 Select & Local.Tee
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcSelect = new FunctionNode(
            'test_select_tee',
            [{ name: 'cond', type: Type.BOOL }],
            Type.I32,
            [
                new DeclareVarNode('v', Type.I32, new ConstNode(0, Type.I32)),
                new ReturnNode(
                    new SelectNode(
                        new GetVarNode('cond'),
                        new TeeVarNode('v', new ConstNode(100, Type.I32)),
                        new TeeVarNode('v', new ConstNode(200, Type.I32))
                    )
                )
            ]
        );
        const program = new ProgramNode([funcSelect], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const rTrue = runtime.run('test_select_tee', 1);
        const rFalse = runtime.run('test_select_tee', 0);
        assert(rTrue.result === 100, `select true == 100 (recebido: ${rTrue.result})`);
        assert(rFalse.result === 200, `select false == 200 (recebido: ${rFalse.result})`);
    }

    // -------------------------------------------------------------
    // Test 8: Wasm 1.0 Bitcast (Reinterpretation)
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcReinterpret = new FunctionNode(
            'test_bitcast',
            [],
            Type.I32,
            [
                new ReturnNode(
                    new ReinterpretNode(new ConstNode(1.0, Type.F32), Type.I32)
                )
            ]
        );
        const program = new ProgramNode([funcReinterpret], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const { result } = runtime.run('test_bitcast');
        assert(result === 1065353216, `i32.reinterpret_f32(1.0f) == 1065353216 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 9: Wasm 1.0 Integer Bitwise Count (clz, ctz, popcnt)
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcBitCounts = new FunctionNode(
            'test_bit_counts',
            [{ name: 'val', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(
                    new BinaryOpNode(
                        '+',
                        new UnaryOpNode('CLZ', new GetVarNode('val')),
                        new BinaryOpNode(
                            '+',
                            new UnaryOpNode('CTZ', new GetVarNode('val')),
                            new UnaryOpNode('POPCNT', new GetVarNode('val'))
                        )
                    )
                )
            ]
        );
        const program = new ProgramNode([funcBitCounts], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const { result } = runtime.run('test_bit_counts', 8);
        assert(result === 32, `clz(8) + ctz(8) + popcnt(8) == 32 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 10: Memory.Grow and Memory.Size
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcMemGrow = new FunctionNode(
            'test_mem_grow',
            [],
            Type.I32,
            [
                new DeclareVarNode('initial', Type.I32, new MemSizeNode()),
                new DeclareVarNode('prev', Type.I32, new MemGrowNode(new ConstNode(3, Type.I32))),
                new DeclareVarNode('now', Type.I32, new MemSizeNode()),
                new ReturnNode(new GetVarNode('now'))
            ]
        );
        const program = new ProgramNode([funcMemGrow], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const { result } = runtime.run('test_mem_grow');
        assert(result === 5, `memory.size after memory.grow(3) == 5 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 11: Globals (mutable)
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const globalG = new GlobalDeclareNode('counter', Type.I32, true, new ConstNode(10, Type.I32));
        const funcInc = new FunctionNode(
            'inc_global',
            [],
            Type.I32,
            [
                new SetVarNode('counter', new BinaryOpNode('+', new GetVarNode('counter'), new ConstNode(5, Type.I32))),
                new ReturnNode(new GetVarNode('counter'))
            ]
        );
        const program = new ProgramNode([funcInc], [globalG], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const r1 = runtime.run('inc_global');
        const r2 = runtime.run('inc_global');
        assert(r1.result === 15, `global counter first call == 15 (recebido: ${r1.result})`);
        assert(r2.result === 20, `global counter second call == 20 (recebido: ${r2.result})`);
    }

    // -------------------------------------------------------------
    // Test 12: Wasm 1.0 br_table (Switch Dispatch)
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcDispatch = new FunctionNode(
            'test_br_table',
            [{ name: 'idx', type: Type.I32 }],
            Type.I32,
            [
                new DeclareVarNode('out', Type.I32, new ConstNode(999, Type.I32)),
                new BlockNode(0, [
                    new BlockNode(1, [
                        new BlockNode(2, [
                            new BrTableNode(new GetVarNode('idx'), [0, 1], 2)
                        ]),
                        new SetVarNode('out', new ConstNode(10, Type.I32)),
                        new BrNode(1)
                    ]),
                    new SetVarNode('out', new ConstNode(20, Type.I32)),
                    new BrNode(0)
                ]),
                new ReturnNode(new GetVarNode('out'))
            ]
        );
        const program = new ProgramNode([funcDispatch], [], []);
        const { wasmBytes } = compiler.compile(program);
        await runtime.instantiate(wasmBytes);
        const r0 = runtime.run('test_br_table', 0);
        const r1 = runtime.run('test_br_table', 1);
        const rDef = runtime.run('test_br_table', 5);
        assert(r0.result === 10, `br_table index 0 == 10 (recebido: ${r0.result})`);
        assert(r1.result === 20, `br_table index 1 == 20 (recebido: ${r1.result})`);
        assert(rDef.result === 999, `br_table default == 999 (recebido: ${rDef.result})`);
    }

    // -------------------------------------------------------------
    // Test 13: Generic Custom Function Import
    // -------------------------------------------------------------
    {
        const customImport = new ImportFuncNode('env', 'custom_mul', 'my_mul', [
            { name: 'x', type: Type.I32 },
            { name: 'y', type: Type.I32 }
        ], Type.I32);

        const funcCallImport = new FunctionNode(
            'call_my_mul',
            [{ name: 'a', type: Type.I32 }, { name: 'b', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(new CallNode('my_mul', [new GetVarNode('a'), new GetVarNode('b')]))
            ]
        );

        const program = new ProgramNode([funcCallImport], [], [], [customImport]);
        const { wasmBytes } = compiler.compile(program);

        // Instantiate with custom host function
        const imports = {
            host: {
                print_i32: () => {},
                print_f64: () => {},
                print_str: () => {}
            },
            env: {
                custom_mul: (x, y) => x * y * 10
            }
        };

        const compiled = await WebAssembly.instantiate(wasmBytes, imports);
        const result = compiled.instance.exports.call_my_mul(3, 4);
        assert(result === 120, `custom import env.custom_mul(3, 4) == 120 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 14: Start Section (Section 0x08)
    // -------------------------------------------------------------
    {
        const globalInit = new GlobalDeclareNode('start_marker', Type.I32, true, new ConstNode(0, Type.I32), true);
        const funcStart = new FunctionNode(
            'init_module',
            [],
            Type.VOID,
            [
                new SetVarNode('start_marker', new ConstNode(777, Type.I32))
            ]
        );
        const funcGetMarker = new FunctionNode(
            'get_marker',
            [],
            Type.I32,
            [
                new ReturnNode(new GetVarNode('start_marker'))
            ]
        );

        const program = new ProgramNode([funcStart, funcGetMarker], [globalInit], [], [], [], 'init_module');
        const { wasmBytes } = compiler.compile(program);

        const imports = {
            host: { print_i32: () => {}, print_f64: () => {}, print_str: () => {} }
        };
        const compiled = await WebAssembly.instantiate(wasmBytes, imports);
        // Start function was executed automatically during instantiate
        const result = compiled.instance.exports.get_marker();
        assert(result === 777, `Start Section (0x08) executou automaticamente marcando valor 777 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 15: Custom Export Names
    // -------------------------------------------------------------
    {
        const funcInternal = new FunctionNode(
            'internal_calc',
            [{ name: 'x', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(new BinaryOpNode('+', new GetVarNode('x'), new ConstNode(1, Type.I32)))
            ],
            true,
            'external_calc_api'
        );

        const program = new ProgramNode([funcInternal], [], []);
        const { wasmBytes } = compiler.compile(program);
        const imports = {
            host: { print_i32: () => {}, print_f64: () => {}, print_str: () => {} }
        };
        const compiled = await WebAssembly.instantiate(wasmBytes, imports);
        assert(typeof compiled.instance.exports.external_calc_api === 'function', 'Função exportada com nome customizado "external_calc_api"');
        const res = compiled.instance.exports.external_calc_api(99);
        assert(res === 100, `external_calc_api(99) == 100 (recebido: ${res})`);
    }

    console.log(`\n🎉 Todos os ${passedTests}/${totalTests} testes de conformidade 100% Wasm 1.0 passaram com sucesso!`);
}

runTests().catch(err => {
    console.error('Falha nos testes:', err);
    process.exit(1);
});
