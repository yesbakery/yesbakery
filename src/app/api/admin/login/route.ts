import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken, getDashboardPassword } from "../../../../lib/admin-auth";

type AttemptRecord = {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
};

const loginAttempts = new Map<string, AttemptRecord>();

function readNumberEnv(name: string, fallback: number) {
  const rawValue = process.env[name];
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
  return firstForwardedIp || request.headers.get("x-real-ip") || "unknown";
}

function getLoginProtectionConfig() {
  return {
    maxAttempts: readNumberEnv("BACKEND_LOGIN_MAX_ATTEMPTS", 5),
    windowMinutes: readNumberEnv("BACKEND_LOGIN_WINDOW_MINUTES", 15),
    lockoutMinutes: readNumberEnv("BACKEND_LOGIN_LOCKOUT_MINUTES", 30),
  };
}

function clearExpiredAttempts(now: number, windowMs: number) {
  for (const [ip, record] of loginAttempts.entries()) {
    const attemptsExpired = now - record.firstAttemptAt > windowMs;
    const lockExpired = record.lockedUntil > 0 && record.lockedUntil <= now;

    if ((attemptsExpired && record.lockedUntil === 0) || (lockExpired && attemptsExpired)) {
      loginAttempts.delete(ip);
    } else if (lockExpired) {
      loginAttempts.set(ip, {
        count: 0,
        firstAttemptAt: now,
        lockedUntil: 0,
      });
    }
  }
}

export async function POST(request: NextRequest) {
  const dashboardPassword = getDashboardPassword();
  const clientIp = getClientIp(request);
  const now = Date.now();
  const { maxAttempts, windowMinutes, lockoutMinutes } = getLoginProtectionConfig();
  const windowMs = windowMinutes * 60 * 1000;
  const lockoutMs = lockoutMinutes * 60 * 1000;

  clearExpiredAttempts(now, windowMs);

  if (!dashboardPassword) {
    return NextResponse.json({ error: "BACKEND_DASHBOARD_PASSWORD is not configured." }, { status: 500 });
  }

  const existingAttempt = loginAttempts.get(clientIp);

  if (existingAttempt && existingAttempt.lockedUntil > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existingAttempt.lockedUntil - now) / 1000));
    return NextResponse.json(
      {
        error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  let payload: { password?: string };

  try {
    payload = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }

  if ((payload.password || "").trim() !== dashboardPassword) {
    const currentAttempt =
      existingAttempt && now - existingAttempt.firstAttemptAt <= windowMs
        ? existingAttempt
        : {
            count: 0,
            firstAttemptAt: now,
            lockedUntil: 0,
          };

    const nextCount = currentAttempt.count + 1;
    const shouldLock = nextCount >= maxAttempts;

    loginAttempts.set(clientIp, {
      count: shouldLock ? 0 : nextCount,
      firstAttemptAt: shouldLock ? now : currentAttempt.firstAttemptAt,
      lockedUntil: shouldLock ? now + lockoutMs : 0,
    });

    if (shouldLock) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Access is locked for ${lockoutMinutes} minute(s).`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(lockoutMinutes * 60),
          },
        },
      );
    }

    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  loginAttempts.delete(clientIp);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
