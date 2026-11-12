---
description: Recursos agênticos integrados e verificações locais de segurança.
status: aprovado
version: 0.0.11
---

# Ecossistema de segurança local

## Objetivo

Instalar procedimentos de segurança com o kit e conectar skills, comandos,
agentes, regras, scripts e ferramentas em fluxos completos. Documentar a
responsabilidade de cada recurso e usar análise local open source, sem conta
ou pagamento obrigatório. Atualizar o talquee-ai-router pelo npm para 0.0.10
preservando seu conteúdo e configuração.

## Contrato

- Skills explicam procedimentos; agentes assumem uma tarefa e sua entrega.
- Comandos organizam entradas e etapas; scripts executam ações determinísticas.
- Regras orientam contextos; ferramentas fornecem capacidades locais.
- A instalação inclui fontes de segurança e apontamentos dos clientes escolhidos.
- Scanners são instalados explicitamente, sem iniciar serviços.
- Downloads públicos são separados da análise offline, com pins e integridade.
- Ausência de ferramenta, base ou prova nunca equivale a uma auditoria aprovada.
- Segredos, código e relatórios permanecem locais.
- Scanners não substituem testes de autorização, isolamento e regras de negócio.
- Preservar histórico e personalizações nos dois repositórios.
- Distribuir os novos recursos em 0.0.11, mantendo o router fixado em 0.0.10.

## Critérios de aceite

| ID | Resultado observável |
| --- | --- |
| AC-001 | Instalação inclui skills, regras, comandos e perfis de segurança. |
| AC-002 | Docs explicam componentes e fluxos conectados, com casos de uso. |
| AC-003 | Três scanners OSS instalam, atualizam e verificam os pins locais. |
| AC-004 | Auditoria offline detecta fixtures inseguras e diferencia falhas. |
| AC-005 | Relatórios não expõem segredos e permanecem ignorados pelo Git. |
| AC-006 | Curadoria registra fontes, licenças, limites e correções do artigo. |
| AC-007 | Router em 0.0.10 preserva arquivos, índice, idioma e clientes. |
| AC-008 | Regressões, pacote real, espelhos e revisão independente passam. |

## Validação

Verificar criação e descoberta de recursos em instalações novas e existentes.
Executar scanners reais contra casos seguros e inseguros locais, com bases
controladas e sem chamadas a serviços de análise. Testar downloads, hashes,
links, rollback, dados ausentes, erros de scanner e saídas redigidas.
Comparar snapshots do router antes e depois da atualização pelo npm.

Código de testes é versionado; bases, binários, relatórios e snapshots ficam
em `.agent-tests/`, `.local/` ou `tmp/`, ignorados pelo Git.
