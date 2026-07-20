import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import "./css/AdminRFQPublish.css";

function AdminRFQPublish() {

    const [rfqList, setRfqList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [publishTypes, setPublishTypes] = useState({});

    useEffect(() => {
        fetchOpenRFQs();
    }, []);

    const fetchOpenRFQs = async () => {
        try {
            setLoading(true);
            const data = await apiGet("/api/admin/workorders/admin/rfq/open/list");
            setRfqList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePublishTypeChange = (rfqId, value) => {
        setPublishTypes((prev) => ({
            ...prev,
            [rfqId]: value,
        }));
    };

    const handlePublish = async (rfq) => {
        const publishType = publishTypes[rfq.rfq_id];
        if (!publishType) {
            alert("Please select Publish Type.");
            return;
        }

        try {

            const result = await apiPost("/api/admin/workorders/admin/rfq/publish",
                {
                    rfq_no: rfq.rfq_no,
                    publish_type: publishType,
                }
            );

            alert(result.message || "RFQ Published Successfully.");
            fetchOpenRFQs();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }

    };

    const filteredRFQs = rfqList.filter((rfq) =>
        rfq.rfq_no
            ?.toLowerCase()
            .includes(searchText.toLowerCase()) ||

        rfq.rfq_title
            ?.toLowerCase()
            .includes(searchText.toLowerCase())
    );

    return (

        <div className="admin-rfq-container">
            <div className="card admin-rfq-card">
                <div className="admin-rfq-header">
                    <h4>RFQ Publish</h4>
                </div>

                <div className="card-body">
                    <div className="admin-rfq-toolbar">
                        <h5>Open RFQs</h5>

                        <input
                            type="text"
                            className="form-control admin-rfq-search"
                            placeholder="Search RFQ..."
                            value={searchText}
                            onChange={(e) =>
                                setSearchText(e.target.value)
                            }
                        />

                    </div>

                    <div className="table-responsive">

                        <table className="table table-bordered table-hover admin-rfq-table">
                            <thead>
                                <tr>
                                    <th>RFQ No</th>
                                    <th>RFQ Title</th>
                                    <th>Closing Date</th>
                                    <th>Status</th>
                                    <th>Publish Type</th>
                                    <th width="120">Action</th>
                                </tr>
                            </thead>

                            <tbody>

                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="loading-message"
                                        >
                                            Loading...
                                        </td>
                                    </tr>

                                ) : filteredRFQs.length === 0 ? (

                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="empty-message"
                                        >
                                            No Open RFQs Found
                                        </td>
                                    </tr>
                                ) : (

                                    filteredRFQs.map((rfq) => (
                                            <tr key={rfq.rfq_id}>
                                            <td>{rfq.rfq_no}</td>
                                            <td>{rfq.rfq_title}</td>
                                            <td>{rfq.closing_date}</td>
                                            <td>
                                                <span className="status-badge status-open">
                                                    {rfq.status}
                                                </span>
                                            </td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm publish-dropdown"
                                                    value={publishTypes[rfq.rfq_id] || ""}
                                                    onChange={(e) =>
                                                        handlePublishTypeChange(
                                                            rfq.rfq_id,
                                                            e.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="">Select Publish Type</option>
                                                    <option value="GENERAL">GENERAL</option>
                                                    <option value="SPECIALIZED">SPECIALIZED</option>
                                                    <option value="PANEL">PANEL</option>
                                                </select>

                                            </td>

                                            <td>
                                                <button
                                                    className="btn btn-success btn-sm publish-btn"
                                                    onClick={() =>
                                                        handlePublish(rfq)
                                                    }
                                                >
                                                    Publish
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminRFQPublish;