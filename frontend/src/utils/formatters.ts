export function getCurrencySymbol(currency?: string): string {
  if (!currency) return 'PKR ';
  const uppercase = currency.toUpperCase().trim();
  switch (uppercase) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'PKR':
    case 'RS':
    case 'RS.':
      return 'PKR ';
    case 'INR':
      return '₹';
    case 'JPY':
      return '¥';
    case 'CAD':
      return 'CAD $';
    case 'AUD':
      return 'AUD $';
    case 'AED':
      return 'AED ';
    case 'SAR':
      return 'SAR ';
    default:
      if (uppercase.length <= 4) {
        return `${uppercase} `;
      }
      return uppercase;
  }
}

export function formatRateLabel(rate?: string): string {
  if (!rate) return 'per year';
  return rate.replace(/_/g, ' ');
}

export function formatSalaryRange(job: {
  salaryDisclosed?: boolean;
  hideSalary?: boolean;
  payShowBy?: string;
  payRate?: string;
  salaryCurrency?: string;
  currency?: string;
  salaryMin?: number | string | null;
  salaryMax?: number | string | null;
}): string {
  if (job.salaryDisclosed === false || job.hideSalary === true) {
    return 'Salary undisclosed';
  }

  const rawCurr = job.salaryCurrency || job.currency || 'PKR';
  const symbol = getCurrencySymbol(rawCurr);
  const rateLabel = formatRateLabel(job.payRate);
  const payShowBy = job.payShowBy || 'range';

  const minVal =
    job.salaryMin !== undefined && job.salaryMin !== null && job.salaryMin !== ''
      ? Number(job.salaryMin)
      : null;
  const maxVal =
    job.salaryMax !== undefined && job.salaryMax !== null && job.salaryMax !== ''
      ? Number(job.salaryMax)
      : null;

  const isMultiChar = symbol.trim().length > 1;
  const currPrefix = isMultiChar ? `${symbol.trim()} ` : symbol;

  if (payShowBy === 'exact') {
    const val = minVal !== null ? minVal : maxVal;
    if (val !== null) return `${currPrefix}${val.toLocaleString()} ${rateLabel}`;
    return 'Salary undisclosed';
  }

  if (payShowBy === 'starting_at') {
    const val = minVal !== null ? minVal : maxVal;
    if (val !== null) return `Starting at ${currPrefix}${val.toLocaleString()} ${rateLabel}`;
    return 'Salary undisclosed';
  }

  if (payShowBy === 'maximum') {
    const val = maxVal !== null ? maxVal : minVal;
    if (val !== null) return `Up to ${currPrefix}${val.toLocaleString()} ${rateLabel}`;
    return 'Salary undisclosed';
  }

  // Default: 'range'
  if (minVal !== null && maxVal !== null) {
    if (isMultiChar) {
      return `${symbol.trim()} ${minVal.toLocaleString()} - ${maxVal.toLocaleString()} ${rateLabel}`;
    }
    return `${symbol}${minVal.toLocaleString()} - ${symbol}${maxVal.toLocaleString()} ${rateLabel}`;
  } else if (minVal !== null) {
    return `Starting at ${currPrefix}${minVal.toLocaleString()} ${rateLabel}`;
  } else if (maxVal !== null) {
    return `Up to ${currPrefix}${maxVal.toLocaleString()} ${rateLabel}`;
  }

  return 'Salary undisclosed';
}

export function formatWorkplaceType(type?: string): string {
  if (!type) return 'On-site';
  switch (type.toLowerCase()) {
    case 'remote':
      return 'Remote';
    case 'hybrid':
      return 'Hybrid';
    case 'on_site':
    case 'onsite':
      return 'On-site';
    default:
      return type.replace(/_/g, ' ');
  }
}

export function formatHiringTimeline(timeline?: string): string {
  if (!timeline) return '1 to 2 weeks';
  switch (timeline) {
    case '1_3_days':
      return '1 to 3 days';
    case '3_7_days':
      return '3 to 7 days';
    case '1_2_weeks':
      return '1 to 2 weeks';
    case '2_4_weeks':
      return '2 to 4 weeks';
    case 'more_than_4_weeks':
      return 'More than 4 weeks';
    default:
      return timeline.replace(/_/g, ' ');
  }
}

export function formatContractDuration(duration?: { length: number; unit: string } | null): string | null {
  if (!duration || !duration.length) return null;
  const unit = duration.unit || 'months';
  const unitLabel = duration.length === 1 ? unit.replace(/s$/, '') : unit;
  return `${duration.length} ${unitLabel}`;
}

export function formatExpectedHours(hours?: {
  type: string;
  fixedHours?: number;
  minHours?: number;
  maxHours?: number;
} | null): string | null {
  if (!hours || !hours.type) return null;
  switch (hours.type) {
    case 'fixed':
      return hours.fixedHours ? `${hours.fixedHours} hours / week` : null;
    case 'range':
      return hours.minHours && hours.maxHours
        ? `${hours.minHours} - ${hours.maxHours} hours / week`
        : hours.minHours
        ? `At least ${hours.minHours} hours / week`
        : hours.maxHours
        ? `Up to ${hours.maxHours} hours / week`
        : null;
    case 'minimum':
      return hours.minHours ? `At least ${hours.minHours} hours / week` : null;
    case 'maximum':
      return hours.maxHours ? `Up to ${hours.maxHours} hours / week` : null;
    default:
      return null;
  }
}

export function cleanEducationField(degreeLevel: string, rawField?: string): string {
  if (!rawField || !rawField.trim()) return '';

  let cleaned = rawField.trim();
  cleaned = cleaned.replace(/^(Master'?s?\s*(degree)?\s*(in|of)?\s*)/i, '');
  cleaned = cleaned.replace(/^(Bachelor'?s?\s*(degree)?\s*(in|of)?\s*)/i, '');
  cleaned = cleaned.replace(/^(Associate'?s?\s*(degree)?\s*(in|of)?\s*)/i, '');
  cleaned = cleaned.replace(/^(Doctorate\s*(degree)?\s*(in|of)?\s*)/i, '');
  cleaned = cleaned.replace(/^(Degree\s*(in|of)?\s*)/i, '');
  cleaned = cleaned.replace(/^(BS|BA|MS|MA|PhD)\s*(in|of)?\s*/i, '');

  return cleaned.trim() || rawField.trim();
}

import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export function formatJobPostedDate(createdAtStr?: string | Date | null): string {
  if (!createdAtStr) return '';
  const date = new Date(createdAtStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMin = differenceInMinutes(now, date);
  const diffHours = differenceInHours(now, date);
  const diffDays = differenceInDays(now, date);

  if (diffMin < 1) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays < 10) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  return `Posted ${date.toLocaleDateString('en-US')}`;
}
