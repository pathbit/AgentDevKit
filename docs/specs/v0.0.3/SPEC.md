---
description: Fonte única, saídas locais e automações JavaScript.
status: aprovado
version: 0.0.3
---

# Fontes e geração local

## Objetivo

Manter em `.pbai4devs` as fontes do kit e gerar a estrutura específica de cada
agente quando necessária. Os derivados e as preferências são locais; código,
templates, testes e documentação permanecem versionados. Escopo autorizado
na solicitação atual e vinculado ao [PRD](../../product/prd.md).

## Contrato

- O produto, o launcher, os testes e as automações ficam em `.pbai4devs`.
  Metadados npm, licença, documentação e integração GitHub ficam na raiz.
- Configurações declarativas e templates descrevem nomes, diretórios,
  metadados e apontamentos dos clientes.
- A instalação gera apenas clientes escolhidos, entradas e índices locais.
  Os apontamentos seguem para a fonte compartilhada, sem symlinks.
- Saídas e estado pessoal são ignorados pelo Git. `.github/workflows`, issues
  e configurações humanas não são confundidos com derivações dos agentes.
- Um `.gitignore` não controla diretórios irmãos. O gerador aplica exclusões
  locais do Git; sem repositório, usa uma proteção no `.gitignore` da raiz.
- Migrar arquivos já rastreados exige retirar do índice somente os derivados
  identificados, preservando o conteúdo no disco.
- Entradas humanas são preservadas. Blocos antigos do kit são migrados sem
  apagar conteúdo humano fora do bloco; alterações conflitantes exigem revisão.
- O pacote continua executável por `npx`. O launcher aceita Node 18+ e prepara
  Node 24+ para o núcleo quando necessário. Não há bootstrap `.sh` ou `.ps1`.
- Sem Node/npm, o agente usa o instalador nativo do sistema; JavaScript não
  consegue executar antes de existir um runtime.
- O CI separa a verificação completa dos testes de portabilidade. A release
  reutiliza o artifact aprovado do mesmo commit, sem repetir o empacotamento.

## Critérios de aceite

| ID | Resultado observável | Verificação |
| --- | --- | --- |
| AC-001 | Fontes no hub; nenhum derivado rastreado. | Git e inventário |
| AC-002 | Templates geram clientes e entradas corretas. | Geração e npx |
| AC-003 | Derivados ignorados em Git, subpasta e worktree. | Git real |
| AC-004 | Migração preserva conteúdo humano e disco. | Hashes e índice |
| AC-005 | Automações Node, sem scripts shell próprios. | Inventário/runtime |
| AC-006 | npx instala, atualiza e sincroniza o pacote. | Tarball real |
| AC-007 | CI não duplica a suíte completa na release. | Workflow/artifact |
| AC-008 | Runtime antigo se recupera com integridade. | Bootstrap e falhas |
| AC-009 | Guias, testes e release refletem o contrato. | Lint/revisão/CI |

## Provas

Execute testes em diretórios novos, existentes, com e sem Git, em subpastas
e worktrees. Verifique bytes preservados e paths ignorados, não apenas mensagens.
Teste seleção individual e `all`, erro de download/checksum, pacote adulterado,
origem incorreta do artifact e arquivos locais fora do pacote.

Resultados ficam em `.agent-tests/source-only/`; não são commitados. O CI deve
validar os sistemas suportados com grupos adequados, sem prometer tempos fixos.
A aprovação exige revisão independente e evidências por critério.

[Todas as specs](../README.md) · [Wiki](../../README.md)
