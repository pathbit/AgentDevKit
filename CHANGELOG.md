---
description: Alterações verificáveis por versão do AgentDevKit.
---

# Changelog

## 0.0.5 — 2026-11-11

- Instalação e próximos passos usam o pacote nomeado no npm público, sem login.
- Notas e guias apontam para o registro e sua página de versões.
- Publicação verifica instalação, diagnóstico e sincronização sem autenticação.

## 0.0.4 — 2026-11-11

- Código em `src/`, testes em `tests/` e publicação em `scripts/release/`.
- Exemplos completos em `examples/generated/`, com guia versionado e comandos.
- Preparação dos exemplos sem depender de pastas geradas na raiz.
- Relatórios de exemplos atualizados, sem reutilizar resultados antigos.
- Guia rápido de desenvolvimento e automações npm para verificar e empacotar.
- Compatibilidade de instalação, atualização e publicação mantida.

## Distribuição no GitHub Packages

- Pacote único `@pathbit/agentdevkit` instalável pelo registro com npx.
- Publicação do artefato verificado e retomada para tags existentes.
- Documentação de autenticação e acesso aos pacotes.

## 0.0.3 — 2026-11-11

- Fontes do produto, testes e automações concentrados em `.pbai4devs`.
- Saídas de agentes e preferências locais fora do versionamento.
- Layouts de clientes declarativos e entradas geradas com preservação humana.
- Bootstrap JavaScript e uso de npx mantido, sem scripts shell próprios.
- CI dividido por responsabilidade e release reutilizando artifact aprovado.

## 0.0.2 — 2026-11-11

- Seleção persistente de agentes na instalação e no comando `agents`.
- Instalação e sincronização limitadas aos clientes escolhidos e dependências.
- Remoção de apontamentos desmarcados com preservação de arquivos próprios.
- Pacotes verificados como artifacts do CI e geração manual pelo Actions.
- Releases reutilizam o pacote testado, com verificação de checksum.
- Formulários de bugs e melhorias e modelo de pull request.
- Wiki organizada por tarefa: instalação, CLI, fluxo, recursos e recuperação.
- Guias de ferramentas, testes, arquitetura, contribuição e releases.

## 0.0.1 — 2026-11-11

- Extração das fontes compartilhadas para o repositório AgentDevKit.
- Origem `.pbai4devs` com skills, regras, comandos, modelos e testes.
- Documentação inicial em português, com entradas em inglês e espanhol.
- CLI para instalar, atualizar, diagnosticar e indicar próximos passos.
- Testes de distribuição para preservar projetos e excluir artefatos locais.

Os resultados de validação ficam em relatórios ignorados e no CI, separados
deste registro das funcionalidades entregues.
