import { Category } from './category.model.js';
import { CategoryAttribute } from './categoryAttribute.model.js';

export interface CategoryAttributeView {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: unknown;
}

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  attributes: CategoryAttributeView[];
  children?: CategoryView[];
}

function toAttributeView(attribute: CategoryAttribute): CategoryAttributeView {
  return {
    id: attribute.id,
    key: attribute.key,
    label: attribute.label,
    type: attribute.type,
    required: attribute.required,
    options: attribute.options,
  };
}

export async function getCategoryTree(): Promise<CategoryView[]> {
  const [categories, attributes] = await Promise.all([
    Category.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC']],
    }),
    CategoryAttribute.findAll({
      order: [['sortOrder', 'ASC']],
    }),
  ]);

  const attributesByCategory = new Map<string, CategoryAttributeView[]>();

  for (const attribute of attributes) {
    const list = attributesByCategory.get(attribute.categoryId) ?? [];
    list.push(toAttributeView(attribute));
    attributesByCategory.set(attribute.categoryId, list);
  }

  const roots = categories.filter((category) => !category.parentId);

  return roots.map((root) => ({
    id: root.id,
    name: root.name,
    slug: root.slug,
    attributes: attributesByCategory.get(root.id) ?? [],
    children: categories
      .filter((category) => category.parentId === root.id)
      .map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        attributes: attributesByCategory.get(child.id) ?? [],
      })),
  }));
}
