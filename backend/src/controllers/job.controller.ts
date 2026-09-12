import { Response, NextFunction } from 'express';
import { Job, Company, Application, JobSeekerProfile, SavedJob } from '../models';
import { AuthenticatedRequest } from '../types';
import { matchJobsToProfile, generateJobPostingFromDescription } from '../services/ai.service';
import { sanitizeJobDescription, getPlainTextLength } from '../utils/sanitize';
import { getIO } from '../config/socket';
import { logger } from '../utils/logger';

const VALID_QUESTION_TYPES = new Set([
  'commute',
  'education',
  'experience',
  'language',
  'license_certification',
  'location',
  'willingness_to_travel',
  'custom',
  'custom_open_ended',
]);

const QUESTION_TYPE_MAP: Record<string, string> = {
  certification: 'license_certification',
  license: 'license_certification',
  cert: 'license_certification',
  licenses: 'license_certification',
  certifications: 'license_certification',
  degree: 'education',
  work_experience: 'experience',
  relocation: 'commute',
  open_ended: 'custom_open_ended',
  free_form: 'custom_open_ended',
};

function sanitizeScreeningQuestions(questions: any[]): any[] {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((q) => {
      if (!q || typeof q !== 'object') return null;
      let type = String(q.questionType || 'custom').toLowerCase().trim();

      if (QUESTION_TYPE_MAP[type]) {
        type = QUESTION_TYPE_MAP[type];
      } else if (!VALID_QUESTION_TYPES.has(type)) {
        type = 'custom';
      }

      return {
        ...q,
        questionType: type,
        questionText: q.questionText ? String(q.questionText).trim() : null,
        isRequired: q.isRequired !== undefined ? Boolean(q.isRequired) : true,
        isDealBreaker: Boolean(q.isDealBreaker),
      };
    })
    .filter(Boolean);
}

export const createJob = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;

    const { PlatformConfig } = await import('../models/PlatformConfig');
    const platformCfg = await PlatformConfig.findOne();
    if (platformCfg && platformCfg.jobPostingEnabled === false) {
      res.status(403).json({
        success: false,
        message: 'Job posting is temporarily disabled for platform maintenance.',
      });
      return;
    }

    // Check if employer has created a company profile
    const company = await Company.findOne({ ownerId });
    if (!company) {
      res.status(400).json({
        success: false,
        message: 'Company profile required! Please complete your company setup before posting a job.',
      });
      return;
    }

    const {
      title,
      category,
      jobType,
      location,
      workplaceType = 'on_site',
      hiringTimeline = '1_2_weeks',
      numberOfHires = 1,
      payShowBy = 'range',
      payRate = 'per_year',
      salaryCurrency = 'USD',
      contractDuration = null,
      expectedHours = null,
      screeningQuestions = [],
      applicationMethod = 'platform',
      requireResume = true,
      candidatesCanContact = false,
      postStatus = 'draft',
      salaryMin,
      salaryMax,
      salaryDisclosed = true,
      experienceLevel = 'entry',
      educationRequirement,
      skillsRequired = [],
      description,
      responsibilities = [],
      openings = 1,
      applicationDeadline,
    } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({
        success: false,
        message: 'Job title is required.',
      });
      return;
    }

    const sanitizedDesc = description ? sanitizeJobDescription(description) : '';
    const plainTextLen = getPlainTextLength(sanitizedDesc);

    // If publishing immediately, validate required fields
    if (postStatus === 'published') {
      const missingFields = [];
      if (!category) missingFields.push('category');
      if (!jobType) missingFields.push('jobType');
      if (workplaceType !== 'remote' && !location) missingFields.push('location');
      if (!experienceLevel) missingFields.push('experienceLevel');
      if (!sanitizedDesc || plainTextLen < 20) missingFields.push('description (min 20 characters of text)');

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot publish job. Required fields missing: ${missingFields.join(', ')}.`,
        });
        return;
      }
    }

    const parsedSalaryMin = salaryMin !== undefined && salaryMin !== '' && !isNaN(Number(salaryMin)) ? Number(salaryMin) : undefined;
    const parsedSalaryMax = salaryMax !== undefined && salaryMax !== '' && !isNaN(Number(salaryMax)) ? Number(salaryMax) : undefined;

    const sanitizedJobType = Array.isArray(jobType)
      ? jobType
      : typeof jobType === 'string' && jobType.trim()
      ? [jobType.trim()]
      : ['full_time'];

    const job = await Job.create({
      companyId: company._id,
      title: title.trim(),
      category: category || 'General',
      jobType: sanitizedJobType,
      location: location || (workplaceType === 'remote' ? 'Remote' : 'Location Not Specified'),
      workplaceType,
      hiringTimeline,
      numberOfHires: parseInt(numberOfHires, 10) || 1,
      payShowBy,
      payRate,
      salaryCurrency: salaryCurrency ? String(salaryCurrency).toUpperCase() : 'USD',
      contractDuration: contractDuration || null,
      expectedHours: expectedHours || null,
      screeningQuestions: sanitizeScreeningQuestions(screeningQuestions),
      applicationMethod,
      requireResume: Boolean(requireResume),
      candidatesCanContact: Boolean(candidatesCanContact),
      postStatus: postStatus === 'published' ? 'published' : 'draft',
      salaryMin: parsedSalaryMin,
      salaryMax: parsedSalaryMax,
      salaryDisclosed: Boolean(salaryDisclosed),
      experienceLevel: experienceLevel || 'entry',
      educationRequirement: educationRequirement || null,
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [],
      description: sanitizedDesc || 'Job description pending...',
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
      openings: openings ? parseInt(openings, 10) : 1,
      applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
      status: 'active',
    });

    const populatedJob = await Job.findById(job._id).populate('companyId', 'companyName logoUrl location industry isVerified');
    const io = getIO();
    if (io && populatedJob) {
      if (postStatus === 'published') {
        io.emit('job_published', populatedJob);
        if (ownerId) io.to(ownerId.toString()).emit('job_published', populatedJob);

        // Asynchronously trigger auto-apply scanner for matching candidates
        import('../services/autoApply.service')
          .then(({ runAutoApplyForAllUsers }) => runAutoApplyForAllUsers())
          .catch((err) => logger.error(`[AutoApply Trigger Error]: ${err}`));
      }
    }

    res.status(201).json({
      success: true,
      message: postStatus === 'published' ? 'Job published successfully!' : 'Job saved as draft successfully!',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyJobs = async (
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
        pagination: { currentPage: 1, totalPages: 1, totalCount: 0, limit },
      });
      return;
    }

    const [allCompanyJobs, jobs, totalCount] = await Promise.all([
      Job.find({ companyId: company._id }).select('_id status postStatus'),
      Job.find({ companyId: company._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments({ companyId: company._id }),
    ]);

    const totalRequisitions = allCompanyJobs.length;
    const publishedCount = allCompanyJobs.filter(
      (j) => (j.postStatus || 'published') === 'published' && j.status === 'active'
    ).length;
    const draftsCount = allCompanyJobs.filter((j) => j.postStatus === 'draft').length;
    const closedCount = allCompanyJobs.filter((j) => j.status === 'closed').length;

    const companyJobIds = allCompanyJobs.map((j) => j._id);
    const totalApplicantsCount = await Application.countDocuments({ jobId: { $in: companyJobIds } });

    const summaryMetrics = {
      totalRequisitions,
      publishedCount,
      draftsCount,
      closedCount,
      totalApplicantsCount,
    };

    // Aggregate applicant counts for each job
    const jobsWithApplicantCounts = await Promise.all(
      jobs.map(async (job) => {
        const applicantCount = await Application.countDocuments({ jobId: job._id });
        return {
          ...job.toObject(),
          applicantCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: jobsWithApplicantCounts,
      summaryMetrics,
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

export const updateJob = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { id } = req.params;

    const company = await Company.findOne({ ownerId });
    if (!company) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own a registered company.',
      });
      return;
    }

    const job = await Job.findOne({ _id: id, companyId: company._id });
    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found or access denied.',
      });
      return;
    }

    const fields = { ...req.body };
    if (fields.description !== undefined) {
      fields.description = sanitizeJobDescription(fields.description);
    }
    if (fields.salaryMin !== undefined) {
      fields.salaryMin = fields.salaryMin !== '' && fields.salaryMin !== null && !isNaN(Number(fields.salaryMin)) ? Number(fields.salaryMin) : null;
    }
    if (fields.salaryMax !== undefined) {
      fields.salaryMax = fields.salaryMax !== '' && fields.salaryMax !== null && !isNaN(Number(fields.salaryMax)) ? Number(fields.salaryMax) : null;
    }
    if (fields.numberOfHires !== undefined) {
      fields.numberOfHires = parseInt(fields.numberOfHires, 10) || 1;
    }
    if (fields.openings !== undefined) {
      fields.openings = parseInt(fields.openings, 10) || 1;
    }
    if (fields.jobType !== undefined) {
      fields.jobType = Array.isArray(fields.jobType)
        ? fields.jobType
        : typeof fields.jobType === 'string' && fields.jobType.trim()
        ? [fields.jobType.trim()]
        : ['full_time'];
    }
    if (fields.screeningQuestions !== undefined) {
      fields.screeningQuestions = sanitizeScreeningQuestions(fields.screeningQuestions);
    }

    Object.assign(job, fields);
    await job.save();

    const populatedJob = await Job.findById(job._id).populate('companyId', 'companyName logoUrl location industry isVerified');
    const io = getIO();
    if (io && populatedJob) {
      io.emit('job_updated', populatedJob);
      if (job.postStatus === 'published') {
        io.emit('job_published', populatedJob);
        // Asynchronously trigger auto-apply scanner for matching candidates
        import('../services/autoApply.service')
          .then(({ runAutoApplyForAllUsers }) => runAutoApplyForAllUsers())
          .catch((err) => logger.error(`[AutoApply Trigger Error]: ${err}`));
      }
    }

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

export const publishJob = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { id } = req.params;

    const company = await Company.findOne({ ownerId });
    if (!company) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own a registered company.',
      });
      return;
    }

    const job = await Job.findOne({ _id: id, companyId: company._id });
    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found or access denied.',
      });
      return;
    }

    // Validate required fields before allowing publish
    const missingFields = [];
    if (!job.title || !job.title.trim()) missingFields.push('title');
    if (!job.category) missingFields.push('category');
    if (!job.jobType) missingFields.push('jobType');
    if (job.workplaceType !== 'remote' && (!job.location || job.location === 'Location Not Specified')) missingFields.push('location');
    if (!job.experienceLevel) missingFields.push('experienceLevel');

    const plainTextLen = getPlainTextLength(job.description);
    if (!job.description || plainTextLen < 20) missingFields.push('description (min 20 characters of text)');

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot publish job. Please complete required fields: ${missingFields.join(', ')}.`,
      });
      return;
    }

    job.postStatus = 'published';
    job.status = 'active';
    await job.save();

    const populatedPublishedJob = await Job.findById(job._id).populate('companyId', 'companyName logoUrl location industry isVerified');
    const ioPub = getIO();
    if (ioPub && populatedPublishedJob) {
      ioPub.emit('job_published', populatedPublishedJob);
      if (ownerId) ioPub.to(ownerId.toString()).emit('job_published', populatedPublishedJob);
    }

    res.status(200).json({
      success: true,
      message: 'Job published successfully! It is now live in job search results.',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { id } = req.params;

    const company = await Company.findOne({ ownerId });
    if (!company) {
      res.status(403).json({ success: false, message: 'Forbidden.' });
      return;
    }

    const job = await Job.findOne({ _id: id, companyId: company._id });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    // Soft delete: set status to 'closed'
    job.status = 'closed';
    await job.save();

    const ioDel = getIO();
    if (ioDel) {
      ioDel.emit('job_closed', { jobId: job._id.toString(), title: job.title });
    }

    res.status(200).json({
      success: true,
      message: 'Job closed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleJobStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    const company = await Company.findOne({ ownerId });
    if (!company) {
      res.status(403).json({ success: false, message: 'Forbidden.' });
      return;
    }

    const job = await Job.findOne({ _id: id, companyId: company._id });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    if (status && ['active', 'closed'].includes(status)) {
      job.status = status;
    } else {
      job.status = job.status === 'active' ? 'closed' : 'active';
    }

    await job.save();

    const populatedToggleJob = await Job.findById(job._id).populate('companyId', 'companyName logoUrl location industry isVerified');
    const ioToggle = getIO();
    if (ioToggle && populatedToggleJob) {
      if (job.status === 'closed') {
        ioToggle.emit('job_closed', { jobId: job._id.toString(), title: job.title });
      } else {
        ioToggle.emit('job_updated', populatedToggleJob);
      }
    }

    res.status(200).json({
      success: true,
      message: `Job status updated to ${job.status}`,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicJobs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      search,
      location,
      jobType,
      category,
      experienceLevel,
      salaryMin,
      salaryMax,
      sortBy = 'newest',
      page = '1',
      limit = '10',
    } = req.query;

    // Filter criteria (only show active published jobs)
    const query: Record<string, unknown> = {
      status: 'active',
      postStatus: 'published',
    };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    if (jobType) {
      query.jobType = jobType;
    }
    if (category) {
      query.category = category;
    }
    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }
    if (salaryMin) {
      query.salaryMax = { $gte: parseInt(salaryMin as string, 10) };
    }
    if (salaryMax) {
      query.salaryMin = { $lte: parseInt(salaryMax as string, 10) };
    }

    // Sort order
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === 'salary') {
      sortOptions = { salaryMax: -1, createdAt: -1 };
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .populate('companyId', 'companyName logoUrl location industry isVerified')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Compute isSaved and hasApplied for logged in job seeker
    let savedJobIdSet = new Set<string>();
    let appliedJobIdSet = new Set<string>();
    const userId = req.user?.id;
    if (userId && req.user?.role === 'job_seeker') {
      const jobIds = jobs.map((j) => j._id);
      const [savedDocs, appDocs] = await Promise.all([
        SavedJob.find({ profileId: userId, jobId: { $in: jobIds } }).select('jobId'),
        Application.find({ applicantId: userId, jobId: { $in: jobIds } }).select('jobId'),
      ]);
      savedJobIdSet = new Set(savedDocs.map((s) => s.jobId.toString()));
      appliedJobIdSet = new Set(appDocs.map((a) => a.jobId.toString()));
    }

    const jobsWithSavedFlag = jobs.map((job) => ({
      ...job.toObject(),
      isSaved: savedJobIdSet.has(job._id.toString()),
      hasApplied: appliedJobIdSet.has(job._id.toString()),
    }));

    res.status(200).json({
      success: true,
      data: jobsWithSavedFlag,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

export function detectDomainCategory(text: string, categoryStr: string = ''): string {
  const corpus = `${text} ${categoryStr}`.toLowerCase();

  // Tech / Software Engineering / IT / Data
  if (
    /react|node|javascript|typescript|python|java|c\+\+|golang|php|ruby|sql|mongodb|express|django|flask|spring|aws|docker|kubernetes|fullstack|full-stack|frontend|backend|software|developer|engineer|coder|web|devops|data science|machine learning|cloud|sysadmin|tech|it\b/i.test(
      corpus
    )
  ) {
    return 'tech';
  }
  // Finance / Accounting / Banking / Audit / Tax
  if (
    /finance|financial|accounting|accountant|audit|auditor|tax|banking|banker|investment|portfolio|valuation|cpa|chartered accountant|bookkeeper|wealth|equity/i.test(
      corpus
    )
  ) {
    return 'finance';
  }
  // Healthcare / Clinical / Medical
  if (
    /health|clinical|medical|nurse|nursing|doctor|pharma|pharmacy|patient|hospital|medical records/i.test(
      corpus
    )
  ) {
    return 'healthcare';
  }
  // Marketing / Sales / Content
  if (
    /marketing|seo|sem|social media|content writer|copywriter|advertising|brand|sales|account executive|growth|campaign/i.test(
      corpus
    )
  ) {
    return 'marketing';
  }
  // HR / Recruiting / Talent
  if (
    /human resources|hr\b|recruiter|recruiting|talent acquisition|people ops|office manager|administrative assistant/i.test(
      corpus
    )
  ) {
    return 'hr';
  }
  // Design / Creative
  if (
    /ui\/ux|ux\/ui|graphic design|designer|figma|illustrator|photoshop|product design|visual design/i.test(
      corpus
    )
  ) {
    return 'design';
  }

  return 'other';
}

export const getRecommendedJobs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const seekerProfile = await JobSeekerProfile.findOne({ userId });

    if (!seekerProfile || !seekerProfile.skills || seekerProfile.skills.length === 0) {
      res.status(200).json({
        success: true,
        message: 'Complete your profile by adding your skills and bio to get personalized AI job recommendations.',
        data: [],
      });
      return;
    }

    const candidateCorpus = [
      ...(seekerProfile.skills || []),
      ...((seekerProfile.verifiedSkills || []).map((v) => v.skill || '')),
      ...(seekerProfile.desiredJobTitles || []),
      seekerProfile.bio || '',
      seekerProfile.experienceLevel || '',
      seekerProfile.resumeText || '',
    ].join(' ');

    const candidateDomain = detectDomainCategory(candidateCorpus);

    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const now = Date.now();

    const [savedDocs, appDocs] = await Promise.all([
      SavedJob.find({ profileId: userId }).select('jobId'),
      Application.find({ applicantId: userId }).select('jobId'),
    ]);
    const savedJobIdSet = new Set(savedDocs.map((s) => s.jobId.toString()));
    const appliedJobIdSet = new Set(appDocs.map((a) => a.jobId.toString()));

    // Cache sanitation check: invalidate if generic reason, matchScore < 80, or cross-domain mismatch present
    const cacheHasInvalidReasonOrScore = (seekerProfile.recommendedJobsCache || []).some((c) => {
      if (!c.matchReason || (c.matchScore && c.matchScore < 80)) return true;
      return (
        c.matchReason.includes('Recommended based on open position') ||
        c.matchReason.includes('Strong alignment with your professional background') ||
        c.matchReason.includes('Matches your profile skills and experience.')
      );
    });

    const hasValidCache =
      !cacheHasInvalidReasonOrScore &&
      seekerProfile.recommendedJobsCache &&
      seekerProfile.recommendedJobsCache.length > 0 &&
      seekerProfile.recommendedJobsCacheAt &&
      now - seekerProfile.recommendedJobsCacheAt.getTime() < SIX_HOURS &&
      seekerProfile.updatedAt <= seekerProfile.recommendedJobsCacheAt;

    if (hasValidCache && seekerProfile.recommendedJobsCache) {
      const cachedJobIds = seekerProfile.recommendedJobsCache.map((c) => c.jobId);
      const jobs = await Job.find({ _id: { $in: cachedJobIds }, status: 'active', postStatus: { $ne: 'draft' } })
        .populate('companyId', 'companyName logoUrl industry location');

      const cacheMap = new Map(
        seekerProfile.recommendedJobsCache.map((c) => [c.jobId.toString(), c])
      );

      const result = jobs
        .map((job) => {
          const match = cacheMap.get(job._id.toString());
          const jobDomain = detectDomainCategory(
            `${job.title} ${job.category} ${(job.skillsRequired || []).join(' ')} ${job.description || ''}`,
            job.category || ''
          );

          // Exclude cross-domain mismatches from cache
          if (candidateDomain !== 'other' && jobDomain !== candidateDomain) {
            return null;
          }

          const score = match?.matchScore || 0;
          if (score < 80) return null;

          return {
            ...job.toObject(),
            matchScore: score,
            matchReason: match?.matchReason || 'Strong domain alignment with your profile.',
            isSaved: savedJobIdSet.has(job._id.toString()),
            hasApplied: appliedJobIdSet.has(job._id.toString()),
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.matchScore - a.matchScore);

      if (result.length > 0) {
        res.status(200).json({
          success: true,
          data: result,
          cached: true,
        });
        return;
      }
    }

    const activeJobs = await Job.find({ status: 'active', postStatus: { $ne: 'draft' } })
      .populate('companyId', 'companyName logoUrl industry location')
      .sort({ createdAt: -1 });

    if (activeJobs.length === 0) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    // STRICT PRE-FILTERING: Filter jobs to candidate's domain before matching
    let eligibleActiveJobs = activeJobs;
    if (candidateDomain !== 'other') {
      const sameDomain = activeJobs.filter((job) => {
        const jobDomain = detectDomainCategory(
          `${job.title} ${job.category} ${(job.skillsRequired || []).join(' ')} ${job.description || ''}`,
          job.category || ''
        );
        return jobDomain === candidateDomain;
      });
      if (sameDomain.length > 0) {
        eligibleActiveJobs = sameDomain;
      }
    }

    const candidateJobs = eligibleActiveJobs.slice(0, 35).map((job) => ({
      _id: job._id.toString(),
      title: job.title,
      category: job.category,
      skillsRequired: job.skillsRequired || [],
      experienceLevel: job.experienceLevel,
      jobType: job.jobType,
      location: job.location,
      shortDescription: job.description ? job.description.slice(0, 200) : '',
    }));

    const verifiedSkillNames = (seekerProfile.verifiedSkills || []).map((v) => v.skill);

    let matchedJobsWithDetails: any[] = [];

    try {
      const matchResults = await matchJobsToProfile(
        {
          skills: seekerProfile.skills || [],
          verifiedSkills: verifiedSkillNames,
          bio: seekerProfile.bio || undefined,
          desiredJobTitles: seekerProfile.desiredJobTitles || [],
          experienceLevel: seekerProfile.experienceLevel || undefined,
          education: seekerProfile.education || undefined,
          resumeText: seekerProfile.resumeText || undefined,
        },
        candidateJobs
      );

      if (matchResults && matchResults.length > 0) {
        const resultMap = new Map(matchResults.map((m) => [m.jobId, m]));
        matchedJobsWithDetails = eligibleActiveJobs
          .filter((job) => resultMap.has(job._id.toString()))
          .map((job) => {
            const match = resultMap.get(job._id.toString())!;
            return {
              ...job.toObject(),
              matchScore: match.matchScore,
              matchReason: match.matchReason,
              isSaved: savedJobIdSet.has(job._id.toString()),
              hasApplied: appliedJobIdSet.has(job._id.toString()),
            };
          })
          .filter((j) => j.matchScore >= 80) // STRICT RELEVANCE THRESHOLD: >= 80 ONLY
          .sort((a, b) => b.matchScore - a.matchScore);

        if (matchedJobsWithDetails.length > 0) {
          seekerProfile.recommendedJobsCache = matchedJobsWithDetails.slice(0, 15).map((m) => ({
            jobId: m._id as any,
            matchScore: m.matchScore,
            matchReason: m.matchReason,
          }));
          seekerProfile.recommendedJobsCacheAt = new Date();
          await seekerProfile.save();
        }
      }
    } catch (aiErr) {
      console.warn('[AI Matching Fallback Triggered]:', aiErr);
    }

    // Fallback: Use Domain & Skill-Based Deterministic Matching Engine
    if (matchedJobsWithDetails.length === 0) {
      matchedJobsWithDetails = computeDeterministicJobMatches(
        {
          skills: seekerProfile.skills || [],
          verifiedSkills: seekerProfile.verifiedSkills || [],
          bio: seekerProfile.bio || undefined,
          desiredJobTitles: seekerProfile.desiredJobTitles || [],
          resumeText: seekerProfile.resumeText || undefined,
        },
        eligibleActiveJobs,
        savedJobIdSet,
        appliedJobIdSet,
        candidateDomain
      );

      if (matchedJobsWithDetails.length > 0) {
        seekerProfile.recommendedJobsCache = matchedJobsWithDetails.slice(0, 15).map((m) => ({
          jobId: m._id as any,
          matchScore: m.matchScore,
          matchReason: m.matchReason,
        }));
        seekerProfile.recommendedJobsCacheAt = new Date();
        await seekerProfile.save();
      }
    }

    res.status(200).json({
      success: true,
      data: matchedJobsWithDetails,
      cached: false,
    });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const job = await Job.findById(id).populate(
      'companyId',
      'companyName logoUrl industry description website companySize location isVerified'
    );

    if (!job) {
      res.status(404).json({
        success: false,
        message: 'Job not found.',
      });
      return;
    }

    let hasApplied = false;
    let isSaved = false;

    if (userId) {
      const existingApp = await Application.findOne({ jobId: job._id, applicantId: userId });
      if (existingApp) {
        hasApplied = true;
      }
      if (req.user?.role === 'job_seeker') {
        const savedDoc = await SavedJob.findOne({ jobId: job._id, profileId: userId });
        if (savedDoc) {
          isSaved = true;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...job.toObject(),
        hasApplied,
        isSaved,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/jobs/ai-assist
 * Employer AI job posting generator. Parses natural language job description into wizard fields.
 */
export const aiJobPostingAssistantController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { message, conversationHistory = [] } = req.body;

    if (!message || !String(message).trim()) {
      res.status(400).json({
        success: false,
        message: 'Job description text is required.',
      });
      return;
    }

    const company = await Company.findOne({ ownerId });
    const companyContext = company
      ? {
          companyName: company.companyName,
          industry: company.industry,
          location: company.location,
        }
      : {};

    const aiResult = await generateJobPostingFromDescription(
      String(message).trim(),
      Array.isArray(conversationHistory) ? conversationHistory : [],
      companyContext
    );

    res.status(200).json({
      success: true,
      ...aiResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deterministic skill & domain matching engine for job recommendations
 * Computes exact skill overlap and domain alignment penalties to prevent cross-domain mismatches.
 */
function computeDeterministicJobMatches(
  seekerProfile: {
    skills?: string[];
    verifiedSkills?: Array<{ skill: string }>;
    bio?: string;
    desiredJobTitles?: string[];
    resumeText?: string;
  },
  activeJobs: any[],
  savedJobIdSet: Set<string>,
  appliedJobIdSet: Set<string>,
  candidateDomain: string = 'other'
) {
  const candidateSkills = new Set<string>();
  (seekerProfile.skills || []).forEach((s) => candidateSkills.add(s.toLowerCase().trim()));
  (seekerProfile.verifiedSkills || []).forEach((v) => candidateSkills.add(v.skill.toLowerCase().trim()));

  const bioText = (seekerProfile.bio || '').toLowerCase();
  const desiredTitlesText = (seekerProfile.desiredJobTitles || []).join(' ').toLowerCase();
  const resumeText = (seekerProfile.resumeText || '').slice(0, 1000).toLowerCase();
  const fullProfileCorpus = `${Array.from(candidateSkills).join(' ')} ${bioText} ${desiredTitlesText} ${resumeText}`;

  const scored = activeJobs.map((job) => {
    const jobObj = job.toObject ? job.toObject() : job;
    const jobTitle = (jobObj.title || '').toLowerCase();
    const jobCategory = (jobObj.category || '').toLowerCase();
    const jobDesc = (jobObj.description || '').slice(0, 500).toLowerCase();
    const jobSkills = (jobObj.skillsRequired || []).map((s: string) => s.toLowerCase().trim());
    const jobCorpus = `${jobTitle} ${jobCategory} ${jobSkills.join(' ')} ${jobDesc}`;

    const jobDomain = detectDomainCategory(jobCorpus, jobCategory);

    // Strict Domain Disqualification: Reject completely if candidate & job domains mismatch
    if (candidateDomain !== 'other' && jobDomain !== 'other' && candidateDomain !== jobDomain) {
      return { ...jobObj, matchScore: 0, matchReason: '', isSaved: false, hasApplied: false };
    }

    let skillMatches: string[] = [];
    jobSkills.forEach((js: string) => {
      if (candidateSkills.has(js) || (js.length > 2 && fullProfileCorpus.includes(js))) {
        skillMatches.push(js);
      }
    });

    let matchScore = 50; // base score for same domain

    if (candidateDomain !== 'other' && jobDomain === candidateDomain) {
      matchScore += 25;
    } else if (candidateDomain !== 'other' && jobDomain !== 'other' && candidateDomain !== jobDomain) {
      matchScore -= 40;
    }

    matchScore += Math.min(25, skillMatches.length * 10);
    matchScore = Math.max(0, Math.min(98, Math.round(matchScore)));

    let matchReason = '';
    if (skillMatches.length > 0) {
      matchReason = `Matches your core skills (${skillMatches.slice(0, 3).join(', ')}) and aligns with your professional domain.`;
    } else if (matchScore >= 80) {
      matchReason = `Matches your professional background in ${jobObj.category || 'your career field'}.`;
    } else {
      matchReason = `Position in ${jobObj.category || 'the market'}.`;
    }

    return {
      ...jobObj,
      matchScore,
      matchReason,
      isSaved: savedJobIdSet.has(jobObj._id.toString()),
      hasApplied: appliedJobIdSet.has(jobObj._id.toString()),
    };
  });

  return scored
    .filter((j) => j.matchScore >= 80) // STRICT RELEVANCE THRESHOLD: EXCLUDE ANY JOB UNDER 80% MATCH!
    .sort((a, b) => b.matchScore - a.matchScore);
}

