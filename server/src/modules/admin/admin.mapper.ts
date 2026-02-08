import type { AdminSketchRequest } from '@synth.textmode.art/contracts/admin';
import type { SketchStatus, SocialLink } from '@synth.textmode.art/contracts/sketch';

type SketchStatusLike = SketchStatus | 'PENDING' | 'APPROVED' | 'DENIED';

/**
 * Full sketch record shape — admin mapper needs every column,
 * intentionally independent from the public mapper's record type.
 */
interface AdminSketchRecord {
  id: string;
  slug: string;
  status: SketchStatusLike;
  title: string;
  description: string | null;
  authorName: string | null;
  license: string | null;
  socialLinks: unknown;
  textmodeCode: string;
  strudelCode: string | null;
  ogImageUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  reviewedAt: Date | string | null;
  reviewedBy: string | null;
  denialReason: string | null;
  publishConsentAccepted: boolean;
  publishConsentAcceptedAt: Date | string | null;
  publishConsentPolicyVersion: string | null;
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toSketchStatus(value: SketchStatusLike): SketchStatus {
  if (value === 'APPROVED' || value === 'DENIED') {
    return value;
  }
  return 'PENDING';
}

function isSocialLink(value: unknown): value is SocialLink {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { label?: unknown; url?: unknown };
  return (
    typeof candidate.label === 'string' &&
    candidate.label.length > 0 &&
    candidate.label.length <= 32 &&
    typeof candidate.url === 'string'
  );
}

function toSocialLinks(raw: unknown): SocialLink[] | null {
  if (!Array.isArray(raw)) return null;

  const links: SocialLink[] = [];
  for (const item of raw) {
    if (isSocialLink(item)) {
      links.push({ label: item.label, url: item.url });
    }
  }
  return links;
}

export function toAdminSketchRequest(sketch: AdminSketchRecord): AdminSketchRequest {
  return {
    id: sketch.id,
    slug: sketch.slug,
    status: toSketchStatus(sketch.status),
    title: sketch.title,
    description: sketch.description,
    authorName: sketch.authorName,
    license: sketch.license,
    socialLinks: toSocialLinks(sketch.socialLinks),
    textmodeCode: sketch.textmodeCode,
    strudelCode: sketch.strudelCode,
    ogImageUrl: sketch.ogImageUrl,
    createdAt: toIsoDate(sketch.createdAt),
    updatedAt: toIsoDate(sketch.updatedAt),
    reviewedAt: sketch.reviewedAt ? toIsoDate(sketch.reviewedAt) : null,
    reviewedBy: sketch.reviewedBy ?? null,
    denialReason: sketch.denialReason ?? null,
    publishConsentAccepted: sketch.publishConsentAccepted,
    publishConsentAcceptedAt: sketch.publishConsentAcceptedAt ? toIsoDate(sketch.publishConsentAcceptedAt) : null,
    publishConsentPolicyVersion: sketch.publishConsentPolicyVersion ?? null,
  };
}
