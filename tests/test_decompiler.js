/**
 * Reverse Transpiler / Decompiler Test Suite
 * Tests Wasm binary -> AST -> Blockly XML and WAT -> AST -> Blockly XML
 */

import { Compiler } from '../src/compiler/compiler.js';
import { WasmDecoder } from '../src/decompiler/wasm_decoder.js';
import { WatParser } from '../src/decompiler/wat_parser.js';
import { ASTToBlocksTranspiler } from '../src/decompiler/ast_to_blocks.js';
import { ScratchRuntime } from '../src/runtime/runtime.js';
import { Type } from '../src/compiler/types.js';
import {
    ProgramNode,
    ImportFuncNode,
    FunctionNode,
    GlobalDeclareNode,
    DeclareVarNode,
    SetVarNode,
    GetVarNode,
    ConstNode,
    BinaryOpNode,
    CallNode,
    ReturnNode
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

async function runDecompilerTests() {
    console.log('--- Suíte de Testes do Transpilador Inverso / Descompilador (Wasm/WAT -> SPP) ---');
    const compiler = new Compiler();
    const decoder = new WasmDecoder();
    const transpiler = new ASTToBlocksTranspiler();
    const watParser = new WatParser();

    // -------------------------------------------------------------
    // Test 1: Decompile Wasm Binary to AST and verify structure
    // -------------------------------------------------------------
    {
        const funcMult = new FunctionNode(
            'multiply',
            [{ name: 'a', type: Type.I32 }, { name: 'b', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(new BinaryOpNode('*', new GetVarNode('a'), new GetVarNode('b')))
            ],
            true
        );
        const globalG = new GlobalDeclareNode('base', Type.I32, true, new ConstNode(100, Type.I32));
        const program = new ProgramNode([funcMult], [globalG], []);

        const { wasmBytes } = compiler.compile(program);
        assert(wasmBytes.length > 0, `Binário gerado: ${wasmBytes.length} bytes`);

        // Decompile binary
        const decompiledAst = decoder.decode(wasmBytes);
        assert(decompiledAst.functions.length >= 1, `Funções descompiladas: ${decompiledAst.functions.length}`);
        assert(decompiledAst.globals.length >= 1, `Globais descompiladas: ${decompiledAst.globals.length}`);

        // Generate Blockly XML
        const xml = transpiler.transpile(decompiledAst);
        assert(xml.includes('<block type="spp_function_def"'), 'Bloco de função gerado no XML');
        assert(xml.includes('<block type="spp_global_declare"'), 'Bloco global gerado no XML');
        console.log('XML Gerado pelo descompilador Wasm:\n', xml.substring(0, 300) + '...\n');
    }

    // -------------------------------------------------------------
    // Test 2: Parse WAT text format to AST and Blockly XML
    // -------------------------------------------------------------
    {
        const watCode = `
        (module
          (import "host" "print_i32" (func $print (param i32)))
          (global $score (mut i32) (i32.const 999))
          (func $calculate (param $x i32) (param $y i32) (result i32)
            (local $temp i32)
            (local.set $temp (i32.add (local.get $x) (local.get $y)))
            (return (local.get $temp))
          )
          (export "calculate" (func $calculate))
        )
        `;

        const astFromWat = watParser.parse(watCode);
        assert(astFromWat.imports.length === 1, `Import WAT detectado: ${astFromWat.imports[0].name}`);
        assert(astFromWat.globals.length === 1, `Global WAT detectada: ${astFromWat.globals[0].name}`);
        assert(astFromWat.functions.length === 1, `Função WAT detectada: ${astFromWat.functions[0].name}`);

        const xmlWat = transpiler.transpile(astFromWat);
        assert(xmlWat.includes('<block type="spp_import_func"'), 'Bloco spp_import_func gerado do WAT');
        assert(xmlWat.includes('<block type="spp_function_def"'), 'Bloco spp_function_def gerado do WAT');
    }

    // -------------------------------------------------------------
    // Test 3: Roundtrip Execution Verification
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcAdd = new FunctionNode(
            'add_five',
            [{ name: 'n', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(new BinaryOpNode('+', new GetVarNode('n'), new ConstNode(5, Type.I32)))
            ]
        );
        const origProgram = new ProgramNode([funcAdd], [], []);
        const { wasmBytes: origWasm } = compiler.compile(origProgram);

        // Decompile
        const decompiledAst = decoder.decode(origWasm);
        // Recompile
        const { wasmBytes: recompiledWasm } = compiler.compile(decompiledAst);

        await runtime.instantiate(recompiledWasm);
        const { result } = runtime.run('add_five', 20);
        assert(result === 25, `Roundtrip decompile -> recompile add_five(20) == 25 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 4: Memory store and load roundtrip
    // -------------------------------------------------------------
    {
        const runtime = new ScratchRuntime();
        const funcMem = new FunctionNode(
            'mem_test',
            [],
            Type.I32,
            [
                new SetVarNode('val', new ConstNode(42, Type.I32)),
                new ReturnNode(new BinaryOpNode('*', new GetVarNode('val'), new ConstNode(2, Type.I32)))
            ],
            true
        );
        const decl = new DeclareVarNode('val', Type.I32, new ConstNode(0, Type.I32));
        funcMem.body.unshift(decl);

        const { wasmBytes: origWasm } = compiler.compile(new ProgramNode([funcMem], [], []));
        const decompiledAst = decoder.decode(origWasm);
        const { wasmBytes: recompiledWasm } = compiler.compile(decompiledAst);

        await runtime.instantiate(recompiledWasm);
        const { result } = runtime.run('mem_test');
        assert(result === 84, `Roundtrip local var compute mem_test() == 84 (recebido: ${result})`);
    }

    // -------------------------------------------------------------
    // Test 5: Full XML Transpilation Roundtrip
    // -------------------------------------------------------------
    {
        const funcCalc = new FunctionNode(
            'poly',
            [{ name: 'x', type: Type.I32 }],
            Type.I32,
            [
                new ReturnNode(
                    new BinaryOpNode('+',
                        new BinaryOpNode('*', new GetVarNode('x'), new GetVarNode('x')),
                        new ConstNode(10, Type.I32)
                    )
                )
            ],
            true
        );
        const prog = new ProgramNode([funcCalc], [], []);
        const { wasmBytes: wasm } = compiler.compile(prog);
        const astDec = decoder.decode(wasm);
        const xml = transpiler.transpile(astDec);
        assert(xml.includes('spp_binary_op'), 'XML contém operadores binários spp_binary_op');
        assert(xml.includes('spp_function_def'), 'XML contém spp_function_def');
    }

    // -------------------------------------------------------------
    // Test 6: Decompile imported func call with arguments (e.g. console_log)
    // -------------------------------------------------------------
    {
        const impConsole = new ImportFuncNode('env', 'console_log', 'console_log', [{ name: 'msg', type: Type.I32 }], Type.VOID);
        const funcCaller = new FunctionNode(
            'trigger_log',
            [],
            Type.VOID,
            [
                new CallNode('console_log', [new ConstNode(777, Type.I32)])
            ],
            true
        );
        const prog = new ProgramNode([funcCaller], [], [], [impConsole]);
        const { wasmBytes: wasm } = compiler.compile(prog);

        // Decompile
        const ast = decoder.decode(wasm);
        const xml = transpiler.transpile(ast);
        assert(xml.includes('<block type="spp_call_stmt"'), 'XML contém spp_call_stmt');
        assert(xml.includes('<value name="ARG0">'), 'XML contém argumento ARG0 para a chamada de função');
        assert(xml.includes('<field name="NAME">console_log</field>'), 'XML contém nome console_log');

        // Recompile decompiled AST
        const { wasmBytes: recompiled } = compiler.compile(ast);
        assert(recompiled.length > 0, 'Recompilou AST descompilada com chamada de import com argumento');
    }

    console.log(`\n🎉 Todos os ${passedTests}/${totalTests} testes de transpilador inverso passaram com sucesso!`);
}

runDecompilerTests().catch(err => {
    console.error('Falha nos testes de descompilação:', err);
    process.exit(1);
});
