import { Icon, type IconProps } from '@/components/icons/icon';

export function CartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
    </Icon>
  );
}
