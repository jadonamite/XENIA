'use client';

import { useState } from 'react';

export interface AccordionItem {
  title: string;
  body: string;
}

/**
 * Two looks, one behaviour. `hairline` is the feature list in the delegation section; `filled` is
 * the FAQ. Rows animate their own height via a 0fr→1fr grid, so the content stays in the document
 * and stays findable by in-page search.
 */
export function Accordion({
  items,
  look = 'hairline',
  initial = 0,
}: {
  items: AccordionItem[];
  look?: 'hairline' | 'filled';
  initial?: number;
}) {
  const [open, setOpen] = useState<number | null>(initial);

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.title}
            className={[
              'acc-row',
              look === 'filled' && 'faq-row',
              isOpen && 'acc-open',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <button
              className="acc-head"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>
                {look === 'hairline' && isOpen && (
                  <span className="acc-mark" aria-hidden style={{ marginRight: 10 }}>
                    »
                  </span>
                )}
                {item.title}
              </span>
              {look === 'filled' && (
                <span className="acc-mark" aria-hidden>
                  {isOpen ? '−' : '+'}
                </span>
              )}
            </button>
            <div className="acc-body">
              <div>
                <p>{item.body}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
