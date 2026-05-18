import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "../api";
import * as XLSX from "xlsx";
import "./css/summaryReport.css";

const SummaryReport = () => {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [year, setYear] = useState("");
  const [yearQuery, setYearQuery] = useState("");
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const [month, setMonth] = useState("");
  const [monthQuery, setMonthQuery] = useState("");
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const categoryRef = useRef(null);
  const yearRef = useRef(null);
  const monthRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await apiGet("/api/categories");
      const list = Array.isArray(res.data) ? res.data : [];
      setCategories(list);
      console.log("✅ Categories loaded:", list.length);
    } catch (err) {
      console.error("❌ Failed to load categories:", err);
      alert("Failed to load categories");
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return categories;

    return categories.filter((c) => {
      const name = String(c.category_name || "").toLowerCase();
      const id = String(c.category_id || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [categories, categoryQuery]);

  const filteredYears = useMemo(() => {
    const q = yearQuery.trim().toLowerCase();
    if (!q) return years;
    return years.filter((y) => y.toLowerCase().includes(q));
  }, [years, yearQuery]);

  const filteredMonths = useMemo(() => {
    const q = monthQuery.trim().toLowerCase();
    if (!q) return months;
    return months.filter((m) => m.label.toLowerCase().includes(q));
  }, [months, monthQuery]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => String(c.category_id) === String(categoryId)) || null;
  }, [categories, categoryId]);

  useEffect(() => {
    if (selectedCategory) {
      setCategoryQuery(selectedCategory.category_name || "");
    }
  }, [selectedCategory]);

  const selectedYear = useMemo(() => {
    return years.find((y) => String(y) === String(year)) || "";
  }, [years, year]);

  useEffect(() => {
    if (selectedYear) {
      setYearQuery(selectedYear);
    }
  }, [selectedYear]);

  const selectedMonth = useMemo(() => {
    return months.find((m) => String(m.value) === String(month)) || null;
  }, [months, month]);

  useEffect(() => {
    if (selectedMonth) {
      setMonthQuery(selectedMonth.label);
    }
  }, [selectedMonth]);

  const handleCategoryFocus = () => setShowCategoryDropdown(true);
  const handleYearFocus = () => setShowYearDropdown(true);
  const handleMonthFocus = () => setShowMonthDropdown(true);

  const handleSearch = async () => {
    if (!year || !month) {
      alert("Select year and month");
      return;
    }

    try {
      setLoading(true);
      console.log("🔍 Summary search:", {
        category: categoryId,
        year,
        month,
      });

      const res = await apiPost("/api/summary-report", {
        category: categoryId,
        year,
        month,
      });

      setData(Array.isArray(res.data) ? res.data : []);
      console.log("✅ Summary rows received:", Array.isArray(res.data) ? res.data.length : 0);
    } catch (err) {
      console.error("❌ Summary report failed:", err);
      alert(err?.response?.data?.message || err.message || "Failed to load summary report");
    } finally {
      setLoading(false);
    }
  };

  const total = data.reduce((sum, row) => {
    return sum + (parseFloat(row.price_rm) || 0);
  }, 0);

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

  const handleCategorySelect = (c) => {
    setCategoryId(c.category_id);
    setCategoryQuery(c.category_name || "");
    setShowCategoryDropdown(false);
  };

  const handleYearSelect = (y) => {
    setYear(y);
    setYearQuery(y);
    setShowYearDropdown(false);
  };

  const handleMonthSelect = (m) => {
    setMonth(m.value);
    setMonthQuery(m.label);
    setShowMonthDropdown(false);
  };

  return (
    <div className="summary-report-container">
      <h2 className="title">Summary Report</h2>

      <div className="filters-card">
        <div className="filters-row">
          <div
            className="field-group searchable-group"
            ref={categoryRef}
            onBlur={(e) => {
              if (categoryRef.current && !categoryRef.current.contains(e.relatedTarget)) {
                setTimeout(() => setShowCategoryDropdown(false), 100);
              }
            }}
          >
            <label>Category</label>
            <div className="search-dropdown">
              <input
                type="text"
                value={categoryQuery}
                onFocus={handleCategoryFocus}
                onChange={(e) => {
                  setCategoryQuery(e.target.value);
                  setCategoryId("");
                  setShowCategoryDropdown(true);
                }}
                placeholder="Type category name"
                autoComplete="off"
              />
              {showCategoryDropdown && (
                <div className="dropdown-menu">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((c) => (
                      <div
                        key={c.category_id}
                        className="dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleCategorySelect(c);
                        }}
                      >
                        <div className="dropdown-name">{c.category_name}</div>
                        <div className="dropdown-meta">ID: {c.category_id}</div>
                      </div>
                    ))
                  ) : (
                    <div className="dropdown-empty">No categories found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            className="field-group searchable-group"
            ref={yearRef}
            onBlur={(e) => {
              if (yearRef.current && !yearRef.current.contains(e.relatedTarget)) {
                setTimeout(() => setShowYearDropdown(false), 100);
              }
            }}
          >
            <label>Year</label>
            <div className="search-dropdown">
              <input
                type="text"
                value={yearQuery}
                onFocus={handleYearFocus}
                onChange={(e) => {
                  setYearQuery(e.target.value);
                  setYear("");
                  setShowYearDropdown(true);
                }}
                placeholder="Type year"
                autoComplete="off"
              />
              {showYearDropdown && (
                <div className="dropdown-menu">
                  {filteredYears.length > 0 ? (
                    filteredYears.map((y) => (
                      <div
                        key={y}
                        className="dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleYearSelect(y);
                        }}
                      >
                        <div className="dropdown-name">{y}</div>
                      </div>
                    ))
                  ) : (
                    <div className="dropdown-empty">No years found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            className="field-group searchable-group"
            ref={monthRef}
            onBlur={(e) => {
              if (monthRef.current && !monthRef.current.contains(e.relatedTarget)) {
                setTimeout(() => setShowMonthDropdown(false), 100);
              }
            }}
          >
            <label>Month</label>
            <div className="search-dropdown">
              <input
                type="text"
                value={monthQuery}
                onFocus={handleMonthFocus}
                onChange={(e) => {
                  setMonthQuery(e.target.value);
                  setMonth("");
                  setShowMonthDropdown(true);
                }}
                placeholder="Type month"
                autoComplete="off"
              />
              {showMonthDropdown && (
                <div className="dropdown-menu">
                  {filteredMonths.length > 0 ? (
                    filteredMonths.map((m) => (
                      <div
                        key={m.value}
                        className="dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleMonthSelect(m);
                        }}
                      >
                        <div className="dropdown-name">{m.label}</div>
                      </div>
                    ))
                  ) : (
                    <div className="dropdown-empty">No months found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="field-group button-group">
            <label className="button-label">Actions</label>
            <div className="filters-actions">
              <button className="btn primary" onClick={handleSearch} disabled={loading}>
                {loading ? "Searching..." : "🔍 Search"}
              </button>
              <button className="btn success" onClick={downloadExcel}>
                ⬇ Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="report-table">
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
              {data.length > 0 ? (
                data.map((row, i) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan="14" className="empty-state">
                    No data found
                  </td>
                </tr>
              )}

              {data.length > 0 && (
                <tr className="total-row">
                  <td colSpan="13">Total</td>
                  <td className="price total">₹{total.toFixed(2)}</td>
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