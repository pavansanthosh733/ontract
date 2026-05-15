import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./Sidebar";
import ChildWorkOrder from "./ChildWorkorder";
import SearchWorkOrder from "./SearchWorkorder";
import WorkorderAssignment from "./WorkorderAssignment";

// import "./css/sidebar.css";  // if needed for sidebar
import WorkOrderTypePage from "./Workorder_type";
import WorkOrderAreaPage from "./Workorder_Area";
import CreateWorkOrder from "./CreateWorkorder";
import MappingPage from "./MappingPage";
import WorkOrders from "./WorkOrder";
import WorkOrderDetails from "./WorkOrderDetails";
import Contractor from "./Contractor";

function WorkOrderLayout() {
  return (
    <div className="workorder-layout">
      {/* Left Sidebar */}
      <div className="top-nav">
        <Sidebar />   {/* ← Hamburger must be positioned relative to this */}
      </div>

      {/* Right Content Area */}
      <div className="workorder-content">
        <Routes>
          <Route path="/" element={<CreateWorkOrder/>} />
          <Route path="/create-workorder" element={<CreateWorkOrder />} />
          <Route path="/child-workorder" element={<ChildWorkOrder />} />
          <Route path="/mapping-workorder" element={<MappingPage />} />
          <Route path="/workorder-type" element={<WorkOrderTypePage />} />
          <Route path="/workorder-area" element={<WorkOrderAreaPage />} />                 
          <Route path="/list" element={<WorkOrders/>} />
          <Route path="/search-workorder" element={<SearchWorkOrder/>} />  
          <Route path="/contractor" element={<Contractor />} />
          <Route path="/contractor/workorders/:workorder" element={<WorkOrderDetails />} />
            <Route path="/WorkorderAssignment" element={<WorkorderAssignment />} />

        </Routes>
      </div>
    </div>
  );
}

export default  WorkOrderLayout;