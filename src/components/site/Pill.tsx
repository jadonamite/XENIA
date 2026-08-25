import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Kinetic pill button inspired by the high-end glider animation in lading.
 * On hover, the chip smoothly slides from right to left across the button,
 * rotating 45°, while padding inverts and the background transitions.
 */
type Variant = 'solid' | 'ghost' | 'plain';

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function Chip({ mark }: { mark?: ReactNode }) {
  return (
    <span className="pill-chip" aria-hidden>
      {mark ?? <ArrowIcon />}
    </span>
  );
}

export function PillLink({
  href,
  children,
  variant = 'solid',
  mark,
  className: extra,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  mark?: ReactNode;
  className?: string;
}) {
  const external = href.startsWith('http');
  const cls = [
    'pill',
    variant === 'ghost' && 'pill-ghost',
    variant === 'plain' && 'pill-plain',
    extra,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className="pill-text">{children}</span>
      {variant !== 'plain' && <Chip mark={mark} />}
    </>
  );

  return external ? (
    <a className={cls} href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link className={cls} href={href}>
      {content}
    </Link>
  );
}

export function PillButton({
  children,
  variant = 'solid',
  mark,
  className: extra,
  ...rest
}: ComponentProps<'button'> & { variant?: Variant; mark?: ReactNode }) {
  const cls = [
    'pill',
    variant === 'ghost' && 'pill-ghost',
    variant === 'plain' && 'pill-plain',
    extra,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={cls} {...rest}>
      <span className="pill-text">{children}</span>
      {variant !== 'plain' && <Chip mark={mark} />}
    </button>
  );
}

