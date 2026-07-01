import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./css/sidebar.css";

const Sidebar = () => {
  const [activeMenus, setActiveMenus] = useState({
    setup: true,
    areaSetup: true,
  });
  const toggleMenu = (menu) => {
    setActiveMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };
  const [isOpen, setIsOpen] = useState(false);

  const isMobile = window.innerWidth <= 768;

  // Auto open sidebar on desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(true);
    }
  }, []);

  const getSymbol = (menu) => (activeMenus[menu] ? "▼" : "▸");

  const handleLinkClick = () => {
    if (isMobile) setIsOpen(false);
  };

  return (
    <div className="sidebar-container">
      <div className="hamburger" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </div>

      <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>


        <div className="menu-section">
          <div
            className="menu-title"
            onClick={() => toggleMenu("setup")}
          >
            <span>Work Orders Setup</span>
            <span className="menu-symbol">{getSymbol("setup")}</span>
          </div>

          {activeMenus.setup && (
            <div className="submenu">
              <NavLink to="/admin/setuppage/category" onClick={handleLinkClick}>
                Work Category
              </NavLink>
              <NavLink to="/admin/setuppage/item" onClick={handleLinkClick}>
                Work Items
              </NavLink>
              <NavLink to="/admin/setuppage/type" onClick={handleLinkClick}>
                Work Types
              </NavLink>
              <NavLink to="/admin/setuppage/description" onClick={handleLinkClick}>
                Work Description
              </NavLink>
              <NavLink to="/admin/setuppage/max-amount" onClick={handleLinkClick}>
                Work Order Max Amount
              </NavLink>
            </div>
          )}
        </div>

        <div className="sidebar-divider"></div>

        {/* Area Setup */}
        <div className="menu-section">
          <div
            className="menu-title"
            onClick={() => toggleMenu("areaSetup")}
          >
            <span>Area Setup</span>
            <span className="menu-symbol">{getSymbol("areaSetup")}</span>
          </div>

          {activeMenus.areaSetup && (
            <div className="submenu">
              <NavLink to="/admin/setuppage/region" onClick={handleLinkClick}>
                Region
              </NavLink>
              <NavLink to="/admin/setuppage/state" onClick={handleLinkClick}>
                State
              </NavLink>
              <NavLink to="/admin/setuppage/zones" onClick={handleLinkClick}>
                Zones
              </NavLink>
              <NavLink to="/admin/setuppage/city" onClick={handleLinkClick}>
                City
              </NavLink>
            </div>
          )}
        </div>


      </aside>
    </div>
  );
};

export default Sidebar;