import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set(['localhost']);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80')
  );
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (lower.endsWith('.local')) return true;
  return false;
}

function isPublicIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) return !isPrivateIpv4(ip);
  if (type === 6) return !isPrivateIpv6(ip);
  return false;
}

export async function isPublicHost(hostname: string): Promise<boolean> {
  if (isBlockedHostname(hostname)) return false;

  const ipType = net.isIP(hostname);
  if (ipType !== 0) {
    return isPublicIp(hostname);
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (records.length === 0) return false;
    return records.every((record) => isPublicIp(record.address));
  } catch {
    return false;
  }
}
