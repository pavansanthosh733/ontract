import React, { useEffect, useState } from "react";
import { apiGet } from "../api";
import AdminNegotiationDetailsModal from "./AdminNegotiationDetailsModal";
import "./css/AdminRFQNegotiations.css";
import "bootstrap-icons/font/bootstrap-icons.css";

function AdminRFQNegotiations() {

    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [contractors, setContractors] = useState([]);
    const [selectedRFQ, setSelectedRFQ] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedNegotiation, setSelectedNegotiation] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRfqs = rfqs.slice(firstIndex, lastIndex);
    const totalPages = Math.ceil(rfqs.length / recordsPerPage);

    useEffect(() => {
        fetchNegotiations();
    }, []);

    const fetchNegotiations = async () => {

        try {

            const data = await apiGet("/api/admin/workorders/rfq/negotiations");
            setRfqs(Array.isArray(data) ? data : []);
            setCurrentPage(1);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const viewContractors = async (rfqNo) => {

        try {
            const data = await apiGet(`/api/admin/workorders/rfq/negotiations/${rfqNo}`);
            setContractors(Array.isArray(data) ? data : []);
            setSelectedRFQ(rfqNo);
            setShowModal(true);

        } catch (err) {
            console.error(err);
            alert("Unable to load negotiations.");
        }
    };
    const viewNegotiation = async (negotiationId) => {
        try {
            const data = await apiGet(`/api/admin/workorders/rfq/negotiation/${negotiationId}`);
            setSelectedNegotiation(data);
            setShowDetailsModal(true);
        }

        catch (err) {
            console.error(err);
            alert("Unable to load negotiation details.");
        }
    };

    return (
        <>
            <div className="container-fluid px-4 mt-4">
                <div className="card rfq-response-card">
                    <div className="rfq-response-header"><h4 className="mb-1">🤝 RFQ Negotiations</h4></div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            { loading ? ( <div className="no-data">Loading Negotiations...</div> ) :
                        (
                    <>
                        <table className="table table-hover align-middle rfq-table">
                            <thead>
                              <tr>
                                <th style={{ width: "20%" }}>RFQ No</th>
                                <th style={{ width: "35%" }}>RFQ Title</th>
                                <th style={{ width: "20%" }}>Closing Date</th>
                                <th style={{ width: "10%" }}>Negotiations</th>
                                <th style={{ width: "15%" }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                            {
                                rfqs.length === 0 ? (
                            <tr>
                                <td  colSpan="5" className="text-center">No Negotiations Found</td>
                            </tr>
                                ) : currentRfqs.map((rfq) => (
                                <tr key={rfq.rfq_id}>
                                <td><strong>{rfq.rfq_no}</strong></td>
                                <td>{rfq.rfq_title}</td>
                                <td>{
                                    new Date(
                                        rfq.closing_date
                                        ).toLocaleDateString("en-GB") }
                                </td>
                                <td><span className="response-count">{rfq.negotiation_count}</span></td>
                                <td><button
                                        className="btn btn-primary btn-sm btn-view"
                                        onClick={() => viewContractors(rfq.rfq_no)}
                                    >
                                    <i className="bi bi-eye-fill me-1"></i>View
                                    </button>
                                </td>

                                </tr>
                            ))
                            }
                        </tbody>
                        </table>
                                            {

                                                totalPages > 1 &&

                                                (

                                                    <div className="pagination-container">

                                                        <button
                                                            disabled={currentPage === 1}
                                                            onClick={() =>
                                                                setCurrentPage(currentPage - 1)
                                                            }
                                                        >
                                                            Previous
                                                        </button>

                                                        {

                                                            [...Array(totalPages)].map((_, index) => (

                                                                <button
                                                                    key={index}
                                                                    className={
                                                                        currentPage === index + 1
                                                                            ? "active-page"
                                                                            : ""
                                                                    }
                                                                    onClick={() =>
                                                                        setCurrentPage(index + 1)
                                                                    }
                                                                >

                                                                    {index + 1}

                                                                </button>

                                                            ))

                                                        }

                                                        <button
                                                            disabled={
                                                                currentPage === totalPages
                                                            }
                                                            onClick={() =>
                                                                setCurrentPage(currentPage + 1)
                                                            }
                                                        >
                                                            Next
                                                        </button>

                                                    </div>

                                                )

                                            }

                                        </>

                                    )

                            }

                        </div>

                    </div>

                </div>

            </div>
                        {
                showModal && (

                    <div
                        className="modal fade show"
                        style={{
                            display: "block",
                            backgroundColor: "rgba(0,0,0,.5)"
                        }}
                    >

                        <div className="modal-dialog modal-xl response-modal">

                            <div className="modal-content">

                                <div className="modal-header">

                                    <h4 className="modal-title">

                                        Contractor Negotiations
                                        {
                                            selectedRFQ &&
                                            ` - ${selectedRFQ}`
                                        }

                                    </h4>

                                    <button
                                        className="btn-close"
                                        onClick={() => {
                                            setShowModal(false);
                                            setContractors([]);
                                        }}
                                    ></button>

                                </div>

                                <div className="modal-body">

                                    {

                                        contractors.length === 0 ?

                                            (

                                                <div className="no-data">

                                                    No negotiations found.

                                                </div>

                                            )

                                            :

                                            (

                                                <div className="contractor-list">

                                                    {

                                                        contractors.map((row) => (

                                                            <div
                                                                key={row.negotiation_id}
                                                                className="contractor-card"
                                                            >

                                                                <div className="contractor-left">

                                                                    <div className="contractor-avatar">
                                                                        <i className="bi bi-person-fill"></i>
                                                                    </div>

                                                                    <div>

                                                                        <h5 className="mb-1">
                                                                            {row.contractor_name}
                                                                        </h5>

                                                                        <span
                                                                            className={`badge ${
                                                                                row.status === "REPLIED"
                                                                                    ? "bg-success"
                                                                                    : row.status === "PENDING"
                                                                                    ? "bg-warning text-dark"
                                                                                    : "bg-secondary"
                                                                            }`}
                                                                        >
                                                                            {row.status}
                                                                        </span>

                                                                        <div className="mt-3">

    <div className="d-flex justify-content-between align-items-center mb-2">

        <strong>💰 Original Quotation</strong>

        <strong className="text-dark">

            {Number(row.original_amount).toLocaleString("en-US", {
                minimumFractionDigits: 2
            })}

        </strong>

    </div>

    <div className="d-flex justify-content-between align-items-center mb-2">

        <strong>🎯 Admin Requested</strong>

        <strong className="text-primary">

            {Number(row.requested_amount).toLocaleString("en-US", {
                minimumFractionDigits: 2
            })}

        </strong>

    </div>

    {

        row.revised_amount &&

        <div className="d-flex justify-content-between align-items-center mb-2">

            <strong>🤝 Contractor Offered</strong>

            <strong className="text-success">

                {Number(row.revised_amount).toLocaleString("en-US", {
                    minimumFractionDigits: 2
                })}

            </strong>

        </div>

    }

    {

        row.replied_on &&

        <div className="text-muted small mt-2">

            <i className="bi bi-calendar-event me-1"></i>

            Replied On :

            {

                new Date(row.replied_on).toLocaleDateString("en-GB")

            }

        </div>

    }

</div>

                                                                    </div>

                                                                </div>

                                                                <div
                                                                    className="contractor-right"
                                                                    style={{
                                                                        minWidth: "260px",
                                                                        textAlign: "right"
                                                                    }}
                                                                >

                                                                    <div className="mb-4">

    <span
        className={`badge px-3 py-2 ${
            row.action === "COUNTER_OFFER"
                ? "bg-primary"
                : row.action === "ACCEPT"
                ? "bg-success"
                : row.action === "REJECT"
                ? "bg-danger"
                : "bg-secondary"
        }`}
    >

        {row.action
            ? row.action.replaceAll("_", " ").toUpperCase()
            : "WAITING"}

    </span>

</div>

                                                                    <button
                                                                        className="btn btn-primary contractor-btn"
                                                                        onClick={() => viewNegotiation(row.negotiation_id)}
                                                                    >

                                                                        <i className="bi bi-eye-fill me-2"></i>

                                                                        View Negotiation

                                                                    </button>

                                                                </div>

                                                            </div>

                                                        ))

                                                    }

                                                </div>

                                            )

                                    }

                                </div>

                                <div className="modal-footer">

                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {

                                            setShowModal(false);
                                            setContractors([]);

                                        }}
                                    >

                                        Close

                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                )

            }

            <AdminNegotiationDetailsModal
                show={showDetailsModal}
                negotiation={selectedNegotiation}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedNegotiation(null);
                }}
                onApproved={() => {
                    setShowDetailsModal(false);
                    setSelectedNegotiation(null);
                    fetchNegotiations();
                }}
            />

        </>

    );

}

export default AdminRFQNegotiations;