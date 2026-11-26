import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const CitizenAuthPage: React.FC = () => {
  const { loginCitizen, registerCitizen } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await loginCitizen(email, password);
      } else {
        await registerCitizen(fullName, email, phone, password);
      }
      navigate("/explore");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginCitizen(demoEmail, "Citizen@123");
      navigate("/explore");
    } catch (err: any) {
      setError(err.message || "Demo sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="text-center space-y-1">
          <div className="w-11 h-11 rounded-xl bg-civicTeal-50 text-civicTeal-700 flex items-center justify-center mx-auto mb-2">
            <UserCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">
            {mode === "login" ? "Citizen Sign In" : "Create Citizen Account"}
          </h1>
          <p className="text-xs text-slate-500">
            Sign in to support public issues, receive status updates, and verify completed repairs.
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2 rounded-lg transition ${mode === "login" ? "bg-white text-navy-900 shadow-sm" : "text-slate-600"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`py-2 rounded-lg transition ${mode === "register" ? "bg-white text-navy-900 shadow-sm" : "text-slate-600"}`}
          >
            Register
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold transition disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center">
            Demo Citizen Accounts (Password: Citizen@123)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickDemoLogin("ananya@citizen.demo")}
              className="py-1.5 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-navy-900"
            >
              Ananya Rao
            </button>
            <button
              type="button"
              onClick={() => quickDemoLogin("rohan@citizen.demo")}
              className="py-1.5 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-navy-900"
            >
              Rohan Deshmukh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
