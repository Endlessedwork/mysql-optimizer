"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { TableView } from '@/lib/types';
import { TableNode } from './TableNode';

interface SchemaERDiagramProps {
  tables: TableView[];
}

const nodeTypes = { tableNode: TableNode };

function layoutTables(tables: TableView[]): { nodes: Node[]; edges: Edge[] } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
  const nodeWidth = 280;
  const nodeHeight = 200;
  const gapX = 80;
  const gapY = 60;

  const nodes: Node[] = tables.map((table, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: table.name,
      type: 'tableNode',
      position: {
        x: col * (nodeWidth + gapX),
        y: row * (nodeHeight + gapY),
      },
      data: {
        table,
        columnCount: table.columns.length,
        indexCount: table.indexes.length,
      },
    };
  });

  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const target = fk.REFERENCED_TABLE_NAME || (fk as any).referenced_table_name || '';
      if (!target) continue;
      const edgeId = `${table.name}->${target}::${fk.COLUMN_NAME}`;
      if (edgeSet.has(edgeId)) continue;
      edgeSet.add(edgeId);

      edges.push({
        id: edgeId,
        source: table.name,
        target,
        label: `${fk.COLUMN_NAME}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        labelStyle: { fontSize: 10, fill: '#6d28d9' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
      });
    }
  }

  return { nodes, edges };
}

export function SchemaERDiagram({ tables }: SchemaERDiagramProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  const diagramKey = useMemo(() => tables.map(t => t.name).join(','), [tables]);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => layoutTables(tables), [tables]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
    instance.fitView({ padding: 0.2 });
  }, []);

  // Use native Fullscreen API
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {
        // Fallback: some browsers may not support it
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Sync state with fullscreen changes (including when user presses Esc)
  useEffect(() => {
    const handleChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      // Re-fit after resize settles
      setTimeout(() => {
        rfInstance.current?.fitView({ padding: 0.2 });
      }, 100);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
        No tables to display.
      </div>
    );
  }

  return (
    <div
      key={diagramKey}
      ref={containerRef}
      className="h-[600px] border border-slate-200 rounded-lg overflow-hidden bg-slate-50 relative"
    >
      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-[5] flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-slate-600"
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="w-3.5 h-3.5" />
            Exit Fullscreen
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5" />
            Fullscreen
          </>
        )}
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls className="!bg-white !border-slate-200 !shadow-sm" />
        <MiniMap
          nodeColor="#0d9488"
          maskColor="rgba(0,0,0,0.1)"
          className="!bg-white !border-slate-200"
        />
      </ReactFlow>

      {/* Esc hint */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[5] px-3 py-1.5 bg-black/60 text-white text-xs rounded-full pointer-events-none">
          Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">ESC</kbd> to exit fullscreen
        </div>
      )}
    </div>
  );
}
