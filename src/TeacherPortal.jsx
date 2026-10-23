import { useState, useEffect, useCallback, useMemo } from "react";

const API_BASE = "http://localhost:8080/api/v1/teacher";
const LOGIN_PATH = "/login";

const TABS = [
  { id: "attendance", label: "Mark Attendance" },
  { id: "grades", label: "Record Grades" },
];

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "LATE"];

const EMPTY_ATTENDANCE = { studentId: "", subjectId: "", date: "", status: "" };
const EMPTY_GRADES = { studentId: "", examId: "", subjectId: "", score: "", maxScore: "" };

/* Returns today's date as YYYY-MM-DD in the user's local timezone */
const getToday = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

/* Clears the session and sends the user back to the login screen */
const forceLogout = () => {
  localStorage.clear();
  window.location.href = LOGIN_PATH;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 " +
  "placeholder-slate-400 shadow-sm transition focus:border-blue-900 focus:outline-none " +
  "focus:ring-4 focus:ring-blue-900/20 disabled:cursor-not-allowed disabled:bg-slate-100";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} <span className="text-red-600">*</span>
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Banner({ type, message }) {
  if (!message) return null;
  const styles =
    type === "success"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-red-50 text-red-700 border-red-200";
  return (
    <div
      role={type === "success" ? "status" : "alert"}
      className={`mb-5 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium ${styles}`}
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        {type === "success" ? (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 6a1 1 0 112 0v4a1 1 0 11-2 0V6zm1 8a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ isLoading, children, loadingText }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-900/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {isLoading && <Spinner />}
      {isLoading ? loadingText : children}
    </button>
  );
}

export default function TeacherPortal() {
  // Auth / tenancy context
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const institutionId = localStorage.getItem("institutionId");

  const [activeTab, setActiveTab] = useState("attendance");

  // Separate form state per tab
  const [attendanceForm, setAttendanceForm] = useState(EMPTY_ATTENDANCE);
  const [gradesForm, setGradesForm] = useState(EMPTY_GRADES);

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [scoreError, setScoreError] = useState("");

  // Recomputed on each render so the max date stays correct if the page stays open past midnight
  const today = useMemo(() => getToday(), []);

  // Redirect immediately if there is no token
  useEffect(() => {
    if (!token) forceLogout();
  }, [token]);

  // Auto-dismiss success banner after 3 seconds
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const clearFeedback = useCallback(() => {
    setSuccess("");
    setError("");
    setScoreError("");
  }, []);

  const switchTab = (tabId) => {
    if (tabId === activeTab) return;
    clearFeedback();
    setActiveTab(tabId);
  };

  const handleAttendanceChange = (e) => {
    const { name, value } = e.target;
    clearFeedback();
    setAttendanceForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGradesChange = (e) => {
    const { name, value } = e.target;
    clearFeedback();
    setGradesForm((prev) => ({ ...prev, [name]: value }));
  };

  /* Shared POST helper: attaches auth headers and handles 401 */
  const postJson = async (path, body) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      forceLogout();
      throw new Error("Session expired. Redirecting to login...");
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}.`;
      try {
        const data = await response.json();
        if (data && (data.message || data.error)) message = data.message || data.error;
      } catch {
        /* response had no JSON body */
      }
      throw new Error(message);
    }
  };

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (attendanceForm.date > today) {
      setError("Attendance date cannot be in the future.");
      return;
    }

    setIsLoading(true);
    try {
      await postJson("/attendance", {
        studentId: Number(attendanceForm.studentId),
        subjectId: Number(attendanceForm.subjectId),
        date: attendanceForm.date,
        status: attendanceForm.status,
      });
      setSuccess("Attendance marked successfully.");
      setAttendanceForm(EMPTY_ATTENDANCE);
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Unable to reach the server. Please try again." : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradesSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();

    const score = parseFloat(gradesForm.score);
    const maxScore = parseFloat(gradesForm.maxScore);

    if (score > maxScore) {
      setScoreError("Score cannot be greater than Max Score");
      setError("Score cannot be greater than Max Score");
      return;
    }

    setIsLoading(true);
    try {
      await postJson("/marks", {
        studentId: Number(gradesForm.studentId),
        examId: Number(gradesForm.examId),
        subjectId: Number(gradesForm.subjectId),
        score,
        maxScore,
      });
      setSuccess("Grades recorded successfully.");
      setGradesForm(EMPTY_GRADES);
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Unable to reach the server. Please try again." : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Avoid flashing the portal while redirecting
  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 text-lg font-bold text-white">
              E
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-blue-900">Eduverse</h1>
              <p className="text-xs text-slate-500">Teacher Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-slate-500 sm:block">
              <p className="font-medium capitalize text-slate-700">{role ? role.toLowerCase() : "teacher"}</p>
              {institutionId && <p>Institution #{institutionId}</p>}
            </div>
            <button
              type="button"
              onClick={forceLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-900/20"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Tab pills */}
        <div
          role="tablist"
          aria-label="Teacher tasks"
          className="mb-6 inline-flex rounded-xl bg-white p-1.5 shadow-md"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                onClick={() => switchTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-900/20 sm:px-6 ${
                  isActive
                    ? "bg-blue-900 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white p-6 shadow-md sm:p-8">
          <Banner type="success" message={success} />
          <Banner type="error" message={error} />

          {activeTab === "attendance" && (
            <section id="panel-attendance" role="tabpanel" aria-labelledby="tab-attendance">
              <h2 className="text-xl font-bold text-blue-900">Mark Attendance</h2>
              <p className="mb-6 mt-1 text-sm text-slate-500">
                Record a student's attendance for a subject on a given date.
              </p>

              <form onSubmit={handleAttendanceSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Student ID" htmlFor="att-studentId">
                    <input
                      id="att-studentId"
                      name="studentId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 1024"
                      value={attendanceForm.studentId}
                      onChange={handleAttendanceChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Subject ID" htmlFor="att-subjectId">
                    <input
                      id="att-subjectId"
                      name="subjectId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 12"
                      value={attendanceForm.subjectId}
                      onChange={handleAttendanceChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Date" htmlFor="att-date" hint="Future dates are not allowed.">
                    <input
                      id="att-date"
                      name="date"
                      type="date"
                      required
                      max={today}
                      value={attendanceForm.date}
                      onChange={handleAttendanceChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Status" htmlFor="att-status">
                    <select
                      id="att-status"
                      name="status"
                      required
                      value={attendanceForm.status}
                      onChange={handleAttendanceChange}
                      disabled={isLoading}
                      className={inputClass}
                    >
                      <option value="" disabled>
                        Select status
                      </option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="flex justify-end pt-2">
                  <SubmitButton isLoading={isLoading} loadingText="Submitting...">
                    Mark Attendance
                  </SubmitButton>
                </div>
              </form>
            </section>
          )}

          {activeTab === "grades" && (
            <section id="panel-grades" role="tabpanel" aria-labelledby="tab-grades">
              <h2 className="text-xl font-bold text-blue-900">Record Grades</h2>
              <p className="mb-6 mt-1 text-sm text-slate-500">
                Enter a student's score for a specific exam and subject.
              </p>

              <form onSubmit={handleGradesSubmit} className="space-y-5" noValidate={false}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Student ID" htmlFor="gr-studentId">
                    <input
                      id="gr-studentId"
                      name="studentId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 1024"
                      value={gradesForm.studentId}
                      onChange={handleGradesChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Exam ID" htmlFor="gr-examId">
                    <input
                      id="gr-examId"
                      name="examId"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 5"
                      value={gradesForm.examId}
                      onChange={handleGradesChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Subject ID" htmlFor="gr-subjectId">
                      <input
                        id="gr-subjectId"
                        name="subjectId"
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 12"
                        value={gradesForm.subjectId}
                        onChange={handleGradesChange}
                        disabled={isLoading}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Score" htmlFor="gr-score" error={scoreError}>
                    <input
                      id="gr-score"
                      name="score"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 78.5"
                      value={gradesForm.score}
                      onChange={handleGradesChange}
                      disabled={isLoading}
                      aria-invalid={Boolean(scoreError)}
                      className={`${inputClass} ${
                        scoreError ? "border-red-500 focus:border-red-600 focus:ring-red-600/20" : ""
                      }`}
                    />
                  </Field>

                  <Field label="Max Score" htmlFor="gr-maxScore">
                    <input
                      id="gr-maxScore"
                      name="maxScore"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 100"
                      value={gradesForm.maxScore}
                      onChange={handleGradesChange}
                      disabled={isLoading}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="flex justify-end pt-2">
                  <SubmitButton isLoading={isLoading} loadingText="Saving...">
                    Record Grades
                  </SubmitButton>
                </div>
              </form>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
