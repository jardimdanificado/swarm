/**
 * Scratch++ AST Generator for Blockly
 * 100% Coverage of WebAssembly 1.0 AST Generation (Typed & Generic Blocks)
 */

import { Type } from '../../src/compiler/types.js';
import {
    ProgramNode,
    ImportFuncNode,
    ImportGlobalNode,
    ExportNode,
    StartFuncNode,
    FunctionNode,
    GlobalDeclareNode,
    TableDeclareNode,
    DeclareVarNode,
    SetVarNode,
    TeeVarNode,
    GetVarNode,
    ConstNode,
    BinaryOpNode,
    UnaryOpNode,
    SignExtendNode,
    TruncSatNode,
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
    UnreachableNode,
    CallNode,
    CallIndirectNode,
    ReturnCallNode,
    ReturnCallIndirectNode,
    AllocBufferNode,
    MemLoadNode,
    MemStoreNode,
    MemGrowNode,
    MemSizeNode,
    MemCopyNode,
    MemFillNode,
    MemInitNode,
    DataDropNode,
    RefNullNode,
    RefIsNullNode,
    RefFuncNode,
    TableGetNode,
    TableSetNode,
    TableSizeNode,
    TableGrowNode,
    TableFillNode,
    InlineWatNode,
    TableCopyNode,
    TableInitNode,
    ElemDropNode,
    V128ConstNode,
    V128SplatNode,
    V128ExtractLaneNode,
    V128ReplaceLaneNode,
    V128OpNode,
    V128BitSelectNode,
    V128LoadNode,
    V128StoreNode,
    StringLiteralNode,
    StringConcatNode,
    PrintNode
} from '../../src/compiler/ast.js';

export class ASTGenerator {
    constructor(workspace) {
        this.workspace = workspace;
    }

    generate() {
        const topBlocks = this.workspace.getTopBlocks(true);
        const functions = [];
        const globals = [];
        const tables = [];
        const imports = [];
        const exports = [];
        let startFunc = null;
        let mainBody = [];

        for (const block of topBlocks) {
            if (block.type === 'spp_start') {
                const firstChild = block.getNextBlock();
                if (firstChild) {
                    mainBody = mainBody.concat(this.parseStatementList(firstChild));
                }
            } else if (block.type === 'spp_import_func') {
                const imp = this.parseImportFunc(block);
                if (imp) imports.push(imp);
            } else if (block.type === 'spp_import_global') {
                const impG = this.parseImportGlobal(block);
                if (impG) imports.push(impG);
            } else if (block.type === 'spp_export_decl') {
                const exp = this.parseExport(block);
                if (exp) exports.push(exp);
            } else if (block.type === 'spp_start_func') {
                startFunc = block.getFieldValue('FUNC_NAME');
            } else if (block.type === 'spp_table_declare') {
                const name = block.getFieldValue('NAME') || `table_${tables.length}`;
                const type = block.getFieldValue('TYPE') || Type.FUNCREF;
                const min = Number(block.getFieldValue('MIN') || 0);
                const maxRaw = block.getFieldValue('MAX');
                const max = (maxRaw !== null && maxRaw !== undefined && maxRaw !== '' && !isNaN(Number(maxRaw))) ? Number(maxRaw) : null;
                tables.push(new TableDeclareNode(name, type, min, max));
            } else if (block.type === 'spp_function_def') {
                const funcNode = this.parseFunctionDef(block);
                if (funcNode) functions.push(funcNode);
            } else if (block.type === 'spp_global_declare' || block.type.startsWith('spp_global_')) {
                const gNode = this.parseGlobalDeclare(block);
                if (gNode) globals.push(gNode);
            } else if (block.type === 'spp_declare' || block.type.startsWith('spp_declare_')) {
                const declNode = this.parseDeclare(block, true);
                if (declNode) globals.push(declNode);
            }
        }

        return new ProgramNode(functions, globals, mainBody, imports, exports, startFunc, tables);
    }

    parseImportFunc(block) {
        const name = block.getFieldValue('NAME') || 'func';
        const module = block.getFieldValue('MODULE') || 'env';
        const alias = block.getFieldValue('ALIAS') || name;
        const returnType = block.getFieldValue('RETURN_TYPE') || Type.VOID;

        const params = [];
        let paramBlock = block.getInputTargetBlock('PARAMS');
        while (paramBlock) {
            if (paramBlock.type === 'spp_param') {
                const pName = paramBlock.getFieldValue('NAME') || `p${params.length}`;
                const pType = paramBlock.getFieldValue('TYPE') || Type.I32;
                params.push({ name: pName, type: pType });
            } else if (paramBlock.type.startsWith('spp_param_')) {
                const pName = paramBlock.getFieldValue('NAME') || `p${params.length}`;
                const pType = paramBlock.type.replace('spp_param_', '');
                params.push({ name: pName, type: pType === 'func' ? Type.FUNCAO : pType });
            }
            paramBlock = paramBlock.getNextBlock();
        }

        if (params.length === 0) {
            const paramsRaw = block.getFieldValue('PARAMS') || '';
            if (paramsRaw.trim()) {
                const parts = paramsRaw.split(',');
                for (const part of parts) {
                    const [pName, pType] = part.split(':').map(s => s.trim());
                    if (pName && pType) {
                        params.push({ name: pName, type: pType });
                    }
                }
            }
        }

        return new ImportFuncNode(module, name, alias, params, returnType);
    }

    parseImportGlobal(block) {
        const name = block.getFieldValue('NAME') || 'g';
        const module = block.getFieldValue('MODULE') || 'env';
        const alias = block.getFieldValue('ALIAS') || name;
        const type = block.getFieldValue('TYPE') || Type.I32;
        const mutable = block.getFieldValue('MUTABLE') === 'mut';
        return new ImportGlobalNode(module, name, alias, type, mutable);
    }

    parseExport(block) {
        const kind = block.getFieldValue('KIND') || 'func';
        const internalName = block.getFieldValue('INTERNAL_NAME') || '';
        const exportName = block.getFieldValue('EXPORT_NAME') || internalName;
        return new ExportNode(kind, internalName, exportName);
    }

    parseFunctionDef(block) {
        const name = block.getFieldValue('NAME') || 'funcao';
        const returnType = block.getFieldValue('RETURN_TYPE') || Type.VOID;

        const params = [];
        let paramBlock = block.getInputTargetBlock('PARAMS');
        while (paramBlock) {
            if (paramBlock.type === 'spp_param') {
                const pName = paramBlock.getFieldValue('NAME') || `p${params.length}`;
                const pType = paramBlock.getFieldValue('TYPE') || Type.I32;
                params.push({ name: pName, type: pType });
            } else if (paramBlock.type.startsWith('spp_param_')) {
                const pName = paramBlock.getFieldValue('NAME') || `p${params.length}`;
                const pType = paramBlock.type.replace('spp_param_', '');
                params.push({ name: pName, type: pType === 'func' ? Type.FUNCAO : pType });
            }
            paramBlock = paramBlock.getNextBlock();
        }

        if (params.length === 0) {
            const paramsRaw = block.getFieldValue('PARAMS') || '';
            if (paramsRaw.trim()) {
                const parts = paramsRaw.split(',');
                for (const part of parts) {
                    const [pName, pType] = part.split(':').map(s => s.trim());
                    if (pName && pType) {
                        params.push({ name: pName, type: pType });
                    }
                }
            }
        }

        const bodyBlock = block.getInputTargetBlock('BODY');
        const body = bodyBlock ? this.parseStatementList(bodyBlock) : [];

        return new FunctionNode(name, params, returnType, body, true);
    }

    parseGlobalDeclare(block) {
        let type = Type.I32;
        if (block.type === 'spp_global_declare') {
            type = block.getFieldValue('TYPE') || Type.I32;
        } else if (block.type.startsWith('spp_global_')) {
            type = block.type.replace('spp_global_', '');
        }

        const name = block.getFieldValue('NAME') || 'g';
        const mutable = block.getFieldValue('MUTABLE') === 'mut';
        const initBlock = block.getInputTargetBlock('INIT');
        let initExpr;
        if (initBlock) {
            initExpr = this.parseExpression(initBlock);
        } else {
            if (type === Type.V128) initExpr = new V128ConstNode(new Uint8Array(16));
            else if (type === Type.FUNCREF || type === Type.EXTERNREF) initExpr = new RefNullNode(type);
            else initExpr = new ConstNode(0, type);
        }
        return new GlobalDeclareNode(name, type, mutable, initExpr);
    }

    parseStatementList(startBlock) {
        const statements = [];
        let current = startBlock;

        while (current) {
            const stmtNode = this.parseStatement(current);
            if (stmtNode) {
                statements.push(stmtNode);
            }
            current = current.getNextBlock();
        }

        return statements;
    }

    parseStatement(block) {
        if (!block) return null;

        if (block.type === 'spp_declare' || block.type.startsWith('spp_declare_')) {
            return this.parseDeclare(block, false);
        }

        if (block.type === 'spp_global_declare' || block.type.startsWith('spp_global_')) {
            return this.parseGlobalDeclare(block);
        }

        switch (block.type) {
            case 'spp_set': {
                const name = block.getFieldValue('NAME') || 'x';
                const valBlock = block.getInputTargetBlock('VALUE');
                const valExpr = valBlock ? this.parseExpression(valBlock) : new ConstNode(0, Type.I32);
                return new SetVarNode(name, valExpr);
            }

            case 'spp_block': {
                const label = Number(block.getFieldValue('LABEL') || 0);
                const bodyBlock = block.getInputTargetBlock('BODY');
                const body = bodyBlock ? this.parseStatementList(bodyBlock) : [];
                return new BlockNode(label, body);
            }

            case 'spp_loop': {
                const label = Number(block.getFieldValue('LABEL') || 0);
                const bodyBlock = block.getInputTargetBlock('BODY');
                const body = bodyBlock ? this.parseStatementList(bodyBlock) : [];
                return new LoopNode(label, body);
            }

            case 'spp_repeat': {
                const countBlock = block.getInputTargetBlock('TIMES');
                const countExpr = countBlock ? this.parseExpression(countBlock) : new ConstNode(1, Type.I32);
                const doBlock = block.getInputTargetBlock('DO');
                const body = doBlock ? this.parseStatementList(doBlock) : [];
                return new RepeatNode(countExpr, body);
            }

            case 'spp_while': {
                const condBlock = block.getInputTargetBlock('COND');
                const condExpr = condBlock ? this.parseExpression(condBlock) : new ConstNode(true, Type.BOOL);
                const doBlock = block.getInputTargetBlock('DO');
                const body = doBlock ? this.parseStatementList(doBlock) : [];
                return new WhileNode(condExpr, body);
            }

            case 'spp_if': {
                const condBlock = block.getInputTargetBlock('COND');
                const condExpr = condBlock ? this.parseExpression(condBlock) : new ConstNode(true, Type.BOOL);
                const thenBlock = block.getInputTargetBlock('THEN');
                const elseBlock = block.getInputTargetBlock('ELSE');
                const thenBranch = thenBlock ? this.parseStatementList(thenBlock) : [];
                const elseBranch = elseBlock ? this.parseStatementList(elseBlock) : [];
                return new IfNode(condExpr, thenBranch, elseBranch);
            }

            case 'spp_br': {
                const depth = Number(block.getFieldValue('DEPTH') || 0);
                return new BrNode(depth);
            }

            case 'spp_br_if': {
                const depth = Number(block.getFieldValue('DEPTH') || 0);
                const condBlock = block.getInputTargetBlock('COND');
                const condExpr = condBlock ? this.parseExpression(condBlock) : new ConstNode(true, Type.BOOL);
                return new BrIfNode(condExpr, depth);
            }

            case 'spp_br_table': {
                const targetsStr = block.getFieldValue('TARGETS') || '0';
                const targets = targetsStr.split(',').map(s => Number(s.trim()) || 0);
                const defTarget = Number(block.getFieldValue('DEFAULT') || 0);
                const idxBlock = block.getInputTargetBlock('INDEX');
                const idxExpr = idxBlock ? this.parseExpression(idxBlock) : new ConstNode(0, Type.I32);
                return new BrTableNode(idxExpr, targets, defTarget);
            }

            case 'spp_return': {
                const valBlock = block.getInputTargetBlock('VALUE');
                const valExpr = valBlock ? this.parseExpression(valBlock) : null;
                return new ReturnNode(valExpr);
            }

            case 'spp_drop': {
                const exprBlock = block.getInputTargetBlock('EXPR');
                const expr = exprBlock ? this.parseExpression(exprBlock) : new ConstNode(0, Type.I32);
                return new DropNode(expr);
            }

            case 'spp_nop':
                return new NopNode();

            case 'spp_unreachable':
                return new UnreachableNode();

            case 'spp_print': {
                const valBlock = block.getInputTargetBlock('VALUE');
                const valExpr = valBlock ? this.parseExpression(valBlock) : new StringLiteralNode('');
                return new PrintNode(valExpr);
            }

            case 'spp_inline_wat': {
                const code = block.getFieldValue('CODE') || 'nop';
                const type = block.getFieldValue('TYPE') || 'void';
                return new InlineWatNode(code, type);
            }

            case 'spp_i32_store':
            case 'spp_i64_store':
            case 'spp_f32_store':
            case 'spp_f64_store':
            case 'spp_mem_store': {
                const widthStr = block.getFieldValue('WIDTH');
                const width = widthStr === 'u8' ? 1 : (widthStr === 'u16' ? 2 : (widthStr === 'u32' ? 4 : null));
                const staticOffset = Number(block.getFieldValue('STATIC_OFFSET') || 0);
                const valBlock = block.getInputTargetBlock('VALUE');
                const valExpr = valBlock ? this.parseExpression(valBlock) : new ConstNode(0, Type.I32);
                const bufBlock = block.getInputTargetBlock('BUFFER');
                const bufExpr = bufBlock ? this.parseExpression(bufBlock) : new ConstNode(0, Type.I32);
                const offBlock = block.getInputTargetBlock('OFFSET');
                const offExpr = offBlock ? this.parseExpression(offBlock) : new ConstNode(0, Type.I32);
                return new MemStoreNode(bufExpr, offExpr, valExpr, width, staticOffset, 0);
            }

            case 'spp_return_call': {
                const name = block.getFieldValue('NAME');
                const args = [];
                for (let i = 0; i < 16; i++) {
                    const argBlock = block.getInputTargetBlock(`ARG${i}`);
                    if (argBlock) args.push(this.parseExpression(argBlock));
                }
                return new ReturnCallNode(name, args);
            }

            case 'spp_return_call_indirect': {
                const tableIdx = Number(block.getFieldValue('TABLE_IDX') || 0);
                const funcBlock = block.getInputTargetBlock('FUNC_INDEX');
                const funcExpr = funcBlock ? this.parseExpression(funcBlock) : new ConstNode(0, Type.I32);
                const args = [];
                for (let i = 0; i < 16; i++) {
                    const argBlock = block.getInputTargetBlock(`ARG${i}`);
                    if (argBlock) args.push(this.parseExpression(argBlock));
                }
                return new ReturnCallIndirectNode(Type.VOID, [], funcExpr, args, tableIdx);
            }

            case 'spp_mem_copy': {
                const dstBlock = block.getInputTargetBlock('DST');
                const srcBlock = block.getInputTargetBlock('SRC');
                const lenBlock = block.getInputTargetBlock('LEN');
                const dst = dstBlock ? this.parseExpression(dstBlock) : new ConstNode(0, Type.I32);
                const src = srcBlock ? this.parseExpression(srcBlock) : new ConstNode(0, Type.I32);
                const len = lenBlock ? this.parseExpression(lenBlock) : new ConstNode(0, Type.I32);
                return new MemCopyNode(dst, src, len);
            }

            case 'spp_mem_fill': {
                const dstBlock = block.getInputTargetBlock('DST');
                const valBlock = block.getInputTargetBlock('VAL');
                const lenBlock = block.getInputTargetBlock('LEN');
                const dst = dstBlock ? this.parseExpression(dstBlock) : new ConstNode(0, Type.I32);
                const val = valBlock ? this.parseExpression(valBlock) : new ConstNode(0, Type.I32);
                const len = lenBlock ? this.parseExpression(lenBlock) : new ConstNode(0, Type.I32);
                return new MemFillNode(dst, val, len);
            }

            case 'spp_mem_init': {
                const segment = Number(block.getFieldValue('SEGMENT') || 0);
                const dstBlock = block.getInputTargetBlock('DST');
                const srcBlock = block.getInputTargetBlock('SRC');
                const lenBlock = block.getInputTargetBlock('LEN');
                const dst = dstBlock ? this.parseExpression(dstBlock) : new ConstNode(0, Type.I32);
                const src = srcBlock ? this.parseExpression(srcBlock) : new ConstNode(0, Type.I32);
                const len = lenBlock ? this.parseExpression(lenBlock) : new ConstNode(0, Type.I32);
                return new MemInitNode(segment, dst, src, len);
            }

            case 'spp_data_drop': {
                const segment = Number(block.getFieldValue('SEGMENT') || 0);
                return new DataDropNode(segment);
            }

            case 'spp_table_set': {
                const tableIdx = Number(block.getFieldValue('TABLE_IDX') || 0);
                const idxBlock = block.getInputTargetBlock('INDEX');
                const valBlock = block.getInputTargetBlock('VALUE');
                const idx = idxBlock ? this.parseExpression(idxBlock) : new ConstNode(0, Type.I32);
                const val = valBlock ? this.parseExpression(valBlock) : new RefNullNode(Type.FUNCREF);
                return new TableSetNode(tableIdx, idx, val);
            }

            case 'spp_table_fill': {
                const tableIdx = Number(block.getFieldValue('TABLE_IDX') || 0);
                const startBlock = block.getInputTargetBlock('START');
                const valBlock = block.getInputTargetBlock('VALUE');
                const cntBlock = block.getInputTargetBlock('COUNT');
                const start = startBlock ? this.parseExpression(startBlock) : new ConstNode(0, Type.I32);
                const val = valBlock ? this.parseExpression(valBlock) : new RefNullNode(Type.FUNCREF);
                const cnt = cntBlock ? this.parseExpression(cntBlock) : new ConstNode(0, Type.I32);
                return new TableFillNode(tableIdx, start, val, cnt);
            }

            case 'spp_table_copy': {
                const dstT = Number(block.getFieldValue('DST_TABLE') || 0);
                const srcT = Number(block.getFieldValue('SRC_TABLE') || 0);
                const dstBlock = block.getInputTargetBlock('DST');
                const srcBlock = block.getInputTargetBlock('SRC');
                const cntBlock = block.getInputTargetBlock('COUNT');
                const dst = dstBlock ? this.parseExpression(dstBlock) : new ConstNode(0, Type.I32);
                const src = srcBlock ? this.parseExpression(srcBlock) : new ConstNode(0, Type.I32);
                const cnt = cntBlock ? this.parseExpression(cntBlock) : new ConstNode(0, Type.I32);
                return new TableCopyNode(dstT, srcT, dst, src, cnt);
            }

            case 'spp_table_init': {
                const tableIdx = Number(block.getFieldValue('TABLE_IDX') || 0);
                const elemIdx = Number(block.getFieldValue('ELEM_IDX') || 0);
                const dstBlock = block.getInputTargetBlock('DST');
                const srcBlock = block.getInputTargetBlock('SRC');
                const cntBlock = block.getInputTargetBlock('COUNT');
                const dst = dstBlock ? this.parseExpression(dstBlock) : new ConstNode(0, Type.I32);
                const src = srcBlock ? this.parseExpression(srcBlock) : new ConstNode(0, Type.I32);
                const cnt = cntBlock ? this.parseExpression(cntBlock) : new ConstNode(0, Type.I32);
                return new TableInitNode(tableIdx, elemIdx, dst, src, cnt);
            }

            case 'spp_elem_drop': {
                const elemIdx = Number(block.getFieldValue('ELEM_IDX') || 0);
                return new ElemDropNode(elemIdx);
            }

            case 'spp_v128_store': {
                const staticOffset = Number(block.getFieldValue('STATIC_OFFSET') || 0);
                const valBlock = block.getInputTargetBlock('VALUE');
                const offBlock = block.getInputTargetBlock('OFFSET');
                const val = valBlock ? this.parseExpression(valBlock) : new V128ConstNode(new Uint8Array(16));
                const off = offBlock ? this.parseExpression(offBlock) : new ConstNode(0, Type.I32);
                return new V128StoreNode(off, val, staticOffset);
            }

            case 'spp_call_stmt': {
                const name = block.getFieldValue('NAME');
                const args = [];
                for (let i = 0; i < 16; i++) {
                    const argBlock = block.getInputTargetBlock(`ARG${i}`);
                    if (argBlock) args.push(this.parseExpression(argBlock));
                }
                return new CallNode(name, args);
            }

            default:
                return null;
        }
    }

    parseDeclare(block, isGlobal = false) {
        let type = Type.I32;
        if (block.type === 'spp_declare') {
            type = block.getFieldValue('TYPE') || Type.I32;
        } else if (block.type.startsWith('spp_declare_')) {
            type = block.type.replace('spp_declare_', '');
        }

        const name = block.getFieldValue('NAME') || 'x';
        const initBlock = block.getInputTargetBlock('INIT');
        let initExpr;
        if (initBlock) {
            initExpr = this.parseExpression(initBlock);
        } else {
            if (type === Type.V128) initExpr = new V128ConstNode(new Uint8Array(16));
            else if (type === Type.FUNCREF || type === Type.EXTERNREF) initExpr = new RefNullNode(type);
            else initExpr = new ConstNode(0, type);
        }
        return new DeclareVarNode(name, type, initExpr, isGlobal);
    }

    parseExpression(block) {
        if (!block) return new ConstNode(0, Type.I32);

        switch (block.type) {
            case 'spp_const_i32':
                return new ConstNode(Number(block.getFieldValue('VALUE') || 0), Type.I32);

            case 'spp_const_i64':
                return new ConstNode(BigInt(block.getFieldValue('VALUE') || 0), Type.I64);

            case 'spp_const_f32':
                return new ConstNode(Number(block.getFieldValue('VALUE') || 0.0), Type.F32);

            case 'spp_const_f64':
                return new ConstNode(Number(block.getFieldValue('VALUE') || 0.0), Type.F64);

            case 'spp_const_bool':
                return new ConstNode(block.getFieldValue('VALUE') === 'true', Type.BOOL);

            case 'spp_const_text':
                return new StringLiteralNode(block.getFieldValue('VALUE') || '');

            case 'spp_get':
            case 'spp_get_i32':
            case 'spp_get_i64':
            case 'spp_get_f32':
            case 'spp_get_f64':
            case 'spp_get_bool':
                return new GetVarNode(block.getFieldValue('NAME') || 'x');

            case 'spp_tee': {
                const name = block.getFieldValue('NAME') || 'x';
                const valBlock = block.getInputTargetBlock('VALUE');
                const valExpr = valBlock ? this.parseExpression(valBlock) : new ConstNode(0, Type.I32);
                return new TeeVarNode(name, valExpr);
            }

            case 'spp_select': {
                const condBlock = block.getInputTargetBlock('COND');
                const tBlock = block.getInputTargetBlock('TRUE_VAL');
                const fBlock = block.getInputTargetBlock('FALSE_VAL');
                const cond = condBlock ? this.parseExpression(condBlock) : new ConstNode(true, Type.BOOL);
                const trueExpr = tBlock ? this.parseExpression(tBlock) : new ConstNode(1, Type.I32);
                const falseExpr = fBlock ? this.parseExpression(fBlock) : new ConstNode(0, Type.I32);
                return new SelectNode(cond, trueExpr, falseExpr);
            }

            case 'spp_i32_binop':
            case 'spp_i64_binop':
            case 'spp_f32_binop':
            case 'spp_f64_binop':
            case 'spp_binary_op': {
                let op = block.getFieldValue('OP') || '+';
                let signedness = block.getFieldValue('SIGNEDNESS') || 'signed';
                if (op === '/u' || op === '%u' || op === '>>u') {
                    signedness = 'unsigned';
                    if (op === '/u') op = '/';
                    if (op === '%u') op = '%';
                    if (op === '>>u') op = '>>';
                }
                const lBlock = block.getInputTargetBlock('LEFT');
                const rBlock = block.getInputTargetBlock('RIGHT');
                const lExpr = lBlock ? this.parseExpression(lBlock) : new ConstNode(0, Type.I32);
                const rExpr = rBlock ? this.parseExpression(rBlock) : new ConstNode(0, Type.I32);
                return new BinaryOpNode(op, lExpr, rExpr, signedness);
            }

            case 'spp_i32_relop':
            case 'spp_i64_relop':
            case 'spp_f32_relop':
            case 'spp_f64_relop': {
                let op = block.getFieldValue('OP') || '==';
                let signedness = 'signed';
                if (op.endsWith('u')) {
                    signedness = 'unsigned';
                    op = op.slice(0, -1);
                }
                const lBlock = block.getInputTargetBlock('LEFT');
                const rBlock = block.getInputTargetBlock('RIGHT');
                const lExpr = lBlock ? this.parseExpression(lBlock) : new ConstNode(0, Type.I32);
                const rExpr = rBlock ? this.parseExpression(rBlock) : new ConstNode(0, Type.I32);
                return new BinaryOpNode(op, lExpr, rExpr, signedness);
            }

            case 'spp_i32_unop':
            case 'spp_i64_unop':
            case 'spp_f32_unop':
            case 'spp_f64_unop':
            case 'spp_unary_op': {
                const op = block.getFieldValue('OP') || 'NEG';
                const eBlock = block.getInputTargetBlock('EXPR');
                const expr = eBlock ? this.parseExpression(eBlock) : new ConstNode(0, Type.I32);
                return new UnaryOpNode(op, expr);
            }

            case 'spp_f32_convert_i32':
            case 'spp_f64_convert_i32':
            case 'spp_f64_convert_i64':
            case 'spp_i32_trunc_f32':
            case 'spp_i32_trunc_f64':
            case 'spp_i64_trunc_f32':
            case 'spp_i64_trunc_f64':
            case 'spp_f64_promote_f32':
            case 'spp_f32_demote_f64':
            case 'spp_i64_extend_i32':
            case 'spp_i32_wrap_i64': {
                let targetType = Type.I32;
                if (block.type.startsWith('spp_f32_')) targetType = Type.F32;
                else if (block.type.startsWith('spp_f64_')) targetType = Type.F64;
                else if (block.type.startsWith('spp_i64_')) targetType = Type.I64;
                else if (block.type.startsWith('spp_i32_')) targetType = Type.I32;

                const signedness = block.getFieldValue('SIGNEDNESS') || 'signed';
                const vBlock = block.getInputTargetBlock('VALUE');
                const valExpr = vBlock ? this.parseExpression(vBlock) : new ConstNode(0, Type.I32);
                return new ConvertNode(valExpr, targetType, true, signedness);
            }

            case 'spp_reinterpret_f32_as_i32':
            case 'spp_reinterpret_i32_as_f32':
            case 'spp_reinterpret_f64_as_i64':
            case 'spp_reinterpret_i64_as_f64': {
                let targetType = Type.I32;
                if (block.type === 'spp_reinterpret_i32_as_f32') targetType = Type.F32;
                else if (block.type === 'spp_reinterpret_f64_as_i64') targetType = Type.I64;
                else if (block.type === 'spp_reinterpret_i64_as_f64') targetType = Type.F64;
                const vBlock = block.getInputTargetBlock('VALUE');
                const valExpr = vBlock ? this.parseExpression(vBlock) : new ConstNode(0, Type.I32);
                return new ReinterpretNode(valExpr, targetType);
            }

            case 'spp_convert': {
                const targetType = block.getFieldValue('TARGET_TYPE') || Type.I32;
                const signedness = block.getFieldValue('SIGNEDNESS') || 'signed';
                const vBlock = block.getInputTargetBlock('VALUE');
                const valExpr = vBlock ? this.parseExpression(vBlock) : new ConstNode(0, Type.I32);
                return new ConvertNode(valExpr, targetType, true, signedness);
            }

            case 'spp_reinterpret': {
                const targetType = block.getFieldValue('TARGET_TYPE') || Type.I32;
                const vBlock = block.getInputTargetBlock('VALUE');
                const valExpr = vBlock ? this.parseExpression(vBlock) : new ConstNode(0, Type.I32);
                return new ReinterpretNode(valExpr, targetType);
            }

            case 'spp_alloc_buffer': {
                const sBlock = block.getInputTargetBlock('SIZE');
                const sExpr = sBlock ? this.parseExpression(sBlock) : new ConstNode(64, Type.I32);
                return new AllocBufferNode(sExpr);
            }

            case 'spp_i32_load':
            case 'spp_i64_load':
            case 'spp_f32_load':
            case 'spp_f64_load':
            case 'spp_mem_load': {
                let widthType = block.getFieldValue('WIDTH_TYPE') || 'i32';
                if (block.type === 'spp_f32_load') widthType = 'f32';
                if (block.type === 'spp_f64_load') widthType = 'f64';
                
                const staticOffset = Number(block.getFieldValue('STATIC_OFFSET') || 0);
                let type = Type.I32;
                let width = null;
                let signedness = 'signed';

                if (widthType === 'i32_u8') { width = 1; signedness = 'unsigned'; }
                else if (widthType === 'i32_s8') { width = 1; signedness = 'signed'; }
                else if (widthType === 'i32_u16') { width = 2; signedness = 'unsigned'; }
                else if (widthType === 'i32_s16') { width = 2; signedness = 'signed'; }
                else if (widthType === 'i64') { type = Type.I64; }
                else if (widthType === 'i64_u8') { type = Type.I64; width = 1; signedness = 'unsigned'; }
                else if (widthType === 'i64_s8') { type = Type.I64; width = 1; signedness = 'signed'; }
                else if (widthType === 'i64_u16') { type = Type.I64; width = 2; signedness = 'unsigned'; }
                else if (widthType === 'i64_s16') { type = Type.I64; width = 2; signedness = 'signed'; }
                else if (widthType === 'i64_u32') { type = Type.I64; width = 4; signedness = 'unsigned'; }
                else if (widthType === 'i64_s32') { type = Type.I64; width = 4; signedness = 'signed'; }
                else if (widthType === 'f32') { type = Type.F32; }
                else if (widthType === 'f64') { type = Type.F64; }

                const bufBlock = block.getInputTargetBlock('BUFFER');
                const bufExpr = bufBlock ? this.parseExpression(bufBlock) : new ConstNode(0, Type.I32);
                const offBlock = block.getInputTargetBlock('OFFSET');
                const offExpr = offBlock ? this.parseExpression(offBlock) : new ConstNode(0, Type.I32);
                return new MemLoadNode(type, bufExpr, offExpr, width, signedness, staticOffset, 0);
            }

            case 'spp_mem_grow': {
                const pBlock = block.getInputTargetBlock('PAGES');
                const pExpr = pBlock ? this.parseExpression(pBlock) : new ConstNode(1, Type.I32);
                return new MemGrowNode(pExpr);
            }

            case 'spp_mem_size':
                return new MemSizeNode();

            case 'spp_string_concat': {
                const lBlock = block.getInputTargetBlock('LEFT');
                const rBlock = block.getInputTargetBlock('RIGHT');
                const lExpr = lBlock ? this.parseExpression(lBlock) : new StringLiteralNode('');
                const rExpr = rBlock ? this.parseExpression(rBlock) : new StringLiteralNode('');
                return new StringConcatNode(lExpr, rExpr);
            }

            case 'spp_call_expr': {
                const name = block.getFieldValue('NAME');
                const args = [];
                for (let i = 0; i < 16; i++) {
                    const argBlock = block.getInputTargetBlock(`ARG${i}`);
                    if (argBlock) args.push(this.parseExpression(argBlock));
                }
                return new CallNode(name, args);
            }

            case 'spp_function_ptr': {
                const idx = Number(block.getFieldValue('INDEX') || 0);
                return new ConstNode(idx, Type.FUNCAO);
            }

            case 'spp_call_indirect': {
                const idxBlock = block.getInputTargetBlock('FUNC_INDEX');
                const funcIdxExpr = idxBlock ? this.parseExpression(idxBlock) : new ConstNode(0, Type.I32);
                const returnType = block.getFieldValue('RETURN_TYPE') || Type.I32;
                const pTypesRaw = block.getFieldValue('PARAM_TYPES') || 'i32';
                const paramTypes = pTypesRaw.split(',').map(s => s.trim()).filter(Boolean);

                const args = [];
                for (let i = 0; i < 16; i++) {
                    const argBlock = block.getInputTargetBlock(`ARG${i}`);
                    if (argBlock) args.push(this.parseExpression(argBlock));
                }
                return new CallIndirectNode(funcIdxExpr, args, paramTypes, returnType);
            }

            case 'spp_sign_extend': {
                const mode = block.getFieldValue('MODE') || '8_i32';
                const [bitsStr, type] = mode.split('_');
                const fromBits = Number(bitsStr);
                const vBlock = block.getInputTargetBlock('VALUE');
                const val = vBlock ? this.parseExpression(vBlock) : new ConstNode(0, type);
                return new SignExtendNode(val, fromBits, type);
            }

            case 'spp_trunc_sat': {
                const mode = block.getFieldValue('MODE') || 'i32_f32_s';
                const parts = mode.split('_');
                const destType = parts[0];
                const srcType = parts[1];
                const isSigned = parts[2] === 's';
                const vBlock = block.getInputTargetBlock('VALUE');
                const val = vBlock ? this.parseExpression(vBlock) : new ConstNode(0.0, srcType);
                return new TruncSatNode(val, srcType, destType, isSigned);
            }

            case 'spp_ref_null': {
                const type = block.getFieldValue('TYPE') || Type.FUNCREF;
                return new RefNullNode(type);
            }

            case 'spp_ref_is_null': {
                const rBlock = block.getInputTargetBlock('REF');
                const ref = rBlock ? this.parseExpression(rBlock) : new RefNullNode(Type.FUNCREF);
                return new RefIsNullNode(ref);
            }

            case 'spp_ref_func': {
                const name = block.getFieldValue('NAME') || 'func';
                return new RefFuncNode(name);
            }

            case 'spp_table_get': {
                const tableIdx = Number(block.getFieldValue('TABLE_IDX') || 0);
                const idxBlock = block.getInputTargetBlock('INDEX');
                const idx = idxBlock ? this.parseExpression(idxBlock) : new ConstNode(0, Type.I32);
                return new TableGetNode(tableIdx, idx);
            }

            case 'spp_table_size': {
                const tableIdx = Number(block.getFieldValue('TABLE_IDX') || 0);
                return new TableSizeNode(tableIdx);
            }

            case 'spp_table_grow': {
                const tableIdx = Number(block.getFieldValue('TABLE_IDX') || 0);
                const initBlock = block.getInputTargetBlock('INIT_VAL');
                const deltaBlock = block.getInputTargetBlock('DELTA');
                const initVal = initBlock ? this.parseExpression(initBlock) : new RefNullNode(Type.FUNCREF);
                const delta = deltaBlock ? this.parseExpression(deltaBlock) : new ConstNode(0, Type.I32);
                return new TableGrowNode(tableIdx, initVal, delta);
            }

            case 'spp_v128_const': {
                const hexStr = block.getFieldValue('VALUE') || '';
                const parts = hexStr.trim().split(/\s+/);
                const bytes = new Uint8Array(16);
                for (let i = 0; i < 16 && i < parts.length; i++) {
                    bytes[i] = parseInt(parts[i], 16) || 0;
                }
                return new V128ConstNode(bytes);
            }

            case 'spp_v128_splat': {
                const laneType = block.getFieldValue('LANE_TYPE') || 'i32x4';
                const vBlock = block.getInputTargetBlock('VALUE');
                const val = vBlock ? this.parseExpression(vBlock) : new ConstNode(0, Type.I32);
                return new V128SplatNode(laneType, val);
            }

            case 'spp_v128_extract_lane': {
                const laneType = block.getFieldValue('LANE_TYPE') || 'i32x4';
                const laneIdx = Number(block.getFieldValue('LANE_IDX') || 0);
                const vecBlock = block.getInputTargetBlock('VECTOR');
                const vec = vecBlock ? this.parseExpression(vecBlock) : new V128ConstNode(new Uint8Array(16));
                return new V128ExtractLaneNode(laneType, laneIdx, vec);
            }

            case 'spp_v128_replace_lane': {
                const laneType = block.getFieldValue('LANE_TYPE') || 'i32x4';
                const laneIdx = Number(block.getFieldValue('LANE_IDX') || 0);
                const vecBlock = block.getInputTargetBlock('VECTOR');
                const valBlock = block.getInputTargetBlock('VALUE');
                const vec = vecBlock ? this.parseExpression(vecBlock) : new V128ConstNode(new Uint8Array(16));
                const val = valBlock ? this.parseExpression(valBlock) : new ConstNode(0, Type.I32);
                return new V128ReplaceLaneNode(laneType, laneIdx, vec, val);
            }

            case 'spp_v128_binop': {
                const op = block.getFieldValue('OP') || 'i32x4.add';
                const lBlock = block.getInputTargetBlock('LEFT');
                const rBlock = block.getInputTargetBlock('RIGHT');
                const left = lBlock ? this.parseExpression(lBlock) : new V128ConstNode(new Uint8Array(16));
                const right = rBlock ? this.parseExpression(rBlock) : new V128ConstNode(new Uint8Array(16));
                return new V128OpNode(op, [left, right]);
            }

            case 'spp_v128_bitselect': {
                const v1Block = block.getInputTargetBlock('V1');
                const v2Block = block.getInputTargetBlock('V2');
                const maskBlock = block.getInputTargetBlock('MASK');
                const v1 = v1Block ? this.parseExpression(v1Block) : new V128ConstNode(new Uint8Array(16));
                const v2 = v2Block ? this.parseExpression(v2Block) : new V128ConstNode(new Uint8Array(16));
                const mask = maskBlock ? this.parseExpression(maskBlock) : new V128ConstNode(new Uint8Array(16));
                return new V128BitSelectNode(v1, v2, mask);
            }

            case 'spp_v128_load': {
                const staticOffset = Number(block.getFieldValue('STATIC_OFFSET') || 0);
                const offBlock = block.getInputTargetBlock('OFFSET');
                const off = offBlock ? this.parseExpression(offBlock) : new ConstNode(0, Type.I32);
                return new V128LoadNode(off, staticOffset);
            }

            default:
                return new ConstNode(0, Type.I32);
        }
    }
}
