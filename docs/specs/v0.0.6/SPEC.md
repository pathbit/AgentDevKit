---
description: Apresentação pública, licença e atualização verificada do kit.
status: aprovado
version: 0.0.6
---

# Apresentação pública e licença

## Objetivo e autorização

Publicar uma versão estável do AgentDevKit com identificação clara no npm,
README legível e licença incluída no hub instalado. Depois da publicação,
atualizar o `talquee-ai-router` preservando seus arquivos e dados.

Escopo autorizado pela solicitação do usuário. A aprovação permite executar
o trabalho; testes, publicação e atualização exigem suas próprias provas.
Dependências: [PRD](../../product/prd.md), [design](../../product/design.md) e
[instalação pelo registro](../v0.0.5/SPEC.md).

## Contrato

- Declarar autor PathBit, palavras-chave relevantes e licença MIT no pacote.
- Derivar o README publicado da fonte sem alterar o arquivo versionado:
  remover YAML e converter links locais para URLs absolutas do GitHub.
- Usar o `LICENSE` da raiz do pacote como fonte de `.pbai4devs/LICENSE`.
  Preservar a licença da raiz do consumidor e proteger conflitos no hub.
- Manter Node 18+ no launcher e Node 24+ no núcleo; isolar credenciais e cache
  nas provas de consumo público, sem instalar ferramentas implicitamente.
- Confirmar `latest`, integridade e download antes das provas anônimas.
- Simular a atualização do router, conferir propriedade e preservar dados,
  configurações, ferramentas locais e commits humanos existentes.

Não criar documentos de produto no router, redefinir sua licença nem alterar
versões publicadas. A entrega não promete ausência total de bugs.

## Critérios de aceite

| ID | Resultado observável |
| --- | --- |
| AC-001 | Pacote identifica PathBit, palavras-chave e licença MIT. |
| AC-002 | README do TGZ não tem YAML; links locais tornam-se absolutos. |
| AC-003 | Hub recebe a licença canônica sem alterar a do consumidor. |
| AC-004 | Runtime e consumo público mantêm os contratos de ambiente. |
| AC-005 | Versão estável em `latest` instala e opera sem autenticação. |
| AC-006 | Router atualizado preserva arquivos, dados e commits anteriores. |

## Plano de verificação

Resultados ficam em `.agent-tests/public-package/`, separados desta spec.
O código dos testes é versionado. Cada prova registra comando, versão,
pré-requisitos, assertiva e caminho da evidência no relatório de revisão.

- **AC-001:** inspecionar o `package.json` do TGZ exato e os metadados do npm;
  comparar autoria, palavras-chave, MIT e versão com a fonte aprovada.
- **AC-002:** testar empacotamento e extrair o TGZ; verificar a primeira linha,
  links de arquivos/imagens e preservação dos bytes do README fonte.
- **AC-003:** executar testes de instalação e distribuição em projetos novos
  e existentes; comparar as licenças, testar conflito, backup e diagnóstico.
- **AC-004:** executar testes do launcher, publicação e distribuição; provar
  compatibilidade de runtime, cache isolado e ausência de tokens no consumidor.
- **AC-005:** publicar o artefato aprovado; consultar `latest` e baixar;
  executar `--version`, `init`, `doctor` e `sync --check` em destino e cache
  novos.
- **AC-006:** salvar hashes e estado Git do router, revisar `--dry-run`, aplicar
  a versão fixada e repetir diagnóstico/sincronização; comparar arquivos
  próprios, oito recibos de ferramentas e histórico com o estado anterior.

A revisão independente confere o relatório e os achados antes da conclusão.
Esta mudança exige terminal e registro npm; não altera interface web/desktop.

## Documentação afetada

Atualizar README público, guias de instalação/publicação, PRD, design, roadmap,
índice de specs, changelog e descrição da licença no hub. Revisar somente os
trechos do README do router afetados pela atualização, preservando seu contexto.

[Specs](../README.md) · [Pacote npm](../../maintainers/packages.md)
