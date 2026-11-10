import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Payout extends Model<InferAttributes<Payout>, InferCreationAttributes<Payout>> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare sellerId: string;
  declare payoutAccountId: CreationOptional<string | null>;
  declare amountArs: number;
  declare status: CreationOptional<string>;
  declare blockReason: CreationOptional<string | null>;
  declare operationId: CreationOptional<string | null>;
  declare receiptUrl: CreationOptional<string | null>;
  declare processedBy: CreationOptional<string | null>;
  declare paidAt: CreationOptional<Date | null>;
  declare failedAt: CreationOptional<Date | null>;
  declare failureReason: CreationOptional<string | null>;
  declare slaDueAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Payout.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'payout_id',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    payoutAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
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
    blockReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    operationId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    receiptUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    slaDueAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'payouts',
    underscored: true,
    timestamps: true,
  }
);
