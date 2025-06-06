import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AboutPage } from '@ad/src/app/(public)/about/AboutPage';

// TODO: it does not work with MUI components due to detailed imports to improve performance
// Ref: https://stackoverflow.com/a/79252466/3608410
describe.skip('AboutPage', () => {
  it('renders', () => {
    render(<AboutPage />);

    const heading = screen.getByRole('heading', {
      name: /assistant/i,
      level: 1,
    });

    expect(heading).toBeInTheDocument();
  });
});
