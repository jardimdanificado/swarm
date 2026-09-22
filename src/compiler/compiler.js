/**
 * Scratch++ Compiler Pipeline
 * Transforms AST -> Type Checked AST -> IR Module -> Binary .wasm
 */

import { TypeChecker } from './type_checker.js';
import { ASTToLowerer } from './ir.js';
import { WasmEncoder } from './wasm_encoder.js';

export class Compiler {
    constructor() {
        this.typeChecker = new TypeChecker();
        this.lowerer = new ASTToLowerer();
        this.encoder = new WasmEncoder();
    }

    compile(programNode) {
        // 1. Type check and apply automatic widening coercions
        const typeCheckResult = this.typeChecker.check(programNode);

        // 2. Lower AST to WebAssembly Intermediate Representation (IR)
        const irModule = this.lowerer.lower(programNode, typeCheckResult);

        // 3. Encode IR into WebAssembly 1.0 binary format (Uint8Array)
        const wasmBytes = this.encoder.encode(irModule);

        return {
            wasmBytes,
            irModule,
            typeCheckResult
        };
    }
}
