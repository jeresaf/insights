import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
export function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'text/xml');
}
export function serializeXml(doc: Document): string {
  return new XMLSerializer().serializeToString(doc);
}
export function q(el: Element | Document, sel: string): Element | null {
  if ('getElementsByTagName' in el) {
    const [ns, tag] = sel.includes(':') ? sel.split(':', 2) : [null, sel];
    const list = (el as Document | Element).getElementsByTagName(tag);
    return list.length ? (list.item(0) as Element) : null;
  }
  return null;
}
export function qa(el: Element | Document, tag: string): Element[] {
  const list = (el as Document | Element).getElementsByTagName(tag);
  return Array.from({ length: list.length }, (_, i) => list.item(i) as Element).filter(Boolean);
}
export function attr(el: Element, name: string): string | null {
  return el.getAttribute(name);
}