export interface Country {
  code: string;
  name: string;
  region: string;
  flag: string;
}

export const countries: Country[] = [
  // Philippines (default) - at the top
  { code: 'PH', name: 'Philippines', region: 'Asia', flag: '🇵🇭' },
  
  // Europe (highlighted region)
  { code: 'GB', name: 'United Kingdom', region: 'Europe', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', region: 'Europe', flag: '🇩🇪' },
  { code: 'FR', name: 'France', region: 'Europe', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', region: 'Europe', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', region: 'Europe', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', region: 'Europe', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', region: 'Europe', flag: '🇧🇪' },
  { code: 'SE', name: 'Sweden', region: 'Europe', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', region: 'Europe', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', region: 'Europe', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', region: 'Europe', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', region: 'Europe', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', region: 'Europe', flag: '🇦🇹' },
  { code: 'PL', name: 'Poland', region: 'Europe', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', region: 'Europe', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', region: 'Europe', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', region: 'Europe', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria', region: 'Europe', flag: '🇧🇬' },
  { code: 'HR', name: 'Croatia', region: 'Europe', flag: '🇭🇷' },
  { code: 'SI', name: 'Slovenia', region: 'Europe', flag: '🇸🇮' },
  { code: 'SK', name: 'Slovakia', region: 'Europe', flag: '🇸🇰' },
  { code: 'LT', name: 'Lithuania', region: 'Europe', flag: '🇱🇹' },
  { code: 'LV', name: 'Latvia', region: 'Europe', flag: '🇱🇻' },
  { code: 'EE', name: 'Estonia', region: 'Europe', flag: '🇪🇪' },
  { code: 'IE', name: 'Ireland', region: 'Europe', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal', region: 'Europe', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', region: 'Europe', flag: '🇬🇷' },
  { code: 'CY', name: 'Cyprus', region: 'Europe', flag: '🇨🇾' },
  { code: 'MT', name: 'Malta', region: 'Europe', flag: '🇲🇹' },
  { code: 'LU', name: 'Luxembourg', region: 'Europe', flag: '🇱🇺' },
  { code: 'IS', name: 'Iceland', region: 'Europe', flag: '🇮🇸' },
  { code: 'RU', name: 'Russia', region: 'Europe', flag: '🇷🇺' },
  { code: 'UA', name: 'Ukraine', region: 'Europe', flag: '🇺🇦' },
  { code: 'BY', name: 'Belarus', region: 'Europe', flag: '🇧🇾' },
  { code: 'MD', name: 'Moldova', region: 'Europe', flag: '🇲🇩' },
  { code: 'GE', name: 'Georgia', region: 'Europe', flag: '🇬🇪' },
  { code: 'AM', name: 'Armenia', region: 'Europe', flag: '🇦🇲' },
  { code: 'AZ', name: 'Azerbaijan', region: 'Europe', flag: '🇦🇿' },
  { code: 'TR', name: 'Turkey', region: 'Europe', flag: '🇹🇷' },
  { code: 'AL', name: 'Albania', region: 'Europe', flag: '🇦🇱' },
  { code: 'MK', name: 'North Macedonia', region: 'Europe', flag: '🇲🇰' },
  { code: 'ME', name: 'Montenegro', region: 'Europe', flag: '🇲🇪' },
  { code: 'RS', name: 'Serbia', region: 'Europe', flag: '🇷🇸' },
  { code: 'BA', name: 'Bosnia and Herzegovina', region: 'Europe', flag: '🇧🇦' },
  { code: 'XK', name: 'Kosovo', region: 'Europe', flag: '🇽🇰' },
  
  // North America
  { code: 'US', name: 'United States', region: 'North America', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', region: 'North America', flag: '🇨🇦' },
  { code: 'MX', name: 'Mexico', region: 'North America', flag: '🇲🇽' },
  { code: 'CR', name: 'Costa Rica', region: 'North America', flag: '🇨🇷' },
  { code: 'PA', name: 'Panama', region: 'North America', flag: '🇵🇦' },
  { code: 'GT', name: 'Guatemala', region: 'North America', flag: '🇬🇹' },
  { code: 'BZ', name: 'Belize', region: 'North America', flag: '🇧🇿' },
  { code: 'SV', name: 'El Salvador', region: 'North America', flag: '🇸🇻' },
  { code: 'HN', name: 'Honduras', region: 'North America', flag: '🇭🇳' },
  { code: 'NI', name: 'Nicaragua', region: 'North America', flag: '🇳🇮' },
  
  // Asia
  { code: 'JP', name: 'Japan', region: 'Asia', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', region: 'Asia', flag: '🇰🇷' },
  { code: 'CN', name: 'China', region: 'Asia', flag: '🇨🇳' },
  { code: 'IN', name: 'India', region: 'Asia', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', region: 'Asia', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', region: 'Asia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', region: 'Asia', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', region: 'Asia', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', region: 'Asia', flag: '🇮🇩' },
  { code: 'TW', name: 'Taiwan', region: 'Asia', flag: '🇹🇼' },
  { code: 'HK', name: 'Hong Kong', region: 'Asia', flag: '🇭🇰' },
  { code: 'MO', name: 'Macau', region: 'Asia', flag: '🇲🇴' },
  { code: 'BN', name: 'Brunei', region: 'Asia', flag: '🇧🇳' },
  { code: 'KH', name: 'Cambodia', region: 'Asia', flag: '🇰🇭' },
  { code: 'LA', name: 'Laos', region: 'Asia', flag: '🇱🇦' },
  { code: 'MM', name: 'Myanmar', region: 'Asia', flag: '🇲🇲' },
  { code: 'BD', name: 'Bangladesh', region: 'Asia', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', region: 'Asia', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', region: 'Asia', flag: '🇳🇵' },
  { code: 'BT', name: 'Bhutan', region: 'Asia', flag: '🇧🇹' },
  { code: 'MV', name: 'Maldives', region: 'Asia', flag: '🇲🇻' },
  { code: 'PK', name: 'Pakistan', region: 'Asia', flag: '🇵🇰' },
  { code: 'AF', name: 'Afghanistan', region: 'Asia', flag: '🇦🇫' },
  { code: 'IR', name: 'Iran', region: 'Asia', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', region: 'Asia', flag: '🇮🇶' },
  { code: 'SA', name: 'Saudi Arabia', region: 'Asia', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', region: 'Asia', flag: '🇦🇪' },
  { code: 'QA', name: 'Qatar', region: 'Asia', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', region: 'Asia', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', region: 'Asia', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', region: 'Asia', flag: '🇴🇲' },
  { code: 'YE', name: 'Yemen', region: 'Asia', flag: '🇾🇪' },
  { code: 'JO', name: 'Jordan', region: 'Asia', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', region: 'Asia', flag: '🇱🇧' },
  { code: 'SY', name: 'Syria', region: 'Asia', flag: '🇸🇾' },
  { code: 'IL', name: 'Israel', region: 'Asia', flag: '🇮🇱' },
  { code: 'PS', name: 'Palestine', region: 'Asia', flag: '🇵🇸' },
  { code: 'KZ', name: 'Kazakhstan', region: 'Asia', flag: '🇰🇿' },
  { code: 'UZ', name: 'Uzbekistan', region: 'Asia', flag: '🇺🇿' },
  { code: 'KG', name: 'Kyrgyzstan', region: 'Asia', flag: '🇰🇬' },
  { code: 'TJ', name: 'Tajikistan', region: 'Asia', flag: '🇹🇯' },
  { code: 'TM', name: 'Turkmenistan', region: 'Asia', flag: '🇹🇲' },
  { code: 'MN', name: 'Mongolia', region: 'Asia', flag: '🇲🇳' },
  
  // South America
  { code: 'BR', name: 'Brazil', region: 'South America', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', region: 'South America', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', region: 'South America', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', region: 'South America', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', region: 'South America', flag: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', region: 'South America', flag: '🇻🇪' },
  { code: 'EC', name: 'Ecuador', region: 'South America', flag: '🇪🇨' },
  { code: 'BO', name: 'Bolivia', region: 'South America', flag: '🇧🇴' },
  { code: 'PY', name: 'Paraguay', region: 'South America', flag: '🇵🇾' },
  { code: 'UY', name: 'Uruguay', region: 'South America', flag: '🇺🇾' },
  { code: 'GY', name: 'Guyana', region: 'South America', flag: '🇬🇾' },
  { code: 'SR', name: 'Suriname', region: 'South America', flag: '🇸🇷' },
  { code: 'FK', name: 'Falkland Islands', region: 'South America', flag: '🇫🇰' },
  
  // Africa
  { code: 'ZA', name: 'South Africa', region: 'Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', region: 'Africa', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', region: 'Africa', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', region: 'Africa', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', region: 'Africa', flag: '🇬🇭' },
  { code: 'ET', name: 'Ethiopia', region: 'Africa', flag: '🇪🇹' },
  { code: 'TZ', name: 'Tanzania', region: 'Africa', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', region: 'Africa', flag: '🇺🇬' },
  { code: 'DZ', name: 'Algeria', region: 'Africa', flag: '🇩🇿' },
  { code: 'MA', name: 'Morocco', region: 'Africa', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisia', region: 'Africa', flag: '🇹🇳' },
  { code: 'LY', name: 'Libya', region: 'Africa', flag: '🇱🇾' },
  { code: 'SD', name: 'Sudan', region: 'Africa', flag: '🇸🇩' },
  { code: 'SS', name: 'South Sudan', region: 'Africa', flag: '🇸🇸' },
  { code: 'CM', name: 'Cameroon', region: 'Africa', flag: '🇨🇲' },
  { code: 'CI', name: 'Ivory Coast', region: 'Africa', flag: '🇨🇮' },
  { code: 'SN', name: 'Senegal', region: 'Africa', flag: '🇸🇳' },
  { code: 'ML', name: 'Mali', region: 'Africa', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', region: 'Africa', flag: '🇧🇫' },
  { code: 'NE', name: 'Niger', region: 'Africa', flag: '🇳🇪' },
  { code: 'TD', name: 'Chad', region: 'Africa', flag: '🇹🇩' },
  { code: 'CF', name: 'Central African Republic', region: 'Africa', flag: '🇨🇫' },
  { code: 'CG', name: 'Republic of the Congo', region: 'Africa', flag: '🇨🇬' },
  { code: 'CD', name: 'Democratic Republic of the Congo', region: 'Africa', flag: '🇨🇩' },
  { code: 'AO', name: 'Angola', region: 'Africa', flag: '🇦🇴' },
  { code: 'ZM', name: 'Zambia', region: 'Africa', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', region: 'Africa', flag: '🇿🇼' },
  { code: 'BW', name: 'Botswana', region: 'Africa', flag: '🇧🇼' },
  { code: 'NA', name: 'Namibia', region: 'Africa', flag: '🇳🇦' },
  { code: 'MG', name: 'Madagascar', region: 'Africa', flag: '🇲🇬' },
  { code: 'MU', name: 'Mauritius', region: 'Africa', flag: '🇲🇺' },
  { code: 'SC', name: 'Seychelles', region: 'Africa', flag: '🇸🇨' },
  { code: 'KM', name: 'Comoros', region: 'Africa', flag: '🇰🇲' },
  { code: 'DJ', name: 'Djibouti', region: 'Africa', flag: '🇩🇯' },
  { code: 'SO', name: 'Somalia', region: 'Africa', flag: '🇸🇴' },
  { code: 'ER', name: 'Eritrea', region: 'Africa', flag: '🇪🇷' },
  { code: 'RW', name: 'Rwanda', region: 'Africa', flag: '🇷🇼' },
  { code: 'BI', name: 'Burundi', region: 'Africa', flag: '🇧🇮' },
  { code: 'SL', name: 'Sierra Leone', region: 'Africa', flag: '🇸🇱' },
  { code: 'LR', name: 'Liberia', region: 'Africa', flag: '🇱🇷' },
  { code: 'GW', name: 'Guinea-Bissau', region: 'Africa', flag: '🇬🇼' },
  { code: 'GN', name: 'Guinea', region: 'Africa', flag: '🇬🇳' },
  { code: 'TG', name: 'Togo', region: 'Africa', flag: '🇹🇬' },
  { code: 'BJ', name: 'Benin', region: 'Africa', flag: '🇧🇯' },
  { code: 'CV', name: 'Cape Verde', region: 'Africa', flag: '🇨🇻' },
  { code: 'GM', name: 'Gambia', region: 'Africa', flag: '🇬🇲' },
  { code: 'MR', name: 'Mauritania', region: 'Africa', flag: '🇲🇷' },
  { code: 'MZ', name: 'Mozambique', region: 'Africa', flag: '🇲🇿' },
  { code: 'MW', name: 'Malawi', region: 'Africa', flag: '🇲🇼' },
  { code: 'SZ', name: 'Eswatini', region: 'Africa', flag: '🇸🇿' },
  { code: 'LS', name: 'Lesotho', region: 'Africa', flag: '🇱🇸' },
  
  // Oceania
  { code: 'AU', name: 'Australia', region: 'Oceania', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', region: 'Oceania', flag: '🇳🇿' },
  { code: 'FJ', name: 'Fiji', region: 'Oceania', flag: '🇫🇯' },
  { code: 'PG', name: 'Papua New Guinea', region: 'Oceania', flag: '🇵🇬' },
  { code: 'SB', name: 'Solomon Islands', region: 'Oceania', flag: '🇸🇧' },
  { code: 'VU', name: 'Vanuatu', region: 'Oceania', flag: '🇻🇺' },
  { code: 'NC', name: 'New Caledonia', region: 'Oceania', flag: '🇳🇨' },
  { code: 'PF', name: 'French Polynesia', region: 'Oceania', flag: '🇵🇫' },
  { code: 'WS', name: 'Samoa', region: 'Oceania', flag: '🇼🇸' },
  { code: 'TO', name: 'Tonga', region: 'Oceania', flag: '🇹🇴' },
  { code: 'KI', name: 'Kiribati', region: 'Oceania', flag: '🇰🇮' },
  { code: 'TV', name: 'Tuvalu', region: 'Oceania', flag: '🇹🇻' },
  { code: 'NR', name: 'Nauru', region: 'Oceania', flag: '🇳🇷' },
  { code: 'PW', name: 'Palau', region: 'Oceania', flag: '🇵🇼' },
  { code: 'MH', name: 'Marshall Islands', region: 'Oceania', flag: '🇲🇭' },
  { code: 'FM', name: 'Micronesia', region: 'Oceania', flag: '🇫🇲' },
  { code: 'CK', name: 'Cook Islands', region: 'Oceania', flag: '🇨🇰' },
  { code: 'NU', name: 'Niue', region: 'Oceania', flag: '🇳🇺' },
  { code: 'TK', name: 'Tokelau', region: 'Oceania', flag: '🇹🇰' },
  { code: 'AS', name: 'American Samoa', region: 'Oceania', flag: '🇦🇸' },
  { code: 'GU', name: 'Guam', region: 'Oceania', flag: '🇬🇺' },
  { code: 'MP', name: 'Northern Mariana Islands', region: 'Oceania', flag: '🇲🇵' },
];

// Helper function to get countries by region
export const getCountriesByRegion = () => {
  const grouped = countries.reduce((acc, country) => {
    if (!acc[country.region]) {
      acc[country.region] = [];
    }
    acc[country.region].push(country);
    return acc;
  }, {} as Record<string, Country[]>);
  
  return grouped;
};

// Helper function to find country by code
export const findCountryByCode = (code: string): Country | undefined => {
  return countries.find(country => country.code === code);
};

// Helper function to find country by name
export const findCountryByName = (name: string): Country | undefined => {
  return countries.find(country => 
    country.name.toLowerCase().includes(name.toLowerCase())
  );
};

// Get default country (Philippines)
export const getDefaultCountry = (): Country => {
  return countries[0]; // Philippines is first in the list
}; 