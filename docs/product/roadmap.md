---
description: Entregas publicadas, especificações e próximos passos do AgentDevKit.
status: vigente
---

# Roadmap

O AgentDevKit compartilha recursos entre agentes e os instala em projetos
novos ou existentes, preservando os arquivos da equipe. O trabalho segue
produto, experiência, design, roadmap, spec, implementação e revisão.
O [PRD](prd.md), a [UX da CLI](ux-ui.md) e o [design técnico](design.md)
estão registrados como aprovados; isso não substitui os testes de cada entrega.

Este roadmap organiza o que já foi especificado e o que falta verificar.
`[x]` identifica uma **release publicada**; não significa que todos os
critérios das specs tenham sido novamente auditados. `[-]` indica trabalho em
andamento; `[ ]`, trabalho pendente. Os resultados dependem das evidências e
do ambiente indicado, não apenas de uma marcação neste documento.

## Entregas publicadas

As releases de `v0.0.1` a `v0.0.30` constam no [GitHub][releases]. O
[changelog][changelog] detalha cada versão; a tabela agrupa as entregas para
facilitar a leitura. As versões registram comportamento histórico e não
substituem as decisões mais recentes do projeto.

| Estado | Versões | Entrega | Especificações relacionadas |
| --- | --- | --- | --- |
| [x] | 0.0.1–0.0.3 | Distribuição, seleção de clientes e fontes compartilhadas. | [0.0.1][v1], [0.0.2][v2], [0.0.3][v3] |
| [x] | 0.0.4–0.0.6 | Estrutura do projeto, exemplos, registros, licença e apresentação. | [GitHub Packages][packages], [0.0.4][v4], [0.0.5][v5], [0.0.6][v6] |
| [x] | 0.0.7–0.0.10 | Projetos existentes, preservação, coexistência e dois registries. | [0.0.7][v7], [0.0.8][v8], [0.0.9][v9], [dois registries][dual], [0.0.10][v10] |
| [x] | 0.0.11–0.0.13 | Segurança local, integração aditiva e provas em projetos reais. | [segurança][security], [integração][additive], [projetos reais][real] |
| [x] | 0.0.14–0.0.16 | Preservação do ignore da raiz, especialistas e CI portátil. | [ignore do projeto][project-ignore], [desenvolvimento][development], [CI][ci] |
| [x] | 0.0.17–0.0.21 | Migração de estado, sincronização, ignore local histórico e tags. | [estado][state], [sincronização][sync], [ignore de clientes][client-ignore], [ferramenta][tool], [tags][tags] |
| [x] | 0.0.22–0.0.23 | Descoberta, preservação, destinos e ordem de implementação. | [descoberta][discovery], [destinos][targets], [ordem][order] |
| [x] | 0.0.24–0.0.27 | Proteção de conteúdo humano, revisão, índice e limites de consultas Git. | [descoberta][discovery], [sincronização][sync] |
| [x] | 0.0.28–0.0.30 | Preparo e execução de scripts, bootstrap e matriz de projetos. | [desenvolvimento][development], [descoberta][discovery] |

A [spec inicial][v1] organiza a primeira entrega; as demais estão no
[índice de specs][specs]. Uma spec aprovada registra escopo, não comprova por
si só que seus critérios continuam atendidos em todas as versões ou clientes.
O [controle das specs](spec-audit.md) reúne o estado da auditoria de cada uma.

## Prioridades e pendências

### 1. Preservação e confiabilidade

- [-] Concluir e revisar as alterações locais de `init`, `update`, `sync`,
  diagnóstico e auditoria. Preservar arquivos humanos, conteúdo staged, índice,
  configuração Git e `.gitignore` do projeto; testar colisões, migrações,
  links, aliases de caminhos, falhas e recuperação.
- [-] Aplicar a decisão atual: novas operações não devem alterar a configuração
  Git, editar `.git/info/exclude` nem criar ou alterar ignores na raiz ou nos
  clientes. Ignores existentes no hub também são preservados. Alguns arquivos
  podem aparecer no `git status`; o diagnóstico deve avisar sobre arquivos
  privados visíveis.
  Critérios históricos, como os de [ignore do projeto][project-ignore],
  [ignore de clientes][client-ignore], [integração][additive], [0.0.3][v3],
  [0.0.7][v7] e [estado][state], precisam ser revisados antes de servirem como
  contrato para essa evolução.
- [-] Validar os ajustes de regras do Copilot e a preservação de regras e
  metadados humanos. A descoberta e o carregamento variam por cliente; uma
  referência gerada não prova a execução da regra ou skill.
- [ ] Revisar conflitos e apontamentos desatualizados na sincronização do
  checkout de desenvolvimento, sem apagar conteúdo ou exclusões Git existentes.
  A situação depende dos arquivos e configurações locais de cada ambiente.
- [ ] Executar a suíte completa do estado final, incluindo o pacote instalado,
  e acompanhar a matriz real em Linux, Windows e macOS. Os casos NTFS, skips,
  volumes sem hardlinks e limites de concorrência devem ter resultado explícito.
- [ ] Atualizar a documentação e registrar evidências e revisão independente
  do diff final antes de criar commit, tag ou publicar uma nova versão.

### 2. Provas em projetos e clientes

A matriz atual define 40 projetos sintéticos. Um teste separado verifica em
memória 16.383 combinações de seleção de clientes. Há também dois fluxos de
exemplo com decisões simuladas. Essas verificações não comprovam a execução de
cada skill e perfil em cada projeto ou cliente; seus limites estão descritos
nos respectivos testes.

- [-] Ampliar os testes em projetos vazios e existentes, inclusive arquivos de
  agentes próprios, staged, colisões, seleção de clientes e operações repetidas.
  Gerar projetos e resultados fora do Git ou em destino comprovadamente ignorado;
  manter o código dos testes versionado.
- [ ] Repetir as provas em projetos públicos reais, com revisões fixas e o
  pacote candidato, quando houver autorização para obtê-los. O comando
  `test:oss` é separado de `npm test`; registrar projetos, versões, resultados
  e bloqueios sem incluir clones ou relatórios no Git.
- [ ] Conferir o inventário dos catálogos contra as fontes reais antes de medir
  cobertura; reconstruir índices em cópias de teste, preservando o checkout.
- [ ] Manter uma matriz por projeto, cliente e skill ou perfil aplicável, com
  versão, recurso carregado, resultado e evidência. Distinguir estrutura,
  descoberta e execução real; registrar bloqueios e casos não aplicáveis.
  Combinações de seleção não substituem provas de execução em cada cliente.
- [ ] Manter as evidências da instalação `0.0.21` em projeto consumidor
  separadas das alterações futuras do kit; antes de nova aplicação, conferir
  novamente arquivos existentes, índice e `.gitignore` do projeto. Localizar e
  tornar consultável o relatório dessa instalação sem expor dados privados.

### 3. Evolução contínua

- [ ] Revisar as specs e os critérios afetados pela política atual de Git,
  mantendo o histórico das releases e sem declarar critérios antigos aprovados
  por equivalência. Registrar decisões e dependências antes de novos incrementos.
- [ ] Evoluir skills, perfis e provas de arquitetura, backend, frontend, QA,
  segurança, revisão e performance conforme necessidades comprovadas. Usar
  subagentes disponíveis e revisão adversarial quando o escopo permitir.
- [ ] Manter instalação, pré-requisitos, comandos, solução de problemas e
  publicação coerentes com o comportamento efetivo. [Issues][issues] e
  [contribuições][contributing] podem propor melhorias; cada entrega exige
  escopo e validação próprios.

## Dependências para uma próxima publicação

1. Concluir os ajustes e resolver os critérios pendentes das specs afetadas.
2. Testar o estado final e registrar evidências, limitações e revisão independente.
3. Aprovar a matriz de CI e verificar o mesmo artefato nos registros previstos.
4. Definir a próxima versão e publicar release e pacotes associados à sua tag.

Nenhuma versão ou data futura é presumida. A aprovação de uma spec ou a
existência de uma tag não substitui os testes da alteração em andamento.

[Wiki](../README.md) · [Produto](README.md) · [Specs][specs] ·
[Processo de release](../maintainers/maintenance.md)

[releases]: https://github.com/pathbit/AgentDevKit/releases
[issues]: https://github.com/pathbit/AgentDevKit/issues
[contributing]: ../../CONTRIBUTING.md
[changelog]: ../../CHANGELOG.md
[specs]: ../specs/README.md
[v1]: ../specs/v0.0.1/SPEC.md
[v2]: ../specs/v0.0.2/SPEC.md
[v3]: ../specs/v0.0.3/SPEC.md
[packages]: ../specs/github-packages/SPEC.md
[v4]: ../specs/v0.0.4/SPEC.md
[v5]: ../specs/v0.0.5/SPEC.md
[v6]: ../specs/v0.0.6/SPEC.md
[v7]: ../specs/v0.0.7/SPEC.md
[v8]: ../specs/v0.0.8/SPEC.md
[v9]: ../specs/v0.0.9/SPEC.md
[dual]: ../specs/dual-registry/SPEC.md
[v10]: ../specs/v0.0.10/SPEC.md
[security]: ../specs/security-ecosystem/SPEC.md
[additive]: ../specs/additive-integration/SPEC.md
[real]: ../specs/real-projects/SPEC.md
[project-ignore]: ../specs/project-ignore/SPEC.md
[development]: ../specs/development-ecosystem/SPEC.md
[ci]: ../specs/ci-resilience/SPEC.md
[state]: ../specs/state-directory/SPEC.md
[sync]: ../specs/safe-synchronization/SPEC.md
[client-ignore]: ../specs/client-ignore/SPEC.md
[tool]: ../specs/tool-release/SPEC.md
[tags]: ../specs/automatic-release-tags/SPEC.md
[discovery]: ../specs/discovery-preservation/SPEC.md
[targets]: ../specs/target-paths/SPEC.md
[order]: ../specs/preimplementation-order/SPEC.md
