import { Link, createFileRoute } from '@tanstack/react-router';
import { useState, type ChangeEvent, type FormEvent } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { AUTH_CHANGE_EVENT } from '@/lib/authStore';
import { isValidEmail } from '@/services/auth';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60';

const labelClass = 'mb-1 block text-sm font-medium text-foreground';

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  form?: string;
};

export const Route = createFileRoute('/signup')({
  head: () => ({
    meta: [
      { title: 'Sign up — Create your account — Odogwu' },
      {
        name: 'description',
        content:
          'Create an Odogwu account to pledge towards verified bills or to submit a bill for verification.',
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  // True when the backend returned a session (email confirmation not required).
  const [signedInNow, setSignedInNow] = useState(false);

  const handleAgreementChange = (event: ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setAgreed(checked);

    // Ticking the box resolves the legal-agreement error immediately, so the
    // keyboard and pointer flows both see the message disappear on consent.
    if (checked) {
      setErrors((prev) => {
        if (!prev.terms && !prev.form) return prev;
        const next = { ...prev };
        delete next.terms;
        delete next.form;
        return next;
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const next: FieldErrors = {};
    const emailValue = email.trim();
    const nameValue = fullName.trim();

    if (!emailValue) next.email = 'Please enter your email address';
    else if (!isValidEmail(emailValue)) next.email = 'Enter a valid email address';

    if (!password) next.password = 'Please choose a password';
    else if (password.length < 6) next.password = 'Use at least 6 characters';

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match';

    // The legal agreement is compulsory: no account is created until this box
    // is ticked, and the exact reason is shown next to the control.
    if (!agreed) {
      next.terms = 'Please agree to the Terms of Service and Privacy Policy to continue';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password,
        options: {
          data: {
            full_name: nameValue || null,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: '2026-11-12',
          },
        },
      });

      if (error) throw error;

      setSubmittedEmail(emailValue);

      // The account has been created. When the backend returned a session the
      // person is already signed in; otherwise email confirmation is required.
      // Either way the form closes and the completion panel below replaces it,
      // so the finished state always offers a "Sign in" doorway instead of
      // navigating away to a page without one.
      setSignedInNow(Boolean(data.session));
      if (data.session) {
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
      }
      setSubmitting(false);
    } catch (err) {
      setErrors({
        form:
          err instanceof Error && err.message
            ? err.message
            : 'We could not create your account. Please try again.',
      });
      setSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <section
        data-testid='signup-page'
        className='mx-auto w-full max-w-md px-4 py-12'
      >
        <h1 className='text-2xl font-bold tracking-tight text-foreground'>
          {signedInNow ? 'Account created' : 'Check your email'}
        </h1>
        {signedInNow ? (
          <p className='mt-2 text-sm text-muted-foreground'>
            You are signed in as{' '}
            <span className='font-medium text-foreground'>{submittedEmail}</span>. Your Odogwu
            account is ready - open your dashboard to follow your pledges and receipts.
          </p>
        ) : (
          <>
            <p className='mt-2 text-sm text-muted-foreground'>
              We sent a confirmation link to{' '}
              <span className='font-medium text-foreground'>{submittedEmail}</span>. Open that link
              to finish creating your Odogwu account, then sign in.
            </p>
            <p className='mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground'>
              The link can only be used once and expires within the hour. If it does not arrive,
              check your spam folder before requesting another.
            </p>
          </>
        )}
        <div className='mt-6 flex flex-wrap gap-3'>
          <Link
            to='/login'
            className='rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90'
          >
            Sign in
          </Link>
          <Link
            to='/'
            className='rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted'
          >
            Browse bills
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid='signup-page'
      className='mx-auto w-full max-w-md px-4 py-12'
    >
      {/* The page's main heading is "Sign up" so it matches the sign-up
          doorway everywhere else in the site; the full "create your account"
          wording stays available to assistive tech and as the supporting copy. */}
      <h1 className='text-2xl font-bold tracking-tight text-foreground'>
        Sign up <span className='sr-only'>to create your account</span>
      </h1>
      <p className='mt-1 text-sm text-muted-foreground'>
        Create your account to pledge towards verified bills or to submit a bill for verification.
      </p>

      <form onSubmit={handleSubmit} className='mt-8 space-y-4' noValidate>
        <div>
          <label htmlFor='signup-full-name' className={labelClass}>
            Full name
          </label>
          <input
            id='signup-full-name'
            name='fullName'
            type='text'
            autoComplete='name'
            data-testid='signup-full-name'
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={submitting}
            className={inputClass}
            placeholder='Ada Obi'
          />
        </div>

        <div>
          <label htmlFor='signup-email' className={labelClass}>
            Email
          </label>
          <input
            id='signup-email'
            name='email'
            type='email'
            inputMode='email'
            autoComplete='email'
            data-testid='signup-email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            className={inputClass}
            placeholder='you@example.com'
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
          />
          {errors.email ? (
            <p id='signup-email-error' className='mt-1 text-sm text-destructive'>
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor='signup-password' className={labelClass}>
            Password
          </label>
          <input
            id='signup-password'
            name='password'
            type='password'
            autoComplete='new-password'
            data-testid='signup-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            className={inputClass}
            placeholder='At least 6 characters'
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'signup-password-error' : undefined}
          />
          {errors.password ? (
            <p id='signup-password-error' className='mt-1 text-sm text-destructive'>
              {errors.password}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor='signup-confirm-password' className={labelClass}>
            Confirm password
          </label>
          <input
            id='signup-confirm-password'
            name='confirmPassword'
            type='password'
            autoComplete='new-password'
            data-testid='signup-confirm-password'
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={submitting}
            className={inputClass}
            placeholder='Re-enter your password'
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
          />
          {errors.confirmPassword ? (
            <p id='signup-confirm-password-error' className='mt-1 text-sm text-destructive'>
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>

        <div className='rounded-lg border border-border bg-card p-3'>
          <div className='flex items-start gap-3'>
            <input
              id='signup-terms'
              name='terms'
              type='checkbox'
              data-testid='signup-terms'
              checked={agreed}
              onChange={handleAgreementChange}
              disabled={submitting}
              aria-invalid={Boolean(errors.terms)}
              aria-describedby={errors.terms ? 'signup-terms-error' : undefined}
              className='mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60'
            />
            <label htmlFor='signup-terms' className='text-sm leading-5 text-foreground'>
              I agree to the{' '}
              <Link
                to='/legal/terms'
                className='font-semibold text-primary hover:underline'
                onClick={(event) => event.stopPropagation()}
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to='/legal/privacy'
                className='font-semibold text-primary hover:underline'
                onClick={(event) => event.stopPropagation()}
              >
                Privacy Policy
              </Link>
            </label>
          </div>

          {errors.terms ? (
            <p
              id='signup-terms-error'
              data-testid='signup-terms-error'
              role='alert'
              className='mt-2 text-sm font-medium text-destructive'
            >
              {errors.terms}
            </p>
          ) : null}

          <p className='mt-2 text-xs text-muted-foreground'>
            Please also read our{' '}
            <Link to='/legal/cookies' className='font-medium text-primary hover:underline'>
              Cookie Policy
            </Link>
            ,{' '}
            <Link to='/legal/donations' className='font-medium text-primary hover:underline'>
              Donation & Refund Policy
            </Link>{' '}
            and{' '}
            <Link to='/legal/accessibility' className='font-medium text-primary hover:underline'>
              Accessibility Statement
            </Link>
            .
          </p>
        </div>

        {errors.form ? (
          <p
            role='alert'
            className='rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
          >
            {errors.form}
          </p>
        ) : null}

        <button
          type='submit'
          disabled={submitting}
          data-testid='signup-submit'
          className='w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60'
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className='mt-6 text-sm text-muted-foreground'>
        Already have an account?{' '}
        <Link to='/login' className='font-semibold text-primary hover:underline'>
          Sign in
        </Link>
      </p>
    </section>
  );
}

export default SignupPage;
