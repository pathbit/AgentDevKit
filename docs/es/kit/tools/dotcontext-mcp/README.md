---
description: "Preparo del servidor MCP local del dotcontext y conexión explícita por cliente."
language: es
---

# Dotcontext MCP

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El complemento instala [`@dotcontext/mcp`del proyecto de Vinicius Lana][source],
bajo la [licencia MIT][license]. El binario `dotcontext-mcp` usa `--help` para
la verificación de instalación. El servidor atiende vía stdio cuando el cliente
lo inicia con `serve`.

```console
npx @pathbit/agentdevkit plugins install dotcontext-mcp
npx @pathbit/agentdevkit plugins check dotcontext-mcp
```

La instalación requiere selección explícita. Conectar el servidor requiere una
acción separada en el cliente elegido. Las etapas arriba sólo preparan el
paquete y el acceso rápido local del kit. La activación de hooks es una
operación propia del dotcontext. La licencia de la distribución trae el aviso de
copyright de la AI Coders Academy.

## Conectar por stdio

Use el acceso rápido `.pbai4devs/tools/bin/dotcontext-mcp.mjs` directamente como
proceso del servidor. Así, stdin y stdout llevan los mensajes MCP. Pase la raíz
del proyecto en `--repo-path` Para el servidor trabajar en el destino indicado,
incluso cuando el cliente abra el proceso en otro directorio.

Elija un cliente y añada la entrada al archivo existente, preservando los demás
servidores y configuraciones. Sustituye `/projeto` e `/caminho/node` por los
caminos absolutos del proyecto y del Node 24+ en su máquina.

| Cliente | Archivo y clave de la entrada |
| --- | --- |
| [Claude Code][claude] | `.mcp.json` en la raíz, en `mcpServers.dotcontext`. |
| [Cursor][cursor] | `.cursor/mcp.json`, en `mcpServers.dotcontext`. |
| [VS Code][vscode] | `.vscode/mcp.json`, en `servers.dotcontext`. |

Para estos clientes, use los siguientes campos en la entrada `dotcontext`.

```json
{
  "type": "stdio",
  "command": "/caminho/node",
  "args": [
    "/projeto/.pbai4devs/tools/bin/dotcontext-mcp.mjs",
    "serve",
    "--repo-path",
    "/projeto"
  ]
}
```

No [Codex][codex], incluya la tabla en `.codex/config.toml` En el proyecto
confiable.

```toml
[mcp_servers.dotcontext]
command = "/caminho/node"
args = [
  "/projeto/.pbai4devs/tools/bin/dotcontext-mcp.mjs",
  "serve",
  "--repo-path",
  "/projeto",
]
```

Compruebe que el servidor aparece como conectado y que las herramientas
contextuales y del flujo PREVC Están visibles, incluyendo `workflow-init` e
`workflow-status`. La acción explícita `context init` del dotcontext crea el
scaffold del proyecto y puede añadir instrucciones y reglas de ignore. Las
acciones del MCP seguem o [contrato dotcontext][source].

[Herramientas](../README.md)

[source]: https://github.com/vinilana/dotcontext#mcp-server-setup
[license]: https://github.com/vinilana/dotcontext/blob/3a2733eba50cb13cf4913eb08de4e879e2cb5e23/LICENSE
[claude]: https://code.claude.com/docs/en/mcp
[cursor]: https://cursor.com/docs/mcp
[vscode]: https://code.visualstudio.com/docs/agent-customization/mcp-servers
[codex]: https://developers.openai.com/codex/mcp

[reading-pt]: ../../../../../.pbai4devs/tools/dotcontext-mcp/README.md
[reading-en]: ../../../../en/kit/tools/dotcontext-mcp/README.md
[reading-es]: README.md
