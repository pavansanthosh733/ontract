const mobileRegex = /^[0-9]{10}$/;
const addressRegex = /^[A-Za-z0-9\s,./#'’()-]{10,200}$/;
const individualTINRegex = /^IG\d{9,11}$/;
const companyTINRegex = /^[A-Z]\d{10,11}$/;

export function validateProfile({
  formData,
  mailingPostalCode,
  billingPostalCode,
  locationServiceList,
  profileImage,
  profile,
  certificates,
}) {
  if (!formData.company_name?.trim()) {
    alert("Company name is required.");
    return false;
  }

  if (!formData.bumiputera) {
    alert("Please select Bumiputera status.");
    return false;
  }

  if (!formData.brn_number?.trim()) {
    alert("BRN number is required.");
    return false;
  }

  if (!formData.tin_number) {
    alert("TIN number is required.");
    return false;
  } else {
    const formattedTIN = formData.tin_number.trim().toUpperCase();
    const isValidTIN = individualTINRegex.test(formattedTIN) || companyTINRegex.test(formattedTIN);
    if (!isValidTIN) {
      alert("Invalid Malaysia TIN format. Example: IG1150020000 or C1234567890");
      return false;
    }
  }

  if (!mailingPostalCode) {
    alert("Mailing postal code is required.");
    return false;
  }
  if (!/^\d{5}$/.test(mailingPostalCode)) {
    alert("Mailing postal code must be 5 digits.");
    return false;
  }

  if (!billingPostalCode) {
    alert("Billing postal code is required.");
    return false;
  }
  if (!/^\d{5}$/.test(billingPostalCode)) {
    alert("Billing postal code must be 5 digits.");
    return false;
  }

  if (!formData.mailing_address?.trim()) {
    alert("Mailing address is required.");
    return false;
  }
  if (formData.mailing_address.trim().length < 10) {
    alert("Mailing address must be at least 10 characters long.");
    return false;
  }
  if (!addressRegex.test(formData.mailing_address)) {
    alert("Mailing address contains invalid characters.");
    return false;
  }

  if (!formData.billing_address?.trim()) {
    alert("Billing address is required.");
    return false;
  }
  if (formData.billing_address.trim().length < 10) {
    alert("Billing address must be at least 10 characters long.");
    return false;
  }
  if (!addressRegex.test(formData.billing_address)) {
    alert("Billing address contains invalid characters.");
    return false;
  }

  if (!mobileRegex.test(String(formData.contact_number || ""))) {
    alert("Contact number must be exactly 10 digits.");
    return false;
  }

  if (formData.alternate_contact && !mobileRegex.test(String(formData.alternate_contact))) {
    alert("Alternate contact must be exactly 10 digits.");
    return false;
  }

  if (formData.alternate_contact && formData.alternate_contact === formData.contact_number) {
    alert("Alternate contact must be different from main contact.");
    return false;
  }

  if (!formData.contact_person?.trim()) {
    alert("Contact person is required.");
    return false;
  }

  if (locationServiceList.length === 0) {
    alert("At least one service is required.");
    return false;
  }

  for (const item of locationServiceList) {
    if (!item.region_id) { alert("Region is required"); return false; }
    if (!item.state_id) { alert("State is required"); return false; }
    if (!item.city?.trim()) { alert("City is required"); return false; }
    if (!item.category_id) { alert("Category is required"); return false; }
    if (!item.item_id) { alert("Item is required"); return false; }
    if (!item.type_id) { alert("Type is required"); return false; }
    if (!item.description_name?.trim()) { alert("Description is required"); return false; }
    if (!item.price || item.price <= 0) { alert("Price must be greater than 0"); return false; }
  }

  if (!profileImage && !profile?.logo_path) {
    alert("Company logo is required.");
    return false;
  }

  if (certificates.length === 0 && (!profile?.certificate_path || profile.certificate_path.length === 0)) {
    alert("Please upload at least one certificate.");
    return false;
  }

  return true;
}