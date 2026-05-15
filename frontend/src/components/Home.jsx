import React, { useEffect, useState } from "react";
import { Search, User, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import "./css/home.css";

function Home({ user }) {
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowHint((prev) => !prev);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
const navLinks = document.querySelectorAll(
  ".navbar-collapse .nav-link, .navbar-collapse .dropdown-item"
);
    const navbarCollapse = document.querySelector(".navbar-collapse");

    if (!navbarCollapse) return;

const handleLinkClick = () => {
  setTimeout(() => {
    if (navbarCollapse.classList.contains("show")) {
      const bsCollapse = new window.bootstrap.Collapse(navbarCollapse, {
        toggle: false,
      });
      bsCollapse.hide();
    }
  }, 9000);
};

    navLinks.forEach((link) =>
      link.addEventListener("click", handleLinkClick)
    );

    return () => {
      navLinks.forEach((link) =>
        link.removeEventListener("click", handleLinkClick)
      );
    };
  }, []);

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

          <div className="position-relative d-inline-block">
            {showHint && (
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
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>

          <div className="collapse navbar-collapse" id="navbarNav">
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
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <Link className="dropdown-item" to="/login">
                      Individual
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/contractor/login"
                    >
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
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <Link className="dropdown-item" to="/signup">
                      Individual
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="dropdown-item"
                      to="/contractor/signup"
                    >
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
            From home cleaning to beauty & repair – book professionals instantly
            and enjoy
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

      {/* ROLE CTA */}
      {/*<section className="py-5 bg-white">
        <div className="container">
          <h2 className="text-center fw-bold mb-4">
            Join as Individual or Contractor
          </h2>
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card shadow-sm border-0 h-100 role-card">
                <div className="card-body text-center p-4">
                  <User size={40} className="mb-3 text-primary" />
                  <h4>Individual Provider</h4>
                  <p className="text-muted">
                    Start receiving service requests near your location.
                  </p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <Link to="/login" className="btn btn-primary">
                      Login
                    </Link>
                    <Link to="/signup" className="btn btn-outline-primary">
                      Sign Up
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm border-0 h-100 role-card">
                <div className="card-body text-center p-4">
                  <Building2 size={40} className="mb-3 text-success" />
                  <h4>Contractor / Company</h4>
                  <p className="text-muted">
                    Manage teams, work orders and invoices efficiently.
                  </p>
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <Link
                      to="/contractor/login"
                      className="btn btn-success"
                    >
                      Login
                    </Link>
                    <Link
                      to="/contractor/signup"
                      className="btn btn-outline-success"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>*/}

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