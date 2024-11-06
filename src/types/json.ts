export type JSONValue = 
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[]
  | Record<string, unknown>;

export interface ErrorDetail {
  message: string;
  code: string;
  context?: Record<string, JSONValue>;
}

export function toJSONValue(value: unknown): JSONValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(toJSONValue);
  if (typeof value === 'object') {
    const result: { [key: string]: JSONValue } = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = toJSONValue(v);
    }
    return result;
  }
  return String(value);
} 