---
description: Utilitários mínimos compartilhados das automações Node.js.
---

# Utilitários

`runtime.mjs` centraliza o requisito Node.js 24+, a raiz do repositório e a
identificação do arquivo executado. Não instala runtimes nem configura a
máquina.
Também procura executáveis opcionais no PATH sem iniciar um shell.

`managed-content.mjs` limita a propriedade do kit aos seus blocos Markdown;
`managed-toml.mjs` aplica o mesmo contrato ao `prompt` de comandos Gemini.
Ele usa `smol-toml.cjs` para validar o documento antes de reconhecer um prompt
já equivalente. O bundle é
[smol-toml 1.9.1](https://github.com/squirrelchat/smol-toml),
distribuído com `smol-toml.LICENSE` (BSD-3-Clause), sem dependência do projeto
consumidor. A edição e retirada de blocos ainda pode reserializar prompts TOML.

`gitignore.mjs` detecta regras conflitantes e coordena a migração local.
`legacy-exclude.mjs` reconhece o bloco exato da versão 0.0.21 com uma única
worktree. `legacy-exclude-write.mjs` grava uma cópia privada do original antes
de publicar as regras preservadas. Conflitos ficam pendentes para revisão.

`collectErrorDiagnostics`, em `error-reporting.mjs`, coleta dados próprios sem
executar getters ou traps de proxies; dados inseguros ou além do limite são
sinalizados como truncados. Outros acessos a erros não estão cobertos.

`recovery-effects.mjs` classifica opções já analisadas pela CLI para uma futura
barreira de recuperação. Ele não lê o diário, não bloqueia comandos e não prova
ausência de efeitos de planejamento. Chamadas `tools` são tratadas como opacas.

`claude-legacy-exact.mjs` reconhece apenas um formato legado exato de referência
Claude. O reconhecimento não atribui propriedade nem comprova ativação da regra.

`catalog.mjs` identifica erros de sintaxe de JSON externo pelo caminho, sem
incluir trechos do conteúdo. Outros diagnósticos não são abrangidos.
Em erros de sintaxe, os leitores JSON locais de `preparar-ferramentas` e
`gerenciar-skills-externas` informam o tipo do arquivo sem copiar seu conteúdo
ou caminho. Erros de leitura mantêm seu código e mensagem; outros parsers não
estão abrangidos.

`xattr-probe.mjs` consulta atributos e ACLs específicos no macOS e detecta
atributos listáveis no Linux. Resultados inconclusivos não provam ausência;
não há inspeção equivalente para Windows ou garantia de todos os metadados.

`file-owner.mjs` identifica arquivos POSIX cujo proprietário mudaria ou cuja
leitura pelo proprietário não pode ser presumida. Grupos, ACLs e mudanças
concorrentes exigem verificações adicionais.

`state-path.mjs` identifica o estado atual ou legado sem dividir dados; duas
pastas simultâneas ou links simbólicos exigem resolver o conflito antes do uso.
