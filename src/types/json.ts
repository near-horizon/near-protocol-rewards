export type JSONValue = 
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

export type JSONObject = { [key: string]: JSONValue };

export interface ErrorDetail {
  [key: string]: JSONValue;
  code: string;
  message: string;
  context?: { [key: string]: JSONValue };
}

export function toJSONValue(value: unknown): JSONValue {
  if (value === null) return null;
  if (['string', 'number', 'boolean'].includes(typeof value)) return value as JSONValue;
  if (Array.isArray(value)) return value.map(toJSONValue);
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [k, v]) => ({
        ...acc,
        [k]: v === undefined ? null : toJSONValue(v)
      }),
      {} as JSONObject
    );
  }
  return String(value);
} 