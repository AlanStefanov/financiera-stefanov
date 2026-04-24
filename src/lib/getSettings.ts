export function getCompanySettings() {
  const stored = localStorage.getItem('companySettings');
  if (stored) {
    return JSON.parse(stored);
  }
  
  return {
    company_name: 'Microcréditos Stefanov',
    company_phone: '+54 9 1127395566',
    company_address: 'Gonnet / La Plata, Buenos Aires',
    company_website: 'https://financiera-stefanov.vercel.app',
    credit_limit_default: '500000',
    company_logo: ''
  };
}