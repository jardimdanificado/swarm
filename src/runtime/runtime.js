/**
 * Scratch++ Runtime Engine (JS Host Environment)
 * Instantiates and executes compiled WebAssembly instances with memory & I/O
 */

export class ScratchRuntime {
    constructor(options = {}) {
        this.onPrint = options.onPrint || ((text) => console.log(text));
        this.onCanvasDraw = options.onCanvasDraw || (() => {});
        this.wasmInstance = null;
        this.wasmModule = null;
        this.memory = null;
        this.logs = [];
    }

    createImports() {
        return {
            host: {
                print_i32: (val) => {
                    const text = String(val);
                    this.logs.push(text);
                    this.onPrint(text);
                },
                print_f64: (val) => {
                    const text = String(val);
                    this.logs.push(text);
                    this.onPrint(text);
                },
                print_str: (ptr, len) => {
                    let str = '';
                    if (this.memory) {
                        const bytes = new Uint8Array(this.memory.buffer, ptr, len);
                        str = new TextDecoder().decode(bytes);
                    } else {
                        str = `[str @ ${ptr}, len=${len}]`;
                    }
                    this.logs.push(str);
                    this.onPrint(str);
                },
                canvas_draw: (cmd, x, y, w, h, color) => {
                    this.onCanvasDraw({ cmd, x, y, w, h, color });
                }
            }
        };
    }

    async instantiate(wasmBytes) {
        this.logs = [];
        const imports = this.createImports();
        const compiled = await WebAssembly.instantiate(wasmBytes, imports);
        this.wasmModule = compiled.module;
        this.wasmInstance = compiled.instance;
        this.memory = this.wasmInstance.exports.memory;
        return this.wasmInstance;
    }

    run(funcName = '__main__', ...args) {
        if (!this.wasmInstance) {
            throw new Error('Módulo Wasm não instanciado no runtime.');
        }
        const fn = this.wasmInstance.exports[funcName];
        if (typeof fn !== 'function') {
            throw new Error(`Função exportada "${funcName}" não encontrada no módulo Wasm.`);
        }
        const startTime = performance.now();
        const result = fn(...args);
        const durationMs = performance.now() - startTime;

        return {
            result,
            logs: this.logs,
            durationMs
        };
    }
}
