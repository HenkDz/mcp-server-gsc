import { google, searchconsole_v1 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

type SearchanalyticsQueryRequest =
  searchconsole_v1.Params$Resource$Searchanalytics$Query;
type ListSitemapsRequest = searchconsole_v1.Params$Resource$Sitemaps$List;
type GetSitemapRequest = searchconsole_v1.Params$Resource$Sitemaps$Get;
type SubmitSitemapRequest = searchconsole_v1.Params$Resource$Sitemaps$Submit;
type IndexInspectRequest =
  searchconsole_v1.Params$Resource$Urlinspection$Index$Inspect['requestBody'];

export class SearchConsoleService {
  private auth: GoogleAuth;

  constructor(credentials: string) {
    this.auth = new google.auth.GoogleAuth({
      keyFile: credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
  }

  private async getSearchConsole() {
    const authClient = await this.auth.getClient();
    return google.searchconsole({
      version: 'v1',
      auth: authClient,
    } as searchconsole_v1.Options);
  }

  private normalizeUrl(url: string): string {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      return `sc-domain:${parsedUrl.hostname}`;
    }
    return `https://${url}`;
  }

  private async handlePermissionError<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
        return await fallbackOperation();
      }
      throw err;
    }
  }

  async searchAnalytics(requestBody: SearchanalyticsQueryRequest) {
    const searchConsole = await this.getSearchConsole();
    return this.handlePermissionError(
      () => searchConsole.searchanalytics.query(requestBody),
      () =>
        searchConsole.searchanalytics.query({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!),
        }),
    );
  }

  async listSites() {
    const searchConsole = await this.getSearchConsole();
    return searchConsole.sites.list();
  }

  async listSitemaps(requestBody: ListSitemapsRequest) {
    const searchConsole = await this.getSearchConsole();
    return this.handlePermissionError(
      () => searchConsole.sitemaps.list(requestBody),
      () =>
        searchConsole.sitemaps.list({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!),
        }),
    );
  }

  async getSitemap(requestBody: GetSitemapRequest) {
    const searchConsole = await this.getSearchConsole();
    return this.handlePermissionError(
      () => searchConsole.sitemaps.get(requestBody),
      () =>
        searchConsole.sitemaps.get({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!),
        }),
    );
  }

  async submitSitemap(requestBody: SubmitSitemapRequest) {
    const searchConsole = await this.getSearchConsole();
    return this.handlePermissionError(
      () => searchConsole.sitemaps.submit(requestBody),
      () =>
        searchConsole.sitemaps.submit({
          ...requestBody,
          siteUrl: this.normalizeUrl(requestBody.siteUrl!),
        }),
    );
  }

  async indexInspect(requestBody: IndexInspectRequest) {
    const searchConsole = await this.getSearchConsole();
    const response = await searchConsole.urlInspection.index.inspect({
      requestBody,
    });

    const inspectionResult = response.data.inspectionResult;
    if (!inspectionResult) {
      return {
        summary: 'No inspection result found.',
        inspectionResult,
      };
    }

    const { indexStatusResult } = inspectionResult;
    if (!indexStatusResult) {
      return {
        summary: 'No index status result found.',
        inspectionResult,
      };
    }

    const { coverageState, pageFetchState } = indexStatusResult;

    return {
      summary: `Coverage: ${coverageState}, Fetch State: ${pageFetchState}`,
      ...inspectionResult,
    };
  }
}
