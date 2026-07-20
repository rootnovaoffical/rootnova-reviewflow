import { useState } from "react";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) setError(error);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50">
      <div className="card w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mb-3 text-3xl font-bold text-primary-600">RootNova</div>
          <p className="text-sm text-slate-500">Review Intelligence Platform</p>
        </div>

        <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
          <button
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signin" ? "bg-white text-primary-600 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-white text-primary-600 shadow-sm" : "text-slate-500"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
