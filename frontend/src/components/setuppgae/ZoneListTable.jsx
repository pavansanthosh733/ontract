import React, { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet } from "../../api";
import { Link } from "react-router-dom";
import "./css/createzone.css";

const ZoneListTable = ({ refreshKey }) => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    zone: "",
    status: "",
    state: "",
    city: "",
  });

  useEffect(() => {
    fetchZones();
  }, [refreshKey]);

  const fetchZones = async () => {
    try {
      setLoading(true);

      const res = await apiGet("/api/zone/");

      if (Array.isArray(res)) {
        setZones(res);
      } else {
        setZones([]);
      }
    } catch (error) {
      console.error("Failed to fetch zones", error);
      setZones([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this zone?"
    );

    if (!confirmDelete) return;

    try {
      const res = await apiDelete(`/api/zone/${id}`);

      if (res?.error) {
        alert(res.error);
        return;
      }

      alert("Zone deleted successfully");
      fetchZones();
    } catch (error) {
      console.error(error);
      alert("Failed to delete zone");
    }
  };

  const handleFilter = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const filteredZones = useMemo(() => {
    return zones.filter((item) => {
      const zoneName = item.zone_name || "";
      const status = item.status || "";
      const stateNames = item.state_names || "";
      const cityNames = item.city_names || "";

      return (
        zoneName
          .toLowerCase()
          .includes(filters.zone.toLowerCase()) &&
        status
          .toLowerCase()
          .includes(filters.status.toLowerCase()) &&
        stateNames
          .toLowerCase()
          .includes(filters.state.toLowerCase()) &&
        cityNames
          .toLowerCase()
          .includes(filters.city.toLowerCase())
      );
    });
  }, [zones, filters]);

  return (
    <div className="zone-box">
      <h2>Existing Zones</h2>

      <div className="zone-table-wrapper">
        <div className="fixed-table">
          <table className="zone-table">

            <thead>
              {/* HEADER */}
              <tr>
                <th>Zone</th>
                <th>Status</th>
                <th>State</th>
                <th>City</th>
                <th>Actions</th>
              </tr>

              {/* FILTER ROW */}
              <tr>
                <th>
                  <input
                    type="text"
                    name="zone"
                    value={filters.zone}
                    onChange={handleFilter}
                    placeholder="Filter zone..."
                    className="zone-filter-input"
                  />
                </th>

                <th>
                  <input
                    type="text"
                    name="status"
                    value={filters.status}
                    onChange={handleFilter}
                    placeholder="Filter status..."
                    className="zone-filter-input"
                  />
                </th>

                <th>
                  <input
                    type="text"
                    name="state"
                    value={filters.state}
                    onChange={handleFilter}
                    placeholder="Filter state..."
                    className="zone-filter-input"
                  />
                </th>

                <th>
                  <input
                    type="text"
                    name="city"
                    value={filters.city}
                    onChange={handleFilter}
                    placeholder="Filter city..."
                    className="zone-filter-input"
                  />
                </th>

                <th></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">Loading...</td>
                </tr>
              ) : filteredZones.length > 0 ? (
                filteredZones.map((zone) => (
                  <tr key={zone.id}>
                    <td>{zone.zone_name}</td>
                    <td>{zone.status}</td>
                    <td>{zone.state_names}</td>
                    <td>{zone.city_names}</td>

<td>
  <Link
    to={`/admin/setuppage/edit-zone/${zone.id}`}
    className="zone-btn-edit-link"
  >
    Edit
  </Link>



  <button
    type="button"
    onClick={() => handleDelete(zone.id)}
    className="zone-btn-delete"
  >
    Delete
  </button>
</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No Data Found</td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
};

export default ZoneListTable;