import { Response, NextFunction } from 'express';
import { extractText } from 'unpdf';
import { analyzeResume, generateCoverLetter } from '../services/ai.service';
import { extractTextFromPdfUrl } from '../utils/pdf.utils';
import { Job, JobSeekerProfile, User } from '../models';
import { AuthenticatedRequest } from '../types';

export const handleAnalyzeResume = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { resumeText, jobId } = req.body;
    const userId = req.user?.id;

    let targetResumeText = '';

    // Mode B: User pasted custom resume text directly
    if (resumeText && typeof resumeText === 'string' && resumeText.trim().length > 0) {
      targetResumeText = resumeText.trim();
    } else if (userId) {
      // Mode A: Fetch saved JobSeekerProfile
      const seekerProfile = await JobSeekerProfile.findOne({ userId });

      if (!seekerProfile || (!seekerProfile.resumeUrl && !seekerProfile.resumeText)) {
        res.status(400).json({
          success: false,
          message: 'No saved resume found in your profile. Please upload a resume PDF to your profile first, or paste your resume text below.',
        });
        return;
      }

      // Priority 1: Use pre-extracted resumeText from database if available
      if (seekerProfile.resumeText && seekerProfile.resumeText.trim().length >= 20) {
        targetResumeText = seekerProfile.resumeText.trim();
      } else if (seekerProfile.resumeUrl) {
        // Priority 2: Extract text from the saved PDF URL using unpdf
        targetResumeText = await extractTextFromPdfUrl(seekerProfile.resumeUrl);
        // Cache extracted text into profile for fast subsequent audits
        if (targetResumeText && targetResumeText.length >= 20) {
          seekerProfile.resumeText = targetResumeText;
          await seekerProfile.save();
        }
      }
    }

    if (!targetResumeText || targetResumeText.length < 20) {
      res.status(400).json({
        success: false,
        message: 'Could not extract valid text to analyze. Please paste your resume text directly.',
      });
      return;
    }

    let targetJobDescription: string | undefined;
    if (jobId) {
      const job = await Job.findById(jobId).populate<{ companyId: { companyName: string } }>('companyId');
      if (job) {
        targetJobDescription = `TITLE: ${job.title}\nLOCATION: ${job.location}\nEXPERIENCE: ${job.experienceLevel}\nSKILLS: ${job.skillsRequired.join(', ')}\nDESCRIPTION: ${job.description}`;
      }
    }

    const result = await analyzeResume(targetResumeText, targetJobDescription);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGenerateCoverLetter = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId, tone, resumeText } = req.body;
    const userId = req.user?.id;

    if (!jobId) {
      res.status(400).json({ success: false, message: 'jobId is required.' });
      return;
    }

    let targetResumeText = '';

    // Priority 1: If file was uploaded directly in this request (from apply modal file picker)
    if (req.file && req.file.buffer) {
      try {
        const { text } = await extractText(new Uint8Array(req.file.buffer));
        targetResumeText = Array.isArray(text) ? text.join('\n').trim() : String(text || '').trim();
      } catch {
        targetResumeText = '';
      }
    }

    // Priority 2: If resumeText string passed
    if (!targetResumeText && resumeText && typeof resumeText === 'string') {
      targetResumeText = resumeText.trim();
    }

    // Priority 3: Fetch saved profile resumeUrl using unpdf
    if (!targetResumeText && userId) {
      const seekerProfile = await JobSeekerProfile.findOne({ userId });
      if (seekerProfile?.resumeUrl) {
        try {
          targetResumeText = await extractTextFromPdfUrl(seekerProfile.resumeUrl);
        } catch {
          targetResumeText = '';
        }
      }
    }

    if (!targetResumeText || targetResumeText.length < 20) {
      res.status(400).json({
        success: false,
        message:
          'Please upload your resume first (either in the apply form above, or in your profile) so we can generate a personalized cover letter.',
      });
      return;
    }

    const job = await Job.findById(jobId).populate<{ companyId: { companyName: string } }>('companyId');
    if (!job) {
      res.status(404).json({ success: false, message: 'Job not found.' });
      return;
    }

    const userDoc = userId ? await User.findById(userId).select('fullName email phone location') : null;
    const seekerProfile = userId ? await JobSeekerProfile.findOne({ userId }).select('resumeUrl city country') : null;
    const seekerLocation = [seekerProfile?.city, seekerProfile?.country].filter(Boolean).join(', ');

    const candidateInfo = {
      fullName: userDoc?.fullName || 'Candidate',
      email: userDoc?.email || '',
      phone: userDoc?.phone || '',
      location: userDoc?.location || seekerLocation || '',
    };

    const companyName = job.companyId?.companyName || 'the hiring company';
    const coverLetter = await generateCoverLetter(
      targetResumeText,
      job.title,
      companyName,
      job.description,
      tone || 'formal',
      candidateInfo
    );

    res.status(200).json({
      success: true,
      data: { coverLetter },
    });
  } catch (error) {
    next(error);
  }
};
