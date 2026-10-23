    import { useState } from "react";

const API_URL = "http://localhost:8080/api/v1/auth/login";

   // Placeholder: replace with react-router's useNavigate() or your own routing logic.
   function redirectToDashboard(role) {
     window.location.reload();
   }
 
export default function Login() {
  const [form, setForm] = useState({
    institutionCode: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionCode: form.institutionCode.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      if (!response.ok) {
        let message = "Login failed. Please try again.";
        if (response.status === 401) {
          message = "Invalid institution code, email or password.";
        } else if (response.status === 403) {
          message = "Access denied. Your account may be inactive.";
        } else if (response.status >= 500) {
          message = "Server error. Please try again later.";
        } else {
          try {
            const data = await response.json();
            if (data?.message) message = data.message;
          } catch {
            /* response had no JSON body */
          }
        }
        throw new Error(message);
      }

      const data = await response.json();
      // Expected: { token, email, role, institutionId }
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("institutionId", String(data.institutionId));

      redirectToDashboard(data.role);
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Unable to reach the server. Check your connection and try again.");
      } else {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 disabled:cursor-not-allowed disabled:bg-slate-100";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 font-sans">
      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-900/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-900/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 shadow-lg shadow-blue-900/30">
            <svg
              className="h-7 w-7 text-white"
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Edu<span className="text-blue-900">Verse</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your institution's workspace
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            Enter your credentials to continue.
          </p>

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

          <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
            <div>
              <label
                htmlFor="institutionCode"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Institution Code
              </label>
              <input
                id="institutionCode"
                name="institutionCode"
                type="text"
                required
                autoComplete="organization"
                placeholder="e.g. DPS-NOIDA"
                value={form.institutionCode}
                onChange={handleChange}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@school.edu"
                value={form.email}
                onChange={handleChange}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={`${inputClass} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-blue-900 hover:text-blue-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
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
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} EduVerse ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
