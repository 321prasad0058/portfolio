import { useId, useRef, useState } from 'react'
import { contactForm, profile } from '../data/profile'
import { track } from '../lib/analytics'

// The contact form. Messages go to Prasad's inbox through Web3Forms (free), so his email address never
// appears on the page. If sending fails, the visitor is pointed to LinkedIn instead.

type Status = 'idle' | 'sending' | 'sent' | 'error'
type Field = 'name' | 'email' | 'message'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX = 2000

function validate(v: Record<Field, string>) {
  const e: Partial<Record<Field, string>> = {}
  if (v.name.trim().length < 2) e.name = 'Tell me your name'
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'I’ll need a valid email to reply'
  if (v.message.trim().length < 10) e.message = 'A few more words, please (10+ characters)'
  return e
}

export function ContactForm() {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Record<Field, string>>({ name: '', email: '', message: '' })
  const [topic, setTopic] = useState(contactForm.topics[0])
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const errors = validate(values)
  const show = (f: Field) => (touched[f] ? errors[f] : undefined)

  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [f]: e.target.value.slice(0, f === 'message' ? MAX : 200) }))


  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setTouched({ name: true, email: true, message: true })
    if (Object.keys(errors).length || status === 'sending') return
    const honeypot = (form.current?.elements.namedItem('botcheck') as HTMLInputElement | null)?.checked
    if (honeypot) return // a bot ticked the hidden box: pretend nothing happened

    setStatus('sending')
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: contactForm.web3formsKey,
          subject: `Portfolio · ${topic} — ${values.name.trim()}`,
          from_name: 'prasad-alai.web.app',
          name: values.name.trim(),
          email: values.email.trim(),
          topic,
          message: values.message.trim(),
        }),
      })
      const d = (await r.json().catch(() => ({}))) as { success?: boolean }
      if (!r.ok || !d.success) throw new Error('send failed')
      track('contact_submit', { topic, via: 'form' })
      setStatus('sent')
    } catch {
      track('contact_error', { topic })
      setStatus('error')
    }
  }

  const reset = () => {
    setValues({ name: '', email: '', message: '' })
    setTouched({})
    setStatus('idle')
  }

  return (
    <div className="cform" data-reveal data-ui>
      <div className="cform-bar mono" aria-hidden>
        <i />
        <i />
        <i />
        <span>~/prasad $ compose --to prasad</span>
      </div>

      {status === 'sent' ? (
        <div className="cform-done" role="status">
          <span className="cform-check" aria-hidden>
            <svg viewBox="0 0 24 24" width="30" height="30">
              <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <>
              <h3>Message sent.</h3>
              <p>
                Thanks, {values.name.trim().split(' ')[0]}. I’ll reply to <b>{values.email.trim()}</b> soon, usually within a day.
              </p>
            </>
          <button type="button" className="btn" onClick={reset} data-magnetic>
            Write another
          </button>
        </div>
      ) : (
        <form
          ref={form}
          className="cform-body"
          noValidate
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
          }}
        >
          <fieldset className="cform-topics">
            <legend className="mono">what’s it about</legend>
            {contactForm.topics.map((t) => (
              <label key={t} className={`cform-topic ${topic === t ? 'on' : ''}`}>
                <input type="radio" name="topic" value={t} checked={topic === t} onChange={() => setTopic(t)} />
                {t}
              </label>
            ))}
          </fieldset>

          <div className="cform-row">
            <div className={`cform-field ${show('name') ? 'bad' : ''}`}>
              <label className="mono" htmlFor={`${id}-name`}>
                name
              </label>
              <input
                id={`${id}-name`}
                name="name"
                autoComplete="name"
                placeholder="Your name"
                value={values.name}
                onChange={set('name')}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                aria-invalid={!!show('name')}
                aria-describedby={`${id}-name-err`}
              />
              <span className="cform-err" id={`${id}-name-err`}>
                {show('name')}
              </span>
            </div>
            <div className={`cform-field ${show('email') ? 'bad' : ''}`}>
              <label className="mono" htmlFor={`${id}-email`}>
                email
              </label>
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={values.email}
                onChange={set('email')}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                aria-invalid={!!show('email')}
                aria-describedby={`${id}-email-err`}
              />
              <span className="cform-err" id={`${id}-email-err`}>
                {show('email')}
              </span>
            </div>
          </div>

          <div className={`cform-field ${show('message') ? 'bad' : ''}`}>
            <label className="mono" htmlFor={`${id}-message`}>
              message
            </label>
            <textarea
              id={`${id}-message`}
              name="message"
              rows={5}
              placeholder="What are you building, and how can I help?"
              value={values.message}
              onChange={set('message')}
              onBlur={() => setTouched((t) => ({ ...t, message: true }))}
              aria-invalid={!!show('message')}
              aria-describedby={`${id}-message-err`}
              data-lenis-prevent
            />
            <span className="cform-err" id={`${id}-message-err`}>
              {show('message')}
              <em className="mono">
                {values.message.length}/{MAX}
              </em>
            </span>
          </div>

          {/* spam trap: invisible to people, tempting to bots */}
          <input type="checkbox" name="botcheck" className="cform-trap" tabIndex={-1} autoComplete="off" aria-hidden />

          <div className="cform-foot">
            <span className="mono cform-hint">
              <kbd>⌘</kbd> <kbd>↵</kbd> to send
            </span>
            {status === 'error' && (
              <span className="cform-fail" role="alert">
                Couldn’t send just now. Try again, or{' '}
                <a className="link" href={profile.links.linkedin} target="_blank" rel="noreferrer">
                  message me on LinkedIn
                </a>
              </span>
            )}
            <button type="submit" className="btn btn-solid cform-send" disabled={status === 'sending'} data-magnetic>
              {status === 'sending' ? (
                <>
                  <span className="cform-spin" aria-hidden /> Sending…
                </>
              ) : (
                <>
                  Send message
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                    <path d="M4 12 20 4l-4 16-4-6-8-2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
