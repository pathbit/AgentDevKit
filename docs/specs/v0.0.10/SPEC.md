---
description: Publicação da documentação de instalação e da distribuição nos dois registries.
status: aprovado
version: 0.0.10
---

# Publicar e verificar os dois caminhos de instalação

## Objetivo

Publicar a versão 0.0.10 com os guias de pré-requisitos e instalação já
aprovados. Disponibilizar os mesmos bytes no npm e GitHub Packages e provar
o consumo da versão publicada nos dois destinos.

## Contrato

- Manter npm público sem login e GitHub Packages com autenticação própria.
- Usar somente o artefato aprovado pelo CI do commit da tag.
- Conferir versão, integridade, visibilidade pública e associação ao repositório.
- Incluir os dois comandos de instalação no README, guias e notas da release.
- Preservar versões anteriores, arquivos humanos e configurações existentes.
- Guardar downloads e evidências em diretórios ignorados.

## Critérios de aceite

| ID | Resultado observável |
| --- | --- |
| AC-001 | Versão, lockfile, changelog, guias e notas coerentes com 0.0.10. |
| AC-002 | CI aprovado nos quatro perfis e tag no commit verificado. |
| AC-003 | Versão 0.0.10 pública nos dois registries, com bytes iguais ao CI. |
| AC-004 | Versão, init, doctor e sync --check passam nos dois registries. |
| AC-005 | Licença e guias incluídos, sem artefatos locais ou credenciais. |

## Validação

Testar geração das notas e distribuição local. Após o CI, publicar a tag,
baixar o artefato original e comparar os checksums da release e dos registries.
Usar caches e projetos novos: npm sem credenciais; GitHub com token exclusivo.
Conferir `latest`, README público, licença e os quatro comandos da CLI.

Os instaladores nativos dos sistemas são documentados com fontes oficiais;
esta release não afirma reinstalá-los em máquinas que já têm os pré-requisitos.
