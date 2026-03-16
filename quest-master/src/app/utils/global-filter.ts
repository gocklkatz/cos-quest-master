import { GlobalEntry } from '../models/iris.models';

export function globalMatchesFilter(entry: GlobalEntry, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  return entry.name.toLowerCase().includes(t);
}
