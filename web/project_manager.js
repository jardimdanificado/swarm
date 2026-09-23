/**
 * Scratch++ Project & Function Workspace Manager
 * Enables zero-lag function-level paging and state synchronization for large projects
 */

import { ASTToBlocksTranspiler } from '../src/decompiler/ast_to_blocks.js';
import { ASTGenerator } from './blocks/ast_generator.js';

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

export class ProjectManager {
    constructor(workspace) {
        this.workspace = workspace;
        this.transpiler = new ASTToBlocksTranspiler();
        this.programAst = null;
        this.activeView = 'all'; // 'all', 'overview', or number (func index)
        this.onFunctionsChanged = null;
        this.isSwitchingView = false;
    }

    setProgram(programAst, initialView = 'all') {
        this.programAst = programAst;
        this.activeView = initialView;
        if (this.onFunctionsChanged) {
            this.onFunctionsChanged(this.getFunctionsList());
        }
        this.renderCurrentView();
    }

    getFunctionsList() {
        if (!this.programAst || !this.programAst.functions) return [];
        return this.programAst.functions.map((f, idx) => ({
            index: idx,
            name: f.name || `func_${idx}`,
            returnType: f.returnType || 'void',
            paramCount: (f.params || []).length,
            bodyCount: (f.body || []).length
        }));
    }

    syncCurrentView() {
        if (!this.programAst || !this.workspace || this.isSwitchingView) return;
        try {
            const gen = new ASTGenerator(this.workspace);
            const currentAst = gen.generate();

            if (this.activeView === 'all') {
                if (currentAst && (currentAst.functions?.length > 0 || currentAst.globals?.length > 0 || currentAst.imports?.length > 0)) {
                    this.programAst = currentAst;
                }
            } else if (typeof this.activeView === 'number') {
                const funcIdx = this.activeView;
                if (currentAst.functions && currentAst.functions.length > 0 && this.programAst.functions) {
                    this.programAst.functions[funcIdx] = currentAst.functions[0];
                }
            } else if (this.activeView === 'overview') {
                this.programAst.imports = currentAst.imports || [];
                this.programAst.globals = currentAst.globals || [];
                this.programAst.tables = currentAst.tables || [];
                this.programAst.exports = currentAst.exports || [];
                this.programAst.mainBody = currentAst.mainBody || [];
            }
        } catch (e) {
            console.warn('Sync view warning:', e);
        }
    }

    loadView(viewMode) {
        if (!this.programAst) return;
        this.syncCurrentView();
        this.activeView = viewMode;
        this.renderCurrentView();
    }

    renderCurrentView() {
        if (!this.programAst || !this.workspace) return;
        this.isSwitchingView = true;

        const disableEvents = Blockly.Events && typeof Blockly.Events.disable === 'function';
        if (disableEvents) Blockly.Events.disable();

        try {
            this.workspace.clear();
            let xml = '';

            if (this.activeView === 'all') {
                xml = this.transpiler.transpile(this.programAst);
            } else if (this.activeView === 'overview') {
                xml = this.transpiler.transpileOverview(this.programAst);
            } else if (typeof this.activeView === 'number') {
                const func = this.programAst.functions[this.activeView];
                if (func) {
                    xml = this.transpiler.transpileFunction(func, 40, 40);
                }
            }

            if (xml) {
                const dom = parseXmlText(xml);
                Blockly.Xml.domToWorkspace(dom, this.workspace);
            }
        } finally {
            if (disableEvents) Blockly.Events.enable();
            this.isSwitchingView = false;
        }
    }

    getUnifiedProgramAst() {
        this.syncCurrentView();
        return this.programAst;
    }
}
