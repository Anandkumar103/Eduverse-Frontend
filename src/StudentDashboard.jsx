import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8080/api/v1/student";
const LOGIN_PATH = "/"; // App.jsx shows <Login /> when there is no token

// Fallback: clear session and send the user to the login screen.
function handleUnauthorized() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("institutionId");
  window.location.href = LOGIN_PATH;
}

/* ---------- Helpers ---------- */

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// "09:30:00" -> "9:30 AM"
const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hour = Number(h);
  if (isNaN(hour)) return String(t);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m ?? "00"} ${suffix}`;
};

// Pick the first array found under any of the given keys (tolerates naming differences).
const pickList = (obj, keys) => {
  for (const k of keys) {
    if (Array.isArray(obj?.[k])) return obj[k];
  }
  return [];
};

const STATUS_STYLES = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
  UNPAID: "bg-red-100 text-red-700",
  PENDING: "bg-yellow-100 text-yellow-700",
};

/* ---------- Small reusable UI pieces ---------- */

function Badge({ className = "", children }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function Card({ title, icon, className = "", children }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md ${className}`}
    >
      <div className="flex items-center gap-2 bg-blue-900 px-5 py-3 text-white">
        {icon}
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Empty({ text }) {
  return <p className="py-6 text-center text-sm text-slate-400">{text}</p>;
}

function MetricCard({ label, value, sub, accent = "text-slate-900", icon }) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-md">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-white">
        {icon}
      </div>
    </div>
  );
}

const Icon = ({ d }) => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICONS = {
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  cash: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  receipt: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-center justify-center gap-3 py-6 text-slate-500">
        <svg className="h-6 w-6 animate-spin text-blue-900" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span className="text-sm font-medium">Loading your dashboard...</span>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
        ))}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export default function StudentDashboard() {
  const token = localStorage.getItem("token");
  const institutionId = localStorage.getItem("institutionId");

  const [dashboard, setDashboard] = useState(null);
  const [fees, setFees] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
        if (!token) {
      handleUnauthorized();
      return;
    }
        if (localStorage.getItem("demo") === "1") {
      setDashboard({
        attendancePercentage: 82.5,
        todayTimetable: [
          { subjectName: "Mathematics", startTime: "09:00:00", endTime: "09:45:00", roomNumber: "101" },
          { subjectName: "Physics", startTime: "10:00:00", endTime: "10:45:00", roomNumber: "Lab 2" },
        ],
        recentMarks: [
          { examName: "Mid Term", subjectName: "Mathematics", score: 88, maxScore: 100 },
          { examName: "Unit Test 2", subjectName: "Physics", score: 41, maxScore: 50 },
        ],
        recentNotices: [
          { title: "Holiday on Friday", content: "School will remain closed for the festival.", targetRole: "ALL", createdAt: new Date().toISOString() },
        ],
      });
      setFees({
        totalAmount: 50000,
        totalPaid: 30000,
        totalDue: 20000,
        invoices: [
          { feeName: "Tuition", totalAmount: 40000, paidAmount: 30000, balance: 10000, dueDate: "2026-09-30", status: "PARTIAL", overdue: true },
          { feeName: "Library", totalAmount: 10000, paidAmount: 0, balance: 10000, dueDate: "2026-12-15", status: "UNPAID", overdue: false },
        ],
      });
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    };

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [dashRes, feesRes] = await Promise.all([
          fetch(`${API_BASE}/dashboard`, { headers, signal: controller.signal }),
          fetch(`${API_BASE}/fees`, { headers, signal: controller.signal }),
        ]);

        if (dashRes.status === 401 || feesRes.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!dashRes.ok || !feesRes.ok) {
          const failed = !dashRes.ok ? dashRes : feesRes;
          let message = `Failed to load data (${failed.status}).`;
          try {
            const body = await failed.json();
            if (body?.message) message = body.message;
          } catch {
            /* no JSON body */
          }
          throw new Error(message);
        }

        const [dashData, feesData] = await Promise.all([
          dashRes.json(),
          feesRes.json(),
        ]);
        setDashboard(dashData);
        setFees(feesData);
      } catch (err) {
        if (err.name === "AbortError") return;
        if (err instanceof TypeError) {
          setError("Unable to reach the server. Check your connection and try again.");
        } else {
          setError(err.message || "Something went wrong while loading your dashboard.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [token]);

  if (!token) return null;

  // Defensive mapping (see list keys; adjust if your DTO uses different names)
  const timetable = pickList(dashboard, ["todayTimetable", "timetable", "todaysTimetable"]);
  const marks = pickList(dashboard, ["recentMarks", "marks"]);
  const notices = pickList(dashboard, ["recentNotices", "notices"]);
  const invoices = pickList(fees, ["invoices", "pendingInvoices"]);

  const attendance = Number(dashboard?.attendancePercentage);
  const hasAttendance = !isNaN(attendance) && dashboard?.attendancePercentage != null;
  const attendanceGood = attendance >= 75;
  const totalDue = Number(fees?.totalDue) || 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 shadow-md shadow-blue-900/30">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0121 18.5M12 14l-6.16-3.422A12.083 12.083 0 003 18.5M12 14v7" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">
                Edu<span className="text-blue-900">Verse</span> Student
              </h1>
              <p className="text-xs text-slate-500">My academic dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-slate-400 sm:block">
              Institution #{institutionId || "—"}
            </p>
            <button
              type="button"
              onClick={handleUnauthorized}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 7a1 1 0 112 0v4a1 1 0 11-2 0V7zm1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          !error && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* ---- Top row: metrics ---- */}
              <MetricCard
                label="Attendance"
                value={hasAttendance ? `${attendance.toFixed(1)}%` : "—"}
                sub={
                  hasAttendance
                    ? attendanceGood
                      ? "Great, keep it up"
                      : "Below the 75% requirement"
                    : "No data yet"
                }
                accent={
                  !hasAttendance
                    ? "text-slate-900"
                    : attendanceGood
                    ? "text-green-600"
                    : "text-red-600"
                }
                icon={<Icon d={ICONS.check} />}
              />
              <MetricCard
                label="Total Fee"
                value={money(fees?.totalAmount)}
                sub={`Paid: ${money(fees?.totalPaid)}`}
                icon={<Icon d={ICONS.cash} />}
              />
              <MetricCard
                label="Total Due"
                value={money(totalDue)}
                sub={totalDue > 0 ? "Payment pending" : "All clear"}
                accent={totalDue > 0 ? "text-red-600" : "text-green-600"}
                icon={<Icon d={ICONS.receipt} />}
              />

              {/* ---- Today's timetable ---- */}
              <Card title="Today's Timetable" icon={<Icon d={ICONS.clock} />}>
                {timetable.length === 0 ? (
                  <Empty text="No classes scheduled today." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {timetable.map((t, i) => (
                      <li key={t.id ?? i} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {t.subjectName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatTime(t.startTime)} - {formatTime(t.endTime)}
                          </p>
                        </div>
                        <Badge className="bg-blue-50 text-blue-900">
                          Room {t.roomNumber ?? "—"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* ---- Recent marks ---- */}
              <Card title="Recent Marks" icon={<Icon d={ICONS.star} />}>
                {marks.length === 0 ? (
                  <Empty text="No marks recorded yet." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {marks.map((m, i) => {
                      const pct = m.maxScore ? (m.score / m.maxScore) * 100 : 0;
                      return (
                        <li key={m.id ?? i} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {m.subjectName}
                              </p>
                              <p className="text-xs text-slate-500">{m.examName}</p>
                            </div>
                            <p className="text-sm font-bold text-blue-900">
                              {m.score}
                              <span className="font-medium text-slate-400"> / {m.maxScore}</span>
                            </p>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-900"
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {/* ---- Notices ---- */}
              <Card title="Recent Notices" icon={<Icon d={ICONS.bell} />}>
                {notices.length === 0 ? (
                  <Empty text="No notices right now." />
                ) : (
                  <ul className="space-y-4">
                    {notices.map((n, i) => (
                      <li key={n.id ?? i} className="border-l-4 border-blue-900 pl-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                          {n.targetRole && (
                            <Badge className="bg-slate-100 text-slate-600">
                              {n.targetRole}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                          {n.content}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(n.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* ---- Invoices (full width) ---- */}
              <Card
                title="Fee Invoices"
                icon={<Icon d={ICONS.receipt} />}
                className="md:col-span-2 lg:col-span-3"
              >
                {invoices.length === 0 ? (
                  <Empty text="No invoices found." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          <th className="pb-3 pr-4 font-semibold">Fee</th>
                          <th className="pb-3 pr-4 font-semibold">Total</th>
                          <th className="pb-3 pr-4 font-semibold">Paid</th>
                          <th className="pb-3 pr-4 font-semibold">Balance</th>
                          <th className="pb-3 pr-4 font-semibold">Due Date</th>
                          <th className="pb-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.map((inv, i) => (
                          <tr key={inv.invoiceId ?? inv.id ?? i}>
                            <td className="py-3 pr-4 font-medium text-slate-900">
                              {inv.feeName}
                            </td>
                            <td className="py-3 pr-4 text-slate-700">{money(inv.totalAmount)}</td>
                            <td className="py-3 pr-4 text-green-700">{money(inv.paidAmount)}</td>
                            <td
                              className={`py-3 pr-4 font-semibold ${
                                Number(inv.balance) > 0 ? "text-red-600" : "text-slate-700"
                              }`}
                            >
                              {money(inv.balance)}
                            </td>
                            <td className="py-3 pr-4 text-slate-700">{formatDate(inv.dueDate)}</td>
                            <td className="py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  className={
                                    STATUS_STYLES[String(inv.status).toUpperCase()] ||
                                    "bg-slate-100 text-slate-600"
                                  }
                                >
                                  {String(inv.status ?? "—").replace("_", " ")}
                                </Badge>
                                {inv.overdue && (
                                  <Badge className="bg-red-600 text-white">Overdue</Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} EduVerse ERP. All rights reserved.
        </p>
      </main>
    </div>
  );
}
