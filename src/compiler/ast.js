/**
 * Scratch++ AST (Abstract Syntax Tree) Node Definitions
 * Complete 100% WebAssembly 2.0 (W3C Recommendation)
 */

import { Type } from './types.js';

export const ASTNodeType = {
    PROGRAM: 'Program',
    IMPORT_FUNC: 'ImportFunc',
    IMPORT_GLOBAL: 'ImportGlobal',
    IMPORT_MEMORY: 'ImportMemory',
    IMPORT_TABLE: 'ImportTable',
    EXPORT: 'Export',
    START_FUNC: 'StartFunc',
    FUNCTION: 'Function',
    GLOBAL_DECLARE: 'GlobalDeclare',
    TABLE_DECLARE: 'TableDeclare',
    DECLARE_VAR: 'DeclareVar',
    SET_VAR: 'SetVar',
    TEE_VAR: 'TeeVar',
    GET_VAR: 'GetVar',
    CONST: 'Const',
    BINARY_OP: 'BinaryOp',
    UNARY_OP: 'UnaryOp',
    SIGN_EXTEND: 'SignExtend',
    TRUNC_SAT: 'TruncSat',
    SELECT: 'Select',
    CONVERT: 'Convert',
    REINTERPRET: 'Reinterpret',
    BLOCK: 'Block',
    LOOP: 'Loop',
    IF: 'If',
    REPEAT: 'Repeat',
    WHILE: 'While',
    BR: 'Br',
    BR_IF: 'BrIf',
    BR_TABLE: 'BrTable',
    RETURN: 'Return',
    DROP: 'Drop',
    NOP: 'Nop',
    UNREACHABLE: 'Unreachable',
    CALL: 'Call',
    CALL_INDIRECT: 'CallIndirect',
    RETURN_CALL: 'ReturnCall',
    RETURN_CALL_INDIRECT: 'ReturnCallIndirect',
    ALLOC_BUFFER: 'AllocBuffer',
    MEM_LOAD: 'MemLoad',
    MEM_STORE: 'MemStore',
    MEM_GROW: 'MemGrow',
    MEM_SIZE: 'MemSize',
    MEM_COPY: 'MemCopy',
    MEM_FILL: 'MemFill',
    MEM_INIT: 'MemInit',
    DATA_DROP: 'DataDrop',
    REF_NULL: 'RefNull',
    REF_IS_NULL: 'RefIsNull',
    REF_FUNC: 'RefFunc',
    TABLE_GET: 'TableGet',
    TABLE_SET: 'TableSet',
    INLINE_WAT: 'InlineWat',
    TABLE_SIZE: 'TableSize',
    TABLE_GROW: 'TableGrow',
    TABLE_FILL: 'TableFill',
    TABLE_COPY: 'TableCopy',
    TABLE_INIT: 'TableInit',
    ELEM_DROP: 'ElemDrop',
    V128_CONST: 'V128Const',
    V128_SPLAT: 'V128Splat',
    V128_EXTRACT_LANE: 'V128ExtractLane',
    V128_REPLACE_LANE: 'V128ReplaceLane',
    V128_OP: 'V128Op',
    V128_BITSELECT: 'V128BitSelect',
    V128_LOAD: 'V128Load',
    V128_STORE: 'V128Store',
    STRING_LITERAL: 'StringLiteral',
    STRING_CONCAT: 'StringConcat',
    STRING_LEN: 'StringLen',
    PRINT: 'Print'
};

export class ASTNode {
    constructor(nodeType) {
        this.nodeType = nodeType;
        this.inferredType = null;
    }
}

export class ProgramNode extends ASTNode {
    constructor(functions = [], globals = [], mainBody = [], imports = [], exports = [], startFunc = null, tables = []) {
        super(ASTNodeType.PROGRAM);
        this.functions = functions;
        this.globals = globals;
        this.mainBody = mainBody;
        this.imports = imports;
        this.exports = exports;
        this.startFunc = startFunc;
        this.tables = tables;
    }
}

export class ImportFuncNode extends ASTNode {
    constructor(module, name, internalName, params = [], returnType = 'void') {
        super(ASTNodeType.IMPORT_FUNC);
        this.module = module;
        this.name = name;
        this.internalName = internalName;
        this.params = params; // [{name: string, type: string}]
        this.returnType = returnType; // string or string[]
    }
}

export class ImportGlobalNode extends ASTNode {
    constructor(module, name, internalName, type, mutable = false) {
        super(ASTNodeType.IMPORT_GLOBAL);
        this.module = module;
        this.name = name;
        this.internalName = internalName;
        this.type = type;
        this.mutable = mutable;
    }
}

export class ImportMemoryNode extends ASTNode {
    constructor(module, name, min = 1, max = null) {
        super(ASTNodeType.IMPORT_MEMORY);
        this.module = module;
        this.name = name;
        this.min = min;
        this.max = max;
    }
}

export class ImportTableNode extends ASTNode {
    constructor(module, name, type = 'funcref', min = 1, max = null) {
        super(ASTNodeType.IMPORT_TABLE);
        this.module = module;
        this.name = name;
        this.type = type;
        this.min = min;
        this.max = max;
    }
}

export class ExportNode extends ASTNode {
    constructor(kind, internalName, exportName) {
        super(ASTNodeType.EXPORT);
        this.kind = kind; // 'func' | 'global' | 'mem' | 'table'
        this.internalName = internalName;
        this.exportName = exportName;
    }
}

export class StartFuncNode extends ASTNode {
    constructor(funcName) {
        super(ASTNodeType.START_FUNC);
        this.funcName = funcName;
    }
}

export class FunctionNode extends ASTNode {
    constructor(name, params = [], returnType = 'void', body = [], isExported = true, exportName = null) {
        super(ASTNodeType.FUNCTION);
        this.name = name;
        this.params = params; // [{name: string, type: string}]
        this.returnType = returnType; // string or string[] for multi-value
        this.body = body;
        this.isExported = isExported;
        this.exportName = exportName || name;
    }
}

export class GlobalDeclareNode extends ASTNode {
    constructor(name, type, mutable = true, initExpr = null, isExported = false, exportName = null) {
        super(ASTNodeType.GLOBAL_DECLARE);
        this.name = name;
        this.type = type;
        this.mutable = mutable;
        this.initExpr = initExpr;
        this.isExported = isExported;
        this.exportName = exportName || name;
    }
}

export class TableDeclareNode extends ASTNode {
    constructor(name, refType = 'funcref', min = 1, max = null, isExported = false, exportName = null) {
        super(ASTNodeType.TABLE_DECLARE);
        this.name = name;
        this.refType = refType;
        this.type = refType;
        this.min = min;
        this.minSize = min;
        this.max = max;
        this.maxSize = max;
        this.isExported = isExported;
        this.exportName = exportName || name;
    }
}

export class DeclareVarNode extends ASTNode {
    constructor(name, type, initExpr, isGlobal = false) {
        super(ASTNodeType.DECLARE_VAR);
        this.name = name;
        this.type = type;
        this.initExpr = initExpr;
        this.isGlobal = isGlobal;
    }
}

export class SetVarNode extends ASTNode {
    constructor(name, valueExpr) {
        super(ASTNodeType.SET_VAR);
        this.name = name;
        this.valueExpr = valueExpr;
    }
}

export class TeeVarNode extends ASTNode {
    constructor(name, valueExpr) {
        super(ASTNodeType.TEE_VAR);
        this.name = name;
        this.valueExpr = valueExpr;
    }
}

export class GetVarNode extends ASTNode {
    constructor(name) {
        super(ASTNodeType.GET_VAR);
        this.name = name;
    }
}

export class ConstNode extends ASTNode {
    constructor(value, type) {
        super(ASTNodeType.CONST);
        this.value = value;
        this.type = type;
        this.inferredType = type;
    }
}

export class BinaryOpNode extends ASTNode {
    constructor(op, left, right, signedness = 'signed') {
        super(ASTNodeType.BINARY_OP);
        this.op = op;
        this.left = left;
        this.right = right;
        this.signedness = signedness;
    }
}

export class UnaryOpNode extends ASTNode {
    constructor(op, expr) {
        super(ASTNodeType.UNARY_OP);
        this.op = op;
        this.expr = expr;
    }
}

export class SignExtendNode extends ASTNode {
    constructor(arg1, arg2, arg3) {
        super(ASTNodeType.SIGN_EXTEND);
        if (typeof arg1 === 'string' && typeof arg2 === 'number') {
            this.type = arg1;
            this.width = arg2;
            this.expr = arg3;
        } else {
            this.expr = arg1;
            this.width = arg2;
            this.type = arg3 || 'i32';
        }
    }
}

export class TruncSatNode extends ASTNode {
    constructor(arg1, arg2, arg3 = 'signed', arg4 = null) {
        super(ASTNodeType.TRUNC_SAT);
        if (typeof arg1 === 'string' && typeof arg2 === 'string') {
            this.targetType = arg1;
            this.srcType = arg2;
            this.signedness = typeof arg3 === 'boolean' ? (arg3 ? 'signed' : 'unsigned') : arg3;
            this.expr = arg4;
        } else {
            this.expr = arg1;
            this.srcType = arg2;
            this.targetType = arg3 || 'i32';
            this.signedness = typeof arg4 === 'boolean' ? (arg4 ? 'signed' : 'unsigned') : (arg4 || 'signed');
        }
    }
}

export class SelectNode extends ASTNode {
    constructor(condition, trueExpr, falseExpr) {
        super(ASTNodeType.SELECT);
        this.condition = condition;
        this.trueExpr = trueExpr;
        this.falseExpr = falseExpr;
    }
}

export class ConvertNode extends ASTNode {
    constructor(expr, targetType, isExplicit = false, signedness = 'signed') {
        super(ASTNodeType.CONVERT);
        this.expr = expr;
        this.targetType = targetType;
        this.isExplicit = isExplicit;
        this.signedness = signedness;
    }
}

export class ReinterpretNode extends ASTNode {
    constructor(expr, targetType) {
        super(ASTNodeType.REINTERPRET);
        this.expr = expr;
        this.targetType = targetType;
    }
}

export class BlockNode extends ASTNode {
    constructor(label = 0, body = [], resultType = 'void') {
        super(ASTNodeType.BLOCK);
        this.label = label;
        this.body = body;
        this.resultType = resultType;
    }
}

export class LoopNode extends ASTNode {
    constructor(label = 0, body = [], resultType = 'void') {
        super(ASTNodeType.LOOP);
        this.label = label;
        this.body = body;
        this.resultType = resultType;
    }
}

export class IfNode extends ASTNode {
    constructor(condition, thenBranch = [], elseBranch = [], resultType = 'void') {
        super(ASTNodeType.IF);
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
        this.resultType = resultType;
    }
}

export class RepeatNode extends ASTNode {
    constructor(countExpr, body = []) {
        super(ASTNodeType.REPEAT);
        this.countExpr = countExpr;
        this.body = body;
    }
}

export class WhileNode extends ASTNode {
    constructor(condition, body = []) {
        super(ASTNodeType.WHILE);
        this.condition = condition;
        this.body = body;
    }
}

export class BrNode extends ASTNode {
    constructor(depth = 0) {
        super(ASTNodeType.BR);
        this.depth = depth;
    }
}

export class BrIfNode extends ASTNode {
    constructor(condition, depth = 0) {
        super(ASTNodeType.BR_IF);
        this.condition = condition;
        this.depth = depth;
    }
}

export class BrTableNode extends ASTNode {
    constructor(indexExpr, targetDepths = [0], defaultDepth = 0) {
        super(ASTNodeType.BR_TABLE);
        this.indexExpr = indexExpr;
        this.targetDepths = targetDepths;
        this.defaultDepth = defaultDepth;
    }
}

export class ReturnNode extends ASTNode {
    constructor(valueExpr = null) {
        super(ASTNodeType.RETURN);
        this.valueExpr = valueExpr; // Single expr or array of exprs for multi-value
    }
}

export class DropNode extends ASTNode {
    constructor(expr) {
        super(ASTNodeType.DROP);
        this.expr = expr;
    }
}

export class NopNode extends ASTNode {
    constructor() {
        super(ASTNodeType.NOP);
    }
}

export class UnreachableNode extends ASTNode {
    constructor() {
        super(ASTNodeType.UNREACHABLE);
    }
}

export class CallNode extends ASTNode {
    constructor(funcName, args = []) {
        super(ASTNodeType.CALL);
        this.funcName = funcName;
        this.args = args;
    }
}

export class CallIndirectNode extends ASTNode {
    constructor(funcIndexExpr, args = [], paramTypes = [], returnType = 'void', tableIdx = 0) {
        super(ASTNodeType.CALL_INDIRECT);
        this.funcIndexExpr = funcIndexExpr;
        this.args = args;
        this.paramTypes = paramTypes;
        this.returnType = returnType;
        this.tableIdx = tableIdx;
    }
}

export class ReturnCallNode extends ASTNode {
    constructor(funcName, args = []) {
        super(ASTNodeType.RETURN_CALL);
        this.funcName = funcName;
        this.args = args;
    }
}

export class ReturnCallIndirectNode extends ASTNode {
    constructor(funcIndexExpr, args = [], paramTypes = [], returnType = 'void', tableIdx = 0) {
        super(ASTNodeType.RETURN_CALL_INDIRECT);
        this.funcIndexExpr = funcIndexExpr;
        this.args = args;
        this.paramTypes = paramTypes;
        this.returnType = returnType;
        this.tableIdx = tableIdx;
    }
}

export class AllocBufferNode extends ASTNode {
    constructor(sizeExpr) {
        super(ASTNodeType.ALLOC_BUFFER);
        this.sizeExpr = sizeExpr;
    }
}

export class MemLoadNode extends ASTNode {
    constructor(type, bufferExpr, offsetExpr, width = null, signedness = 'signed', staticOffset = 0, align = 0) {
        super(ASTNodeType.MEM_LOAD);
        this.type = type;
        this.bufferExpr = bufferExpr;
        this.offsetExpr = offsetExpr;
        this.width = width;
        this.signedness = signedness;
        this.staticOffset = staticOffset;
        this.align = align;
    }
}

export class MemStoreNode extends ASTNode {
    constructor(bufferExpr, offsetExpr, valueExpr, width = null, staticOffset = 0, align = 0) {
        super(ASTNodeType.MEM_STORE);
        this.bufferExpr = bufferExpr;
        this.offsetExpr = offsetExpr;
        this.valueExpr = valueExpr;
        this.width = width;
        this.staticOffset = staticOffset;
        this.align = align;
    }
}

export class MemGrowNode extends ASTNode {
    constructor(pagesExpr) {
        super(ASTNodeType.MEM_GROW);
        this.pagesExpr = pagesExpr;
    }
}

export class MemSizeNode extends ASTNode {
    constructor() {
        super(ASTNodeType.MEM_SIZE);
    }
}

export class MemCopyNode extends ASTNode {
    constructor(dstExpr, srcExpr, lenExpr) {
        super(ASTNodeType.MEM_COPY);
        this.dstExpr = dstExpr;
        this.srcExpr = srcExpr;
        this.lenExpr = lenExpr;
    }
}

export class MemFillNode extends ASTNode {
    constructor(dstExpr, valExpr, lenExpr) {
        super(ASTNodeType.MEM_FILL);
        this.dstExpr = dstExpr;
        this.valExpr = valExpr;
        this.lenExpr = lenExpr;
    }
}

export class MemInitNode extends ASTNode {
    constructor(dataIdx, dstExpr, srcOffExpr, lenExpr) {
        super(ASTNodeType.MEM_INIT);
        this.dataIdx = dataIdx;
        this.dstExpr = dstExpr;
        this.srcOffExpr = srcOffExpr;
        this.lenExpr = lenExpr;
    }
}

export class DataDropNode extends ASTNode {
    constructor(dataIdx) {
        super(ASTNodeType.DATA_DROP);
        this.dataIdx = dataIdx;
    }
}

export class RefNullNode extends ASTNode {
    constructor(refType = 'funcref') {
        super(ASTNodeType.REF_NULL);
        this.refType = refType;
    }
}

export class RefIsNullNode extends ASTNode {
    constructor(expr) {
        super(ASTNodeType.REF_IS_NULL);
        this.expr = expr;
    }
}

export class RefFuncNode extends ASTNode {
    constructor(funcName) {
        super(ASTNodeType.REF_FUNC);
        this.funcName = funcName;
    }
}

export class TableGetNode extends ASTNode {
    constructor(tableIdx = 0, idxExpr = null) {
        super(ASTNodeType.TABLE_GET);
        this.tableIdx = tableIdx;
        this.idxExpr = idxExpr;
    }
}

export class TableSetNode extends ASTNode {
    constructor(tableIdx = 0, idxExpr = null, valExpr = null) {
        super(ASTNodeType.TABLE_SET);
        this.tableIdx = tableIdx;
        this.idxExpr = idxExpr;
        this.valExpr = valExpr;
    }
}

export class TableSizeNode extends ASTNode {
    constructor(tableIdx = 0) {
        super(ASTNodeType.TABLE_SIZE);
        this.tableIdx = tableIdx;
    }
}

export class TableGrowNode extends ASTNode {
    constructor(tableIdx = 0, valExpr = null, deltaExpr = null) {
        super(ASTNodeType.TABLE_GROW);
        this.tableIdx = tableIdx;
        this.valExpr = valExpr;
        this.deltaExpr = deltaExpr;
    }
}

export class TableFillNode extends ASTNode {
    constructor(tableIdx = 0, offExpr = null, valExpr = null, lenExpr = null) {
        super(ASTNodeType.TABLE_FILL);
        this.tableIdx = tableIdx;
        this.offExpr = offExpr;
        this.valExpr = valExpr;
        this.lenExpr = lenExpr;
    }
}

export class TableCopyNode extends ASTNode {
    constructor(dstTableIdx = 0, srcTableIdx = 0, dstOffExpr = null, srcOffExpr = null, lenExpr = null) {
        super(ASTNodeType.TABLE_COPY);
        this.dstTableIdx = dstTableIdx;
        this.srcTableIdx = srcTableIdx;
        this.dstOffExpr = dstOffExpr;
        this.srcOffExpr = srcOffExpr;
        this.lenExpr = lenExpr;
    }
}

export class TableInitNode extends ASTNode {
    constructor(elemIdx = 0, tableIdx = 0, dstOffExpr = null, srcOffExpr = null, lenExpr = null) {
        super(ASTNodeType.TABLE_INIT);
        this.elemIdx = elemIdx;
        this.tableIdx = tableIdx;
        this.dstOffExpr = dstOffExpr;
        this.srcOffExpr = srcOffExpr;
        this.lenExpr = lenExpr;
    }
}

export class ElemDropNode extends ASTNode {
    constructor(elemIdx = 0) {
        super(ASTNodeType.ELEM_DROP);
        this.elemIdx = elemIdx;
    }
}

// -----------------------------------------------------------------------------
// FIXED-WIDTH SIMD 128-bit (v128)
// -----------------------------------------------------------------------------
export class V128ConstNode extends ASTNode {
    constructor(bytes = new Uint8Array(16)) {
        super(ASTNodeType.V128_CONST);
        this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    }
}

export class V128SplatNode extends ASTNode {
    constructor(laneType = 'i32x4', expr = null) {
        super(ASTNodeType.V128_SPLAT);
        this.laneType = laneType;
        this.expr = expr;
    }
}

export class V128ExtractLaneNode extends ASTNode {
    constructor(arg1 = 'i32x4', arg2 = 0, arg3 = 'signed', arg4 = null) {
        super(ASTNodeType.V128_EXTRACT_LANE);
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'string' && arg4) {
            this.laneType = arg1;
            this.laneIdx = arg2;
            this.signedness = arg3;
            this.vecExpr = arg4;
        } else if (typeof arg1 === 'string' && typeof arg2 === 'number') {
            this.laneType = arg1;
            this.laneIdx = arg2;
            this.signedness = 'signed';
            this.vecExpr = arg3;
        }
    }
}

export class V128ReplaceLaneNode extends ASTNode {
    constructor(laneType = 'i32x4', laneIdx = 0, vecExpr = null, valExpr = null) {
        super(ASTNodeType.V128_REPLACE_LANE);
        this.laneType = laneType;
        this.laneIdx = laneIdx;
        this.vecExpr = vecExpr;
        this.valExpr = valExpr;
    }
}

export class V128OpNode extends ASTNode {
    constructor(op, left, right = null) {
        super(ASTNodeType.V128_OP);
        this.op = op;
        if (Array.isArray(left)) {
            this.operands = left;
            this.left = left[0];
            this.right = left[1];
        } else {
            this.left = left;
            this.right = right;
            this.operands = [left, right].filter(Boolean);
        }
    }
}

export class V128BitSelectNode extends ASTNode {
    constructor(v1, v2, c) {
        super(ASTNodeType.V128_BITSELECT);
        this.v1 = v1;
        this.v2 = v2;
        this.c = c;
        this.maskExpr = c;
    }
}

export class V128LoadNode extends ASTNode {
    constructor(bufferExpr, offsetExpr, staticOffset = 0, align = 0) {
        super(ASTNodeType.V128_LOAD);
        if (offsetExpr === undefined || typeof offsetExpr === 'number') {
            this.bufferExpr = new ConstNode(0, Type.I32);
            this.offsetExpr = bufferExpr;
            this.staticOffset = offsetExpr || 0;
            this.align = staticOffset || 0;
        } else {
            this.bufferExpr = bufferExpr || new ConstNode(0, Type.I32);
            this.offsetExpr = offsetExpr;
            this.staticOffset = staticOffset;
            this.align = align;
        }
    }
}

export class V128StoreNode extends ASTNode {
    constructor(bufferExpr, offsetExpr, valueExpr, staticOffset = 0, align = 0) {
        super(ASTNodeType.V128_STORE);
        if (valueExpr === undefined || typeof valueExpr === 'number') {
            this.bufferExpr = new ConstNode(0, Type.I32);
            this.offsetExpr = bufferExpr;
            this.valueExpr = offsetExpr;
            this.valExpr = offsetExpr;
            this.staticOffset = valueExpr || 0;
            this.align = staticOffset || 0;
        } else {
            this.bufferExpr = bufferExpr || new ConstNode(0, Type.I32);
            this.offsetExpr = offsetExpr;
            this.valueExpr = valueExpr;
            this.valExpr = valueExpr;
            this.staticOffset = staticOffset;
            this.align = align;
        }
    }
}

// -----------------------------------------------------------------------------
// STRINGS & HOST
// -----------------------------------------------------------------------------
export class StringLiteralNode extends ASTNode {
    constructor(value) {
        super(ASTNodeType.STRING_LITERAL);
        this.value = value;
    }
}

export class StringConcatNode extends ASTNode {
    constructor(left, right) {
        super(ASTNodeType.STRING_CONCAT);
        this.left = left;
        this.right = right;
    }
}

export class StringLenNode extends ASTNode {
    constructor(strExpr) {
        super(ASTNodeType.STRING_LEN);
        this.strExpr = strExpr;
    }
}

export class PrintNode extends ASTNode {
    constructor(expr) {
        super(ASTNodeType.PRINT);
        this.expr = expr;
    }
}

export class InlineWatNode extends ASTNode {
    constructor(watCode = '', returnType = 'void') {
        super(ASTNodeType.INLINE_WAT);
        this.watCode = watCode;
        this.returnType = returnType;
    }
}
