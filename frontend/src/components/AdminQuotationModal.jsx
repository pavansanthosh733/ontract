import React, { useEffect, useState } from "react";
import { apiGet } from "../api";
import "./css/AdminQuotationModal.css";

function AdminQuotationModal({ show, responseId, onClose }) {
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (show && responseId) {
            fetchQuotation();
        }
    }, [show, responseId]);

    const fetchQuotation = async () => {
        try {
            setLoading(true);
            const data = await apiGet(`/api/admin/workorders/admin/rfq/response/${responseId}`);
            setQuotation(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (

        <div className="quotation-overlay">
            <div className="quotation-modal">
                <div className="quotation-header">
                    <div>
                        <h3>📋 Contractor Quotation</h3>
                        <p>Review contractor quotation and award the work.</p>
                    </div>

                    <button
                        className="btn-close"
                        onClick={onClose}
                    ></button>
                </div>

                <div className="quotation-body">
                    {
                        loading ?
                        <div className="quotation-loading">Loading quotation...</div>
                        :
                        quotation && (
                            <>
                                {/* ================= SUMMARY ================= */}
                                <div className="quotation-summary">
                                    <div className="summary-card">
                                        <div className="summary-icon">👤</div>
                                        <div>
                                            <span>Contractor</span>
                                            <h5>{quotation.header.contractor_name}</h5>
                                        </div>
                                    </div>

                                    <div className="summary-card">
                                        <div className="summary-icon">📅</div>
                                        <div>
                                            <span> Submitted </span>
                                            <h5>
                                                {new Date(
                                                    quotation.header.submitted_at
                                                ).toLocaleString("en-GB")}
                                            </h5>
                                        </div>
                                    </div>

                                    <div className="summary-card">
                                        <div className="summary-icon">🟢</div>
                                        <div>
                                            <span>Status</span>
                                            <div className="status-badge">
                                                {quotation.header.status}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="summary-card total-card">
                                        <div className="summary-icon">💰</div>
                                        <div>
                                            <span>Grand Total</span>
                                            <h3>
                                                RM {Number(
                                                    quotation.header.grand_total
                                                ).toFixed(2)}
                                            </h3>
                                        </div>
                                    </div>
                                </div>

                                {/* ================= ITEMS ================= */}

                                <div className="section-title">📦 Quotation Items</div>
                                <div className="table-responsive" 
                                 style={{ overflowX: "hidden" }} >
                                    <table className="table quotation-table">
                                        <thead>
                                            <tr>
                                                <th style={{width:"45%"}}>Item Description</th>
                                                <th style={{width:"15%"}} className="text-center">Qty</th>
                                                <th style={{width:"20%"}} className="text-end">Unit Price</th>
                                                <th style={{width:"20%"}} className="text-end">Total</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {
                                            quotation.items.map((item) => (
                                        <tr key={item.rfq_item_id}>
                                            <td
                                                style={{
                                                    whiteSpace: "normal",
                                                    wordBreak: "break-word"
                                                }}
                                            >
                                                {item.item_description}
                                            </td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-end">
                                                RM {Number(item.unit_price).toFixed(2)}
                                            </td>
                                            <td className="text-end fw-bold">
                                                RM {Number(item.total).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                }
                                </tbody>
                                    </table>
                                </div>

                                {/* ================= REMARKS ================= */}

                            <div className="remarks-card">
                                <div className="remarks-title">📝 Contractor Remarks</div>
                                    <div className="remarks-content">
                                        {
                                            quotation.header.remarks
                                                ?
                                                quotation.header.remarks
                                                :
                                                "No remarks provided."
                                        }
                                    </div>
                                </div>

                                {/* ================= FOOTER ================= */}

                                <div className="quotation-footer">
                                    <div className="footer-total">
                                        <small>Grand Total</small>
                                        <h2>
                                            RM {Number(
                                                quotation.header.grand_total
                                            ).toFixed(2)}
                                        </h2>
                                    </div>

                                    <div className="quotation-buttons">
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={onClose}
                                        >
                                            Close
                                        </button>

                                        <button
                                            className="btn btn-success award-btn"
                                            onClick={() => {
                                                alert("Award Contractor - Next Step");
                                            }}
                                        >
                                            🏆 Award Contractor
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                    }
                </div>
            </div>
        </div>
    );
}

export default AdminQuotationModal;