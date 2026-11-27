import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MfaVerificationForm } from './MfaVerificationForm';

describe('MfaVerificationForm', () => {
  const mockSubmit = jest.fn(async () => {});

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('renders input and submit button', () => {
    render(<MfaVerificationForm onSubmit={mockSubmit} />);
    expect(screen.getByLabelText('Code de vérification')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('disables submit when code is not 6 digits', () => {
    render(<MfaVerificationForm onSubmit={mockSubmit} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Code de vérification'), {
      target: { value: '12345' },
    });
    expect(button).toBeDisabled();
  });

  it('enables submit when code is 6 digits', () => {
    render(<MfaVerificationForm onSubmit={mockSubmit} />);
    fireEvent.change(screen.getByLabelText('Code de vérification'), {
      target: { value: '123456' },
    });
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('submits valid code', async () => {
    render(<MfaVerificationForm onSubmit={mockSubmit} />);
    fireEvent.change(screen.getByLabelText('Code de vérification'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith('123456'));
  });

  it('shows loading state', () => {
    render(<MfaVerificationForm onSubmit={mockSubmit} loading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows error message', () => {
    render(<MfaVerificationForm onSubmit={mockSubmit} error="Code incorrect" />);
    expect(screen.getByText('Erreur')).toBeInTheDocument();
    expect(screen.getByText('Code incorrect')).toBeInTheDocument();
  });

  it('shows locked state with message', () => {
    const lockedUntil = Date.now() + 60000;
    render(<MfaVerificationForm onSubmit={mockSubmit} locked={true} lockedUntil={lockedUntil} />);
    expect(screen.getByText('Compte temporairement verrouillé')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('has correct input attributes', () => {
    render(<MfaVerificationForm onSubmit={mockSubmit} />);
    const input = screen.getByLabelText('Code de vérification');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
  });
});
