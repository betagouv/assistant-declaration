import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MfaSettings } from './MfaSettings';

describe('MfaSettings', () => {
  describe('state display', () => {
    it('shows enabled state with success alert when mfaEnabled is true', () => {
      render(<MfaSettings mfaEnabled={true} />);
      expect(screen.getByText('MFA activé')).toBeInTheDocument();
      expect(screen.getByText(/L'authentification à deux facteurs est activée/)).toBeInTheDocument();
    });

    it('shows disabled state with activate button when mfaEnabled is false', () => {
      render(<MfaSettings mfaEnabled={false} />);
      expect(screen.getByText('Activer le MFA')).toBeInTheDocument();
      expect(screen.getByText(/Non activé/)).toBeInTheDocument();
    });

    it('shows disable button when mfa is enabled', () => {
      render(<MfaSettings mfaEnabled={true} />);
      expect(screen.getByText('Désactiver le MFA')).toBeInTheDocument();
    });
  });

  describe('activation flow', () => {
    it('displays QR code after clicking activate', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /QR code/ })).toBeInTheDocument();
      });

      const img = screen.getByRole('img', { name: /QR code/ });
      expect(img).toHaveAttribute('src', 'data:image/png;base64,test');
    });

    it('calls onSetup when activating', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(onSetup).toHaveBeenCalled();
      });
    });

    it('requires valid 6-digit code before enabling', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      // Submit with empty code - button should be disabled
      const submitButton = screen.getByText('Vérifier et activer');
      expect(submitButton).toBeDisabled();
    });

    it('calls onVerify with the entered code', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      const onVerify = jest.fn(async () => {});
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} onVerify={onVerify} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Code à 6 chiffres'), { target: { value: '123456' } });
      fireEvent.click(screen.getByText('Vérifier et activer'));

      await waitFor(() => {
        expect(onVerify).toHaveBeenCalledWith('123456');
      });
    });

    it('calls onEnabled callback after successful verification', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      const onVerify = jest.fn(async () => {});
      const onEnabled = jest.fn();
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} onVerify={onVerify} onEnabled={onEnabled} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Code à 6 chiffres'), { target: { value: '123456' } });
      fireEvent.click(screen.getByText('Vérifier et activer'));

      await waitFor(() => {
        expect(onEnabled).toHaveBeenCalled();
      });
    });

    it('shows error when verification fails', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      const onVerify = jest.fn(async () => {
        throw new Error('Code invalide');
      });
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} onVerify={onVerify} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Code à 6 chiffres'), { target: { value: '123456' } });
      fireEvent.click(screen.getByText('Vérifier et activer'));

      await waitFor(() => {
        const errors = screen.getAllByText('Code invalide');
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('deactivation flow', () => {
    it('shows deactivation form with TOTP code input', () => {
      render(<MfaSettings mfaEnabled={true} />);

      fireEvent.click(screen.getByText('Désactiver le MFA'));

      expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
    });

    it('calls onDisable with the entered code', async () => {
      const onDisable = jest.fn(async () => {});
      render(<MfaSettings mfaEnabled={true} onDisable={onDisable} />);

      fireEvent.click(screen.getByText('Désactiver le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Code à 6 chiffres'), { target: { value: '654321' } });
      fireEvent.click(screen.getByText('Désactiver'));

      await waitFor(() => {
        expect(onDisable).toHaveBeenCalledWith('654321');
      });
    });

    it('calls onDisabled after successful deactivation', async () => {
      const onDisable = jest.fn(async () => {});
      const onDisabled = jest.fn();
      render(<MfaSettings mfaEnabled={true} onDisable={onDisable} onDisabled={onDisabled} />);

      fireEvent.click(screen.getByText('Désactiver le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Code à 6 chiffres'), { target: { value: '654321' } });
      fireEvent.click(screen.getByText('Désactiver'));

      await waitFor(() => {
        expect(onDisabled).toHaveBeenCalled();
      });
    });

    it('shows error when deactivation fails', async () => {
      const onDisable = jest.fn(async () => {
        throw new Error('Code TOTP invalide');
      });
      render(<MfaSettings mfaEnabled={true} onDisable={onDisable} />);

      fireEvent.click(screen.getByText('Désactiver le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Code à 6 chiffres'), { target: { value: '654321' } });
      fireEvent.click(screen.getByText('Désactiver'));

      await waitFor(() => {
        expect(screen.getByText('Code TOTP invalide')).toBeInTheDocument();
      });
    });
  });

  describe('input validation', () => {
    it('accepts only 6 digits', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      const input = screen.getByLabelText('Code à 6 chiffres');
      fireEvent.change(input, { target: { value: '123456789' } });
      expect(input).toHaveValue('123456');
    });

    it('submits only when code has exactly 6 digits', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      const input = screen.getByLabelText('Code à 6 chiffres');
      fireEvent.change(input, { target: { value: '12345' } });

      const button = screen.getByText('Vérifier et activer');
      expect(button).toBeDisabled();

      fireEvent.change(input, { target: { value: '123456' } });
      expect(button).toBeEnabled();
    });
  });

  describe('error states', () => {
    it('shows setup error', async () => {
      const onSetup = jest.fn(async () => {
        throw new Error('Erreur réseau');
      });
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByText('Erreur réseau')).toBeInTheDocument();
      });
    });

    it('shows lockout error', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      const onVerify = jest.fn(async () => {
        throw new Error('Compte verrouillé');
      });
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} onVerify={onVerify} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Code à 6 chiffres'), { target: { value: '123456' } });
      fireEvent.click(screen.getByText('Vérifier et activer'));

      await waitFor(() => {
        const errors = screen.getAllByText('Compte verrouillé');
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('accessibility', () => {
    it('has proper labels for inputs', async () => {
      const onSetup = jest.fn(async () => ({ qrCode: 'data:image/png;base64,test' }));
      render(<MfaSettings mfaEnabled={false} onSetup={onSetup} />);

      fireEvent.click(screen.getByText('Activer le MFA'));

      await waitFor(() => {
        expect(screen.getByLabelText('Code à 6 chiffres')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Code à 6 chiffres')).toHaveAttribute('aria-required', 'true');
    });
  });
});
