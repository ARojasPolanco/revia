import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../../config/database.js';

export class CouponRedemption extends Model<
  InferAttributes<CouponRedemption>,
  InferCreationAttributes<CouponRedemption>
> {
  declare id: CreationOptional<string>;
  declare couponId: string;
  declare orderId: string;
  declare userId: string;
  declare amountArs: number;
  declare createdAt: CreationOptional<Date>;
}

CouponRedemption.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'redemption_id',
    },
    couponId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amountArs: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'coupon_redemptions',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);
