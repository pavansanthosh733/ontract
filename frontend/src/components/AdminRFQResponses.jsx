import React, { useEffect, useState } from "react";
import { apiGet } from "../api";
import AdminQuotationModal from "./AdminQuotationModal";
import "./css/AdminRFQResponses.css";
import "bootstrap-icons/font/bootstrap-icons.css";

function AdminRFQResponses() {

    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [responseList, setResponseList] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedResponseId, setSelectedResponseId] = useState(null);
    const [showQuotationModal, setShowQuotationModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRfqs = rfqs.slice(firstIndex, lastIndex);
    const totalPages = Math.ceil(rfqs.length / recordsPerPage);

    useEffect(() => {
        fetchRFQs();
    }, []);

    const fetchRFQs = async () => {

        try {
            const data = await apiGet("/api/admin/workorders/admin/rfq/list");
            setRfqs(Array.isArray(data) ? data : []);
            setCurrentPage(1);

        }

        catch (err) {
            console.error(err);
        }

        finally {
            setLoading(false);
        }

    };

    const viewResponses = async (rfqNo) => {
        try {
            const data = await apiGet(`/api/admin/workorders/admin/rfq/${rfqNo}/responses`);
            setResponseList(Array.isArray(data) ? data : []);
            setShowModal(true);
        }

        catch (err) {
            console.error(err);
            alert("Unable to load contractor responses.");
        }

    };

    return (

        <>
            <div className="container-fluid px-4 mt-4">
                <div className="card rfq-response-card">
                    <div className="rfq-response-header">
                        <h4 className="mb-1">📋 RFQ Responses</h4>
                        <small>Review contractor quotations and award work orders</small>
                    </div>

                    <div className="card-body p-0">
                      <div className="table-responsive">
                        {
                            loading ? (
                                <div className="no-data">Loading RFQs...</div>
                               ) : (
                                <>
                                <table className="table table-hover align-middle rfq-table">
                                    <thead>
                                        <tr>
                                            <th style={{width:"20%"}}>RFQ No</th>
                                            <th style={{width:"20%"}}>Title</th>
                                            <th style={{width:"20%"}}>Closing Date</th>
                                            <th style={{width:"20%"}}>Responses</th>
                                            <th style={{width:"20%"}}>Action</th>
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
                                                        No RFQs Found
                                                    </td>
                                                </tr>
                                                :
                                                currentRfqs.map((rfq) => (
                                                    <tr key={rfq.rfq_id}>
                                                        <td><strong>{rfq.rfq_no}</strong></td>
                                                        <td>{rfq.rfq_title}</td>
                                                        <td>
                                                            {new Date(rfq.closing_date).toLocaleDateString("en-GB")}
                                                        </td>
                                                        <td>
                                                            <span className="response-count">
                                                                {rfq.response_count}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-primary btn-sm btn-view"
                                                                onClick={() => viewResponses(rfq.rfq_no)}
                                                            >
                                                                <i className="bi bi-eye-fill me-1"></i>
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                        }
                                    </tbody>
                                </table>
                                {totalPages > 1 && (
                                        <div className="pagination-container">

                                            <button
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(currentPage - 1)}
                                            >
                                                Previous
                                            </button>

                                            {[...Array(totalPages)].map((_, index) => (
                                                <button
                                                    key={index}
                                                    className={
                                                        currentPage === index + 1
                                                            ? "active-page"
                                                            : ""
                                                    }
                                                    onClick={() => setCurrentPage(index + 1)}
                                                >
                                                    {index + 1}
                                                </button>
                                            ))}

                                            <button
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(currentPage + 1)}
                                            >
                                                Next
                                            </button>

                                        </div>
                                    )}
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

                        <div className="modal-dialog modal-lg response-modal">

                            <div className="modal-content">

                                <div className="modal-header">
                                    <h4 className="modal-title">Contractor Responses</h4>
                                    <button
                                        className="btn-close"
                                        onClick={() => setShowModal(false)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    {
                                        responseList.length === 0 ?
                                            <div className="no-data">
                                                No contractor responses found.
                                            </div>

                                            :

                                            <div className="contractor-list">

                                {
                                    responseList.map((row,index)=>(

                                        <div
                                            key={row.response_id}
                                            className="contractor-card"
                                        >

                                            <div className="contractor-left">

                                                <div className="contractor-avatar">

                                                    👤

                                                </div>

                                                <div>

                                                    <h5>

                                                        {row.contractor_name}

                                                    </h5>

                                                    <span className="quote-rank">

                                                        {
                                                            index===0
                                                            ?
                                                            "🟢 Lowest Quotation"
                                                            :
                                                            "Quotation Submitted"
                                                        }

                                                    </span>

                                                </div>

                                            </div>

                                            <div className="contractor-right">

                                                <div className="contractor-price">

                                                    RM {row.grand_total}

                                                </div>

                                                <div className="contractor-date">

                                                    {new Date(row.submitted_at).toLocaleDateString("en-GB")}

                                                </div>

                                                <button
                                                    className="btn btn-primary contractor-btn"
                                                    onClick={()=>{

                                                        setSelectedResponseId(row.response_id);

                                                        setShowQuotationModal(true);

                                                    }}
                                                >

                                                    <i className="bi bi-eye-fill"></i>

                                                    View Quotation

                                                </button>

                                            </div>

                                        </div>

                                    ))
                                }

                            </div>

                                    }

                                </div>
                                                                <div className="modal-footer">

                                    <button
                                        className="btn btn-secondary btn-response"
                                        onClick={() => setShowModal(false)}
                                    >

                                        Close

                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                )

            }

            <AdminQuotationModal

                show={showQuotationModal}

                responseId={selectedResponseId}

                onClose={() => {

                    setShowQuotationModal(false);

                    setSelectedResponseId(null);

                }}

            />

        </>

    );

}

export default AdminRFQResponses;