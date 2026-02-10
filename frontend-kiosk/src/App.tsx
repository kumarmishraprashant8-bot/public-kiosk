import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DemoPage from "./pages/DemoPage";
import HomePage from "./pages/HomePage";
import PhoneAuthPage from "./pages/PhoneAuthPage";
import SubmitPage from "./pages/SubmitPage";
import ReceiptPage from "./pages/ReceiptPage";
import TrackPage from "./pages/TrackPage";
import ARInspector from "./pages/ARInspector";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import PublicStats from "./pages/PublicStats";
import CrewDashboard from "./pages/CrewDashboard";
import LeaderboardPage from "./pages/LeaderboardPage";
import AnonymousReportPage from "./pages/AnonymousReportPage";
import EmergencyPage from "./pages/EmergencyPage";
import VerifyPage from "./pages/VerifyPage";
import SathiAssistant from './components/SathiAssistant';

import HeroLeaderboard from './pages/HeroLeaderboard';

import OfflineIndicator from './components/OfflineIndicator';
import VoiceCommandFAB from './components/VoiceCommandFAB';

function App() {
  return (
    <Router>
      <div className="bg-black min-h-screen text-white font-sans selection:bg-blue-500/30">
        <OfflineIndicator />
        <VoiceCommandFAB />
        <SathiAssistant />
        <Routes>
          <Route path="/" element={<DemoPage />} />
          <Route path="/kiosk" element={<HomePage />} />
          <Route path="/phone" element={<PhoneAuthPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/receipt" element={<ReceiptPage />} />
          <Route path="/receipt/:receiptId" element={<ReceiptPage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/track/:shortCode" element={<TrackPage />} />
          <Route path="/ar" element={<ARInspector />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/stats" element={<PublicStats />} />
          <Route path="/crew" element={<CrewDashboard />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/heroes" element={<HeroLeaderboard />} />
          <Route path="/anonymous" element={<AnonymousReportPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/verify/:shortCode" element={<VerifyPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;


