import { Response, NextFunction } from 'express';
import { Company, Job, Application, CompanyReview } from '../models';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';
import { createNotification } from '../services/notification.service';
import { getIO } from '../config/socket';

export const canReviewCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      res.status(200).json({
        success: true,
        eligible: false,
        reason: 'Must be logged in as a candidate to write a review.',
      });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company profile not found.',
      });
      return;
    }

    // 1. Check if user already reviewed this company (even if hidden by employer)
    const existingReview = await CompanyReview.findOne({ companyId: company._id, reviewerId });
    if (existingReview) {
      res.status(200).json({
        success: true,
        eligible: false,
        alreadyReviewed: true,
        hasReviewed: true,
        existingReview: {
          _id: existingReview._id,
          rating: existingReview.rating,
          title: existingReview.title,
          reviewText: existingReview.reviewText,
          relationship: existingReview.relationship,
          createdAt: existingReview.createdAt,
        },
        reason: 'You have already submitted a review for this company.',
      });
      return;
    }

    // 2. Find all jobs posted by this company
    const companyJobs = await Job.find({ companyId: company._id }).select('_id');
    const jobIds = companyJobs.map((j) => j._id);

    // 3. Find any application linking candidate to this company with status beyond applied/under_review
    const eligibleApplication = await Application.findOne({
      applicantId: reviewerId,
      jobId: { $in: jobIds },
      status: { $in: ['shortlisted', 'interview', 'rejected', 'hired'] },
    });

    logger.info(
      `[CAN-REVIEW CHECK] User: ${reviewerId}, Company: ${companyId}, Jobs Count: ${jobIds.length}, Application Found: ${
        eligibleApplication ? eligibleApplication._id : 'NONE'
      }, Status: ${eligibleApplication?.status || 'N/A'}`
    );

    if (eligibleApplication) {
      res.status(200).json({
        success: true,
        eligible: true,
        applicationStatus: eligibleApplication.status,
      });
    } else {
      res.status(200).json({
        success: true,
        eligible: false,
        reason: 'To write a review, your job application status at this company must reach Interview, Shortlisted, Hired, or Decision Made.',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const createCompanyReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const reviewerId = req.user?.id;
    const { rating, title, reviewText, relationship } = req.body;

    if (!reviewerId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!rating || !title || !reviewText) {
      res.status(400).json({
        success: false,
        message: 'Rating, title, and review text are required.',
      });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found.' });
      return;
    }

    // Check if user has an existing review -> UPDATE if found
    let review = await CompanyReview.findOne({ companyId: company._id, reviewerId });

    if (review) {
      review.rating = Math.min(5, Math.max(1, Number(rating)));
      review.title = title.trim();
      review.reviewText = reviewText.trim();
      review.relationship = relationship || 'Interviewed';
      await review.save();

      // Notify employer about updated review
      if (company.ownerId && company.ownerId.toString() !== reviewerId) {
        try {
          await createNotification(
            company.ownerId,
            'new_company_review',
            `Updated Company Review (${review.rating} ★)`,
            `A candidate updated their ${review.rating}-star review for ${company.companyName}: "${review.title}"`,
            'company',
            company._id.toString()
          );

          const io = getIO();
          if (io) {
            io.to(company.ownerId.toString()).emit('new_company_review', {
              companyId: company._id.toString(),
              rating: review.rating,
              title: review.title,
            });
          }
        } catch (notifErr: any) {
          logger.error(`[COMPANY REVIEW NOTIFICATION ERROR]: ${notifErr?.message || notifErr}`);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Your company review has been updated successfully.',
        data: review,
        updated: true,
      });
      return;
    }

    // Otherwise, check application eligibility for creating a new review
    const companyJobs = await Job.find({ companyId: company._id }).select('_id');
    const jobIds = companyJobs.map((j) => j._id);

    const eligibleApp = await Application.findOne({
      applicantId: reviewerId,
      jobId: { $in: jobIds },
      status: { $in: ['shortlisted', 'interview', 'rejected', 'hired'] },
    });

    if (!eligibleApp) {
      res.status(403).json({
        success: false,
        message: 'You must have an application status of Interview, Shortlisted, Hired, or Decision Made to review this company.',
      });
      return;
    }

    review = await CompanyReview.create({
      companyId: company._id,
      reviewerId,
      rating: Math.min(5, Math.max(1, Number(rating))),
      title: title.trim(),
      reviewText: reviewText.trim(),
      relationship: relationship || 'Interviewed',
      isHiddenByEmployer: false,
    });

    // Notify employer about new review
    if (company.ownerId && company.ownerId.toString() !== reviewerId) {
      try {
        await createNotification(
          company.ownerId,
          'new_company_review',
          `New Review Received (${review.rating} ★)`,
          `A candidate left a ${review.rating}-star review for ${company.companyName}: "${review.title}"`,
          'company',
          company._id.toString()
        );

        const io = getIO();
        if (io) {
          io.to(company.ownerId.toString()).emit('new_company_review', {
            companyId: company._id.toString(),
            rating: review.rating,
            title: review.title,
          });
        }
      } catch (notifErr: any) {
        logger.error(`[COMPANY REVIEW NOTIFICATION ERROR]: ${notifErr?.message || notifErr}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Thank you! Your company review has been published.',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMyCompanyReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found.' });
      return;
    }

    const review = await CompanyReview.findOne({ companyId: company._id, reviewerId });
    if (!review) {
      res.status(404).json({ success: false, message: 'You have not submitted a review for this company.' });
      return;
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Your company review has been deleted.',
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyReviews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { companyId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const company = await Company.findById(companyId);
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found.' });
      return;
    }

    const filter = { companyId: company._id, isHiddenByEmployer: { $ne: true } };

    const [reviews, totalCount] = await Promise.all([
      CompanyReview.find(filter)
        .populate('reviewerId', 'fullName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CompanyReview.countDocuments(filter),
    ]);

    // Calculate rating metrics for public reviews ONLY
    const publicReviews = await CompanyReview.find(filter).select('rating');
    const totalRatingSum = publicReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = publicReviews.length > 0 ? Number((totalRatingSum / publicReviews.length).toFixed(1)) : 0;

    const ratingBreakdown = {
      5: publicReviews.filter((r) => r.rating === 5).length,
      4: publicReviews.filter((r) => r.rating === 4).length,
      3: publicReviews.filter((r) => r.rating === 3).length,
      2: publicReviews.filter((r) => r.rating === 2).length,
      1: publicReviews.filter((r) => r.rating === 1).length,
    };

    res.status(200).json({
      success: true,
      data: reviews,
      stats: {
        totalReviews: totalCount,
        averageRating,
        ratingBreakdown,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCompanyReviews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const employerId = req.user?.id;
    if (!employerId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const company = await Company.findOne({ ownerId: employerId });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found for this employer.' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 20);
    const skip = (page - 1) * limit;

    const [reviews, totalCount] = await Promise.all([
      CompanyReview.find({ companyId: company._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CompanyReview.countDocuments({ companyId: company._id }),
    ]);

    const formattedReviews = reviews.map((r) => ({
      _id: r._id,
      companyId: r.companyId,
      reviewerLabel: 'Verified Applicant',
      rating: r.rating,
      title: r.title,
      reviewText: r.reviewText,
      relationship: r.relationship,
      isHiddenByEmployer: !!r.isHiddenByEmployer,
      createdAt: r.createdAt,
    }));

    const allReviews = await CompanyReview.find({ companyId: company._id }).select('rating isHiddenByEmployer');
    const publicReviews = allReviews.filter((r) => !r.isHiddenByEmployer);

    const totalRatingSum = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = allReviews.length > 0 ? Number((totalRatingSum / allReviews.length).toFixed(1)) : 0;

    const publicRatingSum = publicReviews.reduce((sum, r) => sum + r.rating, 0);
    const publicAverageRating = publicReviews.length > 0 ? Number((publicRatingSum / publicReviews.length).toFixed(1)) : 0;

    const ratingBreakdown = {
      5: allReviews.filter((r) => r.rating === 5).length,
      4: allReviews.filter((r) => r.rating === 4).length,
      3: allReviews.filter((r) => r.rating === 3).length,
      2: allReviews.filter((r) => r.rating === 2).length,
      1: allReviews.filter((r) => r.rating === 1).length,
    };

    res.status(200).json({
      success: true,
      companyName: company.companyName,
      data: formattedReviews,
      stats: {
        totalReviews: totalCount,
        averageRating,
        ratingBreakdown,
        publicAverageRating,
        publicTotalReviews: publicReviews.length,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const hideCompanyReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const employerId = req.user?.id;
    const { reviewId } = req.params;

    const company = await Company.findOne({ ownerId: employerId });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found.' });
      return;
    }

    const review = await CompanyReview.findOne({ _id: reviewId, companyId: company._id });
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found for your company.' });
      return;
    }

    review.isHiddenByEmployer = true;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review has been hidden from your public company profile.',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const unhideCompanyReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const employerId = req.user?.id;
    const { reviewId } = req.params;

    const company = await Company.findOne({ ownerId: employerId });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found.' });
      return;
    }

    const review = await CompanyReview.findOne({ _id: reviewId, companyId: company._id });
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found for your company.' });
      return;
    }

    review.isHiddenByEmployer = false;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review is now visible on your public company profile.',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCompanyReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const employerId = req.user?.id;
    const { reviewId } = req.params;

    const company = await Company.findOne({ ownerId: employerId });
    if (!company) {
      res.status(404).json({ success: false, message: 'Company profile not found.' });
      return;
    }

    const review = await CompanyReview.findOne({ _id: reviewId, companyId: company._id });
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found for your company.' });
      return;
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Review permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
};
