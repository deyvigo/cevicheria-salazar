import { Icon, type IconProps } from '@/components/icons/icon';

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M12 5v14" />
    </Icon>
  );
}
