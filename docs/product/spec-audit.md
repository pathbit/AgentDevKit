---
description: Controle da revisão das especificações e de suas evidências.
status: em-andamento
---

# Controle das especificações

Este índice registra o trabalho necessário para saber o estado de cada critério.
**Pendente** significa que a auditoria individual ainda não foi concluída; não
significa que a funcionalidade esteja ausente. Releases, testes antigos e specs
aprovadas ajudam a localizar evidências, mas não substituem essa conferência.

Para cada spec, revisar seus critérios, associar testes e evidências à versão e
ao ambiente, registrar pendências ou bloqueios e distinguir decisões posteriores
que substituíram critérios históricos. Arquivos privados e resultados locais
permanecem fora do Git; registre uma referência segura ou explique o bloqueio.

| Spec | Tema | Auditoria dos critérios |
| --- | --- | --- |
| [v0.0.1](../specs/v0.0.1/SPEC.md) | Distribuição | Pendente |
| [v0.0.2](../specs/v0.0.2/SPEC.md) | Seleção de agentes | Pendente |
| [v0.0.3](../specs/v0.0.3/SPEC.md) | Fontes e geração local | Pendente; revisar política Git |
| [GitHub Packages](../specs/github-packages/SPEC.md) | Pacote no GitHub | Pendente |
| [v0.0.4](../specs/v0.0.4/SPEC.md) | Estrutura e exemplos | Pendente |
| [v0.0.5](../specs/v0.0.5/SPEC.md) | Instalação pelo registro | Pendente |
| [v0.0.6](../specs/v0.0.6/SPEC.md) | Apresentação e licença | Pendente |
| [v0.0.7](../specs/v0.0.7/SPEC.md) | Projetos existentes | Pendente; revisar política Git |
| [v0.0.8](../specs/v0.0.8/SPEC.md) | Preservação e validação | Pendente; revisar política Git e reconciliar rollback e concorrência |
| [v0.0.9](../specs/v0.0.9/SPEC.md) | Agentes e documentos existentes | Pendente |
| [Dois registros](../specs/dual-registry/SPEC.md) | Publicação sincronizada | Pendente |
| [v0.0.10](../specs/v0.0.10/SPEC.md) | Instalação pelos dois registros | Pendente |
| [Segurança](../specs/security-ecosystem/SPEC.md) | Ecossistema de segurança local | Pendente |
| [Integração aditiva](../specs/additive-integration/SPEC.md) | Integração sem substituição | Pendente; revisar política Git |
| [Projetos reais](../specs/real-projects/SPEC.md) | Projetos reais e exemplos | Pendente; revisar política Git |
| [Ignore do projeto](../specs/project-ignore/SPEC.md) | Ignore da raiz | Pendente; revisar política Git |
| [Desenvolvimento](../specs/development-ecosystem/SPEC.md) | Ecossistema de desenvolvimento | Pendente |
| [CI](../specs/ci-resilience/SPEC.md) | Confiabilidade da pipeline | Pendente |
| [Estado](../specs/state-directory/SPEC.md) | Pasta de estado | Pendente; revisar política Git |
| [Sincronização](../specs/safe-synchronization/SPEC.md) | Sincronização segura | Pendente |
| [Ignore de clientes](../specs/client-ignore/SPEC.md) | Ignores locais | Pendente; revisar política Git |
| [Ferramenta](../specs/tool-release/SPEC.md) | Ferramenta e versões | Pendente |
| [Tags](../specs/automatic-release-tags/SPEC.md) | Tags automáticas | Pendente |
| [Descoberta](../specs/discovery-preservation/SPEC.md) | Descoberta e preservação | Pendente |
| [Destinos](../specs/target-paths/SPEC.md) | Destinos de instalação | Pendente |
| [Ordem](../specs/preimplementation-order/SPEC.md) | Ordem antes da implementação | Pendente |
| [Recuperação conservadora](../specs/recuperacao-conservadora/SPEC.md) | Recuperação após falha | Rascunho; decisões e provas pendentes |

Ao concluir uma auditoria, acrescente uma referência rastreável por critério,
com estado e evidência, e atualize a linha correspondente. Veja o
[roadmap](roadmap.md) para prioridades e dependências.
