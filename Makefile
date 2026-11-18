COMPOSE_FILE := infra/compose/compose.local.yml
COMPOSE := docker compose -f $(COMPOSE_FILE)

.PHONY: help doctor setup up down logs test lint build
.DEFAULT_GOAL := help

help:
	@printf '%s\n' 'doctor: verifica pré-requisitos e Compose' 'setup: instala dependências pelo lockfile' 'up: executa a CLI isolada e termina' 'down: informa o ciclo de vida da CLI' 'logs: informa onde fica a saída da CLI' 'test: executa npm test' 'lint: executa npm run check' 'build: gera o pacote local'

doctor:
	node -e "if (Number(process.versions.node.split('.')[0]) < 24) { console.error('Use Node.js 24+'); process.exit(1); } console.log(process.version)"
	npm --version
	git --version
	docker version --format '{{.Server.Version}}'
	docker compose version
	docker image inspect node:24-bookworm --format '{{.Id}}'
	$(COMPOSE) config --quiet

setup:
	@test ! -e node_modules && test ! -L node_modules || { printf '%s\n' 'node_modules já existe; revise antes de executar npm ci.' >&2; exit 1; }
	$(MAKE) doctor
	npm ci --ignore-scripts --no-audit --no-fund

up:
	$(COMPOSE) --project-name agentdevkit-local-$$$$ run --rm --no-deps --pull never -T cli --version --json

down:
	@printf '%s\n' 'A CLI termina após cada execução; não há serviço persistente para parar.'

logs:
	@printf '%s\n' 'A CLI imprime sua saída no terminal durante cada execução.'

test:
	npm test

lint:
	npm run check

build:
	@node -e 'const fs=require("node:fs"),p=require("node:path"),v=require("./package.json").version; if(!/^\d+\.\d+\.\d+$$/.test(v)) throw Error("Versão inválida"); for(const d of [".agent-tests",p.join(".agent-tests","release")]) { try { const s=fs.lstatSync(d); if(!s.isDirectory() || s.isSymbolicLink()) throw Error("Diretório de release inseguro: "+d); } catch(e) { if(e.code!=="ENOENT") throw e; } } try { fs.lstatSync(p.join(".agent-tests","release",v)); console.error("O diretório de release já existe; preserve-o e revise antes do build."); process.exit(1); } catch(e) { if(e.code!=="ENOENT") throw e; }'
	npm run build
