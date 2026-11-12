---
description: Requisitos da distribuição portátil AgentDevKit.
status: aprovado
version: 0.0.10
---

# PRD do AgentDevKit

## Problema e público

Desenvolvedores precisam reutilizar instruções de agentes entre projetos e
clientes sem copiar procedimentos divergentes, perder configurações locais
ou iniciar código antes de definir o produto.

O AgentDevKit atende pessoas e equipes que usam agentes de desenvolvimento
em projetos novos ou existentes. A primeira entrega distribui o kit já
extraído do projeto de origem como produto independente.

## Requisitos

| ID | Resultado esperado |
| --- | --- |
| FR-001 | Instalar e atualizar uma origem única `.pbai4devs`. |
| FR-002 | Gerar entradas conforme a descoberta nativa de cada cliente. |
| FR-003 | Preservar código, documentos, configurações e dados existentes. |
| FR-004 | Oferecer CLI Node 24+ com idioma persistido: PT padrão, EN e ES. |
| FR-005 | Indicar estado, pendências e próximos passos em cada resultado. |
| FR-006 | Seguir preparação, produto, design, configuração, specs e revisão. |
| FR-007 | Distribuir testes/modelos sem resultados, segredos ou downloads. |
| FR-008 | Validar o pacote local e preparar a release versionada v0.0.1. |
| FR-009 | Selecionar agentes e criar apenas seus apontamentos necessários. |
| FR-010 | Reutilizar a seleção e alterá-la sem perder arquivos próprios. |
| FR-011 | Versionar as fontes; manter derivações e preferências locais. |
| FR-012 | Gerar layouts nativos a partir de configurações e templates. |
| FR-013 | Usar JavaScript/Node nas automações e manter distribuição via npx. |
| FR-014 | Reutilizar no release o pacote verificado, sem duplicar o CI. |
| FR-015 | Publicar no npm público, instalável via npx sem autenticação. |
| FR-016 | Organizar código e testes em `src/` e `tests/`, na raiz. |
| FR-017 | Gerar exemplos isolados e acessíveis por comandos documentados. |
| FR-018 | Publicar autoria PathBit, palavras-chave e licença MIT no npm. |
| FR-019 | Exibir README legível no npm sem alterar o Markdown fonte. |
| FR-020 | Levar a licença do kit ao hub sem alterar a licença do projeto. |
| FR-021 | Inventariar documentos existentes antes de propor alterações. |
| FR-022 | Complementar documentação sem substituir arquivos por templates. |
| FR-023 | Provar o fluxo documental em projetos reais e em projeto vazio. |

Execuções repetidas devem ser idempotentes; a CLI oferece simulação e JSON.
As instruções permanecem concisas, com detalhes opcionais em referências.
Na configuração interativa, o usuário escolhe seus agentes. Em automações,
a opção explícita ou a escolha salva orientam o instalador; sem escolha,
todos os clientes são mantidos para compatibilidade.

## Limites e sucesso

O kit não define a stack dos projetos, não publica automaticamente, não cria
PRD/specs sem descoberta e não comprova carregamento pelo cliente apenas por
gerar arquivos. Não copia documentos reais de produto para o projeto-alvo.

A entrega exige testes de projeto vazio e existente, preservação de arquivos,
atualização, idiomas, catálogos e distribuição sem artefatos locais.
Os aceites da distribuição ficam na [spec inicial](../specs/v0.0.1/SPEC.md);
a [spec de seleção](../specs/v0.0.2/SPEC.md) detalha a instalação por agente.
A [spec v0.0.6](../specs/v0.0.6/SPEC.md) trata a apresentação pública, a licença
distribuída e a atualização verificada do projeto de origem.

## Autorização

Escopo autorizado pela solicitação explícita de criação do AgentDevKit.
Este estado registra requisitos aceitos; testes e publicação têm validação
própria e não são considerados concluídos por esta aprovação.

[Wiki](../README.md) · [Design](design.md) ·
[Fluxo de uso](../guides/workflow.md)
