export const CSULB_ENGAGE_EVENTS_URL = 'https://csulb.campuslabs.com/engage/events';
export const CSULB_ENGAGE_ORGS_URL = 'https://csulb.campuslabs.com/engage/organizations';

const ENGAGE_EVENTS_API =
  'https://csulb.campuslabs.com/engage/api/discovery/event/search?orderByField=endsOn&orderByDirection=ascending&status=Approved&take=12';

const ENGAGE_ORGS_API =
  'https://csulb.campuslabs.com/engage/api/discovery/organization/search?orderBy%5B0%5D=UpperName%20asc&status=Active&take=12';

export interface CSULBEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  organization?: string;
  link: string;
}

export interface CSULBOrganization {
  id: string;
  name: string;
  category: string;
  summary: string;
  link: string;
}

const FALLBACK_EVENTS: CSULBEvent[] = [
  {
    id: 'engage-evt-1',
    title: 'BeachSync Campus Events & Workshops',
    date: 'Upcoming • Check Live Schedule',
    location: 'University Student Union / CSULB Campus',
    organization: 'CSULB Events & Orgs',
    link: CSULB_ENGAGE_EVENTS_URL,
  },
  {
    id: 'engage-evt-2',
    title: 'Student Life & Involvement Showcase',
    date: 'Upcoming • Check Live Schedule',
    location: 'Speaker’s Platform / Central Quad',
    organization: 'Student Life & Development',
    link: CSULB_ENGAGE_EVENTS_URL,
  },
];

const FALLBACK_ORGS: CSULBOrganization[] = [
  {
    id: 'engage-org-1',
    name: 'Browse All CSULB Student Organizations',
    category: 'BeachSync Directory',
    summary: 'Explore academic, cultural, service, and special-interest clubs on CampusLabs Engage.',
    link: CSULB_ENGAGE_ORGS_URL,
  },
];

export class LiveEventsService {
  public async fetchLiveEvents(): Promise<CSULBEvent[]> {
    // 1. Try backend proxy route if configured
    try {
      const backendRes = await fetch('/api/v1/events/live');
      if (backendRes.ok) {
        const data = await backendRes.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Fall through to CampusLabs Engage API
    }

    // 2. Try CampusLabs Engage Discovery API
    try {
      const res = await fetch(ENGAGE_EVENTS_API, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Engage events HTTP ${res.status}`);

      const data = await res.json();
      const items = Array.isArray(data?.value) ? data.value : [];

      if (items.length > 0) {
        return items.map((item: any, index: number) => ({
          id: String(item.id || `csulb-event-${index}`),
          title: item.name || 'CSULB Campus Event',
          date: item.startsOn
            ? new Date(item.startsOn).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'TBD',
          location: item.location || 'CSULB Campus',
          organization: item.organizationName || 'CSULB Student Organization',
          link: item.id
            ? `https://csulb.campuslabs.com/engage/event/${item.id}`
            : CSULB_ENGAGE_EVENTS_URL,
        }));
      }
    } catch (error) {
      console.warn('Direct Engage events fetch blocked or unavailable, using directory links:', error);
    }

    return FALLBACK_EVENTS;
  }

  public async fetchLiveOrganizations(): Promise<CSULBOrganization[]> {
    // 1. Try backend proxy route if configured
    try {
      const backendRes = await fetch('/api/v1/events/organizations');
      if (backendRes.ok) {
        const data = await backendRes.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Fall through to CampusLabs Engage API
    }

    // 2. Try CampusLabs Engage Discovery API
    try {
      const res = await fetch(ENGAGE_ORGS_API, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Engage organizations HTTP ${res.status}`);

      const data = await res.json();
      const items = Array.isArray(data?.value) ? data.value : [];

      if (items.length > 0) {
        return items.map((org: any, index: number) => ({
          id: String(org.id || `csulb-org-${index}`),
          name: org.name || 'CSULB Student Organization',
          category:
            Array.isArray(org.categoryNames) && org.categoryNames.length > 0
              ? org.categoryNames[0]
              : 'Student Organization',
          summary:
            org.summary ||
            (org.description ? String(org.description).replace(/<[^>]+>/g, '').slice(0, 120) : '') ||
            'Official CSULB student organization on BeachSync.',
          link: org.websiteKey
            ? `https://csulb.campuslabs.com/engage/organization/${org.websiteKey}`
            : CSULB_ENGAGE_ORGS_URL,
        }));
      }
    } catch (error) {
      console.warn('Direct Engage organizations fetch blocked or unavailable, using directory links:', error);
    }

    return FALLBACK_ORGS;
  }
}