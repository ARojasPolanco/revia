import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class DeliveryCode extends Model<
  InferAttributes<DeliveryCode>,
  InferCreationAttributes<DeliveryCode>
> {
  declare id: CreationOptional<string>;
  declare orderId: string;
  declare codeHash: string;
  declare codeEncrypted: string;
  declare usedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

DeliveryCode.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'code_id',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    codeHash: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    codeEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'delivery_codes',
    underscored: true,
    timestamps: true,
  }
);
