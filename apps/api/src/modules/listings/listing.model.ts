import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Listing extends Model<InferAttributes<Listing>, InferCreationAttributes<Listing>> {
  declare id: CreationOptional<string>;
  declare sellerId: string;
  declare categoryId: string;
  declare title: string;
  declare description: string;
  declare condition: string;
  declare priceArs: number;
  declare deliveryModes: CreationOptional<string[]>;
  declare midpointFeeArs: CreationOptional<number>;
  declare allowOffers: CreationOptional<boolean>;
  declare location: string;
  declare attributes: CreationOptional<Record<string, unknown>>;
  declare status: CreationOptional<string>;
  declare rejectionReason: CreationOptional<string | null>;
  declare submittedAt: CreationOptional<Date | null>;
  declare publishedAt: CreationOptional<Date | null>;
  declare reviewedBy: CreationOptional<string | null>;
  declare reviewedAt: CreationOptional<Date | null>;
  declare isDeleted: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Listing.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'listing_id',
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    condition: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    priceArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    deliveryModes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    midpointFeeArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    allowOffers: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    location: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    attributes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'draft',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'listings',
    underscored: true,
    timestamps: true,
  }
);
