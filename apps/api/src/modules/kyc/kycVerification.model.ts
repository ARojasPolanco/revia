import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class KycVerification extends Model<
  InferAttributes<KycVerification>,
  InferCreationAttributes<KycVerification>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare provider: CreationOptional<string>;
  declare providerSessionId: CreationOptional<string | null>;
  declare status: CreationOptional<string>;
  declare providerStatus: CreationOptional<string | null>;
  declare reason: CreationOptional<string | null>;
  declare lastEventId: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

KycVerification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'kyc_verification_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'didit',
    },
    providerSessionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    },
    providerStatus: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastEventId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'kyc_verifications',
    underscored: true,
    timestamps: true,
  }
);
