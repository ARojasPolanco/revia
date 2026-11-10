import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Refund extends Model<InferAttributes<Refund>, InferCreationAttributes<Refund>> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare paymentId: string;
  declare providerRefundId: CreationOptional<string | null>;
  declare refundType: string;
  declare amountArs: number;
  declare currency: CreationOptional<string>;
  declare status: CreationOptional<string>;
  declare reason: CreationOptional<string | null>;
  declare requestedBy: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Refund.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'refund_id',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    providerRefundId: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: true,
    },
    refundType: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    amountArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'ARS',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'refunds',
    underscored: true,
    timestamps: true,
  }
);
