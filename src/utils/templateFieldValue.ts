// ObservationTemplateData has no unit column, so unit is encoded into the
// same value string (JSON) when present. Plain non-JSON values are treated
// as unitless, for templates saved before this existed.
interface EncodedValue {
  v: string;
  u: string;
}

export function encodeFieldValue(value: string, unit?: string | null): string {
  if (!unit) return value;
  return JSON.stringify({ v: value, u: unit } satisfies EncodedValue);
}

export function decodeFieldValue(raw: string | null | undefined): {
  value: string;
  unit?: string;
} {
  if (!raw) return { value: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "v" in parsed) {
      return { value: parsed.v ?? "", unit: parsed.u || undefined };
    }
  } catch {
    // fall through
  }
  return { value: raw };
}
