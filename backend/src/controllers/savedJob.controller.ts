import { Response, NextFunction } from 'express';
import { SavedJob, Job, Application } from '../models';
import { AuthenticatedRequest } from '../types';
import { getIO } from '../config/socket';

export const toggleSaveJob = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profileId = req.user?.id;
    const { jobId } = req.params;

    if (!profileId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const job = await Job.findById(jobId);
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    const io = getIO();
    const existing = await SavedJob.findOne({ jobId, profileId });
    if (existing) {
      await existing.deleteOne();
      if (io) io.to(profileId).emit('saved_jobs_updated', { jobId, saved: false });
      res.status(200).json({
        success: true,
        saved: false,
        message: 'Job removed from saved jobs.',
      });
      return;
    }

    await SavedJob.create({ jobId, profileId });
    if (io) io.to(profileId).emit('saved_jobs_updated', { jobId, saved: true });
    res.status(201).json({
      success: true,
      saved: true,
      message: 'Job saved successfully!',
    });
  } catch (error) {
    next(error);
  }
};

export const getSavedJobs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profileId = req.user?.id;
    if (!profileId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 12);
    const skip = (page - 1) * limit;

    const [savedRecords, totalCount, appDocs] = await Promise.all([
      SavedJob.find({ profileId })
        .populate({
          path: 'jobId',
          populate: { path: 'companyId', select: 'companyName logoUrl location industry' },
        })
        .sort({ savedAt: -1 })
        .skip(skip)
        .limit(limit),
      SavedJob.countDocuments({ profileId }),
      Application.find({ applicantId: profileId }).select('jobId'),
    ]);

    const appliedJobIdSet = new Set(appDocs.map((a) => a.jobId.toString()));

    const validSavedJobs = savedRecords
      .filter((r) => r.jobId !== null)
      .map((r) => {
        const jobObj = (r.jobId as any).toObject ? (r.jobId as any).toObject() : r.jobId;
        return {
          ...jobObj,
          isSaved: true,
          hasApplied: appliedJobIdSet.has(jobObj._id.toString()),
        };
      });

    res.status(200).json({
      success: true,
      data: validSavedJobs,
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

export const deleteSavedJob = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profileId = req.user?.id;
    const { jobId } = req.params;

    await SavedJob.deleteOne({ jobId, profileId });

    const io = getIO();
    if (io && profileId) {
      io.to(profileId).emit('saved_jobs_updated', { jobId, saved: false });
    }

    res.status(200).json({
      success: true,
      message: 'Job removed from saved jobs.',
    });
  } catch (error) {
    next(error);
  }
};
