import React, { useState, useEffect, useRef } from "react";
import "./css/CompanyProfile.css";
import { apiGet, apiPost } from "../../api";
import { useContractor } from "../../context/ContractorContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// import CompanyInfoSection from "./CompanyComponents/CompanyInfoSection";
import CompanyInfoSection from "./CompanyComponents/CompanyInfoSection";
import AddressSection from "./CompanyComponents/AddressSection";
import ContactSection from "./CompanyComponents/ContactSection";
import ServiceList from "./CompanyComponents/ServiceList";
import ProfileImageUpload from "./CompanyComponents/ProfileImageUpload";
import CertificateUpload from "./CompanyComponents/CertificateUpload";
import { validateProfile } from "./CompanyComponents/validateProfile";

const emptyRow = () => ({
  region: "", region_id: null,
  state: "", state_id: null,
  city: "", city_id: null,
  price: "",
  category_id: "", category_name: "",
  item_id: "", item_name: "",
  type_id: "", type_name: "",
  description_id: "", description_name: "",
});

function ContractorPersonalDetails() {
  const { contractor } = useContractor() || {};
  const navigate = useNavigate();
  const loggedRef = useRef(false);
  if (!loggedRef.current && contractor) {
    loggedRef.current = true;
  }

  const [profile, setProfile] = useState(null);
  const [idTypes, setIdTypes] = useState([]);
  const [mailingPostalCode, setMailingPostalCode] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [locationServiceList, setLocationServiceList] = useState([]);
  const [regions, setRegions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sameAsMailing, setSameAsMailing] = useState(false);
  const [mailingRegionId, setMailingRegionId] = useState("");
  const [mailingStateId, setMailingStateId] = useState("");
  const [mailingCityId, setMailingCityId] = useState("");

  const [mailingStates, setMailingStates] = useState([]);
  const [mailingCities, setMailingCities] = useState([]);

  const [formData, setFormData] = useState({
    company_name: "",
    brn_number: "",
    tin_number: "",
    bumiputera: "",
    mailing_address: "",
    billing_address: "",
    contact_number: "",
    alternate_contact: "",
    contact_person: "",
    email_id: "",
  });

  /* ===== Reference data ===== */
  useEffect(() => {
    apiGet("/api/contractor/category").then((d) => setCategories(d || [])).catch(() => setCategories([]));
    apiGet("/api/contractor/region/").then(setRegions).catch(() => setRegions([]));
    apiGet("/api/contractor/state/id-types").then(setIdTypes).catch(() => setIdTypes([]));
  }, []);

  /* ===== Same-as-mailing sync ===== */
  useEffect(() => {
    if (sameAsMailing) {
      setFormData((prev) => ({ ...prev, billing_address: prev.mailing_address }));
      setBillingPostalCode(mailingPostalCode);
    }
  }, [sameAsMailing, mailingPostalCode, formData.mailing_address]);

  /* ===== Load profile ===== */
  useEffect(() => {
    if (contractor) fetchProfile();
  }, [contractor]);

  const fetchProfile = async () => {
    try {
      const data = await apiPost("/api/contractor/company_profile", { email: contractor.email_id });
      setProfile(data);

      setFormData({
        company_name: data.company_name || "",
        brn_number: data.brn_number || "",
        tin_number: data.tin_number || "",
        bumiputera: data.bumiputra_status?.toLowerCase() === "yes" ? "yes" : "no",
        mailing_address: (data.mailing_address || "").replace(/,\s*\d{5}$/, ""),
        billing_address: (data.billing_address || "").replace(/,\s*\d{5}$/, ""),
        contact_number: data.contact_number || "",
        alternate_contact: data.alternate_contact_number || "",
        contact_person: data.name || "",
        email_id: data.email || contractor.email_id,
      });

      const mailingMatch = (data.mailing_address || "").match(/(\d{5})$/);
      const billingMatch = (data.billing_address || "").match(/(\d{5})$/);
      setMailingPostalCode(mailingMatch ? mailingMatch[1] : "");
      setBillingPostalCode(billingMatch ? billingMatch[1] : "");
      setMailingRegionId(data.mailing_region_id || "");
setMailingStateId(data.mailing_state_id || "");
setMailingCityId(data.mailing_city_id || "");

if (data.mailing_region_id) {
  const states = await apiGet(
    `/api/contractor/state/by-region/${data.mailing_region_id}`
  );
  setMailingStates(states || []);
}

if (data.mailing_region_id && data.mailing_state_id) {
  const cities = await apiGet(
    `/api/contractor/city/by-region-state?region_id=${data.mailing_region_id}&state_id=${data.mailing_state_id}`
  );
  setMailingCities(cities || []);
}

      if (Array.isArray(data.services)) {
        setLocationServiceList(
          data.services.map((s) => ({
            region: s.region || "",
            region_id: s.region_id || null,
            state: s.state || "",
            state_id: s.state_id || null,
            city: s.city || "",
            city_id: s.city_id || null,
            category_id: s.category_id || "",
            category_name: s.category_name || "",
            item_id: s.item_id || "",
            item_name: s.item_name || "",
            type_id: s.type_id || "",
            type_name: s.type_name || "",
            description_id: s.description_id || "",
            description_name: s.description_name || "",
            price: s.service_rate || "",
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ===== Row updates: pure + synchronous, no fetching here ===== */
  const updateRow = (index, patch) => {
    setLocationServiceList((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const handleAddLocationService = () => {
    setLocationServiceList((prev) => [...prev, emptyRow()]);
  };

  const handleRemoveLocationService = (index) => {
    setLocationServiceList((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchMailingStates = async (regionId) => {
  if (!regionId) {
    setMailingStates([]);
    return;
  }

  const data = await apiGet(`/api/contractor/state/by-region/${regionId}`);
  setMailingStates(data || []);
};

const fetchMailingCities = async (regionId, stateId) => {
  if (!regionId || !stateId) {
    setMailingCities([]);
    return;
  }

  const data = await apiGet(
    `/api/contractor/city/by-region-state?region_id=${regionId}&state_id=${stateId}`
  );

  setMailingCities(data || []);
};



  /* ===== Submit ===== */
  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateProfile({
      formData,
      mailingPostalCode,
      billingPostalCode,
      locationServiceList,
      profileImage,
      profile,
      certificates,
    });
    if (!isValid) return;

    setLoading(true);

    let finalMailing = formData.mailing_address.trim();
    let finalBilling = formData.billing_address.trim();
    if (mailingPostalCode) finalMailing += `, ${mailingPostalCode}`;
    if (billingPostalCode) finalBilling += `, ${billingPostalCode}`;

    const servicesArray = locationServiceList.map((item) => ({
      region_id: item.region_id,
      region_name: item.region,
      state_id: item.state_id,
      state_name: item.state,
      city_id: item.city_id || null,
      city_name: item.city || null,
      category_id: item.category_id,
      category_name: item.category_name,
      item_id: item.item_id,
      item_name: item.item_name,
      type_id: item.type_id,
      type_name: item.type_name,
      description_id: item.description_id || null,
      description_name: item.description_name || null,
      price: parseFloat(item.price || 0),
    }));

    const payload = new FormData();
    payload.append("email", contractor.email_id);
    payload.append("company_name", formData.company_name);
    payload.append("brn_number", formData.brn_number);
    payload.append("tin_number", formData.tin_number);
    payload.append("bumiputera", formData.bumiputera === "yes" ? "Yes" : "No");
    payload.append("billing_address", finalBilling);
    payload.append("mailing_address", finalMailing);
    payload.append("mailing_region_id", mailingRegionId);
    payload.append("mailing_state_id", mailingStateId);
    payload.append("mailing_city_id", mailingCityId);
    payload.append("contact_number", formData.contact_number);
    payload.append("alternate_contact", formData.alternate_contact);
    payload.append("contact_person", formData.contact_person);
    payload.append("services", JSON.stringify(servicesArray));

    if (profileImage) payload.append("company_logo", profileImage);
    certificates.forEach((file) => payload.append("certificate", file));

    try {
      await apiPost("/api/contractor/update_company_profile", payload);

      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Contractor profile updated successfully",
        confirmButtonText: "OK",
      });

      navigate("/contractor/dashboard/updatecompanyprofile");
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err?.response?.data?.message || "Profile update failed",
      });
      setErrors({ general: "Profile update failed" });
    } finally {
      setLoading(false);
    }
  };

  if (!contractor) {
    return <div className="text-center text-danger">Please login</div>;
  }

  return (
    <div className="provider-container">
      <form onSubmit={handleProfileSubmit} className="row g-3">
        <CompanyInfoSection formData={formData} errors={errors} handleFormChange={handleFormChange} />

        <AddressSection
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          handleFormChange={handleFormChange}
          mailingPostalCode={mailingPostalCode}
          setMailingPostalCode={setMailingPostalCode}
          billingPostalCode={billingPostalCode}
          setBillingPostalCode={setBillingPostalCode}
          sameAsMailing={sameAsMailing}
          setSameAsMailing={setSameAsMailing}
          mailingRegionId={mailingRegionId}
          setMailingRegionId={setMailingRegionId}
          mailingStateId={mailingStateId}
          setMailingStateId={setMailingStateId}
          mailingCityId={mailingCityId}
          setMailingCityId={setMailingCityId}

          mailingStates={mailingStates}
          mailingCities={mailingCities}
          regions={regions}

          fetchMailingStates={fetchMailingStates}
          fetchMailingCities={fetchMailingCities}
        />

        <ContactSection formData={formData} errors={errors} handleFormChange={handleFormChange} />

        <ServiceList
          locationServiceList={locationServiceList}
          regions={regions}
          categories={categories}
          onChangeRow={updateRow}
          onAddRow={handleAddLocationService}
          onRemoveRow={handleRemoveLocationService}
          errors={errors}
        />

        <ProfileImageUpload
          profileImage={profileImage}
          setProfileImage={setProfileImage}
          profile={profile}
          errors={errors}
          setErrors={setErrors}
        />

        <CertificateUpload
          certificates={certificates}
          setCertificates={setCertificates}
          profile={profile}
          errors={errors}
          setErrors={setErrors}
        />

        <div className="col-12">
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Saving..." : "Submit Profile"}
          </button>
          {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
        </div>
      </form>
    </div>
  );
}

export default ContractorPersonalDetails;