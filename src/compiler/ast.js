/**
 * Scratch++ AST (Abstract Syntax Tree) Node Definitions - 100% WebAssembly 1.0 Coverage
 */

export const ASTNodeType = {
    PROGRAM: 'Program',
    FUNCTION: 'Function',
    GLOBAL_DECLARE: 'GlobalDeclare',
    DECLARE_VAR: 'DeclareVar',
    SET_VAR: 'SetVar',
    TEE_VAR: 'TeeVar',
    GET_VAR: 'GetVar',
    GLOBAL_SET: 'GlobalSet',
    GLOBAL_GET: 'GlobalGet',
    CONST: 'Const',
    BINARY_OP: 'BinaryOp',
    UNARY_OP: 'UnaryOp',
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
    ALLOC_BUFFER: 'AllocBuffer',
    MEM_LOAD: 'MemLoad',
    MEM_STORE: 'MemStore',
    MEM_GROW: 'MemGrow',
    MEM_SIZE: 'MemSize',
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
    constructor(functions = [], globals = [], mainBody = []) {
        super(ASTNodeType.PROGRAM);
        this.functions = functions;
        this.globals = globals;
        this.mainBody = mainBody;
    }
}

export class FunctionNode extends ASTNode {
    constructor(name, params = [], returnType = 'void', body = [], isExported = true) {
        super(ASTNodeType.FUNCTION);
        this.name = name;
        this.params = params; // [{name: string, type: string}]
        this.returnType = returnType;
        this.body = body;
        this.isExported = isExported;
    }
}

export class GlobalDeclareNode extends ASTNode {
    constructor(name, type, mutable = true, initExpr = null) {
        super(ASTNodeType.GLOBAL_DECLARE);
        this.name = name;
        this.type = type;
        this.mutable = mutable;
        this.initExpr = initExpr;
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
        this.signedness = signedness; // 'signed' | 'unsigned'
    }
}

export class UnaryOpNode extends ASTNode {
    constructor(op, expr) {
        super(ASTNodeType.UNARY_OP);
        this.op = op;
        this.expr = expr;
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
    constructor(label = 0, body = []) {
        super(ASTNodeType.BLOCK);
        this.label = label;
        this.body = body;
    }
}

export class LoopNode extends ASTNode {
    constructor(label = 0, body = []) {
        super(ASTNodeType.LOOP);
        this.label = label;
        this.body = body;
    }
}

export class IfNode extends ASTNode {
    constructor(condition, thenBranch = [], elseBranch = []) {
        super(ASTNodeType.IF);
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
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
        this.valueExpr = valueExpr;
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
    constructor(funcIndexExpr, args = [], paramTypes = [], returnType = 'void') {
        super(ASTNodeType.CALL_INDIRECT);
        this.funcIndexExpr = funcIndexExpr;
        this.args = args;
        this.paramTypes = paramTypes;
        this.returnType = returnType;
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
