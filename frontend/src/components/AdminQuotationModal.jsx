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

            const data = await apiGet(
                `/api/admin/workorders/admin/rfq/response/${responseId}`
            );

            setQuotation(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const showQtyColumn = quotation
        ? quotation.items.some(
              item =>
                  item.quantity !== null &&
                  item.quantity !== "" &&
                  Number(item.quantity) > 0
          )
        : false;

    const showDeliveryColumn = quotation
        ? quotation.items.some(
              item =>
                  item.delivery_date !== null &&
                  item.delivery_date !== ""
          )
        : false;

    const showWarrantyColumn = quotation
        ? quotation.items.some(
              item =>
                  item.warranty_period &&
                  item.warranty_period.trim() !== ""
          )
        : false;

    if (!show) return null;

    return (
        <div className="quotation-overlay">
            <div className="quotation-modal">

                {/* ================= HEADER ================= */}

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

                    {loading ? (

                        <div className="quotation-loading">
                            Loading quotation...
                        </div>

                    ) : (

                        quotation && (
                            <>

                                {/* ================= SUMMARY ================= */}

                                <div className="quotation-summary">

                                    <div className="summary-card">
                                        <div className="summary-icon">
                                            👤
                                        </div>

                                        <div>
                                            <span>Contractor</span>
                                            <h5>
                                                {quotation.header.contractor_name}
                                            </h5>
                                        </div>
                                    </div>

                                    <div className="summary-card">
                                        <div className="summary-icon">
                                            📅
                                        </div>

                                        <div>
                                            <span>Submitted</span>

                                            <h5>
                                                {new Date(
                                                    quotation.header.submitted_at
                                                ).toLocaleString("en-GB")}
                                            </h5>
                                        </div>
                                    </div>

                                    <div className="summary-card">
                                        <div className="summary-icon">
                                            🟢
                                        </div>

                                        <div>
                                            <span>Status</span>

                                            <div className="status-badge">
                                                {quotation.header.status}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="summary-card total-card">
                                        <div className="summary-icon">
                                            💰
                                        </div>

                                        <div>
                                            <span>Grand Total</span>
                                            <h3>{Number(quotation.header.grand_total).toFixed(2)}</h3>
                                        </div>
                                    </div>

                                </div>

                                {/* ================= ITEMS ================= */}
                        {quotation.items.length > 0 && (
                            <>
                                <div className="section-title"> 📦 Quotation Items </div>

                                <div className="table-responsive" style={{ overflowX: "hidden" }}>
                                    <table className="table quotation-table">

                                        <thead>

                                            <tr>

                                                <th style={{ width: "35%" }}>
                                                    Item Description
                                                </th>

                                                {showQtyColumn && (
                                                    <th
                                                        className="text-center"
                                                        style={{ width: "10%" }}
                                                    >
                                                        Qty
                                                    </th>
                                                )}

                                                {showDeliveryColumn && (
                                                    <th
                                                        className="text-center"
                                                        style={{ width: "15%" }}
                                                    >
                                                        Delivery Date
                                                    </th>
                                                )}

                                                <th
                                                    className="text-end"
                                                    style={{ width: "15%" }}
                                                >
                                                    Unit Price
                                                </th>

                                                {showWarrantyColumn && (
                                                    <th
                                                        className="text-center"
                                                        style={{ width: "15%" }}
                                                    >
                                                        Warranty
                                                    </th>
                                                )}

                                                <th
                                                    className="text-end"
                                                    style={{ width: "15%" }}
                                                >
                                                    Total
                                                </th>

                                            </tr>

                                        </thead>

                                        <tbody>
                                                                                        {quotation.items.map((item) => (
                                                <tr key={item.rfq_item_id}>

                                                    <td>
                                                        {item.item_description}
                                                    </td>

                                                    {showQtyColumn && (
                                                        <td className="text-center">
                                                            {item.quantity || "-"}
                                                        </td>
                                                    )}

                                                    {showDeliveryColumn && (
                                                        <td className="text-center">
                                                            {item.delivery_date
                                                                ? new Date(
                                                                      item.delivery_date
                                                                  ).toLocaleDateString(
                                                                      "en-GB"
                                                                  )
                                                                : "-"}
                                                        </td>
                                                    )}

                                                    <td className="text-end">
                                                        {" "}
                                                        {Number(item.unit_price || 0).toFixed(2)}
                                                    </td>

                                                    {showWarrantyColumn && (
                                                        <td className="text-center">
                                                            {item.warranty_period ||
                                                                "-"}
                                                        </td>
                                                    )}

                                                    <td className="text-end fw-bold">
                                                        {" "}
                                                        {Number(item.total || 0).toFixed(2)}
                                                    </td>

                                                </tr>
                                            ))}

                                        </tbody>

                                    </table>

                                </div>
                                 </>
                            )}

                                {/* ================= TOTALS ================= */}

                                <div className="quotation-totals">

                                    <div className="total-row">
                                        <span>Sub Total</span>
                                        <span>{Number(quotation.header.sub_total).toFixed(2)}</span>
                                    </div>

                                    <div className="total-row">
                                        <span>ITE Financial &amp; Service Charges</span>
                                        <span>{Number(quotation.header.service_charge_amount).toFixed(2)}</span>
                                    </div>

                                    <hr />

                                    <div className="total-row grand-total">
                                        <strong>Grand Total</strong>

                                        <strong>
                                            {Number(
                                                quotation.header.grand_total
                                            ).toFixed(2)}
                                        </strong>
                                    </div>

                                </div>
                {/* ================= REMARKS ================= */}

                                <div className="remarks-card">

                                    <div className="remarks-title">Contractor Remarks</div>

                                    <div className="remarks-content">
                                        {quotation.header.remarks
                                            ? quotation.header.remarks
                                            : "No remarks provided."}
                                    </div>

                                </div>

                                {/* ================= FOOTER ================= */}

                                                                <div className="quotation-footer">
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
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminQuotationModal;