import { parseXml, serializeXml, qa, attr } from '@javarosa-js/utils';

export interface ParsedBind {
  ref: string;
  type?: string | null;
  required?: string | null;
  relevant?: string | null;
  constraint?: string | null;
  calculate?: string | null;
  readonly?: string | null;
}
export interface ParsedXForm {
  modelId?: string | null;
  instanceXml: string;
  binds: ParsedBind[];
  itext: Record<string, Record<string,string>>;
}

export function parseXForm(xml: string): ParsedXForm {
  const doc = parseXml(xml);
  const modelEl = (doc.getElementsByTagName('model')[0]) as Element;
  if (!modelEl) throw new Error('XForm missing <model>');
  const instanceEl = modelEl.getElementsByTagName('instance')[0] as Element;
  if (!instanceEl) throw new Error('XForm <model> missing <instance>');
  // serialize first child element of <instance>
  const first = Array.from(instanceEl.childNodes).find(n => n.nodeType === 1) as Element;
  if (!first) throw new Error('<instance> has no root element');
  const modelId = attr(first, 'id');
  const instanceDoc = first.ownerDocument!.implementation!.createDocument(null, null, null)!;
  const imported = instanceDoc.importNode(first, true);
  instanceDoc.appendChild(imported);
  const instanceXml = serializeXml(instanceDoc);

  const binds: ParsedBind[] = qa(modelEl, 'bind').map(b => ({
    ref: attr(b, 'ref') || attr(b, 'nodeset') || '',
    type: attr(b, 'type'),
    required: attr(b, 'required'),
    relevant: attr(b, 'relevant'),
    constraint: attr(b, 'constraint'),
    calculate: attr(b, 'calculate'),
    readonly: attr(b, 'readonly'),
  }));

  const itextRoot = modelEl.getElementsByTagName('itext')[0] as Element | undefined;
  const itext: Record<string, Record<string,string>> = {};
  if (itextRoot) {
    const translations = itextRoot.getElementsByTagName('translation');
    for (let i=0; i<translations.length; i++) {
      const t = translations.item(i) as Element;
      const lang = attr(t, 'lang') || 'default';
      itext[lang] = itext[lang] || {};
      const texts = t.getElementsByTagName('text');
      for (let j=0; j<texts.length; j++) {
        const txt = texts.item(j) as Element;
        const id = attr(txt, 'id') || '';
        const vals = txt.getElementsByTagName('value');
        if (id && vals.length) {
          itext[lang][id] = vals.item(0)!.textContent || '';
        }
      }
    }
  }
  return { modelId, instanceXml, binds, itext };
}