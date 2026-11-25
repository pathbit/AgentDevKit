---
description: "Server preparation MCP dotcontext location and explicit client connection."
language: en
---

# Dotcontext MCP

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

The plugin installs [`@dotcontext/mcp`, of Vinicius Lana's project][source],
under [license MIT][license]. The binary `dotcontext-mcp` use `--help` for
installation check. The server serves via studio when the client starts with
`serve`.

```console
npx @pathbit/agentdevkit plugins install dotcontext-mcp
npx @pathbit/agentdevkit plugins check dotcontext-mcp
```

The installation requires explicit selection. Connecting the server requires a
separate action on the chosen client. The steps above only prepare the package
and local shortcut of the kit. Activation of hooks is a dotcontext operation
itself. The distribution license brings the AI Coders Academy copyright notice.

## Connect by studio

Use shortcut `.pbai4devs/tools/bin/dotcontext-mcp.mjs` directly as server
process. Thus, stdin and stdout take MCP messages. Pass the project root into
`--repo-path` for the server to work on the given destination, including when
the client opens the process in another directory.

Choose a client and add the entry to the existing file, preserving the other
servers and settings. Replace `/projeto` e `/caminho/node` by the absolute paths
of the project and the Node 24+ on your machine.

| Client | File and input key |
| --- | --- |
| [Claude Code][claude] | `.mcp.json` at the root, in `mcpServers.dotcontext`. |
| [Cursor][cursor] | `.cursor/mcp.json`, in `mcpServers.dotcontext`. |
| [VS Code][vscode] | `.vscode/mcp.json`, in `servers.dotcontext`. |

For these customers, use the following fields in the entry `dotcontext`.

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

No [Codex][codex], include the table in `.codex/config.toml` on the reliable
design.

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

Confirm on the client that the server appears as connected and that context and
flow tools PREVC are visible, including `workflow-init` e `workflow-status`.
Explicit action `context init` dotcontext creates the project scaffold and can
add instructions and rules to ignore. MCP follow the [dotcontext
contract][source].

[& Tools](../README.md)

[source]: https://github.com/vinilana/dotcontext#mcp-server-setup
[license]: https://github.com/vinilana/dotcontext/blob/3a2733eba50cb13cf4913eb08de4e879e2cb5e23/LICENSE
[claude]: https://code.claude.com/docs/en/mcp
[cursor]: https://cursor.com/docs/mcp
[vscode]: https://code.visualstudio.com/docs/agent-customization/mcp-servers
[codex]: https://developers.openai.com/codex/mcp

[reading-pt]: ../../../../../.pbai4devs/tools/dotcontext-mcp/README.md
[reading-en]: README.md
[reading-es]: ../../../../es/kit/tools/dotcontext-mcp/README.md
