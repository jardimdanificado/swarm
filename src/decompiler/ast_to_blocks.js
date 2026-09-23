/**
 * AST to Blockly XML Transpiler
 * Converts Scratch++ AST ProgramNode into clean Blockly Workspace XML
 * 100% WebAssembly 1.0 Coverage (Imports, Exports, Globais, Funções, Calls com Argumentos, Memória)
 */

import { ASTNodeType } from '../compiler/ast.js';
import { Type } from '../compiler/types.js';

export class ASTToBlocksTranspiler {
    constructor() {
        this.currentX = 40;
        this.currentY = 40;
    }

    transpile(programNode) {
        let xml = '<xml xmlns="https://developers.google.com/blockly/xml">\n';

        // 1. Render Imports
        if (programNode.imports) {
            for (const imp of programNode.imports) {
                if (imp.nodeType === ASTNodeType.IMPORT_FUNC) {
                    xml += `  <block type="spp_import_func" x="${this.currentX}" y="${this.currentY}">\n`;
                    xml += `    <field name="NAME">${this.escape(imp.name)}</field>\n`;
                    xml += `    <field name="MODULE">${this.escape(imp.module)}</field>\n`;
                    xml += `    <field name="ALIAS">${this.escape(imp.internalName)}</field>\n`;
                    xml += `    <field name="RETURN_TYPE">${imp.returnType || 'void'}</field>\n`;
                    if (imp.params && imp.params.length > 0) {
                        xml += `    <statement name="PARAMS">\n`;
                        xml += this.renderParamChain(imp.params, '      ');
                        xml += `    </statement>\n`;
                    }
                    xml += `  </block>\n`;
                    this.currentY += 140;
                } else if (imp.nodeType === ASTNodeType.IMPORT_GLOBAL) {
                    xml += `  <block type="spp_import_global" x="${this.currentX}" y="${this.currentY}">\n`;
                    xml += `    <field name="NAME">${this.escape(imp.name)}</field>\n`;
                    xml += `    <field name="MODULE">${this.escape(imp.module)}</field>\n`;
                    xml += `    <field name="ALIAS">${this.escape(imp.internalName)}</field>\n`;
                    xml += `    <field name="TYPE">${imp.type}</field>\n`;
                    xml += `    <field name="MUTABLE">${imp.mutable ? 'mut' : 'const'}</field>\n`;
                    xml += `  </block>\n`;
                    this.currentY += 100;
                }
            }
        }

        // 2. Render Tables
        if (programNode.tables) {
            for (const t of programNode.tables) {
                xml += `  <block type="spp_table_declare" x="${this.currentX}" y="${this.currentY}">\n`;
                xml += `    <field name="NAME">${this.escape(t.name)}</field>\n`;
                xml += `    <field name="TYPE">${t.type}</field>\n`;
                xml += `    <field name="MIN">${t.minSize || 0}</field>\n`;
                xml += `    <field name="MAX">${t.maxSize !== null && t.maxSize !== undefined ? t.maxSize : ''}</field>\n`;
                xml += `  </block>\n`;
                this.currentY += 100;
            }
        }

        // 3. Render Exports (if explicitly separate)
        if (programNode.exports) {
            for (const exp of programNode.exports) {
                xml += `  <block type="spp_export_decl" x="${this.currentX}" y="${this.currentY}">\n`;
                xml += `    <field name="KIND">${exp.kind}</field>\n`;
                xml += `    <field name="INTERNAL_NAME">${this.escape(exp.internalName)}</field>\n`;
                xml += `    <field name="EXPORT_NAME">${this.escape(exp.exportName)}</field>\n`;
                xml += `  </block>\n`;
                this.currentY += 90;
            }
        }

        // 4. Render Globals
        if (programNode.globals) {
            for (const g of programNode.globals) {
                xml += `  <block type="spp_global_declare" x="${this.currentX}" y="${this.currentY}">\n`;
                xml += `    <field name="NAME">${this.escape(g.name)}</field>\n`;
                xml += `    <field name="TYPE">${g.type}</field>\n`;
                xml += `    <field name="MUTABLE">${g.mutable ? 'mut' : 'const'}</field>\n`;
                if (g.initExpr) {
                    xml += `    <value name="INIT">\n${this.renderExpression(g.initExpr, '      ')}\n    </value>\n`;
                }
                xml += `  </block>\n`;
                this.currentY += 100;
            }
        }

        // 4. Render Functions
        if (programNode.functions) {
            for (const func of programNode.functions) {
                xml += `  <block type="spp_function_def" x="${this.currentX}" y="${this.currentY}">\n`;
                xml += `    <field name="NAME">${this.escape(func.name)}</field>\n`;
                xml += `    <field name="RETURN_TYPE">${func.returnType || 'void'}</field>\n`;
                if (func.params && func.params.length > 0) {
                    xml += `    <statement name="PARAMS">\n`;
                    xml += this.renderParamChain(func.params, '      ');
                    xml += `    </statement>\n`;
                }
                if (func.body && func.body.length > 0) {
                    xml += `    <statement name="BODY">\n`;
                    xml += this.renderStatementChain(func.body, '      ');
                    xml += `    </statement>\n`;
                }
                xml += `  </block>\n`;
                this.currentY += 280;
            }
        }

        // 5. Render Main Body (Start Hat)
        if (programNode.mainBody && programNode.mainBody.length > 0) {
            xml += `  <block type="spp_start" x="${this.currentX}" y="${this.currentY}">\n`;
            xml += `    <next>\n`;
            xml += this.renderStatementChain(programNode.mainBody, '      ');
            xml += `    </next>\n`;
            xml += `  </block>\n`;
        }

        xml += '</xml>';
        return xml;
    }

    renderParamChain(params, indent = '') {
        if (!params || params.length === 0) return '';
        const [first, ...rest] = params;
        let xml = `${indent}<block type="spp_param">\n${indent}  <field name="NAME">${this.escape(first.name)}</field>\n${indent}  <field name="TYPE">${first.type}</field>\n`;
        if (rest.length > 0) {
            xml += `${indent}  <next>\n${this.renderParamChain(rest, indent + '    ')}${indent}  </next>\n`;
        }
        xml += `${indent}</block>\n`;
        return xml;
    }

    renderStatementChain(statements, indent = '') {
        if (!statements || statements.length === 0) return '';
        const [first, ...rest] = statements;
        let xml = this.renderStatementBlock(first, indent);

        if (rest.length > 0) {
            xml = xml.replace(/<\/block>\n$/, `${indent}  <next>\n${this.renderStatementChain(rest, indent + '    ')}${indent}  </next>\n${indent}</block>\n`);
        }
        return xml;
    }

    renderStatementBlock(node, indent = '') {
        if (!node) return '';

        switch (node.nodeType) {
            case ASTNodeType.DECLARE_VAR:
                return `${indent}<block type="spp_declare">\n${indent}  <field name="TYPE">${node.type}</field>\n${indent}  <field name="NAME">${this.escape(node.name)}</field>\n${indent}  <value name="INIT">\n${this.renderExpression(node.initExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.GLOBAL_DECLARE:
                return `${indent}<block type="spp_global_declare">\n${indent}  <field name="TYPE">${node.type}</field>\n${indent}  <field name="NAME">${this.escape(node.name)}</field>\n${indent}  <field name="MUTABLE">${node.mutable ? 'mut' : 'const'}</field>\n${node.initExpr ? `${indent}  <value name="INIT">\n${this.renderExpression(node.initExpr, indent + '    ')}\n${indent}  </value>\n` : ''}${indent}</block>\n`;

            case ASTNodeType.SET_VAR:
                return `${indent}<block type="spp_set">\n${indent}  <field name="NAME">${this.escape(node.name)}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.valueExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.PRINT:
                return `${indent}<block type="spp_print">\n${indent}  <value name="VALUE">\n${this.renderExpression(node.expr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.RETURN:
                return `${indent}<block type="spp_return">\n${node.valueExpr ? `${indent}  <value name="VALUE">\n${this.renderExpression(node.valueExpr, indent + '    ')}\n${indent}  </value>\n` : ''}${indent}</block>\n`;

            case ASTNodeType.BLOCK: {
                let inner = `${indent}<block type="spp_block">\n`;
                if (node.label !== null && node.label !== undefined) {
                    inner += `${indent}  <field name="LABEL">${node.label}</field>\n`;
                }
                if (node.body && node.body.length > 0) {
                    inner += `${indent}  <statement name="BODY">\n${this.renderStatementChain(node.body, indent + '    ')}${indent}  </statement>\n`;
                }
                inner += `${indent}</block>\n`;
                return inner;
            }

            case ASTNodeType.LOOP: {
                let inner = `${indent}<block type="spp_loop">\n`;
                if (node.label !== null && node.label !== undefined) {
                    inner += `${indent}  <field name="LABEL">${node.label}</field>\n`;
                }
                if (node.body && node.body.length > 0) {
                    inner += `${indent}  <statement name="BODY">\n${this.renderStatementChain(node.body, indent + '    ')}${indent}  </statement>\n`;
                }
                inner += `${indent}</block>\n`;
                return inner;
            }

            case ASTNodeType.IF: {
                let inner = `${indent}<block type="spp_if">\n${indent}  <value name="COND">\n${this.renderExpression(node.condition, indent + '    ')}\n${indent}  </value>\n`;
                if (node.thenBranch && node.thenBranch.length > 0) {
                    inner += `${indent}  <statement name="THEN">\n${this.renderStatementChain(node.thenBranch, indent + '    ')}${indent}  </statement>\n`;
                }
                if (node.elseBranch && node.elseBranch.length > 0) {
                    inner += `${indent}  <statement name="ELSE">\n${this.renderStatementChain(node.elseBranch, indent + '    ')}${indent}  </statement>\n`;
                }
                inner += `${indent}</block>\n`;
                return inner;
            }

            case ASTNodeType.WHILE: {
                let inner = `${indent}<block type="spp_while">\n${indent}  <value name="COND">\n${this.renderExpression(node.condition, indent + '    ')}\n${indent}  </value>\n`;
                if (node.body && node.body.length > 0) {
                    inner += `${indent}  <statement name="DO">\n${this.renderStatementChain(node.body, indent + '    ')}${indent}  </statement>\n`;
                }
                inner += `${indent}</block>\n`;
                return inner;
            }

            case ASTNodeType.REPEAT: {
                let inner = `${indent}<block type="spp_repeat">\n${indent}  <value name="TIMES">\n${this.renderExpression(node.countExpr, indent + '    ')}\n${indent}  </value>\n`;
                if (node.body && node.body.length > 0) {
                    inner += `${indent}  <statement name="DO">\n${this.renderStatementChain(node.body, indent + '    ')}${indent}  </statement>\n`;
                }
                inner += `${indent}</block>\n`;
                return inner;
            }

            case ASTNodeType.CALL: {
                let xml = `${indent}<block type="spp_call_stmt">\n${indent}  <field name="NAME">${this.escape(node.funcName)}</field>\n`;
                if (node.args && node.args.length > 0) {
                    for (let i = 0; i < node.args.length; i++) {
                        xml += `${indent}  <value name="ARG${i}">\n${this.renderExpression(node.args[i], indent + '    ')}\n${indent}  </value>\n`;
                    }
                }
                xml += `${indent}</block>\n`;
                return xml;
            }

            case ASTNodeType.NOP:
                return `${indent}<block type="spp_nop"></block>\n`;

            case ASTNodeType.UNREACHABLE:
                return `${indent}<block type="spp_unreachable"></block>\n`;

            case ASTNodeType.DROP:
                return `${indent}<block type="spp_drop">\n${indent}  <value name="EXPR">\n${this.renderExpression(node.expr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.BR:
                return `${indent}<block type="spp_br">\n${indent}  <field name="DEPTH">${node.depth}</field>\n${indent}</block>\n`;

            case ASTNodeType.BR_IF:
                return `${indent}<block type="spp_br_if">\n${indent}  <field name="DEPTH">${node.depth}</field>\n${indent}  <value name="COND">\n${this.renderExpression(node.condition, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.BR_TABLE: {
                let xml = `${indent}<block type="spp_br_table">\n`;
                xml += `${indent}  <field name="TARGETS">${(node.targets || []).join(', ')}</field>\n`;
                xml += `${indent}  <field name="DEFAULT">${node.defaultTarget || 0}</field>\n`;
                if (node.indexExpr) {
                    xml += `${indent}  <value name="INDEX">\n${this.renderExpression(node.indexExpr, indent + '    ')}\n${indent}  </value>\n`;
                }
                xml += `${indent}</block>\n`;
                return xml;
            }

            case ASTNodeType.RETURN_CALL: {
                let xml = `${indent}<block type="spp_return_call">\n${indent}  <field name="NAME">${this.escape(node.funcName)}</field>\n`;
                if (node.args && node.args.length > 0) {
                    for (let i = 0; i < node.args.length; i++) {
                        xml += `${indent}  <value name="ARG${i}">\n${this.renderExpression(node.args[i], indent + '    ')}\n${indent}  </value>\n`;
                    }
                }
                xml += `${indent}</block>\n`;
                return xml;
            }

            case ASTNodeType.RETURN_CALL_INDIRECT: {
                let xml = `${indent}<block type="spp_return_call_indirect">\n`;
                xml += `${indent}  <field name="TABLE_IDX">${node.tableIndex || 0}</field>\n`;
                xml += `${indent}  <value name="FUNC_INDEX">\n${this.renderExpression(node.funcIndexExpr, indent + '    ')}\n${indent}  </value>\n`;
                if (node.args && node.args.length > 0) {
                    for (let i = 0; i < node.args.length; i++) {
                        xml += `${indent}  <value name="ARG${i}">\n${this.renderExpression(node.args[i], indent + '    ')}\n${indent}  </value>\n`;
                    }
                }
                xml += `${indent}</block>\n`;
                return xml;
            }

            case ASTNodeType.MEM_COPY:
                return `${indent}<block type="spp_mem_copy">\n${indent}  <value name="DST">\n${this.renderExpression(node.dstOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="SRC">\n${this.renderExpression(node.srcOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="LEN">\n${this.renderExpression(node.lenExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.MEM_FILL:
                return `${indent}<block type="spp_mem_fill">\n${indent}  <value name="DST">\n${this.renderExpression(node.dstOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="VAL">\n${this.renderExpression(node.valExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="LEN">\n${this.renderExpression(node.lenExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.MEM_INIT:
                return `${indent}<block type="spp_mem_init">\n${indent}  <field name="SEGMENT">${node.dataIndex}</field>\n${indent}  <value name="DST">\n${this.renderExpression(node.dstOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="SRC">\n${this.renderExpression(node.srcOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="LEN">\n${this.renderExpression(node.lenExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.DATA_DROP:
                return `${indent}<block type="spp_data_drop">\n${indent}  <field name="SEGMENT">${node.dataIndex}</field>\n${indent}</block>\n`;

            case ASTNodeType.TABLE_SET:
                return `${indent}<block type="spp_table_set">\n${indent}  <field name="TABLE_IDX">${node.tableIndex}</field>\n${indent}  <value name="INDEX">\n${this.renderExpression(node.offsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.valueExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.TABLE_FILL:
                return `${indent}<block type="spp_table_fill">\n${indent}  <field name="TABLE_IDX">${node.tableIndex}</field>\n${indent}  <value name="START">\n${this.renderExpression(node.offsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.valueExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="COUNT">\n${this.renderExpression(node.lenExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.TABLE_COPY:
                return `${indent}<block type="spp_table_copy">\n${indent}  <field name="DST_TABLE">${node.dstTableIndex}</field>\n${indent}  <field name="SRC_TABLE">${node.srcTableIndex}</field>\n${indent}  <value name="DST">\n${this.renderExpression(node.dstOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="SRC">\n${this.renderExpression(node.srcOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="COUNT">\n${this.renderExpression(node.lenExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.TABLE_INIT:
                return `${indent}<block type="spp_table_init">\n${indent}  <field name="TABLE_IDX">${node.tableIndex}</field>\n${indent}  <field name="ELEM_IDX">${node.elemIndex}</field>\n${indent}  <value name="DST">\n${this.renderExpression(node.dstOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="SRC">\n${this.renderExpression(node.srcOffsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="COUNT">\n${this.renderExpression(node.lenExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.ELEM_DROP:
                return `${indent}<block type="spp_elem_drop">\n${indent}  <field name="ELEM_IDX">${node.elemIndex}</field>\n${indent}</block>\n`;

            case ASTNodeType.V128_STORE:
                return `${indent}<block type="spp_v128_store">\n${indent}  <field name="STATIC_OFFSET">${node.staticOffset || 0}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.valueExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="OFFSET">\n${this.renderExpression(node.offsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            case ASTNodeType.MEM_STORE:
                return `${indent}<block type="spp_mem_store">\n${indent}  <field name="WIDTH">${node.width === 1 ? 'u8' : (node.width === 2 ? 'u16' : (node.width === 4 ? 'u32' : 'auto'))}</field>\n${indent}  <field name="STATIC_OFFSET">${node.staticOffset || 0}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.valueExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="BUFFER">\n${this.renderExpression(node.bufferExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="OFFSET">\n${this.renderExpression(node.offsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>\n`;

            default:
                return `${indent}<block type="spp_nop"></block>\n`;
        }
    }

    renderExpression(node, indent = '') {
        if (!node) return `${indent}<block type="spp_const_i32"><field name="VALUE">0</field></block>`;

        switch (node.nodeType) {
            case ASTNodeType.CONST:
                if (node.type === Type.I32) return `${indent}<block type="spp_const_i32"><field name="VALUE">${node.value}</field></block>`;
                if (node.type === Type.I64) return `${indent}<block type="spp_const_i64"><field name="VALUE">${node.value}</field></block>`;
                if (node.type === Type.F32) return `${indent}<block type="spp_const_f32"><field name="VALUE">${node.value}</field></block>`;
                if (node.type === Type.F64) return `${indent}<block type="spp_const_f64"><field name="VALUE">${node.value}</field></block>`;
                if (node.type === Type.BOOL) return `${indent}<block type="spp_const_bool"><field name="VALUE">${node.value ? 'true' : 'false'}</field></block>`;
                if (node.type === Type.V128) return `${indent}<block type="spp_v128_const"><field name="VALUE">00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00</field></block>`;
                if (node.type === Type.FUNCREF || node.type === Type.EXTERNREF) return `${indent}<block type="spp_ref_null"><field name="TYPE">${node.type}</field></block>`;
                return `${indent}<block type="spp_const_i32"><field name="VALUE">0</field></block>`;

            case ASTNodeType.STRING_LITERAL:
                return `${indent}<block type="spp_const_text"><field name="VALUE">${this.escape(node.value)}</field></block>`;

            case ASTNodeType.GET_VAR:
                return `${indent}<block type="spp_get"><field name="NAME">${this.escape(node.name)}</field></block>`;

            case ASTNodeType.TEE_VAR:
                return `${indent}<block type="spp_tee">\n${indent}  <field name="NAME">${this.escape(node.name)}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.valueExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.SELECT: {
                let xml = `${indent}<block type="spp_select">\n`;
                xml += `${indent}  <value name="COND">\n${this.renderExpression(node.condition, indent + '    ')}\n${indent}  </value>\n`;
                xml += `${indent}  <value name="TRUE_VAL">\n${this.renderExpression(node.trueExpr, indent + '    ')}\n${indent}  </value>\n`;
                xml += `${indent}  <value name="FALSE_VAL">\n${this.renderExpression(node.falseExpr, indent + '    ')}\n${indent}  </value>\n`;
                xml += `${indent}</block>`;
                return xml;
            }

            case ASTNodeType.BINARY_OP:
                return `${indent}<block type="spp_binary_op">\n${indent}  <field name="OP">${this.escape(node.op)}</field>\n${indent}  <field name="SIGNEDNESS">${node.signedness || 'signed'}</field>\n${indent}  <value name="LEFT">\n${this.renderExpression(node.left, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="RIGHT">\n${this.renderExpression(node.right, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.UNARY_OP:
                return `${indent}<block type="spp_unary_op">\n${indent}  <field name="OP">${this.escape(node.op)}</field>\n${indent}  <value name="EXPR">\n${this.renderExpression(node.expr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.CONVERT:
                return `${indent}<block type="spp_convert">\n${indent}  <field name="TARGET_TYPE">${node.targetType}</field>\n${indent}  <field name="SIGNEDNESS">${node.signedness || 'signed'}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.expr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.REINTERPRET:
                return `${indent}<block type="spp_reinterpret">\n${indent}  <field name="TARGET_TYPE">${node.targetType}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.expr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.CALL: {
                let xml = `${indent}<block type="spp_call_expr">\n${indent}  <field name="NAME">${this.escape(node.funcName)}</field>\n`;
                if (node.args && node.args.length > 0) {
                    for (let i = 0; i < node.args.length; i++) {
                        xml += `${indent}  <value name="ARG${i}">\n${this.renderExpression(node.args[i], indent + '    ')}\n${indent}  </value>\n`;
                    }
                }
                xml += `${indent}</block>`;
                return xml;
            }

            case ASTNodeType.CALL_INDIRECT: {
                let xml = `${indent}<block type="spp_call_indirect">\n`;
                xml += `${indent}  <field name="RETURN_TYPE">${node.returnType || 'i32'}</field>\n`;
                xml += `${indent}  <field name="PARAM_TYPES">${(node.paramTypes || []).join(', ')}</field>\n`;
                xml += `${indent}  <value name="FUNC_INDEX">\n${this.renderExpression(node.funcIndexExpr, indent + '    ')}\n${indent}  </value>\n`;
                if (node.args && node.args.length > 0) {
                    for (let i = 0; i < node.args.length; i++) {
                        xml += `${indent}  <value name="ARG${i}">\n${this.renderExpression(node.args[i], indent + '    ')}\n${indent}  </value>\n`;
                    }
                }
                xml += `${indent}</block>`;
                return xml;
            }

            case ASTNodeType.MEM_LOAD:
                return `${indent}<block type="spp_mem_load">\n${indent}  <field name="WIDTH_TYPE">${node.type}</field>\n${indent}  <field name="STATIC_OFFSET">${node.staticOffset || 0}</field>\n${indent}  <value name="BUFFER">\n${this.renderExpression(node.bufferExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="OFFSET">\n${this.renderExpression(node.offsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.MEM_GROW:
                return `${indent}<block type="spp_mem_grow">\n${indent}  <value name="PAGES">\n${this.renderExpression(node.pagesExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.MEM_SIZE:
                return `${indent}<block type="spp_mem_size"></block>`;

            case ASTNodeType.STRING_CONCAT:
                return `${indent}<block type="spp_string_concat">\n${indent}  <value name="LEFT">\n${this.renderExpression(node.left, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="RIGHT">\n${this.renderExpression(node.right, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.SIGN_EXTEND:
                return `${indent}<block type="spp_sign_extend">\n${indent}  <field name="FROM_BITS">${node.fromBits}</field>\n${indent}  <field name="TYPE">${node.type}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.expr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.TRUNC_SAT:
                return `${indent}<block type="spp_trunc_sat">\n${indent}  <field name="FROM_TYPE">${node.fromType}</field>\n${indent}  <field name="TO_TYPE">${node.toType}</field>\n${indent}  <field name="SIGNEDNESS">${node.isSigned ? 'signed' : 'unsigned'}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.expr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.REF_NULL:
                return `${indent}<block type="spp_ref_null"><field name="TYPE">${node.type}</field></block>`;

            case ASTNodeType.REF_IS_NULL:
                return `${indent}<block type="spp_ref_is_null">\n${indent}  <value name="REF">\n${this.renderExpression(node.refExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.REF_FUNC:
                return `${indent}<block type="spp_ref_func"><field name="NAME">${this.escape(node.funcName)}</field></block>`;

            case ASTNodeType.TABLE_GET:
                return `${indent}<block type="spp_table_get">\n${indent}  <field name="TABLE_IDX">${node.tableIndex}</field>\n${indent}  <value name="INDEX">\n${this.renderExpression(node.offsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.TABLE_SIZE:
                return `${indent}<block type="spp_table_size"><field name="TABLE_IDX">${node.tableIndex}</field></block>`;

            case ASTNodeType.TABLE_GROW:
                return `${indent}<block type="spp_table_grow">\n${indent}  <field name="TABLE_IDX">${node.tableIndex}</field>\n${indent}  <value name="INIT_VAL">\n${this.renderExpression(node.initExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="DELTA">\n${this.renderExpression(node.deltaExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.V128_CONST: {
                const hex = Array.from(node.bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
                return `${indent}<block type="spp_v128_const"><field name="VALUE">${hex}</field></block>`;
            }

            case ASTNodeType.V128_SPLAT:
                return `${indent}<block type="spp_v128_splat">\n${indent}  <field name="LANE_TYPE">${node.laneType}</field>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.valExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.V128_EXTRACT_LANE:
                return `${indent}<block type="spp_v128_extract_lane">\n${indent}  <field name="LANE_TYPE">${node.laneType}</field>\n${indent}  <field name="LANE_IDX">${node.laneIndex}</field>\n${indent}  <value name="VECTOR">\n${this.renderExpression(node.vecExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.V128_REPLACE_LANE:
                return `${indent}<block type="spp_v128_replace_lane">\n${indent}  <field name="LANE_TYPE">${node.laneType}</field>\n${indent}  <field name="LANE_IDX">${node.laneIndex}</field>\n${indent}  <value name="VECTOR">\n${this.renderExpression(node.vecExpr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="VALUE">\n${this.renderExpression(node.valExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.V128_OP:
                return `${indent}<block type="spp_v128_binop">\n${indent}  <field name="OP">${this.escape(node.op)}</field>\n${indent}  <value name="LEFT">\n${this.renderExpression(node.operands[0], indent + '    ')}\n${indent}  </value>\n${indent}  <value name="RIGHT">\n${this.renderExpression(node.operands[1], indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.V128_BITSELECT:
                return `${indent}<block type="spp_v128_bitselect">\n${indent}  <value name="V1">\n${this.renderExpression(node.v1Expr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="V2">\n${this.renderExpression(node.v2Expr, indent + '    ')}\n${indent}  </value>\n${indent}  <value name="MASK">\n${this.renderExpression(node.maskExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            case ASTNodeType.V128_LOAD:
                return `${indent}<block type="spp_v128_load">\n${indent}  <field name="STATIC_OFFSET">${node.staticOffset || 0}</field>\n${indent}  <value name="OFFSET">\n${this.renderExpression(node.offsetExpr, indent + '    ')}\n${indent}  </value>\n${indent}</block>`;

            default:
                return `${indent}<block type="spp_const_i32"><field name="VALUE">0</field></block>`;
        }
    }

    escape(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
