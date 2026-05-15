import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import * as XLSX from "xlsx";
import "./css/summaryReport.css";

const SummaryReport = () => {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [data, setData] = useState([]);

  // 🔹 Load categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await apiGet("/api/categories");
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load categories");
    }
  };

  // 🔍 Search
  const handleSearch = async () => {
    if (!year || !month) {
      alert("Select year and month");
      return;
    }

    try {
      const res = await apiPost("/api/summary-report", {
        category: categoryId,
        year,
        month,
      });

      setData(res.data || []);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // 📊 Total
  const total = data.reduce((sum, row) => {
    return sum + (parseFloat(row.price_rm) || 0);
  }, 0);

  // 📥 Excel
  const downloadExcel = () => {
    if (!data.length) {
      alert("No data");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Report");

    XLSX.writeFile(wb, "summary_report.xlsx");
  };

  // 🔹 Year dropdown
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // 🔹 Month names
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  return (
    <div className="summary-report-container">
      <h2 className="title">Summary Report</h2>

      {/* 🔹 Filters */}
      <div className="filters-card">

        {/* Top Row */}
        <div className="filters-top">

          {/* Category */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>

          {/* Year */}
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Select Year</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Month */}
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Select Month</option>
            {months.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>

        </div>

        {/* Bottom Row */}
        <div className="filters-bottom">
          <button className="btn primary" onClick={handleSearch}>
            🔍 Search
          </button>

          <button className="btn success" onClick={downloadExcel}>
            ⬇ Download
          </button>
        </div>
      </div>

      {/* 📊 Table */}
      <div className="table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Workorder</th>
                <th>Status</th>
                <th>Created</th>
                <th>Completed</th>
                <th>Category</th>
                <th>Item</th>
                <th>Type</th>
                <th>Description</th>
                <th>Region</th>
                <th>State</th>
                <th>City</th>
                <th>Client</th>
                <th>Contractor</th>
                <th>Price</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td>{row.workorder}</td>
                  <td>{row.status}</td>
                  <td>{row.created_t}</td>
                  <td>{row.workorder_completed_time}</td>
                  <td>{row.category_name}</td>
                  <td>{row.item_name}</td>
                  <td>{row.type_name}</td>
                  <td>{row.description_name}</td>
                  <td>{row.region_name}</td>
                  <td>{row.state_name}</td>
                  <td>{row.city_name}</td>
                  <td>{row.client}</td>
                  <td>{row.contractor_name}</td>
                  <td className="price">₹{row.price_rm}</td>
                </tr>
              ))}

              {data.length > 0 && (
                <tr className="total-row">
                  <td colSpan="13">Total</td>
                  <td className="price total">₹{total}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryReport;