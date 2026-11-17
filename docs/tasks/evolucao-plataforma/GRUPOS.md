---
description: Pedidos agrupados e prioridades para evolução do AgentDevKit.
status: em andamento
---

# Grupos de tarefas e melhorias

Esta lista consolida os pedidos da conversa por resultado esperado. Os detalhes,
as provas e os limites estão em [andamento e evidências](TASKS.md); o
[roadmap](../../product/roadmap.md) acompanha a evolução do produto. Uma tarefa
só fica concluída depois da validação correspondente.

## 1. Proteção dos projetos e sincronização — prioridade

- [ ] Preservar arquivos e configurações humanas, alterações staged e unstaged,
  índice, ignores e configuração Git em instalações, atualizações e sync.
- [ ] Resolver colisões e migrações de recursos antigos sem presumir propriedade,
  apagando apenas conteúdo cuja remoção seja comprovadamente segura.
- [ ] Investigar a atualização de referência gerada com `core.autocrlf=true`:
  o teste atual encontra divergência no registro de conteúdo e bloqueia o sync.
  Preservar a proteção contra edições humanas e o índice ao corrigir e validar.
- [ ] Corrigir recuperação concorrente e preservar ACLs e atributos estendidos;
  repetir os testes estritos nos sistemas aplicáveis.
- [ ] Documentar os efeitos, conflitos e limites de `init`, `update`, `sync`
  e demais comandos, inclusive projetos que já possuem agentes e skills.
- [ ] Validar a versão publicada e a candidata no router, sem alterar seu
  `.gitignore`, seu índice ou configurações; só atualizar após provas suficientes.

## 2. Fluxo de desenvolvimento e especialistas

- [ ] Guiar preparação, produto, UX/design, arquitetura, roadmap, specs e
  implementação na ordem acordada, coletando dúvidas antes de propor o plano.
- [ ] Comprovar pré-requisitos, aprovações e critérios de aceite; investigar
  proteção efetiva contra escrita antecipada, além de instruções textuais.
- [ ] Evoluir orientações de arquitetura, backend, frontend, QA, segurança,
  revisão, performance e validação adversarial, com subagentes quando possível.
- [ ] Aplicar as práticas pertinentes do material de performance e avaliar ECC
  e Superpowers, respeitando licenças e sem copiar conteúdo desnecessário.

## 3. Clientes, recursos e ferramentas

- [ ] Manter `.pbai4devs` como origem compartilhada e sincronizar somente os
  clientes selecionados, preservando seus arquivos nativos e recursos próprios.
- [ ] Validar individualmente skills e agentes, inclusive integrações nativas;
  acompanhar cobertura no [inventário](VALIDACAO-RECURSOS.md).
- [ ] Investigar o loop do OpenCode e documentar a remoção manual quando a
  origem for identificada; não criar agendamentos sem solicitação.
- [ ] Verificar bootstrap de Node e instalação, atualização e validação das
  ferramentas em Windows, macOS e Linux com uma entrada simples.
- [ ] Versionar código e fixtures de testes; manter resultados, capturas,
  `.playwright*` e projetos temporários fora do Git.

## 4. Pacote, CI e publicação

- [ ] Validar metadados, licença, conteúdo e instalação por npm, Yarn, pnpm e
  Bun; documentar pré-requisitos e as opções npm público e GitHub Packages.
- [ ] Executar os gates completos e os testes multiplataforma; corrigir falhas
  antes de publicar. Releases e pacotes devem corresponder à mesma tag.
- [ ] Distinguir testes aprovados, ignorados e não executados nos relatórios;
  não tratar uma execução parcial como prova completa.
- [ ] Conferir publicação e instalações reais nos registries após a release.

## 5. Documentação, exemplos e entrega

- [ ] Organizar README, guias, wiki, roadmap e issues com texto simples e
  profundo; validar frontmatter, lint e destinos e pertinência dos links.
- [ ] Manter exemplos sintéticos de projetos novos e existentes; avaliar material
  visual sem capturar informações ou janelas privadas.
- [ ] Revisar autoria humana e dados sensíveis em código, documentação e
  metadados; manter regras explícitas de autoria nas skills Git.
- [ ] Revisar o conjunto final, executar as provas necessárias e então fazer
  commit e push autorizados, acompanhando CI e publicação.

Os itens acima são agrupamentos de trabalho, não uma afirmação de que todos os
pedidos anteriores permanecem abertos ou de que já foram implementados. Consulte
as evidências para distinguir resultados parciais de pendências.
