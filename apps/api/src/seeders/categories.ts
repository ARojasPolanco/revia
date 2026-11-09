import { logger } from '../config/logger.js';
import { sequelize } from '../config/database.js';
import { Category } from '../modules/categories/category.model.js';
import { CategoryAttribute } from '../modules/categories/categoryAttribute.model.js';

type AttributeType = 'text' | 'number' | 'select' | 'boolean';

interface AttributeSeed {
  key: string;
  label: string;
  type: AttributeType;
  required?: boolean;
  options?: string[];
}

interface SubcategorySeed {
  name: string;
  slug: string;
  attributes: AttributeSeed[];
}

interface CategorySeed {
  name: string;
  slug: string;
  subcategories: SubcategorySeed[];
}

const clothingAttributes: AttributeSeed[] = [
  { key: 'size', label: 'Talle', type: 'text', required: true },
  { key: 'brand', label: 'Marca', type: 'text' },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'material', label: 'Material', type: 'text' },
  {
    key: 'gender',
    label: 'Género',
    type: 'select',
    options: ['Mujer', 'Hombre', 'Niño', 'Unisex'],
  },
];

const accessoriesAttributes: AttributeSeed[] = [
  { key: 'brand', label: 'Marca', type: 'text' },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'material', label: 'Material', type: 'text' },
];

const electronicsAttributes: AttributeSeed[] = [
  { key: 'brand', label: 'Marca', type: 'text', required: true },
  { key: 'model', label: 'Modelo', type: 'text' },
  { key: 'warranty', label: 'Tiene garantía', type: 'boolean' },
  { key: 'accessories', label: 'Accesorios incluidos', type: 'text' },
];

const furnitureAttributes: AttributeSeed[] = [
  { key: 'material', label: 'Material', type: 'text' },
  { key: 'dimensions', label: 'Medidas', type: 'text' },
  { key: 'color', label: 'Color', type: 'text' },
];

const toolAttributes: AttributeSeed[] = [
  { key: 'brand', label: 'Marca', type: 'text' },
  { key: 'power', label: 'Potencia o tipo', type: 'text' },
  { key: 'accessories', label: 'Accesorios incluidos', type: 'text' },
];

const vehicleAttributes: AttributeSeed[] = [
  { key: 'brand', label: 'Marca', type: 'text', required: true },
  { key: 'model', label: 'Modelo', type: 'text', required: true },
  { key: 'year', label: 'Año', type: 'number' },
  { key: 'compatibility', label: 'Compatibilidad', type: 'text' },
  { key: 'part_number', label: 'Número de parte', type: 'text' },
];

const sportsAttributes: AttributeSeed[] = [
  { key: 'type', label: 'Tipo', type: 'text' },
  { key: 'size', label: 'Talle', type: 'text' },
  { key: 'brand', label: 'Marca', type: 'text' },
];

const kidsAttributes: AttributeSeed[] = [
  { key: 'recommended_age', label: 'Edad recomendada', type: 'text' },
  { key: 'brand', label: 'Marca', type: 'text' },
  { key: 'language', label: 'Idioma', type: 'text' },
];

const collectibleAttributes: AttributeSeed[] = [
  { key: 'era', label: 'Época', type: 'text' },
  { key: 'origin', label: 'Origen', type: 'text' },
  { key: 'authenticity', label: 'Autenticidad declarada', type: 'boolean' },
];

const categories: CategorySeed[] = [
  {
    name: 'Ropa, calzado y accesorios',
    slug: 'moda',
    subcategories: [
      { name: 'Mujer', slug: 'moda-mujer', attributes: clothingAttributes },
      { name: 'Hombre', slug: 'moda-hombre', attributes: clothingAttributes },
      { name: 'Niños', slug: 'moda-ninos', attributes: clothingAttributes },
      { name: 'Unisex', slug: 'moda-unisex', attributes: clothingAttributes },
      {
        name: 'Calzado',
        slug: 'moda-calzado',
        attributes: [
          { key: 'size', label: 'Talle', type: 'text', required: true },
          { key: 'brand', label: 'Marca', type: 'text' },
          { key: 'color', label: 'Color', type: 'text' },
          { key: 'material', label: 'Material', type: 'text' },
        ],
      },
      { name: 'Accesorios', slug: 'moda-accesorios', attributes: accessoriesAttributes },
    ],
  },
  {
    name: 'Electrodomésticos y electrónica',
    slug: 'electronica',
    subcategories: [
      {
        name: 'Celulares y tablets',
        slug: 'electronica-celulares',
        attributes: electronicsAttributes,
      },
      {
        name: 'Computación',
        slug: 'electronica-computacion',
        attributes: electronicsAttributes,
      },
      { name: 'Audio y video', slug: 'electronica-audio', attributes: electronicsAttributes },
      { name: 'TV', slug: 'electronica-tv', attributes: electronicsAttributes },
      {
        name: 'Línea blanca',
        slug: 'electronica-linea-blanca',
        attributes: electronicsAttributes,
      },
      {
        name: 'Pequeños electrodomésticos',
        slug: 'electronica-pequenos',
        attributes: electronicsAttributes,
      },
    ],
  },
  {
    name: 'Muebles y decoración',
    slug: 'muebles',
    subcategories: [
      { name: 'Muebles', slug: 'muebles-muebles', attributes: furnitureAttributes },
      { name: 'Iluminación', slug: 'muebles-iluminacion', attributes: furnitureAttributes },
      { name: 'Decoración', slug: 'muebles-decoracion', attributes: furnitureAttributes },
      { name: 'Textiles', slug: 'muebles-textiles', attributes: furnitureAttributes },
    ],
  },
  {
    name: 'Herramientas y artículos de trabajo',
    slug: 'herramientas',
    subcategories: [
      { name: 'Manuales', slug: 'herramientas-manuales', attributes: toolAttributes },
      { name: 'Eléctricas', slug: 'herramientas-electricas', attributes: toolAttributes },
      { name: 'Jardín', slug: 'herramientas-jardin', attributes: toolAttributes },
      {
        name: 'Seguridad e indumentaria',
        slug: 'herramientas-seguridad',
        attributes: toolAttributes,
      },
    ],
  },
  {
    name: 'Repuestos y accesorios para autos y motos',
    slug: 'autos-motos',
    subcategories: [
      { name: 'Autos', slug: 'autos-motos-autos', attributes: vehicleAttributes },
      { name: 'Motos', slug: 'autos-motos-motos', attributes: vehicleAttributes },
      {
        name: 'Accesorios y repuestos',
        slug: 'autos-motos-accesorios',
        attributes: vehicleAttributes,
      },
    ],
  },
  {
    name: 'Bicicletas y artículos deportivos',
    slug: 'deportes',
    subcategories: [
      { name: 'Bicicletas', slug: 'deportes-bicicletas', attributes: sportsAttributes },
      { name: 'Fitness', slug: 'deportes-fitness', attributes: sportsAttributes },
      { name: 'Camping', slug: 'deportes-camping', attributes: sportsAttributes },
      { name: 'Fútbol', slug: 'deportes-futbol', attributes: sportsAttributes },
      { name: 'Otros deportes', slug: 'deportes-otros', attributes: sportsAttributes },
    ],
  },
  {
    name: 'Juguetes, libros y artículos infantiles',
    slug: 'infantil',
    subcategories: [
      { name: 'Juguetes', slug: 'infantil-juguetes', attributes: kidsAttributes },
      { name: 'Libros y revistas', slug: 'infantil-libros', attributes: kidsAttributes },
      { name: 'Artículos infantiles', slug: 'infantil-articulos', attributes: kidsAttributes },
      {
        name: 'Cochecitos y sillas',
        slug: 'infantil-cochecitos',
        attributes: kidsAttributes,
      },
    ],
  },
  {
    name: 'Coleccionables y antigüedades',
    slug: 'coleccionables',
    subcategories: [
      {
        name: 'Coleccionables',
        slug: 'coleccionables-coleccionables',
        attributes: collectibleAttributes,
      },
      {
        name: 'Antigüedades',
        slug: 'coleccionables-antiguedades',
        attributes: collectibleAttributes,
      },
      {
        name: 'Arte vintage',
        slug: 'coleccionables-arte-vintage',
        attributes: collectibleAttributes,
      },
    ],
  },
];

export async function seedCategories(): Promise<void> {
  for (const [categoryIndex, category] of categories.entries()) {
    const [parent] = await Category.findOrCreate({
      where: { slug: category.slug },
      defaults: {
        name: category.name,
        slug: category.slug,
        parentId: null,
        sortOrder: categoryIndex,
        isActive: true,
      },
    });

    await parent.update({
      name: category.name,
      parentId: null,
      sortOrder: categoryIndex,
      isActive: true,
    });

    for (const [subIndex, subcategory] of category.subcategories.entries()) {
      const [child] = await Category.findOrCreate({
        where: { slug: subcategory.slug },
        defaults: {
          name: subcategory.name,
          slug: subcategory.slug,
          parentId: parent.id,
          sortOrder: subIndex,
          isActive: true,
        },
      });

      await child.update({
        name: subcategory.name,
        parentId: parent.id,
        sortOrder: subIndex,
        isActive: true,
      });

      for (const [attributeIndex, attribute] of subcategory.attributes.entries()) {
        const [record] = await CategoryAttribute.findOrCreate({
          where: { categoryId: child.id, key: attribute.key },
          defaults: {
            categoryId: child.id,
            key: attribute.key,
            label: attribute.label,
            type: attribute.type,
            required: attribute.required ?? false,
            options: attribute.options ?? null,
            sortOrder: attributeIndex,
          },
        });

        await record.update({
          label: attribute.label,
          type: attribute.type,
          required: attribute.required ?? false,
          options: attribute.options ?? null,
          sortOrder: attributeIndex,
        });
      }
    }
  }
}

async function runCli(): Promise<void> {
  try {
    await sequelize.authenticate();
    await seedCategories();
    logger.info('Taxonomía de categorías sembrada');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Falló el seed de categorías', {
      error: error instanceof Error ? error.message : String(error),
    });
    await sequelize.close().catch(() => undefined);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('categories.ts') || process.argv[1]?.endsWith('categories.js')) {
  void runCli();
}
