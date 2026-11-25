---
description: Tarefas do componente de validação de registros de recuperação.
status: em andamento
---

# Registro de recuperação

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Spec: [registro-recuperacao](../../specs/registro-recuperacao/SPEC.md).
Release: pendente.

- [x] Definir formato e limites dos registros imutáveis.
- [x] Implementar e testar o validador puro em macOS e Linux, inclusive um
  histórico sintético de mil operações e entradas corrompidas.
- [x] Verificar criação exclusiva concorrente no sistema de arquivos local.
- [-] Revisar o diff e validar o componente em Windows.
- [-] Classificar comandos para a futura barreira: o componente isolado cobre
  opções da CLI, mas não bloqueia mutações nem classifica o sync direto.
- [ ] Integrar publicação, leitura segura, backup e bloqueio à CLI e ao sync.
- [ ] Corrigir e provar os onze cenários estritos de recuperação e limpeza.

Evidências locais: `.agent-tests/registro-recuperacao/prova-5bq7Fj/`.
Os testes locais não comprovam comportamento em sistemas de arquivos de rede.

[reading-pt]: TASKS.md
[reading-en]: ../../en/tasks/registro-recuperacao/TASKS.md
[reading-es]: ../../es/tasks/registro-recuperacao/TASKS.md
