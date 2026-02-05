export class ImpactAnalyzer {
  private schemaSnapshot: any[];
  private queryDigests: any[];
  private schemaObjects: any;

  constructor(schemaSnapshot: any[], queryDigests: any[], schemaObjects: any) {
    this.schemaSnapshot = schemaSnapshot;
    this.queryDigests = queryDigests;
    this.schemaObjects = schemaObjects;
  }

  analyzeImpact() {
    const impactAnalysis = {
      recommendations: [],
      total_impact: 0
    };

    // Analyze each query digest for impact
    for (const digest of this.queryDigests) {
      const impact = this.calculateImpact(digest);
      if (impact) {
        impactAnalysis.recommendations.push(impact);
        impactAnalysis.total_impact += impact.risk_score;
      }
    }

    return impactAnalysis;
  }

  private calculateImpact(digest: any) {
    // Find objects that reference this query
    const referencedObjects = this.findReferencedObjects(digest.DIGEST_TEXT);
    
    // Calculate risk score based on dependencies
    let riskScore = 0;
    let riskLevel = 'low';
    
    if (referencedObjects.length > 0) {
      riskScore = referencedObjects.length * 10; // Simple scoring
      if (riskScore > 70) {
        riskLevel = 'high';
      } else if (riskScore > 30) {
        riskLevel = 'medium';
      }
    }
    
    // Analyze schema objects for impact
    const schemaImpact = this.analyzeSchemaImpact(digest);
    
    return {
      query: digest.DIGEST_TEXT,
      blast_radius: referencedObjects.length,
      referenced_objects: referencedObjects,
      risk_score: riskScore,
      risk_level: riskLevel,
      confidence: Math.min(100, 100 - (riskScore / 2)), // Confidence decreases with risk
      schema_impact: schemaImpact,
      generated_at: new Date().toISOString()
    };
  }

  private findReferencedObjects(queryText: string) {
    const referencedObjects = [];
    
    // Check views
    if (this.schemaObjects.views && this.schemaObjects.views.length > 0) {
      for (const view of this.schemaObjects.views) {
        if (view.VIEW_DEFINITION && view.VIEW_DEFINITION.includes(queryText)) {
          referencedObjects.push({
            type: 'view',
            name: view.TABLE_NAME,
            schema: view.TABLE_SCHEMA
          });
        }
      }
    }
    
    // Check procedures
    if (this.schemaObjects.procedures && this.schemaObjects.procedures.length > 0) {
      for (const proc of this.schemaObjects.procedures) {
        if (proc.ROUTINE_DEFINITION && proc.ROUTINE_DEFINITION.includes(queryText)) {
          referencedObjects.push({
            type: 'procedure',
            name: proc.ROUTINE_NAME,
            schema: proc.ROUTINE_SCHEMA
          });
        }
      }
    }
    
    // Check functions
    if (this.schemaObjects.functions && this.schemaObjects.functions.length > 0) {
      for (const func of this.schemaObjects.functions) {
        if (func.ROUTINE_DEFINITION && func.ROUTINE_DEFINITION.includes(queryText)) {
          referencedObjects.push({
            type: 'function',
            name: func.ROUTINE_NAME,
            schema: func.ROUTINE_SCHEMA
          });
        }
      }
    }
    
    // Check triggers
    if (this.schemaObjects.triggers && this.schemaObjects.triggers.length > 0) {
      for (const trigger of this.schemaObjects.triggers) {
        if (trigger.ACTION_STATEMENT && trigger.ACTION_STATEMENT.includes(queryText)) {
          referencedObjects.push({
            type: 'trigger',
            name: trigger.TRIGGER_NAME,
            schema: trigger.TRIGGER_SCHEMA
          });
        }
      }
    }
    
    // Check events
    if (this.schemaObjects.events && this.schemaObjects.events.length > 0) {
      for (const event of this.schemaObjects.events) {
        if (event.EVENT_BODY && event.EVENT_BODY.includes(queryText)) {
          referencedObjects.push({
            type: 'event',
            name: event.EVENT_NAME,
            schema: event.EVENT_SCHEMA
          });
        }
      }
    }
    
    return referencedObjects;
  }

  private analyzeSchemaImpact(digest: any) {
    const impact = {
      tables_affected: [],
      columns_used: [],
      indexes_impacted: []
    };
    
    // Simple analysis based on query text
    if (digest.DIGEST_TEXT) {
      const queryText = digest.DIGEST_TEXT.toLowerCase();
      
      // Extract table names from query
      const tableMatches = queryText.match(/from\s+(\w+)/i);
      if (tableMatches && tableMatches[1]) {
        impact.tables_affected.push(tableMatches[1]);
      }
      
      // Extract column names from query
      const columnMatches = queryText.match(/(\w+)\.(\w+)/g);
      if (columnMatches) {
        impact.columns_used.push(...columnMatches);
      }
    }
    
    return impact;
  }

  generateImpactReport() {
    const analysis = this.analyzeImpact();
    
    const report = {
      ...analysis,
      summary: {
        total_recommendations: analysis.recommendations.length,
        high_risk: analysis.recommendations.filter(r => r.risk_level === 'high').length,
        medium_risk: analysis.recommendations.filter(r => r.risk_level === 'medium').length,
        low_risk: analysis.recommendations.filter(r => r.risk_level === 'low').length,
        average_risk_score: analysis.total_impact / Math.max(1, analysis.recommendations.length)
      },
      generated_at: new Date().toISOString()
    };
    
    return report;
  }
}