import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./css/sidebar.css";

const Sidebar = () => {
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const isMobile = window.innerWidth <= 768;

  // Auto open sidebar on desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(true);
    }
  }, []);

  const getSymbol = (menu) => (hoveredMenu === menu ? "▼" : "▸");

  const handleLinkClick = () => {
    if (isMobile) setIsOpen(false);
  };

  return (
    <div className="sidebar-container">
      <div className="hamburger" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </div>

      <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>

        

        {/* Work Orders */}
        <div
          className="menu-section"
          onMouseEnter={() => !isMobile && setHoveredMenu("orders")}
          onMouseLeave={() => !isMobile && setHoveredMenu(null)}
        >
          <div
            className="menu-title"
            onClick={() =>
              isMobile &&
              setHoveredMenu(hoveredMenu === "orders" ? null : "orders")
            }
          >
            <span>Work Orders</span>
            <span className="menu-symbol">{getSymbol("orders")}</span>
          </div>

          {hoveredMenu === "orders" && (
            <div className="submenu">
              <NavLink to="/admin/workorder/create-workorder" onClick={handleLinkClick}>
                Create Work Order
              </NavLink>
              <NavLink to="/admin/workorder/workorder" onClick={handleLinkClick}>
                List Work Orders
              </NavLink>
              <NavLink to="/admin/workorder/contractor" onClick={handleLinkClick}>
                Manual Assignment WorkOrder
              </NavLink>
              <NavLink to="/admin/workorder/WorkorderAssignment" onClick={handleLinkClick}>
                Auto Workorder Assignment
              </NavLink>
              {/* <NavLink to="/admin/workorder/search-workorder" onClick={handleLinkClick}>
                Workorder Search
              </NavLink> */}

            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
