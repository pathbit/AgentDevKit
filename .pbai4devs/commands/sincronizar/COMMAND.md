---
description: Atualiza ou confere os apontamentos compartilhados dos agentes.
---

# Sincronizar

Entrada: sem argumentos usa `--force` para reparar; `--check` só confere.
Pré-requisitos: Node.js 24+ e manifesto `.pbai4devs/espelhos.conf` válido.

Siga [sincronizar-agentes](../../skills/projeto/sincronizar-agentes/SKILL.md)
e execute o script correspondente pelo seletor. A reconstrução pode sobrescrever
apontamentos e remover extras dos destinos gerenciados; preserva os arquivos
nativos fora desse escopo e mantém backup local do conteúdo próprio removido.
Após reparar, execute também `--check`.

Respeite os clientes registrados no manifesto. Para mudar a seleção salva,
use `agentdevkit agents <lista>`; sincronizar não ativa todos os clientes.

Saída: apontamentos atualizados ou divergências encontradas. Templates,
scripts, ferramentas, estado, testes, documentos e guias ficam fora dos espelhos.
