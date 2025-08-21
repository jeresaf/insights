import type { FormModel, Bind } from '../types';
import { parseXForm, ParsedXForm } from '@javarosa-js/xforms';

export function buildFormModel(parsed: ParsedXForm): FormModel {
  const instanceRootName = parsed.instanceXml.match(/<([A-Za-z_:][\w:.-]*)/)?.[1] || 'data';
  const binds: Bind[] = parsed.binds.map(b => ({ ...b }));
  return {
    modelId: parsed.modelId,
    binds,
    itext: parsed.itext,
    instanceRootName,
    initialInstanceXml: parsed.instanceXml,
  };
}

export function loadXFormToModel(xml: string): FormModel {
  return buildFormModel(parseXForm(xml));
}