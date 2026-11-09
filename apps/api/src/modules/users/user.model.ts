import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare passwordHash: CreationOptional<string | null>;
  declare fullName: string;
  declare birthDate: CreationOptional<string | null>;
  declare role: CreationOptional<string>;
  declare emailVerified: CreationOptional<boolean>;
  declare emailVerifiedAt: CreationOptional<Date | null>;
  declare isSuspended: CreationOptional<boolean>;
  declare acceptedTermsAt: CreationOptional<Date | null>;
  declare onboardingCompleted: CreationOptional<boolean>;
  declare kycStatus: CreationOptional<string>;
  declare bio: CreationOptional<string | null>;
  declare location: CreationOptional<string | null>;
  declare avatarUrl: CreationOptional<string | null>;
  declare passwordChangedAt: CreationOptional<Date | null>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare isDeleted: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'user_id',
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    fullName: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'user',
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isSuspended: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    acceptedTermsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    onboardingCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    kycStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'not_started',
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
  }
);
