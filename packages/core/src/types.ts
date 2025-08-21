export type Value = string | number | boolean | null;

export interface Bind {
  ref: string;
  type?: string | null;
  required?: string | null;
  relevant?: string | null;
  constraint?: string | null;
  calculate?: string | null;
  readonly?: string | null;
}

export interface FormModel {
  modelId?: string | null;
  binds: Bind[];
  itext: Record<string, Record<string,string>>;
  instanceRootName: string;
  initialInstanceXml: string;
}

export interface FormSession {
  getValue(path: string): Value;
  setValue(path: string, value: Value): void;
  evaluate(expr: string, ctx?: { ref?: string }): any;
  isRelevant(path: string): boolean;
  isRequired(path: string): boolean;
  isValid(path?: string): boolean;
  serialize(): string;
  setLanguage(lang: string): void;
  on(event: 'change'|'recalc'|'language', cb: (...args: any[]) => void): () => void;
  addRepeat: (groupPath: string) => string;
  deleteRepeat: (groupPath: string, index: number) => void;
}