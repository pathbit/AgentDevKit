---
name: corrigir-vulnerabilidade
description: "Corrige un hallazgo validado y prueba que se eliminó la causa."
language: es
---

# Corregir vulnerabilidad

[Português (Brasil)][reading-pt] · [English][reading-en] · [Español][reading-es]

Reciba el hallazgo y su evidencia de [revisar
seguros](../revisar-seguranca/SKILL.md). Compruebe el camino de abuso y el
alcance autorizado. Esclarezca dudas y presente el plan antes de editar,
respetando aprobaciones ya dadas.

Corrija la causa, preserve el contrato legítimo y añada una prueba de regresión
que le haya hecho antes y pase después. No se le ha seleccionado ninguna regla o
excluye un archivo solo para dejar el escáner verde; documente falsos positivos
con justificación. Si la corrección cubre otro escenario descubierto, añade
también una prueba automatizada versionable para él; una prueba avulsa sólo
complementa la prueba.

Use [implementar-spec](../../specs/implementar-spec/SKILL.md) cuando hay spec y
[verificar trabajo](../../projeto/verificar-trabalho/SKILL.md) para las pruebas.
Repita el escáner relevante y el escenario original. Los cambios web requieren
navegador; autorización requiere la matriz de
[permisos](../revisar-autorizacao/SKILL.md).

Si hay un secreto real, no lo reproduce. Informe al responsable de la revocación
y rotación del canal apropiado; eliminar el código no invalida la placa. No
cambie cuentas, historial Git o servicios externos sin alcance explícito.

Salida: corrección, prueba, riesgo residual y documentación actualizada. Cierre
con [revisar entrega](../../../commands/revisar-entrega/COMMAND.md), incluida
revisión independiente y evidencia ignorada en `.agent-tests/security/`.

[reading-pt]: ../../../../../../.pbai4devs/skills/seguranca/corrigir-vulnerabilidade/SKILL.md
[reading-en]: ../../../../../en/kit/skills/seguranca/corrigir-vulnerabilidade/SKILL.md
[reading-es]: SKILL.md
