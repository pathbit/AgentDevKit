---
description: Incrementos verificáveis do AgentDevKit.
---

# Specs

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

- [v0.0.1](v0.0.1/SPEC.md): primeira distribuição independente.
- [v0.0.2](v0.0.2/SPEC.md): seleção persistente de agentes por projeto.
- [v0.0.3](v0.0.3/SPEC.md): fontes, saídas locais e automações Node.
- [GitHub Packages](github-packages/SPEC.md): pacote npm instalável via npx.
- [v0.0.4](v0.0.4/SPEC.md): estrutura padrão e exemplos na raiz.
- [v0.0.5](v0.0.5/SPEC.md): instalação pelo registro em todos os fluxos.
- [v0.0.6](v0.0.6/SPEC.md): apresentação pública, licença e atualização segura.
- [v0.0.7](v0.0.7/SPEC.md): projetos reais e proteção local de artefatos.
- [v0.0.8](v0.0.8/SPEC.md): preservação, transações e validação aprofundada.
- [v0.0.9](v0.0.9/SPEC.md): coexistência e evolução documental sem perdas.
- [Dois registries](dual-registry/SPEC.md): versão e bytes iguais no npm e GitHub.
- [v0.0.10](v0.0.10/SPEC.md): release com instalação pelos dois registries e pré-requisitos.
- [Ecossistema de segurança](security-ecosystem/SPEC.md): fluxos e scanners locais.
- [Ecossistema de desenvolvimento](development-ecosystem/SPEC.md):
  especialistas, colaboração e provas.
- [Confiabilidade da pipeline](ci-resilience/SPEC.md): testes e releases.
- [Pasta de estado](state-directory/SPEC.md): migração segura para `state`.
- [Sincronização segura](safe-synchronization/SPEC.md): preservar recursos próprios.
- [Escopo de regras Claude](escopo-regras-claude/SPEC.md): evitar ativação
  global indevida e migrar apontamentos com preservação.
- [Integração sem substituição][additive]: acréscimos em arquivos existentes.
- [Compatibilidade com projetos reais][oss]: projetos públicos e exemplos reproduzíveis.
- [Ignore do projeto](project-ignore/SPEC.md): preservar o arquivo da raiz.
- [Ignore de clientes](client-ignore/SPEC.md): padrão local e exceções do projeto.
- [Ferramenta e versões](tool-release/SPEC.md): atualização segura e tags de release.
- [Tags automáticas](automatic-release-tags/SPEC.md): publicação após CI aprovada.
- [Destinos temporários](target-paths/SPEC.md): caminhos corretos e links seguros.
- [Ordem antes da implementação](preimplementation-order/SPEC.md): produto,
  spec e configuração antes do código.
- [Descoberta e preservação](discovery-preservation/SPEC.md): rotas de skills,
  sincronização segura e validação em projetos reais.
- [Recuperação conservadora](recuperacao-conservadora/SPEC.md): rascunho para
  preservar conteúdo humano e orientar recuperação após falhas.
- [Registro de recuperação](registro-recuperacao/SPEC.md): contrato dos
  registros e provas do componente.
- [Diário em disco](diario-disco/SPEC.md): publicação exclusiva de registros.
  A integração ao instalador e ao sync está no changelog da 0.0.31.
- [Manifesto de recuperação](manifesto-recuperacao/SPEC.md): cópias privadas
  verificáveis do snapshot informado ao mecanismo de recuperação.
- [Permissões de temporários](sync-permissoes/SPEC.md): proteção do modo de
  arquivos existentes durante a sincronização.
- [Backup privado](backup-privado/SPEC.md): isolamento da pasta de cópias do
  instalador, com limites explícitos por plataforma.
- [Preservação TOML](toml-preservacao/SPEC.md): rascunho histórico com provas
  de edição e retirada seletiva em instalações legadas.
- [Experiência guiada](experiencia-guiada/SPEC.md): primeiro uso e próximos
  passos conforme o estado do projeto.
- [Documentação de legado](documentacao-legado/SPEC.md): inventário,
  documentação por módulo e evidências no código e nos testes.

Cada incremento vincula requisitos, critérios, testes e evidências locais.
O [roadmap](../product/roadmap.md) distingue releases publicadas de trabalho
pendente. As specs registram o contrato da época, incluindo os padrões
históricos de seleção de clientes e exclusão do Git. Os guias de
[instalação](../guides/installation.md) e [CLI](../guides/cli.md) documentam
o comportamento atual. O [controle das specs](../product/spec-audit.md)
registra os critérios cuja revisão e validação estão pendentes.

Estes são os incrementos do próprio AgentDevKit. Para criar uma spec do seu
projeto, siga o [fluxo](../guides/workflow.md) e use os
[modelos compartilhados](../../.pbai4devs/templates/README.md).

[Wiki](../README.md) · [Roadmap](../product/roadmap.md)

[additive]: additive-integration/SPEC.md
[oss]: real-projects/SPEC.md

[reading-pt]: README.md
[reading-en]: ../en/specs/README.md
[reading-es]: ../es/specs/README.md
