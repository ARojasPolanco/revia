import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Follow extends Model<InferAttributes<Follow>, InferCreationAttributes<Follow>> {
  declare id: CreationOptional<string>;
  declare followerId: string;
  declare followedId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Follow.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'follow_id',
    },
    followerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    followedId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'follows',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['follower_id', 'followed_id'],
      },
    ],
  }
);
