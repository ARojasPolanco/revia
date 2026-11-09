import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class AuthIdentity extends Model<
  InferAttributes<AuthIdentity>,
  InferCreationAttributes<AuthIdentity>
> {
  declare id: CreationOptional<string>;
  declare userId: string;
  declare provider: string;
  declare providerUserId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AuthIdentity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'identity_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    providerUserId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'auth_identities',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['provider', 'provider_user_id'],
      },
    ],
  }
);
