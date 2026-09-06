import type { AnyModuleDef } from "./types";
import { simonModule } from "./simon";

/** Cada módulo novo da F9 só precisa se registrar aqui. */
export const MODULE_REGISTRY: Record<string, AnyModuleDef> = {
  [simonModule.id]: simonModule,
};

export function getModuleDef(id: string): AnyModuleDef {
  const def = MODULE_REGISTRY[id];
  if (!def) throw new Error(`Módulo desconhecido: ${id}`);
  return def;
}
