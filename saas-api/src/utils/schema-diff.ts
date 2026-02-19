import { SchemaSnapshot } from '../models/scan-runs.model';

export interface DiffItem {
  type: 'added' | 'removed' | 'changed';
  entity: 'table' | 'column' | 'index' | 'foreign_key';
  name: string;
  tableName?: string;
  details?: Record<string, { from: any; to: any }>;
}

export interface SchemaDiff {
  fromSnapshotId: string;
  toSnapshotId: string;
  fromDate: string;
  toDate: string;
  summary: {
    tablesAdded: number;
    tablesRemoved: number;
    columnsAdded: number;
    columnsRemoved: number;
    columnsChanged: number;
    indexesAdded: number;
    indexesRemoved: number;
    foreignKeysAdded: number;
    foreignKeysRemoved: number;
  };
  changes: DiffItem[];
}

/**
 * Compare two schema snapshots and return structural differences.
 * Computes table-level, column-level, index-level, and FK-level diffs.
 */
export function computeSchemaDiff(
  older: SchemaSnapshot & { scanRunCreatedAt?: string },
  newer: SchemaSnapshot & { scanRunCreatedAt?: string }
): SchemaDiff {
  const changes: DiffItem[] = [];

  // --- Tables ---
  const oldTables = buildTableSet(older.tables);
  const newTables = buildTableSet(newer.tables);

  for (const name of newTables) {
    if (!oldTables.has(name)) {
      changes.push({ type: 'added', entity: 'table', name });
    }
  }
  for (const name of oldTables) {
    if (!newTables.has(name)) {
      changes.push({ type: 'removed', entity: 'table', name });
    }
  }

  // --- Columns ---
  const oldCols = buildColumnMap(older.columns);
  const newCols = buildColumnMap(newer.columns);

  for (const [key, newCol] of newCols) {
    const oldCol = oldCols.get(key);
    if (!oldCol) {
      const [tableName, colName] = key.split('::');
      changes.push({ type: 'added', entity: 'column', name: colName, tableName });
    } else {
      const diffs = diffColumnProps(oldCol, newCol);
      if (Object.keys(diffs).length > 0) {
        const [tableName, colName] = key.split('::');
        changes.push({ type: 'changed', entity: 'column', name: colName, tableName, details: diffs });
      }
    }
  }
  for (const [key] of oldCols) {
    if (!newCols.has(key)) {
      const [tableName, colName] = key.split('::');
      changes.push({ type: 'removed', entity: 'column', name: colName, tableName });
    }
  }

  // --- Indexes ---
  const oldIdxs = buildIndexSet(older.indexes);
  const newIdxs = buildIndexSet(newer.indexes);

  for (const key of newIdxs) {
    if (!oldIdxs.has(key)) {
      const [tableName, idxName] = key.split('::');
      changes.push({ type: 'added', entity: 'index', name: idxName, tableName });
    }
  }
  for (const key of oldIdxs) {
    if (!newIdxs.has(key)) {
      const [tableName, idxName] = key.split('::');
      changes.push({ type: 'removed', entity: 'index', name: idxName, tableName });
    }
  }

  // --- Foreign Keys ---
  const oldFks = buildFkSet(older.foreignKeys);
  const newFks = buildFkSet(newer.foreignKeys);

  for (const key of newFks) {
    if (!oldFks.has(key)) {
      const [tableName, fkName] = key.split('::');
      changes.push({ type: 'added', entity: 'foreign_key', name: fkName, tableName });
    }
  }
  for (const key of oldFks) {
    if (!newFks.has(key)) {
      const [tableName, fkName] = key.split('::');
      changes.push({ type: 'removed', entity: 'foreign_key', name: fkName, tableName });
    }
  }

  const summary = {
    tablesAdded: changes.filter(c => c.entity === 'table' && c.type === 'added').length,
    tablesRemoved: changes.filter(c => c.entity === 'table' && c.type === 'removed').length,
    columnsAdded: changes.filter(c => c.entity === 'column' && c.type === 'added').length,
    columnsRemoved: changes.filter(c => c.entity === 'column' && c.type === 'removed').length,
    columnsChanged: changes.filter(c => c.entity === 'column' && c.type === 'changed').length,
    indexesAdded: changes.filter(c => c.entity === 'index' && c.type === 'added').length,
    indexesRemoved: changes.filter(c => c.entity === 'index' && c.type === 'removed').length,
    foreignKeysAdded: changes.filter(c => c.entity === 'foreign_key' && c.type === 'added').length,
    foreignKeysRemoved: changes.filter(c => c.entity === 'foreign_key' && c.type === 'removed').length,
  };

  return {
    fromSnapshotId: older.id,
    toSnapshotId: newer.id,
    fromDate: older.scanRunCreatedAt || older.createdAt,
    toDate: newer.scanRunCreatedAt || newer.createdAt,
    summary,
    changes,
  };
}

// --- helpers ---

function buildTableSet(tables: any): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(tables)) return set;
  for (const t of tables) {
    set.add(t.TABLE_NAME || t.table_name || t.name || '');
  }
  return set;
}

function buildColumnMap(columns: any): Map<string, any> {
  const map = new Map<string, any>();
  if (!Array.isArray(columns)) return map;
  for (const c of columns) {
    const table = c.TABLE_NAME || c.table_name || '';
    const col = c.COLUMN_NAME || c.column_name || '';
    if (table && col) {
      map.set(`${table}::${col}`, c);
    }
  }
  return map;
}

function diffColumnProps(oldCol: any, newCol: any): Record<string, { from: any; to: any }> {
  const diffs: Record<string, { from: any; to: any }> = {};
  const props = ['COLUMN_TYPE', 'IS_NULLABLE', 'COLUMN_DEFAULT', 'COLUMN_KEY', 'EXTRA'];
  for (const p of props) {
    const oldVal = oldCol[p] ?? null;
    const newVal = newCol[p] ?? null;
    if (String(oldVal) !== String(newVal)) {
      diffs[p] = { from: oldVal, to: newVal };
    }
  }
  return diffs;
}

function buildIndexSet(indexes: any): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(indexes)) return set;
  for (const idx of indexes) {
    const table = idx.TABLE_NAME || idx.table_name || '';
    const name = idx.INDEX_NAME || idx.index_name || '';
    if (table && name) {
      set.add(`${table}::${name}`);
    }
  }
  return set;
}

function buildFkSet(foreignKeys: any): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(foreignKeys)) return set;
  for (const fk of foreignKeys) {
    const table = fk.TABLE_NAME || fk.table_name || '';
    const name = fk.CONSTRAINT_NAME || fk.constraint_name || '';
    if (table && name) {
      set.add(`${table}::${name}`);
    }
  }
  return set;
}
