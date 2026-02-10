import type { SketchStatus } from '@synth.textmode.art/contracts/sketch';
import { prisma } from '../../database/client.js';

type AdminStatusFilter = 'PENDING' | 'APPROVED' | 'DENIED';

export async function listSketchRequests(status?: AdminStatusFilter) {
    return prisma.sketchRequest.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'desc' },
    });
}

export async function findSketchRequestById(id: string) {
    return prisma.sketchRequest.findUnique({ where: { id } });
}

export interface UpdateSketchRequestData {
    status: SketchStatus;
    denialReason?: string | null;
    reviewedBy?: string | null;
}

export async function updateSketchRequest(id: string, data: UpdateSketchRequestData) {
    return prisma.sketchRequest.update({
        where: { id },
        data: {
            status: data.status,
            denialReason: data.status === 'DENIED' ? data.denialReason ?? null : null,
            reviewedAt: new Date(),
            reviewedBy: data.reviewedBy ?? null,
        },
    });
}

export async function setOgImageUrl(id: string, ogImageUrl: string) {
    return prisma.sketchRequest.update({
        where: { id },
        data: { ogImageUrl },
    });
}
