import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { AdminProvider } from "./context/AdminContext";
import { ContractorProvider } from "./context/ContractorContext";
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';

ReactDOM.createRoot(document.getElementById("root")).render( 
  <React.StrictMode>
    <UserProvider>
      <AdminProvider>
        <ContractorProvider>
        <BrowserRouter>
          <Routes>
            {/* User + Admin site */}
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
        </ContractorProvider>
      </AdminProvider>
    </UserProvider>
  </React.StrictMode>
);