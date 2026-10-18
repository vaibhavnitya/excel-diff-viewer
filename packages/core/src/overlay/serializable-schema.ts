import type { OverlayRule, OverlaySchema, OverlayWorkbooksOptions } from '../types.js';

/**
 * Overlay schema safe to structured-clone into a Worker.
 * `fn` compose is represented without the function body — the Worker only
 * builds matched pairs; the main thread runs `fn`.
 */
export type SerializableOverlaySchema = {
  readonly join: OverlaySchema['join'];
  readonly compose:
    | { readonly kind: 'rules'; readonly rules: readonly OverlayRule[] }
    | { readonly kind: 'fn' };
  readonly passthrough?: OverlaySchema['passthrough'];
};

export type SerializableOverlayOptions = {
  readonly schema: SerializableOverlaySchema;
  readonly sheetName?: string;
  readonly limits?: OverlayWorkbooksOptions['limits'];
};

/** Strip `ComposeFn` so options can cross the Worker boundary. */
export function toSerializableOverlayOptions(
  options: OverlayWorkbooksOptions,
): SerializableOverlayOptions {
  const { schema, sheetName, limits } = options;
  if (schema.compose.kind === 'rules') {
    return {
      schema: {
        join: schema.join,
        compose: { kind: 'rules', rules: schema.compose.rules },
        passthrough: schema.passthrough,
      },
      sheetName,
      limits,
    };
  }
  return {
    schema: {
      join: schema.join,
      compose: { kind: 'fn' },
      passthrough: schema.passthrough,
    },
    sheetName,
    limits,
  };
}

/**
 * Rehydrate serializable options for the Worker engine.
 * `fn` compose gets a stub that must never be called in the Worker.
 */
export function fromSerializableOverlayOptions(
  options: SerializableOverlayOptions,
): OverlayWorkbooksOptions {
  if (options.schema.compose.kind === 'rules') {
    return {
      schema: {
        join: options.schema.join,
        compose: { kind: 'rules', rules: options.schema.compose.rules },
        passthrough: options.schema.passthrough,
      },
      sheetName: options.sheetName,
      limits: options.limits,
    };
  }
  return {
    schema: {
      join: options.schema.join,
      compose: {
        kind: 'fn',
        fn: () => {
          throw new Error('ComposeFn must not run inside the Worker');
        },
      },
      passthrough: options.schema.passthrough,
    },
    sheetName: options.sheetName,
    limits: options.limits,
  };
}
