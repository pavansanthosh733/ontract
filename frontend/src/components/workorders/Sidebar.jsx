import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./css/sidebar.css";

const Sidebar = () => {
  const [activeMenu, setActiveMenu] = useState("orders");
  const [isOpen, setIsOpen] = useState(false);

  const isMobile = window.innerWidth <= 768;

  // Auto open sidebar on desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(true);
    }
  }, []);


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
        <div className="menu-section">
          <div
            className="menu-title"
            onClick={() => setActiveMenu("orders")}
          >
            <span>Work Orders</span>
            <span className="menu-symbol">
              {activeMenu === "orders" ? "▼" : "▸"}
            </span>
          </div>

          {activeMenu === "orders" && (
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
              <NavLink
                to="/admin/workorder/completed-notifications"
                onClick={handleLinkClick}
              >
                Completed Notifications
              </NavLink>
              <NavLink to="/admin/workorder/search-workorder" onClick={handleLinkClick}>
                Workorder Search
              </NavLink>

            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;