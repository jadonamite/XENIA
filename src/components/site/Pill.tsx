import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * The one button shape on the site: a dark body with an accent square holding a chevron.
 *
 * `plain` drops the chip for places where a second chip in the same row would be noise.
 */
type Variant = 'solid' | 'ghost' | 'plain';

const className = (variant: Variant, extra?: string) =>
  ['pill', variant === 'ghost' && 'pill-ghost', variant === 'plain' && 'pill-plain', extra]
    .filter(Boolean)
    .join(' ');

function Chip({ mark = '›' }: { mark?: string }) {
  return (
    <span className="pill-chip" aria-hidden>
      {mark}
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
  mark?: string;
  className?: string;
}) {
  const external = href.startsWith('http');
  const content = (
    <>
      {variant !== 'plain' && <Chip mark={mark} />}
      {children}
    </>
  );
  return external ? (
    <a className={className(variant, extra)} href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link className={className(variant, extra)} href={href}>
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
}: ComponentProps<'button'> & { variant?: Variant; mark?: string }) {
  return (
    <button className={className(variant, extra)} {...rest}>
      {variant !== 'plain' && <Chip mark={mark} />}
      {children}
    </button>
  );
}
