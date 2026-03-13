import { GlobalEntry, GlobalNode } from '../models/iris.models';

function nodeMatchesTerm(node: GlobalNode, term: string): boolean {
  if (node.key.toLowerCase().includes(term)) return true;
  if (node.value != null && String(node.value).toLowerCase().includes(term)) return true;
  return node.children.some(c => nodeMatchesTerm(c, term));
}

export function globalMatchesFilter(entry: GlobalEntry, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  if (entry.name.toLowerCase().includes(t)) return true;
  if (entry.value != null && String(entry.value).toLowerCase().includes(t)) return true;
  return entry.children.some(c => nodeMatchesTerm(c, t));
}
