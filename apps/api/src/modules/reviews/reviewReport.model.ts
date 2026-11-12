import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class ReviewReport extends Model<
  InferAttributes<ReviewReport>,
  InferCreationAttributes<ReviewReport>
> {
  declare id: CreationOptional<string>;
  declare reviewId: string;
  declare reporterId: string;
  declare reason: string;
  declare status: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ReviewReport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'report_id',
    },
    reviewId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reporterId: {
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
    tableName: 'review_reports',
    underscored: true,
    timestamps: true,
  }
);
