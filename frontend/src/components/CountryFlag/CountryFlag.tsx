import React from 'react';
import ReactCountryFlag from 'react-country-flag';

interface CountryFlagProps {
  countryCode: string;
  size?: number;
  className?: string;
}

// Map common 3-letter codes to 2-letter ISO codes
const codeMapping: { [key: string]: string } = {
  'USA': 'US',
  'CHN': 'CN', 
  'HKG': 'HK',
  'TWN': 'TW',
  'JPN': 'JP',
  'KOR': 'KR',
  'SGP': 'SG',
  'THA': 'TH',
  'MYS': 'MY',
  'IDN': 'ID',
  'PHL': 'PH',
  'VNM': 'VN',
  'GBR': 'GB',
  'DEU': 'DE',
  'FRA': 'FR',
  'AUS': 'AU',
  'CAN': 'CA',
  'IND': 'IN',
  'BRA': 'BR',
  'ARG': 'AR',
  'MEX': 'MX',
  'ITA': 'IT',
  'ESP': 'ES',
  'NLD': 'NL',
  'BEL': 'BE',
  'CHE': 'CH',
  'AUT': 'AT',
  'SWE': 'SE',
  'NOR': 'NO',
  'DNK': 'DK',
  'FIN': 'FI',
  'POL': 'PL',
  'RUS': 'RU',
  'TUR': 'TR',
  'SAU': 'SA',
  'ARE': 'AE',
  'EGY': 'EG',
  'ZAF': 'ZA',
  'NGA': 'NG',
  'KEN': 'KE',
  'PER': 'PE',
  'COL': 'CO',
  'CHL': 'CL',
  'URY': 'UY',
  'VEN': 'VE',
  'ECU': 'EC',
  'BOL': 'BO',
  'PRY': 'PY',
  'GUY': 'GY',
  'SUR': 'SR',
  'GUF': 'GF',
};

const CountryFlag: React.FC<CountryFlagProps> = ({ countryCode, size = 24, className = '' }) => {
  // Convert 3-letter code to 2-letter ISO code if needed
  const isoCode = codeMapping[countryCode] || (countryCode.length === 2 ? countryCode : 'UN');

  return (
    <ReactCountryFlag
      countryCode={isoCode}
      svg
      style={{
        width: `${size}px`,
        height: `${size * 0.75}px`, // Maintain flag aspect ratio
        borderRadius: '2px',
      }}
      className={className}
      title={`Flag of ${countryCode}`}
    />
  );
};

export default CountryFlag;
