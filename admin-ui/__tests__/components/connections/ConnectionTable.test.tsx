/**
 * Unit Tests: ConnectionTable Component
 * ทดสอบ ConnectionTable feature component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConnectionTable } from '@/components/connections/ConnectionTable';
import { Connection } from '@/lib/types';

// Mock child components
jest.mock('@/components/ui/DataTable', () => {
  return function MockDataTable({ 
    columns, 
    data, 
    loading, 
    onRowClick 
  }: {
    columns: any[];
    data: any[];
    loading: boolean;
    onRowClick: any;
  }) {
    if (loading) {
      return <div data-testid="loading">Loading...</div>;
    }
    
    if (data.length === 0) {
      return <div data-testid="empty">No data</div>;
    }

    return (
      <table data-testid="data-table">
        <thead>
          <tr>
            {columns.map((col: any) => (
              <th key={col.key}>{col.title || col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, i: number) => (
            <tr key={i} data-testid={`row-${i}`}>
              {columns.map((col: any) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
});

jest.mock('@/components/connections/ConnectionStatusBadge', () => ({
  ConnectionStatusBadge: ({ connection }: { connection: Connection }) => (
    <span data-testid="status-badge">{connection.status}</span>
  )
}));

jest.mock('@/components/connections/ConnectionActions', () => ({
  ConnectionActions: ({ connection }: { connection: Connection }) => (
    <div data-testid="connection-actions">Actions for {connection.id}</div>
  )
}));

describe('ConnectionTable Component', () => {
  const mockConnections: Connection[] = [
    {
      id: 'conn-1',
      name: 'Production DB',
      host: 'prod.db.example.com',
      port: 3306,
      database: 'app_prod',
      username: 'admin',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    },
    {
      id: 'conn-2',
      name: 'Staging DB',
      host: 'staging.db.example.com',
      port: 3306,
      database: 'app_staging',
      username: 'admin',
      status: 'disabled',
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-04T00:00:00.000Z'
    }
  ];

  describe('Rendering', () => {
    it('ควร render DataTable component', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    it('ควร render connections data', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByText('Production DB')).toBeInTheDocument();
      expect(screen.getByText('Staging DB')).toBeInTheDocument();
    });

    it('ควร render correct number of rows', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByTestId('row-0')).toBeInTheDocument();
      expect(screen.getByTestId('row-1')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('ควรแสดง loading indicator เมื่อ isLoading=true', () => {
      render(<ConnectionTable connections={[]} isLoading={true} />);
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('ควรไม่แสดง table เมื่อ loading', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={true} />);
      expect(screen.queryByTestId('data-table')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('ควรแสดง empty message เมื่อไม่มี connections', () => {
      render(<ConnectionTable connections={[]} isLoading={false} />);
      expect(screen.getByTestId('empty')).toBeInTheDocument();
    });
  });

  describe('Columns', () => {
    it('ควรมี Name column', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('ควรมี Host column', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByText('Host')).toBeInTheDocument();
    });

    it('ควรมี Database column', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByText('Database')).toBeInTheDocument();
    });

    it('ควรมี Status column', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('ควรมี Last Sync column', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByText('Last Sync')).toBeInTheDocument();
    });

    it('ควรมี Actions column', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  describe('Cell Rendering', () => {
    it('ควร render connection name พร้อม font-medium class', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      const nameCell = screen.getByText('Production DB');
      expect(nameCell).toHaveClass('font-medium');
    });

    it('ควร render ConnectionStatusBadge', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      const badges = screen.getAllByTestId('status-badge');
      expect(badges).toHaveLength(2);
      expect(badges[0]).toHaveTextContent('active');
      expect(badges[1]).toHaveTextContent('disabled');
    });

    it('ควร render ConnectionActions', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      const actions = screen.getAllByTestId('connection-actions');
      expect(actions).toHaveLength(2);
      expect(actions[0]).toHaveTextContent('Actions for conn-1');
    });

    it('ควร render formatted date สำหรับ Last Sync', () => {
      render(<ConnectionTable connections={mockConnections} isLoading={false} />);
      // Date should be formatted
      const dateElements = document.querySelectorAll('.text-gray-500');
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('ควร render ทุก connections ที่ส่งมา', () => {
      const manyConnections = Array.from({ length: 10 }, (_, i) => ({
        ...mockConnections[0],
        id: `conn-${i}`,
        name: `Connection ${i}`
      }));
      
      render(<ConnectionTable connections={manyConnections} isLoading={false} />);
      
      manyConnections.forEach((conn, i) => {
        expect(screen.getByText(`Connection ${i}`)).toBeInTheDocument();
      });
    });

    it('ควร handle special characters ใน connection name', () => {
      const specialConn: Connection[] = [{
        ...mockConnections[0],
        name: 'DB <Production> & "Staging"'
      }];
      
      render(<ConnectionTable connections={specialConn} isLoading={false} />);
      expect(screen.getByText('DB <Production> & "Staging"')).toBeInTheDocument();
    });
  });
});
