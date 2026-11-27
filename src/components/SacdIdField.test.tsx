import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SacdIdInput } from './SacdIdField';

describe('SacdIdInput', () => {
  it('accepts a 32-character hex string', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<SacdIdInput name="sacdId" ref={() => {}} label="Identifiant SACD" value={null} onChange={onChange} onBlur={jest.fn()} />);

    const input = screen.getByLabelText('Identifiant SACD') as HTMLInputElement;
    await user.type(input, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4');

    expect(input.value).toBe('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4');
  });

  it('rejects non-hexadecimal characters', async () => {
    const user = userEvent.setup();
    render(<SacdIdInput name="sacdId" ref={() => {}} label="Identifiant SACD" value={null} onChange={jest.fn()} onBlur={jest.fn()} />);

    const input = screen.getByLabelText('Identifiant SACD') as HTMLInputElement;
    await user.type(input, 'xyz');

    expect(input.value).not.toBe('xyz');
    expect(input.value).toBe('');
  });

  it('limits input to 32 characters', async () => {
    const user = userEvent.setup();
    render(<SacdIdInput name="sacdId" ref={() => {}} label="Identifiant SACD" value={null} onChange={jest.fn()} onBlur={jest.fn()} />);

    const input = screen.getByLabelText('Identifiant SACD') as HTMLInputElement;
    await user.type(input, 'a'.repeat(33));

    expect(input.value).toBe('a'.repeat(32));
  });

  it('shows error state when errorMessage is provided', () => {
    render(
      <SacdIdInput
        name="sacdId"
        ref={() => {}}
        label="Identifiant SACD"
        value={null}
        onChange={jest.fn()}
        onBlur={jest.fn()}
        errorMessage="Format invalide"
      />
    );

    expect(screen.getByText('Format invalide')).toBeInTheDocument();
  });
});
