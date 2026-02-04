'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface CompanyLogoProps {
  variant?: 'original' | 'transparent' | 'monochrome';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: { width: 480, height: 120 },
  md: { width: 800, height: 200 },
  lg: { width: 1120, height: 280 },
  xl: { width: 1440, height: 360 }
};

export default function CompanyLogo({ 
  variant = 'transparent', 
  size = 'md',
  className = ''
}: CompanyLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Holland Systems');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch('/api/employer/branding', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          console.log('CompanyLogo: Full API response:', data);
          
          if (data.branding?.has_logo && data.branding?.logo_url) {
            console.log('CompanyLogo: Setting logo URL:', data.branding.logo_url);
            setLogoUrl(data.branding.logo_url);
            // Only use company_name if it's not an email
            const companyName = data.branding.company_name;
            if (companyName && !companyName.includes('@')) {
              setCompanyName(companyName);
            }
          } else {
            console.log('CompanyLogo: No logo found - has_logo:', data.branding?.has_logo, 'logo_url:', data.branding?.logo_url);
          }
        }
      } catch (err) {
        console.error('CompanyLogo: Failed to load branding:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, []);

  if (loading) {
    return <div className={className} style={{ height: SIZES[size].height }} />;
  }

  if (!logoUrl) {
    // Fallback to company name text
    console.log('CompanyLogo: Rendering fallback text, logoUrl is:', logoUrl, 'companyName:', companyName);
    return (
      <div className={className} style={{ fontWeight: 700, fontSize: size === 'sm' ? 14 : size === 'lg' ? 20 : 16 }}>
        {companyName}
      </div>
    );
  }

  const dimensions = SIZES[size];
  console.log('CompanyLogo: Rendering image with logoUrl:', logoUrl);

  return (
    <Image
      src={logoUrl}
      alt={companyName}
      width={dimensions.width}
      height={dimensions.height}
      className={className}
      style={{ width: 'auto', height: dimensions.height }}
      priority
      onError={(e) => {
        console.error('CompanyLogo: Image load error:', logoUrl, e);
      }}
      onLoad={() => {
        console.log('CompanyLogo: Image loaded successfully:', logoUrl);
      }}
    />
  );
}
