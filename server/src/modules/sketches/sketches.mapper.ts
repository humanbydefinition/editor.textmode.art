import type {
  ApprovedSketch,
  PublicApprovedSketchAccess,
  PublicPendingSketchAccess,
  PublicSketchAccess,
  SketchRequestResult,
} from '@synth.textmode.art/contracts/sketch';
import {
  type SketchStatusLike,
  toIsoDate,
  toSketchStatus,
  toSocialLinks,
} from '../../shared/mappers.js';

export interface PublicSketchRecord {
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
}

export function toSketchRequestResult(sketch: Pick<PublicSketchRecord, 'id' | 'slug' | 'status' | 'createdAt'>): SketchRequestResult {
  return {
    id: sketch.id,
    slug: sketch.slug,
    status: toSketchStatus(sketch.status),
    createdAt: toIsoDate(sketch.createdAt),
  };
}

export function toApprovedSketch(sketch: PublicSketchRecord): ApprovedSketch {
  return {
    id: sketch.id,
    slug: sketch.slug,
    title: sketch.title,
    description: sketch.description,
    authorName: sketch.authorName,
    license: sketch.license,
    socialLinks: toSocialLinks(sketch.socialLinks),
    textmodeCode: sketch.textmodeCode,
    strudelCode: sketch.strudelCode,
    ogImageUrl: sketch.ogImageUrl,
    createdAt: toIsoDate(sketch.createdAt),
  };
}

export function toPublicSketchAccess(sketch: PublicSketchRecord): PublicSketchAccess {
  const base = {
    id: sketch.id,
    slug: sketch.slug,
    title: sketch.title,
    description: sketch.description,
    authorName: sketch.authorName,
    license: sketch.license,
    textmodeCode: sketch.textmodeCode,
    strudelCode: sketch.strudelCode,
    createdAt: toIsoDate(sketch.createdAt),
  };

  if (sketch.status === 'APPROVED') {
    const approved: PublicApprovedSketchAccess = {
      ...base,
      status: 'APPROVED',
      socialLinks: toSocialLinks(sketch.socialLinks),
      ogImageUrl: sketch.ogImageUrl,
    };
    return approved;
  }

  if (sketch.status !== 'PENDING') {
    throw new Error(`Cannot map sketch with status ${sketch.status} to public access payload`);
  }

  const pending: PublicPendingSketchAccess = {
    ...base,
    status: 'PENDING',
  };
  return pending;
}
