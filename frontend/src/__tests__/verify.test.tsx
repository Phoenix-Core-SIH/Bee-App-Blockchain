import "@testing-library/jest-dom";
import { render, screen, waitFor } from '@testing-library/react';
import VerifyResultPage from '@/app/verify/[qrCode]/page';
import { fetchApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  fetchApi: jest.fn(),
}));

describe('VerifyResultPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    (fetchApi as jest.Mock).mockReturnValue(new Promise(() => {})); // pending promise
    render(<VerifyResultPage params={{ qrCode: 'JAR-123' }} />);
    expect(screen.getByText(/Verifying blockchain records/i)).toBeTruthy();
  });

  it('renders verified state with data', async () => {
    (fetchApi as jest.Mock).mockResolvedValueOnce({
      verified: true,
      qr_id: '123',
      honey_type: 'Multiflora',
      beekeeper_name: 'Alice',
      harvest_date: '2024-05-01',
      quantity_kg: 50,
      custody_chain: [
        { step: 1, stage: 'Processor', from: '0x1', to: '0x2', timestamp_iso: '2024-05-02T10:00:00Z', tx: '0xabc' }
      ]
    });

    render(<VerifyResultPage params={{ qrCode: 'JAR-123' }} />);

    expect(await screen.findByText('Verified Authentic')).toBeTruthy();
    expect(screen.getByText('Multiflora')).toBeTruthy();
    expect(screen.getAllByText(/Alice/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Transferred to Processor/i).length).toBeGreaterThan(0);
  });

  it('renders failure state on API error', async () => {
    (fetchApi as jest.Mock).mockRejectedValueOnce(new Error('QR code not found'));

    render(<VerifyResultPage params={{ qrCode: 'JAR-999' }} />);

    expect(await screen.findByText('Verification Failed')).toBeTruthy();
    expect(screen.getByText(/QR code not found/i)).toBeTruthy();
  });
});
