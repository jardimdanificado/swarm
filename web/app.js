/**
 * Scratch++ (Swarm) Web Studio Application Orchestrator
 * Real-Time Visual Programming, WebAssembly 2.0 Compilation & Execution
 * High-Throughput Function-Level Paging & Web Worker Multi-Threading
 */

import { registerScratchPPBlocks } from './blocks/blocks_definitions.js';
import { initScratchTheme } from './blocks/types_theme.js';
import { ASTGenerator } from './blocks/ast_generator.js';
import { Compiler } from '../src/compiler/compiler.js';
import { ScratchRuntime } from '../src/runtime/runtime.js';
import { WasmDecoder } from '../src/decompiler/wasm_decoder.js';
import { WatParser } from '../src/decompiler/wat_parser.js';
import { ASTToBlocksTranspiler } from '../src/decompiler/ast_to_blocks.js';
import { ProjectManager } from './project_manager.js';
import { EXAMPLES } from './examples.js';

let workspace = null;
let compiler = null;
let runtime = null;
let projectManager = null;
let decompilerWorker = null;
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
 * Progress Modal Overlay Helpers
 * ========================================================================= */
function showProgressModal(title, percent, status) {
    const modal = document.getElementById('progress-modal');
    const titleEl = document.getElementById('progress-title');
    const fillEl = document.getElementById('progress-bar-fill');
    const statusEl = document.getElementById('progress-status');
    if (modal) modal.style.display = 'flex';
    if (titleEl && title) titleEl.textContent = title;
    if (fillEl && percent !== undefined) fillEl.style.width = `${percent}%`;
    if (statusEl && status) statusEl.textContent = status;
}

function hideProgressModal() {
    const modal = document.getElementById('progress-modal');
    if (modal) modal.style.display = 'none';
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

let activeTab = 'tab-console';
let cachedAst = null;
let cachedCompileResult = null;

function updateTabUI(tabId) {
    if (tabId === 'tab-wasm') {
        const wasmSummary = document.getElementById('wasm-summary');
        const wasmHex = document.getElementById('wasm-hex');
        if (wasmSummary && wasmHex) {
            if (lastCompiledWasm) {
                wasmSummary.textContent = `Size: ${lastCompiledWasm.length} bytes • Wasm sections generated successfully.`;
                if (lastCompiledWasm.length > 65536) {
                    const slice = lastCompiledWasm.subarray(0, 65536);
                    wasmHex.textContent = formatHexDump(slice) + `\n... [View truncated at 64KB (${lastCompiledWasm.length} bytes total). Export the .wasm to see the full file]`;
                } else {
                    wasmHex.textContent = formatHexDump(lastCompiledWasm);
                }
            } else {
                wasmSummary.textContent = '';
                wasmHex.textContent = 'No module compiled yet. Click "Compile".';
            }
        }
    } else if (tabId === 'tab-ir') {
        const irViewer = document.getElementById('ir-viewer');
        if (irViewer) {
            if (cachedAst && cachedCompileResult) {
                const irData = {
                    ast: cachedAst,
                    coercions: cachedCompileResult.typeCheckResult?.coercions,
                    functions: Array.from(cachedCompileResult.typeCheckResult?.functions?.keys() || [])
                };
                const jsonStr = JSON.stringify(irData, (key, val) => typeof val === 'bigint' ? val.toString() + 'n' : val, 2);
                if (jsonStr.length > 100000) {
                    irViewer.textContent = jsonStr.slice(0, 100000) + '\n\n... [View truncated for rendering performance]';
                } else {
                    irViewer.textContent = jsonStr;
                }
            } else {
                irViewer.textContent = 'No IR generated.';
            }
        }
    }
}

/* =========================================================================
 * Mobile View Switcher
 * ========================================================================= */
function setMobileView(viewName) {
    const mobileBtns = document.querySelectorAll('.mobile-tab-btn');
    mobileBtns.forEach(btn => {
        if (btn.getAttribute('data-mobile-view') === viewName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.body.classList.remove('mobile-view-nav', 'mobile-view-editor', 'mobile-view-inspector');
    document.body.classList.add(`mobile-view-${viewName}`);

    if (viewName === 'editor' && workspace) {
        setTimeout(() => Blockly.svgResize(workspace), 50);
    } else if (viewName === 'inspector') {
        updateTabUI(activeTab);
    }
}

/* =========================================================================
 * Compilation Pipeline
 * ========================================================================= */
function compileWorkspace(silent = false) {
    try {
        const programAst = projectManager ? projectManager.getUnifiedProgramAst() : (new ASTGenerator(workspace)).generate();
        if (!programAst) return null;

        const compileResult = compiler.compile(programAst);
        lastCompiledWasm = compileResult.wasmBytes;
        cachedAst = programAst;
        cachedCompileResult = compileResult;

        // Lazy-render active tab only
        updateTabUI(activeTab);

        const statusLeft = document.getElementById('status-left');
        if (statusLeft) {
            statusLeft.textContent = `🐜 Compilation OK: ${lastCompiledWasm.length} bytes Wasm`;
        }

        return compileResult;
    } catch (err) {
        if (!silent) {
            console.error('Compilation error:', err);
            appendConsole(`[Compilation Error] ${err.message}`, 'error');
            showToast(err.message, 'error');
        }
        const statusLeft = document.getElementById('status-left');
        if (statusLeft) statusLeft.textContent = `⚠️ Compilation: ${err.message}`;
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

    appendConsole('--- Starting Wasm Execution ---', 'system');

    try {
        await runtime.instantiate(lastCompiledWasm);
        const res = runtime.run('__main__');

        appendConsole(`--- Execution Finished in ${res.durationMs.toFixed(2)}ms ---`, 'system');
        showToast(`Executed successfully (${res.durationMs.toFixed(2)}ms)!`, 'success');
    } catch (err) {
        console.error('Runtime error:', err);
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
 * Function Navigator UI Controller
 * ========================================================================= */
function updateNavigatorUI(functionsList) {
    const badge = document.getElementById('func-count-badge');
    if (badge) badge.textContent = functionsList.length;

    const container = document.getElementById('func-list-container');
    if (!container) return;
    container.innerHTML = '';

    const searchFilter = (document.getElementById('func-search-input')?.value || '').toLowerCase();

    functionsList.forEach((fn) => {
        if (searchFilter && !fn.name.toLowerCase().includes(searchFilter)) return;

        const item = document.createElement('div');
        item.className = 'func-item' + (projectManager && projectManager.activeView === fn.index ? ' active' : '');
        item.innerHTML = `
            <span style="font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fn.name}</span>
            <span class="func-item-badge">${fn.returnType} (${fn.bodyCount})</span>
        `;
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn, .func-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            projectManager.loadView(fn.index);
            setMobileView('editor');
        });
        container.appendChild(item);
    });
}

/* =========================================================================
 * Project / Example Management
 * ========================================================================= */
function loadXmlToWorkspace(xmlText) {
    if (!workspace) return;
    const disableEvents = Blockly.Events && typeof Blockly.Events.disable === 'function';
    if (disableEvents) Blockly.Events.disable();
    try {
        workspace.clear();
        const dom = parseXmlText(xmlText);
        Blockly.Xml.domToWorkspace(dom, workspace);
        
        // Generate AST and update project manager
        const gen = new ASTGenerator(workspace);
        const ast = gen.generate();
        projectManager.setProgram(ast);
    } finally {
        if (disableEvents) Blockly.Events.enable();
    }
}

function loadExample(exampleId) {
    const example = EXAMPLES.find(e => e.id === exampleId);
    if (!example || !workspace) return;

    loadXmlToWorkspace(example.xml);
    showToast(`Example "${example.name}" loaded.`, 'success');
    compileWorkspace();
}

function exportSppProject() {
    const ast = projectManager.getUnifiedProgramAst();
    const transpiler = new ASTToBlocksTranspiler();
    const xmlText = transpiler.transpile(ast);

    const projectData = {
        name: 'swarm Project',
        version: '2.0.0',
        xml: xmlText
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.spp';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Project .spp exported!', 'success');
}

function exportWasmBinary() {
    if (!lastCompiledWasm) {
        compileWorkspace();
    }
    if (!lastCompiledWasm) {
        showToast('No Wasm binary available. Fix errors first.', 'error');
        return;
    }

    const blob = new Blob([lastCompiledWasm], { type: 'application/wasm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.wasm';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Binary .wasm exported!', 'success');
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

    // 3. Initialize Compiler, Runtime & Project Manager
    compiler = new Compiler();
    runtime = new ScratchRuntime({
        onPrint: (text) => appendConsole(text, 'info')
    });
    projectManager = new ProjectManager(workspace);
    projectManager.onFunctionsChanged = updateNavigatorUI;

    // 4. Initialize Background Decompiler Web Worker
    try {
        decompilerWorker = new Worker('./workers/decompiler_worker.js', { type: 'module' });
        decompilerWorker.onmessage = (e) => {
            const data = e.data;
            if (data.type === 'progress') {
                showProgressModal('🐜 Decompiling WebAssembly...', data.percent, data.message);
            } else if (data.type === 'complete') {
                hideProgressModal();
                const initialView = (data.functionsList && data.functionsList.length > 8) ? 0 : 'all';
                projectManager.setProgram(data.ast, initialView);
                
                document.querySelectorAll('.nav-btn, .func-item').forEach(el => el.classList.remove('active'));
                if (initialView === 'all') {
                    document.getElementById('btn-view-all')?.classList.add('active');
                } else if (typeof initialView === 'number') {
                    const items = document.querySelectorAll('.func-item');
                    if (items[0]) items[0].classList.add('active');
                }

                showToast(`File "${data.fileName}" decompiled (${data.functionsList?.length || 0} functions)!`, 'success');
                compileWorkspace();
            } else if (data.type === 'error') {
                hideProgressModal();
                console.error('Worker error:', data);
                showToast(`Decompilation error: ${data.message}`, 'error');
            }
        };
    } catch (err) {
        console.warn('Web Worker could not be started, using fallback inline mode.', err);
    }

    // 5. Setup Navigator UI Listeners
    const searchInput = document.getElementById('func-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            updateNavigatorUI(projectManager.getFunctionsList());
        });
    }

    const btnAll = document.getElementById('btn-view-all');
    if (btnAll) {
        btnAll.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn, .func-item').forEach(el => el.classList.remove('active'));
            btnAll.classList.add('active');
            projectManager.loadView('all');
        });
    }

    const btnOverview = document.getElementById('btn-view-overview');
    if (btnOverview) {
        btnOverview.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn, .func-item').forEach(el => el.classList.remove('active'));
            btnOverview.classList.add('active');
            projectManager.loadView('overview');
        });
    }

    // 6. Setup Examples Dropdown
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

    // 7. Setup Action Buttons
    const btnRun = document.getElementById('btn-run');
    if (btnRun) btnRun.addEventListener('click', () => executeProgram());

    const btnCompile = document.getElementById('btn-compile');
    if (btnCompile) btnCompile.addEventListener('click', () => {
        compileWorkspace();
        showToast('Compilation completed!', 'success');
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
                        loadXmlToWorkspace(data.xml);
                        showToast(`Project "${data.name || file.name}" loaded.`, 'success');
                        compileWorkspace();
                    }
                } catch (err) {
                    showToast('Invalid .spp file.', 'error');
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
                    const watText = evt.target.result;
                    if (decompilerWorker) {
                        showProgressModal('🐜 Decompiling WAT...', 5, 'Sending to worker thread...');
                        decompilerWorker.postMessage({
                            action: 'decompile_wat',
                            watText: watText,
                            fileName: file.name
                        });
                    } else {
                        try {
                            const ast = watParser.parse(watText);
                            const initialView = (ast.functions && ast.functions.length > 8) ? 0 : 'all';
                            projectManager.setProgram(ast, initialView);
                            document.querySelectorAll('.nav-btn, .func-item').forEach(el => el.classList.remove('active'));
                            if (initialView === 'all') {
                                document.getElementById('btn-view-all')?.classList.add('active');
                            }
                            showToast(`WAT "${file.name}" decompiled successfully!`, 'success');
                            compileWorkspace();
                        } catch (err) {
                            console.error('Error decompiling WAT:', err);
                            showToast(`Error decompiling WAT: ${err.message}`, 'error');
                        }
                    }
                };
                reader.readAsText(file);
            } else {
                reader.onload = (evt) => {
                    const buffer = evt.target.result;
                    if (decompilerWorker) {
                        showProgressModal('🐜 Decompiling .wasm...', 5, 'Sending to worker thread...');
                        decompilerWorker.postMessage({
                            action: 'decompile_wasm',
                            buffer: buffer,
                            fileName: file.name
                        }, [buffer]);
                    } else {
                        try {
                            const uint8 = new Uint8Array(buffer);
                            const ast = wasmDecoder.decode(uint8);
                            const initialView = (ast.functions && ast.functions.length > 8) ? 0 : 'all';
                            projectManager.setProgram(ast, initialView);
                            document.querySelectorAll('.nav-btn, .func-item').forEach(el => el.classList.remove('active'));
                            if (initialView === 'all') {
                                document.getElementById('btn-view-all')?.classList.add('active');
                            }
                            showToast(`Wasm binary "${file.name}" decompiled successfully!`, 'success');
                            compileWorkspace();
                        } catch (err) {
                            console.error('Error decompiling .wasm:', err);
                            showToast(`Error decompiling .wasm: ${err.message}`, 'error');
                        }
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
        showToast('Workspace cleared.', 'warn');
    });

    const btnClearConsole = document.getElementById('btn-clear-console');
    if (btnClearConsole) btnClearConsole.addEventListener('click', clearConsole);

    // 8. Tab Navigation (Desktop Inspector Tabs)
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            activeTab = targetId;
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
            updateTabUI(targetId);
        });
    });

    // 9. Mobile Bottom Bar Navigation
    const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
    mobileTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-mobile-view');
            if (view) setMobileView(view);
        });
    });

    window.addEventListener('resize', () => {
        if (workspace) Blockly.svgResize(workspace);
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (workspace) Blockly.svgResize(workspace);
        }, 100);
    });

    // 10. Keyboard Shortcuts
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
        if (e.type !== Blockly.Events.BLOCK_CREATE &&
            e.type !== Blockly.Events.BLOCK_DELETE &&
            e.type !== Blockly.Events.BLOCK_CHANGE &&
            e.type !== Blockly.Events.BLOCK_MOVE) {
            return;
        }
        if (autoCompileTimer) clearTimeout(autoCompileTimer);
        autoCompileTimer = setTimeout(() => {
            compileWorkspace(true);
        }, 350);
    });
});
