import React from 'react';

interface AuthIllustrationProps {
  side: 'left' | 'right';
}

export const AuthIllustration: React.FC<AuthIllustrationProps> = ({ side }) => {
  if (side === 'left') {
    return (
      <div className="w-[260px] h-[280px] pointer-events-none select-none shrink-0">
        <svg viewBox="0 0 280 300" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="12" y1="274" x2="268" y2="274" stroke="#18181B" strokeWidth="1.5" />
          <rect x="64" y="206" width="60" height="68" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
          <path d="M84 260 C96 248, 102 234, 104 218" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M98 224 L104 217 L109 225" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="124" y="186" width="54" height="88" fill="#EF4444" stroke="#18181B" strokeWidth="1.5" />
          <rect x="124" y="186" width="54" height="12" fill="#D4191F" opacity="0.28" />
          <line x1="100" y1="78" x2="94" y2="66" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="115" y1="73" x2="117" y2="59" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="87" y1="90" x2="77" y2="85" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M126 102 C121 98, 110 100, 108 110 C106 116, 100 121, 95 123 C99 129, 111 131, 119 124 L126 117 Z" fill="#18181B" />
          <circle cx="129" cy="109" r="9.5" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
          <path d="M122 104 C126 97, 137 99, 138 107 C132 106, 127 104, 122 104 Z" fill="#18181B" />
          <circle cx="133.5" cy="109" r="1.2" fill="#18181B" />
          <path d="M115 126 L139 122 L146 156 L111 160 Z" fill="#18181B" stroke="#18181B" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="121" y1="133" x2="127" y2="132" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="131" y1="139" x2="137" y2="138" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="118" y1="147" x2="125" y2="146" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="133" y1="150" x2="140" y2="149" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M111 160 L146 156 L195 186 L186 226 L168 223 L175 194 L154 190 L165 234 L147 238 L131 187 L107 177 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M169 223 L187 226 L185 239 L167 232 Z" fill="#18181B" />
          <path d="M148 237 L166 234 L173 245 L150 245 Z" fill="#18181B" />
          <path d="M135 129 L154 146 L176 149 L174 156 L149 154 L129 138 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M159 154 L196 154 L208 117 L200 116 L189 148 L159 148 Z" fill="#D4191F" stroke="#18181B" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-[240px] h-[230px] pointer-events-none select-none shrink-0">
      <svg viewBox="0 0 260 250" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M156 108 C166 86, 198 84, 210 102 C228 100, 238 122, 224 134 C236 146, 224 166, 204 162" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" fill="#FEE2E2" fillOpacity="0.45" />
        <line x1="12" y1="224" x2="246" y2="224" stroke="#18181B" strokeWidth="1.5" />
        <rect x="44" y="138" width="66" height="86" fill="#FFFFFF" stroke="#18181B" strokeWidth="1.5" />
        <rect x="110" y="106" width="68" height="118" fill="#EF4444" stroke="#18181B" strokeWidth="1.5" />
        <rect x="110" y="106" width="68" height="14" fill="#D4191F" opacity="0.28" />
      </svg>
    </div>
  );
};
