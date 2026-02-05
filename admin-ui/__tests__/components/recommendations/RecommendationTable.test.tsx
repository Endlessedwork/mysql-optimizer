/**
 * Unit Tests: RecommendationTable Component
 * ทดสอบ RecommendationTable feature component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationTable } from '@/components/recommendations/RecommendationTable';
import { Recommendation } from '@/lib/types';

// Mock child components
jest.mock('@/components/ui/DataTable', () => {
  return function MockDataTable({ 
    columns, 
    data, 
    loading, 
    onRowClick,
    emptyStateMessage,
    filters
  }: any) {
    if (loading) {
      return <div data-testid="loading">Loading...</div>;
    }
    
    if (data.length === 0) {
      return <div data-testid="empty">{emptyStateMessage || 'No data'}</div>;
    }

    return (
      <div>
        {filters && (
          <div data-testid="filters">
            {filters.map((filter: any) => (
              <select 
                key={filter.key} 
                data-testid={`filter-${filter.key}`}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
              >
                {filter.options.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ))}
          </div>
        )}
        <table data-testid="data-table">
          <thead>
            <tr>
              {columns.map((col: any) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row: any, i: number) => (
              <tr 
                key={i} 
                data-testid={`row-${i}`}
                onClick={() => onRowClick && onRowClick(row.id)}
              >
                {columns.map((col: any) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
});

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  )
}));

jest.mock('@/components/recommendations/RecommendationStatusBadge', () => ({
  RecommendationStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  )
}));

describe('RecommendationTable Component', () => {
  const mockRecommendations: Recommendation[] = [
    {
      id: 'rec-1',
      connectionId: 'conn-1',
      title: 'Add Index on users.email',
      description: 'Adding index will improve query performance',
      impact: 'high',
      status: 'pending',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    },
    {
      id: 'rec-2',
      connectionId: 'conn-2',
      title: 'Add Index on orders.user_id',
      description: 'Foreign key index for better join performance',
      impact: 'medium',
      status: 'approved',
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-04T00:00:00.000Z'
    },
    {
      id: 'rec-3',
      connectionId: 'conn-1',
      title: 'Add composite index',
      description: 'Composite index for multi-column queries',
      impact: 'low',
      status: 'executed',
      createdAt: '2024-01-05T00:00:00.000Z',
      updatedAt: '2024-01-06T00:00:00.000Z'
    }
  ];

  const mockOnRowClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('ควร render DataTable component', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('ควร render recommendations data', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      expect(screen.getByTestId('row-0')).toBeInTheDocument();
      expect(screen.getByTestId('row-1')).toBeInTheDocument();
      expect(screen.getByTestId('row-2')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('ควรแสดง loading indicator เมื่อ loading=true', () => {
      render(
        <RecommendationTable 
          recommendations={[]} 
          onRowClick={mockOnRowClick}
          loading={true}
        />
      );
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('ควรแสดง default empty message เมื่อไม่มี recommendations', () => {
      render(
        <RecommendationTable 
          recommendations={[]} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      expect(screen.getByTestId('empty')).toBeInTheDocument();
      expect(screen.getByText('ไม่มี recommendations ที่ตรงกับเงื่อนไข')).toBeInTheDocument();
    });

    it('ควรแสดง custom empty message', () => {
      render(
        <RecommendationTable 
          recommendations={[]} 
          onRowClick={mockOnRowClick}
          loading={false}
          emptyStateMessage="Custom empty message"
        />
      );
      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });
  });

  describe('Columns', () => {
    it('ควรมี Connection column', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      expect(screen.getByText('Connection')).toBeInTheDocument();
    });

    it('ควรมี Status column', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('ควรมี Priority column', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });

    it('ควรมี Actions column', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('Row Click', () => {
    it('ควร call onRowClick เมื่อ click row', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      
      fireEvent.click(screen.getByTestId('row-0'));
      expect(mockOnRowClick).toHaveBeenCalledWith('rec-1');
    });

    it('ควร call onRowClick พร้อม correct id', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      
      fireEvent.click(screen.getByTestId('row-1'));
      expect(mockOnRowClick).toHaveBeenCalledWith('rec-2');
    });
  });

  describe('Status Badge', () => {
    it('ควร render status badges', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      
      const badges = screen.getAllByTestId('status-badge');
      expect(badges).toHaveLength(3);
    });

    it('ควรแสดง correct status', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('approved')).toBeInTheDocument();
      expect(screen.getByText('executed')).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('ควร render status filter', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      
      expect(screen.getByTestId('filter-status')).toBeInTheDocument();
    });

    it('ควร render connection filter', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      
      expect(screen.getByTestId('filter-connection')).toBeInTheDocument();
    });

    it('ควรมี filter options สำหรับ status', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      
      const statusFilter = screen.getByTestId('filter-status');
      expect(statusFilter).toContainElement(screen.getByText('All Statuses'));
      expect(statusFilter).toContainElement(screen.getByText('Pending'));
      expect(statusFilter).toContainElement(screen.getByText('Approved'));
    });
  });

  describe('View Button', () => {
    it('ควร render View buttons', () => {
      render(
        <RecommendationTable 
          recommendations={mockRecommendations} 
          onRowClick={mockOnRowClick}
          loading={false}
        />
      );
      
      const viewButtons = screen.getAllByText('View');
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });
});
