/**
 * Scratch++ Factory Examples (Presets)
 * 100% WebAssembly 1.0 Code Examples
 */

export const EXAMPLES = [
    {
        id: 'fibonacci',
        name: '1. Sequência de Fibonacci (i32)',
        description: 'Calcula termos de Fibonacci em WebAssembly usando laço repita.',
        xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="spp_start" x="40" y="40">
    <next>
      <block type="spp_print">
        <value name="VALUE">
          <block type="spp_const_text">
            <field name="VALUE">=== Fibonacci em WebAssembly ===</field>
          </block>
        </value>
        <next>
          <block type="spp_declare">
            <field name="TYPE">i32</field>
            <field name="NAME">a</field>
            <value name="INIT">
              <block type="spp_const_i32">
                <field name="VALUE">0</field>
              </block>
            </value>
            <next>
              <block type="spp_declare">
                <field name="TYPE">i32</field>
                <field name="NAME">b</field>
                <value name="INIT">
                  <block type="spp_const_i32">
                    <field name="VALUE">1</field>
                  </block>
                </value>
                <next>
                  <block type="spp_repeat">
                    <value name="TIMES">
                      <block type="spp_const_i32">
                        <field name="VALUE">10</field>
                      </block>
                    </value>
                    <statement name="DO">
                      <block type="spp_print">
                        <value name="VALUE">
                          <block type="spp_get">
                            <field name="NAME">a</field>
                          </block>
                        </value>
                        <next>
                          <block type="spp_declare">
                            <field name="TYPE">i32</field>
                            <field name="NAME">temp</field>
                            <value name="INIT">
                              <block type="spp_binary_op">
                                <field name="OP">+</field>
                                <field name="SIGNEDNESS">signed</field>
                                <value name="LEFT">
                                  <block type="spp_get">
                                    <field name="NAME">a</field>
                                  </block>
                                </value>
                                <value name="RIGHT">
                                  <block type="spp_get">
                                    <field name="NAME">b</field>
                                  </block>
                                </value>
                              </block>
                            </value>
                            <next>
                              <block type="spp_set">
                                <field name="NAME">a</field>
                                <value name="VALUE">
                                  <block type="spp_get">
                                    <field name="NAME">b</field>
                                  </block>
                                </value>
                                <next>
                                  <block type="spp_set">
                                    <field name="NAME">b</field>
                                    <value name="VALUE">
                                      <block type="spp_get">
                                        <field name="NAME">temp</field>
                                      </block>
                                    </value>
                                  </block>
                                </next>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </statement>
                    <next>
                      <block type="spp_print">
                        <value name="VALUE">
                          <block type="spp_const_text">
                            <field name="VALUE">Concluído!</field>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`
    },
    {
        id: 'factorial',
        name: '2. Função Fatorial (Recursiva/Loop)',
        description: 'Define função exportada fatorial e a invoca via call.',
        xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="spp_function_def" x="40" y="40">
    <field name="NAME">fatorial</field>
    <field name="RETURN_TYPE">i32</field>
    <field name="PARAMS">n:i32</field>
    <statement name="BODY">
      <block type="spp_declare">
        <field name="TYPE">i32</field>
        <field name="NAME">res</field>
        <value name="INIT">
          <block type="spp_const_i32">
            <field name="VALUE">1</field>
          </block>
        </value>
        <next>
          <block type="spp_while">
            <value name="COND">
              <block type="spp_binary_op">
                <field name="OP">&gt;</field>
                <field name="SIGNEDNESS">signed</field>
                <value name="LEFT">
                  <block type="spp_get">
                    <field name="NAME">n</field>
                  </block>
                </value>
                <value name="RIGHT">
                  <block type="spp_const_i32">
                    <field name="VALUE">1</field>
                  </block>
                </value>
              </block>
            </value>
            <statement name="DO">
              <block type="spp_set">
                <field name="NAME">res</field>
                <value name="VALUE">
                  <block type="spp_binary_op">
                    <field name="OP">*</field>
                    <field name="SIGNEDNESS">signed</field>
                    <value name="LEFT">
                      <block type="spp_get">
                        <field name="NAME">res</field>
                      </block>
                    </value>
                    <value name="RIGHT">
                      <block type="spp_get">
                        <field name="NAME">n</field>
                      </block>
                    </value>
                  </block>
                </value>
                <next>
                  <block type="spp_set">
                    <field name="NAME">n</field>
                    <value name="VALUE">
                      <block type="spp_binary_op">
                        <field name="OP">-</field>
                        <field name="SIGNEDNESS">signed</field>
                        <value name="LEFT">
                          <block type="spp_get">
                            <field name="NAME">n</field>
                          </block>
                        </value>
                        <value name="RIGHT">
                          <block type="spp_const_i32">
                            <field name="VALUE">1</field>
                          </block>
                        </value>
                      </block>
                    </value>
                  </block>
                </next>
              </block>
            </statement>
            <next>
              <block type="spp_return">
                <value name="VALUE">
                  <block type="spp_get">
                    <field name="NAME">res</field>
                  </block>
                </value>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
  <block type="spp_start" x="40" y="340">
    <next>
      <block type="spp_print">
        <value name="VALUE">
          <block type="spp_const_text">
            <field name="VALUE">Calculando fatorial(6):</field>
          </block>
        </value>
        <next>
          <block type="spp_print">
            <value name="VALUE">
              <block type="spp_call_expr">
                <field name="NAME">fatorial</field>
                <value name="ARG0">
                  <block type="spp_const_i32">
                    <field name="VALUE">6</field>
                  </block>
                </value>
              </block>
            </value>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`
    },
    {
        id: 'linear_memory',
        name: '3. Memória Linear Bruta (Store & Load)',
        description: 'Demonstra escrita e leitura de bytes na memória linear do Wasm.',
        xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="spp_start" x="40" y="40">
    <next>
      <block type="spp_print">
        <value name="VALUE">
          <block type="spp_const_text">
            <field name="VALUE">Escrevendo 0x42 e 0x24 na memória linear:</field>
          </block>
        </value>
        <next>
          <block type="spp_mem_store">
            <field name="WIDTH">u8</field>
            <field name="STATIC_OFFSET">0</field>
            <value name="VALUE">
              <block type="spp_const_i32">
                <field name="VALUE">66</field>
              </block>
            </value>
            <value name="BUFFER">
              <block type="spp_const_i32">
                <field name="VALUE">2048</field>
              </block>
            </value>
            <value name="OFFSET">
              <block type="spp_const_i32">
                <field name="VALUE">0</field>
              </block>
            </value>
            <next>
              <block type="spp_mem_store">
                <field name="WIDTH">u8</field>
                <field name="STATIC_OFFSET">0</field>
                <value name="VALUE">
                  <block type="spp_const_i32">
                    <field name="VALUE">36</field>
                  </block>
                </value>
                <value name="BUFFER">
                  <block type="spp_const_i32">
                    <field name="VALUE">2048</field>
                  </block>
                </value>
                <value name="OFFSET">
                  <block type="spp_const_i32">
                    <field name="VALUE">1</field>
                  </block>
                </value>
                <next>
                  <block type="spp_print">
                    <value name="VALUE">
                      <block type="spp_const_text">
                        <field name="VALUE">Lendo valores somados:</field>
                      </block>
                    </value>
                    <next>
                      <block type="spp_print">
                        <value name="VALUE">
                          <block type="spp_binary_op">
                            <field name="OP">+</field>
                            <field name="SIGNEDNESS">signed</field>
                            <value name="LEFT">
                              <block type="spp_mem_load">
                                <field name="WIDTH_TYPE">i32_u8</field>
                                <field name="STATIC_OFFSET">0</field>
                                <value name="BUFFER">
                                  <block type="spp_const_i32">
                                    <field name="VALUE">2048</field>
                                  </block>
                                </value>
                                <value name="OFFSET">
                                  <block type="spp_const_i32">
                                    <field name="VALUE">0</field>
                                  </block>
                                </value>
                              </block>
                            </value>
                            <value name="RIGHT">
                              <block type="spp_mem_load">
                                <field name="WIDTH_TYPE">i32_u8</field>
                                <field name="STATIC_OFFSET">0</field>
                                <value name="BUFFER">
                                  <block type="spp_const_i32">
                                    <field name="VALUE">2048</field>
                                  </block>
                                </value>
                                <value name="OFFSET">
                                  <block type="spp_const_i32">
                                    <field name="VALUE">1</field>
                                  </block>
                                </value>
                              </block>
                            </value>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`
    }
];
