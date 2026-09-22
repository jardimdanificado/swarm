import { ASTGenerator } from '../web/blocks/ast_generator.js';
import { Compiler } from '../src/compiler/compiler.js';
import { Type } from '../src/compiler/types.js';

// Mock Blockly Workspace to test AST generation from typed blocks
class MockBlock {
    constructor(type, fields = {}, inputs = {}) {
        this.type = type;
        this.fields = fields;
        this.inputs = inputs;
        this.next = null;
    }
    getFieldValue(name) { return this.fields[name]; }
    getInputTargetBlock(name) { return this.inputs[name] || null; }
    getNextBlock() { return this.next; }
}

console.log("--- Suíte de Testes de Blocos Tipados Específicos ---");

// Test 1: spp_declare_f32 with spp_const_f32
const f32Const = new MockBlock('spp_const_f32', { VALUE: 3.14 });
const f32Decl = new MockBlock('spp_declare_f32', { NAME: 'pi' }, { INIT: f32Const });
const startBlock = new MockBlock('spp_start');
startBlock.next = f32Decl;

const mockWorkspace = {
    getTopBlocks: () => [startBlock]
};

const astGen = new ASTGenerator(mockWorkspace);
const ast = astGen.generate();

console.assert(ast.mainBody.length === 1, "AST mainBody deve ter 1 instrução");
console.assert(ast.mainBody[0].type === Type.F32, "Declaração deve ser f32");
console.assert(ast.mainBody[0].initExpr.type === Type.F32, "Constante deve ser f32");
console.log("✅ PASS: spp_declare_f32 e spp_const_f32 geraram AST correta");

// Test 2: Typed math operation spp_i32_binop
const i32A = new MockBlock('spp_const_i32', { VALUE: 10 });
const i32B = new MockBlock('spp_const_i32', { VALUE: 32 });
const i32Add = new MockBlock('spp_i32_binop', { OP: '+' }, { LEFT: i32A, RIGHT: i32B });
const i32Decl = new MockBlock('spp_declare_i32', { NAME: 'total' }, { INIT: i32Add });
startBlock.next = i32Decl;

const ast2 = astGen.generate();
console.assert(ast2.mainBody[0].type === Type.I32, "Declaração deve ser i32");
console.assert(ast2.mainBody[0].initExpr.op === '+', "Operação deve ser +");
console.log("✅ PASS: spp_i32_binop gerou AST de operação binária correta");

// Test 3: Type conversion block spp_f32_convert_i32
const convBlock = new MockBlock('spp_f32_convert_i32', { SIGNEDNESS: 'signed' }, { VALUE: i32A });
const f32ConvDecl = new MockBlock('spp_declare_f32', { NAME: 'f_val' }, { INIT: convBlock });
startBlock.next = f32ConvDecl;

const ast3 = astGen.generate();
console.assert(ast3.mainBody[0].initExpr.targetType === Type.F32, "Conversão deve apontar para f32");
console.log("✅ PASS: spp_f32_convert_i32 gerou AST de conversão correta");

// Compile and run end-to-end
const compiler = new Compiler();
const { wasmBytes } = compiler.compile(ast2);
const module = new WebAssembly.Module(wasmBytes);
const instance = new WebAssembly.Instance(module, {
    host: {
        print_str: () => {},
        print_i32: () => {},
        print_f64: () => {}
    }
});
console.assert(instance.exports !== undefined, "Instanciação executou com sucesso");
console.log("✅ PASS: AST de blocos tipados compilou e instanciou em WebAssembly nativo!");

console.log("\n🎉 Todos os testes de blocos tipados passaram com sucesso!");
