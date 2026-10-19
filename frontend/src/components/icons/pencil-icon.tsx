import { Icon, type IconProps } from '@/components/icons/icon';

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </Icon>
  );
}
