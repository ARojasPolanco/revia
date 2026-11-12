import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Coupon extends Model<InferAttributes<Coupon>, InferCreationAttributes<Coupon>> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare code: string;
  declare amountArs: number;
  declare status: CreationOptional<string>;
  declare expiresAt: Date;
  declare usedAt: CreationOptional<Date | null>;
  declare usedOrderId: CreationOptional<string | null>;
  declare sourceDisputeId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Coupon.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'coupon_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    amountArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usedOrderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sourceDisputeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'coupons',
    underscored: true,
    timestamps: true,
  }
);
