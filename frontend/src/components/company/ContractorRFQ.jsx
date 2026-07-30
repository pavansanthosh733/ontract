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
    const [negotiationCount, setNegotiationCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRfqs = rfqs.slice(firstIndex, lastIndex);
    const totalPages = Math.ceil(rfqs.length / recordsPerPage);
    const [quotationAmount, setQuotationAmount] = useState("");
    const [selectedNegotiation, setSelectedNegotiation] = useState(null);
    const [showNegotiationModal, setShowNegotiationModal] = useState(false);
    const [replyAction, setReplyAction] = useState("ACCEPT");
    const [revisedAmount, setRevisedAmount] = useState("");
    const [replyRemarks, setReplyRemarks] = useState("");
    const [assignedCount, setAssignedCount] = useState(0);
    const [acceptedCount, setAcceptedCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [reopenCount, setReopenCount] = useState(0);
    const [closedCount, setClosedCount] = useState(0);
    const [selectedAssignedRFQ, setSelectedAssignedRFQ] = useState(null);
    const [showAssignedModal, setShowAssignedModal] = useState(false);
    const [completionFiles, setCompletionFiles] = useState([]);
    const [completionRemarks, setCompletionRemarks] = useState("");

    useEffect(() => {
        if (!contractor?.user_uid) return;

        setLoading(true);

        if (activeTab === "NEW") {
            fetchNewRfqs();
        }
        else if (activeTab === "RESPONDED") {
            fetchRespondedRfqs();
        }
        else if (activeTab === "NEGOTIATION") {
            fetchNegotiationRfqs();
        }
        else if (activeTab === "ASSIGNED") {
            fetchAssignedRfqs();
        }
        else if (activeTab === "ACCEPTED") {
            fetchAcceptedRfqs();
        }
        else if (activeTab === "COMPLETED") {
            fetchCompletedRfqs();
        }
        else if (activeTab === "REOPEN") {
            fetchReopenRfqs();
        }
        else if (activeTab === "CLOSED") {
            fetchClosedRfqs();
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

    const handleCompletionFiles = (e) => {
        setCompletionFiles(Array.from(e.target.files));
    };


    const submitCompletion = async () => {
        try {

            const formData = new FormData();

            formData.append(
                "rfq_id",
                selectedAssignedRFQ.header.rfq_id
            );

            formData.append(
                "contractor_id",
                contractor.user_uid
            );

            formData.append(
                "remarks",
                completionRemarks
            );

            completionFiles.forEach(file => {
                formData.append("images[]", file);
            });

            const response = await apiPost(
                "/api/workorders/provider/rfq/completion",
                formData,
                true
            );

            if (response.success) {

                alert(response.message);
                setShowAssignedModal(false);
                setCompletionFiles([]);
                setCompletionRemarks("");
                setActiveTab("COMPLETED");

            } else {

                alert(response.message);

            }

        } catch (err) {

            console.error(err);
            alert("Failed to submit completion.");

        }
    };


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

    const fetchNegotiationRfqs = async () => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/negotiations/${contractor.user_uid}`
            );
            setRfqs(Array.isArray(data) ? data : []);
            setNegotiationCount(Array.isArray(data) ? data.length : 0);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignedRfqs = async () => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/assigned/${contractor.user_uid}`
            );
            setRfqs(Array.isArray(data) ? data : []);
            setAssignedCount(Array.isArray(data) ? data.length : 0);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAcceptedRfqs = async () => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/accepted/${contractor.user_uid}`
            );
            setRfqs(Array.isArray(data) ? data : []);
            setAcceptedCount(Array.isArray(data) ? data.length : 0);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompletedRfqs = async () => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/completed/${contractor.user_uid}`
            );
            setRfqs(Array.isArray(data) ? data : []);
            setCompletedCount(Array.isArray(data) ? data.length : 0);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReopenRfqs = async () => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/reopen/${contractor.user_uid}`
            );
            setRfqs(Array.isArray(data) ? data : []);
            setReopenCount(Array.isArray(data) ? data.length : 0);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClosedRfqs = async () => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/closed/${contractor.user_uid}`
            );
            setRfqs(Array.isArray(data) ? data : []);
            setClosedCount(Array.isArray(data) ? data.length : 0);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };


    const handleNegotiation = async (negotiationId) => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/negotiation/${negotiationId}`
            );

            setSelectedNegotiation(data);
            setShowNegotiationModal(true);

        } catch (err) {
            console.error(err);
            alert("Unable to fetch negotiation details.");
        }
    };

    const handleAssignedView = async (rfqNo) => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/assigned/details/${rfqNo}/${contractor.user_uid}`
            );

            setSelectedAssignedRFQ(data);
            setShowAssignedModal(true);

        } catch (err) {
            console.error(err);
        }
    };

    const handleAcceptedView = async (rfqNo) => {
        try {
            const data = await apiGet(
                `/api/workorders/provider/rfq/details/${rfqNo}/${contractor.user_uid}`
            );

            setSelectedAssignedRFQ(data);
            setShowAssignedModal(true);

        } catch (err) {
            console.error(err);
            alert("Unable to fetch RFQ details.");
        }
    };

    const handleAssignedAction = async (action) => {
        try {

            const payload = {
                rfq_id: selectedAssignedRFQ.header.rfq_id,
                contractor_id: contractor.user_uid,
                action: action
            };

            console.log(payload);

            const response = await apiPost(
                "/api/workorders/provider/rfq/assigned/action",
                payload
            );

            alert(response.message);
            setShowAssignedModal(false);
            fetchAssignedRfqs();

        } catch (err) {
            console.error(err);
            alert("Unable to process request.");
        }
    };


    const submitNegotiationReply = async (action) => {
        try {

            if (action === "COUNTER_OFFER" && !revisedAmount) {
                alert("Please enter revised amount.");
                return;
            }

            if (!replyRemarks.trim()) {
                alert("Please enter remarks.");
                return;
            }

            const payload = {
                negotiation_id: selectedNegotiation.header.negotiation_id,
                action: action,
                revised_amount:
                    action === "COUNTER_OFFER"
                        ? Number(revisedAmount)
                        : null,
                remarks: replyRemarks,
                contractor_id: contractor.user_uid
            };

            console.log(payload);

            await apiPost(
                "/api/workorders/provider/rfq/negotiation/reply",
                payload
            );

            alert("Negotiation reply submitted successfully.");
            setShowNegotiationModal(false);
            fetchNegotiationRfqs();

        } catch (err) {
            console.error(err);
            alert("Unable to submit negotiation reply.");
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
        <div className="provider-rfq-page">

            <div className="provider-rfq-card">

                <div className="provider-rfq-header">

                    <h2>Request For Quotations</h2>

                </div>

                <div className="provider-rfq-content">

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
                    className={activeTab === "NEGOTIATION" ? "active" : ""}
                    onClick={() => setActiveTab("NEGOTIATION")}
                >
                    Negotiations ({negotiationCount})
                </button>

                <button
                    className={activeTab === "ASSIGNED" ? "active" : ""}
                    onClick={() => setActiveTab("ASSIGNED")}
                >
                    Assigned ({assignedCount})
                </button>

                <button
                    className={activeTab === "ACCEPTED" ? "active" : ""}
                    onClick={() => setActiveTab("ACCEPTED")}
                >
                    Accepted ({acceptedCount})
                </button>

                <button
                    className={activeTab === "COMPLETED" ? "active" : ""}
                    onClick={() => setActiveTab("COMPLETED")}
                >
                    Completed ({completedCount})
                </button>

                <button
                    className={activeTab === "REOPEN" ? "active" : ""}
                    onClick={() => setActiveTab("REOPEN")}
                >
                    Reopen ({reopenCount})
                </button>

                <button
                    className={activeTab === "CLOSED" ? "active" : ""}
                    onClick={() => setActiveTab("CLOSED")}
                >
                    Closed ({closedCount})
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

                                        <td>
                            {["ASSIGNED", "ACCEPTED", "COMPLETED", "REOPEN", "CLOSED"].includes(activeTab) ? (
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();

                                        if (activeTab === "ASSIGNED") {
                                            handleAssignedView(rfq.rfq_no);
                                        }
                                        else if (
                                            activeTab === "ACCEPTED" ||
                                            activeTab === "COMPLETED" ||
                                            activeTab === "REOPEN" ||
                                            activeTab === "CLOSED"
                                        ) {
                                            handleAcceptedView(rfq.rfq_no);
                                        }
                                    }}
                                >
                                    {rfq.rfq_no}
                                </a>
                            ) : (
                                rfq.rfq_no
                            )}
                        </td>

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

                                        ) : activeTab === "NEGOTIATION" ? (

                                            <button
                                                className="btn btn-warning btn-sm"
                                                onClick={() => handleNegotiation(rfq.negotiation_id)}
                                            >
                                                View Negotiation
                                            </button>

                                        ) : activeTab === "ASSIGNED" ? (

                                            <span className="text-primary fw-bold">
                                                Click RFQ No
                                            </span>

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
                                Quotation Amount
                            </label>

                            <div className="input-group">

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
{
    showNegotiationModal &&
    selectedNegotiation && (

        <div className="rfq-modal-overlay">

            <div className="rfq-modal">

                <div className="rfq-modal-header">
                    <div>
                        <h3 className="quotation-title">Negotiation Details</h3>
                    </div>

                    <button
                        className="close-btn"
                        onClick={() => setShowNegotiationModal(false)}
                    >
                        ✕
                    </button>
                </div>

                <div className="rfq-modal-body">

                    <table className="table table-bordered">
                        <tbody>

                            <tr>
                                <th>RFQ No</th>
                                <td>{selectedNegotiation.header.rfq_no}</td>
                            </tr>

                            <tr>
                                <th>RFQ Title</th>
                                <td>{selectedNegotiation.header.rfq_title}</td>
                            </tr>

                        </tbody>
                    </table>

                    <hr />

                    <h5>Your Previous Quotation</h5>

                    {selectedNegotiation.items &&
                    selectedNegotiation.items.length > 0 ? (

                        <table className="quotation-table">

                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>

                            <tbody>

                                {selectedNegotiation.items.map((item) => (

                                    <tr key={item.rfq_item_id}>
                                        <td>{item.item_description}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit_price}</td>
                                        <td>{item.total}</td>
                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    ) : (

                        <>
                            <p>
                                <strong>Quotation Amount :</strong>{" "}
                                {selectedNegotiation.previous_quotation.grand_total}
                            </p>

                            <p>
                                <strong>Remarks :</strong>{" "}
                                {selectedNegotiation.previous_quotation.remarks}
                            </p>
                        </>

                    )}

                    <hr />

                    <h5>Admin Negotiation</h5>

                    <table className="table table-bordered">
                        <tbody>

                            <tr>
                                <th>Requested Amount</th>
                                <td>
                                    RM {selectedNegotiation.header.requested_amount}
                                </td>
                            </tr>

                            <tr>
                                <th>Admin Message</th>
                                <td>
                                    {selectedNegotiation.header.admin_message}
                                </td>
                            </tr>

                            <tr>
                                <th>Reply Before</th>
                                <td>
                                    {selectedNegotiation.header.reply_before}
                                </td>
                            </tr>

                        </tbody>
                    </table>

                    <hr />

                    <h5>Your Reply</h5>

                    <div className="mb-3">

                        <label className="form-label">
                            Revised Amount
                        </label>

                        <input
                            type="number"
                            className="form-control"
                            placeholder="Enter revised amount"
                            value={revisedAmount}
                            onChange={(e) => setRevisedAmount(e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                        />

                    </div>

                    <div className="mb-3">

                        <label className="form-label">
                            Remarks
                        </label>

                        <textarea
                            className="form-control"
                            rows="4"
                            placeholder="Enter remarks"
                            value={replyRemarks}
                            onChange={(e) => setReplyRemarks(e.target.value)}
                        />

                    </div>

                </div>

                <div className="rfq-modal-footer">

                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowNegotiationModal(false)}
                    >
                        Close
                    </button>

                    <button
                        className="btn btn-danger"
                        onClick={() => submitNegotiationReply("REJECT")}
                    >
                        Reject
                    </button>

                    <button
                        className="btn btn-warning"
                        onClick={() => submitNegotiationReply("COUNTER_OFFER")}
                    >
                        Counter Offer
                    </button>

                    <button
                        className="btn btn-success"
                        onClick={() => submitNegotiationReply("ACCEPT")}
                    >
                        Accept
                    </button>

                </div>

            </div>

        </div>

    )
}

{
    showAssignedModal &&
    selectedAssignedRFQ && (

        <div className="rfq-modal-overlay">

            <div className="rfq-modal">

                <div className="rfq-modal-header">

                    <h3>Assigned Work Details</h3>

                    <button
                        className="close-btn"
                        onClick={() => setShowAssignedModal(false)}
                    >
                        ✕
                    </button>

                </div>

                <div className="rfq-modal-body">

    <div className="rfq-number">
        <strong>RFQ No :</strong> {selectedAssignedRFQ.header.rfq_no}
    </div>

    <table className="table table-bordered">
        <tbody>

            <tr>
                <th>Title</th>
                <td>{selectedAssignedRFQ.header.rfq_title}</td>
            </tr>

            <tr>
                <th>Category</th>
                <td>{selectedAssignedRFQ.header.category_name}</td>
            </tr>

            <tr>
                <th>Region</th>
                <td>{selectedAssignedRFQ.header.region_name}</td>
            </tr>

            <tr>
                <th>State</th>
                <td>{selectedAssignedRFQ.header.state_name}</td>
            </tr>

            <tr>
                <th>City</th>
                <td>{selectedAssignedRFQ.header.city_name}</td>
            </tr>

            <tr>
                <th>Closing Date</th>
                <td>{selectedAssignedRFQ.header.closing_date}</td>
            </tr>

        </tbody>
    </table>

    <br />

    <h5 className="workorder-header">
        Project Details Description
    </h5>

    <div className="workorder-box">
        <div className="workorder-body">
            {selectedAssignedRFQ.header.description}
        </div>
    </div>

    {selectedAssignedRFQ.header.site_survey_required === 1 && (
        <div className="alert alert-warning mt-3">
            <strong>Site Survey Required</strong>
            <br />
            This work requires a site survey by the provider.
        </div>
    )}

    <hr />

    <h5 className="left-heading">Attachments</h5>

    {selectedAssignedRFQ.attachments?.length > 0 ? (
        <ul>
            {selectedAssignedRFQ.attachments.map((file, index) => (
                <li key={index}>
                    <a
                        href={`${BASE_URL}${file}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Attachment {index + 1}
                    </a>
                </li>
            ))}
        </ul>
    ) : (
        <p>No Attachments</p>
    )}

    <hr />

    <h5 className="section-heading">
        {activeTab === "REOPEN"
            ? "Approved Quotation"
            : "Final Approved Quotation"}
    </h5>

    <table className="table table-bordered">
        <tbody>

            <tr>
                <th>Final Approved Amount</th>
                <td>{selectedAssignedRFQ.quotation.grand_total}</td>
            </tr>

            <tr>
                <th>Final Remarks</th>
                <td>{selectedAssignedRFQ.quotation.remarks}</td>
            </tr>

        </tbody>
    </table>

    {selectedAssignedRFQ.items &&
        selectedAssignedRFQ.items.length > 0 && (

        <>
            <h5 className="section-heading">Quotation Items</h5>
            <div className="quotation-table-wrapper">
                <table className="quotation-table">
                    <thead>
                        <tr>
                            <th>Item Description</th>
                            <th>Qty</th>
                            <th>Delivery Date</th>
                            <th>Unit Price</th>
                            <th>Warranty</th>
                            <th>Total</th>
                        </tr>
                    </thead>

                    <tbody>

                        {selectedAssignedRFQ.items.map((item) => (

                            <tr key={item.rfq_item_id}>

                                <td>{item.item_description}</td>
                                <td>{item.quantity}</td>
                                <td>{item.delivery_date}</td>
                                <td>{item.unit_price}</td>
                                <td>{item.warranty_period}</td>
                                <td>{item.total}</td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>
        </>
    )}
        
{/* ===============================
    ADD HERE
================================ */}

{(activeTab === "ACCEPTED" || activeTab === "REOPEN") && (
    <>
        <hr />

        <h5 className="section-heading">
            Work Completion Details
        </h5>

        <div className="mb-3">

            <label className="form-label">
                Upload Completion Images
            </label>

            <input
                type="file"
                className="form-control"
                multiple
                onChange={handleCompletionFiles}
            />
            

        </div>

        <div className="mb-3">

            <label className="form-label">
                Completion Remarks
            </label>

            <textarea
                className="form-control"
                rows="4"
                value={completionRemarks}
                onChange={(e) =>
                    setCompletionRemarks(e.target.value)
                }
            />

        </div>

    </>
)}
    
</div>

<div className="rfq-modal-footer">

    {activeTab === "ASSIGNED" && (
        <>
            <button
                className="btn btn-danger"
                onClick={() => handleAssignedAction("REJECT")}
            >
                Reject
            </button>

            <button
                className="btn btn-success"
                onClick={() => handleAssignedAction("ACCEPT")}
            >
                Accept
            </button>
        </>
    )}

    {(activeTab === "ACCEPTED" || activeTab === "REOPEN") && (
        <button
            className="btn btn-success"
            onClick={submitCompletion}
        >
            Submit Completion
        </button>
    )}  

</div>

            </div>

        </div>

    )
}      
</>
    );
    

}

export default ContractorRFQ;