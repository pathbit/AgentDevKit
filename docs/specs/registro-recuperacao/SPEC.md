---
description: Validação conservadora de registros imutáveis de recuperação.
status: aprovado
---

# Registro de recuperação

Primeiro componente da [recuperação conservadora](../recuperacao-conservadora/SPEC.md).
Este incremento é uma função pura: não lê ou escreve arquivos, não altera
instalação ou sync e ainda não protege projetos. A autorização geral do usuário
cobre o incremento; o contrato histórico de rollback permanece inalterado.
O [PRD](../../product/prd.md), a [UX](../../product/ux-ui.md), o
[design](../../product/design.md) e o [roadmap](../../product/roadmap.md)
continuam válidos.

## Contrato

Receber registros como pares de nome e bytes, já obtidos por um chamador. Aceitar
somente nomes canônicos `<geração de 12 dígitos>.<tipo>.json`, começando na
geração 1, e os tipos `claim`, `begin`, `done` e `resolved`. Cada registro é
JSON canônico UTF-8, sem espaços e terminado por uma quebra de linha. As chaves
aparecem na ordem `version`, `generation`, `id`, `kind`, seguidas das chaves
abaixo; não são aceitos campos extras. A versão é `1` e o ID é UUID v4 minúsculo.

| Tipo | Chaves adicionais, na ordem |
| --- | --- |
| `claim` | `previous`: `null` ou hash do terminal anterior. |
| `begin` | `claim` e `manifest`: hashes hexadecimais minúsculos. |
| `done` | `begin`: SHA-256 dos bytes de `begin`. |
| `resolved` | `claim`: hash; `begin`: hash ou `null`. |

`claim.previous` é `null` na primeira geração. `begin` aponta aos hashes do
`claim` e do manifesto; `done` ao hash dos bytes de `begin`;
`resolved` aos hashes de `claim` e de `begin`, ou `null` quando este não existe.
Cada geração deve ter ID próprio e `claim`; `done` exige `begin`; `done` e
`resolved` são mutuamente exclusivos. Gerações anteriores devem estar
concluídas ou resolvidas.
Sem terminal, a última geração está pendente. Sem registros, está pronta.
Qualquer erro, nome desconhecido, duplicata, truncamento, JSON não canônico,
hash inconsistente, sequência incompleta ou limite excedido retorna `invalid`.
Não imprimir dados dos registros. Limitar tamanho por registro e total de
entradas (4.000), 4.096 bytes por registro e 1 MiB no total; aceitar somente
bytes e nomes explícitos, sem memória compartilhada. `ready` retorna
`generation` e `head` (hash do terminal ou `null` para lista vazia); quando há
registros, também retorna `terminal` e `resolvedCount`. `pending` retorna
`generation`, `id` e `phase`; `invalid` retorna `reason` com código fixo.
A saída não reproduz bytes ou campos arbitrários do conteúdo recebido.

A entrada deve ser um array comum do mesmo contexto JavaScript, sem iterador
próprio ou lacunas. Cada entrada deve ter propriedades próprias de dados
`name` e `bytes`, sem getters ou proxies; os bytes devem ser `Uint8Array` ou
`Buffer`, inclusive subclasses, com `ArrayBuffer` não compartilhado. Entradas
rejeitadas não executam getters ou iteradores fornecidos pelo chamador.

`ready` significa apenas que a lista recebida é coerente e não contém operação
pendente. Uma lista vazia ou com uma cauda omitida não comprova que o diário
em disco esteja vazio ou completo; o encadeamento não impede adulteração.
Um chamador futuro deverá comprovar sua
leitura e tratar qualquer estado diferente de `ready` como bloqueio. O formato
não distingue o motivo humano de uma resolução e não autoriza ignorar o plano
ou o conteúdo atual do projeto.

SHA-256 detecta divergência, não impede adulteração por quem escreve o diário.
Esta função não valida arquivos, links, permissões, backup ou durabilidade.
O protocolo futuro precisa de leitura segura, publicação exclusiva, tratamento
de falhas e integração antes de qualquer garantia. A
[documentação do Node](https://nodejs.org/api/fs.html#file-system-flags)
informa que exclusividade pode não funcionar em sistemas de arquivos de rede.
Antes da integração, definir vínculo ao projeto e retenção segura: um diário
legítimo pode atingir os limites e, hoje, passaria a ser recusado. Não há
compactação ou limpeza automática neste componente.

## Critérios de aceite

- **AC-001:** Testes de vazio, pendente, concluído, resolvido e múltiplas
  gerações validam os estados e não alteram os bytes fornecidos.
- **AC-002:** Testes rejeitam duplicatas, buracos, transições inválidas,
  versões e nomes desconhecidos, dados truncados e hashes divergentes.
- **AC-003:** Limites, UTF-8 inválido, JSON com campos duplicados ou extras e
  formatos não canônicos falham de forma conservadora sem imprimir conteúdo.
- **AC-004:** Os mesmos testes passam em macOS e Linux; Windows é registrado
  como não verificado até uma execução real. Nenhuma integração é alegada.
- **AC-005:** Em três rodadas, 16 processos disputam uma criação exclusiva;
  somente um vence em cada rodada no sistema testado. Isso não prova exclusividade
  em sistemas de arquivos de rede ou garante a integração futura.

Execute `node --test tests/recovery-records.test.mjs tests/recovery-exclusive.test.mjs`
com Node 24+. Salve logs
em `.agent-tests/registro-recuperacao/`. Testes, spec e código são versionáveis;
resultados e fixtures ficam fora do Git. A release depende da integração,
revisão e provas completas, inclusive dos testes estritos de rollback.
