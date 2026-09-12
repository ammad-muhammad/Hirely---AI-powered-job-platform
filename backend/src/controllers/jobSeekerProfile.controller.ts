import { Response, NextFunction } from 'express';
import { extractText } from 'unpdf';
import { User, JobSeekerProfile, Company, Job, Application, IJobSeekerProfile } from '../models';
import { uploadBufferToCloudinary } from '../utils/cloudinary.utils';
import { AuthenticatedRequest } from '../types';

// Helper function to calculate profile completion percentage
export const calculateProfileCompletion = (
  user: { avatarUrl?: string; phone?: string; location?: string },
  profile: Partial<IJobSeekerProfile>
): number => {
  let score = 0;
  const totalWeight = 11;

  if (user.avatarUrl) score += 1;
  if (user.phone) score += 1;
  if (profile.city || profile.country || user.location) score += 1;
  if (profile.bio && profile.bio.trim().length > 0) score += 1;
  if (profile.skills && profile.skills.length > 0) score += 1;
  if (profile.experienceLevel) score += 1;
  if (profile.education && profile.education.trim().length > 0) score += 1;
  if (profile.resumeUrl || (profile.resumeText && profile.resumeText.trim().length > 0)) score += 1;
  if (profile.desiredJobTitles && profile.desiredJobTitles.length > 0) score += 1;
  if (profile.preferredJobTypes && profile.preferredJobTypes.length > 0) score += 1;
  if (profile.portfolioUrl || profile.linkedinUrl || profile.githubUrl) score += 1;

  return Math.round((score / totalWeight) * 100);
};

export const getMyProfile = async (
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

    const user = await User.findById(userId).select('-password');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      profile = await JobSeekerProfile.create({
        userId,
        skills: [],
        experienceLevel: 'entry',
        profileCompletionPercentage: 0,
      });
    }

    const calculatedPercentage = calculateProfileCompletion(user, profile);
    if (profile.profileCompletionPercentage !== calculatedPercentage) {
      profile.profileCompletionPercentage = calculatedPercentage;
      await profile.save();
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          countryCode: user.countryCode || '+92',
          role: user.role,
          phone: user.phone || '',
          avatarUrl: user.avatarUrl || '',
          location: user.location || '',
        },
        profile: {
          id: profile._id,
          bio: profile.bio || '',
          skills: profile.skills || [],
          verifiedSkills: profile.verifiedSkills || [],
          experienceLevel: profile.experienceLevel || 'entry',
          education: profile.education || '',
          country: profile.country || 'Pakistan',
          city: profile.city || '',
          postcode: profile.postcode || '',
          desiredJobTitles: profile.desiredJobTitles || [],
          preferredJobTypes: profile.preferredJobTypes || [],
          minimumExpectedSalary: profile.minimumExpectedSalary || null,
          openToRelocate: Boolean(profile.openToRelocate),
          availableImmediately: Boolean(profile.availableImmediately),
          resumeUrl: profile.resumeUrl || '',
          resumeOriginalFileName: profile.resumeOriginalFileName || '',
          resumeText: profile.resumeText || '',
          portfolioUrl: profile.portfolioUrl || '',
          linkedinUrl: profile.linkedinUrl || '',
          githubUrl: profile.githubUrl || '',
          profileCompletionPercentage: profile.profileCompletionPercentage,
          updatedAt: profile.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getJobSeekerProfileById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const employerUserId = req.user?.id;

    if (!employerUserId) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const targetUser = await User.findById(targetUserId).select('-password');
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Candidate user not found.' });
      return;
    }

    let profile = await JobSeekerProfile.findOne({ userId: targetUserId });
    if (!profile) {
      profile = await JobSeekerProfile.create({
        userId: targetUserId,
        skills: [],
        experienceLevel: 'entry',
        profileCompletionPercentage: 0,
      });
    }

    let hasAppliedToEmployer = false;
    if (req.user?.role === 'admin') {
      hasAppliedToEmployer = true;
    } else {
      const companies = await Company.find({ ownerId: employerUserId }).select('_id');
      if (companies && companies.length > 0) {
        const companyIds = companies.map((c) => c._id);
        const employerJobs = await Job.find({ companyId: { $in: companyIds } }).select('_id');
        const employerJobIds = employerJobs.map((j) => j._id);

        if (employerJobIds.length > 0) {
          const applicationCount = await Application.countDocuments({
            applicantId: targetUserId,
            jobId: { $in: employerJobIds },
          });

          hasAppliedToEmployer = applicationCount > 0;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: targetUser._id,
          fullName: targetUser.fullName,
          firstName: targetUser.firstName || '',
          lastName: targetUser.lastName || '',
          countryCode: targetUser.countryCode || '+92',
          avatarUrl: targetUser.avatarUrl || '',
          location: targetUser.location || '',
          email: hasAppliedToEmployer ? targetUser.email : undefined,
          phone: hasAppliedToEmployer ? targetUser.phone : undefined,
          hasAppliedToEmployer,
        },
        profile: {
          id: profile._id,
          bio: profile.bio || '',
          skills: profile.skills || [],
          verifiedSkills: profile.verifiedSkills || [],
          experienceLevel: profile.experienceLevel || 'entry',
          education: profile.education || '',
          country: profile.country || 'Pakistan',
          city: profile.city || '',
          postcode: profile.postcode || '',
          desiredJobTitles: profile.desiredJobTitles || [],
          preferredJobTypes: profile.preferredJobTypes || [],
          minimumExpectedSalary: profile.minimumExpectedSalary || null,
          openToRelocate: Boolean(profile.openToRelocate),
          availableImmediately: Boolean(profile.availableImmediately),
          resumeUrl: profile.resumeUrl || '',
          resumeOriginalFileName: profile.resumeOriginalFileName || '',
          resumeText: profile.resumeText || '',
          portfolioUrl: profile.portfolioUrl || '',
          linkedinUrl: profile.linkedinUrl || '',
          githubUrl: profile.githubUrl || '',
          profileCompletionPercentage: profile.profileCompletionPercentage,
          updatedAt: profile.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (
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

    const {
      fullName,
      firstName,
      lastName,
      countryCode,
      phone,
      location,
      country,
      city,
      postcode,
      desiredJobTitles,
      preferredJobTypes,
      minimumExpectedSalary,
      openToRelocate,
      availableImmediately,
      bio,
      skills,
      experienceLevel,
      education,
      portfolioUrl,
      linkedinUrl,
      githubUrl,
      resumeText,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;

    if (firstName !== undefined || lastName !== undefined) {
      user.fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || fullName || user.fullName;
    } else if (fullName !== undefined) {
      user.fullName = fullName;
    }

    if (countryCode !== undefined) user.countryCode = countryCode;
    if (phone !== undefined) user.phone = phone;

    const formattedLocation = city && country ? `${city}, ${country}` : city || country || location;
    if (formattedLocation !== undefined) user.location = formattedLocation;

    await user.save();

    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      profile = new JobSeekerProfile({ userId });
    }

    if (bio !== undefined) profile.bio = bio;
    if (country !== undefined) profile.country = country;
    if (city !== undefined) profile.city = city;
    if (postcode !== undefined) profile.postcode = postcode;

    if (desiredJobTitles !== undefined) {
      profile.desiredJobTitles = Array.isArray(desiredJobTitles)
        ? desiredJobTitles.map((t: string) => String(t).trim()).filter(Boolean)
        : [];
    }

    if (preferredJobTypes !== undefined) {
      profile.preferredJobTypes = Array.isArray(preferredJobTypes)
        ? preferredJobTypes.map((t: string) => String(t).trim()).filter(Boolean)
        : [];
    }

    if (minimumExpectedSalary !== undefined) {
      profile.minimumExpectedSalary = minimumExpectedSalary ? Number(minimumExpectedSalary) : undefined;
    }

    if (openToRelocate !== undefined) profile.openToRelocate = Boolean(openToRelocate);
    if (availableImmediately !== undefined) profile.availableImmediately = Boolean(availableImmediately);

    if (skills !== undefined) {
      profile.skills = Array.isArray(skills)
        ? skills.map((s: string) => String(s).trim()).filter(Boolean)
        : [];
      profile.skillTestRecommendationsCache = [];
      profile.skillTestRecommendationsCacheAt = undefined;
    }

    if (experienceLevel !== undefined) {
      profile.experienceLevel = experienceLevel;
      profile.skillTestRecommendationsCache = [];
      profile.skillTestRecommendationsCacheAt = undefined;
    }
    if (experienceLevel !== undefined) profile.experienceLevel = experienceLevel;
    if (education !== undefined) profile.education = education;
    if (portfolioUrl !== undefined) profile.portfolioUrl = portfolioUrl;
    if (linkedinUrl !== undefined) profile.linkedinUrl = linkedinUrl;
    if (githubUrl !== undefined) profile.githubUrl = githubUrl;
    if (resumeText !== undefined) profile.resumeText = resumeText;

    // Invalidate AI skill test recommendation cache on profile update
    profile.skillTestRecommendationsCache = [];
    profile.skillTestRecommendationsCacheAt = undefined;

    profile.profileCompletionPercentage = calculateProfileCompletion(user, profile);
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          countryCode: user.countryCode || '+92',
          role: user.role,
          phone: user.phone || '',
          avatarUrl: user.avatarUrl || '',
          location: user.location || '',
        },
        profile: {
          id: profile._id,
          bio: profile.bio || '',
          skills: profile.skills || [],
          verifiedSkills: profile.verifiedSkills || [],
          experienceLevel: profile.experienceLevel || 'entry',
          education: profile.education || '',
          country: profile.country || 'Pakistan',
          city: profile.city || '',
          postcode: profile.postcode || '',
          desiredJobTitles: profile.desiredJobTitles || [],
          preferredJobTypes: profile.preferredJobTypes || [],
          minimumExpectedSalary: profile.minimumExpectedSalary || null,
          openToRelocate: Boolean(profile.openToRelocate),
          availableImmediately: Boolean(profile.availableImmediately),
          resumeUrl: profile.resumeUrl || '',
          resumeOriginalFileName: profile.resumeOriginalFileName || '',
          resumeText: profile.resumeText || '',
          portfolioUrl: profile.portfolioUrl || '',
          linkedinUrl: profile.linkedinUrl || '',
          githubUrl: profile.githubUrl || '',
          profileCompletionPercentage: profile.profileCompletionPercentage,
          updatedAt: profile.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadResume = async (
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

    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please attach a valid PDF resume file.' });
      return;
    }

    const resumeUrl = await uploadBufferToCloudinary(
      req.file.buffer,
      'hirely/resumes',
      req.file.originalname
    );

    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      profile = new JobSeekerProfile({ userId });
    }

    profile.resumeUrl = resumeUrl;
    profile.resumeOriginalFileName = req.file.originalname;

    // Extract & store resume text in MongoDB upon upload for instant AI audits
    try {
      const { text } = await extractText(new Uint8Array(req.file.buffer));
      const extractedStr = Array.isArray(text) ? text.join('\n').trim() : String(text || '').trim();
      if (extractedStr && extractedStr.length >= 20) {
        profile.resumeText = extractedStr;
      }
    } catch {
      // Non-blocking fallback
    }

    profile.skillTestRecommendationsCache = [];
    profile.skillTestRecommendationsCacheAt = undefined;

    const user = await User.findById(userId);
    if (user) {
      profile.profileCompletionPercentage = calculateProfileCompletion(user, profile);
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully!',
      data: {
        resumeUrl,
        resumeOriginalFileName: profile.resumeOriginalFileName,
        profileCompletionPercentage: profile.profileCompletionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteResume = async (
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

    let profile = await JobSeekerProfile.findOne({ userId });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Job seeker profile not found.' });
      return;
    }

    profile.resumeUrl = undefined;
    profile.resumeOriginalFileName = undefined;
    profile.resumeText = undefined;
    profile.skillTestRecommendationsCache = [];
    profile.skillTestRecommendationsCacheAt = undefined;

    const user = await User.findById(userId);
    if (user) {
      profile.profileCompletionPercentage = calculateProfileCompletion(user, profile);
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Resume removed successfully!',
      data: {
        profileCompletionPercentage: profile.profileCompletionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
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

    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please attach an image file.' });
      return;
    }

    const avatarUrl = await uploadBufferToCloudinary(
      req.file.buffer,
      'hirely/avatars',
      req.file.originalname
    );

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    user.avatarUrl = avatarUrl;
    await user.save();

    const profile = await JobSeekerProfile.findOne({ userId });
    if (profile) {
      profile.profileCompletionPercentage = calculateProfileCompletion(user, profile);
      await profile.save();
    }

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully!',
      data: {
        avatarUrl,
        profileCompletionPercentage: profile ? profile.profileCompletionPercentage : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};
