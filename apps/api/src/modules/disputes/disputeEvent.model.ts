import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class DisputeEvent extends Model<
  InferAttributes<DisputeEvent>,
  InferCreationAttributes<DisputeEvent>
> {
  declare id: CreationOptional<string>;
  declare disputeId: string;
  declare type: string;
  declare actorId: CreationOptional<string | null>;
  declare message: CreationOptional<string | null>;
  declare data: CreationOptional<Record<string, unknown>>;
  declare createdAt: CreationOptional<Date>;
}

DisputeEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'event_id',
    },
    disputeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'dispute_events',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);
