import { Response, NextFunction } from 'express';
import { JobSeekerProfile, Company, AIChatLog } from '../models';
import { AuthenticatedRequest } from '../types';
import {
  interpretJobSeekerQuery,
  interpretEmployerQuery,
  generateConversationalResponse,
} from '../services/ai.service';
import { searchJobsFromDatabase } from '../services/jobSearch.service';
import { searchCandidatesFromDatabase } from '../services/candidateSearch.service';

/**
 * 1. POST /api/assistant/job-seeker/chat
 * Handles AI chat queries for job seekers, translating intent to real MongoDB job queries.
 */
export const jobSeekerChatAssistant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { message, conversationHistory = [] } = req.body;

    if (!message || !String(message).trim()) {
      res.status(400).json({ success: false, message: 'Message content is required.' });
      return;
    }

    const profile = await JobSeekerProfile.findOne({ userId });
    const profileContext = profile
      ? {
          skills: profile.skills || [],
          experienceLevel: profile.experienceLevel || 'entry',
          location: profile.city || profile.country || undefined,
        }
      : undefined;

    // Step 1: Interpret user query via Groq AI
    const interpretation = await interpretJobSeekerQuery(
      String(message).trim(),
      profileContext,
      conversationHistory
    );

    // Step 2: Handle intent
    if (interpretation.intent === 'general_question') {
      const respText =
        interpretation.generalAnswer ||
        'Hello! I can help you search active job listings on Hirely by role, location, salary, or experience level. Try asking "show me remote React jobs"!';
      if (userId) {
        await AIChatLog.create({
          userId,
          role: 'job_seeker',
          userMessage: String(message).trim(),
          assistantResponse: respText,
          intent: 'general_question',
        }).catch((err) => console.error('AIChatLog create error:', err));
      }

      res.status(200).json({
        success: true,
        intent: 'general_question',
        responseText: respText,
        jobs: [],
      });
      return;
    }

    if (interpretation.intent === 'unclear') {
      const respText =
        interpretation.clarifyingQuestion ||
        'Could you please specify what job title, technology, or location you are interested in?';
      if (userId) {
        await AIChatLog.create({
          userId,
          role: 'job_seeker',
          userMessage: String(message).trim(),
          assistantResponse: respText,
          intent: 'unclear',
        }).catch((err) => console.error('AIChatLog create error:', err));
      }

      res.status(200).json({
        success: true,
        intent: 'unclear',
        responseText: respText,
        jobs: [],
      });
      return;
    }

    // Step 3: Run REAL MongoDB job search with AI-extracted filters
    const filters = interpretation.filters || {};
    const matchedJobs = await searchJobsFromDatabase(filters, 6);

    // Step 4: Generate conversational wrapper text
    const summarySnippet = matchedJobs
      .map((j) => `${j.title} at ${(j.companyId as any)?.companyName || 'Company'} (${j.jobType}, ${j.location})`)
      .join('; ');

    const responseText = await generateConversationalResponse(
      'job_search',
      matchedJobs.length,
      summarySnippet
    );

    if (userId) {
      await AIChatLog.create({
        userId,
        role: 'job_seeker',
        userMessage: String(message).trim(),
        assistantResponse: responseText,
        intent: 'search_jobs',
      }).catch((err) => console.error('AIChatLog create error:', err));
    }

    res.status(200).json({
      success: true,
      intent: 'search_jobs',
      responseText,
      jobs: matchedJobs,
      filtersUsed: filters,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/assistant/employer/chat
 * Handles AI chat queries for employers, translating intent to real candidate database queries.
 */
export const employerChatAssistant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { message, conversationHistory = [] } = req.body;

    if (!message || !String(message).trim()) {
      res.status(400).json({ success: false, message: 'Message content is required.' });
      return;
    }

    const company = await Company.findOne({ ownerId: userId });
    const companyContext = company
      ? { companyName: company.companyName, industry: company.industry }
      : undefined;

    // Step 1: Interpret employer query via Groq AI
    const interpretation = await interpretEmployerQuery(
      String(message).trim(),
      companyContext,
      conversationHistory
    );

    // Step 2: Handle intent
    if (interpretation.intent === 'general_question') {
      const respText =
        interpretation.generalAnswer ||
        'Hello! I can help you find real candidate profiles on Hirely by skills, experience, or location. Try asking "find me React developers in Karachi"!';
      if (userId) {
        await AIChatLog.create({
          userId,
          role: 'employer',
          userMessage: String(message).trim(),
          assistantResponse: respText,
          intent: 'general_question',
        }).catch((err) => console.error('AIChatLog create error:', err));
      }

      res.status(200).json({
        success: true,
        intent: 'general_question',
        responseText: respText,
        candidates: [],
      });
      return;
    }

    if (interpretation.intent === 'unclear') {
      const respText =
        interpretation.clarifyingQuestion ||
        'Could you please specify which candidate skills or job role you are looking to hire for?';
      if (userId) {
        await AIChatLog.create({
          userId,
          role: 'employer',
          userMessage: String(message).trim(),
          assistantResponse: respText,
          intent: 'unclear',
        }).catch((err) => console.error('AIChatLog create error:', err));
      }

      res.status(200).json({
        success: true,
        intent: 'unclear',
        responseText: respText,
        candidates: [],
      });
      return;
    }

    // Step 3: Run REAL candidate search in MongoDB
    const filters = interpretation.filters || {};
    const matchedCandidates = await searchCandidatesFromDatabase(userId!, filters, 6);

    // Step 4: Generate conversational wrapper text
    const summarySnippet = matchedCandidates
      .map((c) => `${c.fullName} (${c.experienceLevel}, skills: ${c.skills.slice(0, 3).join(', ')})`)
      .join('; ');

    const responseText = await generateConversationalResponse(
      'candidate_search',
      matchedCandidates.length,
      summarySnippet
    );

    if (userId) {
      await AIChatLog.create({
        userId,
        role: 'employer',
        userMessage: String(message).trim(),
        assistantResponse: responseText,
        intent: 'search_candidates',
      }).catch((err) => console.error('AIChatLog create error:', err));
    }

    res.status(200).json({
      success: true,
      intent: 'search_candidates',
      responseText,
      candidates: matchedCandidates,
      filtersUsed: filters,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. POST /api/admin/assistant/chat
 * Handles AI chat queries for admins, translating natural language questions into real MongoDB database aggregations.
 */
export const adminChatAssistant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !String(message).trim()) {
      res.status(400).json({ success: false, message: 'Message content is required.' });
      return;
    }

    const trimmedMsg = String(message).trim();

    // Import Admin AI interpretation and Database Aggregation engine
    const { interpretAdminQuery, generateAdminConversationalResponse } = await import('../services/ai.service');
    const { queryAdminDataFromDatabase } = await import('../services/adminDataQuery.service');

    // Step 1: Interpret query intent & parameters via Groq
    const interpretation = await interpretAdminQuery(trimmedMsg, conversationHistory);

    // Step 2: Handle general question / unclear
    if (interpretation.intent === 'general_question') {
      res.status(200).json({
        success: true,
        intent: 'general_question',
        responseText:
          interpretation.generalAnswer ||
          'Hello Admin! I can query real platform metrics across users, signups, jobs, applications, verifications, and subscriptions. Try asking "How many new employers signed up this week?" or "Which job got the most applications?".',
      });
      return;
    }

    if (interpretation.intent === 'unclear') {
      res.status(200).json({
        success: true,
        intent: 'unclear',
        responseText:
          interpretation.clarifyingQuestion ||
          'Could you please specify whether you want data on verifications, user signups, active jobs, or revenue stats?',
      });
      return;
    }

    // Step 3: Run REAL database query & aggregations
    const queryResult = await queryAdminDataFromDatabase(interpretation, trimmedMsg);

    // Step 4: Generate conversational wrapper text with exact numbers
    const responseText = await generateAdminConversationalResponse(
      interpretation.intent,
      queryResult.summarySnippet,
      trimmedMsg
    );

    res.status(200).json({
      success: true,
      intent: interpretation.intent,
      responseText,
      summarySnippet: queryResult.summarySnippet,
      dataPoints: queryResult.dataPoints || {},
    });
  } catch (error) {
    next(error);
  }
};
