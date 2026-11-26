import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  LogOut,
  Menu,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { NotificationItem } from "../types";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = () => {
    if (!user) return;
    apiRequest<{ unread_count: number; notifications: NotificationItem[] }>("/api/notifications")
      .then((res) => {
        setNotifications(res.notifications);
        setUnreadCount(res.unread_count);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  const markAllRead = async () => {
    await apiRequest("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    loadNotifications();
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-white/15 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-navy-900 text-white shadow-sm border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-civicTeal-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-lg tracking-tight block">CivicTrack</span>
              <span className="text-[10px] uppercase tracking-widest text-civicTeal-100 block">
                Report • Track • Verify
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/report" className={navLinkClass}>
              Report an Issue
            </NavLink>
            <NavLink to="/explore" className={navLinkClass}>
              Explore Complaints
            </NavLink>
            <NavLink to="/recurring" className={navLinkClass}>
              Issue Memory
            </NavLink>
            <NavLink to="/how-it-works" className={navLinkClass}>
              How It Works
            </NavLink>
            {user?.role === "officer" && (
              <NavLink to="/officer" className={navLinkClass}>
                Officer Portal
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin Portal
              </NavLink>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((o) => !o);
                    loadNotifications();
                  }}
                  className="relative p-2 rounded-lg text-slate-200 hover:bg-white/10 hover:text-white transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-sm text-navy-900">Notifications</span>
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs font-medium text-civicTeal-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500 text-center">No notifications yet.</p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.notification_id}
                            type="button"
                            onClick={() => {
                              setNotifOpen(false);
                              if (n.complaint_id) navigate(`/complaints/${n.complaint_id}`);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition ${
                              n.is_read ? "opacity-70" : "bg-civicTeal-50/40"
                            }`}
                          >
                            <p className="text-xs font-semibold text-navy-900">{n.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-right leading-tight">
                  <p className="text-xs font-semibold text-white">{user.full_name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-civicTeal-100">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/citizen-login"
                  className="px-3 py-1.5 rounded-lg border border-white/25 text-xs font-semibold hover:bg-white/10 transition inline-flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Citizen Sign In
                </Link>
                <Link
                  to="/officer-login"
                  className="px-3 py-1.5 rounded-lg bg-civicTeal-600 hover:bg-civicTeal-700 text-xs font-semibold transition"
                >
                  Officer Login
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((m) => !m)}
              className="lg:hidden p-2 rounded-lg text-slate-200 hover:bg-white/10"
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="lg:hidden bg-navy-800 border-t border-navy-700 px-4 py-3 space-y-1">
            <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10">
              Home
            </Link>
            <Link to="/report" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10">
              Report an Issue
            </Link>
            <Link to="/explore" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10">
              Explore Complaints
            </Link>
            <Link to="/recurring" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10">
              Civic Issue Memory
            </Link>
            <Link to="/how-it-works" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10">
              How It Works & About
            </Link>
            {user?.role === "officer" && (
              <Link to="/officer" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium bg-civicTeal-700/40">
                Officer Portal
              </Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium bg-civicTeal-700/40">
                Admin Portal
              </Link>
            )}
            <div className="pt-2 border-t border-navy-700 flex flex-wrap gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                    navigate("/");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold"
                >
                  Sign Out ({user.full_name})
                </button>
              ) : (
                <>
                  <Link to="/citizen-login" onClick={() => setMobileOpen(false)} className="px-3 py-1.5 rounded-lg border border-white/25 text-xs font-semibold">
                    Citizen Sign In
                  </Link>
                  <Link to="/officer-login" onClick={() => setMobileOpen(false)} className="px-3 py-1.5 rounded-lg bg-civicTeal-600 text-xs font-semibold">
                    Officer Login
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-navy-900 text-slate-300 border-t border-navy-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-base mb-2">
                <ShieldCheck className="w-5 h-5 text-civicTeal-500" /> CivicTrack
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Report. Track. Verify. Improve. An independent AI-assisted civic infrastructure platform
                built for transparency, issue memory, and evidence-based resolution.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">Platform Portals</h4>
              <ul className="space-y-1.5 text-xs">
                <li><Link to="/report" className="hover:text-white">Report an Infrastructure Issue</Link></li>
                <li><Link to="/explore" className="hover:text-white">Explore Public Complaints</Link></li>
                <li><Link to="/recurring" className="hover:text-white">Civic Issue Memory (Recurring)</Link></li>
                <li><Link to="/officer-login" className="hover:text-white">Department Officer & Admin Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">Governance & Trust</h4>
              <ul className="space-y-1.5 text-xs">
                <li><Link to="/how-it-works#about" className="hover:text-white">About CivicTrack</Link></li>
                <li><Link to="/how-it-works#privacy" className="hover:text-white">Privacy & Anonymous Reporting</Link></li>
                <li><Link to="/how-it-works#terms" className="hover:text-white">Terms & Independence Disclaimer</Link></li>
                <li><Link to="/how-it-works#contact" className="hover:text-white">Contact & Pilot Feedback</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>CivicTrack Prototype • Independent Demonstration Platform (No Official Government Affiliation)</span>
            <span>OpenStreetMap • FastAPI • React</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
