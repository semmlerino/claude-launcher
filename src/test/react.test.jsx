import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('React Test Environment', () => {
  it('should render a simple component', () => {
    render(<div>Hello Test</div>);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});
