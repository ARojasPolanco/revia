import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<string>;
  declare buyerId: string;
  declare sellerId: string;
  declare listingId: string;
  declare offerId: CreationOptional<string | null>;
  declare couponId: CreationOptional<string | null>;
  declare couponAmountArs: CreationOptional<number>;
  declare deliveryMode: string;
  declare status: CreationOptional<string>;
  declare itemPriceArs: number;
  declare midpointFeeArs: CreationOptional<number>;
  declare tasaPercent: number;
  declare tasaFixedArs: number;
  declare tasaAmountArs: number;
  declare totalAmountArs: number;
  declare sellerPayoutArs: number;
  declare listingTitleSnapshot: string;
  declare listingPhotoUrlSnapshot: CreationOptional<string | null>;
  declare paidAt: CreationOptional<Date | null>;
  declare deliveredAt: CreationOptional<Date | null>;
  declare completedAt: CreationOptional<Date | null>;
  declare cancelledAt: CreationOptional<Date | null>;
  declare claimWindowEndsAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'order_id',
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    listingId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    offerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    couponId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    couponAmountArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    deliveryMode: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'pending_payment',
    },
    itemPriceArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    midpointFeeArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tasaPercent: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tasaFixedArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tasaAmountArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    totalAmountArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sellerPayoutArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    listingTitleSnapshot: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    listingPhotoUrlSnapshot: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    claimWindowEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'orders',
    underscored: true,
    timestamps: true,
  }
);
