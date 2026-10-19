import { Icon, type IconProps } from '@/components/icons/icon';

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}
