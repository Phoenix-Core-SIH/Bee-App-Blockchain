import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/admin/login/page';
import { fetchApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/lib/api', () => ({
  fetchApi: jest.fn(),
}));
jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

describe('LoginPage', () => {
  const mockRouter = { push: jest.fn(), refresh: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders login form correctly', () => {
    render(<LoginPage />);
    expect(screen.getByText('HoneyChain Operator')).toBeTruthy();
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('displays error on failed login', async () => {
    (fetchApi as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/Invalid credentials/i)).toBeTruthy();
  });

  it('redirects and sets cookies on successful login', async () => {
    (fetchApi as jest.Mock).mockResolvedValueOnce({
      token: 'fake-jwt',
      role: 'ADMIN',
      entity_id: 'system',
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(Cookies.set).toHaveBeenCalledWith('token', 'fake-jwt', expect.any(Object));
    });
    expect(Cookies.set).toHaveBeenCalledWith('role', 'ADMIN', expect.any(Object));
    expect(mockRouter.push).toHaveBeenCalledWith('/admin/dashboard');
  });
});
