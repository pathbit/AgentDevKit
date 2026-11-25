---
description: "Seguridad con escáneres locales, selección y pruebas de controles."
language: es
---

# Seguridad local

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

El kit instala skills, reglas, órdenes y perfiles para revisar seguridad. Los
escáneres requieren preparación explícita; ninguna auditoría o aplicación
comienza en segundo plano sólo porque los archivos de instrucción fueron
instalados.

O [guía operativa][guide] acompaña al hub en el proyecto consumidor. Explica
preparación de las herramientas, bases offline, informe y selección, además de
las pruebas manuales de autorización, aislamiento de datos, entradas y abuso.

- [Preparación de la seguridad][prepare]: instalar y verificar los escáneres
  locales.
- [Auditar seguridad][audit]: analizar el objetivo autorizado e interpretar
  señales.
- [Revisar autorización][authorization]: probar identidad y acceso por recurso.
- [Modelar amenazas][threats]: anticipar riesgos de las fronteras de confianza.
- [Curadoria](security-references.md): fuentes, licencias y herramientas
  evaluadas.

Use el [mapa del ecosistema](resources.md) Para entender cómo perfiles, skills,
órdenes, reglas y scripts se conectan. Resultados se encuentran en
`.agent-tests/`; escáneres solos no aprueban la seguridad de un producto.

[Wiki](../README.md) · [Herramientas y pruebas](tools-and-testing.md)

[guide]: ../kit/skills/seguranca/REFERENCE.md
[prepare]: ../kit/commands/preparar-seguranca/COMMAND.md
[audit]: ../kit/commands/auditar-seguranca/COMMAND.md
[authorization]: ../kit/skills/seguranca/revisar-autorizacao/SKILL.md
[threats]: ../kit/skills/seguranca/modelar-ameacas/SKILL.md

[reading-pt]: ../../guides/security.md
[reading-en]: ../../en/guides/security.md
[reading-es]: security.md
