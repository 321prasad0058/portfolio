import { FL_MARK, FL_WORD } from '../data/flLogo'

/** The FlexiLoans logo: the FL mark in its ring and the FLEXI LOANS wordmark, without the tagline. */
export function FlLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 132 36.5" role="img" aria-label="FlexiLoans">
      {[...FL_MARK, ...FL_WORD].map((d, i) => (
        <path key={i} d={d} fillRule="evenodd" />
      ))}
    </svg>
  )
}
