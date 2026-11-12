import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class DisputeEvidence extends Model<
  InferAttributes<DisputeEvidence>,
  InferCreationAttributes<DisputeEvidence>
> {
  declare id: CreationOptional<string>;
  declare disputeId: string;
  declare uploaderId: string;
  declare kind: string;
  declare url: CreationOptional<string | null>;
  declare body: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
}

DisputeEvidence.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'evidence_id',
    },
    disputeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    uploaderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    kind: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'dispute_evidence',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);
