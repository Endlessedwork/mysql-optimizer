import { randomUUID } from 'crypto';

export class RecommendationPackGenerator {
  private findings: any[];
  private impactReport: any;
  private schemaSnapshot: any[];

  constructor(findings: any[], impactReport: any[], schemaSnapshot: any[]) {
    this.findings = findings;
    this.impactReport = impactReport;
    this.schemaSnapshot = schemaSnapshot;
  }

  generatePack() {
    const recommendationPack = {
      recommendations: [],
      metadata: {
        generated_at: new Date().toISOString(),
        total_recommendations: 0,
        summary: {
          high_severity: 0,
          medium_severity: 0,
          low_severity: 0
        }
      }
    };

    // Process each finding into a recommendation
    for (const finding of this.findings) {
      const recommendation = this.createRecommendation(finding);
      if (recommendation) {
        recommendationPack.recommendations.push(recommendation);
      }
    }

    // Update metadata
    recommendationPack.metadata.total_recommendations = recommendationPack.recommendations.length;
    recommendationPack.metadata.summary.high_severity = 
      recommendationPack.recommendations.filter(r => r.severity === 'high').length;
    recommendationPack.metadata.summary.medium_severity = 
      recommendationPack.recommendations.filter(r => r.severity === 'medium').length;
    recommendationPack.metadata.summary.low_severity = 
      recommendationPack.recommendations.filter(r => r.severity === 'low').length;

    return recommendationPack;
  }

  private createRecommendation(finding: any) {
    // Find corresponding impact for this finding
    const impact = this.impactReport.recommendations.find((r: any) => 
      r.query === finding.query || r.query.includes(finding.query)
    );

    const recommendation = {
      id: this.generateId(),
      problem_statement: finding.type,
      evidence: {
        metrics: finding.evidence,
        explain_plan: finding.explain_plan
      },
      blast_radius: impact ? impact.blast_radius : 0,
      referenced_objects: impact ? impact.referenced_objects : [],
      fix_options: this.generateFixOptions(finding),
      expected_gain: this.calculateExpectedGain(finding),
      risk: {
        level: finding.severity,
        score: impact ? impact.risk_score : 0,
        confidence: impact ? impact.confidence : 0
      },
      trade_offs: this.calculateTradeOffs(finding),
      rollback_plan: this.generateRollbackPlan(finding),
      verification_plan: this.generateVerificationPlan(finding),
      severity: finding.severity,
      created_at: new Date().toISOString()
    };

    return recommendation;
  }

  private generateId(): string {
    return 'rec_' + randomUUID().replace(/-/g, '').substring(0, 12);
  }

  private generateFixOptions(finding: any): any[] {
    const options = [];
    
    switch (finding.type) {
      case 'full_table_scan':
        options.push({
          id: 'add_index',
          description: 'Add appropriate index to avoid full table scan',
          implementation: 'CREATE INDEX idx_column ON table_name(column_name);'
        });
        break;
      case 'filesort':
        options.push({
          id: 'add_sort_index',
          description: 'Add index to avoid filesort',
          implementation: 'CREATE INDEX idx_sort ON table_name(sort_column);'
        });
        break;
      case 'high_rows_examined':
        options.push({
          id: 'optimize_query',
          description: 'Optimize query to reduce rows examined',
          implementation: 'Refactor query with better WHERE clause conditions'
        });
        break;
      default:
        options.push({
          id: 'general_optimization',
          description: 'General optimization recommendation',
          implementation: 'Review query and schema design'
        });
    }
    
    return options;
  }

  private calculateExpectedGain(finding: any): any {
    // Simple calculation based on severity and impact
    const gain = {
      performance_improvement: 0,
      resource_savings: 0,
      risk_reduction: 0
    };

    switch (finding.severity) {
      case 'high':
        gain.performance_improvement = 70;
        gain.resource_savings = 60;
        gain.risk_reduction = 80;
        break;
      case 'medium':
        gain.performance_improvement = 40;
        gain.resource_savings = 30;
        gain.risk_reduction = 50;
        break;
      case 'low':
        gain.performance_improvement = 10;
        gain.resource_savings = 5;
        gain.risk_reduction = 20;
        break;
    }

    return gain;
  }

  private calculateTradeOffs(finding: any): any {
    return {
      write_cost: 'Medium',
      disk_usage: 'Low',
      lock_risk: finding.severity === 'high' ? 'High' : 'Medium',
      downtime: 'Minimal'
    };
  }

  private generateRollbackPlan(finding: any): string {
    switch (finding.type) {
      case 'full_table_scan':
        return 'Drop the newly created index if performance degrades';
      case 'filesort':
        return 'Remove the index that was added to avoid filesort';
      case 'high_rows_examined':
        return 'Revert query changes or restore previous query version';
      default:
        return 'Revert schema changes or restore previous state';
    }
  }

  private generateVerificationPlan(finding: any): any[] {
    const plan = [];
    
    plan.push({
      step: 'Verify query execution plan',
      command: 'EXPLAIN FORMAT=JSON <query>',
      expected_result: 'No full table scan or filesort'
    });
    
    plan.push({
      step: 'Check performance metrics',
      command: 'SHOW PROCESSLIST',
      expected_result: 'Improved query execution time'
    });
    
    if (finding.type === 'full_table_scan') {
      plan.push({
        step: 'Monitor index usage',
        command: 'SELECT * FROM performance_schema.table_io_waits_summary_by_index_usage',
        expected_result: 'Index is being used'
      });
    }
    
    return plan;
  }
}