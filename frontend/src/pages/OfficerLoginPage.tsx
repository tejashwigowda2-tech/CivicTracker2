import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { DemoBanner } from "../components/DemoBanner";
import { useAuth } from "../context/AuthContext";

export const OfficerLoginPage: React.FC = () => {
  const { loginStaff } = useAuth();
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState<"employee_id" | "email">("employee_id");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const performLogin = async (idVal: string, pwVal: string, byEmpId: boolean) => {
    setError(null);
    setLoading(true);
    try {
      const user = await loginStaff(idVal, pwVal, byEmpId);
      navigate(user.role === "admin" ? "/admin" : "/officer");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(identifier, password, loginMode === "employee_id");
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-5">
      <DemoBanner compact />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-navy-900 text-white flex items-center justify-center mx-auto mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">Restricted Staff & Administrator Portal</h1>
          <p className="text-xs text-slate-500">
            Role-based access enforced server-side. Demonstration accounts simulate department queues only.
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLoginMode("employee_id")}
            className={`py-2 rounded-lg transition ${loginMode === "employee_id" ? "bg-white text-navy-900 shadow-sm" : "text-slate-600"}`}
          >
            Employee ID (Officer)
          </button>
          <button
            type="button"
            onClick={() => setLoginMode("email")}
            className={`py-2 rounded-lg transition ${loginMode === "email" ? "bg-white text-navy-900 shadow-sm" : "text-slate-600"}`}
          >
            Email (Officer / Admin)
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {loginMode === "employee_id" ? "Demo Employee ID" : "Staff Email"}
            </label>
            <input
              type={loginMode === "email" ? "email" : "text"}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={loginMode === "employee_id" ? "EMP-DEMO-101" : "admin@civictrack.demo"}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
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
            {loading ? "Authenticating..." : "Sign In to Restricted Portal"}
          </button>
        </form>

        {/* Demo Quick Login Panel */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">
            Demonstration Accounts (Click to Sign In)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            <button
              type="button"
              onClick={() => performLogin("EMP-DEMO-101", "Officer@123", true)}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs"
            >
              <span className="font-bold text-navy-900 block">EMP-DEMO-101</span>
              <span className="text-slate-500">Roads Queue • Indiranagar</span>
            </button>
            <button
              type="button"
              onClick={() => performLogin("EMP-DEMO-102", "Officer@123", true)}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs"
            >
              <span className="font-bold text-navy-900 block">EMP-DEMO-102</span>
              <span className="text-slate-500">Sanitation Queue • Koramangala</span>
            </button>
            <button
              type="button"
              onClick={() => performLogin("EMP-DEMO-103", "Officer@123", true)}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs"
            >
              <span className="font-bold text-navy-900 block">EMP-DEMO-103</span>
              <span className="text-slate-500">Drains Queue • Koramangala</span>
            </button>
            <button
              type="button"
              onClick={() => performLogin("admin@civictrack.demo", "Admin@123", false)}
              className="p-2.5 rounded-xl border border-civicTeal-500/40 bg-civicTeal-50/50 hover:bg-civicTeal-50 text-xs"
            >
              <span className="font-bold text-civicTeal-700 block">Administrator Portal</span>
              <span className="text-slate-600">admin@civictrack.demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
