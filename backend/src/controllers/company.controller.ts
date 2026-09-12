import { Response, NextFunction } from 'express';
import { Company, Job } from '../models';
import { AuthenticatedRequest } from '../types';
import { uploadBufferToCloudinary } from '../utils/cloudinary.utils';

export const createCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const {
      companyName,
      industry,
      description,
      website,
      companySize,
      location,
      foundedYear,
      cultureDescription,
      benefits,
    } = req.body;

    if (!companyName || !industry || !companySize || !location) {
      res.status(400).json({
        success: false,
        message: 'Required fields missing: companyName, industry, companySize, location.',
      });
      return;
    }

    // Check if employer already created a company
    const existingCompany = await Company.findOne({ ownerId });
    if (existingCompany) {
      res.status(400).json({
        success: false,
        message: 'Company profile already exists for this account. Use PUT /api/companies/me to update.',
      });
      return;
    }

    let logoUrl: string | undefined;
    if (req.file) {
      logoUrl = await uploadBufferToCloudinary(
        req.file.buffer,
        'hirely/company-logos',
        req.file.originalname
      );
    }

    let parsedBenefits: string[] = [];
    if (benefits) {
      if (typeof benefits === 'string') {
        try {
          parsedBenefits = JSON.parse(benefits);
        } catch {
          parsedBenefits = benefits.split(',').map((b) => b.trim()).filter(Boolean);
        }
      } else if (Array.isArray(benefits)) {
        parsedBenefits = benefits;
      }
    }

    const company = await Company.create({
      ownerId,
      companyName,
      industry,
      description,
      website,
      companySize,
      location,
      foundedYear: foundedYear ? Number(foundedYear) : null,
      cultureDescription: cultureDescription || null,
      benefits: parsedBenefits,
      logoUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Company profile created successfully',
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const company = await Company.findOne({ ownerId });

    if (!company) {
      res.status(444).json({
        success: false,
        message: 'No company profile found for this employer.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyCompany = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const {
      companyName,
      industry,
      description,
      website,
      companySize,
      location,
      foundedYear,
      cultureDescription,
      benefits,
    } = req.body;

    let company = await Company.findOne({ ownerId });

    let logoUrl = company?.logoUrl;
    if (req.file) {
      logoUrl = await uploadBufferToCloudinary(
        req.file.buffer,
        'hirely/company-logos',
        req.file.originalname
      );
    }

    let parsedBenefits: string[] | undefined;
    if (benefits !== undefined) {
      if (typeof benefits === 'string') {
        try {
          parsedBenefits = JSON.parse(benefits);
        } catch {
          parsedBenefits = benefits.split(',').map((b) => b.trim()).filter(Boolean);
        }
      } else if (Array.isArray(benefits)) {
        parsedBenefits = benefits;
      }
    }

    let parsedSocialLinks: Record<string, string> | undefined;
    if (req.body.socialLinks !== undefined) {
      if (typeof req.body.socialLinks === 'string') {
        try {
          parsedSocialLinks = JSON.parse(req.body.socialLinks);
        } catch {
          parsedSocialLinks = {};
        }
      } else if (typeof req.body.socialLinks === 'object' && req.body.socialLinks !== null) {
        parsedSocialLinks = req.body.socialLinks;
      }
    }

    if (!company) {
      company = await Company.create({
        ownerId,
        companyName: companyName || `${req.user?.fullName}'s Company`,
        industry: industry || 'Technology',
        description,
        website,
        companySize: companySize || '1-10',
        location: location || 'Remote',
        foundedYear: foundedYear ? Number(foundedYear) : null,
        cultureDescription: cultureDescription || null,
        benefits: parsedBenefits || [],
        socialLinks: parsedSocialLinks || {},
        logoUrl,
      });
    } else {
      if (companyName) company.companyName = companyName;
      if (industry) company.industry = industry;
      if (description !== undefined) company.description = description;
      if (website !== undefined) company.website = website;
      if (companySize) company.companySize = companySize;
      if (location) company.location = location;
      if (foundedYear !== undefined) company.foundedYear = foundedYear ? Number(foundedYear) : null;
      if (cultureDescription !== undefined) company.cultureDescription = cultureDescription || null;
      if (parsedBenefits !== undefined) company.benefits = parsedBenefits;
      if (parsedSocialLinks !== undefined) company.socialLinks = parsedSocialLinks;
      if (logoUrl) company.logoUrl = logoUrl;

      await company.save();
    }

    res.status(200).json({
      success: true,
      message: 'Company profile updated successfully',
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadCompanyBanner = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No banner image file provided.' });
      return;
    }

    let company = await Company.findOne({ ownerId });
    const bannerImageUrl = await uploadBufferToCloudinary(
      req.file.buffer,
      'hirely/company-banners',
      req.file.originalname
    );

    if (!company) {
      company = await Company.create({
        ownerId,
        companyName: `${req.user?.fullName}'s Company`,
        industry: 'Technology',
        companySize: '1-10',
        location: 'Remote',
        bannerImageUrl,
      });
    } else {
      company.bannerImageUrl = bannerImageUrl;
      await company.save();
    }

    res.status(200).json({
      success: true,
      message: 'Banner image uploaded successfully',
      data: { bannerImageUrl, company },
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
    const skip = (page - 1) * limit;

    const company = await Company.findById(id);

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company profile not found.',
      });
      return;
    }

    const jobQuery = {
      companyId: company._id,
      status: 'active',
      postStatus: 'published',
    };

    const [activeJobs, activeJobsCount] = await Promise.all([
      Job.find(jobQuery)
        .populate('companyId', '_id companyName logoUrl isVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(jobQuery),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...company.toObject(),
        activeJobsCount,
        activeJobs,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(activeJobsCount / limit) || 1,
        totalCount: activeJobsCount,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};
