import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import Select from "react-select";  
import "./css/AdminRFQPublish.css";


function AdminRFQPublish() {

    const [rfqList, setRfqList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [publishTypes, setPublishTypes] = useState({});
    const [locations, setLocations] = useState({});
    const [states, setStates] = useState([]);
    const [selectedStates, setSelectedStates] = useState({});
    const [showStateModal, setShowStateModal] = useState({});

    useEffect(() => {
        fetchOpenRFQs();
        fetchStates();
    }, []);

    const handleLocationChange = (rfqId, value) => {
        setLocations((prev) => ({
            ...prev,
            [rfqId]: value,
        }));
    };
    const handleStateChange = (rfqId, selectedOptions) => {
        setSelectedStates((prev) => ({
            ...prev,
            [rfqId]: selectedOptions || [],
        }));
    };

    const fetchStates = async () => {
        try {
            const data = await apiGet("/api/admin/state/active");
            setStates(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

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
        const location = locations[rfq.rfq_id];
        const stateIds = selectedStates[rfq.rfq_id]?.map((item) => item.value) || [];
        if (!publishType) {
            alert("Please select Publish Type.");
            return;
        }
        if (!location) {
            alert("Please select Location.");
            return;
        }
        if (location === "STATE" && stateIds.length === 0) {
            alert("Please select at least one state.");
            return;
        }

        try {

            const result = await apiPost("/api/admin/workorders/admin/rfq/publish",
                {
                    rfq_no: rfq.rfq_no,
                    publish_type: publishType,
                    location: location,
                    state_ids: location === "STATE" ? stateIds : [],
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
                                    <th>Contractor Type</th>
                                    <th>Location</th>
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
                                            <td>{rfq.status}</td>
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
                                                <select
                                                    className="form-select form-select-sm publish-dropdown"
                                                    value={locations[rfq.rfq_id] || ""}
                                                    onChange={(e) =>
                                                        handleLocationChange(rfq.rfq_id, e.target.value)
                                                    }
                                                >
                                                    <option value="">Select Location</option>
                                                    <option value="GLOBAL">GLOBAL</option>
                                                    <option value="STATE">STATE</option>
                                                </select>

                                                {locations[rfq.rfq_id] === "STATE" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm mt-2"
                                                        onClick={() =>
                                                            setShowStateModal((prev) => ({
                                                                ...prev,
                                                                [rfq.rfq_id]: true,
                                                            }))
                                                        }
                                                    >
                                                        Select States
                                                    </button>

                                                    {selectedStates[rfq.rfq_id]?.length > 0 && (
                                                        <div className="mt-1 text-success">
                                                            {selectedStates[rfq.rfq_id].length} State(s) Selected
                                                        </div>
                                                    )}
                                                </>
                                            )}
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
            {filteredRFQs.map((rfq) => (
                showStateModal[rfq.rfq_id] && (

                    <div
                        key={`modal-${rfq.rfq_id}`}
                        className="modal fade show"
                        style={{
                            display: "block",
                            backgroundColor: "rgba(0,0,0,.5)"
                        }}
                    >

                        <div className="modal-dialog modal-lg">

                            <div className="modal-content">

                                <div className="modal-header">

                                    <h5 className="modal-title">Select States</h5>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() =>
                                            setShowStateModal((prev) => ({
                                                ...prev,
                                                [rfq.rfq_id]: false,
                                            }))
                                        }
                                    />

                                </div>

                                <div className="modal-body">

                                    <Select
                                        isMulti
                                        closeMenuOnSelect={false}
                                        options={states.map((state) => ({
                                            value: state.state_id,
                                            label: state.state_name,
                                        }))}
                                        value={selectedStates[rfq.rfq_id] || []}
                                        onChange={(selectedOptions) =>
                                            handleStateChange(
                                                rfq.rfq_id,
                                                selectedOptions
                                            )
                                        }
                                    />

                                </div>

                                <div className="modal-footer">

                                    <button
                                        className="btn btn-primary"
                                        onClick={() =>
                                            setShowStateModal((prev) => ({
                                                ...prev,
                                                [rfq.rfq_id]: false,
                                            }))
                                        }
                                    >
                                        Done
                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                )
            ))}
        </div>
        
    );
}

export default AdminRFQPublish;