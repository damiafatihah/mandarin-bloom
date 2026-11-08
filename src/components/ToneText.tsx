import { Fragment } from 'react';
import { toneOfSyllable } from '../lib/pinyin';

type Props = { pinyin: string; colored?: boolean; className?: string };

export function ToneText({ pinyin, colored = true, className }: Props) {
  return (
    <span className={className}>
      {pinyin.split(' ').map((syl, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span data-tone={toneOfSyllable(syl)} className={colored ? 'tone' : undefined}>{syl}</span>
        </Fragment>
      ))}
    </span>
  );
}
