import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Offer extends Model<InferAttributes<Offer>, InferCreationAttributes<Offer>> {
  declare id: CreationOptional<string>;
  declare listingId: string;
  declare buyerId: string;
  declare sellerId: string;
  declare parentOfferId: CreationOptional<string | null>;
  declare direction: string;
  declare amountArs: number;
  declare status: CreationOptional<string>;
  declare expiresAt: Date;
  declare paymentExpiresAt: CreationOptional<Date | null>;
  declare acceptedAt: CreationOptional<Date | null>;
  declare rejectedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Offer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'offer_id',
    },
    listingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    parentOfferId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    direction: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    amountArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    paymentExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'offers',
    underscored: true,
    timestamps: true,
  }
);
