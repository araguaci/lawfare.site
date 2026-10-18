import data from './assuntos.json';
import { buildTagRegistry } from '../lib/tagRegistry';

export const tagRegistry = buildTagRegistry(data.assuntos);
