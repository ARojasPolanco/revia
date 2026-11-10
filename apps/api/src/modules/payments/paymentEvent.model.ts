import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PaymentEvent extends Model<
  InferAttributes<PaymentEvent>,
  InferCreationAttributes<PaymentEvent>
> {
  declare id: CreationOptional<string>;
  declare paymentId: CreationOptional<string | null>;
  declare providerPaymentId: string;
  declare eventKey: string;
  declare eventType: string;
  declare payload: CreationOptional<Record<string, unknown>>;
  declare processedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
}

PaymentEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'event_id',
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    providerPaymentId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    eventKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    eventType: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'payment_events',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);
