import { GlobalEntry, GlobalNode } from '../models/iris.models';

function nodeMatchesFilter(node: GlobalNode, t: string): boolean {
  if (node.value && node.value.toLowerCase().includes(t)) return true;
  return node.children.some(child => nodeMatchesFilter(child, t));
}

export function globalMatchesFilter(entry: GlobalEntry, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  if (entry.name.toLowerCase().includes(t)) return true;
  return entry.children.some(child => nodeMatchesFilter(child, t));
}
