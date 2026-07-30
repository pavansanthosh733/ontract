import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useContractor } from "../../context/ContractorContext";

import './css/CompanyProfile.css';
import { BASE_URLS, apiGet } from "../../api";

import CompanyInfoSection from "./UpdateCompanyComponents/CompanyInfoSection";
import AddressSection from "./UpdateCompanyComponents/AddressSection";
import ContactSection from "./UpdateCompanyComponents/ContactSection";
import UpdateServiceList from "./UpdateCompanyComponents/UpdateServiceList";
import CompanyLogoUpload from "./UpdateCompanyComponents/CompanyLogoUpload";
import CertificateUpload from "./UpdateCompanyComponents/CertificateUpload";
import BankDetailsForm from "./UpdateCompanyComponents/BankDetailsForm";
import CompanyProfileView from "./UpdateCompanyComponents/CompanyProfileView";

function UpdateCompanyProfile() {
  const { contractor } = useContractor();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    brn_number: '',
    tin_number: '',
    bumiputera: '',
    mailing_address: '',
    billing_address: '',
    contact_number: '',
    alternate_contact: '',
    contact_person: '',
    email_id: '',
  });
  const [locationServiceList, setLocationServiceList] = useState([]);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [certificates, setCertificates] = useState([]);

  const [bankDetails, setBankDetails] = useState({
    swift: '',
    bankName: '',
    holderName: '',
    accountNumber: ''
  });
  const [bankStatement, setBankStatement] = useState(null);

  const [showBankForm, setShowBankForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [mailingPostalCode, setMailingPostalCode] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [sameAsMailing, setSameAsMailing] = useState(false);
  const [regions, setRegions] = useState([]);

  const [servicesList, setServicesList] = useState([]);

  const cleanInput = (value) => value.replace(/[^A-Za-z0-9-.& ]/g, "");
  const cleanName = (value) => value.replace(/[^A-Za-z ]/g, "");
  const cleanAddress = (value) => value.replace(/[^A-Za-z0-9\s,./#&()-]/g, "");
  const cleanNumber = (value) => value.replace(/\D/g, "");
  const cleanAlphaNumeric = (value) => value.replace(/[^A-Za-z0-9]/g, "");

  const malaysianBanks = [
    'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank',
    'AmBank', 'Standard Chartered Bank Malaysia', 'HSBC Bank Malaysia',
    'UOB Malaysia', 'OCBC Bank Malaysia'
  ];

  useEffect(() => {
    if (sameAsMailing) {
      setFormData(prev => ({ ...prev, billing_address: prev.mailing_address }));
      setBillingPostalCode(mailingPostalCode);
    }
  }, [sameAsMailing, mailingPostalCode, formData.mailing_address]);

  useEffect(() => {
    apiGet("/api/contractor/category")
      .then(data => setServicesList(data || []))
      .catch(() => setServicesList([]));
  }, []);

  useEffect(() => {
    if (contractor) fetchProfile();
    // eslint-disable-next-line
  }, [contractor]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BASE_URLS.user}/api/contractor/company_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: contractor.email_id })
      });
      const data = await res.json();

      if (res.ok) {
        setProfile(data);
        setSuccessMessage('');

        setShowBankForm(data.status === 'approved' && !data.bank_details);

        setFormData({
          brn_number: data.brn_number || '',
          company_name: data.company_name || '',
          contact_number: data.contact_number || '',
          email_id: data.email_id || '',
          tin_number: data.tin_number || '',
          bumiputera: data.bumiputera === 1 ? 'yes' : 'no',
          contact_person: data.name || '',
          mailing_address: data.mailing_address || '',
          billing_address: data.billing_address || '',
        });

if (Array.isArray(data.services) && data.services.length > 0) {
  const arr = await Promise.all(data.services.map(async (s) => {
    const row = {
      region_id: s.region_id || "",
      region_name: s.region_name || "",
      state_id: s.state_id || "",
      state_name: s.state_name || "",
      city_id: s.city_id || "",
      city_name: s.city_name || "",
      category_id: s.category_id || "",
      category_name: s.category_name || "",
      item_id: s.item_id || "",
      item_name: s.item_name || "",
      type_id: s.type_id || "",
      type_name: s.type_name || "",
      description_id: s.description_id || "",
      description_name: s.description_name || "",
      price: s.service_rate || "",
      states: [],
      cities: [],
      items: [],
      types: [],
      descriptions: [],
    };

    try {
      if (row.region_id) {
        row.states = (await apiGet(`/api/contractor/state/by-region/${row.region_id}`)) || [];
      }
      if (row.region_id && row.state_id) {
        row.cities = (await apiGet(`/api/contractor/city/by-region-state?region_id=${row.region_id}&state_id=${row.state_id}`)) || [];
      }
      if (row.category_id) {
        row.items = (await apiGet(`/api/contractor/items/${row.category_id}`)) || [];
      }
      if (row.category_id && row.item_id) {
        row.types = (await apiGet(`/api/contractor/types/filter?category_id=${row.category_id}&item_id=${row.item_id}`)) || [];
      }
      if (row.category_id && row.item_id && row.type_id) {
        row.descriptions = (await apiGet(`/api/contractor/description/filter?category_id=${row.category_id}&item_id=${row.item_id}&type_id=${row.type_id}`)) || [];
      }
    } catch (err) {
      console.error("Error loading dropdown options for service row:", err);
    }

    return row;
  }));

  setLocationServiceList(arr);
} else {
  setLocationServiceList([]);
}

      } else {
        setErrors({ general: data.error || 'Failed to load profile' });
      }
    } catch (err) {
      setErrors({ general: 'Error fetching profile.' });
    }
  };

  useEffect(() => {
    apiGet("/api/contractor/region/")
      .then((data) => setRegions(Array.isArray(data) ? data : []))
      .catch(() => setRegions([]));
  }, []);

  const enterEditMode = () => setEditMode(true);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let cleanedValue = value;

    switch (name) {
      case "company_name": cleanedValue = cleanInput(value); break;
      case "brn_number": cleanedValue = cleanAlphaNumeric(value).toUpperCase(); break;
      case "tin_number": cleanedValue = cleanAlphaNumeric(value).toUpperCase(); break;
      case "contact_person": cleanedValue = cleanName(value); break;
      case "contact_number":
      case "alternate_contact": cleanedValue = cleanNumber(value); break;
      case "mailing_address":
      case "billing_address": cleanedValue = cleanAddress(value); break;
      default: cleanedValue = value;
    }

    setFormData((prev) => ({ ...prev, [name]: cleanedValue }));
  };

  const handleChange = async (index, field, value) => {
    setLocationServiceList(prev => {
      const list = [...prev];
      const row = { ...list[index] };

      switch (field) {
        case "region":
          row.region_id = value.id;
          row.region_name = value.name;
          row.state_id = row.city_id = "";
          row.category_id = row.item_id = row.type_id = row.description_id = "";
          row.states = []; row.cities = []; row.items = []; row.types = []; row.descriptions = [];

          apiGet(`/api/contractor/state/by-region/${value.id}`).then(data => {
            setLocationServiceList(p => {
              const copy = [...p];
              copy[index].states = data || [];
              return copy;
            });
          });
          break;

        case "state":
          row.state_id = value.id;
          row.state_name = value.name;
          row.city_id = "";
          row.cities = [];

          apiGet(`/api/contractor/city/by-region-state?region_id=${row.region_id}&state_id=${value.id}`)
            .then(data => {
              setLocationServiceList(p => {
                const copy = [...p];
                copy[index].cities = data || [];
                return copy;
              });
            });
          break;

        case "city":
          row.city_id = value.id;
          row.city_name = value.name;
          break;

        case "category":
          row.category_id = value.id;
          row.category_name = value.name;
          row.item_id = row.type_id = row.description_id = "";
          row.items = []; row.types = []; row.descriptions = [];

          apiGet(`/api/contractor/items/${value.id}`).then(data => {
            setLocationServiceList(p => {
              const copy = [...p];
              copy[index].items = data || [];
              return copy;
            });
          });
          break;

        case "item":
          row.item_id = value.id;
          row.item_name = value.name;
          row.type_id = row.description_id = "";
          row.types = []; row.descriptions = [];

          apiGet(`/api/contractor/types/filter?category_id=${row.category_id}&item_id=${value.id}`)
            .then(data => {
              setLocationServiceList(p => {
                const copy = [...p];
                copy[index].types = data || [];
                return copy;
              });
            });
          break;

        case "type":
          row.type_id = value.id;
          row.type_name = value.name;
          row.description_id = "";
          row.descriptions = [];

          apiGet(`/api/contractor/description/filter?category_id=${row.category_id}&item_id=${row.item_id}&type_id=${value.id}`)
            .then(data => {
              setLocationServiceList(p => {
                const copy = [...p];
                copy[index].descriptions = data || [];
                return copy;
              });
            });
          break;

        case "description":
          row.description_id = value.id;
          row.description_name = value.name;
          break;

        case "price":
          row.price = value;
          break;
      }

      list[index] = row;
      return list;
    });
  };

  const addServiceRow = () => {
    if (locationServiceList.some(r => !r.region_id || !r.state_id || !r.city_id || !r.category_id || !r.item_id || !r.type_id || !r.description_id || !r.price)) {
      alert('Please fill existing rows before adding a new one.');
      return;
    }

    setLocationServiceList(prev => [
      ...prev,
      {
        region: "", region_id: null,
        state: "", state_id: null,
        city: "", city_id: null,
        category_id: "", category_name: "",
        item_id: "", item_name: "",
        type_id: "", type_name: "",
        description_id: "", description_name: "",
        price: "",
        states: [], cities: [], items: [], types: [], descriptions: []
      }
    ]);
  };

  const removeServiceRow = (idx) => {
    const list = [...locationServiceList];
    list.splice(idx, 1);
    setLocationServiceList(list);
  };

  const fetchAndAppend = async (type, postalCode) => {
    if (postalCode.length !== 5) return;
    try {
      const res = await fetch(`${BASE_URLS.user}/api/contractor/malaysia_postcode?postcode=${postalCode}`);
      if (res.ok) {
        const data = await res.json();
        const city = data.city || '';
        const state = data.state || '';
        const fullAppend = `${city}, ${state} ${postalCode}`.trim();

        if (type === 'mailing') {
          setFormData(prev => {
            const current = prev.mailing_address?.trim() || '';
            if (current.includes(fullAppend)) return prev;
            const updated = current ? `${current}, ${fullAppend}` : fullAppend;
            return { ...prev, mailing_address: updated };
          });
        } else {
          setFormData(prev => {
            const current = prev.billing_address?.trim() || '';
            if (current.includes(fullAppend)) return prev;
            const updated = current ? `${current}, ${fullAppend}` : fullAppend;
            return { ...prev, billing_address: updated };
          });
        }
      }
    } catch (err) {
      console.error('Error fetching postal code data:', err);
    }
  };

  // ===== FILE VALIDATION HANDLERS =====

  const handleCompanyLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, companyLogo: 'Only JPEG, PNG, or GIF files are allowed.' }));
      e.target.value = '';
      setCompanyLogo(null);
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({ ...prev, companyLogo: 'File size must be less than 5 MB.' }));
      e.target.value = '';
      setCompanyLogo(null);
      return;
    }

    const existingCert = certificates[0];
    if (existingCert && file.name === existingCert.name && file.size === existingCert.size) {
      setErrors((prev) => ({ ...prev, companyLogo: 'Company logo and certificate cannot be the same file.' }));
      e.target.value = '';
      setCompanyLogo(null);
      return;
    }

    setErrors((prev) => ({ ...prev, companyLogo: null }));
    setCompanyLogo(file);
  };

  const handleCertificateChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024;
    const validFiles = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({ ...prev, certificate: 'Only JPEG, PNG, GIF, or PDF files are allowed.' }));
        e.target.value = '';
        setCertificates([]);
        return;
      }

      if (file.size > maxSize) {
        setErrors((prev) => ({ ...prev, certificate: 'Each file must be less than 10 MB.' }));
        e.target.value = '';
        setCertificates([]);
        return;
      }

      validFiles.push(file);
    }

    setErrors((prev) => ({ ...prev, certificate: null }));
    setCertificates(validFiles);
  };

  const handleBankStatementChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, bankStatement: 'Only PDF, JPEG, or PNG files are allowed.' }));
      e.target.value = '';
      setBankStatement(null);
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({ ...prev, bankStatement: 'File size must be less than 10 MB.' }));
      e.target.value = '';
      setBankStatement(null);
      return;
    }

    setErrors((prev) => ({ ...prev, bankStatement: null }));
    setBankStatement(file);
  };

  // ===== VALIDATION =====

  const validateProfile = () => {
    const mobileRegex = /^[0-9]{10}$/;
    const addressRegex = /^[A-Za-z0-9\s,./#'’()-]{10,200}$/;
    const individualTINRegex = /^IG\d{9,11}$/;
    const companyTINRegex = /^[A-Z]\d{10,11}$/;

    if (!formData.company_name?.trim()) { alert('Company name is required.'); return false; }
    if (!formData.bumiputera) { alert('Please select Bumiputera status.'); return false; }
    if (!formData.brn_number?.trim()) { alert('BRN number is required.'); return false; }

    if (!formData.tin_number) {
      alert('TIN number is required.');
      return false;
    } else {
      const formattedTIN = formData.tin_number.trim().toUpperCase();
      const isValidTIN = individualTINRegex.test(formattedTIN) || companyTINRegex.test(formattedTIN);
      if (!isValidTIN) {
        alert('Invalid Malaysia TIN format. Example: IG1150020000 or C1234567890');
        return false;
      }
    }

    if (!mailingPostalCode) { alert('Mailing postal code is required.'); return false; }
    if (!/^\d{5}$/.test(mailingPostalCode)) { alert('Mailing postal code must be 5 digits.'); return false; }
    if (!billingPostalCode) { alert('Billing postal code is required.'); return false; }
    if (!/^\d{5}$/.test(billingPostalCode)) { alert('Billing postal code must be 5 digits.'); return false; }

    if (!formData.mailing_address?.trim()) {
      alert('Mailing address is required.'); return false;
    } else if (formData.mailing_address.trim().length < 10) {
      alert('Mailing address must be at least 10 characters long.'); return false;
    } else if (!addressRegex.test(formData.mailing_address)) {
      alert('Mailing address contains invalid characters.'); return false;
    }

    if (!formData.billing_address?.trim()) {
      alert('Billing address is required.'); return false;
    } else if (formData.billing_address.trim().length < 10) {
      alert('Billing address must be at least 10 characters long.'); return false;
    } else if (!addressRegex.test(formData.billing_address)) {
      alert('Billing address contains invalid characters.'); return false;
    }

    if (!mobileRegex.test(String(formData.contact_number || ''))) {
      alert('Contact number must be exactly 10 digits.'); return false;
    }

    if (formData.alternate_contact && !mobileRegex.test(String(formData.alternate_contact))) {
      alert('Alternate contact must be exactly 10 digits.'); return false;
    }

    if (formData.alternate_contact && formData.alternate_contact === formData.contact_number) {
      alert('Alternate contact must be different from main contact.'); return false;
    }

    if (locationServiceList.length === 0) {
      alert('At least one service is required.'); return false;
    } else {
      for (const item of locationServiceList) {
        if (!item.region_id) { alert("Region is required"); return false; }
        if (!item.state_id) { alert("State is required"); return false; }
        if (!item.city_id) { alert("City is required"); return false; }
        if (!item.category_id) { alert("Category is required"); return false; }
        if (!item.item_id) { alert("Item is required"); return false; }
        if (!item.type_id) { alert("Type is required"); return false; }
        if (!item.description_id) { alert("Description is required"); return false; }
        if (!item.price || item.price <= 0) { alert("Price must be greater than 0"); return false; }
      }
    }

    if (!formData.contact_person?.trim()) { alert('Contact person is required.'); return false; }

    return true;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setLoading(true);

    let finalMailing = formData.mailing_address.trim();
    if (!finalMailing.endsWith(mailingPostalCode)) {
      finalMailing += finalMailing ? `, ${mailingPostalCode}` : mailingPostalCode;
    }
    let finalBilling = formData.billing_address.trim();
    if (!finalBilling.endsWith(billingPostalCode)) {
      finalBilling += finalBilling ? `, ${billingPostalCode}` : billingPostalCode;
    }

const servicesArray = locationServiceList.map(item => ({
  region_id: item.region_id,
  region_name: item.region_name,
  state_id: item.state_id,
  state_name: item.state_name,
  city_id: item.city_id,
  city_name: item.city_name,
  category_id: item.category_id,
  category_name: item.category_name,
  item_id: item.item_id,
  item_name: item.item_name,
  type_id: item.type_id,
  type_name: item.type_name,
  description_id: item.description_id,
  description_name: item.description_name,
  service_rate: item.price
}));

    const fd = new FormData();
    fd.append('email', contractor.email_id);
    fd.append('company_name', formData.company_name);
    fd.append('brn_number', formData.brn_number);
    fd.append('tin_number', formData.tin_number);
    fd.append('bumiputera', formData.bumiputera === 'yes' ? 1 : 0);
    fd.append('billing_address', finalBilling);
    fd.append('mailing_address', finalMailing);
    fd.append("mailing_region_id", mailingRegionId);
    fd.append("mailing_state_id", mailingStateId);
    fd.append("mailing_city_id", mailingCityId);
    fd.append('contact_number', formData.contact_number);
    fd.append('alternate_contact', formData.alternate_contact);
    fd.append('contact_person', formData.contact_person);
    fd.append('services', JSON.stringify(servicesArray));
    if (companyLogo) fd.append('company_logo', companyLogo);
    certificates.forEach((file) => fd.append('certificate', file));

    try {
      const res = await fetch(`${BASE_URLS.user}/api/contractor/update_company_profile`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok) {
        alert('Your profile has been updated successfully. Admin will cross-check your details and approve your profile.');
        setSuccessMessage('Profile submitted. Pending admin approval.');
        setEditMode(false);
        await fetchProfile();
      } else {
        setErrors({ general: data.error || 'Failed to update profile' });
      }
    } catch (err) {
      setErrors({ general: 'Error updating profile.' });
    } finally {
      setLoading(false);
    }
  };

  const validateBank = () => {
    const swiftRegex = /^[A-Z]{4}MY[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    const accountRegex = /^[0-9]{6,20}$/;

    if (!bankDetails.bankName) { alert('Please select bank name.'); return false; }
    if (!bankDetails.holderName || bankDetails.holderName.trim().length < 2) {
      alert('Account holder name is required.'); return false;
    }
    if (!accountRegex.test(String(bankDetails.accountNumber || ''))) {
      alert('Account number must be 6 to 20 digits.'); return false;
    }
    if (!swiftRegex.test(String(bankDetails.swift || '').toUpperCase())) {
      alert('Invalid SWIFT code.'); return false;
    }
    if (!bankStatement) { alert('Please upload bank statement.'); return false; }

    return true;
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (!validateBank()) return;
    setLoading(true);

    const fd = new FormData();
    fd.append('email', contractor.email_id);
    fd.append('swift', bankDetails.swift.toUpperCase());
    fd.append('bank_name', bankDetails.bankName);
    fd.append('holder_name', bankDetails.holderName);
    fd.append('account_number', bankDetails.accountNumber);
    if (bankStatement) fd.append('bank_statement', bankStatement);

    try {
      const res = await fetch(`${BASE_URLS.user}/api/contractor/update_company_bank`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (res.ok) {
        alert('Bank details updated successfully.');
        setSuccessMessage('Bank details updated successfully.');
        setShowBankForm(false);
        await fetchProfile();
      } else {
        setErrors({ general: data.error || 'Failed to submit bank details' });
      }
    } catch (err) {
      setErrors({ general: 'Error submitting bank details.' });
    } finally {
      setLoading(false);
    }
  };

  const isProfileFilled = profile && (
    Array.isArray(profile.services)
      ? profile.services.length > 0
      : (profile.services && Object.keys(profile.services).length > 0)
  );

  if (!contractor) return <div className="text-center text-danger">Please login to view your dashboard.</div>;
  if (!profile) return <div className="text-center">Loading...</div>;

  const isPending = profile.status === 'pending';
  const isRejected = profile.status === 'rejected';

  return (
    <div className="company-container container">
      {(!isProfileFilled || editMode) ? (
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
            fetchAndAppend={fetchAndAppend}
          />

          <ContactSection formData={formData} errors={errors} handleFormChange={handleFormChange} />

          <UpdateServiceList
            locationServiceList={locationServiceList}
            regions={regions}
            servicesList={servicesList}
            errors={errors}
            handleChange={handleChange}
            addServiceRow={addServiceRow}
            removeServiceRow={removeServiceRow}
          />

          <CompanyLogoUpload errors={errors} handleCompanyLogoChange={handleCompanyLogoChange} />
          <CertificateUpload errors={errors} handleCertificateChange={handleCertificateChange} />

          <div className="col-12">
            <button className="btn btn-primary w-100" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Submit Details'}
            </button>
            {editMode && (
              <button type="button" className="btn btn-secondary w-100 mt-2" onClick={() => setEditMode(false)}>
                Cancel
              </button>
            )}
            {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
          </div>
        </form>
      ) : isPending ? (
        <div className="text-center">
          <p className="text-muted mb-3">Your profile is pending admin approval.</p>
        </div>
      ) : isRejected ? (
        <p className="text-center text-danger">Profile rejected. Contact admin.</p>
      ) : showBankForm ? (
        <BankDetailsForm
          bankDetails={bankDetails}
          setBankDetails={setBankDetails}
          errors={errors}
          malaysianBanks={malaysianBanks}
          handleBankStatementChange={handleBankStatementChange}
          handleBankSubmit={handleBankSubmit}
          loading={loading}
        />
      ) : (
        <CompanyProfileView
          profile={profile}
          contractor={contractor}
          BASE_URLS={BASE_URLS}
          navigate={navigate}
          successMessage={successMessage}
        />
      )}
    </div>
  );
}

export default UpdateCompanyProfile;