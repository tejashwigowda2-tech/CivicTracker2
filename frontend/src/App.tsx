import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { CitizenAuthPage } from "./pages/CitizenAuthPage";
import { ComplaintDetailPage } from "./pages/ComplaintDetailPage";
import { ExploreComplaintsPage } from "./pages/ExploreComplaintsPage";
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { OfficerDashboardPage } from "./pages/OfficerDashboardPage";
import { OfficerLoginPage } from "./pages/OfficerLoginPage";
import { RecurringIssuesPage } from "./pages/RecurringIssuesPage";
import { ReportIssuePage } from "./pages/ReportIssuePage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/report" element={<ReportIssuePage />} />
            <Route path="/explore" element={<ExploreComplaintsPage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="/recurring" element={<RecurringIssuesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/citizen-login" element={<CitizenAuthPage />} />
            <Route path="/officer-login" element={<OfficerLoginPage />} />
            <Route path="/officer" element={<OfficerDashboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
