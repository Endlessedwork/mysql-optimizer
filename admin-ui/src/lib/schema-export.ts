import type { TableView } from './types';

// ─── DBML Export ───────────────────────────────────────────

export function exportToDBML(tables: TableView[], dbName: string): string {
  const lines: string[] = [];

  lines.push(`// Generated from MySQL Optimizer`);
  lines.push(`// Database: ${dbName}`);
  lines.push(`// Exported: ${new Date().toISOString()}`);
  lines.push('');

  for (const table of tables) {
    lines.push(`Table ${table.name} {`);

    for (const col of table.columns) {
      const name = col.COLUMN_NAME || col.column_name || '';
      const type = col.COLUMN_TYPE || col.DATA_TYPE || col.data_type || 'unknown';
      const settings: string[] = [];

      if (col._isPK) settings.push('pk');
      if ((col.IS_NULLABLE || col.is_nullable) === 'NO' && !col._isPK) settings.push('not null');
      if (col.COLUMN_DEFAULT || col.column_default) {
        const def = col.COLUMN_DEFAULT || col.column_default;
        settings.push(`default: '${def}'`);
      }
      if (col.EXTRA || col.extra) {
        const extra = col.EXTRA || col.extra || '';
        if (extra.includes('auto_increment')) settings.push('increment');
      }
      if (col._isFK && col._fkRef) {
        const refTable = col._fkRef.REFERENCED_TABLE_NAME || (col._fkRef as any).referenced_table_name;
        const refCol = col._fkRef.REFERENCED_COLUMN_NAME || (col._fkRef as any).referenced_column_name;
        settings.push(`ref: > ${refTable}.${refCol}`);
      }
      if (col.COLUMN_COMMENT || col.column_comment) {
        const comment = col.COLUMN_COMMENT || col.column_comment || '';
        settings.push(`note: '${comment.replace(/'/g, "\\'")}'`);
      }

      const settingsStr = settings.length > 0 ? ` [${settings.join(', ')}]` : '';
      lines.push(`  ${name} ${type}${settingsStr}`);
    }

    // Indexes block
    const nonPrimaryIndexes = table.indexes.filter(idx => idx.name !== 'PRIMARY');
    if (nonPrimaryIndexes.length > 0) {
      lines.push('');
      lines.push('  indexes {');
      for (const idx of nonPrimaryIndexes) {
        const cols = idx.columns.length === 1
          ? idx.columns[0]
          : `(${idx.columns.join(', ')})`;
        const idxSettings: string[] = [];
        if (idx.unique) idxSettings.push('unique');
        idxSettings.push(`name: '${idx.name}'`);
        lines.push(`    ${cols} [${idxSettings.join(', ')}]`);
      }
      lines.push('  }');
    }

    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

// ─── SQL (CREATE TABLE) Export ──────────────────────────────

export function exportToSQL(tables: TableView[], dbName: string): string {
  const lines: string[] = [];

  lines.push(`-- Generated from MySQL Optimizer`);
  lines.push(`-- Database: ${dbName}`);
  lines.push(`-- Exported: ${new Date().toISOString()}`);
  lines.push('');

  for (const table of tables) {
    lines.push(`CREATE TABLE \`${table.name}\` (`);

    const colDefs: string[] = [];

    for (const col of table.columns) {
      const name = col.COLUMN_NAME || col.column_name || '';
      const type = col.COLUMN_TYPE || col.DATA_TYPE || col.data_type || 'VARCHAR(255)';
      const parts = [`  \`${name}\` ${type.toUpperCase()}`];

      if ((col.IS_NULLABLE || col.is_nullable) === 'NO') {
        parts.push('NOT NULL');
      }
      if (col.COLUMN_DEFAULT !== undefined && col.COLUMN_DEFAULT !== null) {
        const def = col.COLUMN_DEFAULT || col.column_default;
        if (def) {
          // Functions like uuid(), NOW() etc. should not be quoted
          const isFunc = /\(/.test(def);
          parts.push(`DEFAULT ${isFunc ? def : `'${def}'`}`);
        }
      }
      if (col.EXTRA || col.extra) {
        const extra = (col.EXTRA || col.extra || '').toUpperCase();
        if (extra) parts.push(extra);
      }
      if (col.COLUMN_COMMENT || col.column_comment) {
        const comment = col.COLUMN_COMMENT || col.column_comment || '';
        parts.push(`COMMENT '${comment.replace(/'/g, "\\'")}'`);
      }

      colDefs.push(parts.join(' '));
    }

    // Primary key
    const pkCols = table.columns
      .filter((c: any) => c._isPK)
      .map((c: any) => `\`${c.COLUMN_NAME || c.column_name}\``);
    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
    }

    // Indexes
    for (const idx of table.indexes) {
      if (idx.name === 'PRIMARY') continue;
      const idxCols = idx.columns.map(c => `\`${c}\``).join(', ');
      const prefix = idx.unique ? 'UNIQUE KEY' : 'KEY';
      colDefs.push(`  ${prefix} \`${idx.name}\` (${idxCols})`);
    }

    // Foreign keys
    for (const fk of table.foreignKeys) {
      const col = fk.COLUMN_NAME || (fk as any).column_name;
      const refTable = fk.REFERENCED_TABLE_NAME || (fk as any).referenced_table_name;
      const refCol = fk.REFERENCED_COLUMN_NAME || (fk as any).referenced_column_name;
      const constraintName = fk.CONSTRAINT_NAME || (fk as any).constraint_name;
      colDefs.push(`  CONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${col}\`) REFERENCES \`${refTable}\` (\`${refCol}\`)`);
    }

    lines.push(colDefs.join(',\n'));
    lines.push(`) ENGINE=${table.engine || 'InnoDB'} DEFAULT CHARSET=utf8mb4;`);
    lines.push('');
  }

  return lines.join('\n');
}

// ─── JSON Export ────────────────────────────────────────────

export function exportToJSON(tables: TableView[], dbName: string): string {
  const data = {
    database: dbName,
    exportedAt: new Date().toISOString(),
    tables: tables.map(table => ({
      name: table.name,
      engine: table.engine,
      rows: table.rows,
      dataSize: table.dataSize,
      indexSize: table.indexSize,
      collation: table.collation,
      columns: table.columns.map((col: any) => ({
        name: col.COLUMN_NAME || col.column_name,
        type: col.COLUMN_TYPE || col.DATA_TYPE || col.data_type,
        nullable: (col.IS_NULLABLE || col.is_nullable) === 'YES',
        default: col.COLUMN_DEFAULT || col.column_default || null,
        extra: col.EXTRA || col.extra || null,
        comment: col.COLUMN_COMMENT || col.column_comment || null,
        isPrimaryKey: col._isPK || false,
        isForeignKey: col._isFK || false,
        isIndexed: col._isIndexed || false,
        fkReference: col._fkRef ? {
          table: col._fkRef.REFERENCED_TABLE_NAME || col._fkRef.referenced_table_name,
          column: col._fkRef.REFERENCED_COLUMN_NAME || col._fkRef.referenced_column_name,
        } : null,
      })),
      indexes: table.indexes.map(idx => ({
        name: idx.name,
        unique: idx.unique,
        type: idx.type,
        columns: idx.columns,
      })),
      foreignKeys: table.foreignKeys.map(fk => ({
        constraint: fk.CONSTRAINT_NAME || (fk as any).constraint_name,
        column: fk.COLUMN_NAME || (fk as any).column_name,
        referencedTable: fk.REFERENCED_TABLE_NAME || (fk as any).referenced_table_name,
        referencedColumn: fk.REFERENCED_COLUMN_NAME || (fk as any).referenced_column_name,
      })),
    })),
  };

  return JSON.stringify(data, null, 2);
}

// ─── Download helper ────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
