/** Convert a hook input to bytes. Core stays DOM-free; File lives here. */
export async function toArrayBuffer(
  input: File | ArrayBuffer,
): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) {
    return input;
  }
  return input.arrayBuffer();
}

export function resolveFilename(
  input: File | ArrayBuffer,
  override?: string,
): string | undefined {
  if (override !== undefined) {
    return override;
  }
  if (typeof File !== 'undefined' && input instanceof File) {
    return input.name;
  }
  return undefined;
}
