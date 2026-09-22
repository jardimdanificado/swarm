/**
 * Scratch++ Blockly Block Definitions
 * 100% WebAssembly 1.0 Instruction Coverage (scratchpp-spec.md)
 */

import { TYPE_COLORS } from './types_theme.js';

export function registerScratchPPBlocks(Blockly) {
    // -------------------------------------------------------------------------
    // 1. CONTROLE ESTRUTURADO (WASM 1.0)
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
            this.appendValueInput("COND").appendField("se (if)");
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
            this.appendValueInput("TIMES").appendField("repita");
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
            this.appendValueInput("COND").appendField("enquanto");
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
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Salto incondicional br para bloco/loop pai.");
        }
    };

    Blockly.Blocks['spp_br_if'] = {
        init: function() {
            this.appendValueInput("COND")
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
                .appendField("tabela de salto (br_table) índice:");
            this.appendDummyInput()
                .appendField("alvos:")
                .appendField(new Blockly.FieldTextInput("0, 1"), "TARGETS")
                .appendField("padrão:")
                .appendField(new Blockly.FieldNumber(0), "DEFAULT");
            this.setPreviousStatement(true);
            this.setColour(TYPE_COLORS.control);
            this.setTooltip("Desvio por tabela de índices br_table.");
        }
    };

    Blockly.Blocks['spp_select'] = {
        init: function() {
            this.appendValueInput("TRUE_VAL").appendField("selecionar (select)");
            this.appendValueInput("FALSE_VAL").appendField("senão");
            this.appendValueInput("COND").appendField("se cond:");
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
            this.setColour('#dc2626');
            this.setTooltip("Dispara um trap de execução fatal unreachable.");
        }
    };

    // -------------------------------------------------------------------------
    // 2. VARIÁVEIS, GLOBAIS E LITERAIS
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_declare'] = {
        init: function() {
            this.appendValueInput("INIT")
                .appendField("declare local")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
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
            this.setTooltip("Declara uma variável local tipada.");
        }
    };

    Blockly.Blocks['spp_global_declare'] = {
        init: function() {
            this.appendValueInput("INIT")
                .appendField("declare global")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"]
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
            this.setTooltip("Declara uma variável global de módulo WebAssembly.");
        }
    };

    Blockly.Blocks['spp_set'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("local.set / global.set")
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

    Blockly.Blocks['spp_const_i32'] = {
        init: function() {
            this.appendDummyInput().appendField("i32:").appendField(new Blockly.FieldNumber(0), "VALUE");
            this.setOutput(true, "i32");
            this.setColour(TYPE_COLORS.i32);
        }
    };

    Blockly.Blocks['spp_const_i64'] = {
        init: function() {
            this.appendDummyInput().appendField("i64:").appendField(new Blockly.FieldTextInput("0"), "VALUE");
            this.setOutput(true, "i64");
            this.setColour(TYPE_COLORS.i64);
        }
    };

    Blockly.Blocks['spp_const_f32'] = {
        init: function() {
            this.appendDummyInput().appendField("f32:").appendField(new Blockly.FieldNumber(0.0), "VALUE");
            this.setOutput(true, "f32");
            this.setColour(TYPE_COLORS.f32);
        }
    };

    Blockly.Blocks['spp_const_f64'] = {
        init: function() {
            this.appendDummyInput().appendField("f64:").appendField(new Blockly.FieldNumber(0.0), "VALUE");
            this.setOutput(true, "f64");
            this.setColour(TYPE_COLORS.f64);
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
        }
    };

    // -------------------------------------------------------------------------
    // 3. OPERAÇÕES NUMÉRICAS & BITWISE (100% WASM 1.0)
    // -------------------------------------------------------------------------
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
            this.setTooltip("Operação binária do WebAssembly 1.0.");
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
            this.setTooltip("Operação unária aritmética/bitwise do WebAssembly 1.0.");
        }
    };

    // -------------------------------------------------------------------------
    // 4. CONVERSÕES E REINTERPRETAÇÕES DE BITS
    // -------------------------------------------------------------------------
    Blockly.Blocks['spp_convert'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("converter");
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
            this.setTooltip("Conversão explícita de tipos (extend, wrap, convert, demote, promote).");
        }
    };

    Blockly.Blocks['spp_reinterpret'] = {
        init: function() {
            this.appendValueInput("VALUE")
                .appendField("reinterpretar bits como");
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
            this.setTooltip("Bitcast sem conversão numérica (instruções reinterpret do Wasm).");
        }
    };

    // -------------------------------------------------------------------------
    // 5. MEMÓRIA LINEAR E BUFFERS (100% WASM 1.0)
    // -------------------------------------------------------------------------
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
            this.appendValueInput("OFFSET").appendField("+ offset dinâmico:");
            this.appendDummyInput()
                .appendField("offset estático:")
                .appendField(new Blockly.FieldNumber(0), "STATIC_OFFSET");
            this.setInputsInline(true);
            this.setOutput(true);
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Instrução load do WebAssembly 1.0 com offset estático.");
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
            this.setTooltip("Instrução store do WebAssembly 1.0.");
        }
    };

    Blockly.Blocks['spp_mem_grow'] = {
        init: function() {
            this.appendValueInput("PAGES")
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
            this.setTooltip("Retorna quantidade atual de páginas de 64KB de memória linear.");
        }
    };

    Blockly.Blocks['spp_alloc_buffer'] = {
        init: function() {
            this.appendValueInput("SIZE").appendField("aloque buffer de");
            this.appendDummyInput().appendField("bytes");
            this.setOutput(true, "buffer");
            this.setColour(TYPE_COLORS.memory);
            this.setTooltip("Aloca um buffer na memória linear.");
        }
    };

    // -------------------------------------------------------------------------
    // 6. FUNÇÕES E TABELA (CALL / CALL_INDIRECT)
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
                    ["bool", "bool"],
                    ["texto", "texto"],
                    ["buffer", "buffer"]
                ]), "RETURN_TYPE");
            this.appendDummyInput()
                .appendField("params (nome:tipo, ...):")
                .appendField(new Blockly.FieldTextInput("a:i32, b:i32"), "PARAMS");
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
                .appendField("call_indirect tabela índice:");
            this.appendDummyInput()
                .appendField("retorno:")
                .appendField(new Blockly.FieldDropdown([
                    ["i32", "i32"],
                    ["i64", "i64"],
                    ["f32", "f32"],
                    ["f64", "f64"],
                    ["void", "void"]
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
    // 7. HOST I/O & TEXTO
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
            this.appendValueInput("LEFT").appendField("junte");
            this.appendValueInput("RIGHT").appendField("com");
            this.setInputsInline(true);
            this.setOutput(true, "texto");
            this.setColour(TYPE_COLORS.texto);
            this.setTooltip("Concatena dois textos na heap.");
        }
    };
}
