'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings';

export function useCompanySettings() {
  const settings = useSettings();
  
  return {
    companyName: settings.company_name || 'Microcréditos Stefanov',
    companyPhone: settings.company_phone || '+54 9 1127395566',
    companyAddress: settings.company_address || 'Gonnet / La Plata, Buenos Aires',
    companyWebsite: settings.company_website || 'https://financiera-stefanov.vercel.app',
    creditLimit: parseInt(settings.credit_limit_default || '500000'),
  };
}