import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewBatchPage from '@/app/admin/batches/new/page';
import { fetchApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/lib/api', () => ({
  fetchApi: jest.fn(),
}));

describe('NewBatchPage', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders all required form fields', () => {
    render(<NewBatchPage />);
    expect(screen.getByLabelText(/Hive ID/i)).toBeTruthy();
    expect(screen.getByLabelText(/Beekeeper ID/i)).toBeTruthy();
    expect(screen.getByLabelText(/Quantity \(kg\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/Honey Type/i)).toBeTruthy();
  });

  it('submits form successfully and redirects', async () => {
    (fetchApi as jest.Mock).mockResolvedValueOnce({ batch_id: 'batch-123' });

    render(<NewBatchPage />);

    fireEvent.change(screen.getByLabelText(/Hive ID/i), { target: { value: 'HIVE-001' } });
    fireEvent.change(screen.getByLabelText(/Beekeeper ID/i), { target: { value: 'BK-001' } });
    fireEvent.change(screen.getByLabelText(/Beekeeper Ethereum Address/i), { target: { value: '0x123' } });
    fireEvent.change(screen.getByLabelText(/Harvest Date/i), { target: { value: '2024-05-01' } });
    fireEvent.change(screen.getByLabelText(/Quantity \(kg\)/i), { target: { value: '50.5' } });
    fireEvent.change(screen.getByLabelText(/Honey Type/i), { target: { value: 'Multiflora' } });

    fireEvent.click(screen.getByRole('button', { name: /Register Batch/i }));

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith('/batches', expect.objectContaining({
        method: 'POST',
        requireAuth: true,
      }));
      expect(mockRouter.push).toHaveBeenCalledWith('/admin/batches/batch-123');
    });
  });

  it('displays API errors', async () => {
    (fetchApi as jest.Mock).mockRejectedValueOnce(new Error('Backend validation failed'));

    render(<NewBatchPage />);
    
    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Hive ID/i), { target: { value: 'HIVE-001' } });
    fireEvent.change(screen.getByLabelText(/Beekeeper ID/i), { target: { value: 'BK-001' } });
    fireEvent.change(screen.getByLabelText(/Beekeeper Ethereum Address/i), { target: { value: '0x123' } });
    fireEvent.change(screen.getByLabelText(/Harvest Date/i), { target: { value: '2024-05-01' } });
    fireEvent.change(screen.getByLabelText(/Quantity \(kg\)/i), { target: { value: '50.5' } });
    fireEvent.change(screen.getByLabelText(/Honey Type/i), { target: { value: 'Multiflora' } });

    fireEvent.click(screen.getByRole('button', { name: /Register Batch/i }));

    expect(await screen.findByText(/Backend validation failed/i)).toBeTruthy();
  });
});
