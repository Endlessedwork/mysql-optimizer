import type { SchemaSnapshot, SchemaForeignKey, TableView } from './types';

/**
 * Transform raw schema snapshot data into grouped TableView[] for the UI.
 * Groups columns, indexes, FKs per table for easy rendering.
 *
 * Note: Raw data from MySQL information_schema uses UPPER_CASE column names,
 * but we cast to `any` for resilience if field names ever arrive in different cases.
 */
export function buildTableViews(snapshot: SchemaSnapshot): TableView[] {
  const tableMap = new Map<string, TableView>();

  // 1. Seed from tables array
  const tables: any[] = Array.isArray(snapshot.tables) ? snapshot.tables : [];
  for (const t of tables) {
    const name: string = t.TABLE_NAME || t.table_name || '';
    if (!name) continue;
    tableMap.set(name, {
      name,
      schema: t.TABLE_SCHEMA || t.table_schema || '',
      engine: t.ENGINE || t.engine || '',
      rows: Number(t.TABLE_ROWS || t.table_rows || 0),
      dataSize: Number(t.DATA_LENGTH || t.data_length || 0),
      indexSize: Number(t.INDEX_LENGTH || t.index_length || 0),
      collation: t.TABLE_COLLATION || t.table_collation || '',
      columns: [],
      indexes: [],
      foreignKeys: [],
    });
  }

  // 2. Group columns
  const columns: any[] = Array.isArray(snapshot.columns) ? snapshot.columns : [];
  for (const col of columns) {
    const tableName = col.TABLE_NAME || col.table_name || '';
    const tv = tableMap.get(tableName);
    if (tv) {
      tv.columns.push(col);
    }
  }

  // Sort columns by ordinal position
  Array.from(tableMap.values()).forEach(tv => {
    tv.columns.sort((a, b) => (a.ORDINAL_POSITION || 0) - (b.ORDINAL_POSITION || 0));
  });

  // 3. Group indexes (merge multi-column indexes by INDEX_NAME)
  const indexes: any[] = Array.isArray(snapshot.indexes) ? snapshot.indexes : [];
  const indexGroups = new Map<string, { name: string; unique: boolean; type: string; columns: string[]; tableName: string }>();

  for (const idx of indexes) {
    const tableName = idx.TABLE_NAME || idx.table_name || '';
    const idxName = idx.INDEX_NAME || idx.index_name || '';
    const key = `${tableName}::${idxName}`;

    if (!indexGroups.has(key)) {
      indexGroups.set(key, {
        name: idxName,
        unique: Number(idx.NON_UNIQUE) === 0,
        type: idx.INDEX_TYPE || idx.index_type || 'BTREE',
        columns: [],
        tableName,
      });
    }
    indexGroups.get(key)!.columns.push(idx.COLUMN_NAME || idx.column_name || '');
  }

  Array.from(indexGroups.values()).forEach(group => {
    const tv = tableMap.get(group.tableName);
    if (tv) {
      tv.indexes.push({ name: group.name, unique: group.unique, type: group.type, columns: group.columns });
    }
  });

  // 4. Group foreign keys
  const fks: SchemaForeignKey[] = Array.isArray(snapshot.foreignKeys) ? snapshot.foreignKeys : [];
  for (const fk of fks) {
    const tableName = fk.TABLE_NAME || (fk as any).table_name || '';
    const tv = tableMap.get(tableName);
    if (tv) {
      tv.foreignKeys.push(fk);
    }
  }

  // 5. Enrich columns with PK/FK/index info derived from indexes & foreign keys
  //    Raw column data from MySQL doesn't include COLUMN_KEY, so we derive it.
  const pkColumns = new Set<string>();   // "table::column"
  const fkColumns = new Map<string, SchemaForeignKey>(); // "table::column" -> FK detail
  const indexedColumns = new Set<string>(); // "table::column"

  for (const idx of indexes) {
    const tableName = idx.TABLE_NAME || idx.table_name || '';
    const colName = idx.COLUMN_NAME || idx.column_name || '';
    const idxName = idx.INDEX_NAME || idx.index_name || '';
    const key = `${tableName}::${colName}`;
    if (idxName === 'PRIMARY') {
      pkColumns.add(key);
    }
    indexedColumns.add(key);
  }

  for (const fk of fks) {
    const tableName = fk.TABLE_NAME || (fk as any).table_name || '';
    const colName = fk.COLUMN_NAME || (fk as any).column_name || '';
    fkColumns.set(`${tableName}::${colName}`, fk);
  }

  Array.from(tableMap.values()).forEach(tv => {
    tv.columns = tv.columns.map(col => {
      const colName = col.COLUMN_NAME || col.column_name || '';
      const key = `${tv.name}::${colName}`;
      return {
        ...col,
        _isPK: pkColumns.has(key),
        _isFK: fkColumns.has(key),
        _fkRef: fkColumns.get(key) || null,
        _isIndexed: indexedColumns.has(key),
      };
    });
  });

  // 6. Attach table stats
  const stats: any[] = Array.isArray(snapshot.tableStats) ? snapshot.tableStats : [];
  for (const stat of stats) {
    const tableName = stat.TABLE_NAME || stat.table_name || '';
    const tv = tableMap.get(tableName);
    if (tv) {
      tv.stats = stat;
    }
  }

  return Array.from(tableMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
