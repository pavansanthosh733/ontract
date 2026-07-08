import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useContractor } from "../../context/ContractorContext";

import './css/CompanyProfile.css';

import { BASE_URL, BASE_URLS, apiGet, apiPost, apiPut, apiDelete } from "../../api";


// function UpdateCompanyProfile({ contractor }) {
function UpdateCompanyProfile() {

  const { contractor } = useContractor(); 

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
  // Postal Code States
const [mailingPostalCode, setMailingPostalCode] = useState('');
const [billingPostalCode, setBillingPostalCode] = useState('');
const [sameAsMailing, setSameAsMailing] = useState(false);
const [regions, setRegions] = useState({});
const [states, setStates] = useState([]);
const navigate = useNavigate();
const cleanInput = (value) => {
  return value.replace(/[^A-Za-z0-9-.& ]/g, "");
};

const cleanName = (value) => {
  return value.replace(/[^A-Za-z ]/g, "");
};

const cleanAddress = (value) => {
  return value.replace(/[^A-Za-z0-9\s,./#&()-]/g, "");
};

const cleanNumber = (value) => {
  return value.replace(/\D/g, "");
};

const cleanAlphaNumeric = (value) => {
  return value.replace(/[^A-Za-z0-9]/g, "");
};



  
    const malaysianBanks = [
    'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank',
    'AmBank', 'Standard Chartered Bank Malaysia', 'HSBC Bank Malaysia',
    'UOB Malaysia', 'OCBC Bank Malaysia'
  ];

 
   const [servicesList, setServicesList] = useState([]);
   const [categories, setCategories] = useState([]);
const [items, setItems] = useState([]);
const [types, setTypes] = useState([]);
const [descriptions, setDescriptions] = useState([]);
     // example usage
  useEffect(() => {
    if (!contractor) {
      console.log("No contractor found in context");
      return;
    }

    console.log("Contractor from context:", contractor);
  }, [contractor]);
  
  useEffect(() => {
    if (sameAsMailing) {
      setFormData(prev => ({
        ...prev,
        billing_address: prev.mailing_address
      }));

      setBillingPostalCode(mailingPostalCode);
    }
  }, [sameAsMailing, mailingPostalCode, formData.mailing_address]);
  useEffect(() => {
  apiGet("/api/contractor/category")
    .then(data => {
      setCategories(data || []);
      setServicesList(data || []);
    })
    .catch(() => {
      setCategories([]);
      setServicesList([]);
    });
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
      console.log("email",contractor.email_id);
      console.log("after bank submit",data);
      if (res.ok) {
        setProfile(data);
        setSuccessMessage('');

        // Show bank form after approval if bank details missing
        if (data.status === 'approved' && !data.bank_details) {
          setShowBankForm(true);
        } else {
          setShowBankForm(false);
        }

        setFormData({
          brn_number: data.brn_number || '',
          company_name:data.company_name || '',
          contact_number: data.contact_number || '',
          email_id: data.email_id || '',
          tin_number: data.tin_number || '',
          bumiputera: data.bumiputera === 1 ? 'yes' : 'no',
          contact_person:data.name || '',
          mailing_address: data.mailing_address || '',
          billing_address: data.billing_address || '',
        });


        // data.services may be array (service_name, service_rate, service_location)
        if (Array.isArray(data.services) && data.services.length > 0) {
          const arr = data.services.map(s => ({
            region: '', // unknown in company_services table; keep blank for now
            location: s.service_location || '',
            service: s.service_name || '',
            price: s.service_rate || ''
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

 // Fetch Malaysia Regions
// Fetch Regions → store full objects
useEffect(() => {
  apiGet("/api/contractor/region/")
    .then((data) => {
      console.log("Regions fetched:", data);
      setRegions(Array.isArray(data) ? data : []);
    })
    .catch(() => setRegions([]));
}, []);


const fetchStates = (regionName, index, regionIdOverride = null) => {
  const fetchItemsByCategory = async (categoryId) => {
  return await apiGet(`/api/contractor/items/${categoryId}`);
};

const fetchTypesByCategoryItem = async (categoryId, itemId) => {
  return await apiGet(
    `/api/contractor/types/filter?category_id=${categoryId}&item_id=${itemId}`
  );
};

const fetchDescriptions = async (categoryId, itemId, typeId) => {
  return await apiGet(
    `/api/contractor/description/filter?category_id=${categoryId}&item_id=${itemId}&type_id=${typeId}`
  );
};
  if (!regionName) {
    setLocationServiceList(prev => {
      const updated = [...prev];
      updated[index].states = [];
      return updated;
    });
    return;
  }

  const regionObj = regions.find(r => r.region_name === regionName);
  const regionId = regionIdOverride || regionObj?.region_id;

  if (!regionId) return;

  apiGet(`/api/contractor/state/by-region/${regionId}`)
    .then(data => {
      setLocationServiceList(prev => {
        const updated = [...prev];
        updated[index].states = data.map(s => s.state_name);
        return updated;
      });
    })
    .catch(() => {
      setLocationServiceList(prev => {
        const updated = [...prev];
        updated[index].states = [];
        return updated;
      });
    });
};

  const enterEditMode = () => setEditMode(true);



const handleFormChange = (e) => {
  const { name, value } = e.target;

  let cleanedValue = value;

  switch (name) {
    case "company_name":
      cleanedValue = cleanInput(value);
      break;

    case "brn_number":
      cleanedValue = cleanAlphaNumeric(value).toUpperCase();
      break;

    case "tin_number":
      cleanedValue = cleanAlphaNumeric(value).toUpperCase();
      break;

    case "contact_person":
      cleanedValue = cleanName(value);
      break;

    case "contact_number":
    case "alternate_contact":
      cleanedValue = cleanNumber(value);
      break;

    case "mailing_address":
    case "billing_address":
      cleanedValue = cleanAddress(value);
      break;

    default:
      cleanedValue = value;
  }

  setFormData((prev) => ({
    ...prev,
    [name]: cleanedValue,
  }));
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

          row.states = [];
          row.cities = [];
          row.items = [];
          row.types = [];
          row.descriptions = [];

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
          row.items = [];
          row.types = [];
          row.descriptions = [];

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
          row.types = [];
          row.descriptions = [];

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
  region: "",
  region_id: null,

  state: "",
  state_id: null,

  city: "",
  city_id: null,

  category_id: "",
  category_name: "",

  item_id: "",
  item_name: "",

  type_id: "",
  type_name: "",

  description_id: "",
  description_name: "",

  price: "",

  states: [],
  cities: [],
  items: [],
  types: [],
  descriptions: []
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
          // Prevent duplicate appending
          if (current.includes(fullAppend)) return prev;
          const updated = current ? `${current}, ${fullAppend}` : fullAppend;
          return { ...prev, mailing_address: updated };
        });
      } else {
        setFormData(prev => {
          const current = prev.billing_address?.trim() || '';
          // Prevent duplicate appending
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

// ==========================
// FILE VALIDATION HANDLERS
// ==========================

// 🏢 Company Logo (Image only, < 5MB)
const handleCompanyLogoChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5 MB

  if (!allowedTypes.includes(file.type)) {
    setErrors((prev) => ({
      ...prev,
      companyLogo: 'Only JPEG, PNG, or GIF files are allowed.',
    }));
    e.target.value = '';
    setCompanyLogo(null);
    return;
  }

  if (file.size > maxSize) {
    setErrors((prev) => ({
      ...prev,
      companyLogo: 'File size must be less than 5 MB.',
    }));
    e.target.value = '';
    setCompanyLogo(null);
    return;
  }

  // 🚫 Prevent same file as certificate
  if (certificate && file.name === certificate.name && file.size === certificate.size) {
    setErrors((prev) => ({
      ...prev,
      companyLogo: 'Company logo and certificate cannot be the same file.'
    }));
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

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];
  const maxSize = 10 * 1024 * 1024; // 10 MB each

  const validFiles = [];

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        certificate: 'Only JPEG, PNG, GIF, or PDF files are allowed.',
      }));
      e.target.value = '';
      setCertificates([]);
      return;
    }

    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        certificate: 'Each file must be less than 10 MB.',
      }));
      e.target.value = '';
      setCertificates([]);
      return;
    }

    validFiles.push(file);
  }

  setErrors((prev) => ({ ...prev, certificate: null }));
  setCertificates(validFiles);
};

// 🏦 Bank Statement (PDF or Image, < 10MB)
const handleBankStatementChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxSize = 10 * 1024 * 1024; // 10 MB

  if (!allowedTypes.includes(file.type)) {
    setErrors((prev) => ({
      ...prev,
      bankStatement: 'Only PDF, JPEG, or PNG files are allowed.',
    }));
    e.target.value = '';
    setBankStatement(null);
    return;
  }

  if (file.size > maxSize) {
    setErrors((prev) => ({
      ...prev,
      bankStatement: 'File size must be less than 10 MB.',
    }));
    e.target.value = '';
    setBankStatement(null);
    return;
  }

  setErrors((prev) => ({ ...prev, bankStatement: null }));
  setBankStatement(file);
};


  // VALIDATIONS
  const validateProfile = () => {
    
    const mobileRegex = /^[0-9]{10}$/;
    const addressRegex = /^[A-Za-z0-9\s,./#'’()-]{10,200}$/; // ✅ allows normal address chars
    const individualTINRegex = /^IG\d{9,11}$/;
    const companyTINRegex = /^[A-Z]\d{10,11}$/;

    if (!formData.company_name?.trim()) {
      alert('Company name is required.');
      return false;
    }
    if (!formData.bumiputera) {
      alert('Please select Bumiputera status.');
      return false;
    }
    if (!formData.brn_number?.trim()) {
      alert('BRN number is required.');
      return false;
    }

    if (!formData.tin_number) {
      alert('TIN number is required.');
      return false;
    } else {
      const formattedTIN = formData.tin_number.trim().toUpperCase();

      const isValidTIN =
        individualTINRegex.test(formattedTIN) ||
        companyTINRegex.test(formattedTIN);

      if (!isValidTIN) {
        alert(
          'Invalid Malaysia TIN format. Example: IG1150020000 or C1234567890'
        );
        return false;
      }
    }

    if (!mailingPostalCode) {
      alert('Mailing postal code is required.');
      return false;
    }

    if (!/^\d{5}$/.test(mailingPostalCode)) {
      alert('Mailing postal code must be 5 digits.');
      return false;
    }
    if (!billingPostalCode) {
      alert('Billing postal code is required.');
      return false;
    }
    if (!/^\d{5}$/.test(billingPostalCode)) {
      alert('Billing postal code must be 5 digits.');
      return false;
    }

    if (!formData.mailing_address?.trim()) {
        alert('Mailing address is required.');
        return false;
    } else if (formData.mailing_address.trim().length < 10) {
        alert('Mailing address must be at least 10 characters long.');
        return false;
    } else if (!addressRegex.test(formData.mailing_address)) {
        alert('Mailing address contains invalid characters.');
        return false;
    }

  // ✅ Billing Address validation
    if (!formData.billing_address?.trim()) {
      alert('Billing address is required.');
      return false;
    } else if (formData.billing_address.trim().length < 10) {
      alert('Billing address must be at least 10 characters long.');
      return false;
    } else if (!addressRegex.test(formData.billing_address)) {
      alert('Billing address contains invalid characters.');
      return false;
    }

    if (!mobileRegex.test(String(formData.contact_number || ''))) {
      alert('Contact number must be exactly 10 digits.');
      return false;
    }
    
    if (formData.alternate_contact && !mobileRegex.test(String(formData.alternate_contact))) {
      alert('Alternate contact must be exactly 10 digits.');
      return false;
    }

    if (formData.alternate_contact && formData.alternate_contact === formData.contact_number) {
      alert('Alternate contact must be different from main contact.');
      return false;
    }

    if (locationServiceList.length === 0) {
      alert('At least one service is required.');
      return false;
    } else {

      for (const [idx, item] of locationServiceList.entries()) {

        if (!item.region_id) {
          alert("Region is required");
          return false;
        }

        if (!item.state_id) {
          alert("State is required");
          return false;
        }

        if (!item.city_id) {
          alert("City is required");
          return false;
        }

        if (!item.category_id) {
          alert("Category is required");
          return false;
        }

        if (!item.item_id) {
          alert("Item is required");
          return false;
        }

        if (!item.type_id) {
          alert("Type is required");
          return false;
        }

        if (!item.description_id) {
          alert("Description is required");
          return false;
        }

        if (!item.price || item.price <= 0) {
          alert("Price must be greater than 0");
          return false;
        }

      }
    }
      // Contact person
    if (!formData.contact_person?.trim()) {
      alert('Contact person is required.');
      return false;
    }

    return true;
  };

  // PROFILE submit
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

    // services -> array of objects expected by backend
const servicesArray = locationServiceList.map(item => ({
  region_id: item.region_id,
  region_name: item.region,

  state_id: item.state_id,
  state_name: item.state,

  city_id: item.city_id,
  city_name: item.city,

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
    fd.append(
  'bumiputera',
    formData.bumiputera === 'yes' ? 1 : 0
    );
    // fd.append('billing_address', formData.billing_address);
    // fd.append('mailing_address', formData.mailing_address);
    fd.append('billing_address', finalBilling);
    fd.append('mailing_address', finalMailing);
    fd.append('contact_number', formData.contact_number);
    fd.append('alternate_contact', formData.alternate_contact);
    fd.append('contact_person', formData.contact_person);
    fd.append('services', JSON.stringify(servicesArray));
    if (companyLogo) fd.append('company_logo', companyLogo);
  certificates.forEach((file) => {
  fd.append('certificate', file);
});

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

  // bank VALIDATION (client-side)
    const validateBank = () => {
    const swiftRegex = /^[A-Z]{4}MY[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    const accountRegex = /^[0-9]{6,20}$/;
    if (!bankDetails.bankName) {
      alert('Please select bank name.');
      return false;
    }

    if (
      !bankDetails.holderName ||
      bankDetails.holderName.trim().length < 2
    ) {
      alert('Account holder name is required.');
      return false;
    }

    if (
      !accountRegex.test(
        String(bankDetails.accountNumber || '')
      )
    ) {
      alert('Account number must be 6 to 20 digits.');
      return false;
    }

    if (
      !swiftRegex.test(
        String(bankDetails.swift || '').toUpperCase()
      )
    ) {
      alert('Invalid SWIFT code.');
      return false;
    }

    if (!bankStatement) {
      alert('Please upload bank statement.');
      return false;
    }

    return true;
  };

  // BANK submit
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
      console.log("after ",data);
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

  // Determine if profile has services (for "view" mode)
  const isProfileFilled = profile && (Array.isArray(profile.services) ? profile.services.length > 0 : (profile.services && Object.keys(profile.services).length > 0));

  // RENDER
  if (!contractor) return <div className="text-center text-danger">Please login to view your dashboard.</div>;
  if (!profile) return <div className="text-center">Loading...</div>;


    const isPending = profile.status === 'pending';
  const isRejected = profile.status === 'rejected';
  const isApproved = profile.status === 'approved';
  const isFilled = profile.full_name && profile.services?.length > 0;
  // console.log(showBankForm);
  return (
    <div className="company-container container">
      {(!isProfileFilled || editMode) ? (
        <form onSubmit={handleProfileSubmit} className="row g-3">
          <div className="col-12"><h3>Company Details</h3></div>

          <div className="col-md-6">
            <label className="form-label">Company Name <span className="required-asterisk">*</span> </label>
            <input name="company_name" className={`form-control ${errors.company_name ? 'is-invalid' : ''}`} value={formData.company_name} onChange={handleFormChange} />
            {errors.company_name && <div className="invalid-feedback">{errors.company_name}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">BRN Number<span className="required-asterisk">*</span></label>
            <input name="brn_number" className={`form-control ${errors.brn_number ? 'is-invalid' : ''}`} value={formData.brn_number} onChange={handleFormChange} />
            {errors.brn_number && <div className="invalid-feedback">{errors.brn_number}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">TIN Number<span className="required-asterisk">*</span></label>
            <input name="tin_number" className={`form-control ${errors.tin_number ? 'is-invalid' : ''}`} value={formData.tin_number} onChange={handleFormChange} />
            {errors.tin_number && <div className="invalid-feedback">{errors.tin_number}</div>}
          </div>
          <div className="col-md-6">
  <label className="form-label">
    Bumiputera <span className="required-asterisk">*</span>
  </label>

  <select
    name="bumiputera"
    className={`form-select ${errors.bumiputera ? 'is-invalid' : ''}`}
    value={formData.bumiputera}
    onChange={handleFormChange}
  >
    <option value="">Select</option>
    <option value="yes">Yes</option>
    <option value="no">No</option>
  </select>

  {errors.bumiputera && (
    <div className="invalid-feedback">{errors.bumiputera}</div>
  )}
</div>

          {/* Mailing Postal Code + Address */}
            <div className="col-md-12">
              <label className="form-label">
                Mailing Postal Code <span className="required-asterisk">*</span>
              </label>

              <input
                type="text"
                className={`form-control ${errors.mailingPostalCode ? 'is-invalid' : ''}`}
                value={mailingPostalCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');

                  setMailingPostalCode(value);

                  if (sameAsMailing) {
                    setBillingPostalCode(value);
                  }
                }}
                onBlur={() => fetchAndAppend('mailing', mailingPostalCode)}
                placeholder="e.g., 50450"
                maxLength={5}
              />

              {errors.mailingPostalCode && (
                <div className="invalid-feedback d-block">
                  {errors.mailingPostalCode}
                </div>
              )}
            </div>

            <div className="col-md-12">
              <label className="form-label">
                Mailing Address <span className="required-asterisk">*</span>
              </label>

              <textarea
                name="mailing_address"
                className={`form-control ${errors.mailing_address ? 'is-invalid' : ''}`}
                rows="2"
                value={formData.mailing_address}
                onChange={(e) => {
                  handleFormChange(e);

                  if (sameAsMailing) {
                    setFormData(prev => ({
                      ...prev,
                      billing_address: e.target.value
                    }));
                  }
                }}
                placeholder="Enter street address; city/state auto-appends after postal code."
              />

              {errors.mailing_address && (
                <div className="invalid-feedback d-block">
                  {errors.mailing_address}
                </div>
              )}
            </div>

            {/* SAME AS MAILING CHECKBOX */}
            <div className="col-md-12">
              <div className="form-check mb-2">

                <input
                  className="form-check-input"
                  type="checkbox"
                  id="sameAddress"
                  checked={sameAsMailing}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    setSameAsMailing(checked);

                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        billing_address: prev.mailing_address
                      }));

                      setBillingPostalCode(mailingPostalCode);
                    }
                  }}
                />

                <label className="form-check-label" htmlFor="sameAddress">
                  Billing Address same as Mailing Address
                </label>

              </div>
            </div>

            {/* Billing Postal Code + Address */}
            <div className="col-md-12">
              <label className="form-label">
                Billing Postal Code <span className="required-asterisk">*</span>
              </label>

              <input
                type="text"
                className={`form-control ${errors.billingPostalCode ? 'is-invalid' : ''}`}
                value={billingPostalCode}
                disabled={sameAsMailing}
                onChange={(e) =>
                  setBillingPostalCode(e.target.value.replace(/\D/g, ''))
                }
                onBlur={() => fetchAndAppend('billing', billingPostalCode)}
                placeholder="e.g., 50450"
                maxLength={5}
              />

              {errors.billingPostalCode && (
                <div className="invalid-feedback d-block">
                  {errors.billingPostalCode}
                </div>
              )}
            </div>

            <div className="col-md-12">
              <label className="form-label">
                Billing Address <span className="required-asterisk">*</span>
              </label>

              <textarea
                name="billing_address"
                className={`form-control ${errors.billing_address ? 'is-invalid' : ''}`}
                rows="2"
                value={formData.billing_address}
                disabled={sameAsMailing}
                onChange={handleFormChange}
                placeholder="Enter street address; city/state auto-appends after postal code."
              />

              {errors.billing_address && (
                <div className="invalid-feedback d-block">
                  {errors.billing_address}
                </div>
              )}
            </div>


           <div className="col-md-6">
            <label className="form-label">Contact Number<span className="required-asterisk">*</span></label>
            <input name="contact_number" className={`form-control ${errors.contact_number ? 'is-invalid' : ''}`} value={formData.contact_number} onChange={handleFormChange} />
            {errors.contact_number && <div className="invalid-feedback">{errors.contact_number}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Alternate Contact</label>
            <input name="alternate_contact" className={`form-control ${errors.alternate_contact ? 'is-invalid' : ''}`} value={formData.alternate_contact} onChange={handleFormChange} />
            {errors.alternate_contact && <div className="invalid-feedback">{errors.alternate_contact}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Contact Person<span className="required-asterisk">*</span></label>
            <input name="contact_person" className={`form-control ${errors.contact_person ? 'is-invalid' : ''}`} value={formData.contact_person} onChange={handleFormChange} />
            {errors.contact_person && <div className="invalid-feedback">{errors.contact_person}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Email (read-only)</label>
            <input name="email_id" className="form-control" value={formData.email_id} onChange={handleFormChange} disabled />
          </div>

          <div className="col-12">
            <h5>Locations & Services<span className="required-asterisk">*</span></h5>
            {locationServiceList.map((it, idx) => (
              <div key={idx} className="border rounded p-3 mb-3">

                {/* ===== ROW 1 : REGION / STATE / CITY / PRICE ===== */}
                <div className="row mb-2">

                  {/* REGION */}
                  <div className="col-md-3">
                    <label className="form-label small">Region</label>
                    <select
                      className={`form-select ${errors[`region-${idx}`] ? 'is-invalid' : ''}`}
                      value={it.region_id || ''}
                      onChange={(e) => {
                        const region = regions.find(r => r.region_id == e.target.value);
                        handleChange(idx, "region", {
                          id: region.region_id,
                          name: region.region_name
                        });
                      }}
                    >
                      <option value="">Select Region</option>
                      {regions.map((r) => (
                        <option key={r.region_id} value={r.region_id}>
                          {r.region_name}
                        </option>
                      ))}
                    </select>
                    {errors[`region-${idx}`] && (
                      <div className="invalid-feedback d-block">{errors[`region-${idx}`]}</div>
                    )}
                  </div>

                  {/* STATE */}
                  <div className="col-md-3">
                    <label className="form-label small">State</label>
                    <select
                      className={`form-select ${errors[`state-${idx}`] ? "is-invalid" : ""}`}
                      value={it.state_id || ""}
                      onChange={(e) => {
                        const state = it.states.find(s => s.state_id == e.target.value);
                        handleChange(idx, "state", {
                          id: state.state_id,
                          name: state.state_name
                        });
                      }}
                      disabled={!it.region_id}
                    >
                      <option value="">Select State</option>
                      {it.states?.map((s) => (
                        <option key={s.state_id} value={s.state_id}>
                          {s.state_name}
                        </option>
                      ))}
                    </select>
                    {errors[`state-${idx}`] && (
                      <div className="invalid-feedback d-block">{errors[`state-${idx}`]}</div>
                    )}
                  </div>

                  {/* CITY */}
                  <div className="col-md-3">
                    <label className="form-label small">City</label>
                    <select
                      className={`form-select ${errors[`city-${idx}`] ? "is-invalid" : ""}`}
                      value={it.city_id || ""}
                      onChange={(e) => {
                        const city = it.cities.find(c => c.city_id == e.target.value);
                        handleChange(idx, "city", {
                          id: city.city_id,
                          name: city.city_name
                        });
                      }}
                      disabled={!it.state_id}
                    >
                      <option value="">Select City</option>
                      {it.cities?.map((c) => (
                        <option key={c.city_id} value={c.city_id}>
                          {c.city_name}
                        </option>
                      ))}
                    </select>
                    {errors[`city-${idx}`] && (
                      <div className="invalid-feedback d-block">{errors[`city-${idx}`]}</div>
                    )}
                  </div>

                  {/* PRICE */}
                  <div className="col-md-3">
                    <label className="form-label small">Price</label>
                    <input
                      type="number"
                      min="0"
                      className={`form-control ${errors[`price-${idx}`] ? 'is-invalid' : ''}`}
                      value={it.price || ''}
                      onChange={(e) => handleChange(idx, 'price', e.target.value)}
                    />
                    {errors[`price-${idx}`] && (
                      <div className="invalid-feedback d-block">{errors[`price-${idx}`]}</div>
                    )}
                  </div>
                </div>

                {/* ===== ROW 2 : CATEGORY / ITEM / TYPE / DESCRIPTION ===== */}
                <div className="row">

                  {/* CATEGORY */}
                  <div className="col-md-3">
                    <label className="form-label small">Category</label>
                    <select
                      className="form-select"
                      value={it.category_id || ""}
                      onChange={e =>
                        handleChange(idx, "category", {
                          id: e.target.value,
                          name: servicesList.find(c => c.category_id == e.target.value)?.category_name
                        })
                      }
                    >
                      <option value="">Category</option>
                      {servicesList.map(c => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ITEM */}
                  <div className="col-md-3">
                    <label className="form-label small">Item</label>
                    <select
                      className="form-select"
                      value={it.item_id || ""}
                      onChange={e =>
                        handleChange(idx, "item", {
                          id: e.target.value,
                          name: it.items.find(i => i.item_id == e.target.value)?.item_name
                        })
                      }
                      disabled={!it.items?.length}
                    >
                      <option value="">Item</option>
                      {it.items?.map(i => (
                        <option key={i.item_id} value={i.item_id}>
                          {i.item_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* TYPE */}
                  <div className="col-md-3">
                    <label className="form-label small">Type</label>
                    <select
                      className="form-select"
                      value={it.type_id || ""}
                      onChange={e =>
                        handleChange(idx, "type", {
                          id: e.target.value,
                          name: it.types.find(t => t.type_id == e.target.value)?.type_name
                        })
                      }
                      disabled={!it.types?.length}
                    >
                      <option value="">Type</option>
                      {it.types?.map(t => (
                        <option key={t.type_id} value={t.type_id}>
                          {t.type_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DESCRIPTION */}
                  <div className="col-md-3">
                    <label className="form-label small">Description</label>
                    <select
                      className="form-select"
                      value={it.description_id || ""}
                      onChange={e =>
                        handleChange(idx, "description", {
                          id: e.target.value,
                          name: it.descriptions.find(d => d.id == e.target.value)?.description_name
                        })
                      }
                      disabled={!it.descriptions?.length}
                    >
                      <option value="">Description</option>
                      {it.descriptions?.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.description_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-end mt-2">
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeServiceRow(idx)}>Remove</button>
                </div>
              </div>
            ))}
            {errors.services && <div className="text-danger">{errors.services}</div>}
            <button type="button" className="btn btn-secondary mt-2" onClick={addServiceRow}>+ Add Service</button>
          </div>

          <div className="col-md-6">
            <label className="form-label">Company Logo <span className="required-asterisk">*</span></label>
            <input
              type="file"
              className={`form-control ${errors.companyLogo ? 'is-invalid' : ''}`}
              accept="image/*"
              onChange={handleCompanyLogoChange}
              required
            />
            {errors.companyLogo && (
              <div className="invalid-feedback d-block">{errors.companyLogo}</div>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label">Certificate <span className="required-asterisk">*</span></label>
<input
  type="file"
  multiple
  className={`form-control ${errors.certificate ? 'is-invalid' : ''}`}
  accept="image/*,application/pdf"
  onChange={handleCertificateChange}
  required
/>
            {errors.certificate && (
              <div className="invalid-feedback d-block">{errors.certificate}</div>
            )}
          </div>


          <div className="col-12">
            <button className="btn btn-primary w-100" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Submit Details'}</button>
            {editMode && <button type="button" className="btn btn-secondary w-100 mt-2" onClick={() => setEditMode(false)}>Cancel</button>}
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
        <form onSubmit={handleBankSubmit} className="row g-3">
          <div className="col-12"><h3>Company Bank Details</h3></div>

          <div className="col-md-6">
            <label className="form-label">Bank Name<span className="required-asterisk">*</span></label>
            <select className={`form-select ${errors.bankName ? 'is-invalid' : ''}`} value={bankDetails.bankName} onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}>
              <option value="">Select</option>
              {malaysianBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">SWIFT Code<span className="required-asterisk">*</span></label>
            <input className={`form-control ${errors.swift ? 'is-invalid' : ''}`} value={bankDetails.swift} onChange={e => setBankDetails({ ...bankDetails, swift: e.target.value.toUpperCase() })} />
            {errors.swift && <div className="invalid-feedback">{errors.swift}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Account Holder Name<span className="required-asterisk">*</span></label>
            <input className={`form-control ${errors.holderName ? 'is-invalid' : ''}`} value={bankDetails.holderName} onChange={e => setBankDetails({ ...bankDetails, holderName: e.target.value })} />
            {errors.holderName && <div className="invalid-feedback">{errors.holderName}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Account Number<span className="required-asterisk">*</span></label>
            <input className={`form-control ${errors.accountNumber ? 'is-invalid' : ''}`} value={bankDetails.accountNumber} onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} />
            {errors.accountNumber && <div className="invalid-feedback">{errors.accountNumber}</div>}
          </div>

          {/* <div className="col-12">
            <label className="form-label">Bank Statement (PDF or image)<span className="required-asterisk">*</span></label>
            <input type="file" accept="application/pdf,image/*" className={`form-control ${errors.bankStatement ? 'is-invalid' : ''}`} onChange={e => setBankStatement(e.target.files[0])} />
            {errors.bankStatement && <div className="invalid-feedback d-block">{errors.bankStatement}</div>}
          </div> */}
          <div className="col-12">
            <label className="form-label">Bank Statement <span className="required-asterisk">*</span></label>
            <input
              type="file"
              className={`form-control ${errors.bankStatement ? 'is-invalid' : ''}`}
              accept="application/pdf,image/*"
              onChange={handleBankStatementChange}
              required
            />
            {errors.bankStatement && (
              <div className="invalid-feedback d-block">{errors.bankStatement}</div>
            )}
          </div>


          <div className="col-12">
            <button className="btn btn-primary w-100" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Bank Details'}</button>
            {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
          </div>
        </form>
      ) : (
               <div className="company-view mt-4">
          <div className="company-header mb-4 p-4 shadow-sm rounded bg-white">
            <div className="d-flex flex-column flex-md-row align-items-center justify-content-between">
              <div className="d-flex align-items-center mb-3 mb-md-0">
                <img
                  src={`${BASE_URLS.user}/api/contractor/get_image/${contractor.email_id}/contractor_logo`}
                  alt="Company Logo"
                  className="rounded-circle shadow-sm me-3"
                  width="100"
                  height="100"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div>
                  <h3 className="fw-bold text-primary mb-1">{profile.company_name}</h3>
                  <p className="text-muted mb-0">{profile.head_name}</p>
                </div>
              </div>
              <div>
                <button className="btn btn-outline-primary btn-sm me-2" onClick={() => navigate("/contractor/dashboard/contractor-personal-details")}>
                  Edit Profile
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/contractor/dashboard/contractorbankdetails")}>
                  Update Bank
                </button>
              </div>
            </div>
          </div>

          {/* COMPANY INFO GRID */}
          <div className="info-grid shadow-sm p-4 rounded bg-white mb-4">
            <h5 className="fw-semibold text-secondary mb-3">Company Information</h5>
            <div className="row gy-3">
              <div className="col-md-6"><label className="fw-bold text-dark d-block">BRN Number</label><span className="text-muted">{profile.brn_number}</span></div>
              <div className="col-md-6"><label className="fw-bold text-dark d-block">TIN Number</label><span className="text-muted">{profile.tin_number || 'N/A'}</span></div>
              <div className="col-md-6"><label className="fw-bold text-dark d-block">Contact Number</label><span className="text-muted">{profile.contact_number}</span></div>
              <div className="col-md-6"><label className="fw-bold text-dark d-block">Contact Person</label><span className="text-muted">{profile.name}</span></div>
              <div className="col-md-6"><label className="fw-bold text-dark d-block">Mailing Address</label><span className="text-muted">{profile.mailing_address}</span></div>
              <div className="col-md-6"><label className="fw-bold text-dark d-block">Billing Address</label><span className="text-muted">{profile.billing_address}</span></div>
            </div>
          </div>

          {/* SERVICES SECTION */}
          <div className="services-section shadow-sm p-4 rounded bg-white mb-4">
            <h5 className="fw-semibold text-secondary mb-3">Services & Locations</h5>
            {Array.isArray(profile.services) && profile.services.length > 0 ? (
              Object.entries(
                profile.services.reduce((acc, svc) => {
                  acc[svc.service_location] = acc[svc.service_location] || [];
                  acc[svc.service_location].push(svc);
                  return acc;
                }, {})
              ).map(([location, svcs], idx) => (
                <div key={idx} className="mb-3 border-start border-primary ps-3">
                  {/* <h6 className="text-dark fw-semibold mb-2">{location}</h6> */}
                  <ul className="list-unstyled ms-3 mb-0">
                    {svcs.map((s, i) => (
                      <li key={i} className="text-muted">
                       {s.region}, {s.state}, {s.service_name} — <span className="fw-bold">MYR {s.service_rate}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="text-muted">No services available</p>
            )}
          </div>

          {/* CERTIFICATE */}
          <div className="certificate-section shadow-sm p-4 rounded bg-white">
            <h5 className="fw-semibold text-secondary mb-3">Documents</h5>
            <a
              href={`${BASE_URLS.user}/api/contractor/get_image/${contractor.email_id}/contractor_certificate`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-primary btn-sm"
            >
              View Certificate
            </a>
          </div>

          {successMessage && <div className="alert alert-success mt-3">{successMessage}</div>}
        </div>
      )}
    </div>
  );//deploy
}

export default UpdateCompanyProfile;