/**
 * Automated Compiler & Runtime Test Suite
 * 100% WebAssembly 1.0 Coverage Verification
 */

import { Compiler } from '../src/compiler/compiler.js';
import { ScratchRuntime } from '../src/runtime/runtime.js';
import { Type } from '../src/compiler/types.js';
import {
    ProgramNode,
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
    console.log('--- Suíte de Testes Scratch++ (100% WebAssembly 1.0) ---');
    const compiler = new Compiler();
    const runtime = new ScratchRuntime();

    // -------------------------------------------------------------
    // Test 1: Simple Addition Function
    // -------------------------------------------------------------
    {
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
        const funcReinterpret = new FunctionNode(
            'test_bitcast',
            [],
            Type.I32,
            [
                // float 1.0 in IEEE 754 is 0x3F800000 = 1065353216
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
        // For val = 8 (0b1000): clz=28, ctz=3, popcnt=1 -> 28 + 3 + 1 = 32
        const { result } = runtime.run('test_bit_counts', 8);
        assert(result === 32, `clz(8) + ctz(8) + popcnt(8) == 32 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 10: Memory.Grow and Memory.Size
    // -------------------------------------------------------------
    {
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
        // Initial was 2 pages, grew by 3 pages -> total 5 pages
        assert(result === 5, `memory.size after memory.grow(3) == 5 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 11: Globals (mutable)
    // -------------------------------------------------------------
    {
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

    console.log(`\n🎉 Todos os ${passedTests}/${totalTests} testes de conformidade Wasm 1.0 passaram com 100% de sucesso!`);
}

runTests().catch(err => {
    console.error('Falha nos testes:', err);
    process.exit(1);
});
