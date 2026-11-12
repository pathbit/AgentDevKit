---
description: Instalação e publicação do pacote npm público do AgentDevKit.
---

# Pacote npm público

O AgentDevKit é um único pacote: [`@pathbit/agentdevkit`][package]. Ele contém
a CLI e os recursos compartilhados; a instalação prepara os apontamentos dos
agentes escolhidos no projeto.

Os metadados identificam PathBit como autor, palavras-chave do kit e licença
MIT. O README público é gerado sem frontmatter e com links absolutos do GitHub;
a fonte versionada conserva o YAML. O `LICENSE` canônico acompanha o pacote e
é instalado em `.pbai4devs/LICENSE`, sem alterar a licença do consumidor.
Ferramentas de terceiros baixadas à parte mantêm suas próprias licenças e
não integram o TGZ do AgentDevKit.

## Instalar no projeto

Com Node.js 18+ e npm, execute na pasta do projeto. Não é necessário login:

```console
npx @pathbit/agentdevkit init
```

Para repetir uma instalação, fixe a versão desejada após o nome do pacote.

Acrescente `--agents codex,claude` para selecionar clientes, `--dry-run` para
simular ou use `update`, `doctor` e `sync --check` no lugar de `init`.
Não é necessário instalar globalmente nem adicionar o kit às dependências
da aplicação. Para conferir as versões:

```console
npm view @pathbit/agentdevkit versions --json
```

Se existir um mapeamento antigo para o GitHub Packages, siga a
[correção de registry][fix].

## Publicar pelo Actions

A publicação usa o mesmo TGZ aprovado pelo CI, com acesso público. O workflow
confere versão, origem e integridade; uma versão existente só é aceita quando
contém os mesmos bytes. Não reempacote nem substitua uma versão publicada.

O workflow prioriza o secret do repositório `NPMJS_TOKEN`, recebido pela
variável interna `NPM_TOKEN` somente na publicação. O token precisa permitir
publicar no escopo `@pathbit`; credenciais nunca entram nos arquivos
versionados.

Sem esse secret, o workflow usa OIDC. Configure o **Trusted Publisher** do npm:

| Campo | Valor |
| --- | --- |
| Organization or user | `pathbit` |
| Repository | `AgentDevKit` |
| Workflow filename | `release.yml` |
| Allowed action | Publicação direta com `npm publish` |

O fallback recebe `id-token: write`. O npm exige CLI 11.5.1+ e Node 22.14+;
o projeto usa Node 24. Configure a relação de confiança depois que o pacote
existir; a primeira publicação pode usar o secret `NPMJS_TOKEN`.

Para publicar somente o pacote de uma tag que já tem artefato aprovado:

```console
gh workflow run release.yml --ref master -f tag=v0.0.8 -F package_only=true
```

Se o artefato expirou, reexecute o CI original da tag antes da publicação.
Depois do envio, o job usa um ambiente sem credenciais e cache novo para
executar `--version`, `init`, `doctor` e `sync --check` pelo nome e versão
publicados. Assim, a verificação comprova o acesso de um usuário comum.
Confirme também que `latest` aponta para a versão estável e que o tarball é
baixável; metadados visíveis sozinhos não comprovam uma instalação funcional.
Se o registro ainda não disponibilizar o pacote, aguarde a verificação sem
republicar automaticamente a mesma versão.

As versões antigas no [GitHub Packages][legacy] permanecem disponíveis;
o canal de instalação padrão é o npm público.

[Wiki](../README.md) · [Manutenção](maintenance.md) ·
[Instalação](../guides/installation.md)

[package]: https://www.npmjs.com/package/@pathbit/agentdevkit
[legacy]: https://github.com/pathbit/AgentDevKit/pkgs/npm/agentdevkit
[fix]: ../guides/troubleshooting.md#download-plataforma-ou-ferramenta-falhando
