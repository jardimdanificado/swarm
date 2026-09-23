/**
 * Scratch++ Factory Examples (Presets)
 * 100% WebAssembly 1.0 Code Examples
 */

export const EXAMPLES = [
    {
        id: 'fibonacci',
        name: '1. Fibonacci Sequence (i32)',
        description: 'Computes Fibonacci numbers in WebAssembly using a repeat loop.',
        xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="spp_start" x="40" y="40">
    <next>
      <block type="spp_print">
        <value name="VALUE">
          <block type="spp_const_text">
            <field name="VALUE">=== Fibonacci in WebAssembly ===</field>
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
                            <field name="VALUE">Done!</field>
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
        name: '2. Factorial Function (Recursive/Loop)',
        description: 'Defines an exported factorial function and invokes it via call.',
        xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="spp_function_def" x="40" y="40">
    <field name="NAME">factorial</field>
    <field name="RETURN_TYPE">i32</field>
    <statement name="PARAMS">
      <block type="spp_param">
        <field name="NAME">n</field>
        <field name="TYPE">i32</field>
      </block>
    </statement>
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
            <field name="VALUE">Computing factorial(6):</field>
          </block>
        </value>
        <next>
          <block type="spp_print">
            <value name="VALUE">
              <block type="spp_call_expr">
                <field name="NAME">factorial</field>
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
        name: '3. Raw Linear Memory (Store & Load)',
        description: 'Demonstrates reading and writing raw bytes in WebAssembly linear memory.',
        xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="spp_start" x="40" y="40">
    <next>
      <block type="spp_print">
        <value name="VALUE">
          <block type="spp_const_text">
            <field name="VALUE">Writing 0x42 and 0x24 to linear memory:</field>
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
