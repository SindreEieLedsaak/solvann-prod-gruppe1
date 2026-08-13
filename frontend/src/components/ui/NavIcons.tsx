interface IconProps {
  readonly active?: boolean;
}

const FILL_ACTIVE = '#4C6B8A';
const FILL_INACTIVE = '#454E5C';

function fillFor(active?: boolean) {
  return active ? FILL_ACTIVE : FILL_INACTIVE;
}

export function DeviceIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="3" y="1.5" width="12" height="15" rx="3" fill={fillFor(active)} />
      <rect x="5.5" y="4" width="7" height="6" rx="1" fill="currentColor" />
      <rect x="6" y="12" width="6" height="1.6" rx="0.8" fill="currentColor" />
    </svg>
  );
}

export function TurbineIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill={fillFor(active)} />
      <circle cx="9" cy="9" r="2.4" fill="currentColor" />
      <rect x="8.2" y="0.8" width="1.6" height="4" fill="currentColor" />
    </svg>
  );
}

export function FormIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2.5" y="1.5" width="13" height="15" rx="2" fill={fillFor(active)} />
      <rect x="5" y="5" width="8" height="1.6" fill="currentColor" />
      <rect x="5" y="8.2" width="8" height="1.6" fill="currentColor" />
      <rect x="5" y="11.4" width="5" height="1.6" fill="currentColor" />
    </svg>
  );
}

export function BarsIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="1.5" y="2" width="15" height="14" rx="2" fill={fillFor(active)} />
      <rect x="4" y="9" width="2.4" height="4.5" fill="currentColor" />
      <rect x="7.8" y="6" width="2.4" height="7.5" fill="currentColor" />
      <rect x="11.6" y="4" width="2.4" height="9.5" fill="currentColor" />
    </svg>
  );
}

export function PriceIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <polygon points="9,1 17,9 9,17 1,9" fill={fillFor(active)} />
      <rect x="7.9" y="4.5" width="2.2" height="9" fill="currentColor" />
    </svg>
  );
}

export function ReportIcon({ active }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2.5" y="1.5" width="13" height="15" rx="2" fill={fillFor(active)} />
      <rect x="5" y="5" width="8" height="1.6" fill="currentColor" />
      <path
        d="M9 8v5m0 0l-2-2m2 2l2-2"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
