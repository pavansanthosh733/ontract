// Home.jsx
import React, { useEffect, useState, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import "./css/home.css";

function Home({ user }) {
  const [showHint, setShowHint] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null); // "login" | "signup" | null
  const navRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      setShowHint((prev) => !prev);
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  // Close everything on any route change
  useEffect(() => {
    setNavOpen(false);
    setOpenSection(null);
  }, [location.pathname]);

  // Close the menu when tapping/clicking outside it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setNavOpen(false);
        setOpenSection(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSection = (section) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const services = [
    {
      title: "Home Cleaning",
      img: "/assets/images/home_cleaning.jpeg",
      desc: "Professional deep cleaning for a sparkling home.",
    },
    {
      title: "Salon at Home",
      img: "/assets/images/home_salon.jpeg",
      desc: "Beauty & grooming by certified experts.",
    },
    {
      title: "AC Repair",
      img: "/assets/images/ac_repair.jpeg",
      desc: "Reliable and fast air conditioner servicing.",
    },
    {
      title: "Electrician",
      img: "/assets/images/electrician.jpeg",
      desc: "Expert help for wiring, installation & lighting.",
    },
    {
      title: "Plumbing",
      img: "/assets/images/plumbing.jpeg",
      desc: "Fix leaks and blockages quickly and affordably.",
    },
    {
      title: "Pest Control",
      img: "/assets/images/pest_control.jpeg",
      desc: "Safe and eco-friendly pest removal solutions.",
    },
  ];

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg sticky-top bg-white shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">
            Ontract Services
          </Link>

          <div className="position-relative d-inline-block" ref={navRef}>
            {showHint && !navOpen && (
              <span
                className="badge rounded-pill bg-danger d-lg-none"
                style={{
                  position: "absolute",
                  top: "-10px",
                  right: "-15px",
                  fontSize: "10px",
                  zIndex: 999,
                  padding: "5px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                Click Here
              </span>
            )}

            <button
              className="navbar-toggler"
              type="button"
              onClick={() => setNavOpen((prev) => !prev)}
              aria-expanded={navOpen}
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            {/* MOBILE DROPDOWN - anchored below the hamburger, with accordion sections */}
            <div className={`mobile-anchored-menu ${navOpen ? "open" : ""}`}>
              <Link
                className="anchored-link"
                to="/"
                onClick={() => setNavOpen(false)}
              >
                Home
              </Link>

              <div className="anchored-divider"></div>

              {/* LOGIN accordion */}
              <button
                className="anchored-toggle"
                onClick={() => toggleSection("login")}
                type="button"
              >
                Login
                <ChevronDown
                  size={16}
                  className={`chevron ${openSection === "login" ? "rotated" : ""}`}
                />
              </button>
              <div className={`anchored-submenu ${openSection === "login" ? "expanded" : ""}`}>
                <Link
                  className="anchored-link secondary"
                  to="/login"
                  onClick={() => setNavOpen(false)}
                >
                  Individual
                </Link>
                <Link
                  className="anchored-link secondary"
                  to="/contractor/login"
                  onClick={() => setNavOpen(false)}
                >
                  Contractor
                </Link>
              </div>

              <div className="anchored-divider"></div>

              {/* SIGN UP accordion */}
              <button
                className="anchored-toggle"
                onClick={() => toggleSection("signup")}
                type="button"
              >
                Sign Up
                <ChevronDown
                  size={16}
                  className={`chevron ${openSection === "signup" ? "rotated" : ""}`}
                />
              </button>
              <div className={`anchored-submenu ${openSection === "signup" ? "expanded" : ""}`}>
                <Link
                  className="anchored-link secondary"
                  to="/signup"
                  onClick={() => setNavOpen(false)}
                >
                  Individual
                </Link>
                <Link
                  className="anchored-link secondary"
                  to="/contractor/signup"
                  onClick={() => setNavOpen(false)}
                >
                  Contractor
                </Link>
              </div>
            </div>
          </div>

          {/* DESKTOP NAV - unchanged, only visible on large screens */}
          <div className="collapse navbar-collapse d-none d-lg-flex" id="navbarNavDesktop">
            <ul className="navbar-nav ms-auto align-items-center">
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  Home
                </Link>
              </li>

              <li className="nav-item dropdown">
                <button
                  className="nav-link dropdown-toggle btn btn-link text-decoration-none"
                  id="loginDropdown"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Login
                </button>

                <ul
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="loginDropdown"
                >
                  <li>
                    <Link className="dropdown-item" to="/login">
                      Individual
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/contractor/login">
                      Contractor
                    </Link>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown ms-2">
                <button
                  className="nav-link dropdown-toggle btn btn-link text-decoration-none"
                  id="signupDropdown"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Sign Up
                </button>

                <ul
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="signupDropdown"
                >
                  <li>
                    <Link className="dropdown-item" to="/signup">
                      Individual
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/contractor/signup">
                      Contractor
                    </Link>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section text-center text-white py-5">
        <div className="container">
          <h1 className="display-5 fw-bold mb-3">
            Find Trusted Services Near You
          </h1>
          <p className="lead mb-4">
            From home cleaning to Beauty & Repair – Book professionals instantly
            and enjoy the life
          </p>

          <div className="bg-white rounded-4 p-3 shadow-lg mx-auto search-box">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your location"
                />
              </div>
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search for a service"
                />
              </div>
              <div className="col-md-3 d-grid">
                <button className="btn btn-primary d-flex align-items-center justify-content-center">
                  <Search size={18} className="me-2" /> Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-5 bg-light">
        <div className="container">
          <h2 className="text-center mb-5 fw-semibold">Our Top Services</h2>
          <div className="row g-4">
            {services.map((service, index) => (
              <div className="col-12 col-sm-6 col-lg-4" key={index}>
                <div className="card h-100 shadow-sm border-0 service-card">
                  <img
                    src={service.img}
                    className="card-img-top"
                    alt={service.title}
                  />
                  <div className="card-body">
                    <h5 className="card-title">{service.title}</h5>
                    <p className="card-text text-muted">{service.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-dark text-light pt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-3 mb-4">
              <h5 className="text-white">Ontract</h5>
              <p className="small text-muted">
                Connecting verified contractors and customers.
              </p>
              <p className="small mt-2">© 2026 Ontract Services</p>
            </div>

            <div className="col-md-3 mb-4">
              <h6 className="text-white">Resources</h6>
              <ul className="list-unstyled small">
                <li>Help Center</li>
                <li>Support</li>
                <li>Developers</li>
              </ul>
            </div>

            <div className="col-md-3 mb-4">
              <h6 className="text-white">Company</h6>
              <ul className="list-unstyled small">
                <li>About</li>
                <li>Careers</li>
                <li>Blog</li>
              </ul>
            </div>

            <div className="col-md-3 mb-4">
              <h6 className="text-white">Stay Updated</h6>
              <input
                type="email"
                className="form-control form-control-sm"
                placeholder="Your email"
              />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Home;