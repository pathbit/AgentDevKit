---
description: Alterações verificáveis por versão do AgentDevKit.
---

# Changelog

## 0.0.30 — 2026-11-14

- Melhora a detecção de Node e npm com preloads que escrevem na saída, sem
  alterar `NODE_OPTIONS`; respostas ambíguas bloqueiam o download.
- Acrescenta uma matriz reproduzível de projetos novos e existentes, com
  snapshots por etapa e resultados mantidos em diretórios temporários.

## 0.0.29 — 2026-11-14

- Oferece `--raw` para separar a saída do script dos metadados do kit, com
  os limites de instrumentação do ambiente documentados.
- Esclarece a preservação do índice em consultas sem escrita de `git-commit`.

## 0.0.28 — 2026-11-14

- Encadeia preparo do runtime, diagnóstico e execução por `--executar`, com
  plano somente de leitura e opção de não instalar o runtime.
- Rejeita alvos inválidos antes de preparar o ambiente e reconhece o primeiro
  Node compatível no PATH; documenta os limites de saída e isolamento.

## 0.0.27 — 2026-11-14

- Esclarece que desativar locks opcionais não garante a preservação dos bytes
  do índice Git e orienta a interromper consultas sem método seguro comprovado.
- Delimita a garantia do teste de consultas à fixture realmente exercitada.

## 0.0.26 — 2026-11-14

- Preserva os bytes do índice nas consultas do gate para os casos suportados e
  recusa configurações que não consegue verificar com segurança.
- Exige cobertura e comparação dos arquivos preparados em `check-commit`;
  bloqueia flags, nomes, modos e transformações não comprovados.
- Aguarda a decisão antes de editar documentos com contradições não resolvidas.

## 0.0.25 — 2026-11-14

- Verifica a cobertura e o conteúdo revisado antes de um merge fast-forward;
  bloqueia situações que o gate não consegue comprovar.
- Esclarece a validação na origem e a interrupção do merge quando o gate falha.
- Amplia as provas de preservação em projetos existentes e explica os limites
  do campo `preserved`. Os projetos de exemplo gerados continuam locais.

## 0.0.24 — 2026-11-14

- Preserva catálogos, configuração e blocos existentes sem comprovação de
  propriedade, inclusive ao usar `--force` ou sincronização direta.
- Mantém o estado coerente quando a sincronização atualiza saídas gerenciadas.
- Acrescenta testes de colisão, arquivos idênticos e preservação do índice Git.

## 0.0.23 — 2026-11-13

- Corrige a resolução de destinos inexistentes diretamente sob a raiz.
- Aceita aliases temporários confiáveis do macOS e recusa destinos que
  atravessam links humanos, inclusive os indicados por variáveis de ambiente.
- Orienta roadmap e spec antes da configuração técnica e acrescenta uma
  verificação do estado antes da implementação.
- Aplica a verificação também aos especialistas e orienta consultas Git que
  preservam os bytes do índice.

## 0.0.22 — 2026-11-13

- Descoberta de skills do Codex sem duplicação, com alternativa segura quando a
  rota principal está obstruída.
- Sincronização e atualização reconciliam o estado sem substituir recursos ou
  metadados humanos.
- Scripts reconhecem caminhos por aliases e exemplos de maturidade usam saídas isoladas.
- Testes ampliados para combinações de clientes, projetos existentes e
  preservação do Git.

## 0.0.21 — 2026-11-13

- Criação automática da tag da versão após aprovação da matriz de CI.
- Publicação acionada pela automação com proteção contra colisões de tags.

## 0.0.20 — 2026-11-13

- Atualização da ferramenta agent-browser compatível com sua distribuição atual.
- Orientações para consultar e recuperar versões pelas tags publicadas.

## 0.0.19 — 2026-11-13

- Pastas dos clientes são ignoradas localmente por padrão, com exceções do projeto.
- O índice Git e os arquivos já rastreados permanecem intactos.

## 0.0.18 — 2026-11-13

- Sincronização preserva recursos próprios, colisões e alterações humanas.
- Limpeza de recursos obsoletos exige comprovação de propriedade.
- Comandos e efeitos sobre arquivos, índice e backups documentados.

## 0.0.17 — 2026-11-13

- A pasta compartilhada de estado passa a se chamar `.pbai4devs/state`.
- Instalações existentes migram os dados sem alterar o índice ou o ignore.

## 0.0.16 — 2026-11-13

- Testes portáteis distribuídos entre jobs para Windows e macOS.
- Diagnósticos de subprocessos e espera do CI melhorados para releases.
- Instruções para recuperar o artefato da tentativa correta do CI.

## 0.0.15 — 2026-11-13

- Especialistas e skills para arquitetura, backend, frontend, QA e performance.
- Revisão de código e validação adversarial orientadas por evidências.
- Delegação de tarefas independentes com responsabilidades e limites claros.
- Preservação de arquivos e configurações existentes coberta por integração.
- Permissões de somente leitura do revisor compatíveis com OpenCode V2.
- Testes portáveis com concorrência limitada e diagnóstico de falhas da CLI.

## 0.0.14 — 2026-11-12

- O `.gitignore` da raiz pertence ao projeto e não é alterado pelo kit.
- Exclusões locais ficam no Git e conflitos são informados antes da instalação.
- Projetos sem Git recebem orientação para ativar a proteção após `git init`.
- Negação ambígua, blocos antigos e artefatos rastreados recebem diagnóstico.

## 0.0.13 — 2026-11-12

- Proteção de caches de agentes mesmo com negações genéricas no `.gitignore`.
- Matriz de compatibilidade ampliada para os sete projetos públicos solicitados.
- Dois exemplos reproduzíveis com produto, design e três specs testadas.

## 0.0.12 — 2026-11-12

- Entradas e recursos existentes recebem referências em blocos próprios do kit.
- Texto, metadados e alterações humanas são preservados nas atualizações.
- Comandos Gemini recebem complementos dentro do prompt TOML.
- Arquivos mistos não são desindexados nem ignorados como se fossem do kit.
- Título principal do README: Pathbit AI - AgentDevKit.

## 0.0.11 — 2026-11-12

- Skills de segurança incluídas nas instalações, com revisão e correção guiadas.
- Agentes, comandos e regras conectados em fluxos de entrega e auditoria.
- Gitleaks, OSV-Scanner e Opengrep locais, com versões e hashes revisados.
- Auditoria offline e preparo explícito de bases, sem conta de análise externa.
- Relatórios redigidos, testes reais dos scanners e preservação de recursos próprios.
- Curadoria de ferramentas e skills com licenças, fontes e limites documentados.

## 0.0.10 — 2026-11-12

- Mesmo pacote publicado no npm e GitHub Packages, com versão e bytes iguais.
- Instalação via npx nos dois registries, com credenciais isoladas por destino.
- Guias de pré-requisitos para Windows, macOS e Linux, incluindo Node/npm.
- README, wiki e notas de release com os dois caminhos de instalação.
- Diagnóstico de mapeamentos antigos de registry sem apagar configurações.

## 0.0.9 — 2026-11-12

- Links e configurações humanos preservados na instalação dos agentes.
- Colisões com recursos nativos próprios não são sobrescritas pelo kit.
- Sincronização mantém recursos humanos, inclusive com `--force`.
- Caminhos preservados são informados sem registrar propriedade indevida.
- Matriz OSS verifica agentes preexistentes e sincronização independente.
- Inventário e fluxo documental exigem leitura e complementos sem substituição.
- Exercícios documentais cobrem projetos reais e um projeto vazio.

## 0.0.8 — 2026-11-11

- Preservação de arquivos humanos que parecem apontamentos gerados.
- Conflitos de ignore recusados antes das gravações e rollback revisado.
- Permissões mantidas em atualização, backup e restauração de arquivos.
- Caminhos simbólicos de ferramentas bloqueados antes de escrita externa.
- Argumentos de ferramentas preservados após `--`; ajuda sem projeto válido.
- Verificação de artefatos com nomes próprios, arquivos e regras aninhadas.

## 0.0.7 — 2026-11-11

- Artefatos de testes e pastas temporárias protegidos em projetos existentes.
- Regras locais respeitam o escopo do projeto e as exceções do usuário.
- Teste opt-in em clones reais, com commits fixos e comparação de arquivos.
- Relato explícito de bloqueios por links simbólicos preexistentes.

## 0.0.6 — 2026-11-11

- Metadados npm com autoria PathBit, palavras-chave e licença MIT.
- README público sem frontmatter, com links absolutos para o GitHub.
- Licença canônica instalada no hub, preservando a licença do consumidor.
- Verificação de versão estável, consumo anônimo e atualização do router.

## 0.0.5 — 2026-11-11

- Documentação organizada em guias, produto e manutenção, com índices próprios.
- Instalação e próximos passos usam o pacote nomeado no npm público, sem login.
- Notas e guias apontam para o registro e sua página de versões.
- Publicação verifica instalação, diagnóstico e sincronização sem autenticação.
- Publicação prioriza o secret `NPMJS_TOKEN`; sem token, usa OIDC.

## 0.0.4 — 2026-11-11

- Código em `src/`, testes em `tests/` e publicação em `scripts/release/`.
- Exemplos completos em `examples/generated/`, com guia versionado e comandos.
- Preparação dos exemplos sem depender de pastas geradas na raiz.
- Relatórios de exemplos atualizados, sem reutilizar resultados antigos.
- Guia rápido de desenvolvimento e automações npm para verificar e empacotar.
- Compatibilidade de instalação, atualização e publicação mantida.

## Distribuição no GitHub Packages

- Pacote único `@pathbit/agentdevkit` instalável pelo registro com npx.
- Publicação do artefato verificado e retomada para tags existentes.
- Documentação de autenticação e acesso aos pacotes.

## 0.0.3 — 2026-11-11

- Fontes do produto, testes e automações concentrados em `.pbai4devs`.
- Saídas de agentes e preferências locais fora do versionamento.
- Layouts de clientes declarativos e entradas geradas com preservação humana.
- Bootstrap JavaScript e uso de npx mantido, sem scripts shell próprios.
- CI dividido por responsabilidade e release reutilizando artifact aprovado.

## 0.0.2 — 2026-11-11

- Seleção persistente de agentes na instalação e no comando `agents`.
- Instalação e sincronização limitadas aos clientes escolhidos e dependências.
- Remoção de apontamentos desmarcados com preservação de arquivos próprios.
- Pacotes verificados como artifacts do CI e geração manual pelo Actions.
- Releases reutilizam o pacote testado, com verificação de checksum.
- Formulários de bugs e melhorias e modelo de pull request.
- Wiki organizada por tarefa: instalação, CLI, fluxo, recursos e recuperação.
- Guias de ferramentas, testes, arquitetura, contribuição e releases.

## 0.0.1 — 2026-11-11

- Extração das fontes compartilhadas para o repositório AgentDevKit.
- Origem `.pbai4devs` com skills, regras, comandos, modelos e testes.
- Documentação inicial em português, com entradas em inglês e espanhol.
- CLI para instalar, atualizar, diagnosticar e indicar próximos passos.
- Testes de distribuição para preservar projetos e excluir artefatos locais.

Os resultados de validação ficam em relatórios ignorados e no CI, separados
deste registro das funcionalidades entregues.
