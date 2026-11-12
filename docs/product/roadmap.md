---
description: Entregas e dependências do AgentDevKit.
status: vigente
---

# Roadmap

| Entrega | Dependência | Referência |
| --- | --- | --- |
| Escopo e design | Solicitação de extração | PRD, UX e design. |
| CLI, adaptadores e pacote v0.0.1 | PRD, UX e design | Spec v0.0.1. |
| Provas de instalação e maturidade | Pacote e CLI | Testes e CI. |
| Release v0.0.1 | Aceites e revisão | Pacote versionado e changelog. |
| Seleção de agentes v0.0.2 | CLI e adaptadores | [Spec][selection]. |
| Fontes e geração local v0.0.3 | Seleção e distribuição | [Spec][source]. |
| Pacote no GitHub Packages | Artefato aprovado | [Spec][packages]. |
| Estrutura e exemplos v0.0.4 | CLI, distribuição e gerador | [Spec][layout]. |
| Instalação pelo registro v0.0.5 | Pacote publicado | [Spec][registry]. |
| Apresentação e licença v0.0.6 | Distribuição e atualização | [Spec][public]. |
| Compatibilidade real v0.0.7 | Testes em clones existentes | [Spec][oss]. |
| Preservação v0.0.8 | Auditoria e regressões | [Spec][robustness]. |
| Coexistência v0.0.9 | Agentes, documentos e projetos reais | [Spec][coexistence]. |

A primeira entrega segue a [spec v0.0.1](../specs/v0.0.1/SPEC.md), disponível
na [release v0.0.1][release]. Os detalhes de mudanças estão no
[changelog](../../CHANGELOG.md), e o processo de publicação em
[manutenção](../maintainers/maintenance.md).

Não há datas ou entregas futuras assumidas. Novos clientes e funcionalidades
exigem revisão do escopo e specs próprias. Melhorias na wiki acompanham o
comportamento existente, sem alterar a versão de uma release já publicada.

[Wiki](../README.md) · [Specs](../specs/README.md)

[release]: https://github.com/pathbit/AgentDevKit/releases/tag/v0.0.1
[selection]: ../specs/v0.0.2/SPEC.md
[source]: ../specs/v0.0.3/SPEC.md
[packages]: ../specs/github-packages/SPEC.md
[layout]: ../specs/v0.0.4/SPEC.md
[registry]: ../specs/v0.0.5/SPEC.md
[public]: ../specs/v0.0.6/SPEC.md
[oss]: ../specs/v0.0.7/SPEC.md
[robustness]: ../specs/v0.0.8/SPEC.md
[coexistence]: ../specs/v0.0.9/SPEC.md
