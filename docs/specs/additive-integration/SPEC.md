---
description: Complementar instruções existentes sem substituir conteúdo humano.
status: aprovado
version: 0.0.12
---

# Integração sem substituição

## Objetivo

Ao instalar, atualizar ou sincronizar, acrescentar referências do AgentDevKit
aos arquivos de instruções existentes. Preservar conteúdo, metadados, nomes,
permissões e índice Git do usuário, inclusive em colisões de nomes.

## Contrato

- Entradas raiz existentes recebem um bloco curto; aliases únicos como
  `agents.md` são reutilizados sem criar uma segunda entrada.
- Skills, agentes, regras e comandos Markdown existentes recebem só uma
  referência ao hub. O frontmatter humano não é substituído.
- Comandos Gemini existentes recebem a referência dentro de `prompt`, em
  TOML válido. Sintaxe não suportada é preservada e informada.
- O estado registra a propriedade do bloco, nunca do arquivo humano inteiro.
- Atualizações preservam edições humanas fora do bloco. Marcadores ambíguos
  ou blocos adulterados impedem substituição, inclusive com `--force`.
- Remover um recurso gerenciado remove somente sua contribuição comprovada.
- Arquivos humanos continuam sujeitos às escolhas de Git do próprio projeto;
  o kit ignora seus derivados por arquivo, não a pasta inteira do cliente.
- Links simbólicos não são seguidos. Configurações externas ao escopo de
  instruções não são reformatadas nem mescladas arbitrariamente.

## Critérios de aceite

| ID | Resultado observável |
| --- | --- |
| AC-001 | Entradas raiz humanas recebem a referência e preservam seus bytes. |
| AC-002 | Colisões Markdown preservam frontmatter e texto, com bloco único. |
| AC-003 | Repetições são idempotentes; edições fora do bloco são preservadas. |
| AC-004 | Blocos alterados, ambiguidades e links não causam perda de dados. |
| AC-005 | Retirada de bloco preserva texto, permissões e índice humano. |
| AC-006 | TOML mantém semântica humana e referência válida no prompt. |
| AC-007 | Git não passa a ignorar arquivos humanos por propriedade parcial. |
| AC-008 | Pacote real, regressões, maturidade e revisão independente passam. |

## Validação

Fixtures existentes incluem frontmatter próprio, caixa diferente, BOM, CRLF,
ausência de newline final, alterações posteriores, arquivos já staged e
comandos estruturados. Testar perda de origem, rollback, `--force`, simulação,
`doctor`, `sync --check` e instalação do pacote gerado.

Testes são versionados. Backups, snapshots e relatórios ficam ignorados em
`.agent-tests/` ou `tmp/`; não alterar projetos consumidores nesta entrega.
