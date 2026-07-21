import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../api";
import "./css/ContractorRFQ.css";
import { useContractor } from "../../context/ContractorContext";
import { BASE_URL } from "../../api";
function ContractorRFQ() {

    const { contractor } = useContractor();
    const [activeTab, setActiveTab] = useState("NEW");
    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRFQ, setSelectedRFQ] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [quotedItems, setQuotedItems] = useState([]);
    const [contractorRemarks, setContractorRemarks] = useState("");
    const [newCount, setNewCount] = useState(0);
    const [respondedCount, setRespondedCount] = useState(0);
    const [ignoredCount, setIgnoredCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRfqs = rfqs.slice(firstIndex, lastIndex);
    const totalPages = Math.ceil(rfqs.length / recordsPerPage);
    const [quotationAmount, setQuotationAmount] = useState("");

    useEffect(() => {
        if (!contractor?.user_uid) return;
        setLoading(true);
        if (activeTab === "NEW") {
            fetchNewRfqs();
        } else if (activeTab === "RESPONDED") {
            fetchRespondedRfqs();
        }
    }, [activeTab, contractor]);

    const handleWarrantyChange = (index, value) => {
        const updated = [...quotedItems];
        updated[index].warranty_period = value;
        setQuotedItems(updated);
    };

    const handleDeliveryDateChange = (index, value) => {
        const updated = [...quotedItems];
        updated[index].delivery_date = value;
        setQuotedItems(updated);
    };
    const showQtyColumn = quotedItems.some(
        item =>
            item.quantity !== null &&
            item.quantity !== "" &&
            Number(item.quantity) > 0
    );
    const submitQuotation = async () => {

        try {
            if (quotedItems.length > 0) {
            const hasEmptyPrice = quotedItems.some(
                item =>
                    item.unit_price === "" ||
                    Number(item.unit_price) <= 0
            );

            if (hasEmptyPrice) {
                alert("Please enter unit price for all items.");
                return;
            }
            }
            if (!contractorRemarks.trim()) {
                alert("Please enter contractor remarks.");
                return;
            }
            if (quotedItems.length === 0 && !quotationAmount) {
                alert("Please enter quotation amount.");
                return;
            }
            const payload = {
                rfq_id: selectedRFQ.header.rfq_id,
                contractor_id: contractor.user_uid,
                remarks: contractorRemarks,
                grand_total:
                quotedItems.length > 0
                    ? quotedItems.reduce((sum, item) => sum + Number(item.total), 0)
                    : Number(quotationAmount),
                items: quotedItems.map(item => ({
                    rfq_item_id: item.rfq_item_id,
                    quantity: item.quantity,
                    delivery_date: item.delivery_date || "",
                    unit_price: Number(item.unit_price),
                    warranty_period: item.warranty_period?.trim() || "",
                    total: Number(item.total)
                }))
            };

            console.log(payload);
            await apiPost("/api/workorders/provider/rfq/respond",payload);
            alert("Quotation submitted successfully.");
            setShowModal(false);
            setSelectedRFQ(null);
            setQuotedItems([]);
            setContractorRemarks("");
            setActiveTab("RESPONDED");
        } catch (err) {

            console.error(err);

        }

    };

    const fetchNewRfqs = async () => {
        try {
            const data = await apiGet(`/api/workorders/provider/rfq/new/${contractor.user_uid}`);
            setRfqs(Array.isArray(data) ? data : []);
            setNewCount(Array.isArray(data) ? data.length : 0);
            setCurrentPage(1);
        } catch (err) {

            console.error(err);

        } finally {

            setLoading(false);

        }
    };

    const fetchRespondedRfqs = async () => {
        try {
            const data = await apiGet(`/api/workorders/provider/rfq/responded/${contractor.user_uid}`);
            setRfqs(Array.isArray(data) ? data : []);
            setRespondedCount(Array.isArray(data) ? data.length : 0);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }

    };

    const handleView = async (rfqNo) => {
        try {
            const data = await apiGet(`/api/workorders/provider/rfq/${rfqNo}`);
            setSelectedRFQ(data);
            setQuotedItems(data.items.map(item => ({...item,
                unit_price: "",
                delivery_date: "",
                warranty_period: "",
                total: 0})));
            setContractorRemarks("");
            setShowModal(true);
        } catch (err) {
            console.error(err);
            alert("Unable to fetch RFQ details.");
        }

    };
    const handleUnitPriceChange = (index, value) => {
        const updated = [...quotedItems];
        updated[index].unit_price = value;
        const qty = Number(updated[index].quantity) > 0 ? Number(updated[index].quantity) : 1;
        updated[index].total = qty * Number(value || 0);
        setQuotedItems(updated);
    };

    return (
        <>
        <div className="provider-rfq-container">

            <div className="provider-rfq-header">

                <h2>Request For Quotations</h2>

            </div>

            <div className="rfq-tabs">

                <button
                    className={activeTab === "NEW" ? "active" : ""}
                    onClick={() => setActiveTab("NEW")}
                >
                    New ({newCount})
                </button>

                <button
                    className={activeTab === "RESPONDED" ? "active" : ""}
                    onClick={() => setActiveTab("RESPONDED")}
                >
                    Responded ({respondedCount})
                </button>

                <button
                    className={activeTab === "IGNORED" ? "active" : ""}
                    onClick={() => setActiveTab("IGNORED")}
                >
                    Ignored ({ignoredCount})
                </button>

            </div>

            <div className="rfq-table-card">

                {loading ? (

                    <div className="loading">
                        Loading RFQs...
                    </div>

                ) : (
                   <>
                    <table className="rfq-table">

                        <thead>

                            <tr>

                                <th>RFQ No</th>

                                <th>Title</th>

                                <th>Closing Date</th>

                                <th>Status</th>

                                <th>Action</th>

                            </tr>

                        </thead>

                        <tbody>

                            {rfqs.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                        style={{
                                            textAlign: "center",
                                            padding: "25px"
                                        }}
                                    >

                                        No RFQs Found

                                    </td>

                                </tr>

                            ) : (

                                currentRfqs.map((rfq) => (

                                    <tr key={rfq.rfq_id}>

                                        <td>{rfq.rfq_no}</td>

                                        <td>{rfq.rfq_title}</td>

                                        <td>{rfq.closing_date}</td>

                                        <td>
                                            <span className="status-open">
                                                {rfq.status}
                                            </span>
                                        </td>
                                        <td>
                                        {activeTab === "NEW" ? (
                                            <button
                                                className="view-btn"
                                                onClick={() => handleView(rfq.rfq_no)}
                                            >
                                                View
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-success btn-sm"
                                                disabled
                                            >
                                                Submitted
                                            </button>
                                        )}
                                    </td>
                                    </tr>
                                ))
                            )}
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
                                    className={currentPage === index + 1 ? "active-page" : ""}
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
                )}
            </div>
        </div> 
        {
    showModal &&
    selectedRFQ && (

        <div className="rfq-modal-overlay">
            <div className="rfq-modal">
                <div className="rfq-modal-header">
                    <h3 className="quotation-title">Quotation Submission</h3>
                    <button className="close-btn" onClick={() => setShowModal(false)}> ✕ </button>
                </div>
                <div className="rfq-number">
                    <strong>RFQ No :</strong> {selectedRFQ.header.rfq_no}
                </div>
                <div className="rfq-modal-body">
                    <table className="table table-bordered">
                        <tbody>
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
                            <tr>
                                <th>Closing Date</th>
                                <td>{selectedRFQ.header.closing_date}</td>
                            </tr>
                        </tbody>
                    </table>
                    <br />
                    <h5 className="workorder-header">Project Details Description</h5>
                    <div className="workorder-box">
                        <div className="workorder-body">{selectedRFQ.header.description}</div>
                    </div>
                    {/*<h5>Remarks</h5>
                    <p> {selectedRFQ.header.remarks} </p>*/}
                    {selectedRFQ.header.site_survey_required === 1 && (
                        <div className="alert alert-warning mt-3">
                            <strong>Site Survey Required</strong>
                            <br />
                            This work requires a site survey by the provider.
                            The site survey is not chargeable separately.
                            Please submit your quotation only if you are able to
                            perform the required site survey for this work.
                        </div>
                    )}
                    {quotedItems.length === 0 && (
                        <div className="mt-3">
                            <label className="form-label fw-bold">
                                Quotation Amount ()
                            </label>

                            <div className="input-group">
                                <span className="input-group-text"></span>

                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Enter quotation amount"
                                    value={quotationAmount}
                                    onChange={(e) => setQuotationAmount(e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                />
                            </div>
                        </div>
                    )}
                    <hr />
                    <h5 className="left-heading">Attachments</h5>
                    {selectedRFQ.attachments?.length > 0 ? (
                        <ul>
                            {selectedRFQ.attachments.map((file,index)=>(
                                <li key={index}>
                                    <a href={`${BASE_URL}${file}`} target="_blank" rel="noreferrer">
                                        Attachment {index+1}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No Attachments</p>
                    )}
                {quotedItems.length > 0 && (
                    <>
                    <h4 className="section-heading">Quotation Items</h4>
                    <div className="quotation-table-wrapper">
                        <table className="quotation-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "35%" }}>Item Description</th>
                                    <th style={{ width: "16%" }}>Delivery Date</th>
                                    {showQtyColumn && (<th style={{ width: "8%" }}>Qty</th>)}
                                    <th style={{ width: "16%" }}>Unit Price </th>
                                    <th style={{ width: "15%" }}>Warranty Period</th>
                                    <th style={{ width: "10%" }}>Total </th>
                                </tr>
                            </thead>

                            <tbody>
                                {quotedItems.map((item, index) => (
                                    <tr key={item.rfq_item_id}>
                                        <td className="item-description">
                                            {item.item_description}
                                        </td>

                                        <td>
                                            <input
                                                type="date"
                                                className="form-control form-control-sm"
                                                value={item.delivery_date || ""}
                                                onChange={(e) =>
                                                    handleDeliveryDateChange(index, e.target.value)
                                                }
                                            />
                                        </td>

                                        {showQtyColumn && (<td className="text-center">{item.quantity}</td>)}
                                        <td>
                                            <div className="input-group input-group-sm">

                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="form-control"
                                                    value={item.unit_price}
                                                    onChange={(e) =>
                                                        handleUnitPriceChange(index, e.target.value)
                                                    }
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                />
                                            </div>
                                        </td>

                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="Optional"
                                                value={item.warranty_period}
                                                onChange={(e) =>
                                                    handleWarrantyChange(
                                                        index,
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </td>

                                        <td className="quotation-total">{Number(item.total).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="alert alert-success mt-3 text-end">
                        <h4 className="mb-0">
                            Grand Total :
                            {
                                quotedItems
                                    .reduce((sum, item) => sum + Number(item.total),0)
                                    .toFixed(2)
                            }
                        </h4>
                    </div>
                    </>
                )}
                    <div className="mt-4">
                        <label className="form-label fw-bold">Contractor Remarks</label>
                        <textarea className="form-control" rows="4"
                            placeholder="Enter your quotation remarks..."
                            value={contractorRemarks}
                            onChange={(e) =>
                                setContractorRemarks(
                                    e.target.value
                                )
                            }
                        />
                    </div>
                </div>

                <div className="rfq-modal-footer">
                    <button className="btn btn-secondary"
                            onClick={() => setShowModal(false)}
                    >Close
                    </button>
                    <button className="btn btn-outline-danger">Ignore RFQ</button>
                    <button
                        className="btn btn-success"
                        onClick={submitQuotation}
                    >Submit Quotation
                    </button>
                </div>

            </div>

        </div>

    )
} 
        
</>
    );
    

}

export default ContractorRFQ;