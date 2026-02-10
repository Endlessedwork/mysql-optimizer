import { randomUUID } from 'crypto';

export interface RecommendationPack {
  recommendations: any[];
  metadata: {
    generated_at: string;
    total_recommendations: number;
    summary: {
      critical_severity: number;
      high_severity: number;
      medium_severity: number;
      low_severity: number;
    };
    database_summary: {
      total_tables: number;
      total_indexes: number;
      largest_tables: any[];
      most_fragmented: any[];
    };
  };
  report: {
    executive_summary: string;
    detailed_analysis: any[];
    action_items: any[];
    risk_assessment: any;
  };
}

export class RecommendationPackGenerator {
  private findings: any[];
  private impactReport: any;
  private schemaSnapshot: any[];
  private tableStats: any[];

  constructor(findings: any[], impactReport: any, schemaSnapshot: any[], tableStats?: any[]) {
    this.findings = findings;
    this.impactReport = impactReport;
    this.schemaSnapshot = schemaSnapshot;
    this.tableStats = tableStats || [];
  }

  generatePack(): RecommendationPack {
    const recommendations = this.findings.map(finding => this.createRecommendation(finding)).filter(Boolean);
    
    const pack: RecommendationPack = {
      recommendations,
      metadata: {
        generated_at: new Date().toISOString(),
        total_recommendations: recommendations.length,
        summary: {
          critical_severity: recommendations.filter(r => r.severity === 'critical').length,
          high_severity: recommendations.filter(r => r.severity === 'high').length,
          medium_severity: recommendations.filter(r => r.severity === 'medium').length,
          low_severity: recommendations.filter(r => r.severity === 'low').length,
        },
        database_summary: this.generateDatabaseSummary(),
      },
      report: this.generateDetailedReport(recommendations),
    };

    return pack;
  }

  private generateDatabaseSummary() {
    // Get largest tables
    const sortedBySize = [...this.tableStats].sort((a, b) => 
      (parseFloat(b.total_size_mb) || 0) - (parseFloat(a.total_size_mb) || 0)
    );

    // Get most fragmented tables
    const sortedByFrag = [...this.tableStats].sort((a, b) => 
      (parseFloat(b.fragmentation_pct) || 0) - (parseFloat(a.fragmentation_pct) || 0)
    );

    return {
      total_tables: this.schemaSnapshot.length,
      total_indexes: this.schemaSnapshot.reduce((sum, t) => sum + (t.INDEX_LENGTH ? 1 : 0), 0),
      largest_tables: sortedBySize.slice(0, 5).map(t => ({
        name: `${t.TABLE_SCHEMA}.${t.TABLE_NAME}`,
        size_mb: t.total_size_mb,
        rows: t.TABLE_ROWS,
        engine: t.ENGINE
      })),
      most_fragmented: sortedByFrag.slice(0, 5).filter(t => parseFloat(t.fragmentation_pct) > 5).map(t => ({
        name: `${t.TABLE_SCHEMA}.${t.TABLE_NAME}`,
        fragmentation_pct: t.fragmentation_pct,
        fragmented_mb: t.fragmented_mb
      }))
    };
  }

  private generateDetailedReport(recommendations: any[]) {
    const criticalCount = recommendations.filter(r => r.severity === 'critical').length;
    const highCount = recommendations.filter(r => r.severity === 'high').length;
    const mediumCount = recommendations.filter(r => r.severity === 'medium').length;

    // Executive Summary
    const executiveSummary = this.generateExecutiveSummary(criticalCount, highCount, mediumCount, recommendations.length);

    // Detailed analysis by category
    const detailedAnalysis = this.groupRecommendationsByType(recommendations);

    // Action items prioritized
    const actionItems = this.generateActionItems(recommendations);

    // Risk assessment
    const riskAssessment = this.generateRiskAssessment(recommendations);

    return {
      executive_summary: executiveSummary,
      detailed_analysis: detailedAnalysis,
      action_items: actionItems,
      risk_assessment: riskAssessment
    };
  }

  private generateExecutiveSummary(critical: number, high: number, medium: number, total: number): string {
    const severity = critical > 0 ? 'วิกฤต' : high > 0 ? 'สูง' : medium > 0 ? 'ปานกลาง' : 'ต่ำ';
    const urgency = critical > 0 ? 'ต้องดำเนินการทันที' : high > 0 ? 'ควรดำเนินการโดยเร็ว' : 'สามารถวางแผนดำเนินการได้';

    let summary = `## สรุปผลการวิเคราะห์\n\n`;
    summary += `พบปัญหาทั้งหมด **${total} รายการ** ระดับความรุนแรงโดยรวม: **${severity}**\n\n`;
    
    if (critical > 0) {
      summary += `⚠️ **วิกฤต ${critical} รายการ** - ส่งผลกระทบรุนแรงต่อประสิทธิภาพระบบ\n`;
    }
    if (high > 0) {
      summary += `🔴 **สูง ${high} รายการ** - ส่งผลกระทบมากต่อประสิทธิภาพ\n`;
    }
    if (medium > 0) {
      summary += `🟡 **ปานกลาง ${medium} รายการ** - ส่งผลกระทบปานกลาง\n`;
    }

    summary += `\n**คำแนะนำ:** ${urgency}\n`;

    return summary;
  }

  private groupRecommendationsByType(recommendations: any[]): any[] {
    const groups: { [key: string]: any[] } = {};
    
    for (const rec of recommendations) {
      const type = rec.problem_statement;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(rec);
    }

    return Object.entries(groups).map(([type, recs]) => ({
      category: this.getCategoryName(type),
      category_type: type,
      count: recs.length,
      severity_breakdown: {
        critical: recs.filter(r => r.severity === 'critical').length,
        high: recs.filter(r => r.severity === 'high').length,
        medium: recs.filter(r => r.severity === 'medium').length,
        low: recs.filter(r => r.severity === 'low').length,
      },
      items: recs.map(r => ({
        id: r.id,
        severity: r.severity,
        table: r.table,
        description: r.fix_options?.[0]?.description,
        sql: r.fix_options?.[0]?.implementation,
        evidence: r.evidence
      })),
      summary: this.getCategorySummary(type, recs)
    }));
  }

  private getCategoryName(type: string): string {
    const names: { [key: string]: string } = {
      'full_table_scan': '🔍 Full Table Scan',
      'filesort': '📊 Filesort Operations',
      'filesort_temp_table': '📊 Filesort & Temporary Tables',
      'temporary_table': '📝 Temporary Table Usage',
      'high_rows_examined': '📈 High Rows Examined Ratio',
      'index_scan': '🔎 Index Scan (Improvable)',
      'where_without_index': '⚠️ WHERE Without Index',
      'table_fragmentation': '💾 Table Fragmentation',
      'unused_index': '🗑️ Unused Indexes',
      'slow_query': '🐢 Slow Queries',
      'inefficient_query': '📉 Inefficient Queries',
      'missing_index': '❌ Missing Indexes',
      'large_table': '📦 Large Tables'
    };
    return names[type] || `📋 ${type}`;
  }

  private getCategorySummary(type: string, recs: any[]): string {
    const summaries: { [key: string]: string } = {
      'full_table_scan': `พบ ${recs.length} queries ที่สแกนตารางทั้งหมด ควรสร้าง index เพื่อลดจำนวน rows ที่ต้องอ่าน`,
      'filesort': `พบ ${recs.length} queries ที่ต้อง sort ใน memory/disk ควรสร้าง index บน ORDER BY columns`,
      'high_rows_examined': `พบ ${recs.length} queries ที่อ่าน rows มากกว่าที่ส่งคืน 10 เท่าขึ้นไป ควรปรับปรุง WHERE clause และ index`,
      'table_fragmentation': `พบ ${recs.length} tables ที่มี fragmentation สูง ควรรัน OPTIMIZE TABLE`,
      'unused_index': `พบ ${recs.length} indexes ที่ไม่ถูกใช้งาน พิจารณาลบเพื่อลด overhead`,
      'slow_query': `พบ ${recs.length} slow queries ที่ใช้เวลานานกว่า 1 วินาที`,
      'missing_index': `พบ ${recs.length} queries ที่ไม่ใช้ index เลย`
    };
    return summaries[type] || `พบ ${recs.length} รายการในหมวดนี้`;
  }

  private generateActionItems(recommendations: any[]): any[] {
    // Sort by priority (severity + impact)
    const sorted = [...recommendations].sort((a, b) => {
      const severityOrder: { [key: string]: number } = { critical: 4, high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
    });

    return sorted.slice(0, 10).map((rec, index) => ({
      priority: index + 1,
      severity: rec.severity,
      action: rec.fix_options?.[0]?.description || rec.problem_statement,
      sql: rec.fix_options?.[0]?.implementation,
      rollback: rec.fix_options?.[0]?.rollback,
      table: rec.table,
      expected_improvement: rec.expected_gain?.performance_improvement 
        ? `${rec.expected_gain.performance_improvement}%` 
        : 'ไม่ระบุ',
      risk_level: rec.trade_offs?.lock_risk || 'Medium',
      estimated_time: this.estimateImplementationTime(rec)
    }));
  }

  private estimateImplementationTime(rec: any): string {
    // Rough estimation based on operation type
    const type = rec.problem_statement;
    if (type === 'unused_index') return '< 1 นาที';
    if (type === 'full_table_scan' || type === 'missing_index') return '1-5 นาที (ขึ้นกับขนาดตาราง)';
    if (type === 'table_fragmentation') return '5-30 นาที (ขึ้นกับขนาดตาราง)';
    return '1-10 นาที';
  }

  private generateRiskAssessment(recommendations: any[]): any {
    const criticalCount = recommendations.filter(r => r.severity === 'critical').length;
    const highCount = recommendations.filter(r => r.severity === 'high').length;
    
    let overallRisk = 'Low';
    let riskScore = 0;
    
    riskScore = criticalCount * 40 + highCount * 20 + recommendations.length * 2;
    
    if (riskScore > 100) overallRisk = 'Critical';
    else if (riskScore > 60) overallRisk = 'High';
    else if (riskScore > 30) overallRisk = 'Medium';

    return {
      overall_risk: overallRisk,
      risk_score: Math.min(100, riskScore),
      risk_factors: [
        criticalCount > 0 ? `${criticalCount} ปัญหาระดับวิกฤต` : null,
        highCount > 0 ? `${highCount} ปัญหาระดับสูง` : null,
        recommendations.length > 10 ? `จำนวนปัญหามาก (${recommendations.length} รายการ)` : null
      ].filter(Boolean),
      recommendations_for_risk_mitigation: [
        'ทดสอบทุก DDL ใน staging environment ก่อน',
        'รัน DDL ในช่วง low traffic',
        'เตรียม rollback plan สำหรับทุกการเปลี่ยนแปลง',
        'Monitor performance หลังการเปลี่ยนแปลง'
      ]
    };
  }

  private createRecommendation(finding: any) {
    // Find corresponding impact for this finding
    const impact = this.impactReport?.recommendations?.find((r: any) => 
      r.query === finding.query || (finding.query && r.query?.includes(finding.query))
    );

    // Get table name from various sources
    const tableName = finding.table || 
      finding.evidence?.execution_plan?.Table || 
      this.extractTableFromQuery(finding.query) || 
      'unknown_table';

    const recommendation = {
      id: this.generateId(),
      problem_statement: finding.type,
      table: tableName,
      query: finding.query,
      evidence: {
        metrics: finding.evidence,
        impact_analysis: finding.impact,
        explain_plan: finding.evidence?.execution_plan
      },
      blast_radius: impact?.blast_radius || 0,
      referenced_objects: impact?.referenced_objects || [],
      fix_options: this.generateFixOptions(finding, tableName),
      expected_gain: this.calculateExpectedGain(finding),
      risk: {
        level: finding.severity,
        score: impact?.risk_score || this.calculateRiskScore(finding),
        confidence: impact?.confidence || 80
      },
      trade_offs: this.calculateTradeOffs(finding),
      rollback_plan: this.generateRollbackPlan(finding),
      verification_plan: this.generateVerificationPlan(finding, tableName),
      severity: finding.severity,
      created_at: new Date().toISOString()
    };

    return recommendation;
  }

  private generateId(): string {
    return 'rec_' + randomUUID().replace(/-/g, '').substring(0, 12);
  }

  private calculateRiskScore(finding: any): number {
    const severityScores: { [key: string]: number } = {
      critical: 90,
      high: 70,
      medium: 40,
      low: 20
    };
    return severityScores[finding.severity] || 30;
  }

  private generateFixOptions(finding: any, tableName: string): any[] {
    const options = [];
    const evidence = finding.evidence || {};
    const columns = this.extractColumnsFromQuery(finding.query, finding.type);
    
    switch (finding.type) {
      case 'full_table_scan':
      case 'where_without_index':
        const whereCols = columns.length > 0 ? columns : ['column_name'];
        const indexName = `idx_${tableName}_${whereCols[0]}`.substring(0, 64);
        options.push({
          id: 'add_index',
          description: `สร้าง index บน ${tableName}(${whereCols.join(', ')}) เพื่อหลีกเลี่ยง full table scan`,
          implementation: `CREATE INDEX ${indexName} ON ${tableName}(${whereCols.join(', ')});`,
          rollback: `DROP INDEX ${indexName} ON ${tableName};`,
          estimated_impact: evidence.rows_to_examine 
            ? `ลด rows examined จาก ${evidence.rows_to_examine?.toLocaleString()} เหลือประมาณ 1-100`
            : 'ลด rows examined อย่างมาก'
        });
        break;

      case 'filesort':
      case 'filesort_temp_table':
        const sortCols = this.extractOrderByColumns(finding.query);
        const whereCols2 = this.extractWhereColumns(finding.query);
        const compositeCols = [...whereCols2, ...sortCols].filter((v, i, a) => a.indexOf(v) === i);
        const sortIndexName = `idx_${tableName}_sort`.substring(0, 64);
        
        if (compositeCols.length > 0) {
          options.push({
            id: 'add_composite_index',
            description: `สร้าง composite index รวม WHERE + ORDER BY columns`,
            implementation: `CREATE INDEX ${sortIndexName} ON ${tableName}(${compositeCols.join(', ')});`,
            rollback: `DROP INDEX ${sortIndexName} ON ${tableName};`,
            estimated_impact: 'หลีกเลี่ยง filesort operation'
          });
        } else {
          options.push({
            id: 'review_query',
            description: 'ตรวจสอบ ORDER BY clause และพิจารณาสร้าง index',
            implementation: `-- วิเคราะห์ query และสร้าง index ตาม ORDER BY columns\nSHOW INDEX FROM ${tableName};`
          });
        }
        break;

      case 'high_rows_examined':
      case 'inefficient_query':
        const targetCols = this.extractWhereColumns(finding.query);
        if (targetCols.length > 0) {
          const coveringIndexName = `idx_${tableName}_covering`.substring(0, 64);
          options.push({
            id: 'add_covering_index',
            description: `สร้าง covering index เพื่อลด rows examined`,
            implementation: `CREATE INDEX ${coveringIndexName} ON ${tableName}(${targetCols.join(', ')});`,
            rollback: `DROP INDEX ${coveringIndexName} ON ${tableName};`,
            estimated_impact: `ปรับปรุง efficiency จาก ${evidence.efficiency || 'ต่ำ'} เป็นใกล้เคียง 100%`
          });
        } else {
          options.push({
            id: 'analyze_query',
            description: 'วิเคราะห์และปรับปรุง query structure',
            implementation: `-- วิเคราะห์ query pattern\nEXPLAIN FORMAT=JSON ${finding.query?.substring(0, 200) || 'SELECT ...'}...`
          });
        }
        break;

      case 'temporary_table':
        const groupCols = this.extractGroupByColumns(finding.query);
        if (groupCols.length > 0) {
          const groupIndexName = `idx_${tableName}_group`.substring(0, 64);
          options.push({
            id: 'add_group_index',
            description: `สร้าง index บน GROUP BY columns`,
            implementation: `CREATE INDEX ${groupIndexName} ON ${tableName}(${groupCols.join(', ')});`,
            rollback: `DROP INDEX ${groupIndexName} ON ${tableName};`,
            estimated_impact: 'หลีกเลี่ยงการสร้าง temporary table'
          });
        }
        break;

      case 'table_fragmentation':
        options.push({
          id: 'optimize_table',
          description: `Defragment table เพื่อ reclaim space และปรับปรุงประสิทธิภาพ`,
          implementation: `OPTIMIZE TABLE ${tableName};`,
          rollback: '-- ไม่จำเป็นต้อง rollback',
          estimated_impact: `Reclaim ${evidence.fragmented_mb || 'N/A'} MB พื้นที่ disk`,
          warning: 'อาจ lock table ระหว่างดำเนินการ'
        });
        break;

      case 'unused_index':
        options.push({
          id: 'drop_unused_index',
          description: `ลบ index ที่ไม่ได้ใช้งานเพื่อลด write overhead`,
          implementation: `DROP INDEX ${finding.index || 'index_name'} ON ${tableName};`,
          rollback: `-- บันทึก index definition ก่อนลบ\nSHOW CREATE TABLE ${tableName};`,
          estimated_impact: `ลด write overhead ${evidence.write_overhead?.toLocaleString() || 'N/A'} operations`
        });
        break;

      case 'slow_query':
      case 'missing_index':
        options.push({
          id: 'analyze_slow_query',
          description: 'วิเคราะห์ slow query และเพิ่ม index ที่เหมาะสม',
          implementation: `-- Step 1: ดู execution plan\nEXPLAIN FORMAT=JSON ${finding.query?.substring(0, 200) || 'SELECT ...'}...\n\n-- Step 2: ตรวจสอบ indexes ที่มี\nSHOW INDEX FROM ${tableName};\n\n-- Step 3: สร้าง index ตาม WHERE/JOIN columns`,
          estimated_impact: `ลดเวลาจาก ${evidence.avg_time_sec || 'N/A'} seconds`
        });
        break;

      case 'large_table':
        options.push({
          id: 'partition_table',
          description: 'พิจารณา table partitioning หรือ archiving',
          implementation: `-- วิเคราะห์ data distribution\nSELECT DATE(created_at), COUNT(*) FROM ${tableName} GROUP BY DATE(created_at) ORDER BY 1 DESC LIMIT 30;\n\n-- พิจารณา partition by date หรือ archive old data`,
          estimated_impact: 'ปรับปรุงประสิทธิภาพ query บน large tables'
        });
        break;

      default:
        options.push({
          id: 'general_review',
          description: `ตรวจสอบและปรับปรุง ${tableName}`,
          implementation: `-- วิเคราะห์ table structure\nSHOW CREATE TABLE ${tableName};\nSHOW INDEX FROM ${tableName};\nANALYZE TABLE ${tableName};`
        });
    }
    
    return options;
  }

  private extractTableFromQuery(query: string): string | null {
    if (!query) return null;
    const match = query.match(/FROM\s+`?(\w+)`?/i);
    return match ? match[1] : null;
  }

  private extractColumnsFromQuery(query: string, findingType: string): string[] {
    if (!query) return [];
    
    const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|HAVING|$)/is);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columns = whereClause.match(/`?(\w+)`?\s*(?:=|>|<|LIKE|IN|BETWEEN|IS)/gi);
      if (columns) {
        return columns.map(c => c.replace(/[`\s=><]/g, '').replace(/LIKE|IN|BETWEEN|IS/gi, '').trim())
          .filter(c => c.length > 0 && c.length < 64);
      }
    }
    return [];
  }

  private extractOrderByColumns(query: string): string[] {
    if (!query) return [];
    const match = query.match(/ORDER\s+BY\s+([^LIMIT]+)/i);
    if (match) {
      const cols = match[1].split(',').map(c => 
        c.trim().replace(/`/g, '').replace(/\s+(ASC|DESC)/gi, '').trim()
      );
      return cols.filter(c => c.length > 0 && c.length < 64 && !c.includes('('));
    }
    return [];
  }

  private extractGroupByColumns(query: string): string[] {
    if (!query) return [];
    const match = query.match(/GROUP\s+BY\s+([^ORDER|HAVING|LIMIT]+)/i);
    if (match) {
      const cols = match[1].split(',').map(c => c.trim().replace(/`/g, ''));
      return cols.filter(c => c.length > 0 && c.length < 64 && !c.includes('('));
    }
    return [];
  }

  private extractWhereColumns(query: string): string[] {
    return this.extractColumnsFromQuery(query, 'where');
  }

  private calculateExpectedGain(finding: any): any {
    const evidence = finding.evidence || {};
    const impact = finding.impact || {};
    
    let performanceImprovement = 30;
    let resourceSavings = 20;
    let riskReduction = 40;

    switch (finding.severity) {
      case 'critical':
        performanceImprovement = 80;
        resourceSavings = 70;
        riskReduction = 90;
        break;
      case 'high':
        performanceImprovement = 60;
        resourceSavings = 50;
        riskReduction = 70;
        break;
      case 'medium':
        performanceImprovement = 40;
        resourceSavings = 30;
        riskReduction = 50;
        break;
      case 'low':
        performanceImprovement = 15;
        resourceSavings = 10;
        riskReduction = 25;
        break;
    }

    return {
      performance_improvement: performanceImprovement,
      resource_savings: resourceSavings,
      risk_reduction: riskReduction,
      description: impact.estimated_improvement || `ปรับปรุงประสิทธิภาพประมาณ ${performanceImprovement}%`
    };
  }

  private calculateTradeOffs(finding: any): any {
    const isHighSeverity = finding.severity === 'critical' || finding.severity === 'high';
    
    return {
      write_cost: finding.type === 'unused_index' ? 'ลดลง' : 'เพิ่มขึ้นเล็กน้อย',
      disk_usage: finding.type === 'unused_index' ? 'ลดลง' : 'เพิ่มขึ้นเล็กน้อย',
      lock_risk: isHighSeverity ? 'สูง' : 'ต่ำ',
      downtime: finding.type === 'table_fragmentation' ? 'อาจมีขณะ optimize' : 'ไม่มี',
      maintenance: 'ต้อง monitor หลังการเปลี่ยนแปลง'
    };
  }

  private generateRollbackPlan(finding: any): string {
    switch (finding.type) {
      case 'full_table_scan':
      case 'filesort':
      case 'high_rows_examined':
      case 'missing_index':
        return 'DROP INDEX ที่เพิ่งสร้าง หากประสิทธิภาพไม่ดีขึ้น';
      case 'unused_index':
        return 'สร้าง index กลับคืน โดยดูจาก SHOW CREATE TABLE ก่อนลบ';
      case 'table_fragmentation':
        return 'ไม่จำเป็นต้อง rollback (OPTIMIZE TABLE ไม่มีผลเสีย)';
      default:
        return 'Revert การเปลี่ยนแปลงโดยดูจาก DDL ที่บันทึกไว้';
    }
  }

  private generateVerificationPlan(finding: any, tableName: string): any[] {
    const plan = [
      {
        step: 'ตรวจสอบ execution plan หลังการเปลี่ยนแปลง',
        command: 'EXPLAIN FORMAT=JSON <query>',
        expected_result: 'ใช้ index ที่สร้างใหม่, ไม่มี full table scan'
      },
      {
        step: 'ตรวจสอบ index ถูกใช้งาน',
        command: `SELECT * FROM performance_schema.table_io_waits_summary_by_index_usage WHERE OBJECT_NAME = '${tableName}';`,
        expected_result: 'read_count ของ index ใหม่เพิ่มขึ้น'
      },
      {
        step: 'Monitor query performance',
        command: `SELECT * FROM performance_schema.events_statements_summary_by_digest WHERE DIGEST_TEXT LIKE '%${tableName}%' ORDER BY SUM_TIMER_WAIT DESC;`,
        expected_result: 'AVG_TIMER_WAIT ลดลง'
      }
    ];

    if (finding.type === 'table_fragmentation') {
      plan.push({
        step: 'ตรวจสอบ fragmentation หลัง OPTIMIZE',
        command: `SELECT TABLE_NAME, DATA_FREE, DATA_LENGTH FROM information_schema.TABLES WHERE TABLE_NAME = '${tableName}';`,
        expected_result: 'DATA_FREE ลดลงอย่างมาก'
      });
    }
    
    return plan;
  }

  /**
   * Generate Markdown report for download
   */
  generateMarkdownReport(): string {
    const pack = this.generatePack();
    const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    
    let md = `# 📊 MySQL Optimization Report\n\n`;
    md += `**Generated:** ${now}\n\n`;
    md += `---\n\n`;
    
    // Executive Summary
    md += pack.report.executive_summary;
    md += `\n---\n\n`;
    
    // Database Overview
    md += `## 📈 Database Overview\n\n`;
    md += `- **Total Tables:** ${pack.metadata.database_summary.total_tables}\n`;
    md += `- **Total Recommendations:** ${pack.metadata.total_recommendations}\n\n`;
    
    if (pack.metadata.database_summary.largest_tables.length > 0) {
      md += `### Largest Tables\n\n`;
      md += `| Table | Size (MB) | Rows | Engine |\n`;
      md += `|-------|-----------|------|--------|\n`;
      for (const t of pack.metadata.database_summary.largest_tables) {
        md += `| ${t.name} | ${t.size_mb} | ${t.rows?.toLocaleString() || 'N/A'} | ${t.engine} |\n`;
      }
      md += `\n`;
    }

    if (pack.metadata.database_summary.most_fragmented.length > 0) {
      md += `### ⚠️ Fragmented Tables\n\n`;
      md += `| Table | Fragmentation | Wasted Space |\n`;
      md += `|-------|---------------|-------------|\n`;
      for (const t of pack.metadata.database_summary.most_fragmented) {
        md += `| ${t.name} | ${t.fragmentation_pct}% | ${t.fragmented_mb} MB |\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
    
    // Priority Action Items
    md += `## 🎯 Priority Action Items\n\n`;
    for (const action of pack.report.action_items) {
      md += `### ${action.priority}. ${action.action}\n\n`;
      md += `- **Severity:** ${action.severity}\n`;
      md += `- **Table:** ${action.table || 'N/A'}\n`;
      md += `- **Expected Improvement:** ${action.expected_improvement}\n`;
      md += `- **Risk Level:** ${action.risk_level}\n`;
      md += `- **Estimated Time:** ${action.estimated_time}\n\n`;
      
      if (action.sql) {
        md += `**SQL:**\n\`\`\`sql\n${action.sql}\n\`\`\`\n\n`;
      }
      if (action.rollback) {
        md += `**Rollback:**\n\`\`\`sql\n${action.rollback}\n\`\`\`\n\n`;
      }
    }

    md += `---\n\n`;

    // Detailed Analysis
    md += `## 📋 Detailed Analysis by Category\n\n`;
    for (const category of pack.report.detailed_analysis) {
      md += `### ${category.category}\n\n`;
      md += `**Count:** ${category.count} | `;
      md += `Critical: ${category.severity_breakdown.critical} | `;
      md += `High: ${category.severity_breakdown.high} | `;
      md += `Medium: ${category.severity_breakdown.medium} | `;
      md += `Low: ${category.severity_breakdown.low}\n\n`;
      md += `${category.summary}\n\n`;
      
      for (const item of category.items.slice(0, 5)) { // Limit to 5 per category
        md += `- **[${item.severity.toUpperCase()}]** ${item.table || 'N/A'}: ${item.description || item.id}\n`;
        if (item.sql) {
          md += `  \`\`\`sql\n  ${item.sql}\n  \`\`\`\n`;
        }
      }
      md += `\n`;
    }

    md += `---\n\n`;

    // Risk Assessment
    md += `## ⚠️ Risk Assessment\n\n`;
    md += `**Overall Risk Level:** ${pack.report.risk_assessment.overall_risk}\n`;
    md += `**Risk Score:** ${pack.report.risk_assessment.risk_score}/100\n\n`;
    
    if (pack.report.risk_assessment.risk_factors.length > 0) {
      md += `**Risk Factors:**\n`;
      for (const factor of pack.report.risk_assessment.risk_factors) {
        md += `- ${factor}\n`;
      }
      md += `\n`;
    }

    md += `**Recommendations for Safe Implementation:**\n`;
    for (const rec of pack.report.risk_assessment.recommendations_for_risk_mitigation) {
      md += `- ${rec}\n`;
    }

    md += `\n---\n\n`;
    md += `*Report generated by MySQL Optimizer Agent*\n`;

    return md;
  }
}
