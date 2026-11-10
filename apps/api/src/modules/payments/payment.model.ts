import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Payment extends Model<InferAttributes<Payment>, InferCreationAttributes<Payment>> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare provider: CreationOptional<string>;
  declare providerPaymentId: string;
  declare externalId: string;
  declare status: CreationOptional<string>;
  declare amountArs: number;
  declare currency: CreationOptional<string>;
  declare cvu: CreationOptional<string | null>;
  declare alias: CreationOptional<string | null>;
  declare paymentUrl: CreationOptional<string | null>;
  declare expiresAt: CreationOptional<Date | null>;
  declare paidAt: CreationOptional<Date | null>;
  declare metadata: CreationOptional<Record<string, unknown>>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'payment_id',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    provider: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'talo',
    },
    providerPaymentId: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    externalId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDING',
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
    cvu: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    alias: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    paymentUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'payments',
    underscored: true,
    timestamps: true,
  }
);
