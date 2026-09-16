/**
 * Environment detection utility
 * Detects whether the application is running inside Google AI Studio
 * (e.g. preview container on ais-dev-*.run.app or embedded in Google AI Studio)
 * versus an exported GitHub repository / external production deployment.
 */

export const checkIsGoogleAiStudio = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const params = new URLSearchParams(window.location.search);
    
    // Explicit overrides for testing or previewing environments
    if (
      params.get('env') === 'github' ||
      params.get('studio') === 'false' ||
      params.get('source') === 'github'
    ) {
      return false;
    }
    if (
      params.get('env') === 'studio' ||
      params.get('studio') === 'true' ||
      params.get('aistudio') === 'true'
    ) {
      return true;
    }

    const host = (window.location.hostname || '').toLowerCase();

    // Google AI Studio preview containers have hostnames matching ais-dev-*.run.app
    // or domain containing aistudio / ai.studio
    const isAiStudioHostname =
      host.startsWith('ais-dev-') ||
      host.includes('.ais-dev-') ||
      host.includes('aistudio') ||
      host.includes('ai.studio');

    // Check if embedded in an iframe with referrer from Google AI Studio
    let isAiStudioReferrer = false;
    try {
      if (document.referrer) {
        const ref = document.referrer.toLowerCase();
        isAiStudioReferrer = ref.includes('ai.studio') || ref.includes('aistudio.google');
      }
    } catch {
      // ignore potential security/cross-origin exception
    }

    return isAiStudioHostname || isAiStudioReferrer;
  } catch {
    return false;
  }
};
