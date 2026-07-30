import React, { useEffect, useState } from "react";
import "./css/AdminNegotiationModal.css";
import { apiPost } from "../api";
import { useAdmin } from "../context/AdminContext";

function AdminNegotiationModal({ show, contractor, onClose }) {
    const { admin } = useAdmin();

    const [message, setMessage] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [replyBefore, setReplyBefore] = useState("");
    const [remarks, setRemarks] = useState("");

    useEffect(() => {

        if (show) {

            setMessage("");
            setTargetAmount("");
            setReplyBefore("");
            setRemarks("");

        }

    }, [show]);

    if (!show) return null;
    
    const isMultiple = Array.isArray(contractor);
    const contractorCount = isMultiple ? contractor.length : 1;
    const totalQuotation = isMultiple
        ? contractor.reduce((sum, item) => sum + Number(item.grand_total || 0), 0) : contractor?.grand_total;

    const sendNegotiation = async () => {
        if (!message.trim()) {
            alert("Please enter negotiation message.");
            return;
        }

        if (!replyBefore) {
            alert("Please select reply before date.");
            return;
        }

        const payload = {
            mode: isMultiple ? "MULTIPLE" : "SINGLE",
            response_ids: isMultiple ? contractor.map(c => c.response_id) : [contractor.response_id],
            requested_amount: targetAmount,
            negotiation_message: message,
            reply_before: replyBefore,
            remarks: remarks,
            created_by: admin.admin_id
        };
      try {
            const response = await apiPost("/api/admin/workorders/admin/rfq/negotiation",payload);
            alert(response.message || "Negotiation sent successfully.");
            onClose();
        } catch (error) {
            alert(error.message || "Failed to send negotiation.");
        }
 
    };

    return (

        <div
            className="modal fade show"
            style={{
                display: "block",
                backgroundColor: "rgba(0,0,0,.5)"
            }}
        >

            <div className="modal-dialog modal-lg negotiation-modal">
                <div className="modal-content">
                    <div className="modal-header negotiation-header">
                        <h4 className="modal-title">🤝 RFQ Negotiation</h4>
                        <button
                            className="btn-close"
                            onClick={onClose}
                        ></button>
                    </div>

                    <div className="modal-body">
                        <div className="negotiation-summary">
                            <div className="summary-card">
                                <span>{isMultiple ? "Contractors" : "Current Quotation"}</span>
                                <h4>{ isMultiple ? contractorCount
                                            : ` ${Number(contractor?.grand_total || 0).toLocaleString()}`
                                    }
                                </h4>
                            </div>

                            <div className="summary-card">
                                <span>{isMultiple ? "Selected Contractors" : "Current Quotation"}</span>
                                <h4>
                                    {isMultiple
                                        ? contractorCount
                                        : `${Number(contractor?.grand_total || 0).toLocaleString()}`}
                                </h4>
                            </div>
                        </div>

                        <div className="form-section">
                            <label>Negotiation Message <span className="required">*</span></label>
                            <textarea
                                className="form-control"
                                rows={4}
                                placeholder="Enter negotiation message..."
                                value={message}
                                onChange={(e) =>
                                    setMessage(e.target.value)
                                }
                            />

                        </div>

                        <div className="row mt-3">
                            <div className="col-md-6">
                                <label>Target Amount (Optional)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Enter target amount"
                                    value={targetAmount}
                                    onChange={(e) =>
                                        setTargetAmount(e.target.value)
                                    }
                                />
                            </div>

                            <div className="col-md-6">
                                <label>Reply Before<span className="required">*</span></label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={replyBefore}
                                    onChange={(e) =>
                                        setReplyBefore(e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="form-section mt-3">
                            <label>Remarks</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Additional remarks..."
                                value={remarks}
                                onChange={(e) =>
                                    setRemarks(e.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                        >Cancel</button>
                        <button
                            className="btn btn-success"
                            onClick={sendNegotiation}
                        >🤝 Send Negotiation</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminNegotiationModal;