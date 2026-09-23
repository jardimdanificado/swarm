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
                    ["texto", "texto"],
                    ["buffer", "buffer"],
                    ["função", "função"]
                ]), "TYPE");
            this.setPreviousStatement(true, "spp_param");
            this.setNextStatement(true, "spp_param");
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Define um parâmetro tipado.");
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
        { id: 'spp_param_func', type: 'função', color: TYPE_COLORS.funcao, label: 'função' }
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
                this.setTooltip(`Parâmetro do tipo ${pt.label}`);
            }
        };
    }

    Blockly.Blocks['spp_import_func'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📥 importar func")
                .appendField(new Blockly.FieldTextInput("sin"), "NAME")
                .appendField("de [")
                .appendField(new Blockly.FieldTextInput("env"), "MODULE")
                .appendField("] como:")
                .appendField(new Blockly.FieldTextInput("math_sin"), "ALIAS");
            this.appendDummyInput()
                .appendField("retorno:")
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
            this.appendStatementInput("PARAMS").setCheck("spp_param").appendField("parâmetros:");
            this.setColour('#6366f1');
            this.setTooltip("Importa uma função externa de outro módulo Wasm ou do Host.");
        }
    };

    Blockly.Blocks['spp_import_global'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📥 importar global")
                .appendField(new Blockly.FieldTextInput("MY_CONST"), "NAME")
                .appendField("de [")
                .appendField(new Blockly.FieldTextInput("env"), "MODULE")
                .appendField("] como:")
                .appendField(new Blockly.FieldTextInput("ext_const"), "ALIAS");
            this.appendDummyInput()
                .appendField("tipo:")
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
                    ["imutável (const)", "const"],
                    ["mutável", "mut"]
                ]), "MUTABLE");
            this.setColour('#6366f1');
            this.setTooltip("Importa uma variável global do host/módulo externo.");
        }
    };

    Blockly.Blocks['spp_export_decl'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📤 exportar")
                .appendField(new Blockly.FieldDropdown([
                    ["função", "func"],
                    ["global", "global"],
                    ["memória (memory)", "mem"],
                    ["tabela (table)", "table"]
                ]), "KIND")
                .appendField("[")
                .appendField(new Blockly.FieldTextInput("minhaFuncao"), "INTERNAL_NAME")
                .appendField("] como:")
                .appendField(new Blockly.FieldTextInput("exportedName"), "EXPORT_NAME");
            this.setColour('#8b5cf6');
            this.setTooltip("Exporta elemento do módulo Wasm para o host.");
        }
    };

    Blockly.Blocks['spp_start_func'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("⚡ start function:")
                .appendField(new Blockly.FieldTextInput("minhaFuncao"), "FUNC_NAME");
            this.setColour('#ec4899');
            this.setTooltip("Define a start function (0x08) executada automaticamente na instanciação.");
        }
    };

    // -------------------------------------------------------------------------
    // 2. CONTROLE ESTRUTURADO (WASM 1.0)
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_start'] = {
        init: function() {
            this.appendDummyInput().appendField("🚀 quando iniciar (start)");
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Ponto de entrada de execução principal.");
        }
    };

    Blockly.Blocks['spp_block'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("📦 bloco (block)")
                .appendField("label:")
                .appendField(new Blockly.FieldNumber(0), "LABEL");
            this.appendStatementInput("BODY").appendField("corpo:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Estrutura block do WebAssembly 1.0.");
        }
    };

    Blockly.Blocks['spp_loop'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("🔄 laço (loop)")
                .appendField("label:")
                .appendField(new Blockly.FieldNumber(0), "LABEL");
            this.appendStatementInput("BODY").appendField("corpo:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Estrutura loop do WebAssembly 1.0.");
        }
    };

    Blockly.Blocks['spp_if'] = {
        init: function() {
            this.appendValueInput("COND").setCheck(["bool", "i32"]).appendField("se (if)");
            this.appendStatementInput("THEN").appendField("então");
            this.appendStatementInput("ELSE").appendField("senão");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Instrução if/else do WebAssembly 1.0.");
        }
    };

    Blockly.Blocks['spp_repeat'] = {
        init: function() {
            this.appendValueInput("TIMES").setCheck(["i32", "i64"]).appendField("repita");
            this.appendDummyInput().appendField("vezes");
            this.appendStatementInput("DO").appendField("faça");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Macro de laço que repete N vezes.");
        }
    };

    Blockly.Blocks['spp_while'] = {
        init: function() {
            this.appendValueInput("COND").setCheck(["bool", "i32"]).appendField("enquanto");
            this.appendStatementInput("DO").appendField("faça");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Laço while estruturado.");
        }
    };

    Blockly.Blocks['spp_br'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("desviar (br) nível:")
                .appendField(new Blockly.FieldNumber(0, 0, 32), "DEPTH");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Salto incondicional br para bloco/loop pai.");
        }
    };

    Blockly.Blocks['spp_br_if'] = {
        init: function() {
            this.appendValueInput("COND")
                .setCheck(["bool", "i32"])
                .appendField("desviar se (br_if)");
            this.appendDummyInput()
                .appendField("nível:")
                .appendField(new Blockly.FieldNumber(0, 0, 32), "DEPTH");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Salto condicional br_if para bloco/loop pai.");
        }
    };

    Blockly.Blocks['spp_br_table'] = {
        init: function() {
            this.appendValueInput("INDEX")
                .setCheck("i32")
                .appendField("tabela de salto (br_table) índice:");
            this.appendDummyInput()
                .appendField("alvos:")
                .appendField(new Blockly.FieldTextInput("0, 1"), "TARGETS")
                .appendField("padrão:")
                .appendField(new Blockly.FieldNumber(0), "DEFAULT");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Desvio por tabela de índices br_table.");
        }
    };

    Blockly.Blocks['spp_select'] = {
        init: function() {
            this.appendValueInput("TRUE_VAL").appendField("selecionar (select)");
            this.appendValueInput("FALSE_VAL").appendField("senão");
            this.appendValueInput("COND").setCheck(["bool", "i32"]).appendField("se cond:");
            this.setOutput(true);
            this.setInputsInline(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Instrução ternária select do WebAssembly.");
        }
    };

    Blockly.Blocks['spp_return'] = {
        init: function() {
            this.appendValueInput("VALUE").appendField("retorne (return)");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Instrução return da função atual.");
        }
    };

    Blockly.Blocks['spp_drop'] = {
        init: function() {
            this.appendValueInput("EXPR").appendField("descartar (drop)");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Descarta o valor do topo da pilha de operandos.");
        }
    };

    Blockly.Blocks['spp_nop'] = {
        init: function() {
            this.appendDummyInput().appendField("nop (sem operação)");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Instrução nop do WebAssembly.");
        }
    };

    Blockly.Blocks['spp_unreachable'] = {
        init: function() {
            this.appendDummyInput().appendField("⚠️ unreachable (trap fatal)");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour('#dc2626');
            this.setTooltip("Dispara um trap de execução fatal unreachable.");
        }
    };

    // -------------------------------------------------------------------------
    // 3. VARIÁVEIS, GLOBAIS E CONSTANTES (TIPAGEM ESTRITA)
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
                    ["texto", "texto"],
                    ["buffer", "buffer"],
                    ["função", "função"]
                ]), "TYPE")
                .appendField(new Blockly.FieldTextInput("x"), "NAME")
                .appendField("=");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Declara uma variável local.");
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
                this.setTooltip(`Declara uma variável local ${dt.label} (bloqueia tipos incompatíveis).`);
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
                    ["mutável", "mut"],
                    ["imutável (const)", "const"]
                ]), "MUTABLE")
                .appendField("=");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Declara uma variável global.");
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
                        ["mutável", "mut"],
                        ["imutável (const)", "const"]
                    ]), "MUTABLE")
                    .appendField("=");
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setColour(gt.color);
                this.setTooltip(`Declara global ${gt.label}.`);
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
            this.setTooltip("Atribuição local.set ou global.set.");
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
            this.setTooltip("Atribui e retorna o valor (local.tee).");
        }
    };

    Blockly.Blocks['spp_get'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("get")
                .appendField(new Blockly.FieldTextInput("x"), "NAME");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Lê valor local.get ou global.get.");
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
                this.setTooltip(`Lê variável garantindo tipo ${tg.type}.`);
            }
        };
    }

    // Literals / Constants
    Blockly.Blocks['spp_const_i32'] = {
        init: function() {
            this.appendDummyInput().appendField("i32:").appendField(new Blockly.FieldNumber(0), "VALUE");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Constante inteira 32 bits (i32.const).");
        }
    };

    Blockly.Blocks['spp_const_i64'] = {
        init: function() {
            this.appendDummyInput().appendField("i64:").appendField(new Blockly.FieldTextInput("0"), "VALUE");
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Constante inteira 64 bits (i64.const).");
        }
    };

    Blockly.Blocks['spp_const_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("f32:").appendField(new Blockly.FieldNumber(0.0), "VALUE");
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Constante ponto flutuante 32 bits (f32.const).");
        }
    };

    Blockly.Blocks['spp_const_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("f64:").appendField(new Blockly.FieldNumber(0.0), "VALUE");
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Constante ponto flutuante 64 bits (f64.const).");
        }
    };

    Blockly.Blocks['spp_const_bool'] = {
        init: function() {
            this.appendDummyInput().appendField(new Blockly.FieldDropdown([
                ["verdadeiro (true)", "true"],
                ["falso (false)", "false"]
            ]), "VALUE");
            this.setOutput(true, "bool");
            this.setColour(TYPE_COLORS.bool);
            this.setTooltip("Valor booleano.");
        }
    };

    Blockly.Blocks['spp_const_text'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("texto: \"")
                .appendField(new Blockly.FieldTextInput("Olá Wasm!"), "VALUE")
                .appendField("\"");
            this.setOutput(true, "texto");
            this.setColour(TYPE_COLORS.texto);
            this.setTooltip("String literal.");
        }
    };

    // -------------------------------------------------------------------------
    // 4. OPERAÇÕES ESPECÍFICAS POR TIPO (ZERO CONFUSÃO INT/FLOAT)
    // -------------------------------------------------------------------------
    
    // --- i32 Operações ---
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
            this.setTooltip("Operação binária inteira i32 (rejeita floats!).");
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
            this.setTooltip("Comparação inteira i32 -> bool.");
        }
    };

    Blockly.Blocks['spp_i32_unop'] = {
        init: function() {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["i32.clz (zeros à esquerda)", "CLZ"],
                    ["i32.ctz (zeros à direita)", "CTZ"],
                    ["i32.popcnt (contar bits 1)", "POPCNT"],
                    ["i32.eqz (é zero?)", "EQZ"]
                ]), "OP");
            this.appendValueInput("EXPR").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Operação unária i32.");
        }
    };

    // --- i64 Operações ---
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
            this.setTooltip("Operação binária inteira i64.");
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
            this.setTooltip("Comparação inteira i64 -> bool.");
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
            this.setTooltip("Operação unária i64.");
        }
    };

    // --- f32 Operações ---
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
            this.setTooltip("Operação binária de ponto flutuante f32 (rejeita inteiros!).");
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
            this.setTooltip("Comparação ponto flutuante f32 -> bool.");
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
            this.setTooltip("Operação unária f32.");
        }
    };

    // --- f64 Operações ---
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
            this.setTooltip("Operação binária de ponto flutuante f64.");
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
            this.setTooltip("Comparação ponto flutuante f64 -> bool.");
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
            this.setTooltip("Operação unária f64.");
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
            this.setTooltip("Operação binária genérica.");
        }
    };

    Blockly.Blocks['spp_unary_op'] = {
        init: function() {
            this.appendValueInput("EXPR")
                .appendField(new Blockly.FieldDropdown([
                    ["negativo (-x)", "NEG"],
                    ["abs (valor absoluto)", "ABS"],
                    ["ceil (teto)", "CEIL"],
                    ["floor (piso)", "FLOOR"],
                    ["trunc (truncar float)", "TRUNC"],
                    ["nearest (arredondar)", "NEAREST"],
                    ["sqrt (raiz quadrada)", "SQRT"],
                    ["clz (contar zeros à esquerda)", "CLZ"],
                    ["ctz (contar zeros à direita)", "CTZ"],
                    ["popcnt (contar bits 1)", "POPCNT"],
                    ["é zero? (eqz)", "EQZ"],
                    ["NOT (não lógico)", "NOT"]
                ]), "OP");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Operação unária genérica.");
        }
    };

    // -------------------------------------------------------------------------
    // 5. CONVERSÕES EXPLÍCITAS & BITCASTS ESPECÍFICOS
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
            this.setTooltip("Converte inteiro i32 em float f32.");
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
            this.setTooltip("Converte inteiro i32 em float f64.");
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
            this.setTooltip("Converte inteiro i64 em float f64.");
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
            this.setTooltip("Trunca float f32 para inteiro i32.");
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
            this.setTooltip("Trunca float f64 para inteiro i32.");
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
            this.setTooltip("Trunca float f32 para inteiro i64.");
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
            this.setTooltip("Trunca float f64 para inteiro i64.");
        }
    };

    Blockly.Blocks['spp_f64_promote_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("f64.promote_f32");
            this.appendValueInput("VALUE").setCheck("f32");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Promove f32 para f64 com precisão dupla.");
        }
    };

    Blockly.Blocks['spp_f32_demote_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("f32.demote_f64");
            this.appendValueInput("VALUE").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Rebaixa f64 para f32.");
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
            this.setTooltip("Estende i32 para i64 (64 bits).");
        }
    };

    Blockly.Blocks['spp_i32_wrap_i64'] = {
        init: function() {
            this.appendDummyInput().appendField("i32.wrap_i64");
            this.appendValueInput("VALUE").setCheck("i64");
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Envolve (wrap) i64 descartando os 32 bits mais altos.");
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
            this.setTooltip("Reinterpreta os 32 bits brutos de um float f32 como i32.");
        }
    };

    Blockly.Blocks['spp_reinterpret_i32_as_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("f32.reinterpret_i32");
            this.appendValueInput("VALUE").setCheck(["i32", "bool"]);
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Reinterpreta os 32 bits brutos de um i32 como float f32.");
        }
    };

    Blockly.Blocks['spp_reinterpret_f64_as_i64'] = {
        init: function() {
            this.appendDummyInput().appendField("i64.reinterpret_f64");
            this.appendValueInput("VALUE").setCheck("f64");
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Reinterpreta os 64 bits brutos de um float f64 como i64.");
        }
    };

    Blockly.Blocks['spp_reinterpret_i64_as_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("f64.reinterpret_i64");
            this.appendValueInput("VALUE").setCheck("i64");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Reinterpreta os 64 bits brutos de um i64 como float f64.");
        }
    };

    // Generic Fallback Convert & Reinterpret
    Blockly.Blocks['spp_convert'] = {
        init: function() {
            this.appendValueInput("VALUE").appendField("converter");
            this.appendDummyInput()
                .appendField("para")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["bool", "bool"],
                    ["texto", "texto"]
                ]), "TARGET_TYPE")
                .appendField(new Blockly.FieldDropdown([
                    ["signed", "signed"],
                    ["unsigned", "unsigned"]
                ]), "SIGNEDNESS");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Conversão genérica de tipos.");
        }
    };

    Blockly.Blocks['spp_reinterpret'] = {
        init: function() {
            this.appendValueInput("VALUE").appendField("reinterpretar bits como");
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown([
                    ["i32 (reinterpret_f32)", "i32"],
                    ["i64 (reinterpret_f64)", "i64"],
                    ["f32 (reinterpret_i32)", "f32"],
                    ["f64 (reinterpret_i64)", "f64"]
                ]), "TARGET_TYPE");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.math);
            this.setTooltip("Bitcast genérico.");
        }
    };

    // -------------------------------------------------------------------------
    // 6. MEMÓRIA LINEAR (TIPADA & SEGURA)
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
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("endereço:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Lê inteiro i32 da memória linear.");
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
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("endereço:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Lê inteiro i64 da memória linear.");
        }
    };

    Blockly.Blocks['spp_f32_load'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("f32.load (4 bytes)")
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("endereço:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Lê float f32 da memória linear.");
        }
    };

    Blockly.Blocks['spp_f64_load'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("f64.load (8 bytes)")
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("endereço:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Lê float f64 da memória linear.");
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
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("VALUE").setCheck(["i32", "bool"]).appendField("valor i32:");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("endereço:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i32);
            this.setTooltip("Escreve i32 na memória linear (rejeita floats!).");
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
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("VALUE").setCheck("i64").appendField("valor i64:");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("endereço:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.i64);
            this.setTooltip("Escreve i64 na memória linear.");
        }
    };

    Blockly.Blocks['spp_f32_store'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("f32.store (4 bytes)")
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("VALUE").setCheck("f32").appendField("valor f32:");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("endereço:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.f32);
            this.setTooltip("Escreve float f32 na memória linear (rejeita int!).");
        }
    };

    Blockly.Blocks['spp_f64_store'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("f64.store (8 bytes)")
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.appendValueInput("VALUE").setCheck("f64").appendField("valor f64:");
            this.appendValueInput("BUFFER").setCheck(["buffer", "i32"]).appendField("endereço:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("+ offset:");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.f64);
            this.setTooltip("Escreve float f64 na memória linear (rejeita int!).");
        }
    };

    // Generic Memory Load / Store fallback
    Blockly.Blocks['spp_mem_load'] = {
        init: function() {
            this.appendValueInput("BUFFER")
                .appendField("leia memória")
                .appendField(new Blockly.FieldDropdown([
                    ["i32 (4 bytes)", "i32"],
                    ["i32 u8 (1 byte)", "i32_u8"],
                    ["i32 s8 (1 byte assinado)", "i32_s8"],
                    ["i32 u16 (2 bytes)", "i32_u16"],
                    ["i32 s16 (2 bytes assinado)", "i32_s16"],
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
                .appendField("endereço:");
            this.appendValueInput("OFFSET").appendField("+ offset:");
            this.appendDummyInput()
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Instrução load genérica.");
        }
    };

    Blockly.Blocks['spp_mem_store'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("escreva memória")
                .appendField(new Blockly.FieldDropdown([
                    ["completo pelo tipo", "auto"],
                    ["8 bits (store8)", "u8"],
                    ["16 bits (store16)", "u16"],
                    ["32 bits (store32)", "u32"]
                ]), "WIDTH")
                .appendField("valor:");
            this.appendValueInput("BUFFER").appendField("endereço:");
            this.appendValueInput("OFFSET").appendField("+ offset:");
            this.appendDummyInput()
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setInputsInline(true);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Instrução store genérica.");
        }
    };

    Blockly.Blocks['spp_mem_grow'] = {
        init: function() {
            this.appendValueInput("PAGES")
                .setCheck("i32")
                .appendField("memory.grow páginas (+64KB cada):");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Expande a memória linear e retorna tamanho anterior.");
        }
    };

    Blockly.Blocks['spp_mem_size'] = {
        init: function() {
            this.appendDummyInput().appendField("memory.size (páginas atuais)");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Retorna quantidade atual de páginas de 64KB.");
        }
    };

    Blockly.Blocks['spp_alloc_buffer'] = {
        init: function() {
            this.appendValueInput("SIZE").setCheck("i32").appendField("aloque buffer de");
            this.appendDummyInput().appendField("bytes");
            this.setOutput(true, "buffer");
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Aloca um buffer na memória linear.");
        }
    };

    // -------------------------------------------------------------------------
    // 7. FUNÇÕES E TABELA (CALL / CALL_INDIRECT)
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_function_def'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("⚙️ func")
                .appendField(new Blockly.FieldTextInput("minhaFuncao"), "NAME")
                .appendField("retorno:")
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
                ]), "RETURN_TYPE");
            this.appendStatementInput("PARAMS").setCheck("spp_param").appendField("parâmetros:");
            this.appendStatementInput("BODY").appendField("corpo:");
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Declaração de função no módulo WebAssembly.");
        }
    };

    Blockly.Blocks['spp_call_stmt'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("call")
                .appendField(new Blockly.FieldTextInput("minhaFuncao"), "NAME");
            this.appendValueInput("ARG0").appendField("arg 1:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG1").appendField("arg 2:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG2").appendField("arg 3:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG3").appendField("arg 4:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG4").appendField("arg 5:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG5").appendField("arg 6:").setAlign(Blockly.ALIGN_RIGHT);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Instrução call direta.");
        }
    };

    Blockly.Blocks['spp_call_expr'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("call")
                .appendField(new Blockly.FieldTextInput("minhaFuncao"), "NAME");
            this.appendValueInput("ARG0").appendField("(");
            this.appendValueInput("ARG1").appendField(",");
            this.appendValueInput("ARG2").appendField(",");
            this.appendValueInput("ARG3").appendField(",");
            this.appendValueInput("ARG4").appendField(",");
            this.appendValueInput("ARG5").appendField(",");
            this.appendDummyInput().appendField(")");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Instrução call com retorno de valor.");
        }
    };

    Blockly.Blocks['spp_function_ptr'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("tabela funcref índice:")
                .appendField(new Blockly.FieldNumber(0), "INDEX");
            this.setOutput(true, "função");
            this.setColour(TYPE_COLORS.funcao);
            this.setTooltip("Índice na tabela de funções para call_indirect.");
        }
    };

    Blockly.Blocks['spp_call_indirect'] = {
        init: function() {
            this.appendValueInput("FUNC_INDEX")
                .setCheck(["função", "i32"])
                .appendField("call_indirect tabela índice:");
            this.appendDummyInput()
                .appendField("retorno:")
                .appendField(new Blockly.FieldDropdown([
                    ["void", "void"],
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["v128", "v128"],
                    ["funcref", "funcref"],
                    ["externref", "externref"]
                ]), "RETURN_TYPE")
                .appendField("tipos params:")
                .appendField(new Blockly.FieldTextInput("i32"), "PARAM_TYPES");
            this.appendValueInput("ARG0").appendField("arg 1:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG1").appendField("arg 2:").setAlign(Blockly.ALIGN_RIGHT);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.funcao);
            this.setTooltip("Instrução call_indirect através da tabela funcref.");
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
            this.setTooltip("Imprime valor no terminal de execução.");
        }
    };

    Blockly.Blocks['spp_string_concat'] = {
        init: function() {
            this.appendValueInput("LEFT").setCheck("texto").appendField("junte");
            this.appendValueInput("RIGHT").setCheck("texto").appendField("com");
            this.setInputsInline(true);
            this.setOutput(true, "texto");
            this.setColour(TYPE_COLORS.texto);
            this.setTooltip("Concatena dois textos na heap.");
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
            this.setTooltip("Extensão com sinal (Sign-extension operators).");
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
            this.setTooltip("Truncamento saturado sem trap em overflow/NaN (Non-trapping float-to-int).");
        }
    };

    // -------------------------------------------------------------------------
    // 10. WASM 2.0: BULK MEMORY
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_mem_copy'] = {
        init: function() {
            this.appendValueInput("DST").setCheck("i32").appendField("memory.copy destino offset:");
            this.appendValueInput("SRC").setCheck("i32").appendField("origem offset:");
            this.appendValueInput("LEN").setCheck("i32").appendField("tamanho bytes:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Copia bloco de memória (memory.copy).");
        }
    };

    Blockly.Blocks['spp_mem_fill'] = {
        init: function() {
            this.appendValueInput("DST").setCheck("i32").appendField("memory.fill destino offset:");
            this.appendValueInput("VAL").setCheck("i32").appendField("byte valor:");
            this.appendValueInput("LEN").setCheck("i32").appendField("tamanho bytes:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Preenche bloco de memória com byte (memory.fill).");
        }
    };

    Blockly.Blocks['spp_mem_init'] = {
        init: function() {
            this.appendDummyInput().appendField("memory.init segmento:").appendField(new Blockly.FieldNumber(0), "SEGMENT");
            this.appendValueInput("DST").setCheck("i32").appendField("destino offset:");
            this.appendValueInput("SRC").setCheck("i32").appendField("segmento offset:");
            this.appendValueInput("LEN").setCheck("i32").appendField("tamanho bytes:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Inicializa memória a partir de data segment passivo.");
        }
    };

    Blockly.Blocks['spp_data_drop'] = {
        init: function() {
            this.appendDummyInput().appendField("data.drop segmento:").appendField(new Blockly.FieldNumber(0), "SEGMENT");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Descarta segmento passivo de dados.");
        }
    };

    // -------------------------------------------------------------------------
    // 11. WASM 2.0: REFERENCE TYPES & MULTI-TABLE
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_table_declare'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("🗄️ Tabela")
                .appendField(new Blockly.FieldTextInput("table0"), "NAME")
                .appendField("tipo:")
                .appendField(new Blockly.FieldDropdown([
                    ["funcref", "funcref"],
                    ["externref", "externref"]
                ]), "TYPE")
                .appendField("mínimo:")
                .appendField(new Blockly.FieldNumber(1), "MIN")
                .appendField("máximo:")
                .appendField(new Blockly.FieldTextInput(""), "MAX");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Declara uma tabela WebAssembly 2.0.");
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
            this.setTooltip("Referência nula.");
        }
    };

    Blockly.Blocks['spp_ref_is_null'] = {
        init: function() {
            this.appendValueInput("REF").appendField("ref.is_null");
            this.setOutput(true, "bool");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Testa se referência é nula.");
        }
    };

    Blockly.Blocks['spp_ref_func'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("ref.func")
                .appendField(new Blockly.FieldTextInput("minha_funcao"), "NAME");
            this.setOutput(true, "funcref");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Obtém referência para função.");
        }
    };

    Blockly.Blocks['spp_table_get'] = {
        init: function() {
            this.appendDummyInput().appendField("table.get tabela:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("INDEX").setCheck("i32").appendField("índice:");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Obtém elemento de uma tabela.");
        }
    };

    Blockly.Blocks['spp_table_set'] = {
        init: function() {
            this.appendDummyInput().appendField("table.set tabela:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("INDEX").setCheck("i32").appendField("índice:");
            this.appendValueInput("VALUE").appendField("valor:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Define elemento de uma tabela.");
        }
    };

    Blockly.Blocks['spp_table_size'] = {
        init: function() {
            this.appendDummyInput().appendField("table.size tabela:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Retorna tamanho atual da tabela.");
        }
    };

    Blockly.Blocks['spp_table_grow'] = {
        init: function() {
            this.appendDummyInput().appendField("table.grow tabela:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("INIT_VAL").appendField("valor inicial:");
            this.appendValueInput("DELTA").setCheck("i32").appendField("elementos adicionais:");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Expande tamanho da tabela.");
        }
    };

    Blockly.Blocks['spp_table_fill'] = {
        init: function() {
            this.appendDummyInput().appendField("table.fill tabela:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("START").setCheck("i32").appendField("início:");
            this.appendValueInput("VALUE").appendField("valor:");
            this.appendValueInput("COUNT").setCheck("i32").appendField("quantidade:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Preenche faixa da tabela.");
        }
    };

    Blockly.Blocks['spp_table_copy'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("table.copy tabela dest:")
                .appendField(new Blockly.FieldNumber(0), "DST_TABLE")
                .appendField("tabela orig:")
                .appendField(new Blockly.FieldNumber(0), "SRC_TABLE");
            this.appendValueInput("DST").setCheck("i32").appendField("offset dest:");
            this.appendValueInput("SRC").setCheck("i32").appendField("offset orig:");
            this.appendValueInput("COUNT").setCheck("i32").appendField("quantidade:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Copia elementos entre tabelas.");
        }
    };

    Blockly.Blocks['spp_table_init'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("table.init tabela:")
                .appendField(new Blockly.FieldNumber(0), "TABLE_IDX")
                .appendField("elem segmento:")
                .appendField(new Blockly.FieldNumber(0), "ELEM_IDX");
            this.appendValueInput("DST").setCheck("i32").appendField("offset dest:");
            this.appendValueInput("SRC").setCheck("i32").appendField("offset elem:");
            this.appendValueInput("COUNT").setCheck("i32").appendField("quantidade:");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Inicializa tabela a partir de elemento passivo.");
        }
    };

    Blockly.Blocks['spp_elem_drop'] = {
        init: function() {
            this.appendDummyInput().appendField("elem.drop elemento:").appendField(new Blockly.FieldNumber(0), "ELEM_IDX");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.ref);
            this.setTooltip("Descarta segmento passivo de elementos de tabela.");
        }
    };

    // -------------------------------------------------------------------------
    // 12. WASM 2.0: TAIL CALLS
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_return_call'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("⏩ return_call")
                .appendField(new Blockly.FieldTextInput("minha_funcao"), "NAME");
            this.appendValueInput("ARG0").appendField("arg 1:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG1").appendField("arg 2:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG2").appendField("arg 3:").setAlign(Blockly.ALIGN_RIGHT);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Chamada recursiva terminal direta (Tail Call).");
        }
    };

    Blockly.Blocks['spp_return_call_indirect'] = {
        init: function() {
            this.appendDummyInput().appendField("⏩ return_call_indirect tabela:").appendField(new Blockly.FieldNumber(0), "TABLE_IDX");
            this.appendValueInput("FUNC_INDEX").appendField("índice na tabela:");
            this.appendValueInput("ARG0").appendField("arg 1:").setAlign(Blockly.ALIGN_RIGHT);
            this.appendValueInput("ARG1").appendField("arg 2:").setAlign(Blockly.ALIGN_RIGHT);
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.functions);
            this.setTooltip("Chamada recursiva terminal indireta (Tail Call Indirect).");
        }
    };

    // -------------------------------------------------------------------------
    // 13. WASM 2.0: FIXED-WIDTH SIMD 128 (v128)
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_v128_const'] = {
        init: function() {
            this.appendDummyInput()
                .appendField("v128.const (16 bytes hex):")
                .appendField(new Blockly.FieldTextInput("00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00"), "VALUE");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Vetor SIMD 128-bit constante.");
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
                .appendField("valor escalar:");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Replica escalar em todas as vias do vetor SIMD.");
        }
    };

    Blockly.Blocks['spp_v128_extract_lane'] = {
        init: function() {
            this.appendValueInput("VECTOR")
                .setCheck("v128")
                .appendField("extrair via")
                .appendField(new Blockly.FieldDropdown([
                    ["i8x16.extract_lane_s", "i8x16_s"],
                    ["i8x16.extract_lane_u", "i8x16_u"],
                    ["i16x8.extract_lane_s", "i16x8_s"],
                    ["i16x8.extract_lane_u", "i16x8_u"],
                    ["i32x4.extract_lane", "i32x4"],
                    ["i64x2.extract_lane", "i64x2"],
                    ["f32x4.extract_lane", "f32x4"],
                    ["f64x2.extract_lane", "f64x2"]
                ]), "LANE_TYPE")
                .appendField("índice via:")
                .appendField(new Blockly.FieldNumber(0), "LANE_IDX");
            this.setOutput(true);
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Extrai escalar de via específica de vetor SIMD.");
        }
    };

    Blockly.Blocks['spp_v128_replace_lane'] = {
        init: function() {
            this.appendValueInput("VECTOR")
                .setCheck("v128")
                .appendField("substituir via")
                .appendField(new Blockly.FieldDropdown([
                    ["i8x16.replace_lane", "i8x16"],
                    ["i16x8.replace_lane", "i16x8"],
                    ["i32x4.replace_lane", "i32x4"],
                    ["i64x2.replace_lane", "i64x2"],
                    ["f32x4.replace_lane", "f32x4"],
                    ["f64x2.replace_lane", "f64x2"]
                ]), "LANE_TYPE")
                .appendField("índice via:")
                .appendField(new Blockly.FieldNumber(0), "LANE_IDX");
            this.appendValueInput("VALUE").appendField("novo valor:");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Substitui elemento em via de vetor SIMD.");
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
            this.setTooltip("Operação vetorial binária SIMD.");
        }
    };

    Blockly.Blocks['spp_v128_bitselect'] = {
        init: function() {
            this.appendValueInput("V1").setCheck("v128").appendField("v128.bitselect v1:");
            this.appendValueInput("V2").setCheck("v128").appendField("v2:");
            this.appendValueInput("MASK").setCheck("v128").appendField("máscara:");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Seleção bit a bit com máscara SIMD.");
        }
    };

    Blockly.Blocks['spp_v128_load'] = {
        init: function() {
            this.appendValueInput("OFFSET").setCheck("i32").appendField("v128.load offset:");
            this.appendDummyInput().appendField("static offset:").appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setOutput(true, "v128");
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Carrega vetor de 128 bits da memória.");
        }
    };

    Blockly.Blocks['spp_v128_store'] = {
        init: function() {
            this.appendValueInput("VALUE").setCheck("v128").appendField("v128.store vetor:");
            this.appendValueInput("OFFSET").setCheck("i32").appendField("offset:");
            this.appendDummyInput().appendField("static offset:").appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setPreviousStatement(true);
            this.setNextStatement(true);
            this.setColour(TYPE_COLORS.v128);
            this.setTooltip("Grava vetor de 128 bits na memória.");
        }
    };
}

