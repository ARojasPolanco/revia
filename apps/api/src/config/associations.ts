import { Category } from '../modules/categories/category.model.js';
import { CategoryAttribute } from '../modules/categories/categoryAttribute.model.js';
import { Listing } from '../modules/listings/listing.model.js';
import { ListingPhoto } from '../modules/listings/listingPhoto.model.js';
import { ListingReport } from '../modules/listings/listingReport.model.js';
import { User } from '../modules/users/user.model.js';

let initialized = false;

export function setupAssociations(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  User.hasMany(Listing, { foreignKey: 'sellerId', as: 'listings' });
  Listing.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

  Category.hasMany(Listing, { foreignKey: 'categoryId', as: 'listings' });
  Listing.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

  Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
  Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });

  Category.hasMany(CategoryAttribute, { foreignKey: 'categoryId', as: 'attributes' });
  CategoryAttribute.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

  Listing.hasMany(ListingPhoto, { foreignKey: 'listingId', as: 'photos' });
  ListingPhoto.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });

  Listing.hasMany(ListingReport, { foreignKey: 'listingId', as: 'reports' });
  ListingReport.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
  ListingReport.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
}

setupAssociations();
