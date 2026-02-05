export class QueryAnalyzer {
  private queryDigests: any[];
  private explainPlans: any[];
  private schemaSnapshot: any[];

  constructor(queryDigests: any[], explainPlans: any[], schemaSnapshot: any[]) {
    this.queryDigests = queryDigests;
    this.explainPlans = explainPlans;
    this.schemaSnapshot = schemaSnapshot;
  }

  analyze() {
    const findings = [];
    
    // Analyze each query digest
    for (const digest of this.queryDigests) {
      const findingsForQuery = this.analyzeQueryDigest(digest);
      findings.push(...findingsForQuery);
    }
    
    // Analyze explain plans
    for (const plan of this.explainPlans) {
      const findingsForPlan = this.analyzeExplainPlan(plan);
      findings.push(...findingsForPlan);
    }
    
    return findings;
  }

  private analyzeQueryDigest(digest: any) {
    const findings = [];
    
    // Check for full table scan
    if (digest.TOTAL_ROWS_EXAMINED && digest.AVG_ROWS_EXAMINED) {
      const avgRowsExamined = parseInt(digest.AVG_ROWS_EXAMINED);
      const tableRows = digest.TABLE_ROWS ? parseInt(digest.TABLE_ROWS) : 0;
      
      if (tableRows > 0 && avgRowsExamined > tableRows * 0.5) {
        findings.push({
          type: 'full_table_scan',
          severity: 'high',
          query: digest.DIGEST_TEXT,
          evidence: {
            rows_examined: digest.TOTAL_ROWS_EXAMINED,
            avg_rows_examined: digest.AVG_ROWS_EXAMINED,
            table_rows: tableRows
          },
          recommendation: 'Consider adding an index to avoid full table scan'
        });
      }
    }
    
    // Check for filesort or temp table usage
    if (digest.SUM_SORT_ROWS || digest.SUM_SORT_MERGE_PASSES) {
      findings.push({
        type: 'filesort_temp_table',
        severity: 'medium',
        query: digest.DIGEST_TEXT,
        evidence: {
          sort_rows: digest.SUM_SORT_ROWS,
          merge_passes: digest.SUM_SORT_MERGE_PASSES
        },
        recommendation: 'Optimize query or add appropriate indexes to avoid filesort'
      });
    }
    
    // Check rows examined vs rows returned
    if (digest.SUM_ROWS_EXAMINED && digest.SUM_ROWS_SENT) {
      const examined = parseInt(digest.SUM_ROWS_EXAMINED);
      const sent = parseInt(digest.SUM_ROWS_SENT);
      
      if (sent > 0 && (examined / sent) > 10) {
        findings.push({
          type: 'high_rows_examined',
          severity: 'medium',
          query: digest.DIGEST_TEXT,
          evidence: {
            rows_examined: examined,
            rows_sent: sent,
            ratio: examined / sent
          },
          recommendation: 'Optimize query to reduce rows examined'
        });
      }
    }
    
    return findings;
  }

  private analyzeExplainPlan(plan: any) {
    const findings = [];
    
    if (plan.explain_plan && plan.explain_plan.length > 0) {
      const explain = plan.explain_plan[0];
      
      // Check for full table scan in explain plan
      if (explain.Type === 'ALL') {
        findings.push({
          type: 'full_table_scan',
          severity: 'high',
          query: plan.digest_text,
          evidence: {
            execution_plan: explain
          },
          recommendation: 'Add appropriate index to avoid full table scan'
        });
      }
      
      // Check for filesort
      if (explain.Extra && explain.Extra.includes('Using filesort')) {
        findings.push({
          type: 'filesort',
          severity: 'medium',
          query: plan.digest_text,
          evidence: {
            execution_plan: explain
          },
          recommendation: 'Add appropriate index to avoid filesort'
        });
      }
      
      // Check for temporary table
      if (explain.Extra && explain.Extra.includes('Using temporary')) {
        findings.push({
          type: 'temporary_table',
          severity: 'medium',
          query: plan.digest_text,
          evidence: {
            execution_plan: explain
          },
          recommendation: 'Optimize query or add appropriate indexes to avoid temporary table'
        });
      }
    }
    
    return findings;
  }

  generateRecommendationPack() {
    const findings = this.analyze();
    
    const recommendationPack = {
      findings: findings,
      summary: {
        total_findings: findings.length,
        high_severity: findings.filter(f => f.severity === 'high').length,
        medium_severity: findings.filter(f => f.severity === 'medium').length,
        low_severity: findings.filter(f => f.severity === 'low').length
      },
      generated_at: new Date().toISOString()
    };
    
    return recommendationPack;
  }
}