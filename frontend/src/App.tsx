import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Footer, Navbar, ScrollToTop } from "./components/Chrome";
import About from "./pages/About";
import Home from "./pages/Home";
import Planner from "./pages/Planner";
import Results from "./pages/Results";
import { PlannerProvider } from "./state";

function NotFound() {
  return (
    <div className="page center-page">
      <div className="lost">🪐</div>
      <h1>Lost in orbit</h1>
      <p className="muted">This page drifted out of range.</p>
      <Link to="/" className="btn glow">Back to Earth</Link>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <PlannerProvider>
      <div className="space-bg" aria-hidden="true">
        <div className="stars s1" />
        <div className="stars s2" />
        <div className="aurora a1" />
        <div className="aurora a2" />
      </div>
      <ScrollToTop />
      <Navbar />
      <main className="route" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<Planner />} />
          <Route path="/results" element={<Results />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </PlannerProvider>
  );
}
