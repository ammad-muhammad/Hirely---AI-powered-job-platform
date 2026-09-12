import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  User,
  Company,
  JobSeekerProfile,
  Job,
  Application,
  ChatThread,
  Message,
  SkillTest,
  SkillTestAttempt,
} from '../models';
import { config } from '../config/env';

async function seedMockData() {
  try {
    console.log('====================================================');
    console.log('🌱 HIRELY PLATFORM MOCK DATA SEEDING SCRIPT');
    console.log('====================================================\n');

    console.log('📡 Connecting to MongoDB database...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ MongoDB connected successfully.\n');

    const testEmailRegex = /@testmail\.com$/i;
    const commonPassword = 'Test1234!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(commonPassword, salt);

    // ==========================================
    // 🧹 STEP 0: IDEMPOTENT CLEANUP OF PREVIOUS TEST DATA
    // ==========================================
    console.log('🧹 Checking for existing test mock data (@testmail.com)...');
    const existingTestUsers = await User.find({ email: { $regex: testEmailRegex } }).select('_id role email');

    if (existingTestUsers.length > 0) {
      console.log(`ℹ️ Found ${existingTestUsers.length} existing test users. Cleaning up related test records...`);
      const testUserIds = existingTestUsers.map((u) => u._id);

      // Find test companies owned by test employers
      const testCompanies = await Company.find({ ownerId: { $in: testUserIds } }).select('_id');
      const testCompanyIds = testCompanies.map((c) => c._id);

      // Find test jobs
      const testJobs = await Job.find({ companyId: { $in: testCompanyIds } }).select('_id');
      const testJobIds = testJobs.map((j) => j._id);

      // Find test applications
      const testApplications = await Application.find({
        $or: [{ jobId: { $in: testJobIds } }, { applicantId: { $in: testUserIds } }],
      }).select('_id');
      const testAppIds = testApplications.map((a) => a._id);

      // Find test chat threads
      const testThreads = await ChatThread.find({
        $or: [
          { applicationId: { $in: testAppIds } },
          { jobSeekerId: { $in: testUserIds } },
          { employerId: { $in: testUserIds } },
        ],
      }).select('_id');
      const testThreadIds = testThreads.map((t) => t._id);

      // Perform deletions
      await Message.deleteMany({ threadId: { $in: testThreadIds } });
      await ChatThread.deleteMany({ _id: { $in: testThreadIds } });
      await Application.deleteMany({ _id: { $in: testAppIds } });
      await Job.deleteMany({ _id: { $in: testJobIds } });
      await Company.deleteMany({ _id: { $in: testCompanyIds } });
      await JobSeekerProfile.deleteMany({ userId: { $in: testUserIds } });
      await SkillTestAttempt.deleteMany({ userId: { $in: testUserIds } });
      await User.deleteMany({ _id: { $in: testUserIds } });

      console.log('✨ Cleaned up all previous mock test records cleanly.\n');
    } else {
      console.log('👍 No existing test mock data found. Proceeding with fresh seed.\n');
    }

    // ==========================================
    // 🏢 STEP 1: CREATE 8 EMPLOYER ACCOUNTS & COMPANIES
    // ==========================================
    console.log('🏢 Creating 8 Employer Users & Company Profiles across 8 Industries...');

    const employerSeeds = [
      {
        user: { fullName: 'Sarah Chen', email: 'sarah.chen@testmail.com', phone: '+92 300 1112233' },
        company: {
          companyName: 'TechForge Innovations',
          industry: 'Technology/Software',
          description: 'Leading full-stack software development lab building enterprise AI and cloud-native microservices.',
          website: 'https://techforge-test.com',
          companySize: '51-200' as const,
          location: 'Karachi, Pakistan',
          foundedYear: 2018,
          cultureDescription: 'Fast-paced, engineering-first culture with dedicated R&D time, hackathons, and remote-friendly policy.',
          benefits: ['Comprehensive Health Insurance', 'Remote Work Stipend', 'Annual Learning & Certification Budget', 'Performance Stock Options', 'Flexible Work Hours'],
          subscriptionTier: 'pro' as const,
          isVerified: true,
          verificationStatus: 'approved' as const,
        },
      },
      {
        user: { fullName: 'Tariq Mehmood', email: 'tariq.mehmood@testmail.com', phone: '+92 321 2223344' },
        company: {
          companyName: 'Crescent Capital Management',
          industry: 'Finance & Banking',
          description: 'Premier asset management and institutional financial advisory firm servicing regional wealth portfolios.',
          website: 'https://crescentcapital-test.com',
          companySize: '201-500' as const,
          location: 'Lahore, Pakistan',
          foundedYear: 2012,
          cultureDescription: 'Analytical, disciplined, high-integrity financial environment with emphasis on continuous professional growth.',
          benefits: ['Family Medical Insurance', 'Annual Performance Bonus', 'Provident Fund & Gratuity', 'CFA & Certification Sponsorship', 'On-site Gymnasium'],
          subscriptionTier: 'pro' as const,
          isVerified: true,
          verificationStatus: 'approved' as const,
        },
      },
      {
        user: { fullName: 'Dr. Amna Khan', email: 'dr.amna.khan@testmail.com', phone: '+92 333 3334455' },
        company: {
          companyName: 'Shifa Care Health Systems',
          industry: 'Healthcare',
          description: 'Integrated digital health network operating modern diagnostic centers, telemedicine hubs, and clinical research units.',
          website: 'https://shifacare-test.com',
          companySize: '500+' as const,
          location: 'Islamabad, Pakistan',
          foundedYear: 2015,
          cultureDescription: 'Patient-centric, collaborative, compassionate and evidence-based work environment committed to public health.',
          benefits: ['Comprehensive Healthcare Coverage', 'Life & Disability Insurance', 'On-site Daycare / Creche', 'Child Education Support', 'Paid Wellness Days'],
          subscriptionTier: 'free' as const,
          isVerified: true,
          verificationStatus: 'approved' as const,
        },
      },
      {
        user: { fullName: 'Zainab Rasheed', email: 'zainab.rasheed@testmail.com', phone: '+92 345 4445566' },
        company: {
          companyName: 'PixelCrafters Digital Agency',
          industry: 'Marketing & Advertising',
          description: 'Creative performance marketing agency specializing in growth hacking, SEO, brand identity, and viral social campaigns.',
          website: 'https://pixelcrafters-test.com',
          companySize: '11-50' as const,
          location: 'Karachi, Pakistan',
          foundedYear: 2020,
          cultureDescription: 'Energetic, creative, experiment-friendly environment where fresh ideas and bold campaigns are celebrated.',
          benefits: ['Flexible Work Schedule', 'Client Success Bonuses', 'Creative Hardware Allowance', 'Monthly Team Outings', 'Mental Health Days'],
          subscriptionTier: 'free' as const,
          isVerified: true,
          verificationStatus: 'approved' as const,
        },
      },
      {
        user: { fullName: 'Bilal Ahmed', email: 'bilal.ahmed@testmail.com', phone: '+92 301 5556677' },
        company: {
          companyName: 'BazaarDirect Logistics & Retail',
          industry: 'E-commerce/Retail',
          description: 'Hyper-growth omnichannel e-commerce platform connecting regional manufacturers directly with retail consumers.',
          website: 'https://bazaardirect-test.com',
          companySize: '201-500' as const,
          location: 'Lahore, Pakistan',
          foundedYear: 2019,
          cultureDescription: 'Customer-obsessed, execution-focused, data-driven e-commerce workplace operating at lightning speed.',
          benefits: ['Employee Product Discounts', 'Fuel & Commute Stipend', 'Health Insurance', 'Free Catered Lunch & Snacks', 'Employee ESOP Pool'],
          subscriptionTier: 'free' as const,
          isVerified: true,
          verificationStatus: 'approved' as const,
        },
      },
      {
        user: { fullName: 'Prof. Usman Shah', email: 'prof.usman.shah@testmail.com', phone: '+92 312 6667788' },
        company: {
          companyName: 'EdVanguard Global Academy',
          industry: 'Education',
          description: 'Next-generation ed-tech platform delivering STEM curriculum, vocational certifications, and online interactive degrees.',
          website: 'https://edvanguard-test.com',
          companySize: '51-200' as const,
          location: 'Islamabad, Pakistan',
          foundedYear: 2021,
          cultureDescription: 'Academic, research-driven, supportive community passionate about democratizing world-class education.',
          benefits: ['Tuition & Course Discounts for Family', 'Research & Publication Grants', 'Generous Summer Leave', 'Health Insurance', 'Sabbatical Policy'],
          subscriptionTier: 'free' as const,
          isVerified: false,
          verificationStatus: 'pending' as const,
        },
      },
      {
        user: { fullName: 'Kamran Farooq', email: 'kamran.farooq@testmail.com', phone: '+92 322 7778899' },
        company: {
          companyName: 'Apex Industrial Dynamics',
          industry: 'Manufacturing',
          description: 'Heavy industrial engineering plant producing precision electrical hardware, HVAC equipment, and steel components.',
          website: 'https://apexindustrial-test.com',
          companySize: '500+' as const,
          location: 'Karachi, Pakistan',
          foundedYear: 2008,
          cultureDescription: 'Safety-first, rigorous, quality-obsessed operational culture emphasizing engineering precision.',
          benefits: ['Provident Fund', 'Overtime Compensation', 'Free Factory Shuttle Transport', 'Annual Health Checkups', 'Hazard Compensation'],
          subscriptionTier: 'free' as const,
          isVerified: false,
          verificationStatus: 'pending' as const,
        },
      },
      {
        user: { fullName: 'Elena Rodriguez', email: 'elena.rodriguez@testmail.com', phone: '+971 50 8889900' },
        company: {
          companyName: 'Azure Haven Luxury Resorts',
          industry: 'Hospitality',
          description: 'International luxury resort chain providing eco-friendly beachfront hospitality experiences and fine dining.',
          website: 'https://azurehaven-test.com',
          companySize: '51-200' as const,
          location: 'Dubai, UAE (Remote Hub)',
          foundedYear: 2017,
          cultureDescription: 'Multicultural, guest-focused, hospitable and vibrant work environment where excellence is rewarded.',
          benefits: ['Global Hotel Stay Discounts', 'Relocation & Visa Support', 'International Health Insurance', 'Annual Flight Allowance', 'Performance Bonuses'],
          subscriptionTier: 'free' as const,
          isVerified: false,
          verificationStatus: 'unverified' as const,
        },
      },
    ];

    const createdEmployers: { user: any; company: any }[] = [];

    for (const item of employerSeeds) {
      const empUser = await User.create({
        email: item.user.email,
        password: hashedPassword,
        fullName: item.user.fullName,
        role: 'employer',
        phone: item.user.phone,
        location: item.company.location,
        ipAddress: '127.0.0.1',
      });

      const empCompany = await Company.create({
        ownerId: empUser._id,
        ...item.company,
      });

      createdEmployers.push({ user: empUser, company: empCompany });
    }

    console.log(`✅ Created ${createdEmployers.length} Employer Accounts & Companies.\n`);

    // ==========================================
    // 👨‍💻 STEP 2: CREATE 15 JOB SEEKER ACCOUNTS & PROFILES
    // ==========================================
    console.log('👨‍💻 Creating 15 Job Seeker Accounts with Complete Profiles across 7 Specialized Domains...');

    const sampleResumeUrl = 'https://res.cloudinary.com/demo/image/upload/v1690000000/sample_resume_placeholder.pdf';

    const jobSeekerSeeds = [
      // Tech (3)
      {
        user: { fullName: 'Hamza Ali', email: 'hamza.ali@testmail.com', phone: '+92 300 9990011' },
        field: 'Software/Tech',
        profile: {
          bio: 'Senior Full-Stack Engineer with 6+ years of experience crafting high-scale React, Node.js, and cloud systems.',
          skills: ['React', 'Node.js', 'TypeScript', 'Python', 'MongoDB', 'AWS', 'Docker', 'GraphQL'],
          experienceLevel: 'senior' as const,
          education: 'BS Computer Science, FAST NUCES Karachi',
          city: 'Karachi',
          country: 'Pakistan',
          desiredJobTitles: ['Senior Full-Stack Developer', 'Lead Software Engineer', 'Solutions Architect'],
          preferredJobTypes: ['full_time', 'remote', 'hybrid'],
          minimumExpectedSalary: 280000,
          openToRelocate: true,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Hamza_Ali_Software_Engineer_CV.pdf',
          portfolioUrl: 'https://hamza-ali-dev.test',
          githubUrl: 'https://github.com/hamza-ali-test',
          linkedinUrl: 'https://linkedin.com/in/hamza-ali-test',
          profileCompletionPercentage: 100,
        },
      },
      {
        user: { fullName: 'Aisha Malik', email: 'aisha.malik@testmail.com', phone: '+92 321 9990022' },
        field: 'Software/Tech',
        profile: {
          bio: 'Passionate Frontend Developer focused on building sleek UI components with Next.js, Tailwind CSS, and TypeScript.',
          skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'HTML5', 'CSS3', 'Git', 'Figma'],
          experienceLevel: 'mid' as const,
          education: 'BS Software Engineering, LUMS Lahore',
          city: 'Lahore',
          country: 'Pakistan',
          desiredJobTitles: ['Frontend Developer', 'UI Engineer', 'React Developer'],
          preferredJobTypes: ['full_time', 'remote'],
          minimumExpectedSalary: 180000,
          openToRelocate: false,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Aisha_Malik_Frontend_CV.pdf',
          githubUrl: 'https://github.com/aisha-malik-test',
          linkedinUrl: 'https://linkedin.com/in/aisha-malik-test',
          profileCompletionPercentage: 95,
        },
      },
      {
        user: { fullName: 'Omar Farooq', email: 'omar.farooq@testmail.com', phone: '+92 333 9990033' },
        field: 'Software/Tech',
        profile: {
          bio: 'Entry-level Backend Engineer skilled in Node.js, Express APIs, PostgreSQL, and data structure optimizations.',
          skills: ['Node.js', 'Express', 'Python', 'SQL', 'PostgreSQL', 'REST APIs', 'Git'],
          experienceLevel: 'entry' as const,
          education: 'BS Computer Science, NUST Islamabad',
          city: 'Islamabad',
          country: 'Pakistan',
          desiredJobTitles: ['Junior Backend Developer', 'Associate Software Engineer'],
          preferredJobTypes: ['full_time', 'hybrid'],
          minimumExpectedSalary: 100000,
          openToRelocate: true,
          availableImmediately: true,
          resumeUrl: null, // Manual resume upload needed for full testing
          githubUrl: 'https://github.com/omar-farooq-test',
          profileCompletionPercentage: 75,
        },
      },
      // Finance (2)
      {
        user: { fullName: 'Daniyal Khan', email: 'daniyal.khan@testmail.com', phone: '+92 345 9990044' },
        field: 'Finance & Banking',
        profile: {
          bio: 'Chartered Financial Analyst (CFA Level 2) with 5 years in corporate financial modeling, valuation, and portfolio risk.',
          skills: ['Financial Modeling', 'Accounting', 'Financial Analysis', 'Excel', 'Budgeting', 'Risk Management', 'Valuation'],
          experienceLevel: 'senior' as const,
          education: 'ACCA, CFA Charterholder, IBA Karachi',
          city: 'Karachi',
          country: 'Pakistan',
          desiredJobTitles: ['Senior Financial Analyst', 'Portfolio Manager', 'Investment Associate'],
          preferredJobTypes: ['full_time', 'hybrid'],
          minimumExpectedSalary: 250000,
          openToRelocate: true,
          availableImmediately: false,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Daniyal_Khan_CFA_Resume.pdf',
          linkedinUrl: 'https://linkedin.com/in/daniyal-khan-test',
          profileCompletionPercentage: 100,
        },
      },
      {
        user: { fullName: 'Fatima Hassan', email: 'fatima.hassan@testmail.com', phone: '+92 301 9990055' },
        field: 'Finance & Banking',
        profile: {
          bio: 'Detail-oriented Accountant experienced in general ledger, tax filing, QuickBooks, and internal auditing.',
          skills: ['Accounting', 'Financial Reporting', 'Taxation', 'QuickBooks', 'Audit', 'Cost Accounting', 'Excel'],
          experienceLevel: 'mid' as const,
          education: 'BBA Finance, Punjab University Lahore',
          city: 'Lahore',
          country: 'Pakistan',
          desiredJobTitles: ['Senior Accountant', 'Tax Consultant', 'Audit Officer'],
          preferredJobTypes: ['full_time'],
          minimumExpectedSalary: 140000,
          openToRelocate: false,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Fatima_Hassan_Accountant_CV.pdf',
          linkedinUrl: 'https://linkedin.com/in/fatima-hassan-test',
          profileCompletionPercentage: 90,
        },
      },
      // Marketing (2)
      {
        user: { fullName: 'Saad Rizvi', email: 'saad.rizvi@testmail.com', phone: '+92 312 9990066' },
        field: 'Marketing & Advertising',
        profile: {
          bio: 'Data-driven Growth Marketer skilled in Google Ads, Facebook Ads Manager, technical SEO, and conversion funnel optimization.',
          skills: ['SEO', 'Content Strategy', 'Google Ads', 'Social Media Marketing', 'Copywriting', 'Google Analytics', 'A/B Testing'],
          experienceLevel: 'senior' as const,
          education: 'BS Media Sciences, SZABIST Karachi',
          city: 'Karachi',
          country: 'Pakistan',
          desiredJobTitles: ['Growth Marketing Lead', 'Performance Marketing Manager', 'SEO Strategist'],
          preferredJobTypes: ['full_time', 'remote', 'hybrid'],
          minimumExpectedSalary: 200000,
          openToRelocate: true,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Saad_Rizvi_Growth_Marketer.pdf',
          portfolioUrl: 'https://saad-growth.test',
          linkedinUrl: 'https://linkedin.com/in/saad-rizvi-test',
          profileCompletionPercentage: 95,
        },
      },
      {
        user: { fullName: 'Maryam Tariq', email: 'maryam.tariq@testmail.com', phone: '+92 322 9990077' },
        field: 'Marketing & Advertising',
        profile: {
          bio: 'Creative Content Writer and Social Media Specialist adept at crafting compelling brand narratives and engaging copy.',
          skills: ['Content Writing', 'Social Media Marketing', 'Copywriting', 'Canva', 'SEO Writing', 'Instagram Strategy'],
          experienceLevel: 'entry' as const,
          education: 'BA Mass Communication, University of Karachi',
          city: 'Karachi',
          country: 'Pakistan',
          desiredJobTitles: ['Junior Copywriter', 'Content Specialist', 'Social Media Coordinator'],
          preferredJobTypes: ['full_time', 'remote'],
          minimumExpectedSalary: 80000,
          openToRelocate: false,
          availableImmediately: true,
          resumeUrl: null, // Manual upload testable
          portfolioUrl: 'https://maryam-writes.test',
          profileCompletionPercentage: 70,
        },
      },
      // Healthcare (2)
      {
        user: { fullName: 'Dr. Bilal Nawaz', email: 'dr.bilal.nawaz@testmail.com', phone: '+92 333 9990088' },
        field: 'Healthcare',
        profile: {
          bio: 'Medical graduate transitioning into healthcare management, clinical auditing, and telemedicine operations.',
          skills: ['Patient Care', 'Medical Records', 'Hospital Management', 'Clinical Support', 'Healthcare Compliance', 'Telemedicine'],
          experienceLevel: 'mid' as const,
          education: 'MBBS, Aga Khan University Hospital',
          city: 'Islamabad',
          country: 'Pakistan',
          desiredJobTitles: ['Clinical Operations Manager', 'Healthcare Consultant', 'Medical Superintendent'],
          preferredJobTypes: ['full_time', 'hybrid'],
          minimumExpectedSalary: 170000,
          openToRelocate: true,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Dr_Bilal_Nawaz_CV.pdf',
          linkedinUrl: 'https://linkedin.com/in/dr-bilal-nawaz-test',
          profileCompletionPercentage: 90,
        },
      },
      {
        user: { fullName: 'Sana Iqbal', email: 'sana.iqbal@testmail.com', phone: '+92 345 9990099' },
        field: 'Healthcare',
        profile: {
          bio: 'Dedicated Public Health graduate passionate about patient care coordination, medical documentation, and diagnostic workflow.',
          skills: ['Patient Care', 'Medical Records', 'Healthcare Administration', 'Communication', 'Appointment Scheduling'],
          experienceLevel: 'entry' as const,
          education: 'BS Public Health, Khyber Medical University',
          city: 'Rawalpindi',
          country: 'Pakistan',
          desiredJobTitles: ['Patient Care Coordinator', 'Medical Records Officer', 'Healthcare Assistant'],
          preferredJobTypes: ['full_time', 'on_site'],
          minimumExpectedSalary: 75000,
          openToRelocate: false,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Sana_Iqbal_Health_CV.pdf',
          profileCompletionPercentage: 85,
        },
      },
      // Business/Management (2)
      {
        user: { fullName: 'Raheel Ahmed', email: 'raheel.ahmed@testmail.com', phone: '+92 300 9990100' },
        field: 'Business/Management',
        profile: {
          bio: 'PMP-certified Senior Project Manager with 8+ years leading cross-functional teams in agile software and operations delivery.',
          skills: ['Project Management', 'Agile', 'Scrum', 'Business Analysis', 'Team Leadership', 'Jira', 'Risk Mitigation'],
          experienceLevel: 'senior' as const,
          education: 'MBA & PMP Certified, LUMS Lahore',
          city: 'Karachi',
          country: 'Pakistan',
          desiredJobTitles: ['Senior Project Manager', 'Agile Program Manager', 'Director of Operations'],
          preferredJobTypes: ['full_time', 'hybrid'],
          minimumExpectedSalary: 320000,
          openToRelocate: true,
          availableImmediately: false,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Raheel_Ahmed_PMP_Resume.pdf',
          linkedinUrl: 'https://linkedin.com/in/raheel-ahmed-test',
          profileCompletionPercentage: 100,
        },
      },
      {
        user: { fullName: 'Hira Siddiqui', email: 'hira.siddiqui@testmail.com', phone: '+92 321 9990111' },
        field: 'Business/Management',
        profile: {
          bio: 'Business Analyst adept at process mapping, requirement gathering, SQL data analysis, and workflow optimization.',
          skills: ['Business Analysis', 'SQL', 'Process Optimization', 'Agile', 'Requirement Gathering', 'Data Visualization', 'PowerBI'],
          experienceLevel: 'mid' as const,
          education: 'BS Business Analytics, FAST Islamabad',
          city: 'Lahore',
          country: 'Pakistan',
          desiredJobTitles: ['Business Analyst', 'Operations Analyst', 'Product Owner Assistant'],
          preferredJobTypes: ['full_time', 'hybrid'],
          minimumExpectedSalary: 150000,
          openToRelocate: false,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Hira_Siddiqui_BA_CV.pdf',
          linkedinUrl: 'https://linkedin.com/in/hira-siddiqui-test',
          profileCompletionPercentage: 90,
        },
      },
      // Design/UI-UX (2)
      {
        user: { fullName: 'Usman Baig', email: 'usman.baig@testmail.com', phone: '+92 333 9990122' },
        field: 'Design/UI-UX',
        profile: {
          bio: 'Senior Product Designer crafting intuitive digital experiences, design systems, and mobile interfaces in Figma.',
          skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping', 'Wireframing', 'Design Systems', 'Micro-animations'],
          experienceLevel: 'senior' as const,
          education: 'B.Des Visual Communication, National College of Arts (NCA)',
          city: 'Islamabad',
          country: 'Pakistan',
          desiredJobTitles: ['Lead Product Designer', 'Senior UI/UX Designer', 'Design Director'],
          preferredJobTypes: ['full_time', 'remote'],
          minimumExpectedSalary: 240000,
          openToRelocate: true,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Usman_Baig_Design_Portfolio.pdf',
          portfolioUrl: 'https://usman-ui.test',
          linkedinUrl: 'https://linkedin.com/in/usman-baig-test',
          profileCompletionPercentage: 95,
        },
      },
      {
        user: { fullName: 'Anoushey Khan', email: 'anoushey.khan@testmail.com', phone: '+92 345 9990133' },
        field: 'Design/UI-UX',
        profile: {
          bio: 'Fresh UI/UX graduate dedicated to pixel-perfect visual design, wireframing, and user usability testing.',
          skills: ['Figma', 'UI Design', 'Wireframing', 'User Research', 'Adobe XD', 'Illustrator'],
          experienceLevel: 'entry' as const,
          education: 'BFA Graphic Design, Indus Valley School of Art',
          city: 'Karachi',
          country: 'Pakistan',
          desiredJobTitles: ['Junior UI/UX Designer', 'Visual Designer', 'Graphic Design Associate'],
          preferredJobTypes: ['full_time', 'hybrid'],
          minimumExpectedSalary: 85000,
          openToRelocate: false,
          availableImmediately: true,
          resumeUrl: null, // Manual upload testable
          portfolioUrl: 'https://anoushey-designs.test',
          profileCompletionPercentage: 75,
        },
      },
      // Customer Service (2)
      {
        user: { fullName: 'Zohaib Hassan', email: 'zohaib.hassan@testmail.com', phone: '+92 301 9990144' },
        field: 'Customer Service',
        profile: {
          bio: 'Customer Support Lead with 4 years handling enterprise client tickets, SLA tracking, Zendesk escalation, and team coaching.',
          skills: ['Customer Support', 'CRM', 'Zendesk', 'Communication', 'Conflict Resolution', 'Team Management', 'SLA Management'],
          experienceLevel: 'mid' as const,
          education: 'BA English Literature, Punjab University',
          city: 'Lahore',
          country: 'Pakistan',
          desiredJobTitles: ['Customer Support Lead', 'Client Success Specialist', 'Call Center Supervisor'],
          preferredJobTypes: ['full_time', 'remote'],
          minimumExpectedSalary: 130000,
          openToRelocate: false,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Zohaib_Hassan_Support_CV.pdf',
          linkedinUrl: 'https://linkedin.com/in/zohaib-hassan-test',
          profileCompletionPercentage: 90,
        },
      },
      {
        user: { fullName: 'Mahnoor Shafiq', email: 'mahnoor.shafiq@testmail.com', phone: '+92 312 9990155' },
        field: 'Customer Service',
        profile: {
          bio: 'Enthusiastic Customer Service Officer with excellent verbal communication, chat support efficiency, and problem solving skills.',
          skills: ['Customer Service', 'Communication', 'Helpdesk Support', 'Email Support', 'Live Chat', 'Data Entry'],
          experienceLevel: 'entry' as const,
          education: 'B.Com, University of Karachi',
          city: 'Karachi',
          country: 'Pakistan',
          desiredJobTitles: ['Customer Support Representative', 'Live Chat Agent', 'Helpdesk Executive'],
          preferredJobTypes: ['full_time', 'remote', 'hybrid'],
          minimumExpectedSalary: 65000,
          openToRelocate: false,
          availableImmediately: true,
          resumeUrl: sampleResumeUrl,
          resumeOriginalFileName: 'Mahnoor_Shafiq_CSR_CV.pdf',
          profileCompletionPercentage: 85,
        },
      },
    ];

    const createdJobSeekers: { user: any; profile: any; field: string }[] = [];

    for (const item of jobSeekerSeeds) {
      const seekerUser = await User.create({
        email: item.user.email,
        password: hashedPassword,
        fullName: item.user.fullName,
        role: 'job_seeker',
        phone: item.user.phone,
        location: `${item.profile.city}, ${item.profile.country}`,
        ipAddress: '127.0.0.1',
      });

      const seekerProfile = await JobSeekerProfile.create({
        userId: seekerUser._id,
        ...item.profile,
      });

      createdJobSeekers.push({ user: seekerUser, profile: seekerProfile, field: item.field });
    }

    console.log(`✅ Created ${createdJobSeekers.length} Job Seeker Accounts & Complete Profiles.\n`);

    // Helper map to find employers & job seekers easily
    const getEmp = (email: string) => createdEmployers.find((e) => e.user.email === email);
    const getSeeker = (email: string) => createdJobSeekers.find((s) => s.user.email === email);

    // ==========================================
    // 💼 STEP 3: CREATE 28 JOB POSTINGS
    // ==========================================
    console.log('💼 Creating 28 Job Postings distributed across Companies...');

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const jobSeeds = [
      // TechForge (Company 1)
      {
        companyEmail: 'sarah.chen@testmail.com',
        title: 'Senior Full-Stack React & Node.js Engineer',
        category: 'Software Engineering',
        jobType: ['full_time', 'hybrid'],
        location: 'Karachi, Pakistan',
        workplaceType: 'hybrid' as const,
        experienceLevel: 'senior' as const,
        salaryMin: 250000,
        salaryMax: 350000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'],
        description: 'We are seeking a Senior Full-Stack Engineer to architect and build next-generation enterprise SaaS solutions.',
        responsibilities: [
          'Design and deploy resilient REST & GraphQL APIs using Node.js & Express.',
          'Develop modular frontend applications using React and Next.js.',
          'Mentor junior developers and review pull requests for code quality.',
        ],
        postStatus: 'published' as const,
        status: 'active' as const,
        isFeatured: true,
        featuredUntil: new Date(now + 30 * day),
        createdAt: new Date(now - 2 * day),
        applicationDeadline: new Date(now + 28 * day),
        screeningQuestions: [
          { questionType: 'experience' as const, questionText: 'How many years of commercial React experience do you have?', experienceYears: 4, isDealBreaker: true },
        ],
      },
      {
        companyEmail: 'sarah.chen@testmail.com',
        title: 'Mid-Level Frontend Developer (React / TypeScript)',
        category: 'Software Engineering',
        jobType: ['full_time', 'remote'],
        location: 'Remote',
        workplaceType: 'remote' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 150000,
        salaryMax: 220000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
        description: 'Join our dynamic frontend engineering team to craft high-performance web applications.',
        responsibilities: [
          'Implement responsive UI designs in Figma with pixel-perfect accuracy.',
          'Optimize page rendering performance and Core Web Vitals.',
        ],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 4 * day),
        applicationDeadline: new Date(now + 20 * day),
      },
      {
        companyEmail: 'sarah.chen@testmail.com',
        title: 'Backend Python & FastAPI Architect',
        category: 'Software Engineering',
        jobType: ['full_time', 'on_site'],
        location: 'Karachi, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 180000,
        salaryMax: 260000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Python', 'SQL', 'PostgreSQL', 'REST APIs', 'Docker'],
        description: 'Looking for a skilled Python backend engineer to maintain high-throughput microservices.',
        responsibilities: ['Build data processing pipelines and optimize SQL database queries.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 6 * day),
        applicationDeadline: new Date(now + 24 * day),
      },
      {
        companyEmail: 'sarah.chen@testmail.com',
        title: 'Junior Cloud DevOps Associate',
        category: 'Infrastructure / DevOps',
        jobType: ['full_time', 'on_site'],
        location: 'Karachi, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'entry' as const,
        salaryMin: 90000,
        salaryMax: 130000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Docker', 'Linux', 'AWS', 'Git'],
        description: 'Draft requisition for upcoming cloud infrastructure monitoring team.',
        responsibilities: ['Assist in CI/CD pipeline automation and server health monitoring.'],
        postStatus: 'draft' as const,
        status: 'active' as const,
        createdAt: new Date(now - 1 * day),
        applicationDeadline: new Date(now + 45 * day),
      },

      // Crescent Capital (Company 2)
      {
        companyEmail: 'tariq.mehmood@testmail.com',
        title: 'Senior Financial Analyst & Portfolio Specialist',
        category: 'Finance & Banking',
        jobType: ['full_time', 'on_site'],
        location: 'Lahore, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'senior' as const,
        salaryMin: 220000,
        salaryMax: 320000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Financial Modeling', 'Valuation', 'Accounting', 'Excel', 'Financial Analysis'],
        description: 'We are hiring a Senior Financial Analyst to evaluate corporate investment opportunities and prepare valuation models.',
        responsibilities: ['Conduct financial due diligence and generate institutional investment reports.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        isFeatured: true,
        featuredUntil: new Date(now + 30 * day),
        createdAt: new Date(now - 3 * day),
        applicationDeadline: new Date(now + 25 * day),
      },
      {
        companyEmail: 'tariq.mehmood@testmail.com',
        title: 'Corporate Tax & Audit Accountant',
        category: 'Finance & Banking',
        jobType: ['full_time', 'on_site'],
        location: 'Lahore, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 130000,
        salaryMax: 180000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Accounting', 'Taxation', 'Audit', 'QuickBooks'],
        description: 'Manage tax filing, financial statements auditing, and compliance reporting.',
        responsibilities: ['Prepare monthly balance sheets, income statements, and tax documentation.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 5 * day),
        applicationDeadline: new Date(now + 22 * day),
      },
      {
        companyEmail: 'tariq.mehmood@testmail.com',
        title: 'Investment Banking Associate',
        category: 'Finance & Banking',
        jobType: ['contract', 'hybrid'],
        location: 'Lahore, Pakistan',
        workplaceType: 'hybrid' as const,
        experienceLevel: 'senior' as const,
        salaryMin: 280000,
        salaryMax: 400000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Financial Modeling', 'Valuation', 'Risk Management', 'Financial Analysis'],
        contractDuration: { length: 6, unit: 'months' as const },
        description: '6-month contract role for M&A transaction advisory and capital raising.',
        responsibilities: ['Prepare pitch decks and assist in capital structuring negotiations.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 7 * day),
        applicationDeadline: new Date(now + 15 * day),
      },

      // Shifa Care (Company 3)
      {
        companyEmail: 'dr.amna.khan@testmail.com',
        title: 'Clinical Operations Administrator',
        category: 'Healthcare',
        jobType: ['full_time', 'on_site'],
        location: 'Islamabad, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 140000,
        salaryMax: 200000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Hospital Management', 'Patient Care', 'Clinical Support', 'Medical Records'],
        description: 'Oversee daily clinic operational workflows, medical staff scheduling, and patient quality assurance.',
        responsibilities: ['Manage diagnostic facility administration and ensure regulatory healthcare compliance.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 3 * day),
        applicationDeadline: new Date(now + 30 * day),
      },
      {
        companyEmail: 'dr.amna.khan@testmail.com',
        title: 'Healthcare Data & Records Coordinator',
        category: 'Healthcare',
        jobType: ['full_time', 'on_site'],
        location: 'Islamabad, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'entry' as const,
        salaryMin: 80000,
        salaryMax: 120000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Medical Records', 'Healthcare Administration', 'Communication'],
        description: 'Coordinate digital electronic medical records (EMR) entry and patient record confidentiality.',
        responsibilities: ['Maintain patient files and coordinate outpatient diagnostic appointments.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 8 * day),
        applicationDeadline: new Date(now + 18 * day),
      },
      {
        companyEmail: 'dr.amna.khan@testmail.com',
        title: 'Telemedicine Patient Care Coordinator',
        category: 'Healthcare',
        jobType: ['part_time', 'remote'],
        location: 'Remote',
        workplaceType: 'remote' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 100000,
        salaryMax: 140000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        expectedHours: { type: 'fixed' as const, fixedHours: 20 },
        skillsRequired: ['Patient Care', 'Telemedicine', 'Communication'],
        description: 'Part-time remote care coordinator managing virtual doctor appointments and follow-up consultations.',
        responsibilities: ['Facilitate online doctor-patient video consultations and medical triage.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 10 * day),
        applicationDeadline: new Date(now + 25 * day),
      },

      // PixelCrafters (Company 4)
      {
        companyEmail: 'zainab.rasheed@testmail.com',
        title: 'Senior Performance Marketer & Media Buyer',
        category: 'Marketing & Advertising',
        jobType: ['full_time', 'hybrid'],
        location: 'Karachi, Pakistan',
        workplaceType: 'hybrid' as const,
        experienceLevel: 'senior' as const,
        salaryMin: 180000,
        salaryMax: 250000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Google Ads', 'SEO', 'Social Media Marketing', 'A/B Testing', 'Google Analytics'],
        description: 'Drive high-ROI digital ad campaigns across Meta, Google Ads, and TikTok for international clients.',
        responsibilities: ['Manage monthly ad spend of $50k+ and optimize ROAS across performance funnels.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        isFeatured: true,
        featuredUntil: new Date(now + 30 * day),
        createdAt: new Date(now - 1 * day),
        applicationDeadline: new Date(now + 35 * day),
      },
      {
        companyEmail: 'zainab.rasheed@testmail.com',
        title: 'SEO & Content Strategy Specialist',
        category: 'Marketing & Advertising',
        jobType: ['full_time', 'remote'],
        location: 'Remote',
        workplaceType: 'remote' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 110000,
        salaryMax: 160000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['SEO', 'Content Strategy', 'Copywriting', 'Google Analytics'],
        description: 'Execute technical SEO audits, keyword research, and content editorial calendars.',
        responsibilities: ['Increase organic web traffic and rank target keywords on page 1 of Search.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 5 * day),
        applicationDeadline: new Date(now + 20 * day),
      },
      {
        companyEmail: 'zainab.rasheed@testmail.com',
        title: 'Social Media Copywriter & Creator',
        category: 'Marketing & Advertising',
        jobType: ['full_time', 'hybrid'],
        location: 'Karachi, Pakistan',
        workplaceType: 'hybrid' as const,
        experienceLevel: 'entry' as const,
        salaryMin: 65000,
        salaryMax: 95000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Content Writing', 'Copywriting', 'Canva', 'Social Media Marketing'],
        description: 'Write catchy social media copy, scripts, and visual content for brand campaigns.',
        responsibilities: ['Manage weekly content posting calendars across LinkedIn, Instagram, and X.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 9 * day),
        applicationDeadline: new Date(now + 14 * day),
      },

      // BazaarDirect (Company 5)
      {
        companyEmail: 'bilal.ahmed@testmail.com',
        title: 'E-commerce Operations Manager',
        category: 'E-commerce / Operations',
        jobType: ['full_time', 'on_site'],
        location: 'Lahore, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'senior' as const,
        salaryMin: 200000,
        salaryMax: 280000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Project Management', 'Business Analysis', 'Process Optimization'],
        description: 'Lead warehouse fulfillment, seller onboarding, and order fulfillment logistics across major cities.',
        responsibilities: ['Streamline supply chain processes and track order delivery SLAs.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 4 * day),
        applicationDeadline: new Date(now + 26 * day),
      },
      {
        companyEmail: 'bilal.ahmed@testmail.com',
        title: 'Supply Chain & Logistics Analyst',
        category: 'E-commerce / Operations',
        jobType: ['full_time', 'on_site'],
        location: 'Lahore, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 120000,
        salaryMax: 170000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['SQL', 'Business Analysis', 'Process Optimization', 'Excel'],
        description: 'Analyze inventory metrics, vendor dispatch timelines, and delivery performance.',
        responsibilities: ['Build inventory forecasting dashboards and report dispatch bottlenecks.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 7 * day),
        applicationDeadline: new Date(now + 19 * day),
      },
      {
        companyEmail: 'bilal.ahmed@testmail.com',
        title: 'Customer Experience Representative',
        category: 'Customer Service',
        jobType: ['full_time', 'remote'],
        location: 'Remote',
        workplaceType: 'remote' as const,
        experienceLevel: 'entry' as const,
        salaryMin: 60000,
        salaryMax: 85000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Customer Service', 'Communication', 'Helpdesk Support', 'Live Chat'],
        description: 'Provide friendly support to online shoppers regarding order status, returns, and refunds.',
        responsibilities: ['Handle incoming live chat queries and resolve customer return requests.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 11 * day),
        applicationDeadline: new Date(now + 12 * day),
      },

      // EdVanguard (Company 6)
      {
        companyEmail: 'prof.usman.shah@testmail.com',
        title: 'STEM Curriculum Lead Developer',
        category: 'Education',
        jobType: ['full_time', 'hybrid'],
        location: 'Islamabad, Pakistan',
        workplaceType: 'hybrid' as const,
        experienceLevel: 'senior' as const,
        salaryMin: 160000,
        salaryMax: 220000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Content Strategy', 'Project Management', 'Communication'],
        description: 'Develop online computer science and engineering coursework modules for higher education learners.',
        responsibilities: ['Author interactive quizzes, video scripts, and project guidelines for online courses.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 3 * day),
        applicationDeadline: new Date(now + 30 * day),
      },
      {
        companyEmail: 'prof.usman.shah@testmail.com',
        title: 'Online Learning Community Specialist',
        category: 'Education',
        jobType: ['full_time', 'remote'],
        location: 'Remote',
        workplaceType: 'remote' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 85000,
        salaryMax: 125000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Communication', 'Social Media Marketing', 'Customer Support'],
        description: 'Moderate online student forums, facilitate live Q&A sessions, and support student engagement.',
        responsibilities: ['Engage enrolled students in discussion boards and organize weekly online study groups.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 6 * day),
        applicationDeadline: new Date(now + 22 * day),
      },

      // Apex Industrial (Company 7)
      {
        companyEmail: 'kamran.farooq@testmail.com',
        title: 'Industrial Plant Operations Engineer',
        category: 'Manufacturing / Engineering',
        jobType: ['full_time', 'on_site'],
        location: 'Karachi, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'senior' as const,
        salaryMin: 170000,
        salaryMax: 240000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Project Management', 'Process Optimization', 'Team Leadership'],
        description: 'Manage heavy machinery maintenance, factory assembly throughput, and industrial safety compliance.',
        responsibilities: ['Ensure 99.5% factory uptime and enforce ISO safety protocols across plant floors.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 2 * day),
        applicationDeadline: new Date(now + 40 * day),
      },
      {
        companyEmail: 'kamran.farooq@testmail.com',
        title: 'Quality Assurance & Control Inspector',
        category: 'Manufacturing / Engineering',
        jobType: ['full_time', 'on_site'],
        location: 'Karachi, Pakistan',
        workplaceType: 'on_site' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 95000,
        salaryMax: 135000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Process Optimization', 'Business Analysis'],
        description: 'Inspect manufactured electrical hardware components against strict tolerance specifications.',
        responsibilities: ['Perform daily product batch testing and log quality defect rates.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 8 * day),
        applicationDeadline: new Date(now + 16 * day),
      },

      // Azure Haven (Company 8)
      {
        companyEmail: 'elena.rodriguez@testmail.com',
        title: 'Guest Relations & Resort Host Lead',
        category: 'Hospitality',
        jobType: ['contract', 'on_site'],
        location: 'Dubai, UAE (Remote Hub)',
        workplaceType: 'on_site' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 150000,
        salaryMax: 220000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        contractDuration: { length: 12, unit: 'months' as const },
        skillsRequired: ['Customer Support', 'Communication', 'Conflict Resolution'],
        description: 'Manage luxury guest check-ins, VIP concierge services, and resort experience feedback.',
        responsibilities: ['Ensure 5-star guest satisfaction scores and resolve stay inquiries promptly.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 5 * day),
        applicationDeadline: new Date(now + 35 * day),
      },
      {
        companyEmail: 'elena.rodriguez@testmail.com',
        title: 'Digital Marketing Specialist - Hospitality',
        category: 'Marketing & Advertising',
        jobType: ['full_time', 'remote'],
        location: 'Remote',
        workplaceType: 'remote' as const,
        experienceLevel: 'mid' as const,
        salaryMin: 130000,
        salaryMax: 190000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Social Media Marketing', 'SEO', 'Content Writing'],
        description: 'Run targeted luxury travel campaigns for international vacationers across digital channels.',
        responsibilities: ['Increase direct resort booking conversions via email and social media.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 10 * day),
        applicationDeadline: new Date(now + 20 * day),
      },
      {
        companyEmail: 'elena.rodriguez@testmail.com',
        title: 'Customer Reservations Specialist',
        category: 'Customer Service',
        jobType: ['full_time', 'remote'],
        location: 'Remote',
        workplaceType: 'remote' as const,
        experienceLevel: 'entry' as const,
        salaryMin: 70000,
        salaryMax: 100000,
        salaryCurrency: 'PKR',
        salaryDisclosed: true,
        skillsRequired: ['Customer Service', 'Communication', 'Email Support'],
        description: 'Assist international travelers with luxury villa bookings and itinerary planning via phone and email.',
        responsibilities: ['Process room reservations and answer booking inquiry emails within 1 hour.'],
        postStatus: 'published' as const,
        status: 'active' as const,
        createdAt: new Date(now - 12 * day),
        applicationDeadline: new Date(now + 10 * day),
      },
    ];

    const createdJobs: { job: any; companyEmail: string }[] = [];

    for (const jSeed of jobSeeds) {
      const emp = getEmp(jSeed.companyEmail);
      if (!emp) continue;

      const { companyEmail, ...jobPayload } = jSeed;

      const jobDoc = await Job.create({
        companyId: emp.company._id,
        ...jobPayload,
      });

      createdJobs.push({ job: jobDoc, companyEmail });
    }

    console.log(`✅ Created ${createdJobs.length} Job Postings across 8 companies.\n`);

    // Helper map to find jobs easily by title snippet
    const findJob = (snippet: string) => createdJobs.find((j) => j.job.title.toLowerCase().includes(snippet.toLowerCase()));

    // ==========================================
    // 📝 STEP 4: CREATE 18 APPLICATIONS + CHAT THREADS + MESSAGES
    // ==========================================
    console.log('📝 Creating 18 Applications, Chat Threads, and Real-Time Conversation Messages...');

    const applicationSeeds = [
      // Software/Tech applications
      { seekerEmail: 'hamza.ali@testmail.com', jobSnippet: 'Senior Full-Stack React', status: 'interview' as const, cover: 'I am excited to apply for the Senior Full-Stack role. My 6 years of experience in React and Node.js aligns perfectly with TechForge.' },
      { seekerEmail: 'hamza.ali@testmail.com', jobSnippet: 'Backend Python', status: 'shortlisted' as const, cover: 'I have extensive experience building scalable Python microservices.' },
      { seekerEmail: 'aisha.malik@testmail.com', jobSnippet: 'Mid-Level Frontend', status: 'hired' as const, cover: 'Next.js and React frontend architecture are my core strengths. I would love to contribute to PixelCrafters/TechForge.' },
      { seekerEmail: 'aisha.malik@testmail.com', jobSnippet: 'Senior Full-Stack React', status: 'under_review' as const, cover: 'Applying for the React role. I have strong experience building pixel-perfect designs.' },
      { seekerEmail: 'omar.farooq@testmail.com', jobSnippet: 'Mid-Level Frontend', status: 'applied' as const, cover: 'Excited to submit my application as a junior developer.' },
      { seekerEmail: 'omar.farooq@testmail.com', jobSnippet: 'Backend Python', status: 'rejected' as const, cover: 'Looking forward to building resilient backend systems with Python.' },

      // Finance applications
      { seekerEmail: 'daniyal.khan@testmail.com', jobSnippet: 'Senior Financial Analyst', status: 'interview' as const, cover: 'As a CFA Charterholder, I have managed institutional valuation models and financial due diligence for 5 years.' },
      { seekerEmail: 'daniyal.khan@testmail.com', jobSnippet: 'Investment Banking Associate', status: 'shortlisted' as const, cover: 'I am thrilled to apply for the M&A advisory contract role.' },
      { seekerEmail: 'fatima.hassan@testmail.com', jobSnippet: 'Corporate Tax & Audit', status: 'hired' as const, cover: 'I specialize in QuickBooks tax filing and balance sheet auditing.' },
      { seekerEmail: 'fatima.hassan@testmail.com', jobSnippet: 'Senior Financial Analyst', status: 'under_review' as const, cover: 'Submitting my accounting background for financial review.' },

      // Marketing applications
      { seekerEmail: 'saad.rizvi@testmail.com', jobSnippet: 'Senior Performance Marketer', status: 'interview' as const, cover: 'I have scaled ad accounts to $50k+/month at 4x ROAS. PixelCrafters is the ideal growth agency for me.' },
      { seekerEmail: 'saad.rizvi@testmail.com', jobSnippet: 'SEO & Content Strategy', status: 'shortlisted' as const, cover: 'Technical SEO and organic growth strategy are my specialties.' },
      { seekerEmail: 'maryam.tariq@testmail.com', jobSnippet: 'Social Media Copywriter', status: 'under_review' as const, cover: 'I write creative social media copy that drives high audience engagement.' },

      // Healthcare applications
      { seekerEmail: 'dr.bilal.nawaz@testmail.com', jobSnippet: 'Clinical Operations Administrator', status: 'shortlisted' as const, cover: 'With an MBBS and healthcare management experience, I can streamline Shifa Care clinical workflows.' },
      { seekerEmail: 'sana.iqbal@testmail.com', jobSnippet: 'Healthcare Data & Records', status: 'interview' as const, cover: 'My Public Health degree equips me to manage medical record EMR compliance.' },

      // Business & Design applications
      { seekerEmail: 'raheel.ahmed@testmail.com', jobSnippet: 'E-commerce Operations Manager', status: 'interview' as const, cover: 'PMP-certified senior manager ready to scale logistics and warehouse SLAs.' },
      { seekerEmail: 'usman.baig@testmail.com', jobSnippet: 'Senior Full-Stack React', status: 'under_review' as const, cover: 'Submitting my product design portfolio for user interface collaboration.' },
      { seekerEmail: 'zohaib.hassan@testmail.com', jobSnippet: 'Customer Experience Representative', status: 'hired' as const, cover: 'Experienced customer support lead ready to manage live chat inquiries.' },
    ];

    const createdApplications: any[] = [];
    const createdThreads: any[] = [];

    for (const seed of applicationSeeds) {
      const seeker = getSeeker(seed.seekerEmail);
      const jobItem = findJob(seed.jobSnippet);

      if (!seeker || !jobItem) continue;

      const appDoc = await Application.create({
        jobId: jobItem.job._id,
        applicantId: seeker.user._id,
        status: seed.status,
        resumeUrl: seeker.profile.resumeUrl || sampleResumeUrl,
        resumeOriginalFileName: seeker.profile.resumeOriginalFileName || 'Candidate_Resume.pdf',
        coverLetter: seed.cover,
        appliedAt: new Date(now - Math.floor(Math.random() * 5 + 1) * day),
      });

      createdApplications.push(appDoc);

      // Trigger chat thread creation for active statuses (under_review, shortlisted, interview, hired)
      if (['under_review', 'shortlisted', 'interview', 'hired'].includes(seed.status)) {
        const empCompany = createdEmployers.find((e) => e.company._id.toString() === jobItem.job.companyId.toString());

        if (empCompany) {
          const threadDoc = await ChatThread.create({
            applicationId: appDoc._id,
            jobSeekerId: seeker.user._id,
            employerId: empCompany.user._id,
          });

          createdThreads.push(threadDoc);

          // Add realistic initial conversation messages in the thread
          await Message.create({
            threadId: threadDoc._id,
            senderId: null,
            messageText: `Application created for role "${jobItem.job.title}". Status updated to ${seed.status.toUpperCase()}.`,
            isSystemMessage: true,
            isRead: true,
            createdAt: new Date(now - 3 * day),
          });

          await Message.create({
            threadId: threadDoc._id,
            senderId: empCompany.user._id,
            messageText: `Hello ${seeker.user.fullName}, thank you for applying for the ${jobItem.job.title} position at ${empCompany.company.companyName}. We reviewed your profile and would like to proceed with your application!`,
            isSystemMessage: false,
            isRead: true,
            createdAt: new Date(now - 2 * day),
          });

          await Message.create({
            threadId: threadDoc._id,
            senderId: seeker.user._id,
            messageText: `Hi ${empCompany.user.fullName}, thank you so much for reaching out! I am very interested in this opportunity and available for an interview at your convenience.`,
            isSystemMessage: false,
            isRead: false,
            createdAt: new Date(now - 1 * day),
          });
        }
      }
    }

    console.log(`✅ Created ${createdApplications.length} Applications and ${createdThreads.length} Active Chat Threads with Messages.\n`);

    // ==========================================
    // 🎯 STEP 5: SEED SKILL TESTS & ATTEMPTS
    // ==========================================
    console.log('🎯 Seeding Skill Assessments & Test Attempts...');

    // Seed 3 standardized skill tests if not existing
    let jsTest = await SkillTest.findOne({ skillName: 'JavaScript' });
    if (!jsTest) {
      jsTest = await SkillTest.create({
        title: 'JavaScript Core & Async Architecture Assessment',
        category: 'Software Engineering',
        skillName: 'JavaScript',
        description: 'Comprehensive evaluation of ES6+ syntax, Closures, Event Loop, Promises, and Async/Await performance.',
        timeLimitMinutes: 15,
        passingScore: 70,
        questions: [
          { questionId: 'q1', questionText: 'What is the output of typeof null in JavaScript?', options: ['"null"', '"object"', '"undefined"', '"number"'], correctOptionIndex: 1, explanation: 'In JS, typeof null is a legacy object implementation detail.' },
          { questionId: 'q2', questionText: 'Which method returns a new array with elements that pass a test condition?', options: ['forEach()', 'map()', 'filter()', 'reduce()'], correctOptionIndex: 2, explanation: 'filter() creates a shallow copy filtered down to matching elements.' },
        ],
      });
    }

    let reactTest = await SkillTest.findOne({ skillName: 'React' });
    if (!reactTest) {
      reactTest = await SkillTest.create({
        title: 'React.js Frontend Architecture Assessment',
        category: 'Software Engineering',
        skillName: 'React',
        description: 'Advanced assessment covering React Hooks, Virtual DOM reconciliation, Context API, and state management.',
        timeLimitMinutes: 15,
        passingScore: 70,
        questions: [
          { questionId: 'rq1', questionText: 'What hook should be used for side-effects in functional components?', options: ['useState', 'useEffect', 'useMemo', 'useRef'], correctOptionIndex: 1, explanation: 'useEffect handles side-effects like data fetching and DOM updates.' },
        ],
      });
    }

    let finTest = await SkillTest.findOne({ skillName: 'Financial Analysis' });
    if (!finTest) {
      finTest = await SkillTest.create({
        title: 'Financial Modeling & Statement Analysis Assessment',
        category: 'Finance & Banking',
        skillName: 'Financial Analysis',
        description: 'Evaluates balance sheet ratio analysis, discounted cash flow (DCF) modeling, and corporate valuation.',
        timeLimitMinutes: 20,
        passingScore: 70,
        questions: [
          { questionId: 'fq1', questionText: 'What formula calculates the Current Ratio?', options: ['Current Assets / Current Liabilities', 'Net Income / Revenue', 'Debt / Equity', 'Gross Profit / Revenue'], correctOptionIndex: 0, explanation: 'Current ratio measures short-term liquidity.' },
        ],
      });
    }

    // Create 4 test attempts (2 passed with badges, 1 failed for cooldown testing, 1 passed)
    const hamza = getSeeker('hamza.ali@testmail.com');
    const aisha = getSeeker('aisha.malik@testmail.com');
    const omar = getSeeker('omar.farooq@testmail.com');
    const daniyal = getSeeker('daniyal.khan@testmail.com');

    if (hamza && jsTest) {
      await SkillTestAttempt.create({
        userId: hamza.user._id,
        testId: jsTest._id,
        score: 92,
        passed: true,
        startedAt: new Date(now - 5 * day),
        endsAt: new Date(now - 5 * day + 15 * 60 * 1000),
        submittedAt: new Date(now - 5 * day + 10 * 60 * 1000),
        status: 'submitted',
        violationsCount: 0,
        violationLogs: [],
        answers: [{ questionId: 'q1', selectedOptionIndex: 1, isCorrect: true }],
      });

      // Update Hamza profile verified skills
      await JobSeekerProfile.updateOne(
        { userId: hamza.user._id },
        { $push: { verifiedSkills: { skill: 'JavaScript', score: 92, verifiedAt: new Date(now - 5 * day) } } }
      );
    }

    if (aisha && reactTest) {
      await SkillTestAttempt.create({
        userId: aisha.user._id,
        testId: reactTest._id,
        score: 88,
        passed: true,
        startedAt: new Date(now - 4 * day),
        endsAt: new Date(now - 4 * day + 15 * 60 * 1000),
        submittedAt: new Date(now - 4 * day + 11 * 60 * 1000),
        status: 'submitted',
        violationsCount: 0,
        violationLogs: [],
        answers: [{ questionId: 'rq1', selectedOptionIndex: 1, isCorrect: true }],
      });

      // Update Aisha profile verified skills
      await JobSeekerProfile.updateOne(
        { userId: aisha.user._id },
        { $push: { verifiedSkills: { skill: 'React', score: 88, verifiedAt: new Date(now - 4 * day) } } }
      );
    }

    if (omar && jsTest) {
      // Failed attempt for cooldown testing (retake blocked for 24h)
      await SkillTestAttempt.create({
        userId: omar.user._id,
        testId: jsTest._id,
        score: 54,
        passed: false,
        startedAt: new Date(now - 3 * 60 * 60 * 1000), // 3 hours ago (within 24h cooldown!)
        endsAt: new Date(now - 3 * 60 * 60 * 1000 + 15 * 60 * 1000),
        submittedAt: new Date(now - 3 * 60 * 60 * 1000 + 14 * 60 * 1000),
        status: 'submitted',
        violationsCount: 1,
        violationLogs: ['Tab switch detected at 14:02'],
        answers: [{ questionId: 'q1', selectedOptionIndex: 0, isCorrect: false }],
      });
    }

    if (daniyal && finTest) {
      await SkillTestAttempt.create({
        userId: daniyal.user._id,
        testId: finTest._id,
        score: 85,
        passed: true,
        startedAt: new Date(now - 2 * day),
        endsAt: new Date(now - 2 * day + 20 * 60 * 1000),
        submittedAt: new Date(now - 2 * day + 16 * 60 * 1000),
        status: 'submitted',
        violationsCount: 0,
        violationLogs: [],
        answers: [{ questionId: 'fq1', selectedOptionIndex: 0, isCorrect: true }],
      });

      await JobSeekerProfile.updateOne(
        { userId: daniyal.user._id },
        { $push: { verifiedSkills: { skill: 'Financial Analysis', score: 85, verifiedAt: new Date(now - 2 * day) } } }
      );
    }

    console.log('✅ Skill Assessments & Attempts seeded successfully.\n');

    // ==========================================
    // 📊 STEP 6: PRINT SUMMARY TABLES
    // ==========================================
    console.log('========================================================================================================');
    console.log('🎉 HIRELY MOCK DATA SEEDING COMPLETE');
    console.log('========================================================================================================');
    console.log(`🔐 Common Password for ALL Test Accounts: "${commonPassword}"\n`);

    console.log('🏢 EMPLOYER ACCOUNTS & COMPANIES SUMMARY:');
    console.log('--------------------------------------------------------------------------------------------------------');
    console.log('| # | Employer Email              | Company Name                  | Industry               | Verified? | Tier |');
    console.log('--------------------------------------------------------------------------------------------------------');
    createdEmployers.forEach((emp, i) => {
      const idx = String(i + 1).padEnd(2);
      const email = emp.user.email.padEnd(25);
      const cName = emp.company.companyName.padEnd(29);
      const ind = emp.company.industry.padEnd(22);
      const ver = (emp.company.isVerified ? '✅ Approved' : '⏳ Pending').padEnd(9);
      const tier = emp.company.subscriptionTier.toUpperCase().padEnd(4);
      console.log(`| ${idx} | ${email} | ${cName} | ${ind} | ${ver} | ${tier} |`);
    });
    console.log('--------------------------------------------------------------------------------------------------------\n');

    console.log('👨‍💻 JOB SEEKER ACCOUNTS SUMMARY:');
    console.log('-------------------------------------------------------------------------------------------------------------------------');
    console.log('| #  | Job Seeker Email          | Full Name       | Specialization Field  | Exp Level | Test Badge Result | Resume Status |');
    console.log('-------------------------------------------------------------------------------------------------------------------------');
    createdJobSeekers.forEach((seeker, i) => {
      const idx = String(i + 1).padEnd(2);
      const email = seeker.user.email.padEnd(25);
      const name = seeker.user.fullName.padEnd(15);
      const field = seeker.field.padEnd(21);
      const exp = seeker.profile.experienceLevel.padEnd(9);

      let badgeNote = 'No test yet';
      if (seeker.user.email === 'hamza.ali@testmail.com') badgeNote = '✅ Passed JS (92%)';
      if (seeker.user.email === 'aisha.malik@testmail.com') badgeNote = '✅ Passed React (88%)';
      if (seeker.user.email === 'omar.farooq@testmail.com') badgeNote = '❌ Failed JS (54%)';
      if (seeker.user.email === 'daniyal.khan@testmail.com') badgeNote = '✅ Passed Fin (85%)';
      const badgeStr = badgeNote.padEnd(17);

      const resumeNote = seeker.profile.resumeUrl ? '📄 PDF Set' : '⚠️ Manual Upload Needed';
      const resumeStr = resumeNote.padEnd(20);

      console.log(`| ${idx} | ${email} | ${name} | ${field} | ${exp} | ${badgeStr} | ${resumeStr} |`);
    });
    console.log('-------------------------------------------------------------------------------------------------------------------------\n');

    console.log('📊 OVERALL SEEDED STATS:');
    console.log(`• Employer Accounts:       8`);
    console.log(`• Company Profiles:        8`);
    console.log(`• Job Seeker Accounts:     15`);
    console.log(`• Complete Profiles:       15`);
    console.log(`• Total Job Postings:      ${createdJobs.length} (${createdJobs.filter((j) => j.job.isFeatured).length} Featured, 3 Drafts)`);
    console.log(`• Submitted Applications:  ${createdApplications.length}`);
    console.log(`• Active Chat Threads:     ${createdThreads.length} (with populated conversation messages)`);
    console.log(`• Skill Test Attempts:     4 (3 Passed with badges, 1 Failed with retake cooldown)\n`);

    console.log('💡 EXACT NPM COMMAND TO SEED/RESET AGAIN:');
    console.log('   npm run seed:mock-data (inside /backend directory)\n');
    console.log('========================================================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during mock data seeding:', error);
    process.exit(1);
  }
}

seedMockData();
