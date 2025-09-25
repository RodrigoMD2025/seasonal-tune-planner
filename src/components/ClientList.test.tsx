import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClientList } from './ClientList';
import '@testing-library/jest-dom';

describe('ClientList', () => {
  test('renders ClientList component', () => {
    render(<ClientList />);
    const linkElement = screen.getByText(/Clientes Cadastrados/i);
    expect(linkElement).toBeInTheDocument();
  });
});