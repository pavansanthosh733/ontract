// ProviderProfile.jsx (updated: concatenated auto-fill into address textarea)
import React, { useState, useEffect } from 'react';
import './css/ProviderProfile.css';
import { BASE_URL, BASE_URLS, apiGet, apiPost, apiPut, apiDelete } from "../api";
import { useUser } from "../context/UserContext";
import { Link, Outlet, useNavigate } from "react-router-dom";

// function ProviderProfile({ user }) {
function ProviderProfile() {


    const navigate = useNavigate();
     const { user } = useUser();
    console.log("User from context:", user);
    console.log("context r user",user);


  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [mailingPostalCode, setMailingPostalCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [alternateContactNumber, setAlternateContactNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [locationServiceList, setLocationServiceList] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [bankDetails, setBankDetails] = useState({ bankName: '', holderName: '', accountNumber: '', swift: '' });
  const [bankStatement, setBankStatement] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pollInterval, setPollInterval] = useState(null);

  const [regions, setRegions] = useState({});
  const [states, setStates] = useState([]);


  
  const malaysianBanks = [
    'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank',
    'AmBank', 'Standard Chartered Bank Malaysia', 'HSBC Bank Malaysia',
    'UOB Malaysia', 'OCBC Bank Malaysia'
  ];

  const [idTypes, setIdTypes] = useState([]);

useEffect(() => {
  apiGet("/api/state/id-types")
    .then(data => {
      if (Array.isArray(data)) setIdTypes(data);
      else setIdTypes([]);
    })
    .catch(() => setIdTypes([]));
}, []);




  const [servicesList, setServicesList] = useState([]);

 useEffect(() => {
  apiGet("/api/category")
    .then(data => {
      if (Array.isArray(data)) setServicesList(data);
      else setServicesList([]);
    })
    .catch(() => setServicesList([]));
}, []);




  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile?.status === 'pending') {
      const interval = setInterval(fetchProfile, 10000);
      setPollInterval(interval);
      return () => clearInterval(interval);
    } else if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [profile?.status]);

 // Fetch Malaysia Regions
useEffect(() => {
  apiGet("/api/region/")
    .then(data => setRegions(Array.isArray(data) ? data : []))
    .catch(() => setRegions([]));
}, []);


const fetchStates = (regionId, index) => {
  apiGet(`/api/state/by-region/${regionId}`)
    .then(data => {
      setLocationServiceList(prev => {
        const updated = [...prev];
        updated[index].states = Array.isArray(data) ? data : [];
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

const fetchAndAppend = async (type, postalCode) => {
  if (postalCode.length !== 5) return;

  try {
    const data = await apiGet(`/api/malaysia_postcode?postcode=${postalCode}`);

    const city = data?.city || '';
    const state = data?.state || '';
    const fullAppend = `${city}, ${state} ${postalCode}`.trim();

    if (type === 'mailing') {
      setMailingAddress(prev => {
        const trimmedPrev = prev.trim();
        if (trimmedPrev.includes(fullAppend)) return trimmedPrev;

        return trimmedPrev ? `${trimmedPrev}, ${fullAppend}` : fullAppend;
      });
    } else {
      setBillingAddress(prev => {
        const trimmedPrev = prev.trim();
        if (trimmedPrev.includes(fullAppend)) return trimmedPrev;

        return trimmedPrev ? `${trimmedPrev}, ${fullAppend}` : fullAppend;
      });
    }
  } catch (error) {
    console.error("Error fetching address:", error);
  }
};

const fetchProfile = async () => {
  try {
    const data = await apiPost("/api/profile", { email: user.email_id });

    console.log("profile data", data);

    setProfile(data);

    if (data.status === "approved" && !data.bank_details) {
      setShowBankForm(true);
    }

    if (Array.isArray(data.services)) {
      const locServ = data.services.map(s => ({
        region: s.region || "",
        state: s.state || "",
        city: s.city || "",
        service: s.service_name || "",
        price: s.service_rate || ""
      }));
      setLocationServiceList(locServ);
    } else {
      setLocationServiceList([]);
    }

    setFullName(data.full_name || "");
    setIdType(data.id_type || "");
    setIdNumber(data.id_number || "");
    setMailingAddress(data.mailing_address || "");
    setBillingAddress(data.billing_address || "");

    const mailingMatch = data.mailing_address?.match(/(\d{5})$/);
    if (mailingMatch) setMailingPostalCode(mailingMatch[1]);

    const billingMatch = data.billing_address?.match(/(\d{5})$/);
    if (billingMatch) setBillingPostalCode(billingMatch[1]);

    setContactNumber(data.contact_number || data.phone_number || "");
    setAlternateContactNumber(data.alternate_contact_number || "");
    setTinNumber(data.tin_number || "");

  } catch (error) {
    console.error("Profile fetch error:", error);
    setErrors({
      general: error.message || "Error fetching profile."
    });
  }
};


  const enterEditMode = () => setEditMode(true);

  const handleAddLocationService = () => {
    const hasEmpty = locationServiceList.some(item =>
      !item.region || !item.state || !item.service || !item.price
    );
    if (hasEmpty) {
      alert("Please complete all fields in existing rows before adding a new one.");
      return;
    }
    setLocationServiceList([...locationServiceList, { region: '', state: '', service: '', price: '', states: [] }]);
  };

  const handleRemoveLocationService = (index) => {
    const list = [...locationServiceList];
    list.splice(index, 1);
    setLocationServiceList(list);
  };

  const handleChange = (index, field, value) => {
  const list = [...locationServiceList];
  const updated = { ...list[index], [field]: value };

 if(field === 'region'){
    updated.region = value.name;       // store NAME
    updated.region_id = value.id;      // store ID
    updated.state = '';
    fetchStates(value.id, index);      // fetch states by ID
  }

  // Prevent duplicate (region + state + service)
  const isDuplicate = list.some((item, i) =>
    i !== index &&
    item.region === updated.region &&
    item.state === updated.state &&
    item.service === updated.service
  );

  if (isDuplicate) {
    alert('This Region + State + Service combination already exists.');
    return;
  }

  list[index] = updated;
  setLocationServiceList(list);
};

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, profileImage: 'Only JPEG, PNG, or GIF files are allowed.' }));
      e.target.value = '';
      setProfileImage(null);
      return;
    }

    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, profileImage: 'File size must be less than 5MB.' }));
      e.target.value = '';
      setProfileImage(null);
      return;
    }

    // 🚫 Prevent same file as certificate
    if (certificate && file.name === certificate.name && file.size === certificate.size) {
      setErrors(prev => ({
        ...prev,
        profileImage: 'Profile image and certificate cannot be the same file.'
      }));
      e.target.value = '';
      setProfileImage(null);
      return;
    }

    setErrors(prev => ({ ...prev, profileImage: null }));
    setProfileImage(file);
  };
  
  const handleCertificateChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, certificate: 'Only JPEG, PNG, GIF, or PDF files are allowed.' }));
      e.target.value = '';
      setCertificate(null);
      return;
    }

    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, certificate: 'File size must be less than 10MB.' }));
      e.target.value = '';
      setCertificate(null);
      return;
    }

    // 🚫 Prevent same file as profile image
    if (profileImage && file.name === profileImage.name && file.size === profileImage.size) {
      setErrors(prev => ({
        ...prev,
        certificate: 'Certificate and profile image cannot be the same file.'
      }));
      e.target.value = '';
      setCertificate(null);
      return;
    }

    setErrors(prev => ({ ...prev, certificate: null }));
    setCertificate(file);
  };


  const handleBankStatementChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    const maxSize = 10 * 1024 * 1024; // 10 MB

    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        bankStatement: 'Only PDF, JPEG, PNG, or GIF files are allowed.'
      }));
      e.target.value = '';      // clear the file input
      setBankStatement(null);
      return;
    }

    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        bankStatement: 'File size must be less than 10 MB.'
      }));
      e.target.value = '';
      setBankStatement(null);
      return;
    }

    // Clear error and store file
    setErrors(prev => ({ ...prev, bankStatement: null }));
    setBankStatement(file);
  };


  const validateProfile = () => {
    const newErrors = {};
    const nameRegex = /^[A-Za-z\s\-']{1,100}$/;
    const mobileRegex = /^[0-9]{10}$/;
    const addressRegex = /^[A-Za-z0-9\s,./#'’()-]{10,200}$/; // ✅ allows normal address chars

    if (!fullName) newErrors.fullName = 'Full name is required.';
    if (!nameRegex.test(fullName)) newErrors.fullName = 'Invalid full name.';
    if (!mobileRegex.test(contactNumber)) newErrors.contactNumber = 'Contact number must be 10 digits.';
    if (!idType) newErrors.idType = 'ID Type is required.';
    if (!idNumber) newErrors.idNumber = 'ID Number is required.';
    if (idType === 'MyKad' && !/^[0-9]{9,12}$/.test(idNumber))
    newErrors.idNumber = 'MyKad number must be 9–12 digits.';
    if (idType === 'Passport' && !/^[A-Z0-9]{6,9}$/.test(idNumber))
      newErrors.idNumber = 'Passport number must be 6–9 characters.';
    if (idType === 'MyPR' && !/^[A-Z0-9]{6,9}$/.test(idNumber))
      newErrors.idNumber = 'MyPR number must be 6–9 characters.';
      // ✅ Mailing Address validation
  if (!mailingAddress.trim()) newErrors.mailingAddress = 'Mailing address is required.';
  else if (mailingAddress.trim().length < 10)
    newErrors.mailingAddress = 'Mailing address must be at least 10 characters long.';
  else if (!addressRegex.test(mailingAddress))
    newErrors.mailingAddress = 'Mailing address contains invalid characters.';

  // ✅ Billing Address validation
  if (!billingAddress.trim()) newErrors.billingAddress = 'Billing address is required.';
  else if (billingAddress.trim().length < 10)
    newErrors.billingAddress = 'Billing address must be at least 10 characters long.';
  else if (!addressRegex.test(billingAddress))
    newErrors.billingAddress = 'Billing address contains invalid characters.';

    if (!mailingPostalCode) newErrors.mailingPostalCode = 'Postal code required.';
    if (!/^\d{5}$/.test(mailingPostalCode)) newErrors.mailingPostalCode = 'Postal code must be 5 digits.';
    if (!billingPostalCode) newErrors.billingPostalCode = 'Postal code required.';
    if (!/^\d{5}$/.test(billingPostalCode)) newErrors.billingPostalCode = 'Postal code must be 5 digits.';
    // if (!mobileRegex.test(alternateContactNumber)) newErrors.alternateContactNumber = 'Alternate number must be 10 digits.';
    if (alternateContactNumber) {
      if (!mobileRegex.test(alternateContactNumber)) {
        newErrors.alternateContactNumber = 'Alternate contact number must be 10 digits.';
      } else if (alternateContactNumber === contactNumber) {
        newErrors.alternateContactNumber = 'Alternate contact number must be different from Contact Number.';
      }
    }
    if (!tinNumber) newErrors.tinNumber = 'TIN Number is required.';
    if (!/^IG[0-9]{5,6}$/.test(tinNumber)) newErrors.tinNumber = 'TIN must start with IG followed by  5-6 digits.';

    if (locationServiceList.length === 0) {
      newErrors.services = 'At least one service is required.';
    } else {
      locationServiceList.forEach((item, idx) => {
        if (!item.region) newErrors[`region-${idx}`] = 'Region required.';
        if (!item.state) newErrors[`state-${idx}`] = 'State required.';
        if (!item.service) newErrors[`service-${idx}`] = 'Service required.';
        if (!item.price || item.price <= 0) newErrors[`price-${idx}`] = 'Price must be > 0.';
      });
    }

    if (profileImage) {
      const maxSize = 5 * 1024 * 1024;
      if (profileImage.size > maxSize) newErrors.profileImage = 'Image < 5MB.';
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(profileImage.type))
        newErrors.profileImage = 'JPEG/PNG/GIF only.';
    }
    if (certificate) {
      const maxSize = 10 * 1024 * 1024;
      if (certificate.size > maxSize) newErrors.certificate = 'Cert < 10MB.';
      if (!['image/jpeg', 'image/png', 'image/gif', 'application/pdf'].includes(certificate.type))
        newErrors.certificate = 'JPEG/PNG/GIF/PDF only.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setLoading(true);

    // Append postal to address if not already ending with it
    let finalMailing = mailingAddress.trim();
    if (!finalMailing.endsWith(mailingPostalCode)) {
      finalMailing += finalMailing ? `, ${mailingPostalCode}` : mailingPostalCode;
    }
    let finalBilling = billingAddress.trim();
    if (!finalBilling.endsWith(billingPostalCode)) {
      finalBilling += finalBilling ? `, ${billingPostalCode}` : billingPostalCode;
    }

    const servicesArray = locationServiceList.map(item => ({
      region: item.region,
      state: item.state,
      service: item.service,
      price: parseFloat(item.price)
    }));

    const formData = new FormData();
    formData.append('email', user.email_id);
    formData.append('full_name', fullName);
    formData.append('id_type', idType);
    formData.append('id_number', idNumber);
    formData.append('mailing_address', finalMailing);
    formData.append('billing_address', finalBilling);
    formData.append('contact_number', contactNumber);
    formData.append('alternate_contact_number', alternateContactNumber);
    formData.append('tin_number', tinNumber);
    formData.append('services', JSON.stringify(servicesArray));
    if (profileImage) formData.append('profile_image', profileImage);
    if (certificate) formData.append('certificate', certificate);

 try {
  const data = await apiPost("/api/update_profile", formData);

  console.log("after profile submit", data);

  setProfile(prev => ({ ...prev, status: "pending" })); // instant UI update
  setEditMode(false);
  await fetchProfile();

} catch (error) {
  setErrors({ general: error.message || 'Error updating profile.' });
} finally {
  setLoading(false);
}

  };

  const validateBankDetails = () => {
    const newErrors = {};
    const swiftRegex = /^([A-Z]{4}MY[A-Z0-9]{2})([A-Z0-9]{3})?$/;
    const accountRegex = /^[0-9]{9,18}$/;
    const holderNameRegex = /^[A-Za-z\s\-']{1,100}$/;

    if (!bankDetails.bankName) newErrors.bankName = 'Bank required.';
    if (!holderNameRegex.test(bankDetails.holderName)) newErrors.holderName = 'Invalid holder name.';
    if (!accountRegex.test(bankDetails.accountNumber)) newErrors.accountNumber = '9-18 digits only.';
    if (!swiftRegex.test(bankDetails.swift)) newErrors.swift = 'Invalid SWIFT (e.g., MAYBMYKL).';
    if (!bankStatement) newErrors.bankStatement = 'Statement required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (!validateBankDetails()) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('email', user.email_id);
    formData.append('bank_name', bankDetails.bankName);
    formData.append('holder_name', bankDetails.holderName);
    formData.append('account_number', bankDetails.accountNumber);
    formData.append('swift', bankDetails.swift);
    if (bankStatement) formData.append('bank_statement', bankStatement);

try {
  const data = await apiPost("/api/update_bank", formData);

  setSuccessMessage('You can start your services. All the best!');
  setShowBankForm(false);
  fetchProfile();

} catch (error) {
  setErrors({ general: error.message || 'Error submitting bank details.' });

} finally {
  setLoading(false);
}

  };

  if (!user) return <div className="text-center text-danger">Please login to view your dashboard.</div>;
  if (!profile) return <div className="text-center">Loading...</div>;



  const isPending = profile.status === 'pending';
    console.log(profile.status,isPending);
  const isRejected = profile.status === 'rejected';
  const isApproved = profile.status === 'approved';
  const isFilled = profile && (Array.isArray(profile.services) ? profile.services.length > 0 : (profile.services && Object.keys(profile.services).length > 0));

  console.log(!isFilled,editMode,showBankForm);

  return (
    <div className="provider-container">
      {(!isFilled || editMode) ? (
        <form onSubmit={handleProfileSubmit} className="row g-3">
          <div className="col-12 text-center mb-4"><h1>Personal Details Form</h1></div>

          <div className="col-md-6">
            <label className="form-label">Full Name <span className="required-asterisk">*</span> </label>
            <input type="text" className={`form-control ${errors.fullName ? 'is-invalid' : ''}`} value={fullName} onChange={e => setFullName(e.target.value)} />
            {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">TIN Number <span className="required-asterisk">*</span></label>
            <input type="text" className={`form-control ${errors.tinNumber ? 'is-invalid' : ''}`} value={tinNumber} onChange={e => setTinNumber(e.target.value)} />
            {errors.tinNumber && <div className="invalid-feedback">{errors.tinNumber}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">
              ID Type <span className="required-asterisk">*</span>
            </label>
            <select
              className={`form-select ${errors.idType ? 'is-invalid' : ''}`}
              value={idType}
              onChange={e => {
                setIdType(e.target.value);
                setIdNumber('');
              }}
            >
              <option value="">Select</option>
              {idTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {errors.idType && <div className="invalid-feedback">{errors.idType}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">
              {idType === 'Passport'
                ? 'Passport Number'
                : idType === 'MyPR'
                ? 'MyPR Number'
                : idType === 'MyKad'
                ? 'MyKad Number'
                : 'ID Number'}{' '}
              <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.idNumber ? 'is-invalid' : ''}`}
              value={idNumber}
              onChange={e => setIdNumber(e.target.value.toUpperCase())}
              placeholder={
                idType === 'Passport'
                  ? 'e.g., A123456'
                  : idType === 'MyPR'
                  ? 'e.g., PR78901'
                  : idType === 'MyKad'
                  ? 'e.g., 890101015678'
                  : 'Enter ID Number'
              }
            />
            {errors.idNumber && <div className="invalid-feedback">{errors.idNumber}</div>}
          </div>


          <div className="col-12">
            <label className="form-label">Mailing Postal Code </label>
            <input type="text" className={`form-control ${errors.mailingPostalCode ? 'is-invalid' : ''}`} 
              value={mailingPostalCode} 
              onChange={e => setMailingPostalCode(e.target.value.replace(/\D/g, ''))} 
              onBlur={() => fetchAndAppend('mailing', mailingPostalCode)}
              placeholder="e.g., 50450"
              maxLength={5} />
            {errors.mailingPostalCode && <div className="invalid-feedback d-block">{errors.mailingPostalCode}</div>}
          </div>

          <div className="col-12">
            <label className="form-label">Mailing Address <span className="required-asterisk">*</span></label>
            <textarea className={`form-control ${errors.mailingAddress ? 'is-invalid' : ''}`} rows="2" value={mailingAddress} onChange={e => setMailingAddress(e.target.value)} placeholder="Enter street address, etc. City/State will be auto-appended after postal code." />
            {errors.mailingAddress && <div className="invalid-feedback">{errors.mailingAddress}</div>}
          </div>

          <div className="col-12">
            <label className="form-label">Billing Postal Code</label>
            <input type="text" className={`form-control ${errors.billingPostalCode ? 'is-invalid' : ''}`} 
              value={billingPostalCode} 
              onChange={e => setBillingPostalCode(e.target.value.replace(/\D/g, ''))} 
              onBlur={() => fetchAndAppend('billing', billingPostalCode)}
              placeholder="e.g., 50450"
              maxLength={5} />
            {errors.billingPostalCode && <div className="invalid-feedback d-block">{errors.billingPostalCode}</div>}
          </div>

          <div className="col-12">
            <label className="form-label">Billing Address <span className="required-asterisk">*</span></label>
            <textarea className={`form-control ${errors.billingAddress ? 'is-invalid' : ''}`} rows="2" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder="Enter street address, etc. City/State will be auto-appended after postal code." />
            {errors.billingAddress && <div className="invalid-feedback">{errors.billingAddress}</div>}
          </div>


          <div className="col-md-6">
            <label className="form-label">Contact Number <span className="required-asterisk">*</span></label>
            <input type="tel" className={`form-control ${errors.contactNumber ? 'is-invalid' : ''}`} value={contactNumber} onChange={e => setContactNumber(e.target.value)} />
            {errors.contactNumber && <div className="invalid-feedback">{errors.contactNumber}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Alternate Contact</label>
            <input type="tel" className={`form-control ${errors.alternateContactNumber ? 'is-invalid' : ''}`} value={alternateContactNumber} onChange={e => setAlternateContactNumber(e.target.value)} />
            {errors.alternateContactNumber && <div className="invalid-feedback">{errors.alternateContactNumber}</div>}
          </div>


          <div className="col-12">
            <h5>Services by Location (Malaysia) <span className="required-asterisk">*</span></h5>
            {locationServiceList.map((item, idx) => (
              <div key={idx} className="row mb-2 align-items-end">
                <div className="col-md-3">
                  <select
                    className={`form-select ${errors[`region-${idx}`] ? 'is-invalid' : ''}`}
                    value={JSON.stringify({id: item.region_id, name: item.region})}
                    onChange={e => {
                      const parsed = JSON.parse(e.target.value);
                      handleChange(idx, 'region', parsed);
                    }}
                  >
                    <option value="">Region</option>
                    {regions.map(r => (
                      <option
                        key={r.region_id}
                        value={JSON.stringify({ id: r.region_id, name: r.region_name })}
                      >
                        {r.region_name}
                      </option>
                    ))}
                  </select>

                  {errors[`region-${idx}`] && (
                    <div className="invalid-feedback d-block">
                      {errors[`region-${idx}`]}
                    </div>
                  )}
                </div>

                <div className="col-md-3">
                  <select className={`form-select ${errors[`state-${idx}`] ? 'is-invalid' : ''}`} value={item.state} onChange={e => handleChange(idx, 'state', e.target.value)} disabled={!item.region}>
                    <option value="">State</option>
                      {item.states?.map(s => (
                        <option key={s.state_id} value={s.state_name}>
                          {s.state_name}
                        </option>
                      ))}

                  </select>
                  {errors[`state-${idx}`] && <div className="invalid-feedback d-block">{errors[`state-${idx}`]}</div>}
                </div>
                {/* <div className="col-md-2">
                  <select className={`form-select ${errors[`city-${idx}`] ? 'is-invalid' : ''}`} value={item.city} onChange={e => handleChange(idx, 'city', e.target.value)} disabled={!item.state}>
                    <option value="">City</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors[`city-${idx}`] && <div className="invalid-feedback d-block">{errors[`city-${idx}`]}</div>}
                </div> */}
                <div className="col-md-3">
                  <select className={`form-select ${errors[`service-${idx}`] ? 'is-invalid' : ''}`} value={item.service} onChange={e => handleChange(idx, 'service', e.target.value)}>
                    <option value="">Service</option>
                    {servicesList.map(s => (
                      <option key={s.category_id} value={s.category_name}>
                        {s.category_name}
                      </option>
                    ))}

                  </select>
                  {errors[`service-${idx}`] && <div className="invalid-feedback d-block">{errors[`service-${idx}`]}</div>}
                </div>
                <div className="col-md-2">
                  <input type="number" className={`form-control ${errors[`price-${idx}`] ? 'is-invalid' : ''}`} placeholder="Price" value={item.price} onChange={e => handleChange(idx, 'price', e.target.value)} min="1"  step="0.01" />
                  {errors[`price-${idx}`] && <div className="invalid-feedback d-block">{errors[`price-${idx}`]}</div>}
                </div>
                <div className="col-md-1">
                  <button type="button" className="btn btn-danger w-100" onClick={() => handleRemoveLocationService(idx)}>×</button>
                </div>
              </div>
            ))}
            {errors.services && <div className="text-danger">{errors.services}</div>}
            <button type="button" className="btn btn-secondary mt-2" onClick={handleAddLocationService}>+ Add Service</button>
          </div>

          <div className="col-md-6">
            <label className="form-label">Profile Image <span className="required-asterisk">*</span></label>
            <input
              type="file"
              className="form-control"
              onChange={handleProfileImageChange}
              accept="image/*"
              required
            />
            {errors.profileImage && <div className="text-danger">{errors.profileImage}</div>}
          </div>

          <div className="col-md-6">
            <label className="form-label">Certificate <span className="required-asterisk">*</span></label>
            <input
              type="file"
              className="form-control"
              onChange={handleCertificateChange}
              accept="image/*,application/pdf"
              required
            />
            {errors.certificate && <div className="text-danger">{errors.certificate}</div>}
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Saving...' : 'Submit Profile'}
            </button>
            {editMode && <button type="button" className="btn btn-secondary w-100 mt-2" onClick={() => setEditMode(false)}>Cancel</button>}
            {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
          </div>
        </form>
      ) : isPending ? (
        <div className="text-center">
          <p className="text-muted mb-3">Your profile is pending admin approval.</p>
          {/* <button className="btn btn-primary" onClick={fetchProfile}>Refresh</button>
          <p className="text-muted small mt-2">Auto-refresh every 10s...</p> */}
        </div>
      ) : isRejected ? (
        <p className="text-center text-danger">Profile rejected. Contact admin.</p>
      ) : showBankForm ? (
        <form onSubmit={handleBankSubmit} className="row g-3">
          <div className="col-12 text-center mb-4"><h1>Bank Details </h1></div>
          <div className="col-md-6">
            <label className="form-label">Bank</label>
            <select className={`form-select ${errors.bankName ? 'is-invalid' : ''}`} value={bankDetails.bankName} onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}>
              <option value="">Select</option>
              {malaysianBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">Holder Name <span className="required-asterisk">*</span></label>
            <input type="text" className={`form-control ${errors.holderName ? 'is-invalid' : ''}`} value={bankDetails.holderName} onChange={e => setBankDetails({ ...bankDetails, holderName: e.target.value })} />
            {errors.holderName && <div className="invalid-feedback">{errors.holderName}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">Account Number <span className="required-asterisk">*</span></label>
            <input type="text" className={`form-control ${errors.accountNumber ? 'is-invalid' : ''}`} value={bankDetails.accountNumber} onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} />
            {errors.accountNumber && <div className="invalid-feedback">{errors.accountNumber}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">SWIFT Code <span className="required-asterisk">*</span></label>
            <input type="text" className={`form-control ${errors.swift ? 'is-invalid' : ''}`} value={bankDetails.swift} onChange={e => setBankDetails({ ...bankDetails, swift: e.target.value.toUpperCase() })} />
            {errors.swift && <div className="invalid-feedback">{errors.swift}</div>}
          </div>
          <div className="col-12">
            <label className="form-label">Bank Statement <span className="required-asterisk">*</span></label>
            <input
              type="file"
              className={`form-control ${errors.bankStatement ? 'is-invalid' : ''}`}
              onChange={handleBankStatementChange}
              accept="application/pdf,image/*"
              required
            />
            {errors.bankStatement && (
              <div className="invalid-feedback d-block">{errors.bankStatement}</div>
            )}
          </div>

          <div className="col-12">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Bank Details'}
            </button>
            {errors.general && <div className="text-danger text-center mt-2">{errors.general}</div>}
          </div>
        </form>
      ) : (
        <div className="dashboard-card">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">Provider Profile Overview</h5>
            <button className="btn btn-outline-primary btn-sm" onClick={enterEditMode}>
              Edit
            </button>
          </div>

          {/* Profile Header Section */}
          <div className="dashboard-header mb-4">
            <img
              src={`${BASE_URLS.user}/api/get_image/${user.email_id}/profile`}
              alt="Profile"
              className="profile-photo"
            />
            <div className="info">
              <h4>{profile.full_name}</h4>
              <p className="text-muted">{profile.email_id}</p>
              <p className="text-muted">
                <strong>Status:</strong>{' '}
                <span
                  style={{
                    color:
                      profile.status === 'approved'
                        ? 'green'
                        : profile.status === 'pending'
                        ? '#f0ad4e'
                        : 'red',
                    fontWeight: '600',
                  }}
                >
                  {profile.status?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          {/* Full Width Details Grid */}
          <div className="profile-info-grid">
            <div className="profile-field">
              <strong>ID Type</strong>
              <span>{profile.id_type}</span>
            </div>
            <div className="profile-field">
              <strong>ID Number</strong>
              <span>{profile.id_number}</span>
            </div>
            <div className="profile-field">
              <strong>TIN Number</strong>
              <span>{profile.tin_number}</span>
            </div>
            <div className="profile-field">
              <strong>Contact Number</strong>
              <span>{profile.contact_number}</span>
            </div>
            <div className="profile-field">
              <strong>Mailing Address</strong>
              <span>{profile.mailing_address}</span>
            </div>
            <div className="profile-field">
              <strong>Billing Address</strong>
              <span>{profile.billing_address}</span>
            </div>
          </div>

          {/* Services Section */}
          <div className="mt-4">
            <h6 className="fw-bold mb-3">Services Offered</h6>
            <div className="services-list">
              {profile.services?.map((s, i) => (
                <div key={i}>
                  <strong>{s.state}</strong> → {s.service_name} — MYR {s.service_rate}
                </div>
              ))}
            </div>
          </div>

          {/* Certificate */}
          <div className="mt-4">
            <strong>Certificate: </strong>
            {profile.authorized_certificate ? (
              <a
                href={`${BASE_URLS.user}/api/get_image/${user.email}/certificate`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Document
              </a>
            ) : (
              <span className="text-muted">Not Uploaded</span>
            )}
          </div>

          {successMessage && (
            <p className="text-success text-center mt-4">{successMessage}</p>
          )}
        </div>

      )}
    </div>
  );
}

export default ProviderProfile;