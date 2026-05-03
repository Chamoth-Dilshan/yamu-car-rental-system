const getApplicationTimestamp = (application = {}) => {
  const value = application.reviewedAt || application.submittedAt || application.createdAt || 0;
  const timestamp = new Date(value).valueOf();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const getLatestProviderApplication = (applications = [], roleKey = '') => (
  (applications || [])
    .filter((application) => application?.roleKey === roleKey)
    .reduce((latestApplication, application) => {
      if (!latestApplication) {
        return application;
      }

      return getApplicationTimestamp(application) >= getApplicationTimestamp(latestApplication)
        ? application
        : latestApplication;
    }, null)
);

export const buildLatestProviderApplicationMap = (applications = []) => (
  (applications || []).reduce((applicationMap, application) => {
    if (!application?.roleKey) {
      return applicationMap;
    }

    const latestApplication = getLatestProviderApplication(
      [applicationMap[application.roleKey], application].filter(Boolean),
      application.roleKey
    );

    return {
      ...applicationMap,
      [application.roleKey]: latestApplication
    };
  }, {})
);
