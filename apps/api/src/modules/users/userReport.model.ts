import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class UserReport extends Model<
  InferAttributes<UserReport>,
  InferCreationAttributes<UserReport>
> {
  declare id: CreationOptional<string>;
  declare reporterId: string;
  declare reportedId: string;
  declare reason: string;
  declare status: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

UserReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'report_id',
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reportedId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'open',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'user_reports',
    underscored: true,
    timestamps: true,
  }
);
