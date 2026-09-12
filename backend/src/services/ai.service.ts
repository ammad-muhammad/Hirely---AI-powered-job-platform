import { groqClient } from '../config/groq';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export interface ATSAnalysisResult {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  improvementSuggestions: string[];
  summary: string;
}

export interface JobCandidateForMatching {
  _id: string;
  title: string;
  category: string;
  skillsRequired: string[];
  experienceLevel: string;
  jobType: string | string[];
  location: string;
  shortDescription: string;
}

export interface JobMatchResult {
  jobId: string;
  matchScore: number;
  matchReason: string;
}

export interface SuggestedTopic {
  topicName: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DomainAnalysisResult {
  detectedField: string;
  suggestedTopics: SuggestedTopic[];
}

export interface GeneratedQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GeneratedInterviewQuestion {
  questionText: string;
  category: 'behavioral' | 'technical' | 'situational';
}

export interface FinalInterviewFeedbackResult {
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  communicationClarity: number;
  technicalAccuracy: number | null;
  confidence: number;
  detailedFeedback: Array<{
    questionIndex: number;
    feedback: string;
    score: number;
  }>;
  summary: string;
}

export interface InterviewPrepGuideResult {
  commonQuestionTypes: Array<{
    category: 'technical' | 'behavioral' | 'situational';
    exampleQuestion: string;
  }>;
  quickTips: string[];
  encouragement: string;
}

export interface JobSeekerQueryInterpretation {
  intent: 'search_jobs' | 'general_question' | 'unclear';
  filters?: {
    keyword?: string;
    location?: string;
    jobType?: string;
    category?: string;
    experienceLevel?: string;
    salaryMin?: number;
    salaryMax?: number;
    postedWithinHours?: number;
    sortBy?: 'recent' | 'salary';
  };
  clarifyingQuestion?: string;
  generalAnswer?: string;
}

export interface EmployerQueryInterpretation {
  intent: 'search_candidates' | 'general_question' | 'unclear';
  filters?: {
    skills?: string[];
    experienceLevel?: string;
    location?: string;
    jobFieldCategory?: string;
  };
  clarifyingQuestion?: string;
  generalAnswer?: string;
}

export const analyzeResume = async (
  resumeText: string,
  targetJobDescription?: string
): Promise<ATSAnalysisResult> => {
  if (!config.groqApiKey) {
    throw new Error(
      'GROQ_API_KEY is missing! Please paste your free Groq API Key in backend/.env (GROQ_API_KEY=gsk_...) to get real AI resume analysis.'
    );
  }

  const systemPrompt = `You are an expert Applicant Tracking System (ATS) auditor and senior tech recruiter.
Analyze the candidate's resume text and evaluate its ATS compatibility, keyword alignment, formatting, and overall impact.
${targetJobDescription ? 'Tailor your analysis specifically against the provided target job description.' : ''}

You MUST return your response as STRICT JSON ONLY. Do NOT include markdown formatting, code fences (no \`\`\`json), or any preamble/postscript text.
Use exact JSON structure:
{
  "atsScore": number (integer between 0 and 100),
  "strengths": string[] (3-5 key points),
  "weaknesses": string[] (3-5 key points),
  "missingKeywords": string[] (array of important skills/keywords missing from resume),
  "formattingIssues": string[] (array of formatting/layout suggestions),
  "improvementSuggestions": string[] (3-5 actionable improvement recommendations),
  "summary": string (2-3 sentences overall verdict)
}`;

  const userContent = `RESUME TEXT:\n${resumeText}\n\n${
    targetJobDescription ? `TARGET JOB DESCRIPTION:\n${targetJobDescription}` : ''
  }`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';

    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: ATSAnalysisResult = JSON.parse(cleanedContent);

    return {
      atsScore: typeof parsed.atsScore === 'number' ? Math.min(100, Math.max(0, parsed.atsScore)) : 75,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
      formattingIssues: Array.isArray(parsed.formattingIssues) ? parsed.formattingIssues : [],
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
      summary: parsed.summary || 'Resume analysis completed successfully.',
    };
  } catch (err: unknown) {
    let lastErrorMsg = '';
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      lastErrorMsg = axiosErr.response?.data?.error?.message || String(err);
    } else if (err instanceof Error) {
      lastErrorMsg = err.message;
    }
    logger.error(`[Groq AI Analysis Error]: ${lastErrorMsg}`);
    throw new Error(`Real AI Analysis Error from Groq: ${lastErrorMsg || 'Please check your GROQ_API_KEY in backend/.env'}`);
  }
};

export const sanitizeCoverLetter = (
  rawText: string,
  candidateInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
  }
): string => {
  let cleaned = rawText;

  const name = candidateInfo?.fullName || 'Candidate';
  const email = candidateInfo?.email || '';
  const phone = candidateInfo?.phone || '';

  // 1. Replace common bracketed placeholders with real candidate info
  cleaned = cleaned.replace(/\[\s*(your\s+)?(full\s+)?name\s*\]/gi, name);
  cleaned = cleaned.replace(/\[\s*(your\s+)?(candidate\s+)?name\s*\]/gi, name);
  cleaned = cleaned.replace(/\[\s*(your\s+)?email(\s+address)?\s*\]/gi, email);
  cleaned = cleaned.replace(/\[\s*(your\s+)?phone(\s+number)?\s*\]/gi, phone);
  cleaned = cleaned.replace(/\[\s*(your\s+)?location\s*\]/gi, candidateInfo?.location || '');

  // 2. Remove formal header placeholder lines
  cleaned = cleaned
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (
        /^\[\s*(street\s+)?address\s*\]$/i.test(trimmed) ||
        /^\[\s*city,?\s*state\s+zip\s*\]$/i.test(trimmed) ||
        /^\[\s*date\s*\]$/i.test(trimmed) ||
        /^\[\s*hiring\s+manager('s)?\s+name\s*\]$/i.test(trimmed) ||
        /^\[\s*company\s+address\s*\]$/i.test(trimmed) ||
        /^\[\s*current\s+company\s*\]$/i.test(trimmed)
      ) {
        return false;
      }
      return true;
    })
    .join('\n');

  // 3. Strip any remaining bracketed placeholders
  cleaned = cleaned.replace(/\[[A-Za-z0-9_\s,.\-/]+\]/g, '').replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
};

export const generateCoverLetter = async (
  resumeText: string,
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  tone: 'formal' | 'friendly' | 'confident' = 'formal',
  candidateInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
  }
): Promise<string> => {
  if (!config.groqApiKey) {
    throw new Error(
      'GROQ_API_KEY is missing! Please paste your free Groq API Key in backend/.env (GROQ_API_KEY=gsk_...) to generate AI cover letters.'
    );
  }

  const name = candidateInfo?.fullName || 'the candidate';
  const email = candidateInfo?.email || '';
  const phone = candidateInfo?.phone || '';
  const location = candidateInfo?.location || '';

  const systemPrompt = `You are a professional career counselor and expert technical copywriter.
Write a highly compelling, personalized, and modern cover letter (220-320 words) for candidate ${name} applying to ${companyName} for the ${jobTitle} role.
Use a ${tone.toUpperCase()} tone of voice.

CRITICAL FORMATTING & NO-PLACEHOLDER RULES:
1. DO NOT include any formal postal letter-header block at the top (DO NOT write mailing addresses, DO NOT write date lines like [Date] or [City, State ZIP] or [Current Company]).
2. Start DIRECTLY with a professional greeting, e.g. "Dear Hiring Team at ${companyName}," or "Dear Hiring Manager,".
3. Use candidate ${name}'s actual details naturally in the content. Candidate email: ${email}, Phone: ${phone}, Location: ${location}.
4. Conclude with a warm, professional signature block at the bottom using the candidate's real name (${name}) and contact details (${email}${phone ? ` | ${phone}` : ''}).
5. STRICT ZERO-PLACEHOLDER RULE: Absolutely NEVER use bracketed placeholder tokens (such as [Your Name], [Address], [City, State ZIP], [Date], [Phone], [Email], [Company Name], etc.). Every detail MUST be real and filled in naturally.
6. Return PLAIN TEXT ONLY. Do NOT output JSON, markdown fences, or conversational preambles.`;

  const userContent = `CANDIDATE INFORMATION:
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Location: ${location || 'Not provided'}

CANDIDATE RESUME / PROFILE SUMMARY:
${resumeText}

TARGET JOB DETAILS:
Job Title: ${jobTitle}
Company Name: ${companyName}
Job Description:
${jobDescription}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    let coverLetter = response.data?.choices?.[0]?.message?.content || '';
    if (coverLetter.trim()) {
      coverLetter = sanitizeCoverLetter(coverLetter, candidateInfo);
      return coverLetter.trim();
    }
    throw new Error('Groq returned empty response for cover letter');
  } catch (err: unknown) {
    let lastErrorMsg = '';
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      lastErrorMsg = axiosErr.response?.data?.error?.message || String(err);
    } else if (err instanceof Error) {
      lastErrorMsg = err.message;
    }
    logger.error(`[Groq Cover Letter Error]: ${lastErrorMsg}`);
    throw new Error(`Real AI Cover Letter Generation Error: ${lastErrorMsg || 'Please check your GROQ_API_KEY in backend/.env'}`);
  }
};

export const matchJobsToProfile = async (
  profileData: {
    skills: string[];
    verifiedSkills?: string[];
    bio?: string;
    desiredJobTitles?: string[];
    targetJobTitles?: string[];
    targetSkills?: string[];
    experienceLevel?: string;
    education?: string;
    resumeText?: string;
  },
  candidateJobs: JobCandidateForMatching[]
): Promise<JobMatchResult[]> => {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is missing!');
  }

  if (!candidateJobs || candidateJobs.length === 0) {
    return [];
  }

  const hasTargetTitles = profileData.targetJobTitles && profileData.targetJobTitles.length > 0;
  const hasTargetSkills = profileData.targetSkills && profileData.targetSkills.length > 0;

  const systemPrompt = `You are an expert AI talent-matching algorithm and senior technical recruiter.
Analyze the job seeker's profile (skills, verified skills, desired job titles, bio, and resume) against available job openings.

STRICT DOMAIN & SKILL MATCHING RULES:
1. FIELD & DOMAIN RELEVANCE: ONLY match jobs that directly belong to or strongly overlap with the candidate's career domain (e.g. Software/Engineering candidates MUST ONLY match Tech/Software jobs; Finance candidates MUST ONLY match Finance jobs; Healthcare candidates MUST ONLY match Healthcare jobs).
2. CROSS-DOMAIN DISQUALIFICATION: Assign matchScore < 20 for cross-domain mismatches (e.g., assigning a Software Engineer to a Financial Analyst, Corporate Tax Accountant, or Investment Banker is STRICTLY WRONG and FORBIDDEN).
${hasTargetTitles ? `3. EXPLICIT TARGET TITLE PREFERENCE: The candidate has specified explicit Target Job Titles: ${profileData.targetJobTitles?.join(', ')}. Prioritize jobs whose title semantically matches or aligns with at least one of these target job titles (e.g. 'Frontend Developer' matches 'React Developer', 'Web Engineer', etc.). Assign lower scores (< 50) to jobs whose titles have no semantic relationship to these target titles.` : ''}
${hasTargetSkills ? `4. EXPLICIT TARGET SKILLS PREFERENCE: The candidate has specified explicit Target Skills: ${profileData.targetSkills?.join(', ')}. Prioritize jobs requiring these specific skills over general skills.` : ''}
5. Evaluate a matchScore (integer from 0 to 100) and provide a concise, high-value matchReason (1 short sentence explicitly naming overlapping skills or career domain alignment).
6. STRICT MINIMUM RELEVANCE THRESHOLD: Return ONLY jobs with matchScore >= 70. If a job score is below 70, DO NOT include it in the returned array!
7. NO LIST PADDING: Do NOT invent or lower thresholds to hit a target count. If only 1 or 2 jobs clear the >= 70 relevance bar, return only those 1 or 2. If 0 jobs qualify, return an empty array [].

You MUST return your response as STRICT JSON ONLY. Do NOT include markdown code fences.
Return a JSON array of objects:
[
  { "jobId": "string", "matchScore": number, "matchReason": "string" }
]`;

  const userContent = `CANDIDATE PROFILE:
${hasTargetTitles ? `Explicit Target Job Titles: ${profileData.targetJobTitles?.join(', ')}` : ''}
${hasTargetSkills ? `Explicit Target Skills: ${profileData.targetSkills?.join(', ')}` : ''}
General Skills: ${profileData.skills.join(', ')}
Verified Skills: ${(profileData.verifiedSkills || []).join(', ') || 'None'}
Desired Titles: ${(profileData.desiredJobTitles || []).join(', ') || 'None'}
Experience Level: ${profileData.experienceLevel || 'Not specified'}
Education: ${profileData.education || 'Not specified'}
Bio: ${profileData.bio || 'Not specified'}
${profileData.resumeText ? `Resume Extract: ${profileData.resumeText.slice(0, 500)}` : ''}

AVAILABLE JOBS TO EVALUATE (${candidateJobs.length} jobs):
${JSON.stringify(
  candidateJobs.map((j) => ({
    jobId: j._id,
    title: j.title,
    category: j.category,
    skillsRequired: j.skillsRequired,
    experienceLevel: j.experienceLevel,
    jobType: j.jobType,
    location: j.location,
    snippet: j.shortDescription,
  })),
  null,
  2
)}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';

    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: JobMatchResult[] = JSON.parse(cleanedContent);

    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item.jobId && typeof item.matchScore === 'number' && item.matchScore >= 70)
        .sort((a, b) => b.matchScore - a.matchScore);
    }
    return [];
  } catch (err: unknown) {
    let lastErrorMsg = '';
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      lastErrorMsg = axiosErr.response?.data?.error?.message || String(err);
    } else if (err instanceof Error) {
      lastErrorMsg = err.message;
    }
    logger.error(`[Groq AI Job Matching Error]: ${lastErrorMsg}`);
    throw new Error(`AI Job Matching Error: ${lastErrorMsg}`);
  }
};

export const analyzeAndGenerateSkillTests = async (
  profileData: {
    skills: string[];
    bio?: string;
    experienceLevel?: string;
    education?: string;
  },
  resumeText: string | null
): Promise<DomainAnalysisResult> => {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is missing in environment config');
  }

  const hasSkills = profileData.skills && profileData.skills.length > 0;
  const hasResume = Boolean(resumeText && resumeText.trim().length > 20);

  if (!hasSkills && !hasResume) {
    return {
      detectedField: 'General Professional',
      suggestedTopics: [],
    };
  }

  const systemPrompt = `You are an expert global talent assessment strategist and professional career domain classifier.

INSTRUCTIONS:
1. Deeply analyze the candidate's skills, bio, education, and resume text to identify their primary professional field/domain.
   The field can be ANYTHING in the global job market — e.g. "Finance & Accounting", "Mobile App Development", "Healthcare & Clinical Nursing", "Legal & Corporate Compliance", "Backend Cloud Architecture", "Business Development & Sales", "Digital Marketing", "UI/UX Product Design", "Human Resource Management", etc. Do NOT restrict to any predefined list!
2. Based on their detected field, determine 3 to 6 specific, relevant skill topics that this candidate should be tested on to verify their technical or professional competency.

Return STRICT JSON ONLY. Do NOT include markdown code fences (no \`\`\`json).
Return exact structure:
{
  "detectedField": "string (e.g. Finance & Investment)",
  "suggestedTopics": [
    {
      "topicName": "string (clear specific skill name, e.g. Financial Accounting)",
      "category": "string (broader category, e.g. Finance)",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`;

  const userContent = `CANDIDATE BACKGROUND:
Skills: ${hasSkills ? profileData.skills.join(', ') : 'None listed'}
Experience Level: ${profileData.experienceLevel || 'Not specified'}
Education: ${profileData.education || 'Not specified'}
Bio: ${profileData.bio || 'Not specified'}
${hasResume ? `Resume Text Snippet:\n${resumeText!.slice(0, 3000)}` : 'No resume uploaded'}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: DomainAnalysisResult = JSON.parse(cleanedContent);

    if (parsed && parsed.detectedField && Array.isArray(parsed.suggestedTopics)) {
      const validTopics = parsed.suggestedTopics
        .filter((t) => t.topicName && t.category)
        .slice(0, 6);
      return {
        detectedField: parsed.detectedField,
        suggestedTopics: validTopics,
      };
    }
    return {
      detectedField: 'General Professional',
      suggestedTopics: [],
    };
  } catch (err) {
    logger.error(`[analyzeAndGenerateSkillTests Error]:`, err);
    return {
      detectedField: 'General Professional',
      suggestedTopics: [],
    };
  }
};

const isValidQuestionSet = (questions: any[]): boolean => {
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.every(
    (q) =>
      q &&
      typeof q.questionText === 'string' &&
      q.questionText.trim().length > 5 &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every((opt: any) => typeof opt === 'string' && opt.trim().length > 0) &&
      typeof q.correctOptionIndex === 'number' &&
      q.correctOptionIndex >= 0 &&
      q.correctOptionIndex <= 3
  );
};

export const generateTestQuestions = async (
  topicName: string,
  category: string,
  experienceLevel: 'entry' | 'mid' | 'senior' = 'mid'
): Promise<GeneratedQuestion[]> => {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is missing');
  }

  const levelGuidance =
    experienceLevel === 'entry'
      ? 'Target an ENTRY-LEVEL candidate (0-2 years experience). Focus on core foundational concepts, syntax, fundamental terms, and basic scenarios.'
      : experienceLevel === 'senior'
      ? 'Target a SENIOR-LEVEL candidate (5+ years experience). Focus on advanced high-level architecture, edge cases, system optimization, concurrency, scalability trade-offs, and complex real-world scenarios. Make questions challenging and rigorous.'
      : 'Target a MID-LEVEL candidate (3-5 years experience). Focus on practical engineering workflows, design patterns, troubleshooting, and intermediate-to-advanced technical scenarios.';

  const systemPrompt = `You are an expert technical interviewer creating an in-depth technical assessment for the skill: "${topicName}" in the category: "${category}".

CANDIDATE TARGET EXPERIENCE LEVEL: ${experienceLevel.toUpperCase()}
${levelGuidance}

INSTRUCTIONS:
1. Generate EXACTLY 25 high-quality, practical multiple-choice questions for "${topicName}".
2. Each question MUST have EXACTLY 4 distinct option strings in the "options" array.
3. "correctOptionIndex" MUST be an integer from 0 to 3 matching the correct option in the "options" array. CRITICAL: Distribute correctOptionIndex randomly across 0, 1, 2, and 3. Do NOT default Option A as the correct answer.
4. Include a clear 1-sentence "explanation" for why that option is correct.
5. Provide a realistic mix of questions appropriate for a ${experienceLevel}-level candidate.

Return STRICT JSON ONLY. Do NOT include markdown code fences (no \`\`\`json).
Return an array of 25 objects matching this structure:
[
  {
    "questionText": "string (the question prompt)",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": number (0, 1, 2, or 3),
    "explanation": "string",
    "difficulty": "easy" | "medium" | "hard"
  }
]`;

  const userContent = `Generate 25 multiple choice questions for topic: "${topicName}" (Category: "${category}").`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await groqClient.post('chat/completions', {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 6000,
      });

      const rawContent = response.data?.choices?.[0]?.message?.content || '';
      const cleanedContent = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed: GeneratedQuestion[] = JSON.parse(cleanedContent);

      if (isValidQuestionSet(parsed)) {
        // Shuffle options for each generated question to eliminate any A-option bias
        return parsed.map((q) => {
          const originalOptions = [...q.options];
          const correctText = originalOptions[q.correctOptionIndex];

          const shuffledOpts = [...originalOptions];
          for (let i = shuffledOpts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOpts[i], shuffledOpts[j]] = [shuffledOpts[j], shuffledOpts[i]];
          }

          const newIdx = correctText ? shuffledOpts.indexOf(correctText) : q.correctOptionIndex;
          return {
            ...q,
            options: shuffledOpts,
            correctOptionIndex: newIdx >= 0 ? newIdx : q.correctOptionIndex,
          };
        });
      }
      logger.warn(`[generateTestQuestions] Attempt ${attempt} failed question validation. Retrying...`);
    } catch (err) {
      logger.warn(`[generateTestQuestions] Attempt ${attempt} error:`, err);
    }
  }

  throw new Error(`Failed to generate 25 valid assessment questions for topic "${topicName}".`);
};

export const generateInterviewQuestion = async (
  targetField: string,
  experienceLevel: string = 'mid',
  previousQA: Array<{ questionText: string; answerText: string }> = [],
  questionNumber: number = 1
): Promise<GeneratedInterviewQuestion> => {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is missing!');
  }

  let questionFocus = '';
  if (questionNumber === 1) {
    questionFocus = 'Focus on an introductory / background question (e.g. asking about candidate experience, role motivation, or past projects in this field).';
  } else if (questionNumber >= 2 && questionNumber <= 4) {
    questionFocus = 'Focus on role-specific technical principles, problem-solving skills, architecture, or core domain concepts for this field.';
  } else {
    questionFocus = 'Focus on a realistic behavioral or situational scenario (e.g., handling trade-offs, team conflicts, tight deadlines, or failure/learning).';
  }

  const systemPrompt = `You are an experienced, professional senior interviewer and hiring manager in the field of: "${targetField}".
You are conducting a formal 1-on-1 text interview for a ${experienceLevel.toUpperCase()}-level candidate.

INSTRUCTIONS:
1. Generate EXACTLY ONE realistic, highly relevant interview question for Question #${questionNumber} of 6.
2. ${questionFocus}
3. Review any previous Q&A pairs provided to ensure questions build naturally upon past answers without repeating any concepts.
4. Categorize the question as 'behavioral', 'technical', or 'situational'.

Return STRICT JSON ONLY. Do NOT include markdown code fences (no \`\`\`json).
Return exact structure:
{
  "questionText": "string (the interview question)",
  "category": "behavioral" | "technical" | "situational"
}`;

  const userContent = `TARGET FIELD: ${targetField}
CANDIDATE LEVEL: ${experienceLevel}
QUESTION NUMBER: ${questionNumber} of 6

${previousQA.length > 0 ? `PREVIOUS INTERVIEW Q&A:\n${JSON.stringify(previousQA, null, 2)}` : 'First question of the interview.'}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedContent);
    const validCategories = ['behavioral', 'technical', 'situational'];
    const category = validCategories.includes(parsed.category) ? parsed.category : 'technical';

    return {
      questionText: parsed.questionText || `Can you explain your core experience as a ${targetField}?`,
      category,
    };
  } catch (err) {
    logger.error('[generateInterviewQuestion Error]:', err);
    return {
      questionText: `Can you walk me through a key project or technical challenge you handled as a ${targetField}?`,
      category: 'behavioral',
    };
  }
};

export const generateFinalInterviewFeedback = async (
  targetField: string,
  allQuestionsAndAnswers: Array<{
    questionIndex: number;
    questionText: string;
    category: string;
    answerText: string;
  }>
): Promise<FinalInterviewFeedbackResult> => {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is missing!');
  }

  const systemPrompt = `You are a senior executive hiring manager and top career coach evaluating a completed candidate mock interview for the field: "${targetField}".

INSTRUCTIONS:
1. Thoroughly analyze the full candidate interview transcript.
2. Evaluate overall performance, technical accuracy, communication clarity, and confidence based on their answer quality.
3. Provide:
   - overallScore: Integer 0 to 100.
   - strengths: Array of 3 to 5 concise, specific positive highlights observed in their answers.
   - areasForImprovement: Array of 3 to 5 actionable, constructive recommendations.
   - communicationClarity: Integer 0 to 100.
   - technicalAccuracy: Integer 0 to 100 (or null if the field is purely non-technical).
   - confidence: Integer 0 to 100 based on tone and answer structure.
   - detailedFeedback: Array of objects for EACH question with questionIndex (0 to 5), score (0-100), and feedback (2-3 sentences explaining strengths & missing points in that specific response).
   - summary: A comprehensive final verdict paragraph (3-5 sentences) summarizing their performance and readiness for real hiring manager rounds in "${targetField}".

Return STRICT JSON ONLY. Do NOT include markdown code fences (no \`\`\`json).
Return exact structure matching:
{
  "overallScore": number,
  "strengths": ["string"],
  "areasForImprovement": ["string"],
  "communicationClarity": number,
  "technicalAccuracy": number | null,
  "confidence": number,
  "detailedFeedback": [
    { "questionIndex": number, "feedback": "string", "score": number }
  ],
  "summary": "string"
}`;

  const userContent = `TARGET FIELD: ${targetField}
INTERVIEW TRANSCRIPT (${allQuestionsAndAnswers.length} Q&A Pairs):
${JSON.stringify(allQuestionsAndAnswers, null, 2)}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedContent);

    return {
      overallScore: typeof parsed.overallScore === 'number' ? Math.min(100, Math.max(0, parsed.overallScore)) : 75,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Good overall communication', 'Relevant domain awareness'],
      areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : ['Provide more specific metrics in technical answers'],
      communicationClarity: typeof parsed.communicationClarity === 'number' ? Math.min(100, Math.max(0, parsed.communicationClarity)) : 80,
      technicalAccuracy: typeof parsed.technicalAccuracy === 'number' ? Math.min(100, Math.max(0, parsed.technicalAccuracy)) : 75,
      confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 75,
      detailedFeedback: Array.isArray(parsed.detailedFeedback) ? parsed.detailedFeedback : [],
      summary: parsed.summary || 'Solid overall interview performance.',
    };
  } catch (err) {
    logger.error('[generateFinalInterviewFeedback Error]:', err);
    throw new Error('Failed to generate final interview feedback from AI.');
  }
};

export const generateInterviewPrepGuide = async (
  targetField: string,
  experienceLevel: 'entry' | 'mid' | 'senior' = 'mid'
): Promise<InterviewPrepGuideResult> => {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is missing!');
  }

  const systemPrompt = `You are an encouraging, expert career coach helping a job candidate prepare for an upcoming interview.
Your goal is to provide a concise, highly practical, and encouraging interview preparation guide tailored to the candidate's target field: "${targetField}" and experience level: "${experienceLevel}".

INSTRUCTIONS:
1. Provide "commonQuestionTypes": array of 3 to 4 objects. Each object must have "category" ('technical', 'behavioral', or 'situational') and a realistic "exampleQuestion" tailored to "${targetField}".
2. Provide "quickTips": array of 4 to 5 short, actionable, high-impact preparation tips (e.g. STAR methodology explanation, structuring technical answers, avoiding common pitfalls).
3. Provide "encouragement": a warm, uplifting 2-3 sentence confidence booster to reassure nervous or first-time candidates.

Return STRICT JSON ONLY. Do NOT include markdown code fences (no \`\`\`json).
Use exact JSON structure:
{
  "commonQuestionTypes": [
    { "category": "technical", "exampleQuestion": "string" },
    { "category": "behavioral", "exampleQuestion": "string" },
    { "category": "situational", "exampleQuestion": "string" }
  ],
  "quickTips": ["string"],
  "encouragement": "string"
}`;

  const userContent = `TARGET FIELD: ${targetField}\nEXPERIENCE LEVEL: ${experienceLevel}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: InterviewPrepGuideResult = JSON.parse(cleanedContent);

    return {
      commonQuestionTypes: Array.isArray(parsed.commonQuestionTypes) && parsed.commonQuestionTypes.length > 0
        ? parsed.commonQuestionTypes
        : [
            { category: 'technical', exampleQuestion: `What core principles do you apply when building a system in ${targetField}?` },
            { category: 'behavioral', exampleQuestion: `Tell me about a challenging project in ${targetField} and how you handled trade-offs.` },
            { category: 'situational', exampleQuestion: `How would you prioritize competing deadlines under tight project schedules?` },
          ],
      quickTips: Array.isArray(parsed.quickTips) && parsed.quickTips.length > 0
        ? parsed.quickTips
        : [
            "Use the STAR method (Situation, Task, Action, Result) to structure behavioral answers cleanly.",
            "Break down technical responses logically, mentioning specific tools, metrics, and trade-offs.",
            "Take 5 seconds before answering to structure your thoughts clearly instead of rushing.",
            "Focus on your specific individual contributions when describing team achievements."
          ],
      encouragement: parsed.encouragement || `Preparing for your ${targetField} interview is the single best step to building confidence. Take a deep breath, rely on your skills, and treat this session as a supportive environment to practice and refine your answers!`,
    };
  } catch (err) {
    logger.error('[generateInterviewPrepGuide Error]:', err);
    return {
      commonQuestionTypes: [
        { category: 'technical', exampleQuestion: `What are the core technical concepts and tools you rely on in ${targetField}?` },
        { category: 'behavioral', exampleQuestion: `Describe a scenario where you faced an unexpected issue in ${targetField} and resolved it.` },
        { category: 'situational', exampleQuestion: `How do you handle feedback or technical disagreements on project approaches?` },
      ],
      quickTips: [
        "Structure behavioral responses using STAR (Situation, Task, Action, Result).",
        "Be clear about your exact personal role and technical choices.",
        "It's completely okay to pause briefly to organize your thoughts before speaking.",
        "Emphasize metrics, outcomes, and lessons learned from past experience."
      ],
      encouragement: `You've got this! Practice is all about building familiarity and confidence. Review these tips, take a deep breath, and start your mock interview when you're ready!`,
    };
  }
};

/**
 * 1. interpretJobSeekerQuery
 * Interprets job seeker chat query to extract structured search filters or general answer.
 */
export const interpretJobSeekerQuery = async (
  userMessage: string,
  profileContext?: { skills?: string[]; experienceLevel?: string; location?: string },
  conversationHistory: Array<{ sender: string; text: string }> = []
): Promise<JobSeekerQueryInterpretation> => {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is missing!');
  }

  const systemPrompt = `You are Hirely's AI Job Search Assistant. Your sole job is to interpret a job seeker's query and extract structured search parameters to query the database, OR answer general platform/greeting questions.

INSTRUCTIONS:
1. Determine the intent:
   - "search_jobs": User is looking for jobs, e.g. "show me remote React jobs", "jobs in Karachi paying above 100k", "posted in the last 24 hours", "jobs matching my profile", "show me only the remote ones from that list".
   - "general_question": User asks a greeting or general question about how Hirely works or what you can do (e.g. "hi", "who are you", "how do I apply").
   - "unclear": User query is confusing, ambiguous, or lacks key information.

2. If intent is "search_jobs", extract search filters into "filters":
   - "keyword": Main role or technology (e.g., "React", "Data Analyst", "Python").
   - "location": City or country (e.g., "Karachi", "Lahore", "Pakistan").
   - "jobType": "remote" | "full-time" | "part-time" | "contract" | "internship". If user mentions "remote", set jobType to "remote".
   - "category": Broad field e.g. "Software Engineering", "Marketing", "Finance".
   - "experienceLevel": "entry" | "mid" | "senior" | "executive".
   - "salaryMin": minimum salary number if mentioned (e.g. 100000).
   - "salaryMax": maximum salary number if mentioned.
   - "postedWithinHours": integer hours e.g. 24 for "today/last 24 hours", 168 for "this week/last 7 days".
   - "sortBy": "recent" | "salary".

3. If intent is "unclear", provide a short, polite "clarifyingQuestion" (e.g., "Could you specify what job title or location you are interested in?").
4. If intent is "general_question", provide a friendly, concise "generalAnswer" (1-2 sentences).

Return STRICT JSON ONLY. Do NOT include markdown code fences (no \`\`\`json).
Structure:
{
  "intent": "search_jobs" | "general_question" | "unclear",
  "filters": {
    "keyword": "string",
    "location": "string",
    "jobType": "string",
    "category": "string",
    "experienceLevel": "string",
    "salaryMin": number,
    "salaryMax": number,
    "postedWithinHours": number,
    "sortBy": "recent" | "salary"
  },
  "clarifyingQuestion": "string",
  "generalAnswer": "string"
}`;

  const userContent = `JOB SEEKER PROFILE CONTEXT:
${profileContext ? JSON.stringify(profileContext) : 'None'}

CONVERSATION HISTORY:
${conversationHistory.length > 0 ? JSON.stringify(conversationHistory) : 'None'}

USER MESSAGE: "${userMessage}"`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: JobSeekerQueryInterpretation = JSON.parse(cleanedContent);
    return parsed;
  } catch (err) {
    logger.error('[interpretJobSeekerQuery Error]:', err);
    return {
      intent: 'search_jobs',
      filters: { keyword: userMessage },
    };
  }
};

/**
 * 2. interpretEmployerQuery
 * Interprets employer chat query to extract candidate search filters or general answer.
 */
export const interpretEmployerQuery = async (
  userMessage: string,
  employerCompanyInfo?: { companyName?: string; industry?: string },
  conversationHistory: Array<{ sender: string; text: string }> = []
): Promise<EmployerQueryInterpretation> => {
  if (!config.groqApiKey) {
    throw new Error('GROQ_API_KEY is missing!');
  }

  const systemPrompt = `You are Hirely's AI Candidate Search Assistant for employers. Your job is to interpret an employer's query and extract structured search parameters to query the candidate database.

INSTRUCTIONS:
1. Determine intent:
   - "search_candidates": Employer is looking for talent (e.g. "find React developers in Karachi", "senior backend engineers with Node.js", "candidates with 3+ years experience").
   - "general_question": Employer asks a greeting or general question about posting jobs or platform features.
   - "unclear": Query is ambiguous or incomplete.

2. If intent is "search_candidates", extract search filters into "filters":
   - "skills": Array of skill strings e.g. ["React", "TypeScript", "Node.js"].
   - "experienceLevel": "entry" | "mid" | "senior" | "executive".
   - "location": City or country e.g. "Karachi", "Lahore", "Pakistan".
   - "jobFieldCategory": Domain field e.g. "Software Engineering", "Finance", "Marketing".

3. If intent is "unclear", provide a short, helpful "clarifyingQuestion".
4. If intent is "general_question", provide a friendly "generalAnswer".

Return STRICT JSON ONLY. Do NOT include markdown code fences (no \`\`\`json).
Structure:
{
  "intent": "search_candidates" | "general_question" | "unclear",
  "filters": {
    "skills": ["string"],
    "experienceLevel": "string",
    "location": "string",
    "jobFieldCategory": "string"
  },
  "clarifyingQuestion": "string",
  "generalAnswer": "string"
}`;

  const userContent = `EMPLOYER COMPANY CONTEXT:
${employerCompanyInfo ? JSON.stringify(employerCompanyInfo) : 'None'}

CONVERSATION HISTORY:
${conversationHistory.length > 0 ? JSON.stringify(conversationHistory) : 'None'}

USER MESSAGE: "${userMessage}"`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: EmployerQueryInterpretation = JSON.parse(cleanedContent);
    return parsed;
  } catch (err) {
    logger.error('[interpretEmployerQuery Error]:', err);
    return {
      intent: 'search_candidates',
      filters: { skills: [userMessage] },
    };
  }
};

/**
 * 3. generateConversationalResponse
 * Generates a natural, friendly 1-2 sentence intro wrapper text presenting REAL database results.
 * NOTE: The AI ONLY generates wrapper text; actual job/candidate details come strictly from MongoDB!
 */
export const generateConversationalResponse = async (
  queryType: 'job_search' | 'candidate_search',
  resultsCount: number,
  resultsSummarySnippet: string
): Promise<string> => {
  if (!config.groqApiKey) {
    return resultsCount > 0
      ? `Here are ${resultsCount} real matching results found in the database:`
      : `No matching results were found in our database for those criteria.`;
  }

  const systemPrompt = `You are a friendly, concise AI assistant for Hirely job portal.
Write a brief, natural 1-2 sentence introductory response to present the REAL database search results to the user.

CRITICAL SAFETY RULE: Do NOT invent, make up, or list any fake jobs or candidate names yourself. The real result cards will be rendered directly by the application frontend. You are only writing the friendly introductory line!`;

  const userContent = `SEARCH TYPE: ${queryType}
RESULTS COUNT: ${resultsCount}
SUMMARY SNIPPET OF REAL MONGODB RESULTS: ${resultsSummarySnippet}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 256,
    });

    const wrapperText = response.data?.choices?.[0]?.message?.content || '';
    if (wrapperText.trim()) {
      return wrapperText.trim();
    }
  } catch (err) {
    logger.warn('[generateConversationalResponse Error]:', err);
  }

  return resultsCount > 0
    ? `I found ${resultsCount} real ${queryType === 'job_search' ? 'job listings' : 'candidate profiles'} matching your request:`
    : `No matching ${queryType === 'job_search' ? 'jobs' : 'candidates'} were found in our database for those criteria. Try broadening your search!`;
};

export interface GeneratedAiJobPostingResult {
  status: 'complete' | 'needs_clarification';
  filledFields: {
    title?: string;
    workplaceType?: 'on_site' | 'remote' | 'hybrid';
    location?: string;
    hiringTimeline?: '1_3_days' | '3_7_days' | '1_2_weeks' | '2_4_weeks' | 'more_than_4_weeks';
    numberOfHires?: number;
    jobType?: string;
    expectedHours?: { type: 'fixed' | 'range'; fixedHours?: number; minHours?: number; maxHours?: number } | null;
    contractDuration?: { length: number; unit: 'days' | 'weeks' | 'months' } | null;
    payShowBy?: 'range' | 'exact' | 'starting_at' | 'maximum';
    salaryCurrency?: string;
    salaryMin?: number;
    salaryMax?: number;
    payRate?: 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year';
    salaryDisclosed?: boolean;
    category?: string;
    experienceLevel?: 'entry' | 'mid' | 'senior';
    description?: string;
    responsibilities?: string[];
    skillsRequired?: string[];
    screeningQuestions?: Array<{
      questionType: string;
      questionText?: string;
      specificFieldRequirement?: string;
      experienceYears?: number;
      experienceTitle?: string;
      educationLevel?: string;
      isDealBreaker: boolean;
    }>;
    applicationMethod?: 'platform' | 'email';
    requireResume?: boolean;
    candidatesCanContact?: boolean;
    applicationDeadline?: string;
  };
  clarifyingQuestion?: string;
}

/**
 * Strict rules-based checklist validator for job requisitions.
 * Validates extracted fields and user conversation history against required criteria.
 * Forces status = 'needs_clarification' if critical information is missing and turnCount < 2.
 */
function evaluateRequisitionCompleteness(
  briefDescription: string,
  conversationHistory: Array<{ sender: string; text: string }>,
  filledFields: GeneratedAiJobPostingResult['filledFields'],
  companyContext: { location?: string }
): { status: 'complete' | 'needs_clarification'; clarifyingQuestion?: string } {
  const assistantTurnCount = conversationHistory.filter((h) => h.sender === 'assistant').length;

  // If employer has already completed 2 rounds of clarification, proceed with best-effort defaults
  if (assistantTurnCount >= 2) {
    return { status: 'complete' };
  }

  const allUserText = [
    ...conversationHistory.filter((h) => h.sender === 'user').map((h) => h.text),
    briefDescription,
  ]
    .join(' ')
    .toLowerCase();

  const missingCategories: string[] = [];

  // 1. Salary / Compensation check
  const hasSalaryNumbers =
    /\b(\d+k|\d{2,7}|\$\d+|\b\d+\s*(lakh|lac|k|thousand|usd|pkr|rs|rupees))\b/i.test(allUserText) ||
    /salary|pay|remuneration|\$\d+|\d+\s*k|\d{4,}/i.test(allUserText);

  if (!hasSalaryNumbers) {
    missingCategories.push('target salary range (e.g. $80,000 - $120,000 or PKR 100k/month)');
  }

  // 2. Experience / Education / Qualification requirements check
  const hasQualificationMention =
    /\b(\d+\+?\s*(years?|yrs?)|experience|degree|bachelor|master|phd|diploma|certif|qualification|fsc|matric)\b/i.test(
      allUserText
    );

  if (!hasQualificationMention) {
    missingCategories.push('minimum required experience level or education degree requirements');
  }

  // 3. Job Type & Contract Duration check
  const isContractOrTemp =
    /contract|temporary/i.test(allUserText) ||
    filledFields.jobType === 'contract' ||
    filledFields.jobType === 'temporary' ||
    (Array.isArray(filledFields.jobType) && (filledFields.jobType.includes('contract') || filledFields.jobType.includes('temporary')));

  const hasJobTypeMention =
    /\b(full[- ]?time|part[- ]?time|contract|internship|temporary|freelance|commission|permanent|new[- ]?grad)\b/i.test(
      allUserText
    ) || Boolean(filledFields.jobType);

  if (!hasJobTypeMention) {
    missingCategories.push('employment type (e.g., full-time, part-time, or contract)');
  }

  if (isContractOrTemp) {
    const hasContractDuration =
      /\b(\d+\s*(months?|weeks?|days?|years?))\b/i.test(allUserText) || Boolean(filledFields.contractDuration);
    if (!hasContractDuration) {
      missingCategories.push('expected contract duration (e.g., 3 months, 6 months)');
    }
  }

  // 4. Workplace Type & Location check
  const hasWorkplaceTypeMention = /\b(remote|on[- ]?site|hybrid|work from home|wfh|office)\b/i.test(allUserText);
  const hasLocationMention = /\b(in|at|city|karachi|lahore|islamabad|rawalpindi|multan|peshawar|quetta|stuttgart|london|york|berlin|san francisco|dubai|toronto)\b/i.test(allUserText);

  if (!hasWorkplaceTypeMention && !hasLocationMention) {
    missingCategories.push('workplace location type (remote, hybrid, or on-site) and office city');
  } else if (/on[- ]?site|hybrid|office/i.test(allUserText) && !hasLocationMention && (!filledFields.location || filledFields.location === 'Location Not Specified' || filledFields.location === 'Remote')) {
    missingCategories.push('office city/location');
  }

  if (missingCategories.length > 0) {
    let questionText = '';
    if (missingCategories.length === 1) {
      questionText = `Could you please specify the ${missingCategories[0]} for this position?`;
    } else {
      const last = missingCategories.pop();
      questionText = `Could you please clarify the ${missingCategories.join(', ')}, as well as the ${last}?`;
    }

    return {
      status: 'needs_clarification',
      clarifyingQuestion: questionText,
    };
  }

  return { status: 'complete' };
}

/**
 * Parses an employer's natural language brief job description, company context, and chat history
 * into structured wizard fields or returns a single clarifying question if something critical is missing.
 */
export const generateJobPostingFromDescription = async (
  briefDescription: string,
  conversationHistory: Array<{ sender: string; text: string }> = [],
  companyContext: { companyName?: string; industry?: string; location?: string } = {}
): Promise<GeneratedAiJobPostingResult> => {
  const defaultDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (!config.groqApiKey) {
    return {
      status: 'complete',
      filledFields: {
        title: briefDescription.slice(0, 50) || 'Software Engineer',
        workplaceType: 'remote',
        location: companyContext.location || 'Remote',
        hiringTimeline: '1_2_weeks',
        numberOfHires: 1,
        jobType: 'full_time',
        payShowBy: 'range',
        salaryCurrency: 'USD',
        salaryMin: 50000,
        salaryMax: 80000,
        payRate: 'per_year',
        salaryDisclosed: true,
        category: 'Software Engineering',
        experienceLevel: 'mid',
        description: `<p>We are seeking a talented professional to join ${companyContext.companyName || 'our team'}. ${briefDescription}</p>`,
        responsibilities: ['Develop high quality solutions', 'Collaborate with cross-functional teams'],
        skillsRequired: ['Communication', 'Problem Solving'],
        applicationDeadline: defaultDeadline,
      },
    };
  }

  const systemPrompt = `You are an expert HR and recruiter AI assistant for Hirely job portal.
An employer is describing a job posting in natural language.
Company Context:
- Name: ${companyContext.companyName || 'Not specified'}
- Industry: ${companyContext.industry || 'Tech'}
- Default Location: ${companyContext.location || 'Remote'}

Your goal is to parse their description into structured JSON parameters for all 8 wizard steps.

CRITICAL RULES FOR GENERATING FIELDS:
1. "title": Concise professional title.
2. "workplaceType": 'on_site' | 'remote' | 'hybrid' (infer from context, default 'remote' if mentioned remote, or 'on_site').
3. "location": City, Country or 'Remote' (e.g. 'Karachi, Pakistan' or 'Remote').
4. "hiringTimeline": '1_3_days' | '3_7_days' | '1_2_weeks' | '2_4_weeks' | 'more_than_4_weeks' (default '1_2_weeks').
5. "numberOfHires": Integer (default 1).
6. "jobType": Array of strings e.g. ['full_time', 'contract'] or ['contract'] (extract ALL employment types mentioned by the employer!).
7. "payShowBy": 'range' | 'exact' | 'starting_at' | 'maximum'.
8. "salaryCurrency": 'USD' | 'PKR' | 'EUR' | 'GBP' etc. (default 'USD' unless PKR, Rs, rupees, etc mentioned).
9. "salaryMin" & "salaryMax": Numbers (extract from text e.g. 80k-120k -> 80000 and 120000).
10. "payRate": 'per_hour' | 'per_day' | 'per_week' | 'per_month' | 'per_year' (default 'per_year' or 'per_month' if monthly rate).
11. "category": Standard job category string (e.g. 'Software Engineering', 'Marketing', 'Design', etc.).
12. "experienceLevel": 'entry' | 'mid' | 'senior' (infer from years mentioned e.g. 0-2 yrs -> 'entry', 2-5 yrs -> 'mid', 5+ yrs -> 'senior').
13. "description": Write a rich, professional, polished 2-3 paragraph job description in clean HTML (<p>, <strong>). Naturally expand their input into a real job posting.
14. "responsibilities": Array of 5-6 clear bullet strings inferred from the role (ALWAYS generate this array!).
15. "skillsRequired": Array of 4-6 specific skill keywords.
16. "screeningQuestions": Array of structured screening criteria objects.
    CRITICAL REQUIREMENT RULE ON SCREENING QUESTIONS:
    - ONLY generate a screeningQuestion entry if the employer's original input or clarification answers EXPLICITLY STATED or CLEARLY IMPLIED that specific requirement (e.g. if they explicitly said "2-3 years React experience", extract experienceYears: 2, experienceTitle: "React Development").
    - NEVER INVENT OR FABRICATE specific years of experience or degree requirements that were NOT stated or clearly implied by the employer!
    - If the employer did NOT mention any specific experience level, education, or certification criteria in their prompt:
      - Include screening requirements in your consolidated clarifying question if asking for clarifications (e.g. "Do you have any specific education or experience requirements for candidate screening?").
      - If clarification has already been completed or no screening details were provided, return an empty array [] for screeningQuestions. An empty array is far better than fabricated requirements!

    CRITICAL PHRASING RULE (REQUIREMENT STATEMENTS, NOT QUESTIONS):
    - All "questionText" fields MUST be phrased as clear REQUIREMENT STATEMENTS, NOT interactive questions!
    - Examples:
      * Experience: "Must have 2+ years of experience in React Development" (NOT "Do you have at least 2 years...?")
      * Education: "Bachelor's degree in Computer Science or related field required" (NOT "Do you hold a Bachelor's degree...?")
      * Commute/Location: "Must be able to commute or relocate to Karachi" (NOT "Will you be able to commute...?")
      * License/Cert: "AWS Certified Solutions Architect certification required" (NOT "Do you have AWS certification...?")

    Format for screeningQuestions:
    [
      { "questionType": "experience", "questionText": "Must have 2+ years of experience in React Development", "experienceYears": 2, "experienceTitle": "React Development", "isDealBreaker": true },
      { "questionType": "education", "questionText": "Bachelor's degree in Computer Science or related field required", "educationLevel": "Bachelor's degree", "specificFieldRequirement": "Computer Science", "isDealBreaker": false }
    ]
17. "applicationDeadline": YYYY-MM-DD string (default 30 days from now: "${defaultDeadline}").

CLARIFICATION EVALUATION & CONSOLIDATED QUESTION RULE:
- Check all wizard categories: Basic Info, Employment Type & Schedule, Compensation, Screening Qualifications, Description & Responsibilities.
- DO NOT re-ask about salary if salary numbers were already mentioned in the employer's message!
- DO NOT ask about hiring timeline or number of hires if reasonable defaults apply.
- If MULTIPLE things across categories are missing or genuinely ambiguous (e.g. employment type contract duration vs full-time, or specific screening requirements), combine ALL missing/ambiguous items into ONE SINGLE CONSOLIDATED CLARIFYING QUESTION in "clarifyingQuestion".
- Do NOT ask one question per category across multiple rounds.
- If sufficient details exist to make reasonable defaults, set status to "complete" and do NOT set clarifyingQuestion.

STRICT OUTPUT JSON FORMAT:
{
  "status": "complete" | "needs_clarification",
  "filledFields": {
    "title": "...",
    "workplaceType": "...",
    "location": "...",
    "hiringTimeline": "1_2_weeks",
    "numberOfHires": 1,
    "jobType": "full_time",
    "payShowBy": "range",
    "salaryCurrency": "USD",
    "salaryMin": 80000,
    "salaryMax": 120000,
    "payRate": "per_year",
    "category": "Software Engineering",
    "experienceLevel": "mid",
    "description": "<p>...</p>",
    "responsibilities": ["Build responsive web interfaces", "Collaborate with product team"],
    "skillsRequired": ["React", "JavaScript", "TypeScript"],
    "screeningQuestions": [
      { "questionType": "experience", "questionText": "Must have 2+ years of experience in React Development", "experienceYears": 2, "experienceTitle": "React Development", "isDealBreaker": true }
    ],
    "applicationDeadline": "${defaultDeadline}"
  },
  "clarifyingQuestion": "Optional consolidated string if needs_clarification"
}`;

  const historyMessages = conversationHistory.map((h) => ({
    role: h.sender === 'user' ? 'user' : 'assistant',
    content: h.text,
  }));

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: briefDescription },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.data?.choices?.[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content) as GeneratedAiJobPostingResult;
      const filled = parsed.filledFields || {};

      if (Array.isArray(filled.screeningQuestions)) {
        filled.screeningQuestions = filled.screeningQuestions
          .map((q) => {
            if (!q || typeof q !== 'object') return null;
            let type = String(q.questionType || 'custom').toLowerCase().trim();
            if (type === 'certification' || type === 'license' || type === 'cert' || type === 'licenses' || type === 'certifications') {
              type = 'license_certification';
            } else if (type === 'degree') {
              type = 'education';
            } else if (type === 'work_experience') {
              type = 'experience';
            } else if (type === 'relocation') {
              type = 'commute';
            } else if (!['commute', 'education', 'experience', 'language', 'license_certification', 'location', 'willingness_to_travel', 'custom'].includes(type)) {
              type = 'custom';
            }
            return { ...q, questionType: type };
          })
          .filter(Boolean) as any;
      }

      // Post-process Certification Extraction if mentioned by user but missed in screeningQuestions
      const allUserTextForPost = [
        ...conversationHistory.filter((h) => h.sender === 'user').map((h) => h.text),
        briefDescription,
      ]
        .join(' ')
        .toLowerCase();

      if (/certif/i.test(allUserTextForPost)) {
        if (!filled.screeningQuestions) filled.screeningQuestions = [];
        const hasCertEntry = filled.screeningQuestions.some(
          (q) => q.questionType === 'license_certification' || /certif/i.test(q.questionText || '')
        );
        if (!hasCertEntry) {
          const isRequired = /certification[s]?\s*(required|must)|must have\s*certification/i.test(allUserTextForPost);
          filled.screeningQuestions.push({
            questionType: 'license_certification',
            questionText: isRequired ? 'Relevant industry certifications required' : 'Relevant industry certifications preferred',
            isDealBreaker: isRequired,
          });
        }
      }

      // Post-process Salary Pay Rate Period & payShowBy
      if (filled.salaryMin || filled.salaryMax) {
        const minVal = Number(filled.salaryMin) || Number(filled.salaryMax) || 0;
        const maxVal = Number(filled.salaryMax) || Number(filled.salaryMin) || 0;
        const avgVal = (minVal + maxVal) / 2;

        const isPkr = /pkr|rs|rupees/i.test(allUserTextForPost) || filled.salaryCurrency === 'PKR';
        if (isPkr) {
          filled.salaryCurrency = 'PKR';
          // Regional Pakistani judgment: amounts under 600k PKR are monthly
          if (avgVal > 0 && avgVal < 600000) {
            filled.payRate = 'per_month';
          }
        } else if (filled.salaryCurrency === 'USD' || filled.salaryCurrency === 'EUR' || filled.salaryCurrency === 'GBP') {
          if (avgVal > 0 && avgVal < 300) {
            filled.payRate = 'per_hour';
          } else if (avgVal >= 300 && avgVal < 15000) {
            filled.payRate = 'per_month';
          } else if (avgVal >= 15000) {
            filled.payRate = 'per_year';
          }
        }

        // Detect payShowBy from user phrasing
        if (/starting at|start from|from \d+/i.test(allUserTextForPost)) {
          filled.payShowBy = 'starting_at';
        } else if (/up to|max \d+|maximum \d+/i.test(allUserTextForPost)) {
          filled.payShowBy = 'maximum';
        } else if (filled.salaryMin && filled.salaryMax && filled.salaryMin !== filled.salaryMax) {
          filled.payShowBy = 'range';
        } else if (filled.salaryMin && !filled.salaryMax) {
          filled.payShowBy = 'exact';
        }
      }

      // Deterministic validation checklist gate
      const evalResult = evaluateRequisitionCompleteness(
        briefDescription,
        conversationHistory,
        filled,
        companyContext
      );

      if (evalResult.status === 'needs_clarification') {
        return {
          status: 'needs_clarification',
          filledFields: filled,
          clarifyingQuestion: evalResult.clarifyingQuestion || parsed.clarifyingQuestion || 'Could you please clarify the target salary and experience requirements for this role?',
        };
      }

      return {
        status: 'complete',
        filledFields: filled,
      };
    }
  } catch (err) {
    logger.error('[generateJobPostingFromDescription Error]:', err);
  }

  // Fallback if AI call fails
  return {
    status: 'complete',
    filledFields: {
      title: briefDescription.slice(0, 45) || 'Requisition Role',
      workplaceType: 'remote',
      location: companyContext.location || 'Remote',
      hiringTimeline: '1_2_weeks',
      numberOfHires: 1,
      jobType: 'full_time',
      payShowBy: 'range',
      salaryCurrency: 'USD',
      salaryMin: 60000,
      salaryMax: 90000,
      payRate: 'per_year',
      salaryDisclosed: true,
      category: 'Software Engineering',
      experienceLevel: 'mid',
      description: `<p>We are seeking a talented professional to join ${companyContext.companyName || 'our team'}.</p><p>${briefDescription}</p>`,
      responsibilities: ['Deliver key project deliverables', 'Collaborate with team members'],
      skillsRequired: ['Teamwork', 'Problem Solving'],
      applicationDeadline: defaultDeadline,
    },
  };
};

/* ==========================================================================
   ADMIN AI FEATURES (CHATBOT, VERIFICATION REVIEW, HEALTH SUMMARY)
   ========================================================================== */

export interface AdminQueryInterpretation {
  intent: 'query_verifications' | 'query_jobs' | 'query_users' | 'query_revenue' | 'general_question' | 'unclear';
  queryType?: string;
  params?: {
    timeframeDays?: number;
    status?: string;
    role?: string;
  };
  clarifyingQuestion?: string;
  generalAnswer?: string;
}

export const interpretAdminQuery = async (
  userMessage: string,
  conversationHistory: Array<{ sender: string; text: string }> = []
): Promise<AdminQueryInterpretation> => {
  if (!config.groqApiKey) {
    return {
      intent: 'general_question',
      generalAnswer: 'GROQ_API_KEY is not configured in backend/.env. AI features are using fallback interpretation.',
    };
  }

  const systemPrompt = `You are the Admin Intelligence Assistant for Hirely, a job platform.
Your task is to classify an administrator's query and extract parameters so our database query engine can execute real MongoDB aggregations.

Classify intent into one of:
- "query_verifications": Questions about company verification status, pending/approved/rejected counts, verification ratios.
- "query_jobs": Questions about active/closed job listings, top applied jobs, job categories.
- "query_users": Questions about user signups, job seekers vs employers breakdown, new signups this week/month, suspended users.
- "query_revenue": Questions about Pro subscriptions, featured job promotions, revenue potential.
- "general_question": General questions about Hirely platform administration, how features work, or greetings.
- "unclear": Input is too vague or ambiguous to query.

Extract queryType where applicable:
- For verifications: "rejected_count", "approval_ratio", "pending_count", "all_status_counts"
- For jobs: "most_applied_job", "active_jobs_count", "total_applications"
- For users: "signups_timeframe", "user_ratio", "suspended_count"
- For revenue: "pro_subscriptions", "featured_jobs_count", "revenue_potential"

Extract timeframeDays: if user mentions "last week" set 7; "this month" or "last 30 days" set 30; "today" set 1.

Return STRICT JSON ONLY (no markdown fences, no \`\`\`json):
{
  "intent": "query_verifications" | "query_jobs" | "query_users" | "query_revenue" | "general_question" | "unclear",
  "queryType": string,
  "params": {
    "timeframeDays": number,
    "status": string,
    "role": string
  },
  "clarifyingQuestion": string,
  "generalAnswer": string
}`;

  try {
    const formattedHistory = conversationHistory
      .slice(-4)
      .map((h) => `${h.sender.toUpperCase()}: ${h.text}`)
      .join('\n');

    const userPrompt = `${formattedHistory ? `CONVERSATION HISTORY:\n${formattedHistory}\n\n` : ''}ADMIN QUESTION: "${userMessage}"`;

    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 500,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: AdminQueryInterpretation = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    logger.error('[interpretAdminQuery Error]:', err);
    return {
      intent: 'general_question',
      generalAnswer: 'I am here to assist with Hirely admin statistics and data. Ask me about signups, verifications, jobs, or revenue!',
    };
  }
};

export const generateAdminConversationalResponse = async (
  intent: string,
  dataSnippet: string,
  userMessage: string
): Promise<string> => {
  if (!config.groqApiKey) {
    return `Based on live database results: ${dataSnippet}`;
  }

  const systemPrompt = `You are the Hirely Admin Executive Assistant.
You have been provided with REAL database query results derived from MongoDB aggregation.
Your job is to answer the admin's question directly, accurately incorporating the exact numbers from the data snippet.
Keep your response concise (2-3 sentences max), highly professional, and data-grounded. Do NOT invent numbers outside the snippet.`;

  const userPrompt = `USER QUESTION: "${userMessage}"\n\nREAL DATABASE RESULT SNIPPET:\n${dataSnippet}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    return rawContent.trim() || `Based on live database results: ${dataSnippet}`;
  } catch (err) {
    logger.error('[generateAdminConversationalResponse Error]:', err);
    return `Based on live database results: ${dataSnippet}`;
  }
};

export interface VerificationAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
  summary: string;
}

export const analyzeVerificationDocuments = async (
  companyInfo: {
    companyName: string;
    industry: string;
    companySize?: string;
    location?: string;
    description?: string;
    website?: string;
  },
  extractedDocTexts: Array<{ documentType: string; fileName?: string; textSnippet?: string }>
): Promise<VerificationAnalysisResult> => {
  if (!config.groqApiKey) {
    return {
      riskLevel: 'low',
      flags: [],
      summary: 'Automated document analysis requires GROQ_API_KEY. Manual admin review recommended.',
    };
  }

  const systemPrompt = `You are a compliance and fraud detection auditor reviewing company verification requests for a hiring platform.
Your task is to analyze company profile details against extracted text/metadata from uploaded official verification documents (NTN Tax Certificates, Business Registration, Founder CNIC/IDs).

Flag any obvious red flags:
1. Mismatched company name or founder name between profile and documents.
2. Incomplete, garbled, or missing text snippet for the document type.
3. Suspicious text or conflicting business address/location.

Return STRICT JSON ONLY (no markdown fences, no \`\`\`json):
{
  "riskLevel": "low" | "medium" | "high",
  "flags": string[] (array of specific concerns found, empty array [] if none),
  "summary": string (1-2 sentence executive audit assessment)
}`;

  const docSnippetsText = extractedDocTexts
    .map(
      (d, i) =>
        `DOCUMENT ${i + 1} (${d.documentType.toUpperCase()} - ${d.fileName || 'file'}):\n${
          d.textSnippet ? d.textSnippet.slice(0, 800) : '[Text not extractable / Image file]'
        }`
    )
    .join('\n\n');

  const userPrompt = `COMPANY PROFILE DATA:
- Name: ${companyInfo.companyName}
- Industry: ${companyInfo.industry}
- Location: ${companyInfo.location || 'N/A'}
- Website: ${companyInfo.website || 'N/A'}
- Description: ${companyInfo.description || 'N/A'}

UPLOADED VERIFICATION DOCUMENTS:
${docSnippetsText || 'No document text extracted.'}`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: VerificationAnalysisResult = JSON.parse(cleaned);

    return {
      riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'low',
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      summary: parsed.summary || 'Document verification analysis completed.',
    };
  } catch (err) {
    logger.error('[analyzeVerificationDocuments Error]:', err);
    return {
      riskLevel: 'low',
      flags: [],
      summary: 'Verification documents submitted and ready for admin manual review.',
    };
  }
};

export const generatePlatformHealthSummary = async (
  statsData: {
    newSignupsThisWeek: { jobSeekers: number; employers: number; total: number };
    totalUsersCount: number;
    totalCompaniesCount: number;
    verifiedVsUnverifiedRatio: { verified: number; unverified: number; ratioPercentage: number };
    pendingVerificationsCount: number;
    totalActiveJobs: number;
    totalApplicationsAllTime: number;
    revenuePotential: { proCompaniesCount: number; featuredJobsCount: number; totalSimulatedRevenue: number };
  }
): Promise<string> => {
  if (!config.groqApiKey) {
    return `Platform overview: ${statsData.newSignupsThisWeek.total} new signups this week (${statsData.newSignupsThisWeek.jobSeekers} job seekers, ${statsData.newSignupsThisWeek.employers} employers). Total active jobs: ${statsData.totalActiveJobs}. Pending verifications: ${statsData.pendingVerificationsCount}. Company verification rate is at ${statsData.verifiedVsUnverifiedRatio.ratioPercentage}%.`;
  }

  const systemPrompt = `You are the Chief Data Officer for Hirely, a job and recruiting platform.
Write a natural, insightful 3-4 sentence platform health executive summary based on the provided real platform analytics.
Highlight key signup trends, company verification health, job market activity, and actionable administrative recommendations (e.g. following up on pending verifications if pending count > 0).

Do NOT output bullet points, markdown code blocks, or JSON. Output plain text paragraphs only.`;

  const userPrompt = `REAL PLATFORM ANALYTICS:
- New Signups This Week: ${statsData.newSignupsThisWeek.total} (${statsData.newSignupsThisWeek.jobSeekers} Job Seekers, ${statsData.newSignupsThisWeek.employers} Employers)
- Total Registered Users: ${statsData.totalUsersCount}
- Total Companies: ${statsData.totalCompaniesCount}
- Verification Ratio: ${statsData.verifiedVsUnverifiedRatio.verified} Verified vs ${statsData.verifiedVsUnverifiedRatio.unverified} Unverified (${statsData.verifiedVsUnverifiedRatio.ratioPercentage}% verified)
- Pending Verification Requests: ${statsData.pendingVerificationsCount}
- Active Jobs Posted: ${statsData.totalActiveJobs}
- Applications Submitted All-Time: ${statsData.totalApplicationsAllTime}
- Monetization / Pro Stats: ${statsData.revenuePotential.proCompaniesCount} Pro Companies, ${statsData.revenuePotential.featuredJobsCount} Featured Jobs, $${statsData.revenuePotential.totalSimulatedRevenue} simulated revenue potential.`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 400,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    return rawContent.trim() || `Platform health summary: ${statsData.newSignupsThisWeek.total} signups this week, ${statsData.totalActiveJobs} active jobs, and ${statsData.pendingVerificationsCount} pending verification reviews.`;
  } catch (err) {
    logger.error('[generatePlatformHealthSummary Error]:', err);
    return `Platform health summary: ${statsData.newSignupsThisWeek.total} signups this week, ${statsData.totalActiveJobs} active jobs, and ${statsData.pendingVerificationsCount} pending verification reviews.`;
  }
};

/**
 * Generates 3 quick, context-aware reply suggestions for real-time chat.
 */
export const generateChatSuggestions = async (
  chatHistory: Array<{ senderRole: string; content: string }>,
  userRole: 'job_seeker' | 'employer',
  jobTitle?: string,
  participantName?: string
): Promise<string[]> => {
  const isJobSeeker = userRole === 'job_seeker';
  const roleLabel = isJobSeeker ? 'Job Seeker (Candidate)' : 'Employer (Recruiter)';
  const otherRoleLabel = isJobSeeker ? 'Employer (Recruiter)' : 'Job Seeker (Candidate)';

  const historyText = chatHistory
    .slice(-6)
    .map((m) => `${m.senderRole === userRole ? 'You' : participantName || otherRoleLabel}: "${m.content}"`)
    .join('\n');

  const systemPrompt = `You are an AI assistant built into Hirely recruitment chat platform.
Your task is to generate 3 short, polite, highly relevant quick-reply suggestions for a ${roleLabel} in a job application discussion for position "${jobTitle || 'Job Opening'}".

Rules:
1. Return EXACTLY a JSON array of 3 strings (e.g. ["Suggestion 1", "Suggestion 2", "Suggestion 3"]).
2. Each suggestion MUST be short (5 to 14 words max).
3. Do NOT include quotation marks inside suggestions.
4. Output JSON ONLY. No markdown formatting, backticks, or intro text.`;

  const userPrompt = `RECENT CONVERSATION HISTORY:
${historyText || 'No previous chat messages.'}

Generate 3 smart, professional response suggestions for ${roleLabel} to send to ${participantName || otherRoleLabel}.`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleanedJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(cleanedJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3).map((s: any) => String(s).trim());
    }
  } catch (err) {
    logger.error('[generateChatSuggestions Error]:', err);
  }

  // Fallbacks if AI fails or returns non-JSON
  if (isJobSeeker) {
    return [
      'Thank you for reaching out! I am very interested in this role.',
      'I am available for an interview this week. Please let me know your preferred time.',
      'Could you share more details about the team and position responsibilities?',
    ];
  } else {
    return [
      'Thank you for your application! Are you available for a brief interview call?',
      'Please let us know your availability for an in-person or video interview.',
      'We have reviewed your profile and would love to discuss next steps.',
    ];
  }
};

/**
 * Enhances a rough message draft into a polished, professional response using AI.
 */
export const enhanceChatMessage = async (
  draftNotes: string,
  chatHistory: Array<{ senderRole: string; content: string }>,
  userRole: 'job_seeker' | 'employer',
  jobTitle?: string,
  participantName?: string
): Promise<string> => {
  const isJobSeeker = userRole === 'job_seeker';
  const roleLabel = isJobSeeker ? 'Job Seeker' : 'Employer/Recruiter';

  const historyText = chatHistory
    .slice(-4)
    .map((m) => `${m.senderRole === userRole ? 'You' : participantName || 'Other'}: "${m.content}"`)
    .join('\n');

  const systemPrompt = `You are an expert communication assistant for the Hirely recruitment platform.
Rewrite the user's rough notes into a polished, professional, polite message for position "${jobTitle || 'Job Opening'}".
Keep the message concise, warm, professional, and directly ready to send in chat.

Do NOT add meta-comments like "Here is your message:". Output ONLY the finalized chat message text.`;

  const userPrompt = `RECENT CONVERSATION:
${historyText || 'No previous messages.'}

ROUGH USER DRAFT / INTENT:
${draftNotes ? `"${draftNotes}"` : 'Please compose a professional follow-up response based on the conversation history.'}

Role: ${roleLabel} sending to ${participantName || 'other participant'}.`;

  try {
    const response = await groqClient.post('chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 300,
    });

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    return rawContent.trim() || draftNotes || 'Thank you for reaching out!';
  } catch (err) {
    logger.error('[enhanceChatMessage Error]:', err);
    return draftNotes || 'Thank you for reaching out!';
  }
};

export interface ScreeningQuestionInput {
  _id?: any;
  questionType: string;
  questionText?: string;
  specificFieldRequirement?: string;
  experienceYears?: number;
  experienceTitle?: string;
  educationLevel?: string;
  isDealBreaker?: boolean;
  isRequired?: boolean;
}

export interface GeneratedScreeningAnswer {
  questionId?: string;
  questionText: string;
  answerText: string;
  source: 'ai_generated' | 'user_edited' | 'manual';
  isMissing: boolean;
}

export const extractCleanTextFromJSONOrString = (raw: string | undefined | null): string => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const parseObjectOrArrayToCleanText = (data: any): string => {
    if (!data) return '';
    if (typeof data === 'string') {
      const s = data.trim();
      if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
        try {
          return parseObjectOrArrayToCleanText(JSON.parse(s));
        } catch {
          return s.replace(/^[\{\[\s"']+|[\}\]\s"']+$/g, '').trim();
        }
      }
      return s;
    }
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);

    if (Array.isArray(data)) {
      return data
        .map((item) => parseObjectOrArrayToCleanText(item))
        .filter(Boolean)
        .join('; ');
    }

    if (typeof data === 'object') {
      const degree = data.degree || data.degreeLevel || data.title || data.degreeTitle || data.qualification;
      const school = data.school || data.institution || data.university || data.college;
      const field = data.fieldOfStudy || data.field || data.major || data.specialization;

      if (degree || school || field) {
        const parts = [
          degree ? String(degree).trim() : '',
          field ? `in ${String(field).trim()}` : '',
          school ? `from ${String(school).trim()}` : '',
        ].filter(Boolean);
        return parts.join(' ');
      }

      const listKeys = ['educationList', 'education', 'workExperienceList', 'workExperience', 'items', 'list'];
      for (const key of listKeys) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          return parseObjectOrArrayToCleanText(data[key]);
        }
      }

      const textPieces: string[] = [];
      for (const [key, val] of Object.entries(data)) {
        if (['id', '_id', 'createdAt', 'updatedAt', 'userId', 'v', '__v'].includes(key)) continue;
        if (typeof val === 'string' && val.trim()) {
          textPieces.push(val.trim());
        } else if (typeof val === 'object' && val) {
          const childText = parseObjectOrArrayToCleanText(val);
          if (childText) textPieces.push(childText);
        }
      }
      return textPieces.join(', ');
    }

    return '';
  };

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const clean = parseObjectOrArrayToCleanText(parsed);
      return clean || trimmed.replace(/^[\{\[\s"']+|[\}\]\s"']+$/g, '').trim();
    } catch {
      return trimmed.replace(/^[\{\[\s"']+|[\}\]\s"']+$/g, '').trim();
    }
  }

  return trimmed;
};

export const answerScreeningQuestionsForCandidate = async (
  screeningQuestions: ScreeningQuestionInput[],
  candidateProfile: {
    skills?: string[];
    verifiedSkills?: Array<{ skill: string }>;
    bio?: string;
    experienceLevel?: string;
    education?: string;
    city?: string;
    country?: string;
    desiredJobTitles?: string[];
    resumeText?: string;
  },
  userInfo?: {
    fullName?: string;
    location?: string;
  }
): Promise<GeneratedScreeningAnswer[]> => {
  if (!screeningQuestions || screeningQuestions.length === 0) {
    return [];
  }

  const results: GeneratedScreeningAnswer[] = [];

  const cleanEducation = extractCleanTextFromJSONOrString(candidateProfile.education);
  const cleanBio = extractCleanTextFromJSONOrString(candidateProfile.bio);
  const cleanResumeText = extractCleanTextFromJSONOrString(candidateProfile.resumeText);
  const candidateCityLocation = extractCleanTextFromJSONOrString(
    userInfo?.location || [candidateProfile.city, candidateProfile.country].filter(Boolean).join(', ')
  );
  const skillsList = candidateProfile.skills || [];
  const expLevel = candidateProfile.experienceLevel;

  const questionsForAI: Array<{ index: number; question: ScreeningQuestionInput }> = [];

  for (let i = 0; i < screeningQuestions.length; i++) {
    const q = screeningQuestions[i];
    const qId = q._id ? q._id.toString() : undefined;
    const type = q.questionType;

    let questionText = q.questionText?.trim();
    if (!questionText) {
      if (type === 'experience') {
        questionText = `How many years of experience do you have ${q.experienceTitle ? `in ${q.experienceTitle}` : 'in this field'}?`;
      } else if (type === 'education') {
        questionText = `What is your highest completed education level?`;
      } else if (type === 'location' || type === 'commute') {
        questionText = `Are you able to reliably commute or work in this location?`;
      } else if (type === 'willingness_to_travel') {
        questionText = `Are you willing to travel for this role?`;
      } else if (type === 'license_certification') {
        questionText = `Do you hold the required license/certification (${q.specificFieldRequirement || 'specified'})?`;
      } else if (type === 'language') {
        questionText = `Do you speak the required language (${q.specificFieldRequirement || 'specified'})?`;
      } else {
        questionText = `Screening Question`;
      }
    }

    let resolvedText = '';
    let handledLocally = false;

    if (type === 'location' || type === 'commute') {
      if (candidateCityLocation) {
        resolvedText = `Yes, I am located in ${candidateCityLocation} and able to work in this location.`;
        handledLocally = true;
      }
    } else if (type === 'education') {
      if (cleanEducation) {
        resolvedText = `Yes, I hold a ${cleanEducation}.`;
        handledLocally = true;
      } else if (q.educationLevel) {
        const resumeLower = (cleanResumeText + ' ' + cleanBio).toLowerCase();
        if (
          resumeLower.includes(q.educationLevel.toLowerCase()) ||
          resumeLower.includes('bachelor') ||
          resumeLower.includes('master') ||
          resumeLower.includes('degree')
        ) {
          resolvedText = `Yes, I meet the education requirement (${q.educationLevel}).`;
          handledLocally = true;
        }
      }
    } else if (type === 'experience') {
      const targetYears = q.experienceYears || (expLevel === 'senior' ? 5 : expLevel === 'mid' ? 3 : 1);
      const targetTitle = q.experienceTitle || '';

      if (expLevel || targetTitle) {
        let yearsStr = `${targetYears}+ years`;
        if (expLevel === 'senior') yearsStr = '5+ years';
        else if (expLevel === 'mid') yearsStr = '3-5 years';
        else if (expLevel === 'entry') yearsStr = '1-2 years';

        resolvedText = `Yes, I have ${yearsStr} of experience${targetTitle ? ` in ${targetTitle}` : ''}.`;
        handledLocally = true;
      }
    } else if (type === 'willingness_to_travel') {
      resolvedText = `Yes, I am willing to travel as required for this position.`;
      handledLocally = true;
    }

    if (handledLocally && resolvedText) {
      results.push({
        questionId: qId,
        questionText,
        answerText: resolvedText,
        source: 'ai_generated',
        isMissing: false,
      });
    } else {
      results.push({
        questionId: qId,
        questionText,
        answerText: '',
        source: 'ai_generated',
        isMissing: true,
      });
      questionsForAI.push({ index: i, question: q });
    }
  }

  if (questionsForAI.length > 0 && config.groqApiKey) {
    try {
      const questionsList = questionsForAI.map((item, idx) => ({
        index: idx,
        type: item.question.questionType,
        questionText: results[item.index].questionText,
        specificRequirement: item.question.specificFieldRequirement || item.question.educationLevel || '',
      }));

      const systemPrompt = `You are an AI assistant helping a job candidate pre-fill job screening questions.
Given the candidate's profile context (skills, bio, education, experience level, location, and resume text), answer each screening question accurately, naturally, and concisely in the first person ("I ...").

STRICT BREVITY & NO-RAW-DATA RULES:
1. MANDATORY CONCISENESS: Keep the answer brief and direct — maximum 1-2 short sentences or a simple yes/no with minimal qualification. Do NOT list multiple items, dates, or exhaustive details unless the question specifically asks for a list.
2. REQUIREMENT & DEAL-BREAKER QUESTIONS: For yes/no or requirement-style questions (education level, years of experience, certifications, commute/location), generate SHORT confirmations under 15 words (e.g. "Yes, I hold a BSCS degree" or "Yes, I have 3+ years of experience in React").
3. NATURAL TYPED STYLE: Screening answers should read like natural, brief typed responses a real candidate types quickly into an application box, NOT an exhaustive CV summary or a multi-paragraph document.
4. STRICT NO RAW JSON: Absolutely NEVER output raw JSON blobs, brackets {}, [], or code snippets into the answer text.
5. STRICT NO-FABRICATION RULE: ONLY generate an answer if the candidate's profile/resume provides sufficient information or reasonable evidence to answer the question.
6. STRICT MISSING DATA RULE: If a question asks about a specific license, certification, clearance, language, or past experience that is NOT mentioned or implied anywhere in the candidate's profile/resume, set "answerText": "" and "isMissing": true. DO NOT fabricate qualifications!

Return STRICT JSON ONLY. Do NOT include markdown code fences (no \`\`\`json).
Return a JSON array of objects matching:
[
  {
    "index": number,
    "answerText": "string (the short answer, or empty string if unanswerable)",
    "isMissing": boolean (true if unanswerable/missing, false if answered)
  }
]`;

      const userContent = `CANDIDATE PROFILE CONTEXT:
Name: ${userInfo?.fullName || 'Candidate'}
Location: ${candidateCityLocation || 'Not specified'}
Experience Level: ${expLevel || 'Not specified'}
Education: ${cleanEducation || 'Not specified'}
Skills: ${skillsList.join(', ')}
Bio: ${cleanBio || 'Not specified'}
Resume Extract:
${cleanResumeText ? cleanResumeText.slice(0, 2500) : 'No resume text available.'}

SCREENING QUESTIONS TO ANSWER (${questionsList.length} questions):
${JSON.stringify(questionsList, null, 2)}`;

      const response = await groqClient.post('chat/completions', {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const rawContent = response.data?.choices?.[0]?.message?.content || '';
      const cleanedContent = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed: Array<{ index: number; answerText: string; isMissing: boolean }> = JSON.parse(cleanedContent);

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const targetAIItem = questionsForAI[item.index];
          if (targetAIItem) {
            let answer = extractCleanTextFromJSONOrString((item.answerText || '').trim());
            const sentences = answer.match(/[^.!?]+[.!?]+/g);
            if (sentences && sentences.length > 2) {
              answer = sentences.slice(0, 2).join(' ').trim();
            }
            const missing = Boolean(item.isMissing) || !answer;
            results[targetAIItem.index].answerText = answer;
            results[targetAIItem.index].isMissing = missing;
          }
        }
      }
    } catch (aiErr) {
      logger.warn(`[answerScreeningQuestionsForCandidate AI Fallback Error]: ${aiErr instanceof Error ? aiErr.message : aiErr}`);
    }
  }

  return results.map((r) => ({
    ...r,
    answerText: r.answerText || '',
    isMissing: !r.answerText || !r.answerText.trim(),
  }));
};

