/**
 * Scratch++ (Swarm) Web Studio Application Orchestrator
 * Real-Time Visual Programming, WebAssembly 1.0 Compilation & Execution
 */

import { registerScratchPPBlocks } from './blocks/blocks_definitions.js';
import { initScratchTheme } from './blocks/types_theme.js';
import { ASTGenerator } from './blocks/ast_generator.js';
import { Compiler } from '../src/compiler/compiler.js';
import { ScratchRuntime } from '../src/runtime/runtime.js';
import { WasmDecoder } from '../src/decompiler/wasm_decoder.js';
import { WatParser } from '../src/decompiler/wat_parser.js';
import { ASTToBlocksTranspiler } from '../src/decompiler/ast_to_blocks.js';
import { EXAMPLES } from './examples.js';

let workspace = null;
let compiler = null;
let runtime = null;
let lastCompiledWasm = null;
let isRunning = false;

/* =========================================================================
 * Toast Feedback Notification Helper
 * ========================================================================= */
let toastTimer = null;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    if (toastTimer) clearTimeout(toastTimer);

    toast.textContent = message;
    toast.className = 'toast';
    if (type === 'warn') toast.classList.add('toast-warn');
    else if (type === 'error') toast.classList.add('toast-error');

    toast.classList.add('show');
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

/* =========================================================================
 * Console & Canvas Helpers
 * ========================================================================= */
function appendConsole(text, type = 'info') {
    const consoleDiv = document.getElementById('console-output');
    if (!consoleDiv) return;

    const entry = document.createElement('div');
    entry.className = `console-entry ${type}`;
    entry.textContent = text;
    consoleDiv.appendChild(entry);
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

function clearConsole() {
    const consoleDiv = document.getElementById('console-output');
    if (consoleDiv) consoleDiv.innerHTML = '';
}

/* =========================================================================
 * Hex Dump & Inspector Formatter
 * ========================================================================= */
function formatHexDump(uint8Array) {
    let result = '';
    const length = uint8Array.length;
    for (let i = 0; i < length; i += 16) {
        const offset = i.toString(16).padStart(6, '0');
        let hexPart = '';
        let asciiPart = '';

        for (let j = 0; j < 16; j++) {
            if (i + j < length) {
                const byte = uint8Array[i + j];
                hexPart += byte.toString(16).padStart(2, '0') + ' ';
                asciiPart += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
            } else {
                hexPart += '   ';
            }
        }
        result += `${offset}  ${hexPart} |${asciiPart}|\n`;
    }
    return result;
}

/* =========================================================================
 * Compilation Pipeline
 * ========================================================================= */
function compileWorkspace(silent = false) {
    try {
        const astGen = new ASTGenerator(workspace);
        const programAst = astGen.generate();

        const compileResult = compiler.compile(programAst);
        lastCompiledWasm = compileResult.wasmBytes;

        // Update Wasm Hex tab
        const wasmSummary = document.getElementById('wasm-summary');
        const wasmHex = document.getElementById('wasm-hex');
        if (wasmSummary && wasmHex) {
            wasmSummary.textContent = `Tamanho: ${lastCompiledWasm.length} bytes • Seções Wasm 1.0 geradas com sucesso.`;
            wasmHex.textContent = formatHexDump(lastCompiledWasm);
        }

        // Update AST/IR tab
        const irViewer = document.getElementById('ir-viewer');
        if (irViewer) {
            irViewer.textContent = JSON.stringify({
                ast: programAst,
                coercions: compileResult.typeCheckResult.coercions,
                functions: Array.from(compileResult.typeCheckResult.functions.keys())
            }, (key, val) => typeof val === 'bigint' ? val.toString() + 'n' : val, 2);
        }

        const statusLeft = document.getElementById('status-left');
        if (statusLeft) {
            statusLeft.textContent = `⚡ Compilação OK: ${lastCompiledWasm.length} bytes Wasm`;
        }

        return compileResult;
    } catch (err) {
        if (!silent) {
            console.error('Erro na compilação:', err);
            appendConsole(`[Erro de Compilação] ${err.message}`, 'error');
            showToast(err.message, 'error');
        }
        const statusLeft = document.getElementById('status-left');
        if (statusLeft) statusLeft.textContent = `⚠️ Compilação: ${err.message}`;
        return null;
    }
}

/* =========================================================================
 * Execution Pipeline
 * ========================================================================= */
async function executeProgram() {
    const compileResult = compileWorkspace();
    if (!compileResult || !lastCompiledWasm) return;

    const btnRun = document.getElementById('btn-run');
    isRunning = true;
    if (btnRun) btnRun.classList.add('running');

    appendConsole('--- Iniciando Execução Wasm ---', 'system');

    try {
        await runtime.instantiate(lastCompiledWasm);
        const res = runtime.run('__main__');

        appendConsole(`--- Execução Concluída em ${res.durationMs.toFixed(2)}ms ---`, 'system');
        showToast(`Executado com sucesso (${res.durationMs.toFixed(2)}ms)!`, 'success');
    } catch (err) {
        console.error('Erro na execução:', err);
        appendConsole(`[Runtime Error] ${err.message}`, 'error');
        showToast(err.message, 'error');
    } finally {
        isRunning = false;
        if (btnRun) btnRun.classList.remove('running');
    }
}

/* =========================================================================
 * XML Serialization Helpers
 * ========================================================================= */
function parseXmlText(xmlText) {
    if (Blockly.utils && Blockly.utils.xml && typeof Blockly.utils.xml.textToDom === 'function') {
        return Blockly.utils.xml.textToDom(xmlText);
    }
    if (Blockly.Xml && typeof Blockly.Xml.textToDom === 'function') {
        return Blockly.Xml.textToDom(xmlText);
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    return doc.documentElement;
}

function serializeXmlDom(xmlDom) {
    if (Blockly.utils && Blockly.utils.xml && typeof Blockly.utils.xml.domToText === 'function') {
        return Blockly.utils.xml.domToText(xmlDom);
    }
    if (Blockly.Xml && typeof Blockly.Xml.domToText === 'function') {
        return Blockly.Xml.domToText(xmlDom);
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDom);
}

/* =========================================================================
 * Project / Example Management
 * ========================================================================= */
function loadExample(exampleId) {
    const example = EXAMPLES.find(e => e.id === exampleId);
    if (!example || !workspace) return;

    workspace.clear();
    const dom = parseXmlText(example.xml);
    Blockly.Xml.domToWorkspace(dom, workspace);
    showToast(`Exemplo "${example.name}" carregado.`, 'success');
    compileWorkspace();
}

function exportSppProject() {
    const dom = Blockly.Xml.workspaceToDom(workspace);
    const xmlText = serializeXmlDom(dom);
    const projectData = {
        name: 'Projeto Scratch++',
        version: '1.0.0',
        xml: xmlText
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projeto.spp';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Projeto .spp exportado!', 'success');
}

function exportWasmBinary() {
    if (!lastCompiledWasm) {
        compileWorkspace();
    }
    if (!lastCompiledWasm) {
        showToast('Nenhum binário Wasm disponível. Corrija os erros.', 'error');
        return;
    }

    const blob = new Blob([lastCompiledWasm], { type: 'application/wasm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projeto.wasm';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Binário .wasm exportado!', 'success');
}

/* =========================================================================
 * Application Initialization
 * ========================================================================= */
window.addEventListener('DOMContentLoaded', () => {
    // 1. Register Blocks & Theme
    registerScratchPPBlocks(Blockly);
    const theme = initScratchTheme(Blockly);

    // 2. Inject Blockly Workspace
    workspace = Blockly.inject('blockly-div', {
        toolbox: document.getElementById('toolbox'),
        grid: { spacing: 25, length: 3, colour: '#1c2823', snap: true },
        zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 2.0, minScale: 0.4, scaleSpeed: 1.1 },
        trashcan: true,
        sounds: false,
        theme: theme
    });

    // 3. Initialize Compiler & Runtime
    compiler = new Compiler();
    runtime = new ScratchRuntime({
        onPrint: (text) => appendConsole(text, 'info')
    });

    // 4. Setup Examples Dropdown
    const select = document.getElementById('example-select');
    if (select) {
        EXAMPLES.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id;
            opt.textContent = e.name;
            select.appendChild(opt);
        });
        select.addEventListener('change', (e) => loadExample(e.target.value));
    }

    // Load Initial Example (Fibonacci)
    loadExample('fibonacci');

    // 5. Setup Action Buttons
    const btnRun = document.getElementById('btn-run');
    if (btnRun) btnRun.addEventListener('click', () => executeProgram());

    const btnCompile = document.getElementById('btn-compile');
    if (btnCompile) btnCompile.addEventListener('click', () => {
        compileWorkspace();
        showToast('Compilação concluída!', 'success');
    });

    const btnExportWasm = document.getElementById('btn-export-wasm');
    if (btnExportWasm) btnExportWasm.addEventListener('click', exportWasmBinary);

    const btnExportSpp = document.getElementById('btn-export-spp');
    if (btnExportSpp) btnExportSpp.addEventListener('click', exportSppProject);

    const btnImportSpp = document.getElementById('btn-import-spp');
    const fileInputSpp = document.getElementById('file-input-spp');
    if (btnImportSpp && fileInputSpp) {
        btnImportSpp.addEventListener('click', () => fileInputSpp.click());
        fileInputSpp.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    if (data.xml) {
                        workspace.clear();
                        const dom = parseXmlText(data.xml);
                        Blockly.Xml.domToWorkspace(dom, workspace);
                        showToast(`Projeto "${data.name || file.name}" carregado.`, 'success');
                        compileWorkspace();
                    }
                } catch (err) {
                    showToast('Arquivo .spp inválido.', 'error');
                }
            };
            reader.readAsText(file);
        });
    }

    const btnDecompileWasm = document.getElementById('btn-decompile-wasm');
    const fileInputWasm = document.getElementById('file-input-wasm');
    const wasmDecoder = new WasmDecoder();
    const watParser = new WatParser();
    const astToBlocks = new ASTToBlocksTranspiler();

    if (btnDecompileWasm && fileInputWasm) {
        btnDecompileWasm.addEventListener('click', () => fileInputWasm.click());
        fileInputWasm.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const isWat = file.name.endsWith('.wat') || file.name.endsWith('.wast');
            const reader = new FileReader();

            if (isWat) {
                reader.onload = (evt) => {
                    try {
                        const watText = evt.target.result;
                        const ast = watParser.parse(watText);
                        const xmlText = astToBlocks.transpile(ast);
                        workspace.clear();
                        const dom = parseXmlText(xmlText);
                        Blockly.Xml.domToWorkspace(dom, workspace);
                        showToast(`WAT "${file.name}" descompilado com sucesso!`, 'success');
                        compileWorkspace();
                    } catch (err) {
                        console.error('Erro ao descompilar WAT:', err);
                        showToast(`Erro ao descompilar WAT: ${err.message}`, 'error');
                    }
                };
                reader.readAsText(file);
            } else {
                reader.onload = (evt) => {
                    try {
                        const buffer = new Uint8Array(evt.target.result);
                        const ast = wasmDecoder.decode(buffer);
                        const xmlText = astToBlocks.transpile(ast);
                        workspace.clear();
                        const dom = parseXmlText(xmlText);
                        Blockly.Xml.domToWorkspace(dom, workspace);
                        showToast(`Binário .wasm "${file.name}" descompilado com sucesso!`, 'success');
                        compileWorkspace();
                    } catch (err) {
                        console.error('Erro ao descompilar .wasm:', err);
                        showToast(`Erro ao descompilar .wasm: ${err.message}`, 'error');
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });
    }

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) btnClear.addEventListener('click', () => {
        workspace.clear();
        clearConsole();
        showToast('Workspace limpo.', 'warn');
    });

    const btnClearConsole = document.getElementById('btn-clear-console');
    if (btnClearConsole) btnClearConsole.addEventListener('click', clearConsole);

    // 6. Tab Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // 7. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && (e.target === document.body || e.target === document.documentElement)) {
            e.preventDefault();
            executeProgram();
        }
    });

    // Auto-recompile on workspace block change (debounced & silent)
    let autoCompileTimer = null;
    workspace.addChangeListener((e) => {
        if (e.isUiEvent || (workspace.isDragging && workspace.isDragging())) return;
        if (autoCompileTimer) clearTimeout(autoCompileTimer);
        autoCompileTimer = setTimeout(() => {
            compileWorkspace(true);
        }, 250);
    });
});
