import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./Sidebar";

import CreateRegion from "./CreateRegion";
import CreateState from "./CreateState";
import CreateCity from "./CreateCity";
import CategoryPage from "./CategoryPage";
import ItemPage from "./itemPage";
import TypePage from "./TypePage";
import DescriptionPage from "./DescriptionPage";
import WorkorderMaxAmountPage from "./WorkorderMaxAmountPage";
import CreateZone from "./CreateZone";
import EditZone from "./EditZone";

function SetuppageLayout() {
  return (
    <div className="workorder-layout">
      <div className="top-nav">
        <Sidebar />
      </div>

      {/* Right Content Area */}
      <div className="workorder-content">
        <Routes>

          <Route path="/" element={<CategoryPage />} />

          <Route path="/region" element={<CreateRegion />} />
          <Route path="/state" element={<CreateState />} />
          <Route path="/city" element={<CreateCity />} />
          <Route path="/zones" element={<CreateZone />} />
          <Route path="/category" element={<CategoryPage />} />
          <Route path="/item" element={<ItemPage />} />
          <Route path="/type" element={<TypePage />} />
          <Route path="/description" element={<DescriptionPage />} />
          <Route path="/max-amount" element={<WorkorderMaxAmountPage />} />
          <Route  path="/edit-zone/:id"  element={<EditZone />}/>
        </Routes>
      </div>
    </div>
  );
}

export default SetuppageLayout;