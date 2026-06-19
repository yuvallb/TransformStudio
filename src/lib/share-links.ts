import { SITE } from '@/lib/site-config';

export interface ShareLinks {
  reddit: string;
  email: string;
  whatsapp: string;
  url: string;
  title: string;
  text: string;
}

export function getSiteShareLinks(): ShareLinks {
  const url = SITE.urls.site;
  const title = SITE.name;
  const text = `${SITE.tagline} — ${SITE.name}`;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedBody = encodeURIComponent(`${text}\n\n${url}`);
  const encodedWhatsApp = encodeURIComponent(`${text}\n\n${url}`);

  return {
    url,
    title,
    text,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedBody}`,
    whatsapp: `https://wa.me/?text=${encodedWhatsApp}`,
  };
}
