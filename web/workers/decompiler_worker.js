/**
 * Scratch++ Web Worker for Asynchronous Wasm/WAT Decompilation
 * High-Throughput streaming & progress notifications for 70KB+ binaries
 */

import { WasmDecoder } from '../../src/decompiler/wasm_decoder.js';
import { WatParser } from '../../src/decompiler/wat_parser.js';
import { ASTToBlocksTranspiler } from '../../src/decompiler/ast_to_blocks.js';

self.onmessage = async function(e) {
    const { action, buffer, watText, fileName } = e.data;

    try {
        if (action === 'decompile_wasm') {
            self.postMessage({ type: 'progress', percent: 10, message: 'Decodificando seções binárias Wasm...' });
            
            const uint8Array = new Uint8Array(buffer);
            const decoder = new WasmDecoder();
            
            const ast = decoder.decode(uint8Array);
            self.postMessage({ type: 'progress', percent: 60, message: 'Construindo árvore AST e mapeando funções...' });

            const transpiler = new ASTToBlocksTranspiler();
            const xml = transpiler.transpile(ast);
            self.postMessage({ type: 'progress', percent: 90, message: 'Gerando blocos visuais...' });

            const functionsList = (ast.functions || []).map((f, idx) => ({
                id: `func_${idx}`,
                name: f.name,
                returnType: f.returnType,
                paramCount: (f.params || []).length,
                bodyCount: (f.body || []).length
            }));

            self.postMessage({
                type: 'complete',
                ast: ast,
                xml: xml,
                functionsList: functionsList,
                fileName: fileName
            });
        } else if (action === 'decompile_wat') {
            self.postMessage({ type: 'progress', percent: 20, message: 'Analisando texto WAT / S-Expressions...' });
            
            const parser = new WatParser();
            const ast = parser.parse(watText);
            
            self.postMessage({ type: 'progress', percent: 65, message: 'Mapeando símbolos e gerando blocos...' });
            const transpiler = new ASTToBlocksTranspiler();
            const xml = transpiler.transpile(ast);

            const functionsList = (ast.functions || []).map((f, idx) => ({
                id: `func_${idx}`,
                name: f.name,
                returnType: f.returnType,
                paramCount: (f.params || []).length,
                bodyCount: (f.body || []).length
            }));

            self.postMessage({
                type: 'complete',
                ast: ast,
                xml: xml,
                functionsList: functionsList,
                fileName: fileName
            });
        }
    } catch (err) {
        self.postMessage({
            type: 'error',
            message: err.message,
            stack: err.stack
        });
    }
};
