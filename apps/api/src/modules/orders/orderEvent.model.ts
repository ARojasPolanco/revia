import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class OrderEvent extends Model<
  InferAttributes<OrderEvent>,
  InferCreationAttributes<OrderEvent>
> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare type: string;
  declare actorId: CreationOptional<string | null>;
  declare data: CreationOptional<Record<string, unknown>>;
  declare createdAt: CreationOptional<Date>;
}

OrderEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'event_id',
    },
    orderId: {
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
    tableName: 'order_events',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);
