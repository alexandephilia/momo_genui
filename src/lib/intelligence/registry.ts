/**
 * Intelligence UI — Component Registry
 *
 * Single source of truth for all registered Intelligence UI components.
 */

import type { ComponentType } from "react";
import type { IntelComponentSpec, IntelBaseProps } from "./types";

interface RegisteredComponent {
  spec: IntelComponentSpec;
  component: ComponentType<IntelBaseProps> | null;
  sampleData: Record<string, unknown>;
  sampleConfig?: Record<string, unknown>;
}

const REGISTRY = new Map<string, RegisteredComponent>();

export function registerIntelComponent(entry: RegisteredComponent): void {
  REGISTRY.set(entry.spec.componentId, entry);
}

export function getIntelComponent(id: string): RegisteredComponent | undefined {
  return REGISTRY.get(id);
}

export function getAllIntelComponents(): RegisteredComponent[] {
  return Array.from(REGISTRY.values());
}
