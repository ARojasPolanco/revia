import { Op } from 'sequelize';
import { AppError } from '../../errors/appError.js';
import { User } from './user.model.js';
import { UserBlock } from './userBlock.model.js';
import { UserReport } from './userReport.model.js';

async function assertTargetExists(targetId: string): Promise<void> {
  const target = await User.findByPk(targetId);

  if (!target || target.isDeleted) {
    throw new AppError('No encontramos ese usuario.', 404);
  }
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) {
    throw new AppError('No podés bloquearte a vos mismo.', 400);
  }

  await assertTargetExists(blockedId);

  await UserBlock.findOrCreate({
    where: { blockerId, blockedId },
  });
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await UserBlock.destroy({ where: { blockerId, blockedId } });
}

export async function isBlockedEither(leftId: string, rightId: string): Promise<boolean> {
  const count = await UserBlock.count({
    where: {
      [Op.or]: [
        { blockerId: leftId, blockedId: rightId },
        { blockerId: rightId, blockedId: leftId },
      ],
    },
  });

  return count > 0;
}

export async function reportUser(
  reporterId: string,
  reportedId: string,
  reason: string
): Promise<void> {
  if (reporterId === reportedId) {
    throw new AppError('No podés denunciarte a vos mismo.', 400);
  }

  await assertTargetExists(reportedId);

  const existing = await UserReport.findOne({
    where: { reporterId, reportedId, status: 'open' },
  });

  if (existing) {
    throw new AppError('Ya denunciaste a este usuario.', 409);
  }

  await UserReport.create({
    reporterId,
    reportedId,
    reason,
  });
}
