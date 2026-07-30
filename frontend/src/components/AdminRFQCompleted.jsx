import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import "./css/AdminRFQResponses.css";
import { BASE_URL } from "../api";

function AdminRFQCompleted() {
    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRFQ, setSelectedRFQ] = useState(null);
    const [adminRemarks, setAdminRemarks] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRfqs = rfqs.slice(firstIndex, lastIndex);
    const totalPages = Math.ceil(rfqs.length / recordsPerPage);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchCompletedRFQs();
    }, []);

    const fetchCompletedRFQs = async () => {

        try {

            const data = await apiGet("/api/admin/workorders/admin/rfq/completed");
            setRfqs(Array.isArray(data) ? data : []);
            setCurrentPage(1);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }

    };

    const viewCompletedRFQ = async (rfqNo) => {
        try {
            const data = await apiGet(`/api/admin/workorders/admin/rfq/completed/details/${rfqNo}`);
            setSelectedRFQ(data);
            setAdminRemarks("");
            setShowModal(true);
        } catch (err) {
            console.error(err);
            alert("Unable to load RFQ details.");
        }

    };

    const approveCompletion = async () => {
        if (!window.confirm("Are you sure you want to close this RFQ?")) {
            return;
        }

        try {

            const payload = {
                rfq_id: selectedRFQ.header.rfq_id,
                remarks: adminRemarks
            };

            const response = await apiPost("/api/admin/workorders/admin/rfq/completion/approve",payload);
            alert(response.message);
            setShowModal(false);
            fetchCompletedRFQs();
        } catch (err) {
            console.error(err);
        }
    };

    const reopenWork = async () => {
        if (!adminRemarks.trim()) {
            alert("Please enter admin remarks.");
            return;
        }
        if (!window.confirm("Are you sure you want to reopen this RFQ?")) {
            return;
        }
        try {
            const payload = {
                rfq_id: selectedRFQ.header.rfq_id,
                remarks: adminRemarks
            };
            const response = await apiPost("/api/admin/workorders/admin/rfq/completion/reopen",payload);
            alert(response.message);
            setShowModal(false);
            fetchCompletedRFQs();
        } catch (err) {
            console.error(err);
        }
    };

    return (

        <>
            <div className="container-fluid px-4 mt-4">
                <div className="card rfq-response-card">
                    <div className="rfq-response-header">
                        <h4 className="mb-1">✅ RFQ Completion Approval</h4>
                    </div>

                    <div className="card-body p-0">
                        <div className="table-responsive">
                            {
                                loading ?
                                    <div className="no-data">NO DATA</div>
                                    :
                                    <>
                                        <table className="table table-hover align-middle rfq-table">
                                            <thead>
                                                <tr>
                                                    <th>RFQ No</th>
                                                    <th>Title</th>
                                                    <th>Contractor</th>
                                                    <th>Completed On</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {
                                                    rfqs.length === 0 ?
                                                        <tr>
                                                            <td
                                                                colSpan="5"
                                                                className="text-center"
                                                            >
                                                                No Completed RFQs
                                                            </td>
                                                        </tr>

                                                        :

                                                        currentRfqs.map((rfq) => (

                                                        <tr key={rfq.rfq_id}>
                                                            <td><strong>{rfq.rfq_no}</strong></td>
                                                            <td>{rfq.rfq_title}</td>
                                                            <td>{rfq.contractor_name}</td>
                                                            <td>{rfq.completed_at}</td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    onClick={() =>
                                                                        viewCompletedRFQ(rfq.rfq_no)
                                                                    }
                                                                >
                                                                     View
                                                                </button>
                                                            </td>
                                                        </tr>

                                                    ))
                                                }
                                            </tbody>
                                        </table>
                                    </>
                            }
                        </div>
                    </div>
                </div>
            </div>
            {
                showModal &&
                selectedRFQ && (

                    <div
                        className="modal fade show"
                        style={{
                            display: "block",
                            background: "rgba(0,0,0,.5)"
                        }}
                    >

                        <div className="modal-dialog modal-xl">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h4>RFQ Completion Details</h4>
                                    <button
                                        className="btn-close"
                                        onClick={() =>
                                            setShowModal(false)
                                        }
                                    />
                                </div>

                                <div className="modal-body">
                                    <table className="table table-bordered">
                                        <tbody>
                                            <tr>
                                                <th>RFQ No</th>
                                                <td>{selectedRFQ.header.rfq_no}</td>
                                            </tr>
                                            <tr>
                                                <th>Title</th>
                                                <td>{selectedRFQ.header.rfq_title}</td>
                                            </tr>

                                            <tr>
                                                <th>Category</th>
                                                <td>{selectedRFQ.header.category_name}</td>
                                            </tr>

                                            <tr>
                                                <th>Region</th>
                                                <td>{selectedRFQ.header.region_name}</td>
                                            </tr>

                                            <tr>
                                                <th>State</th>
                                                <td>{selectedRFQ.header.state_name}</td>
                                            </tr>

                                            <tr>
                                                <th>City</th>
                                                <td>{selectedRFQ.header.city_name}</td>
                                            </tr>

                                        </tbody>
                                    </table>
                                    <hr />
                                    <h5>Project Description</h5>
                                    <p>{selectedRFQ.header.description}</p>
                                    <hr />
                                    <h5>Final Approved Quotation</h5>
                                    <table className="table table-bordered">
                                        <tbody>
                                            <tr>
                                                <th>Amount</th>
                                                <td>{selectedRFQ.quotation.grand_total}</td>
                                            </tr>
                                            <tr>
                                                <th>Remarks</th>
                                                <td>{selectedRFQ.quotation.remarks}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <hr />
                                    <h5>Completion Remarks</h5>
                                    <p>{selectedRFQ.header.completion_remarks}</p>
                                    <hr />
                                    <h5>Completion Images</h5>
                                    {
                                        selectedRFQ.header.completion_attachments?.length > 0 ? (
                                            <div className="proof-links-only">
                                                {
                                                    selectedRFQ.header.completion_attachments.map(
                                                        (img, index) => {
                                                            const fullUrl = `${BASE_URL}${img}`;
                                                            return (
                                                                <button
                                                                    key={index}
                                                                    type="button"
                                                                    className="open-btn"
                                                                    onClick={() => window.open(fullUrl, "_blank")}
                                                                >
                                                                    Click Here to View Image
                                                                </button>
                                                            );
                                                        }
                                                    )
                                                }

                                            </div>

                                        ) : (
                                            <p className="text-muted">No completion images available.</p>
                                        )
                                    }

                                    <hr />
                                    <label>Admin Remarks</label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        value={adminRemarks}
                                        onChange={(e) =>
                                            setAdminRemarks(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button
                                        className="btn btn-danger"
                                        onClick={reopenWork}
                                    >
                                        Reopen RFQ
                                    </button>

                                    <button
                                        className="btn btn-success"
                                        onClick={approveCompletion}
                                    >
                                        Close RFQ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}

export default AdminRFQCompleted;