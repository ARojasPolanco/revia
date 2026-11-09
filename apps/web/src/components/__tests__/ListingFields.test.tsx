import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ListingFields } from '../ListingFields';
import { emptyListingFields, type Category, type ListingFieldsValue } from '@/lib/listings';

const categories: Category[] = [
  {
    id: 'category-1',
    name: 'Ropa',
    slug: 'moda',
    attributes: [],
    children: [
      {
        id: 'category-2',
        name: 'Mujer',
        slug: 'moda-mujer',
        attributes: [
          {
            id: 'attribute-1',
            key: 'size',
            label: 'Talle',
            type: 'text',
            required: true,
            options: null,
          },
        ],
      },
    ],
  },
];

function Harness() {
  const [value, setValue] = useState<ListingFieldsValue>(emptyListingFields());

  return <ListingFields categories={categories} value={value} onChange={setValue} />;
}

describe('ListingFields', () => {
  it('permite elegir rubro, subcategoría y completar atributos', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.selectOptions(screen.getByLabelText('Rubro'), 'category-1');
    await user.selectOptions(screen.getByLabelText('Subcategoría'), 'category-2');

    const sizeInput = screen.getByLabelText(/Talle/);
    await user.type(sizeInput, 'M');

    expect(sizeInput).toHaveValue('M');
  });
});
