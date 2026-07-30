import React, { useState } from "react";
import "./css/AdminNegotiationDetailsModal.css";
import { apiPost } from "../api";


function AdminNegotiationDetailsModal({show,negotiation,onClose,onApproved}) {

    if (!show || !negotiation) return null;

    const {header,quotation,admin_negotiation,contractor_reply} = negotiation;
    const [showNegotiationModal, setShowNegotiationModal] = useState(false);
    const [requestedAmount, setRequestedAmount] = useState("");
    const [replyBefore, setReplyBefore] = useState("");
    const [remarks, setRemarks] = useState("");

    const handleApprove = async () => {
        try {

            const payload = {negotiation_id: header.negotiation_id};
            const response = await apiPost("/api/admin/workorders/rfq/negotiation/approve",payload);
            alert(response.message || "Contractor assigned successfully.");
            if (onApproved) {
                onApproved();
            }
            onClose();
        } catch (err) {
            console.error(err);
            alert("Unable to assign contractor.");
        }

    };
    const handleNegotiateAgain = async () => {

        try {
            const payload = {
                negotiation_id: header.negotiation_id,
                requested_amount: requestedAmount,
                reply_before: replyBefore,
                remarks: remarks
            };

            const response = await apiPost("/api/admin/workorders/rfq/negotiation/create",payload);
            alert(response.message);
            setShowNegotiationModal(false);
            setRequestedAmount("");
            setReplyBefore("");
            setRemarks("");

            if (onApproved) {onApproved();}
        } catch (err) {
            console.error(err);
            alert("Unable to send negotiation.");
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
            <div className="modal-dialog modal-xl">
                <div className="modal-content">

                    <div className="modal-header">

                        <h4 className="modal-title">
                            Negotiation Details
                        </h4>

                        <button
                            className="btn-close"
                            onClick={onClose}
                        ></button>

                    </div>

                    <div className="modal-body">

                        {/* Contractor */}

                        <div className="card mb-3">

                            <div className="card-header bg-primary text-white">

                                Contractor Information

                            </div>

                            <div className="card-body">

                                <div className="row">

                                    <div className="col-md-6">

                                        <p>
                                            <strong>Contractor :</strong>{" "}
                                            {header.contractor_name}
                                        </p>

                                        <p>
                                            <strong>RFQ No :</strong>{" "}
                                            {header.rfq_no}
                                        </p>

                                    </div>

                                    <div className="col-md-6">

                                        <p>
                                            <strong>RFQ Title :</strong>{" "}
                                            {header.rfq_title}
                                        </p>

                                        <p>
                                            <strong>Status :</strong>{" "}
                                            <span className="badge bg-success">
                                                {header.status}
                                            </span>
                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                        {/* Previous Quotation */}

                        <div className="card mb-3">

                            <div className="card-header bg-success text-white">

                                Previous Quotation

                            </div>

                            <div className="card-body">

                                <h3 className="text-success">

                                    {quotation.original_amount}

                                </h3>

                            </div>

                        </div>

                        {/* Admin Negotiation */}

                        <div className="card mb-3">

                            <div className="card-header bg-warning">

                                Admin Negotiation

                            </div>

                            <div className="card-body">

                                <p>

                                    <strong>Requested Amount :</strong>{" "}

                                    {admin_negotiation.requested_amount}

                                </p>

                                <p>

                                    <strong>Reply Before :</strong>{" "}

                                    {
                                        new Date(
                                            admin_negotiation.reply_before
                                        ).toLocaleDateString("en-GB")
                                    }

                                </p>

                                <p>

                                    <strong>Remarks :</strong>{" "}

                                    {admin_negotiation.remarks}

                                </p>

                            </div>

                        </div>

                        {/* Contractor Reply */}

                        <div className="card mb-3">

                            <div className="card-header bg-info text-white">

                                Contractor Reply

                            </div>

                            <div className="card-body">

                                <p>

                                    <strong>Action :</strong>{" "}

                                    {
                                        contractor_reply.action
                                            ?.replaceAll("_", " ")
                                    }

                                </p>

                                <p>

                                    <strong>Revised Amount :</strong>{" "}

                                    {contractor_reply.revised_amount}

                                </p>

                                <p>

                                    <strong>Replied On :</strong>{" "}

                                    {
                                        contractor_reply.replied_on &&
                                        new Date(
                                            contractor_reply.replied_on
                                        ).toLocaleDateString("en-GB")
                                    }

                                </p>

                                <p>

                                    <strong>Remarks :</strong>{" "}

                                    {contractor_reply.remarks}

                                </p>

                            </div>

                        </div>

                    </div>

                    <div className="modal-footer justify-content-between">

                        <div>

                            <button
                                className="btn btn-success me-2"
                                onClick={handleApprove}
                            >
                                ✅ Approve
                            </button>


                            <button
                                className="btn btn-warning"
                                onClick={() => setShowNegotiationModal(true)}
                            >
                                🤝 Negotiate Again
                            </button>

                        </div>

                        <button
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Close
                        </button>

                    </div>

                </div>

            </div>
            
            {
    showNegotiationModal && (

        <div
            className="modal fade show"
            style={{
                display: "block",
                backgroundColor: "rgba(0,0,0,.5)"
            }}
        >

            <div className="modal-dialog">

                <div className="modal-content">

                    <div className="modal-header">

                        <h5 className="modal-title">

                            Negotiate Again

                        </h5>

                        <button
                            className="btn-close"
                            onClick={() => setShowNegotiationModal(false)}
                        ></button>

                    </div>

                    <div className="modal-body">

                        <div className="mb-3">

                            <label className="form-label">

                                Requested Amount

                            </label>

                            <input
                                type="number"
                                className="form-control"
                                value={requestedAmount}
                                onChange={(e) =>
                                    setRequestedAmount(e.target.value)
                                }
                            />

                        </div>

                        <div className="mb-3">

                            <label className="form-label">

                                Reply Before

                            </label>

                            <input
                                type="date"
                                className="form-control"
                                value={replyBefore}
                                onChange={(e) =>
                                    setReplyBefore(e.target.value)
                                }
                            />

                        </div>

                        <div className="mb-3">

                            <label className="form-label">

                                Remarks

                            </label>

                            <textarea
                                rows="3"
                                className="form-control"
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
                            onClick={() => setShowNegotiationModal(false)}
                        >
                            Cancel
                        </button>

                        <button
                            className="btn btn-warning"
                            onClick={handleNegotiateAgain}
                        >
                            Send Negotiation
                        </button>

                    </div>

                </div>

            </div>

        </div>

    )
}

        </div>
        
    );
}

export default AdminNegotiationDetailsModal;