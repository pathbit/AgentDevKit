---
description: Utilitários mínimos compartilhados das automações Node.js.
---

# Utilitários

`runtime.mjs` centraliza o requisito Node.js 24+, a raiz do repositório e a
identificação do arquivo executado. Não instala runtimes nem configura a máquina.
Também procura executáveis opcionais no PATH sem iniciar um shell.

`managed-content.mjs` limita a propriedade do kit aos seus blocos Markdown;
`managed-toml.mjs` aplica o mesmo contrato ao `prompt` de comandos Gemini.
Texto externo, nomes existentes e metadados humanos permanecem preservados.

`gitignore.mjs` planeja exclusões locais e detecta regras conflitantes. Com
exceções na raiz, pode acrescentar um bloco limitado ao estado privado dos
clientes; alterações no bloco gerenciado impedem sua substituição.
