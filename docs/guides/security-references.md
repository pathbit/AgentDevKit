---
description: Ferramentas e skills de segurança locais e open source.
---

# Referências de segurança

As verificações do kit executam no computador do projeto. Não exigem conta,
assinatura ou envio de código a um serviço. Downloads de ferramentas e bases
públicas são etapas explícitas; a análise usa os arquivos locais.

## Ferramentas selecionadas

| Ferramenta | Origem e licença | Função |
| --- | --- | --- |
| [Gitleaks][gitleaks] | Comunidade, MIT | Segredos em arquivos e Git. |
| [OSV-Scanner][osv] | Google, Apache-2.0 | Dependências, com base OSV local. |
| [Opengrep][opengrep] | Consórcio, LGPL-2.1 | Código, com regras locais. |

O catálogo fixa versões e hashes revisados. `install` verifica o download;
`check` confere o binário local; `update` aplica o pin revisado no catálogo.
Nenhum dos três exige Python instalado. O upstream do Gitleaks está focado
em manutenção e correções; isso deve ser considerado nas próximas revisões.

OSV deve usar `--offline`, não somente `--offline-vulnerabilities`.
A base precisa ser preparada antes: ausência de dados não é resultado limpo.
Opengrep usa configuração local e checagem de versão desativada; não use
`--config auto`. O comando de auditoria normaliza os resultados e remove
segredos e trechos de código dos relatórios.

## Complementos por necessidade

| Ferramenta | Licença | Quando considerar |
| --- | --- | --- |
| [Trivy][trivy] | Apache-2.0 | Imagens, IaC e SBOM. |
| [ZAP][zap] | Apache-2.0 | Aplicação em execução; exige Java. |
| [DevSkim][devskim] | MIT | Projetos .NET; exige runtime local. |

Esses complementos não são instalados pelo grupo `security`. Uma adoção exige
testar seu modo local, dependências, versão e licença. No ZAP, instalação não
inicia proxy, daemon ou ataque; configure identidades de teste e alvo local.
No Trivy, `--offline-scan` sozinho não bloqueia toda atualização de base.

Serviços de análise que exigem conta ficam fora desse fluxo. CodeQL CLI não
atende ao requisito de código aberto; Bandit e rotinas Python ficam fora do
runtime adotado. Uma opção gratuita não é automaticamente open source.

## Skills de mercado

| Fonte | Recurso | Tratamento |
| --- | --- | --- |
| [OpenAI][openai] | Práticas e ameaças | Apache-2.0 por pasta. |
| [GitHub][copilot] | Revisão de segurança | MIT. |
| [Trail of Bits][tob] | Contexto e diffs | CC-BY-SA-4.0; candidata. |

Os [pins e licenças do catálogo][catalog] evitam importar uma origem móvel.
As quatro skills próprias de segurança já acompanham o kit; referências
externas são opcionais e lidas por tarefa, sem copiar texto para os clientes.
Preserve atribuição e share-alike dos recursos da Trail of Bits.
Uma lista estática de CVEs em uma skill não substitui uma base atualizada.

## O artigo como ponto de partida

O [artigo compartilhado][article] orientou cinco temas: acesso aos dados,
autorização no servidor, acesso por ID, segredos e entradas não confiáveis.
O kit trata essas perguntas com verificações específicas:

- PostgreSQL/Supabase usa RLS e políticas; Firebase usa Security Rules.
  Papéis privilegiados e SDKs de servidor precisam de controles próprios.
- Ocultar um botão não autoriza uma operação. Teste sem sessão e com dois
  usuários ou tenants, incluindo acesso ao objeto de outra identidade.
- Variáveis enviadas ao bundle são públicas; variáveis do servidor não são
  automaticamente expostas. Um segredo confirmado exige remoção e rotação.
- Validação de entrada, consultas parametrizadas, codificação de saída,
  controles de upload e limites de uso resolvem riscos diferentes.

As referências técnicas são [RLS][rls], [Firebase Rules][firebase],
[autorização][authz], [segredos][secrets] e [uploads][uploads]. O kit não usa as
estatísticas do artigo como comprovação de segurança do projeto.

[Segurança no fluxo](security.md) · [Recursos](resources.md)

[gitleaks]: https://github.com/gitleaks/gitleaks/tree/v8.30.1
[osv]: https://github.com/google/osv-scanner/tree/v2.7.1
[opengrep]: https://github.com/opengrep/opengrep/tree/v1.33.1
[trivy]: https://github.com/aquasecurity/trivy
[zap]: https://www.zaproxy.org/docs/desktop/start/features/
[devskim]: https://github.com/microsoft/DevSkim
[openai]: https://github.com/openai/skills
[copilot]: https://github.com/github/awesome-copilot
[tob]: https://github.com/trailofbits/skills
[catalog]: ../../.pbai4devs/external-skills/CATALOG.json
[article]: https://manodeyvin.com.br/p/5-vacilacoes-de-seguranca-que-a-ia
[rls]: https://supabase.com/docs/guides/database/postgres/row-level-security
[firebase]: https://firebase.google.com/docs/rules
[authz]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[secrets]: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
[uploads]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
