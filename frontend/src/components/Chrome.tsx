import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { usePlanner } from "../state";

export function Navbar() {
  const { result } = usePlanner();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <Link to="/" className="logo" aria-label="FieldShift Planner home">
          <img src="/favicon.svg" alt="" width={34} height={34} />
          <span>Field<b>Shift</b></span>
        </Link>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
        <nav className={open ? "open" : ""}>
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/plan">Planner</NavLink>
          <NavLink to="/results" className={!result ? "disabled" : ""} onClick={(e) => !result && e.preventDefault()}>
            Results{result && <i className="pulse-dot" />}
          </NavLink>
          <NavLink to="/about">How it works</NavLink>
          <Link to="/plan" className="btn glow small">Start planning →</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Link to="/" className="logo"><img src="/favicon.svg" alt="" width={28} height={28} /><span>Field<b>Shift</b> Planner</span></Link>
          <p className="muted small">Built by <b className="gold">Team of Dream</b> for the NASA International Space Apps Challenge 2026 · Field Shift.</p>
        </div>
        <div className="footer-links">
          <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a>
          <a href="https://modis.ornl.gov/" target="_blank" rel="noreferrer">MODIS · ORNL DAAC</a>
          <a href="https://soilgrids.org/" target="_blank" rel="noreferrer">SoilGrids</a>
          <a href="https://www.spaceappschallenge.org/" target="_blank" rel="noreferrer">Space Apps</a>
        </div>
      </div>
    </footer>
  );
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}
