import { Router } from 'express';
import { z } from 'zod';
import {
  createListingSchema,
  rejectListingSchema,
  reportListingSchema,
  updateListingSchema,
} from '@revia/shared';
import {
  protect,
  requireKycApproved,
  requireOnboardingCompleted,
  requireVerifiedEmail,
  restrictTo,
} from '../../middlewares/auth.js';
import { listingPhotosUpload } from '../../middlewares/upload.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './listings.controller.js';

const resolveReportSchema = z
  .object({
    status: z.enum(['resolved', 'dismissed']),
  })
  .strict();

export const listingsRouter = Router();

listingsRouter.get('/', controller.listListings);
listingsRouter.get('/:id', controller.getPublicListing);

listingsRouter.post(
  '/',
  protect,
  requireVerifiedEmail,
  requireKycApproved,
  requireOnboardingCompleted,
  validateBody(createListingSchema),
  controller.createListing
);

listingsRouter.patch(
  '/:id',
  protect,
  requireVerifiedEmail,
  requireKycApproved,
  requireOnboardingCompleted,
  validateBody(updateListingSchema),
  controller.updateListing
);

listingsRouter.post(
  '/:id/photos',
  protect,
  requireVerifiedEmail,
  requireKycApproved,
  requireOnboardingCompleted,
  listingPhotosUpload.array('photos', 10),
  controller.uploadPhotos
);

listingsRouter.delete(
  '/:id/photos/:photoId',
  protect,
  requireVerifiedEmail,
  requireKycApproved,
  requireOnboardingCompleted,
  controller.deletePhoto
);

listingsRouter.post(
  '/:id/submit',
  protect,
  requireVerifiedEmail,
  requireKycApproved,
  requireOnboardingCompleted,
  controller.submitListing
);

listingsRouter.post('/:id/pause', protect, requireVerifiedEmail, controller.pauseListing);

listingsRouter.post('/:id/resume', protect, requireVerifiedEmail, controller.resumeListing);

listingsRouter.delete('/:id', protect, requireVerifiedEmail, controller.deleteListing);

listingsRouter.post(
  '/:id/report',
  protect,
  requireVerifiedEmail,
  validateBody(reportListingSchema),
  controller.reportListing
);

listingsRouter.get('/:id/favorite', protect, controller.getFavoriteStatus);
listingsRouter.post('/:id/favorite', protect, requireVerifiedEmail, controller.addFavorite);
listingsRouter.delete('/:id/favorite', protect, requireVerifiedEmail, controller.removeFavorite);

export const feedRouter = Router();

feedRouter.get('/', controller.getFeed);

export const meListingsRouter = Router();

meListingsRouter.get('/listings', protect, controller.getMyListings);
meListingsRouter.get('/listings/:id', protect, controller.getMyListing);
meListingsRouter.get('/favorites', protect, controller.getMyFavorites);
meListingsRouter.get('/feed', protect, controller.getFollowingFeed);

export const adminListingsRouter = Router();

adminListingsRouter.use(protect, restrictTo('admin', 'moderator'));

adminListingsRouter.get('/', controller.adminListListings);
adminListingsRouter.post('/:id/approve', controller.approveListing);
adminListingsRouter.post(
  '/:id/reject',
  validateBody(rejectListingSchema),
  controller.rejectListing
);

export const adminReportsRouter = Router();

adminReportsRouter.use(protect, restrictTo('admin', 'moderator'));

adminReportsRouter.get('/', controller.adminListReports);
adminReportsRouter.post(
  '/:id/resolve',
  validateBody(resolveReportSchema),
  controller.resolveReport
);
