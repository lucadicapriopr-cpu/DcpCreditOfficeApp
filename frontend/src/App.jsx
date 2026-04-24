import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Clienti from "./pages/Clienti";
import Insoluti from "./pages/Insoluti";
import PraticheLegali from "./pages/PraticheLegali";
import Report from "./pages/Report";
import CalendarTest from "./pages/CalendarTest"; // ✅ Import per il test
import Header from "./components/Header";
import Footer from "./components/Footer";

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow">
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/Home" element={<Navigate to="/" replace />} />
          <Route path="/auth/callback" element={<Navigate to="/" replace />} />

          {/* Altre pagine */}
          <Route path="/clienti" element={<Clienti />} />
          <Route path="/insoluti" element={<Insoluti />} />
          <Route path="/pratiche-legali" element={<PraticheLegali />} />
          <Route path="/report" element={<Report />} />

          {/* Test Calendario */}
          <Route path="/calendar-test" element={<CalendarTest />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
