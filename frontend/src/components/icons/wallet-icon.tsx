import { Icon, type IconProps } from '@/components/icons/icon';

export function WalletIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 9h15" />
      <path d="M21 12h-4a2 2 0 0 0 0 4h4" />
    </Icon>
  );
}
