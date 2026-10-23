import { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8080/api/v1/teacher";
const LOGIN_PATH = "/"; // App.jsx shows <Login /> when there is no token

const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE"];

const TABS = [
  {
    key: "attendance",
    label: "Mark Attendance",
    endpoint: `${API_BASE}/attendance`,
    subtitle: "Record a student's attendance for a subject.",
    successMsg: "Attendance marked successfully.",
  },
  {
    key: "grades",
    label: "Record Grades",
    endpoint: `${API_BASE}/marks`,
    subtitle: "Enter a student's score for an exam.",
    successMsg: "Grade recorded successfully.",
  },
];

const INITIAL_FORMS = {
  attendance: { studentId: "", subjectId: "", date: "", status: "" },
  grades: { studentId: "", examId: "", subjectId: "", score: "", maxScore: "" },
};

// Fallback: clear session and send the user to the login screen.
function handleUnauthorized() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("institutionId");
  // Swap for react-router's navigate(LOGIN_PATH) if you use it.
  window.location.href = LOGIN_PATH;
}

function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Pull a readable message out of a Spring-style error body.
async function extractErrorMessage(response) {
  const fallback = `Request failed (${response.status}). Please try again.`;
  try {
    const data = await response.json();
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (data?.errors) {
      if (Array.isArray(data.errors)) {
        return (
          data.errors
            .map((e) => (typeof e === "string" ? e : e.defaultMessage || e.message))
            .filter(Boolean)
            .join(", ") || fallback
        );
      }
      if (typeof data.errors === "object") {
        return Object.entries(data.errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(", ");
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/* ---------- Small reusable UI pieces ---------- */

const baseInput =
  "w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100";
const inputClass = `${baseInput} border-slate-300 focus:border-blue-900 focus:ring-blue-900/20`;
const inputErrorClass = `${baseInput} border-red-400 focus:border-red-500 focus:ring-red-500/20`;

function Field({ label, htmlFor, required, hint, error, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function SubmitButton({ isLoading, label, loadingLabel }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isLoading ? (
        <>
          <Spinner />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

/* ---------- Main component ---------- */

export default function TeacherPortal() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const institutionId = localStorage.getItem("institutionId");

  const [activeTab, setActiveTab] = useState("attendance");
  const [forms, setForms] = useState(INITIAL_FORMS);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [scoreError, setScoreError] = useState("");
  const successTimer = useRef(null);

  // Redirect if there is no token.
  useEffect(() => {
    if (!token) handleUnauthorized();
  }, [token]);

  // Clean up the success timer on unmount.
  useEffect(() => () => clearTimeout(successTimer.current), []);

  const clearBanners = () => {
    clearTimeout(successTimer.current);
    setSuccess("");
    setError("");
    setScoreError("");
  };

  const switchTab = (key) => {
    if (key === activeTab) return;
    clearBanners();
    setActiveTab(key);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (success || error || scoreError) clearBanners();
    setForms((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [name]: value },
    }));
  };

  const buildPayload = (key, f) => {
    if (key === "attendance") {
      return {
        studentId: Number(f.studentId),
        subjectId: Number(f.subjectId),
        date: f.date,
        status: f.status,
      };
    }
    return {
      studentId: Number(f.studentId),
      examId: Number(f.examId),
      subjectId: Number(f.subjectId),
      score: Number(f.score),
      maxScore: Number(f.maxScore),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearBanners();

    if (!token) return handleUnauthorized();

    const tab = TABS.find((t) => t.key === activeTab);
    const f = forms[activeTab];

    // Client-side validation
    if (activeTab === "attendance" && f.date > todayString()) {
      setError("Attendance date cannot be in the future.");
      return;
    }
    if (activeTab === "grades" && Number(f.score) > Number(f.maxScore)) {
      const msg = "Score cannot be greater than Max Score";
      setScoreError(msg);
      setError(msg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(tab.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(buildPayload(activeTab, f)),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(await extractErrorMessage(response));
        return;
      }

      setForms((prev) => ({ ...prev, [activeTab]: INITIAL_FORMS[activeTab] }));
      setSuccess(tab.successMsg);
      successTimer.current = setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  const currentTab = TABS.find((t) => t.key === activeTab);
  const f = forms[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 shadow-md shadow-blue-900/30">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0121 18.5M12 14l-6.16-3.422A12.083 12.083 0 003 18.5M12 14v7"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">
                Edu<span className="text-blue-900">Verse</span> Teacher Portal
              </h1>
              <p className="text-xs text-slate-500">Attendance &amp; grading</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-semibold text-slate-700">{role || "TEACHER"}</p>
              <p className="text-slate-400">Institution #{institutionId || "—"}</p>
            </div>
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

      <main className="mx-auto max-w-2xl px-4 py-10">
        {/* Tab pills */}
        <div
          role="tablist"
          className="mb-6 flex flex-col gap-1 rounded-xl bg-slate-200/70 p-1 sm:flex-row"
        >
          {TABS.map((t) => {
            const isActive = t.key === activeTab;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => switchTab(t.key)}
                disabled={isLoading}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-900/30 disabled:cursor-not-allowed ${
                  isActive
                    ? "bg-blue-900 text-white shadow-md"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
          <h2 className="text-xl font-semibold">{currentTab.label}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">{currentTab.subtitle}</p>

          {success && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 7a1 1 0 112 0v4a1 1 0 11-2 0V7zm1 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ---- Tab 1: Attendance ---- */}
            {activeTab === "attendance" && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Student ID" htmlFor="studentId" required>
                    <input
                      id="studentId"
                      name="studentId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 101"
                      value={f.studentId}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Subject ID" htmlFor="subjectId" required>
                    <input
                      id="subjectId"
                      name="subjectId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 7"
                      value={f.subjectId}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Date"
                    htmlFor="date"
                    required
                    hint="Cannot be a future date."
                  >
                    <input
                      id="date"
                      name="date"
                      type="date"
                      required
                      max={todayString()}
                      value={f.date}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Status" htmlFor="status" required>
                    <select
                      id="status"
                      name="status"
                      required
                      value={f.status}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select status
                      </option>
                      {ATTENDANCE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <SubmitButton
                  isLoading={isLoading}
                  label="Mark Attendance"
                  loadingLabel="Saving..."
                />
              </>
            )}

            {/* ---- Tab 2: Grades ---- */}
            {activeTab === "grades" && (
              <>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Student ID" htmlFor="gStudentId" required>
                    <input
                      id="gStudentId"
                      name="studentId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 101"
                      value={f.studentId}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Exam ID" htmlFor="examId" required>
                    <input
                      id="examId"
                      name="examId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 3"
                      value={f.examId}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Subject ID" htmlFor="gSubjectId" required>
                    <input
                      id="gSubjectId"
                      name="subjectId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 7"
                      value={f.subjectId}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Score"
                    htmlFor="score"
                    required
                    error={scoreError}
                  >
                    <input
                      id="score"
                      name="score"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 78.5"
                      value={f.score}
                      onChange={handleChange}
                      disabled={isLoading}
                      aria-invalid={!!scoreError}
                      className={scoreError ? inputErrorClass : inputClass}
                    />
                  </Field>
                  <Field label="Max Score" htmlFor="maxScore" required>
                    <input
                      id="maxScore"
                      name="maxScore"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 100"
                      value={f.maxScore}
                      onChange={handleChange}
                      disabled={isLoading}
                      className={scoreError ? inputErrorClass : inputClass}
                    />
                  </Field>
                </div>
                <SubmitButton
                  isLoading={isLoading}
                  label="Record Grade"
                  loadingLabel="Saving..."
                />
              </>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} EduVerse ERP. All rights reserved.
        </p>
      </main>
    </div>
  );
}
