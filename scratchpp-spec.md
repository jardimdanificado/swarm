# Scratch++ — Especificação Técnica para Implementação

> Linguagem visual de blocos, com tipagem estática explícita, que compila para WebAssembly.
> Subset próprio, sem herança de compatibilidade com projetos Scratch (.sb3) originais.

---

## 1. Visão Geral da Arquitetura

```
[Editor de Blocos] → [AST tipada] → [Type Checker] → [IR] → [Codegen wasm] → [.wasm binário]
                                                                    ↓
                                                          [Runtime JS/Worker]
                                                          (heap, strings, paralelismo, I/O)
```

Componentes principais a construir:

1. **Editor visual** (frontend) — paleta de blocos, workspace, serialização de projeto (`.spp`)
2. **Compilador** (core) — AST → type check → IR → wasm binário (via binaryen.js ou emissão manual de bytes)
3. **Runtime** (JS) — instancia o wasm, gerencia heap de strings/buffers, workers para paralelismo, imports de I/O (canvas, som, input)
4. **CLI** — `scratchpp build projeto.spp -o projeto.wasm` para uso fora do editor (CI, export standalone)

---

## 2. Sistema de Tipos

### 2.1 Tipos primitivos

| Tipo | Repr. wasm | Forma do bloco | Cor |
|---|---|---|---|
| `i32` | i32 | oval simples | azul claro |
| `i64` | i64 | oval borda dupla | azul escuro |
| `f32` | f32 | oval canto arredondado extra | verde claro |
| `f64` | f64 | oval borda dupla arredondada | verde escuro |
| `bool` | i32 (0/1) | hexágono | laranja |
| `texto` | ponteiro (i32) p/ heap | canto reentrante | roxo |
| `buffer` | ponteiro (i32) p/ heap + len | retângulo com ícone de cadeado | cinza |
| `função` (first-class) | i32 (índice em table) | seta apontando pra dentro | amarelo |

Encaixe é validado **geometricamente em tempo de edição**: um buraco de tipo `f64` fisicamente não aceita um bloco de saída `i32` solto — precisa passar por conversão (ver 2.2).

### 2.2 Regras de coerção (Opção 3 — widening automático, narrowing explícito)

**Hierarquia de widening seguro (automático, sem bloco extra):**

```
i32 → i64 → f64
i32 → f32 → f64
i64 → f64   (nota: pode perder precisão acima de 2^53, aceitar o trade-off documentado)
bool → i32
```

Regra geral: a conversão é automática **apenas quando não há perda de informação em casos normais de uso**. Toda conversão automática deve ser auditável — o compilador deve conseguir emitir um "modo verboso" que mostra onde inseriu coerção implícita (útil pro usuário debugar).

**Narrowing (requer bloco explícito `[converta X→Y]`):**

```
f64 → f32, i64, i32   (perda de precisão/faixa)
f32 → i32, i64
i64 → i32
texto → qualquer numérico (requer parse, pode falhar em runtime)
qualquer numérico → texto (requer formatação — na real pode ser implícito, ver nota abaixo)
```

Nota: `→ texto` (formatação para exibição/concatenação) pode ser tratado como caso especial permitido implicitamente **apenas** dentro de blocos de concatenação/print, nunca em atribuição de variável tipada `texto`.

**Tabela de instruções wasm por conversão** (referência pro codegen):

| De → Para | Instrução wasm |
|---|---|
| i32 → i64 | `i64.extend_i32_s` |
| i32 → f32 | `f32.convert_i32_s` |
| i32 → f64 | `f64.convert_i32_s` |
| i64 → f64 | `f64.convert_i64_s` |
| f32 → f64 | `f64.promote_f32` |
| f64 → f32 | `f64.demote_f64` (narrowing, explícito) |
| f64 → i32 | `i32.trunc_f64_s` (narrowing, explícito, pode trap) |
| i64 → i32 | `i32.wrap_i64` (narrowing, explícito) |

### 2.4 Assinatura vs. sinal (unsigned como ficção sintática)

Wasm 1.0 não tem tipos unsigned separados — `i32`/`i64` são só sequências de bits; sinal é decidido **por instrução** (`div_s` vs `div_u`, `lt_s` vs `lt_u`, etc). Se o Scratch++ quiser expor `u32`/`u64` como tipos visuais distintos (formas/cores próprias), isso é açúcar sintático da linguagem: o compilador escolhe as variantes `_u` das instruções ao gerar código, mas por baixo é o mesmo `i32`/`i64` do wasm. Decisão a bater: vale a complexidade de ter tipos unsigned na paleta, ou basta um modificador/flag no bloco de operação (ex: dropdown "signed/unsigned" no próprio bloco de divisão/comparação)? Recomendo a segunda opção — menos tipos na paleta, mesma expressividade.

### 2.5 Erros de tipo em tempo de edição vs. compilação

- **Tempo de edição:** encaixe físico impede a maioria dos erros (bloco não entra no buraco errado).
- **Tempo de compilação:** ainda necessário checar — funções com retorno usado incorretamente, variáveis não inicializadas, overflow de buffer detectável estaticamente, chamadas de função com aridade errada.

---

## 3. Catálogo de Blocos (subset inicial)

### 3.1 Declaração e atribuição
- `declare [tipo] "[nome]" = [valor inicial]`
- `defina "[nome]" = [valor]` (atribuição, mesmo tipo já declarado)

### 3.2 Controle de fluxo
- `repita [i32] vezes { ... }` → `loop` + `br_if`
- `enquanto [bool] { ... }` → `loop` + `if` + `br`
- `se [bool] { ... } senão { ... }` → `if/else`
- `retorne [valor]`
- `pare` / `continue`
- `escolha [valor] { caso [const]: ... , ... , padrão: ... }` → `br_table` (dispatch por índice, mais eficiente que cadeia de `se/senão` quando há muitos casos)

### 3.3 Operações numéricas (fecha wasm 1.0 completo)

Aritmética, bitwise e comparação como **um único bloco de operação com dropdown de operador**, em vez de um bloco por operação — reduz poluição de paleta:

- `[a] [op aritmético] [b]` → dropdown: `+ - × ÷ %` (resto) → `add/sub/mul/div_s|u/rem_s|u`
- `[a] [op bitwise] [b]` → dropdown: `AND OR XOR << >> ROTL ROTR` → `and/or/xor/shl/shr_s|u/rotl/rotr`
- `[a] [op comparação] [b]` → dropdown: `= ≠ < > ≤ ≥` (com toggle signed/unsigned quando o tipo for inteiro) → `eq/ne/lt_s|u/gt_s|u/le_s|u/ge_s|u`
- `[valor] é zero?` → `eqz` (comum o bastante pra merecer bloco próprio, é a base de várias condições)

Todas com variantes automáticas por tipo (`i32.add` vs `i64.add` vs `f32.add` vs `f64.add`) resolvidas pelo compilador a partir do tipo do encaixe — o usuário não escolhe a variante, só o operador.

### 3.4 Funções
- `defina função "[nome]"([param: tipo, ...]) -> [tipo retorno] { ... }`
- `chame "[função]"([args])`
- `chame função indireta [função: valor] ([args])` → `call_indirect`, usado quando a função é passada como valor (tipo `função` de primeira classe, seção 2.1). O compilador mantém uma `table` única (limite do wasm 1.0: só uma table por módulo) com `elem` segment populado na compilação, mapeando toda função declarada pra um índice.

### 3.5 Memória / buffers
- `aloque buffer de [i32] bytes` → retorna `buffer`
- `leia [tipo] em [buffer] offset [i32]` — dropdown de largura/sinal quando o tipo for inteiro: `i32` (4 bytes), `i32 de 1 byte (signed/unsigned)`, `i32 de 2 bytes (signed/unsigned)`, equivalente para `i64` → mapeia pra `i32.load`, `i32.load8_s/u`, `i32.load16_s/u`, `i64.load8/16/32_s/u` etc. Serve pra economizar espaço em buffers pequenos sem precisar de shift/mask manual
- `escreva [valor] em [buffer] offset [i32]` — mesmas variantes de largura no `store` (`i32.store8`, `i32.store16`, etc.)
- `libere [buffer]`
- `cresça memória em [i32] páginas` / `tamanho da memória (em páginas)` → `memory.grow`/`memory.size`. Necessário quando um buffer aloca além do que cabe na `memory.initial_pages` fixada na IR — sem isso, buffers grandes travam em runtime
- `texto/buffer constante "[literal]"` → o compilador detecta valor constante conhecido em tempo de compilação e emite como **data segment** (inicializado na instanciação do módulo), em vez de alocar em runtime via heap allocator — mais rápido e sem overhead de alocação para literais

### 3.6 Concorrência
- `execute em paralelo { ... }` → spawna Web Worker com instância wasm própria
- `trave "[recurso]"` / `libere "[recurso]"`
- `envie mensagem "[canal]" com [valor]` / `receba mensagem "[canal]"`

### 3.7 Interop
- `importe função "[nome]" de módulo "[wasm externo]"`
- `código inline: [texto C/Rust]` (escape hatch — compilado separadamente e linkado)

### 3.8 Conversão explícita
- `converta [valor] para [tipo]` (bloco único, tipo de destino escolhido em dropdown)

---

## 4. Representação Intermediária (IR)

Proposta: manter a IR **estruturalmente próxima ao wasm** (não achatar em três-endereços), já que blocos de controle do Scratch++ já mapeiam 1:1 com `block`/`loop`/`if` do wasm. Isso simplifica o codegen — a IR é essencially uma AST tipada e anotada, pronta pra serialização binária.

```
IRModule
 ├── functions: IRFunction[]
 ├── globals: IRGlobal[]
 ├── memory: { initial_pages, max_pages }
 └── imports: IRImport[]

IRFunction
 ├── name, params: (name, Type)[], return_type
 ├── locals: (name, Type)[]
 └── body: IRNode[]

IRModule também carrega:
 ├── table: { max_size, elem_segments: (offset, func_index[])[] }  // uma única table, wasm 1.0
 ├── data_segments: (offset, bytes)[]                               // literais constantes (3.5)
 └── start: func_index | null                                       // inicialização automática de globals/heap

IRNode = Const | LocalGet | LocalSet | GlobalGet | GlobalSet
       | BinOp(op, signedness?) | UnOp | Convert
       | Block | Loop | If | Br | BrIf | BrTable | Return
       | Call | CallIndirect
       | MemLoad(width, signedness?) | MemStore(width) | MemGrow | MemSize
       | SpawnWorker | Lock | Unlock | SendMsg | RecvMsg
```

---

## 5. Runtime (JS)

Responsabilidades que ficam **fora** do wasm:

1. **Heap de strings/buffers** — alocador simples em memória linear (bump allocator + free list, ver 6.4)
2. **I/O** — canvas, áudio, input do usuário, expostos via `imports` no módulo wasm
3. **Paralelismo** — cada `execute em paralelo` spawna um `Worker`, com `SharedArrayBuffer` para memória compartilhada quando necessário; comunicação via `postMessage` para canais de mensagem
4. **Scheduler cooperativo** — para scripts que não usam paralelismo real mas precisam de yield entre "frames" (herdado conceitualmente do modelo Scratch, mesmo sem os blocos originais)

---

## 6. Decisões de Design Pendentes (revisar antes de M2)

1. **Tipagem estática explícita em todo lugar, ou inferência local em contextos óbvios** (ex: `declare "x" = 5` infere `i32` sem precisar declarar tipo)? → Recomendo inferência local restrita a literais, para reduzir verbosidade sem abrir mão da tipagem forte nos encaixes.
2. **Formato de serialização do projeto (`.spp`)** — JSON (como .sb3) é o caminho de menor resistência e mais fácil de debugar; considerar depois um formato binário se performance de load for problema.
3. **Erros em runtime (trap de narrowing, divisão por zero, etc.)** — decidir se aborta o script, aborta o projeto inteiro, ou dispara um bloco tipo "se erro { }" capturável.
4. **Gerenciamento de memória de buffers** — manual (`libere`) é mais previsível e mais perto de wasm puro; ref-counting automático é mais amigável mas adiciona overhead e complexidade de implementação. Recomendo começar manual no MVP e avaliar ref-counting depois.
5. **SharedArrayBuffer e headers COOP/COEP** — necessário documentar cedo para quem for hospedar projetos exportados, já que isso afeta deploy.

---

## 7. Roadmap Faseado (para execução por agente)

### M0 — Fundação (sem editor visual ainda)
- [ ] Definir gramática textual intermediária (representação textual da AST, tipo um "assembly" do Scratch++) para poder testar o compilador sem depender do editor visual pronto
- [ ] Implementar parser dessa gramática textual → AST tipada
- [ ] Implementar type checker (validação de tipos, coerções da seção 2.2)

### M1 — Codegen básico (wasm 1.0 completo, exceto memória/strings — isso é M2)
- [ ] AST → IR (seção 4)
- [ ] IR → wasm binário para: tipos primitivos, controle de fluxo completo (`se`, `repita`, `enquanto`, `escolha`/`br_table`), funções, `call_indirect` + table
- [ ] Operações numéricas completas: aritmética, bitwise, comparação (com signed/unsigned), `eqz` (seção 3.3)
- [ ] Todas as conversões da tabela 2.2, incluindo narrowing explícito
- [ ] Start section (inicialização automática, sem bloco visível ao usuário)
- [ ] Checklist de paridade: todo opcode numérico/estrutural do wasm 1.0 tem um bloco ou é gerado implicitamente pelo compilador — nenhuma instrução da spec 1.0 deveria ficar inacessível a essa altura, exceto as de memória (adiadas pro M2 de propósito)
- [ ] Testes: gerar wasm para programas simples (fatorial, fibonacci, soma de loop, dispatch por `escolha`) e validar execução via `wasm-tools` ou runtime Node

### M2 — Memória e strings (fecha wasm 1.0 100%)
- [ ] Implementar heap allocator no runtime (bump + free list)
- [ ] Blocos de buffer (aloque/leia/escreva/libere), com variantes de largura/sinal (`load8_s/u`, `load16_s/u`, etc.)
- [ ] `memory.grow`/`memory.size` (bloco "cresça memória"/"tamanho da memória")
- [ ] Data segments para literais constantes (texto/buffer conhecidos em compile-time)
- [ ] Suporte a `texto` (concatenação, comparação, formatação básica)
- [ ] Checklist de paridade: com M1 + M2 completos, todas as instruções numéricas, estruturais e de memória do wasm 1.0 (MVP) têm caminho de geração — cobertura 100% da spec 1.0, exceção deliberada de tudo pós-MVP (seção 6, "o que fica de fora por design")

### M3 — Runtime JS e I/O
- [ ] Instanciação do módulo wasm no browser
- [ ] Imports de canvas/desenho básico (equivalente aos blocos de "sprite" do Scratch, mas via import wasm↔JS)
- [ ] Input do usuário (teclado/mouse) como imports

### M4 — Concorrência
- [ ] Spawn de Worker por `execute em paralelo`
- [ ] SharedArrayBuffer + documentação de headers COOP/COEP
- [ ] Blocos de lock/unlock e canais de mensagem

### M5 — Editor visual
- [ ] Paleta de blocos com encaixe geométrico por tipo (seção 2.1)
- [ ] Serialização workspace → AST (formato `.spp`)
- [ ] Highlight de encaixes válidos ao arrastar bloco

### M6 — Interop e polish
- [ ] Bloco de código inline (C/Rust compilado separado e linkado)
- [ ] Import de módulos wasm externos
- [ ] CLI de build (`scratchpp build`)
- [ ] Modo verboso de coerção implícita (debug de conversões automáticas)

---

## 8. Critérios de Sucesso do MVP

Um MVP é considerado funcional quando:
1. É possível escrever um programa na gramática textual (M0) que declare variáveis tipadas, tenha um loop, uma função, e compile para um `.wasm` válido
2. O `.wasm` gerado executa corretamente em um runtime Node/browser padrão, sem ferramentas customizadas de validação
3. Pelo menos um exemplo usa `buffer` (memória crua) e um usa `texto` (heap)
4. Existe pelo menos um teste automatizado por categoria de bloco (seção 3)
