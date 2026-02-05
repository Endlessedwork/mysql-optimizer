/**
 * Unit Tests: StatusBadge Component
 * ทดสอบ StatusBadge UI component พร้อม variants
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '@/components/ui/StatusBadge';

describe('StatusBadge Component', () => {
  describe('Rendering', () => {
    it('ควร render status text ถูกต้อง', () => {
      render(<StatusBadge status="Active" />);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('ควร render เป็น span element', () => {
      render(<StatusBadge status="Test" />);
      const badge = screen.getByText('Test');
      expect(badge.tagName).toBe('SPAN');
    });

    it('ควรมี base classes', () => {
      render(<StatusBadge status="Test" />);
      const badge = screen.getByText('Test');
      expect(badge).toHaveClass('px-2', 'py-1', 'text-xs', 'font-medium', 'rounded-full');
    });
  });

  describe('Variants', () => {
    it('ควร render success variant ถูกต้อง', () => {
      render(<StatusBadge status="Active" variant="success" />);
      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('ควร render warning variant ถูกต้อง', () => {
      render(<StatusBadge status="Pending" variant="warning" />);
      const badge = screen.getByText('Pending');
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('ควร render error variant ถูกต้อง', () => {
      render(<StatusBadge status="Failed" variant="error" />);
      const badge = screen.getByText('Failed');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('ควร render info variant ถูกต้อง', () => {
      render(<StatusBadge status="Info" variant="info" />);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('ควร render neutral variant ถูกต้อง', () => {
      render(<StatusBadge status="Unknown" variant="neutral" />);
      const badge = screen.getByText('Unknown');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('ควรใช้ neutral เป็น default variant', () => {
      render(<StatusBadge status="Default" />);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  describe('Status Text', () => {
    it('ควร render long status text', () => {
      render(<StatusBadge status="This is a very long status" />);
      expect(screen.getByText('This is a very long status')).toBeInTheDocument();
    });

    it('ควร render special characters', () => {
      render(<StatusBadge status="Status & Special <chars>" />);
      expect(screen.getByText('Status & Special <chars>')).toBeInTheDocument();
    });

    it('ควร render empty status', () => {
      render(<StatusBadge status="" />);
      // Should still render the span
      const badge = document.querySelector('.rounded-full');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Use Cases', () => {
    describe('Connection Status', () => {
      it('ควรแสดง active status เป็น success', () => {
        render(<StatusBadge status="active" variant="success" />);
        const badge = screen.getByText('active');
        expect(badge).toHaveClass('bg-green-100');
      });

      it('ควรแสดง disabled status เป็น neutral', () => {
        render(<StatusBadge status="disabled" variant="neutral" />);
        const badge = screen.getByText('disabled');
        expect(badge).toHaveClass('bg-gray-100');
      });
    });

    describe('Recommendation Status', () => {
      it('ควรแสดง pending status เป็น warning', () => {
        render(<StatusBadge status="pending" variant="warning" />);
        expect(screen.getByText('pending')).toHaveClass('bg-yellow-100');
      });

      it('ควรแสดง approved status เป็น success', () => {
        render(<StatusBadge status="approved" variant="success" />);
        expect(screen.getByText('approved')).toHaveClass('bg-green-100');
      });

      it('ควรแสดง rejected status เป็น error', () => {
        render(<StatusBadge status="rejected" variant="error" />);
        expect(screen.getByText('rejected')).toHaveClass('bg-red-100');
      });

      it('ควรแสดง scheduled status เป็น info', () => {
        render(<StatusBadge status="scheduled" variant="info" />);
        expect(screen.getByText('scheduled')).toHaveClass('bg-blue-100');
      });
    });

    describe('Execution Status', () => {
      it('ควรแสดง running status เป็น info', () => {
        render(<StatusBadge status="running" variant="info" />);
        expect(screen.getByText('running')).toHaveClass('bg-blue-100');
      });

      it('ควรแสดง completed status เป็น success', () => {
        render(<StatusBadge status="completed" variant="success" />);
        expect(screen.getByText('completed')).toHaveClass('bg-green-100');
      });

      it('ควรแสดง failed status เป็น error', () => {
        render(<StatusBadge status="failed" variant="error" />);
        expect(screen.getByText('failed')).toHaveClass('bg-red-100');
      });

      it('ควรแสดง rolled_back status เป็น warning', () => {
        render(<StatusBadge status="rolled_back" variant="warning" />);
        expect(screen.getByText('rolled_back')).toHaveClass('bg-yellow-100');
      });
    });
  });

  describe('Accessibility', () => {
    it('ควร render text ที่อ่านได้', () => {
      render(<StatusBadge status="Active" variant="success" />);
      const badge = screen.getByText('Active');
      expect(badge).toBeVisible();
    });

    it('ควรมี sufficient color contrast (visual test)', () => {
      // This is a visual indicator - text should be readable
      render(<StatusBadge status="Test" variant="success" />);
      const badge = screen.getByText('Test');
      // green-800 on green-100 should have sufficient contrast
      expect(badge).toHaveClass('text-green-800', 'bg-green-100');
    });
  });
});
