/**
 * Advanced Query Analyzer
 * วิเคราะห์ query patterns และหาโอกาสในการ optimize
 */
export class QueryAnalyzer {
  private queryDigests: any[];
  private explainPlans: any[];
  private schemaSnapshot: any[];
  private tableStats: any[];
  private indexUsage: any[];
  private indexCardinality: any[];
  private slowQueries: any[];
  private missingIndexes: any[];

  constructor(
    queryDigests: any[], 
    explainPlans: any[], 
    schemaSnapshot: any[],
    advancedStats?: {
      tableStats?: any[];
      indexUsage?: any[];
      indexCardinality?: any[];
      slowQueries?: any[];
      missingIndexes?: any[];
    }
  ) {
    this.queryDigests = queryDigests;
    this.explainPlans = explainPlans;
    this.schemaSnapshot = schemaSnapshot;
    this.tableStats = advancedStats?.tableStats || [];
    this.indexUsage = advancedStats?.indexUsage || [];
    this.indexCardinality = advancedStats?.indexCardinality || [];
    this.slowQueries = advancedStats?.slowQueries || [];
    this.missingIndexes = advancedStats?.missingIndexes || [];
  }

  analyze() {
    const findings: any[] = [];
    
    // 1. Analyze query digests
    for (const digest of this.queryDigests) {
      const findingsForQuery = this.analyzeQueryDigest(digest);
      findings.push(...findingsForQuery);
    }
    
    // 2. Analyze explain plans
    for (const plan of this.explainPlans) {
      const findingsForPlan = this.analyzeExplainPlan(plan);
      findings.push(...findingsForPlan);
    }

    // 3. Analyze table statistics (ใหม่)
    const tableFindings = this.analyzeTableStatistics();
    findings.push(...tableFindings);

    // 4. Analyze index usage (ใหม่)
    const indexFindings = this.analyzeIndexUsage();
    findings.push(...indexFindings);

    // 5. Analyze slow queries (ใหม่)
    const slowQueryFindings = this.analyzeSlowQueries();
    findings.push(...slowQueryFindings);

    // 6. Analyze missing indexes (ใหม่)
    const missingIndexFindings = this.analyzeMissingIndexes();
    findings.push(...missingIndexFindings);
    
    // Deduplicate and rank findings
    return this.deduplicateAndRank(findings);
  }

  private analyzeQueryDigest(digest: any) {
    const findings = [];
    const tableInfo = this.getTableInfoForQuery(digest.DIGEST_TEXT);
    
    // Check for full table scan
    if (digest.TOTAL_ROWS_EXAMINED && digest.AVG_ROWS_EXAMINED) {
      const avgRowsExamined = parseInt(digest.AVG_ROWS_EXAMINED);
      const tableRows = digest.TABLE_ROWS ? parseInt(digest.TABLE_ROWS) : tableInfo?.TABLE_ROWS || 0;
      
      if (tableRows > 0 && avgRowsExamined > tableRows * 0.5) {
        findings.push({
          type: 'full_table_scan',
          severity: tableRows > 100000 ? 'critical' : tableRows > 10000 ? 'high' : 'medium',
          query: digest.DIGEST_TEXT,
          table: tableInfo?.TABLE_NAME,
          evidence: {
            rows_examined: digest.TOTAL_ROWS_EXAMINED,
            avg_rows_examined: avgRowsExamined,
            table_rows: tableRows,
            scan_ratio: (avgRowsExamined / tableRows * 100).toFixed(2) + '%',
            execution_count: digest.COUNT_STAR,
            total_time_ms: this.picoToMs(digest.SUM_TIMER_WAIT),
            avg_time_ms: this.picoToMs(digest.AVG_TIMER_WAIT)
          },
          impact: {
            estimated_improvement: this.calculateImprovementPotential(avgRowsExamined, tableRows),
            affected_queries_per_day: this.estimateDailyQueries(digest.COUNT_STAR),
            resource_impact: tableRows > 100000 ? 'high' : 'medium'
          },
          recommendation: `สร้าง index บน WHERE clause columns เพื่อลดการสแกน ${tableRows.toLocaleString()} rows`
        });
      }
    }
    
    // Check for filesort or temp table usage
    if (digest.SUM_SORT_ROWS || digest.SUM_SORT_MERGE_PASSES) {
      const sortRows = parseInt(digest.SUM_SORT_ROWS || 0);
      const mergePass = parseInt(digest.SUM_SORT_MERGE_PASSES || 0);
      
      findings.push({
        type: 'filesort_temp_table',
        severity: mergePass > 10 ? 'high' : sortRows > 10000 ? 'medium' : 'low',
        query: digest.DIGEST_TEXT,
        table: tableInfo?.TABLE_NAME,
        evidence: {
          sort_rows: sortRows,
          merge_passes: mergePass,
          execution_count: digest.COUNT_STAR,
          total_time_ms: this.picoToMs(digest.SUM_TIMER_WAIT)
        },
        impact: {
          memory_impact: mergePass > 0 ? 'disk sort required' : 'memory sort',
          performance_impact: mergePass > 10 ? 'high' : 'medium'
        },
        recommendation: 'สร้าง composite index ที่รวม ORDER BY columns เพื่อหลีกเลี่ยง filesort'
      });
    }
    
    // Check rows examined vs rows returned (ใหม่: วิเคราะห์ละเอียดขึ้น)
    if (digest.SUM_ROWS_EXAMINED && digest.SUM_ROWS_SENT) {
      const examined = parseInt(digest.SUM_ROWS_EXAMINED);
      const sent = parseInt(digest.SUM_ROWS_SENT);
      const ratio = sent > 0 ? examined / sent : 0;
      
      if (ratio > 10) {
        findings.push({
          type: 'high_rows_examined',
          severity: ratio > 100 ? 'critical' : ratio > 50 ? 'high' : 'medium',
          query: digest.DIGEST_TEXT,
          table: tableInfo?.TABLE_NAME,
          evidence: {
            rows_examined: examined,
            rows_sent: sent,
            ratio: ratio.toFixed(2),
            efficiency: ((sent / examined) * 100).toFixed(2) + '%',
            execution_count: digest.COUNT_STAR,
            total_time_ms: this.picoToMs(digest.SUM_TIMER_WAIT),
            avg_time_ms: this.picoToMs(digest.AVG_TIMER_WAIT)
          },
          impact: {
            wasted_io: `${((1 - sent/examined) * 100).toFixed(1)}% ของ I/O ถูกใช้เพื่อสแกน rows ที่ไม่ต้องการ`,
            resource_waste: examined - sent,
            optimization_potential: ratio > 50 ? 'very high' : 'high'
          },
          recommendation: `เพิ่ม index ที่ครอบคลุม WHERE conditions เพื่อลด rows examined จาก ${examined.toLocaleString()} เหลือประมาณ ${sent.toLocaleString()}`
        });
      }
    }
    
    return findings;
  }

  private analyzeExplainPlan(plan: any) {
    const findings = [];
    
    if (plan.explain_plan && plan.explain_plan.length > 0) {
      const explain = plan.explain_plan[0];
      const tableName = explain.Table || this.extractTableFromQuery(plan.digest_text);
      const tableInfo = this.getTableInfoByName(tableName);
      
      // Check for full table scan in explain plan
      if (explain.Type === 'ALL') {
        const rows = explain.rows || tableInfo?.TABLE_ROWS || 0;
        findings.push({
          type: 'full_table_scan',
          severity: rows > 100000 ? 'critical' : rows > 10000 ? 'high' : 'medium',
          query: plan.digest_text,
          table: tableName,
          evidence: {
            access_type: 'ALL (Full Table Scan)',
            rows_to_examine: rows,
            possible_keys: explain.possible_keys || 'None',
            key_used: explain.key || 'None',
            extra: explain.Extra,
            execution_plan: explain
          },
          impact: {
            io_cost: `~${rows.toLocaleString()} disk reads`,
            memory_impact: 'อาจต้องโหลด table ทั้งหมดเข้า buffer pool'
          },
          recommendation: 'สร้าง index บน columns ที่ใช้ใน WHERE clause'
        });
      }
      
      // Check for index scan types and suggest improvements
      if (explain.Type === 'index') {
        findings.push({
          type: 'index_scan',
          severity: 'low',
          query: plan.digest_text,
          table: tableName,
          evidence: {
            access_type: 'index (Index Scan)',
            rows_to_examine: explain.rows,
            key_used: explain.key,
            extra: explain.Extra
          },
          recommendation: 'พิจารณาสร้าง covering index เพื่อเปลี่ยนเป็น index-only scan'
        });
      }
      
      // Check for filesort
      if (explain.Extra && explain.Extra.includes('Using filesort')) {
        findings.push({
          type: 'filesort',
          severity: 'medium',
          query: plan.digest_text,
          table: tableName,
          evidence: {
            execution_plan: explain,
            current_index: explain.key,
            extra: explain.Extra
          },
          impact: {
            memory_usage: 'ต้องใช้ memory หรือ disk สำหรับ sorting',
            performance: 'เพิ่ม latency ในการ query'
          },
          recommendation: 'สร้าง index ที่รวม ORDER BY columns ต่อท้าย WHERE columns'
        });
      }
      
      // Check for temporary table
      if (explain.Extra && explain.Extra.includes('Using temporary')) {
        findings.push({
          type: 'temporary_table',
          severity: 'medium',
          query: plan.digest_text,
          table: tableName,
          evidence: {
            execution_plan: explain,
            extra: explain.Extra
          },
          impact: {
            resource_usage: 'ต้องสร้าง temporary table สำหรับ GROUP BY/DISTINCT',
            disk_usage: 'อาจใช้ disk ถ้า result set ใหญ่'
          },
          recommendation: 'สร้าง index ที่ครอบคลุม GROUP BY columns'
        });
      }

      // Check for Using where without index (ใหม่)
      if (explain.Extra && explain.Extra.includes('Using where') && !explain.key) {
        findings.push({
          type: 'where_without_index',
          severity: 'high',
          query: plan.digest_text,
          table: tableName,
          evidence: {
            execution_plan: explain,
            filtered: explain.filtered,
            extra: explain.Extra
          },
          impact: {
            performance: 'ต้องตรวจสอบทุก row ที่ scan มา'
          },
          recommendation: 'สร้าง index บน WHERE clause columns'
        });
      }
    }
    
    return findings;
  }

  /**
   * วิเคราะห์ table statistics หา tables ที่มีปัญหา
   */
  private analyzeTableStatistics(): any[] {
    const findings = [];

    for (const table of this.tableStats) {
      // Check for fragmentation
      const fragPct = parseFloat(table.fragmentation_pct || 0);
      if (fragPct > 20) {
        findings.push({
          type: 'table_fragmentation',
          severity: fragPct > 50 ? 'high' : 'medium',
          table: `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`,
          evidence: {
            fragmentation_pct: fragPct.toFixed(2) + '%',
            fragmented_mb: table.fragmented_mb,
            total_size_mb: table.total_size_mb,
            row_count: table.TABLE_ROWS
          },
          impact: {
            wasted_space: `${table.fragmented_mb} MB`,
            io_overhead: 'เพิ่ม I/O เนื่องจาก data กระจัดกระจาย'
          },
          recommendation: `OPTIMIZE TABLE ${table.TABLE_SCHEMA}.${table.TABLE_NAME};`
        });
      }

      // Check for very large tables without recent updates (might need archiving)
      const sizeMb = parseFloat(table.total_size_mb || 0);
      const rows = parseInt(table.TABLE_ROWS || 0);
      if (sizeMb > 1000 && rows > 10000000) {
        findings.push({
          type: 'large_table',
          severity: 'info',
          table: `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`,
          evidence: {
            total_size_mb: sizeMb,
            row_count: rows,
            avg_row_length: table.AVG_ROW_LENGTH,
            engine: table.ENGINE,
            last_update: table.UPDATE_TIME
          },
          recommendation: 'พิจารณา table partitioning หรือ archiving เพื่อจัดการ data ขนาดใหญ่'
        });
      }
    }

    return findings;
  }

  /**
   * วิเคราะห์ index usage หา unused indexes
   */
  private analyzeIndexUsage(): any[] {
    const findings = [];

    for (const idx of this.indexUsage) {
      // Check for unused indexes
      if (idx.read_count === 0 && idx.INDEX_NAME !== 'PRIMARY') {
        const writeOps = (parseInt(idx.insert_count) || 0) + 
                         (parseInt(idx.update_count) || 0) + 
                         (parseInt(idx.delete_count) || 0);
        
        if (writeOps > 100) {
          findings.push({
            type: 'unused_index',
            severity: writeOps > 10000 ? 'high' : 'medium',
            table: `${idx.OBJECT_SCHEMA}.${idx.OBJECT_NAME}`,
            index: idx.INDEX_NAME,
            evidence: {
              read_count: idx.read_count,
              write_overhead: writeOps,
              index_name: idx.INDEX_NAME
            },
            impact: {
              write_overhead: `${writeOps.toLocaleString()} write operations ต้อง maintain index นี้`,
              storage: 'ใช้พื้นที่ disk โดยไม่จำเป็น'
            },
            recommendation: `พิจารณาลบ index: DROP INDEX ${idx.INDEX_NAME} ON ${idx.OBJECT_SCHEMA}.${idx.OBJECT_NAME};`
          });
        }
      }
    }

    return findings;
  }

  /**
   * วิเคราะห์ slow queries จาก performance_schema
   */
  private analyzeSlowQueries(): any[] {
    const findings = [];

    for (const query of this.slowQueries) {
      const avgTimeSec = parseFloat(query.avg_time_sec || 0);
      const examineRatio = parseFloat(query.rows_examined_ratio || 0);

      // Very slow queries
      if (avgTimeSec > 1) {
        findings.push({
          type: 'slow_query',
          severity: avgTimeSec > 10 ? 'critical' : avgTimeSec > 5 ? 'high' : 'medium',
          query: query.DIGEST_TEXT,
          evidence: {
            avg_time_sec: avgTimeSec.toFixed(4),
            max_time_sec: query.max_time_sec,
            total_time_sec: query.total_time_sec,
            execution_count: query.execution_count,
            avg_rows_examined: query.avg_rows_examined,
            tmp_disk_tables: query.tmp_disk_tables,
            full_scans: query.full_scans,
            no_index_used: query.no_index_used,
            first_seen: query.FIRST_SEEN,
            last_seen: query.LAST_SEEN
          },
          impact: {
            total_time_spent: `${query.total_time_sec} seconds total`,
            frequency: `${query.execution_count} executions`
          },
          recommendation: 'วิเคราะห์ EXPLAIN plan และเพิ่ม appropriate indexes'
        });
      }

      // High examine ratio queries
      if (examineRatio > 100 && query.execution_count > 10) {
        findings.push({
          type: 'inefficient_query',
          severity: examineRatio > 1000 ? 'high' : 'medium',
          query: query.DIGEST_TEXT,
          evidence: {
            rows_examined_ratio: examineRatio.toFixed(2),
            avg_rows_examined: query.avg_rows_examined,
            avg_rows_sent: query.avg_rows_sent,
            execution_count: query.execution_count
          },
          impact: {
            io_waste: `ตรวจสอบ ${examineRatio.toFixed(0)}x rows มากกว่าที่ต้องการ`
          },
          recommendation: 'เพิ่ม covering index เพื่อลด rows examined'
        });
      }
    }

    return findings;
  }

  /**
   * วิเคราะห์ missing indexes จาก queries ที่ไม่ใช้ index
   */
  private analyzeMissingIndexes(): any[] {
    const findings = [];

    for (const query of this.missingIndexes) {
      const noIndexCount = parseInt(query.no_index_count || 0);
      const badIndexCount = parseInt(query.bad_index_count || 0);
      const totalTimeSec = parseFloat(query.total_time_sec || 0);

      if ((noIndexCount > 0 || badIndexCount > 0) && totalTimeSec > 0.1) {
        findings.push({
          type: 'missing_index',
          severity: totalTimeSec > 10 ? 'critical' : totalTimeSec > 1 ? 'high' : 'medium',
          query: query.DIGEST_TEXT,
          evidence: {
            no_index_count: noIndexCount,
            bad_index_count: badIndexCount,
            execution_count: query.execution_count,
            total_time_sec: totalTimeSec,
            rows_examined: query.total_rows_examined,
            rows_sent: query.total_rows_sent
          },
          impact: {
            index_problem: noIndexCount > 0 ? 'ไม่มี index ที่เหมาะสม' : 'index ที่มีไม่เหมาะ',
            cumulative_impact: `${totalTimeSec.toFixed(2)} seconds total execution time`
          },
          recommendation: 'วิเคราะห์ WHERE clause และสร้าง index ที่เหมาะสม'
        });
      }
    }

    return findings;
  }

  /**
   * ลบ findings ที่ซ้ำกันและจัดลำดับตาม severity
   */
  private deduplicateAndRank(findings: any[]): any[] {
    // Group by query signature + type
    const grouped = new Map<string, any>();
    
    for (const finding of findings) {
      const key = `${finding.type}:${(finding.query || finding.table || '').substring(0, 100)}`;
      const existing = grouped.get(key);
      
      if (!existing || this.compareSeverity(finding.severity, existing.severity) > 0) {
        grouped.set(key, finding);
      }
    }

    // Sort by severity
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return Array.from(grouped.values()).sort((a, b) => 
      (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
      (severityOrder[a.severity as keyof typeof severityOrder] || 0)
    );
  }

  private compareSeverity(a: string, b: string): number {
    const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return (order[a as keyof typeof order] || 0) - (order[b as keyof typeof order] || 0);
  }

  // Helper methods
  private picoToMs(pico: any): number {
    return Math.round((parseInt(pico) || 0) / 1000000000);
  }

  private calculateImprovementPotential(rowsExamined: number, tableRows: number): string {
    if (tableRows === 0) return 'unknown';
    const ratio = rowsExamined / tableRows;
    if (ratio > 0.8) return '~90% improvement possible';
    if (ratio > 0.5) return '~70% improvement possible';
    if (ratio > 0.3) return '~50% improvement possible';
    return '~30% improvement possible';
  }

  private estimateDailyQueries(countStar: any): number {
    // Rough estimate based on data age
    return Math.round((parseInt(countStar) || 0) / 7); // Assume 7 days of data
  }

  private extractTableFromQuery(query: string): string | null {
    if (!query) return null;
    const match = query.match(/FROM\s+`?(\w+)`?/i);
    return match ? match[1] : null;
  }

  private getTableInfoForQuery(query: string): any {
    const tableName = this.extractTableFromQuery(query);
    return this.getTableInfoByName(tableName);
  }

  private getTableInfoByName(tableName: string | null): any {
    if (!tableName) return null;
    return this.schemaSnapshot.find(t => 
      t.TABLE_NAME?.toLowerCase() === tableName.toLowerCase()
    ) || this.tableStats.find(t => 
      t.TABLE_NAME?.toLowerCase() === tableName.toLowerCase()
    );
  }

  generateRecommendationPack() {
    const findings = this.analyze();
    
    const recommendationPack = {
      findings: findings,
      summary: {
        total_findings: findings.length,
        critical_severity: findings.filter(f => f.severity === 'critical').length,
        high_severity: findings.filter(f => f.severity === 'high').length,
        medium_severity: findings.filter(f => f.severity === 'medium').length,
        low_severity: findings.filter(f => f.severity === 'low').length,
        info_severity: findings.filter(f => f.severity === 'info').length
      },
      generated_at: new Date().toISOString()
    };
    
    return recommendationPack;
  }
}
