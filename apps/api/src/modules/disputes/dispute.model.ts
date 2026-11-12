import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Dispute extends Model<InferAttributes<Dispute>, InferCreationAttributes<Dispute>> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare buyerId: string;
  declare sellerId: string;
  declare reason: string;
  declare description: string;
  declare status: CreationOptional<string>;
  declare resolutionNotes: CreationOptional<string | null>;
  declare resolvedBy: CreationOptional<string | null>;
  declare resolvedAt: CreationOptional<Date | null>;
  declare slaDueAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Dispute.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'dispute_id',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'open',
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
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
    tableName: 'disputes',
    underscored: true,
    timestamps: true,
  }
);
