/**
 * Scratch++ Blockly Block Definitions
 * 100% WebAssembly 1.0 Instruction Coverage with Strict Connection Type Checking
 */

import { TYPE_COLORS } from './types_theme.js';

export function registerScratchPPBlocks(Blockly) {
    // -------------------------------------------------------------------------
    // 1. IMPORTS & EXPORTS & START (WASM 1.0)
    // -------------------------------------------------------------------------
    
    // Generic Param Block
    Blockly.Blocks['spp_param'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📌 param")
                .appendField(new Blockly.FieldTextInput("x"), "NAME")
                .appendField(":")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["funcref", "funcref"],
                    ["externref", "externref"],
                    ["bool", "bool"],
                    ["string", "texto"],
                    ["buffer", "buffer"],
                    ["funcref", "função"]
                ]), "TYPE");
            this.setPreviousStatement(true, "spp_param");
            this.setNextStatement(true, "spp_param");
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Defines a typed parameter.");
        }
    };

    // Specific Typed Param Blocks
    const paramTypes = [
        { id: 'spp_param_i32', type: 'i32', color: TYPE_COLORS.i32, label: 'i32' },
        { id: 'spp_param_i64', type: 'i64', color: TYPE_COLORS.i64, label: 'i64' },
        { id: 'spp_param_f32', type: 'f32', color: TYPE_COLORS.f32, label: 'f32' },
        { id: 'spp_param_f64', type: 'f64', color: TYPE_COLORS.f64, label: 'f64' },
        { id: 'spp_param_bool', type: 'bool', color: TYPE_COLORS.bool, label: 'bool' },
        { id: 'spp_param_texto', type: 'texto', color: TYPE_COLORS.texto, label: 'texto' },
        { id: 'spp_param_buffer', type: 'buffer', color: TYPE_COLORS.buffer, label: 'buffer' },
        { id: 'spp_param_func', type: 'função', color: TYPE_COLORS.funcao, label: 'funcref' }
    ];

    for (const pt of paramTypes) {
        Blockly.Blocks[pt.id] = {
            init: function() {
                this.appendDummyInput()
                    .appendField(`📌 param`)
                    .appendField(new Blockly.FieldTextInput("x"), "NAME")
                    .appendField(`: ${pt.label}`);
                this.setPreviousStatement(true, "spp_param");
                this.setNextStatement(true, "spp_param");
                this.setColour(pt.color);
                this.setTooltip(`Parameter of type ${pt.label}`);
            }
        };
    }

    Blockly.Blocks['spp_import_func'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📥 import func")
                .appendField(new Blockly.FieldTextInput("sin"), "NAME")
                .appendField("from [")
                .appendField(new Blockly.FieldTextInput("env"), "MODULE")
                .appendField("] as:")
                .appendField(new Blockly.FieldTextInput("math_sin"), "ALIAS");
            this.appendDummyInput()
                .appendField("returns:")
                .appendField(new Blockly.FieldDropdown([
                    ["void", "void"],
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["funcref", "funcref"],
                    ["externref", "externref"]
                ]), "RETURN_TYPE");
            this.appendStatementInput("PARAMS").setCheck("spp_param").appendField("parameters:");
            this.setColour('#6366f1');
            this.setTooltip("Imports an external function from another Wasm module or Host.");
        }
    };

    Blockly.Blocks['spp_import_global'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📥 import global")
                .appendField(new Blockly.FieldTextInput("MY_CONST"), "NAME")
                .appendField("from [")
                .appendField(new Blockly.FieldTextInput("env"), "MODULE")
                .appendField("] as:")
                .appendField(new Blockly.FieldTextInput("ext_const"), "ALIAS");
            this.appendDummyInput()
                .appendField("type:")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["funcref", "funcref"],
                    ["externref", "externref"]
                ]), "TYPE")
                .appendField(new Blockly.FieldDropdown([
                    ["immutable (const)", "const"],
                    ["mutable", "mut"]
                ]), "MUTABLE");
            this.setColour('#6366f1');
            this.setTooltip("Imports a global variable from host/external module.");
        }
    };

    Blockly.Blocks['spp_export_decl'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📤 export")
                .appendField(new Blockly.FieldDropdown([
                    ["function", "func"],
                    ["global", "global"],
                    ["memory", "mem"],
                    ["table", "table"]
                ]), "KIND")
                .appendField("[")
                .appendField(new Blockly.FieldTextInput("myFunction"), "INTERNAL_NAME")
                .appendField("] as:")
                .appendField(new Blockly.FieldTextInput("exportedName"), "EXPORT_NAME");
            this.setColour('#8b5cf6');
            this.setTooltip("Exports Wasm module element to the host.");
        }
    };

    Blockly.Blocks['spp_start_func'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("⚡ start function:")
                .appendField(new Blockly.FieldTextInput("myFunction"), "FUNC_NAME");
            this.setColour('#ec4899');
            this.setTooltip("Defines start function (0x08) executed automatically on instantiation.");
        }
    };

    // -------------------------------------------------------------------------
    // 2. CONTROLE ESTRUTURADO (WASM 1.0)
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_start'] = {
        init: function() {
            this.appendDummyInput().appendField("🚀 when start");
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Main execution entry point.");
        }
    };

    Blockly.Blocks['spp_block'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📦 block")
                .appendField("label:")
                .appendField(new Blockly.FieldNumber(0), "LABEL");
            this.appendStatementInput("BODY").appendField("body:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("WebAssembly block structure.");
        }
    };

    Blockly.Blocks['spp_loop'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("🔄 loop")
                .appendField("label:")
                .appendField(new Blockly.FieldNumber(0), "LABEL");
            this.appendStatementInput("BODY").appendField("body:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("WebAssembly loop structure.");
        }
    };

    Blockly.Blocks['spp_if'] = {
        init: function() {
            this.appendValueInput("COND").setCheck(["bool", "i32"]).appendField("if");
            this.appendStatementInput("THEN").appendField("then");
            this.appendStatementInput("ELSE").appendField("else");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("WebAssembly if/else instruction.");
        }
    };

    Blockly.Blocks['spp_repeat'] = {
        init: function() {
            this.appendValueInput("TIMES").setCheck(["i32", "i64"]).appendField("repeat");
            this.appendDummyInput().appendField("times");
            this.appendStatementInput("DO").appendField("do");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Loop macro repeating N times.");
        }
    };

    Blockly.Blocks['spp_while'] = {
        init: function() {
            this.appendValueInput("COND").setCheck(["bool", "i32"]).appendField("while");
            this.appendStatementInput("DO").appendField("do");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Structured while loop.");
        }
    };

    Blockly.Blocks['spp_br'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("branch (br) level:")
                .appendField(new Blockly.FieldNumber(0, 0, 32), "DEPTH");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Unconditional branch br to parent block/loop.");
        }
    };

    Blockly.Blocks['spp_br_if'] = {
        init: function() {
            this.appendValueInput("COND")
                .setCheck(["bool", "i32"])
                .appendField("branch if (br_if)");
            this.appendDummyInput()
                .appendField("level:")
                .appendField(new Blockly.FieldNumber(0, 0, 32), "DEPTH");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Conditional branch br_if to parent block/loop.");
        }
    };

    Blockly.Blocks['spp_br_table'] = {
        init: function() {
            this.appendValueInput("INDEX")
                .setCheck("i32")
                .appendField("branch table (br_table) index:");
            this.appendDummyInput()
                .appendField("targets:")
                .appendField(new Blockly.FieldTextInput("0, 1"), "TARGETS")
                .appendField("default:")
                .appendField(new Blockly.FieldNumber(0), "DEFAULT");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Table-based branch br_table.");
        }
    };

    Blockly.Blocks['spp_select'] = {
        init: function() {
            this.appendValueInput("TRUE_VAL").appendField("select");
            this.appendValueInput("FALSE_VAL").appendField("else");
            this.appendValueInput("COND").setCheck(["bool", "i32"]).appendField("if cond:");
            this.setOutput(true);
            this.setInputsInline(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("WebAssembly ternary select instruction.");
        }
    };

    Blockly.Blocks['spp_return'] = {
        init: function() {
            this.appendValueInput("VALUE").appendField("return");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Return instruction of current function.");
        }
    };

    Blockly.Blocks['spp_drop'] = {
        init: function() {
            this.appendValueInput("EXPR").appendField("drop");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Drops value from top of operand stack.");
        }
    };

    Blockly.Blocks['spp_nop'] = {
        init: function() {
            this.appendDummyInput().appendField("nop (no-op)");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("WebAssembly nop instruction.");
        }
    };

    Blockly.Blocks['spp_unreachable'] = {
        init: function() {
            this.appendDummyInput().appendField("⚠️ unreachable (fatal trap)");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#dc2626');
            this.setTooltip("Triggers a fatal unreachable execution trap.");
        }
    };

    // -------------------------------------------------------------------------
    // 3. VARIABLES, GLOBALS AND CONSTANTS (STRICT TYPING)
    // -------------------------------------------------------------------------
    
    // Generic fallback
    Blockly.Blocks['spp_declare'] = {
        init: function() {
            this.appendValueInput("INIT")
                .appendField("declare local")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["funcref", "funcref"],
                    ["externref", "externref"],
                    ["bool", "bool"],
                    ["string", "texto"],
                    ["buffer", "buffer"],
                    ["funcref", "função"]
                ]), "TYPE")
                .appendField(new Blockly.FieldTextInput("x"), "NAME")
                .appendField("=");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Declares a local variable.");
        }
    };

    // Type-specific Local Declarations
    const declTypes = [
        { id: 'spp_declare_i32', type: 'i32', check: ['i32', 'bool'], color: TYPE_COLORS.i32, label: 'i32' },
        { id: 'spp_declare_i64', type: 'i64', check: 'i64', color: TYPE_COLORS.i64, label: 'i64' },
        { id: 'spp_declare_f32', type: 'f32', check: 'f32', color: TYPE_COLORS.f32, label: 'f32' },
        { id: 'spp_declare_f64', type: 'f64', check: 'f64', color: TYPE_COLORS.f64, label: 'f64' },
        { id: 'spp_declare_bool', type: 'bool', check: ['bool', 'i32'], color: TYPE_COLORS.bool, label: 'bool' },
        { id: 'spp_declare_texto', type: 'texto', check: 'texto', color: TYPE_COLORS.texto, label: 'texto' },
        { id: 'spp_declare_buffer', type: 'buffer', check: 'buffer', color: TYPE_COLORS.buffer, label: 'buffer' }
    ];

    for (const dt of declTypes) {
        Blockly.Blocks[dt.id] = {
            init: function() {
                this.appendValueInput("INIT")
                    .setCheck(dt.check)
                    .appendField(`declare ${dt.label}`)
                    .appendField(new Blockly.FieldTextInput("x"), "NAME")
                    .appendField("=");
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setColour(dt.color);
                this.setTooltip(`Declares local variable ${dt.label} (blocks incompatible types).`);
            }
        };
    }

    // Generic Global
    Blockly.Blocks['spp_global_declare'] = {
        init: function() {
            this.appendValueInput("INIT")
                .appendField("declare global")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["funcref", "funcref"],
                    ["externref", "externref"]
                ]), "TYPE")
                .appendField(new Blockly.FieldTextInput("g"), "NAME")
                .appendField(new Blockly.FieldDropdown([
                    ["mutable", "mut"],
                    ["immutable (const)", "const"]
                ]), "MUTABLE")
                .appendField("=");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Declares a global variable.");
        }
    };

    // Specific Globals
    const globalTypes = [
        { id: 'spp_global_i32', type: 'i32', check: ['i32', 'bool'], color: TYPE_COLORS.i32, label: 'i32' },
        { id: 'spp_global_i64', type: 'i64', check: 'i64', color: TYPE_COLORS.i64, label: 'i64' },
        { id: 'spp_global_f32', type: 'f32', check: 'f32', color: TYPE_COLORS.f32, label: 'f32' },
        { id: 'spp_global_f64', type: 'f64', check: 'f64', color: TYPE_COLORS.f64, label: 'f64' }
    ];

    for (const gt of globalTypes) {
        Blockly.Blocks[gt.id] = {
            init: function() {
                this.appendValueInput("INIT")
                    .setCheck(gt.check)
                    .appendField(`declare global ${gt.label}`)
                    .appendField(new Blockly.FieldTextInput("g"), "NAME")
                    .appendField(new Blockly.FieldDropdown([
                        ["mutable", "mut"],
                        ["immutable (const)", "const"]
                    ]), "MUTABLE")
                    .appendField("=");
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setColour(gt.color);
                this.setTooltip(`Declares global ${gt.label}.`);
            }
        };
    }

    Blockly.Blocks['spp_set'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("set")
                .appendField(new Blockly.FieldTextInput("x"), "NAME")
                .appendField("=");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Local.set or global.set assignment.");
        }
    };

    Blockly.Blocks['spp_tee'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("local.tee")
                .appendField(new Blockly.FieldTextInput("x"), "NAME")
                .appendField("=");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Assigns and returns value (local.tee).");
        }
    };

    Blockly.Blocks['spp_get'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("get")
                .appendField(new Blockly.FieldTextInput("x"), "NAME");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Reads local.get or global.get value.");
        }
    };

    // Typed Getters (strictly typed outputs)
    const typedGetters = [
        { id: 'spp_get_i32', type: 'i32', color: TYPE_COLORS.i32, label: 'get i32' },
        { id: 'spp_get_i64', type: 'i64', color: TYPE_COLORS.i64, label: 'get i64' },
        { id: 'spp_get_f32', type: 'f32', color: TYPE_COLORS.f32, label: 'get f32' },
        { id: 'spp_get_f64', type: 'f64', color: TYPE_COLORS.f64, label: 'get f64' },
        { id: 'spp_get_bool', type: 'bool', color: TYPE_COLORS.bool, label: 'get bool' }
    ];
    for (const tg of typedGetters) {
        Blockly.Blocks[tg.id] = {
            init: function() {
                this.appendDummyInput()
                    .appendField(tg.label)
                    .appendField(new Blockly.FieldTextInput("x"), "NAME");
                this.setOutput(true, tg.type);
                this.setColour(tg.color);
                this.setTooltip(`Reads variable ensuring type ${tg.type}.`);
            }
        };
    }

    // Literals / Constants
    Blockly.Blocks['spp_const_i32'] = {
        init: function() {
            this.appendDummyInput().appendField("i32:").appendField(new Blockly.FieldNumber(0), "VALUE");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("32-bit integer constant (i32.const).");
        }
    };

    Blockly.Blocks['spp_const_i64'] = {
        init: function() {
            this.appendDummyInput().appendField("i64:").appendField(new Blockly.FieldTextInput("0"), "VALUE");
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("64-bit integer constant (i64.const).");
        }
    };

    Blockly.Blocks['spp_const_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("f32:").appendField(new Blockly.FieldNumber(0.0), "VALUE");
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("32-bit float constant (f32.const).");
        }
    };

    Blockly.Blocks['spp_const_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("f64:").appendField(new Blockly.FieldNumber(0.0), "VALUE");
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("64-bit float constant (f64.const).");
        }
    };

    Blockly.Blocks['spp_const_bool'] = {
        init: function() {
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([
                ["true", "true"],
                ["false", "false"]
            ]), "VALUE");
            this.setOutput(true, "bool");
            this.setColour(TYPE_COLORS.bool);
            this.setTooltip("Boolean value.");
        }
    };

    Blockly.Blocks['spp_const_text'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("text: \"")
                .appendField(new Blockly.FieldTextInput("Hello Wasm!"), "VALUE")
                .appendField("\"");
            this.setOutput(true, "texto");
            this.setColour(TYPE_COLORS.texto);
            this.setTooltip("String literal.");
        }
    };

    // -------------------------------------------------------------------------
    // 4. TYPE-SPECIFIC OPERATIONS
    // -------------------------------------------------------------------------
    
    // --- i32 Operations ---
    Blockly.Blocks['spp_i32_binop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck(["i32", "bool"]);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["+ (i32.add)", "+"],
                    ["- (i32.sub)", "-"],
                    ["× (i32.mul)", "*"],
                    ["÷s (i32.div_s)", "/"],
                    ["÷u (i32.div_u)", "/u"],
                    ["%s (i32.rem_s)", "%"],
                    ["%u (i32.rem_u)", "%u"],
                    ["AND (i32.and)", "AND"],
                    ["OR (i32.or)", "OR"],
                    ["XOR (i32.xor)", "XOR"],
                    ["<< (i32.shl)", "<<" ],
                    [">>s (i32.shr_s)", ">>"],
                    [">>u (i32.shr_u)", ">>u"],
                    ["ROTL (i32.rotl)", "ROTL"],
                    ["ROTR (i32.rotr)", "ROTR"]
                ]), "OP");
            this.appendValueInput("RIGHT").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("i32 integer binary operation (rejects floats!).");
        }
    };

    Blockly.Blocks['spp_i32_relop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck(["i32", "bool"]);
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["= (i32.eq)", "=="],
                    ["≠ (i32.ne)", "!="],
                    ["< s (i32.lt_s)", "<"],
                    ["< u (i32.lt_u)", "<u"],
                    ["≤ s (i32.le_s)", "<="],
                    ["≤ u (i32.le_u)", "<=u"],
                    ["> s (i32.gt_s)", ">"],
                    ["> u (i32.gt_u)", ">u"],
                    ["≥ s (i32.ge_s)", ">="],
                    ["≥ u (i32.ge_u)", ">=u"]
                ]), "OP");
            this.appendValueInput("RIGHT").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "bool");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("i32 integer comparison (returns bool).");
        }
    };

    Blockly.Blocks['spp_i32_unop'] = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["i32.clz (leading zeros)", "CLZ"],
                    ["i32.ctz (trailing zeros)", "CTZ"],
                    ["i32.popcnt (count 1 bits)", "POPCNT"],
                    ["i32.eqz (is zero?)", "EQZ"]
                ]), "OP");
            this.appendValueInput("EXPR").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("i32 unary operation.");
        }
    };

    // --- i64 Operations ---
    Blockly.Blocks['spp_i64_binop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("i64");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["+ (i64.add)", "+"],
                    ["- (i64.sub)", "-"],
                    ["× (i64.mul)", "*"],
                    ["÷s (i64.div_s)", "/"],
                    ["÷u (i64.div_u)", "/u"],
                    ["%s (i64.rem_s)", "%"],
                    ["%u (i64.rem_u)", "%u"],
                    ["AND (i64.and)", "AND"],
                    ["OR (i64.or)", "OR"],
                    ["XOR (i64.xor)", "XOR"],
                    ["<< (i64.shl)", "<<" ],
                    [">>s (i64.shr_s)", ">>"],
                    [">>u (i64.shr_u)", ">>u"],
                    ["ROTL (i64.rotl)", "ROTL"],
                    ["ROTR (i64.rotr)", "ROTR"]
                ]), "OP");
            this.appendValueInput("RIGHT").setCheck("i64");
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("i64 integer binary operation.");
        }
    };

    Blockly.Blocks['spp_i64_relop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("i64");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["= (i64.eq)", "=="],
                    ["≠ (i64.ne)", "!="],
                    ["< s (i64.lt_s)", "<"],
                    ["< u (i64.lt_u)", "<u"],
                    ["≤ s (i64.le_s)", "<="],
                    ["≤ u (i64.le_u)", "<=u"],
                    ["> s (i64.gt_s)", ">"],
                    ["> u (i64.gt_u)", ">u"],
                    ["≥ s (i64.ge_s)", ">="],
                    ["≥ u (i64.ge_u)", ">=u"]
                ]), "OP");
            this.appendValueInput("RIGHT").setCheck("i64");
            this.setInputsInline(true);
            this.setOutput(true, "bool");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("i64 integer comparison (returns bool).");
        }
    };

    Blockly.Blocks['spp_i64_unop'] = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["i64.clz", "CLZ"],
                    ["i64.ctz", "CTZ"],
                    ["i64.popcnt", "POPCNT"],
                    ["i64.eqz", "EQZ"]
                ]), "OP");
            this.appendValueInput("EXPR").setCheck("i64");
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("i64 unary operation.");
        }
    };

    // --- f32 Operations ---
    Blockly.Blocks['spp_f32_binop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("f32");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["+ (f32.add)", "+"],
                    ["- (f32.sub)", "-"],
                    ["× (f32.mul)", "*"],
                    ["÷ (f32.div)", "/"],
                    ["min (f32.min)", "MIN"],
                    ["max (f32.max)", "MAX"],
                    ["copysign (f32.copysign)", "COPYSIGN"]
                ]), "OP");
            this.appendValueInput("RIGHT").setCheck("f32");
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("32-bit float binary operation (rejects integers!).");
        }
    };

    Blockly.Blocks['spp_f32_relop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("f32");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["= (f32.eq)", "=="],
                    ["≠ (f32.ne)", "!="],
                    ["< (f32.lt)", "<"],
                    ["≤ (f32.le)", "<="],
                    ["> (f32.gt)", ">"],
                    ["≥ (f32.ge)", ">="]
                ]), "OP");
            this.appendValueInput("RIGHT").setCheck("f32");
            this.setInputsInline(true);
            this.setOutput(true, "bool");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("f32 float comparison (returns bool).");
        }
    };

    Blockly.Blocks['spp_f32_unop'] = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["abs (f32.abs)", "ABS"],
                    ["neg (-x) (f32.neg)", "NEG"],
                    ["ceil (f32.ceil)", "CEIL"],
                    ["floor (f32.floor)", "FLOOR"],
                    ["trunc (f32.trunc)", "TRUNC"],
                    ["nearest (f32.nearest)", "NEAREST"],
                    ["sqrt (f32.sqrt)", "SQRT"]
                ]), "OP");
            this.appendValueInput("EXPR").setCheck("f32");
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("f32 unary operation.");
        }
    };

    // --- f64 Operations ---
    Blockly.Blocks['spp_f64_binop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("f64");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["+ (f64.add)", "+"],
                    ["- (f64.sub)", "-"],
                    ["× (f64.mul)", "*"],
                    ["÷ (f64.div)", "/"],
                    ["min (f64.min)", "MIN"],
                    ["max (f64.max)", "MAX"],
                    ["copysign (f64.copysign)", "COPYSIGN"]
                ]), "OP");
            this.appendValueInput("RIGHT").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("64-bit float binary operation.");
        }
    };

    Blockly.Blocks['spp_f64_relop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("f64");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["= (f64.eq)", "=="],
                    ["≠ (f64.ne)", "!="],
                    ["< (f64.lt)", "<"],
                    ["≤ (f64.le)", "<="],
                    ["> (f64.gt)", ">"],
                    ["≥ (f64.ge)", ">="]
                ]), "OP");
            this.appendValueInput("RIGHT").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "bool");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("f64 float comparison (returns bool).");
        }
    };

    Blockly.Blocks['spp_f64_unop'] = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["abs (f64.abs)", "ABS"],
                    ["neg (-x) (f64.neg)", "NEG"],
                    ["ceil (f64.ceil)", "CEIL"],
                    ["floor (f64.floor)", "FLOOR"],
                    ["trunc (f64.trunc)", "TRUNC"],
                    ["nearest (f64.nearest)", "NEAREST"],
                    ["sqrt (f64.sqrt)", "SQRT"]
                ]), "OP");
            this.appendValueInput("EXPR").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("f64 unary operation.");
        }
    };

    // Generic Math Blocks (backward compatible)
    Blockly.Blocks['spp_binary_op'] = {
        init: function() {
            this.appendValueInput("LEFT");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["+ (add)", "+"],
                    ["- (sub)", "-"],
                    ["× (mul)", "*"],
                    ["÷ (div)", "/"],
                    ["% (rem)", "%"],
                    ["AND (bitwise)", "AND"],
                    ["OR (bitwise)", "OR"],
                    ["XOR (bitwise)", "XOR"],
                    ["<< (shl)", "<<" ],
                    [">> (shr)", ">>"],
                    ["ROTL (rotl)", "ROTL"],
                    ["ROTR (rotr)", "ROTR"],
                    ["min (f32/f64)", "MIN"],
                    ["max (f32/f64)", "MAX"],
                    ["copysign", "COPYSIGN"],
                    ["= (eq)", "=="],
                    ["≠ (ne)", "!="],
                    ["< (lt)", "<"],
                    ["≤ (le)", "<="],
                    ["> (gt)", ">"],
                    ["≥ (ge)", ">="]
                ]), "OP")
                .appendField(new Blockly.FieldDropdown([
                    ["signed", "signed"],
                    ["unsigned", "unsigned"]
                ]), "SIGNEDNESS");
            this.appendValueInput("RIGHT");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Generic binary operation.");
        }
    };

    Blockly.Blocks['spp_unary_op'] = {
        init: function() {
            this.appendValueInput("EXPR")
                .appendField(new Blockly.FieldDropdown([
                    ["negate (-x)", "NEG"],
                    ["abs (absolute value)", "ABS"],
                    ["ceil (ceiling)", "CEIL"],
                    ["floor", "FLOOR"],
                    ["trunc (truncate float)", "TRUNC"],
                    ["nearest (round)", "NEAREST"],
                    ["sqrt (square root)", "SQRT"],
                    ["clz (count leading zeros)", "CLZ"],
                    ["ctz (count trailing zeros)", "CTZ"],
                    ["popcnt (count 1 bits)", "POPCNT"],
                    ["is zero? (eqz)", "EQZ"],
                    ["NOT (logical not)", "NOT"]
                ]), "OP");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Generic unary operation.");
        }
    };

    // -------------------------------------------------------------------------
    // 5. EXPLICIT CONVERSIONS & BITCASTS
    // -------------------------------------------------------------------------
    
    // Type-to-Type Conversions
    Blockly.Blocks['spp_f32_convert_i32'] = {
        init: function() {
            this.appendDummyInput().appendField("f32.convert_i32")
                .appendField(new Blockly.FieldDropdown([["signed", "signed"], ["unsigned", "unsigned"]]), "SIGNEDNESS");
            this.appendValueInput("VALUE").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Converts i32 integer to f32 float.");
        }
    };

    Blockly.Blocks['spp_f64_convert_i32'] = {
        init: function() {
            this.appendDummyInput().appendField("f64.convert_i32")
                .appendField(new Blockly.FieldDropdown([["signed", "signed"], ["unsigned", "unsigned"]]), "SIGNEDNESS");
            this.appendValueInput("VALUE").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Converts i32 integer to f64 float.");
        }
    };

    Blockly.Blocks['spp_f64_convert_i64'] = {
        init: function() {
            this.appendDummyInput().appendField("f64.convert_i64")
                .appendField(new Blockly.FieldDropdown([["signed", "signed"], ["unsigned", "unsigned"]]), "SIGNEDNESS");
            this.appendValueInput("VALUE").setCheck("i64");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Converts i64 integer to f64 float.");
        }
    };

    Blockly.Blocks['spp_i32_trunc_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("i32.trunc_f32")
                .appendField(new Blockly.FieldDropdown([["signed", "signed"], ["unsigned", "unsigned"]]), "SIGNEDNESS");
            this.appendValueInput("VALUE").setCheck("f32");
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Truncates f32 float to i32 integer.");
        }
    };

    Blockly.Blocks['spp_i32_trunc_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("i32.trunc_f64")
                .appendField(new Blockly.FieldDropdown([["signed", "signed"], ["unsigned", "unsigned"]]), "SIGNEDNESS");
            this.appendValueInput("VALUE").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Truncates f64 float to i32 integer.");
        }
    };

    Blockly.Blocks['spp_i64_trunc_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("i64.trunc_f32")
                .appendField(new Blockly.FieldDropdown([["signed", "signed"], ["unsigned", "unsigned"]]), "SIGNEDNESS");
            this.appendValueInput("VALUE").setCheck("f32");
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Truncates f32 float to i64 integer.");
        }
    };

    Blockly.Blocks['spp_i64_trunc_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("i64.trunc_f64")
                .appendField(new Blockly.FieldDropdown([["signed", "signed"], ["unsigned", "unsigned"]]), "SIGNEDNESS");
            this.appendValueInput("VALUE").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Truncates f64 float to i64 integer.");
        }
    };

    Blockly.Blocks['spp_f64_promote_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("f64.promote_f32");
            this.appendValueInput("VALUE").setCheck("f32");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Promotes f32 to double-precision f64.");
        }
    };

    Blockly.Blocks['spp_f32_demote_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("f32.demote_f64");
            this.appendValueInput("VALUE").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Demotes f64 to f32.");
        }
    };

    Blockly.Blocks['spp_i64_extend_i32'] = {
        init: function() {
            this.appendDummyInput().appendField("i64.extend_i32")
                .appendField(new Blockly.FieldDropdown([["signed", "signed"], ["unsigned", "unsigned"]]), "SIGNEDNESS");
            this.appendValueInput("VALUE").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Extends i32 to 64-bit i64.");
        }
    };

    Blockly.Blocks['spp_i32_wrap_i64'] = {
        init: function() {
            this.appendDummyInput().appendField("i32.wrap_i64");
            this.appendValueInput("VALUE").setCheck("i64");
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Wraps i64 discarding high 32 bits.");
        }
    };

    // Bitcast / Reinterpret Blocks
    Blockly.Blocks['spp_reinterpret_f32_as_i32'] = {
        init: function() {
            this.appendDummyInput().appendField("i32.reinterpret_f32");
            this.appendValueInput("VALUE").setCheck("f32");
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Reinterprets raw 32-bit float f32 as i32.");
        }
    };

    Blockly.Blocks['spp_reinterpret_i32_as_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("f32.reinterpret_i32");
            this.appendValueInput("VALUE").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Reinterprets raw 32-bit integer i32 as float f32.");
        }
    };

    Blockly.Blocks['spp_reinterpret_f64_as_i64'] = {
        init: function() {
            this.appendDummyInput().appendField("i64.reinterpret_f64");
            this.appendValueInput("VALUE").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Reinterprets raw 64-bit float f64 as i64.");
        }
    };

    Blockly.Blocks['spp_reinterpret_i64_as_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("f64.reinterpret_i64");
            this.appendValueInput("VALUE").setCheck("i64");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Reinterprets raw 64-bit integer i64 as float f64.");
        }
    };

    // Generic Fallback Convert & Reinterpret
    Blockly.Blocks['spp_convert'] = {
        init: function() {
            this.appendValueInput("VALUE").appendField("convert");
            this.appendDummyInput()
                .appendField("to")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["bool", "bool"],
                    ["string", "texto"],
                    ["buffer", "buffer"],
                    ["funcref", "funcref"],
                    ["externref", "externref"],
                    ["funcref (alias)", "função"]
                ]), "TARGET_TYPE")
                .appendField(new Blockly.FieldDropdown([
                    ["signed", "signed"],
                    ["unsigned", "unsigned"]
                ]), "SIGNEDNESS");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Generic type conversion.");
        }
    };

    Blockly.Blocks['spp_reinterpret'] = {
        init: function() {
            this.appendValueInput("VALUE").appendField("reinterpret bits as");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["i32 (reinterpret_f32)", "i32"],
                    ["i64 (reinterpret_f64)", "i64"],
                    ["f32 (reinterpret_i32)", "f32"],
                    ["f64 (reinterpret_i64)", "f64"],
                    ["v128", "v128"],
                    ["buffer", "buffer"],
                    ["funcref", "funcref"],
                    ["externref", "externref"]
                ]), "TARGET_TYPE");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Generic bitcast.");
        }
    };

    // -------------------------------------------------------------------------
    // 6. LINEAR MEMORY (TYPED & SAFE)
    // -------------------------------------------------------------------------
    
    // Type-specific Memory Loads
    Blockly.Blocks['spp_i32_load'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("i32.load")
                .appendField(new Blockly.FieldDropdown([
                    ["4 bytes (i32)", "i32"],
                    ["1 byte unsigned (i32.load8_u)", "i32_u8"],
                    ["1 byte signed (i32.load8_s)", "i32_s8"],
                    ["2 bytes unsigned (i32.load16_u)", "i32_u16"],
                    ["2 bytes signed (i32.load16_s)", "i32_s16"]
                ]), "WIDTH_TYPE")
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("address:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Reads i32 integer from linear memory.");
        }
    };

    Blockly.Blocks['spp_i64_load'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("i64.load")
                .appendField(new Blockly.FieldDropdown([
                    ["8 bytes (i64)", "i64"],
                    ["1 byte u (i64.load8_u)", "i64_u8"],
                    ["1 byte s (i64.load8_s)", "i64_s8"],
                    ["2 bytes u (i64.load16_u)", "i64_u16"],
                    ["2 bytes s (i64.load16_s)", "i64_s16"],
                    ["4 bytes u (i64.load32_u)", "i64_u32"],
                    ["4 bytes s (i64.load32_s)", "i64_s32"]
                ]), "WIDTH_TYPE")
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("address:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Reads i64 integer from linear memory.");
        }
    };

    Blockly.Blocks['spp_f32_load'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("f32.load (4 bytes)")
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("address:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Reads f32 float from linear memory.");
        }
    };

    Blockly.Blocks['spp_f64_load'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("f64.load (8 bytes)")
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("address:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Reads f64 float from linear memory.");
        }
    };

    // Type-specific Memory Stores
    Blockly.Blocks['spp_i32_store'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("i32.store")
                .appendField(new Blockly.FieldDropdown([
                    ["4 bytes (i32.store)", "auto"],
                    ["1 byte (i32.store8)", "u8"],
                    ["2 bytes (i32.store16)", "u16"]
                ]), "WIDTH")
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("VALUE").setCheck(["i32", "bool"]).appendField("i32 value:");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("address:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Writes i32 to linear memory (rejects floats!).");
        }
    };

    Blockly.Blocks['spp_i64_store'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("i64.store")
                .appendField(new Blockly.FieldDropdown([
                    ["8 bytes (i64.store)", "auto"],
                    ["1 byte (i64.store8)", "u8"],
                    ["2 bytes (i64.store16)", "u16"],
                    ["4 bytes (i64.store32)", "u32"]
                ]), "WIDTH")
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("VALUE").setCheck("i64").appendField("i64 value:");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("address:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Writes i64 to linear memory.");
        }
    };

    Blockly.Blocks['spp_f32_store'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("f32.store (4 bytes)")
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("VALUE").setCheck("f32").appendField("f32 value:");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("address:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Writes f32 float to linear memory (rejects int!).");
        }
    };

    Blockly.Blocks['spp_f64_store'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("f64.store (8 bytes)")
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("VALUE").setCheck("f64").appendField("f64 value:");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("address:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Writes f64 float to linear memory (rejects int!).");
        }
    };

    // Generic Memory Load / Store fallback
    Blockly.Blocks['spp_mem_load'] = {
        init: function() {
            this.appendValueInput("BUFFER")
                .appendField("load memory")
                .appendField(new Blockly.FieldDropdown([
                    ["i32 (4 bytes)", "i32"],
                    ["i32 u8 (1 byte)", "i32_u8"],
                    ["i32 s8 (1 signed byte)", "i32_s8"],
                    ["i32 u16 (2 bytes)", "i32_u16"],
                    ["i32 s16 (2 signed bytes)", "i32_s16"],
                    ["i64 (8 bytes)", "i64"],
                    ["i64 u8", "i64_u8"],
                    ["i64 s8", "i64_s8"],
                    ["i64 u16", "i64_u16"],
                    ["i64 s16", "i64_s16"],
                    ["i64 u32", "i64_u32"],
                    ["i64 s32", "i64_s32"],
                    ["f32 (4 bytes)", "f32"],
                    ["f64 (8 bytes)", "f64"]
                ]), "WIDTH_TYPE")
                .appendField("address:");
            this.appendValueInput("OFFSET").appendField("+ offset:");
            this.appendDummyInput()
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Generic load instruction.");
        }
    };

    Blockly.Blocks['spp_mem_store'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("store memory")
                .appendField(new Blockly.FieldDropdown([
                    ["full width", "auto"],
                    ["8 bits (store8)", "u8"],
                    ["16 bits (store16)", "u16"],
                    ["32 bits (store32)", "u32"]
                ]), "WIDTH")
                .appendField("value:");
            this.appendValueInput("BUFFER").appendField("address:");
            this.appendValueInput("OFFSET").appendField("+ offset:");
            this.appendDummyInput()
                .appendField("static offset:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Generic store instruction.");
        }
    };

    Blockly.Blocks['spp_mem_grow'] = {
        init: function() {
            this.appendValueInput("PAGES")
                .setCheck("i32")
                .appendField("memory.grow pages (+64KB each):");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Grows linear memory and returns previous size.");
        }
    };

    Blockly.Blocks['spp_mem_size'] = {
        init: function() {
            this.appendDummyInput().appendField("memory.size (current pages)");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Returns current number of 64KB pages.");
        }
    };

    Blockly.Blocks['spp_alloc_buffer'] = {
        init: function() {
            this.appendValueInput("SIZE").setCheck("i32").appendField("allocate buffer of");
            this.appendDummyInput().appendField("bytes");
            this.setOutput(true, "buffer");
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Allocates a buffer in linear memory.");
        }
    };

    // -------------------------------------------------------------------------
    // 7. FUNCTIONS AND TABLE (CALL / CALL_INDIRECT)
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_function_def'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("⚙️ func")
                .appendField(new Blockly.FieldTextInput("myFunction"), "NAME")
                .appendField("returns:")
                .appendField(new Blockly.FieldDropdown([
                    ["void", "void"],
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["funcref", "funcref"],
                    ["externref", "externref"],
                    ["bool", "bool"],
                    ["string", "texto"],
                    ["buffer", "buffer"]
                ]), "RETURN_TYPE");
            this.appendStatementInput("PARAMS").setCheck("spp_param").appendField("parameters:");
            this.appendStatementInput("BODY").appendField("body:");
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Function declaration in WebAssembly module.");
        }
    };

    Blockly.Blocks['spp_call_stmt'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("call")
                .appendField(new Blockly.FieldTextInput("myFunction"), "NAME");
            for (let i = 0; i < 16; i++) {
                this.appendValueInput(`ARG${i}`).appendField(`arg ${i + 1}:`).setAlign(Blockly.ALIGN_RIGHT);
            }
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Direct call instruction.");
        }
    };

    Blockly.Blocks['spp_call_expr'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("call")
                .appendField(new Blockly.FieldTextInput("myFunction"), "NAME");
            for (let i = 0; i < 16; i++) {
                this.appendValueInput(`ARG${i}`).appendField(i === 0 ? "(" : ",");
            }
            this.appendDummyInput().appendField(")");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Call instruction returning a value.");
        }
    };

    Blockly.Blocks['spp_function_ptr'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("funcref table index:")
                .appendField(new Blockly.FieldNumber(0), "INDEX");
            this.setOutput(true, "função");
            this.setColour(TYPE_COLORS.funcao);
            this.setTooltip("Index in function table for call_indirect.");
        }
    };

    Blockly.Blocks['spp_call_indirect'] = {
        init: function() {
            this.appendValueInput("FUNC_INDEX")
                .setCheck(["função", "i32"])
                .appendField("call_indirect table index:");
            this.appendDummyInput()
                .appendField("returns:")
                .appendField(new Blockly.FieldDropdown([
                    ["void", "void"],
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["funcref", "funcref"],
                    ["externref", "externref"],
                    ["bool", "bool"],
                    ["texto", "texto"],
                    ["buffer", "buffer"]
                ]), "RETURN_TYPE")
                .appendField("param types:")
                .appendField(new Blockly.FieldTextInput("i32"), "PARAM_TYPES");
            for (let i = 0; i < 16; i++) {
                this.appendValueInput(`ARG${i}`).appendField(`arg ${i + 1}:`).setAlign(Blockly.ALIGN_RIGHT);
            }
            this.setOutput(true);
            this.setColour(TYPE_COLORS.funcao);
            this.setTooltip("call_indirect instruction through funcref table.");
        }
    };

    // -------------------------------------------------------------------------
    // 8. HOST I/O & TEXTO
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_print'] = {
        init: function() {
            this.appendValueInput("VALUE").appendField("📟 host.print");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.texto);
            this.setTooltip("Prints value to execution terminal.");
        }
    };

    Blockly.Blocks['spp_string_concat'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("texto").appendField("join");
            this.appendValueInput("RIGHT").setCheck("texto").appendField("with");
            this.setInputsInline(true);
            this.setOutput(true, "texto");
            this.setColour(TYPE_COLORS.texto);
            this.setTooltip("Concatenates two strings on the heap.");
        }
    };

    // -------------------------------------------------------------------------
    // 9. WASM 2.0: EXTENSION OPCODES & SATURATION
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_sign_extend'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("sign_extend")
                .appendField(new Blockly.FieldDropdown([
                    ["i32.extend8_s (8->32 bits)", "8_i32"],
                    ["i32.extend16_s (16->32 bits)", "16_i32"],
                    ["i64.extend8_s (8->64 bits)", "8_i64"],
                    ["i64.extend16_s (16->64 bits)", "16_i64"],
                    ["i64.extend32_s (32->64 bits)", "32_i64"]
                ]), "MODE");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Sign-extension operators.");
        }
    };

    Blockly.Blocks['spp_trunc_sat'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("trunc_sat")
                .appendField(new Blockly.FieldDropdown([
                    ["i32.trunc_sat_f32_s", "i32_f32_s"],
                    ["i32.trunc_sat_f32_u", "i32_f32_u"],
                    ["i32.trunc_sat_f64_s", "i32_f64_s"],
                    ["i32.trunc_sat_f64_u", "i32_f64_u"],
                    ["i64.trunc_sat_f32_s", "i64_f32_s"],
                    ["i64.trunc_sat_f32_u", "i64_f32_u"],
                    ["i64.trunc_sat_f64_s", "i64_f64_s"],
                    ["i64.trunc_sat_f64_u", "i64_f64_u"]
                ]), "MODE");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Saturating truncation without trap on overflow/NaN (Non-trapping float-to-int).");
        }
    };

    // -------------------------------------------------------------------------
    // 10. WASM 2.0: BULK MEMORY
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_mem_copy'] = {
        init: function() {
            this.appendValueInput("DST").setCheck("i32").appendField("memory.copy dest offset:");
            this.appendValueInput("SRC").setCheck("i32").appendField("src offset:");
            this.appendValueInput("LEN").setCheck("i32").appendField("length bytes:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Copies memory block (memory.copy).");
        }
    };

    Blockly.Blocks['spp_mem_fill'] = {
        init: function() {
            this.appendValueInput("DST").setCheck("i32").appendField("memory.fill dest offset:");
            this.appendValueInput("VAL").setCheck("i32").appendField("byte value:");
            this.appendValueInput("LEN").setCheck("i32").appendField("length bytes:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Fills memory block with byte (memory.fill).");
        }
    };

    Blockly.Blocks['spp_mem_init'] = {
        init: function() {
            this.appendDummyInput().appendField("memory.init segment:").appendField(new Blockly.FieldNumber(0), "SEGMENT");
            this.appendValueInput("DST").setCheck("i32").appendField("dest offset:");
            this.appendValueInput("SRC").setCheck("i32").appendField("segment offset:");
            this.appendValueInput("LEN").setCheck("i32").appendField("length bytes:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Initializes memory from passive data segment.");
        }
    };

    Blockly.Blocks['spp_data_drop'] = {
        init: function() {
            this.appendDummyInput().appendField("data.drop segment:").appendField(new Blockly.FieldNumber(0), "SEGMENT");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Drops passive data segment.");
        }
    };

    // -------------------------------------------------------------------------
    // 11. WASM 2.0: REFERENCE TYPES & MULTI-TABLE
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_table_declare'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("🗄️ Table")
                .appendField(new Blockly.FieldTextInput("table0"), "NAME")
                .appendField("type:")
                .appendField(new Blockly.FieldDropdown([
                    ["funcref", "funcref"],
                    ["externref", "externref"]
                ]), "TYPE")
                .appendField("min:")
                .appendField(new Blockly.FieldNumber(1), "MIN")
                .appendField("max:")
                .appendField(new Blockly.FieldTextInput(""), "MAX");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Declares a WebAssembly 2.0 table.");
        }
    };

    Blockly.Blocks['spp_ref_null'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("ref.null")
                .appendField(new Blockly.FieldDropdown([
                    ["funcref", "funcref"],
                    ["externref", "externref"]
                ]), "TYPE");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Null reference.");
        }
    };

    Blockly.Blocks['spp_ref_is_null'] = {
        init: function() {
            this.appendValueInput("REF").appendField("ref.is_null");
            this.setOutput(true, "bool");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Tests if reference is null.");
        }
    };

    Blockly.Blocks['spp_ref_func'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("ref.func")
                .appendField(new Blockly.FieldTextInput("my_function"), "NAME");
            this.setOutput(true, "funcref");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Gets reference to function.");
        }
    };

    Blockly.Blocks['spp_table_get'] = {
        init: function() {
            this.appendDummyInput().appendField("table.get table:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("INDEX").setCheck("i32").appendField("index:");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Gets element from a table.");
        }
    };

    Blockly.Blocks['spp_table_set'] = {
        init: function() {
            this.appendDummyInput().appendField("table.set table:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("INDEX").setCheck("i32").appendField("index:");
            this.appendValueInput("VALUE").appendField("value:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Sets element in a table.");
        }
    };

    Blockly.Blocks['spp_table_size'] = {
        init: function() {
            this.appendDummyInput().appendField("table.size table:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Returns current table size.");
        }
    };

    Blockly.Blocks['spp_table_grow'] = {
        init: function() {
            this.appendDummyInput().appendField("table.grow table:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("INIT_VAL").appendField("initial val:");
            this.appendValueInput("DELTA").setCheck("i32").appendField("extra elements:");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Grows table size.");
        }
    };

    Blockly.Blocks['spp_table_fill'] = {
        init: function() {
            this.appendDummyInput().appendField("table.fill table:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("START").setCheck("i32").appendField("start:");
            this.appendValueInput("VALUE").appendField("value:");
            this.appendValueInput("COUNT").setCheck("i32").appendField("count:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Fills range in table.");
        }
    };

    Blockly.Blocks['spp_table_copy'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("table.copy dest table:")
                .appendField(new Blockly.FieldNumber(0), "DST_TABLE")
                .appendField("src table:")
                .appendField(new Blockly.FieldNumber(0), "SRC_TABLE");
            this.appendValueInput("DST").setCheck("i32").appendField("dest offset:");
            this.appendValueInput("SRC").setCheck("i32").appendField("src offset:");
            this.appendValueInput("COUNT").setCheck("i32").appendField("count:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Copies elements between tables.");
        }
    };

    Blockly.Blocks['spp_table_init'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("table.init table:")
                .appendField(new Blockly.FieldNumber(0), "TABLE_IDX")
                .appendField("elem segment:")
                .appendField(new Blockly.FieldNumber(0), "ELEM_IDX");
            this.appendValueInput("DST").setCheck("i32").appendField("dest offset:");
            this.appendValueInput("SRC").setCheck("i32").appendField("elem offset:");
            this.appendValueInput("COUNT").setCheck("i32").appendField("count:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Initializes table from passive element.");
        }
    };

    Blockly.Blocks['spp_elem_drop'] = {
        init: function() {
            this.appendDummyInput().appendField("elem.drop element:").appendField(new Blockly.FieldNumber(0), "ELEM_IDX");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Drops passive table element segment.");
        }
    };

    // -------------------------------------------------------------------------
    // 12. WASM 2.0: TAIL CALLS
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_return_call'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("⏩ return_call")
                .appendField(new Blockly.FieldTextInput("my_function"), "NAME");
            for (let i = 0; i < 16; i++) {
                this.appendValueInput(`ARG${i}`).appendField(`arg ${i + 1}:`).setAlign(Blockly.ALIGN_RIGHT);
            }
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Direct recursive tail call.");
        }
    };

    Blockly.Blocks['spp_return_call_indirect'] = {
        init: function() {
            this.appendDummyInput().appendField("⏩ return_call_indirect table:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("FUNC_INDEX").appendField("index in table:");
            for (let i = 0; i < 16; i++) {
                this.appendValueInput(`ARG${i}`).appendField(`arg ${i + 1}:`).setAlign(Blockly.ALIGN_RIGHT);
            }
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Indirect recursive tail call.");
        }
    };

    // -------------------------------------------------------------------------
    // 13. WASM 2.0: FIXED-WIDTH SIMD 128 (v128)
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_v128_const'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("v128.const (16 hex bytes):")
                .appendField(new Blockly.FieldTextInput("00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00"), "VALUE");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Constant 128-bit SIMD vector.");
        }
    };

    Blockly.Blocks['spp_v128_splat'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("v128.splat")
                .appendField(new Blockly.FieldDropdown([
                    ["i8x16.splat", "i8x16"],
                    ["i16x8.splat", "i16x8"],
                    ["i32x4.splat", "i32x4"],
                    ["i64x2.splat", "i64x2"],
                    ["f32x4.splat", "f32x4"],
                    ["f64x2.splat", "f64x2"]
                ]), "LANE_TYPE")
                .appendField("scalar value:");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Splat scalar into all SIMD vector lanes.");
        }
    };

    Blockly.Blocks['spp_v128_extract_lane'] = {
        init: function() {
            this.appendValueInput("VECTOR")
                .setCheck("v128")
                .appendField("extract lane")
                .appendField(new Blockly.FieldDropdown([
                    ["i8x16.extract_lane_s", "i8x16_s"],
                    ["i8x16.extract_lane_u", "i8x16_u"],
                    ["i8x16.extract_lane", "i8x16"],
                    ["i16x8.extract_lane_s", "i16x8_s"],
                    ["i16x8.extract_lane_u", "i16x8_u"],
                    ["i16x8.extract_lane", "i16x8"],
                    ["i32x4.extract_lane", "i32x4"],
                    ["i64x2.extract_lane", "i64x2"],
                    ["f32x4.extract_lane", "f32x4"],
                    ["f64x2.extract_lane", "f64x2"]
                ]), "LANE_TYPE")
                .appendField("lane index:")
                .appendField(new Blockly.FieldNumber(0), "LANE_IDX");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Extracts scalar from specific SIMD vector lane.");
        }
    };

    Blockly.Blocks['spp_v128_replace_lane'] = {
        init: function() {
            this.appendValueInput("VECTOR")
                .setCheck("v128")
                .appendField("replace lane")
                .appendField(new Blockly.FieldDropdown([
                    ["i8x16.replace_lane", "i8x16"],
                    ["i16x8.replace_lane", "i16x8"],
                    ["i32x4.replace_lane", "i32x4"],
                    ["i64x2.replace_lane", "i64x2"],
                    ["f32x4.replace_lane", "f32x4"],
                    ["f64x2.replace_lane", "f64x2"]
                ]), "LANE_TYPE")
                .appendField("lane index:")
                .appendField(new Blockly.FieldNumber(0), "LANE_IDX");
            this.appendValueInput("VALUE").appendField("new value:");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Replaces element in SIMD vector lane.");
        }
    };

    Blockly.Blocks['spp_v128_binop'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("v128").appendField("SIMD op");
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("i32x4.add"), "OP");
            this.appendValueInput("RIGHT").setCheck("v128");
            this.setInputsInline(true);
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("SIMD binary vector operation.");
        }
    };

    Blockly.Blocks['spp_v128_bitselect'] = {
        init: function() {
            this.appendValueInput("V1").setCheck("v128").appendField("v128.bitselect v1:");
            this.appendValueInput("V2").setCheck("v128").appendField("v2:");
            this.appendValueInput("MASK").setCheck("v128").appendField("mask:");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Bitwise select with SIMD mask.");
        }
    };

    Blockly.Blocks['spp_v128_load'] = {
        init: function() {
            this.appendValueInput("OFFSET").setCheck("i32").appendField("v128.load offset:");
            this.appendDummyInput().appendField("static offset:").appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Loads 128-bit vector from memory.");
        }
    };

    Blockly.Blocks['spp_v128_store'] = {
        init: function() {
            this.appendValueInput("VALUE").setCheck("v128").appendField("v128.store vector:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("offset:");
            this.appendDummyInput().appendField("static offset:").appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Stores 128-bit vector to memory.");
        }
    };

    Blockly.Blocks['spp_inline_wat'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("⚡ Inline WAT")
                .appendField(new Blockly.FieldDropdown([
                    ["void", "void"],
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"]
                ]), "TYPE");
            this.appendDummyInput()
                .appendField(new Blockly.FieldTextInput("nop"), "CODE");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#6c5ce7');
            this.setTooltip("WebAssembly Text (WAT) instructions executed inline.");
        }
    };
}

