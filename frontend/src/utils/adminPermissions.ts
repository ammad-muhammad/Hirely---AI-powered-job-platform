export function getFirstAllowedAdminPage(user: any): string {
  if (!user || user.role !== 'admin') return '/admin/login';
  if (user.isSuperAdmin === true) return '/admin/dashboard';

  const perms = user.adminPermissions || {};
  if (perms.canViewOverview !== false) return '/admin/dashboard';
  if (perms.canManageFraudDetection) return '/admin/fraud-detection';
  if (perms.canManageVerifications) return '/admin/verifications';
  if (perms.canManageUsers) return '/admin/users';
  if (perms.canManageJobs) return '/admin/jobs';
  if (perms.canManageBilling) return '/admin/billing';
  if (perms.canManageSupport) return '/admin/support';
  if (perms.canManageAdmins) return '/admin/team';
  if (perms.canManageSettings) return '/admin/settings';

  return '/admin/notifications';
}
