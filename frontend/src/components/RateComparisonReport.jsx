import React, { useEffect, useState } from "react";
import { apiPost } from "../api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./css/rateComparisonReport.css";

const RateComparisonReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setEndDate("");
    }
  }, [startDate, endDate]);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Please select from date and to date");
      return;
    }

    if (endDate < startDate) {
      alert("To date must be greater than or equal to from date");
      return;
    }

    try {
      setLoading(true);
      const res = await apiPost("/api/rate-comparison-report", {
        start_date: startDate,
        end_date: endDate,
      });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = data.reduce((sum, row) => {
    return sum + (parseFloat(row.price_rm) || 0);
  }, 0);

  const totalService = data.reduce((sum, row) => {
    return sum + (parseFloat(row.service_rate) || 0);
  }, 0);

  const totalDiff = data.reduce((sum, row) => {
    return sum + (parseFloat(row.difference_rate) || 0);
  }, 0);

  const downloadExcel = () => {
    if (!data.length) {
      alert("No data to download");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rate Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(fileData, "rate_comparison_report.xlsx");
  };

  return (
    <div className="rate-report-container">
      <h2 className="title">Rate Comparison Report</h2>

      <div className="filters-card">
        <div className="filters-row">
          <div className="field-group">
            <label>From Date</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => {
                const value = e.target.value;
                setStartDate(value);
                if (endDate && value && endDate < value) {
                  setEndDate("");
                }
              }}
            />
          </div>

          <div className="field-group">
            <label>To Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
            />
          </div>

          <div className="field-group button-group">
            <label>Actions</label>
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
                <th>Category</th>
                <th>Item</th>
                <th>Type</th>
                <th>Description</th>
                <th>Region</th>
                <th>State</th>
                <th>City</th>
                <th>Client</th>
                <th>Contractor</th>
                <th>RM Price</th>
                <th>Service Rate</th>
                <th>Difference</th>
              </tr>
            </thead>

            <tbody>
              {data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={i}>
                    <td>{row.workorder}</td>
                    <td>{row.status}</td>
                    <td>{row.created_time}</td>
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
                    <td className="price">₹{row.service_rate}</td>
                    <td
                      className={`price ${
                        parseFloat(row.difference_rate) >= 0 ? "positive" : "negative"
                      }`}
                    >
                      ₹{row.difference_rate}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="15" className="empty-state">
                    No data found
                  </td>
                </tr>
              )}

              {data.length > 0 && (
                <tr className="total-row">
                  <td colSpan="12">Total</td>
                  <td className="price total">₹{totalPrice.toFixed(2)}</td>
                  <td className="price total">₹{totalService.toFixed(2)}</td>
                  <td className="price total">₹{totalDiff.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RateComparisonReport;