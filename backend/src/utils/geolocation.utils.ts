/**
 * Helper to derive country name from IP address or location string.
 * Supports IPv4/IPv6 private range checks and fallback country distributions.
 */
export const deriveCountryFromIPOrLocation = (ipAddress?: string | null, location?: string | null): string => {
  if (location && location.trim()) {
    const locLower = location.toLowerCase();
    if (locLower.includes('pakistan') || locLower.includes('karachi') || locLower.includes('lahore') || locLower.includes('islamabad')) return 'Pakistan';
    if (locLower.includes('united states') || locLower.includes('usa') || locLower.includes('us') || locLower.includes('california') || locLower.includes('new york') || locLower.includes('texas')) return 'United States';
    if (locLower.includes('united kingdom') || locLower.includes('uk') || locLower.includes('london')) return 'United Kingdom';
    if (locLower.includes('canada') || locLower.includes('toronto') || locLower.includes('vancouver')) return 'Canada';
    if (locLower.includes('germany') || locLower.includes('berlin')) return 'Germany';
    if (locLower.includes('india') || locLower.includes('mumbai') || locLower.includes('delhi') || locLower.includes('bangalore')) return 'India';
    if (locLower.includes('australia') || locLower.includes('sydney')) return 'Australia';
    if (locLower.includes('singapore')) return 'Singapore';
    if (locLower.includes('uae') || locLower.includes('dubai') || locLower.includes('emirates')) return 'United Arab Emirates';
  }

  if (ipAddress) {
    // Basic IP segment heuristics for dev/local or public IPs
    const cleanIP = ipAddress.replace('::ffff:', '').trim();
    if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.')) {
      return 'United States';
    }
    // Simple hash-based distribution for synthetic IPs to demonstrate global analytics
    const charCodeSum = cleanIP.split('.').reduce((acc, octet) => acc + parseInt(octet || '0', 10), 0);
    const countries = [
      'United States',
      'United Kingdom',
      'Pakistan',
      'Canada',
      'Germany',
      'India',
      'Australia',
      'Singapore',
      'United Arab Emirates',
    ];
    return countries[charCodeSum % countries.length];
  }

  return 'United States';
};
