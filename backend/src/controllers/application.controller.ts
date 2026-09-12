import { Response, NextFunction } from 'express';
import { Application, Job, JobSeekerProfile, ChatThread, Message, Company } from '../models';
import { AuthenticatedRequest } from '../types';
import { uploadBufferToCloudinary } from '../utils/cloudinary.utils';
import { getIO } from '../config/socket';
import { createNotification } from '../services/notification.service';

export const applyToJob = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const applicantId = req.user?.id;
    const { jobId, coverLetter } = req.body;

    if (!jobId) {
      res.status(400).json({ success: false, message: 'jobId is required.' });
      return;
    }

    // Parse screeningAnswers from body (JSON string if multipart/form-data or array)
    let rawScreeningAnswers: any[] = [];
    if (req.body.screeningAnswers) {
      if (typeof req.body.screeningAnswers === 'string') {
        try {
          rawScreeningAnswers = JSON.parse(req.body.screeningAnswers);
        } catch {
          rawScreeningAnswers = [];
        }
      } else if (Array.isArray(req.body.screeningAnswers)) {
        rawScreeningAnswers = req.body.screeningAnswers;
      }
    }

    // Verify job exists and is active
    const job = await Job.findById(jobId).populate<{ companyId: { ownerId: string } }>('companyId');
    if (!job || job.status !== 'active') {
      res.status(400).json({ success: false, message: 'This job is no longer active for applications.' });
      return;
    }

    // Validate screening answers against job's screening questions
    const jobQuestions = job.screeningQuestions || [];
    const missingRequiredQuestions: string[] = [];
    const processedAnswers: Array<{
      questionId?: any;
      questionText: string;
      answerText: string;
      isDealBreakerMismatch?: boolean;
    }> = [];

    for (const q of jobQuestions) {
      const isRequired =
        q.isDealBreaker ||
        q.isRequired === true ||
        q.questionType === 'custom_open_ended';

      const givenAns = rawScreeningAnswers.find((ans: any) => {
        if (q._id && ans.questionId && String(ans.questionId) === String(q._id)) return true;
        if (
          ans.questionText &&
          q.questionText &&
          String(ans.questionText).trim().toLowerCase() === String(q.questionText).trim().toLowerCase()
        )
          return true;
        return false;
      });

      const answerText = givenAns?.answerText ? String(givenAns.answerText).trim() : '';

      if (isRequired && !answerText) {
        const qLabel = q.questionText || `${q.questionType.replace('_', ' ')} requirement`;
        missingRequiredQuestions.push(qLabel);
      }

      if (answerText) {
        let isDealBreakerMismatch = false;

        if (q.isDealBreaker) {
          if (q.questionType === 'experience' && q.experienceYears) {
            const yearsNum = parseFloat(answerText);
            if (!isNaN(yearsNum) && yearsNum < q.experienceYears) {
              isDealBreakerMismatch = true;
            }
          } else if (q.questionType === 'education' && q.educationLevel) {
            const levels = ['high_school', 'associate', 'bachelor', 'master', 'doctorate'];
            const reqIdx = levels.indexOf(q.educationLevel.toLowerCase());
            const ansIdx = levels.indexOf(answerText.toLowerCase());
            if (reqIdx !== -1 && ansIdx !== -1 && ansIdx < reqIdx) {
              isDealBreakerMismatch = true;
            }
          } else if (
            (q.questionType === 'commute' ||
              q.questionType === 'willingness_to_travel' ||
              q.questionType === 'location') &&
            q.isDealBreaker
          ) {
            const lowerAns = answerText.toLowerCase();
            if (lowerAns.startsWith('no') || lowerAns === 'false' || lowerAns === 'cannot relocate' || lowerAns === 'cannot commute') {
              isDealBreakerMismatch = true;
            }
          }
        }

        processedAnswers.push({
          questionId: q._id ? q._id : undefined,
          questionText:
            q.questionText ||
            (q.questionType
              ? `${q.questionType.replace('_', ' ')} screening question`
              : 'Screening Question'),
          answerText,
          isDealBreakerMismatch,
        });
      }
    }

    if (missingRequiredQuestions.length > 0) {
      res.status(400).json({
        success: false,
        message: `Please answer all required screening questions before submitting: ${missingRequiredQuestions.join(
          ', '
        )}`,
      });
      return;
    }

    // Check duplicate application
    const existingApp = await Application.findOne({ jobId, applicantId });
    if (existingApp) {
      res.status(400).json({
        success: false,
        message: 'You have already applied to this job position.',
      });
      return;
    }

    // Resolve resume URL: from uploaded file OR existing job_seeker_profile resumeUrl
    let resumeUrl: string | undefined;
    let resumeOriginalFileName: string | undefined;

    if (req.file) {
      resumeUrl = await uploadBufferToCloudinary(
        req.file.buffer,
        'hirely/resumes',
        req.file.originalname
      );
      resumeOriginalFileName = req.file.originalname;
    } else {
      const seekerProfile = await JobSeekerProfile.findOne({ userId: applicantId });
      resumeUrl = seekerProfile?.resumeUrl || undefined;
      resumeOriginalFileName = seekerProfile?.resumeOriginalFileName || undefined;
    }

    if (job.requireResume !== false && !resumeUrl) {
      res.status(400).json({
        success: false,
        message: 'Please upload a resume file or save a default resume in your profile first.',
      });
      return;
    }

    // Create Application
    const application = await Application.create({
      jobId,
      applicantId,
      resumeUrl,
      resumeOriginalFileName,
      coverLetter,
      screeningAnswers: processedAnswers,
      status: 'applied',
    });

    // Automatically create ChatThread & initial system message
    const employerOwnerId = (job.companyId as unknown as { ownerId: string }).ownerId;
    const chatThread = await ChatThread.create({
      applicationId: application._id,
      jobSeekerId: applicantId,
      employerId: employerOwnerId,
    });

    await Message.create({
      threadId: chatThread._id,
      messageText: `🎉 Application submitted for "${job.title}". Thank you for applying!`,
      isSystemMessage: true,
    });

    // Emit Socket.io event & create persisted notification for employer owner
    if (employerOwnerId) {
      await createNotification(
        employerOwnerId.toString(),
        'new_application',
        'New Applicant Received',
        `A candidate submitted an application for "${job.title}".`,
        'application',
        application._id.toString()
      );
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyApplications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const applicantId = req.user?.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const [applications, totalCount] = await Promise.all([
      Application.find({ applicantId })
        .populate({
          path: 'jobId',
          select: 'title category location jobType status salaryMin salaryMax salaryDisclosed companyId',
          populate: {
            path: 'companyId',
            select: 'companyName logoUrl industry',
          },
        })
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments({ applicantId }),
    ]);

    res.status(200).json({
      success: true,
      data: applications,
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

export const getJobApplicants = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { id: jobId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const company = await Company.findOne({ ownerId });
    if (!company) {
      res.status(403).json({ success: false, message: 'Forbidden.' });
      return;
    }

    const job = await Job.findOne({ _id: jobId, companyId: company._id });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found or access denied.' });
      return;
    }

    const [applications, totalCount] = await Promise.all([
      Application.find({ jobId })
        .populate('applicantId', 'fullName email phone location avatarUrl')
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments({ jobId }),
    ]);

    res.status(200).json({
      success: true,
      jobTitle: job.title,
      data: applications,
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

export const updateApplicationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { id: applicationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['applied', 'under_review', 'shortlisted', 'interview', 'rejected', 'hired'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const application = await Application.findById(applicationId).populate('jobId');
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found.' });
      return;
    }

    const job = await Job.findById(application.jobId);
    if (!job) {
      res.status(404).json({ success: false, message: 'Associated job not found.' });
      return;
    }

    const company = await Company.findOne({ _id: job.companyId, ownerId });
    if (!company) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own the company hosting this job listing.',
      });
      return;
    }

    application.status = status;
    await application.save();

    // Create system notification message in chat thread if thread exists
    const chatThread = await ChatThread.findOne({ applicationId: application._id });
    if (chatThread) {
      await Message.create({
        threadId: chatThread._id,
        messageText: `📌 Application status updated to: ${status.replace('_', ' ').toUpperCase()}`,
        isSystemMessage: true,
      });
    }

    // Send persisted notification & emit real-time event to candidate
    const applicantIdStr = application.applicantId.toString();
    const statusLabel = status.replace('_', ' ').toUpperCase();
    await createNotification(
      applicantIdStr,
      'application_status_changed',
      'Application Status Updated',
      `Your application status for "${job.title}" is now ${statusLabel}.`,
      'application',
      application._id.toString()
    );

    res.status(200).json({
      success: true,
      message: `Application status updated to ${status}`,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawApplication = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const applicantId = req.user?.id;
    const { id: applicationId } = req.params;

    const application = await Application.findOne({ _id: applicationId, applicantId });
    if (!application) {
      res.status(404).json({ success: false, message: 'Application not found or access denied.' });
      return;
    }

    if (!['applied', 'under_review'].includes(application.status)) {
      res.status(400).json({
        success: false,
        message: 'Applications can only be withdrawn while status is "applied" or "under review".',
      });
      return;
    }

    // Delete application & associated chat thread
    const job = await Job.findById(application.jobId).populate('companyId', 'ownerId');
    await ChatThread.deleteMany({ applicationId: application._id });
    await application.deleteOne();

    const io = getIO();
    if (io && job?.companyId) {
      const ownerId = (job.companyId as unknown as { ownerId: string }).ownerId;
      if (ownerId) {
        io.to(ownerId.toString()).emit('application_withdrawn', {
          applicationId: application._id,
          jobId: application.jobId,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCandidates = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const company = await Company.findOne({ ownerId });
    if (!company) {
      res.status(200).json({
        success: true,
        data: [],
        jobs: [],
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit },
      });
      return;
    }

    const jobs = await Job.find({ companyId: company._id }).select('_id title category status');
    const jobIds = jobs.map((j) => j._id);

    // Optional status or jobId query filters
    const filterQuery: any = { jobId: { $in: jobIds } };
    if (req.query.jobId && req.query.jobId !== 'all') {
      filterQuery.jobId = req.query.jobId;
    }
    if (req.query.status && req.query.status !== 'all') {
      filterQuery.status = req.query.status;
    }

    const [applications, totalCount] = await Promise.all([
      Application.find(filterQuery)
        .populate({
          path: 'applicantId',
          select: 'fullName email phone location avatarUrl bio experienceLevel education skills',
        })
        .populate({
          path: 'jobId',
          select: 'title category location jobType status',
        })
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit),
      Application.countDocuments(filterQuery),
    ]);

    res.status(200).json({
      success: true,
      data: applications,
      jobs: jobs.map((j) => ({ id: j._id, title: j.title })),
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

