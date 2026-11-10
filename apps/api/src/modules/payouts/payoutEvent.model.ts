import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PayoutEvent extends Model<
  InferAttributes<PayoutEvent>,
  InferCreationAttributes<PayoutEvent>
> {
  declare id: CreationOptional<string>;
  declare payoutId: string;
  declare type: string;
  declare actorId: CreationOptional<string | null>;
  declare data: CreationOptional<Record<string, unknown>>;
  declare createdAt: CreationOptional<Date>;
}

PayoutEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'event_id',
    },
    payoutId: {
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
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'payout_events',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);
