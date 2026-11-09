import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PayoutAccount extends Model<
  InferAttributes<PayoutAccount>,
  InferCreationAttributes<PayoutAccount>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare method: string;
  declare accountEncrypted: string;
  declare holderName: string;
  declare holderMatchesKyc: CreationOptional<boolean>;
  declare status: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PayoutAccount.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'payout_account_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    accountEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    holderName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    holderMatchesKyc: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending_review',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'payout_accounts',
    underscored: true,
    timestamps: true,
  }
);
